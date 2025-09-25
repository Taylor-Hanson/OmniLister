import { type Listing, type MarketplaceConnection, EBAY_CONDITIONS } from "../shared/schema.js";

// eBay API Types
export interface EbayInventoryItem {
  sku?: string;
  product: EbayProduct;
  condition: string;
  conditionDescription?: string;
  availability: {
    shipToLocationAvailability: {
      quantity: number;
    };
  };
  packageWeightAndSize?: {
    dimensions?: {
      height: number;
      length: number;
      width: number;
      unit: "INCH" | "FEET" | "CENTIMETER" | "METER";
    };
    packageType?: "LETTER" | "BULKY_GOODS" | "CARAVAN" | "CARS" | "EUROPALLET" | "EXPANDABLE_TOUGH_BAGS" | "EXTRA_LARGE_PACK" | "FURNITURE" | "INDUSTRY_VEHICLES" | "LARGE_CANADA_POSTBOX" | "LARGE_CANADA_POST_BUBBLE_MAILER" | "LARGE_ENVELOPE" | "MAILING_BOX" | "MEDIUM_CANADA_POSTBOX" | "MEDIUM_CANADA_POST_BUBBLE_MAILER" | "ONE_WAY_PALLET" | "PACKAGE_THICK_ENVELOPE" | "PADDED_BAGS" | "PARCEL_OR_PADDED_ENVELOPE" | "ROLL" | "SMALL_CANADA_POSTBOX" | "SMALL_CANADA_POST_BUBBLE_MAILER" | "TOUGH_BAGS" | "UPS_LETTER" | "USPS_FLAT_RATE_ENVELOPE" | "USPS_LARGE_PACK" | "VERY_LARGE_PACK" | "WINE_PAK";
    weight?: {
      value: number;
      unit: "POUND" | "KILOGRAM" | "OUNCE" | "GRAM";
    };
  };
}

export interface EbayProduct {
  title: string;
  description?: string;
  subtitle?: string;
  aspects?: Record<string, string[]>; // Item specifics
  brand?: string;
  mpn?: string;
  imageUrls?: string[];
  upc?: string[];
  ean?: string[];
  isbn?: string[];
  epid?: string;
  gtin?: string[];
}

export interface EbayOffer {
  sku?: string;
  marketplaceId: "EBAY_US" | "EBAY_GB" | "EBAY_DE" | "EBAY_FR" | "EBAY_IT" | "EBAY_ES" | "EBAY_CA" | "EBAY_AU";
  format: "FIXED_PRICE" | "AUCTION";
  availableQuantity: number;
  categoryId: string;
  hideBuyerDetails?: boolean;
  includeCatalogProductDetails?: boolean;
  listingDescription?: string;
  listingDuration?: "DAYS_1" | "DAYS_3" | "DAYS_5" | "DAYS_7" | "DAYS_10" | "DAYS_30" | "GTC";
  listingStartDate?: string;
  listingEndDate?: string;
  merchantLocationKey?: string;
  pricingSummary: {
    price: {
      value: string;
      currency: "USD" | "GBP" | "EUR" | "CAD" | "AUD";
    };
    pricingVisibility?: "DURING_CHECKOUT" | "NONE" | "PRE_CHECKOUT";
    auctionStartPrice?: {
      value: string;
      currency: "USD" | "GBP" | "EUR" | "CAD" | "AUD";
    };
    auctionReservePrice?: {
      value: string;
      currency: "USD" | "GBP" | "EUR" | "CAD" | "AUD";
    };
  };
  quantityLimitPerBuyer?: number;
  secondaryCategoryId?: string;
  storeCategoryNames?: string[];
  tax?: {
    applyTax: boolean;
    thirdPartyTaxCategory?: string;
    vatPercentage?: number;
  };
  fulfillmentPolicyId?: string;
  paymentPolicyId?: string;
  returnPolicyId?: string;
  extendedProducerResponsibilityId?: string;
  lotSize?: number;
}

export interface EbayAccountPolicies {
  fulfillmentPolicies: Array<{
    fulfillmentPolicyId: string;
    name: string;
    description?: string;
    marketplaceId: string;
    categoryTypes: Array<{
      name: string;
      defaultValue: boolean;
    }>;
    handlingTime: {
      value: number;
      unit: "DAY" | "BUSINESS_DAY";
    };
    shippingOptions: Array<{
      costType: "FLAT_RATE" | "CALCULATED" | "NOT_SPECIFIED";
      shippingServices: Array<{
        serviceName: string;
        shippingCost?: {
          value: string;
          currency: string;
        };
        additionalShippingCost?: {
          value: string;
          currency: string;
        };
        freeShipping?: boolean;
        buyerResponsibleForShipping?: boolean;
        buyerResponsibleForPickup?: boolean;
      }>;
    }>;
    globalShipping?: boolean;
    freightShipping?: boolean;
    localPickup?: boolean;
    pickupDropOff?: boolean;
  }>;
  paymentPolicies: Array<{
    paymentPolicyId: string;
    name: string;
    description?: string;
    marketplaceId: string;
    categoryTypes: Array<{
      name: string;
      defaultValue: boolean;
    }>;
    paymentMethods: Array<{
      paymentMethodType: "PAYPAL" | "CREDIT_CARD" | "PERSONAL_CHECK" | "BANK_TRANSFER" | "MONEY_ORDER" | "CASH_ON_PICKUP" | "ESCROW" | "OTHER";
      recipientAccountReference?: {
        referenceId: string;
        referenceType?: string;
      };
    }>;
    immediatePay?: boolean;
  }>;
  returnPolicies: Array<{
    returnPolicyId: string;
    name: string;
    description?: string;
    marketplaceId: string;
    categoryTypes: Array<{
      name: string;
      defaultValue: boolean;
    }>;
    returnMethod: "EXCHANGE" | "MONEY_BACK";
    returnShippingCostPayer: "BUYER" | "SELLER";
    returnsAccepted: boolean;
    returnPeriod?: {
      value: number;
      unit: "DAY" | "MONTH";
    };
    restockingFeePercentage?: string;
    extendedHolidayReturnsOffered?: boolean;
    returnInstructions?: string;
  }>;
}

/**
 * eBay API service for handling payload mapping and policy management
 */
export class EbayApiService {
  private readonly sandboxMode: boolean;
  private readonly baseUrl: string;
  private policiesCache: Map<string, { data: EbayAccountPolicies; expiresAt: Date }> = new Map();
  private readonly POLICIES_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.sandboxMode = process.env.EBAY_SANDBOX === "true";
    this.baseUrl = this.sandboxMode
      ? "https://api.sandbox.ebay.com"
      : "https://api.ebay.com";
  }

  /**
   * Map our Listing schema to eBay InventoryItem format
   */
  mapToInventoryItem(listing: Listing): EbayInventoryItem {
    const inventoryItem: EbayInventoryItem = {
      sku: listing.id, // Use our listing ID as SKU
      product: this.mapToProduct(listing),
      condition: this.mapCondition(listing.condition || "", listing.conditionId || undefined),
      conditionDescription: listing.conditionDescription || undefined,
      availability: {
        shipToLocationAvailability: {
          quantity: parseInt((listing.quantity || "1").toString()),
        },
      },
    };

    // Add package information if available
    if (listing.packageWeight || listing.packageDimensions) {
      inventoryItem.packageWeightAndSize = this.mapPackageInfo(listing);
    }

    return inventoryItem;
  }

  /**
   * Map our Listing schema to eBay Product format
   */
  private mapToProduct(listing: Listing): EbayProduct {
    const product: EbayProduct = {
      title: listing.title,
      description: listing.description || "",
      subtitle: listing.subtitle || undefined,
      brand: listing.brand || undefined,
      mpn: listing.mpn || undefined,
      imageUrls: this.extractImageUrls(listing.images),
    };

    // Add product identifiers
    if (listing.upc) product.upc = [listing.upc];
    if (listing.ean) product.ean = [listing.ean];
    if (listing.isbn) product.isbn = [listing.isbn];
    if (listing.gtin) product.gtin = [listing.gtin];
    if (listing.epid) product.epid = listing.epid;

    // Map item specifics
    if (listing.itemSpecifics) {
      product.aspects = this.mapItemSpecifics(listing.itemSpecifics);
    }

    return product;
  }

  /**
   * Map our Listing schema to eBay Offer format
   */
  mapToOffer(listing: Listing, categoryId: string): EbayOffer {
    const offer: EbayOffer = {
      sku: listing.id,
      marketplaceId: "EBAY_US", // Default to US, could be configurable
      format: this.mapListingFormat(listing.listingFormat || ""),
      availableQuantity: listing.quantity || 1,
      categoryId,
      includeCatalogProductDetails: true,
      listingDescription: listing.listingDescription || listing.description || "",
      listingDuration: this.mapListingDuration(listing.listingDuration || ""),
      pricingSummary: this.mapPricingSummary(listing),
    };

    // Add optional fields
    if (listing.merchantLocationKey) {
      offer.merchantLocationKey = listing.merchantLocationKey;
    }

    if (listing.storeCategoryNames?.length) {
      offer.storeCategoryNames = listing.storeCategoryNames;
    }

    // Add scheduled start/end times
    if (listing.scheduledStartTime) {
      offer.listingStartDate = listing.scheduledStartTime.toISOString();
    }
    if (listing.scheduledEndTime) {
      offer.listingEndDate = listing.scheduledEndTime.toISOString();
    }

    // Add policies if available
    if (listing.fulfillmentPolicyId) {
      offer.fulfillmentPolicyId = listing.fulfillmentPolicyId;
    }
    if (listing.paymentPolicyId) {
      offer.paymentPolicyId = listing.paymentPolicyId;
    }
    if (listing.returnPolicyId) {
      offer.returnPolicyId = listing.returnPolicyId;
    }

    return offer;
  }

  /**
   * Map condition to eBay format
   */
  private mapCondition(condition?: string, conditionId?: number): string {
    if (conditionId) {
      // Find by condition ID first (most accurate)
      const ebayCondition = Object.values(EBAY_CONDITIONS).find(c => c.id === conditionId);
      if (ebayCondition) return ebayCondition.value;
    }

    if (condition) {
      // Try to match by condition string
      const normalizedCondition = condition.toUpperCase().replace(/[^A-Z]/g, "_");
      if (Object.hasOwnProperty.call(EBAY_CONDITIONS, normalizedCondition)) {
        return normalizedCondition;
      }

      // Fallback mapping for common values
      const conditionMap: Record<string, string> = {
        "new": "NEW",
        "used": "USED_EXCELLENT",
        "refurbished": "CERTIFIED_REFURBISHED",
        "damaged": "FOR_PARTS_OR_NOT_WORKING",
        "excellent": "USED_EXCELLENT",
        "very good": "USED_VERY_GOOD",
        "good": "USED_GOOD",
        "fair": "USED_ACCEPTABLE",
        "poor": "FOR_PARTS_OR_NOT_WORKING"
      };

      const mapped = conditionMap[condition.toLowerCase()];
      if (mapped) return mapped;
    }

    // Default to used if no condition specified
    return "USED_EXCELLENT";
  }

  /**
   * Map listing format to eBay format
   */
  private mapListingFormat(format?: string): "FIXED_PRICE" | "AUCTION" {
    return format === "AUCTION" ? "AUCTION" : "FIXED_PRICE";
  }

  /**
   * Map listing duration to eBay format
   */
  private mapListingDuration(duration?: string): "DAYS_1" | "DAYS_3" | "DAYS_5" | "DAYS_7" | "DAYS_10" | "DAYS_30" | "GTC" {
    if (!duration) return "GTC";
    
    const durationMap: Record<string, "DAYS_1" | "DAYS_3" | "DAYS_5" | "DAYS_7" | "DAYS_10" | "DAYS_30" | "GTC"> = {
      "DAYS_1": "DAYS_1",
      "DAYS_3": "DAYS_3",
      "DAYS_5": "DAYS_5",
      "DAYS_7": "DAYS_7",
      "DAYS_10": "DAYS_10",
      "DAYS_30": "DAYS_30",
      "GTC": "GTC"
    };

    return durationMap[duration] || "GTC";
  }

  /**
   * Map pricing information to eBay format
   */
  private mapPricingSummary(listing: Listing) {
    const pricingSummary: EbayOffer["pricingSummary"] = {
      price: {
        value: listing.price.toString(),
        currency: "USD" // Default to USD, could be configurable
      }
    };

    // Add auction-specific pricing
    if (listing.listingFormat === "AUCTION") {
      if (listing.startPrice) {
        pricingSummary.auctionStartPrice = {
          value: listing.startPrice.toString(),
          currency: "USD"
        };
      }
      if (listing.reservePrice) {
        pricingSummary.auctionReservePrice = {
          value: listing.reservePrice.toString(),
          currency: "USD"
        };
      }
    }

    return pricingSummary;
  }

  /**
   * Map package information to eBay format
   */
  private mapPackageInfo(listing: Listing) {
    const packageInfo: EbayInventoryItem["packageWeightAndSize"] = {};

    if (listing.packageWeight) {
      packageInfo.weight = {
        value: parseFloat(listing.packageWeight.toString()),
        unit: "POUND" // Default to pounds, could be configurable
      };
    }

    if (listing.packageDimensions) {
      try {
        const dimensions = typeof listing.packageDimensions === 'string' 
          ? JSON.parse(listing.packageDimensions) 
          : listing.packageDimensions;
        
        if (dimensions.length && dimensions.width && dimensions.height) {
          packageInfo.dimensions = {
            length: parseFloat(dimensions.length.toString()),
            width: parseFloat(dimensions.width.toString()),
            height: parseFloat(dimensions.height.toString()),
            unit: dimensions.unit === "CM" ? "CENTIMETER" : "INCH"
          };
        }
      } catch (error) {
        console.warn("Failed to parse package dimensions:", error);
      }
    }

    return packageInfo;
  }

  /**
   * Extract image URLs from listing images
   */
  private extractImageUrls(images: any): string[] {
    if (!images) return [];

    try {
      const imageArray = Array.isArray(images) ? images : JSON.parse(images);
      return imageArray.filter((url: any) => typeof url === 'string' && url.startsWith('http'));
    } catch (error) {
      console.warn("Failed to parse listing images:", error);
      return [];
    }
  }

  /**
   * Map item specifics to eBay aspects format
   */
  private mapItemSpecifics(itemSpecifics: any): Record<string, string[]> {
    if (!itemSpecifics) return {};

    try {
      const specifics = typeof itemSpecifics === 'string' 
        ? JSON.parse(itemSpecifics) 
        : itemSpecifics;

      const aspects: Record<string, string[]> = {};

      for (const [key, value] of Object.entries(specifics)) {
        if (Array.isArray(value)) {
          // Already in array format
          aspects[key] = value.filter(v => typeof v === 'string');
        } else if (typeof value === 'string') {
          // Convert single value to array
          aspects[key] = [value];
        }
      }

      return aspects;
    } catch (error) {
      console.warn("Failed to parse item specifics:", error);
      return {};
    }
  }

  /**
   * Fetch eBay account policies
   */
  async fetchAccountPolicies(connection: MarketplaceConnection): Promise<EbayAccountPolicies> {
    const cacheKey = connection.userId;
    const cached = this.policiesCache.get(cacheKey);

    if (cached && cached.expiresAt > new Date()) {
      return cached.data;
    }

    try {
      const headers = {
        'Authorization': `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
      };

      const [fulfillmentResponse, paymentResponse, returnResponse] = await Promise.all([
        fetch(`${this.baseUrl}/sell/account/v1/fulfillment_policy`, { headers }),
        fetch(`${this.baseUrl}/sell/account/v1/payment_policy`, { headers }),
        fetch(`${this.baseUrl}/sell/account/v1/return_policy`, { headers })
      ]);

      const [fulfillmentData, paymentData, returnData] = await Promise.all([
        fulfillmentResponse.json(),
        paymentResponse.json(),
        returnResponse.json()
      ]);

      const policies: EbayAccountPolicies = {
        fulfillmentPolicies: fulfillmentData.fulfillmentPolicies || [],
        paymentPolicies: paymentData.paymentPolicies || [],
        returnPolicies: returnData.returnPolicies || []
      };

      // Cache the policies
      this.policiesCache.set(cacheKey, {
        data: policies,
        expiresAt: new Date(Date.now() + this.POLICIES_CACHE_TTL)
      });

      return policies;
    } catch (error) {
      console.error("Failed to fetch eBay account policies:", error);
      // Return empty policies on error
      return {
        fulfillmentPolicies: [],
        paymentPolicies: [],
        returnPolicies: []
      };
    }
  }

  /**
   * Get default policies from cached account policies
   */
  getDefaultPolicies(policies: EbayAccountPolicies): {
    fulfillmentPolicyId?: string;
    paymentPolicyId?: string;
    returnPolicyId?: string;
  } {
    const result: any = {};

    // Find default policies based on category type
    const defaultFulfillment = policies.fulfillmentPolicies.find(p => 
      p.categoryTypes.some(ct => ct.defaultValue)
    );
    if (defaultFulfillment) {
      result.fulfillmentPolicyId = defaultFulfillment.fulfillmentPolicyId;
    }

    const defaultPayment = policies.paymentPolicies.find(p => 
      p.categoryTypes.some(ct => ct.defaultValue)
    );
    if (defaultPayment) {
      result.paymentPolicyId = defaultPayment.paymentPolicyId;
    }

    const defaultReturn = policies.returnPolicies.find(p => 
      p.categoryTypes.some(ct => ct.defaultValue)
    );
    if (defaultReturn) {
      result.returnPolicyId = defaultReturn.returnPolicyId;
    }

    return result;
  }

  /**
   * Map eBay category to our internal category
   */
  mapCategoryToEbay(category?: string): string {
    const categoryMap: Record<string, string> = {
      "clothing": "11450", // Clothing, Shoes & Accessories > Clothing > Women's Clothing
      "shoes": "11504", // Clothing, Shoes & Accessories > Shoes > Women's Shoes
      "accessories": "169291", // Clothing, Shoes & Accessories > Women's Accessories
      "electronics": "58058", // Electronics
      "phones": "9355", // Cell Phones & Smartphones
      "computers": "58058", // Computers/Tablets & Networking
      "home": "11700", // Home & Garden
      "furniture": "3197", // Home & Garden > Furniture
      "decor": "20081", // Home & Garden > Home Décor
      "collectibles": "1", // Collectibles
      "toys": "220", // Toys & Hobbies
      "games": "1249", // Toys & Hobbies > Games
      "books": "267", // Books & Magazines
      "music": "11233", // Music
      "movies": "11232", // Movies & TV
      "sports": "888", // Sporting Goods
      "automotive": "6000", // eBay Motors
      "jewelry": "281", // Jewelry & Watches
      "health": "26395", // Health & Beauty
      "business": "12576" // Business & Industrial
    };

    return categoryMap[category?.toLowerCase() || ""] || "99"; // Other category as default
  }

  /**
   * Clear policies cache for a user
   */
  clearPoliciesCache(userId: string): void {
    this.policiesCache.delete(userId);
  }
}

export const ebayApiService = new EbayApiService();