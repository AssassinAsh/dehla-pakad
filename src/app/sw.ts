import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

// This declares the value of `injectionPoint` to TypeScript.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  fallbacks: {
    entries: [
      {
        url: "/offline.html",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
  runtimeCaching: [
    // Cache all card images for offline play
    {
      matcher: ({ url }) => url.pathname.match(/\/cards\/.*\.png$/) !== null,
      handler: async ({ request }) => {
        try {
          const cache = await caches.open("dehla-pakad-cards");
          let response = await cache.match(request);
          if (!response) {
            response = await fetch(request);
            if (response.ok) {
              await cache.put(request, response.clone());
            }
          }
          return response;
        } catch {
          return fetch(request);
        }
      },
    },
    // Cache game sounds for offline play
    {
      matcher: ({ url }) =>
        url.pathname.match(/\/sound\/.*\.(mp3|wav|ogg)$/) !== null,
      handler: async ({ request }) => {
        try {
          const cache = await caches.open("dehla-pakad-sounds");
          let response = await cache.match(request);
          if (!response) {
            response = await fetch(request);
            if (response.ok) {
              await cache.put(request, response.clone());
            }
          }
          return response;
        } catch {
          return fetch(request);
        }
      },
    },
    // Cache game assets (table texture, icons, etc.)
    {
      matcher: ({ url }) =>
        url.pathname.match(
          /\/(table-texture\.png|icon\.jpg|manifest\.json)$/
        ) !== null,
      handler: async ({ request }) => {
        try {
          const cache = await caches.open("dehla-pakad-assets");
          let response = await cache.match(request);
          if (!response) {
            response = await fetch(request);
            if (response.ok) {
              await cache.put(request, response.clone());
            }
          }
          return response;
        } catch {
          return fetch(request);
        }
      },
    },
    // Network-first strategy for API calls (keeps online features working)
    {
      matcher: ({ url }) => url.pathname.startsWith("/api/"),
      handler: async ({ request }) => {
        try {
          // Try network first with 3 second timeout
          const response = await Promise.race([
            fetch(request),
            new Promise<Response>((_, reject) =>
              setTimeout(() => reject(new Error("Network timeout")), 3000)
            ),
          ]);

          if (response.ok) {
            const cache = await caches.open("dehla-pakad-api");
            await cache.put(request, response.clone());
          }
          return response;
        } catch {
          // Fallback to cache
          const cache = await caches.open("dehla-pakad-api");
          const cachedResponse = await cache.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          throw new Error("API not available");
        }
      },
    },
    // Cache fonts and CSS for offline UI
    {
      matcher: ({ url }) =>
        url.pathname.match(/\.(css|woff|woff2|ttf|eot)$/) !== null,
      handler: async ({ request }) => {
        try {
          const cache = await caches.open("dehla-pakad-styles");
          const cachedResponse = await cache.match(request);

          // Return cached version immediately if available
          if (cachedResponse) {
            // Update cache in background
            fetch(request)
              .then((response) => {
                if (response.ok) {
                  cache.put(request, response.clone());
                }
              })
              .catch(() => {});
            return cachedResponse;
          }

          // If not cached, fetch and cache
          const response = await fetch(request);
          if (response.ok) {
            await cache.put(request, response.clone());
          }
          return response;
        } catch {
          return fetch(request);
        }
      },
    },
    // Cache all JS files (including animation and drag-and-drop libraries)
    {
      matcher: ({ url }) => url.pathname.match(/\.js$/) !== null,
      handler: async ({ request }) => {
        try {
          const cache = await caches.open("dehla-pakad-js");
          let response = await cache.match(request);
          if (!response) {
            response = await fetch(request);
            if (response.ok) {
              await cache.put(request, response.clone());
            }
          }
          return response;
        } catch {
          return fetch(request);
        }
      },
    },
  ],
});

// Preload essential game assets
async function preloadGameAssets() {
  try {
    const cache = await caches.open("dehla-pakad-cards");

    // Preload all 52 cards + back card
    const cardPromises = [];
    const suits = ["C", "D", "H", "S"];
    const ranks = [
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "J",
      "Q",
      "K",
      "A",
    ];

    // Add all card combinations
    for (const suit of suits) {
      for (const rank of ranks) {
        cardPromises.push(cache.add(`/cards/${rank}${suit}.png`));
      }
    }

    // Add card back
    cardPromises.push(cache.add("/cards/back.png"));

    // Wait for all cards to be cached
    await Promise.all(cardPromises);
    // All card assets preloaded successfully

    // Preload sounds
    const soundCache = await caches.open("dehla-pakad-sounds");
    const soundPromises = [
      soundCache.add("/sound/card-play.mp3"),
      soundCache.add("/sound/card-deal.mp3"),
      soundCache.add("/sound/stack-won.mp3"),
      soundCache.add("/sound/victory.mp3"),
      soundCache.add("/sound/defeat.mp3"),
    ];

    await Promise.all(soundPromises);
    // All sound assets preloaded successfully
  } catch {
    // Failed to preload some assets
  }
}

// Handle messages and trigger asset preloading on install
addEventListener("install", (event) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (event as any).waitUntil(preloadGameAssets());
});

addEventListener("message", (event) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messageEvent = event as any;
  if (messageEvent.data && messageEvent.data.type === "OFFLINE_GAME_DATA") {
    // Store offline game preferences or state if needed
    // Received offline game data
  }

  if (messageEvent.data && messageEvent.data.type === "PRELOAD_GAME_ASSETS") {
    // Preload critical game assets for better offline experience
    preloadGameAssets();
  }
});

serwist.addEventListeners();
