import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SubRow {
  id: string;
  status: string;
  amount: number;
  plan_name: string;
  payment_provider: string | null;
  next_payment_date: string | null;
  created_at: string | null;
  org_name?: string;
  session_name?: string;
}

const AdminSubscriptions = () => {
  const navigate = useNavigate();
  const { isSuperAdmin, loading: authLoading } = useSuperAdmin();
  const [loading, setLoading] = useState(true);
  const [subs, setSubs] = useState<SubRow[]>([]);

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) navigate("/dashboard");
  }, [authLoading, isSuperAdmin, navigate]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchSubs();
  }, [isSuperAdmin]);

  const fetchSubs = async () => {
    const { data } = await supabase
      .from("subscriptions")
      .select("id, status, amount, plan_name, payment_provider, next_payment_date, created_at, organization_id, session_id, organizations(name), sessions(name)")
      .order("created_at", { ascending: false });

    const mapped: SubRow[] = (data || []).map((s: any) => ({
      id: s.id,
      status: s.status,
      amount: Number(s.amount),
      plan_name: s.plan_name,
      payment_provider: s.payment_provider,
      next_payment_date: s.next_payment_date,
      created_at: s.created_at,
      org_name: s.organizations?.name || null,
      session_name: s.sessions?.name || null,
    }));
    setSubs(mapped);
    setLoading(false);
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto p-4 md:p-8 space-y-4">
        <Skeleton className="h-8 w-40 rounded" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  const statusBadge = (status: string) => {
    if (status === "active") return "border-green-500/30 text-green-400";
    if (status === "past_due") return "border-yellow-500/30 text-yellow-400";
    if (status === "cancelled") return "border-red-500/30 text-red-400";
    return "border-foreground/10 text-foreground/40";
  };

  const activeCount = subs.filter((s) => s.status === "active").length;
  const pastDueCount = subs.filter((s) => s.status === "past_due").length;
  const revenue = subs.filter((s) => s.status === "active").reduce((sum, s) => sum + Number(s.amount), 0);

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-5">
      {/* summary strip */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Total", value: subs.length, dot: "bg-foreground/30" },
          { label: "Ativas", value: activeCount, dot: "bg-green-500" },
          { label: "Atrasadas", value: pastDueCount, dot: "bg-yellow-500" },
          { label: "Receita mensal", value: `R$ ${revenue.toFixed(2)}`, dot: "bg-cyan-500" },
        ].map(({ label, value, dot }) => (
          <div key={label} className="flex items-center gap-2 rounded-lg border border-foreground/8 bg-muted/20 px-3 py-2">
            <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
            <span className="text-xs text-foreground/50">{label}</span>
            <span className="text-sm font-semibold text-foreground/80 tabular-nums">{value}</span>
          </div>
        ))}
      </div>

      <Card className="glass-card border-foreground/5 overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-foreground/5 hover:bg-transparent">
                <TableHead className="text-foreground/40 text-xs font-medium">Organização</TableHead>
                <TableHead className="text-foreground/40 text-xs font-medium">Sessão</TableHead>
                <TableHead className="text-foreground/40 text-xs font-medium">Plano</TableHead>
                <TableHead className="text-foreground/40 text-xs font-medium">Valor</TableHead>
                <TableHead className="text-foreground/40 text-xs font-medium">Status</TableHead>
                <TableHead className="text-foreground/40 text-xs font-medium">Provedor</TableHead>
                <TableHead className="text-foreground/40 text-xs font-medium">Próx. cobrança</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subs.map((s) => (
                <TableRow key={s.id} className="border-foreground/5 hover:bg-foreground/3">
                  <TableCell className="text-sm font-medium text-foreground/80">{s.org_name || "—"}</TableCell>
                  <TableCell className="text-sm text-foreground/50">{s.session_name || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] border-foreground/15 text-foreground/50 h-5 px-1.5">
                      {s.plan_name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-foreground/70 tabular-nums">
                    R$ {Number(s.amount).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${statusBadge(s.status)}`}>
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-foreground/40 text-xs">{s.payment_provider || "—"}</TableCell>
                  <TableCell className="text-foreground/40 text-xs">
                    {s.next_payment_date
                      ? format(new Date(s.next_payment_date), "dd/MM/yyyy", { locale: ptBR })
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSubscriptions;
