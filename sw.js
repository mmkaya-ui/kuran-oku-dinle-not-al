const CACHE_NAME = 'quran-v26';
const DYNAMIC_CACHE_NAME = 'quran-app-dynamic-v26';
const AUDIO_CACHE_NAME = 'quran-audio-v26';

const MAX_AUDIO_ENTRIES = 500;   // ~40MB limit for audio files
const MAX_API_ENTRIES   = 100;   // API responses limit

// FIFO Cache Eviction - deletes oldest entries when limit exceeded
async function trimCache(cacheName, maxEntries) {
    try {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        if (keys.length > maxEntries) {
            const keysToDelete = keys.slice(0, keys.length - maxEntries);
            for (const key of keysToDelete) {
                await cache.delete(key);
            }
        }
    } catch (e) {
        console.warn('[SW] trimCache error:', e);
    }
}

// Handles iOS Safari/WebKit Range requests by serving sliced buffer from cache
async function handleRangeRequest(request, cacheName) {
    try {
        const cache = await caches.open(cacheName);
        let cachedResponse = await cache.match(request);
        
        // If not in cache, fetch the FULL resource from network first to cache it safely as a 200 response
        if (!cachedResponse) {
            const cleanRequest = new Request(request.url, {
                method: 'GET',
                headers: new Headers(request.headers)
            });
            cleanRequest.headers.delete('range');
            
            const networkResponse = await fetch(cleanRequest);
            if (networkResponse.status === 200) {
                await cache.put(request, networkResponse.clone());
                trimCache(cacheName, MAX_AUDIO_ENTRIES);
            }
            cachedResponse = await cache.match(request);
        }

        if (!cachedResponse) {
            return new Response('', { status: 404 });
        }

        const rangeHeader = request.headers.get('range');
        if (!rangeHeader) {
            return cachedResponse;
        }

        const arrayBuffer = await cachedResponse.arrayBuffer();
        const bytes = /^bytes=(\d+)-(\d+)?$/g.exec(rangeHeader);
        if (bytes) {
            const start = parseInt(bytes[1], 10);
            const end = bytes[2] ? parseInt(bytes[2], 10) : arrayBuffer.byteLength - 1;
            const chunk = arrayBuffer.slice(start, end + 1);

            const headers = new Headers(cachedResponse.headers);
            headers.set('Content-Range', `bytes ${start}-${end}/${arrayBuffer.byteLength}`);
            headers.set('Content-Length', String(chunk.byteLength));
            headers.set('Accept-Ranges', 'bytes');

            return new Response(chunk, {
                status: 206,
                statusText: 'Partial Content',
                headers: headers
            });
        }

        return cachedResponse;
    } catch (err) {
        console.error('[SW] Range request error:', err);
        return fetch(request);
    }
}

const STATIC_ASSETS = [
    './',
    './index.html',
    './offline.html',
    './manifest.json',
    './favicon.png',
    './icon-192.png',
    './icon-512.png',
    './icon-96.png',
    './apple-touch-icon.png'
];

// Skip waiting when prompted by update banner
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Install Event - Precache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Precaching App Shell');
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// Activate Event - Clean up old caches but PRESERVE AUDIO_CACHE_NAME
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME && key !== DYNAMIC_CACHE_NAME && key !== AUDIO_CACHE_NAME) {
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

    // 1. Audio Files (cdn.islamic.network)
    // Strategy: Bypass the Service Worker when online to let the browser's native engine
    // stream background/locked-screen audio stably without worker suspension limits.
    // When offline, serve from cache with robust iOS Safari range support.
    if (url.origin === 'https://cdn.islamic.network') {
        if (self.navigator.onLine) {
            // Let the browser handle the network request natively (completely bypassing SW interception)
            return;
        } else {
            event.respondWith(handleRangeRequest(event.request, AUDIO_CACHE_NAME));
            return;
        }
    }

    // iOS Safari uses Range requests for other media. Do not intercept unless audio, let browser handle streaming.
    if (event.request.headers.has('range')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // 2. API Requests (api.alquran.cloud)
    // Strategy: Stale-While-Revalidate with background updates
    if (url.origin === 'https://api.alquran.cloud') {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                const networkFetch = fetch(event.request).then((networkResponse) => {
                    if (networkResponse.status === 200) {
                        caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                            cache.put(event.request, networkResponse.clone());
                            trimCache(DYNAMIC_CACHE_NAME, MAX_API_ENTRIES);
                        });
                    }
                    return networkResponse;
                }).catch(() => {});

                return cachedResponse || networkFetch;
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
    if (url.origin === 'https://docs.google.com') {
        event.respondWith(fetch(event.request));
        return;
    }

    // 6. Static Assets & App Shell — Stale-While-Revalidate + offline fallback
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const networkFetch = fetch(event.request).then((networkResponse) => {
                return caches.open(CACHE_NAME).then((cache) => {
                    if (event.request.method === 'GET' && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                });
            }).catch(() => {
                if (cachedResponse) return cachedResponse;
                // For navigation requests (HTML), serve offline page
                if (event.request.mode === 'navigate') {
                    return caches.match('./offline.html');
                }
                return new Response('', { status: 503 });
            });

            return cachedResponse || networkFetch;
        })
    );
});
