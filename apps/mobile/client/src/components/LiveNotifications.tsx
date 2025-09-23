import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { Bell, CheckCircle, AlertCircle, Clock, Zap, X } from "lucide-react";
import { format } from "date-fns";

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: Date;
  marketplace?: string;
  jobId?: string;
}

export default function LiveNotifications() {
  const { lastMessage, isConnected } = useWebSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (lastMessage && lastMessage.type) {
      let notification: Notification | null = null;

      switch (lastMessage.type) {
        case 'job_status':
          if (lastMessage.data.status === 'completed') {
            notification = {
              id: `job-${lastMessage.data.jobId}-${Date.now()}`,
              type: 'success',
              title: 'Job Completed',
              message: `${lastMessage.data.listingTitle || 'Listing'} posted successfully`,
              timestamp: new Date(),
              jobId: lastMessage.data.jobId
            };
          } else if (lastMessage.data.status === 'failed') {
            notification = {
              id: `job-${lastMessage.data.jobId}-${Date.now()}`,
              type: 'error',
              title: 'Job Failed',
              message: `Failed to process ${lastMessage.data.listingTitle || 'listing'}`,
              timestamp: new Date(),
              jobId: lastMessage.data.jobId
            };
          }
          break;

        case 'rate_limit':
          notification = {
            id: `rate-limit-${Date.now()}`,
            type: 'warning',
            title: 'Rate Limited',
            message: `${lastMessage.data.marketplace}: ${lastMessage.data.reason}`,
            timestamp: new Date(),
            marketplace: lastMessage.data.marketplace
          };
          break;

        case 'smart_schedule':
          if (lastMessage.data.stage === 'scheduling_complete') {
            notification = {
              id: `smart-schedule-${Date.now()}`,
              type: 'info',
              title: 'Smart Scheduling Complete',
              message: lastMessage.data.message,
              timestamp: new Date()
            };
          }
          break;

        case 'circuit_breaker':
          notification = {
            id: `circuit-breaker-${Date.now()}`,
            type: lastMessage.data.state === 'open' ? 'error' : 'info',
            title: 'Circuit Breaker',
            message: `${lastMessage.data.marketplace} circuit breaker ${lastMessage.data.state}`,
            timestamp: new Date(),
            marketplace: lastMessage.data.marketplace
          };
          break;
      }

      if (notification) {
        setNotifications(prev => [notification!, ...prev.slice(0, 19)]); // Keep last 20 notifications
      }
    }
  }, [lastMessage]);

  const clearNotifications = () => {
    setNotifications([]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    }
  };

  const unreadCount = notifications.length;

  return (
    <Card data-testid="card-live-notifications">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-500" />
            Live Notifications
            {unreadCount > 0 && (
              <Badge variant="secondary" data-testid="badge-notification-count">
                {unreadCount}
              </Badge>
            )}
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              data-testid="button-toggle-notifications"
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearNotifications}
                data-testid="button-clear-notifications"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {notifications.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground" data-testid="text-no-notifications">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
              <p className="text-xs">Live updates will appear here</p>
            </div>
          ) : (
            <div className={`space-y-2 ${!isExpanded ? 'max-h-48 overflow-y-auto' : ''}`}>
              {(isExpanded ? notifications : notifications.slice(0, 5)).map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-start gap-3 p-3 border rounded-lg bg-card group"
                  data-testid={`notification-${notification.id}`}
                >
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{notification.title}</h4>
                      <Badge className={getNotificationColor(notification.type)} data-testid={`badge-type-${notification.id}`}>
                        {notification.type}
                      </Badge>
                      {notification.marketplace && (
                        <Badge variant="outline" className="text-xs" data-testid={`badge-marketplace-${notification.id}`}>
                          {notification.marketplace}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-1" data-testid={`text-message-${notification.id}`}>
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground" data-testid={`text-timestamp-${notification.id}`}>
                      {format(notification.timestamp, 'HH:mm:ss')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeNotification(notification.id)}
                    data-testid={`button-remove-${notification.id}`}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              {!isExpanded && notifications.length > 5 && (
                <div className="text-center py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(true)}
                    data-testid="button-show-more"
                  >
                    Show {notifications.length - 5} more...
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}