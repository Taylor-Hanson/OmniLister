import { PriceCacheEntry, PriceAnalysis } from '../types/ebay';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class PriceCacheService {
  private static readonly CACHE_PREFIX = 'price_cache_';
  private static readonly CACHE_EXPIRY_HOURS = 1;
  private static readonly MAX_CACHE_SIZE = 100;

  // Generate cache key from query
  private static generateCacheKey(query: string): string {
    return `${this.CACHE_PREFIX}${query.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  }

  // Get cached price analysis
  static async getCachedAnalysis(query: string): Promise<PriceAnalysis | null> {
    try {
      const cacheKey = this.generateCacheKey(query);
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (!cachedData) {
        return null;
      }

      const entry: PriceCacheEntry = JSON.parse(cachedData);
      
      // Check if cache is expired
      if (new Date() > new Date(entry.expiresAt)) {
        await this.removeCachedAnalysis(query);
        return null;
      }

      // Update hit count
      entry.hitCount++;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));

      return entry.analysis;
    } catch (error) {
      console.error('Error getting cached analysis:', error);
      return null;
    }
  }

  // Cache price analysis
  static async cacheAnalysis(query: string, analysis: PriceAnalysis): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(query);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.CACHE_EXPIRY_HOURS);

      const entry: PriceCacheEntry = {
        id: cacheKey,
        query,
        analysis,
        createdAt: new Date(),
        expiresAt,
        hitCount: 0,
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));
      
      // Clean up old cache entries
      await this.cleanupExpiredEntries();
    } catch (error) {
      console.error('Error caching analysis:', error);
    }
  }

  // Remove cached analysis
  static async removeCachedAnalysis(query: string): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(query);
      await AsyncStorage.removeItem(cacheKey);
    } catch (error) {
      console.error('Error removing cached analysis:', error);
    }
  }

  // Get cache statistics
  static async getCacheStats(): Promise<{
    totalEntries: number;
    hitRate: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      let totalEntries = 0;
      let totalHits = 0;
      let oldestDate: Date | null = null;
      let newestDate: Date | null = null;

      for (const key of cacheKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const entry: PriceCacheEntry = JSON.parse(data);
          totalEntries++;
          totalHits += entry.hitCount;
          
          const entryDate = new Date(entry.createdAt);
          if (!oldestDate || entryDate < oldestDate) {
            oldestDate = entryDate;
          }
          if (!newestDate || entryDate > newestDate) {
            newestDate = entryDate;
          }
        }
      }

      return {
        totalEntries,
        hitRate: totalEntries > 0 ? totalHits / totalEntries : 0,
        oldestEntry: oldestDate,
        newestEntry: newestDate,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalEntries: 0,
        hitRate: 0,
        oldestEntry: null,
        newestEntry: null,
      };
    }
  }

  // Clear all cache entries
  static async clearAllCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  // Clean up expired entries
  private static async cleanupExpiredEntries(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      const expiredKeys: string[] = [];
      const entries: Array<{ key: string; entry: PriceCacheEntry }> = [];

      // Check for expired entries and collect all entries for size management
      for (const key of cacheKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const entry: PriceCacheEntry = JSON.parse(data);
          
          if (new Date() > new Date(entry.expiresAt)) {
            expiredKeys.push(key);
          } else {
            entries.push({ key, entry });
          }
        }
      }

      // Remove expired entries
      if (expiredKeys.length > 0) {
        await AsyncStorage.multiRemove(expiredKeys);
      }

      // If we have too many entries, remove the oldest ones
      if (entries.length > this.MAX_CACHE_SIZE) {
        entries.sort((a, b) => new Date(a.entry.createdAt).getTime() - new Date(b.entry.createdAt).getTime());
        const keysToRemove = entries.slice(0, entries.length - this.MAX_CACHE_SIZE).map(e => e.key);
        await AsyncStorage.multiRemove(keysToRemove);
      }
    } catch (error) {
      console.error('Error cleaning up cache:', error);
    }
  }

  // Get recent search history
  static async getSearchHistory(): Promise<string[]> {
    try {
      const historyData = await AsyncStorage.getItem('price_search_history');
      return historyData ? JSON.parse(historyData) : [];
    } catch (error) {
      console.error('Error getting search history:', error);
      return [];
    }
  }

  // Add to search history
  static async addToSearchHistory(query: string): Promise<void> {
    try {
      const history = await this.getSearchHistory();
      const trimmedQuery = query.trim();
      
      // Remove if already exists
      const filteredHistory = history.filter((item: string) => item !== trimmedQuery);
      
      // Add to beginning
      filteredHistory.unshift(trimmedQuery);
      
      // Keep only last 20 searches
      const limitedHistory = filteredHistory.slice(0, 20);
      
      await AsyncStorage.setItem('price_search_history', JSON.stringify(limitedHistory));
    } catch (error) {
      console.error('Error adding to search history:', error);
    }
  }

  // Clear search history
  static async clearSearchHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem('price_search_history');
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  }

  // Get saved queries
  static async getSavedQueries(): Promise<Array<{ id: string; query: string; name: string; createdAt: Date; lastUsed: Date; useCount: number }>> {
    try {
      const savedData = await AsyncStorage.getItem('saved_price_queries');
      return savedData ? JSON.parse(savedData) : [];
    } catch (error) {
      console.error('Error getting saved queries:', error);
      return [];
    }
  }

  // Save a query
  static async saveQuery(query: string, name: string): Promise<void> {
    try {
      const savedQueries = await this.getSavedQueries();
      const newQuery = {
        id: Date.now().toString(),
        query: query.trim(),
        name: name.trim(),
        createdAt: new Date(),
        lastUsed: new Date(),
        useCount: 1,
      };
      
      savedQueries.push(newQuery);
      await AsyncStorage.setItem('saved_price_queries', JSON.stringify(savedQueries));
    } catch (error) {
      console.error('Error saving query:', error);
    }
  }

  // Update query usage
  static async updateQueryUsage(queryId: string): Promise<void> {
    try {
      const savedQueries = await this.getSavedQueries();
      const queryIndex = savedQueries.findIndex(q => q.id === queryId);
      
      if (queryIndex !== -1) {
        savedQueries[queryIndex].lastUsed = new Date();
        savedQueries[queryIndex].useCount++;
        await AsyncStorage.setItem('saved_price_queries', JSON.stringify(savedQueries));
      }
    } catch (error) {
      console.error('Error updating query usage:', error);
    }
  }

  // Delete saved query
  static async deleteSavedQuery(queryId: string): Promise<void> {
    try {
      const savedQueries = await this.getSavedQueries();
      const filteredQueries = savedQueries.filter(q => q.id !== queryId);
      await AsyncStorage.setItem('saved_price_queries', JSON.stringify(filteredQueries));
    } catch (error) {
      console.error('Error deleting saved query:', error);
    }
  }
}
