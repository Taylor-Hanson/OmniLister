import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  RefreshCcw,
  XCircle,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

export type SyncStatus = "synced" | "pending" | "syncing" | "failed" | "conflict" | "not-synced";

interface SyncStatusBadgeProps {
  status: SyncStatus;
  platform?: string;
  lastSyncTime?: Date | string;
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function SyncStatusBadge({ 
  status, 
  platform,
  lastSyncTime,
  className,
  showIcon = true,
  size = "md"
}: SyncStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "synced":
        return {
          label: "Synced",
          icon: CheckCircle2,
          className: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
          iconClassName: "text-green-600 dark:text-green-400",
        };
      case "pending":
        return {
          label: "Pending",
          icon: Clock,
          className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
          iconClassName: "text-yellow-600 dark:text-yellow-400",
        };
      case "syncing":
        return {
          label: "Syncing",
          icon: Loader2,
          className: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
          iconClassName: "text-blue-600 dark:text-blue-400 animate-spin",
        };
      case "failed":
        return {
          label: "Failed",
          icon: XCircle,
          className: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
          iconClassName: "text-red-600 dark:text-red-400",
        };
      case "conflict":
        return {
          label: "Conflict",
          icon: AlertCircle,
          className: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
          iconClassName: "text-orange-600 dark:text-orange-400",
        };
      case "not-synced":
      default:
        return {
          label: "Not Synced",
          icon: RefreshCcw,
          className: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
          iconClassName: "text-gray-600 dark:text-gray-400",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-0.5",
    lg: "text-base px-3 py-1",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const formatLastSync = (time: Date | string) => {
    const date = typeof time === 'string' ? new Date(time) : time;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="inline-flex items-center gap-2">
      <Badge 
        variant="secondary" 
        className={cn(
          config.className,
          sizeClasses[size],
          "font-medium",
          className
        )}
        data-testid={`sync-status-badge-${status}${platform ? `-${platform}` : ''}`}
      >
        {showIcon && (
          <Icon className={cn(iconSizes[size], "mr-1", config.iconClassName)} />
        )}
        {platform ? `${platform}: ${config.label}` : config.label}
      </Badge>
      
      {lastSyncTime && status === "synced" && (
        <span className="text-xs text-muted-foreground">
          {formatLastSync(lastSyncTime)}
        </span>
      )}
    </div>
  );
}