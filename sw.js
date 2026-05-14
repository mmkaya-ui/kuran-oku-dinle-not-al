const CACHE_NAME = 'quran-v5';
const DYNAMIC_CACHE_NAME = 'quran-app-dynamic-v5';

const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './favicon.png',
    './icon-192.png',
    './icon-512.png',
    './icon-96.png',
    './apple-touch-icon.png'
];

// Install Event - Precache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Precaching App Shell');
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
                    console.log('[Service Worker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        }).then(() => self.clients.claim())
    );
});

// Fetch Event - Handle requests
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 1. API Requests (api.alquran.cloud)
    // Strategy: Network First, fallback to Cache (or Stale-While-Revalidate)
    if (url.origin === 'https://api.alquran.cloud') {
        event.respondWith(
            fetch(event.request).then((networkResponse) => {
                return caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            }).catch(() => {
                return caches.match(event.request);
            })
        );
        return;
    }

    // 2. Audio Files (cdn.islamic.network)
    // Strategy: Cache First, fallback to Network
    if (url.origin === 'https://cdn.islamic.network') {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse; // Return cached audio
                }
                return fetch(event.request).then((networkResponse) => {
                    return caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }

    // 3. Google Fonts — Cache First
    if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;
                return fetch(event.request).then((networkResponse) => {
                    return caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }

    // 4. CDN assets (Tailwind, XLSX, React, Babel, FontAwesome) — Cache First
    if (url.origin === 'https://cdn.tailwindcss.com' ||
        url.origin === 'https://cdnjs.cloudflare.com' ||
        url.origin === 'https://unpkg.com') {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;
                return fetch(event.request).then((networkResponse) => {
                    return caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
                        if (networkResponse.status === 200) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }

    // 5. Google Sheets (ders programı verisi) — Network only, no caching
    // App handles its own localStorage caching for this
    if (url.origin === 'https://docs.google.com') {
        event.respondWith(fetch(event.request));
        return;
    }

    // 6. Static Assets & App Shell — Stale-While-Revalidate
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const networkFetch = fetch(event.request).then((networkResponse) => {
                return caches.open(CACHE_NAME).then((cache) => {
                    if (event.request.method === 'GET' && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                });
            }).catch(() => cachedResponse);

            return cachedResponse || networkFetch;
        })
    );
});
