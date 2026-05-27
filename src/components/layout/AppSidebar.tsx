import { useLocation, useNavigate, Link } from "react-router-dom";
import { LayoutDashboard, MessageSquare, CreditCard, BookOpen, Megaphone, Activity, LogOut, Building2, Users } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
}

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const isCollapsed = state === "collapsed";

  // Menu items with i18n
  const clientItems: NavItem[] = [
    { title: t('sidebar.dashboard'), url: "/dashboard", icon: LayoutDashboard },
    { title: t('sidebar.sessions'), url: "/sessions", icon: MessageSquare },
    { title: t('sidebar.monitoring'), url: "/monitoring", icon: Activity },
    { title: t('sidebar.subscriptions'), url: "/subscriptions", icon: CreditCard },
    { title: t('sidebar.apiDocs'), url: "/api-docs", icon: BookOpen },
  ];

  const adminItems: NavItem[] = [
    { title: t('sidebar.adminDashboard'), url: "/admin", icon: LayoutDashboard },
    { title: t('sidebar.organizations'), url: "/admin/organizations", icon: Building2 },
    { title: t('sidebar.users'), url: "/admin/users", icon: Users },
    { title: t('sidebar.subscriptions'), url: "/admin/subscriptions", icon: CreditCard },
    { title: t('sidebar.monitoring'), url: "/admin/monitoring", icon: Activity },
    { title: t('sidebar.announcements'), url: "/admin/announcements", icon: Megaphone },
  ];

  const adminToolItems: NavItem[] = [
    { title: t('sidebar.apiDocs'), url: "/api-docs", icon: BookOpen },
  ];

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || "");
        const { data } = await supabase
          .from("superadmin_users" as any)
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();
        setIsSuperAdmin(!!data);
      }
    };
    checkAdmin();
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
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
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50 bg-background/80 backdrop-blur-xl">
      {/* Branding Header */}
      <SidebarHeader>
        <Link to="/dashboard" className="flex items-center gap-3 px-2 py-3 hover:opacity-80 transition-opacity">
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
                {isCollapsed ? "⚡" : t('sidebar.admin')}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                {renderMenuItems(adminItems)}
              </SidebarGroupContent>
            </SidebarGroup>

            <Separator />

            <SidebarGroup>
              <SidebarGroupLabel className={isCollapsed ? "justify-center" : ""}>
                {isCollapsed ? "🔧" : t('sidebar.tools')}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                {renderMenuItems(adminToolItems)}
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : (
          <SidebarGroup>
            <SidebarGroupLabel className={isCollapsed ? "justify-center" : ""}>
              {isCollapsed ? "📊" : t('sidebar.mainMenu')}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              {renderMenuItems(clientItems)}
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip={isCollapsed ? t('sidebar.logout') : undefined}
            >
              <LogOut className="h-4 w-4" />
              {!isCollapsed && <span>{t('sidebar.logout')}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!isCollapsed && userEmail && (
          <div className="px-3 py-2 text-xs text-muted-foreground truncate">
            {userEmail}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
