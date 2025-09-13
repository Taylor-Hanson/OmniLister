import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { WebSocketManager } from "@/lib/websocket";
import { useToast } from "@/hooks/use-toast";

interface JobStatus {
  jobId: string;
  type: string;
  status: 'started' | 'processing' | 'completed' | 'failed';
  listingId?: string;
  listingTitle?: string;
  marketplaces?: string[];
  progress?: number;
  results?: any[];
  successCount?: number;
  totalCount?: number;
}

interface JobProgress {
  jobId: string;
  step: string;
  marketplace?: string;
  progress: number;
  status: 'processing' | 'posting' | 'delaying' | 'success' | 'error';
  externalId?: string;
  url?: string;
  error?: string;
  delayMs?: number;
}

interface RateLimitEvent {
  jobId?: string;
  marketplace: string;
  reason: string;
  waitTime?: number;
  rescheduledFor?: string;
  status: 'rate_limited' | 'rate_limited_error' | 'rate_limited_delist';
}

interface SmartScheduleEvent {
  stage: 'analysis_started' | 'data_collected' | 'calculating_windows' | 'windows_calculated' | 'distributing_jobs' | 'scheduling_complete';
  listingId: string;
  listingTitle?: string;
  marketplaces?: string[];
  message: string;
  scheduledJobs?: any[];
  summary?: any;
}

interface MarketplaceHealthEvent {
  marketplaces: Array<{
    marketplace: string;
    healthy: boolean;
    hourlyRemaining?: number;
    dailyRemaining?: number;
    estimatedDelay?: number;
    error?: string;
  }>;
}

interface QueueStatusEvent {
  activeJobs: number;
  totalJobs: number;
  jobs: Array<{
    id: string;
    type: string;
    status: string;
    progress: number;
    createdAt: string;
    scheduledFor?: string;
  }>;
}

interface CrossPlatformSyncEvent {
  eventType: 'sync_started' | 'sync_completed' | 'sync_error';
  data: {
    syncJobId?: string;
    listingId: string;
    listingTitle: string;
    soldMarketplace: string;
    salePrice?: number;
    status?: 'completed' | 'partial' | 'failed';
    successful?: number;
    failed?: number;
    totalMarketplaces?: number;
    duration?: number;
    error?: string;
    timestamp: string;
  };
}

interface CrossPlatformSyncProgressEvent {
  data: {
    syncJobId: string;
    marketplace: string;
    status: 'processing' | 'success' | 'error';
    message: string;
    error?: string;
    timestamp: string;
  };
}

interface WebSocketContextType {
  isConnected: boolean;
  lastMessage: any;
  jobStatuses: Record<string, JobStatus>;
  marketplaceHealth: MarketplaceHealthEvent['marketplaces'];
  queueStatus: QueueStatusEvent | null;
  activeJobs: QueueStatusEvent['jobs'];
  sendMessage: (type: string, data: any) => void;
  requestStatus: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [jobStatuses, setJobStatuses] = useState<Record<string, JobStatus>>({});
  const [marketplaceHealth, setMarketplaceHealth] = useState<MarketplaceHealthEvent['marketplaces']>([]);
  const [queueStatus, setQueueStatus] = useState<QueueStatusEvent | null>(null);
  const [activeJobs, setActiveJobs] = useState<QueueStatusEvent['jobs']>([]);
  const wsManagerRef = useRef<WebSocketManager | null>(null);
  const unsubscribersRef = useRef<Array<() => void>>([]);

  // Clean up function to remove all listeners
  const cleanupListeners = () => {
    unsubscribersRef.current.forEach(unsubscribe => unsubscribe());
    unsubscribersRef.current = [];
  };

  // Initialize WebSocket connection when user is available
  useEffect(() => {
    if (user) {
      // Clean up previous connection if it exists
      if (wsManagerRef.current) {
        cleanupListeners();
        wsManagerRef.current.disconnect();
      }

      // Get JWT token from localStorage for authentication
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.error('No authentication token found for WebSocket connection');
        return;
      }

      // Create new WebSocket manager with authentication
      wsManagerRef.current = new WebSocketManager(user.id, token);
      
      // Set up event listeners
      const unsubscribeConnection = wsManagerRef.current.on('connection', (data) => {
        setIsConnected(data.connected);
        if (data.connected) {
          // Request current status when connected
          sendMessage('request_status', {});
        }
      });

      const unsubscribeMessage = wsManagerRef.current.on('message', (data) => {
        setLastMessage(data);
      });

      // Handle structured WebSocket events
      const unsubscribeJobStatus = wsManagerRef.current.on('job_status', (data: { data: JobStatus }) => {
        const jobData = data.data;
        setJobStatuses(prev => ({ ...prev, [jobData.jobId]: jobData }));
        
        // Show toast notifications for job completion
        if (jobData.status === 'completed') {
          toast({
            title: "Job Completed",
            description: `${jobData.listingTitle || 'Listing'} posted to ${jobData.successCount}/${jobData.totalCount} marketplaces`,
            variant: "default",
          });
        } else if (jobData.status === 'failed') {
          toast({
            title: "Job Failed",
            description: `Failed to process ${jobData.listingTitle || 'listing'}`,
            variant: "destructive",
          });
        }
      });

      const unsubscribeJobProgress = wsManagerRef.current.on('job_progress', (data: { data: JobProgress }) => {
        const progressData = data.data;
        setJobStatuses(prev => ({
          ...prev,
          [progressData.jobId]: {
            ...prev[progressData.jobId],
            progress: progressData.progress,
            status: progressData.status === 'success' ? 'completed' : 
                   progressData.status === 'error' ? 'failed' : 'processing'
          }
        }));
      });

      const unsubscribeRateLimit = wsManagerRef.current.on('rate_limit', (data: { data: RateLimitEvent }) => {
        const rateLimitData = data.data;
        toast({
          title: "Rate Limited",
          description: `${rateLimitData.marketplace}: ${rateLimitData.reason}`,
          variant: "destructive",
        });
      });

      const unsubscribeSmartSchedule = wsManagerRef.current.on('smart_schedule', (data: { data: SmartScheduleEvent }) => {
        const scheduleData = data.data;
        if (scheduleData.stage === 'scheduling_complete') {
          toast({
            title: "Smart Scheduling Complete",
            description: `${scheduleData.listingTitle} optimized for ${scheduleData.marketplaces?.length} marketplaces`,
            variant: "default",
          });
        }
      });

      const unsubscribeMarketplaceHealth = wsManagerRef.current.on('marketplace_health', (data: { data: MarketplaceHealthEvent }) => {
        setMarketplaceHealth(data.data.marketplaces);
      });

      const unsubscribeQueueStatus = wsManagerRef.current.on('queue_status', (data: { data: QueueStatusEvent }) => {
        const queueData = data.data;
        setQueueStatus(queueData);
        setActiveJobs(queueData.jobs);
      });

      // Handle cross-platform sync events
      const unsubscribeCrossPlatformSync = wsManagerRef.current.on('cross_platform_sync', (event: CrossPlatformSyncEvent) => {
        const { eventType, data } = event;
        
        switch (eventType) {
          case 'sync_started':
            toast({
              title: "🚀 Auto-Delisting Started",
              description: `"${data.listingTitle}" sold on ${data.soldMarketplace}. Removing from other marketplaces...`,
              variant: "default",
            });
            break;
            
          case 'sync_completed':
            const successMessage = data.status === 'completed' 
              ? `Successfully removed from all ${data.totalMarketplaces} marketplaces`
              : data.status === 'partial'
              ? `Removed from ${data.successful}/${data.totalMarketplaces} marketplaces (${data.failed} failed)`
              : `Failed to remove from ${data.totalMarketplaces} marketplaces`;
              
            toast({
              title: data.status === 'completed' ? "✅ Auto-Delisting Complete" : 
                     data.status === 'partial' ? "⚠️ Auto-Delisting Partial" : "❌ Auto-Delisting Failed",
              description: `"${data.listingTitle}": ${successMessage}`,
              variant: data.status === 'failed' ? "destructive" : "default",
            });
            break;
            
          case 'sync_error':
            toast({
              title: "❌ Auto-Delisting Error",
              description: `Failed to auto-delist "${data.listingTitle}": ${data.error}`,
              variant: "destructive",
            });
            break;
        }
      });

      // Handle cross-platform sync progress updates
      const unsubscribeCrossPlatformSyncProgress = wsManagerRef.current.on('cross_platform_sync_progress', (event: CrossPlatformSyncProgressEvent) => {
        const { data } = event;
        
        // Only show toast for errors and successes, not processing updates to avoid spam
        if (data.status === 'success') {
          toast({
            title: "✅ Delisted",
            description: `Successfully removed from ${data.marketplace}`,
            variant: "default",
          });
        } else if (data.status === 'error') {
          toast({
            title: "❌ Delisting Failed",
            description: `Failed to remove from ${data.marketplace}: ${data.error}`,
            variant: "destructive",
          });
        }
        // Processing updates are not shown as toasts to avoid notification spam
      });

      // Store unsubscribers for cleanup
      unsubscribersRef.current = [
        unsubscribeConnection,
        unsubscribeMessage,
        unsubscribeJobStatus,
        unsubscribeJobProgress,
        unsubscribeRateLimit,
        unsubscribeSmartSchedule,
        unsubscribeMarketplaceHealth,
        unsubscribeQueueStatus,
        unsubscribeCrossPlatformSync,
        unsubscribeCrossPlatformSyncProgress,
      ];

      // Connect to WebSocket
      wsManagerRef.current.connect();

      // Cleanup function
      return () => {
        cleanupListeners();
        if (wsManagerRef.current) {
          wsManagerRef.current.disconnect();
          wsManagerRef.current = null;
        }
      };
    } else {
      // User logged out, cleanup connection
      cleanupListeners();
      if (wsManagerRef.current) {
        wsManagerRef.current.disconnect();
        wsManagerRef.current = null;
      }
      setIsConnected(false);
      setJobStatuses({});
      setMarketplaceHealth([]);
      setQueueStatus(null);
      setActiveJobs([]);
    }
  }, [user, toast]);

  // Function to send messages through WebSocket
  const sendMessage = (type: string, data: any) => {
    if (wsManagerRef.current) {
      wsManagerRef.current.send(type, data);
    }
  };

  // Function to request current status from server
  const requestStatus = () => {
    sendMessage('request_status', {});
  };

  const contextValue: WebSocketContextType = {
    isConnected,
    lastMessage,
    jobStatuses,
    marketplaceHealth,
    queueStatus,
    activeJobs,
    sendMessage,
    requestStatus,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket(): WebSocketContextType {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}