import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Eye, Users, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrgRow {
  id: string;
  name: string;
  plan: string | null;
  is_legacy: boolean | null;
  realSubStatus: string | null;
  created_at: string | null;
  session_limit: number | null;
}

const AdminOrganizations = () => {
  const navigate = useNavigate();
  const { isSuperAdmin, loading: authLoading } = useSuperAdmin();
  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<OrgRow | null>(null);
  const [orgSessions, setOrgSessions] = useState<any[]>([]);
  const [orgUsers, setOrgUsers] = useState<any[]>([]);
  const [orgSubs, setOrgSubs] = useState<any[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) navigate("/dashboard");
  }, [authLoading, isSuperAdmin, navigate]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchOrgs();
  }, [isSuperAdmin]);

  const fetchOrgs = async () => {
    const [orgsRes, subsRes] = await Promise.all([
      supabase
        .from("organizations")
        .select("id, name, plan, is_legacy, created_at, session_limit")
        .order("created_at", { ascending: false }),
      supabase
        .from("subscriptions")
        .select("organization_id, status")
        .order("created_at", { ascending: false }),
    ]);

    // Map: org_id -> most recent subscription status
    const subStatusMap = new Map<string, string>();
    (subsRes.data || []).forEach((s) => {
      if (!subStatusMap.has(s.organization_id)) {
        subStatusMap.set(s.organization_id, s.status);
      }
    });

    const mapped: OrgRow[] = (orgsRes.data || []).map((org) => ({
      ...org,
      realSubStatus: subStatusMap.get(org.id) || null,
    }));

    setOrgs(mapped);
    setLoading(false);
  };

  const openDetails = async (org: OrgRow) => {
    setSelectedOrg(org);
    setDetailsOpen(true);
    const [sessions, users, subs] = await Promise.all([
      supabase.from("sessions").select("id, name, status, created_at").eq("organization_id", org.id),
      supabase.from("users").select("id, email, name, role, created_at").eq("organization_id", org.id),
      supabase.from("subscriptions").select("id, status, amount, payment_provider, plan_name, created_at").eq("organization_id", org.id).order("created_at", { ascending: false }),
    ]);
    setOrgSessions(sessions.data || []);
    setOrgUsers(users.data || []);
    setOrgSubs(subs.data || []);
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto p-4 md:p-8 space-y-4">
        <Skeleton className="h-8 w-40 rounded" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  const activeOrgs = orgs.filter((o) => o.realSubStatus === "active").length;

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-5">
      {/* summary strip */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Total", value: orgs.length, dot: "bg-foreground/30" },
          { label: "Com assinatura ativa", value: activeOrgs, dot: "bg-green-500" },
          { label: "Legacy", value: orgs.filter((o) => o.is_legacy).length, dot: "bg-yellow-500" },
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
                <TableHead className="text-foreground/40 text-xs font-medium">Nome</TableHead>
                <TableHead className="text-foreground/40 text-xs font-medium">Plano</TableHead>
                <TableHead className="text-foreground/40 text-xs font-medium">Status</TableHead>
                <TableHead className="text-foreground/40 text-xs font-medium">Legacy</TableHead>
                <TableHead className="text-foreground/40 text-xs font-medium">Criação</TableHead>
                <TableHead className="text-foreground/40 text-xs font-medium text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map((org) => (
                <TableRow key={org.id} className="border-foreground/5 hover:bg-foreground/3">
                  <TableCell className="font-medium text-foreground/80 text-sm">{org.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] border-foreground/15 text-foreground/50 h-5 px-1.5">
                      {org.plan || "starter"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] h-5 px-1.5 ${
                        org.realSubStatus === "active"
                          ? "border-green-500/30 text-green-400"
                          : org.realSubStatus === "past_due"
                          ? "border-yellow-500/30 text-yellow-400"
                          : "border-foreground/10 text-foreground/35"
                      }`}
                    >
                      {org.realSubStatus || "Sem assinatura"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {org.is_legacy ? (
                      <Badge variant="outline" className="text-[10px] border-yellow-500/30 text-yellow-400 h-5 px-1.5">
                        Legacy
                      </Badge>
                    ) : (
                      <span className="text-foreground/25 text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-foreground/40 text-xs">
                    {org.created_at ? format(new Date(org.created_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2.5 text-xs text-foreground/50 hover:text-foreground border border-foreground/10 hover:border-foreground/20"
                      onClick={() => openDetails(org)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground/90">{selectedOrg?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            {/* Meta */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Plano", value: selectedOrg?.plan || "starter" },
                { label: "Legacy", value: selectedOrg?.is_legacy ? "Sim" : "Não" },
                { label: "Limite sessões", value: String(selectedOrg?.session_limit || 1) },
                { label: "Status", value: selectedOrg?.realSubStatus || "Sem assinatura" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg border border-foreground/8 bg-muted/20 px-3 py-2">
                  <p className="text-[10px] text-foreground/35 uppercase tracking-wider mb-0.5">{label}</p>
                  <p className="text-sm font-medium text-foreground/70">{value}</p>
                </div>
              ))}
            </div>

            {/* Sessions */}
            <div>
              <p className="text-[11px] font-semibold text-foreground/35 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <MessageSquare className="h-3 w-3" /> Sessões ({orgSessions.length})
              </p>
              <div className="divide-y divide-foreground/5 rounded-lg border border-foreground/8 overflow-hidden">
                {orgSessions.length === 0 ? (
                  <p className="text-xs text-foreground/30 p-3">Nenhuma sessão</p>
                ) : orgSessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="text-foreground/70">{s.name || "Sem nome"}</span>
                    <Badge variant="outline" className="text-[10px] border-foreground/10 text-foreground/40 h-5 px-1.5">
                      {s.status || "N/A"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Users */}
            <div>
              <p className="text-[11px] font-semibold text-foreground/35 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Users className="h-3 w-3" /> Usuários ({orgUsers.length})
              </p>
              <div className="divide-y divide-foreground/5 rounded-lg border border-foreground/8 overflow-hidden">
                {orgUsers.length === 0 ? (
                  <p className="text-xs text-foreground/30 p-3">Nenhum usuário</p>
                ) : orgUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div>
                      <p className="text-foreground/70">{u.name || u.email}</p>
                      <p className="text-[10px] text-foreground/35">{u.email}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-foreground/10 text-foreground/40 h-5 px-1.5">
                      {u.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Subscriptions */}
            <div>
              <p className="text-[11px] font-semibold text-foreground/35 uppercase tracking-widest mb-2">
                Assinaturas ({orgSubs.length})
              </p>
              <div className="divide-y divide-foreground/5 rounded-lg border border-foreground/8 overflow-hidden">
                {orgSubs.length === 0 ? (
                  <p className="text-xs text-foreground/30 p-3">Nenhuma assinatura</p>
                ) : orgSubs.map((s) => (
                  <div key={s.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div>
                      <p className="text-foreground/70">{s.plan_name} · R$ {Number(s.amount).toFixed(2)}</p>
                      <p className="text-[10px] text-foreground/35">{s.payment_provider}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] h-5 px-1.5 ${
                        s.status === "active" ? "border-green-500/30 text-green-400" : "border-foreground/10 text-foreground/40"
                      }`}
                    >
                      {s.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrganizations;
