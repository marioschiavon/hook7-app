import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CreateOrgModal from "@/components/CreateOrgModal";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { ConnectionHelpCard } from "@/components/dashboard/ConnectionHelpCard";
import { ApiKeySheet } from "@/components/dashboard/ApiKeySheet";
import { SendTestMessageDialog } from "@/components/dashboard/SendTestMessageDialog";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { toast } from "sonner";
import {
  MessageSquare,
  Webhook,
  Plus,
  ArrowRight,
  Key,
  Send,
  BookOpen,
  QrCode,
  PlugZap,
  RefreshCw,
  Zap,
  TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import * as hook7Api from "@/services/hook7Api";
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

type SessionState = "online" | "qr" | "offline";

function getSessionState(status: SessionStatus | undefined): SessionState {
  if (!status) return "offline";
  if (status.status === true) return "online";
  if (status.qrCode || status.message?.toUpperCase() === "QRCODE") return "qr";
  return "offline";
}

const stateColors: Record<SessionState, string> = {
  online: "border-t-green-500",
  qr: "border-t-yellow-500",
  offline: "border-t-red-500",
};

const stateBadge: Record<SessionState, { label: string; className: string }> = {
  online: {
    label: "online",
    className: "bg-green-500/10 text-green-500 border-green-500/20",
  },
  qr: {
    label: "QR Code",
    className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  },
  offline: {
    label: "offline",
    className: "bg-red-500/10 text-red-500 border-red-500/20",
  },
};

const sentSparkline = [5, 10, 8, 15, 12, 20, 18, 25, 22, 30, 28, 35];
const recvSparkline = [3, 8, 5, 12, 10, 15, 12, 20, 18, 22, 20, 25];

const STAGGER = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const ITEM = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const pricing = useRegionalPricing();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [orgData, setOrgData] = useState<OrgData | null>(null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [sessionsStatus, setSessionsStatus] = useState<Record<string, SessionStatus>>({});
  const [showConnectionHelp, setShowConnectionHelp] = useState(false);
  const [newSessionName, setNewSessionName] = useState<string | undefined>();

  const fetchSessionStatus = async (
    sessionId: string,
    _apiSession: string,
    apiToken: string
  ) => {
    try {
      const result = await hook7Api.checkConnection(apiToken);
      setSessionsStatus((prev) => ({ ...prev, [sessionId]: result }));
    } catch {
      setSessionsStatus((prev) => ({
        ...prev,
        [sessionId]: { status: false, message: "Offline" },
      }));
    }
  };

  const fetchUserData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      const { data: userRecord, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (userError) throw userError;

      if (!userRecord) {
        const { data: newUser, error: createError } = await supabase
          .from("users")
          .insert({ id: user.id, email: user.email, name: user.user_metadata?.name || null, role: "admin" })
          .select()
          .single();
        if (createError) throw createError;
        navigate("/welcome");
        return;
      }

      setUserData(userRecord);

      if (!userRecord.organization_id) { navigate("/welcome"); return; }

      const { count: sessionCount } = await supabase
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", userRecord.organization_id);

      if (!sessionCount || sessionCount === 0) { navigate("/welcome?step=2"); return; }

      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", userRecord.organization_id)
        .maybeSingle();

      if (orgError) throw orgError;

      setOrgData({
        id: org.id,
        name: org.name,
        plan: org.plan,
        session_limit: org.session_limit,
        is_legacy: (org as any).is_legacy || false,
      });

      const { data: sessionsData, error: sessionsError } = await supabase
        .from("sessions")
        .select("*")
        .eq("organization_id", userRecord.organization_id)
        .order("created_at", { ascending: false })
        .limit(6);

      if (sessionsError) {
        console.error("Error fetching sessions:", sessionsError);
      } else if (sessionsData?.length) {
        const typed: SessionData[] = sessionsData.map((s: any) => ({
          id: s.id,
          name: s.name,
          api_session: s.api_session,
          api_token: s.api_token,
          status: s.status,
          created_at: s.created_at,
          updated_at: s.updated_at,
        }));
        setSessions(typed);
        await Promise.all(
          typed.map((s) =>
            s.api_session && s.api_token
              ? fetchSessionStatus(s.id, s.api_session, s.api_token)
              : Promise.resolve()
          )
        );
      }
    } catch (error: any) {
      toast.error(`Erro ao carregar dados: ${error.message || "Erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestMessage = async (
    sessionId: string,
    phoneNumber: string,
    message: string
  ) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session?.api_session || !session?.api_token) {
      toast.error(t("sessions.sessionNotFound"));
      return;
    }
    const result = await hook7Api.sendText(session.api_token, phoneNumber, message);
    if (!result.success) throw new Error(result.error || "Erro ao enviar mensagem");
    toast.success(t("common.success"));
  };

  useEffect(() => {
    fetchUserData();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate("/login");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const paymentSuccess = searchParams.get("payment") === "success";
    if (!paymentSuccess) return;

    const sessionName = searchParams.get("session");
    const priceValue = parseFloat(pricing.amount.replace(",", "."));

    window.dataLayer?.push({ ecommerce: null });
    window.dataLayer?.push({
      event: "purchase",
      ecommerce: {
        transaction_id: sessionName || `purchase_${Date.now()}`,
        value: priceValue,
        currency: pricing.currency,
        items: [{ item_id: "whatsapp_session", item_name: `Sessão WhatsApp - ${sessionName || "unknown"}`, item_category: "subscription", price: priceValue, quantity: 1 }],
      },
    });

    if (!localStorage.getItem("connectionHelpDismissed")) {
      setShowConnectionHelp(true);
      if (sessionName) setNewSessionName(sessionName);
    }
    window.history.replaceState({}, "", "/dashboard");
  }, [searchParams]);

  // ─── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-8 w-40 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="lg:col-span-2 h-52 rounded-xl" />
          <Skeleton className="h-52 rounded-xl" />
        </div>
      </div>
    );
  }

  const onlineSessions = sessions.filter((s) => getSessionState(sessionsStatus[s.id]) === "online");
  const planLabel = orgData?.plan ? orgData.plan.charAt(0).toUpperCase() + orgData.plan.slice(1) : "Free";

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-7">
      <CreateOrgModal
        open={showOrgModal}
        onOrgCreated={() => { setShowOrgModal(false); fetchUserData(); }}
        onClose={() => setShowOrgModal(false)}
      />

      <AnnouncementBanner />

      <AnimatePresence>
        {showConnectionHelp && (
          <ConnectionHelpCard
            onDismiss={() => {
              setShowConnectionHelp(false);
              localStorage.setItem("connectionHelpDismissed", "true");
            }}
            sessionName={newSessionName}
          />
        )}
      </AnimatePresence>

      {/* ── Stats row ──────────────────────────────────────────────────────── */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        variants={STAGGER}
        initial="hidden"
        animate="show"
      >
        {/* Conexões ativas */}
        <motion.div variants={ITEM}>
          <Card className="glass-card border-t-2 border-t-green-500 border-x-white/5 border-b-white/5 h-full">
            <CardHeader className="pb-1 pt-4">
              <CardDescription className="text-white/50 text-xs uppercase tracking-wider">
                Conexões ativas
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-3xl font-semibold text-white/90 tracking-tight">
                {onlineSessions.length}
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.9)] animate-pulse" />
                <span className="text-xs text-green-500/90">
                  {sessions.length} total
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Mensagens enviadas */}
        <motion.div variants={ITEM}>
          <Card className="glass-card border-t-2 border-t-blue-500 border-x-white/5 border-b-white/5 h-full">
            <CardHeader className="pb-1 pt-4">
              <CardDescription className="text-white/50 text-xs uppercase tracking-wider">
                Msgs enviadas
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-3xl font-semibold text-white/90 tracking-tight">24.580</div>
              <div className="mt-1 h-8 -mx-1">
                <Sparkline data={sentSparkline} color="hsl(217 91% 60%)" strokeWidth={1.5} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Mensagens recebidas */}
        <motion.div variants={ITEM}>
          <Card className="glass-card border-t-2 border-t-cyan-500 border-x-white/5 border-b-white/5 h-full">
            <CardHeader className="pb-1 pt-4">
              <CardDescription className="text-white/50 text-xs uppercase tracking-wider">
                Msgs recebidas
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-3xl font-semibold text-white/90 tracking-tight">18.964</div>
              <div className="mt-1 h-8 -mx-1">
                <Sparkline data={recvSparkline} color="hsl(192 91% 56%)" strokeWidth={1.5} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Webhooks */}
        <motion.div variants={ITEM}>
          <Card className="glass-card border-t-2 border-t-purple-500 border-x-white/5 border-b-white/5 h-full">
            <CardHeader className="pb-1 pt-4">
              <CardDescription className="text-white/50 text-xs uppercase tracking-wider">
                Webhooks
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-3xl font-semibold text-white/90 tracking-tight">1.429</div>
              <div className="mt-2 flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3 text-purple-400" />
                <span className="text-xs text-purple-400/90">99.2% entregues</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* ── Sessions ───────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold text-white/35 uppercase tracking-widest">
            Suas sessões
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-white/50 hover:text-white"
            onClick={() => navigate("/sessions")}
          >
            <Plus className="h-3.5 w-3.5" />
            Nova sessão
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((session, i) => {
            const state = getSessionState(sessionsStatus[session.id]);
            const badge = stateBadge[state];

            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
              >
                <Card
                  className={`glass-card border-t-2 border-x-white/5 border-b-white/5 ${stateColors[state]}`}
                >
                  <CardContent className="p-4">
                    {/* Head */}
                    <div className="flex items-center gap-2.5 mb-3">
                      <div
                        className={`p-1.5 rounded-lg ${
                          state === "online"
                            ? "bg-green-500/10"
                            : state === "qr"
                            ? "bg-yellow-500/10"
                            : "bg-red-500/10"
                        }`}
                      >
                        {state === "qr" ? (
                          <QrCode
                            className="h-4 w-4 text-yellow-400"
                            aria-hidden="true"
                          />
                        ) : (
                          <MessageSquare
                            className={`h-4 w-4 ${
                              state === "online" ? "text-green-400" : "text-red-400"
                            }`}
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <span className="text-sm font-medium text-white/90 flex-1 truncate">
                        {session.name}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] h-5 px-1.5 ${badge.className}`}
                      >
                        {badge.label}
                      </Badge>
                    </div>

                    {/* Meta */}
                    <p className="text-[11px] text-white/40 mb-3">
                      {state === "online" && "Conectado e ativo"}
                      {state === "qr" && "Aguardando leitura do QR Code"}
                      {state === "offline" && "Desconectado"}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {state === "online" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2.5 text-xs text-white/60 hover:text-white border border-white/10 hover:border-white/20"
                          onClick={() => navigate("/sessions")}
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Testar
                        </Button>
                      )}
                      {state === "qr" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2.5 text-xs text-yellow-400/80 hover:text-yellow-400 border border-yellow-500/20 hover:border-yellow-500/40"
                          onClick={() => navigate("/sessions")}
                        >
                          <QrCode className="h-3 w-3 mr-1" />
                          Ver QR
                        </Button>
                      )}
                      {state === "offline" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2.5 text-xs text-red-400/80 hover:text-red-400 border border-red-500/20 hover:border-red-500/40"
                          onClick={() => navigate("/sessions")}
                        >
                          <PlugZap className="h-3 w-3 mr-1" />
                          Reconectar
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2.5 text-xs text-white/40 hover:text-white border border-white/10 hover:border-white/20 ml-auto"
                        onClick={() => navigate("/sessions")}
                      >
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}

          {/* "Ver todas" card when more than 6 */}
          {sessions.length === 0 && (
            <Card
              className="glass-card border-dashed border-white/10 cursor-pointer hover:border-white/20 transition-colors"
              onClick={() => navigate("/sessions")}
            >
              <CardContent className="p-4 flex flex-col items-center justify-center h-full min-h-[120px] gap-2 text-white/30">
                <Plus className="h-6 w-6" />
                <span className="text-xs">Criar primeira sessão</span>
              </CardContent>
            </Card>
          )}
        </div>

        {sessions.length > 0 && (
          <div className="mt-3 text-right">
            <Button
              variant="link"
              size="sm"
              className="text-xs text-white/40 hover:text-white/70 h-auto p-0"
              onClick={() => navigate("/sessions")}
            >
              Gerenciar todas as sessões
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}
      </motion.div>

      {/* ── Bottom: Activity + Quick panel ─────────────────────────────────── */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
      >
        {/* Activity feed */}
        <Card className="glass-card border-white/5 lg:col-span-2">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardDescription className="text-[11px] font-semibold text-white/35 uppercase tracking-widest">
              Atividade recente
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-4 divide-y divide-white/5">
            {[
              {
                dot: "bg-green-500",
                title: "Mensagem enviada",
                sub: "Para: +55 11 9****-1234 · Entregue",
                time: "agora",
              },
              {
                dot: "bg-purple-500",
                title: "Webhook recebido",
                sub: "event: messages.upsert · 200 OK",
                time: "4s",
              },
              {
                dot: "bg-blue-400",
                title: "Mensagem recebida",
                sub: "De: +55 11 9****-5566",
                time: "12s",
              },
              {
                dot: "bg-green-500",
                title: "Sessão reconectada",
                sub: "Uptime retomado automaticamente",
                time: "1m",
              },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${item.dot}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 truncate">{item.title}</p>
                  <p className="text-xs text-white/40 truncate">{item.sub}</p>
                </div>
                <span className="text-xs text-white/30 flex-shrink-0">{item.time}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick panel */}
        <div className="flex flex-col gap-4">
          {/* Org summary */}
          {orgData && (
            <Card className="glass-card border-white/5">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardDescription className="text-[11px] font-semibold text-white/35 uppercase tracking-widest">
                  Organização
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                <p className="text-sm font-medium text-white/80 truncate">{orgData.name}</p>
                <div className="divide-y divide-white/5">
                  {[
                    { label: "Plano", value: planLabel },
                    {
                      label: "Sessões",
                      value: `${sessions.length}${orgData.session_limit ? ` / ${orgData.session_limit}` : ""}`,
                    },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between py-1.5 text-xs">
                      <span className="text-white/40">{label}</span>
                      <span className="text-white/70 font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick actions */}
          <Card className="glass-card border-white/5 flex-1">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="text-[11px] font-semibold text-white/35 uppercase tracking-widest">
                Ações rápidas
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-1.5">
              {/* API Key */}
              <div className="flex items-center gap-2.5 p-2 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                <Key className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span className="text-xs text-white/70 flex-1">Chave de API</span>
                <ApiKeySheet sessions={sessions.filter((s) => !!s.api_token) as any} />
              </div>

              {/* Test message */}
              <div className="flex items-center gap-2.5 p-2 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                <Send className="h-4 w-4 text-purple-400 flex-shrink-0" />
                <span className="text-xs text-white/70 flex-1">Teste rápido</span>
                <SendTestMessageDialog sessions={sessions} onSend={handleSendTestMessage} />
              </div>

              {/* API Docs */}
              <button
                className="w-full flex items-center gap-2.5 p-2 rounded-lg border border-white/5 hover:border-white/10 transition-colors text-left"
                onClick={() => navigate("/api-docs")}
              >
                <BookOpen className="h-4 w-4 text-green-400 flex-shrink-0" />
                <span className="text-xs text-white/70 flex-1">Docs da API</span>
                <ArrowRight className="h-3.5 w-3.5 text-white/25" />
              </button>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
