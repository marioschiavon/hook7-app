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
import { MessageLogsWidget } from "@/components/dashboard/MessageLogsWidget";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { toast } from "sonner";
import { Zap, MessageSquare, CreditCard, ArrowRight, Plus, DollarSign, Settings, Megaphone, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import * as hook7Api from "@/services/hook7Api";
import { useRegionalPricing, formatPrice } from "@/hooks/useRegionalPricing";

// New Dashboard Components
import { Sparkline } from "@/components/dashboard/Sparkline";
import { ActivityFeed, ActivityItem } from "@/components/dashboard/ActivityFeed";
import { AutomationFlow } from "@/components/dashboard/AutomationFlow";

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
      const result = await hook7Api.checkConnection(apiToken);
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
      const result = await hook7Api.sendText(
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

  // Mock data for the sparklines and activity feed
  const sentMessagesSparkline = [5, 10, 8, 15, 12, 20, 18, 25, 22, 30, 28, 35];
  const receivedMessagesSparkline = [3, 8, 5, 12, 10, 15, 12, 20, 18, 22, 20, 25];
  
  const recentActivities: ActivityItem[] = [
    {
      id: "1",
      type: "message_sent",
      title: "Mensagem enviada",
      subtitle: "Para: +55 11 9****-****",
      timeAgo: "agora",
      statusText: "Entregue",
      statusColor: "green"
    },
    {
      id: "2",
      type: "webhook_received",
      title: "Webhook recebido",
      subtitle: "event: messages.upsert",
      timeAgo: "2s atrás",
      statusText: "",
      statusColor: "purple"
    },
    {
      id: "3",
      type: "message_received",
      title: "Mensagem recebida",
      subtitle: "De: +55 11 9****-****",
      timeAgo: "5s atrás",
      statusText: "",
      statusColor: "green"
    }
  ];

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <CreateOrgModal 
        open={showOrgModal} 
        onOrgCreated={() => {
          setShowOrgModal(false);
          fetchUserData();
        }}
        onClose={() => setShowOrgModal(false)}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-white/90">Dashboard</h1>
        {/* Search and Profile are typically in the Navbar/Layout, but we can put placeholders or rely on layout */}
      </div>

      {/* Top 4 Stat Cards matching the mockup */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.1 } }
        }}
        initial="hidden"
        animate="show"
      >
        {/* Conexões ativas */}
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
          <Card className="glass-card hook7-card-hover border-white/5 h-full relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardDescription className="text-white/60">Conexões ativas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-semibold text-white/90 tracking-tight">{activeSessions.length > 0 ? activeSessions.length : '12'}</div>
              <div className="mt-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                <span className="text-sm text-green-500/90 font-medium">Online</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Mensagens enviadas */}
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
          <Card className="glass-card hook7-card-hover border-white/5 h-full relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardDescription className="text-white/60">Mensagens enviadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-semibold text-white/90 tracking-tight">24.580</div>
              <div className="mt-4 h-[30px] -mx-2">
                <Sparkline data={sentMessagesSparkline} color="hsl(217 91% 60%)" strokeWidth={2} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Mensagens recebidas */}
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
          <Card className="glass-card hook7-card-hover border-white/5 h-full relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardDescription className="text-white/60">Mensagens recebidas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-semibold text-white/90 tracking-tight">18.964</div>
              <div className="mt-4 h-[30px] -mx-2">
                <Sparkline data={receivedMessagesSparkline} color="hsl(192 91% 56%)" strokeWidth={2} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Webhooks */}
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
          <Card className="glass-card hook7-card-hover border-white/5 h-full relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardDescription className="text-white/60">Webhooks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-semibold text-white/90 tracking-tight">1.429</div>
              <div className="mt-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                <span className="text-sm text-purple-500/90 font-medium">Eventos</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Main Content Area: Split 45% / 55% */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <motion.div 
          className="lg:col-span-5 h-full"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <ActivityFeed activities={recentActivities} />
        </motion.div>
        
        <motion.div 
          className="lg:col-span-7 h-full"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <AutomationFlow />
        </motion.div>
      </div>
      
      {/* Ferramentas Rápidas */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.4 }}
      >
        <h3 className="text-xs font-semibold text-white/35 mb-3 uppercase tracking-widest">Ferramentas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Ir para Sessões */}
          <Card
            className="glass-card cursor-pointer border-white/5 group"
            onClick={() => navigate("/sessions")}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                  <MessageSquare className="h-4 w-4 text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/85">Sessões</p>
                  <p className="text-xs text-white/40">{sessions.length} criada{sessions.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-white/25 group-hover:text-white/60 transition-colors" />
            </CardContent>
          </Card>

          {/* API Key */}
          <Card className="glass-card border-white/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Zap className="h-4 w-4 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/85 mb-1">Chave de API</p>
                <ApiKeySheet sessions={sessions} />
              </div>
            </CardContent>
          </Card>

          {/* Testar Mensagem */}
          <Card className="glass-card border-white/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <MessageSquare className="h-4 w-4 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/85 mb-1">Teste Rápido</p>
                <SendTestMessageDialog sessions={sessions} onSend={handleSendTestMessage} />
              </div>
            </CardContent>
          </Card>

          {/* Organização */}
          {orgData && (
            <Card className="glass-card border-white/5">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Settings className="h-4 w-4 text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/40 mb-0.5">Organização</p>
                  <OrganizationBanner
                    name={orgData.name}
                    isLegacy={orgData.is_legacy}
                    sessionCount={sessions.length}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </motion.div>

    </div>
  );
};

export default Dashboard;
