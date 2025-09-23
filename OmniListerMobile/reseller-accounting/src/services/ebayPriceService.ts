import { 
  EbayConfig, 
  EbaySearchRequest, 
  EbaySearchResponse, 
  EbayItem,
  PriceAnalysis,
  ListingMetrics,
  PriceBucket,
  PriceTrendPoint,
  PriceOutlier,
  PriceRecommendation,
  EbayApiResponse,
  EbayError
} from '../types/ebay';

export class EbayPriceService {
  private config: EbayConfig;
  private baseUrl: string;
  private rateLimitDelay: number = 1000; // 1 second between requests

  constructor(config: EbayConfig) {
    this.config = config;
    this.baseUrl = config.sandbox 
      ? 'https://api.sandbox.ebay.com'
      : 'https://api.ebay.com';
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<EbayApiResponse<T>> {
    try {
      const url = new URL(`${this.baseUrl}${endpoint}`);
      
      // Add common parameters
      const searchParams = new URLSearchParams({
        'OPERATION-NAME': params.operation || 'findItemsAdvanced',
        'SERVICE-VERSION': '1.0.0',
        'SECURITY-APPNAME': this.config.appId,
        'RESPONSE-DATA-FORMAT': 'JSON',
        'REST-PAYLOAD': 'true',
        ...params
      });

      url.search = searchParams.toString();

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'OmniLister-PriceChecker/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`eBay API Error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      
      // Handle eBay API errors
      if (data.findItemsAdvancedResponse?.[0]?.errorMessage) {
        const error = data.findItemsAdvancedResponse[0].errorMessage[0];
        return {
          success: false,
          error: error.message?.[0] || 'Unknown eBay API error',
        };
      }

      return {
        success: true,
        data: data as T,
        rateLimitInfo: {
          remaining: parseInt(response.headers.get('X-RateLimit-Remaining') || '0'),
          resetTime: new Date(response.headers.get('X-RateLimit-Reset') || Date.now()),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Search for active listings
  async searchActiveListings(request: EbaySearchRequest): Promise<EbayApiResponse<EbaySearchResponse>> {
    const params: Record<string, any> = {
      operation: 'findItemsAdvanced',
      'keywords': request.query,
      'paginationInput.entriesPerPage': request.maxResults || 50,
      'paginationInput.pageNumber': request.pageNumber || 1,
      'sortOrder': request.sortOrder || 'BestMatch',
    };

    if (request.itemId) {
      params['itemId'] = request.itemId;
    }

    if (request.upc) {
      params['productId.@type'] = 'UPC';
      params['productId.#'] = request.upc;
    }

    if (request.categoryId) {
      params['categoryId'] = request.categoryId;
    }

    if (request.condition) {
      params['itemFilter(0).name'] = 'Condition';
      params['itemFilter(0).value'] = request.condition;
    }

    if (request.listingType) {
      params['itemFilter(1).name'] = 'ListingType';
      params['itemFilter(1).value'] = request.listingType;
    }

    // Only active listings
    params['itemFilter(2).name'] = 'ListingStatus';
    params['itemFilter(2).value'] = 'Active';

    const response = await this.makeRequest<EbaySearchResponse>('/services/search/FindingService/v1', params);
    
    if (response.success && response.data) {
      // Transform eBay response to our format
      const ebayResponse = response.data as any;
      const items = this.transformEbayItems(ebayResponse.findItemsAdvancedResponse?.[0]?.searchResult?.[0]?.item || []);
      
      const transformedData: EbaySearchResponse = {
        items,
        totalResults: parseInt(ebayResponse.findItemsAdvancedResponse?.[0]?.paginationOutput?.[0]?.totalEntries?.[0] || '0'),
        pageNumber: parseInt(ebayResponse.findItemsAdvancedResponse?.[0]?.paginationOutput?.[0]?.pageNumber?.[0] || '1'),
        totalPages: parseInt(ebayResponse.findItemsAdvancedResponse?.[0]?.paginationOutput?.[0]?.totalPages?.[0] || '1'),
        hasMorePages: ebayResponse.findItemsAdvancedResponse?.[0]?.paginationOutput?.[0]?.totalPages?.[0] > ebayResponse.findItemsAdvancedResponse?.[0]?.paginationOutput?.[0]?.pageNumber?.[0],
      };

      return {
        success: true,
        data: transformedData,
        rateLimitInfo: response.rateLimitInfo,
      };
    }

    return response;
  }

  // Search for completed/sold listings
  async searchSoldListings(request: EbaySearchRequest): Promise<EbayApiResponse<EbaySearchResponse>> {
    const params: Record<string, any> = {
      operation: 'findCompletedItems',
      'keywords': request.query,
      'paginationInput.entriesPerPage': request.maxResults || 50,
      'paginationInput.pageNumber': request.pageNumber || 1,
      'sortOrder': 'EndTimeSoonest',
    };

    if (request.itemId) {
      params['itemId'] = request.itemId;
    }

    if (request.upc) {
      params['productId.@type'] = 'UPC';
      params['productId.#'] = request.upc;
    }

    if (request.categoryId) {
      params['categoryId'] = request.categoryId;
    }

    if (request.condition) {
      params['itemFilter(0).name'] = 'Condition';
      params['itemFilter(0).value'] = request.condition;
    }

    // Only sold listings
    params['itemFilter(0).name'] = 'SoldItemsOnly';
    params['itemFilter(0).value'] = 'true';

    const response = await this.makeRequest<EbaySearchResponse>('/services/search/FindingService/v1', params);
    
    if (response.success && response.data) {
      // Transform eBay response to our format
      const ebayResponse = response.data as any;
      const items = this.transformEbayItems(ebayResponse.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item || []);
      
      const transformedData: EbaySearchResponse = {
        items,
        totalResults: parseInt(ebayResponse.findCompletedItemsResponse?.[0]?.paginationOutput?.[0]?.totalEntries?.[0] || '0'),
        pageNumber: parseInt(ebayResponse.findCompletedItemsResponse?.[0]?.paginationOutput?.[0]?.pageNumber?.[0] || '1'),
        totalPages: parseInt(ebayResponse.findCompletedItemsResponse?.[0]?.paginationOutput?.[0]?.totalPages?.[0] || '1'),
        hasMorePages: ebayResponse.findCompletedItemsResponse?.[0]?.paginationOutput?.[0]?.totalPages?.[0] > ebayResponse.findCompletedItemsResponse?.[0]?.paginationOutput?.[0]?.pageNumber?.[0],
      };

      return {
        success: true,
        data: transformedData,
        rateLimitInfo: response.rateLimitInfo,
      };
    }

    return response;
  }

  private transformEbayItems(ebayItems: any[]): EbayItem[] {
    return ebayItems.map(item => ({
      itemId: item.itemId?.[0] || '',
      title: item.title?.[0] || '',
      subtitle: item.subtitle?.[0],
      globalId: item.globalId?.[0] || '',
      categoryId: item.primaryCategory?.[0]?.categoryId?.[0] || '',
      categoryName: item.primaryCategory?.[0]?.categoryName?.[0] || '',
      galleryURL: item.galleryURL?.[0],
      viewItemURL: item.viewItemURL?.[0] || '',
      location: item.location?.[0] || '',
      country: item.country?.[0] || '',
      shippingInfo: {
        shippingServiceCost: item.shippingInfo?.[0]?.shippingServiceCost?.[0] ? {
          currencyId: item.shippingInfo[0].shippingServiceCost[0]['@currencyId'] || 'USD',
          value: parseFloat(item.shippingInfo[0].shippingServiceCost[0]['__value__'] || '0'),
        } : undefined,
        shippingType: item.shippingInfo?.[0]?.shippingType?.[0] || '',
        shipToLocations: item.shippingInfo?.[0]?.shipToLocations || [],
        expeditedShipping: item.shippingInfo?.[0]?.expeditedShipping?.[0] === 'true',
        oneDayShippingAvailable: item.shippingInfo?.[0]?.oneDayShippingAvailable?.[0] === 'true',
        handlingTime: parseInt(item.shippingInfo?.[0]?.handlingTime?.[0] || '0'),
      },
      sellingStatus: {
        currentPrice: {
          currencyId: item.sellingStatus?.[0]?.currentPrice?.[0]?.['@currencyId'] || 'USD',
          value: parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.['__value__'] || '0'),
        },
        convertedCurrentPrice: item.sellingStatus?.[0]?.convertedCurrentPrice?.[0] ? {
          currencyId: item.sellingStatus[0].convertedCurrentPrice[0]['@currencyId'] || 'USD',
          value: parseFloat(item.sellingStatus[0].convertedCurrentPrice[0]['__value__'] || '0'),
        } : undefined,
        bidCount: parseInt(item.sellingStatus?.[0]?.bidCount?.[0] || '0'),
        timeLeft: item.sellingStatus?.[0]?.timeLeft?.[0] || '',
        listingStatus: item.sellingStatus?.[0]?.listingStatus?.[0] as 'Active' | 'Completed' | 'Ended' || 'Active',
        sellingState: item.sellingStatus?.[0]?.sellingState?.[0] as any || 'Active',
        watchCount: parseInt(item.sellingStatus?.[0]?.watchCount?.[0] || '0'),
        buyItNowAvailable: item.sellingStatus?.[0]?.buyItNowAvailable?.[0] === 'true',
        minimumToBid: item.sellingStatus?.[0]?.minimumToBid?.[0] ? {
          currencyId: item.sellingStatus[0].minimumToBid[0]['@currencyId'] || 'USD',
          value: parseFloat(item.sellingStatus[0].minimumToBid[0]['__value__'] || '0'),
        } : undefined,
        reserveMet: item.sellingStatus?.[0]?.reserveMet?.[0] === 'true',
        secondChanceEligible: item.sellingStatus?.[0]?.secondChanceEligible?.[0] === 'true',
        listingType: item.sellingStatus?.[0]?.listingType?.[0] || '',
        gift: item.sellingStatus?.[0]?.gift?.[0] === 'true',
      },
      listingInfo: {
        bestOfferEnabled: item.listingInfo?.[0]?.bestOfferEnabled?.[0] === 'true',
        buyItNowAvailable: item.listingInfo?.[0]?.buyItNowAvailable?.[0] === 'true',
        startTime: item.listingInfo?.[0]?.startTime?.[0] || '',
        endTime: item.listingInfo?.[0]?.endTime?.[0] || '',
        listingType: item.listingInfo?.[0]?.listingType?.[0] || '',
        gift: item.listingInfo?.[0]?.gift?.[0] === 'true',
        watchCount: parseInt(item.listingInfo?.[0]?.watchCount?.[0] || '0'),
      },
      condition: item.condition?.[0] ? {
        conditionId: item.condition[0].conditionId?.[0] || '',
        conditionDisplayName: item.condition[0].conditionDisplayName?.[0] || '',
      } : undefined,
      primaryCategory: {
        categoryId: item.primaryCategory?.[0]?.categoryId?.[0] || '',
        categoryName: item.primaryCategory?.[0]?.categoryName?.[0] || '',
      },
      secondaryCategory: item.secondaryCategory?.[0] ? {
        categoryId: item.secondaryCategory[0].categoryId?.[0] || '',
        categoryName: item.secondaryCategory[0].categoryName?.[0] || '',
      } : undefined,
      itemSpecifics: item.itemSpecifics?.[0]?.NameValueList?.map((nv: any) => ({
        name: nv.Name?.[0] || '',
        value: nv.Value || [],
      })),
      productId: item.productId?.[0] ? {
        type: item.productId[0]['@type'] as 'ISBN' | 'UPC' | 'EAN' | 'ReferenceID',
        value: item.productId[0]['__value__'] || '',
      } : undefined,
    }));
  }

  // Analyze pricing data
  analyzePricing(activeItems: EbayItem[], soldItems: EbayItem[], query: string): PriceAnalysis {
    const activeMetrics = this.calculateListingMetrics(activeItems);
    const soldMetrics = this.calculateListingMetrics(soldItems);
    const priceDistribution = this.calculatePriceDistribution([...activeItems, ...soldItems]);
    const priceTrends = this.calculatePriceTrends(soldItems);
    const outliers = this.identifyOutliers([...activeItems, ...soldItems]);
    const recommendations = this.generatePriceRecommendations(activeMetrics, soldMetrics);

    return {
      query,
      timestamp: new Date(),
      activeListings: activeMetrics,
      soldListings: soldMetrics,
      priceDistribution,
      priceTrends,
      outliers,
      recommendations,
    };
  }

  private calculateListingMetrics(items: EbayItem[]): ListingMetrics {
    if (items.length === 0) {
      return {
        count: 0,
        averagePrice: 0,
        medianPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        standardDeviation: 0,
        priceRange: { low: 0, high: 0 },
      };
    }

    const prices = items.map(item => item.sellingStatus.currentPrice.value).sort((a, b) => a - b);
    const sum = prices.reduce((acc, price) => acc + price, 0);
    const average = sum / prices.length;
    const median = prices.length % 2 === 0 
      ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
      : prices[Math.floor(prices.length / 2)];

    const variance = prices.reduce((acc, price) => acc + Math.pow(price - average, 2), 0) / prices.length;
    const standardDeviation = Math.sqrt(variance);

    return {
      count: items.length,
      averagePrice: Math.round(average * 100) / 100,
      medianPrice: Math.round(median * 100) / 100,
      minPrice: prices[0],
      maxPrice: prices[prices.length - 1],
      standardDeviation: Math.round(standardDeviation * 100) / 100,
      priceRange: {
        low: Math.round((average - standardDeviation) * 100) / 100,
        high: Math.round((average + standardDeviation) * 100) / 100,
      },
    };
  }

  private calculatePriceDistribution(items: EbayItem[]): PriceBucket[] {
    if (items.length === 0) return [];

    const prices = items.map(item => item.sellingStatus.currentPrice.value);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min;
    const bucketCount = Math.min(10, Math.max(5, Math.ceil(Math.sqrt(items.length))));
    const bucketSize = range / bucketCount;

    const buckets: PriceBucket[] = [];
    for (let i = 0; i < bucketCount; i++) {
      const bucketMin = min + (i * bucketSize);
      const bucketMax = i === bucketCount - 1 ? max : min + ((i + 1) * bucketSize);
      const count = prices.filter(price => price >= bucketMin && (i === bucketCount - 1 ? price <= bucketMax : price < bucketMax)).length;
      
      buckets.push({
        range: `$${bucketMin.toFixed(2)} - $${bucketMax.toFixed(2)}`,
        min: bucketMin,
        max: bucketMax,
        count,
        percentage: Math.round((count / items.length) * 100),
      });
    }

    return buckets;
  }

  private calculatePriceTrends(soldItems: EbayItem[]): PriceTrendPoint[] {
    if (soldItems.length === 0) return [];

    // Group by date (simplified - in real implementation, you'd parse actual sale dates)
    const dateGroups: Record<string, number[]> = {};
    
    soldItems.forEach(item => {
      // For demo purposes, use listing end time as sale date
      const saleDate = new Date(item.listingInfo.endTime).toISOString().split('T')[0];
      if (!dateGroups[saleDate]) {
        dateGroups[saleDate] = [];
      }
      dateGroups[saleDate].push(item.sellingStatus.currentPrice.value);
    });

    return Object.entries(dateGroups)
      .map(([date, prices]) => {
        const sortedPrices = prices.sort((a, b) => a - b);
        const average = prices.reduce((acc, price) => acc + price, 0) / prices.length;
        const median = sortedPrices.length % 2 === 0 
          ? (sortedPrices[sortedPrices.length / 2 - 1] + sortedPrices[sortedPrices.length / 2]) / 2
          : sortedPrices[Math.floor(sortedPrices.length / 2)];

        return {
          date,
          averagePrice: Math.round(average * 100) / 100,
          medianPrice: Math.round(median * 100) / 100,
          count: prices.length,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private identifyOutliers(items: EbayItem[]): PriceOutlier[] {
    if (items.length < 3) return [];

    const prices = items.map(item => item.sellingStatus.currentPrice.value);
    const average = prices.reduce((acc, price) => acc + price, 0) / prices.length;
    const variance = prices.reduce((acc, price) => acc + Math.pow(price - average, 2), 0) / prices.length;
    const standardDeviation = Math.sqrt(variance);

    const outliers: PriceOutlier[] = [];
    const threshold = 2 * standardDeviation;

    items.forEach(item => {
      const price = item.sellingStatus.currentPrice.value;
      const deviation = Math.abs(price - average);
      
      if (deviation > threshold) {
        outliers.push({
          itemId: item.itemId,
          title: item.title,
          price,
          reason: price > average ? 'high' : 'low',
          deviation: Math.round((deviation / standardDeviation) * 100) / 100,
        });
      }
    });

    return outliers;
  }

  private generatePriceRecommendations(activeMetrics: ListingMetrics, soldMetrics: ListingMetrics): PriceRecommendation[] {
    const recommendations: PriceRecommendation[] = [];

    if (activeMetrics.count > 0 && soldMetrics.count > 0) {
      // Competitive pricing (between active median and sold average)
      const competitivePrice = (activeMetrics.medianPrice + soldMetrics.averagePrice) / 2;
      recommendations.push({
        type: 'competitive',
        price: Math.round(competitivePrice * 100) / 100,
        reasoning: 'Priced competitively between active listings and recent sales',
        confidence: 0.8,
      });

      // Premium pricing (above active average)
      const premiumPrice = activeMetrics.averagePrice * 1.1;
      recommendations.push({
        type: 'premium',
        price: Math.round(premiumPrice * 100) / 100,
        reasoning: 'Premium pricing for high-quality or unique items',
        confidence: 0.6,
      });

      // Budget pricing (below sold median)
      const budgetPrice = soldMetrics.medianPrice * 0.9;
      recommendations.push({
        type: 'budget',
        price: Math.round(budgetPrice * 100) / 100,
        reasoning: 'Budget pricing for quick sale',
        confidence: 0.7,
      });
    }

    return recommendations;
  }

  // Validate search input
  validateSearchInput(input: string): { isValid: boolean; type: string; error?: string } {
    const trimmed = input.trim();
    
    if (!trimmed) {
      return { isValid: false, type: 'empty', error: 'Please enter a search term' };
    }

    if (trimmed.length < 2) {
      return { isValid: false, type: 'too_short', error: 'Search term must be at least 2 characters' };
    }

    if (trimmed.length > 100) {
      return { isValid: false, type: 'too_long', error: 'Search term must be less than 100 characters' };
    }

    // Check if it's an eBay item ID
    if (/^\d{12}$/.test(trimmed)) {
      return { isValid: true, type: 'item_id' };
    }

    // Check if it's a UPC
    if (/^\d{12}$/.test(trimmed) || /^\d{8}$/.test(trimmed)) {
      return { isValid: true, type: 'upc' };
    }

    // Check if it's a SKU (alphanumeric)
    if (/^[A-Za-z0-9\-_]+$/.test(trimmed) && trimmed.length <= 20) {
      return { isValid: true, type: 'sku' };
    }

    // Default to text search
    return { isValid: true, type: 'text' };
  }
}
