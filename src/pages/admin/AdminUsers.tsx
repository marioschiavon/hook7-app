import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UserRow {
  id: string;
  email: string | null;
  name: string | null;
  role: string | null;
  created_at: string | null;
  organization_id: string | null;
  org_name?: string;
}

const AdminUsers = () => {
  const navigate = useNavigate();
  const { isSuperAdmin, loading: authLoading } = useSuperAdmin();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) navigate("/dashboard");
  }, [authLoading, isSuperAdmin, navigate]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchUsers();
  }, [isSuperAdmin]);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("users")
      .select("id, email, name, role, created_at, organization_id, organizations(name)")
      .order("created_at", { ascending: false });

    const mapped: UserRow[] = (data || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      created_at: u.created_at,
      organization_id: u.organization_id,
      org_name: u.organizations?.name || null,
    }));
    setUsers(mapped);
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

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-5">
      {/* summary strip */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Total", value: users.length, dot: "bg-foreground/30" },
          { label: "Admins", value: users.filter((u) => u.role === "admin").length, dot: "bg-blue-500" },
          { label: "Sem organização", value: users.filter((u) => !u.organization_id).length, dot: "bg-red-500" },
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
                <TableHead className="text-foreground/40 text-xs font-medium">Usuário</TableHead>
                <TableHead className="text-foreground/40 text-xs font-medium">Organização</TableHead>
                <TableHead className="text-foreground/40 text-xs font-medium">Role</TableHead>
                <TableHead className="text-foreground/40 text-xs font-medium">Criação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} className="border-foreground/5 hover:bg-foreground/3">
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-[11px] font-semibold text-primary flex-shrink-0">
                        {(u.name || u.email || "?").substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground/80">{u.name || "—"}</p>
                        <p className="text-[10px] text-foreground/40">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground/50 text-sm">
                    {u.org_name || <span className="text-foreground/25">Sem org</span>}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] h-5 px-1.5 ${
                        u.role === "superadmin"
                          ? "border-purple-500/30 text-purple-400"
                          : "border-foreground/10 text-foreground/40"
                      }`}
                    >
                      {u.role || "admin"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-foreground/40 text-xs">
                    {u.created_at ? format(new Date(u.created_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}
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

export default AdminUsers;
