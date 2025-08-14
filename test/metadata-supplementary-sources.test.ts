/**
 * Test for TrekCore and STAPI supplementary data sources.
 */
import type {MetadataSourceInstance} from '../src/modules/types.js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createMetadataSources} from '../src/modules/metadata-sources.js'

describe('Supplementary Data Sources', () => {
  let metadataSources: MetadataSourceInstance

  beforeEach(() => {
    // Mock fetch globally
    globalThis.fetch = vi.fn()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('TrekCore Integration', () => {
    beforeEach(() => {
      metadataSources = createMetadataSources({
        trekCore: {
          enabled: true,
          rateLimitConfig: {
            requestsPerSecond: 1,
            burstSize: 5,
          },
        },
      })
    })

    it('should handle TrekCore requests', async () => {
      const mockResponse = new Response(
        '<!DOCTYPE html><html><body>TrekCore Episode Page</body></html>',
        {
          status: 200,
          headers: {'Content-Type': 'text/html'},
        },
      )

      vi.mocked(fetch).mockResolvedValue(mockResponse)

      const result = await metadataSources.enrichEpisode('tos_s1_e01')

      expect(fetch).toHaveBeenCalledWith(
        'https://tos.trekcore.com/episodes/season1/tos1x01.php',
        expect.any(Object),
      )

      // TrekCore might return null if it can't parse the page
      expect(result).toBeDefined()
    })

    it('should handle TrekCore failures gracefully', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      const result = await metadataSources.enrichEpisode('tos_s1_e01')

      expect(result).toBeNull()
    })
  })

  describe('STAPI Integration', () => {
    beforeEach(() => {
      metadataSources = createMetadataSources({
        stapi: {
          enabled: true,
          rateLimitConfig: {
            requestsPerSecond: 2,
            burstSize: 10,
          },
        },
      })
    })

    it('should fetch and parse STAPI episode data', async () => {
      // Mock search response
      const searchResponse = new Response(
        JSON.stringify({
          episodes: [
            {
              uid: 'EPMA0000000001',
              title: 'The Man Trap',
            },
          ],
        }),
        {status: 200},
      )

      // Mock episode details response
      const detailsResponse = new Response(
        JSON.stringify({
          episode: {
            uid: 'EPMA0000000001',
            title: 'The Man Trap',
            usAirDate: '1966-09-08',
            productionSerialNumber: '6149-06',
            stardate: 1513.1,
            stardateFrom: 1513.1,
            stardateTo: 1513.8,
            yearFrom: 2266,
            yearTo: 2266,
          },
        }),
        {status: 200},
      )

      vi.mocked(fetch).mockResolvedValueOnce(searchResponse).mockResolvedValueOnce(detailsResponse)

      const result = await metadataSources.enrichEpisode('tos_s1_e01')

      expect(fetch).toHaveBeenCalledTimes(2)
      expect(fetch).toHaveBeenNthCalledWith(
        1,
        'https://stapi.co/api/v1/rest/episode/search?seasonNumberFrom=1&seasonNumberTo=1&episodeNumberFrom=01&episodeNumberTo=01&pageSize=1',
        expect.any(Object),
      )
      expect(fetch).toHaveBeenNthCalledWith(
        2,
        'https://stapi.co/api/v1/rest/episode?uid=EPMA0000000001',
        expect.any(Object),
      )

      expect(result).toBeDefined()
      expect(result?.dataSource).toBe('stapi')
      expect(result?.confidenceScore).toBe(0.8)
    })

    it('should handle STAPI API failures gracefully', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('API Error'))

      const result = await metadataSources.enrichEpisode('tos_s1_e01')

      expect(result).toBeNull()
    })

    it('should handle empty STAPI search results', async () => {
      const searchResponse = new Response(
        JSON.stringify({
          episodes: [],
        }),
        {status: 200},
      )

      vi.mocked(fetch).mockResolvedValue(searchResponse)

      const result = await metadataSources.enrichEpisode('tos_s1_e01')

      expect(result).toBeNull()
    })
  })

  describe('Multiple Sources Fallback', () => {
    beforeEach(() => {
      metadataSources = createMetadataSources({
        trekCore: {
          enabled: true,
          rateLimitConfig: {
            requestsPerSecond: 1,
            burstSize: 5,
          },
        },
        stapi: {
          enabled: true,
          rateLimitConfig: {
            requestsPerSecond: 2,
            burstSize: 10,
          },
        },
      })
    })

    it('should try multiple sources and return highest confidence result', async () => {
      // Mock TrekCore to succeed
      const trekCoreResponse = new Response(
        '<!DOCTYPE html><html><body>TrekCore Episode Page</body></html>',
        {
          status: 200,
          headers: {'Content-Type': 'text/html'},
        },
      )

      // Mock STAPI to succeed with better confidence
      const stapiSearchResponse = new Response(
        JSON.stringify({
          episodes: [
            {
              uid: 'EPMA0000000001',
              title: 'The Man Trap',
            },
          ],
        }),
        {status: 200},
      )

      const stapiDetailsResponse = new Response(
        JSON.stringify({
          episode: {
            uid: 'EPMA0000000001',
            title: 'The Man Trap',
            usAirDate: '1966-09-08',
            productionSerialNumber: '6149-06',
          },
        }),
        {status: 200},
      )

      vi.mocked(fetch)
        .mockResolvedValueOnce(trekCoreResponse) // TrekCore
        .mockResolvedValueOnce(stapiSearchResponse) // STAPI search
        .mockResolvedValueOnce(stapiDetailsResponse) // STAPI details

      const result = await metadataSources.enrichEpisode('tos_s1_e01')

      expect(result).toBeDefined()
      // STAPI has higher confidence (0.8) than TrekCore (0.75)
      expect(result?.dataSource).toBe('stapi')
      expect(result?.confidenceScore).toBe(0.8)
    })
  })
})
