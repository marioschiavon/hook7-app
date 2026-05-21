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
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
}

const clientItems: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Sessões", url: "/sessions", icon: MessageSquare },
  { title: "Assinaturas", url: "/subscriptions", icon: CreditCard },
  { title: "Documentação API", url: "/api-docs", icon: BookOpen },
];

const adminItems: NavItem[] = [
  { title: "Dashboard Admin", url: "/admin", icon: LayoutDashboard },
  { title: "Organizações", url: "/admin/organizations", icon: Building2 },
  { title: "Usuários", url: "/admin/users", icon: Users },
  { title: "Assinaturas", url: "/admin/subscriptions", icon: CreditCard },
  { title: "Monitoramento", url: "/admin/monitoring", icon: Activity },
  { title: "Anúncios", url: "/admin/announcements", icon: Megaphone },
];

const adminToolItems: NavItem[] = [
  { title: "Documentação API", url: "/api-docs", icon: BookOpen },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const isCollapsed = state === "collapsed";

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
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent>
        {isSuperAdmin ? (
          <>
            <SidebarGroup>
              <SidebarGroupLabel className={isCollapsed ? "justify-center" : ""}>
                {isCollapsed ? "⚡" : "Admin"}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                {renderMenuItems(adminItems)}
              </SidebarGroupContent>
            </SidebarGroup>

            <Separator />

            <SidebarGroup>
              <SidebarGroupLabel className={isCollapsed ? "justify-center" : ""}>
                {isCollapsed ? "🔧" : "Ferramentas"}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                {renderMenuItems(adminToolItems)}
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : (
          <SidebarGroup>
            <SidebarGroupLabel className={isCollapsed ? "justify-center" : ""}>
              {isCollapsed ? "📊" : "Menu Principal"}
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
              tooltip={isCollapsed ? "Sair" : undefined}
            >
              <LogOut className="h-4 w-4" />
              {!isCollapsed && <span>Sair</span>}
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
