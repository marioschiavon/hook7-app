import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { RefreshCw, Activity, Zap, AlertCircle, QrCode, Eye, WifiOff } from "lucide-react";
import SessionDetailsModal from "@/components/SessionDetailsModal";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as hook7Api from "@/services/hook7Api";

interface SessionData {
  id: string;
  name: string;
  api_session: string | null;
  api_token: string | null;
  api_token_full: string | null;
  plan: string | null;
  created_at: string;
  updated_at: string;
  api_message_usage: number | null;
  api_message_limit: number | null;
  session_limit: number | null;
  agent_limit: number | null;
  status?: "online" | "offline" | "qrcode" | "loading" | "no-session";
  statusMessage?: string;
}

type FilterType = "all" | "online" | "offline" | "qrcode" | "no-session";

const STATUS_CONFIG = {
  online:     { label: "Online",       dot: "bg-green-500",  badge: "border-green-500/30 text-green-400" },
  qrcode:     { label: "QR Code",      dot: "bg-yellow-500", badge: "border-yellow-500/30 text-yellow-400" },
  offline:    { label: "Offline",      dot: "bg-red-500",    badge: "border-red-500/30 text-red-400" },
  "no-session": { label: "Sem sessão", dot: "bg-white/20",   badge: "border-white/10 text-white/35" },
  loading:    { label: "Verificando",  dot: "bg-white/20",   badge: "border-white/10 text-white/35" },
};

const STAGGER = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const ITEM = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const SessionMonitoring = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    const checkSuperAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      const { data: adminData, error } = await supabase
        .from("superadmin_users" as any)
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !adminData) {
        toast.error("Acesso negado — apenas superadmin");
        navigate("/dashboard");
        return;
      }
      fetchSessions();
    };
    checkSuperAdmin();
  }, [navigate]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const { data: sessionsData, error } = await supabase
        .from("sessions")
        .select("*, organizations(name, plan, session_limit, agent_limit)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped: SessionData[] = (sessionsData as any[]).map((s) => ({
        id: s.id,
        name: s.name,
        api_session: s.api_session || null,
        api_token: s.api_token || null,
        api_token_full: s.api_token_full || null,
        plan: s.organizations?.plan || null,
        created_at: s.created_at,
        updated_at: s.updated_at,
        api_message_usage: s.api_message_usage || 0,
        api_message_limit: s.api_message_limit || 3000,
        session_limit: s.organizations?.session_limit || 0,
        agent_limit: s.organizations?.agent_limit || 0,
        status: "loading" as const,
        statusMessage: "Verificando...",
      }));
      setSessions(mapped);

      const statusResults = await Promise.all(
        (sessionsData as any[]).map(async (s) => {
          if (!s.api_session || !s.api_token)
            return { id: s.id, status: "no-session" as const, statusMessage: "Sem sessão ativa" };
          try {
            const res = await hook7Api.checkConnection(s.api_token);
            if (res.message === "QRCODE") return { id: s.id, status: "qrcode" as const, statusMessage: "Aguardando QR Code" };
            return { id: s.id, status: res.status ? ("online" as const) : ("offline" as const), statusMessage: res.message || "Desconhecido" };
          } catch {
            return { id: s.id, status: "offline" as const, statusMessage: "Erro ao verificar" };
          }
        })
      );

      setSessions((prev) =>
        prev.map((s) => {
          const upd = statusResults.find((r) => r.id === s.id);
          return upd ? { ...s, ...upd } : s;
        })
      );
    } catch {
      toast.error("Erro ao carregar sessões");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSessions();
    setRefreshing(false);
    toast.success("Sessões atualizadas");
  };

  useEffect(() => {
    const iv = setInterval(fetchSessions, 1_800_000);
    return () => clearInterval(iv);
  }, []);

  const count = (f: FilterType) => {
    if (f === "all") return sessions.length;
    if (f === "offline") return sessions.filter((s) => s.status === "offline" || s.status === "no-session").length;
    return sessions.filter((s) => s.status === f).length;
  };

  const filtered = sessions.filter((s) => {
    if (filter === "all") return true;
    if (filter === "offline") return s.status === "offline" || s.status === "no-session";
    return s.status === filter;
  });

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-8 space-y-5">
        <div className="flex flex-wrap gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-9 w-32 rounded-lg" />)}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Filter chips */}
        <motion.div
          className="flex flex-wrap gap-2"
          variants={STAGGER}
          initial="hidden"
          animate="show"
        >
          {(
            [
              { f: "all" as FilterType,    label: "Todas",   dot: "bg-white/30", count: count("all") },
              { f: "online" as FilterType, label: "Online",  dot: "bg-green-500", count: count("online") },
              { f: "qrcode" as FilterType, label: "QR Code", dot: "bg-yellow-500", count: count("qrcode") },
              { f: "offline" as FilterType,label: "Offline", dot: "bg-red-500",   count: count("offline") },
            ] as const
          ).map(({ f, label, dot, count: n }) => (
            <motion.button
              key={f}
              variants={ITEM}
              onClick={() => setFilter(f)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                filter === f
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-white/8 bg-muted/20 text-white/50 hover:border-white/15 hover:text-white/70"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
              {label}
              <span className="tabular-nums font-semibold text-inherit">{n}</span>
            </motion.button>
          ))}
        </motion.div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
          className="border-white/10 text-white/60 hover:text-white hover:border-white/20 h-9"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Table */}
      <Card className="glass-card border-white/5 overflow-hidden">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Activity className="h-8 w-8 text-white/15" />
              <p className="text-sm text-white/30">Nenhuma sessão com este filtro</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-white/40 text-xs font-medium">Status</TableHead>
                  <TableHead className="text-white/40 text-xs font-medium">Nome</TableHead>
                  <TableHead className="text-white/40 text-xs font-medium">API Session</TableHead>
                  <TableHead className="text-white/40 text-xs font-medium">Plano</TableHead>
                  <TableHead className="text-white/40 text-xs font-medium">Última ação</TableHead>
                  <TableHead className="text-white/40 text-xs font-medium text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((session) => {
                  const cfg = STATUS_CONFIG[session.status ?? "loading"];
                  return (
                    <TableRow key={session.id} className="border-white/5 hover:bg-white/3">
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                          <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${cfg.badge}`}>
                            {cfg.label}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-white/80">
                        {session.name || "Sem nome"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-white/40">
                        {session.api_session || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] border-white/15 text-white/50 h-5 px-1.5">
                          {session.plan || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-white/40">
                        {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true, locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedSession(session); setModalOpen(true); }}
                          className="h-7 px-2.5 text-xs text-white/50 hover:text-white border border-white/10 hover:border-white/20"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <SessionDetailsModal
        session={selectedSession}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
};

export default SessionMonitoring;
