// VBS Service Worker - Local-First Caching Strategy
// Implements app shell caching, episode data caching, and background sync preparation

const CACHE_VERSION = '1.0.0'
const CACHE_PREFIX = 'vbs'
const STATIC_CACHE_NAME = `${CACHE_PREFIX}-static-v${CACHE_VERSION}`
const DYNAMIC_CACHE_NAME = `${CACHE_PREFIX}-dynamic-v${CACHE_VERSION}`
const EPISODE_DATA_CACHE_NAME = `${CACHE_PREFIX}-episodes-v${CACHE_VERSION}`

// App shell resources to cache immediately
const APP_SHELL_RESOURCES = [
  '/vbs/',
  '/vbs/index.html',
  '/vbs/manifest.json',
  '/vbs/assets/main.js',
  '/vbs/assets/style.css',
]

// Episode data patterns to cache
const EPISODE_DATA_PATTERNS = [/\/vbs\/data\/.*\.json$/, /\/vbs\/api\/episodes/]

// Network-first resources (dynamic content)
const NETWORK_FIRST_PATTERNS = [/\/vbs\/api\/streaming/, /\/vbs\/api\/progress/]

/**
 * Service Worker installation - cache app shell resources.
 */
globalThis.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then(cache => {
        return cache.addAll(APP_SHELL_RESOURCES)
      })
      .then(() => {
        // Skip waiting to activate immediately
        return globalThis.skipWaiting()
      })
      .catch(error => {
        console.error('[VBS SW] Failed to cache app shell:', error)
      }),
  )
})

/**
 * Service Worker activation - clean up old caches.
 */
globalThis.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        const cacheWhitelist = [STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME, EPISODE_DATA_CACHE_NAME]

        return Promise.all(
          cacheNames.map(cacheName => {
            if (!cacheWhitelist.includes(cacheName)) {
              return caches.delete(cacheName)
            }
            return Promise.resolve()
          }),
        )
      })
      .then(() => {
        // Take control of all clients immediately
        return globalThis.clients.claim()
      })
      .catch(error => {
        console.error('[VBS SW] Failed to activate service worker:', error)
      }),
  )
})

/**
 * Fetch event handler - implement caching strategies.
 */
globalThis.addEventListener('fetch', event => {
  const {request} = event
  const url = new URL(request.url)

  // Only handle requests for our domain
  if (!url.pathname.startsWith('/vbs/')) {
    return
  }

  // Handle different types of requests with appropriate strategies
  if (isAppShellRequest(request)) {
    event.respondWith(handleAppShellRequest(request))
  } else if (isEpisodeDataRequest(request)) {
    event.respondWith(handleEpisodeDataRequest(request))
  } else if (isNetworkFirstRequest(request)) {
    event.respondWith(handleNetworkFirstRequest(request))
  } else {
    event.respondWith(handleDynamicRequest(request))
  }
})

/**
 * Check if request is for app shell resources.
 */
function isAppShellRequest(request) {
  const url = new URL(request.url)
  return APP_SHELL_RESOURCES.some(
    resource => url.pathname === resource || url.pathname === resource.replace('/vbs', ''),
  )
}

/**
 * Check if request is for episode data.
 */
function isEpisodeDataRequest(request) {
  const url = new URL(request.url)
  return EPISODE_DATA_PATTERNS.some(pattern => pattern.test(url.pathname))
}

/**
 * Check if request should use network-first strategy.
 */
function isNetworkFirstRequest(request) {
  const url = new URL(request.url)
  return NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname))
}

/**
 * Handle app shell requests - cache first with network fallback.
 */
async function handleAppShellRequest(request) {
  try {
    const cache = await caches.open(STATIC_CACHE_NAME)
    const cachedResponse = await cache.match(request)

    if (cachedResponse) {
      return cachedResponse
    }

    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    console.error('[VBS SW] App shell request failed:', error)

    // Return offline fallback for HTML requests
    if (request.destination === 'document') {
      const cache = await caches.open(STATIC_CACHE_NAME)
      return cache.match('/vbs/index.html') || new Response('Offline', {status: 503})
    }

    throw error
  }
}

/**
 * Handle episode data requests - cache first with background update.
 */
async function handleEpisodeDataRequest(request) {
  try {
    const cache = await caches.open(EPISODE_DATA_CACHE_NAME)
    const cachedResponse = await cache.match(request)

    if (cachedResponse) {
      // Background fetch to update cache
      fetch(request)
        .then(response => {
          if (response.ok) {
            cache.put(request, response.clone())
          }
        })
        .catch(() => {
          // Silent failure for background updates
        })

      return cachedResponse
    }

    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    console.error('[VBS SW] Episode data request failed:', error)

    // Return cached fallback if available
    const cache = await caches.open(EPISODE_DATA_CACHE_NAME)
    const fallback = await cache.match(request)
    if (fallback) {
      return fallback
    }

    throw error
  }
}

/**
 * Handle network-first requests (dynamic content, API calls).
 */
async function handleNetworkFirstRequest(request) {
  try {
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    console.warn('[VBS SW] Network request failed, trying cache:', error)

    const cache = await caches.open(DYNAMIC_CACHE_NAME)
    const cachedResponse = await cache.match(request)

    if (cachedResponse) {
      return cachedResponse
    }

    console.error('[VBS SW] No cache fallback available:', request.url)
    throw error
  }
}

/**
 * Handle general dynamic requests - network first with cache fallback.
 */
async function handleDynamicRequest(request) {
  try {
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    const cache = await caches.open(DYNAMIC_CACHE_NAME)
    const cachedResponse = await cache.match(request)

    if (cachedResponse) {
      return cachedResponse
    }

    throw error
  }
}

/**
 * Background sync event handler - for future streaming data updates.
 */
globalThis.addEventListener('sync', event => {
  if (event.tag === 'streaming-data-sync') {
    event.waitUntil(syncStreamingData())
  } else if (event.tag === 'progress-sync') {
    event.waitUntil(syncProgressData())
  }
})

/**
 * Sync streaming data in background (TASK-012 preparation).
 */
async function syncStreamingData() {
  try {
    // This will be implemented in TASK-012
    // For now, just return resolved promise

    // Future implementation will:
    // 1. Check IndexedDB for outdated streaming data
    // 2. Fetch fresh data from Watchmode API
    // 3. Update cache with new availability information
    // 4. Notify clients of updates
    return Promise.resolve()
  } catch (error) {
    console.error('[VBS SW] Streaming data sync failed:', error)
  }
}

/**
 * Sync progress data in background.
 */
async function syncProgressData() {
  try {
    // This is a placeholder for future cloud sync functionality
    return Promise.resolve()
  } catch (error) {
    console.error('[VBS SW] Progress data sync failed:', error)
  }
}

/**
 * Message event handler - communication with main thread.
 */
globalThis.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    globalThis.skipWaiting()
  } else if (event.data && event.data.type === 'GET_CACHE_STATUS') {
    getCacheStatus().then(status => {
      event.ports[0].postMessage({
        type: 'CACHE_STATUS',
        data: status,
      })
    })
  } else if (event.data && event.data.type === 'CLEAR_CACHE') {
    clearAllCaches().then(() => {
      event.ports[0].postMessage({
        type: 'CACHE_CLEARED',
        data: {success: true},
      })
    })
  }
})

/**
 * Get current cache status for debugging.
 */
async function getCacheStatus() {
  const cacheNames = await caches.keys()
  const status = {}

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName)
    const keys = await cache.keys()
    status[cacheName] = {
      size: keys.length,
      resources: keys.map(request => request.url),
    }
  }

  return status
}

/**
 * Clear all caches (for debugging/reset).
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys()
  return Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)))
}
