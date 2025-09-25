import crypto from "crypto";
import { storage } from "../storage";
import { crossPlatformSyncService } from "./crossPlatformSyncService";
import { analyticsService } from "./analyticsService";
import { marketplaces } from "../shared/marketplaceConfig.ts";
import type { 
  WebhookConfiguration, 
  WebhookEvent, 
  Listing, 
  ListingPost,
  InsertWebhookEvent,
  InsertWebhookDelivery,
  InsertWebhookHealthMetrics
} from "../shared/schema.ts";

export interface WebhookPayload {
  headers: Record<string, string>;
  body: any;
  rawBody: string;
  query?: Record<string, string>;
  ip?: string;
  userAgent?: string;
}

export interface ProcessedWebhookEvent {
  marketplace: string;
  eventType: string;
  externalId: string;
  eventData: any;
  listingId?: string;
  saleData?: {
    salePrice: number;
    fees: number;
    buyerId?: string;
    transactionId?: string;
    soldAt?: Date;
  };
  isValid: boolean;
  isDuplicate: boolean;
  processingInstructions: {
    shouldTriggerSync: boolean;
    shouldUpdateListing: boolean;
    urgency: 'low' | 'medium' | 'high' | 'critical';
  };
}

export interface WebhookSignatureValidator {
  validateSignature(payload: WebhookPayload, secret: string): boolean;
  extractEventData(payload: WebhookPayload): ProcessedWebhookEvent | null;
}

/**
 * eBay Webhook Handler
 * Supports eBay notifications via their Developer Program webhooks
 */
class EbayWebhookHandler implements WebhookSignatureValidator {
  validateSignature(payload: WebhookPayload, secret: string): boolean {
    try {
      const signature = payload.headers['x-ebay-signature'] || payload.headers['ebay-signature'];
      if (!signature) return false;

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload.rawBody)
        .digest('base64');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('eBay webhook signature validation failed:', error);
      return false;
    }
  }

  extractEventData(payload: WebhookPayload): ProcessedWebhookEvent | null {
    try {
      const event = payload.body;
      
      // eBay webhook structure varies by event type
      if (event.eventType === 'ITEM_SOLD' || event.eventType === 'ORDER_PAYMENT_COMPLETED') {
        return {
          marketplace: 'ebay',
          eventType: 'sale_completed',
          externalId: event.itemId || event.legacyItemId,
          eventData: event,
          saleData: {
            salePrice: parseFloat(event.amount?.value || event.total?.value || '0'),
            fees: parseFloat(event.marketplaceFee?.value || '0'),
            buyerId: event.buyer?.username,
            transactionId: event.orderId || event.transactionId,
            soldAt: event.timestamp ? new Date(event.timestamp) : new Date(),
          },
          isValid: true,
          isDuplicate: false,
          processingInstructions: {
            shouldTriggerSync: true,
            shouldUpdateListing: true,
            urgency: 'high'
          }
        };
      }

      if (event.eventType === 'ITEM_LISTED' || event.eventType === 'ITEM_REVISED') {
        return {
          marketplace: 'ebay',
          eventType: 'listing_updated',
          externalId: event.itemId || event.legacyItemId,
          eventData: event,
          isValid: true,
          isDuplicate: false,
          processingInstructions: {
            shouldTriggerSync: false,
            shouldUpdateListing: true,
            urgency: 'low'
          }
        };
      }

      if (event.eventType === 'ITEM_ENDED' || event.eventType === 'ITEM_UNLISTED') {
        return {
          marketplace: 'ebay',
          eventType: 'listing_ended',
          externalId: event.itemId || event.legacyItemId,
          eventData: event,
          isValid: true,
          isDuplicate: false,
          processingInstructions: {
            shouldTriggerSync: false,
            shouldUpdateListing: true,
            urgency: 'medium'
          }
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to extract eBay webhook data:', error);
      return null;
    }
  }
}

/**
 * Mercari Webhook Handler
 * Supports Mercari API webhooks (if available)
 */
class MercariWebhookHandler implements WebhookSignatureValidator {
  validateSignature(payload: WebhookPayload, secret: string): boolean {
    try {
      const signature = payload.headers['x-mercari-signature'] || payload.headers['mercari-signature'];
      if (!signature) return false;

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload.rawBody)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(`sha256=${expectedSignature}`)
      );
    } catch (error) {
      console.error('Mercari webhook signature validation failed:', error);
      return false;
    }
  }

  extractEventData(payload: WebhookPayload): ProcessedWebhookEvent | null {
    try {
      const event = payload.body;
      
      if (event.event_type === 'item.sold' || event.event_type === 'order.completed') {
        return {
          marketplace: 'mercari',
          eventType: 'sale_completed',
          externalId: event.data.item_id || event.data.id,
          eventData: event,
          saleData: {
            salePrice: parseFloat(event.data.price || '0'),
            fees: parseFloat(event.data.mercari_fee || '0'),
            buyerId: event.data.buyer_id,
            transactionId: event.data.transaction_id,
            soldAt: event.data.sold_at ? new Date(event.data.sold_at) : new Date(),
          },
          isValid: true,
          isDuplicate: false,
          processingInstructions: {
            shouldTriggerSync: true,
            shouldUpdateListing: true,
            urgency: 'high'
          }
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to extract Mercari webhook data:', error);
      return null;
    }
  }
}

/**
 * Generic Webhook Handler for marketplaces without specific implementations
 */
class GenericWebhookHandler implements WebhookSignatureValidator {
  validateSignature(payload: WebhookPayload, secret: string): boolean {
    // For testing and generic webhooks, accept all
    // In production, this should have proper validation
    return true;
  }

  extractEventData(payload: WebhookPayload): ProcessedWebhookEvent | null {
    try {
      const event = payload.body;
      
      // Try to extract common event patterns
      const eventType = event.type || event.event_type || event.eventType || 'unknown';
      const externalId = event.item_id || event.itemId || event.listing_id || event.id;
      
      if (!externalId) return null;

      // Detect sale events
      if (eventType.includes('sold') || eventType.includes('sale') || eventType.includes('purchase')) {
        return {
          marketplace: event.marketplace || 'unknown',
          eventType: 'sale_completed',
          externalId,
          eventData: event,
          saleData: {
            salePrice: parseFloat(event.price || event.sale_price || event.amount || '0'),
            fees: parseFloat(event.fees || event.commission || '0'),
            buyerId: event.buyer_id || event.purchaser_id,
            transactionId: event.transaction_id || event.order_id,
            soldAt: event.sold_at || event.sale_date ? new Date(event.sold_at || event.sale_date) : new Date(),
          },
          isValid: true,
          isDuplicate: false,
          processingInstructions: {
            shouldTriggerSync: true,
            shouldUpdateListing: true,
            urgency: 'high'
          }
        };
      }

      return {
        marketplace: event.marketplace || 'unknown',
        eventType: 'listing_updated',
        externalId,
        eventData: event,
        isValid: true,
        isDuplicate: false,
        processingInstructions: {
          shouldTriggerSync: false,
          shouldUpdateListing: true,
          urgency: 'low'
        }
      };
    } catch (error) {
      console.error('Failed to extract generic webhook data:', error);
      return null;
    }
  }
}

/**
 * Main Webhook Service
 * Manages webhook processing, configuration, and integration with existing systems
 */
export class WebhookService {
  private handlers: Map<string, WebhookSignatureValidator> = new Map();

  constructor() {
    // Register marketplace-specific handlers
    this.handlers.set('ebay', new EbayWebhookHandler());
    this.handlers.set('mercari', new MercariWebhookHandler());
    this.handlers.set('generic', new GenericWebhookHandler());
  }

  /**
   * Process incoming webhook from any marketplace
   */
  async processWebhook(marketplace: string, payload: WebhookPayload): Promise<{
    success: boolean;
    eventId?: string;
    syncJobId?: string;
    error?: string;
    statusCode: number;
  }> {
    const startTime = Date.now();
    let webhookEvent: WebhookEvent | null = null;

    try {
      console.log(`🔗 Processing webhook from ${marketplace}:`, {
        headers: Object.keys(payload.headers),
        bodySize: payload.rawBody.length,
        ip: payload.ip
      });

      // Get webhook configuration for this marketplace
      const config = await this.getWebhookConfigForMarketplace(marketplace);
      if (!config) {
        console.warn(`No webhook configuration found for marketplace: ${marketplace}`);
        return {
          success: false,
          error: 'Webhook not configured for this marketplace',
          statusCode: 404
        };
      }

      // Get handler for this marketplace
      const handler = this.handlers.get(marketplace) || this.handlers.get('generic');
      if (!handler) {
        return {
          success: false,
          error: 'No handler available for this marketplace',
          statusCode: 500
        };
      }

      // Validate webhook signature
      const isSignatureValid = config.webhookSecret ? 
        handler.validateSignature(payload, config.webhookSecret) : true;

      // Create webhook event record
      webhookEvent = await storage.createWebhookEvent({
        userId: config.userId,
        marketplace,
        eventType: 'webhook_received',
        eventData: payload.body,
        signature: payload.headers['x-signature'] || payload.headers['signature'] || null,
        signatureValid: isSignatureValid,
        ipAddress: payload.ip || null,
        userAgent: payload.userAgent || null,
        headers: payload.headers,
        priority: 5
      } as any);

      if (!isSignatureValid) {
        await this.handleWebhookFailure(webhookEvent.id, 'Invalid webhook signature', {
          marketplace,
          signature: payload.headers['x-signature'] || payload.headers['signature'],
          expectedSignature: 'redacted'
        });
        
        return {
          success: false,
          error: 'Invalid webhook signature',
          statusCode: 401
        };
      }

      // Extract and process event data
      const processedEvent = handler.extractEventData(payload);
      if (!processedEvent) {
        await this.handleWebhookFailure(webhookEvent.id, 'Unable to process webhook data', {
          eventType: payload.body.type || payload.body.event_type,
          marketplace
        });

        return {
          success: false,
          error: 'Unable to process webhook data',
          statusCode: 400
        };
      }

      // Check for duplicate events
      const isDuplicate = await this.checkForDuplicateEvent(marketplace, processedEvent);
      if (isDuplicate) {
        await storage.updateWebhookEvent(webhookEvent.id, {
          processingStatus: 'ignored',
          errorMessage: 'Duplicate event detected',
          processedAt: new Date(),
          processingTime: Date.now() - startTime
        });

        return {
          success: true,
          eventId: webhookEvent.id,
          statusCode: 200
        };
      }

      // Update webhook event with processed data
      await storage.updateWebhookEvent(webhookEvent.id, {
        eventType: processedEvent.eventType,
        externalId: processedEvent.externalId,
        listingId: processedEvent.listingId || null,
        processedData: processedEvent,
        processingStatus: 'processing'
      });

      // Find the listing based on external ID
      const listing = await this.findListingByExternalId(config.userId, marketplace, processedEvent.externalId);
      
      if (listing && processedEvent.listingId !== listing.id) {
        // Update webhook event with found listing ID
        await storage.updateWebhookEvent(webhookEvent.id, {
          listingId: listing.id
        });
        processedEvent.listingId = listing.id;
      }

      let syncJobId: string | undefined;

      // Handle sale events
      if (processedEvent.eventType === 'sale_completed' && processedEvent.saleData && listing) {
        console.log(`💰 Sale detected for listing ${listing.id} on ${marketplace}:`, {
          title: listing.title,
          salePrice: processedEvent.saleData.salePrice,
          transactionId: processedEvent.saleData.transactionId
        });

        // Track the sale in analytics
        await analyticsService.trackSale(
          config.userId,
          listing,
          marketplace,
          processedEvent.saleData.salePrice,
          processedEvent.saleData.fees || 0,
          {
            webhookEventId: webhookEvent.id,
            transactionId: processedEvent.saleData.transactionId,
            buyerId: processedEvent.saleData.buyerId,
            soldAt: processedEvent.saleData.soldAt,
            source: 'webhook'
          }
        );

        // This will automatically trigger cross-platform sync via analyticsService.trackSale()
        // but we can also get the sync job ID for tracking
        try {
          const syncResult = await crossPlatformSyncService.triggerSaleSync(
            config.userId,
            listing,
            marketplace,
            processedEvent.saleData.salePrice,
            {
              webhookEventId: webhookEvent.id,
              transactionId: processedEvent.saleData.transactionId,
              buyerId: processedEvent.saleData.buyerId,
              soldAt: processedEvent.saleData.soldAt,
              source: 'webhook',
              urgency: processedEvent.processingInstructions.urgency
            }
          );
          
          syncJobId = syncResult.syncJobId;

          console.log(`🚀 Cross-platform sync triggered for webhook sale:`, {
            syncJobId,
            totalMarketplaces: syncResult.totalMarketplaces,
            listingTitle: listing.title
          });

        } catch (syncError: any) {
          console.error('Failed to trigger cross-platform sync from webhook:', syncError);
          // Don't fail the webhook - sale was already tracked
        }
      }

      // Complete webhook processing
      await storage.updateWebhookEvent(webhookEvent.id, {
        processingStatus: 'completed',
        syncJobId,
        processedAt: new Date(),
        processingTime: Date.now() - startTime
      });

      // Update webhook health metrics
      await this.updateWebhookHealthMetrics(marketplace, true, Date.now() - startTime);

      console.log(`✅ Webhook processed successfully:`, {
        eventId: webhookEvent.id,
        marketplace,
        eventType: processedEvent.eventType,
        syncJobId,
        processingTime: Date.now() - startTime
      });

      return {
        success: true,
        eventId: webhookEvent.id,
        syncJobId,
        statusCode: 200
      };

    } catch (error: any) {
      console.error('Webhook processing failed:', error);

      if (webhookEvent) {
        await this.handleWebhookFailure(webhookEvent.id, error.message, {
          stack: error.stack,
          marketplace,
          processingTime: Date.now() - startTime
        });
      }

      // Update health metrics for failure
      await this.updateWebhookHealthMetrics(marketplace, false, Date.now() - startTime);

      return {
        success: false,
        error: error.message,
        statusCode: 500
      };
    }
  }

  /**
   * Get webhook configuration for a specific marketplace
   */
  private async getWebhookConfigForMarketplace(marketplace: string): Promise<WebhookConfiguration | null> {
    try {
      // Get all webhook configurations for this marketplace
      const configs = await storage.getWebhookConfigurations('', marketplace);
      
      // Return the first active configuration
      return configs.find(config => config.isActive && config.isEnabled) || null;
    } catch (error) {
      console.error(`Failed to get webhook config for ${marketplace}:`, error);
      return null;
    }
  }

  /**
   * Find listing by external ID across all listing posts
   */
  private async findListingByExternalId(userId: string, marketplace: string, externalId: string): Promise<Listing | null> {
    try {
      // Get all listings for the user
      const listings = await storage.getListings(userId);
      
      // Check each listing's posts for the external ID
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
   * Check for duplicate webhook events
   */
  private async checkForDuplicateEvent(marketplace: string, event: ProcessedWebhookEvent): Promise<boolean> {
    try {
      if (!event.eventData.id && !event.eventData.event_id && !event.eventData.transaction_id) {
        return false; // No unique identifier to check
      }

      const eventId = event.eventData.id || event.eventData.event_id || event.eventData.transaction_id;
      const existingEvent = await storage.getWebhookEventByExternalId(marketplace, eventId);
      
      return !!existingEvent;
    } catch (error) {
      console.error('Failed to check for duplicate event:', error);
      return false;
    }
  }

  /**
   * Handle webhook processing failures
   */
  private async handleWebhookFailure(eventId: string, errorMessage: string, errorDetails?: any): Promise<void> {
    try {
      await storage.updateWebhookEvent(eventId, {
        processingStatus: 'failed',
        errorMessage,
        errorDetails: errorDetails || null,
        processingAttempts: 1,
        processedAt: new Date()
      });
    } catch (error) {
      console.error('Failed to handle webhook failure:', error);
    }
  }

  /**
   * Update webhook health metrics
   */
  private async updateWebhookHealthMetrics(marketplace: string, success: boolean, processingTime: number): Promise<void> {
    try {
      const now = new Date();
      const hourWindow = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());

      // Get existing metrics for this hour
      const existingMetrics = await storage.getWebhookHealthMetrics(marketplace, hourWindow);
      
      if (existingMetrics.length > 0) {
        const metrics = existingMetrics[0];
        await storage.updateWebhookHealthMetrics(metrics.id, {
          totalEvents: (metrics.totalEvents || 0) + 1,
          successfulEvents: success ? (metrics.successfulEvents || 0) + 1 : (metrics.successfulEvents || 0),
          failedEvents: success ? (metrics.failedEvents || 0) : (metrics.failedEvents || 0) + 1,
          averageProcessingTime: (((parseFloat((metrics.averageProcessingTime || 0).toString()) * (metrics.totalEvents || 0)) + processingTime) / ((metrics.totalEvents || 0) + 1)).toString(),
          maxProcessingTime: Math.max(metrics.maxProcessingTime || 0, processingTime),
          minProcessingTime: (metrics.minProcessingTime || 0) === 0 ? processingTime : Math.min(metrics.minProcessingTime || 0, processingTime),
          healthScore: (success ? Math.min(100, parseFloat((metrics.healthScore || 100).toString()) + 1) : Math.max(0, parseFloat((metrics.healthScore || 100).toString()) - 5)).toString()
        });
      } else {
        // Create new metrics entry
        await storage.createWebhookHealthMetrics({
          marketplace,
          timeWindow: hourWindow,
          totalEvents: 1,
          successfulEvents: success ? 1 : 0,
          failedEvents: success ? 0 : 1,
          averageProcessingTime: processingTime.toString(),
          maxProcessingTime: processingTime,
          minProcessingTime: processingTime,
          healthScore: (success ? 100 : 95).toString()
        });
      }
    } catch (error) {
      console.error('Failed to update webhook health metrics:', error);
    }
  }

  /**
   * Register webhook with marketplace
   */
  async registerWebhook(userId: string, marketplace: string, events: string[]): Promise<WebhookConfiguration> {
    try {
      const webhookUrl = `${process.env.WEBHOOK_BASE_URL || 'https://api.crosslistpro.com'}/api/webhooks/${marketplace}`;
      const webhookSecret = crypto.randomBytes(32).toString('hex');

      const config = await storage.createWebhookConfiguration(userId, {
        marketplace,
        webhookUrl,
        webhookSecret,
        supportedEvents: events,
        subscribedEvents: events,
        autoRegistered: true,
        registrationData: {
          registeredAt: new Date().toISOString(),
          events,
          url: webhookUrl
        }
      } as any);

      console.log(`📝 Webhook registered for ${marketplace}:`, {
        configId: config.id,
        url: webhookUrl,
        events
      });

      return config;
    } catch (error: any) {
      console.error(`Failed to register webhook for ${marketplace}:`, error);
      throw error;
    }
  }

  /**
   * Update webhook configuration
   */
  async updateWebhookConfig(configId: string, updates: Partial<WebhookConfiguration>): Promise<WebhookConfiguration> {
    return await storage.updateWebhookConfiguration(configId, updates);
  }

  /**
   * Get webhook configurations for a user
   */
  async getUserWebhookConfigs(userId: string): Promise<WebhookConfiguration[]> {
    return await storage.getWebhookConfigurations(userId);
  }

  /**
   * Get webhook events for monitoring/debugging
   */
  async getWebhookEvents(userId?: string, filters?: any): Promise<WebhookEvent[]> {
    return await storage.getWebhookEvents(userId, filters);
  }

  /**
   * Get webhook health summary
   */
  async getWebhookHealthSummary(marketplace?: string): Promise<any> {
    return await storage.getWebhookHealthSummary(marketplace);
  }

  /**
   * Test webhook processing with sample data
   */
  async testWebhook(marketplace: string, testPayload: any): Promise<any> {
    const payload: WebhookPayload = {
      headers: { 'content-type': 'application/json', 'x-test-webhook': 'true' },
      body: testPayload,
      rawBody: JSON.stringify(testPayload),
      ip: '127.0.0.1',
      userAgent: 'CrossListPro-Test'
    };

    return await this.processWebhook(marketplace, payload);
  }
}

export const webhookService = new WebhookService();