/**
 * Configuration for all external metadata sources.
 * Centralizes API endpoints, rate limits, and source-specific settings.
 */

import type {MetadataSourceConfig} from '../modules/types.js'

/**
 * Production configuration for metadata sources.
 * API keys should be configured at runtime by calling setApiKey methods.
 */
export const getProductionMetadataConfig = (tmdbApiKey?: string): MetadataSourceConfig => ({
  memoryAlpha: {
    enabled: true,
    rateLimitConfig: {
      requestsPerSecond: 1, // Respect Memory Alpha's resources
      burstSize: 3,
    },
    retryConfig: {
      maxRetries: 2,
      initialDelayMs: 2000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      jitterMs: 500,
    },
    respectRobotsTxt: true,
  },
  tmdb: {
    enabled: Boolean(tmdbApiKey),
    ...(tmdbApiKey && {apiKey: tmdbApiKey}),
    rateLimitConfig: {
      requestsPerSecond: 4, // TMDB allows up to 40 requests per 10 seconds
      burstSize: 40,
    },
    retryConfig: {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 60000,
      backoffMultiplier: 2,
      jitterMs: 200,
    },
  },
  trekCore: {
    enabled: true,
    rateLimitConfig: {
      requestsPerSecond: 0.5, // Very conservative for ethical scraping
      burstSize: 2,
    },
    retryConfig: {
      maxRetries: 1,
      initialDelayMs: 5000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      jitterMs: 1000,
    },
  },
  stapi: {
    enabled: true,
    rateLimitConfig: {
      requestsPerSecond: 2, // STAPI appears to be more permissive
      burstSize: 10,
    },
    retryConfig: {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      jitterMs: 300,
    },
  },
})

/**
 * Development configuration with more lenient settings and test data.
 */
export const getDevelopmentMetadataConfig = (tmdbApiKey?: string): MetadataSourceConfig => ({
  memoryAlpha: {
    enabled: false, // Disable in development to avoid hitting external APIs
    rateLimitConfig: {
      requestsPerSecond: 1,
      burstSize: 3,
    },
    retryConfig: {
      maxRetries: 1,
      initialDelayMs: 1000,
      maxDelayMs: 5000,
      backoffMultiplier: 1.5,
      jitterMs: 100,
    },
  },
  tmdb: {
    enabled: Boolean(tmdbApiKey), // Only if API key is provided
    ...(tmdbApiKey && {apiKey: tmdbApiKey}),
    rateLimitConfig: {
      requestsPerSecond: 2, // Reduced for development
      burstSize: 10,
    },
    retryConfig: {
      maxRetries: 1,
      initialDelayMs: 500,
      maxDelayMs: 5000,
      backoffMultiplier: 1.5,
      jitterMs: 100,
    },
  },
  trekCore: {
    enabled: false, // Disable scraping in development
    rateLimitConfig: {
      requestsPerSecond: 0.2,
      burstSize: 1,
    },
    retryConfig: {
      maxRetries: 0,
      initialDelayMs: 1000,
      maxDelayMs: 5000,
      backoffMultiplier: 1,
      jitterMs: 0,
    },
  },
  stapi: {
    enabled: true, // STAPI is good for development testing
    rateLimitConfig: {
      requestsPerSecond: 1,
      burstSize: 5,
    },
    retryConfig: {
      maxRetries: 1,
      initialDelayMs: 500,
      maxDelayMs: 5000,
      backoffMultiplier: 1.5,
      jitterMs: 100,
    },
  },
})

/**
 * Test configuration with mock-friendly settings.
 */
export const getTestMetadataConfig = (): MetadataSourceConfig => ({
  memoryAlpha: {
    enabled: true,
    rateLimitConfig: {
      requestsPerSecond: 10, // High rate for testing
      burstSize: 50,
    },
    retryConfig: {
      maxRetries: 0, // No retries in tests unless explicitly testing retry logic
      initialDelayMs: 0,
      maxDelayMs: 100,
      backoffMultiplier: 1,
      jitterMs: 0,
    },
  },
  tmdb: {
    enabled: true,
    apiKey: 'test-api-key',
    rateLimitConfig: {
      requestsPerSecond: 10,
      burstSize: 50,
    },
    retryConfig: {
      maxRetries: 0,
      initialDelayMs: 0,
      maxDelayMs: 100,
      backoffMultiplier: 1,
      jitterMs: 0,
    },
  },
  trekCore: {
    enabled: true,
    rateLimitConfig: {
      requestsPerSecond: 10,
      burstSize: 50,
    },
    retryConfig: {
      maxRetries: 0,
      initialDelayMs: 0,
      maxDelayMs: 100,
      backoffMultiplier: 1,
      jitterMs: 0,
    },
  },
  stapi: {
    enabled: true,
    rateLimitConfig: {
      requestsPerSecond: 10,
      burstSize: 50,
    },
    retryConfig: {
      maxRetries: 0,
      initialDelayMs: 0,
      maxDelayMs: 100,
      backoffMultiplier: 1,
      jitterMs: 0,
    },
  },
})

/**
 * Get metadata configuration based on environment.
 */
export const getMetadataConfig = (
  environment = 'production',
  tmdbApiKey?: string,
): MetadataSourceConfig => {
  switch (environment) {
    case 'development':
      return getDevelopmentMetadataConfig(tmdbApiKey)
    case 'test':
      return getTestMetadataConfig()
    case 'production':
    default:
      return getProductionMetadataConfig(tmdbApiKey)
  }
}

/**
 * Series code to TMDB ID mapping for consistent API calls.
 */
export const TMDB_SERIES_MAPPING = {
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
} as const

/**
 * Series code to TrekCore subdomain mapping for web scraping.
 */
export const TREKCORE_SUBDOMAIN_MAPPING = {
  tos: 'tos.trekcore.com',
  tng: 'tng.trekcore.com',
  ds9: 'ds9.trekcore.com',
  voy: 'voy.trekcore.com',
  ent: 'ent.trekcore.com',
  dis: 'dis.trekcore.com',
  pic: 'pic.trekcore.com',
  low: 'low.trekcore.com',
  pro: 'pro.trekcore.com',
  snw: 'snw.trekcore.com',
} as const

/**
 * Quota limits for each API source (daily limits).
 */
export const API_QUOTA_LIMITS = {
  tmdb: 1000, // TMDB allows 1000 requests per day for free tier
  memoryAlpha: 86400, // Conservative estimate based on 1 request per second
  stapi: 10000, // STAPI appears more permissive
  trekCore: 100, // Very conservative for ethical scraping
} as const

/**
 * Cache TTL (time to live) settings for different types of metadata.
 */
export const CACHE_TTL_CONFIG = {
  episode: 24 * 60 * 60 * 1000, // 24 hours for episode data
  series: 7 * 24 * 60 * 60 * 1000, // 7 days for series metadata
  person: 30 * 24 * 60 * 60 * 1000, // 30 days for cast/crew data
  health: 5 * 60 * 1000, // 5 minutes for health status
  analytics: 60 * 60 * 1000, // 1 hour for analytics data
} as const
