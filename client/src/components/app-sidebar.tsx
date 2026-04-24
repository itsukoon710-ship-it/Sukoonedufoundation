import { Link, useLocation } from "wouter";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Users, MapPin, UserCheck, FileText, ClipboardList,
  Award, BarChart2, LogOut, Plus, CreditCard, Settings2,
} from "lucide-react";
import { useAuth, useLogout } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation as useWouterLocation } from "wouter";

const adminMenuItems = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Students", url: "/students", icon: Users },
    { title: "Room Allotment", url: "/room-allotment", icon: Users }, // Using Users icon for now, can change to a building icon later
    { title: "Gate Entry", url: "/gate-entry", icon: Search }, // Using Search icon for now
    { title: "Centers", url: "/centers", icon: MapPin },
    { title: "Coordinators", url: "/coordinators", icon: UserCheck },
    { title: "Exam Settings", url: "/exam-settings", icon: Settings2 },
    { title: "Exam Results", url: "/exam-marks", icon: ClipboardList },
    { title: "Interview Selection", url: "/interview", icon: FileText },
    { title: "Admissions", url: "/admissions", icon: Award },
    { title: "Reports", url: "/reports", icon: BarChart2 },
  ];

  const coordinatorMenuItems = [
   { title: "Dashboard", url: "/", icon: LayoutDashboard },
   { title: "Add Student", url: "/students/add", icon: Plus },
   { title: "Students List", url: "/students", icon: Users },
   { title: "Admit Cards", url: "/admit-cards", icon: CreditCard },
  ];

  const examinerMenuItems = [
   { title: "Exam Marks Entry", url: "/exam-marks", icon: ClipboardList },
  ];

  const cvuMenuItems = [
   { title: "Dashboard", url: "/", icon: LayoutDashboard },
   { title: "Room Allotment", url: "/room-allotment", icon: Users },
   { title: "Gate Entry", url: "/gate-entry", icon: Search },
  ];

export function AppSidebar() {
  const { data: user } = useAuth();
  const [location] = useWouterLocation();
  const logout = useLogout();

  // Build menu items based on user role and permissions
  let menuItems;
  if (user?.role === "admin") {
    menuItems = adminMenuItems;
  } else if (user?.role === "examiner") {
    menuItems = examinerMenuItems;
  } else if (user?.role === "cvu") {
    menuItems = cvuMenuItems;
  } else {
    menuItems = coordinatorMenuItems;
    // Add exam marks entry for coordinators with marks entry permission
    if (user?.marksEntryPermission) {
      menuItems = [
        ...menuItems,
        { title: "Exam Marks Entry", url: "/exam-marks", icon: ClipboardList },
      ];
    }
  }

  const isActive = (url: string) => {
    if (url === "/" || url === "/dashboard") return location === "/" || location === "/dashboard";
    return location.startsWith(url) && url !== "/";
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-sidebar-primary flex items-center justify-center flex-shrink-0">
            <img src="/Logo.png" alt="Sukoon Logo" className="w-7 h-7 object-contain" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-sidebar-foreground leading-tight truncate">Sukoon Edu Foundation</p>
            <p className="text-xs text-sidebar-foreground/60 leading-tight">Enrollment 2026</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-xs uppercase tracking-wider px-2 mb-1">
            {user?.role === "admin" ? "Admin Menu" : user?.role === "examiner" ? "Examiner Menu" : "Coordinator Menu"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    className="h-9 px-3 rounded-md text-sidebar-foreground/70 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground"
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="font-medium text-sm">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 px-1 mb-2">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-foreground font-bold text-sm flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-sidebar-foreground leading-tight truncate">{user?.name}</p>
            <Badge variant="outline" className="text-xs px-1.5 py-0 mt-0.5 border-sidebar-border text-sidebar-foreground/50 capitalize">
              {user?.role}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => logout.mutate()}
          data-testid="button-logout"
          className="w-full justify-start text-sidebar-foreground/60 gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
