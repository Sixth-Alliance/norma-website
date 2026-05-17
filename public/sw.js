// Enhanced Service Worker for PWA - Norma Food Delivery
// v9.2 - Updated with Network-First strategy for HTML to fix stale content issues

const CACHE_NAME = "norma-pwa-v1.1.1";
const RUNTIME_CACHE = "norma-runtime-v1.1.1";

// Resources to cache for offline support
const STATIC_CACHE_URLS = [
  "/",
  "/home",
  "/home/cart",
  "/home/orders",
  "/manifest.json",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png",
  "/apple-touch-icon.png",
  "/favicon-32x32.png",
  "/favicon-16x16.png",
];

// API endpoints to cache for offline
const baseUrl =
  self.location.origin.includes("localhost") ||
    self.location.origin.includes("127.0.0.1")
    ? "http://127.0.0.1:8000/api/v1"
    : "https://normaapieats.normaeats.com/api/v1";

const API_CACHE_PATTERNS = [
  new RegExp(`^${baseUrl}/outlets/?$`),
  new RegExp(`^${baseUrl}/products/?$`),
  new RegExp(`^${baseUrl}/orders/.+`),
];

// Install service worker and cache static resources
self.addEventListener("install", (event) => {
  // console.log("🔧 PWA Service Worker installing...");

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        // console.log("📦 Caching static resources");
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        // console.log("✅ Static resources cached");
        // Force the waiting SW to become active immediately
        self.skipWaiting();
      })
      .catch((error) => {
        console.error("❌ Failed to cache static resources:", error);
      })
  );
});

// Activate service worker and clean old caches
self.addEventListener("activate", (event) => {
  // console.log("✅ PWA Service Worker activated");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              // console.log("🗑️ Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// --------------------------------------------------------------------------
// FETCH STRATEGIES
// --------------------------------------------------------------------------

self.addEventListener("fetch", (event) => {
  const { request } = event;
  let url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // ----------------------------------------------------------------
  // 1. API Requests (Network-First -> Cache Fallback)
  // ----------------------------------------------------------------
  if (url.origin === baseUrl.replace("/api/v1", "")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            try {
              if (url.protocol === "http:" || url.protocol === "https:") {
                caches.open(RUNTIME_CACHE).then((cache) => {
                  cache
                    .put(request, responseClone)
                    .catch((err) =>
                      console.warn("ServiceWorker: API cache put failed", err)
                    );
                });
              }
            } catch (err) {
              console.warn("ServiceWorker: Invalid URL for API cache", err);
            }
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache when offline
          return caches.match(request);
        })
    );
    return;
  }

  // ----------------------------------------------------------------
  // 2. HTML Documents (Network-First -> Cache Fallback -> Offline Page)
  // ----------------------------------------------------------------
  // This fixes the "stale content" issue by always trying to fetch fresh HTML first
  if (request.destination === "document") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Network hit! Update the cache with the fresh version
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Network failed? Try the cache.
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Cache failed? Return the custom Offline Page.
            return getOfflinePage();
          });
        })
    );
    return;
  }

  // ----------------------------------------------------------------
  // 3. Static Assets (Cache-First -> Network Fallback)
  // ----------------------------------------------------------------
  // Scripts, Styles, and Images should prioritize cache for speed
  if (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "image"
  ) {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          return response;
        }

        return fetch(request)
          .then((response) => {
            if (response.status === 200) {
              const responseClone = response.clone();
              try {
                if (url.protocol === "http:" || url.protocol === "https:") {
                  caches.open(CACHE_NAME).then((cache) => {
                    cache
                      .put(request, responseClone)
                      .catch((err) =>
                        console.warn(
                          "ServiceWorker: Static cache put failed",
                          err
                        )
                      );
                  });
                }
              } catch (err) {
                console.warn(
                  "ServiceWorker: Invalid URL for static cache",
                  err
                );
              }
            }
            return response;
          })
          .catch((err) => {
            // Optional: Return a placeholder image if an image request fails?
            // For now, we just let it fail naturally.
          });
      })
    );
  }
});

// Helper: Generates the custom Offline HTML response
function getOfflinePage() {
  return new Response(
    `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Norma - Offline</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              text-align: center; 
              padding: 2rem; 
              background: #f8f9fa;
            }
            .offline-container {
              max-width: 400px;
              margin: 0 auto;
              background: white;
              padding: 2rem;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .emoji { font-size: 3rem; margin-bottom: 1rem; }
            h1 { color: #FF6B35; margin: 0 0 1rem 0; }
            p { color: #666; margin-bottom: 1.5rem; }
            button {
              background: #FF6B35;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              cursor: pointer;
              font-size: 1rem;
            }
          </style>
        </head>
        <body>
          <div class="offline-container">
            <div class="emoji">🍔</div>
            <h1>You're Offline</h1>
            <p>It looks like you're not connected to the internet. Check your connection and try again.</p>
            <button onclick="window.location.reload()">Try Again</button>
          </div>
        </body>
      </html>
    `,
    {
      headers: { "Content-Type": "text/html" },
    }
  );
}

// --------------------------------------------------------------------------
// NOTIFICATIONS & SYNC (Unchanged)
// --------------------------------------------------------------------------

// Handle notification clicks with enhanced routing
self.addEventListener("notificationclick", (event) => {
  // console.log("🔔 Notification clicked:", event.notification.data);

  event.notification.close();

  const {
    orderCode,
    notificationId,
    action: notificationAction,
  } = event.notification.data || {};

  // Handle different notification actions
  let targetUrl = "/home/notifications";

  if (event.action === "view" && orderCode) {
    targetUrl = `/home/tracking/${orderCode}`;
  } else if (event.action === "reorder" && orderCode) {
    targetUrl = `/home/orders?reorder=${orderCode}`;
  } else if (event.action === "menu") {
    targetUrl = "/home";
  } else if (orderCode) {
    targetUrl = `/home/tracking/${orderCode}`;
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Check if app is already open
        for (const client of clients) {
          if (client.url.includes("norma") && "focus" in client) {
            client.focus();
            client.postMessage({
              type: "NAVIGATE",
              url: targetUrl,
            });
            return;
          }
        }

        // Open new window if app not open
        return self.clients.openWindow(targetUrl);
      })
  );
});

// Handle notification close events
self.addEventListener("notificationclose", (event) => {
  // console.log("🔔 Notification closed:", event.notification.data);

  // Track notification dismissal
  if (event.notification.data?.notificationId) {
    // Could send analytics event here
    // console.log(
    //   "📊 Notification dismissed:",
    //   event.notification.data.notificationId
    // );
  }
});

// Enhanced push event handler with rich notifications
self.addEventListener("push", (event) => {
  // console.log("📬 Push message received");

  if (!event.data) return;

  try {
    const data = event.data.json();

    const options = {
      body: data.message || "New notification from Norma",
      icon: "/android-chrome-192x192.png",
      badge: "/favicon-32x32.png",
      data: data,
      requireInteraction: true,
      vibrate: [200, 100, 200],
      tag: data.tag || "norma-notification",
      actions: [
        {
          action: "view",
          title: "👀 View",
          icon: "/favicon-16x16.png",
        },
        {
          action: "dismiss",
          title: "✖️ Dismiss",
          icon: "/favicon-16x16.png",
        },
      ],
    };

    // Add order-specific actions
    if (data.orderCode) {
      options.actions = [
        {
          action: "view",
          title: "📦 Track Order",
          icon: "/favicon-16x16.png",
        },
        {
          action: "menu",
          title: "🍽️ Browse Menu",
          icon: "/favicon-16x16.png",
        },
        {
          action: "dismiss",
          title: "✖️ Dismiss",
          icon: "/favicon-16x16.png",
        },
      ];
    }

    event.waitUntil(
      self.registration.showNotification(
        data.title || "Norma Food Delivery",
        options
      )
    );
  } catch (error) {
    console.error("❌ Error processing push notification:", error);
  }
});

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  // console.log("🔄 Background sync triggered:", event.tag);

  if (event.tag === "order-sync") {
    event.waitUntil(syncPendingOrders());
  }
});

// Sync pending orders when back online
async function syncPendingOrders() {
  try {
    // Get pending orders from IndexedDB or localStorage
    const pendingOrders = await getPendingOrders();

    for (const order of pendingOrders) {
      try {
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(order),
        });

        if (response.ok) {
          await removePendingOrder(order.id);
          // console.log("✅ Order synced:", order.id);
        }
      } catch (error) {
        console.error("❌ Failed to sync order:", order.id, error);
      }
    }
  } catch (error) {
    console.error("❌ Background sync failed:", error);
  }
}

// Helper functions for offline order management
async function getPendingOrders() {
  return [];
}

async function removePendingOrder(orderId) {
  // console.log("Removing pending order:", orderId);
}

// PWA update available notification
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// console.log("🚀 Norma PWA Service Worker loaded successfully");
