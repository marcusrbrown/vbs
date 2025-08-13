/**
 * API integration factory for Star Trek metadata sources with ethical scraping and rate limiting.
 * Implements rate-limited, error-resilient connections to Memory Alpha, TMDB, and other data sources.
 *
 * Follows VBS functional factory architecture with closure-based state management and comprehensive
 * error handling using established withErrorHandling utilities.
 */

import type {
  EpisodeMetadata,
  MetadataSourceConfig,
  MetadataSourceEvents,
  MetadataSourceInstance,
  RetryConfig,
} from './types.js'
import {withErrorHandling} from '../modules/error-handler.js'
import {createEventEmitter} from '../modules/events.js'

/**
 * Rate limiting using token bucket algorithm.
 */
interface TokenBucket {
  tokens: number
  capacity: number
  refillRate: number
  lastRefill: number
}

/**
 * API health monitoring data.
 */
interface ApiHealthStatus {
  isHealthy: boolean
  lastSuccessful: number
  consecutiveFailures: number
  nextRetryTime: number
  responseTimeMs: number
}

/**
 * Comprehensive error categorization for metadata operations.
 */
type MetadataErrorCategory =
  | 'network'
  | 'rate-limit'
  | 'data-format'
  | 'service-unavailable'
  | 'authentication'
  | 'quota-exceeded'
  | 'timeout'
  | 'unknown'

/**
 * Enhanced error information for metadata operations.
 */
interface MetadataError extends Error {
  category: MetadataErrorCategory
  retryable: boolean
  retryAfter?: number
  sourceApi: string
}

/**
 * Internal metadata source configuration.
 */
interface InternalMetadataSource {
  id: string
  name: string
  baseUrl: string
  enabled: boolean
  rateLimitConfig: {
    requestsPerSecond: number
    burstSize: number
  }
  retryConfig: RetryConfig
  confidenceScore: number
  priority: number
  requiresAuth?: boolean
  apiKey?: string
}

/**
 * Create a metadata sources manager with comprehensive API integration capabilities.
 * Implements ethical scraping, rate limiting, error resilience, and intelligent caching.
 *
 * @param config Configuration for metadata sources
 * @returns MetadataSourceInstance with full API integration capabilities
 *
 * @example
 * ```typescript
 * const metadataSources = createMetadataSources({
 *   memoryAlpha: {
 *     enabled: true,
 *     rateLimitConfig: { requestsPerSecond: 1, burstSize: 5 },
 *     respectRobotsTxt: true
 *   },
 *   tmdb: {
 *     enabled: true,
 *     apiKey: process.env.TMDB_API_KEY,
 *     rateLimitConfig: { requestsPerSecond: 4, burstSize: 40 }
 *   }
 * })
 *
 * const episodeMetadata = await metadataSources.enrichEpisode('ent_s1_e01')
 * ```
 */
export const createMetadataSources = (config: MetadataSourceConfig): MetadataSourceInstance => {
  // Private state in closure
  const eventEmitter = createEventEmitter<MetadataSourceEvents>()
  const rateLimiters = new Map<string, TokenBucket>()
  const healthStatus = new Map<string, ApiHealthStatus>()
  const responseCache = new Map<string, {data: any; timestamp: number; expiresAt: number}>()

  // Configuration with defaults
  const defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterMs: 100,
  }

  // Initialize sources with proper configuration
  const sources = new Map<string, InternalMetadataSource>()

  // Memory Alpha source
  if (config.memoryAlpha?.enabled) {
    sources.set('memory-alpha', {
      id: 'memory-alpha',
      name: 'Memory Alpha',
      baseUrl: 'https://memory-alpha.fandom.com/api.php',
      enabled: config.memoryAlpha.enabled,
      rateLimitConfig: config.memoryAlpha.rateLimitConfig,
      retryConfig: config.memoryAlpha.retryConfig ?? defaultRetryConfig,
      confidenceScore: 0.9,
      priority: 1,
    })
  }

  // TMDB source
  if (config.tmdb?.enabled && config.tmdb.apiKey) {
    sources.set('tmdb', {
      id: 'tmdb',
      name: 'The Movie Database',
      baseUrl: 'https://api.themoviedb.org/3',
      enabled: config.tmdb.enabled,
      rateLimitConfig: config.tmdb.rateLimitConfig,
      retryConfig: config.tmdb.retryConfig ?? defaultRetryConfig,
      confidenceScore: 0.85,
      priority: 2,
      requiresAuth: true,
      apiKey: config.tmdb.apiKey,
    })
  }

  /**
   * Initialize rate limiter for a specific source using token bucket algorithm.
   */
  const initializeRateLimiter = (
    sourceId: string,
    rateLimitConfig: {
      requestsPerSecond: number
      burstSize: number
    },
  ): void => {
    const bucket: TokenBucket = {
      tokens: rateLimitConfig.burstSize,
      capacity: rateLimitConfig.burstSize,
      refillRate: rateLimitConfig.requestsPerSecond,
      lastRefill: Date.now(),
    }
    rateLimiters.set(sourceId, bucket)
  }

  /**
   * Check if request can proceed based on rate limiting.
   */
  const canMakeRequest = (sourceId: string): boolean => {
    const bucket = rateLimiters.get(sourceId)
    if (!bucket) return false

    const now = Date.now()
    const timePassed = (now - bucket.lastRefill) / 1000
    const tokensToAdd = Math.floor(timePassed * bucket.refillRate)

    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd)
    bucket.lastRefill = now

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1
      return true
    }
    return false
  }

  /**
   * Wait for rate limit to allow request.
   */
  const waitForRateLimit = async (sourceId: string): Promise<void> => {
    const bucket = rateLimiters.get(sourceId)
    if (!bucket) return

    const waitTime = Math.ceil(((1 - bucket.tokens) / bucket.refillRate) * 1000)
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }

  /**
   * Categorize error for appropriate handling strategy.
   */
  const categorizeError = (error: Error, sourceId: string): MetadataError => {
    const metadataError = error as MetadataError
    metadataError.sourceApi = sourceId

    if (error.message.includes('rate limit') || error.message.includes('429')) {
      metadataError.category = 'rate-limit'
      metadataError.retryable = true
      metadataError.retryAfter = 60000 // 1 minute default
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      metadataError.category = 'network'
      metadataError.retryable = true
    } else if (error.message.includes('timeout')) {
      metadataError.category = 'timeout'
      metadataError.retryable = true
    } else if (error.message.includes('unauthorized') || error.message.includes('401')) {
      metadataError.category = 'authentication'
      metadataError.retryable = false
    } else if (error.message.includes('quota') || error.message.includes('403')) {
      metadataError.category = 'quota-exceeded'
      metadataError.retryable = false
    } else if (error.message.includes('service unavailable') || error.message.includes('503')) {
      metadataError.category = 'service-unavailable'
      metadataError.retryable = true
    } else if (error.message.includes('parse') || error.message.includes('format')) {
      metadataError.category = 'data-format'
      metadataError.retryable = false
    } else {
      metadataError.category = 'unknown'
      metadataError.retryable = false
    }

    return metadataError
  }

  /**
   * Update API health status based on response.
   */
  const updateHealthStatus = (sourceId: string, success: boolean, responseTime: number): void => {
    const current = healthStatus.get(sourceId) ?? {
      isHealthy: true,
      lastSuccessful: Date.now(),
      consecutiveFailures: 0,
      nextRetryTime: 0,
      responseTimeMs: 0,
    }

    if (success) {
      current.isHealthy = true
      current.lastSuccessful = Date.now()
      current.consecutiveFailures = 0
      current.nextRetryTime = 0
      current.responseTimeMs = responseTime
    } else {
      current.consecutiveFailures += 1
      current.responseTimeMs = responseTime

      // Mark unhealthy after 3 consecutive failures
      if (current.consecutiveFailures >= 3) {
        current.isHealthy = false
        // Exponential backoff for next retry
        current.nextRetryTime =
          Date.now() +
          Math.min(
            1000 * 2 ** current.consecutiveFailures,
            300000, // Max 5 minutes
          )
      }
    }

    healthStatus.set(sourceId, current)

    eventEmitter.emit('health-status-change', {
      sourceId,
      isHealthy: current.isHealthy,
      consecutiveFailures: current.consecutiveFailures,
    })
  }

  /**
   * Check cached response for given request key.
   */
  const getCachedResponse = (cacheKey: string): any | null => {
    const cached = responseCache.get(cacheKey)
    if (!cached) return null

    if (Date.now() > cached.expiresAt) {
      responseCache.delete(cacheKey)
      return null
    }

    return cached.data
  }

  /**
   * Cache API response with expiration.
   */
  const cacheResponse = (cacheKey: string, data: any, ttlMs = 3600000): void => {
    responseCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs,
    })
  }

  /**
   * Make HTTP request with comprehensive error handling and retry logic.
   */
  const makeRequest = withErrorHandling(
    async (
      url: string,
      options: RequestInit = {},
      sourceId: string,
      retryConfig: RetryConfig,
    ): Promise<Response> => {
      let lastError: Error | null = null

      for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
        try {
          const startTime = Date.now()

          // Check rate limiting
          if (!canMakeRequest(sourceId)) {
            await waitForRateLimit(sourceId)
          }

          // Make request with timeout
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
          })

          clearTimeout(timeoutId)
          const responseTime = Date.now() - startTime

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          updateHealthStatus(sourceId, true, responseTime)
          return response
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error))
          const categorizedError = categorizeError(lastError, sourceId)

          updateHealthStatus(sourceId, false, 0)

          // Don't retry if error is not retryable
          if (!categorizedError.retryable || attempt === retryConfig.maxRetries) {
            break
          }

          // Calculate delay with exponential backoff and jitter
          const baseDelay = Math.min(
            retryConfig.initialDelayMs * retryConfig.backoffMultiplier ** attempt,
            retryConfig.maxDelayMs,
          )
          const jitter = Math.random() * retryConfig.jitterMs
          const delay = baseDelay + jitter

          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }

      if (lastError) {
        throw lastError
      }
      throw new Error('Request failed after all retries')
    },
    'metadata-sources-request',
  )

  /**
   * Memory Alpha integration with ethical scraping practices.
   */
  const fetchFromMemoryAlpha = withErrorHandling(
    async (episodeId: string): Promise<EpisodeMetadata | null> => {
      const source = sources.get('memory-alpha')
      if (!source) {
        throw new Error('Memory Alpha source not found')
      }

      if (!source.enabled) {
        throw new Error('Memory Alpha source is disabled')
      }

      // Check if source is healthy
      const health = healthStatus.get('memory-alpha')
      if (health && !health.isHealthy && Date.now() < health.nextRetryTime) {
        throw new Error('Memory Alpha is currently unhealthy, skipping request')
      }

      const cacheKey = `memory-alpha:${episodeId}`
      const cached = getCachedResponse(cacheKey)
      if (cached) {
        return cached
      }

      // Convert episode ID to Memory Alpha format
      const searchTitle = episodeId
        .replaceAll('_', ' ')
        .replace(/s(\d+)/, 'Season $1')
        .replace(/e(\d+)/, 'Episode $1')

      // Respect robots.txt by using official API endpoint
      const searchUrl = new URL(source.baseUrl)
      searchUrl.searchParams.set('action', 'query')
      searchUrl.searchParams.set('format', 'json')
      searchUrl.searchParams.set('list', 'search')
      searchUrl.searchParams.set('srsearch', searchTitle)
      searchUrl.searchParams.set('origin', '*') // CORS header

      const response = await makeRequest(
        searchUrl.toString(),
        {},
        'memory-alpha',
        source.retryConfig,
      )
      if (!response) {
        throw new Error('Failed to fetch from Memory Alpha')
      }
      const data = await response.json()

      if (!data.query?.search?.[0]) {
        return null
      }

      const pageId = data.query.search[0].pageid

      // Fetch page content
      const contentUrl = new URL(source.baseUrl)
      contentUrl.searchParams.set('action', 'query')
      contentUrl.searchParams.set('format', 'json')
      contentUrl.searchParams.set('pageids', pageId.toString())
      contentUrl.searchParams.set('prop', 'extracts|info')
      contentUrl.searchParams.set('exintro', 'true')
      contentUrl.searchParams.set('explaintext', 'true')
      contentUrl.searchParams.set('origin', '*')

      const contentResponse = await makeRequest(
        contentUrl.toString(),
        {},
        'memory-alpha',
        source.retryConfig,
      )
      if (!contentResponse) {
        throw new Error('Failed to fetch content from Memory Alpha')
      }
      const contentData = await contentResponse.json()

      // Extract episode information from Memory Alpha API response
      const page = Object.values(contentData.query?.pages || {})[0] as any
      const extract = page?.extract || ''
      const pageUrl = `https://memory-alpha.fandom.com/wiki/${encodeURIComponent(page?.title || '')}`

      // For now, just create basic metadata - could extract more details from content
      const metadata: EpisodeMetadata = {
        episodeId,
        dataSource: 'memory-alpha',
        lastUpdated: new Date().toISOString(),
        isValidated: false,
        confidenceScore: source.confidenceScore,
        version: '1.0',
        enrichmentStatus: 'complete',
        fieldValidation: {
          synopsis: {isValid: Boolean(extract), source: 'memory-alpha'},
          memoryAlphaUrl: {isValid: Boolean(pageUrl), source: 'memory-alpha'},
        },
      }

      // Cache the result
      cacheResponse(cacheKey, metadata, 86400000) // 24 hours

      eventEmitter.emit('metadata-enriched', {
        episodeId,
        sourceId: 'memory-alpha',
        metadata,
      })

      return metadata
    },
    'memory-alpha-fetch',
  )

  /**
   * TMDB API integration with proper authentication and rate limiting.
   */
  const fetchFromTMDB = withErrorHandling(
    async (episodeId: string): Promise<EpisodeMetadata | null> => {
      const source = sources.get('tmdb')
      if (!source) {
        throw new Error('TMDB source not found')
      }

      if (!source.enabled || !source.apiKey) {
        throw new Error('TMDB source is disabled or missing API key')
      }

      // Check health status
      const health = healthStatus.get('tmdb')
      if (health && !health.isHealthy && Date.now() < health.nextRetryTime) {
        throw new Error('TMDB is currently unhealthy, skipping request')
      }

      const cacheKey = `tmdb:${episodeId}`
      const cached = getCachedResponse(cacheKey)
      if (cached) {
        return cached
      }

      // Parse episode ID to extract series and episode info
      const episodeParts = episodeId.match(/^([a-z]+)_s(\d+)_e(\d+)$/)
      if (!episodeParts) {
        throw new Error(`Invalid episode ID format: ${episodeId}`)
      }

      const [, seriesCode, seasonNum, episodeNum] = episodeParts as [string, string, string, string]

      // Map series codes to TMDB series IDs (this would be configurable)
      const seriesIdMap: Record<string, number> = {
        tos: 253, // The Original Series
        tng: 655, // The Next Generation
        ds9: 580, // Deep Space Nine
        voy: 1855, // Voyager
        ent: 314, // Enterprise
        dis: 67198, // Discovery
        pic: 85949, // Picard
        low: 85948, // Lower Decks
        pro: 85950, // Prodigy
        snw: 114472, // Strange New Worlds
      }

      const tmdbSeriesId = seriesIdMap[seriesCode]
      if (tmdbSeriesId === undefined) {
        throw new Error(`Unknown series code: ${seriesCode}`)
      }

      const episodeUrl = `${source.baseUrl}/tv/${tmdbSeriesId}/season/${seasonNum}/episode/${episodeNum}`
      const headers = {
        Authorization: `Bearer ${source.apiKey}`,
        'Content-Type': 'application/json',
      }

      const response = await makeRequest(episodeUrl, {headers}, 'tmdb', source.retryConfig)
      if (!response) {
        throw new Error('Failed to fetch from TMDB')
      }
      const tmdbData = await response.json()

      // Extract episode information from TMDB API response
      const airDate = tmdbData.air_date || ''
      const productionCode = tmdbData.production_code || ''
      const tmdbId = tmdbData.id || null
      const name = tmdbData.name || ''
      const overview = tmdbData.overview || ''
      const voteAverage = tmdbData.vote_average || 0
      const crew = tmdbData.crew || []
      const guestStars = tmdbData.guest_stars || []

      // Extract director and writer information
      const directors = crew
        .filter((member: any) => member.job === 'Director')
        .map((d: any) => d.name)
      const writers = crew
        .filter(
          (member: any) =>
            member.job === 'Writer' || member.job === 'Screenplay' || member.job === 'Story',
        )
        .map((w: any) => w.name)

      const metadata: EpisodeMetadata = {
        episodeId,
        dataSource: 'tmdb',
        lastUpdated: new Date().toISOString(),
        isValidated: false,
        confidenceScore: source.confidenceScore,
        version: '1.0',
        enrichmentStatus: 'complete',
        fieldValidation: {
          airDate: {isValid: Boolean(airDate), source: 'tmdb'},
          productionCode: {isValid: Boolean(productionCode), source: 'tmdb'},
          tmdbId: {isValid: Boolean(tmdbId), source: 'tmdb'},
          title: {isValid: Boolean(name), source: 'tmdb'},
          synopsis: {isValid: Boolean(overview), source: 'tmdb'},
          director: {isValid: directors.length > 0, source: 'tmdb'},
          writer: {isValid: writers.length > 0, source: 'tmdb'},
          guestStars: {isValid: guestStars.length > 0, source: 'tmdb'},
          voteAverage: {isValid: voteAverage > 0, source: 'tmdb'},
        },
      }

      // Cache the result
      cacheResponse(cacheKey, metadata, 86400000) // 24 hours

      eventEmitter.emit('metadata-enriched', {
        episodeId,
        sourceId: 'tmdb',
        metadata,
      })

      return metadata
    },
    'tmdb-fetch',
  )

  // Initialize rate limiters for all enabled sources
  sources.forEach((source, sourceId) => {
    if (source.enabled) {
      initializeRateLimiter(sourceId, source.rateLimitConfig)
      healthStatus.set(sourceId, {
        isHealthy: true,
        lastSuccessful: Date.now(),
        consecutiveFailures: 0,
        nextRetryTime: 0,
        responseTimeMs: 0,
      })
    }
  })

  /**
   * Enrich episode metadata using multiple sources with intelligent fallback.
   */
  const enrichEpisode = withErrorHandling(
    async (episodeId: string): Promise<EpisodeMetadata | null> => {
      const results: EpisodeMetadata[] = []
      const errors: MetadataError[] = []

      // Try each enabled source in priority order
      const enabledSources = Array.from(sources.values())
        .filter(source => source.enabled)
        .sort((a, b) => a.priority - b.priority)

      for (const source of enabledSources) {
        try {
          let metadata: EpisodeMetadata | null = null

          switch (source.id) {
            case 'memory-alpha':
              metadata = await fetchFromMemoryAlpha(episodeId)
              break
            case 'tmdb':
              metadata = await fetchFromTMDB(episodeId)
              break
          }

          if (metadata) {
            results.push(metadata)
          }
        } catch (error) {
          const categorizedError = categorizeError(
            error instanceof Error ? error : new Error(String(error)),
            source.id,
          )
          errors.push(categorizedError)
        }
      }

      if (results.length === 0) {
        eventEmitter.emit('enrichment-failed', {
          episodeId,
          errors: errors.map(e => ({
            category: e.category,
            message: e.message,
            sourceApi: e.sourceApi,
          })),
        })
        return null
      }

      // Return the highest confidence result
      const bestResult = results.reduce((best, current) =>
        current.confidenceScore > best.confidenceScore ? current : best,
      )

      eventEmitter.emit('enrichment-completed', {
        episodeId,
        sourcesUsed: results.map(r => r.dataSource),
        confidenceScore: bestResult.confidenceScore,
      })

      return bestResult
    },
    'metadata-enrichment',
  )

  /**
   * Get health status for all sources.
   */
  const getHealthStatus = (): Record<string, ApiHealthStatus> => {
    const status: Record<string, ApiHealthStatus> = {}
    healthStatus.forEach((health, sourceId) => {
      status[sourceId] = {...health}
    })
    return status
  }

  /**
   * Get API usage analytics for quota management.
   */
  const getUsageAnalytics = () => {
    const analytics = {
      totalRequests: 0,
      requestsBySource: new Map<string, number>(),
      averageResponseTime: 0,
      cacheHitRate: 0,
      errorRate: 0,
    }

    // Implementation would track these metrics over time
    return analytics
  }

  /**
   * Clear cached responses.
   */
  const clearCache = (): void => {
    responseCache.clear()
    eventEmitter.emit('cache-cleared', {timestamp: Date.now()})
  }

  return {
    enrichEpisode,
    getHealthStatus,
    getUsageAnalytics,
    clearCache,

    // EventEmitter methods
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    once: eventEmitter.once.bind(eventEmitter),
  }
}
