// Enhanced Notification Service - Push notifications and re-engagement

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export interface NotificationData {
  type: 'sale' | 'offer' | 'listing' | 'reminder' | 'promotion' | 'system';
  title: string;
  body: string;
  data?: any;
  scheduledTime?: Date;
}

export interface NotificationSettings {
  sales: boolean;
  offers: boolean;
  listings: boolean;
  reminders: boolean;
  promotions: boolean;
  system: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string; // HH:MM format
  };
}

class NotificationService {
  private expoPushToken: string | null = null;
  private settings: NotificationSettings = {
    sales: true,
    offers: true,
    listings: true,
    reminders: true,
    promotions: false,
    system: true,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
  };

  // Initialize notification service
  async initialize() {
    try {
      // Configure notification behavior
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // Request permissions
      await this.requestPermissions();
      
      // Register for push notifications
      await this.registerForPushNotificationsAsync();
      
      // Set up notification categories
      await this.setupNotificationCategories();
      
      console.log('Notification service initialized');
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  // Request notification permissions
  private async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return false;
    }
  }

  // Register for push notifications
  private async registerForPushNotificationsAsync(): Promise<void> {
    try {
      if (!Device.isDevice) {
        console.log('Must use physical device for push notifications');
        return;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-project-id', // Replace with actual project ID
      });

      this.expoPushToken = token.data;
      console.log('Expo push token:', this.expoPushToken);

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
    } catch (error) {
      console.error('Failed to register for push notifications:', error);
    }
  }

  // Set up notification categories
  private async setupNotificationCategories(): Promise<void> {
    try {
      await Notifications.setNotificationCategoryAsync('sale', [
        {
          identifier: 'VIEW_SALE',
          buttonTitle: 'View Sale',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'SHARE_SALE',
          buttonTitle: 'Share',
          options: {
            opensAppToForeground: false,
          },
        },
      ]);

      await Notifications.setNotificationCategoryAsync('offer', [
        {
          identifier: 'ACCEPT_OFFER',
          buttonTitle: 'Accept',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'DECLINE_OFFER',
          buttonTitle: 'Decline',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: 'COUNTER_OFFER',
          buttonTitle: 'Counter',
          options: {
            opensAppToForeground: true,
          },
        },
      ]);

      await Notifications.setNotificationCategoryAsync('listing', [
        {
          identifier: 'VIEW_LISTING',
          buttonTitle: 'View Listing',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'EDIT_LISTING',
          buttonTitle: 'Edit',
          options: {
            opensAppToForeground: true,
          },
        },
      ]);
    } catch (error) {
      console.error('Failed to setup notification categories:', error);
    }
  }

  // Send local notification
  async sendLocalNotification(notification: NotificationData): Promise<void> {
    try {
      // Check if notification type is enabled
      if (!this.settings[notification.type]) {
        return;
      }

      // Check quiet hours
      if (this.settings.quietHours.enabled && this.isQuietHours()) {
        return;
      }

      const notificationContent = {
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        categoryIdentifier: notification.type,
        sound: 'default',
      };

      if (notification.scheduledTime) {
        await Notifications.scheduleNotificationAsync({
          content: notificationContent,
          trigger: {
            date: notification.scheduledTime,
          },
        });
      } else {
        await Notifications.scheduleNotificationAsync({
          content: notificationContent,
          trigger: null,
        });
      }
    } catch (error) {
      console.error('Failed to send local notification:', error);
    }
  }

  // Send push notification
  async sendPushNotification(notification: NotificationData, expoPushToken: string): Promise<void> {
    try {
      const message = {
        to: expoPushToken,
        sound: 'default',
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        categoryId: notification.type,
      };

      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  }

  // Schedule reminder notification
  async scheduleReminder(title: string, body: string, scheduledTime: Date): Promise<void> {
    try {
      await this.sendLocalNotification({
        type: 'reminder',
        title,
        body,
        scheduledTime,
      });
    } catch (error) {
      console.error('Failed to schedule reminder:', error);
    }
  }

  // Send sale notification
  async sendSaleNotification(saleData: any): Promise<void> {
    try {
      await this.sendLocalNotification({
        type: 'sale',
        title: '🎉 New Sale!',
        body: `${saleData.item} sold for $${saleData.price} on ${saleData.marketplace}`,
        data: saleData,
      });
    } catch (error) {
      console.error('Failed to send sale notification:', error);
    }
  }

  // Send offer notification
  async sendOfferNotification(offerData: any): Promise<void> {
    try {
      await this.sendLocalNotification({
        type: 'offer',
        title: '💰 New Offer Received',
        body: `$${offerData.amount} offer for ${offerData.item} on ${offerData.marketplace}`,
        data: offerData,
      });
    } catch (error) {
      console.error('Failed to send offer notification:', error);
    }
  }

  // Send listing notification
  async sendListingNotification(listingData: any): Promise<void> {
    try {
      await this.sendLocalNotification({
        type: 'listing',
        title: '📝 Listing Update',
        body: `${listingData.item} status: ${listingData.status}`,
        data: listingData,
      });
    } catch (error) {
      console.error('Failed to send listing notification:', error);
    }
  }

  // Send promotion notification
  async sendPromotionNotification(promotionData: any): Promise<void> {
    try {
      await this.sendLocalNotification({
        type: 'promotion',
        title: promotionData.title,
        body: promotionData.body,
        data: promotionData,
      });
    } catch (error) {
      console.error('Failed to send promotion notification:', error);
    }
  }

  // Send system notification
  async sendSystemNotification(title: string, body: string, data?: any): Promise<void> {
    try {
      await this.sendLocalNotification({
        type: 'system',
        title,
        body,
        data,
      });
    } catch (error) {
      console.error('Failed to send system notification:', error);
    }
  }

  // Check if current time is within quiet hours
  private isQuietHours(): boolean {
    if (!this.settings.quietHours.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const startTime = this.parseTime(this.settings.quietHours.start);
    const endTime = this.parseTime(this.settings.quietHours.end);

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  // Parse time string (HH:MM) to minutes
  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Update notification settings
  async updateSettings(newSettings: Partial<NotificationSettings>): Promise<void> {
    try {
      this.settings = { ...this.settings, ...newSettings };
      // In real app, save to storage
      console.log('Notification settings updated:', this.settings);
    } catch (error) {
      console.error('Failed to update notification settings:', error);
    }
  }

  // Get notification settings
  getSettings(): NotificationSettings {
    return this.settings;
  }

  // Get expo push token
  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  // Cancel all notifications
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  // Cancel specific notification
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  // Get notification history
  async getNotificationHistory(): Promise<any[]> {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      return notifications;
    } catch (error) {
      console.error('Failed to get notification history:', error);
      return [];
    }
  }

  // Cleanup
  cleanup() {
    // Remove event listeners and cleanup resources
    console.log('Notification service cleaned up');
  }
}

export const notificationService = new NotificationService();