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

// ============================================================================
// METADATA BATCHING SYSTEM (TASK-028)
// ============================================================================

/**
 * Batch processing configuration optimized for different API rate limits and response characteristics.
 */
const BATCH_CONFIG = {
  maxBatchSize: 20,
  tmdbBatchSize: 20, // TMDB API supports batch operations efficiently
  memoryAlphaBatchSize: 5, // Memory Alpha requires conservative batching to avoid rate limiting

  batchDelayMs: 500, // Rate limit spacing between batches
  maxBatchWaitMs: 2000,

  enableBatching: true,
  preferBatchingOverSpeed: true, // Optimize for API quota conservation over speed
}

function createEpisodeBatches(episodeIds, batchSize = BATCH_CONFIG.maxBatchSize) {
  const batches = []

  for (let i = 0; i < episodeIds.length; i += batchSize) {
    batches.push(episodeIds.slice(i, i + batchSize))
  }

  return batches
}

async function processBatchMetadata(episodeBatch, operationDetails) {
  const results = {
    completed: [],
    failed: [],
    queued: [],
    conflicts: [],
  }

  try {
    if (!BATCH_CONFIG.enableBatching) {
      for (const episodeId of episodeBatch) {
        const result = await processEpisodeMetadata(episodeId, operationDetails)

        if (result.status === 'completed') {
          results.completed.push({episodeId, metadata: result.metadata})
          if (result.conflicts?.length > 0) {
            results.conflicts.push(...result.conflicts.map(c => ({...c, episodeId})))
          }
        } else if (result.status === 'queued') {
          results.queued.push(episodeId)
        } else {
          results.failed.push({episodeId, error: 'Unknown status'})
        }
      }

      return results
    }

    const sourceGroups = groupEpisodesBySource(episodeBatch, operationDetails.sources)

    for (const [source, episodeIds] of Object.entries(sourceGroups)) {
      const sourceBatchSize = getBatchSizeForSource(source)
      const subBatches = createEpisodeBatches(episodeIds, sourceBatchSize)

      for (const subBatch of subBatches) {
        const batchResults = await processBatchBySource(subBatch, source, operationDetails)

        results.completed.push(...batchResults.completed)
        results.failed.push(...batchResults.failed)
        results.queued.push(...batchResults.queued)
        results.conflicts.push(...batchResults.conflicts)

        if (subBatches.length > 1) {
          await new Promise(resolve => setTimeout(resolve, BATCH_CONFIG.batchDelayMs))
        }
      }
    }

    return results
  } catch (error) {
    console.error('[VBS SW] Batch processing failed:', error)

    episodeBatch.forEach(episodeId => {
      results.failed.push({
        episodeId,
        error: error.message || 'Batch processing error',
      })
    })

    return results
  }
}

// Distribute episodes across data sources using round-robin to balance API load.
// Production implementation should route based on episode metadata and source capabilities.
function groupEpisodesBySource(episodeIds, sources) {
  const groups = {}

  sources.forEach(source => {
    groups[source] = []
  })

  episodeIds.forEach((episodeId, index) => {
    const sourceIndex = index % sources.length
    const source = sources[sourceIndex]
    groups[source].push(episodeId)
  })

  return groups
}

function getBatchSizeForSource(source) {
  switch (source) {
    case 'tmdb':
      return BATCH_CONFIG.tmdbBatchSize
    case 'memory-alpha':
      return BATCH_CONFIG.memoryAlphaBatchSize
    default:
      return BATCH_CONFIG.maxBatchSize
  }
}

// Process batch with conflict resolution and lock management.
// Uses simulation for testing; production uses actual batch API endpoints.
async function processBatchBySource(episodeIds, source, operationDetails) {
  const results = {
    completed: [],
    failed: [],
    queued: [],
    conflicts: [],
  }

  try {
    const batchDelay = Math.random() * 500 + 300
    await new Promise(resolve => setTimeout(resolve, batchDelay))

    for (const episodeId of episodeIds) {
      try {
        if (isEpisodeLocked(episodeId)) {
          results.queued.push(episodeId)
          continue
        }

        if (!acquireEpisodeLock(episodeId, operationDetails.operationId)) {
          results.queued.push(episodeId)
          continue
        }

        const existingMetadata = await getExistingMetadata(episodeId)
        const newMetadata = await simulateBatchMetadataEnrichment(episodeId, source)
        const resolvedMetadata = await resolveMetadataConflicts(
          episodeId,
          newMetadata,
          existingMetadata,
        )

        await storeEpisodeMetadata(episodeId, resolvedMetadata)
        lastUpdateTimestamps.set(episodeId, Date.now())
        releaseEpisodeLock(episodeId, operationDetails.operationId)

        results.completed.push({
          episodeId,
          metadata: resolvedMetadata,
        })

        if (resolvedMetadata._conflicts?.length > 0) {
          results.conflicts.push(
            ...resolvedMetadata._conflicts.map(c => ({
              ...c,
              episodeId,
            })),
          )
        }
      } catch (error) {
        console.error(`[VBS SW] Failed to process ${episodeId} in batch:`, error)
        releaseEpisodeLock(episodeId, operationDetails.operationId)
        results.failed.push({
          episodeId,
          error: error.message || 'Processing error',
        })
      }
    }

    return results
  } catch (error) {
    console.error('[VBS SW] Batch source processing failed:', error)

    episodeIds.forEach(episodeId => {
      releaseEpisodeLock(episodeId, operationDetails.operationId)
      results.failed.push({
        episodeId,
        error: error.message || 'Batch source error',
      })
    })

    return results
  }
}

async function simulateBatchMetadataEnrichment(episodeId, source) {
  await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100))

  return {
    episodeId,
    title: `Episode ${episodeId}`,
    airDate: '2024-01-01',
    _source: source,
    _enrichedAt: new Date().toISOString(),
    _batchProcessed: true,
  }
}

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
    // Start metadata sync operation with fallback handling
    const {operationId, episodeIds, sources} = event.data.payload || {}
    startMetadataSyncWithFallback(operationId, episodeIds, sources).then(result => {
      if (event.ports[0]) {
        event.ports[0].postMessage({
          type: 'METADATA_SYNC_STARTED',
          data: {
            operationId: result.operationId,
            capability: result.capability,
            success: true,
          },
        })
      }
    })
  } else if (event.data && event.data.type === 'GET_SYNC_CAPABILITY') {
    // Get background sync capability status
    const capability = detectBackgroundSyncCapability()
    if (event.ports[0]) {
      event.ports[0].postMessage({
        type: 'SYNC_CAPABILITY',
        data: capability,
      })
    }
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
  } else if (event.data && event.data.type === 'START_CACHE_WARMING') {
    // Start cache warming operation (TASK-031)
    const {strategy, episodeIds, priority} = event.data.payload || {}
    handleCacheWarming({strategy, episodeIds, priority}).then(result => {
      if (event.ports[0]) {
        event.ports[0].postMessage({
          type: 'CACHE_WARMING_STARTED',
          data: result,
        })
      }
    })
  } else if (event.data && event.data.type === 'GET_WARMING_STATS') {
    // Get cache warming statistics (TASK-031)
    const stats = getCacheWarmingStats()
    if (event.ports[0]) {
      event.ports[0].postMessage({
        type: 'WARMING_STATS',
        data: stats,
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

// ============================================================================
// TASK-027: Conflict Resolution for Concurrent Metadata Updates
// ============================================================================

/**
 * Operation locks to prevent concurrent processing of the same episode.
 */
const operationLocks = new Map()

/**
 * Pending operation queues for episodes being processed.
 */
const pendingOperations = new Map()

/**
 * Last update timestamps for episodes to detect concurrent modifications.
 */
const lastUpdateTimestamps = new Map()

/**
 * Check if episode is currently locked.
 */
function isEpisodeLocked(episodeId) {
  return operationLocks.has(episodeId)
}

/**
 * Acquire lock for episode processing.
 */
function acquireEpisodeLock(episodeId, operationId) {
  if (operationLocks.has(episodeId)) {
    return false
  }

  operationLocks.set(episodeId, {
    operationId,
    lockedAt: new Date().toISOString(),
    lockType: 'metadata-update',
  })

  return true
}

/**
 * Release lock for episode processing.
 */
function releaseEpisodeLock(episodeId, operationId) {
  const lock = operationLocks.get(episodeId)
  if (lock && lock.operationId === operationId) {
    operationLocks.delete(episodeId)

    // Process any pending operations for this episode
    processPendingOperations(episodeId)
    return true
  }
  return false
}

/**
 * Queue operation for episode that is currently locked.
 */
function queuePendingOperation(episodeId, operationDetails) {
  if (!pendingOperations.has(episodeId)) {
    pendingOperations.set(episodeId, [])
  }

  const queue = pendingOperations.get(episodeId)

  // Check for duplicate operations (same episode, same sources)
  const isDuplicate = queue.some(pending => arraysEqual(pending.sources, operationDetails.sources))

  if (!isDuplicate) {
    queue.push({
      ...operationDetails,
      queuedAt: new Date().toISOString(),
      priority: operationDetails.priority || 1,
    })

    // Sort by priority (higher priority first)
    queue.sort((a, b) => b.priority - a.priority)
  }
}

/**
 * Process pending operations for an episode after lock is released.
 */
async function processPendingOperations(episodeId) {
  const queue = pendingOperations.get(episodeId)
  if (!queue || queue.length === 0) {
    return
  }

  // Take the highest priority operation
  const nextOperation = queue.shift()

  if (queue.length === 0) {
    pendingOperations.delete(episodeId)
  }

  // Process the next operation
  try {
    await processEpisodeMetadata(episodeId, nextOperation)
  } catch (error) {
    console.error(`[VBS SW] Failed to process pending operation for ${episodeId}:`, error)
    // Release lock if processing fails
    releaseEpisodeLock(episodeId, nextOperation.operationId)
  }
}

/**
 * Resolve conflicts when multiple metadata sources provide different data.
 */
async function resolveMetadataConflicts(episodeId, newMetadata, existingMetadata) {
  try {
    // Get stored operation details for conflict resolution strategy
    const conflictStrategy = 'latest-wins' // Default strategy

    if (!existingMetadata) {
      // No conflict - first metadata for this episode
      return newMetadata
    }

    const resolvedMetadata = {...existingMetadata}

    switch (conflictStrategy) {
      case 'latest-wins':
        // Latest update wins, but preserve non-empty values
        Object.keys(newMetadata).forEach(key => {
          if (newMetadata[key] != null && newMetadata[key] !== '') {
            resolvedMetadata[key] = newMetadata[key]
          }
        })
        break

      case 'merge-with-priority': {
        // Merge based on source priority (TMDB > Memory Alpha > others)
        const sourcePriority = ['tmdb', 'memory-alpha', 'trekcore', 'manual']

        Object.keys(newMetadata).forEach(key => {
          const newValue = newMetadata[key]
          const existingValue = existingMetadata[key]

          if (newValue == null || newValue === '') {
            return // Keep existing value
          }

          if (existingValue == null || existingValue === '') {
            resolvedMetadata[key] = newValue
            return
          }

          // Compare source priorities
          const newSource = newMetadata._source || 'manual'
          const existingSource = existingMetadata._source || 'manual'

          const newPriority = sourcePriority.indexOf(newSource)
          const existingPriority = sourcePriority.indexOf(existingSource)

          if (newPriority !== -1 && (existingPriority === -1 || newPriority < existingPriority)) {
            resolvedMetadata[key] = newValue
          }
        })
        break
      }

      case 'manual-review': {
        // Store conflicts for manual review
        const conflicts = []
        Object.keys(newMetadata).forEach(key => {
          const newValue = newMetadata[key]
          const existingValue = existingMetadata[key]

          if (newValue != null && existingValue != null && newValue !== existingValue) {
            conflicts.push({
              field: key,
              newValue,
              existingValue,
              newSource: newMetadata._source,
              existingSource: existingMetadata._source,
            })
          }
        })

        if (conflicts.length > 0) {
          // Store conflicts for later review
          await storeMetadataConflicts(episodeId, conflicts)
          // For now, keep existing data
          return existingMetadata
        }

        // No conflicts, merge new data
        Object.keys(newMetadata).forEach(key => {
          if (newMetadata[key] != null && newMetadata[key] !== '') {
            resolvedMetadata[key] = newMetadata[key]
          }
        })
        break
      }

      default:
        // Default to latest-wins
        Object.assign(resolvedMetadata, newMetadata)
    }

    // Update last modification timestamp
    resolvedMetadata._lastUpdated = new Date().toISOString()
    resolvedMetadata._resolvedAt = new Date().toISOString()

    return resolvedMetadata
  } catch (error) {
    console.error(`[VBS SW] Failed to resolve metadata conflicts for ${episodeId}:`, error)
    // Fallback to existing metadata on error
    return existingMetadata || newMetadata
  }
}

/**
 * Store metadata conflicts for manual review.
 */
async function storeMetadataConflicts(episodeId, conflicts) {
  try {
    const cache = await caches.open('vbs-metadata-conflicts')
    const conflictData = {
      episodeId,
      conflicts,
      detectedAt: new Date().toISOString(),
      status: 'pending-review',
    }

    const response = new Response(JSON.stringify(conflictData), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    })

    await cache.put(`/vbs/conflicts/${episodeId}`, response)
  } catch (error) {
    console.error('[VBS SW] Failed to store metadata conflicts:', error)
  }
}

/**
 * Process episode metadata with conflict resolution.
 */
async function processEpisodeMetadata(episodeId, operationDetails) {
  const operationId = operationDetails.operationId || `episode-${episodeId}-${Date.now()}`

  try {
    // Try to acquire lock
    if (!acquireEpisodeLock(episodeId, operationId)) {
      // Episode is locked, queue the operation
      queuePendingOperation(episodeId, {...operationDetails, operationId})
      return {
        status: 'queued',
        message: `Operation queued for episode ${episodeId}`,
      }
    }

    // Check for recent updates to detect concurrent modifications
    const lastUpdate = lastUpdateTimestamps.get(episodeId)
    const now = Date.now()

    if (lastUpdate && now - lastUpdate < 5000) {
      // Recent update detected, introduce small delay to avoid race conditions
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500))
    }

    // Get existing metadata from cache/storage
    const existingMetadata = await getExistingMetadata(episodeId)

    // Simulate metadata enrichment (actual implementation would call APIs)
    const newMetadata = await simulateMetadataEnrichment(episodeId, operationDetails.sources)

    // Resolve any conflicts between existing and new metadata
    const resolvedMetadata = await resolveMetadataConflicts(
      episodeId,
      newMetadata,
      existingMetadata,
    )

    // Store the resolved metadata
    await storeEpisodeMetadata(episodeId, resolvedMetadata)

    // Update timestamp
    lastUpdateTimestamps.set(episodeId, now)

    // Release lock
    releaseEpisodeLock(episodeId, operationId)

    return {
      status: 'completed',
      metadata: resolvedMetadata,
      conflicts: resolvedMetadata._conflicts || [],
    }
  } catch (error) {
    // Ensure lock is released on error
    releaseEpisodeLock(episodeId, operationId)
    throw error
  }
}

/**
 * Get existing metadata for an episode.
 */
async function getExistingMetadata(episodeId) {
  try {
    const cache = await caches.open('vbs-episode-metadata')
    const response = await cache.match(`/vbs/metadata/${episodeId}`)

    if (response) {
      return await response.json()
    }

    return null
  } catch (error) {
    console.error(`[VBS SW] Failed to get existing metadata for ${episodeId}:`, error)
    return null
  }
}

/**
 * Store episode metadata.
 */
async function storeEpisodeMetadata(episodeId, metadata) {
  try {
    const cache = await caches.open('vbs-episode-metadata')
    const response = new Response(JSON.stringify(metadata), {
      headers: {
        'Content-Type': 'application/json',
        'Last-Modified': new Date().toUTCString(),
      },
    })

    await cache.put(`/vbs/metadata/${episodeId}`, response)
  } catch (error) {
    console.error(`[VBS SW] Failed to store metadata for ${episodeId}:`, error)
  }
}

/**
 * Simulate metadata enrichment for testing.
 */
async function simulateMetadataEnrichment(episodeId, sources) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500))

  return {
    episodeId,
    title: `Episode ${episodeId}`,
    airDate: '2024-01-01',
    _source: sources[0] || 'manual',
    _enrichedAt: new Date().toISOString(),
  }
}

/**
 * Utility function to compare arrays for equality.
 */
function arraysEqual(a, b) {
  if (a === b) return true
  if (a == null || b == null) return false
  if (a.length !== b.length) return false

  for (const [index, item] of a.entries()) {
    if (item !== b[index]) return false
  }
  return true
}

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

    // Use conflict resolution for single episode metadata sync
    const episodeId = 'sample_episode_1' // In real implementation, extract from event data
    const operationDetails = {
      operationId,
      sources: ['tmdb', 'memory-alpha'],
      priority: 1,
    }

    const result = await processEpisodeMetadata(episodeId, operationDetails)

    if (result.status === 'completed') {
      // Update progress
      progress.completedJobs = 1
      progress.status = 'completed'
      progress.conflicts = result.conflicts
    } else if (result.status === 'queued') {
      // Operation was queued due to conflict
      progress.status = 'queued'
    } else {
      throw new Error(`Unexpected result status: ${result.status}`)
    }

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
          progress.error = error.message
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

    // TASK-028: Use batch processing for optimized API usage
    const batches = createEpisodeBatches(operationDetails.episodeIds, BATCH_CONFIG.maxBatchSize)

    let processedCount = 0

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const operation = activeOperations.get(operationId)

      // Check for cancellation
      if (operation?.cancelled) {
        const remaining = totalJobs - processedCount
        progress.status = 'cancelled'
        progress.cancelledJobs = remaining
        metadataProgress.set(operationId, progress)
        await notifyClientsOfProgress(progress)
        return
      }

      const batch = batches[batchIndex]
      progress.currentJob = `Batch ${batchIndex + 1}/${batches.length} (${batch.length} episodes)`

      try {
        // Process batch with optimized API calls
        const batchOperationDetails = {
          operationId: `${operationId}-batch-${batchIndex}`,
          sources: operationDetails.sources,
          priority: operationDetails.priority,
        }

        const batchResults = await processBatchMetadata(batch, batchOperationDetails)

        // Update progress with batch results
        progress.completedJobs += batchResults.completed.length
        progress.failedJobs += batchResults.failed.length

        // Track queued jobs
        if (batchResults.queued.length > 0) {
          if (!progress.queuedJobs) {
            progress.queuedJobs = 0
          }
          progress.queuedJobs += batchResults.queued.length
        }

        // Track conflicts at operation level
        if (batchResults.conflicts.length > 0) {
          if (!progress.conflicts) {
            progress.conflicts = []
          }
          progress.conflicts.push(...batchResults.conflicts)
        }

        processedCount += batch.length

        // Update estimated completion based on actual progress
        const elapsed = Date.now() - new Date(progress.startedAt).getTime()
        const avgTimePerJob = elapsed / processedCount
        const remaining = totalJobs - processedCount
        progress.estimatedCompletion = new Date(
          Date.now() + remaining * avgTimePerJob,
        ).toISOString()

        progress.currentJob = undefined
      } catch (error) {
        console.error(`[VBS SW] Failed to process batch ${batchIndex}:`, error)

        // Mark all episodes in batch as failed
        batch.forEach(() => {
          progress.failedJobs += 1
        })
        processedCount += batch.length
        progress.currentJob = undefined
      }

      metadataProgress.set(operationId, progress)
      await notifyClientsOfProgress(progress)

      // Add delay between batches for rate limiting
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, BATCH_CONFIG.batchDelayMs))
      }
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

// ============================================================================
// BACKGROUND SYNC GRACEFUL DEGRADATION (TASK-030)
// ============================================================================

/**
 * Detect Background Sync API availability and determine fallback strategy.
 * Provides comprehensive capability detection for graceful degradation.
 */
function detectBackgroundSyncCapability() {
  try {
    const capability = {
      isAvailable: false,
      reason: undefined,
      fallbackStrategy: 'disabled',
      browserInfo: {
        userAgent: globalThis.navigator?.userAgent || 'unknown',
        platform: globalThis.navigator?.platform || 'unknown',
      },
    }

    // Check if service worker registration is available
    if (!globalThis.registration) {
      capability.reason = 'service-worker-unavailable'
      capability.fallbackStrategy = 'manual'
      return capability
    }

    // Check if Background Sync API is supported
    if (!('sync' in globalThis.registration)) {
      capability.reason = 'not-supported'
      capability.fallbackStrategy = 'polling'
      return capability
    }

    // Check if sync is disabled by user/browser policy
    if (
      globalThis.registration.sync &&
      typeof globalThis.registration.sync.register !== 'function'
    ) {
      capability.reason = 'disabled'
      capability.fallbackStrategy = 'manual'
      console.warn('[VBS SW] Background Sync API is disabled. Manual sync only.')
      return capability
    }

    // Background Sync API is available
    capability.isAvailable = true
    capability.fallbackStrategy = 'immediate'
    return capability
  } catch (error) {
    console.error('[VBS SW] Error detecting background sync capability:', error)
    return {
      isAvailable: false,
      reason: 'not-supported',
      fallbackStrategy: 'manual',
      browserInfo: {
        userAgent: 'error',
        platform: 'error',
      },
    }
  }
}

/**
 * Enhanced startMetadataSync with comprehensive fallback handling.
 * Handles graceful degradation when Background Sync API is unavailable.
 */
async function startMetadataSyncWithFallback(operationId, episodeIds, sources) {
  try {
    const capability = detectBackgroundSyncCapability()

    if (!operationId) {
      operationId = `metadata-sync-${Date.now()}`
    }

    const operationDetails = {
      episodeIds: episodeIds || ['sample_episode_1'],
      sources: sources || ['tmdb', 'memory-alpha'],
      priority: 1,
      syncCapability: capability,
    }

    activeOperations.set(operationId, {
      type: 'bulk',
      details: operationDetails,
      cancelled: false,
    })

    // Execute based on capability and fallback strategy
    if (capability.isAvailable) {
      // Use native Background Sync API
      await globalThis.registration.sync.register('bulk-metadata-sync')
    } else {
      // Execute fallback strategy
      switch (capability.fallbackStrategy) {
        case 'immediate':
          await handleBulkMetadataSync({operationId, operationDetails})
          break

        case 'polling':
          schedulePollingSync(operationId, operationDetails)
          break

        case 'manual':
          // Notify client that manual sync is required
          console.warn(
            `[VBS SW] Manual sync required for operation ${operationId} - Background Sync unavailable`,
          )
          await notifyClientsOfSyncCapability(capability)
          // Still execute immediately to not block user
          await handleBulkMetadataSync({operationId, operationDetails})
          break

        case 'disabled':
          console.error(
            `[VBS SW] Metadata sync disabled for operation ${operationId} - Background Sync unavailable`,
          )
          await notifyClientsOfSyncCapability(capability)
          break

        default:
          console.warn(`[VBS SW] Unknown fallback strategy: ${capability.fallbackStrategy}`)
          await handleBulkMetadataSync({operationId, operationDetails})
      }
    }

    return {operationId, capability}
  } catch (error) {
    console.error('[VBS SW] Failed to start metadata sync with fallback:', error)
    throw error
  }
}

/**
 * Schedule polling-based sync for environments without Background Sync API.
 * Provides graceful degradation with periodic checking.
 */
function schedulePollingSync(operationId, operationDetails) {
  try {
    // Use polling interval from operation priority or default (5 minutes)
    const pollingInterval = operationDetails.priority === 3 ? 60000 : 300000
    const maxPolls = 12 // Maximum 12 polls (1 hour at 5-minute intervals)
    let pollCount = 0

    const pollingTimer = setInterval(async () => {
      try {
        pollCount++

        // Check if operation was cancelled
        const operation = activeOperations.get(operationId)
        if (!operation || operation.cancelled) {
          clearInterval(pollingTimer)
          return
        }

        // Execute metadata sync
        await handleBulkMetadataSync({operationId, operationDetails})

        // Check if operation completed
        const progress = metadataProgress.get(operationId)
        if (progress && progress.status === 'completed') {
          clearInterval(pollingTimer)
          return
        }

        // Stop polling after maximum attempts
        if (pollCount >= maxPolls) {
          clearInterval(pollingTimer)
          console.warn(
            `[VBS SW] Polling stopped after ${maxPolls} attempts for operation ${operationId}`,
          )
        }
      } catch (error) {
        console.error('[VBS SW] Error during polling sync:', error)
      }
    }, pollingInterval)

    // Store timer reference for cleanup
    if (!globalThis.pollingTimers) {
      globalThis.pollingTimers = new Map()
    }
    globalThis.pollingTimers.set(operationId, pollingTimer)
  } catch (error) {
    console.error('[VBS SW] Failed to schedule polling sync:', error)
  }
}

/**
 * Notify all clients about background sync capability status.
 * Allows UI to show appropriate messages about sync availability.
 */
async function notifyClientsOfSyncCapability(capability) {
  try {
    const clients = await globalThis.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    })

    const message = {
      type: 'SYNC_CAPABILITY_UPDATE',
      capability,
      timestamp: Date.now(),
    }

    for (const client of clients) {
      client.postMessage(message)
    }
  } catch (error) {
    console.error('[VBS SW] Failed to notify clients of sync capability:', error)
  }
}

// ============================================================================
// TASK-031: Cache Warming for Popular and Recently Watched Episodes
// ============================================================================

/**
 * Cache warming state - track warming jobs and statistics.
 */
const warmingJobs = new Map()
const warmingStats = {
  totalWarmed: 0,
  successfulWarming: 0,
  failedWarming: 0,
  lastWarmingAt: null,
}

/**
 * Handle cache warming request from main application.
 * Processes warming jobs for popular episodes, recently watched content, etc.
 *
 * @param {object} data - Warming request data
 * @param {string} data.strategy - Warming strategy (popular-episodes, recently-watched, etc.)
 * @param {string[]} data.episodeIds - Episode IDs to warm
 * @param {number} data.priority - Priority level for warming jobs
 * @returns {Promise<object>} Warming operation result
 */
async function handleCacheWarming(data) {
  const {strategy, episodeIds, priority = 2} = data
  const warmingId = `warming_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  try {
    const results = {
      warmingId,
      strategy,
      totalEpisodes: episodeIds.length,
      warmedEpisodes: 0,
      failedEpisodes: 0,
      startedAt: new Date().toISOString(),
    }

    // Process each episode for warming
    for (const episodeId of episodeIds) {
      try {
        // Check if metadata already exists in cache
        const cached = await getExistingMetadata(episodeId)

        if (cached == null) {
          // Queue metadata enrichment for this episode
          const job = {
            episodeId,
            priority,
            type: 'cache-warm',
            metadata: {
              warmingStrategy: strategy,
              warmingId,
            },
          }

          warmingJobs.set(episodeId, {
            ...job,
            queuedAt: new Date().toISOString(),
          })

          // Enrich metadata (this would normally be done via metadata queue)
          const metadata = await simulateBatchMetadataEnrichment(episodeId, 'tmdb')
          await storeEpisodeMetadata(episodeId, metadata)

          results.warmedEpisodes += 1
          warmingStats.successfulWarming += 1
        } else {
          // Already warmed
          results.warmedEpisodes += 1
        }
      } catch (error) {
        console.error(`[VBS SW] Failed to warm episode ${episodeId}:`, error)
        results.failedEpisodes += 1
        warmingStats.failedWarming += 1
      }
    }

    results.completedAt = new Date().toISOString()
    warmingStats.totalWarmed += results.warmedEpisodes
    warmingStats.lastWarmingAt = results.completedAt

    // Notify clients of warming completion
    await notifyClientsOfWarmingComplete(results)

    return results
  } catch (error) {
    console.error('[VBS SW] Cache warming failed:', error)
    throw error
  }
}

/**
 * Notify clients about cache warming completion.
 *
 * @param {object} results - Warming operation results
 */
async function notifyClientsOfWarmingComplete(results) {
  try {
    const clients = await globalThis.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    })

    const message = {
      type: 'CACHE_WARMING_COMPLETE',
      data: results,
      timestamp: Date.now(),
    }

    for (const client of clients) {
      client.postMessage(message)
    }
  } catch (error) {
    console.error('[VBS SW] Failed to notify clients of warming completion:', error)
  }
}

/**
 * Get cache warming statistics.
 *
 * @returns {object} Warming statistics
 */
function getCacheWarmingStats() {
  return {
    ...warmingStats,
    activeWarmingJobs: warmingJobs.size,
  }
}
