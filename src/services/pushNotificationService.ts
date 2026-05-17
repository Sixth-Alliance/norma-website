/**
 * Browser Push Notification Service
 * Handles permission requests, service worker registration, and real-time notifications
 */

import { logger } from '@/src/utils/logger';

export interface PushNotificationOptions {
  title: string;
  message: string;
  icon?: string;
  badge?: string;
  orderCode?: string;
  notificationId?: string;
  relativeTime?: string;
}

class PushNotificationService {
  private static instance: PushNotificationService;
  private isServiceWorkerRegistered = false;
  private registration: ServiceWorkerRegistration | null = null;

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Request permission for browser notifications
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      logger.warn('This browser does not support notifications');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  /**
   * Check if browser notifications are supported and enabled
   */
  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  /**
   * Check if notifications are currently enabled
   */
  isEnabled(): boolean {
    return this.isSupported() && Notification.permission === 'granted';
  }

  /**
   * Register service worker for push notifications
   */
  async registerServiceWorker(): Promise<void> {
    if (!this.isSupported()) {
      logger.warn('Push notifications not supported');
      return;
    }

    try {
  this.registration = await navigator.serviceWorker.register('/sw.js');
  this.isServiceWorkerRegistered = true;
    } catch (error) {
      logger.error('❌ Service Worker registration failed:', error);
    }
  }

  /**
   * Show a browser notification with relative time
   */
  async showNotification(options: PushNotificationOptions): Promise<void> {
    if (!this.isEnabled()) {
      logger.warn('Notifications not enabled');
      return;
    }

    try {
      const notificationOptions: NotificationOptions & { vibrate?: number[] } = {
        body: options.message,
        icon: options.icon || '/android-chrome-192x192.png',
        badge: options.badge || '/favicon-32x32.png',
        tag: options.notificationId || 'norma-notification',
        requireInteraction: true,
        silent: false,
        vibrate: [200, 100, 200],
        data: {
          orderCode: options.orderCode,
          notificationId: options.notificationId,
          timestamp: Date.now(),
          relativeTime: options.relativeTime || 'Just now'
        }
      };

      // Add relative time to the title
      const titleWithTime = options.relativeTime 
        ? `${options.title} • ${options.relativeTime}`
        : options.title;

      if (this.registration) {
        await this.registration.showNotification(titleWithTime, notificationOptions);
      } else {
        new Notification(titleWithTime, notificationOptions);
      }

  // Notification shown (silent)
    } catch (error) {
      logger.error('❌ Failed to show notification:', error);
    }
  }

  /**
   * Calculate relative time string from timestamp
   */
  getRelativeTime(timestamp: string | Date): string {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMs = now.getTime() - notificationTime.getTime();
    const diffInSeconds = Math.floor(diffInMs / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} min${diffInMinutes > 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    } else {
      return notificationTime.toLocaleDateString();
    }
  }

  /**
   * Initialize push notification service
   */
  async initialize(): Promise<boolean> {
    if (!this.isSupported()) {
      logger.warn('Push notifications not supported in this browser');
      return false;
    }

    // Register service worker
    await this.registerServiceWorker();

    // Request permission if not already granted
    const permission = await this.requestPermission();
    
    if (permission === 'granted') {
      return true;
    } else {
      logger.warn('❌ Push notification permission denied');
      return false;
    }
  }

  /**
   * Show order-related notification
   */
  async showOrderNotification(
    title: string,
    message: string,
    orderCode?: string,
    relativeTime?: string
  ): Promise<void> {
    await this.showNotification({
      title,
      message,
      orderCode,
      relativeTime: relativeTime || 'Just now',
      notificationId: `order-${orderCode || Date.now()}`
    });
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    if (!this.registration) return;

    try {
      const notifications = await this.registration.getNotifications();
      notifications.forEach(notification => notification.close());
  // All notifications cleared
    } catch (error) {
      logger.error('❌ Failed to clear notifications:', error);
    }
  }
}

export default PushNotificationService;