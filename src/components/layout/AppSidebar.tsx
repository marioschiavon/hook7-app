import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  CreditCard,
  BookOpen,
  Megaphone,
  Activity,
  LogOut,
  Building2,
  Users,
  ChevronUp,
  Webhook,
  Bell,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
}

interface OrgInfo {
  name: string;
  plan: string | null;
  sessionCount: number;
  onlineSessions: number;
}

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [activeSessions, setActiveSessions] = useState<number | null>(null);
  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null);

  const isCollapsed = state === "collapsed";

  const clientItems: NavItem[] = [
    { title: t("sidebar.dashboard"), url: "/dashboard", icon: LayoutDashboard },
    { title: t("sidebar.sessions"), url: "/sessions", icon: MessageSquare },
    { title: t("sidebar.monitoring"), url: "/monitoring", icon: Activity },
    { title: t("sidebar.webhooks"), url: "/webhooks", icon: Webhook },
    { title: t("sidebar.subscriptions"), url: "/subscriptions", icon: CreditCard },
    { title: t("sidebar.apiDocs"), url: "/api-docs", icon: BookOpen },
  ];

  const adminItems: NavItem[] = [
    { title: t("sidebar.adminDashboard"), url: "/admin", icon: LayoutDashboard },
    { title: t("sidebar.organizations"), url: "/admin/organizations", icon: Building2 },
    { title: t("sidebar.users"), url: "/admin/users", icon: Users },
    { title: t("sidebar.subscriptions"), url: "/admin/subscriptions", icon: CreditCard },
    { title: t("sidebar.monitoring"), url: "/admin/monitoring", icon: Activity },
    { title: t("sidebar.announcements"), url: "/admin/announcements", icon: Megaphone },
  ];

  const adminToolItems: NavItem[] = [
    { title: t("sidebar.apiDocs"), url: "/api-docs", icon: BookOpen },
  ];

  useEffect(() => {
    const loadData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setUserEmail(user.email || "");

      const { data: adminData } = await supabase
        .from("superadmin_users" as any)
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      setIsSuperAdmin(!!adminData);

      const { data: userRecord } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", user.id)
        .maybeSingle();

      if (userRecord?.organization_id) {
        const orgId = userRecord.organization_id;

        const [{ count: sessionCount }, { data: org }] = await Promise.all([
          supabase
            .from("sessions")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", orgId),
          supabase
            .from("organizations")
            .select("name, plan")
            .eq("id", orgId)
            .maybeSingle(),
        ]);

        setActiveSessions(sessionCount ?? 0);
        if (org) {
          setOrgInfo({
            name: org.name,
            plan: org.plan,
            sessionCount: sessionCount ?? 0,
            onlineSessions: 0,
          });
        }
      }
    };
    loadData();
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const getInitials = (email: string) => email.substring(0, 2).toUpperCase();

  const planLabel = (plan: string | null) => {
    if (!plan) return "Free";
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  };

  const renderMenuItems = (items: NavItem[]) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.url}>
          <SidebarMenuButton
            asChild
            isActive={isActive(item.url)}
            tooltip={isCollapsed ? item.title : undefined}
          >
            <Link to={item.url}>
              <item.icon className="h-4 w-4" />
              {!isCollapsed && <span>{item.title}</span>}
            </Link>
          </SidebarMenuButton>
          {item.url === "/sessions" && activeSessions !== null && activeSessions > 0 && (
            <SidebarMenuBadge>{activeSessions}</SidebarMenuBadge>
          )}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50 bg-background/80 backdrop-blur-xl">
      {/* Logo */}
      <SidebarHeader>
        <Link
          to="/dashboard"
          className="flex items-center gap-3 px-2 py-3 hover:opacity-80 transition-opacity"
        >
          <img
            src="/hook7-logo.svg"
            alt="Hook7"
            width="32"
            height="32"
            className="h-8 w-8 rounded-full flex-shrink-0"
          />
          {!isCollapsed && (
            <span className="text-xl font-bold font-['Space_Grotesk'] hook7-gradient-text truncate">
              Hook7
            </span>
          )}
        </Link>
      </SidebarHeader>

      <Separator />

      <SidebarContent>
        {isSuperAdmin ? (
          <>
            <SidebarGroup>
              <SidebarGroupLabel className={isCollapsed ? "justify-center" : ""}>
                {isCollapsed ? "⚡" : t("sidebar.admin")}
              </SidebarGroupLabel>
              <SidebarGroupContent>{renderMenuItems(adminItems)}</SidebarGroupContent>
            </SidebarGroup>
            <Separator />
            <SidebarGroup>
              <SidebarGroupLabel className={isCollapsed ? "justify-center" : ""}>
                {isCollapsed ? "🔧" : t("sidebar.tools")}
              </SidebarGroupLabel>
              <SidebarGroupContent>{renderMenuItems(adminToolItems)}</SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : (
          <SidebarGroup>
            <SidebarGroupLabel className={isCollapsed ? "justify-center" : ""}>
              {isCollapsed ? "📊" : t("sidebar.mainMenu")}
            </SidebarGroupLabel>
            <SidebarGroupContent>{renderMenuItems(clientItems)}</SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer: org info + user dropdown */}
      <SidebarFooter className="pb-2">
        {/* Org summary — only when expanded */}
        {!isCollapsed && orgInfo && (
          <div className="mx-2 mb-2 rounded-lg border border-border/40 bg-muted/30 px-3 py-2">
            <p className="truncate text-[11px] font-medium text-foreground/70">{orgInfo.name}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <Badge
                variant="outline"
                className="h-4 border-primary/30 px-1.5 py-0 text-[9px] font-medium text-primary/80"
              >
                {planLabel(orgInfo.plan)}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {orgInfo.sessionCount} sess{orgInfo.sessionCount !== 1 ? "ões" : "ão"}
              </span>
            </div>
          </div>
        )}

        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent"
                  tooltip={isCollapsed ? userEmail : undefined}
                >
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                      {getInitials(userEmail)}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs font-medium leading-tight truncate">{userEmail}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          {isSuperAdmin ? "Superadmin" : planLabel(orgInfo?.plan ?? null)}
                        </p>
                      </div>
                      <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </>
                  )}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56 mb-1">
                <div className="px-2 py-1.5">
                  <p className="text-xs font-medium truncate">{userEmail}</p>
                  <p className="text-xs text-muted-foreground">
                    {isSuperAdmin ? "Superadmin" : planLabel(orgInfo?.plan ?? null)}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("sidebar.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
