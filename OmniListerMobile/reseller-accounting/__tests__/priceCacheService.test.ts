import { PriceCacheService } from '../src/services/priceCacheService';
import { PriceAnalysis } from '../src/types/ebay';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiRemove: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

describe('PriceCacheService', () => {
  const mockAnalysis: PriceAnalysis = {
    query: 'iPhone 13',
    timestamp: new Date(),
    activeListings: {
      count: 10,
      averagePrice: 800,
      medianPrice: 750,
      minPrice: 600,
      maxPrice: 1000,
      standardDeviation: 100,
      priceRange: { low: 700, high: 900 },
    },
    soldListings: {
      count: 15,
      averagePrice: 750,
      medianPrice: 700,
      minPrice: 500,
      maxPrice: 950,
      standardDeviation: 80,
      priceRange: { low: 670, high: 830 },
    },
    priceDistribution: [],
    priceTrends: [],
    outliers: [],
    recommendations: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCachedAnalysis', () => {
    it('should return null for non-existent cache', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      
      const result = await PriceCacheService.getCachedAnalysis('test query');
      expect(result).toBeNull();
    });

    it('should return cached analysis for valid cache', async () => {
      const cacheEntry = {
        id: 'price_cache_test_query',
        query: 'test query',
        analysis: mockAnalysis,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        hitCount: 0,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(cacheEntry));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

      const result = await PriceCacheService.getCachedAnalysis('test query');
      expect(result).toEqual(mockAnalysis);
      expect(AsyncStorage.setItem).toHaveBeenCalled(); // Should update hit count
    });

    it('should return null for expired cache', async () => {
      const expiredCacheEntry = {
        id: 'price_cache_test_query',
        query: 'test query',
        analysis: mockAnalysis,
        createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        expiresAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago (expired)
        hitCount: 0,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(expiredCacheEntry));
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValueOnce(undefined);

      const result = await PriceCacheService.getCachedAnalysis('test query');
      expect(result).toBeNull();
      expect(AsyncStorage.removeItem).toHaveBeenCalled();
    });
  });

  describe('cacheAnalysis', () => {
    it('should cache analysis successfully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce([]);

      await PriceCacheService.cacheAnalysis('test query', mockAnalysis);
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'price_cache_test_query',
        expect.stringContaining('"query":"test query"')
      );
    });

    it('should handle caching errors gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      // Should not throw
      await expect(PriceCacheService.cacheAnalysis('test query', mockAnalysis)).resolves.toBeUndefined();
    });
  });

  describe('getSearchHistory', () => {
    it('should return empty array for no history', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      
      const result = await PriceCacheService.getSearchHistory();
      expect(result).toEqual([]);
    });

    it('should return search history', async () => {
      const history = ['iPhone 13', 'MacBook Pro', 'AirPods'];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(history));
      
      const result = await PriceCacheService.getSearchHistory();
      expect(result).toEqual(history);
    });
  });

  describe('addToSearchHistory', () => {
    it('should add new query to history', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('[]');
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

      await PriceCacheService.addToSearchHistory('new query');
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'price_search_history',
        JSON.stringify(['new query'])
      );
    });

    it('should move existing query to front', async () => {
      const existingHistory = ['query1', 'query2', 'query3'];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(existingHistory));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

      await PriceCacheService.addToSearchHistory('query2');
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'price_search_history',
        JSON.stringify(['query2', 'query1', 'query3'])
      );
    });

    it('should limit history to 20 items', async () => {
      const longHistory = Array.from({ length: 25 }, (_, i) => `query${i}`);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(longHistory));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

      await PriceCacheService.addToSearchHistory('new query');
      
      const setItemCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const savedHistory = JSON.parse(setItemCall[1]);
      expect(savedHistory.length).toBe(20);
      expect(savedHistory[0]).toBe('new query');
    });
  });

  describe('getSavedQueries', () => {
    it('should return empty array for no saved queries', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      
      const result = await PriceCacheService.getSavedQueries();
      expect(result).toEqual([]);
    });

    it('should return saved queries', async () => {
      const savedQueries = [
        {
          id: '1',
          query: 'iPhone 13',
          name: 'iPhone 13 Search',
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
          useCount: 5,
        }
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(savedQueries));
      
      const result = await PriceCacheService.getSavedQueries();
      expect(result).toEqual(savedQueries);
    });
  });

  describe('saveQuery', () => {
    it('should save new query', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('[]');
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

      await PriceCacheService.saveQuery('test query', 'Test Name');
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'saved_price_queries',
        expect.stringContaining('"query":"test query"')
      );
    });
  });

  describe('updateQueryUsage', () => {
    it('should update query usage count', async () => {
      const savedQueries = [
        {
          id: '1',
          query: 'iPhone 13',
          name: 'iPhone 13 Search',
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
          useCount: 5,
        }
      ];
      
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(savedQueries));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

      await PriceCacheService.updateQueryUsage('1');
      
      const setItemCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const updatedQueries = JSON.parse(setItemCall[1]);
      expect(updatedQueries[0].useCount).toBe(6);
    });

    it('should handle non-existent query ID', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('[]');
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

      await PriceCacheService.updateQueryUsage('non-existent');
      
      const setItemCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const updatedQueries = JSON.parse(setItemCall[1]);
      expect(updatedQueries).toEqual([]);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      const cacheKeys = ['price_cache_query1', 'price_cache_query2'];
      const cacheEntries = [
        JSON.stringify({
          id: 'price_cache_query1',
          query: 'query1',
          analysis: mockAnalysis,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          hitCount: 5,
        }),
        JSON.stringify({
          id: 'price_cache_query2',
          query: 'query2',
          analysis: mockAnalysis,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          hitCount: 3,
        }),
      ];

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce(cacheKeys);
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(cacheEntries[0])
        .mockResolvedValueOnce(cacheEntries[1]);

      const result = await PriceCacheService.getCacheStats();
      
      expect(result.totalEntries).toBe(2);
      expect(result.hitRate).toBe(4); // (5 + 3) / 2
      expect(result.oldestEntry).toBeInstanceOf(Date);
      expect(result.newestEntry).toBeInstanceOf(Date);
    });

    it('should handle empty cache', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce([]);

      const result = await PriceCacheService.getCacheStats();
      
      expect(result.totalEntries).toBe(0);
      expect(result.hitRate).toBe(0);
      expect(result.oldestEntry).toBeNull();
      expect(result.newestEntry).toBeNull();
    });
  });

  describe('clearAllCache', () => {
    it('should clear all cache entries', async () => {
      const cacheKeys = ['price_cache_query1', 'price_cache_query2'];
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce(cacheKeys);
      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValueOnce(undefined);

      await PriceCacheService.clearAllCache();
      
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(cacheKeys);
    });
  });
});
