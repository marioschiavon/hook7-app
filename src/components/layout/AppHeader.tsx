import { useLocation } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { UserMenu } from "./UserMenu";

const routeMeta: Record<string, { title: string; description?: string }> = {
  "/dashboard":    { title: "Dashboard",     description: "Visão geral da sua conta" },
  "/sessions":     { title: "Sessões",        description: "Gerencie suas conexões WhatsApp" },
  "/monitoring":   { title: "Monitoramento",  description: "Status em tempo real" },
  "/subscriptions":{ title: "Assinaturas",    description: "Planos e cobranças" },
  "/api-docs":     { title: "Documentação",   description: "Referência da API" },
  "/announcements":{ title: "Avisos",         description: "Comunicados importantes" },
  "/admin":        { title: "Admin",          description: "Painel administrativo" },
  "/admin/organizations": { title: "Organizações" },
  "/admin/users":         { title: "Usuários" },
  "/admin/subscriptions": { title: "Assinaturas" },
  "/admin/monitoring":    { title: "Monitoramento" },
  "/admin/announcements": { title: "Avisos" },
};

export function AppHeader() {
  const location = useLocation();
  const meta = routeMeta[location.pathname] ?? { title: "Hook7" };

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border/50 bg-background/70 backdrop-blur-xl px-4 transition-all">
      <SidebarTrigger className="-ml-1 shrink-0" />
      <Separator orientation="vertical" className="h-5 opacity-30 shrink-0" />

      {/* Page title */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground/90 leading-tight truncate">
          {meta.title}
        </p>
        {meta.description && (
          <p className="text-xs text-muted-foreground leading-tight truncate hidden sm:block">
            {meta.description}
          </p>
        )}
      </div>

      <UserMenu />
    </header>
  );
}
