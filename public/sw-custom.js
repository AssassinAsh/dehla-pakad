// Custom Service Worker for Dehla Pakad
// Enhanced caching and offline functionality

const CACHE_NAME = "dehla-pakad-v1";
const STATIC_CACHE = "dehla-pakad-static-v1";
const DYNAMIC_CACHE = "dehla-pakad-dynamic-v1";

// Static assets to cache
const STATIC_ASSETS = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/cards/back.png",
  // Card images (will be cached dynamically)
];

// Game data cache duration (in milliseconds)
const CACHE_DURATION = {
  CARDS: 7 * 24 * 60 * 60 * 1000, // 7 days
  GAME_DATA: 1 * 60 * 60 * 1000, // 1 hour
  STATIC: 30 * 24 * 60 * 60 * 1000, // 30 days
};

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log("[SW] Caching static assets");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log("[SW] Service worker installed successfully");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("[SW] Installation failed:", error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return (
                cacheName !== STATIC_CACHE &&
                cacheName !== DYNAMIC_CACHE &&
                cacheName !== CACHE_NAME
              );
            })
            .map((cacheName) => {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log("[SW] Service worker activated");
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle different request types
  if (request.method !== "GET") {
    return; // Only handle GET requests
  }

  // Handle card images with long-term caching
  if (url.pathname.includes("/cards/")) {
    event.respondWith(handleCardImageRequest(request));
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  if (isStaticAsset(url.pathname)) {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Default: try cache first, then network
  event.respondWith(
    caches
      .match(request)
      .then((cachedResponse) => {
        return cachedResponse || fetch(request);
      })
      .catch(() => {
        // If both cache and network fail, serve offline page for navigation
        if (request.mode === "navigate") {
          return caches.match("/offline.html");
        }
        throw new Error("Network and cache failed");
      })
  );
});

// Handle card image requests with aggressive caching
async function handleCardImageRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // Check if cache is still valid
    const cachedDate = new Date(
      cachedResponse.headers.get("sw-cached-date") || 0
    );
    const now = new Date();

    if (now - cachedDate < CACHE_DURATION.CARDS) {
      return cachedResponse;
    }
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Clone response and add cache date
      const responseToCache = networkResponse.clone();
      const headers = new Headers(responseToCache.headers);
      headers.set("sw-cached-date", new Date().toISOString());

      const modifiedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers,
      });

      cache.put(request, modifiedResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log("[SW] Network failed for card image, serving from cache");
  }

  return cachedResponse || caches.match("/cards/back.png");
}

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful responses for short duration
    if (networkResponse.ok && request.url.includes("/metrics")) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log("[SW] Network failed for API request, trying cache");
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline response for API failures
    return new Response(
      JSON.stringify({
        error: "Offline",
        message: "This feature requires an internet connection",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Handle static assets with cache-first strategy
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    throw error;
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log("[SW] Navigation request failed, serving offline page");
    return caches.match("/offline.html");
  }
}

// Check if URL is a static asset
function isStaticAsset(pathname) {
  const staticExtensions = [
    ".js",
    ".css",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".ico",
  ];
  return staticExtensions.some((ext) => pathname.endsWith(ext));
}

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync triggered:", event.tag);

  if (event.tag === "game-action-sync") {
    event.waitUntil(syncGameActions());
  }
});

// Sync queued game actions when back online
async function syncGameActions() {
  try {
    // Get queued actions from IndexedDB
    const queuedActions = await getQueuedActions();

    for (const action of queuedActions) {
      try {
        await fetch("/api/sync-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action),
        });

        // Remove from queue on success
        await removeQueuedAction(action.id);
      } catch (error) {
        console.error("[SW] Failed to sync action:", error);
      }
    }
  } catch (error) {
    console.error("[SW] Background sync failed:", error);
  }
}

// IndexedDB helpers (simplified)
async function getQueuedActions() {
  // Implementation would use IndexedDB
  return [];
}

async function removeQueuedAction(actionId) {
  // Implementation would use IndexedDB
  return true;
}

// Push notification handling
self.addEventListener("push", (event) => {
  console.log("[SW] Push notification received");

  const options = {
    body: event.data ? event.data.text() : "Your turn in Dehla Pakad!",
    icon: "/icon.jpg",
    badge: "/icon.jpg",
    vibrate: [200, 100, 200],
    data: {
      url: event.data ? JSON.parse(event.data.text()).url : "/",
    },
    actions: [
      {
        action: "play",
        title: "Play Now",
        icon: "/icon.jpg",
      },
      {
        action: "dismiss",
        title: "Later",
      },
    ],
  };

  event.waitUntil(self.registration.showNotification("Dehla Pakad", options));
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "play") {
    event.waitUntil(clients.openWindow(event.notification.data.url || "/"));
  }
});

console.log("[SW] Service worker script loaded");
