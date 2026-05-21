import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CreateOrgModal from "@/components/CreateOrgModal";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { OrganizationBanner } from "@/components/dashboard/OrganizationBanner";
import { ApiKeySheet } from "@/components/dashboard/ApiKeySheet";
import { SendTestMessageDialog } from "@/components/dashboard/SendTestMessageDialog";
import { ConnectionHelpCard } from "@/components/dashboard/ConnectionHelpCard";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { toast } from "sonner";
import { Zap, MessageSquare, CreditCard, ArrowRight, Plus, DollarSign, Settings, Megaphone, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { evolutionApi } from "@/services/evolutionApi";
import { useRegionalPricing, formatPrice } from "@/hooks/useRegionalPricing";

interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  organization_id: string | null;
  role: string | null;
}

interface OrgData {
  id: string;
  name: string;
  plan: string | null;
  session_limit: number | null;
  is_legacy: boolean;
}

interface SessionData {
  id: string;
  name: string;
  api_session: string | null;
  api_token: string | null;
  status: string | null;
  created_at?: string;
  updated_at?: string;
}

interface SessionStatus {
  status: boolean;
  message?: string;
  qrCode?: string;
}

const Dashboard = () => {
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdmin();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const pricing = useRegionalPricing();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [orgData, setOrgData] = useState<OrgData | null>(null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [sessionsStatus, setSessionsStatus] = useState<Record<string, SessionStatus>>({});
  const [activeSubscriptionsCount, setActiveSubscriptionsCount] = useState(0);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [showConnectionHelp, setShowConnectionHelp] = useState(false);
  const [newSessionName, setNewSessionName] = useState<string | undefined>();
  
  const dateLocale = i18n.language.startsWith('pt') ? ptBR : enUS;

  // Redirect superadmin to admin panel
  useEffect(() => {
    if (!superAdminLoading && isSuperAdmin) {
      navigate("/admin", { replace: true });
    }
  }, [superAdminLoading, isSuperAdmin, navigate]);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: userRecord, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (userError) throw userError;

      if (!userRecord) {
        const { data: newUser, error: createError } = await supabase
          .from("users")
          .insert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || null,
            role: 'admin',
          })
          .select()
          .single();

        if (createError) throw createError;
        // Novo usuário - redirecionar para onboarding
        navigate("/welcome");
        return;
      }

      setUserData(userRecord);

      if (!userRecord.organization_id) {
        // Sem organização - redirecionar para onboarding
        navigate("/welcome");
        return;
      }
      
      // Verificar se tem sessões
      const { count: sessionCount } = await supabase
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", userRecord.organization_id);

      if (!sessionCount || sessionCount === 0) {
        // Tem org mas não tem sessões - ir para step 2 do onboarding
        navigate("/welcome?step=2");
        return;
      }

      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", userRecord.organization_id)
        .maybeSingle();

      if (orgError) throw orgError;
      
      const orgDataTyped: OrgData = {
        id: org.id,
        name: org.name,
        plan: org.plan,
        session_limit: org.session_limit,
        is_legacy: (org as any).is_legacy || false
      };
      
      setOrgData(orgDataTyped);

      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('organization_id', userRecord.organization_id)
        .order('created_at', { ascending: false })
        .limit(4);

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError);
      } else if (sessionsData && sessionsData.length > 0) {
        const typedSessions: SessionData[] = sessionsData.map((s: any) => ({
          id: s.id,
          name: s.name,
          api_session: s.api_session,
          api_token: s.api_token,
          status: s.status,
          created_at: s.created_at,
          updated_at: s.updated_at
        }));
        
        setSessions(typedSessions);
        
        await Promise.all(
          typedSessions.map(async (session) => {
            if (session.api_session && session.api_token) {
              await fetchSessionStatus(session.id, session.api_session, session.api_token);
            }
          })
        );
      }

      // Buscar assinaturas ativas
      const { data: activeSubscriptions } = await supabase
        .from('subscriptions')
        .select('amount, status')
        .eq('organization_id', userRecord.organization_id)
        .eq('status', 'active');

      const subscriptionCount = activeSubscriptions?.length || 0;
      const total = activeSubscriptions?.reduce((sum, sub) => 
        sum + Number(sub.amount || 0), 0
      ) || 0;

      setActiveSubscriptionsCount(subscriptionCount);
      setMonthlyTotal(total);
    } catch (error: any) {
      console.error("❌ Error fetching data:", error);
      toast.error(`${t('dashboard.errorLoadingData')}: ${error.message || t('common.error')}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionStatus = async (sessionId: string, apiSession: string, apiToken: string) => {
    try {
      const result = await evolutionApi.checkConnection(apiSession, apiToken);
      setSessionsStatus(prev => ({
        ...prev,
        [sessionId]: result
      }));
    } catch (error) {
      console.error(`Error fetching session status for ${sessionId}:`, error);
      setSessionsStatus(prev => ({
        ...prev,
        [sessionId]: { status: false, message: 'Offline' }
      }));
    }
  };

  const handleSendTestMessage = async (sessionId: string, phoneNumber: string, message: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session?.api_session || !session?.api_token) {
      toast.error(t('sessions.sessionNotFound'));
      return;
    }
    
    try {
      const result = await evolutionApi.sendText(
        session.api_session,
        session.api_token,
        phoneNumber,
        message
      );
      
      if (!result.success) {
        throw new Error(result.error || "Erro ao enviar mensagem");
      }
      
      toast.success(t('common.success'));
      
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error(error.message || "Erro ao enviar mensagem");
      throw error;
    }
  };

  useEffect(() => {
    fetchUserData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Detectar payment=success para mostrar ajuda
  useEffect(() => {
    const paymentSuccess = searchParams.get('payment') === 'success';
    const sessionName = searchParams.get('session');
    
    if (paymentSuccess) {
      // Disparar evento purchase padrão GA4 via GTM dataLayer
      const sessionName = searchParams.get('session');
      window.dataLayer?.push({ ecommerce: null }); // Clear previous ecommerce data
      window.dataLayer?.push({
        event: 'purchase',
        ecommerce: {
          transaction_id: sessionName || `purchase_${Date.now()}`,
          value: parseFloat(pricing.amount.replace(',', '.')),
          currency: pricing.currency,
          items: [{
            item_id: 'whatsapp_session',
            item_name: `Sessão WhatsApp - ${sessionName || 'unknown'}`,
            item_category: 'subscription',
            price: parseFloat(pricing.amount.replace(',', '.')),
            quantity: 1
          }]
        }
      });

      const helpDismissed = localStorage.getItem('connectionHelpDismissed');
      if (!helpDismissed) {
        setShowConnectionHelp(true);
        if (sessionName) {
          setNewSessionName(sessionName);
        }
      }
      // Limpar parâmetros da URL
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [searchParams]);

  const handleDismissHelp = () => {
    setShowConnectionHelp(false);
    localStorage.setItem('connectionHelpDismissed', 'true');
  };

  const handleShowHelp = () => {
    localStorage.removeItem('connectionHelpDismissed');
    setShowConnectionHelp(true);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  const activeSessions = sessions.filter(s => sessionsStatus[s.id]?.status === true);

  const getStatusBadge = (sessionId: string) => {
    const status = sessionsStatus[sessionId];
    if (status?.status === true) {
      return <Badge className="bg-green-500/10 text-green-600">{t('common.online')}</Badge>;
    }
    if (status?.qrCode || status?.message?.toUpperCase() === 'QRCODE') {
      return <Badge className="bg-yellow-500/10 text-yellow-600">{t('common.qrCode')}</Badge>;
    }
    return <Badge className="bg-red-500/10 text-red-600">{t('common.offline')}</Badge>;
  };

  const priceDisplay = formatPrice(pricing);
  return (
    <div className="container mx-auto p-6 space-y-6">
      <CreateOrgModal 
        open={showOrgModal} 
        onOrgCreated={() => {
          setShowOrgModal(false);
          fetchUserData();
        }}
        onClose={() => setShowOrgModal(false)}
      />

      {/* Announcement Banner */}
      <AnnouncementBanner />

      {/* Onboarding Checklist — 100% frontend, localStorage */}
      <OnboardingChecklist
        hasOrg={!!orgData}
        hasSessions={sessions.length > 0}
        hasConnectedSession={activeSessions.length > 0}
        hasSentMessage={false}
      />

      {/* Connection Help Card */}
      <AnimatePresence>
        {showConnectionHelp && (
          <ConnectionHelpCard 
            onDismiss={handleDismissHelp}
            sessionName={newSessionName}
          />
        )}
      </AnimatePresence>

      {/* Stats Cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
          }
        }}
        initial="hidden"
        animate="show"
      >
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 }
          }}
        >
          <StatsCard
            title={t('dashboard.connectedSessions')}
            value={activeSessions.length}
            icon={Zap}
            subtitle={t('dashboard.connectedViaWhatsApp')}
            color="purple"
          />
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 }
          }}
        >
          <StatsCard
            title={t('dashboard.createdSessions')}
            value={sessions.length}
            icon={MessageSquare}
            subtitle={t('dashboard.createAsNeeded')}
            color="blue"
          />
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 }
          }}
        >
          <StatsCard
            title={t('dashboard.activeSubscriptions')}
            value={activeSubscriptionsCount}
            icon={CreditCard}
            subtitle={t('dashboard.pricePerSession', { price: priceDisplay })}
            color="purple"
          />
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 }
          }}
        >
          <StatsCard
            title={t('dashboard.monthlyCost')}
            value={`${pricing.symbol} ${monthlyTotal.toFixed(2)}`}
            icon={DollarSign}
            subtitle={t('dashboard.totalSubscriptions')}
            color="orange"
          />
        </motion.div>
      </motion.div>

      {/* Organization Banner */}
      {orgData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div className="flex-1">
            <OrganizationBanner
              name={orgData.name}
              isLegacy={orgData.is_legacy}
              sessionCount={sessions.length}
            />
          </div>
          {!showConnectionHelp && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleShowHelp}
              className="shrink-0 gap-1.5 w-full sm:w-auto justify-center"
            >
            <HelpCircle className="h-4 w-4" />
            <span className="hidden xs:inline">{t('dashboard.howToConnect')}</span>
          </Button>
          )}
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/sessions")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {t('dashboard.manageSessions')}
            </CardTitle>
            <CardDescription>
              {t('dashboard.manageSessionsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              {t('dashboard.newSession')}
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/subscriptions")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t('dashboard.subscriptions')}
            </CardTitle>
            <CardDescription>
              {t('dashboard.subscriptionsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              {t('dashboard.viewSubscriptions')}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/api-docs")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {t('dashboard.apiDocumentation')}
            </CardTitle>
            <CardDescription>
              {t('dashboard.apiDocumentationDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              {t('dashboard.viewDocs')}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Sessions Overview */}
      {sessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t('dashboard.yourSessions')}</CardTitle>
                <CardDescription>
                  {t('dashboard.sessionsStatus')}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/sessions")}>
                {t('common.viewAll')}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sessions.slice(0, 4).map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => navigate("/sessions")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{session.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {session.updated_at 
                            ? formatDistanceToNow(new Date(session.updated_at), { addSuffix: true, locale: dateLocale })
                            : t('common.noUpdate')
                          }
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(session.id)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tools Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {t('dashboard.tools')}
            </CardTitle>
            <CardDescription>
              {t('dashboard.toolsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <ApiKeySheet sessions={sessions} />
            <SendTestMessageDialog 
              sessions={sessions} 
              onSend={handleSendTestMessage}
            />
            <Button variant="outline" onClick={() => navigate("/announcements")}>
              <Megaphone className="h-4 w-4 mr-2" />
              {t('dashboard.announcements')}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Dashboard;
