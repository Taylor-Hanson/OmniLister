import { type MarketplaceConnection, type Listing, type ListingPost } from "@shared/schema";

export interface MarketplaceClient {
  createListing(listing: Listing, connection: MarketplaceConnection): Promise<{ externalId: string; url: string }>;
  updateListing(externalId: string, listing: Partial<Listing>, connection: MarketplaceConnection): Promise<void>;
  deleteListing(externalId: string, connection: MarketplaceConnection): Promise<void>;
  getAuthUrl(): string;
  exchangeToken(code: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date }>;
  refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresAt?: Date }>;
  testConnection(connection: MarketplaceConnection): Promise<boolean>;
}

class EbayClient implements MarketplaceClient {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private sandboxMode: boolean;

  constructor() {
    this.clientId = process.env.EBAY_CLIENT_ID || "";
    this.clientSecret = process.env.EBAY_CLIENT_SECRET || "";
    this.redirectUri = process.env.EBAY_REDIRECT_URI || "";
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
    const baseUrl = this.sandboxMode
      ? "https://api.sandbox.ebay.com"
      : "https://api.ebay.com";

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
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresAt?: Date }> {
    const baseUrl = this.sandboxMode
      ? "https://api.sandbox.ebay.com"
      : "https://api.ebay.com";

    const response = await fetch(`${baseUrl}/identity/v1/oauth2/token`, {
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
  }

  async createListing(listing: Listing, connection: MarketplaceConnection): Promise<{ externalId: string; url: string }> {
    const baseUrl = this.sandboxMode
      ? "https://api.sandbox.ebay.com"
      : "https://api.ebay.com";

    const listingData = {
      product: {
        title: listing.title,
        description: listing.description,
        aspects: {
          Brand: [listing.brand || "Unbranded"],
          Condition: [listing.condition || "Used"],
        },
      },
      condition: this.mapConditionToEbay(listing.condition || "used"),
      conditionDescription: listing.description,
      availability: {
        shipToLocationAvailability: {
          quantity: listing.quantity || 1,
        },
      },
      listingPolicies: {
        fulfillmentPolicyId: connection.settings?.fulfillmentPolicyId,
        paymentPolicyId: connection.settings?.paymentPolicyId,
        returnPolicyId: connection.settings?.returnPolicyId,
      },
      pricingSummary: {
        price: {
          currency: "USD",
          value: listing.price,
        },
      },
      categoryId: this.mapCategoryToEbay(listing.category),
      marketplaceId: "EBAY_US",
      format: "FIXED_PRICE",
      ...(listing.images && {
        productImageUrls: Array.isArray(listing.images) ? listing.images : [],
      }),
    };

    const response = await fetch(`${baseUrl}/sell/inventory/v1/inventory_item/${listing.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${connection.accessToken}`,
      },
      body: JSON.stringify(listingData),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`eBay listing creation failed: ${error}`);
    }

    // Create the offer
    const offerResponse = await fetch(`${baseUrl}/sell/inventory/v1/offer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${connection.accessToken}`,
      },
      body: JSON.stringify({
        sku: listing.id,
        marketplaceId: "EBAY_US",
        format: "FIXED_PRICE",
        availableQuantity: listing.quantity || 1,
        categoryId: this.mapCategoryToEbay(listing.category),
        listingDescription: listing.description,
        pricingSummary: {
          price: {
            currency: "USD",
            value: listing.price,
          },
        },
        listingPolicies: {
          fulfillmentPolicyId: connection.settings?.fulfillmentPolicyId,
          paymentPolicyId: connection.settings?.paymentPolicyId,
          returnPolicyId: connection.settings?.returnPolicyId,
        },
      }),
    });

    if (!offerResponse.ok) {
      const error = await offerResponse.text();
      throw new Error(`eBay offer creation failed: ${error}`);
    }

    const offerData = await offerResponse.json();
    
    // Publish the offer
    const publishResponse = await fetch(`${baseUrl}/sell/inventory/v1/offer/${offerData.offerId}/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${connection.accessToken}`,
      },
    });

    if (!publishResponse.ok) {
      const error = await publishResponse.text();
      throw new Error(`eBay listing publish failed: ${error}`);
    }

    const publishData = await publishResponse.json();
    
    return {
      externalId: publishData.listingId,
      url: `https://www.ebay.com/itm/${publishData.listingId}`,
    };
  }

  async updateListing(externalId: string, listing: Partial<Listing>, connection: MarketplaceConnection): Promise<void> {
    // Implementation for updating eBay listing
    // This would use the eBay API to update listing details
    throw new Error("eBay listing update not implemented yet");
  }

  async deleteListing(externalId: string, connection: MarketplaceConnection): Promise<void> {
    const baseUrl = this.sandboxMode
      ? "https://api.sandbox.ebay.com"
      : "https://api.ebay.com";

    const response = await fetch(`${baseUrl}/sell/inventory/v1/offer/${externalId}/withdraw`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${connection.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`eBay listing deletion failed: ${error}`);
    }
  }

  async testConnection(connection: MarketplaceConnection): Promise<boolean> {
    try {
      const baseUrl = this.sandboxMode
        ? "https://api.sandbox.ebay.com"
        : "https://api.ebay.com";

      const response = await fetch(`${baseUrl}/sell/account/v1/policies/fulfillment`, {
        headers: {
          "Authorization": `Bearer ${connection.accessToken}`,
        },
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private mapConditionToEbay(condition: string): string {
    const conditionMap: Record<string, string> = {
      new: "NEW",
      "like new": "NEW_OTHER",
      good: "USED_EXCELLENT",
      fair: "USED_GOOD",
      poor: "USED_ACCEPTABLE",
    };
    return conditionMap[condition.toLowerCase()] || "USED_EXCELLENT";
  }

  private mapCategoryToEbay(category?: string): string {
    // This is a simplified mapping - in production, you'd have a comprehensive category mapping
    const categoryMap: Record<string, string> = {
      clothing: "11450",
      shoes: "15709",
      electronics: "58058",
      accessories: "169291",
      home: "11700",
      books: "267",
      toys: "220",
      sports: "888",
    };
    return categoryMap[category?.toLowerCase() || ""] || "88433"; // Default to "Other"
  }
}

// Stub clients for marketplaces without full API access
class PoshmarkClient implements MarketplaceClient {
  getAuthUrl(): string {
    return "/api/marketplace/poshmark/auth";
  }

  async exchangeToken(code: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date }> {
    // Stub implementation - would use Poshmark API when available
    return {
      accessToken: `poshmark_token_${code}`,
      expiresAt: new Date(Date.now() + 3600000), // 1 hour
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresAt?: Date }> {
    return {
      accessToken: `poshmark_refreshed_${refreshToken}`,
      expiresAt: new Date(Date.now() + 3600000),
    };
  }

  async createListing(listing: Listing, connection: MarketplaceConnection): Promise<{ externalId: string; url: string }> {
    // Stub implementation - would use actual Poshmark API or Playwright automation
    const mockId = `posh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      externalId: mockId,
      url: `https://poshmark.com/listing/${mockId}`,
    };
  }

  async updateListing(externalId: string, listing: Partial<Listing>, connection: MarketplaceConnection): Promise<void> {
    // Stub implementation
  }

  async deleteListing(externalId: string, connection: MarketplaceConnection): Promise<void> {
    // Stub implementation
  }

  async testConnection(connection: MarketplaceConnection): Promise<boolean> {
    return true; // Stub - always return true
  }
}

class MercariClient implements MarketplaceClient {
  getAuthUrl(): string {
    return "/api/marketplace/mercari/auth";
  }

  async exchangeToken(code: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date }> {
    return {
      accessToken: `mercari_token_${code}`,
      expiresAt: new Date(Date.now() + 3600000),
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresAt?: Date }> {
    return {
      accessToken: `mercari_refreshed_${refreshToken}`,
      expiresAt: new Date(Date.now() + 3600000),
    };
  }

  async createListing(listing: Listing, connection: MarketplaceConnection): Promise<{ externalId: string; url: string }> {
    const mockId = `mercari_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      externalId: mockId,
      url: `https://mercari.com/item/${mockId}`,
    };
  }

  async updateListing(externalId: string, listing: Partial<Listing>, connection: MarketplaceConnection): Promise<void> {
    // Stub implementation
  }

  async deleteListing(externalId: string, connection: MarketplaceConnection): Promise<void> {
    // Stub implementation
  }

  async testConnection(connection: MarketplaceConnection): Promise<boolean> {
    return true;
  }
}

export class MarketplaceService {
  private clients: Map<string, MarketplaceClient> = new Map([
    ["ebay", new EbayClient()],
    ["poshmark", new PoshmarkClient()],
    ["mercari", new MercariClient()],
  ]);

  getClient(marketplace: string): MarketplaceClient {
    const client = this.clients.get(marketplace.toLowerCase());
    if (!client) {
      throw new Error(`Unsupported marketplace: ${marketplace}`);
    }
    return client;
  }

  getSupportedMarketplaces(): string[] {
    return Array.from(this.clients.keys());
  }

  async createListing(listing: Listing, marketplace: string, connection: MarketplaceConnection): Promise<{ externalId: string; url: string }> {
    const client = this.getClient(marketplace);
    return client.createListing(listing, connection);
  }

  async updateListing(externalId: string, listing: Partial<Listing>, marketplace: string, connection: MarketplaceConnection): Promise<void> {
    const client = this.getClient(marketplace);
    return client.updateListing(externalId, listing, connection);
  }

  async deleteListing(externalId: string, marketplace: string, connection: MarketplaceConnection): Promise<void> {
    const client = this.getClient(marketplace);
    return client.deleteListing(externalId, connection);
  }

  async testConnection(marketplace: string, connection: MarketplaceConnection): Promise<boolean> {
    const client = this.getClient(marketplace);
    return client.testConnection(connection);
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
}

export const marketplaceService = new MarketplaceService();
