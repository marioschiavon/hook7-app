import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Building2, Users, MessageSquare, DollarSign, Activity, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = ["hsl(142, 76%, 36%)", "hsl(38, 92%, 50%)", "hsl(0, 62%, 50%)", "hsl(215, 20%, 65%)"];

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
    if (!authLoading && !isSuperAdmin) {
      navigate("/dashboard");
    }
  }, [authLoading, isSuperAdmin, navigate]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchAll();
  }, [isSuperAdmin]);

  const fetchAll = async () => {
    try {
      const [orgRes, userRes, sessionRes, subsRes, recentUsersRes, recentSubsRes] = await Promise.all([
        supabase.from("organizations").select("*", { count: "exact", head: true }),
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("sessions").select("*", { count: "exact", head: true }),
        supabase.from("subscriptions").select("status, amount"),
        supabase.from("users").select("id, email, name, role, created_at, organization_id").order("created_at", { ascending: false }).limit(5),
        supabase.from("subscriptions").select("id, status, amount, payment_provider, created_at, organization_id, plan_name, organizations(name)").order("created_at", { ascending: false }).limit(5),
      ]);

      // Metrics
      const subs = subsRes.data || [];
      const activeSubs = subs.filter((s) => s.status === "active");
      const revenue = activeSubs.reduce((sum, s) => sum + Number(s.amount || 0), 0);

      const allSessionsWithMessages = await supabase.from("sessions").select("messages_sent_this_month");
      const totalMessages = allSessionsWithMessages.data?.reduce((sum, s) => sum + (s.messages_sent_this_month || 0), 0) || 0;

      setMetrics({
        totalOrgs: orgRes.count || 0,
        totalUsers: userRes.count || 0,
        totalSessions: sessionRes.count || 0,
        monthlyRevenue: revenue,
        totalMessagesSent: totalMessages,
      });

      // Subs by status
      const statusMap: Record<string, number> = {};
      subs.forEach((s) => {
        statusMap[s.status] = (statusMap[s.status] || 0) + 1;
      });
      setSubsByStatus(Object.entries(statusMap).map(([name, value]) => ({ name, value })));

      // Recent
      setRecentUsers(recentUsersRes.data || []);
      setRecentSubs(recentSubsRes.data || []);

      // Growth data (last 6 months)
      const allUsers = await supabase.from("users").select("created_at");
      const allSessions = await supabase.from("sessions").select("created_at");
      const months: { month: string; users: number; sessions: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const start = startOfMonth(subMonths(new Date(), i));
        const end = startOfMonth(subMonths(new Date(), i - 1));
        const label = format(start, "MMM", { locale: ptBR });
        const usersInMonth = (allUsers.data || []).filter(
          (u) => new Date(u.created_at) >= start && new Date(u.created_at) < end
        ).length;
        const sessionsInMonth = (allSessions.data || []).filter(
          (s) => new Date(s.created_at) >= start && new Date(s.created_at) < end
        ).length;
        months.push({ month: label, users: usersInMonth, sessions: sessionsInMonth });
      }
      setGrowthData(months);

      // Alerts
      const alertsList: { type: string; message: string }[] = [];
      const pastDue = subs.filter((s) => s.status === "past_due");
      if (pastDue.length > 0) {
        alertsList.push({ type: "warning", message: `${pastDue.length} assinatura(s) com pagamento atrasado` });
      }
      const cancelled = subs.filter((s) => s.status === "cancelled");
      if (cancelled.length > 0) {
        alertsList.push({ type: "info", message: `${cancelled.length} assinatura(s) cancelada(s)` });
      }
      setAlerts(alertsList);
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Painel Administrativo</h1>
        <p className="text-muted-foreground">Visão geral do sistema</p>
      </div>

      {/* Metrics */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
        initial="hidden"
        animate="show"
      >
        {[
          { title: "Organizações", value: metrics.totalOrgs, icon: Building2, color: "blue" as const },
          { title: "Usuários", value: metrics.totalUsers, icon: Users, color: "green" as const },
          { title: "Sessões", value: metrics.totalSessions, icon: MessageSquare, color: "orange" as const },
          { title: "Mensagens", value: metrics.totalMessagesSent, icon: Activity, color: "purple" as const },
          { title: "Receita Mensal", value: `R$ ${metrics.monthlyRevenue.toFixed(2)}`, icon: DollarSign, color: "green" as const },
        ].map((stat) => (
          <motion.div key={stat.title} variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
            <StatsCard title={stat.title} value={stat.value} icon={stat.icon} color={stat.color} />
          </motion.div>
        ))}
      </motion.div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Alertas do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((alert, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Badge variant={alert.type === "warning" ? "destructive" : "secondary"}>{alert.type}</Badge>
                <span>{alert.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Crescimento (últimos 6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="users" name="Usuários" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sessions" name="Sessões" fill="hsl(142, 76%, 56%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assinaturas por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {subsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={subsByStatus} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {subsByStatus.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">Sem dados</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimos Usuários</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{u.name || u.email}</p>
                  <p className="text-muted-foreground text-xs">{u.email}</p>
                </div>
                <Badge variant="outline">{u.role}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimas Assinaturas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentSubs.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{(s as any).organizations?.name || "—"} · {s.plan_name}</p>
                  <p className="text-muted-foreground text-xs">R$ {Number(s.amount).toFixed(2)} · {s.payment_provider}</p>
                </div>
                <Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
