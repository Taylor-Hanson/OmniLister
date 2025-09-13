import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  RefreshCcw, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Zap,
  Settings,
  History,
  AlertTriangle,
  ArrowUpDown,
  ShoppingBag,
  TrendingUp,
  Package,
  Webhook,
  Activity,
  Globe,
  Signal,
  AlertOctagon,
  PlayCircle,
  PauseCircle,
  Target
} from "lucide-react";
import { format, formatDistance } from "date-fns";

export default function Sync() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isConnected } = useWebSocket();
  const [syncProgress, setSyncProgress] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [realTimeJobs, setRealTimeJobs] = useState<any[]>([]);
  const [webhookHealth, setWebhookHealth] = useState<any>({});

  // Fetch sync settings
  const { data: syncSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['/api/sync/settings'],
    enabled: !!user,
  });

  // Fetch sync status
  const { data: syncStatus = [], refetch: refetchStatus } = useQuery({
    queryKey: ['/api/sync/status'],
    enabled: !!user,
  });

  // Fetch sync history
  const { data: syncHistory = [] } = useQuery({
    queryKey: ['/api/sync/history'],
    enabled: !!user,
  });

  // Fetch sync conflicts
  const { data: syncConflicts = [] } = useQuery({
    queryKey: ['/api/sync/conflicts?resolved=false'],
    enabled: !!user,
  });

  // Fetch marketplace connections
  const { data: marketplaces = [] } = useQuery({
    queryKey: ['/api/marketplaces'],
    enabled: !!user,
  });

  // Fetch cross-platform sync jobs
  const { data: syncJobs = [] } = useQuery({
    queryKey: ['/api/cross-platform-sync/jobs'],
    enabled: !!user,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch webhook configurations and health
  const { data: webhookConfigs = [] } = useQuery({
    queryKey: ['/api/webhooks/configurations'],
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch webhook health summary
  const { data: webhookHealthSummary } = useQuery({
    queryKey: ['/api/webhooks/health', { hours: 24 }],
    enabled: !!user,
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch rate limit status for all marketplaces
  const { data: rateLimits = {} } = useQuery({
    queryKey: ['/api/rate-limits/status'],
    enabled: !!user,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Mutation for executing sync
  const syncMutation = useMutation({
    mutationFn: async (data: { listingId?: string; targetMarketplace?: string }) => {
      return apiRequest('/api/sync/execute', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: "Sync completed",
        description: "Your listings have been synchronized across platforms.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sync/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sync/history'] });
      setIsSyncing(false);
      setSyncProgress(100);
      setTimeout(() => setSyncProgress(0), 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Sync failed",
        description: error.message || "An error occurred during synchronization.",
        variant: "destructive",
      });
      setIsSyncing(false);
      setSyncProgress(0);
    },
  });

  // Mutation for auto-resolving conflicts
  const autoResolveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/sync/auto-resolve', 'POST', {});
    },
    onSuccess: () => {
      toast({
        title: "Conflicts resolved",
        description: "Conflicts have been automatically resolved based on your settings.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sync/conflicts'] });
    },
    onError: (error: any) => {
      toast({
        title: "Resolution failed",
        description: error.message || "Failed to auto-resolve conflicts.",
        variant: "destructive",
      });
    },
  });

  // Calculate sync statistics
  const connectedPlatforms = marketplaces.filter((m: any) => m.isConnected);
  const totalListings = syncStatus.length;
  const syncedListings = syncStatus.filter((item: any) => 
    Object.values(item.platforms).some((p: any) => p.synced)
  ).length;
  const pendingSync = totalListings - syncedListings;
  const unresolvedConflicts = syncConflicts.length;

  // Enhanced statistics
  const activeSyncJobs = syncJobs.filter((job: any) => 
    ['pending', 'processing'].includes(job.status)
  ).length;
  const webhookHealthScore = webhookHealthSummary?.healthScore || 0;
  const activeWebhooks = webhookConfigs.filter((config: any) => 
    config.isEnabled && config.isActive
  ).length;
  const rateLimitedPlatforms = Object.values(rateLimits).filter(
    (limit: any) => limit && limit.remainingRequests < (limit.maxRequests * 0.1)
  ).length;

  // Handle sync all
  const handleSyncAll = () => {
    setIsSyncing(true);
    setSyncProgress(0);
    
    // Simulate progress
    const interval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 500);

    syncMutation.mutate({});
  };

  // Handle single listing sync
  const handleSyncListing = (listingId: string, marketplace?: string) => {
    syncMutation.mutate({ listingId, targetMarketplace: marketplace });
  };

  // Get sync status color
  const getSyncStatusColor = (synced: boolean) => {
    return synced ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" : 
                   "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Sync Center</h1>
            <p className="text-muted-foreground mt-2">
              Manage cross-platform listing synchronization
            </p>
          </div>
          <Button 
            onClick={handleSyncAll}
            disabled={isSyncing || connectedPlatforms.length === 0}
            className="gap-2"
            data-testid="button-sync-all"
          >
            <RefreshCcw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync All'}
          </Button>
        </div>
        
        {isSyncing && (
          <Progress value={syncProgress} className="mt-4" />
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Connected Platforms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{connectedPlatforms.length}</div>
              <Package className="h-8 w-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Synced Listings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {syncedListings}/{totalListings}
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Sync
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{pendingSync}</div>
              <Clock className="h-8 w-8 text-yellow-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unresolved Conflicts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{unresolvedConflicts}</div>
              <AlertTriangle className="h-8 w-8 text-red-500 opacity-20" />
            </div>
            {unresolvedConflicts > 0 && (
              <Button 
                variant="link" 
                size="sm" 
                className="mt-2 p-0 h-auto"
                onClick={() => autoResolveMutation.mutate()}
                data-testid="button-auto-resolve"
              >
                Auto-resolve
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Sync Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{activeSyncJobs}</div>
              <Activity className="h-8 w-8 text-blue-500 opacity-20" />
            </div>
            {activeSyncJobs > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-muted-foreground">Processing</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Webhook Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{Math.round(webhookHealthScore)}%</div>
              <Webhook className={`h-8 w-8 opacity-20 ${
                webhookHealthScore >= 90 ? 'text-green-500' : 
                webhookHealthScore >= 70 ? 'text-yellow-500' : 'text-red-500'
              }`} />
            </div>
            <div className="flex items-center gap-1 mt-1">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="text-xs text-muted-foreground">
                {activeWebhooks} active
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="listings" className="space-y-6">
        <TabsList className="grid w-full max-w-3xl grid-cols-5">
          <TabsTrigger value="listings" data-testid="tab-listings">Listings</TabsTrigger>
          <TabsTrigger value="jobs" data-testid="tab-jobs">Sync Jobs</TabsTrigger>
          <TabsTrigger value="webhooks" data-testid="tab-webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
          <TabsTrigger value="conflicts" data-testid="tab-conflicts">Conflicts</TabsTrigger>
        </TabsList>

        {/* Listings Tab */}
        <TabsContent value="listings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Listing Sync Status</CardTitle>
              <CardDescription>
                View and manage sync status for each listing across platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {syncStatus.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No listings to sync. Create some listings first.
                  </div>
                ) : (
                  syncStatus.map((item: any) => (
                    <div key={item.listingId} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{item.title}</h4>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {connectedPlatforms.map((platform: any) => {
                              const status = item.platforms[platform.marketplace];
                              return (
                                <div key={platform.marketplace} className="flex items-center gap-2">
                                  <Badge 
                                    variant="secondary"
                                    className={status?.synced ? getSyncStatusColor(true) : getSyncStatusColor(false)}
                                    data-testid={`badge-${platform.marketplace}-${item.listingId}`}
                                  >
                                    {platform.marketplace}
                                    {status?.synced ? (
                                      <CheckCircle2 className="ml-1 h-3 w-3" />
                                    ) : (
                                      <Clock className="ml-1 h-3 w-3" />
                                    )}
                                  </Badge>
                                  {status?.lastSync && (
                                    <span className="text-xs text-muted-foreground">
                                      {formatDistance(new Date(status.lastSync), new Date(), { addSuffix: true })}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSyncListing(item.listingId)}
                          disabled={syncMutation.isPending}
                          data-testid={`button-sync-${item.listingId}`}
                        >
                          <RefreshCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sync Jobs Tab */}
        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cross-Platform Sync Jobs</CardTitle>
              <CardDescription>
                Real-time monitoring of cross-platform inventory sync operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {syncJobs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No active sync jobs. Sales will trigger automatic cross-platform delisting.
                  </div>
                ) : (
                  syncJobs.slice(0, 20).map((job: any) => (
                    <div key={job.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{job.listingTitle || 'Unknown Listing'}</h4>
                            <Badge 
                              variant={job.status === 'completed' ? 'secondary' : 
                                     job.status === 'failed' ? 'destructive' : 'default'}
                              className="capitalize"
                            >
                              {job.status === 'processing' && (
                                <div className="w-2 h-2 bg-current rounded-full animate-pulse mr-1"></div>
                              )}
                              {job.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Sold on <span className="font-medium">{job.soldMarketplace}</span> • 
                            Syncing to {job.totalMarketplaces} platforms
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(job.createdAt), "HH:mm:ss")}
                          </p>
                          {job.duration && (
                            <p className="text-xs text-muted-foreground">
                              {job.duration}ms
                            </p>
                          )}
                        </div>
                      </div>

                      {job.status === 'processing' && job.progress && (
                        <div className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Progress</span>
                            <span>{job.progress}%</span>
                          </div>
                          <Progress value={job.progress} className="h-2" />
                        </div>
                      )}

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex gap-4">
                          <span className="text-green-600 dark:text-green-400">
                            ✓ {job.successful || 0} successful
                          </span>
                          {job.failed > 0 && (
                            <span className="text-red-600 dark:text-red-400">
                              ✗ {job.failed} failed
                            </span>
                          )}
                          {job.skipped > 0 && (
                            <span className="text-yellow-600 dark:text-yellow-400">
                              ○ {job.skipped} skipped
                            </span>
                          )}
                        </div>
                        {job.status === 'failed' && job.errorMessage && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              toast({
                                title: "Sync Error Details",
                                description: job.errorMessage,
                                variant: "destructive",
                              });
                            }}
                          >
                            View Error
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Webhook Status</CardTitle>
                <CardDescription>
                  Real-time sales detection via marketplace webhooks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {webhookConfigs.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      No webhooks configured. Set up webhooks for instant sales detection.
                    </div>
                  ) : (
                    webhookConfigs.map((config: any) => (
                      <div key={config.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            config.isActive && config.isEnabled ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                          <div>
                            <p className="font-medium capitalize">{config.marketplace}</p>
                            <p className="text-sm text-muted-foreground">
                              {config.subscribedEvents?.length || 0} events • 
                              {config.errorCount || 0} errors
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={config.verificationStatus === 'verified' ? 'secondary' : 'destructive'}>
                            {config.verificationStatus || 'unverified'}
                          </Badge>
                          {config.lastEventAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Last: {formatDistance(new Date(config.lastEventAt), new Date(), { addSuffix: true })}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rate Limits</CardTitle>
                <CardDescription>
                  Current API rate limiting status across platforms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {connectedPlatforms.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      Connect marketplaces to monitor rate limits.
                    </div>
                  ) : (
                    connectedPlatforms.map((platform: any) => {
                      const rateLimit = rateLimits[platform.marketplace];
                      const usagePercent = rateLimit ? 
                        ((rateLimit.maxRequests - rateLimit.remainingRequests) / rateLimit.maxRequests) * 100 : 0;
                      
                      return (
                        <div key={platform.marketplace} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium capitalize">{platform.marketplace}</span>
                            <span className="text-sm text-muted-foreground">
                              {rateLimit?.remainingRequests || 'N/A'} / {rateLimit?.maxRequests || 'N/A'}
                            </span>
                          </div>
                          <Progress 
                            value={usagePercent} 
                            className={`h-2 ${
                              usagePercent > 90 ? 'bg-red-100' : 
                              usagePercent > 70 ? 'bg-yellow-100' : 'bg-green-100'
                            }`}
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sync History</CardTitle>
              <CardDescription>
                Recent synchronization operations and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {syncHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No sync history yet.
                  </div>
                ) : (
                  syncHistory.slice(0, 10).map((entry: any) => (
                    <div key={entry.id} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        {entry.status === "success" ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                        <div>
                          <p className="font-medium">
                            {entry.syncType === "create" ? "Created" : "Updated"} on {entry.targetMarketplace}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(entry.createdAt), "MMM dd, yyyy HH:mm")}
                            {entry.syncDuration && ` • ${entry.syncDuration}ms`}
                          </p>
                        </div>
                      </div>
                      <Badge variant={entry.status === "success" ? "secondary" : "destructive"}>
                        {entry.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conflicts Tab */}
        <TabsContent value="conflicts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sync Conflicts</CardTitle>
              <CardDescription>
                Resolve conflicts when listings are modified on multiple platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {syncConflicts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No conflicts detected. Your listings are in sync!
                  </div>
                ) : (
                  syncConflicts.map((conflict: any) => (
                    <div key={conflict.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <Badge variant="destructive" className="mb-2">
                            {conflict.conflictType.replace(/_/g, ' ')}
                          </Badge>
                          <p className="text-sm text-muted-foreground">
                            Between {conflict.sourceMarketplace} and {conflict.targetMarketplace}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(conflict.createdAt), "MMM dd, HH:mm")}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="p-3 bg-muted rounded">
                          <p className="text-sm font-medium mb-1">{conflict.sourceMarketplace}</p>
                          <p className="text-sm">{JSON.stringify(conflict.sourceValue)}</p>
                        </div>
                        <div className="p-3 bg-muted rounded">
                          <p className="text-sm font-medium mb-1">{conflict.targetMarketplace}</p>
                          <p className="text-sm">{JSON.stringify(conflict.targetValue)}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          data-testid={`button-keep-source-${conflict.id}`}
                        >
                          Keep Source
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          data-testid={`button-keep-target-${conflict.id}`}
                        >
                          Keep Target
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}