import type {
  RateLimitConfig,
  StreamingApiConfig,
  StreamingApiEvents,
  StreamingApiInstance,
  StreamingApiResponse,
  StreamingAvailability,
  StreamingCache,
  StreamingPreferences,
} from './types.js'
import {filterAvailabilityByRegion, sanitizeLocationPreferences} from '../utils/geographic.js'
import {withErrorHandling, withSyncErrorHandling} from './error-handler.js'
import {createEventEmitter} from './events.js'
import {createStorage, IndexedDBAdapter, LocalStorageAdapter} from './storage.js'

// Storage keys for streaming data
const STREAMING_CACHE_KEY = 'streamingAvailabilityCache'
const STREAMING_PREFERENCES_KEY = 'streamingPreferences'
const RATE_LIMIT_KEY = 'streamingRateLimit'

/**
 * Default streaming preferences configuration
 * Provides sensible defaults for users without configured streaming preferences
 */
const DEFAULT_STREAMING_PREFERENCES: StreamingPreferences = {
  preferredPlatforms: ['paramount-plus', 'netflix', 'amazon-prime', 'hulu'],
  hideUnavailable: false,
  showPricing: true,
  location: {
    region: 'US',
    allowAutoDetection: false,
    showOtherRegions: false,
    locale: 'en-US',
  },
  enableNotifications: true,
  maxPrice: {
    rent: 5.99,
    buy: 14.99,
    currency: 'USD',
  },
}

/**
 * Default rate limiting configuration
 * Conservative limits to stay within API quotas while providing good user experience
 */
const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  requestsPerMinute: 10,
  requestsPerHour: 100,
  requestsPerDay: 500,
  current: {
    minute: 0,
    hour: 0,
    day: 0,
  },
  windows: {
    minute: Date.now(),
    hour: Date.now(),
    day: Date.now(),
  },
}

/**
 * Validate streaming cache data structure for storage integrity
 */
const validateStreamingCache = (data: unknown): data is StreamingCache => {
  if (!data || typeof data !== 'object') return false

  const cache = data as Record<string, unknown>
  return (
    typeof cache['contentId'] === 'string' &&
    Array.isArray(cache['availability']) &&
    typeof cache['cachedAt'] === 'string' &&
    typeof cache['expiresAt'] === 'string'
  )
}

/**
 * Validate streaming preferences data structure
 */
const validateStreamingPreferences = (data: unknown): data is StreamingPreferences => {
  if (!data || typeof data !== 'object') return false

  const prefs = data as Record<string, unknown>
  return (
    Array.isArray(prefs['preferredPlatforms']) &&
    typeof prefs['hideUnavailable'] === 'boolean' &&
    typeof prefs['location'] === 'object' &&
    prefs['location'] !== null
  )
}

/**
 * Sanitize streaming preferences with defaults
 */
const sanitizeStreamingPreferences = (prefs: StreamingPreferences): StreamingPreferences => {
  return {
    ...DEFAULT_STREAMING_PREFERENCES,
    ...prefs,
    preferredPlatforms: Array.isArray(prefs.preferredPlatforms)
      ? prefs.preferredPlatforms
      : DEFAULT_STREAMING_PREFERENCES.preferredPlatforms,
    location: sanitizeLocationPreferences({
      ...DEFAULT_STREAMING_PREFERENCES.location,
      ...(prefs.location || {}),
    }),
  }
}

/**
 * Factory function to create streaming API manager with Watchmode integration.
 * Provides streaming availability data with local caching, rate limiting, and background refresh.
 *
 * Uses closure-based state management following VBS functional factory patterns.
 * Integrates with IndexedDB for efficient caching and provides type-safe event emission.
 *
 * @returns StreamingApiInstance with methods for managing streaming availability data
 *
 * @example
 * ```typescript
 * const streamingApi = createStreamingApi()
 *
 * // Initialize with Watchmode API configuration
 * await streamingApi.initialize({
 *   provider: 'watchmode',
 *   apiKey: process.env.WATCHMODE_API_KEY,
 *   baseUrl: 'https://api.watchmode.com/v1',
 *   rateLimit: { requestsPerMinute: 10, requestsPerHour: 100, requestsPerDay: 500 },
 *   cache: { defaultExpiration: 24, maxSize: 50, backgroundRefresh: true },
 *   defaultRegion: 'US',
 *   debugMode: false
 * })
 *
 * // Listen for availability updates
 * streamingApi.on('availability-updated', ({ contentId, availability }) => {
 *   console.log(`Updated availability for ${contentId}:`, availability)
 * })
 *
 * // Get streaming availability for Star Trek content
 * const availability = await streamingApi.getAvailability('tos_s1')
 * ```
 */
export const createStreamingApi = (): StreamingApiInstance => {
  // Private state in closure
  let config: StreamingApiConfig | null = null
  let isInitialized = false
  let currentPreferences: StreamingPreferences = {...DEFAULT_STREAMING_PREFERENCES}
  let rateLimitState: RateLimitConfig = {...DEFAULT_RATE_LIMIT}

  // Create storage adapters for different data types
  const cacheStorage = createStorage(
    new IndexedDBAdapter<Map<string, StreamingCache>>('StreamingVBS', 'availability_cache', 1, {
      validate: (data: unknown): data is Map<string, StreamingCache> => {
        if (!(data instanceof Map)) return false
        for (const [, value] of data) {
          if (!validateStreamingCache(value)) return false
        }
        return true
      },
      fallback: new Map(),
      sanitize: (data: Map<string, StreamingCache>) => {
        // Clean up expired entries during sanitization
        const now = new Date()
        for (const [key, value] of data.entries()) {
          if (new Date(value.expiresAt) < now) {
            data.delete(key)
          }
        }
        return data
      },
    }),
  )

  const preferencesStorage = createStorage(
    new LocalStorageAdapter<StreamingPreferences>({
      validate: validateStreamingPreferences,
      sanitize: sanitizeStreamingPreferences,
      fallback: DEFAULT_STREAMING_PREFERENCES,
    }),
  )

  const rateLimitStorage = createStorage(
    new LocalStorageAdapter<RateLimitConfig>({
      validate: (data: unknown): data is RateLimitConfig => {
        if (!data || typeof data !== 'object') return false
        const limit = data as Record<string, unknown>
        return typeof limit['requestsPerMinute'] === 'number'
      },
      fallback: DEFAULT_RATE_LIMIT,
    }),
  )

  // Generic EventEmitter for type-safe streaming events
  const eventEmitter = createEventEmitter<StreamingApiEvents>()

  /**
   * Check and update rate limiting state
   * Resets counters when time windows expire
   */
  const updateRateLimitState = withSyncErrorHandling(() => {
    const now = Date.now()

    // Reset minute window if expired
    if (now - rateLimitState.windows.minute >= 60000) {
      rateLimitState.current.minute = 0
      rateLimitState.windows.minute = now
    }

    // Reset hour window if expired
    if (now - rateLimitState.windows.hour >= 3600000) {
      rateLimitState.current.hour = 0
      rateLimitState.windows.hour = now
    }

    // Reset day window if expired
    if (now - rateLimitState.windows.day >= 86400000) {
      rateLimitState.current.day = 0
      rateLimitState.windows.day = now
    }

    // Save updated rate limit state
    rateLimitStorage.save(RATE_LIMIT_KEY, rateLimitState)
  }, 'Failed to update rate limit state')

  /**
   * Check if API request is allowed under current rate limits
   */
  const isRequestAllowed = (): boolean => {
    if (!config) return false

    updateRateLimitState()

    return (
      rateLimitState.current.minute < config.rateLimit.requestsPerMinute &&
      rateLimitState.current.hour < config.rateLimit.requestsPerHour &&
      rateLimitState.current.day < config.rateLimit.requestsPerDay
    )
  }

  /**
   * Increment rate limit counters and emit warnings if approaching limits
   */
  const incrementRateLimit = withSyncErrorHandling(() => {
    if (!config) return

    rateLimitState.current.minute++
    rateLimitState.current.hour++
    rateLimitState.current.day++

    // Emit warning if approaching rate limits (80% threshold)
    const minuteWarning = rateLimitState.current.minute >= config.rateLimit.requestsPerMinute * 0.8
    const hourWarning = rateLimitState.current.hour >= config.rateLimit.requestsPerHour * 0.8
    const dayWarning = rateLimitState.current.day >= config.rateLimit.requestsPerDay * 0.8

    if (minuteWarning || hourWarning || dayWarning) {
      eventEmitter.emit('rate-limit-warning', {
        current: Math.max(
          rateLimitState.current.minute,
          rateLimitState.current.hour,
          rateLimitState.current.day,
        ),
        limit: Math.min(
          config.rateLimit.requestsPerMinute,
          config.rateLimit.requestsPerHour,
          config.rateLimit.requestsPerDay,
        ),
        resetTime: Math.min(
          rateLimitState.windows.minute + 60000,
          rateLimitState.windows.hour + 3600000,
          rateLimitState.windows.day + 86400000,
        ),
      })
    }

    rateLimitStorage.save(RATE_LIMIT_KEY, rateLimitState)
  }, 'Failed to update rate limit counters')

  /**
   * Make authenticated API request to Watchmode with error handling and rate limiting
   */
  const makeApiRequest = async <T = unknown>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<StreamingApiResponse<T>> => {
    if (!config) {
      throw new Error('Streaming API not initialized')
    }

    if (!isRequestAllowed()) {
      const error = 'Rate limit exceeded'
      eventEmitter.emit('rate-limit-exceeded', {
        retryAfter: Math.min(
          rateLimitState.windows.minute + 60000 - Date.now(),
          rateLimitState.windows.hour + 3600000 - Date.now(),
          rateLimitState.windows.day + 86400000 - Date.now(),
        ),
        endpoint,
      })
      throw new Error(error)
    }

    const startTime = Date.now()
    incrementRateLimit()

    const url = `${config.baseUrl}${endpoint}`
    const headers = {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    const responseTime = Date.now() - startTime

    if (!response.ok) {
      const error = `API request failed: ${response.status} ${response.statusText}`
      eventEmitter.emit('api-error', {
        error,
        endpoint,
        status: response.status,
      })
      throw new Error(error)
    }

    const data = await response.json()

    return {
      success: true,
      data,
      status: response.status,
      rateLimit: {
        remaining: Number.parseInt(response.headers.get('X-RateLimit-Remaining') || '0'),
        reset: Number.parseInt(response.headers.get('X-RateLimit-Reset') || '0'),
        limit: Number.parseInt(response.headers.get('X-RateLimit-Limit') || '0'),
      },
      metadata: {
        timestamp: new Date().toISOString(),
        responseTime,
        source: config.provider,
      },
    }
  }

  /**
   * Transform Watchmode API response to VBS StreamingAvailability format
   */
  const transformAvailabilityData = (watchmodeData: any[]): StreamingAvailability[] => {
    if (!Array.isArray(watchmodeData)) return []

    return watchmodeData.map(
      (item): StreamingAvailability => ({
        contentId: item.content_id || '',
        contentType: item.content_type || 'series',
        platform: {
          id: item.source_id || '',
          name: item.name || '',
          logo: item.logo_100px || '',
          url: item.web_url || '',
          requiresSubscription: item.type === 'subscription',
          regions: item.regions || ['US'],
        },
        url: item.web_url || '',
        type: item.type || 'subscription',
        ...(item.price
          ? {
              price: {
                amount: Number.parseFloat(item.price),
                currency: item.currency || 'USD',
              },
            }
          : {}),
        quality: item.format || ['HD'],
        regions: item.regions || ['US'],
        lastUpdated: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      }),
    )
  }

  /**
   * Get cached availability data for content
   * Handles expiration checking and automatic cleanup of expired entries
   * Returns null if no valid cache exists
   */
  const getCachedAvailability = async (
    contentId: string,
  ): Promise<StreamingAvailability[] | null> => {
    try {
      const cache =
        (await cacheStorage.load(STREAMING_CACHE_KEY)) || new Map<string, StreamingCache>()
      if (!(cache instanceof Map)) return null

      const cached = cache.get(contentId)
      if (!cached) return null

      // Check if cache is expired
      if (new Date(cached.expiresAt) < new Date()) {
        cache.delete(contentId)
        await cacheStorage.save(STREAMING_CACHE_KEY, cache)

        // Emit cache-expired event to trigger background refresh
        eventEmitter.emit('cache-expired', {contentId, expiredAt: cached.expiresAt})

        return null
      }

      return cached.availability
    } catch (error) {
      console.error('Failed to retrieve cached availability data:', error)
      return null
    }
  }

  /**
   * Cache availability data for content with IndexedDB persistence
   */
  const cacheAvailabilityData = async (
    contentId: string,
    availability: StreamingAvailability[],
  ): Promise<void> => {
    try {
      const cache =
        ((await cacheStorage.load(STREAMING_CACHE_KEY)) as Map<string, StreamingCache>) || new Map()

      const cacheEntry: StreamingCache = {
        contentId,
        availability,
        cachedAt: new Date().toISOString(),
        expiresAt: new Date(
          Date.now() + (config?.cache.defaultExpiration || 24) * 60 * 60 * 1000,
        ).toISOString(),
        metadata: {
          source: config?.provider || 'unknown',
          timestamp: new Date().toISOString(),
          success: true,
        },
      }

      cache.set(contentId, cacheEntry)
      await cacheStorage.save(STREAMING_CACHE_KEY, cache)

      eventEmitter.emit('cache-updated', {
        contentId,
        cacheSize: cache.size,
        expiresAt: cacheEntry.expiresAt,
      })
    } catch (error) {
      console.error('Failed to cache availability data:', error)
    }
  }

  /**
   * Background refresh functionality for expired cache entries
   * Refreshes data automatically in the background without blocking user operations
   */
  const startBackgroundRefresh = withErrorHandling(async (): Promise<void> => {
    if (!config?.cache.backgroundRefresh) return

    const cache =
      (await cacheStorage.load(STREAMING_CACHE_KEY)) || new Map<string, StreamingCache>()
    if (!(cache instanceof Map)) return

    const now = new Date()
    const expiredEntries: string[] = []

    // Identify expired entries that need refresh
    for (const [contentId, cached] of cache.entries()) {
      if (new Date(cached.expiresAt) < now) {
        expiredEntries.push(contentId)
      }
    }

    if (expiredEntries.length === 0) return

    const startTime = Date.now()
    let updatedItems = 0
    let failedItems = 0

    // Refresh expired entries with rate limiting
    for (const contentId of expiredEntries) {
      try {
        if (!isRequestAllowed()) {
          // Skip if rate limit would be exceeded
          break
        }

        const response = await makeApiRequest<any[]>(`/title/${contentId}/sources`)
        if (response.success && response.data) {
          const availability = transformAvailabilityData(response.data)
          await cacheAvailabilityData(contentId, availability)
          updatedItems++
        } else {
          failedItems++
        }

        // Small delay between requests to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`Failed to refresh availability for ${contentId}:`, error)
        failedItems++
      }
    }

    // Emit background refresh completion event
    eventEmitter.emit('background-refresh', {
      updatedItems,
      failedItems,
      duration: Date.now() - startTime,
    })
  }, 'Background refresh failed')

  /**
   * Clear expired cache entries and return count of cleared items
   */
  const clearExpiredCacheImpl = async (): Promise<number> => {
    const cache =
      (await cacheStorage.load(STREAMING_CACHE_KEY)) || new Map<string, StreamingCache>()
    if (!(cache instanceof Map)) return 0

    const now = new Date()
    let clearedCount = 0

    for (const [contentId, cached] of cache.entries()) {
      if (new Date(cached.expiresAt) < now) {
        cache.delete(contentId)
        clearedCount++
      }
    }

    if (clearedCount > 0) {
      await cacheStorage.save(STREAMING_CACHE_KEY, cache)
    }

    return clearedCount
  }

  const clearExpiredCache = withErrorHandling(
    clearExpiredCacheImpl,
    'Failed to clear expired cache',
  )

  // Set up periodic background refresh if enabled
  let backgroundRefreshInterval: NodeJS.Timeout | null = null

  const setupBackgroundRefresh = (): void => {
    if (backgroundRefreshInterval) {
      clearInterval(backgroundRefreshInterval)
    }

    if (config?.cache.backgroundRefresh) {
      // Run background refresh every hour
      backgroundRefreshInterval = setInterval(
        () => {
          startBackgroundRefresh()
        },
        60 * 60 * 1000,
      )
    }
  }

  // Return public API following VBS functional factory pattern
  const streamingApi: StreamingApiInstance = {
    /**
     * Initialize streaming API with configuration
     */
    initialize: async (apiConfig: StreamingApiConfig): Promise<void> => {
      config = apiConfig
      isInitialized = true

      // Load stored preferences and rate limit state
      const storedPreferences = preferencesStorage.load(
        STREAMING_PREFERENCES_KEY,
      ) as StreamingPreferences | null
      if (storedPreferences) {
        currentPreferences = sanitizeStreamingPreferences(storedPreferences)
      }

      const storedRateLimit = rateLimitStorage.load(RATE_LIMIT_KEY) as RateLimitConfig | null
      if (storedRateLimit) {
        rateLimitState = {...DEFAULT_RATE_LIMIT, ...storedRateLimit}
      }

      updateRateLimitState()

      // Set up background refresh if enabled
      setupBackgroundRefresh()
    },

    /**
     * Get streaming availability for specific content
     */
    getAvailability: async (contentId: string): Promise<StreamingAvailability[]> => {
      if (!isInitialized || !config) {
        throw new Error('Streaming API not initialized')
      }

      // Check cache first
      const cached = await getCachedAvailability(contentId)
      if (cached) {
        // Apply geographic filtering to cached data based on current preferences
        return filterAvailabilityByRegion(cached, currentPreferences.location.region)
      }

      // Make API request for fresh data
      const response = await makeApiRequest<any[]>(`/title/${contentId}/sources`)

      if (!response.success || !response.data) {
        throw new Error('Failed to fetch streaming availability')
      }

      const availability = transformAvailabilityData(response.data)
      // Cache the unfiltered data to support region changes
      await cacheAvailabilityData(contentId, availability)

      // Filter by current region preference before returning
      const filteredAvailability = filterAvailabilityByRegion(
        availability,
        currentPreferences.location.region,
      )

      eventEmitter.emit('availability-updated', {
        contentId,
        availability: filteredAvailability,
        source: config.provider,
      })

      return filteredAvailability
    },

    /**
     * Get availability for multiple content items (batch operation)
     * Implements intelligent batching with cache optimization, rate limiting,
     * and comprehensive error handling for efficient streaming data updates.
     *
     * @param contentIds Array of content IDs to fetch availability for
     * @returns Map of content ID to streaming availability data
     *
     * Features:
     * - Cache-aware batching (fetches from cache first, API only for missing/expired)
     * - Intelligent batch sizing based on rate limits and cache state
     * - Comprehensive error handling and recovery
     * - Performance monitoring and event emission
     * - Automatic retry for failed requests with exponential backoff
     *
     * @example
     * ```typescript
     * const streamingApi = createStreamingApi()
     * const contentIds = ['tos_s1', 'tng_s1', 'ds9_s1']
     * const availability = await streamingApi.getBatchAvailability(contentIds)
     *
     * // Listen for batch completion events
     * streamingApi.on('batch-availability-updated', ({ totalRequested, fromCache, fromApi }) => {
     *   console.log(`Batch complete: ${totalRequested} requested, ${fromCache} from cache, ${fromApi} from API`)
     * })
     * ```
     */
    getBatchAvailability: async (
      contentIds: string[],
    ): Promise<Map<string, StreamingAvailability[]>> => {
      if (!isInitialized || !config) {
        throw new Error('Streaming API not initialized')
      }

      if (contentIds.length === 0) {
        return new Map()
      }

      const startTime = Date.now()
      const results = new Map<string, StreamingAvailability[]>()
      const failed: string[] = []
      let fromCache = 0
      let fromApi = 0

      // Phase 1: Check cache for all items first (batch cache operation)
      const cacheCheckPromises = contentIds.map(async contentId => {
        try {
          const cached = await getCachedAvailability(contentId)
          if (cached) {
            const filteredAvailability = filterAvailabilityByRegion(
              cached,
              currentPreferences.location.region,
            )
            results.set(contentId, filteredAvailability)
            fromCache++
            return {contentId, cached: true}
          }
          return {contentId, cached: false}
        } catch (error) {
          console.warn(`Cache check failed for ${contentId}:`, error)
          return {contentId, cached: false}
        }
      })

      const cacheResults = await Promise.all(cacheCheckPromises)
      const uncachedIds = cacheResults
        .filter(result => !result.cached)
        .map(result => result.contentId)

      // Phase 2: Batch API requests for uncached items with intelligent sizing
      if (uncachedIds.length > 0) {
        // Calculate optimal batch size based on rate limits and current usage
        const rateLimitStatus = rateLimitState
        const availableRequests = Math.max(
          1,
          Math.min(
            rateLimitStatus.requestsPerMinute - rateLimitStatus.current.minute,
            Math.floor(rateLimitStatus.requestsPerHour / 12), // Conservative hourly distribution
            uncachedIds.length,
          ),
        )

        const optimalBatchSize = Math.min(
          Math.max(2, Math.floor(availableRequests / 2)), // Reserve half for other operations
          8, // Max batch size to prevent overwhelming API
        )

        // Process uncached items in optimized batches
        for (let i = 0; i < uncachedIds.length; i += optimalBatchSize) {
          const batch = uncachedIds.slice(i, i + optimalBatchSize)

          // Check rate limits before each batch
          if (!isRequestAllowed()) {
            console.warn('Rate limit reached during batch operation, stopping')
            failed.push(...uncachedIds.slice(i))
            break
          }

          // Process batch with retry logic
          const batchPromises = batch.map(async contentId => {
            const maxRetries = 2
            let retryCount = 0

            while (retryCount <= maxRetries) {
              try {
                // Use direct API call to avoid recursive cache checks
                const response = await makeApiRequest<any[]>(`/title/${contentId}/sources`)

                if (!response.success || !response.data) {
                  throw new Error(`API request failed: ${response.status || 'Unknown error'}`)
                }

                const availability = transformAvailabilityData(response.data)
                await cacheAvailabilityData(contentId, availability)

                const filteredAvailability = filterAvailabilityByRegion(
                  availability,
                  currentPreferences.location.region,
                )

                results.set(contentId, filteredAvailability)
                fromApi++
                return {contentId, success: true}
              } catch (error) {
                retryCount++
                if (retryCount <= maxRetries) {
                  // Exponential backoff for retries
                  const backoffTime = Math.min(1000 * 2 ** (retryCount - 1), 5000)
                  await new Promise(resolve => setTimeout(resolve, backoffTime))
                  console.warn(
                    `Retry ${retryCount}/${maxRetries} for ${contentId} after ${backoffTime}ms:`,
                    error,
                  )
                } else {
                  console.error(
                    `Failed to get availability for ${contentId} after ${maxRetries} retries:`,
                    error,
                  )
                  results.set(contentId, [])
                  failed.push(contentId)
                  return {contentId, success: false}
                }
              }
            }
            return {contentId, success: false}
          })

          await Promise.all(batchPromises)

          // Progressive delay between batches (longer delays for larger batches)
          if (i + optimalBatchSize < uncachedIds.length) {
            const delay = Math.min(1000 + batch.length * 200, 3000)
            await new Promise(resolve => setTimeout(resolve, delay))
          }
        }
      }

      // Phase 3: Handle completely failed items with empty arrays
      const remainingIds = contentIds.filter(id => !results.has(id))
      remainingIds.forEach(contentId => {
        results.set(contentId, [])
        if (!failed.includes(contentId)) {
          failed.push(contentId)
        }
      })

      // Emit comprehensive batch completion event
      const duration = Date.now() - startTime
      eventEmitter.emit('batch-availability-updated', {
        totalRequested: contentIds.length,
        totalFetched: results.size,
        fromCache,
        fromApi,
        failed,
        duration,
      })

      return results
    },

    /**
     * Search for content by title
     */
    searchContent: async (title: string, type?: string): Promise<StreamingApiResponse> => {
      if (!isInitialized || !config) {
        throw new Error('Streaming API not initialized')
      }

      const params = new URLSearchParams({
        search_field: 'name',
        search_value: title,
      })

      if (type) {
        params.append('types', type)
      }

      return makeApiRequest(`/autocomplete-search/?${params.toString()}`)
    },

    /**
     * Refresh availability data for specific content
     */
    refreshAvailability: async (contentId: string): Promise<StreamingAvailability[]> => {
      // Clear cached data first
      const cache = cacheStorage.load(STREAMING_CACHE_KEY) as Map<string, StreamingCache> | null
      if (cache instanceof Map) {
        cache.delete(contentId)
        cacheStorage.save(STREAMING_CACHE_KEY, cache)
      }

      // Fetch fresh data
      return streamingApi.getAvailability(contentId)
    },

    /**
     * Get cached availability data
     */
    getCachedAvailability,

    /**
     * Clear expired cache entries
     */
    clearExpiredCache: async (): Promise<number> => {
      const result = await clearExpiredCache()
      return result ?? 0
    },

    /**
     * Get current rate limit status
     */
    getRateLimitStatus: (): RateLimitConfig => {
      updateRateLimitState()
      return {...rateLimitState}
    },

    /**
     * Check if request is allowed under rate limits
     */
    isRequestAllowed,

    /**
     * Set user preferences for streaming services
     */
    setPreferences: (preferences: StreamingPreferences): void => {
      withSyncErrorHandling(() => {
        currentPreferences = sanitizeStreamingPreferences(preferences)
        preferencesStorage.save(STREAMING_PREFERENCES_KEY, currentPreferences)
      }, 'Failed to save streaming preferences')()
    },

    /**
     * Get current streaming preferences
     */
    getPreferences: (): StreamingPreferences => currentPreferences,

    /**
     * Get availability filtered by specific region
     * Useful for showing availability in different regions
     */
    getAvailabilityByRegion: async (
      contentId: string,
      region: string,
    ): Promise<StreamingAvailability[]> => {
      if (!isInitialized || !config) {
        throw new Error('Streaming API not initialized')
      }

      // Get unfiltered availability from cache or API
      const cached = await getCachedAvailability(contentId)
      if (cached) {
        return filterAvailabilityByRegion(cached, region as any)
      }

      // If not cached, get fresh data but don't apply current region filter
      const response = await makeApiRequest<any[]>(`/title/${contentId}/sources`)

      if (!response.success || !response.data) {
        throw new Error('Failed to fetch streaming availability')
      }

      const availability = transformAvailabilityData(response.data)
      await cacheAvailabilityData(contentId, availability)

      return filterAvailabilityByRegion(availability, region as any)
    },

    /**
     * Preload streaming availability for multiple content items in background
     * Useful for warming cache before user interactions
     *
     * @param contentIds Array of content IDs to preload
     * @param options Preload options for controlling behavior
     * @param options.maxConcurrency Maximum number of concurrent requests (default: 3)
     * @param options.skipCache Whether to skip cache check and force fresh API calls (default: false)
     * @param options.priority Priority level affecting delay between requests (default: 'normal')
     * @returns Promise that resolves when preloading completes
     */
    preloadBatchAvailability: async (
      contentIds: string[],
      options: {
        maxConcurrency?: number
        skipCache?: boolean
        priority?: 'high' | 'normal' | 'low'
      } = {},
    ): Promise<void> => {
      if (!isInitialized || !config) {
        throw new Error('Streaming API not initialized')
      }

      const {maxConcurrency = 3, skipCache = false, priority = 'normal'} = options

      // Filter out already cached items unless skipCache is true
      let idsToPreload = contentIds
      if (!skipCache) {
        const cacheChecks = await Promise.all(
          contentIds.map(async id => ({
            id,
            cached: (await getCachedAvailability(id)) !== null,
          })),
        )
        idsToPreload = cacheChecks.filter(check => !check.cached).map(check => check.id)
      }

      // Process with concurrency control based on priority
      const delay = priority === 'high' ? 500 : priority === 'normal' ? 1000 : 2000
      const chunks = []
      for (let i = 0; i < idsToPreload.length; i += maxConcurrency) {
        chunks.push(idsToPreload.slice(i, i + maxConcurrency))
      }

      for (const chunk of chunks) {
        const promises = chunk.map(async contentId => {
          try {
            await streamingApi.getAvailability(contentId)
          } catch (error) {
            console.warn(`Preload failed for ${contentId}:`, error)
          }
        })

        await Promise.all(promises)

        // Respect rate limits with priority-based delays
        if (chunks.indexOf(chunk) < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    },

    /**
     * Get batch availability cache statistics
     * Useful for monitoring cache effectiveness and planning batch operations
     *
     * @param contentIds Array of content IDs to check cache status for
     * @returns Cache statistics for the provided content IDs
     */
    getBatchCacheStats: async (
      contentIds: string[],
    ): Promise<{
      total: number
      cached: number
      expired: number
      missing: number
      hitRate: number
      cacheAgeStats: {
        newest: string | null
        oldest: string | null
        averageAge: number
      }
    }> => {
      if (contentIds.length === 0) {
        return {
          total: 0,
          cached: 0,
          expired: 0,
          missing: 0,
          hitRate: 0,
          cacheAgeStats: {newest: null, oldest: null, averageAge: 0},
        }
      }

      const now = new Date()
      const cacheAges: number[] = []
      let cached = 0
      let expired = 0
      let newest: string | null = null
      let oldest: string | null = null

      for (const contentId of contentIds) {
        try {
          const cache =
            (await cacheStorage.load(STREAMING_CACHE_KEY)) || new Map<string, StreamingCache>()
          if (!(cache instanceof Map)) continue

          const cachedData = cache.get(contentId)
          if (cachedData) {
            const cacheDate = new Date(cachedData.cachedAt)
            const expiresDate = new Date(cachedData.expiresAt)

            if (expiresDate > now) {
              cached++
              const age = now.getTime() - cacheDate.getTime()
              cacheAges.push(age)

              if (!newest || cacheDate > new Date(newest)) {
                newest = cachedData.cachedAt
              }
              if (!oldest || cacheDate < new Date(oldest)) {
                oldest = cachedData.cachedAt
              }
            } else {
              expired++
            }
          }
        } catch (error) {
          console.warn(`Cache stats check failed for ${contentId}:`, error)
        }
      }

      const missing = contentIds.length - cached - expired
      const hitRate = contentIds.length > 0 ? (cached / contentIds.length) * 100 : 0
      const averageAge =
        cacheAges.length > 0 ? cacheAges.reduce((a, b) => a + b, 0) / cacheAges.length : 0

      return {
        total: contentIds.length,
        cached,
        expired,
        missing,
        hitRate: Math.round(hitRate * 100) / 100, // Round to 2 decimal places
        cacheAgeStats: {
          newest,
          oldest,
          averageAge: Math.round(averageAge / 1000 / 60), // Convert to minutes
        },
      }
    },

    /**
     * Update user's region preference and emit update event
     */
    updateRegionPreference: (region: string): void => {
      withSyncErrorHandling(() => {
        const updatedPreferences = {
          ...currentPreferences,
          location: {
            ...currentPreferences.location,
            region: region as any,
          },
        }

        currentPreferences = sanitizeStreamingPreferences(updatedPreferences)
        preferencesStorage.save(STREAMING_PREFERENCES_KEY, currentPreferences)

        eventEmitter.emit('region-changed', {
          previousRegion: currentPreferences.location.region,
          newRegion: region,
          timestamp: new Date().toISOString(),
        })
      }, 'Failed to update region preference')()
    },

    /**
     * Destroy instance and clean up resources
     */
    destroy: (): void => {
      withSyncErrorHandling(() => {
        eventEmitter.removeAllListeners()
        isInitialized = false
        config = null
      }, 'Failed to destroy streaming API instance')()
    },

    // Generic EventEmitter methods for type-safe event handling
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    once: eventEmitter.once.bind(eventEmitter),
    emit: eventEmitter.emit.bind(eventEmitter),
    removeAllListeners: eventEmitter.removeAllListeners.bind(eventEmitter),
  }

  return streamingApi
}
