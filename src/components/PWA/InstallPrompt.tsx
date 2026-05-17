"use client";

import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallPromptProps {
  onInstall?: () => void;
  onDismiss?: () => void;
}

const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  onInstall,
  onDismiss
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isStandaloneModed = window.matchMedia('(display-mode: standalone)').matches || 
                             (window.navigator as any).standalone;
    setIsStandalone(isStandaloneModed);

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for the beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show install prompt if not dismissed recently
      const lastDismissed = localStorage.getItem('pwa-install-dismissed');
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      if (!lastDismissed || parseInt(lastDismissed) < oneWeekAgo) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show install instructions after a delay
    if (iOS && !isStandaloneModed) {
      const timer = setTimeout(() => {
        const lastDismissed = localStorage.getItem('pwa-install-dismissed-ios');
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        if (!lastDismissed || parseInt(lastDismissed) < oneWeekAgo) {
          setIsVisible(true);
        }
      }, 10000); // Show after 10 seconds

      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Android/Chrome installation
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        // console.log('PWA installed successfully');
        onInstall?.();
      }
      
      setDeferredPrompt(null);
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    
    // Remember dismissal
    if (isIOS) {
      localStorage.setItem('pwa-install-dismissed-ios', Date.now().toString());
    } else {
      localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    }
    
    onDismiss?.();
  };

  // Don't show if already in standalone mode
  if (isStandalone || !isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-4 animate-slide-up">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="bg-orange-100 p-2 rounded-lg">
              <Smartphone className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">
                Install Norma App
              </h3>
              <p className="text-xs text-gray-600">
                Get the full app experience
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Dismiss install prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isIOS ? (
          // iOS Installation Instructions
          <div className="space-y-3">
            <div className="text-xs text-gray-600 leading-relaxed">
              <p>To install this app on your iPhone:</p>
              <ol className="mt-2 space-y-1 list-decimal list-inside">
                <li>Tap the <strong>Share</strong> button in Safari</li>
                <li>Tap <strong>"Add to Home Screen"</strong></li>
                <li>Tap <strong>"Add"</strong> to confirm</li>
              </ol>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleDismiss}
                className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Maybe Later
              </button>
              <button
                onClick={handleDismiss}
                className="flex-1 px-3 py-2 text-xs font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        ) : (
          // Android/Chrome Installation
          <div className="space-y-3">
            <p className="text-xs text-gray-600">
              Install the Norma app for faster access, offline support, and push notifications.
            </p>
            <div className="flex space-x-2">
              <button
                onClick={handleDismiss}
                className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Not Now
              </button>
              <button
                onClick={handleInstallClick}
                className="flex-1 px-3 py-2 text-xs font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center space-x-1"
              >
                <Download className="w-3 h-3" />
                <span>Install</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PWAInstallPrompt;