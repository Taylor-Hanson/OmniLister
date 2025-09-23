import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { 
  FileText, Filter, Download, RefreshCw, Search, 
  AlertTriangle, CheckCircle, XCircle, Info, Clock,
  Activity, Trash2, Eye, ChevronDown, ChevronRight
} from "lucide-react";

interface AutomationLog {
  id: string;
  timestamp: string;
  marketplace: string;
  automationType: string;
  action: string;
  status: 'success' | 'failed' | 'warning' | 'info';
  message: string;
  details?: any;
  duration?: number;
  errorCode?: string;
  stackTrace?: string;
  metadata?: {
    userId?: string;
    listingId?: string;
    targetUser?: string;
    retryCount?: number;
  };
}

interface LogStats {
  totalLogs: number;
  successCount: number;
  failureCount: number;
  warningCount: number;
  averageDuration: number;
  errorRate: number;
}

export default function AutomationLogs() {
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  // Filter states
  const [filters, setFilters] = useState({
    marketplace: 'all',
    automationType: 'all',
    status: 'all',
    searchTerm: '',
    timeRange: '24h',
  });

  // Fetch logs with polling for real-time updates
  const { data: logs = [], isLoading, refetch } = useQuery<AutomationLog[]>({
    queryKey: ['/api/automation/logs', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') params.append(key, value);
      });
      const response = await apiRequest('GET', `/api/automation/logs?${params.toString()}`);
      return response.json();
    },
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });

  // Fetch log statistics
  const { data: stats } = useQuery<LogStats>({
    queryKey: ['/api/automation/logs/stats', filters.timeRange],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/automation/logs/stats?timeRange=${filters.timeRange}`);
      return response.json();
    },
  });

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleExportLogs = async () => {
    try {
      const response = await apiRequest('POST', '/api/automation/logs/export', filters);
      const data = await response.json();
      
      // Create download link
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `automation-logs-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
      a.click();
      
      toast({
        title: "Logs Exported",
        description: "Logs have been downloaded successfully"
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export logs",
        variant: "destructive"
      });
    }
  };

  const handleClearLogs = async () => {
    if (!confirm("Are you sure you want to clear all logs? This action cannot be undone.")) {
      return;
    }

    try {
      await apiRequest('DELETE', '/api/automation/logs');
      refetch();
      toast({
        title: "Logs Cleared",
        description: "All logs have been cleared successfully"
      });
    } catch (error) {
      toast({
        title: "Clear Failed",
        description: "Failed to clear logs",
        variant: "destructive"
      });
    }
  };

  const toggleLogExpansion = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Success</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">Failed</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">Warning</Badge>;
      case 'info':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">Info</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const marketplaces = [
    { value: 'all', label: 'All Marketplaces' },
    { value: 'poshmark', label: 'Poshmark' },
    { value: 'mercari', label: 'Mercari' },
    { value: 'depop', label: 'Depop' },
    { value: 'grailed', label: 'Grailed' },
    { value: 'ebay', label: 'eBay' },
  ];

  const automationTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'share', label: 'Share' },
    { value: 'follow', label: 'Follow' },
    { value: 'offer', label: 'Offer' },
    { value: 'bump', label: 'Bump' },
    { value: 'relist', label: 'Relist' },
    { value: 'price_drop', label: 'Price Drop' },
  ];

  const statusTypes = [
    { value: 'all', label: 'All Statuses' },
    { value: 'success', label: 'Success' },
    { value: 'failed', label: 'Failed' },
    { value: 'warning', label: 'Warning' },
    { value: 'info', label: 'Info' },
  ];

  const timeRanges = [
    { value: '1h', label: 'Last Hour' },
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: 'all', label: 'All Time' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Automation Activity Logs
          </h2>
          <p className="text-muted-foreground mt-1">
            Monitor and debug your automation activities in real-time
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            data-testid="button-refresh-logs"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportLogs}
            data-testid="button-export-logs"
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearLogs}
            data-testid="button-clear-logs"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.totalLogs}</div>
              <p className="text-sm text-muted-foreground">Total Logs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.successCount}</div>
              <p className="text-sm text-muted-foreground">Successful</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.failureCount}</div>
              <p className="text-sm text-muted-foreground">Failed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.warningCount}</div>
              <p className="text-sm text-muted-foreground">Warnings</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.errorRate.toFixed(1)}%</div>
              <p className="text-sm text-muted-foreground">Error Rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.averageDuration}ms</div>
              <p className="text-sm text-muted-foreground">Avg Duration</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Marketplace</Label>
              <Select 
                value={filters.marketplace}
                onValueChange={(value) => setFilters({ ...filters, marketplace: value })}
              >
                <SelectTrigger data-testid="select-marketplace-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {marketplaces.map(m => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select 
                value={filters.automationType}
                onValueChange={(value) => setFilters({ ...filters, automationType: value })}
              >
                <SelectTrigger data-testid="select-type-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {automationTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusTypes.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Time Range</Label>
              <Select 
                value={filters.timeRange}
                onValueChange={(value) => setFilters({ ...filters, timeRange: value })}
              >
                <SelectTrigger data-testid="select-time-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeRanges.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  className="pl-8"
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                  data-testid="input-search-logs"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Activity Logs</CardTitle>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Auto-scroll</Label>
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] w-full rounded-md border p-4" ref={scrollAreaRef}>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading logs...
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4" />
                <p>No logs found for the selected filters</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                    data-testid={`log-entry-${log.id}`}
                  >
                    {/* Log Header */}
                    <div 
                      className="flex items-start justify-between cursor-pointer"
                      onClick={() => toggleLogExpansion(log.id)}
                    >
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5">
                          {expandedLogs.has(log.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>
                        {getStatusIcon(log.status)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {log.marketplace} • {log.automationType}
                            </span>
                            {getStatusBadge(log.status)}
                            {log.duration && (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {log.duration}ms
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-foreground">{log.message}</p>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedLogs.has(log.id) && (
                      <div className="mt-3 pl-10 space-y-2">
                        {/* Timestamp */}
                        <div className="text-sm">
                          <span className="font-medium">Timestamp:</span>{' '}
                          {format(new Date(log.timestamp), 'PPpp')}
                        </div>

                        {/* Action */}
                        <div className="text-sm">
                          <span className="font-medium">Action:</span> {log.action}
                        </div>

                        {/* Metadata */}
                        {log.metadata && (
                          <div className="text-sm">
                            <span className="font-medium">Metadata:</span>
                            <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </div>
                        )}

                        {/* Details */}
                        {log.details && (
                          <div className="text-sm">
                            <span className="font-medium">Details:</span>
                            <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                              {typeof log.details === 'string' 
                                ? log.details 
                                : JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        )}

                        {/* Error Information */}
                        {log.status === 'failed' && (
                          <>
                            {log.errorCode && (
                              <div className="text-sm">
                                <span className="font-medium">Error Code:</span>{' '}
                                <Badge variant="destructive">{log.errorCode}</Badge>
                              </div>
                            )}
                            {log.stackTrace && (
                              <div className="text-sm">
                                <span className="font-medium">Stack Trace:</span>
                                <pre className="mt-1 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs overflow-x-auto text-red-600 dark:text-red-400">
                                  {log.stackTrace}
                                </pre>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Real-time indicator */}
      <Alert>
        <Activity className="h-4 w-4" />
        <AlertDescription>
          Logs are updated in real-time every 5 seconds. You can also manually refresh using the button above.
        </AlertDescription>
      </Alert>
    </div>
  );
}