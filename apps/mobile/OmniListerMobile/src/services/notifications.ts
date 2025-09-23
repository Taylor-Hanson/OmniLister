import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { flag } from '@omnilister/flags';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface NotificationService {
  registerForPushNotifications(): Promise<string | null>;
  sendLocalNotification(title: string, body: string): Promise<void>;
  scheduleNotification(title: string, body: string, trigger: Date): Promise<void>;
  cancelAllNotifications(): Promise<void>;
}

class ExpoNotificationService implements NotificationService {
  private expoPushToken: string | null = null;

  async registerForPushNotifications(): Promise<string | null> {
    // Check if feature is enabled
    if (!flag('mobile.pushNotifications')) {
      console.log('Push notifications disabled by feature flag');
      return null;
    }

    if (!Device.isDevice) {
      console.log('Must use physical device for push notifications');
      return null;
    }

    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }

      // Get the push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PROJECT_ID || 'your-project-id-here',
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

      return this.expoPushToken;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  async sendLocalNotification(title: string, body: string): Promise<void> {
    if (!flag('mobile.pushNotifications')) {
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { timestamp: Date.now() },
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  }

  async scheduleNotification(title: string, body: string, trigger: Date): Promise<void> {
    if (!flag('mobile.pushNotifications')) {
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { timestamp: Date.now() },
        },
        trigger: { date: trigger },
      });
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling notifications:', error);
    }
  }

  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }
}

// Export singleton instance
export const notificationService = new ExpoNotificationService();

// Export types for use in other modules
export type { NotificationService };
