import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "./Sidebar";
import TopNavigation from "./TopNavigation";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-md mx-4">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-layer-group text-primary-foreground text-2xl"></i>
            </div>
            <h1 className="text-3xl font-bold text-foreground">CrossList Pro</h1>
            <p className="text-muted-foreground mt-2">Sign in to continue</p>
          </div>
          
          <div className="bg-card rounded-lg border border-border p-6">
            <p className="text-center text-muted-foreground">
              Authentication required. Please implement login functionality.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNavigation onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-auto bg-muted/30">
          {children}
        </main>
      </div>
      
      {/* Mobile bottom navigation */}
      {isMobile && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border">
          <div className="flex items-center justify-around py-2">
            <button className="flex flex-col items-center p-3 text-primary" data-testid="mobile-nav-dashboard">
              <i className="fas fa-chart-line text-lg"></i>
              <span className="text-xs mt-1">Dashboard</span>
            </button>
            <button className="flex flex-col items-center p-3 text-muted-foreground" data-testid="mobile-nav-create">
              <i className="fas fa-plus-circle text-lg"></i>
              <span className="text-xs mt-1">Create</span>
            </button>
            <button className="flex flex-col items-center p-3 text-muted-foreground" data-testid="mobile-nav-ai">
              <i className="fas fa-camera-retro text-lg"></i>
              <span className="text-xs mt-1">AI Scan</span>
            </button>
            <button className="flex flex-col items-center p-3 text-muted-foreground" data-testid="mobile-nav-markets">
              <i className="fas fa-store text-lg"></i>
              <span className="text-xs mt-1">Markets</span>
            </button>
            <button className="flex flex-col items-center p-3 text-muted-foreground" data-testid="mobile-nav-settings">
              <i className="fas fa-cog text-lg"></i>
              <span className="text-xs mt-1">Settings</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
