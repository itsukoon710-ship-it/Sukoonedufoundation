import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/lib/auth";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import StudentsPage from "@/pages/students";
import AddStudentPage from "@/pages/add-student";
import AdmitCardsPage from "@/pages/admit-cards";
import ExamMarksPage from "@/pages/exam-marks";
import ExamSettingsPage from "@/pages/exam-settings";
import InterviewPage from "@/pages/interview";
import AdmissionsPage from "@/pages/admissions";
import CentersPage from "@/pages/centers";
import CoordinatorsPage from "@/pages/coordinators";
import ReportsPage from "@/pages/reports";
import PublicRegistrationPage from "@/pages/public-registration";
import CoordinatorDashboardPage from "@/pages/coordinator-dashboard";
import NotFound from "@/pages/not-found";
import { Skeleton } from "@/components/ui/skeleton";
import { School } from "lucide-react";

function ProtectedRoute({ component: Component, adminOnly = false, marksEntryOnly = false, roles }: { component: React.ComponentType; adminOnly?: boolean; marksEntryOnly?: boolean; roles?: ("admin" | "coordinator" | "examiner")[] }) {
  const { data: user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="space-y-3 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!user) return <Redirect to="/login" />;
  if (adminOnly && user.role !== "admin") return <Redirect to={user.role === "examiner" ? "/exam-marks" : "/"} />;
  if (marksEntryOnly && user.role !== "admin" && !user.marksEntryPermission) return <Redirect to={user.role === "examiner" ? "/exam-marks" : "/"} />;
  if (roles && !roles.includes(user.role)) return <Redirect to={user.role === "examiner" ? "/exam-marks" : "/"} />;
  return <Component />;
}

function AppLayout() {
  const { data: user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <School className="w-8 h-8 text-primary animate-pulse" />
          <span className="text-lg font-medium">Loading Sukoon...</span>
        </div>
      </div>
    );
  }

  // Public registration route - accessible without login
  if (!user) {
    return (
      <Switch>
        <Route path="/register" component={PublicRegistrationPage} />
        <Route path="/login" component={LoginPage} />
        <Route>
          <Redirect to="/login" />
        </Route>
      </Switch>
    );
  }

  const sidebarStyle = {
    "--sidebar-width": "17rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between px-4 py-2 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
            <div className="flex items-center gap-3">
              <SidebarTrigger data-testid="button-sidebar-toggle" className="-ml-1" />
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Sukoon Enrollment App</span>
                <span>•</span>
                <span>2026 Admission Cycle</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Switch>
               <Route path="/" component={() => <ProtectedRoute component={DashboardPage} roles={["admin", "coordinator"]} />} />
               <Route path="/dashboard" component={() => <ProtectedRoute component={DashboardPage} roles={["admin", "coordinator"]} />} />
               <Route path="/coordinator-dashboard" component={() => <ProtectedRoute component={CoordinatorDashboardPage} roles={["admin", "coordinator"]} />} />
               <Route path="/students" component={() => <ProtectedRoute component={StudentsPage} roles={["admin", "coordinator"]} />} />
               <Route path="/students/add" component={() => <ProtectedRoute component={AddStudentPage} roles={["admin", "coordinator"]} />} />
               <Route path="/admit-cards" component={() => <ProtectedRoute component={AdmitCardsPage} roles={["admin", "coordinator"]} />} />
               <Route path="/exam-settings" component={() => <ProtectedRoute component={ExamSettingsPage} adminOnly={true} />} />
               <Route path="/exam-marks" component={() => <ProtectedRoute component={ExamMarksPage} marksEntryOnly={true} />} />
               <Route path="/interview" component={() => <ProtectedRoute component={InterviewPage} adminOnly={true} />} />
               <Route path="/admissions" component={() => <ProtectedRoute component={AdmissionsPage} adminOnly={true} />} />
               <Route path="/centers" component={() => <ProtectedRoute component={CentersPage} adminOnly={true} />} />
               <Route path="/coordinators" component={() => <ProtectedRoute component={CoordinatorsPage} adminOnly={true} />} />
               <Route path="/reports" component={() => <ProtectedRoute component={ReportsPage} adminOnly={true} />} />
               <Route path="/login" component={() => <Redirect to="/" />} />
               <Route path="/register" component={() => <Redirect to="/" />} />
               <Route component={NotFound} />
             </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppLayout />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
