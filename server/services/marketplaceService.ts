import { type MarketplaceConnection, type Listing, type ListingPost } from "@shared/schema";
import { marketplaces, type MarketplaceConfig } from "@shared/marketplaceConfig";

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
    // Simulated token refresh
    return {
      accessToken: `${this.marketplaceConfig.id}_access_refreshed_${Date.now()}`,
      expiresAt: new Date(Date.now() + 3600000),
    };
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

// Specific implementation for eBay
class EbayClient extends BaseMarketplaceClient {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private sandboxMode: boolean;

  constructor() {
    super("ebay");
    this.clientId = process.env.EBAY_CLIENT_ID || "demo_client_id";
    this.clientSecret = process.env.EBAY_CLIENT_SECRET || "demo_client_secret";
    this.redirectUri = process.env.EBAY_REDIRECT_URI || "https://crosslistpro.com/callback";
    this.sandboxMode = process.env.EBAY_SANDBOX === "true";
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

  private mapConditionToEbay(condition: string): string {
    const conditionMap: Record<string, string> = {
      "new": "NEW",
      "used": "USED",
      "refurbished": "REFURBISHED",
      "damaged": "FOR_PARTS_OR_NOT_WORKING",
    };
    return conditionMap[condition.toLowerCase()] || "USED";
  }

  private mapCategoryToEbay(category?: string): string {
    // Map categories to eBay category IDs
    const categoryMap: Record<string, string> = {
      "clothing": "11450",
      "electronics": "58058",
      "home": "11700",
      "collectibles": "1",
      "toys": "220",
    };
    return categoryMap[category?.toLowerCase() || ""] || "99";
  }
}

// Factory class to manage marketplace clients
class MarketplaceService {
  private clients: Map<string, MarketplaceClient> = new Map();

  constructor() {
    // Initialize specific clients
    this.clients.set("ebay", new EbayClient());
    
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

  async createListing(marketplace: string, listing: Listing, connection: MarketplaceConnection): Promise<{ externalId: string; url: string }> {
    const client = this.getClient(marketplace);
    return client.createListing(listing, connection);
  }

  async updateListing(marketplace: string, externalId: string, listing: Partial<Listing>, connection: MarketplaceConnection): Promise<void> {
    const client = this.getClient(marketplace);
    return client.updateListing(externalId, listing, connection);
  }

  async deleteListing(marketplace: string, externalId: string, connection: MarketplaceConnection): Promise<void> {
    const client = this.getClient(marketplace);
    return client.deleteListing(externalId, connection);
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
      const result = await this.createListing(marketplace, listing, connection);
      
      return {
        id: `${Date.now()}`,
        listingId: listing.id,
        marketplace,
        externalId: result.externalId,
        externalUrl: result.url,
        status: "posted",
        errorMessage: null,
        postingData: {
          title: listing.title,
          price: listing.price,
          timestamp: new Date().toISOString(),
        },
        postedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: listing.userId,
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
        postingData: null,
        postedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: listing.userId,
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
            postingData: null,
            postedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            userId: listing.userId,
          } as ListingPost;
        }
        return this.postListingToMarketplace(listing, marketplace, connection);
      })
    );
    return posts;
  }
}

export const marketplaceService = new MarketplaceService();