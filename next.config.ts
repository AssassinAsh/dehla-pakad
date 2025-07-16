import type { NextConfig } from "next";
import createPWA from "@ducanh2912/next-pwa";

const withPWA = createPWA({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development", // Only enable PWA in production
  fallbacks: {
    document: "/offline.html",
  },
  workboxOptions: {
    disableDevLogs: true,
    // Enhanced runtime caching
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts-cache",
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 365, // 365 days
          },
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "gstatic-fonts-cache",
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 365, // 365 days
          },
        },
      },
      {
        urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-image-assets",
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          },
        },
      },
      {
        urlPattern: /\/cards\/.*\.png$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "card-images",
          expiration: {
            maxEntries: 60, // All card images
            maxAgeSeconds: 60 * 60 * 24 * 90, // 90 days
          },
        },
      },
      {
        urlPattern: /\.(?:js|css)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-assets",
          expiration: {
            maxEntries: 60,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          },
        },
      },
      {
        urlPattern: /^\/api\/(?!.*socket\.io).*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "api-cache",
          expiration: {
            maxEntries: 20,
            maxAgeSeconds: 60 * 60, // 1 hour
          },
          networkTimeoutSeconds: 10,
        },
      },
    ],
    // Skip waiting to activate new service worker immediately
    skipWaiting: true,
    clientsClaim: true,
  },
});

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  /* config options here */
};

export default withPWA(nextConfig);
