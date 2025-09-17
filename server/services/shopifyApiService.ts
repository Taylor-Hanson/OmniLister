import { type MarketplaceConnection, type Listing, type InsertListing } from "@shared/schema";
import { storage } from "../storage";
import crypto from "crypto";

export interface ShopifyProduct {
  id?: number;
  title: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  created_at?: string;
  handle?: string;
  updated_at?: string;
  published_at?: string | null;
  template_suffix?: string | null;
  published_scope?: string;
  tags?: string;
  status?: "active" | "archived" | "draft";
  admin_graphql_api_id?: string;
  variants?: ShopifyVariant[];
  options?: ShopifyOption[];
  images?: ShopifyImage[];
}

export interface ShopifyVariant {
  id?: number;
  product_id?: number;
  title?: string;
  price: string;
  sku?: string;
  position?: number;
  inventory_policy?: "deny" | "continue";
  compare_at_price?: string | null;
  fulfillment_service?: string;
  inventory_management?: string | null;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
  created_at?: string;
  updated_at?: string;
  taxable?: boolean;
  barcode?: string | null;
  grams?: number;
  weight?: number;
  weight_unit?: string;
  inventory_quantity?: number;
  inventory_quantity_adjustment?: number;
  requires_shipping?: boolean;
}

export interface ShopifyOption {
  id?: number;
  product_id?: number;
  name: string;
  position?: number;
  values: string[];
}

export interface ShopifyImage {
  id?: number;
  product_id?: number;
  position?: number;
  created_at?: string;
  updated_at?: string;
  alt?: string | null;
  width?: number;
  height?: number;
  src: string;
  variant_ids?: number[];
}

export interface ShopifyWebhook {
  id?: number;
  address: string;
  topic: string;
  created_at?: string;
  updated_at?: string;
  format: "json" | "xml";
  fields?: string[];
  metafield_namespaces?: string[];
  private_metafield_namespaces?: string[];
  api_version: string;
}

export interface ShopifyAccessTokenResponse {
  access_token: string;
  scope: string;
  associated_user_scope?: string;
  associated_user?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    email_verified: boolean;
    account_owner: boolean;
    locale: string;
    collaborator: boolean;
  };
}

interface ShopifyError {
  errors?: string | { [key: string]: string[] };
  error?: string;
  error_description?: string;
}

class ShopifyApiService {
  private apiVersion: string = "2024-01";
  private scopes: string = "read_products,write_products,read_inventory,write_inventory";
  
  // Get these from environment or configuration
  private get clientId(): string {
    return process.env.SHOPIFY_CLIENT_ID || process.env.SHOPIFY_API_KEY || "";
  }
  
  private get clientSecret(): string {
    return process.env.SHOPIFY_CLIENT_SECRET || process.env.SHOPIFY_API_SECRET || "";
  }
  
  private get redirectUri(): string {
    const baseUrl = process.env.VITE_BASE_URL || "http://localhost:5000";
    return `${baseUrl}/api/marketplaces/shopify/callback`;
  }

  /**
   * Generate the OAuth installation URL for a Shopify store
   */
  getInstallUrl(shopDomain: string, state?: string): string {
    const cleanShopDomain = this.cleanShopDomain(shopDomain);
    const params = new URLSearchParams({
      client_id: this.clientId,
      scope: this.scopes,
      redirect_uri: this.redirectUri,
      state: state || this.generateNonce(),
    });
    
    return `https://${cleanShopDomain}/admin/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(shopDomain: string, code: string): Promise<ShopifyAccessTokenResponse> {
    const cleanShopDomain = this.cleanShopDomain(shopDomain);
    const url = `https://${cleanShopDomain}/admin/oauth/access_token`;
    
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
        }),
      });

      if (!response.ok) {
        const error = await response.json() as ShopifyError;
        throw new Error(error.error_description || error.error || "Failed to exchange code for token");
      }

      const data = await response.json() as ShopifyAccessTokenResponse;
      return data;
    } catch (error: any) {
      console.error("Shopify token exchange error:", error);
      throw new Error(`Failed to exchange authorization code: ${error.message}`);
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const hash = crypto
      .createHmac("sha256", this.clientSecret)
      .update(rawBody, "utf8")
      .digest("base64");
    
    return hash === signature;
  }

  /**
   * Verify request HMAC (for OAuth callback)
   */
  verifyHmac(queryParams: Record<string, string>): boolean {
    const { hmac, ...params } = queryParams;
    if (!hmac) return false;

    const message = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join("&");

    const hash = crypto
      .createHmac("sha256", this.clientSecret)
      .update(message)
      .digest("hex");

    return hash === hmac;
  }

  /**
   * Create a product in Shopify
   */
  async createProduct(connection: MarketplaceConnection, listing: Listing): Promise<ShopifyProduct> {
    if (!connection.shopUrl || !connection.accessToken) {
      throw new Error("Shop URL and access token are required");
    }

    const url = `https://${connection.shopUrl}/admin/api/${this.apiVersion}/products.json`;
    const product = this.mapListingToShopifyProduct(listing);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": connection.accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ product }),
      });

      if (!response.ok) {
        const error = await response.json() as ShopifyError;
        throw new Error(this.formatShopifyError(error));
      }

      const data = await response.json();
      return data.product;
    } catch (error: any) {
      console.error("Shopify create product error:", error);
      throw new Error(`Failed to create product: ${error.message}`);
    }
  }

  /**
   * Update a product in Shopify
   */
  async updateProduct(
    connection: MarketplaceConnection, 
    productId: string, 
    updates: Partial<Listing>
  ): Promise<ShopifyProduct> {
    if (!connection.shopUrl || !connection.accessToken) {
      throw new Error("Shop URL and access token are required");
    }

    const url = `https://${connection.shopUrl}/admin/api/${this.apiVersion}/products/${productId}.json`;
    const product = this.mapListingToShopifyProduct(updates as Listing);

    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "X-Shopify-Access-Token": connection.accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ product }),
      });

      if (!response.ok) {
        const error = await response.json() as ShopifyError;
        throw new Error(this.formatShopifyError(error));
      }

      const data = await response.json();
      return data.product;
    } catch (error: any) {
      console.error("Shopify update product error:", error);
      throw new Error(`Failed to update product: ${error.message}`);
    }
  }

  /**
   * Delete a product from Shopify
   */
  async deleteProduct(connection: MarketplaceConnection, productId: string): Promise<void> {
    if (!connection.shopUrl || !connection.accessToken) {
      throw new Error("Shop URL and access token are required");
    }

    const url = `https://${connection.shopUrl}/admin/api/${this.apiVersion}/products/${productId}.json`;

    try {
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "X-Shopify-Access-Token": connection.accessToken,
        },
      });

      if (!response.ok && response.status !== 404) {
        const error = await response.json() as ShopifyError;
        throw new Error(this.formatShopifyError(error));
      }
    } catch (error: any) {
      console.error("Shopify delete product error:", error);
      throw new Error(`Failed to delete product: ${error.message}`);
    }
  }

  /**
   * Fetch products from Shopify
   */
  async getProducts(
    connection: MarketplaceConnection, 
    options?: {
      limit?: number;
      since_id?: string;
      fields?: string[];
      status?: "active" | "archived" | "draft";
    }
  ): Promise<ShopifyProduct[]> {
    if (!connection.shopUrl || !connection.accessToken) {
      throw new Error("Shop URL and access token are required");
    }

    const params = new URLSearchParams();
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.since_id) params.append("since_id", options.since_id);
    if (options?.fields) params.append("fields", options.fields.join(","));
    if (options?.status) params.append("status", options.status);

    const url = `https://${connection.shopUrl}/admin/api/${this.apiVersion}/products.json?${params.toString()}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": connection.accessToken,
        },
      });

      if (!response.ok) {
        const error = await response.json() as ShopifyError;
        throw new Error(this.formatShopifyError(error));
      }

      const data = await response.json();
      return data.products;
    } catch (error: any) {
      console.error("Shopify get products error:", error);
      throw new Error(`Failed to fetch products: ${error.message}`);
    }
  }

  /**
   * Get a single product by ID
   */
  async getProduct(connection: MarketplaceConnection, productId: string): Promise<ShopifyProduct> {
    if (!connection.shopUrl || !connection.accessToken) {
      throw new Error("Shop URL and access token are required");
    }

    const url = `https://${connection.shopUrl}/admin/api/${this.apiVersion}/products/${productId}.json`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": connection.accessToken,
        },
      });

      if (!response.ok) {
        const error = await response.json() as ShopifyError;
        throw new Error(this.formatShopifyError(error));
      }

      const data = await response.json();
      return data.product;
    } catch (error: any) {
      console.error("Shopify get product error:", error);
      throw new Error(`Failed to fetch product: ${error.message}`);
    }
  }

  /**
   * Update inventory levels for a variant
   */
  async updateInventory(
    connection: MarketplaceConnection,
    inventoryItemId: string,
    locationId: string,
    quantity: number
  ): Promise<void> {
    if (!connection.shopUrl || !connection.accessToken) {
      throw new Error("Shop URL and access token are required");
    }

    const url = `https://${connection.shopUrl}/admin/api/${this.apiVersion}/inventory_levels/set.json`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": connection.accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          location_id: locationId,
          inventory_item_id: inventoryItemId,
          available: quantity,
        }),
      });

      if (!response.ok) {
        const error = await response.json() as ShopifyError;
        throw new Error(this.formatShopifyError(error));
      }
    } catch (error: any) {
      console.error("Shopify update inventory error:", error);
      throw new Error(`Failed to update inventory: ${error.message}`);
    }
  }

  /**
   * Register a webhook
   */
  async registerWebhook(
    connection: MarketplaceConnection,
    topic: string,
    address: string
  ): Promise<ShopifyWebhook> {
    if (!connection.shopUrl || !connection.accessToken) {
      throw new Error("Shop URL and access token are required");
    }

    const url = `https://${connection.shopUrl}/admin/api/${this.apiVersion}/webhooks.json`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": connection.accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          webhook: {
            topic,
            address,
            format: "json",
            api_version: this.apiVersion,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json() as ShopifyError;
        throw new Error(this.formatShopifyError(error));
      }

      const data = await response.json();
      return data.webhook;
    } catch (error: any) {
      console.error("Shopify register webhook error:", error);
      throw new Error(`Failed to register webhook: ${error.message}`);
    }
  }

  /**
   * Test Shopify connection by fetching shop info
   */
  async testConnection(connection: MarketplaceConnection): Promise<boolean> {
    if (!connection.shopUrl || !connection.accessToken) {
      return false;
    }

    try {
      const url = `https://${connection.shopUrl}/admin/api/${this.apiVersion}/shop.json`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": connection.accessToken,
        },
      });

      return response.ok;
    } catch (error) {
      console.error("Shopify connection test failed:", error);
      return false;
    }
  }

  /**
   * Get shop information
   */
  async getShopInfo(connection: MarketplaceConnection): Promise<any> {
    if (!connection.shopUrl || !connection.accessToken) {
      throw new Error("Shop URL and access token are required");
    }

    const url = `https://${connection.shopUrl}/admin/api/${this.apiVersion}/shop.json`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": connection.accessToken,
        },
      });

      if (!response.ok) {
        const error = await response.json() as ShopifyError;
        throw new Error(this.formatShopifyError(error));
      }

      const data = await response.json();
      return data.shop;
    } catch (error: any) {
      console.error("Shopify get shop info error:", error);
      throw new Error(`Failed to fetch shop info: ${error.message}`);
    }
  }

  /**
   * Get locations for inventory management
   */
  async getLocations(connection: MarketplaceConnection): Promise<any[]> {
    if (!connection.shopUrl || !connection.accessToken) {
      throw new Error("Shop URL and access token are required");
    }

    const url = `https://${connection.shopUrl}/admin/api/${this.apiVersion}/locations.json`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": connection.accessToken,
        },
      });

      if (!response.ok) {
        const error = await response.json() as ShopifyError;
        throw new Error(this.formatShopifyError(error));
      }

      const data = await response.json();
      return data.locations;
    } catch (error: any) {
      console.error("Shopify get locations error:", error);
      throw new Error(`Failed to fetch locations: ${error.message}`);
    }
  }

  /**
   * Import products from Shopify to local listings
   */
  async importProducts(
    userId: string,
    connection: MarketplaceConnection,
    options?: {
      limit?: number;
      status?: "active" | "archived" | "draft";
    }
  ): Promise<Listing[]> {
    const products = await this.getProducts(connection, options);
    const listings: Listing[] = [];

    for (const product of products) {
      const listing = await this.mapShopifyProductToListing(product, userId);
      listings.push(listing);
    }

    return listings;
  }

  /**
   * Helper: Map listing to Shopify product format
   */
  private mapListingToShopifyProduct(listing: Listing): Partial<ShopifyProduct> {
    const product: Partial<ShopifyProduct> = {
      title: listing.title,
      body_html: listing.description || "",
      vendor: listing.vendor || listing.brand || "",
      product_type: listing.productType || listing.category || "",
      tags: listing.tags?.join(", ") || "",
      status: "active",
    };

    // Handle variants
    if (listing.variants && Array.isArray(listing.variants)) {
      product.variants = (listing.variants as any[]).map(v => ({
        price: v.price || listing.price.toString(),
        sku: v.sku || listing.sku,
        inventory_quantity: v.inventory_quantity || listing.quantity,
        requires_shipping: listing.requiresShipping !== false,
        weight: listing.weight ? parseFloat(listing.weight.toString()) : 0,
        weight_unit: listing.weightUnit || "lb",
        option1: v.option1 || null,
        option2: v.option2 || null,
        option3: v.option3 || null,
      }));
    } else {
      // Create a default variant
      product.variants = [{
        price: listing.price.toString(),
        sku: listing.sku || "",
        inventory_quantity: listing.quantity || 0,
        requires_shipping: listing.requiresShipping !== false,
        weight: listing.weight ? parseFloat(listing.weight.toString()) : 0,
        weight_unit: listing.weightUnit || "lb",
      }];
    }

    // Handle options
    if (listing.options && Array.isArray(listing.options)) {
      product.options = listing.options as ShopifyOption[];
    }

    // Handle images
    if (listing.images && Array.isArray(listing.images)) {
      product.images = (listing.images as string[]).map(src => ({ src }));
    }

    // SEO fields
    if (listing.metaTitle || listing.metaDescription) {
      // These would be set via metafields in a real implementation
    }

    return product;
  }

  /**
   * Helper: Map Shopify product to listing format
   */
  private async mapShopifyProductToListing(product: ShopifyProduct, userId: string): Promise<Listing> {
    const defaultVariant = product.variants?.[0];
    
    const listing: any = {
      id: crypto.randomUUID(),
      userId,
      title: product.title,
      description: product.body_html || "",
      price: defaultVariant?.price || "0",
      quantity: defaultVariant?.inventory_quantity || 0,
      images: product.images?.map(img => img.src) || [],
      
      // Product details
      category: product.product_type || "",
      brand: product.vendor || "",
      
      // Shopify-specific fields
      shopifyProductId: product.id?.toString() || "",
      shopifyVariantId: defaultVariant?.id?.toString() || "",
      shopifyHandle: product.handle || "",
      vendor: product.vendor || "",
      productType: product.product_type || "",
      tags: product.tags?.split(", ").filter(t => t) || [],
      
      // Product options & variants
      options: product.options || [],
      variants: product.variants || [],
      requiresShipping: defaultVariant?.requires_shipping !== false,
      weight: defaultVariant?.weight || null,
      weightUnit: defaultVariant?.weight_unit || "lb",
      
      // Timestamps
      createdAt: product.created_at ? new Date(product.created_at) : new Date(),
      updatedAt: product.updated_at ? new Date(product.updated_at) : new Date(),
    };

    return listing as Listing;
  }

  /**
   * Helper: Clean shop domain
   */
  private cleanShopDomain(shopDomain: string): string {
    // Remove protocol if present
    let clean = shopDomain.replace(/^https?:\/\//, "");
    
    // Remove trailing slash
    clean = clean.replace(/\/$/, "");
    
    // Add .myshopify.com if not present
    if (!clean.includes(".myshopify.com")) {
      clean = clean.replace(/\.com$/, "") + ".myshopify.com";
    }
    
    return clean;
  }

  /**
   * Helper: Generate nonce for OAuth
   */
  private generateNonce(): string {
    return crypto.randomBytes(16).toString("hex");
  }

  /**
   * Helper: Format Shopify error messages
   */
  private formatShopifyError(error: ShopifyError): string {
    if (error.error_description) return error.error_description;
    if (error.error) return error.error;
    
    if (error.errors) {
      if (typeof error.errors === "string") return error.errors;
      
      const messages: string[] = [];
      for (const [field, errors] of Object.entries(error.errors)) {
        messages.push(`${field}: ${errors.join(", ")}`);
      }
      return messages.join("; ");
    }
    
    return "Unknown Shopify API error";
  }
}

// Export singleton instance
export const shopifyApiService = new ShopifyApiService();