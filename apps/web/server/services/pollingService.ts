import { storage } from "../storage";
import { marketplaceService } from "./marketplaceService";
import { analyticsService } from "./analyticsService";
import { crossPlatformSyncService } from "./crossPlatformSyncService";
import { webhookService } from "./webhookService";
import { marketplaces } from "../shared/marketplaceConfig.js";
import type { 
  PollingSchedule, 
  Listing, 
  MarketplaceConnection,
  ListingPost,
  Sale,
  InsertSale
} from "../shared/schema.js";

export interface PollingResult {
  marketplace: string;
  userId: string;
  success: boolean;
  salesDetected: number;
  newSales: Sale[];
  error?: string;
  pollingTime: number;
  nextPollInterval: number;
}

export interface MarketplaceSaleData {
  externalId: string;
  title: string;
  salePrice: number;
  fees: number;
  soldAt: Date;
  buyerId?: string;
  transactionId?: string;
  listingId?: string;
}

/**
 * Polling Service
 * Provides fallback polling for marketplaces without webhook support
 * Implements adaptive polling intervals based on activity and success rates
 */
export class PollingService {
  private pollingTimers: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;

  constructor() {
    // Start polling scheduler on initialization
    this.startPollingScheduler();
  }

  /**
   * Start the main polling scheduler that checks for due polling schedules
   */
  async startPollingScheduler(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🔄 Starting polling scheduler for marketplace sales detection');

    // Check for due polling schedules every minute
    setInterval(async () => {
      try {
        await this.processDuePollingSchedules();
      } catch (error) {
        console.error('Error in polling scheduler:', error);
      }
    }, 60000); // 1 minute interval
  }

  /**
   * Process all polling schedules that are due for polling
   */
  async processDuePollingSchedules(): Promise<void> {
    try {
      const dueSchedules = await storage.getPollingSchedulesDueForPoll();
      
      if (dueSchedules.length === 0) {
        return; // No schedules due
      }

      console.log(`📋 Processing ${dueSchedules.length} due polling schedules`);

      // Process schedules in parallel, but limit concurrency to avoid overwhelming APIs
      const concurrencyLimit = 5;
      for (let i = 0; i < dueSchedules.length; i += concurrencyLimit) {
        const batch = dueSchedules.slice(i, i + concurrencyLimit);
        
        await Promise.allSettled(
          batch.map(schedule => this.processPollingSchedule(schedule))
        );
      }

    } catch (error) {
      console.error('Failed to process due polling schedules:', error);
    }
  }

  /**
   * Process a single polling schedule
   */
  async processPollingSchedule(schedule: PollingSchedule): Promise<PollingResult> {
    const startTime = Date.now();
    const marketplace = schedule.marketplace;
    const userId = schedule.userId;

    try {
      console.log(`🔍 Polling ${marketplace} for user ${userId} (schedule: ${schedule.id})`);

      // Get marketplace connection
      const connection = await storage.getMarketplaceConnection(userId, marketplace);
      if (!connection || !connection.isConnected) {
        throw new Error(`No active marketplace connection for ${marketplace}`);
      }

      // Poll marketplace for sales
      const salesData = await this.pollMarketplaceForSales(connection, schedule);
      
      // Process detected sales
      const newSales: Sale[] = [];
      let syncJobsTriggered = 0;

      for (const saleData of salesData) {
        try {
          // Find the corresponding listing
          const listing = await this.findListingByExternalId(userId, marketplace, saleData.externalId);
          
          if (listing) {
            // Track the sale in analytics (this will trigger cross-platform sync)
            await analyticsService.trackSale(
              userId,
              listing,
              marketplace,
              saleData.salePrice,
              saleData.fees || 0,
              {
                pollingScheduleId: schedule.id,
                transactionId: saleData.transactionId,
                buyerId: saleData.buyerId,
                soldAt: saleData.soldAt,
                source: 'polling'
              }
            );

            newSales.push({
              id: `${Date.now()}`,
              userId,
              listing,
              marketplace,
              salePrice: saleData.salePrice,
              fees: saleData.fees || 0,
              soldAt: saleData.soldAt,
              transactionId: saleData.transactionId
            } as any);
            syncJobsTriggered++;

            console.log(`💰 Sale detected via polling:`, {
              listingTitle: listing.title,
              marketplace,
              salePrice: saleData.salePrice,
              transactionId: saleData.transactionId
            });

          } else {
            console.warn(`Could not find listing for external ID ${saleData.externalId} on ${marketplace}`);
          }
        } catch (saleError) {
          console.error(`Failed to process sale ${saleData.externalId}:`, saleError);
        }
      }

      // Calculate next polling interval using adaptive logic
      const nextInterval = this.calculateAdaptiveInterval(schedule, salesData.length, true);
      const nextPollAt = new Date(Date.now() + nextInterval * 1000);

      // Update polling schedule
      await storage.updatePollingSchedule(schedule.id, {
        lastPollAt: new Date(),
        nextPollAt,
        currentInterval: nextInterval,
        salesDetectedSinceLastPoll: salesData.length,
        consecutiveFailures: 0, // Reset failures on success
        errorCount: Math.max(0, (schedule.errorCount || 0) - 1) // Slowly reduce error count on success
      });

      const pollingTime = Date.now() - startTime;
      
      console.log(`✅ Polling completed for ${marketplace}:`, {
        salesDetected: salesData.length,
        syncJobsTriggered,
        pollingTime,
        nextInterval,
        nextPollAt: nextPollAt.toISOString()
      });

      return {
        marketplace,
        userId,
        success: true,
        salesDetected: salesData.length,
        newSales,
        pollingTime,
        nextPollInterval: nextInterval
      };

    } catch (error: any) {
      console.error(`Polling failed for ${marketplace}:`, error);

      // Handle polling failure
      const nextInterval = this.calculateAdaptiveInterval(schedule, 0, false);
      const nextPollAt = new Date(Date.now() + nextInterval * 1000);

      await storage.updatePollingSchedule(schedule.id, {
        lastPollAt: new Date(),
        nextPollAt,
        currentInterval: nextInterval,
        consecutiveFailures: (schedule.consecutiveFailures || 0) + 1,
        errorCount: (schedule.errorCount || 0) + 1,
        lastPollError: error.message
      });

      return {
        marketplace,
        userId,
        success: false,
        salesDetected: 0,
        newSales: [],
        error: error.message,
        pollingTime: Date.now() - startTime,
        nextPollInterval: nextInterval
      };
    }
  }

  /**
   * Poll a marketplace for sales data
   * This is a simplified implementation - in practice, each marketplace would have its own logic
   */
  async pollMarketplaceForSales(
    connection: MarketplaceConnection, 
    schedule: PollingSchedule
  ): Promise<MarketplaceSaleData[]> {
    const marketplace = connection.marketplace;
    const userId = connection.userId;

    try {
      // Get user's listings for this marketplace
      const userListings = await storage.getListings(userId);
      const salesData: MarketplaceSaleData[] = [];

      // Check each listing's posts for this marketplace
      for (const listing of userListings) {
        const posts = await storage.getListingPosts(listing.id);
        const marketplacePosts = posts.filter(post => 
          post.marketplace === marketplace && 
          post.status === 'active' &&
          post.externalId
        );

        for (const post of marketplacePosts) {
          try {
            // Simulate checking marketplace API for sales
            // In practice, this would use marketplace-specific APIs
            const hasSale = await this.checkMarketplaceForSale(connection, post.externalId!);
            
            if (hasSale) {
              // Get sale details from marketplace
              const saleDetails = await this.getMarketplaceSaleDetails(connection, post.externalId!);
              
              if (saleDetails) {
                salesData.push({
                  ...saleDetails,
                  listingId: listing.id
                });
              }
            }
          } catch (error) {
            console.error(`Failed to check sale for post ${post.externalId}:`, error);
            // Continue with other posts
          }
        }
      }

      return salesData;

    } catch (error: any) {
      console.error(`Failed to poll ${marketplace} for sales:`, error);
      throw error;
    }
  }

  /**
   * Check if a specific listing has been sold on the marketplace
   * This is a placeholder - real implementation would use marketplace APIs
   */
  async checkMarketplaceForSale(connection: MarketplaceConnection, externalId: string): Promise<boolean> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // For demo purposes, randomly simulate some sales
    // In practice, this would be a real API call to check listing status
    const salesProbability = 0.001; // 0.1% chance of sale per check
    return Math.random() < salesProbability;
  }

  /**
   * Get sale details for a sold listing
   * This is a placeholder - real implementation would use marketplace APIs
   */
  async getMarketplaceSaleDetails(connection: MarketplaceConnection, externalId: string): Promise<MarketplaceSaleData | null> {
    try {
      // Simulate getting sale details from marketplace API
      // In practice, this would be marketplace-specific API calls
      
      return {
        externalId,
        title: `Listing ${externalId}`,
        salePrice: Math.floor(Math.random() * 200) + 20, // Random price between $20-220
        fees: Math.floor(Math.random() * 20) + 5, // Random fees between $5-25
        soldAt: new Date(),
        buyerId: `buyer_${Math.random().toString(36).substring(7)}`,
        transactionId: `txn_${Math.random().toString(36).substring(7)}`
      };
    } catch (error) {
      console.error(`Failed to get sale details for ${externalId}:`, error);
      return null;
    }
  }

  /**
   * Find listing by external ID across all listing posts
   */
  async findListingByExternalId(userId: string, marketplace: string, externalId: string): Promise<Listing | null> {
    try {
      const listings = await storage.getListings(userId);
      
      for (const listing of listings) {
        const posts = await storage.getListingPosts(listing.id);
        const matchingPost = posts.find(post => 
          post.marketplace === marketplace && 
          post.externalId === externalId
        );
        
        if (matchingPost) {
          return listing;
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to find listing by external ID:', error);
      return null;
    }
  }

  /**
   * Calculate adaptive polling interval based on activity and success
   */
  calculateAdaptiveInterval(schedule: PollingSchedule, salesDetected: number, success: boolean): number {
    if (!schedule.adaptivePolling) {
      return schedule.pollingInterval || 300;
    }

    const baseInterval = schedule.pollingInterval || 300;
    const minInterval = schedule.minInterval || 60; // 1 minute minimum
    const maxInterval = schedule.maxInterval || 3600; // 1 hour maximum
    const currentInterval = schedule.currentInterval || baseInterval;

    let nextInterval = currentInterval;

    if (success) {
      if (salesDetected > 0) {
        // Sales detected - increase polling frequency
        nextInterval = Math.max(minInterval, currentInterval * 0.8);
      } else if (schedule.salesDetectedSinceLastPoll === 0) {
        // No recent sales - decrease polling frequency
        nextInterval = Math.min(maxInterval, currentInterval * 1.2);
      }
    } else {
      // Polling failed - back off exponentially
      const failureMultiplier = Math.min(4, Math.pow(1.5, schedule.consecutiveFailures || 0));
      nextInterval = Math.min(maxInterval, currentInterval * failureMultiplier);
    }

    return Math.floor(nextInterval);
  }

  /**
   * Create polling schedule for a marketplace
   */
  async createPollingSchedule(
    userId: string, 
    marketplace: string, 
    options: {
      interval?: number;
      adaptivePolling?: boolean;
      minInterval?: number;
      maxInterval?: number;
    } = {}
  ): Promise<PollingSchedule> {
    const existingSchedule = await storage.getPollingSchedule(userId, marketplace);
    
    if (existingSchedule) {
      throw new Error(`Polling schedule already exists for ${marketplace}`);
    }

    const schedule = await storage.createPollingSchedule(userId, {
      marketplace,
      userId,
      pollingInterval: options.interval || 300, // Default 5 minutes
      lastPollAt: null,
      // lastSaleCount: 0, // Not in schema
      // configurationData: {
      //   adaptivePolling: options.adaptivePolling !== false,
      //   minInterval: options.minInterval || 60,
      //   maxInterval: options.maxInterval || 3600,
      //   createdAt: new Date().toISOString()
      // } // Not in schema
    });

    console.log(`📅 Created polling schedule for ${marketplace}:`, {
      scheduleId: schedule.id,
      interval: schedule.pollingInterval,
      adaptivePolling: schedule.adaptivePolling
    });

    return schedule;
  }

  /**
   * Enable/disable polling for a marketplace
   */
  async togglePollingSchedule(userId: string, marketplace: string, enabled: boolean): Promise<PollingSchedule> {
    const schedule = await storage.getPollingSchedule(userId, marketplace);
    
    if (!schedule) {
      throw new Error(`No polling schedule found for ${marketplace}`);
    }

    const updatedSchedule = await storage.updatePollingSchedule(schedule.id, {
      isEnabled: enabled,
      updatedAt: new Date()
    });

    console.log(`${enabled ? '▶️' : '⏸️'} ${enabled ? 'Enabled' : 'Disabled'} polling for ${marketplace}`);

    return updatedSchedule;
  }

  /**
   * Get polling statistics for a user
   */
  async getPollingStats(userId: string, days: number = 7): Promise<{
    totalSchedules: number;
    activeSchedules: number;
    totalPolls: number;
    successfulPolls: number;
    failedPolls: number;
    salesDetected: number;
    topMarketplaces: Array<{ marketplace: string; salesDetected: number }>;
    avgPollingInterval: number;
  }> {
    try {
      const schedules = await storage.getPollingSchedules(userId);
      const totalSchedules = schedules.length;
      const activeSchedules = schedules.filter(s => s.isEnabled).length;

      // Calculate stats from recent polling data
      // This is simplified - in practice, you'd want to track detailed polling metrics
      const avgPollingInterval = schedules.length > 0 
        ? schedules.reduce((sum: number, s: PollingSchedule) => sum + (s.currentInterval || 0), 0) / schedules.length
        : 0;

      return {
        totalSchedules,
        activeSchedules,
        totalPolls: 0, // Would track this in detailed metrics
        successfulPolls: 0,
        failedPolls: 0,
        salesDetected: schedules.reduce((sum: number, s: PollingSchedule) => sum + (s.salesDetectedSinceLastPoll || 0), 0),
        topMarketplaces: schedules
          .map((s: PollingSchedule) => ({ marketplace: s.marketplace, salesDetected: s.salesDetectedSinceLastPoll || 0 }))
          .sort((a, b) => b.salesDetected - a.salesDetected),
        avgPollingInterval
      };
    } catch (error) {
      console.error('Failed to get polling stats:', error);
      throw error;
    }
  }

  /**
   * Manually trigger polling for a specific marketplace
   */
  async triggerManualPoll(userId: string, marketplace: string): Promise<PollingResult> {
    const schedule = await storage.getPollingSchedule(userId, marketplace);
    
    if (!schedule) {
      throw new Error(`No polling schedule found for ${marketplace}`);
    }

    console.log(`🔄 Manually triggering poll for ${marketplace}`);
    return await this.processPollingSchedule(schedule);
  }

  /**
   * Stop the polling scheduler
   */
  stopPollingScheduler(): void {
    this.isRunning = false;
    this.pollingTimers.clear();
    console.log('⏹️ Stopped polling scheduler');
  }
}

export const pollingService = new PollingService();