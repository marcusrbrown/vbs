/**
 * Tests for metadata source configuration utilities.
 */

import process from 'node:process'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {
  checkMetadataAvailability,
  getMetadataConfig,
  initializeMetadataSources,
  loadApiConfigFromEnv,
  logMetadataSourceStatus,
  validateApiCredentials,
} from '../../../scripts/lib/source-config.js'

describe('Source Configuration', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = {...process.env}
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('loadApiConfigFromEnv', () => {
    it('should load TMDB API key from environment', () => {
      process.env.TMDB_API_KEY = 'test-key-123'

      const config = loadApiConfigFromEnv()
      expect(config.tmdbApiKey).toBe('test-key-123')
    })

    it('should handle missing TMDB API key', () => {
      delete process.env.TMDB_API_KEY

      const config = loadApiConfigFromEnv()
      expect(config.tmdbApiKey).toBeUndefined()
    })

    it('should return empty config when no credentials available', () => {
      delete process.env.TMDB_API_KEY

      const config = loadApiConfigFromEnv()
      expect(Object.keys(config).length).toBe(0)
    })
  })

  describe('validateApiCredentials', () => {
    it('should validate present credentials', () => {
      process.env.TMDB_API_KEY = 'valid-key'

      const result = validateApiCredentials(['TMDB_API_KEY'])
      expect(result.isValid).toBe(true)
      expect(result.missing).toHaveLength(0)
    })

    it('should detect missing credentials', () => {
      delete process.env.TMDB_API_KEY

      const result = validateApiCredentials(['TMDB_API_KEY'])
      expect(result.isValid).toBe(false)
      expect(result.missing).toContain('TMDB_API_KEY')
    })

    it('should handle multiple credentials', () => {
      process.env.API_KEY_1 = 'key1'
      delete process.env.API_KEY_2

      const result = validateApiCredentials(['API_KEY_1', 'API_KEY_2'])
      expect(result.isValid).toBe(false)
      expect(result.missing).toHaveLength(1)
      expect(result.missing).toContain('API_KEY_2')
    })

    it('should treat empty string as missing', () => {
      process.env.TMDB_API_KEY = '   '

      const result = validateApiCredentials(['TMDB_API_KEY'])
      expect(result.isValid).toBe(false)
      expect(result.missing).toContain('TMDB_API_KEY')
    })

    it('should return valid for empty required array', () => {
      const result = validateApiCredentials([])
      expect(result.isValid).toBe(true)
      expect(result.missing).toHaveLength(0)
    })
  })

  describe('checkMetadataAvailability', () => {
    it('should report TMDB available when API key present', () => {
      process.env.TMDB_API_KEY = 'valid-key'

      const availability = checkMetadataAvailability()
      expect(availability.tmdb).toBe(true)
    })

    it('should report TMDB unavailable when API key missing', () => {
      delete process.env.TMDB_API_KEY

      const availability = checkMetadataAvailability()
      expect(availability.tmdb).toBe(false)
    })

    it('should always report public sources as available', () => {
      const availability = checkMetadataAvailability()
      expect(availability.memoryAlpha).toBe(true)
      expect(availability.trekCore).toBe(true)
      expect(availability.stapi).toBe(true)
    })
  })

  describe('getMetadataConfig', () => {
    it('should return base configuration', () => {
      const config = getMetadataConfig()
      expect(config).toBeDefined()
      expect(typeof config).toBe('object')
    })

    it('should accept partial config overrides', () => {
      const config = getMetadataConfig({})
      expect(config).toBeDefined()
    })
  })

  describe('initializeMetadataSources', () => {
    it('should initialize metadata sources', () => {
      const sources = initializeMetadataSources()
      expect(sources).toBeDefined()
      expect(typeof sources.enrichEpisode).toBe('function')
    })

    it('should work without TMDB API key', () => {
      delete process.env.TMDB_API_KEY

      const sources = initializeMetadataSources()
      expect(sources).toBeDefined()
    })

    it('should work with TMDB API key', () => {
      process.env.TMDB_API_KEY = 'test-key'

      const sources = initializeMetadataSources()
      expect(sources).toBeDefined()
    })
  })

  describe('logMetadataSourceStatus', () => {
    it('should log status without errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

      logMetadataSourceStatus()

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should indicate TMDB status correctly', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

      process.env.TMDB_API_KEY = 'valid-key'
      logMetadataSourceStatus()

      const calls = consoleSpy.mock.calls.join('\n')
      expect(calls).toContain('TMDB')
      expect(calls).toContain('Available')

      consoleSpy.mockRestore()
    })
  })
})
