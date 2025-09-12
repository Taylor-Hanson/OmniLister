import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Dashboard from "@/pages/dashboard";
import CreateListing from "@/pages/create-listing";
import BulkManager from "@/pages/bulk-manager";
import Analytics from "@/pages/analytics";
import Marketplaces from "@/pages/marketplaces";
import Settings from "@/pages/settings";
import Subscribe from "@/pages/subscribe";
import Sync from "@/pages/sync";
import NotFound from "@/pages/not-found";

function PrivateRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!user) {
    return <Redirect to="/" />;
  }
  
  return <Component {...rest} />;
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <>
      {user ? (
        <Layout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/create-listing" component={CreateListing} />
            <Route path="/bulk-manager" component={BulkManager} />
            <Route path="/analytics" component={Analytics} />
            <Route path="/marketplaces" component={Marketplaces} />
            <Route path="/sync" component={Sync} />
            <Route path="/settings" component={Settings} />
            <Route path="/subscribe" component={Subscribe} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      ) : (
        <Switch>
          <Route path="/" component={Login} />
          <Route path="/signup" component={Signup} />
          <Route component={Login} />
        </Switch>
      )}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
