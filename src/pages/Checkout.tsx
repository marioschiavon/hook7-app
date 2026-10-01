import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CreditCard, Shield, Check, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { type BillingCycle, PLAN_PRICES, planKeyFor, formatBRL } from "@/lib/pricing";
import { claimOrphanSubscription, provisionSession } from "@/lib/subscriptionSlot";

export default function Checkout() {
  const [loading, setLoading] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionName = searchParams.get('session_name');
  const sessionIdFromUrl = searchParams.get('session_id');
  const { t } = useTranslation();
  const [cycle, setCycle] = useState<BillingCycle>(searchParams.get("billing") === "annual" ? "annual" : "monthly");
  const [isExtraNumber, setIsExtraNumber] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error(t('checkout.loginRequired'));
      navigate("/login");
      return;
    }
    setUser(user);

    // Buscar organization_id do usuário
    const { data: userRecord } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (userRecord?.organization_id) {
      setOrgId(userRecord.organization_id);

      // Mesma regra de create-stripe-checkout: se já existe outra sessão liberada, é número adicional
      let paidQuery = supabase
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", userRecord.organization_id)
        .eq("requires_subscription", false);
      if (sessionIdFromUrl) paidQuery = paidQuery.neq("id", sessionIdFromUrl);
      else if (sessionName) paidQuery = paidQuery.neq("name", sessionName);
      const { count } = await paidQuery;
      setIsExtraNumber((count ?? 0) > 0);
    }
  };

  const proceedToStripeCheckout = async (sessionId: string) => {
    toast.info(t('checkout.redirectingPayment'));
    console.log('Criando checkout Stripe para sessão:', sessionId);

    const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
      body: { session_id: sessionId, billing_cycle: cycle }
    });

    if (error) {
      console.error('Erro ao criar checkout:', error);
      throw error;
    }

    if (data.success && data.url) {
      console.log('Redirecionando para Stripe Checkout:', data.url);
      window.location.href = data.url;
    } else {
      throw new Error(data.error || "Error creating payment session");
    }
  };

  const handleSubscribe = async () => {
    if (!sessionName) {
      toast.error(t('checkout.sessionNameRequired'));
      return;
    }

    if (!orgId) {
      toast.error(t('checkout.loginRequired'));
      return;
    }

    setLoading(true);
    setCreatingSession(true);

    try {
      // 0. Assinatura de uma sessão excluída ainda ativa: reaproveita em vez de cobrar de novo
      if (await claimOrphanSubscription(sessionName)) {
        await provisionSession(sessionName);
        toast.success(t('sessions.subscriptionReused'));
        navigate('/sessions');
        return;
      }

      // 1. Se session_id foi passado na URL, usar sessão existente
      if (sessionIdFromUrl) {
        console.log('Usando sessão existente:', sessionIdFromUrl);
        toast.info(t('checkout.sessionReused'));
        await proceedToStripeCheckout(sessionIdFromUrl);
        return;
      }

      // 2. Verificar se já existe sessão com mesmo nome nesta org
      const { data: existingSession } = await supabase
        .from('sessions')
        .select('id, status')
        .eq('name', sessionName)
        .eq('organization_id', orgId)
        .maybeSingle();

      if (existingSession) {
        if (existingSession.status === 'pending_payment') {
          // Reutilizar sessão pendente
          console.log('Reutilizando sessão pendente:', existingSession.id);
          toast.info(t('checkout.sessionReused'));
          await proceedToStripeCheckout(existingSession.id);
          return;
        }
        
        if (existingSession.status === 'active') {
          // Sessão já ativa - redirecionar
          toast.error(t('checkout.sessionAlreadyActive'));
          navigate('/sessions');
          return;
        }

        // Outro status - ainda pode reutilizar
        console.log('Reutilizando sessão existente:', existingSession.id);
        await proceedToStripeCheckout(existingSession.id);
        return;
      }

      // 3. Criar nova sessão
      toast.info(t('checkout.preparingSession'));
      console.log('Criando registro de sessão:', sessionName);

      const { data: newSession, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          name: sessionName,
          organization_id: orgId,
          requires_subscription: true,
          status: 'pending_payment'
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Erro ao criar sessão:', sessionError);
        throw new Error(t('checkout.sessionCreateError'));
      }

      console.log('Sessão criada:', newSession.id);
      setCreatingSession(false);

      await proceedToStripeCheckout(newSession.id);
    } catch (error: any) {
      console.error("Erro no processo de checkout:", error);
      toast.error(error.message || t('checkout.checkoutError'));
      setLoading(false);
      setCreatingSession(false);
    }
  };

  const annual = cycle === "annual";
  const price = PLAN_PRICES[planKeyFor(isExtraNumber, cycle)];
  const monthlyPrice = PLAN_PRICES[planKeyFor(isExtraNumber, "monthly")];
  const features = t('checkout.features', { returnObjects: true }) as string[];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <div className="absolute top-4 left-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          disabled={loading}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('checkout.backToDashboard')}
        </Button>
      </div>

      <Card className="max-w-lg w-full border-2 border-primary/20">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <CreditCard className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl">{t('checkout.title')}</CardTitle>
          <CardDescription className="text-lg mt-2">
            {sessionName 
              ? t('checkout.subtitleWithSession', { sessionName })
              : t('checkout.subtitle')
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <div className="inline-flex rounded-lg border p-1 gap-1">
              {(["monthly", "annual"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCycle(c)}
                  disabled={loading}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    cycle === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c === "monthly" ? t('checkout.monthly') : t('checkout.annual')}
                </button>
              ))}
            </div>
          </div>

          <div className="text-center py-6 border-y">
            {isExtraNumber && (
              <div className="text-sm font-medium text-muted-foreground mb-2">{t('checkout.extraNumber')}</div>
            )}
            <div className="text-5xl font-bold text-primary mb-2">
              {formatBRL(price)}
            </div>
            <div className="text-muted-foreground">
              {annual
                ? t('checkout.perYear', { monthly: formatBRL(price / 12), full: formatBRL(monthlyPrice * 12) })
                : t('checkout.perMonth')}
            </div>
          </div>

          <div className="space-y-3">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary flex-shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <div className="bg-muted/50 p-4 rounded-lg flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              {annual ? t('checkout.securePaymentAnnual') : t('checkout.securePayment')}
            </div>
          </div>

          <Button 
            onClick={handleSubscribe} 
            disabled={loading || !sessionName}
            className="w-full h-12 text-lg"
            size="lg"
          >
            {creatingSession && (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {t('checkout.creatingSession')}
              </>
            )}
            {!creatingSession && loading && (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {t('checkout.processingPayment')}
              </>
            )}
            {!creatingSession && !loading && t('checkout.subscribeNow')}
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            disabled={loading}
            className="w-full"
          >
            {t('checkout.backToDashboard')}
          </Button>

          {!sessionName && (
            <p className="text-sm text-destructive text-center font-medium">
              {t('checkout.sessionNotFound')}
            </p>
          )}

          <div className="text-center text-sm text-muted-foreground">
            {t('checkout.termsAgree')}{" "}
            <button onClick={() => navigate("/terms")} className="text-primary hover:underline">{t('checkout.termsLink')}</button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}