import AsyncStorage from '@react-native-async-storage/async-storage';
import { flag } from '@omnilister/flags';
import { apiClient } from '@omnilister/api';

export interface QueuedItem {
  id: string;
  type: 'CREATE_LISTING' | 'UPDATE_LISTING' | 'DELETE_LISTING' | 'SYNC_INVENTORY';
  payload: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface OfflineQueueService {
  addItem(item: Omit<QueuedItem, 'id' | 'timestamp' | 'retryCount'>): Promise<void>;
  processQueue(): Promise<void>;
  clearQueue(): Promise<void>;
  getQueueStatus(): Promise<{ total: number; pending: number; failed: number }>;
}

class AsyncStorageOfflineQueue implements OfflineQueueService {
  private readonly QUEUE_KEY = 'omnilister_offline_queue';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [1000, 5000, 15000]; // 1s, 5s, 15s
  private isProcessing = false;

  async addItem(item: Omit<QueuedItem, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    if (!flag('mobile.offlineQueue')) {
      console.log('Offline queue disabled by feature flag');
      return;
    }

    try {
      const queuedItem: QueuedItem = {
        ...item,
        id: this.generateId(),
        timestamp: Date.now(),
        retryCount: 0,
      };

      const existingQueue = await this.getQueue();
      existingQueue.push(queuedItem);
      
      // Sort by priority and timestamp
      existingQueue.sort((a, b) => {
        const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return a.timestamp - b.timestamp;
      });

      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(existingQueue));
      console.log('Item added to offline queue:', queuedItem.id);
    } catch (error) {
      console.error('Error adding item to offline queue:', error);
    }
  }

  async processQueue(): Promise<void> {
    if (!flag('mobile.offlineQueue') || this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    console.log('Processing offline queue...');

    try {
      const queue = await this.getQueue();
      const processedItems: string[] = [];
      const failedItems: QueuedItem[] = [];

      for (const item of queue) {
        try {
          await this.processItem(item);
          processedItems.push(item.id);
          console.log('Successfully processed queue item:', item.id);
        } catch (error) {
          console.error('Failed to process queue item:', item.id, error);
          
          if (item.retryCount < item.maxRetries) {
            item.retryCount++;
            failedItems.push(item);
          } else {
            console.error('Max retries exceeded for item:', item.id);
            // Could send to dead letter queue or notify user
          }
        }
      }

      // Update queue with failed items
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(failedItems));
      
      console.log(`Processed ${processedItems.length} items, ${failedItems.length} failed`);
    } catch (error) {
      console.error('Error processing offline queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processItem(item: QueuedItem): Promise<void> {
    const delay = this.RETRY_DELAYS[Math.min(item.retryCount, this.RETRY_DELAYS.length - 1)];
    
    // Add delay for retries
    if (item.retryCount > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    switch (item.type) {
      case 'CREATE_LISTING':
        await apiClient.listings.create(item.payload);
        break;
      case 'UPDATE_LISTING':
        await apiClient.listings.update(item.payload.id, item.payload.data);
        break;
      case 'DELETE_LISTING':
        await apiClient.listings.delete(item.payload.id);
        break;
      case 'SYNC_INVENTORY':
        await apiClient.inventory.sync(item.payload);
        break;
      default:
        throw new Error(`Unknown queue item type: ${item.type}`);
    }
  }

  async clearQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.QUEUE_KEY);
      console.log('Offline queue cleared');
    } catch (error) {
      console.error('Error clearing offline queue:', error);
    }
  }

  async getQueueStatus(): Promise<{ total: number; pending: number; failed: number }> {
    try {
      const queue = await this.getQueue();
      const failed = queue.filter(item => item.retryCount >= item.maxRetries);
      
      return {
        total: queue.length,
        pending: queue.length - failed.length,
        failed: failed.length,
      };
    } catch (error) {
      console.error('Error getting queue status:', error);
      return { total: 0, pending: 0, failed: 0 };
    }
  }

  private async getQueue(): Promise<QueuedItem[]> {
    try {
      const queueData = await AsyncStorage.getItem(this.QUEUE_KEY);
      return queueData ? JSON.parse(queueData) : [];
    } catch (error) {
      console.error('Error getting queue from storage:', error);
      return [];
    }
  }

  private generateId(): string {
    return `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Auto-process queue when app comes online
  async startAutoProcessing(): Promise<void> {
    if (!flag('mobile.offlineQueue')) {
      return;
    }

    // Process queue on app start
    await this.processQueue();

    // Set up periodic processing
    setInterval(async () => {
      await this.processQueue();
    }, 30000); // Every 30 seconds
  }
}

// Export singleton instance
export const offlineQueueService = new AsyncStorageOfflineQueue();

// Export types for use in other modules
export type { OfflineQueueService, QueuedItem };
