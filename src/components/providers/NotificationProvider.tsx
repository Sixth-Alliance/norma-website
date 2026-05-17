/**
 * Notification Provider Component
 * Provides real-time notification polling and browser push notifications
 */

"use client";

import React, { useEffect } from 'react';
import { useNotificationPolling } from '@/src/hooks/useNotificationPolling';
import { useAuthStore } from '@/src/store/authStore';

interface NotificationProviderProps {
  children: React.ReactNode;
  enablePolling?: boolean;
}

const NotificationProvider: React.FC<NotificationProviderProps> = ({ 
  children, 
  enablePolling = true 
}) => {
  const { isUserAuthenticated, user } = useAuthStore();
  
  // Poll faster for outlet managers (10s) vs regular users (30s)
  const isManager = user?.role === 'outlet_manager';
  const pollingInterval = isManager ? 10000 : 30000;

  // Start notification polling only for authenticated users
  const { isPolling, isPushEnabled, manualCheck } = useNotificationPolling({
    intervalMs: pollingInterval,
    enableBrowserNotifications: true,
    isActive: enablePolling && isUserAuthenticated()
  });

  useEffect(() => {
    if (isUserAuthenticated() && enablePolling) {
      // console.log('🔔 Notification provider initialized');
      
      // Check for notifications immediately when provider loads
      manualCheck();
    }
  }, [isUserAuthenticated, enablePolling, manualCheck]);

  // Debug info in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const debugInfo = {
        authenticated: isUserAuthenticated(),
        polling: isPolling,
        pushEnabled: isPushEnabled,
        enablePolling
      };
      // console.log('🔔 Notification provider status:', debugInfo);
    }
  }, [isUserAuthenticated, isPolling, isPushEnabled, enablePolling]);

  return <>{children}</>;
};

export default NotificationProvider;