import { EbayPriceService } from '../src/services/ebayPriceService';
import { EbayConfig } from '../src/types/ebay';

// Mock fetch
global.fetch = jest.fn();

describe('EbayPriceService', () => {
  let service: EbayPriceService;
  const mockConfig: EbayConfig = {
    appId: 'test-app-id',
    sandbox: true,
    baseUrl: 'https://api.sandbox.ebay.com',
  };

  beforeEach(() => {
    service = new EbayPriceService(mockConfig);
    jest.clearAllMocks();
  });

  describe('validateSearchInput', () => {
    it('should validate empty input', () => {
      const result = service.validateSearchInput('');
      expect(result.isValid).toBe(false);
      expect(result.type).toBe('empty');
      expect(result.error).toBe('Please enter a search term');
    });

    it('should validate too short input', () => {
      const result = service.validateSearchInput('a');
      expect(result.isValid).toBe(false);
      expect(result.type).toBe('too_short');
      expect(result.error).toBe('Search term must be at least 2 characters');
    });

    it('should validate too long input', () => {
      const longInput = 'a'.repeat(101);
      const result = service.validateSearchInput(longInput);
      expect(result.isValid).toBe(false);
      expect(result.type).toBe('too_long');
      expect(result.error).toBe('Search term must be less than 100 characters');
    });

    it('should validate eBay item ID', () => {
      const result = service.validateSearchInput('123456789012');
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('item_id');
    });

    it('should validate UPC', () => {
      const result = service.validateSearchInput('123456789012');
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('upc');
    });

    it('should validate SKU', () => {
      const result = service.validateSearchInput('ABC123-DEF');
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('sku');
    });

    it('should validate text search', () => {
      const result = service.validateSearchInput('iPhone 13 Pro');
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('text');
    });
  });

  describe('calculateListingMetrics', () => {
    it('should calculate metrics for empty array', () => {
      const result = service['calculateListingMetrics']([]);
      expect(result.count).toBe(0);
      expect(result.averagePrice).toBe(0);
      expect(result.medianPrice).toBe(0);
    });

    it('should calculate metrics for single item', () => {
      const mockItems = [{
        sellingStatus: { currentPrice: { value: 100 } }
      }] as any[];
      
      const result = service['calculateListingMetrics'](mockItems);
      expect(result.count).toBe(1);
      expect(result.averagePrice).toBe(100);
      expect(result.medianPrice).toBe(100);
      expect(result.minPrice).toBe(100);
      expect(result.maxPrice).toBe(100);
    });

    it('should calculate metrics for multiple items', () => {
      const mockItems = [
        { sellingStatus: { currentPrice: { value: 100 } } },
        { sellingStatus: { currentPrice: { value: 200 } } },
        { sellingStatus: { currentPrice: { value: 300 } } },
      ] as any[];
      
      const result = service['calculateListingMetrics'](mockItems);
      expect(result.count).toBe(3);
      expect(result.averagePrice).toBe(200);
      expect(result.medianPrice).toBe(200);
      expect(result.minPrice).toBe(100);
      expect(result.maxPrice).toBe(300);
    });

    it('should calculate metrics for even number of items', () => {
      const mockItems = [
        { sellingStatus: { currentPrice: { value: 100 } } },
        { sellingStatus: { currentPrice: { value: 200 } } },
        { sellingStatus: { currentPrice: { value: 300 } } },
        { sellingStatus: { currentPrice: { value: 400 } } },
      ] as any[];
      
      const result = service['calculateListingMetrics'](mockItems);
      expect(result.medianPrice).toBe(250); // (200 + 300) / 2
    });
  });

  describe('calculatePriceDistribution', () => {
    it('should return empty array for no items', () => {
      const result = service['calculatePriceDistribution']([]);
      expect(result).toEqual([]);
    });

    it('should create price buckets', () => {
      const mockItems = [
        { sellingStatus: { currentPrice: { value: 10 } } },
        { sellingStatus: { currentPrice: { value: 20 } } },
        { sellingStatus: { currentPrice: { value: 30 } } },
        { sellingStatus: { currentPrice: { value: 40 } } },
        { sellingStatus: { currentPrice: { value: 50 } } },
      ] as any[];
      
      const result = service['calculatePriceDistribution'](mockItems);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('range');
      expect(result[0]).toHaveProperty('count');
      expect(result[0]).toHaveProperty('percentage');
    });
  });

  describe('identifyOutliers', () => {
    it('should return empty array for less than 3 items', () => {
      const mockItems = [
        { sellingStatus: { currentPrice: { value: 100 } } },
        { sellingStatus: { currentPrice: { value: 200 } } },
      ] as any[];
      
      const result = service['identifyOutliers'](mockItems);
      expect(result).toEqual([]);
    });

    it('should identify high outliers', () => {
      const mockItems = [
        { itemId: '1', title: 'Item 1', sellingStatus: { currentPrice: { value: 100 } } },
        { itemId: '2', title: 'Item 2', sellingStatus: { currentPrice: { value: 100 } } },
        { itemId: '3', title: 'Item 3', sellingStatus: { currentPrice: { value: 100 } } },
        { itemId: '4', title: 'Item 4', sellingStatus: { currentPrice: { value: 1000 } } }, // Outlier
      ] as any[];
      
      const result = service['identifyOutliers'](mockItems);
      expect(result.length).toBe(1);
      expect(result[0].reason).toBe('high');
      expect(result[0].itemId).toBe('4');
    });

    it('should identify low outliers', () => {
      const mockItems = [
        { itemId: '1', title: 'Item 1', sellingStatus: { currentPrice: { value: 100 } } },
        { itemId: '2', title: 'Item 2', sellingStatus: { currentPrice: { value: 100 } } },
        { itemId: '3', title: 'Item 3', sellingStatus: { currentPrice: { value: 100 } } },
        { itemId: '4', title: 'Item 4', sellingStatus: { currentPrice: { value: 10 } } }, // Outlier
      ] as any[];
      
      const result = service['identifyOutliers'](mockItems);
      expect(result.length).toBe(1);
      expect(result[0].reason).toBe('low');
      expect(result[0].itemId).toBe('4');
    });
  });

  describe('generatePriceRecommendations', () => {
    it('should generate recommendations with valid metrics', () => {
      const activeMetrics = {
        count: 10,
        averagePrice: 100,
        medianPrice: 95,
        minPrice: 80,
        maxPrice: 120,
        standardDeviation: 10,
        priceRange: { low: 90, high: 110 },
      };

      const soldMetrics = {
        count: 15,
        averagePrice: 90,
        medianPrice: 85,
        minPrice: 70,
        maxPrice: 110,
        standardDeviation: 8,
        priceRange: { low: 82, high: 98 },
      };

      const result = service['generatePriceRecommendations'](activeMetrics, soldMetrics);
      expect(result.length).toBe(3);
      expect(result[0].type).toBe('competitive');
      expect(result[1].type).toBe('premium');
      expect(result[2].type).toBe('budget');
    });

    it('should return empty array for zero counts', () => {
      const activeMetrics = {
        count: 0,
        averagePrice: 0,
        medianPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        standardDeviation: 0,
        priceRange: { low: 0, high: 0 },
      };

      const soldMetrics = {
        count: 0,
        averagePrice: 0,
        medianPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        standardDeviation: 0,
        priceRange: { low: 0, high: 0 },
      };

      const result = service['generatePriceRecommendations'](activeMetrics, soldMetrics);
      expect(result).toEqual([]);
    });
  });

  describe('searchActiveListings', () => {
    it('should handle API errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      const result = await service.searchActiveListings({ query: 'test' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('eBay API Error');
    });

    it('should handle successful response', async () => {
      const mockResponse = {
        findItemsAdvancedResponse: [{
          searchResult: [{
            item: [{
              itemId: ['123'],
              title: ['Test Item'],
              sellingStatus: [{
                currentPrice: [{ '@currencyId': 'USD', '__value__': '100.00' }]
              }]
            }]
          }],
          paginationOutput: [{
            totalEntries: ['1'],
            pageNumber: ['1'],
            totalPages: ['1']
          }]
        }]
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.searchActiveListings({ query: 'test' });
      expect(result.success).toBe(true);
      expect(result.data?.items.length).toBe(1);
      expect(result.data?.items[0].itemId).toBe('123');
    });
  });
});
