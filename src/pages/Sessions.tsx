import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import CreateSessionModal from "@/components/CreateSessionModal";
import SessionQrModal from "@/components/SessionQrModal";
import SessionManagementCard from "@/components/SessionManagementCard";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Search, Wifi, QrCode, WifiOff, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import * as hook7Api from "@/services/hook7Api";
import { isValidHook7Token } from "@/services/hook7Api";

interface SessionData {
  id: string;
  name: string;
  api_session: string | null;
  api_token: string | null;
  api_token_full: string | null;
  status: string | null;
  qr: string | null;
  organization_id: string;
  created_at?: string;
  updated_at?: string;
  requires_subscription?: boolean;
  pairing_code?: string | null;
  webhook_url?: string | null;
  webhook_enabled?: boolean;
  webhook_events?: string[];
}

interface SessionStatus {
  status: boolean;
  message?: string;
  qrCode?: string;
  pairingCode?: string;
}

interface OrgData {
  id: string;
  name: string;
  plan: string | null;
  session_limit: number | null;
  is_legacy: boolean;
}

const Sessions = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [orgData, setOrgData] = useState<OrgData | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionsStatus, setSessionsStatus] = useState<Record<string, SessionStatus>>({});
  const [creatingSession, setCreatingSession] = useState(false);
  const [startingSession, setStartingSession] = useState(false);
  const [refreshingQr, setRefreshingQr] = useState(false);
  const [closingSession, setClosingSession] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [qrExpiresIn, setQrExpiresIn] = useState<number | null>(null);
  const [generatingQrCode, setGeneratingQrCode] = useState(false);
  const [qrCodeKey, setQrCodeKey] = useState<string>("");
  const [reconfiguringSession, setReconfiguringSession] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  // Sessions manually disconnected by the user — polling must not override this with "connected"
  // until the user explicitly starts a new connection.
  const manuallyDisconnected = useRef<Set<string>>(new Set());

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const fetchSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      const { data: userRecord, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (userError) throw userError;

      if (!userRecord.organization_id) {
        toast.error(t("sessions.organizationNotFound"));
        navigate("/dashboard");
        return;
      }

      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", userRecord.organization_id)
        .single();

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
        .order("created_at", { ascending: false });

      if (sessionsError) {
        console.error("Error fetching sessions:", sessionsError);
      } else if (sessionsData?.length) {
        const typed: SessionData[] = sessionsData.map((s: any) => ({
          id: s.id,
          name: s.name,
          api_session: s.api_session,
          api_token: s.api_token,
          api_token_full: s.api_token_full,
          status: s.status,
          qr: s.qr,
          organization_id: s.organization_id,
          created_at: s.created_at,
          updated_at: s.updated_at,
          requires_subscription: s.requires_subscription,
          pairing_code: s.pairing_code,
          webhook_url: s.webhook_url,
          webhook_enabled: s.webhook_enabled,
          webhook_events: s.webhook_events,
        }));

        setSessions(typed);
        await Promise.all(
          typed.map((s) =>
            s.api_session && s.api_token
              ? fetchSessionStatus(s.id, s.api_session, s.api_token)
              : Promise.resolve()
          )
        );
      } else {
        setSessions([]);
      }
    } catch (error: any) {
      console.error("❌ Error fetching data:", error);
      toast.error(`${t("dashboard.errorLoadingData")}: ${error.message || t("common.error")}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionStatus = async (sessionId: string, apiSession: string, apiToken: string) => {
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

  const checkConnectionStatus = useCallback(
    async (sessionId: string, apiSession: string, apiToken: string) => {
      try {
        const result = await hook7Api.checkConnection(apiToken);
        setSessionsStatus((currentStatus) => {
          const current = currentStatus[sessionId];
          // If the user manually disconnected this session, don't let the API poll
          // flip it back to "connected" — Evolution Go may auto-reconnect the process
          // while the user intends it to stay offline.
          if (result.status === true && manuallyDisconnected.current.has(sessionId)) {
            return currentStatus;
          }
          if (result.status === true) return { ...currentStatus, [sessionId]: result };
          if (!current?.qrCode) return { ...currentStatus, [sessionId]: result };
          return currentStatus;
        });
      } catch {
        // silently ignore polling errors
      }
    },
    []
  );

  // ─── Session actions ─────────────────────────────────────────────────────────

  const handleReconfigureSession = async (session: SessionData) => {
    setReconfiguringSession(session.id);
    try {
      toast.info(t("sessions.reconfiguringSession"));
      const { data, error } = await supabase.functions.invoke("hook7-generate-session", {
        body: { session_name: session.name },
      });
      if (error) throw error;
      if (data.success) {
        toast.success(t("sessions.sessionReconfigured"));
        await fetchSessions();
      } else {
        throw new Error(data.error || t("sessions.reconfigureError"));
      }
    } catch (error: any) {
      toast.error(error.message || t("sessions.reconfigureError"));
    } finally {
      setReconfiguringSession(null);
    }
  };

  const handleStartSession = useCallback(
    async (session: SessionData) => {
      if (session.api_token && !isValidHook7Token(session.api_token)) {
        toast.warning(t("sessions.outdatedToken"));
        await handleReconfigureSession(session);
        return;
      }

      if (session.requires_subscription) {
        const { data: subscription } = await supabase
          .from("subscriptions" as any)
          .select("status")
          .eq("session_id", session.id)
          .eq("status", "active")
          .maybeSingle();
        if (!subscription) {
          toast.error(t("sessions.subscriptionRequired"));
          navigate(`/checkout?session_name=${session.name}`);
          return;
        }
      }

      if (!session.api_session) {
        toast.info(t("sessions.configuringSession"));
        setStartingSession(true);
        try {
          const { data: tokenData, error: tokenError } = await supabase.functions.invoke(
            "hook7-generate-session",
            { body: { session_name: session.name } }
          );
          if (tokenError || !tokenData.success)
            throw new Error(tokenError?.message || t("sessions.configuringError"));
          toast.success(t("sessions.sessionConfigured"));
          await fetchSessions();
        } catch (error: any) {
          toast.error(error.message || t("sessions.configuringError"));
        } finally {
          setStartingSession(false);
        }
        return;
      }

      if (!session.api_token) { toast.error(t("sessions.tokenNotFound")); return; }

      setStartingSession(true);
      setGeneratingQrCode(true);
      setSelectedSession(session);
      setShowSessionModal(true);
      manuallyDisconnected.current.delete(session.id);

      try {
        toast.info(t("sessions.connectingApi"));
        await hook7Api.connectInstance(session.api_token);

        const qrData = await hook7Api.fetchQRCode(session.api_token);
        if (qrData?.qrCode) {
          setSessionsStatus((prev) => ({
            ...prev,
            [session.id]: { status: false, message: "qrcode", qrCode: qrData.qrCode },
          }));
          setQrCodeKey(Date.now().toString());
          setGeneratingQrCode(false);
          toast.success(t("sessions.qrGenerated"));
          await supabase.from("sessions").update({ updated_at: new Date().toISOString() }).eq("id", session.id);
        } else {
          throw new Error(t("sessions.qrNotAvailable"));
        }
      } catch (error: any) {
        toast.error(error.message || t("sessions.startSessionError"));
        setGeneratingQrCode(false);
        setShowSessionModal(false);
      } finally {
        setStartingSession(false);
      }
    },
    [navigate]
  );

  const handleQrExpiration = async (session: SessionData) => {
    if (!session.api_session || !session.api_token) return;
    try {
      const result = await hook7Api.checkConnection(session.api_token);
      if (result.status === false) {
        setSessionsStatus((prev) => ({ ...prev, [session.id]: { status: false, message: "Disconnected" } }));
        setShowSessionModal(false);
        setSelectedSession(null);
        toast.info(t("sessions.qrExpiredMessage"), { duration: 5000 });
      } else if (result.status === true) {
        setSessionsStatus((prev) => ({ ...prev, [session.id]: result }));
        toast.success(t("sessions.sessionConnectedSuccess"));
      }
    } catch { /* ignore */ }
  };

  const handleCreateSession = async (sessionName: string) => {
    if (!orgData) return;

    if (orgData.is_legacy) {
      if (orgData.session_limit && sessions.length >= orgData.session_limit) {
        toast.error(t("sessions.limitReached", { limit: orgData.session_limit }));
        return;
      }
      setCreatingSession(true);
      try {
        const { data, error } = await supabase.functions.invoke("hook7-generate-session", {
          body: { session_name: sessionName },
        });
        if (error) throw error;
        if (data.success && data.session_id) {
          await fetchSessions();
          setShowCreateSessionModal(false);
          toast.success(t("sessions.sessionCreatedSuccess"));
        } else {
          throw new Error(data.error || t("sessions.tokenError"));
        }
      } catch (error: any) {
        toast.error(error.message || t("sessions.startSessionError"));
      } finally {
        setCreatingSession(false);
      }
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: userRecord } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", user.id)
        .single();
      if (!userRecord?.organization_id) return;

      const { data: existingSession } = await supabase
        .from("sessions")
        .select("id, status")
        .eq("name", sessionName)
        .eq("organization_id", userRecord.organization_id)
        .maybeSingle();

      if (existingSession) {
        toast.info(t("sessions.configurePayment"));
        navigate(`/checkout?session_id=${existingSession.id}&session_name=${encodeURIComponent(sessionName)}`);
      } else {
        const { data: newSession, error } = await supabase
          .from("sessions")
          .insert({ name: sessionName, organization_id: userRecord.organization_id, requires_subscription: true, status: "pending_payment" })
          .select()
          .single();
        if (error) { toast.error(t("sessions.startSessionError")); return; }
        toast.info(t("sessions.configurePayment"));
        navigate(`/checkout?session_id=${newSession.id}&session_name=${encodeURIComponent(sessionName)}`);
      }
    } catch {
      toast.error(t("sessions.startSessionError"));
    }
  };

  const handleRefreshQr = async (session: SessionData) => {
    if (!session.api_session || !session.api_token) { toast.error(t("sessions.sessionNotFound")); return; }
    setRefreshingQr(true);
    setGeneratingQrCode(true);
    try {
      toast.info(t("sessions.fetchingQr"));
      const qrData = await hook7Api.fetchQRCode(session.api_token);
      if (qrData?.qrCode) {
        setSessionsStatus((prev) => ({
          ...prev,
          [session.id]: { status: false, message: "qrcode", qrCode: qrData.qrCode },
        }));
        setQrCodeKey(Date.now().toString());
        setGeneratingQrCode(false);
        toast.success(t("sessions.qrUpdated"));
        await supabase.from("sessions").update({ updated_at: new Date().toISOString() }).eq("id", session.id);
      } else {
        throw new Error(t("sessions.qrNotAvailable"));
      }
    } catch (error: any) {
      toast.error(error.message || t("sessions.qrUpdateError"));
      setGeneratingQrCode(false);
    } finally {
      setRefreshingQr(false);
    }
  };

  const handleCloseSession = async (session: SessionData) => {
    if (!session.api_session || !session.api_token) { toast.error(t("sessions.sessionNotFound")); return; }
    setClosingSession(true);
    try {
      const success = await hook7Api.logoutInstance(session.api_token);
      if (success) {
        manuallyDisconnected.current.add(session.id);
        setSessionsStatus((prev) => ({ ...prev, [session.id]: { status: false, message: "offline" } }));
        toast.success(t("sessions.sessionDisconnected"));
        await fetchSessions();
      } else {
        throw new Error(t("sessions.disconnectError"));
      }
    } catch (error: any) {
      toast.error(error.message || t("sessions.disconnectError"));
    } finally {
      setClosingSession(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;
    if (session.status === "pending_payment") { toast.warning(t("sessions.pendingPaymentDelete")); return; }

    const { data: pendingSub } = await supabase
      .from("subscriptions" as any)
      .select("status")
      .eq("session_id", sessionId)
      .eq("status", "pending")
      .maybeSingle();
    if (pendingSub) { toast.warning(t("sessions.pendingPaymentDelete")); return; }

    setSessionToDelete(sessionId);
  };

  const confirmDeleteSession = async () => {
    const sessionId = sessionToDelete;
    setSessionToDelete(null);
    if (!sessionId) return;

    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    setLoggingOut(true);
    try {
      if (session.api_session && session.api_token) {
        try { await hook7Api.logoutInstance(session.api_token); } catch { /* continue */ }
        try { await hook7Api.deleteInstance(session.api_session, session.api_token); } catch { /* continue */ }
      }
      const { error } = await supabase.from("sessions").delete().eq("id", session.id);
      if (error) throw error;
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
      if (selectedSession?.id === session.id) { setSelectedSession(null); setShowSessionModal(false); }
      toast.success("Sessão excluída com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir sessão");
    } finally {
      setLoggingOut(false);
    }
  };

  // ─── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => { fetchSessions(); }, []);

  useEffect(() => {
    if (!sessions.length) return;
    const id = setInterval(() => {
      sessions.forEach((s) => {
        if (s.api_session && s.api_token) checkConnectionStatus(s.id, s.api_session, s.api_token);
      });
    }, 10000);
    return () => clearInterval(id);
  }, [sessions, checkConnectionStatus]);

  useEffect(() => {
    if (!selectedSession || !showSessionModal) return;
    const sessionStatus = sessionsStatus[selectedSession.id];
    if (sessionStatus?.status === false && (generatingQrCode || sessionStatus.qrCode)) {
      const id = setInterval(async () => {
        if (!selectedSession.api_session || !selectedSession.api_token) return;
        try {
          const qrData = await hook7Api.fetchQRCode(selectedSession.api_token);
          if (qrData?.qrCode) {
            setSessionsStatus((prev) => ({
              ...prev,
              [selectedSession.id]: { status: false, message: "qrcode", qrCode: qrData.qrCode },
            }));
            setGeneratingQrCode(false);
          }
        } catch { /* ignore */ }
      }, 5000);
      return () => clearInterval(id);
    }
  }, [selectedSession, showSessionModal, sessionsStatus, generatingQrCode]);

  useEffect(() => {
    if (selectedSession && sessionsStatus[selectedSession.id]?.qrCode && qrCodeKey) {
      setQrExpiresIn(120);
      const id = setInterval(() => {
        setQrExpiresIn((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(id);
            if (selectedSession) handleQrExpiration(selectedSession);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(id);
    } else {
      setQrExpiresIn(null);
    }
  }, [selectedSession, qrCodeKey]);

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const activeSessions = sessions.filter((s) => sessionsStatus[s.id]?.status === true);
  const qrCodeSessions = sessions.filter(
    (s) => sessionsStatus[s.id]?.qrCode || sessionsStatus[s.id]?.message?.toUpperCase() === "QRCODE"
  );
  const offlineSessions = sessions.filter(
    (s) => !sessionsStatus[s.id]?.status && !sessionsStatus[s.id]?.qrCode && sessionsStatus[s.id]?.message?.toUpperCase() !== "QRCODE"
  );

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const st = sessionsStatus[s.id];
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "online" && st?.status === true) ||
      (statusFilter === "offline" && !st?.status && !st?.qrCode) ||
      (statusFilter === "qrcode" && (st?.qrCode || st?.message?.toUpperCase() === "QRCODE"));
    return matchesSearch && matchesStatus;
  });

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Delete confirmation */}
      <AlertDialog
        open={!!sessionToDelete}
        onOpenChange={(open) => { if (!open) setSessionToDelete(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir sessão?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir{" "}
              <strong>"{sessions.find((s) => s.id === sessionToDelete)?.name}"</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteSession}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateSessionModal
        open={showCreateSessionModal}
        onSessionCreated={handleCreateSession}
        onClose={() => setShowCreateSessionModal(false)}
        isCreating={creatingSession}
      />

      <SessionQrModal
        session={selectedSession}
        status={selectedSession ? sessionsStatus[selectedSession.id] : null}
        open={showSessionModal}
        onClose={() => { setShowSessionModal(false); setQrExpiresIn(null); setQrCodeKey(""); }}
        onRefreshQr={() => selectedSession && handleRefreshQr(selectedSession)}
        onCloseSession={() => selectedSession && handleCloseSession(selectedSession)}
        onLogoutSession={() => selectedSession && handleDeleteSession(selectedSession.id)}
        refreshingQr={refreshingQr}
        closingSession={closingSession}
        loggingOut={loggingOut}
        generatingQrCode={generatingQrCode}
        qrExpiresIn={qrExpiresIn}
      />

      <div className="container mx-auto p-4 md:p-8 space-y-6">
        {/* ── Toolbar ────────────────────────────────────────────────────── */}
        <motion.div
          className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar sessão..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-muted/30 border-foreground/10 focus:border-primary/40"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44 bg-muted/30 border-foreground/10">
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="qrcode">Aguardando QR</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={() => setShowCreateSessionModal(true)}
            disabled={creatingSession}
            className="hook7-btn-glow gap-2 shrink-0"
          >
            <Plus className="h-4 w-4" />
            {t("sessions.newSession")}
          </Button>
        </motion.div>

        {/* ── Stats strip ────────────────────────────────────────────────── */}
        <motion.div
          className="flex flex-wrap gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {[
            {
              icon: MessageSquare,
              label: "Total",
              value: sessions.length,
              sub: orgData?.session_limit ? `de ${orgData.session_limit}` : "",
              dot: "bg-foreground/30",
            },
            {
              icon: Wifi,
              label: "Online",
              value: activeSessions.length,
              sub: "",
              dot: "bg-green-500",
            },
            {
              icon: QrCode,
              label: "Aguardando QR",
              value: qrCodeSessions.length,
              sub: "",
              dot: "bg-yellow-500",
            },
            {
              icon: WifiOff,
              label: "Offline",
              value: offlineSessions.length,
              sub: "",
              dot: "bg-red-500",
            },
          ].map(({ icon: Icon, label, value, sub, dot }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-lg border border-foreground/8 bg-muted/20 px-3 py-2"
            >
              <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${dot}`} />
              <span className="text-xs text-foreground/50">{label}</span>
              <span className="text-sm font-semibold text-foreground/80 tabular-nums">{value}</span>
              {sub && <span className="text-xs text-foreground/30">{sub}</span>}
            </div>
          ))}
        </motion.div>

        {/* ── Session cards ──────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : filteredSessions.length === 0 ? (
          <motion.div
            className="flex flex-col items-center justify-center py-20 gap-3 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="p-4 rounded-2xl bg-foreground/5">
              <MessageSquare className="h-8 w-8 text-foreground/20" />
            </div>
            <p className="text-sm text-foreground/40">
              {searchTerm || statusFilter !== "all"
                ? "Nenhuma sessão encontrada com os filtros aplicados"
                : "Nenhuma sessão criada ainda"}
            </p>
            {!searchTerm && statusFilter === "all" && (
              <Button
                variant="outline"
                size="sm"
                className="mt-1 border-foreground/10 text-foreground/60 hover:text-foreground"
                onClick={() => setShowCreateSessionModal(true)}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Criar primeira sessão
              </Button>
            )}
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.06 } },
            }}
            initial="hidden"
            animate="show"
          >
            {filteredSessions.map((session) => (
              <motion.div
                key={session.id}
                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
              >
                <SessionManagementCard
                  session={session}
                  status={sessionsStatus[session.id] || null}
                  onViewQr={() => { setSelectedSession(session); setShowSessionModal(true); }}
                  onStartSession={() => handleStartSession(session)}
                  onDelete={() => handleDeleteSession(session.id)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </>
  );
};

export default Sessions;
