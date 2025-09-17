import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { 
  Zap, AlertTriangle, Activity, TrendingUp, Users, Clock, 
  Target, ShoppingBag, DollarSign, Play, Pause, StopCircle,
  CheckCircle, XCircle, AlertCircle, ChevronRight
} from "lucide-react";

interface AutomationStats {
  todayShares: number;
  todayOffers: number;
  todayFollows: number;
  successRate: number;
  activeAutomations: number;
  totalExecutions: number;
  failedExecutions: number;
  nextScheduledRun: string | null;
}

interface AutomationActivity {
  id: string;
  marketplace: string;
  type: string;
  status: 'success' | 'failed' | 'pending';
  message: string;
  timestamp: string;
  details?: any;
}

export default function AutomationDashboard() {
  const { toast } = useToast();
  const { isConnected, automationStatus } = useWebSocket();
  const [masterEnabled, setMasterEnabled] = useState(true);
  const [selectedMarketplace, setSelectedMarketplace] = useState<string | null>(null);

  // Fetch automation stats
  const { data: stats, isLoading: statsLoading } = useQuery<AutomationStats>({
    queryKey: ['/api/automation/stats'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch recent automation activity
  const { data: activities = [], isLoading: activitiesLoading } = useQuery<AutomationActivity[]>({
    queryKey: ['/api/automation/activities'],
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // Fetch marketplace automation status
  const { data: marketplaceStatus = {} } = useQuery<Record<string, any>>({
    queryKey: ['/api/automation/marketplace-status'],
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  // Master switch mutation
  const masterSwitchMutation = useMutation({
    mutationFn: (enabled: boolean) => 
      apiRequest('/api/automation/master', {
        method: 'POST',
        body: JSON.stringify({ enabled })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation'] });
      toast({
        title: masterEnabled ? "Automations Paused" : "Automations Enabled",
        description: masterEnabled 
          ? "All automations have been paused" 
          : "Automations are now running"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update automation status",
        variant: "destructive"
      });
    }
  });

  // Emergency stop mutation
  const emergencyStopMutation = useMutation({
    mutationFn: () => 
      apiRequest('/api/automation/emergency-stop', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation'] });
      toast({
        title: "Emergency Stop Activated",
        description: "All automations have been immediately stopped",
        variant: "destructive"
      });
      setMasterEnabled(false);
    }
  });

  const handleMasterSwitch = (checked: boolean) => {
    setMasterEnabled(checked);
    masterSwitchMutation.mutate(checked);
  };

  const marketplaces = [
    { id: 'poshmark', name: 'Poshmark', icon: '👗', color: 'bg-pink-500' },
    { id: 'mercari', name: 'Mercari', icon: '🛍️', color: 'bg-red-500' },
    { id: 'depop', name: 'Depop', icon: '👕', color: 'bg-blue-500' },
    { id: 'grailed', name: 'Grailed', icon: '👔', color: 'bg-gray-600' },
    { id: 'ebay', name: 'eBay', icon: '🏷️', color: 'bg-yellow-500' },
    { id: 'facebook', name: 'Facebook', icon: '📱', color: 'bg-blue-600' }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Success</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">Failed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Zap className="h-8 w-8 text-yellow-500" />
            Automation Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Control and monitor your automated marketplace activities
            {isConnected && (
              <span className="ml-2 inline-flex items-center text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                Live
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Master Switch */}
          <div className="flex items-center space-x-2 p-3 bg-card rounded-lg border">
            <span className="text-sm font-medium">Master Control</span>
            <Switch
              checked={masterEnabled}
              onCheckedChange={handleMasterSwitch}
              data-testid="switch-master-automation"
              className="data-[state=checked]:bg-green-500"
            />
            <Badge variant={masterEnabled ? "default" : "secondary"}>
              {masterEnabled ? "Active" : "Paused"}
            </Badge>
          </div>

          {/* Emergency Stop */}
          <Button
            variant="destructive"
            size="lg"
            onClick={() => emergencyStopMutation.mutate()}
            disabled={emergencyStopMutation.isPending || !masterEnabled}
            data-testid="button-emergency-stop"
          >
            <StopCircle className="mr-2 h-4 w-4" />
            Emergency Stop
          </Button>
        </div>
      </div>

      {/* Warning Alert if automations are paused */}
      {!masterEnabled && (
        <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            All automations are currently paused. Toggle the master control to resume automated activities.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-todays-shares">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Shares</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.todayShares || 0}</div>
            <p className="text-xs text-muted-foreground">Items shared across platforms</p>
          </CardContent>
        </Card>

        <Card data-testid="card-offers-sent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offers Sent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.todayOffers || 0}</div>
            <p className="text-xs text-muted-foreground">Automated offers today</p>
          </CardContent>
        </Card>

        <Card data-testid="card-new-followers">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Followers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.todayFollows || 0}</div>
            <p className="text-xs text-muted-foreground">Followers gained today</p>
          </CardContent>
        </Card>

        <Card data-testid="card-success-rate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.successRate || 0}%</div>
            <Progress value={stats?.successRate || 0} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Marketplace Status */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Marketplace Status</CardTitle>
              <CardDescription>Real-time automation status per platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {marketplaces.map((marketplace) => {
                const status = marketplaceStatus[marketplace.id] || {};
                const isActive = status.enabled && masterEnabled;
                
                return (
                  <div
                    key={marketplace.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedMarketplace(marketplace.id)}
                    data-testid={`marketplace-status-${marketplace.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${marketplace.color} bg-opacity-20 flex items-center justify-center text-xl`}>
                        {marketplace.icon}
                      </div>
                      <div>
                        <p className="font-medium">{marketplace.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {status.activeAutomations || 0} active
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <Badge className="bg-green-100 text-green-800">
                          <Activity className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Pause className="h-3 w-3 mr-1" />
                          Paused
                        </Badge>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Live feed of automation executions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {activitiesLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading activities...
                  </div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No recent automation activity
                  </div>
                ) : (
                  activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      data-testid={`activity-${activity.id}`}
                    >
                      {getStatusIcon(activity.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{activity.marketplace}</span>
                          {getStatusBadge(activity.status)}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{activity.message}</p>
                        {activity.details && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {JSON.stringify(activity.details)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Next Scheduled Run */}
      {stats?.nextScheduledRun && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Next Scheduled Automation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Next automation will run {formatDistanceToNow(new Date(stats.nextScheduledRun), { addSuffix: true })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(stats.nextScheduledRun), 'PPpp')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}