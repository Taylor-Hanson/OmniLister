import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigationItems = [
  {
    href: "/",
    icon: "fas fa-chart-line",
    label: "Dashboard",
    testId: "nav-dashboard"
  },
  {
    href: "/create-listing",
    icon: "fas fa-plus-circle",
    label: "Create Listing",
    testId: "nav-create-listing"
  },
  {
    href: "/bulk-manager",
    icon: "fas fa-tasks",
    label: "Bulk Manager",
    testId: "nav-bulk-manager"
  },
  {
    href: "/analytics",
    icon: "fas fa-chart-bar",
    label: "Analytics",
    testId: "nav-analytics"
  },
  {
    href: "/marketplaces",
    icon: "fas fa-store",
    label: "Marketplaces",
    testId: "nav-marketplaces"
  },
  {
    href: "/sync",
    icon: "fas fa-sync",
    label: "Sync",
    testId: "nav-sync"
  },
  {
    href: "/auto-delist",
    icon: "fas fa-clock",
    label: "Auto-Delist",
    testId: "nav-auto-delist"
  },
  {
    href: "/settings",
    icon: "fas fa-cog",
    label: "Settings",
    testId: "nav-settings"
  }
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <aside className={cn(
      "fixed lg:static inset-y-0 left-0 z-50 w-72 bg-card border-r border-border transition-transform duration-200 ease-in-out lg:translate-x-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center h-16 px-6 border-b border-border">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <i className="fas fa-layer-group text-primary-foreground text-lg"></i>
            </div>
            <div className="ml-3">
              <h1 className="text-xl font-bold text-foreground">CrossList Pro</h1>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            
            return (
              <Link key={item.href} href={item.href}>
                <a
                  className={cn(
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  onClick={onClose}
                  data-testid={item.testId}
                >
                  <i className={cn(item.icon, "mr-3 text-sm")}></i>
                  {item.label}
                </a>
              </Link>
            );
          })}
        </nav>
        
        {/* User Profile */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-accent-foreground">
                {user?.username?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.username || "User"}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {user?.plan || "free"} Plan
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
