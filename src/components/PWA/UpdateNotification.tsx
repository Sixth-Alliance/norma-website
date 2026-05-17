"use client";

import React, { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';

interface PWAUpdateNotificationProps {
  onUpdate?: () => void;
  onDismiss?: () => void;
}

const PWAUpdateNotification: React.FC<PWAUpdateNotificationProps> = ({
  onUpdate,
  onDismiss
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Listen for service worker updates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Reload the page when new service worker takes control
        window.location.reload();
      });

      // Check for updates periodically
      const checkForUpdates = async () => {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            registration.update();
            
            // Listen for new service worker waiting
            if (registration.waiting) {
              setIsVisible(true);
            }

            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    setIsVisible(true);
                  }
                });
              }
            });
          }
        } catch (error) {
          console.error('Error checking for service worker updates:', error);
        }
      };

      checkForUpdates();

      // Check for updates every 30 minutes
      const interval = setInterval(checkForUpdates, 30 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        // Tell the waiting service worker to skip waiting
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        onUpdate?.();
      }
    } catch (error) {
      console.error('Error updating service worker:', error);
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-[100] md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-blue-50 border border-blue-200 rounded-lg shadow-lg p-4 animate-slide-down">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <RefreshCw className={`w-5 h-5 text-blue-600 ${isUpdating ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 text-sm">
                App Update Available
              </h3>
              <p className="text-xs text-blue-700">
                New features and improvements
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-blue-400 hover:text-blue-600 transition-colors"
            aria-label="Dismiss update notification"
            disabled={isUpdating}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-blue-700">
            A new version of the Norma app is available with bug fixes and performance improvements.
          </p>
          <div className="flex space-x-2">
            <button
              onClick={handleDismiss}
              disabled={isUpdating}
              className="flex-1 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
            >
              Later
            </button>
            <button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="flex-1 px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1 disabled:opacity-50"
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3" />
                  <span>Update Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWAUpdateNotification;