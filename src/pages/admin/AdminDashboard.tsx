import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, MessageSquare, DollarSign, Activity, AlertTriangle, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, subMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

const PIE_COLORS = [
  "hsl(142 76% 42%)",
  "hsl(38 92% 50%)",
  "hsl(0 62% 52%)",
  "hsl(262 83% 62%)",
];

const STAGGER = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const ITEM = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { isSuperAdmin, loading: authLoading } = useSuperAdmin();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalOrgs: 0,
    totalUsers: 0,
    totalSessions: 0,
    monthlyRevenue: 0,
    totalMessagesSent: 0,
  });
  const [subsByStatus, setSubsByStatus] = useState<{ name: string; value: number }[]>([]);
  const [growthData, setGrowthData] = useState<{ month: string; users: number; sessions: number }[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentSubs, setRecentSubs] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<{ type: string; message: string }[]>([]);

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) navigate("/dashboard");
  }, [authLoading, isSuperAdmin, navigate]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchAll();
  }, [isSuperAdmin]);

  const fetchAll = async () => {
    try {
      const [orgRes, userRes, sessionRes, subsRes, recentUsersRes, recentSubsRes] =
        await Promise.all([
          supabase.from("organizations").select("*", { count: "exact", head: true }),
          supabase.from("users").select("*", { count: "exact", head: true }),
          supabase.from("sessions").select("*", { count: "exact", head: true }),
          supabase.from("subscriptions").select("status, amount"),
          supabase
            .from("users")
            .select("id, email, name, role, created_at, organization_id")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("subscriptions")
            .select(
              "id, status, amount, payment_provider, created_at, organization_id, plan_name, organizations(name)"
            )
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

      const subs = subsRes.data || [];
      const activeSubs = subs.filter((s) => s.status === "active");
      const revenue = activeSubs.reduce((sum, s) => sum + Number(s.amount || 0), 0);

      const allSessionsWithMessages = await supabase
        .from("sessions")
        .select("messages_sent_this_month");
      const totalMessages =
        allSessionsWithMessages.data?.reduce(
          (sum, s) => sum + (s.messages_sent_this_month || 0),
          0
        ) || 0;

      setMetrics({
        totalOrgs: orgRes.count || 0,
        totalUsers: userRes.count || 0,
        totalSessions: sessionRes.count || 0,
        monthlyRevenue: revenue,
        totalMessagesSent: totalMessages,
      });

      const statusMap: Record<string, number> = {};
      subs.forEach((s) => {
        statusMap[s.status] = (statusMap[s.status] || 0) + 1;
      });
      setSubsByStatus(
        Object.entries(statusMap).map(([name, value]) => ({ name, value }))
      );

      setRecentUsers(recentUsersRes.data || []);
      setRecentSubs(recentSubsRes.data || []);

      const [allUsers, allSessions] = await Promise.all([
        supabase.from("users").select("created_at"),
        supabase.from("sessions").select("created_at"),
      ]);
      const months: { month: string; users: number; sessions: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const start = startOfMonth(subMonths(new Date(), i));
        const end = startOfMonth(subMonths(new Date(), i - 1));
        const label = format(start, "MMM", { locale: ptBR });
        const u = (allUsers.data || []).filter(
          (x) => new Date(x.created_at) >= start && new Date(x.created_at) < end
        ).length;
        const s = (allSessions.data || []).filter(
          (x) => new Date(x.created_at) >= start && new Date(x.created_at) < end
        ).length;
        months.push({ month: label, users: u, sessions: s });
      }
      setGrowthData(months);

      const alertsList: { type: string; message: string }[] = [];
      const pastDue = subs.filter((s) => s.status === "past_due");
      if (pastDue.length > 0)
        alertsList.push({ type: "warning", message: `${pastDue.length} assinatura(s) com pagamento atrasado` });
      const cancelled = subs.filter((s) => s.status === "cancelled");
      if (cancelled.length > 0)
        alertsList.push({ type: "info", message: `${cancelled.length} assinatura(s) cancelada(s)` });
      setAlerts(alertsList);
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <div className="container mx-auto p-4 md:p-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  const tooltipStyle = {
    backgroundColor: "hsl(228 40% 5.5%)",
    border: "1px solid hsl(262 40% 16%)",
    borderRadius: "8px",
    color: "hsl(210 40% 96%)",
    fontSize: "12px",
  };

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-7">
      {/* ── Alerts ──────────────────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div className="flex flex-col gap-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-center gap-2.5 rounded-lg border px-4 py-2.5 text-sm ${
                alert.type === "warning"
                  ? "border-yellow-500/30 bg-yellow-500/8 text-yellow-400"
                  : "border-blue-500/30 bg-blue-500/8 text-blue-400"
              }`}
            >
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        variants={STAGGER}
        initial="hidden"
        animate="show"
      >
        {[
          { label: "Organizações",   value: metrics.totalOrgs,         color: "border-t-blue-500",   dot: "bg-blue-500",   icon: Building2 },
          { label: "Usuários",       value: metrics.totalUsers,        color: "border-t-green-500",  dot: "bg-green-500",  icon: Users },
          { label: "Sessões",        value: metrics.totalSessions,     color: "border-t-purple-500", dot: "bg-purple-500", icon: MessageSquare },
          { label: "Receita mensal", value: `R$ ${metrics.monthlyRevenue.toFixed(2)}`, color: "border-t-cyan-500", dot: "bg-cyan-500", icon: DollarSign },
        ].map(({ label, value, color, dot, icon: Icon }) => (
          <motion.div key={label} variants={ITEM}>
            <Card className={`glass-card border-t-2 border-x-foreground/5 border-b-foreground/5 ${color}`}>
              <CardHeader className="pb-1 pt-4">
                <CardDescription className="text-foreground/50 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Icon className="h-3 w-3" />
                  {label}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="text-3xl font-semibold text-foreground/90 tracking-tight tabular-nums">
                  {value}
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                  <span className="text-xs text-foreground/35">ao vivo</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Charts ──────────────────────────────────────────────────────────── */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="glass-card border-foreground/5">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardDescription className="text-[11px] font-semibold text-foreground/35 uppercase tracking-widest flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3" />
              Crescimento — últimos 6 meses
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={growthData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="users" name="Usuários" fill="hsl(142 76% 42%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sessions" name="Sessões" fill="hsl(262 83% 62%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card border-foreground/5">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardDescription className="text-[11px] font-semibold text-foreground/35 uppercase tracking-widest">
              Assinaturas por status
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            {subsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={subsByStatus}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={{ stroke: "rgba(255,255,255,0.2)" }}
                  >
                    {subsByStatus.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-foreground/25 text-sm">
                Sem dados de assinatura
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Recent activity ─────────────────────────────────────────────────── */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
      >
        {/* Recent users */}
        <Card className="glass-card border-foreground/5">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardDescription className="text-[11px] font-semibold text-foreground/35 uppercase tracking-widest flex items-center gap-1.5">
              <Users className="h-3 w-3" />
              Últimos usuários
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-4 divide-y divide-foreground/5">
            {recentUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-2.5 gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-[11px] font-semibold text-primary flex-shrink-0">
                    {(u.name || u.email || "?").substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground/80 truncate">{u.name || u.email}</p>
                    <p className="text-[10px] text-foreground/35 truncate">{u.email}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-foreground/10 text-foreground/50 flex-shrink-0">
                  {u.role}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent subscriptions */}
        <Card className="glass-card border-foreground/5">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardDescription className="text-[11px] font-semibold text-foreground/35 uppercase tracking-widest flex items-center gap-1.5">
              <DollarSign className="h-3 w-3" />
              Últimas assinaturas
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-4 divide-y divide-foreground/5">
            {recentSubs.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2.5 gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground/80 truncate">
                    {(s as any).organizations?.name || "—"}
                    {s.plan_name ? ` · ${s.plan_name}` : ""}
                  </p>
                  <p className="text-[10px] text-foreground/35">
                    R$ {Number(s.amount).toFixed(2)} · {s.payment_provider}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] h-5 px-1.5 flex-shrink-0 ${
                    s.status === "active"
                      ? "border-green-500/30 text-green-400"
                      : s.status === "past_due"
                      ? "border-yellow-500/30 text-yellow-400"
                      : "border-foreground/10 text-foreground/40"
                  }`}
                >
                  {s.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;
