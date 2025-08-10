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
import {withSyncErrorHandling} from './error-handler.js'
import {createEventEmitter} from './events.js'
import {createStorage, LocalStorageAdapter} from './storage.js'

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
  region: 'US',
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
    typeof prefs['region'] === 'string'
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
    new LocalStorageAdapter<Map<string, StreamingCache>>({
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
   */
  const getCachedAvailability = (contentId: string): StreamingAvailability[] | null => {
    try {
      const cache = cacheStorage.load(STREAMING_CACHE_KEY) as Map<string, StreamingCache> | null
      if (!cache || !(cache instanceof Map)) return null

      const cached = cache.get(contentId)
      if (!cached) return null

      // Check if cache is expired
      if (new Date(cached.expiresAt) < new Date()) {
        cache.delete(contentId)
        cacheStorage.save(STREAMING_CACHE_KEY, cache)
        return null
      }

      return cached.availability
    } catch (error) {
      console.error('Failed to retrieve cached availability data:', error)
      return null
    }
  }

  /**
   * Cache availability data for content
   */
  const cacheAvailabilityData = (
    contentId: string,
    availability: StreamingAvailability[],
  ): void => {
    try {
      const cache =
        (cacheStorage.load(STREAMING_CACHE_KEY) as Map<string, StreamingCache>) || new Map()

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
      cacheStorage.save(STREAMING_CACHE_KEY, cache)

      eventEmitter.emit('cache-updated', {
        contentId,
        cacheSize: cache.size,
        expiresAt: cacheEntry.expiresAt,
      })
    } catch (error) {
      console.error('Failed to cache availability data:', error)
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
    },

    /**
     * Get streaming availability for specific content
     */
    getAvailability: async (contentId: string): Promise<StreamingAvailability[]> => {
      if (!isInitialized || !config) {
        throw new Error('Streaming API not initialized')
      }

      // Check cache first
      const cached = getCachedAvailability(contentId)
      if (cached) {
        return cached
      }

      // Make API request for fresh data
      const response = await makeApiRequest<any[]>(`/title/${contentId}/sources`)

      if (!response.success || !response.data) {
        throw new Error('Failed to fetch streaming availability')
      }

      const availability = transformAvailabilityData(response.data)
      cacheAvailabilityData(contentId, availability)

      eventEmitter.emit('availability-updated', {
        contentId,
        availability,
        source: config.provider,
      })

      return availability
    },

    /**
     * Get availability for multiple content items (batch operation)
     */
    getBatchAvailability: async (
      contentIds: string[],
    ): Promise<Map<string, StreamingAvailability[]>> => {
      const results = new Map<string, StreamingAvailability[]>()

      // Process in batches to respect rate limits
      const batchSize = Math.min(5, Math.floor(config?.rateLimit.requestsPerMinute || 10 / 2))

      for (let i = 0; i < contentIds.length; i += batchSize) {
        const batch = contentIds.slice(i, i + batchSize)

        const batchPromises = batch.map(async contentId => {
          try {
            const availability = await streamingApi.getAvailability(contentId)
            results.set(contentId, availability)
          } catch (error) {
            console.warn(`Failed to get availability for ${contentId}:`, error)
            results.set(contentId, [])
          }
        })

        await Promise.all(batchPromises)

        // Small delay between batches to respect rate limits
        if (i + batchSize < contentIds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

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
      const cache = cacheStorage.load(STREAMING_CACHE_KEY) as Map<string, StreamingCache> | null
      if (!cache || !(cache instanceof Map)) return 0

      const now = new Date()
      let cleared = 0

      for (const [contentId, entry] of cache) {
        if (new Date(entry.expiresAt) < now) {
          cache.delete(contentId)
          cleared++
        }
      }

      if (cleared > 0) {
        cacheStorage.save(STREAMING_CACHE_KEY, cache)
      }

      return cleared
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
