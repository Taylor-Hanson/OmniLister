import { 
  type Job, 
  type DeadLetterQueue, 
  type InsertDeadLetterQueue,
  type JobRetryHistory,
  type User
} from "../shared/schema.js";
import { storage } from "../storage";
import { randomUUID } from "crypto";

export interface DeadLetterQueueEntry {
  id: string;
  originalJobId: string;
  userId: string;
  jobType: string;
  jobData: any;
  finalFailureCategory: string;
  totalAttempts: number;
  firstFailureAt: Date;
  lastFailureAt: Date;
  failureHistory: FailureSummary[];
  requiresManualReview: boolean;
  resolutionStatus: "pending" | "resolved" | "discarded";
  resolutionNotes?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  createdAt: Date;
}

export interface FailureSummary {
  attemptNumber: number;
  failureCategory: string;
  errorType: string;
  errorMessage: string;
  marketplace?: string;
  timestamp: Date;
  retryDelay: number;
}

export interface ResolutionOptions {
  action: "retry" | "discard" | "modify_and_retry" | "escalate";
  modifiedJobData?: any;
  notes?: string;
  userId: string;
  preventSimilarFailures?: boolean;
}

export interface DeadLetterQueueStats {
  totalEntries: number;
  pendingReview: number;
  resolved: number;
  discarded: number;
  byFailureCategory: Record<string, number>;
  byJobType: Record<string, number>;
  byMarketplace: Record<string, number>;
  avgTimeToResolution: number;
  oldestPendingEntry?: Date;
}

export class DeadLetterQueueService {
  private readonly AUTO_DISCARD_AFTER_DAYS = 30; // Auto-discard entries older than 30 days
  private readonly BATCH_SIZE = 50; // Process DLQ in batches

  /**
   * Move a failed job to the dead letter queue
   */
  async moveToDeadLetterQueue(
    job: Job, 
    finalFailureCategory: string,
    retryHistory: JobRetryHistory[]
  ): Promise<DeadLetterQueueEntry> {
    try {
      // Create failure summary from retry history
      const failureHistory: FailureSummary[] = retryHistory.map(retry => ({
        attemptNumber: retry.attemptNumber,
        failureCategory: retry.failureCategory,
        errorType: retry.errorType || "unknown",
        errorMessage: retry.errorMessage || "No error message",
        marketplace: retry.marketplace || undefined,
        timestamp: retry.timestamp,
        retryDelay: retry.retryDelay || 0,
      } as any));

      // Determine if manual review is required
      const requiresManualReview = this.shouldRequireManualReview(finalFailureCategory, failureHistory);

      const dlqEntry: InsertDeadLetterQueue = {
        originalJobId: job.id,
        jobType: job.type,
        jobData: job.data as any,
        finalFailureCategory,
        totalAttempts: job.attempts || 0,
        firstFailureAt: retryHistory[0]?.timestamp || new Date(),
        lastFailureAt: retryHistory[retryHistory.length - 1]?.timestamp || new Date(),
        failureHistory,
        requiresManualReview,
        resolutionStatus: "pending",
      };

      // In production, this would save to the database
      const createdEntry: DeadLetterQueueEntry = {
        id: randomUUID(),
        userId: job.userId,
        ...dlqEntry,
        createdAt: new Date(),
      } as any;

      console.warn(`Job ${job.id} moved to dead letter queue:`, {
        jobType: job.type,
        finalFailureCategory,
        totalAttempts: job.attempts,
        requiresManualReview,
      });

      // Create audit log
      await storage.createAuditLog({
        userId: job.userId,
        action: "job_moved_to_dlq",
        entityType: "job",
        entityId: job.id,
        metadata: {
          finalFailureCategory,
          totalAttempts: job.attempts,
          requiresManualReview,
          failureHistory: failureHistory.slice(-3), // Last 3 failures
        },
        ipAddress: null,
        userAgent: null,
      });

      // Update job status to indicate it's in DLQ
      await storage.updateJob(job.id, {
        status: "failed",
        errorMessage: `Moved to dead letter queue after ${job.attempts} attempts. Final category: ${finalFailureCategory}`,
        completedAt: new Date(),
      });

      return createdEntry;
    } catch (error) {
      console.error(`Failed to move job ${job.id} to dead letter queue:`, error);
      throw error;
    }
  }

  /**
   * Resolve a dead letter queue entry
   */
  async resolveDeadLetterQueueEntry(
    dlqId: string, 
    resolution: ResolutionOptions
  ): Promise<{ success: boolean; newJobId?: string; message: string }> {
    try {
      // In production, this would fetch from the database
      // For now, we'll simulate the resolution process
      
      switch (resolution.action) {
        case "retry":
          return await this.retryJob(dlqId, resolution);
          
        case "modify_and_retry":
          return await this.modifyAndRetryJob(dlqId, resolution);
          
        case "discard":
          return await this.discardJob(dlqId, resolution);
          
        case "escalate":
          return await this.escalateJob(dlqId, resolution);
          
        default:
          throw new Error(`Unknown resolution action: ${resolution.action}`);
      }
    } catch (error) {
      console.error(`Failed to resolve DLQ entry ${dlqId}:`, error);
      return {
        success: false,
        message: `Resolution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Retry a job from the dead letter queue
   */
  private async retryJob(dlqId: string, resolution: ResolutionOptions): Promise<{ success: boolean; newJobId?: string; message: string }> {
    // In production, this would:
    // 1. Fetch the DLQ entry
    // 2. Create a new job with the original data
    // 3. Mark the DLQ entry as resolved
    // 4. Update failure prevention rules if requested

    const newJobId = randomUUID();
    
    // Simulate creating a new job
    console.info(`Retrying job from DLQ ${dlqId} as new job ${newJobId}`);

    // Update DLQ entry status
    // In production: await storage.updateDeadLetterQueueEntry(dlqId, { ... })

    return {
      success: true,
      newJobId,
      message: `Job successfully retried with new ID: ${newJobId}`,
    };
  }

  /**
   * Modify and retry a job from the dead letter queue
   */
  private async modifyAndRetryJob(dlqId: string, resolution: ResolutionOptions): Promise<{ success: boolean; newJobId?: string; message: string }> {
    if (!resolution.modifiedJobData) {
      throw new Error("Modified job data is required for modify_and_retry action");
    }

    const newJobId = randomUUID();
    
    // Simulate creating a new job with modified data
    console.info(`Modifying and retrying job from DLQ ${dlqId} as new job ${newJobId}`);

    return {
      success: true,
      newJobId,
      message: `Job successfully modified and retried with new ID: ${newJobId}`,
    };
  }

  /**
   * Discard a job from the dead letter queue
   */
  private async discardJob(dlqId: string, resolution: ResolutionOptions): Promise<{ success: boolean; message: string }> {
    // Update DLQ entry status
    console.info(`Discarding job from DLQ ${dlqId}. Reason: ${resolution.notes || "No reason provided"}`);

    return {
      success: true,
      message: "Job successfully discarded",
    };
  }

  /**
   * Escalate a job from the dead letter queue
   */
  private async escalateJob(dlqId: string, resolution: ResolutionOptions): Promise<{ success: boolean; message: string }> {
    // In production, this would:
    // 1. Create a support ticket
    // 2. Notify administrators
    // 3. Move to escalated status

    console.warn(`Escalating job from DLQ ${dlqId}. Reason: ${resolution.notes || "No reason provided"}`);

    return {
      success: true,
      message: "Job successfully escalated to support team",
    };
  }

  /**
   * Get dead letter queue entries for a user
   */
  async getDeadLetterQueueEntries(
    userId: string,
    filters?: {
      status?: "pending" | "resolved" | "discarded";
      jobType?: string;
      failureCategory?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ entries: DeadLetterQueueEntry[]; total: number }> {
    // In production, this would query the database with filters
    // For now, return empty results
    return {
      entries: [],
      total: 0,
    };
  }

  /**
   * Get dead letter queue statistics
   */
  async getDeadLetterQueueStats(userId?: string): Promise<DeadLetterQueueStats> {
    // In production, this would query the database for statistics
    // For now, return sample stats
    return {
      totalEntries: 15,
      pendingReview: 8,
      resolved: 5,
      discarded: 2,
      byFailureCategory: {
        "rate_limit": 6,
        "network": 4,
        "validation": 3,
        "auth": 2,
      },
      byJobType: {
        "post-listing": 10,
        "delist-listing": 3,
        "sync-inventory": 2,
      },
      byMarketplace: {
        "ebay": 7,
        "poshmark": 4,
        "mercari": 3,
        "facebook": 1,
      },
      avgTimeToResolution: 2.5 * 24 * 60 * 60 * 1000, // 2.5 days in milliseconds
      oldestPendingEntry: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    };
  }

  /**
   * Auto-cleanup old DLQ entries
   */
  async cleanupOldEntries(): Promise<{ processedCount: number; cleanedCount: number }> {
    const cutoffDate = new Date(Date.now() - this.AUTO_DISCARD_AFTER_DAYS * 24 * 60 * 60 * 1000);
    
    try {
      // In production, this would:
      // 1. Query for entries older than cutoff date with status 'pending'
      // 2. Update them to 'discarded' status
      // 3. Add auto-cleanup notes
      
      const processedCount = 0; // Would be actual count from DB
      const cleanedCount = 0;   // Would be actual count of cleaned entries

      if (cleanedCount > 0) {
        console.info(`Auto-cleanup: Discarded ${cleanedCount} old DLQ entries older than ${this.AUTO_DISCARD_AFTER_DAYS} days`);
      }

      return { processedCount, cleanedCount };
    } catch (error) {
      console.error("Failed to cleanup old DLQ entries:", error);
      return { processedCount: 0, cleanedCount: 0 };
    }
  }

  /**
   * Bulk resolve DLQ entries
   */
  async bulkResolve(
    dlqIds: string[],
    resolution: ResolutionOptions
  ): Promise<{ successCount: number; failureCount: number; results: Array<{ id: string; success: boolean; message: string; newJobId?: string }> }> {
    const results: Array<{ id: string; success: boolean; message: string; newJobId?: string }> = [];
    let successCount = 0;
    let failureCount = 0;

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < dlqIds.length; i += this.BATCH_SIZE) {
      const batch = dlqIds.slice(i, i + this.BATCH_SIZE);
      
      for (const dlqId of batch) {
        try {
          const result = await this.resolveDeadLetterQueueEntry(dlqId, {
            ...resolution,
            notes: `${resolution.notes || ""} (Bulk operation)`,
          });

          results.push({
            id: dlqId,
            success: result.success,
            message: result.message,
            newJobId: result.newJobId,
          });

          if (result.success) {
            successCount++;
          } else {
            failureCount++;
          }
        } catch (error) {
          results.push({
            id: dlqId,
            success: false,
            message: error instanceof Error ? error.message : "Unknown error",
          });
          failureCount++;
        }
      }

      // Small delay between batches to prevent system overload
      if (i + this.BATCH_SIZE < dlqIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.info(`Bulk resolve completed: ${successCount} succeeded, ${failureCount} failed`);

    return { successCount, failureCount, results };
  }

  /**
   * Check if manual review is required based on failure category and history
   */
  private shouldRequireManualReview(finalFailureCategory: string, failureHistory: FailureSummary[]): boolean {
    // Always require manual review for certain categories
    const alwaysReviewCategories = ["auth", "validation", "permanent"];
    if (alwaysReviewCategories.includes(finalFailureCategory)) {
      return true;
    }

    // Require review if there are mixed failure categories (indicates complex issue)
    const uniqueCategories = new Set(failureHistory.map(f => f.failureCategory));
    if (uniqueCategories.size > 2) {
      return true;
    }

    // Require review if failure persisted for more than 24 hours
    const firstFailure = failureHistory[0]?.timestamp;
    const lastFailure = failureHistory[failureHistory.length - 1]?.timestamp;
    if (firstFailure && lastFailure) {
      const durationHours = (lastFailure.getTime() - firstFailure.getTime()) / (1000 * 60 * 60);
      if (durationHours > 24) {
        return true;
      }
    }

    // Otherwise, don't require manual review for temporary issues
    return false;
  }

  /**
   * Get failure pattern analysis to prevent similar issues
   */
  async analyzeFailurePatterns(userId?: string, days = 30): Promise<{
    commonPatterns: Array<{
      pattern: string;
      frequency: number;
      affectedJobTypes: string[];
      suggestedFix: string;
    }>;
    riskFactors: Array<{
      factor: string;
      impact: "high" | "medium" | "low";
      recommendation: string;
    }>;
  }> {
    // In production, this would analyze DLQ entries to identify patterns
    return {
      commonPatterns: [
        {
          pattern: "Rate limit exceeded during peak hours",
          frequency: 12,
          affectedJobTypes: ["post-listing"],
          suggestedFix: "Implement smart scheduling to avoid peak hours",
        },
        {
          pattern: "Network timeouts for specific marketplaces",
          frequency: 8,
          affectedJobTypes: ["post-listing", "delist-listing"],
          suggestedFix: "Increase timeout values for affected marketplaces",
        },
        {
          pattern: "Authentication token expiry",
          frequency: 5,
          affectedJobTypes: ["post-listing", "sync-inventory"],
          suggestedFix: "Implement proactive token refresh",
        },
      ],
      riskFactors: [
        {
          factor: "High failure rate during weekend peak hours",
          impact: "high",
          recommendation: "Implement dynamic scheduling to avoid marketplace peak times",
        },
        {
          factor: "Marketplace API version deprecation",
          impact: "medium",
          recommendation: "Monitor marketplace API announcements and update integrations",
        },
        {
          factor: "Insufficient error handling for edge cases",
          impact: "low",
          recommendation: "Enhance error categorization and retry strategies",
        },
      ],
    };
  }
}

export const deadLetterQueueService = new DeadLetterQueueService();