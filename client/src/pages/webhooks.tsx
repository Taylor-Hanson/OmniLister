import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Globe, 
  BarChart3, 
  Settings, 
  Play, 
  Pause, 
  TestTube,
  RefreshCw,
  Zap,
  TrendingUp,
  Webhook,
  Database,
  Monitor
} from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

interface WebhookConfiguration {
  id: string;
  marketplace: string;
  webhookUrl: string;
  isEnabled: boolean;
  isActive: boolean;
  verificationStatus: string;
  supportedEvents: string[];
  subscribedEvents: string[];
  errorCount: number;
  lastEventAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface WebhookEvent {
  id: string;
  marketplace: string;
  eventType: string;
  externalId?: string;
  listingId?: string;
  processingStatus: string;
  signatureValid: boolean;
  syncJobId?: string;
  errorMessage?: string;
  processingTime?: number;
  createdAt: string;
  processedAt?: string;
}

interface PollingSchedule {
  id: string;
  marketplace: string;
  isEnabled: boolean;
  pollingInterval: number;
  currentInterval: number;
  nextPollAt?: string;
  lastPollAt?: string;
  consecutiveFailures: number;
  salesDetectedSinceLastPoll: number;
  lastError?: string;
  lastErrorAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface WebhookHealthSummary {
  totalEvents: number;
  successRate: number;
  averageProcessingTime: number;
  healthScore: number;
  uptime: number;
}

export default function WebhooksPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("24");
  const [testWebhookOpen, setTestWebhookOpen] = useState(false);
  const [testMarketplace, setTestMarketplace] = useState<string>("");
  const [testPayload, setTestPayload] = useState<string>("");

  // Fetch webhook configurations
  const { data: webhookConfigs, isLoading: configsLoading } = useQuery({
    queryKey: ["/api/webhooks/configurations"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch webhook events
  const { data: webhookEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/webhooks/events", { 
      marketplace: selectedMarketplace !== "all" ? selectedMarketplace : undefined,
      limit: 100 
    }],
    refetchInterval: 10000, // Refresh every 10 seconds for real-time monitoring
  });

  // Fetch polling schedules
  const { data: pollingSchedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ["/api/polling/schedules"],
    refetchInterval: 30000,
  });

  // Fetch webhook health summary
  const { data: healthSummary, isLoading: healthLoading } = useQuery({
    queryKey: ["/api/webhooks/health", { 
      marketplace: selectedMarketplace !== "all" ? selectedMarketplace : undefined,
      hours: parseInt(timeRange)
    }],
    refetchInterval: 60000, // Refresh every minute
  });

  // Register webhook mutation
  const registerWebhookMutation = useMutation({
    mutationFn: async (data: { marketplace: string; events: string[] }) => {
      return apiRequest("POST", "/api/webhooks/configurations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks/configurations"] });
      toast({ title: "Webhook registered successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to register webhook", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  // Update webhook configuration mutation
  const updateWebhookMutation = useMutation({
    mutationFn: async ({ configId, updates }: { configId: string; updates: any }) => {
      return apiRequest("PUT", `/api/webhooks/configurations/${configId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks/configurations"] });
      toast({ title: "Webhook configuration updated" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update webhook", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  // Test webhook mutation
  const testWebhookMutation = useMutation({
    mutationFn: async (data: { marketplace: string; payload: any }) => {
      const response = await apiRequest("POST", `/api/webhooks/${data.marketplace}/test`, data.payload);
      return response.json();
    },
    onSuccess: (result) => {
      toast({ 
        title: "Test webhook processed", 
        description: `${result.success ? 'Success' : 'Failed'}: ${result.message}` 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks/events"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Test webhook failed", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  // Create polling schedule mutation
  const createPollingMutation = useMutation({
    mutationFn: async (data: { marketplace: string; pollingInterval: number }) => {
      return apiRequest("POST", "/api/polling/schedules", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polling/schedules"] });
      toast({ title: "Polling schedule created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create polling schedule", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  // Update polling schedule mutation
  const updatePollingMutation = useMutation({
    mutationFn: async ({ scheduleId, updates }: { scheduleId: string; updates: any }) => {
      return apiRequest("PUT", `/api/polling/schedules/${scheduleId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polling/schedules"] });
      toast({ title: "Polling schedule updated" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update polling schedule", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const handleToggleWebhook = (configId: string, enabled: boolean) => {
    updateWebhookMutation.mutate({ configId, updates: { isEnabled: enabled } });
  };

  const handleTogglePolling = (scheduleId: string, enabled: boolean) => {
    updatePollingMutation.mutate({ scheduleId, updates: { isEnabled: enabled } });
  };

  const handleTestWebhook = () => {
    if (!testMarketplace || !testPayload) {
      toast({ title: "Please select marketplace and enter test payload", variant: "destructive" });
      return;
    }

    try {
      const payload = JSON.parse(testPayload);
      testWebhookMutation.mutate({ marketplace: testMarketplace, payload });
      setTestWebhookOpen(false);
      setTestPayload("");
    } catch (error) {
      toast({ title: "Invalid JSON payload", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" data-testid={`status-completed`}><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'processing':
        return <Badge variant="outline" data-testid={`status-processing`}><Clock className="w-3 h-3 mr-1" />Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive" data-testid={`status-failed`}><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary" data-testid={`status-pending`}><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline" data-testid={`status-unknown`}>{status}</Badge>;
    }
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge variant="default" data-testid={`verification-verified`}><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
      case 'pending':
        return <Badge variant="outline" data-testid={`verification-pending`}><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive" data-testid={`verification-failed`}><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline" data-testid={`verification-unknown`}>{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6" data-testid="webhooks-page">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">Webhook Management</h1>
          <p className="text-muted-foreground" data-testid="page-description">
            Monitor and manage real-time sales notifications from marketplaces
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={testWebhookOpen} onOpenChange={setTestWebhookOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-test-webhook">
                <TestTube className="w-4 h-4 mr-2" />
                Test Webhook
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="dialog-test-webhook">
              <DialogHeader>
                <DialogTitle>Test Webhook</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Select value={testMarketplace} onValueChange={setTestMarketplace}>
                  <SelectTrigger data-testid="select-test-marketplace">
                    <SelectValue placeholder="Select marketplace" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ebay" data-testid="option-ebay">eBay</SelectItem>
                    <SelectItem value="mercari" data-testid="option-mercari">Mercari</SelectItem>
                    <SelectItem value="poshmark" data-testid="option-poshmark">Poshmark</SelectItem>
                    <SelectItem value="generic" data-testid="option-generic">Generic</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Enter test webhook payload (JSON format)"
                  value={testPayload}
                  onChange={(e) => setTestPayload(e.target.value)}
                  rows={6}
                  data-testid="textarea-test-payload"
                />
                <Button 
                  onClick={handleTestWebhook} 
                  disabled={testWebhookMutation.isPending}
                  data-testid="button-submit-test"
                >
                  {testWebhookMutation.isPending ? "Testing..." : "Send Test Webhook"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] })}
            variant="outline"
            data-testid="button-refresh"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Health Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="card-total-events">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-total-events">
              {healthLoading ? "..." : (healthSummary?.totalEvents || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Last {timeRange} hours</p>
          </CardContent>
        </Card>

        <Card data-testid="card-success-rate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="metric-success-rate">
              {healthLoading ? "..." : `${(healthSummary?.successRate || 0).toFixed(1)}%`}
            </div>
            <p className="text-xs text-muted-foreground">Webhook processing</p>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-processing-time">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Processing</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-avg-processing-time">
              {healthLoading ? "..." : `${(healthSummary?.averageProcessingTime || 0).toFixed(0)}ms`}
            </div>
            <p className="text-xs text-muted-foreground">Response time</p>
          </CardContent>
        </Card>

        <Card data-testid="card-health-score">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Score</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="metric-health-score">
              {healthLoading ? "..." : `${(healthSummary?.healthScore || 0).toFixed(0)}/100`}
            </div>
            <p className="text-xs text-muted-foreground">Overall health</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card data-testid="card-filters">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Select value={selectedMarketplace} onValueChange={setSelectedMarketplace}>
            <SelectTrigger className="w-48" data-testid="select-marketplace-filter">
              <SelectValue placeholder="All Marketplaces" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" data-testid="filter-all">All Marketplaces</SelectItem>
              <SelectItem value="ebay" data-testid="filter-ebay">eBay</SelectItem>
              <SelectItem value="mercari" data-testid="filter-mercari">Mercari</SelectItem>
              <SelectItem value="poshmark" data-testid="filter-poshmark">Poshmark</SelectItem>
              <SelectItem value="facebook" data-testid="filter-facebook">Facebook Marketplace</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32" data-testid="select-time-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1" data-testid="range-1h">Last Hour</SelectItem>
              <SelectItem value="24" data-testid="range-24h">Last 24h</SelectItem>
              <SelectItem value="168" data-testid="range-7d">Last 7 days</SelectItem>
              <SelectItem value="720" data-testid="range-30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="configurations" className="space-y-4" data-testid="tabs-main">
        <TabsList data-testid="tabs-list">
          <TabsTrigger value="configurations" data-testid="tab-configurations">
            <Webhook className="w-4 h-4 mr-2" />
            Webhook Configs
          </TabsTrigger>
          <TabsTrigger value="events" data-testid="tab-events">
            <Activity className="w-4 h-4 mr-2" />
            Recent Events
          </TabsTrigger>
          <TabsTrigger value="polling" data-testid="tab-polling">
            <Database className="w-4 h-4 mr-2" />
            Polling Schedules
          </TabsTrigger>
          <TabsTrigger value="monitoring" data-testid="tab-monitoring">
            <BarChart3 className="w-4 h-4 mr-2" />
            Monitoring
          </TabsTrigger>
        </TabsList>

        {/* Webhook Configurations Tab */}
        <TabsContent value="configurations" data-testid="content-configurations">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Configurations</CardTitle>
            </CardHeader>
            <CardContent>
              {configsLoading ? (
                <div className="text-center py-4" data-testid="loading-configs">Loading configurations...</div>
              ) : webhookConfigs?.length === 0 ? (
                <Alert data-testid="alert-no-configs">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No webhook configurations found. Connect marketplaces to set up real-time notifications.
                  </AlertDescription>
                </Alert>
              ) : (
                <Table data-testid="table-webhook-configs">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Marketplace</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Verification</TableHead>
                      <TableHead>Events</TableHead>
                      <TableHead>Last Event</TableHead>
                      <TableHead>Errors</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhookConfigs?.map((config: WebhookConfiguration) => (
                      <TableRow key={config.id} data-testid={`config-row-${config.marketplace}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            <span className="font-medium capitalize">{config.marketplace}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={config.isEnabled && config.isActive ? "default" : "secondary"}>
                            {config.isEnabled && config.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getVerificationBadge(config.verificationStatus)}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {config.subscribedEvents.length} events
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {config.lastEventAt 
                              ? format(new Date(config.lastEventAt), 'MMM dd, HH:mm')
                              : 'Never'
                            }
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm ${config.errorCount > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                            {config.errorCount}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={config.isEnabled}
                              onCheckedChange={(checked) => handleToggleWebhook(config.id, checked)}
                              data-testid={`switch-webhook-${config.marketplace}`}
                            />
                            <Button variant="ghost" size="sm" data-testid={`button-settings-${config.marketplace}`}>
                              <Settings className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhook Events Tab */}
        <TabsContent value="events" data-testid="content-events">
          <Card>
            <CardHeader>
              <CardTitle>Recent Webhook Events</CardTitle>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="text-center py-4" data-testid="loading-events">Loading events...</div>
              ) : webhookEvents?.length === 0 ? (
                <Alert data-testid="alert-no-events">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No webhook events found for the selected criteria.
                  </AlertDescription>
                </Alert>
              ) : (
                <Table data-testid="table-webhook-events">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Marketplace</TableHead>
                      <TableHead>Event Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Processing Time</TableHead>
                      <TableHead>Sync Job</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhookEvents?.map((event: WebhookEvent) => (
                      <TableRow key={event.id} data-testid={`event-row-${event.id}`}>
                        <TableCell>
                          <span className="text-sm">
                            {format(new Date(event.createdAt), 'MMM dd, HH:mm:ss')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium capitalize">{event.marketplace}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{event.eventType}</Badge>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(event.processingStatus)}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {event.processingTime ? `${event.processingTime}ms` : '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {event.syncJobId ? (
                            <Badge variant="default" data-testid={`sync-job-${event.id}`}>Triggered</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {event.errorMessage ? (
                            <span className="text-red-600 text-sm truncate max-w-32" title={event.errorMessage}>
                              {event.errorMessage}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Polling Schedules Tab */}
        <TabsContent value="polling" data-testid="content-polling">
          <Card>
            <CardHeader>
              <CardTitle>Polling Schedules</CardTitle>
              <p className="text-sm text-muted-foreground">
                Fallback polling for marketplaces without webhook support
              </p>
            </CardHeader>
            <CardContent>
              {schedulesLoading ? (
                <div className="text-center py-4" data-testid="loading-schedules">Loading schedules...</div>
              ) : pollingSchedules?.length === 0 ? (
                <Alert data-testid="alert-no-schedules">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No polling schedules configured. Set up polling for marketplaces without webhook support.
                  </AlertDescription>
                </Alert>
              ) : (
                <Table data-testid="table-polling-schedules">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Marketplace</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Interval</TableHead>
                      <TableHead>Next Poll</TableHead>
                      <TableHead>Last Poll</TableHead>
                      <TableHead>Sales Detected</TableHead>
                      <TableHead>Failures</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pollingSchedules?.map((schedule: PollingSchedule) => (
                      <TableRow key={schedule.id} data-testid={`schedule-row-${schedule.marketplace}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Database className="w-4 h-4" />
                            <span className="font-medium capitalize">{schedule.marketplace}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={schedule.isEnabled ? "default" : "secondary"}>
                            {schedule.isEnabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {Math.floor(schedule.currentInterval / 60)}m {schedule.currentInterval % 60}s
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {schedule.nextPollAt 
                              ? format(new Date(schedule.nextPollAt), 'MMM dd, HH:mm')
                              : 'Not scheduled'
                            }
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {schedule.lastPollAt 
                              ? format(new Date(schedule.lastPollAt), 'MMM dd, HH:mm')
                              : 'Never'
                            }
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {schedule.salesDetectedSinceLastPoll}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm ${schedule.consecutiveFailures > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                            {schedule.consecutiveFailures}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={schedule.isEnabled}
                              onCheckedChange={(checked) => handleTogglePolling(schedule.id, checked)}
                              data-testid={`switch-polling-${schedule.marketplace}`}
                            />
                            <Button variant="ghost" size="sm" data-testid={`button-poll-settings-${schedule.marketplace}`}>
                              <Settings className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" data-testid="content-monitoring">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="card-webhook-health">
              <CardHeader>
                <CardTitle>Webhook Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Success Rate</span>
                    <span className="font-mono">{(healthSummary?.successRate || 0).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Uptime</span>
                    <span className="font-mono">{(healthSummary?.uptime || 0).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Health Score</span>
                    <span className="font-mono">{(healthSummary?.healthScore || 0).toFixed(0)}/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Response Time</span>
                    <span className="font-mono">{(healthSummary?.averageProcessingTime || 0).toFixed(0)}ms</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-recent-activity">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {webhookEvents?.slice(0, 5).map((event: WebhookEvent) => (
                    <div key={event.id} className="flex items-center justify-between p-2 rounded border" data-testid={`activity-${event.id}`}>
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        <span className="text-sm font-medium capitalize">{event.marketplace}</span>
                        <Badge variant="outline" className="text-xs">{event.eventType}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(event.processingStatus)}
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(event.createdAt), 'HH:mm')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}