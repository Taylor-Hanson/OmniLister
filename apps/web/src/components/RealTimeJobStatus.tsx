import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { Clock, CheckCircle, XCircle, Loader2, Zap } from "lucide-react";
import { format } from "date-fns";

export default function RealTimeJobStatus() {
  const { jobStatuses, activeJobs, queueStatus } = useWebSocket();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'processing': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'processing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    }
  };

  return (
    <Card data-testid="card-realtime-job-status">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          Real-Time Job Status
          {queueStatus && (
            <Badge variant="outline" className="ml-auto" data-testid="badge-active-jobs">
              {queueStatus.activeJobs} Active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activeJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-active-jobs">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No active jobs at the moment</p>
              <p className="text-sm">Jobs will appear here when posting starts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeJobs.map((job) => {
                const jobStatus = jobStatuses[job.id];
                return (
                  <div
                    key={job.id}
                    className="p-4 border rounded-lg bg-card"
                    data-testid={`job-status-${job.id}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(job.status)}
                        <span className="font-medium text-sm">
                          {job.type === 'post_listing' ? 'Posting Listing' : 'Delisting'}
                        </span>
                        <Badge className={getStatusColor(job.status)} data-testid={`badge-status-${job.id}`}>
                          {job.status}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(job.createdAt), 'HH:mm:ss')}
                      </span>
                    </div>
                    
                    {jobStatus?.listingTitle && (
                      <p className="text-sm font-medium mb-2" data-testid={`text-listing-title-${job.id}`}>
                        {jobStatus.listingTitle}
                      </p>
                    )}
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span data-testid={`text-progress-${job.id}`}>{job.progress}%</span>
                      </div>
                      <Progress value={job.progress} className="h-2" data-testid={`progress-${job.id}`} />
                    </div>
                    
                    {jobStatus?.marketplaces && (
                      <div className="mt-3">
                        <p className="text-xs text-muted-foreground mb-1">Target Marketplaces:</p>
                        <div className="flex flex-wrap gap-1">
                          {jobStatus.marketplaces.map((marketplace) => (
                            <Badge
                              key={marketplace}
                              variant="secondary"
                              className="text-xs"
                              data-testid={`badge-marketplace-${job.id}-${marketplace}`}
                            >
                              {marketplace}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {job.scheduledFor && new Date(job.scheduledFor) > new Date() && (
                      <div className="mt-2 text-xs text-muted-foreground" data-testid={`text-scheduled-${job.id}`}>
                        Scheduled for: {format(new Date(job.scheduledFor), 'MMM dd, HH:mm')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}