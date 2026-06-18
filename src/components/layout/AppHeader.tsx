import { useLocation } from "react-router-dom";
import { Bell, Sun, Moon } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useOnlineSessions } from "@/hooks/useOnlineSessions";
import { useTheme } from "next-themes";

const routeMeta: Record<string, { title: string; description?: string }> = {
  "/dashboard":            { title: "Dashboard",       description: "Visão geral da sua conta" },
  "/sessions":             { title: "Sessões",          description: "Gerencie suas conexões WhatsApp" },
  "/monitoring":           { title: "Monitoramento",    description: "Status em tempo real" },
  "/webhooks":             { title: "Webhooks",         description: "Eventos e integrações" },
  "/subscriptions":        { title: "Assinaturas",      description: "Planos e cobranças" },
  "/api-docs":             { title: "Documentação",     description: "Referência da API" },
  "/announcements":        { title: "Avisos",           description: "Comunicados importantes" },
  "/admin":                { title: "Admin",            description: "Painel administrativo" },
  "/admin/organizations":  { title: "Organizações" },
  "/admin/users":          { title: "Usuários" },
  "/admin/subscriptions":  { title: "Assinaturas" },
  "/admin/monitoring":     { title: "Monitoramento" },
  "/admin/announcements":  { title: "Avisos" },
};

export function AppHeader() {
  const location = useLocation();
  const meta = routeMeta[location.pathname] ?? { title: "Hook7" };
  const { online, total } = useOnlineSessions();
  const { theme, setTheme } = useTheme();

  const showStatus = total > 0;

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

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {showStatus && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/40 px-3 py-1">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                online > 0
                  ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.8)]"
                  : "bg-red-500"
              }`}
            />
            <span className="text-xs font-medium text-foreground/70">
              {online} de {total} online
            </span>
          </div>
        )}

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setTheme(theme !== "light" ? "light" : "dark")}
          aria-label="Alternar tema"
        >
          {theme !== "light" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label="Notificações"
        >
          <Bell className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
