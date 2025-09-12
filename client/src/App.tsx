import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/dashboard";
import CreateListing from "@/pages/create-listing";
import BulkManager from "@/pages/bulk-manager";
import Analytics from "@/pages/analytics";
import Marketplaces from "@/pages/marketplaces";
import Settings from "@/pages/settings";
import Subscribe from "@/pages/subscribe";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/create-listing" component={CreateListing} />
        <Route path="/bulk-manager" component={BulkManager} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/marketplaces" component={Marketplaces} />
        <Route path="/settings" component={Settings} />
        <Route path="/subscribe" component={Subscribe} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
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
