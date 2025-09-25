import { storage } from "../storage";
import { marketplaceService } from "./marketplaceService";
import { queueService } from "./queueService";
import type { 
  Listing, 
  ListingPost, 
  SyncSettings, 
  SyncRule, 
  SyncHistory, 
  SyncConflict,
  InsertSyncHistory,
  InsertSyncConflict
} from "../shared/schema.js";

export interface SyncResult {
  success: boolean;
  listingId: string;
  marketplace: string;
  fieldsUpdated?: string[];
  error?: string;
  duration: number;
}

export interface ConflictDetectionResult {
  hasConflict: boolean;
  conflictType?: string;
  sourceValue?: any;
  targetValue?: any;
  suggestion?: string;
}

class SyncService {
  /**
   * Execute sync for a single listing to a specific marketplace
   */
  async syncListing(
    userId: string,
    listingId: string,
    targetMarketplace: string,
    sourceMarketplace?: string
  ): Promise<SyncResult> {
    const startTime = Date.now();
    
    try {
      // Get the listing
      const listing = await storage.getListing(listingId);
      if (!listing) {
        throw new Error("Listing not found");
      }

      // Get sync settings and rules
      const syncSettings = await storage.getSyncSettings(userId);
      const syncRules = await storage.getSyncRules(userId);
      const targetRule = syncRules.find(r => r.marketplace === targetMarketplace && r.isEnabled);

      // Apply platform-specific rules
      const adjustedListing = await this.applyPlatformRules(listing, targetRule);

      // Get marketplace connection
      const connection = await storage.getMarketplaceConnection(userId, targetMarketplace);
      if (!connection || !connection.isConnected) {
        throw new Error(`Not connected to ${targetMarketplace}`);
      }

      // Check for existing post
      const existingPost = await storage.getListingPost(listingId, targetMarketplace);
      
      let fieldsUpdated: string[] = [];
      let syncType: string;

      if (existingPost && existingPost.externalId) {
        // Update existing listing
        syncType = "update";
        fieldsUpdated = await this.detectChangedFields(listing, existingPost);
        
        if (fieldsUpdated.length > 0) {
          await marketplaceService.getClient(targetMarketplace).updateListing(
            existingPost.externalId,
            adjustedListing,
            connection
          );
          
          await storage.updateListingPost(existingPost.id, {
            status: "posted",
            postingData: adjustedListing as any,
            updatedAt: new Date(),
          });
        }
      } else {
        // Create new listing
        syncType = "create";
        fieldsUpdated = ["all"];
        
        const result = await marketplaceService.getClient(targetMarketplace).createListing(
          adjustedListing as any,
          connection
        );
        
        await storage.createListingPost({
          listingId,
          marketplace: targetMarketplace,
          postingData: adjustedListing as any,
        });
        
        await storage.updateListingPost(existingPost?.id || "", {
          externalId: result.externalId,
          externalUrl: result.url,
          status: "posted",
          postedAt: new Date(),
        });
      }

      // Record sync history
      await storage.createSyncHistory(userId, {
        listingId,
        sourceMarketplace,
        targetMarketplace,
        syncType,
        status: "success",
        fieldsUpdated: fieldsUpdated as any,
        newValues: adjustedListing as any,
        syncDuration: Date.now() - startTime,
      });

      return {
        success: true,
        listingId,
        marketplace: targetMarketplace,
        fieldsUpdated,
        duration: Date.now() - startTime,
      };
    } catch (error: any) {
      // Record failed sync
      await storage.createSyncHistory(userId, {
        listingId,
        sourceMarketplace,
        targetMarketplace,
        syncType: "update",
        status: "failed",
        errorMessage: error.message,
        syncDuration: Date.now() - startTime,
      });

      return {
        success: false,
        listingId,
        marketplace: targetMarketplace,
        error: error.message,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Sync all listings for a user
   */
  async syncAllListings(userId: string): Promise<SyncResult[]> {
    const results: SyncResult[] = [];
    
    // Get all active listings
    const listings = await storage.getListings(userId, { status: "active" });
    
    // Get all connected marketplaces
    const connections = await storage.getMarketplaceConnections(userId);
    const connectedMarketplaces = connections.filter(c => c.isConnected);
    
    // Get sync settings
    const syncSettings = await storage.getSyncSettings(userId);
    const syncRules = await storage.getSyncRules(userId);
    
    // Create sync jobs for each listing and marketplace combination
    for (const listing of listings) {
      for (const connection of connectedMarketplaces) {
        const rule = syncRules.find(r => 
          r.marketplace === connection.marketplace && r.isEnabled
        );
        
        if (rule) {
          // Queue the sync job
          const job = await storage.createJob(userId, {
            type: "sync-listing",
            data: {
              listingId: listing.id,
              targetMarketplace: connection.marketplace,
            } as any,
            scheduledFor: new Date(),
          });
          
          // Process immediately or queue based on settings
          if (syncSettings?.syncFrequency === "immediate") {
            const result = await this.syncListing(
              userId,
              listing.id,
              connection.marketplace
            );
            results.push(result);
            
            await storage.updateJob(job.id, {
              status: result.success ? "completed" : "failed",
              completedAt: new Date(),
              result: result as any,
            });
          } else {
            // Add to queue for batch processing
            // await queueService.createJob(job);
            console.log(`[SyncService] Would create job for sync operation`);
          }
        }
      }
    }
    
    return results;
  }

  /**
   * Detect conflicts between platforms
   */
  async detectConflicts(
    userId: string,
    listingId: string,
    sourceMarketplace: string,
    targetMarketplace: string
  ): Promise<ConflictDetectionResult> {
    const sourcePosts = await storage.getListingPosts(listingId);
    const sourcePost = sourcePosts.find(p => p.marketplace === sourceMarketplace);
    const targetPost = sourcePosts.find(p => p.marketplace === targetMarketplace);
    
    if (!sourcePost || !targetPost) {
      return { hasConflict: false };
    }
    
    const sourceData = sourcePost.postingData as any;
    const targetData = targetPost.postingData as any;
    
    // Check for price conflicts
    if (sourceData?.price !== targetData?.price) {
      return {
        hasConflict: true,
        conflictType: "price_mismatch",
        sourceValue: sourceData?.price,
        targetValue: targetData?.price,
        suggestion: "Use the higher price to maximize profit",
      };
    }
    
    // Check for inventory conflicts
    if (sourceData?.quantity !== targetData?.quantity) {
      return {
        hasConflict: true,
        conflictType: "inventory_mismatch",
        sourceValue: sourceData?.quantity,
        targetValue: targetData?.quantity,
        suggestion: "Use the lower quantity to avoid overselling",
      };
    }
    
    // Check for description conflicts
    if (sourceData?.description !== targetData?.description) {
      return {
        hasConflict: true,
        conflictType: "description_conflict",
        sourceValue: sourceData?.description,
        targetValue: targetData?.description,
        suggestion: "Review both descriptions and choose the most comprehensive one",
      };
    }
    
    return { hasConflict: false };
  }

  /**
   * Create a sync conflict record
   */
  async createConflict(
    userId: string,
    listingId: string,
    conflict: ConflictDetectionResult,
    sourceMarketplace: string,
    targetMarketplace: string
  ): Promise<void> {
    if (!conflict.hasConflict || !conflict.conflictType) return;
    
    await storage.createSyncConflict(userId, {
      listingId,
      conflictType: conflict.conflictType,
      sourceMarketplace,
      targetMarketplace,
      sourceValue: conflict.sourceValue,
      targetValue: conflict.targetValue,
    });
  }

  /**
   * Apply platform-specific rules to a listing
   */
  private async applyPlatformRules(listing: Listing, rule?: SyncRule): Promise<Partial<Listing>> {
    let adjustedListing: any = { ...listing };
    
    if (!rule) return adjustedListing;
    
    // Apply price adjustment
    if (rule.priceAdjustment && listing.price) {
      const price = parseFloat(listing.price);
      const adjustment = parseFloat(rule.priceAdjustment) / 100;
      adjustedListing.price = (price * (1 + adjustment)).toFixed(2);
    }
    
    // Apply custom price formula if provided
    if (rule.priceFormula && listing.price) {
      try {
        // Simple formula evaluation (in production, use a safe evaluator)
        const price = parseFloat(listing.price);
        const formula = rule.priceFormula.replace(/price/gi, price.toString());
        adjustedListing.price = eval(formula).toFixed(2);
      } catch (error) {
        console.error("Error applying price formula:", error);
      }
    }
    
    // Filter fields based on sync rules
    if (rule.fieldsToSync) {
      const fieldsToSync = rule.fieldsToSync as any;
      const filteredListing: any = {};
      
      for (const field in fieldsToSync) {
        if (fieldsToSync[field] && adjustedListing[field] !== undefined) {
          filteredListing[field] = adjustedListing[field];
        }
      }
      
      adjustedListing = filteredListing;
    }
    
    // Apply template overrides
    if (rule.templateOverrides) {
      const overrides = rule.templateOverrides as any;
      adjustedListing = { ...adjustedListing, ...overrides };
    }
    
    return adjustedListing;
  }

  /**
   * Detect which fields have changed between local and remote listing
   */
  private async detectChangedFields(listing: Listing, post: ListingPost): Promise<string[]> {
    const changedFields: string[] = [];
    const postData = post.postingData as any;
    
    if (!postData) return ["all"];
    
    const fieldsToCheck = ["title", "description", "price", "quantity", "condition", "category"];
    
    for (const field of fieldsToCheck) {
      if ((listing as any)[field] !== postData[field]) {
        changedFields.push(field);
      }
    }
    
    return changedFields;
  }

  /**
   * Get sync status for all listings
   */
  async getSyncStatus(userId: string): Promise<any> {
    const listings = await storage.getListings(userId);
    const connections = await storage.getMarketplaceConnections(userId);
    const connectedMarketplaces = connections.filter(c => c.isConnected).map(c => c.marketplace);
    
    const syncStatuses = await Promise.all(
      listings.map(async (listing) => {
        const posts = await storage.getListingPosts(listing.id);
        const platformStatuses: any = {};
        
        for (const marketplace of connectedMarketplaces) {
          const post = posts.find(p => p.marketplace === marketplace);
          platformStatuses[marketplace] = {
            synced: post?.status === "posted",
            lastSync: post?.updatedAt,
            externalUrl: post?.externalUrl,
          };
        }
        
        return {
          listingId: listing.id,
          title: listing.title,
          platforms: platformStatuses,
        };
      })
    );
    
    return syncStatuses;
  }

  /**
   * Auto-resolve conflicts based on settings
   */
  async autoResolveConflicts(userId: string): Promise<void> {
    const unresolvedConflicts = await storage.getSyncConflicts(userId, false);
    const syncSettings = await storage.getSyncSettings(userId);
    
    if (!syncSettings?.defaultBehavior) return;
    
    const defaultBehavior = syncSettings.defaultBehavior as any;
    
    for (const conflict of unresolvedConflicts) {
      let resolution: string | null = null;
      let resolvedValue: any = null;
      
      switch (conflict.conflictType) {
        case "price_mismatch":
          if (defaultBehavior.priceConflictResolution === "highest") {
            resolution = "keep_highest";
            resolvedValue = Math.max(conflict.sourceValue as number, conflict.targetValue as number);
          } else if (defaultBehavior.priceConflictResolution === "source") {
            resolution = "keep_source";
            resolvedValue = conflict.sourceValue;
          }
          break;
          
        case "inventory_mismatch":
          if (defaultBehavior.inventoryConflictResolution === "lowest") {
            resolution = "keep_lowest";
            resolvedValue = Math.min(conflict.sourceValue as number, conflict.targetValue as number);
          } else if (defaultBehavior.inventoryConflictResolution === "source") {
            resolution = "keep_source";
            resolvedValue = conflict.sourceValue;
          }
          break;
          
        case "description_conflict":
          if (defaultBehavior.descriptionConflictResolution === "longest") {
            resolution = "keep_longest";
            resolvedValue = (conflict.sourceValue as any)?.length > (conflict.targetValue as any)?.length 
              ? conflict.sourceValue 
              : conflict.targetValue;
          } else if (defaultBehavior.descriptionConflictResolution === "source") {
            resolution = "keep_source";
            resolvedValue = conflict.sourceValue;
          }
          break;
      }
      
      if (resolution && resolvedValue !== null) {
        await storage.resolveSyncConflict(conflict.id, resolution, resolvedValue);
      }
    }
  }
}

export const syncService = new SyncService();