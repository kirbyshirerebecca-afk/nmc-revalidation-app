import { Layout } from "@/components/layout";
import { Route, Switch, Router as WouterRouter } from "wouter";
import Dashboard from "@/pages/dashboard";
import Reflections from "@/pages/reflections";
import CpdLog from "@/pages/cpd";
import PracticeHours from "@/pages/practice";
import Evidence from "@/pages/evidence";
import Pricing from "@/pages/pricing";
import Admin from "@/pages/admin";
import NotFound from "@/pages/not-found";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from "@workspace/replit-auth-web";
import { Loader2, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/reflections" component={Reflections} />
      <Route path="/cpd" component={CpdLog} />
      <Route path="/practice" component={PracticeHours} />
      <Route path="/evidence" component={Evidence} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Loading…</p>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <Stethoscope className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            NMC Revalidation
          </h1>
          <p className="text-muted-foreground text-base">
            Your complete toolkit for NMC revalidation — AI reflections,
            CPD tracking, and one-click portfolio export.
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-4">
          <div className="space-y-1 text-left">
            <p className="font-semibold text-foreground">Sign in to continue</p>
            <p className="text-sm text-muted-foreground">
              Your data is saved securely to your account.
            </p>
          </div>

          <Button
            size="lg"
            className="w-full gap-2 font-semibold"
            onClick={onLogin}
          >
            Log in
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          By signing in you agree to keep your revalidation data accurate and
          up to date as required by the NMC.
        </p>
      </div>
    </div>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, login } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <LoginScreen onLogin={login} />;
  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AuthGate>
            <Layout>
              <Router />
            </Layout>
          </AuthGate>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
