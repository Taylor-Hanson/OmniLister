import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
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
  Package
} from "lucide-react";
import { format, formatDistance } from "date-fns";

export default function Sync() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [syncProgress, setSyncProgress] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
      </div>

      {/* Main Content */}
      <Tabs defaultValue="listings" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="listings" data-testid="tab-listings">Listings</TabsTrigger>
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