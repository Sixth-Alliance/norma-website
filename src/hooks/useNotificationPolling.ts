/**
 * React Hook for Real-time Notification Polling
 * Polls for new notifications and shows browser push notifications
 */

import { useEffect, useRef, useCallback } from 'react';
import { useNotificationStore } from '@/src/store/NotificationStore';
import { getNotifications, getUnreadNotificationCount } from '@/src/app/api/action';
import PushNotificationService from '@/src/services/pushNotificationService';
import { logger } from '@/src/utils/logger';

interface UseNotificationPollingOptions {
  intervalMs?: number;
  enableBrowserNotifications?: boolean;
  isActive?: boolean;
}

interface StoredNotification {
  id: string;
  created_at: string;
}

export const useNotificationPolling = ({
  intervalMs = 30000, // Poll every 30 seconds
  enableBrowserNotifications = true,
  isActive = true
}: UseNotificationPollingOptions = {}) => {
  const { setUnreadCount, fetchUnreadCount } = useNotificationStore();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastNotificationIdsRef = useRef<Set<string>>(new Set());
  const pushServiceRef = useRef<PushNotificationService | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize push notification service
  const initializePushService = useCallback(async () => {
    if (!enableBrowserNotifications || isInitializedRef.current) return;
    
    try {
      pushServiceRef.current = PushNotificationService.getInstance();
      const initialized = await pushServiceRef.current.initialize();
      isInitializedRef.current = initialized;
      
      // Browser notifications enabled (silent)
    } catch (error) {
      logger.error('❌ Failed to initialize push notifications:', error);
    }
  }, [enableBrowserNotifications]);

  // Load previously seen notification IDs from localStorage
  const loadStoredNotificationIds = useCallback(() => {
    try {
      const stored = localStorage.getItem('norma_seen_notifications');
      if (stored) {
        const storedNotifications: StoredNotification[] = JSON.parse(stored);
        // Only keep notifications from last 24 hours to prevent memory issues
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const recentIds = storedNotifications
          .filter(n => new Date(n.created_at).getTime() > oneDayAgo)
          .map(n => n.id);
        
        lastNotificationIdsRef.current = new Set(recentIds);
        
        // Save back the filtered list
        const filteredNotifications = storedNotifications.filter(n => 
          new Date(n.created_at).getTime() > oneDayAgo
        );
        localStorage.setItem('norma_seen_notifications', JSON.stringify(filteredNotifications));
      }
    } catch (error) {
      logger.error('Error loading stored notification IDs:', error);
    }
  }, []);

  // Save notification IDs to localStorage
  const saveNotificationIds = useCallback((notifications: any[]) => {
    try {
      const storedNotifications: StoredNotification[] = notifications.map(n => ({
        id: n.id,
        created_at: n.created_at
      }));
      localStorage.setItem('norma_seen_notifications', JSON.stringify(storedNotifications));
    } catch (error) {
      logger.error('Error saving notification IDs:', error);
    }
  }, []);

  // Check for new notifications and show browser notifications
  const checkForNewNotifications = useCallback(async () => {
    try {
      // Get latest notifications (skip if no token to avoid errors)
      const data = await getNotifications(1, false); // Get all notifications from first page
      const latestNotifications = data.results || [];
      
      // Update unread count
      const { count } = await getUnreadNotificationCount();
      setUnreadCount(count);
      
      if (latestNotifications.length === 0) return;

      // Find new notifications
      const newNotifications = latestNotifications.filter(notification => 
        !lastNotificationIdsRef.current.has(notification.id)
      );

      if (newNotifications.length > 0) {
        // Dispatch event to update application UI (e.g. refresh order list)
        if (typeof window !== 'undefined') {
          // Dispatch generic update
          window.dispatchEvent(new CustomEvent('order:updated'));
          
          // Dispatch specific order updates if available
          newNotifications.forEach(notification => {
            if (notification.order_id) {
              window.dispatchEvent(new CustomEvent('order:updated', { 
                detail: { orderId: notification.order_id } 
              }));
            }
          });
        }

        if (pushServiceRef.current?.isEnabled()) {
          // Show browser notifications for new notifications
          for (const notification of newNotifications) {
            const relativeTime = pushServiceRef.current.getRelativeTime(notification.created_at);
            
            await pushServiceRef.current.showOrderNotification(
              notification.title,
              notification.message,
              notification.order_id,
              relativeTime
            );
          }
        }
      }

      // Update stored notification IDs
      const allIds = latestNotifications.map(n => n.id);
      lastNotificationIdsRef.current = new Set(allIds);
      saveNotificationIds(latestNotifications);

    } catch (error) {
      logger.error('Error checking for new notifications:', error);
    }
  }, [setUnreadCount, saveNotificationIds]);

  // Start polling
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current || !isActive) return;

    // Initial check
    checkForNewNotifications();

    // Set up interval
    pollingIntervalRef.current = setInterval(() => {
      checkForNewNotifications();
    }, intervalMs);

  // Notification polling started (silent)
  }, [checkForNewNotifications, intervalMs, isActive]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
  // Notification polling stopped (silent)
    }
  }, []);

  // Initialize and start polling when component mounts
  useEffect(() => {
    if (!isActive) return;

    const initialize = async () => {
      loadStoredNotificationIds();
      await initializePushService();
      startPolling();
    };

    initialize();

    // ✅ Cleanup function always runs on unmount
    return () => {
      stopPolling(); // Ensures interval is cleared
    };
  }, [isActive, loadStoredNotificationIds, initializePushService, startPolling, stopPolling]);

  // Handle window focus/blur for efficient polling
  useEffect(() => {
    const handleFocus = () => {
        if (isActive) {
        startPolling();
      }
    };

    const handleBlur = () => {
  stopPolling();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isActive, startPolling, stopPolling]);

  return {
    isPolling: pollingIntervalRef.current !== null,
    isPushEnabled: pushServiceRef.current?.isEnabled() || false,
    manualCheck: checkForNewNotifications,
    clearAllNotifications: () => pushServiceRef.current?.clearAllNotifications()
  };
};