import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Target,
  Info,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Wifi,
  WifiOff,
  Plus,
  BookOpen,
  Timer,
  BarChart3,
  Link as LinkIcon
} from "lucide-react";
import { format, formatDistance } from "date-fns";
import { cn } from "@/lib/utils";
import {
  MarketplaceConnection,
  SyncStatus,
  SyncJob,
  SyncHistoryEntry,
  SyncConflict,
  WebhookConfig,
  WebhookHealthSummary,
  RateLimit,
  SyncSettings
} from "@/types/sync";

export default function Sync() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isConnected } = useWebSocket();
  const [syncProgress, setSyncProgress] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [expandedConflicts, setExpandedConflicts] = useState<Set<string>>(new Set());

  // Fetch sync settings
  const { data: syncSettings, isLoading: settingsLoading } = useQuery<SyncSettings>({
    queryKey: ['/api/sync/settings'],
    enabled: !!user,
  });

  // Fetch sync status
  const { data: syncStatus = [], refetch: refetchStatus, isLoading: statusLoading } = useQuery<SyncStatus[]>({
    queryKey: ['/api/sync/status'],
    enabled: !!user,
  });

  // Fetch sync history
  const { data: syncHistory = [], isLoading: historyLoading } = useQuery<SyncHistoryEntry[]>({
    queryKey: ['/api/sync/history'],
    enabled: !!user,
  });

  // Fetch sync conflicts
  const { data: syncConflicts = [], isLoading: conflictsLoading } = useQuery<SyncConflict[]>({
    queryKey: ['/api/sync/conflicts?resolved=false'],
    enabled: !!user,
  });

  // Fetch marketplace connections
  const { data: marketplaces = [], isLoading: marketplacesLoading } = useQuery<MarketplaceConnection[]>({
    queryKey: ['/api/marketplaces'],
    enabled: !!user,
  });

  // Fetch cross-platform sync jobs
  const { data: syncJobs = [], isLoading: jobsLoading } = useQuery<SyncJob[]>({
    queryKey: ['/api/cross-platform-sync/jobs'],
    enabled: !!user,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch webhook configurations and health
  const { data: webhookConfigs = [], isLoading: webhookConfigsLoading } = useQuery<WebhookConfig[]>({
    queryKey: ['/api/webhooks/configurations'],
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch webhook health summary
  const { data: webhookHealthSummary, isLoading: webhookHealthLoading } = useQuery<WebhookHealthSummary>({
    queryKey: ['/api/webhooks/health', { hours: 24 }],
    enabled: !!user,
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch rate limit status for all marketplaces
  const { data: rateLimits = {}, isLoading: rateLimitsLoading } = useQuery<Record<string, RateLimit>>({
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
        title: "✅ Sync completed",
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
        title: "❌ Sync failed",
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
        title: "🎯 Conflicts resolved",
        description: "Conflicts have been automatically resolved based on your settings.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sync/conflicts'] });
    },
    onError: (error: any) => {
      toast({
        title: "⚠️ Resolution failed",
        description: error.message || "Failed to auto-resolve conflicts.",
        variant: "destructive",
      });
    },
  });

  // Calculate sync statistics
  const connectedPlatforms = marketplaces.filter(m => m.isConnected);
  const totalListings = syncStatus.length;
  const syncedListings = syncStatus.filter(item => 
    Object.values(item.platforms).some(p => p.synced)
  ).length;
  const pendingSync = totalListings - syncedListings;
  const unresolvedConflicts = syncConflicts.length;

  // Enhanced statistics
  const activeSyncJobs = syncJobs.filter(job => 
    ['pending', 'processing'].includes(job.status)
  ).length;
  const webhookHealthScore = webhookHealthSummary?.healthScore || 0;
  const activeWebhooks = webhookConfigs.filter(config => 
    config.isEnabled && config.isActive
  ).length;
  const rateLimitedPlatforms = Object.values(rateLimits).filter(
    (limit: RateLimit) => limit && limit.remainingRequests < (limit.maxRequests * 0.1)
  ).length;

  // Calculate sync completion percentage
  const syncCompletionRate = totalListings > 0 ? (syncedListings / totalListings) * 100 : 0;

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

  // Get status colors using the new color system
  const getStatusColor = (value: number, isPercentage = false) => {
    if (isPercentage) {
      if (value >= 90) return "text-green-600 dark:text-green-400";
      if (value >= 50) return "text-yellow-600 dark:text-yellow-400";
      return "text-red-600 dark:text-red-400";
    }
    return value > 0 ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400";
  };

  const getStatusBadgeColor = (synced: boolean) => {
    return synced ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800" : 
                   "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800";
  };

  const getHealthBadgeColor = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800";
    if (score >= 70) return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800";
    return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800";
  };

  // Toggle job expansion
  const toggleJobExpansion = (jobId: string) => {
    const newExpanded = new Set(expandedJobs);
    if (newExpanded.has(jobId)) {
      newExpanded.delete(jobId);
    } else {
      newExpanded.add(jobId);
    }
    setExpandedJobs(newExpanded);
  };

  // Toggle conflict expansion
  const toggleConflictExpansion = (conflictId: string) => {
    const newExpanded = new Set(expandedConflicts);
    if (newExpanded.has(conflictId)) {
      newExpanded.delete(conflictId);
    } else {
      newExpanded.add(conflictId);
    }
    setExpandedConflicts(newExpanded);
  };

  const isLoading = statusLoading || marketplacesLoading || jobsLoading;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50 p-4 sm:p-6 lg:p-8">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Sync Center</h1>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-muted-foreground">
                  Manage cross-platform listing synchronization
                </p>
                <div className="flex items-center gap-1">
                  {isConnected ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open('/docs/sync-guide', '_blank')}
                    className="gap-2"
                    data-testid="button-help"
                  >
                    <BookOpen className="h-4 w-4" />
                    <span className="hidden sm:inline">Guide</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View sync setup guide</p>
                </TooltipContent>
              </Tooltip>
              <Button 
                onClick={handleSyncAll}
                disabled={isSyncing || connectedPlatforms.length === 0}
                className="gap-2"
                data-testid="button-sync-all"
              >
                <RefreshCcw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                {isSyncing ? 'Syncing...' : 'Sync All'}
              </Button>
            </div>
          </div>
          
          {isSyncing && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Synchronizing listings...</span>
                <span>{syncProgress}%</span>
              </div>
              <Progress value={syncProgress} className="h-2" />
            </div>
          )}
        </div>

        {/* Enhanced Stats Cards - New Information Hierarchy */}
        <div className="space-y-6 mb-8">
          {/* Row 1: Platform Health */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Signal className="h-5 w-5" />
              Platform Health
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="relative overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Connected Platforms
                    </CardTitle>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Number of marketplaces linked to your account</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <div className="text-2xl font-bold">{connectedPlatforms.length}</div>
                    )}
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">of {marketplaces.length} total</div>
                      {connectedPlatforms.length === 0 && (
                        <Button variant="link" size="sm" className="mt-1 p-0 h-auto text-xs">
                          <Link className="h-3 w-3 mr-1" />
                          Connect marketplace
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Webhook className="h-4 w-4" />
                      Webhook Health
                    </CardTitle>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Percentage of successful webhook deliveries in last 24h</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    {webhookHealthLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <div className={cn("text-2xl font-bold", getHealthBadgeColor(webhookHealthScore).split(' ')[1])}>
                        {Math.round(webhookHealthScore)}%
                      </div>
                    )}
                    <div className="text-right">
                      <div className="flex items-center gap-1 mb-1">
                        <div className={cn("w-2 h-2 rounded-full", isConnected ? 'bg-green-500' : 'bg-red-500')}></div>
                        <span className="text-xs text-muted-foreground">
                          {activeWebhooks} active
                        </span>
                      </div>
                      {activeWebhooks === 0 && (
                        <Button variant="link" size="sm" className="mt-1 p-0 h-auto text-xs">
                          <Plus className="h-3 w-3 mr-1" />
                          Setup webhooks
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Row 2: Sync Operations */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5" />
              Sync Operations
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="relative overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Synced Listings
                    </CardTitle>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Listings synchronized across all connected platforms</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    {isLoading ? (
                      <Skeleton className="h-8 w-20" />
                    ) : (
                      <div className="text-2xl font-bold">
                        {syncedListings}<span className="text-lg text-muted-foreground">/{totalListings}</span>
                      </div>
                    )}
                    <div className="text-right">
                      <Badge variant="outline" className={getHealthBadgeColor(syncCompletionRate)}>
                        {Math.round(syncCompletionRate)}%
                      </Badge>
                      {totalListings === 0 && (
                        <Button variant="link" size="sm" className="mt-1 p-0 h-auto text-xs">
                          <Plus className="h-3 w-3 mr-1" />
                          Create listing
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Active Jobs
                    </CardTitle>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Background processes managing cross-platform sync</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    {jobsLoading ? (
                      <Skeleton className="h-8 w-12" />
                    ) : (
                      <div className={cn("text-2xl font-bold", getStatusColor(activeSyncJobs))}>
                        {activeSyncJobs}
                      </div>
                    )}
                    {activeSyncJobs > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-muted-foreground">Processing</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Pending Operations
                    </CardTitle>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Listings waiting to be synchronized</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    {isLoading ? (
                      <Skeleton className="h-8 w-12" />
                    ) : (
                      <div className={cn("text-2xl font-bold", getStatusColor(pendingSync))}>
                        {pendingSync}
                      </div>
                    )}
                    {rateLimitedPlatforms > 0 && (
                      <div className="text-right">
                        <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800">
                          {rateLimitedPlatforms} rate limited
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Row 3: Issues & Actions */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Issues & Actions
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <Card className="relative overflow-hidden border-l-4 border-l-red-500 dark:border-l-red-400">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Unresolved Conflicts
                    </CardTitle>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Conflicts when listings are modified on multiple platforms</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    {conflictsLoading ? (
                      <Skeleton className="h-8 w-12" />
                    ) : (
                      <div className={cn("text-2xl font-bold", unresolvedConflicts > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400")}>
                        {unresolvedConflicts}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      {unresolvedConflicts > 0 ? (
                        <Button 
                          onClick={() => autoResolveMutation.mutate()}
                          disabled={autoResolveMutation.isPending}
                          size="sm"
                          className="gap-2"
                          data-testid="button-auto-resolve"
                        >
                          <Target className="h-4 w-4" />
                          Auto-resolve
                        </Button>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                          All resolved
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Enhanced Main Content Tabs */}
        <Tabs defaultValue="listings" className="space-y-6">
          <TabsList className="grid w-full max-w-3xl grid-cols-5 h-12">
            <TabsTrigger value="listings" className="text-sm" data-testid="tab-listings">
              <ShoppingBag className="h-4 w-4 mr-2" />
              Listings
            </TabsTrigger>
            <TabsTrigger value="jobs" className="text-sm" data-testid="tab-jobs">
              <Activity className="h-4 w-4 mr-2" />
              Jobs
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="text-sm" data-testid="tab-webhooks">
              <Webhook className="h-4 w-4 mr-2" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="history" className="text-sm" data-testid="tab-history">
              <History className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
            <TabsTrigger value="conflicts" className="text-sm" data-testid="tab-conflicts">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Conflicts
            </TabsTrigger>
          </TabsList>

          {/* Enhanced Listings Tab */}
          <TabsContent value="listings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Listing Sync Status
                </CardTitle>
                <CardDescription>
                  View and manage sync status for each listing across platforms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {statusLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="border rounded-lg p-4">
                          <Skeleton className="h-4 w-48 mb-2" />
                          <div className="flex gap-2">
                            <Skeleton className="h-6 w-20" />
                            <Skeleton className="h-6 w-20" />
                            <Skeleton className="h-6 w-20" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : syncStatus.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="flex items-center justify-between">
                        <div>
                          <strong>No listings to sync.</strong> Connect a marketplace and create your first listing to begin syncing.
                        </div>
                        <div className="flex gap-2">
                          <Link href="/connections">
                            <Button size="sm" variant="outline">
                              <LinkIcon className="h-4 w-4 mr-2" />
                              Connect Marketplace
                            </Button>
                          </Link>
                          <Link href="/create-listing">
                            <Button size="sm">
                              <Plus className="h-4 w-4 mr-2" />
                              Create Listing
                            </Button>
                          </Link>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    syncStatus.map((item) => (
                      <Card key={item.listingId} className="border-l-4 border-l-blue-500 dark:border-l-blue-400">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-base mb-3">{item.title}</h4>
                              <div className="flex flex-wrap gap-2">
                                {connectedPlatforms.map((platform) => {
                                  const status = item.platforms[platform.marketplace];
                                  return (
                                    <Tooltip key={platform.marketplace}>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center gap-2">
                                          <Badge 
                                            variant="outline"
                                            className={status?.synced ? getStatusBadgeColor(true) : getStatusBadgeColor(false)}
                                            data-testid={`badge-${platform.marketplace}-${item.listingId}`}
                                          >
                                            <span className="capitalize">{platform.marketplace}</span>
                                            {status?.synced ? (
                                              <CheckCircle2 className="ml-1 h-3 w-3" />
                                            ) : (
                                              <Clock className="ml-1 h-3 w-3" />
                                            )}
                                          </Badge>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>
                                          {status?.lastSync 
                                            ? `Last synced: ${formatDistance(new Date(status.lastSync), new Date(), { addSuffix: true })}`
                                            : 'Never synced'
                                          }
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
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
                              className="ml-4"
                            >
                              <RefreshCcw className={cn("h-4 w-4", syncMutation.isPending && "animate-spin")} />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Sync Jobs Tab with Progressive Disclosure */}
          <TabsContent value="jobs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Cross-Platform Sync Jobs
                </CardTitle>
                <CardDescription>
                  Real-time monitoring of cross-platform inventory sync operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {jobsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="border rounded-lg p-4">
                          <Skeleton className="h-4 w-48 mb-2" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      ))}
                    </div>
                  ) : syncJobs.length === 0 ? (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        <strong>No active sync jobs.</strong> Sales will trigger automatic cross-platform delisting when webhooks are configured.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    syncJobs.slice(0, 20).map((job) => (
                      <Card key={job.id} className="overflow-hidden">
                        <CardContent className="p-0">
                          <Collapsible>
                            <CollapsibleTrigger
                              onClick={() => toggleJobExpansion(job.id)}
                              className="w-full p-4 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 text-left">
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
                                    {expandedJobs.has(job.id) ? (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    Sold on <span className="font-medium capitalize">{job.soldMarketplace}</span> • 
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
                            </CollapsibleTrigger>
                            
                            <CollapsibleContent className="px-4 pb-4">
                              {job.status === 'processing' && job.progress && (
                                <div className="mb-3">
                                  <div className="flex justify-between text-sm mb-1">
                                    <span>Progress</span>
                                    <span>{job.progress}%</span>
                                  </div>
                                  <Progress value={job.progress} className="h-2" />
                                </div>
                              )}

                              <div className="flex items-center justify-between text-sm border-t pt-3">
                                <div className="flex gap-4">
                                  <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                                    <CheckCircle2 className="h-4 w-4" />
                                    {job.successful || 0} successful
                                  </span>
                                  {(job.failed || 0) > 0 && (
                                    <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                                      <AlertCircle className="h-4 w-4" />
                                      {job.failed} failed
                                    </span>
                                  )}
                                  {(job.skipped || 0) > 0 && (
                                    <span className="text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                                      <Clock className="h-4 w-4" />
                                      {job.skipped} skipped
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
                                    <AlertCircle className="h-4 w-4 mr-2" />
                                    View Error
                                  </Button>
                                )}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Webhooks Tab */}
          <TabsContent value="webhooks" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Webhook className="h-5 w-5" />
                    Webhook Status
                  </CardTitle>
                  <CardDescription>
                    Real-time sales detection via marketplace webhooks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {webhookConfigsLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex items-center justify-between p-3 border rounded">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-6 w-16" />
                          </div>
                        ))}
                      </div>
                    ) : webhookConfigs.length === 0 ? (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="flex items-center justify-between">
                          <div>
                            <strong>No webhooks configured.</strong> Set up webhooks for instant sales detection and automated delisting.
                          </div>
                          <Button size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Setup Webhooks
                          </Button>
                        </AlertDescription>
                      </Alert>
                    ) : (
                      webhookConfigs.map((config) => (
                        <div key={config.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={cn("w-3 h-3 rounded-full", 
                              config.isActive && config.isEnabled ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                            )}></div>
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
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Rate Limits
                  </CardTitle>
                  <CardDescription>
                    Current API rate limiting status across platforms
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {rateLimitsLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="space-y-2">
                            <div className="flex justify-between">
                              <Skeleton className="h-4 w-16" />
                              <Skeleton className="h-4 w-12" />
                            </div>
                            <Skeleton className="h-2 w-full" />
                          </div>
                        ))}
                      </div>
                    ) : connectedPlatforms.length === 0 ? (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          Connect marketplaces to monitor rate limits and API usage.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      connectedPlatforms.map((platform) => {
                        const rateLimit = rateLimits[platform.marketplace];
                        const usagePercent = rateLimit ? 
                          ((rateLimit.maxRequests - rateLimit.remainingRequests) / rateLimit.maxRequests) * 100 : 0;
                        
                        return (
                          <div key={platform.marketplace} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium capitalize flex items-center gap-2">
                                {platform.marketplace}
                                {rateLimit?.isBlocked && (
                                  <Badge variant="destructive" className="text-xs">Blocked</Badge>
                                )}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {rateLimit?.remainingRequests || 'N/A'} / {rateLimit?.maxRequests || 'N/A'}
                              </span>
                            </div>
                            <Progress 
                              value={usagePercent} 
                              className={cn("h-2", 
                                usagePercent > 90 ? 'bg-red-100 dark:bg-red-900/20' : 
                                usagePercent > 70 ? 'bg-yellow-100 dark:bg-yellow-900/20' : 'bg-green-100 dark:bg-green-900/20'
                              )}
                            />
                            {rateLimit?.resetTime && (
                              <p className="text-xs text-muted-foreground">
                                Resets: {format(new Date(rateLimit.resetTime), "HH:mm")}
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Enhanced History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Sync History
                    </CardTitle>
                    <CardDescription>
                      Recent synchronization operations and their status
                    </CardDescription>
                  </div>
                  {syncHistory.length > 10 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAllHistory(!showAllHistory)}
                    >
                      {showAllHistory ? 'Show Less' : `Show All ${syncHistory.length}`}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {historyLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between py-3 border-b">
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-5 w-5 rounded-full" />
                            <div>
                              <Skeleton className="h-4 w-48 mb-1" />
                              <Skeleton className="h-3 w-32" />
                            </div>
                          </div>
                          <Skeleton className="h-6 w-16" />
                        </div>
                      ))}
                    </div>
                  ) : syncHistory.length === 0 ? (
                    <Alert>
                      <Clock className="h-4 w-4" />
                      <AlertDescription>
                        <strong>No sync history yet.</strong> Your synchronization activities will appear here.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    (showAllHistory ? syncHistory : syncHistory.slice(0, 10)).map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between py-3 border-b last:border-0 hover:bg-muted/50 transition-colors rounded px-2">
                        <div className="flex items-center gap-3">
                          {entry.status === "success" ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-red-500" />
                          )}
                          <div>
                            <p className="font-medium">
                              {entry.syncType === "create" ? "Created" : "Updated"} on{' '}
                              <span className="capitalize">{entry.targetMarketplace}</span>
                            </p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{format(new Date(entry.createdAt), "MMM dd, yyyy HH:mm")}</span>
                              {entry.syncDuration && (
                                <>
                                  <span>•</span>
                                  <span>{entry.syncDuration}ms</span>
                                </>
                              )}
                            </div>
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

          {/* Enhanced Conflicts Tab with Progressive Disclosure */}
          <TabsContent value="conflicts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Sync Conflicts
                </CardTitle>
                <CardDescription>
                  Resolve conflicts when listings are modified on multiple platforms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {conflictsLoading ? (
                    <div className="space-y-4">
                      {[1, 2].map((i) => (
                        <div key={i} className="border rounded-lg p-4">
                          <Skeleton className="h-4 w-32 mb-2" />
                          <Skeleton className="h-3 w-48 mb-4" />
                          <div className="grid grid-cols-2 gap-4">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : syncConflicts.length === 0 ? (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <AlertDescription>
                        <strong>No conflicts detected.</strong> Your listings are in sync across all platforms!
                      </AlertDescription>
                    </Alert>
                  ) : (
                    syncConflicts.map((conflict) => (
                      <Card key={conflict.id} className="border-l-4 border-l-red-500 dark:border-l-red-400">
                        <CardContent className="p-0">
                          <Collapsible>
                            <CollapsibleTrigger
                              onClick={() => toggleConflictExpansion(conflict.id)}
                              className="w-full p-4 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div className="text-left">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="destructive" className="mb-1">
                                      {conflict.conflictType.replace(/_/g, ' ')}
                                    </Badge>
                                    {expandedConflicts.has(conflict.id) ? (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    Between <span className="capitalize font-medium">{conflict.sourceMarketplace}</span> and <span className="capitalize font-medium">{conflict.targetMarketplace}</span>
                                  </p>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(conflict.createdAt), "MMM dd, HH:mm")}
                                </span>
                              </div>
                            </CollapsibleTrigger>
                            
                            <CollapsibleContent className="px-4 pb-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div className="p-3 bg-muted rounded-lg">
                                  <p className="text-sm font-medium mb-1 capitalize">{conflict.sourceMarketplace}</p>
                                  <p className="text-sm bg-background p-2 rounded border">
                                    {JSON.stringify(conflict.sourceValue, null, 2)}
                                  </p>
                                </div>
                                <div className="p-3 bg-muted rounded-lg">
                                  <p className="text-sm font-medium mb-1 capitalize">{conflict.targetMarketplace}</p>
                                  <p className="text-sm bg-background p-2 rounded border">
                                    {JSON.stringify(conflict.targetValue, null, 2)}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex gap-2 mt-4 pt-4 border-t">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  data-testid={`button-keep-source-${conflict.id}`}
                                  className="flex-1"
                                >
                                  <ArrowUpDown className="h-4 w-4 mr-2" />
                                  Use {conflict.sourceMarketplace}
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  data-testid={`button-keep-target-${conflict.id}`}
                                  className="flex-1"
                                >
                                  <ArrowUpDown className="h-4 w-4 mr-2" />
                                  Use {conflict.targetMarketplace}
                                </Button>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}