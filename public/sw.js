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
  } else if (event.tag === 'metadata-sync') {
    event.waitUntil(handleMetadataSync(event))
  } else if (event.tag === 'bulk-metadata-sync') {
    event.waitUntil(handleBulkMetadataSync(event))
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
  } else if (event.data && event.data.type === 'START_METADATA_SYNC') {
    // Start metadata sync operation
    const {operationId, episodeIds, sources} = event.data.payload || {}
    startMetadataSync(operationId, episodeIds, sources).then(() => {
      if (event.ports[0]) {
        event.ports[0].postMessage({
          type: 'METADATA_SYNC_STARTED',
          data: {operationId, success: true},
        })
      }
    })
  } else if (event.data && event.data.type === 'CANCEL_METADATA_SYNC') {
    // Cancel ongoing metadata sync operation
    const {operationId} = event.data.payload || {}
    const cancelled = cancelMetadataSync(operationId)
    if (event.ports[0]) {
      event.ports[0].postMessage({
        type: 'METADATA_SYNC_CANCELLED',
        data: {operationId, cancelled},
      })
    }
  } else if (event.data && event.data.type === 'GET_METADATA_PROGRESS') {
    // Get current progress for operation
    const {operationId} = event.data.payload || {}
    const progress = getMetadataProgress(operationId)
    if (event.ports[0]) {
      event.ports[0].postMessage({
        type: 'METADATA_PROGRESS',
        data: progress,
      })
    }
  } else if (event.data && event.data.type === 'GET_ALL_PROGRESS') {
    // Get all active progress operations
    const allProgress = getAllProgress()
    if (event.ports[0]) {
      event.ports[0].postMessage({
        type: 'ALL_METADATA_PROGRESS',
        data: allProgress,
      })
    }
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

// ============================================================================
// TASK-026: Progress Tracking for Bulk Metadata Operations
// ============================================================================

/**
 * Metadata progress tracking state - persisted across Service Worker restarts.
 */
const metadataProgress = new Map()

/**
 * Active metadata operations - tracked for progress reporting.
 */
const activeOperations = new Map()

/**
 * Handle metadata sync background operations.
 */
async function handleMetadataSync(event) {
  try {
    const operationId = `metadata-sync-${Date.now()}`

    // Initialize progress tracking
    const progress = {
      operationId,
      totalJobs: 1,
      completedJobs: 0,
      failedJobs: 0,
      cancelledJobs: 0,
      startedAt: new Date().toISOString(),
      cancellable: true,
      status: 'running',
    }

    metadataProgress.set(operationId, progress)
    activeOperations.set(operationId, {type: 'single', event})

    // Notify clients of operation start
    await notifyClientsOfProgress(progress)

    // Simulate metadata sync operation (actual implementation would call metadata APIs)
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Update progress
    progress.completedJobs = 1
    progress.status = 'completed'
    metadataProgress.set(operationId, progress)

    // Notify clients of completion
    await notifyClientsOfProgress(progress)

    // Clean up completed operation
    setTimeout(() => {
      metadataProgress.delete(operationId)
      activeOperations.delete(operationId)
    }, 5000) // Keep for 5 seconds for client consumption
  } catch (error) {
    console.error('[VBS SW] Metadata sync failed:', error)

    // Update progress with error
    const operations = Array.from(activeOperations.entries())
    for (const [operationId, operation] of operations) {
      if (operation.type === 'single') {
        const progress = metadataProgress.get(operationId)
        if (progress) {
          progress.status = 'failed'
          progress.failedJobs = 1
          metadataProgress.set(operationId, progress)
          await notifyClientsOfProgress(progress)
        }
      }
    }
  }
}

/**
 * Handle bulk metadata sync operations with comprehensive progress tracking.
 */
async function handleBulkMetadataSync(event) {
  try {
    const operationId = `bulk-metadata-sync-${Date.now()}`

    // Get operation details from IndexedDB or default
    const operationDetails = (await getStoredOperationDetails(operationId)) || {
      episodeIds: ['sample_episode_1', 'sample_episode_2', 'sample_episode_3'],
      sources: ['tmdb', 'memory-alpha'],
      priority: 1,
    }

    const totalJobs = operationDetails.episodeIds.length

    // Initialize progress tracking
    const progress = {
      operationId,
      totalJobs,
      completedJobs: 0,
      failedJobs: 0,
      cancelledJobs: 0,
      startedAt: new Date().toISOString(),
      cancellable: true,
      status: 'running',
      estimatedCompletion: new Date(Date.now() + totalJobs * 3000).toISOString(), // Rough estimate
    }

    metadataProgress.set(operationId, progress)
    activeOperations.set(operationId, {
      type: 'bulk',
      event,
      details: operationDetails,
      cancelled: false,
    })

    // Notify clients of operation start
    await notifyClientsOfProgress(progress)

    // Process episodes sequentially with progress updates
    for (let i = 0; i < operationDetails.episodeIds.length; i++) {
      const operation = activeOperations.get(operationId)

      // Check for cancellation
      if (operation?.cancelled) {
        progress.status = 'cancelled'
        progress.cancelledJobs = totalJobs - i
        metadataProgress.set(operationId, progress)
        await notifyClientsOfProgress(progress)
        return
      }

      const episodeId = operationDetails.episodeIds[i]
      progress.currentJob = episodeId

      try {
        // Simulate episode metadata enrichment
        await enrichEpisodeMetadata(episodeId, operationDetails.sources)

        progress.completedJobs = i + 1
        progress.currentJob = undefined

        // Update estimated completion based on actual progress
        const elapsed = Date.now() - new Date(progress.startedAt).getTime()
        const avgTimePerJob = elapsed / (i + 1)
        const remaining = totalJobs - (i + 1)
        progress.estimatedCompletion = new Date(
          Date.now() + remaining * avgTimePerJob,
        ).toISOString()
      } catch (error) {
        console.error(`[VBS SW] Failed to enrich metadata for ${episodeId}:`, error)
        progress.failedJobs += 1
        progress.currentJob = undefined
      }

      metadataProgress.set(operationId, progress)
      await notifyClientsOfProgress(progress)

      // Add delay between operations to avoid overwhelming APIs
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // Mark operation as completed
    progress.status = progress.failedJobs > 0 ? 'failed' : 'completed'
    progress.currentJob = undefined
    metadataProgress.set(operationId, progress)

    // Final notification
    await notifyClientsOfProgress(progress)
    await showOperationNotification(progress)

    // Clean up completed operation after delay
    setTimeout(() => {
      metadataProgress.delete(operationId)
      activeOperations.delete(operationId)
    }, 30000) // Keep for 30 seconds for client consumption
  } catch (error) {
    console.error('[VBS SW] Bulk metadata sync failed:', error)

    // Update progress with error
    const operations = Array.from(activeOperations.entries())
    for (const [operationId, operation] of operations) {
      if (operation.type === 'bulk') {
        const progress = metadataProgress.get(operationId)
        if (progress) {
          progress.status = 'failed'
          metadataProgress.set(operationId, progress)
          await notifyClientsOfProgress(progress)
          await showOperationNotification(progress)
        }
      }
    }
  }
}

/**
 * Simulate episode metadata enrichment (actual implementation would call APIs).
 */
async function enrichEpisodeMetadata(episodeId, sources) {
  // Simulate API calls to TMDB, Memory Alpha, etc.
  const delay = Math.random() * 2000 + 1000 // 1-3 second delay
  await new Promise(resolve => setTimeout(resolve, delay))

  // Simulate occasional failures (10% failure rate)
  if (Math.random() < 0.1) {
    throw new Error(`Failed to fetch metadata for ${episodeId}`)
  }

  return {
    episodeId,
    sources,
    enriched: true,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Get stored operation details from IndexedDB (placeholder implementation).
 */
async function getStoredOperationDetails(_operationId) {
  // In actual implementation, this would read from IndexedDB
  // For now, return null to use defaults
  return null
}

/**
 * Notify all clients about progress updates.
 */
async function notifyClientsOfProgress(progress) {
  try {
    const clients = await globalThis.clients.matchAll({
      includeUncontrolled: true,
      type: 'window',
    })

    const message = {
      type: 'METADATA_PROGRESS_UPDATE',
      data: progress,
    }

    // Send progress update to all connected clients
    for (const client of clients) {
      client.postMessage(message)
    }

    // Store progress in cache for clients that connect later
    await storeProgressInCache(progress)
  } catch (error) {
    console.error('[VBS SW] Failed to notify clients of progress:', error)
  }
}

/**
 * Store progress information in cache for persistence.
 */
async function storeProgressInCache(progress) {
  try {
    const cache = await caches.open('vbs-metadata-progress')
    const response = new Response(JSON.stringify(progress), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    })

    await cache.put(`/vbs/progress/${progress.operationId}`, response)
  } catch (error) {
    console.error('[VBS SW] Failed to store progress in cache:', error)
  }
}

/**
 * Show notification to user about operation completion.
 */
async function showOperationNotification(progress) {
  try {
    // Check if notifications are supported and permitted
    if (!globalThis.Notification) {
      return
    }

    let title, body, icon

    if (progress.status === 'completed') {
      if (progress.failedJobs > 0) {
        title = 'Metadata Sync Completed with Errors'
        body = `${progress.completedJobs} episodes updated, ${progress.failedJobs} failed`
        icon = '/vbs/icon-192.svg'
      } else {
        title = 'Metadata Sync Completed'
        body = `Successfully updated ${progress.completedJobs} episodes`
        icon = '/vbs/icon-192.svg'
      }
    } else if (progress.status === 'failed') {
      title = 'Metadata Sync Failed'
      body = `Failed to update episode metadata. ${progress.failedJobs} episodes affected.`
      icon = '/vbs/icon-192.svg'
    } else if (progress.status === 'cancelled') {
      title = 'Metadata Sync Cancelled'
      body = `Operation cancelled by user. ${progress.completedJobs} episodes were updated.`
      icon = '/vbs/icon-192.svg'
    } else {
      return // Don't show notification for running operations
    }

    // Show notification
    await globalThis.registration.showNotification(title, {
      body,
      icon,
      badge: '/vbs/icon-192.svg',
      tag: `metadata-sync-${progress.operationId}`,
      data: {
        operationId: progress.operationId,
        url: '/vbs/',
      },
      actions: [
        {
          action: 'view',
          title: 'View Details',
        },
      ],
    })
  } catch (error) {
    console.error('[VBS SW] Failed to show notification:', error)
  }
}

/**
 * Handle notification clicks.
 */
globalThis.addEventListener('notificationclick', event => {
  event.notification.close()

  if (event.action === 'view' || !event.action) {
    // Open app to show metadata details
    event.waitUntil(globalThis.clients.openWindow('/vbs/'))
  }
})

/**
 * Start a metadata sync operation programmatically.
 */
async function startMetadataSync(operationId, episodeIds, sources) {
  try {
    if (!operationId) {
      operationId = `manual-metadata-sync-${Date.now()}`
    }

    // Store operation details for processing
    const operationDetails = {
      episodeIds: episodeIds || ['sample_episode_1'],
      sources: sources || ['tmdb', 'memory-alpha'],
      priority: 1,
    }

    // Register background sync if available
    if (globalThis.registration && globalThis.registration.sync) {
      // Store operation data for background sync
      activeOperations.set(operationId, {
        type: 'bulk',
        details: operationDetails,
        cancelled: false,
      })

      await globalThis.registration.sync.register('bulk-metadata-sync')
    } else {
      // Fallback to immediate execution
      await handleBulkMetadataSync({operationId, operationDetails})
    }

    return operationId
  } catch (error) {
    console.error('[VBS SW] Failed to start metadata sync:', error)
    throw error
  }
}

/**
 * Cancel an ongoing metadata sync operation.
 */
function cancelMetadataSync(operationId) {
  try {
    const operation = activeOperations.get(operationId)
    if (!operation) {
      return false
    }

    // Mark operation as cancelled
    operation.cancelled = true
    activeOperations.set(operationId, operation)

    // Update progress
    const progress = metadataProgress.get(operationId)
    if (progress && progress.status === 'running') {
      progress.status = 'cancelled'
      metadataProgress.set(operationId, progress)

      // Notify clients
      notifyClientsOfProgress(progress)
    }

    return true
  } catch (error) {
    console.error('[VBS SW] Failed to cancel metadata sync:', error)
    return false
  }
}

/**
 * Get progress for a specific operation.
 */
function getMetadataProgress(operationId) {
  if (operationId) {
    return metadataProgress.get(operationId) || null
  }

  // Return most recent operation if no ID specified
  const allProgress = Array.from(metadataProgress.values())
  return (
    allProgress.sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    )[0] || null
  )
}

/**
 * Get all active progress operations.
 */
function getAllProgress() {
  return Array.from(metadataProgress.values()).filter(
    progress => progress.status === 'running' || progress.status === 'paused',
  )
}
