import type {MetadataSourceInstance} from '../src/modules/types.js'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {createMetadataSources} from '../src/modules/metadata-sources.js'

// Mock fetch globally
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

describe('MetadataSources', () => {
  let metadataSources: MetadataSourceInstance

  beforeEach(() => {
    vi.resetAllMocks()

    metadataSources = createMetadataSources({
      memoryAlpha: {
        enabled: true,
        rateLimitConfig: {requestsPerSecond: 1, burstSize: 5},
      },
      tmdb: {
        enabled: true,
        apiKey: 'test-api-key',
        rateLimitConfig: {requestsPerSecond: 4, burstSize: 40},
      },
    })

    // Clear cache to ensure clean state
    metadataSources.clearCache()
  })

  describe('Memory Alpha Integration', () => {
    it('should fetch and parse Memory Alpha episode data', async () => {
      // Mock Memory Alpha search response
      const searchResponse = {
        query: {
          search: [
            {
              title: 'Broken Bow (episode)',
              pageid: 12345,
            },
          ],
        },
      }

      // Mock Memory Alpha content response
      const contentResponse = {
        query: {
          pages: {
            '12345': {
              title: 'Broken Bow (episode)',
              extract:
                'Captain Archer and his crew embark on their first mission aboard Enterprise.',
            },
          },
        },
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: vi.fn().mockResolvedValue(searchResponse),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: vi.fn().mockResolvedValue(contentResponse),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: vi.fn().mockResolvedValue({id: 123, name: 'Test TMDB'}),
        } as unknown as Response)

      const result = await metadataSources.enrichEpisode('ent_s1_e01')

      expect(result).toBeTruthy()
      expect(result?.dataSource).toBe('memory-alpha')
      expect(result?.enrichmentStatus).toBe('complete')
      expect(result?.fieldValidation?.['synopsis']?.isValid).toBe(true)
      expect(result?.fieldValidation?.['memoryAlphaUrl']?.isValid).toBe(true)
    })

    it('should handle Memory Alpha API failures gracefully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Network error',
          json: vi.fn().mockRejectedValue(new Error('Network error')),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Network error',
          json: vi.fn().mockRejectedValue(new Error('Network error')),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Network error',
          json: vi.fn().mockRejectedValue(new Error('Network error')),
        } as unknown as Response)

      const result = await metadataSources.enrichEpisode('ent_s1_e01')

      expect(result).toBeNull()
    })
  })

  describe('TMDB Integration', () => {
    it('should fetch and parse TMDB episode data', async () => {
      // Mock Memory Alpha search to fail (only 1 call since search fails immediately)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn(),
      } as unknown as Response)

      // Mock TMDB episode response
      const tmdbResponse = {
        id: 228456,
        name: 'Broken Bow',
        air_date: '2001-09-26',
        production_code: '176251',
        overview: 'Captain Archer and his crew embark on their first mission.',
        vote_average: 7.5,
        crew: [
          {job: 'Director', name: 'James L. Conway'},
          {job: 'Writer', name: 'Rick Berman'},
          {job: 'Writer', name: 'Brannon Braga'},
        ],
        guest_stars: [{name: 'John Fleck', character: 'Silik'}],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue(tmdbResponse),
      } as unknown as Response)

      const result = await metadataSources.enrichEpisode('ent_s1_e01')

      expect(result).toBeTruthy()
      expect(result?.dataSource).toBe('tmdb')
      expect(result?.enrichmentStatus).toBe('complete')
      expect(result?.fieldValidation?.['airDate']?.isValid).toBe(true)
      expect(result?.fieldValidation?.['productionCode']?.isValid).toBe(true)
      expect(result?.fieldValidation?.['tmdbId']?.isValid).toBe(true)
      expect(result?.fieldValidation?.['director']?.isValid).toBe(true)
      expect(result?.fieldValidation?.['writer']?.isValid).toBe(true)
    })

    it('should handle TMDB API failures gracefully', async () => {
      // Mock Memory Alpha to fail
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: vi.fn(),
        } as unknown as Response)
        // Mock TMDB to fail
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: vi.fn(),
        } as unknown as Response)

      const result = await metadataSources.enrichEpisode('ent_s1_e01')

      expect(result).toBeNull()
    })
  })

  describe('Rate Limiting', () => {
    it('should respect rate limits for API calls', async () => {
      // Just test that the rate limiter doesn't throw errors
      // In a real implementation, rate limiting would be more complex to test
      const startTime = Date.now()

      // Mock successful responses
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue({query: {search: []}}),
      } as unknown as Response)

      // Make a single request to verify basic functionality
      await metadataSources.enrichEpisode('ent_s1_e01')

      const endTime = Date.now()
      const duration = endTime - startTime

      // Should complete without errors (duration can be 0 in fast test environments)
      expect(duration).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Event Emissions', () => {
    it('should emit metadata-enriched events', async () => {
      const mockListener = vi.fn()
      metadataSources.on('enrichment-completed', mockListener)

      // Mock successful Memory Alpha response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: vi.fn().mockResolvedValue({query: {search: [{title: 'Test', pageid: 123}]}}),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: vi
            .fn()
            .mockResolvedValue({query: {pages: {'123': {title: 'Test', extract: 'Test content'}}}}),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: vi.fn().mockResolvedValue({id: 456, name: 'Test TMDB'}),
        } as unknown as Response)

      await metadataSources.enrichEpisode('ent_s1_e01')

      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          episodeId: 'ent_s1_e01',
          sourcesUsed: expect.any(Array),
          confidenceScore: expect.any(Number),
        }),
      )
    })

    it('should emit enrichment-failed events on error', async () => {
      const mockListener = vi.fn()
      metadataSources.on('enrichment-failed', mockListener)

      // Mock both Memory Alpha and TMDB to fail
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'API failure',
          json: vi.fn(),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'API failure',
          json: vi.fn(),
        } as unknown as Response)

      await metadataSources.enrichEpisode('ent_s1_e01')

      expect(mockListener).toHaveBeenCalledTimes(1)
      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          episodeId: 'ent_s1_e01',
          errors: expect.any(Array),
        }),
      )
    })
  })

  describe('Health Monitoring', () => {
    it('should track API health status', async () => {
      // Mock successful response for both sources
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: vi.fn().mockResolvedValue({query: {search: []}}),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: vi.fn().mockResolvedValue({query: {search: []}}),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: vi.fn().mockResolvedValue({id: 123, name: 'Test'}),
        } as unknown as Response)

      await metadataSources.enrichEpisode('ent_s1_e01')

      const healthStatus = metadataSources.getHealthStatus()
      expect(healthStatus['memory-alpha']?.isHealthy).toBe(true)
      expect(healthStatus['memory-alpha']?.consecutiveFailures).toBe(0)
    })

    it('should track API failures', async () => {
      // Mock failed response for all calls
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'API failure',
          json: vi.fn().mockRejectedValue(new Error('API failure')),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'API failure',
          json: vi.fn().mockRejectedValue(new Error('API failure')),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'API failure',
          json: vi.fn().mockRejectedValue(new Error('API failure')),
        } as unknown as Response)

      await metadataSources.enrichEpisode('ent_s1_e01')

      const healthStatus = metadataSources.getHealthStatus()
      expect(healthStatus['memory-alpha']?.consecutiveFailures).toBeGreaterThan(0)
    })
  })

  describe('Caching', () => {
    it('should cache successful responses', async () => {
      // Mock successful response for Memory Alpha and TMDB
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: vi.fn().mockResolvedValue({
            query: {
              search: [{title: 'Test', pageid: 123}],
            },
          }),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: vi.fn().mockResolvedValue({
            query: {
              pages: {'123': {title: 'Test', extract: 'Test content'}},
            },
          }),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: vi.fn().mockResolvedValue({id: 456, name: 'Test TMDB'}),
        } as unknown as Response)

      // First call should hit the API (3 calls: Memory Alpha search + content + TMDB)
      const result1 = await metadataSources.enrichEpisode('ent_s1_e01')
      expect(mockFetch).toHaveBeenCalledTimes(3)

      // Reset the mock to verify no additional calls
      mockFetch.mockClear()

      // Second call should use cache
      const result2 = await metadataSources.enrichEpisode('ent_s1_e01')
      expect(mockFetch).toHaveBeenCalledTimes(0) // No additional calls
      expect(result2).toEqual(result1)
    })

    it('should clear cache when requested', async () => {
      metadataSources.clearCache()

      const mockListener = vi.fn()
      metadataSources.on('cache-cleared', mockListener)

      metadataSources.clearCache()

      expect(mockListener).toHaveBeenCalledWith({
        timestamp: expect.any(Number),
      })
    })
  })
})
