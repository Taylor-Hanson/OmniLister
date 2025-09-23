import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { Activity, AlertTriangle, CheckCircle, Clock } from "lucide-react";

export default function MarketplaceHealthStatus() {
  const { marketplaceHealth, isConnected } = useWebSocket();

  const getHealthIcon = (healthy: boolean, error?: string) => {
    if (error) return <AlertTriangle className="w-4 h-4 text-red-500" />;
    return healthy ? 
      <CheckCircle className="w-4 h-4 text-green-500" /> : 
      <Clock className="w-4 h-4 text-yellow-500" />;
  };

  const getHealthColor = (healthy: boolean, error?: string) => {
    if (error) return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    return healthy ? 
      'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
  };

  const formatDelay = (delayMs: number) => {
    if (delayMs < 1000) return `${delayMs}ms`;
    if (delayMs < 60000) return `${Math.round(delayMs / 1000)}s`;
    return `${Math.round(delayMs / 60000)}m`;
  };

  return (
    <Card data-testid="card-marketplace-health">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-500" />
          Marketplace Health
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {marketplaceHealth.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground" data-testid="text-no-health-data">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Loading marketplace status...</p>
            </div>
          ) : (
            marketplaceHealth.map((marketplace) => (
              <div
                key={marketplace.marketplace}
                className="flex items-center justify-between p-3 border rounded-lg bg-card"
                data-testid={`marketplace-health-${marketplace.marketplace}`}
              >
                <div className="flex items-center gap-3">
                  {getHealthIcon(marketplace.healthy, marketplace.error)}
                  <div>
                    <p className="font-medium text-sm capitalize">
                      {marketplace.marketplace}
                    </p>
                    {marketplace.error ? (
                      <p className="text-xs text-red-500" data-testid={`text-error-${marketplace.marketplace}`}>
                        {marketplace.error}
                      </p>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {marketplace.estimatedDelay !== undefined && marketplace.estimatedDelay > 0 && (
                          <span data-testid={`text-delay-${marketplace.marketplace}`}>
                            Delay: {formatDelay(marketplace.estimatedDelay)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <Badge 
                    className={getHealthColor(marketplace.healthy, marketplace.error)}
                    data-testid={`badge-health-${marketplace.marketplace}`}
                  >
                    {marketplace.error ? 'Error' : marketplace.healthy ? 'Healthy' : 'Limited'}
                  </Badge>
                  
                  {!marketplace.error && (
                    <div className="mt-1 space-y-1">
                      {marketplace.hourlyRemaining !== undefined && (
                        <div className="text-xs text-muted-foreground">
                          <span data-testid={`text-hourly-${marketplace.marketplace}`}>
                            Hourly: {marketplace.hourlyRemaining}
                          </span>
                          {marketplace.hourlyRemaining <= 100 && (
                            <Progress 
                              value={(marketplace.hourlyRemaining / 100) * 100} 
                              className="h-1 mt-1 w-16" 
                              data-testid={`progress-hourly-${marketplace.marketplace}`}
                            />
                          )}
                        </div>
                      )}
                      {marketplace.dailyRemaining !== undefined && (
                        <div className="text-xs text-muted-foreground">
                          <span data-testid={`text-daily-${marketplace.marketplace}`}>
                            Daily: {marketplace.dailyRemaining}
                          </span>
                          {marketplace.dailyRemaining <= 1000 && (
                            <Progress 
                              value={(marketplace.dailyRemaining / 1000) * 100} 
                              className="h-1 mt-1 w-16" 
                              data-testid={`progress-daily-${marketplace.marketplace}`}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}