import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  AlertTriangle,
  MessageSquare,
  DollarSign,
  Info,
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SessionWithSubscription {
  id: string;
  name: string;
  created_at: string;
  requires_subscription: boolean;
  subscription?: {
    id: string;
    status: string;
    amount: number;
    next_payment_date: string | null;
    created_at: string;
    stripe_customer_id?: string;
    cancel_at_period_end?: boolean;
    current_period_end?: string;
  };
}

const STAGGER = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const ITEM = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

const Subscriptions = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionWithSubscription[]>([]);
  const [isLegacy, setIsLegacy] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (userError || !userData?.organization_id) {
        toast.error("Organização não encontrada");
        navigate("/dashboard");
        return;
      }

      const { data: orgData } = await supabase
        .from("organizations")
        .select("is_legacy")
        .eq("id", userData.organization_id)
        .single();
      setIsLegacy((orgData as any)?.is_legacy || false);

      const { data: sessionsData, error: sessionsError } = await supabase
        .from("sessions")
        .select("*")
        .eq("organization_id", userData.organization_id)
        .order("created_at", { ascending: false });
      if (sessionsError) throw sessionsError;

      const withSubs: SessionWithSubscription[] = await Promise.all(
        (sessionsData || []).map(async (session) => {
          const { data: subData } = await supabase
            .from("subscriptions" as any)
            .select("*")
            .eq("session_id", session.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            id: session.id,
            name: session.name || "",
            created_at: session.created_at,
            requires_subscription: (session as any).requires_subscription ?? true,
            subscription: subData
              ? {
                  id: (subData as any).id,
                  status: (subData as any).status,
                  amount: (subData as any).amount,
                  next_payment_date: (subData as any).next_payment_date,
                  created_at: (subData as any).created_at,
                  stripe_customer_id: (subData as any).stripe_customer_id,
                  cancel_at_period_end: (subData as any).cancel_at_period_end,
                  current_period_end: (subData as any).current_period_end,
                }
              : undefined,
          };
        })
      );
      setSessions(withSubs);
    } catch {
      toast.error("Erro ao carregar assinaturas");
    } finally {
      setLoading(false);
    }
  };

  const openPortal = async (customerId?: string) => {
    if (!customerId) { toast.error("ID do cliente não encontrado"); return; }
    try {
      const { data, error } = await supabase.functions.invoke("create-stripe-portal", {
        body: { customer_id: customerId },
      });
      if (error) throw error;
      if (data.url) window.open(data.url, "_blank");
    } catch {
      toast.error("Erro ao abrir portal de gerenciamento");
    }
  };

  // Derive session card top border color based on subscription status
  const cardBorder = (s: SessionWithSubscription) => {
    if (!s.requires_subscription) return "border-t-green-500";
    if (!s.subscription) return "border-t-yellow-500";
    if (s.subscription.status === "active" && s.subscription.cancel_at_period_end) return "border-t-orange-500";
    switch (s.subscription.status) {
      case "active": return "border-t-green-500";
      case "past_due": return "border-t-red-500";
      case "pending": return "border-t-yellow-500";
      case "cancelled":
      case "paused": return "border-t-red-500";
      default: return "border-t-white/20";
    }
  };

  const statusBadge = (s: SessionWithSubscription) => {
    if (!s.requires_subscription)
      return <Badge variant="outline" className="border-green-500/30 text-green-400 text-[10px] h-5 px-1.5">Liberada</Badge>;
    if (!s.subscription)
      return <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 text-[10px] h-5 px-1.5">Aguardando pagamento</Badge>;
    if (s.subscription.status === "active" && s.subscription.cancel_at_period_end)
      return <Badge variant="outline" className="border-orange-500/30 text-orange-400 text-[10px] h-5 px-1.5">Cancelamento agendado</Badge>;
    switch (s.subscription.status) {
      case "active":    return <Badge variant="outline" className="border-green-500/30 text-green-400 text-[10px] h-5 px-1.5">Ativa</Badge>;
      case "past_due":  return <Badge variant="outline" className="border-red-500/30 text-red-400 text-[10px] h-5 px-1.5">Pagamento pendente</Badge>;
      case "pending":   return <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 text-[10px] h-5 px-1.5">Pendente</Badge>;
      case "cancelled":
      case "paused":    return <Badge variant="outline" className="border-red-500/30 text-red-400 text-[10px] h-5 px-1.5">Cancelada</Badge>;
      default:          return <Badge variant="outline" className="border-white/10 text-white/40 text-[10px] h-5 px-1.5">{s.subscription.status}</Badge>;
    }
  };

  const activeCount = sessions.filter(
    (s) => (s.subscription?.status === "active" && !s.subscription?.cancel_at_period_end) || !s.requires_subscription
  ).length;
  const pendingCount = sessions.filter((s) => s.requires_subscription && !s.subscription).length;
  const revenue = sessions.filter((s) => s.subscription?.status === "active").length * 69.90;

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-8 space-y-4">
        <div className="flex gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-9 w-32 rounded-lg" />)}
        </div>
        {[1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-5">
      {/* Summary strip */}
      <motion.div
        className="flex flex-wrap gap-3"
        variants={STAGGER}
        initial="hidden"
        animate="show"
      >
        {[
          { label: "Total", value: sessions.length, dot: "bg-white/30" },
          { label: "Ativas", value: activeCount, dot: "bg-green-500" },
          { label: "Pendentes", value: pendingCount, dot: "bg-yellow-500" },
          {
            label: "Custo mensal",
            value: isLegacy ? "Grátis" : `R$ ${revenue.toFixed(2)}`,
            dot: "bg-cyan-500",
          },
        ].map(({ label, value, dot }) => (
          <motion.div
            key={label}
            variants={ITEM}
            className="flex items-center gap-2 rounded-lg border border-white/8 bg-muted/20 px-3 py-2"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
            <span className="text-xs text-white/50">{label}</span>
            <span className="text-sm font-semibold text-white/80 tabular-nums">{value}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Legacy banner */}
      {isLegacy && (
        <div className="flex items-center gap-2.5 rounded-lg border border-blue-500/30 bg-blue-500/8 px-4 py-2.5 text-sm text-blue-400">
          <Info className="h-4 w-4 flex-shrink-0" />
          <span>
            <strong>Cliente Legacy:</strong> Você possui acesso especial sem cobrança por sessão. Suas sessões foram criadas antes do novo modelo de assinatura.
          </span>
        </div>
      )}

      {/* Sessions list */}
      {sessions.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16">
          <CreditCard className="h-10 w-10 text-white/15" />
          <p className="text-sm text-white/35">Você ainda não possui nenhuma sessão</p>
          <Button size="sm" onClick={() => navigate("/dashboard")}>
            Criar primeira sessão
          </Button>
        </div>
      ) : (
        <motion.div
          className="space-y-4"
          variants={STAGGER}
          initial="hidden"
          animate="show"
        >
          {sessions.map((session) => (
            <motion.div key={session.id} variants={ITEM}>
              <Card className={`glass-card border-t-2 border-x-white/5 border-b-white/5 ${cardBorder(session)}`}>
                <CardHeader className="pb-3 pt-5 px-5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-base font-semibold text-white/85">{session.name}</p>
                      <p className="text-xs text-white/35 mt-0.5">
                        Criada em {format(new Date(session.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    {statusBadge(session)}
                  </div>
                </CardHeader>

                <Separator className="border-white/5" />

                <CardContent className="px-5 pb-5 pt-4 space-y-4">
                  {/* Cancelamento agendado */}
                  {session.subscription?.status === "active" && session.subscription?.cancel_at_period_end && (
                    <div className="rounded-lg border border-orange-500/25 bg-orange-500/8 px-4 py-3 text-sm text-orange-400 space-y-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold mb-1">Cancelamento agendado</p>
                          <p className="text-orange-300/80 text-xs">
                            A assinatura continua ativa até{" "}
                            <strong className="text-orange-300">
                              {session.subscription.current_period_end &&
                                format(new Date(session.subscription.current_period_end), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </strong>
                            . Após essa data a sessão será desconectada automaticamente.
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openPortal(session.subscription?.stripe_customer_id)}
                        className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 h-8"
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                        Reverter cancelamento
                      </Button>
                    </div>
                  )}

                  {/* Subscription info */}
                  {session.subscription ? (
                    <div className="space-y-4">
                      {/* Amount + next payment */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-white/8 bg-muted/20 px-3 py-2">
                          <p className="text-[10px] text-white/35 uppercase tracking-wider mb-0.5">Valor mensal</p>
                          <p className="text-base font-semibold text-white/80 tabular-nums">
                            R$ {Number(session.subscription.amount).toFixed(2)}
                          </p>
                        </div>
                        {session.subscription.next_payment_date && (
                          <div className="rounded-lg border border-white/8 bg-muted/20 px-3 py-2">
                            <p className="text-[10px] text-white/35 uppercase tracking-wider mb-0.5">Próxima cobrança</p>
                            <p className="text-base font-semibold text-white/80 tabular-nums">
                              {format(new Date(session.subscription.next_payment_date), "dd/MM/yyyy")}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* past_due */}
                      {session.subscription.status === "past_due" && (
                        <div className="rounded-lg border border-red-500/25 bg-red-500/8 px-4 py-3 text-sm text-red-400 space-y-3">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold mb-1">Pagamento não processado</p>
                              <p className="text-red-300/80 text-xs">
                                Atualize seu método de pagamento para evitar a desconexão da sessão.
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              onClick={() => openPortal(session.subscription?.stripe_customer_id)}
                              disabled={!session.subscription?.stripe_customer_id}
                              className="bg-red-600 hover:bg-red-700 text-white h-8"
                            >
                              <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                              Atualizar pagamento
                            </Button>
                            {session.subscription?.stripe_customer_id && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openPortal(session.subscription?.stripe_customer_id)}
                                className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-8"
                              >
                                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                                Gerenciar no portal
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* active (no cancel) */}
                      {session.subscription.status === "active" && !session.subscription.cancel_at_period_end && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPortal(session.subscription?.stripe_customer_id)}
                          disabled={!session.subscription?.stripe_customer_id}
                          className="border-white/10 text-white/50 hover:text-white hover:border-white/20 h-8"
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                          Gerenciar assinatura
                        </Button>
                      )}

                      {/* pending */}
                      {session.subscription.status === "pending" && (
                        <div className="rounded-lg border border-yellow-500/25 bg-yellow-500/8 px-4 py-3 text-sm text-yellow-400 space-y-3">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <p className="text-xs text-yellow-300/80">Aguardando confirmação de pagamento. Isso pode levar alguns minutos.</p>
                          </div>
                          {session.subscription?.stripe_customer_id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openPortal(session.subscription?.stripe_customer_id)}
                              className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 h-8"
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                              Gerenciar no portal
                            </Button>
                          )}
                        </div>
                      )}

                      {/* cancelled / paused */}
                      {(session.subscription.status === "cancelled" || session.subscription.status === "paused") && (
                        <div className="rounded-lg border border-red-500/25 bg-red-500/8 px-4 py-3 text-sm text-red-400 space-y-3">
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4" />
                            <p className="text-xs text-red-300/80">Esta assinatura foi cancelada. A sessão não pode ser utilizada.</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              onClick={() => navigate(`/checkout?session_id=${session.id}&session_name=${encodeURIComponent(session.name)}`)}
                              className="bg-green-600 hover:bg-green-700 text-white h-8"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                              Reativar assinatura
                            </Button>
                            {session.subscription?.stripe_customer_id && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openPortal(session.subscription?.stripe_customer_id)}
                                className="border-white/10 text-white/50 hover:text-white h-8"
                              >
                                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                                Gerenciar no portal
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : session.requires_subscription ? (
                    /* No subscription yet */
                    <div className="rounded-lg border border-yellow-500/25 bg-yellow-500/8 px-4 py-3 text-sm text-yellow-400 space-y-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        <p className="text-xs text-yellow-300/80">Esta sessão ainda não possui assinatura ativa.</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => navigate(`/checkout?session_id=${session.id}&session_name=${encodeURIComponent(session.name)}`)}
                        className="h-8"
                      >
                        <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                        Ativar assinatura (R$ 69,90/mês)
                      </Button>
                    </div>
                  ) : (
                    /* Free session */
                    <div className="flex items-center gap-2 text-sm text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs">Esta sessão está liberada e não requer assinatura.</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Como funciona */}
      <Card className="glass-card border-white/5">
        <CardHeader className="pb-2 pt-4 px-5">
          <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest flex items-center gap-1.5">
            <Info className="h-3 w-3" />
            Como funciona
          </p>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">
          {[
            {
              n: "1",
              title: "Gerenciar assinatura",
              body: "Clique em \"Gerenciar assinatura\" para acessar o portal do Stripe onde você pode cancelar, atualizar o método de pagamento ou ver o histórico de cobranças.",
            },
            {
              n: "2",
              title: "Assinaturas independentes",
              body: "Cada sessão possui uma assinatura separada de R$ 69,90/mês. Cancelar uma não afeta as outras.",
            },
            {
              n: "3",
              title: "Cancelamento e período de uso",
              body: "Ao cancelar, você pode usar a sessão até o fim do período já pago (30 dias). Após essa data, a sessão será desconectada automaticamente. Você pode reativar a qualquer momento.",
            },
            {
              n: "✓",
              title: "Reativação instantânea",
              body: "Sessões canceladas podem ser reativadas imediatamente clicando em \"Reativar assinatura\".",
            },
          ].map(({ n, title, body }) => (
            <div key={n} className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center text-[11px] font-semibold text-primary flex-shrink-0 mt-0.5">
                {n}
              </div>
              <div>
                <p className="text-xs font-medium text-white/70 mb-0.5">{title}</p>
                <p className="text-xs text-white/35 leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default Subscriptions;
