import {describe, expect, it} from 'vitest'
import {
  API_QUOTA_LIMITS,
  CACHE_TTL_CONFIG,
  getDevelopmentMetadataConfig,
  getMetadataConfig,
  getProductionMetadataConfig,
  getTestMetadataConfig,
  TMDB_SERIES_MAPPING,
  TREKCORE_SUBDOMAIN_MAPPING,
} from '../src/data/metadata-sources-config.js'

describe('Metadata Sources Configuration', () => {
  describe('Configuration Functions', () => {
    it('should return production config with TMDB API key when provided', () => {
      const config = getProductionMetadataConfig('test-api-key')

      expect(config.memoryAlpha?.enabled).toBe(true)
      expect(config.tmdb?.enabled).toBe(true)
      expect(config.tmdb?.apiKey).toBe('test-api-key')
      expect(config.trekCore?.enabled).toBe(true)
      expect(config.stapi?.enabled).toBe(true)
    })

    it('should return production config with disabled TMDB when no API key provided', () => {
      const config = getProductionMetadataConfig()

      expect(config.tmdb?.enabled).toBe(false)
      expect(config.tmdb).not.toHaveProperty('apiKey')
    })

    it('should return development config with reduced rate limits', () => {
      const config = getDevelopmentMetadataConfig('dev-api-key')

      expect(config.memoryAlpha?.enabled).toBe(false) // Disabled in development
      expect(config.tmdb?.enabled).toBe(true)
      expect(config.tmdb?.apiKey).toBe('dev-api-key')
      expect(config.trekCore?.enabled).toBe(false) // Disabled in development
      expect(config.stapi?.enabled).toBe(true)

      // Development should have reduced rate limits
      expect(config.tmdb?.rateLimitConfig.requestsPerSecond).toBeLessThan(4)
    })

    it('should return test config with high rate limits for testing', () => {
      const config = getTestMetadataConfig()

      expect(config.memoryAlpha?.enabled).toBe(true)
      expect(config.tmdb?.enabled).toBe(true)
      expect(config.tmdb?.apiKey).toBe('test-api-key')

      // Test config should have high rate limits
      expect(config.tmdb?.rateLimitConfig.requestsPerSecond).toBe(10)
      expect(config.tmdb?.retryConfig?.maxRetries).toBe(0) // No retries in tests by default
    })

    it('should return correct config based on environment parameter', () => {
      const prodConfig = getMetadataConfig('production', 'prod-key')
      const devConfig = getMetadataConfig('development', 'dev-key')
      const testConfig = getMetadataConfig('test', 'test-key')

      expect(prodConfig.memoryAlpha?.enabled).toBe(true)
      expect(devConfig.memoryAlpha?.enabled).toBe(false)
      expect(testConfig.memoryAlpha?.enabled).toBe(true)

      expect(prodConfig.tmdb?.rateLimitConfig.requestsPerSecond).toBe(4)
      expect(devConfig.tmdb?.rateLimitConfig.requestsPerSecond).toBe(2)
      expect(testConfig.tmdb?.rateLimitConfig.requestsPerSecond).toBe(10)
    })
  })

  describe('Constants and Mappings', () => {
    it('should have valid TMDB series mappings', () => {
      expect(TMDB_SERIES_MAPPING.tos).toBe(253)
      expect(TMDB_SERIES_MAPPING.tng).toBe(655)
      expect(TMDB_SERIES_MAPPING.ds9).toBe(580)
      expect(TMDB_SERIES_MAPPING.voy).toBe(1855)
      expect(TMDB_SERIES_MAPPING.ent).toBe(314)
      expect(TMDB_SERIES_MAPPING.dis).toBe(67198)
      expect(TMDB_SERIES_MAPPING.pic).toBe(85949)
      expect(TMDB_SERIES_MAPPING.low).toBe(85948)
      expect(TMDB_SERIES_MAPPING.pro).toBe(85950)
      expect(TMDB_SERIES_MAPPING.snw).toBe(114472)
    })

    it('should have valid TrekCore subdomain mappings', () => {
      expect(TREKCORE_SUBDOMAIN_MAPPING.tos).toBe('tos.trekcore.com')
      expect(TREKCORE_SUBDOMAIN_MAPPING.tng).toBe('tng.trekcore.com')
      expect(TREKCORE_SUBDOMAIN_MAPPING.ds9).toBe('ds9.trekcore.com')
      expect(TREKCORE_SUBDOMAIN_MAPPING.voy).toBe('voy.trekcore.com')
      expect(TREKCORE_SUBDOMAIN_MAPPING.ent).toBe('ent.trekcore.com')
      expect(TREKCORE_SUBDOMAIN_MAPPING.dis).toBe('dis.trekcore.com')
      expect(TREKCORE_SUBDOMAIN_MAPPING.pic).toBe('pic.trekcore.com')
      expect(TREKCORE_SUBDOMAIN_MAPPING.low).toBe('low.trekcore.com')
      expect(TREKCORE_SUBDOMAIN_MAPPING.pro).toBe('pro.trekcore.com')
      expect(TREKCORE_SUBDOMAIN_MAPPING.snw).toBe('snw.trekcore.com')
    })

    it('should have valid API quota limits', () => {
      expect(API_QUOTA_LIMITS.tmdb).toBe(1000)
      expect(API_QUOTA_LIMITS.memoryAlpha).toBe(86400)
      expect(API_QUOTA_LIMITS.stapi).toBe(10000)
      expect(API_QUOTA_LIMITS.trekCore).toBe(100)
    })

    it('should have valid cache TTL configurations', () => {
      expect(CACHE_TTL_CONFIG.episode).toBe(24 * 60 * 60 * 1000) // 24 hours
      expect(CACHE_TTL_CONFIG.series).toBe(7 * 24 * 60 * 60 * 1000) // 7 days
      expect(CACHE_TTL_CONFIG.person).toBe(30 * 24 * 60 * 60 * 1000) // 30 days
      expect(CACHE_TTL_CONFIG.health).toBe(5 * 60 * 1000) // 5 minutes
      expect(CACHE_TTL_CONFIG.analytics).toBe(60 * 60 * 1000) // 1 hour
    })
  })

  describe('Configuration Validation', () => {
    it('should have required rate limiting configuration for all sources', () => {
      const config = getProductionMetadataConfig('test-key')

      Object.entries(config).forEach(([, sourceConfig]) => {
        if (sourceConfig) {
          expect(sourceConfig.rateLimitConfig).toBeDefined()
          expect(sourceConfig.rateLimitConfig.requestsPerSecond).toBeGreaterThan(0)
          expect(sourceConfig.rateLimitConfig.burstSize).toBeGreaterThan(0)

          if (sourceConfig.retryConfig) {
            expect(sourceConfig.retryConfig.maxRetries).toBeGreaterThanOrEqual(0)
            expect(sourceConfig.retryConfig.initialDelayMs).toBeGreaterThan(0)
            expect(sourceConfig.retryConfig.maxDelayMs).toBeGreaterThan(0)
            expect(sourceConfig.retryConfig.backoffMultiplier).toBeGreaterThan(1)
            expect(sourceConfig.retryConfig.jitterMs).toBeGreaterThanOrEqual(0)
          }
        }
      })
    })

    it('should have conservative rate limits for scraping sources', () => {
      const config = getProductionMetadataConfig()

      // TrekCore should have very conservative limits for ethical scraping
      expect(config.trekCore?.rateLimitConfig.requestsPerSecond).toBeLessThanOrEqual(1)

      // Memory Alpha should also be conservative
      expect(config.memoryAlpha?.rateLimitConfig.requestsPerSecond).toBeLessThanOrEqual(2)
    })

    it('should disable potentially disruptive sources in development', () => {
      const config = getDevelopmentMetadataConfig()

      // Sources that involve web scraping should be disabled in development
      expect(config.memoryAlpha?.enabled).toBe(false)
      expect(config.trekCore?.enabled).toBe(false)
    })
  })
})
