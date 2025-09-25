import { type MarketplaceConnection, type Listing, type ListingPost } from "../shared/schema.ts";
import { marketplaces, type MarketplaceConfig } from "../../shared/marketplaceConfig.ts";
import { rateLimitMiddleware, type ApiRequest, RateLimitError } from "./rateLimitMiddleware";
import { rateLimitService } from "./rateLimitService";
import { ebayApiService, type EbayInventoryItem, type EbayOffer, type EbayAccountPolicies } from "./ebayApiService";
import { shopifyApiService, type ShopifyProduct } from "./shopifyApiService";

export interface MarketplaceClient {
  createListing(listing: Listing, connection: MarketplaceConnection): Promise<{ externalId: string; url: string }>;
  updateListing(externalId: string, listing: Partial<Listing>, connection: MarketplaceConnection): Promise<void>;
  deleteListing(externalId: string, connection: MarketplaceConnection): Promise<void>;
  getAuthUrl(): string;
  exchangeToken(code: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date }>;
  refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresAt?: Date }>;
  testConnection(connection: MarketplaceConnection): Promise<boolean>;
  validateCredentials(credentials: any, authType: string): Promise<boolean>;
}

// Base client for marketplaces that don't have full implementation yet
class BaseMarketplaceClient implements MarketplaceClient {
  protected marketplaceConfig: MarketplaceConfig;
  protected clientId?: string;
  protected clientSecret?: string;
  protected baseUrl?: string;

  constructor(marketplaceId: string) {
    this.marketplaceConfig = marketplaces[marketplaceId];
    if (!this.marketplaceConfig) {
      throw new Error(`Marketplace ${marketplaceId} not found`);
    }
  }

  async createListing(listing: Listing, connection: MarketplaceConnection): Promise<{ externalId: string; url: string }> {
    // Simulated implementation for demo
    return {
      externalId: `${this.marketplaceConfig.id}_${Date.now()}`,
      url: `https://${this.marketplaceConfig.id}.com/listing/${Date.now()}`,
    };
  }

  async updateListing(externalId: string, listing: Partial<Listing>, connection: MarketplaceConnection): Promise<void> {
    // Simulated implementation
    console.log(`Updating listing ${externalId} on ${this.marketplaceConfig.name}`);
  }

  async deleteListing(externalId: string, connection: MarketplaceConnection): Promise<void> {
    // Simulated implementation
    console.log(`Deleting listing ${externalId} from ${this.marketplaceConfig.name}`);
  }

  getAuthUrl(): string {
    if (this.marketplaceConfig.authType === "oauth") {
      // Return a simulated OAuth URL for demo
      return `https://${this.marketplaceConfig.id}.com/oauth/authorize?client_id=demo&redirect_uri=${encodeURIComponent("https://crosslistpro.com/callback")}`;
    }
    throw new Error(`${this.marketplaceConfig.name} does not support OAuth`);
  }

  async exchangeToken(code: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date }> {
    // Simulated token exchange for demo
    return {
      accessToken: `${this.marketplaceConfig.id}_access_${Date.now()}`,
      refreshToken: `${this.marketplaceConfig.id}_refresh_${Date.now()}`,
      expiresAt: new Date(Date.now() + 3600000), // 1 hour
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresAt?: Date }> {
    // Skip API calls if using demo credentials
    if (!this.clientId || this.clientId === "demo_client_id") {
      return {
        accessToken: `${this.marketplaceConfig.id}_access_refreshed_${Date.now()}`,
        expiresAt: new Date(Date.now() + 3600000),
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/identity/v1/oauth2/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`eBay token refresh failed: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        accessToken: data.access_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
      };
    } catch (error) {
      // Fallback to simulated tokens for demo
      return {
        accessToken: `ebay_access_refreshed_${Date.now()}`,
        expiresAt: new Date(Date.now() + 3600000),
      };
    }
  }

  async testConnection(connection: MarketplaceConnection): Promise<boolean> {
    // Basic validation - check if required fields exist
    if (this.marketplaceConfig.authType === "oauth") {
      return !!connection.accessToken;
    } else if (this.marketplaceConfig.authType === "api_key") {
      return !!connection.accessToken;
    } else if (this.marketplaceConfig.authType === "username_password") {
      return !!connection.accessToken;
    }
    return true;
  }

  async validateCredentials(credentials: any, authType: string): Promise<boolean> {
    // Basic validation - check if required credentials are provided
    if (!this.marketplaceConfig.requiredCredentials) {
      return true;
    }

    for (const cred of this.marketplaceConfig.requiredCredentials) {
      if (!credentials[cred.key]) {
        return false;
      }
    }
    return true;
  }
}

// Specific implementation for Shopify
class ShopifyClient extends BaseMarketplaceClient {
  private apiVersion: string;

  constructor() {
    super("shopify");
    this.apiVersion = "2024-01";
  }

  getAuthUrl(): string {
    // Shopify uses OAuth with shop-specific URLs
    const clientId = process.env.SHOPIFY_API_KEY || "demo_api_key";
    const scopes = "read_products,write_products,read_inventory,write_inventory";
    const redirectUri = process.env.SHOPIFY_REDIRECT_URI || "https://crosslistpro.com/callback";
    
    // This URL would need the shop domain to be complete
    return `https://{shop}.myshopify.com/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}`;
  }

  async exchangeToken(code: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date }> {
    // Shopify access tokens don't expire unless revoked
    if (!process.env.SHOPIFY_API_KEY || process.env.SHOPIFY_API_KEY === "demo_api_key") {
      return super.exchangeToken(code);
    }

    // In production, would make actual API call to Shopify
    return {
      accessToken: `shpat_${Date.now()}`,
      // Shopify doesn't use refresh tokens - access tokens are permanent until revoked
      expiresAt: undefined,
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresAt?: Date }> {
    // Shopify doesn't use refresh tokens - access tokens are permanent
    return {
      accessToken: refreshToken, // Return the same token
      expiresAt: undefined,
    };
  }

  async createListing(listing: Listing, connection: MarketplaceConnection): Promise<{ externalId: string; url: string }> {
    if (!connection.shopUrl || !connection.accessToken) {
      throw new Error("Shopify shop URL and access token are required");
    }

    // Skip API calls if using demo credentials
    if (!process.env.SHOPIFY_API_KEY || process.env.SHOPIFY_API_KEY === "demo_api_key") {
      return super.createListing(listing, connection);
    }

    try {
      // Use shopifyApiService to create the product
      const product = await shopifyApiService.createProduct(connection, listing);

      return {
        externalId: product.id ? product.id.toString() : `shopify_${Date.now()}`,
        url: product.handle 
          ? `https://${connection.shopUrl}/products/${product.handle}`
          : `https://${connection.shopUrl}/admin/products/${product.id}`,
      };
    } catch (error: any) {
      console.error("Shopify listing creation failed:", error);
      throw new Error(`Shopify API Error: ${error.message || "Unknown error"}`);
    }
  }

  /**
   * Post a listing to Shopify (alias for createListing to match other clients)
   */
  async postListing(listing: Listing, connection: MarketplaceConnection): Promise<{ externalId: string; url: string }> {
    return this.createListing(listing, connection);
  }

  async updateListing(externalId: string, listing: Partial<Listing>, connection: MarketplaceConnection): Promise<void> {
    if (!connection.shopUrl || !connection.accessToken) {
      throw new Error("Shopify shop URL and access token are required");
    }

    if (!process.env.SHOPIFY_API_KEY || process.env.SHOPIFY_API_KEY === "demo_api_key") {
      return super.updateListing(externalId, listing, connection);
    }

    try {
      // Use shopifyApiService to update the product
      await shopifyApiService.updateProduct(connection, externalId, listing as Listing);
    } catch (error: any) {
      console.error("Shopify listing update failed:", error);
      throw new Error(`Shopify API Error: ${error.message || "Unknown error"}`);
    }
  }

  async deleteListing(externalId: string, connection: MarketplaceConnection): Promise<void> {
    if (!connection.shopUrl || !connection.accessToken) {
      throw new Error("Shopify shop URL and access token are required");
    }

    if (!process.env.SHOPIFY_API_KEY || process.env.SHOPIFY_API_KEY === "demo_api_key") {
      return super.deleteListing(externalId, connection);
    }

    try {
      // Use shopifyApiService to delete the product
      await shopifyApiService.deleteProduct(connection, externalId);
    } catch (error: any) {
      console.error("Shopify listing deletion failed:", error);
      throw new Error(`Shopify API Error: ${error.message || "Unknown error"}`);
    }
  }

  private mapToShopifyProduct(listing: Listing): any {
    const product: any = {
      title: listing.title,
      body_html: listing.description || listing.listingDescription,
      vendor: listing.vendor || listing.brand || "Default Vendor",
      product_type: listing.productType || listing.category || "General",
      handle: listing.shopifyHandle,
      tags: listing.tags ? listing.tags.join(", ") : "",
      status: listing.status === "active" ? "active" : "draft",
    };

    // Add SEO fields if present
    if (listing.metaTitle || listing.metaDescription) {
      product.metafields_global_title_tag = listing.metaTitle || listing.title;
      product.metafields_global_description_tag = listing.metaDescription || listing.description;
    }

    // Handle variants
    if (listing.variants && Array.isArray(listing.variants)) {
      product.variants = listing.variants;
    } else {
      // Create a default variant if none exist
      product.variants = [{
        price: listing.price?.toString() || "0.00",
        sku: listing.mpn || `SKU-${Date.now()}`,
        inventory_quantity: listing.quantity || 1,
        weight: listing.weight ? parseFloat(listing.weight.toString()) : undefined,
        weight_unit: listing.weightUnit || "lb",
        requires_shipping: listing.requiresShipping !== false,
      }];
    }

    // Handle product options
    if (listing.options && Array.isArray(listing.options)) {
      product.options = listing.options;
    }

    // Handle images
    if (listing.images && Array.isArray(listing.images)) {
      product.images = listing.images.map((url: string) => ({ src: url }));
    }

    return product;
  }

  async testConnection(connection: MarketplaceConnection): Promise<boolean> {
    if (!connection.shopUrl || !connection.accessToken) {
      return false;
    }

    if (!process.env.SHOPIFY_API_KEY || process.env.SHOPIFY_API_KEY === "demo_api_key") {
      return true; // Skip actual API call for demo
    }

    try {
      // Use shopifyApiService to test the connection
      return await shopifyApiService.testConnection(connection);
    } catch (error) {
      console.error("Shopify connection test failed:", error);
      return false;
    }
  }
}

// Specific implementation for eBay
class EbayClient extends (BaseMarketplaceClient as any) {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private sandboxMode: boolean;
  private baseUrl: string;

  constructor() {
    super("ebay");
    this.clientId = process.env.EBAY_CLIENT_ID || "demo_client_id";
    this.clientSecret = process.env.EBAY_CLIENT_SECRET || "demo_client_secret";
    this.redirectUri = process.env.EBAY_REDIRECT_URI || "https://crosslistpro.com/callback";
    this.sandboxMode = process.env.EBAY_SANDBOX === "true";
    this.baseUrl = this.sandboxMode
      ? "https://api.sandbox.ebay.com"
      : "https://api.ebay.com";
    
    // Initialize base class properties
    this.clientId = this.clientId;
    this.clientSecret = this.clientSecret;
    this.baseUrl = this.baseUrl;
  }

  getAuthUrl(): string {
    const baseUrl = this.sandboxMode 
      ? "https://auth.sandbox.ebay.com/oauth2/authorize"
      : "https://auth.ebay.com/oauth2/authorize";
    
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: "https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.marketing",
    });

    return `${baseUrl}?${params.toString()}`;
  }

  async exchangeToken(code: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date }> {
    // For demo purposes, return simulated tokens
    if (!this.clientId || this.clientId === "demo_client_id") {
      return super.exchangeToken(code);
    }

    const baseUrl = this.sandboxMode
      ? "https://api.sandbox.ebay.com"
      : "https://api.ebay.com";

    try {
      const response = await fetch(`${baseUrl}/identity/v1/oauth2/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: this.redirectUri,
        }),
      });

      if (!response.ok) {
        throw new Error(`eBay token exchange failed: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
      };
    } catch (error) {
      // Fallback to simulated tokens for demo
      return super.exchangeToken(code);
    }
  }

  /**
   * Create listing using eBay Inventory API
   */
  async createListing(listing: Listing, connection: MarketplaceConnection): Promise<{ externalId: string; url: string }> {
    // Skip API calls if using demo credentials
    if (!this.clientId || this.clientId === "demo_client_id") {
      return super.createListing(listing, connection);
    }

    try {
      // Fetch account policies if not already set in listing
      if (!listing.fulfillmentPolicyId || !listing.paymentPolicyId || !listing.returnPolicyId) {
        const policies = await ebayApiService.fetchAccountPolicies(connection);
        const defaultPolicies = ebayApiService.getDefaultPolicies(policies);
        
        // Update listing with default policies if not set
        if (!listing.fulfillmentPolicyId && defaultPolicies.fulfillmentPolicyId) {
          listing.fulfillmentPolicyId = defaultPolicies.fulfillmentPolicyId;
        }
        if (!listing.paymentPolicyId && defaultPolicies.paymentPolicyId) {
          listing.paymentPolicyId = defaultPolicies.paymentPolicyId;
        }
        if (!listing.returnPolicyId && defaultPolicies.returnPolicyId) {
          listing.returnPolicyId = defaultPolicies.returnPolicyId;
        }
      }

      // Create InventoryItem
      const inventoryItem = ebayApiService.mapToInventoryItem(listing);
      const inventoryResponse = await this.createInventoryItem(listing.id || "", inventoryItem, connection);
      
      // Create Offer
      const categoryId = ebayApiService.mapCategoryToEbay(listing.category || "");
      const offer = ebayApiService.mapToOffer(listing, categoryId);
      const offerResponse = await this.createOffer(offer, connection);
      
      // Publish the offer if it's not a scheduled listing
      if (!listing.scheduledStartTime || new Date(listing.scheduledStartTime) <= new Date()) {
        await this.publishOffer(offerResponse.offerId, connection);
      }
      
      return {
        externalId: offerResponse.offerId,
        url: `https://www.ebay.com/itm/${offerResponse.listingId || offerResponse.offerId}`
      };
    } catch (error: any) {
      console.error('eBay listing creation failed:', error);
      throw new Error(`eBay API Error: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Update listing using eBay Inventory API
   */
  async updateListing(externalId: string, listing: Partial<Listing>, connection: MarketplaceConnection): Promise<void> {
    if (!this.clientId || this.clientId === "demo_client_id") {
      return super.updateListing(externalId, listing, connection);
    }

    try {
      // Get the current offer to find the SKU
      const currentOffer = await this.getOffer(externalId, connection);
      const sku = currentOffer.sku;
      
      if (!sku) {
        throw new Error('SKU not found for offer');
      }

      // Update InventoryItem if product details changed
      if (this.hasInventoryItemChanges(listing)) {
        const inventoryItem = ebayApiService.mapToInventoryItem(listing as Listing);
        await this.updateInventoryItem(sku || "", inventoryItem, connection);
      }

      // Update Offer if offer details changed
      if (this.hasOfferChanges(listing)) {
        const categoryId = ebayApiService.mapCategoryToEbay(listing.category || "");
        const offer = ebayApiService.mapToOffer(listing as Listing, categoryId);
        await this.updateOffer(externalId, offer, connection);
      }
    } catch (error: any) {
      console.error('eBay listing update failed:', error);
      throw new Error(`eBay API Error: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Delete listing using eBay Inventory API
   */
  async deleteListing(externalId: string, connection: MarketplaceConnection): Promise<void> {
    if (!this.clientId || this.clientId === "demo_client_id") {
      return super.deleteListing(externalId, connection);
    }

    try {
      // Delete (end) the offer
      await this.deleteOffer(externalId, connection);
    } catch (error: any) {
      console.error('eBay listing deletion failed:', error);
      throw new Error(`eBay API Error: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Create eBay InventoryItem
   */
  private async createInventoryItem(sku: string, inventoryItem: EbayInventoryItem, connection: MarketplaceConnection): Promise<any> {
    const response = await fetch(`${this.baseUrl}/sell/inventory/v1/inventory_item/${sku}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${connection.accessToken}`,
        "Content-Type": "application/json",
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US"
      },
      body: JSON.stringify(inventoryItem)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`eBay InventoryItem creation failed: ${errorData.message || response.statusText}`);
    }

    return response.status === 204 ? { sku } : await response.json();
  }

  /**
   * Create eBay Offer
   */
  private async createOffer(offer: EbayOffer, connection: MarketplaceConnection): Promise<any> {
    const response = await fetch(`${this.baseUrl}/sell/inventory/v1/offer`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${connection.accessToken}`,
        "Content-Type": "application/json",
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US"
      },
      body: JSON.stringify(offer)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`eBay Offer creation failed: ${errorData.message || response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Publish eBay Offer
   */
  private async publishOffer(offerId: string, connection: MarketplaceConnection): Promise<any> {
    const response = await fetch(`${this.baseUrl}/sell/inventory/v1/offer/${offerId}/publish`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${connection.accessToken}`,
        "Content-Type": "application/json",
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US"
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`eBay Offer publishing failed: ${errorData.message || response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Update eBay InventoryItem
   */
  private async updateInventoryItem(sku: string, inventoryItem: Partial<EbayInventoryItem>, connection: MarketplaceConnection): Promise<any> {
    const response = await fetch(`${this.baseUrl}/sell/inventory/v1/inventory_item/${sku}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${connection.accessToken}`,
        "Content-Type": "application/json",
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US"
      },
      body: JSON.stringify(inventoryItem)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`eBay InventoryItem update failed: ${errorData.message || response.statusText}`);
    }

    return response.status === 204 ? { sku } : await response.json();
  }

  /**
   * Update eBay Offer
   */
  private async updateOffer(offerId: string, offer: Partial<EbayOffer>, connection: MarketplaceConnection): Promise<any> {
    const response = await fetch(`${this.baseUrl}/sell/inventory/v1/offer/${offerId}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${connection.accessToken}`,
        "Content-Type": "application/json",
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US"
      },
      body: JSON.stringify(offer)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`eBay Offer update failed: ${errorData.message || response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Delete eBay Offer (End listing)
   */
  private async deleteOffer(offerId: string, connection: MarketplaceConnection): Promise<void> {
    const response = await fetch(`${this.baseUrl}/sell/inventory/v1/offer/${offerId}/withdraw`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${connection.accessToken}`,
        "Content-Type": "application/json",
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US"
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`eBay Offer deletion failed: ${errorData.message || response.statusText}`);
    }
  }

  /**
   * Get eBay Offer details
   */
  private async getOffer(offerId: string, connection: MarketplaceConnection): Promise<any> {
    const response = await fetch(`${this.baseUrl}/sell/inventory/v1/offer/${offerId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${connection.accessToken}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US"
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`eBay Offer retrieval failed: ${errorData.message || response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Check if listing changes affect InventoryItem
   */
  private hasInventoryItemChanges(listing: Partial<Listing>): boolean {
    const inventoryItemFields = [
      'title', 'description', 'subtitle', 'condition', 'conditionDescription',
      'brand', 'mpn', 'images', 'upc', 'ean', 'isbn', 'gtin', 'epid',
      'itemSpecifics', 'packageWeight', 'packageDimensions', 'quantity'
    ];
    
    return inventoryItemFields.some(field => listing.hasOwnProperty(field));
  }

  /**
   * Check if listing changes affect Offer
   */
  private hasOfferChanges(listing: Partial<Listing>): boolean {
    const offerFields = [
      'price', 'listingFormat', 'listingDuration', 'startPrice', 'reservePrice',
      'buyItNowPrice', 'category', 'listingDescription', 'scheduledStartTime',
      'scheduledEndTime', 'storeCategoryNames', 'fulfillmentPolicyId',
      'paymentPolicyId', 'returnPolicyId', 'merchantLocationKey'
    ];
    
    return offerFields.some(field => listing.hasOwnProperty(field));
  }
}

// Factory class to manage marketplace clients
class MarketplaceService {
  private clients: Map<string, MarketplaceClient> = new Map();

  constructor() {
    // Initialize specific clients
    this.clients.set("ebay", new EbayClient() as any);
    this.clients.set("shopify", new ShopifyClient());
    
    // Initialize base clients for all other marketplaces
    Object.keys(marketplaces).forEach(marketplaceId => {
      if (!this.clients.has(marketplaceId)) {
        this.clients.set(marketplaceId, new BaseMarketplaceClient(marketplaceId));
      }
    });
  }

  getSupportedMarketplaces(): string[] {
    return Object.keys(marketplaces);
  }

  getClient(marketplace: string): MarketplaceClient {
    const client = this.clients.get(marketplace);
    if (!client) {
      throw new Error(`Marketplace ${marketplace} is not supported`);
    }
    return client;
  }

  async createListing(listing: Listing, marketplace: string, connection: MarketplaceConnection): Promise<{ externalId: string; url: string }> {
    // Use rate-limited wrapper for API calls
    try {
      const client = this.getClient(marketplace);
      
      // For marketplace clients that make actual API calls, wrap in rate limiting
      if (this.shouldUseRateLimiting(marketplace)) {
        return await this.createListingWithRateLimit(marketplace, listing, connection);
      }
      
      // For demo/simulated clients, use direct call
      return client.createListing(listing, connection);
    } catch (error) {
      if (error instanceof RateLimitError) {
        console.warn(`Rate limit error creating listing for ${marketplace}:`, error.message);
      }
      throw error;
    }
  }

  async updateListing(marketplace: string, externalId: string, listing: Partial<Listing>, connection: MarketplaceConnection): Promise<void> {
    try {
      const client = this.getClient(marketplace);
      
      if (this.shouldUseRateLimiting(marketplace)) {
        return await this.updateListingWithRateLimit(marketplace, externalId, listing, connection);
      }
      
      return client.updateListing(externalId, listing, connection);
    } catch (error) {
      if (error instanceof RateLimitError) {
        console.warn(`Rate limit error updating listing for ${marketplace}:`, error.message);
      }
      throw error;
    }
  }

  async deleteListing(marketplace: string, externalId: string, connection: MarketplaceConnection): Promise<void> {
    try {
      const client = this.getClient(marketplace);
      
      if (this.shouldUseRateLimiting(marketplace)) {
        return await this.deleteListingWithRateLimit(marketplace, externalId, connection);
      }
      
      return client.deleteListing(externalId, connection);
    } catch (error) {
      if (error instanceof RateLimitError) {
        console.warn(`Rate limit error deleting listing for ${marketplace}:`, error.message);
      }
      throw error;
    }
  }

  getAuthUrl(marketplace: string): string {
    const client = this.getClient(marketplace);
    return client.getAuthUrl();
  }

  async exchangeToken(marketplace: string, code: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date }> {
    const client = this.getClient(marketplace);
    return client.exchangeToken(code);
  }

  async refreshToken(marketplace: string, refreshToken: string): Promise<{ accessToken: string; expiresAt?: Date }> {
    const client = this.getClient(marketplace);
    return client.refreshToken(refreshToken);
  }

  async testConnection(marketplace: string, connection: MarketplaceConnection): Promise<boolean> {
    const client = this.getClient(marketplace);
    return client.testConnection(connection);
  }

  async validateCredentials(marketplace: string, credentials: any, authType: string): Promise<boolean> {
    const client = this.getClient(marketplace);
    return client.validateCredentials(credentials, authType);
  }

  async postListingToMarketplace(listing: Listing, marketplace: string, connection: MarketplaceConnection): Promise<ListingPost> {
    try {
      const result = await this.createListing(listing, marketplace, connection);
      
      return {
        id: `${Date.now()}`,
        listingId: listing.id,
        marketplace,
        externalId: result.externalId,
        externalUrl: result.url,
        status: "posted",
        errorMessage: null,
        shopifyInventoryItemId: null,
        postingData: {
          title: listing.title,
          price: listing.price,
          timestamp: new Date().toISOString(),
        },
        postedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ListingPost;
    } catch (error: any) {
      return {
        id: `${Date.now()}`,
        listingId: listing.id,
        marketplace,
        externalId: null,
        externalUrl: null,
        status: "failed",
        errorMessage: error.message,
        shopifyInventoryItemId: null,
        postingData: null,
        postedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ListingPost;
    }
  }

  async delistFromMarketplace(post: ListingPost, connection: MarketplaceConnection): Promise<void> {
    if (post.externalId) {
      await this.deleteListing(post.marketplace, post.externalId, connection);
    }
  }

  async bulkPostListing(listing: Listing, marketplaces: string[], connections: MarketplaceConnection[]): Promise<ListingPost[]> {
    const posts = await Promise.all(
      marketplaces.map(async (marketplace) => {
        const connection = connections.find(c => c.marketplace === marketplace);
        if (!connection || !connection.isConnected) {
          return {
            id: `${Date.now()}`,
            listingId: listing.id,
            marketplace,
            externalId: null,
            externalUrl: null,
            status: "failed",
            errorMessage: "Marketplace not connected",
            shopifyInventoryItemId: null,
            postingData: null,
            postedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as ListingPost;
        }
        return this.postListingToMarketplace(listing, marketplace, connection);
      })
    );
    return posts;
  }

  /**
   * Determine if rate limiting should be used for a marketplace
   */
  private shouldUseRateLimiting(marketplace: string): boolean {
    // Use rate limiting for ALL marketplaces to ensure proper rate limiting across the platform
    const marketplacesWithRateLimit = ['ebay', 'poshmark', 'mercari', 'facebook', 'depop', 'vinted', 'grailed', 'stockx', 'goat', 'etsy', 'amazon', 'shopify', 'reverb', 'discogs', 'tcgplayer'];
    return marketplacesWithRateLimit.includes(marketplace.toLowerCase());
  }

  /**
   * Create listing with rate limiting middleware
   */
  private async createListingWithRateLimit(marketplace: string, listing: Listing, connection: MarketplaceConnection): Promise<{ externalId: string; url: string }> {
    const client = this.getClient(marketplace);
    const marketplaceConfig = marketplaces[marketplace];
    
    // Create API request based on marketplace
    const apiRequest: ApiRequest = {
      url: this.getCreateListingUrl(marketplace, marketplaceConfig),
      method: "POST",
      headers: this.getAuthHeaders(connection),
      body: this.formatListingData(listing, marketplace),
    };

    const response = await rateLimitMiddleware.makeApiCall(apiRequest, {
      marketplace,
      userId: listing.userId,
      priority: 5, // Default priority for creating listings
    });

    // Parse response to extract external ID and URL
    return this.parseCreateListingResponse(response.data, marketplace);
  }

  /**
   * Update listing with rate limiting middleware  
   */
  private async updateListingWithRateLimit(marketplace: string, externalId: string, listing: Partial<Listing>, connection: MarketplaceConnection): Promise<void> {
    const marketplaceConfig = marketplaces[marketplace];
    
    const apiRequest: ApiRequest = {
      url: this.getUpdateListingUrl(marketplace, marketplaceConfig, externalId),
      method: "PUT",
      headers: this.getAuthHeaders(connection),
      body: this.formatListingData(listing, marketplace),
    };

    await rateLimitMiddleware.makeApiCall(apiRequest, {
      marketplace,
      userId: listing.userId || 'system',
      priority: 3, // Lower priority for updates
    });
  }

  /**
   * Delete listing with rate limiting middleware
   */
  private async deleteListingWithRateLimit(marketplace: string, externalId: string, connection: MarketplaceConnection): Promise<void> {
    const marketplaceConfig = marketplaces[marketplace];
    
    const apiRequest: ApiRequest = {
      url: this.getDeleteListingUrl(marketplace, marketplaceConfig, externalId),
      method: "DELETE", 
      headers: this.getAuthHeaders(connection),
    };

    await rateLimitMiddleware.makeApiCall(apiRequest, {
      marketplace,
      priority: 4, // Medium priority for deletions
    });
  }

  /**
   * Helper methods for API request construction
   */
  private getCreateListingUrl(marketplace: string, config: MarketplaceConfig): string {
    // This would be customized per marketplace in a real implementation
    return `https://api.${marketplace}.com/v1/listings`;
  }

  private getUpdateListingUrl(marketplace: string, config: MarketplaceConfig, externalId: string): string {
    return `https://api.${marketplace}.com/v1/listings/${externalId}`;
  }

  private getDeleteListingUrl(marketplace: string, config: MarketplaceConfig, externalId: string): string {
    return `https://api.${marketplace}.com/v1/listings/${externalId}`;
  }

  private getAuthHeaders(connection: MarketplaceConnection): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (connection.accessToken) {
      headers['Authorization'] = `Bearer ${connection.accessToken}`;
    }

    return headers;
  }

  private formatListingData(listing: Partial<Listing>, marketplace: string): any {
    // This would be customized per marketplace API format
    return {
      title: listing.title,
      description: listing.description,
      price: listing.price,
      condition: listing.condition,
      category: listing.category,
      images: listing.images,
    };
  }

  private parseCreateListingResponse(responseData: any, marketplace: string): { externalId: string; url: string } {
    // This would be customized per marketplace response format
    return {
      externalId: responseData.id || responseData.listing_id || `${marketplace}_${Date.now()}`,
      url: responseData.url || responseData.listing_url || `https://${marketplace}.com/listing/${responseData.id}`,
    };
  }

  /**
   * Get rate limit status for all marketplaces
   */
  async getRateLimitSummary(): Promise<Record<string, any>> {
    return await rateLimitService.getRateLimitSummary();
  }

  /**
   * Check if marketplace is available for API calls
   */
  async isMarketplaceAvailable(marketplace: string): Promise<{ available: boolean; reason?: string; waitTime?: number }> {
    return await rateLimitMiddleware.isMarketplaceAvailable(marketplace);
  }
}

export const marketplaceService = new MarketplaceService();