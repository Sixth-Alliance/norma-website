"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import PWAInstallPrompt from './InstallPrompt';
import PWAUpdateNotification from './UpdateNotification';

interface PWAContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  promptInstall: () => void;
  deferInstall: () => void;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

interface PWAProviderProps {
  children: React.ReactNode;
}

export const PWAProvider: React.FC<PWAProviderProps> = ({ children }) => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    // Register service worker for PWA functionality
    if ('serviceWorker' in navigator && typeof window !== 'undefined') {
      const registerServiceWorker = () => {
        // Confirm sw.js is reachable before attempting to register.
        (async () => {
          try {
            const resp = await fetch('/sw.js', { cache: 'no-store' });
            if (!resp.ok) {
              console.warn('PWAProvider: sw.js not found or inaccessible, skipping service worker registration', resp.status);
              return;
            }

            const registration = await navigator.serviceWorker.register('/sw.js');

            // Check for updates periodically, but guard against errors
            const updateInterval = setInterval(() => {
              try {
                registration.update();
              } catch (err) {
                console.warn('PWAProvider: service worker update failed', err);
              }
            }, 60000); // Check every minute

            // Ensure we cleanup the interval if page unloads
            window.addEventListener('beforeunload', () => clearInterval(updateInterval));
          } catch (error) {
            console.warn('PWAProvider: service worker registration skipped or failed:', error);
          }
        })();
      };

      if (document.readyState === 'complete') {
        registerServiceWorker();
      } else {
        window.addEventListener('load', registerServiceWorker);
      }
    }

    // Check if PWA is already installed
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                          (window.navigator as any).standalone ||
                          document.referrer.includes('android-app://');
      setIsInstalled(isStandalone);
    };

    // Check online status
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    // Initialize
    checkIfInstalled();
    updateOnlineStatus();

    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Install prompt handling is delegated to the `PWAInstallPrompt` component.
    // That component listens for `beforeinstallprompt` and manages user choice.
    // Avoid calling `preventDefault()` here to prevent the banner warning and
    // to ensure the install prompt can be shown by the dedicated component.

    // Listen for app installation
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setShowInstallPrompt(false);
      // console.log('PWA was installed successfully');
    });

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const promptInstall = () => {
    setShowInstallPrompt(true);
  };

  const deferInstall = () => {
    setShowInstallPrompt(false);
    setIsInstallable(false);
  };

  const value: PWAContextType = {
    isInstallable,
    isInstalled,
    isOnline,
    promptInstall,
    deferInstall,
  };

  return (
    <PWAContext.Provider value={value}>
      {children}
      
      {/* PWA Components */}
      {showInstallPrompt && (
        <PWAInstallPrompt
          onInstall={() => setShowInstallPrompt(false)}
          onDismiss={() => setShowInstallPrompt(false)}
        />
      )}
      
      <PWAUpdateNotification />
      
      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 text-sm z-50">
          <span className="flex items-center justify-center space-x-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            <span>You're offline. Some features may be limited.</span>
          </span>
        </div>
      )}
    </PWAContext.Provider>
  );
};

export const usePWA = (): PWAContextType => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};

export default PWAProvider;