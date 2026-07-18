const CACHE_NAME = "abosood-pos-cache-v2";

// Cache index.html and core assets on install
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        "/",
        "/index.html",
      ]);
    })
  );
});

// Activate handler - clean old caches and take control immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercept fetch requests
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Never intercept API requests — let them pass through directly
  if (url.pathname.startsWith("/api")) {
    return;
  }

  // Only cache local assets or Google Fonts
  const isLocal = event.request.url.startsWith(self.location.origin);
  const isGoogleFont = url.hostname.includes("fonts.googleapis.com") || url.hostname.includes("fonts.gstatic.com");

  if (!isLocal && !isGoogleFont) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Background revalidate — silently update cache for next load
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => {}); // Silent — we already have a cached copy
        return cachedResponse;
      }

      // No cache hit — try network, fallback to index.html for navigation
      return fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline and no cache: serve index.html for SPA navigation, or empty response for assets
          if (event.request.mode === "navigate") {
            return caches.match("/");
          }
          // Return an empty response instead of throwing so the browser doesn't log errors
          return new Response("", { status: 503, statusText: "Offline" });
        });
    })
  );
});
