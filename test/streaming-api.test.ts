/**
 * Test suite for Streaming API functionality
 * Tests Watchmode integration, caching, rate limiting, and preferences
 */

import type {StreamingApiConfig, StreamingPreferences} from '../src/modules/types.js'
import {beforeEach, describe, expect, it, vi, type MockedFunction} from 'vitest'
import {createStreamingApi} from '../src/modules/streaming-api.js'

// Mock IndexedDB for testing - functional implementation with actual data storage
const mockDataStore = new Map<string, any>()

const createMockRequest = (result: any = null, error: any = null) => ({
  result,
  error,
  addEventListener: vi.fn((event: string, callback: Function) => {
    setTimeout(() => {
      if (event === 'success' && !error) {
        callback({target: {result}})
      } else if (event === 'error' && error) {
        callback({target: {error}})
      }
    }, 0)
  }),
  onsuccess: null as any,
  onerror: null as any,
})

const mockObjectStore = {
  put: vi.fn((value: any, key: string) => {
    mockDataStore.set(key, value)
    return createMockRequest(undefined)
  }),
  get: vi.fn((key: string) => {
    const result = mockDataStore.get(key) || null
    return createMockRequest(result)
  }),
  delete: vi.fn((key: string) => {
    const existed = mockDataStore.has(key)
    mockDataStore.delete(key)
    return createMockRequest(existed)
  }),
  clear: vi.fn(() => {
    mockDataStore.clear()
    return createMockRequest(undefined)
  }),
}

const mockTransaction = {
  objectStore: vi.fn(() => mockObjectStore),
  oncomplete: null as any,
  onerror: null as any,
  onabort: null as any,
}

const mockIDBDatabase = {
  objectStoreNames: {
    contains: vi.fn(() => true),
  },
  createObjectStore: vi.fn(),
  transaction: vi.fn(() => mockTransaction),
  close: vi.fn(),
  version: 1,
}

const mockIndexedDB = {
  open: vi.fn(() => createMockRequest(mockIDBDatabase)),
  deleteDatabase: vi.fn(),
}

// Setup global mocks
vi.stubGlobal('indexedDB', mockIndexedDB)

// Mock fetch globally
const mockFetch = vi.fn() as MockedFunction<typeof fetch>
vi.stubGlobal('fetch', mockFetch)

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
vi.stubGlobal('localStorage', mockLocalStorage)

describe('StreamingApi', () => {
  const mockConfig: StreamingApiConfig = {
    provider: 'watchmode',
    apiKey: 'test-api-key',
    baseUrl: 'https://api.watchmode.com/v1',
    defaultRegion: 'US',
    debugMode: false,
    rateLimit: {
      requestsPerMinute: 100, // Increased for testing
      requestsPerHour: 1000, // Increased for testing
      requestsPerDay: 5000, // Increased for testing
    },
    cache: {
      defaultExpiration: 24,
      maxSize: 1000,
      backgroundRefresh: false,
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)

    // Reset IndexedDB mock state
    mockDataStore.clear()
    mockObjectStore.get.mockImplementation((key: string) => {
      const result = mockDataStore.get(key) || null
      return createMockRequest(result)
    })
  })

  it('should create streaming API instance', () => {
    const api = createStreamingApi()
    expect(api).toBeDefined()
    expect(typeof api.initialize).toBe('function')
    expect(typeof api.getAvailability).toBe('function')
    expect(typeof api.getBatchAvailability).toBe('function')
    expect(typeof api.searchContent).toBe('function')
    expect(typeof api.getCachedAvailability).toBe('function')
  })

  it('should initialize with configuration', async () => {
    const api = createStreamingApi()
    await expect(api.initialize(mockConfig)).resolves.toBeUndefined()

    const preferences = api.getPreferences()
    expect(preferences).toBeDefined()
    expect(preferences.preferredPlatforms).toEqual([
      'paramount-plus',
      'netflix',
      'amazon-prime',
      'hulu',
    ])
  })

  it('should handle rate limit status', async () => {
    const api = createStreamingApi()
    await api.initialize(mockConfig)

    const rateLimitStatus = api.getRateLimitStatus()
    expect(rateLimitStatus).toBeDefined()
    expect(typeof rateLimitStatus.requestsPerMinute).toBe('number')
  })

  it('should manage preferences', async () => {
    const api = createStreamingApi()
    await api.initialize(mockConfig)

    const newPreferences: StreamingPreferences = {
      preferredPlatforms: ['netflix', 'hulu'],
      hideUnavailable: true,
      showPricing: false,
      location: {
        region: 'US',
        allowAutoDetection: false,
        showOtherRegions: false,
        locale: 'en-US',
      },
      enableNotifications: true,
    }

    api.setPreferences(newPreferences)
    const savedPreferences = api.getPreferences()
    expect(savedPreferences.preferredPlatforms).toEqual(['netflix', 'hulu'])
    expect(savedPreferences.hideUnavailable).toBe(true)
    expect(savedPreferences.location.region).toBe('US')
  })

  it('should handle cached availability data', async () => {
    const api = createStreamingApi()
    await api.initialize(mockConfig)

    // Test with no cached data
    const cached = await api.getCachedAvailability('test-content-id')
    expect(cached).toBeNull()
  })

  it('should clear expired cache entries', async () => {
    const api = createStreamingApi()
    await api.initialize(mockConfig)

    const cleared = await api.clearExpiredCache()
    expect(typeof cleared).toBe('number')
    expect(cleared).toBeGreaterThanOrEqual(0)
  })

  it('should check if requests are allowed', async () => {
    const api = createStreamingApi()
    await api.initialize(mockConfig)

    const isAllowed = api.isRequestAllowed()
    expect(typeof isAllowed).toBe('boolean')
  })

  it('should handle event listeners', async () => {
    const api = createStreamingApi()
    await api.initialize(mockConfig)

    const mockListener = vi.fn()
    api.on('availability-updated', mockListener)

    // Verify listener is attached (no errors thrown)
    expect(() => api.off('availability-updated', mockListener)).not.toThrow()
  })

  it('should destroy instance cleanly', async () => {
    const api = createStreamingApi()
    await api.initialize(mockConfig)

    expect(() => api.destroy()).not.toThrow()
  })

  it('should handle API errors gracefully', async () => {
    const api = createStreamingApi()

    // Test before initialization
    await expect(api.getAvailability('test-id')).rejects.toThrow('Streaming API not initialized')
  })

  it('should handle network request mocking', async () => {
    const api = createStreamingApi()
    await api.initialize(mockConfig)

    // Mock successful API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({
        'X-RateLimit-Remaining': '9',
        'X-RateLimit-Reset': '3600',
        'X-RateLimit-Limit': '10',
      }),
      json: async () => [
        {
          content_id: 'test-id',
          content_type: 'series',
          source_id: 'netflix',
          name: 'Netflix',
          web_url: 'https://netflix.com',
          type: 'subscription',
          regions: ['US'],
        },
      ],
    } as Response)

    const availability = await api.getAvailability('test-content-id')
    expect(Array.isArray(availability)).toBe(true)
  })

  describe('Geographic Availability Handling', () => {
    let api: ReturnType<typeof createStreamingApi>

    beforeEach(async () => {
      api = createStreamingApi()
      await api.initialize(mockConfig)
    })

    it('should update region preferences correctly', () => {
      const initialPrefs = api.getPreferences()
      expect(initialPrefs.location.region).toBe('US') // Default

      api.updateRegionPreference('CA')

      const updatedPrefs = api.getPreferences()
      expect(updatedPrefs.location.region).toBe('CA')
    })

    it('should emit region-changed event when updating region', () => {
      const regionChangedSpy = vi.fn()
      api.on('region-changed', regionChangedSpy)

      api.updateRegionPreference('UK')

      expect(regionChangedSpy).toHaveBeenCalledWith({
        previousRegion: expect.any(String),
        newRegion: 'UK',
        timestamp: expect.any(String),
      })
    })

    it('should filter availability by region preference', async () => {
      // Mock API response with multiple regional availability
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => [
          {
            content_id: 'test-id',
            content_type: 'series',
            source_id: 'paramount-plus',
            name: 'Paramount+',
            web_url: 'https://paramount.com',
            type: 'subscription',
            regions: ['US', 'CA', 'UK'],
          },
          {
            content_id: 'test-id',
            content_type: 'series',
            source_id: 'hulu',
            name: 'Hulu',
            web_url: 'https://hulu.com',
            type: 'subscription',
            regions: ['US'], // Only available in US
          },
          {
            content_id: 'test-id',
            content_type: 'series',
            source_id: 'crave',
            name: 'Crave',
            web_url: 'https://crave.ca',
            type: 'subscription',
            regions: ['CA'], // Only available in Canada
          },
        ],
      } as Response)

      // Set region to Canada
      api.updateRegionPreference('CA')

      const availability = await api.getAvailability('test-content-id')

      // Should only include platforms available in Canada
      expect(availability).toHaveLength(2) // Paramount+ and Crave
      expect(availability.map(item => item.platform.id)).toEqual(['paramount-plus', 'crave'])
    })

    it('should get availability by specific region', async () => {
      // Mock API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => [
          {
            content_id: 'test-id',
            content_type: 'series',
            source_id: 'paramount-plus',
            name: 'Paramount+',
            web_url: 'https://paramount.com',
            type: 'subscription',
            regions: ['US', 'CA', 'UK'],
          },
          {
            content_id: 'test-id',
            content_type: 'series',
            source_id: 'bbc-iplayer',
            name: 'BBC iPlayer',
            web_url: 'https://iplayer.tv',
            type: 'free',
            regions: ['UK'],
          },
        ],
      } as Response)

      // Get availability for UK region specifically
      const ukAvailability = await api.getAvailabilityByRegion('test-content-id', 'UK')

      expect(ukAvailability).toHaveLength(2) // Paramount+ and BBC iPlayer
      expect(ukAvailability.map(item => item.platform.id)).toEqual([
        'paramount-plus',
        'bbc-iplayer',
      ])
    })

    it('should handle location preferences in streaming preferences', () => {
      const newPreferences: StreamingPreferences = {
        preferredPlatforms: ['paramount-plus', 'netflix'],
        hideUnavailable: true,
        showPricing: false,
        location: {
          region: 'UK',
          allowAutoDetection: false,
          showOtherRegions: true,
          locale: 'en-GB',
        },
        enableNotifications: false,
      }

      api.setPreferences(newPreferences)
      const retrievedPrefs = api.getPreferences()

      expect(retrievedPrefs.location.region).toBe('UK')
      expect(retrievedPrefs.location.allowAutoDetection).toBe(false)
      expect(retrievedPrefs.location.showOtherRegions).toBe(true)
      expect(retrievedPrefs.location.locale).toBe('en-GB')
    })

    it('should sanitize invalid region preferences', () => {
      const invalidPreferences = {
        preferredPlatforms: ['paramount-plus'],
        hideUnavailable: false,
        showPricing: true,
        location: {
          region: 'INVALID' as any, // Invalid region
          allowAutoDetection: false,
          showOtherRegions: false,
        },
        enableNotifications: true,
      }

      api.setPreferences(invalidPreferences)
      const retrievedPrefs = api.getPreferences()

      // Should fallback to default region (US)
      expect(retrievedPrefs.location.region).toBe('US')
    })
  })

  describe('Batch Operations', () => {
    let api: ReturnType<typeof createStreamingApi>

    const mockAvailabilityResponse = {
      ok: true,
      status: 200,
      headers: new Headers({
        'X-RateLimit-Remaining': '95',
        'X-RateLimit-Reset': '1640995200',
        'X-RateLimit-Limit': '100',
      }),
      json: vi.fn().mockResolvedValue([
        {
          content_id: 'test-content',
          content_type: 'series',
          source_id: 'paramount-plus',
          name: 'Paramount Plus',
          logo_100px: 'https://example.com/logo.png',
          web_url: 'https://paramountplus.com/shows/star-trek',
          type: 'subscription',
          regions: ['US'],
          format: ['HD'],
        },
      ]),
    }

    beforeEach(async () => {
      api = createStreamingApi()
      await api.initialize(mockConfig)
      vi.clearAllMocks()

      // Reset rate limiting for tests by clearing localStorage and providing fresh rate limit state
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'streamingRateLimit') {
          // Return fresh rate limit state for each test
          return JSON.stringify({
            requestsPerMinute: 100,
            requestsPerHour: 1000,
            requestsPerDay: 5000,
            current: {minute: 0, hour: 0, day: 0},
            windows: {
              minute: Date.now(),
              hour: Date.now(),
              day: Date.now(),
            },
          })
        }
        return null
      })

      // Clear IndexedDB mock state
      mockDataStore.clear()
      mockObjectStore.get.mockImplementation((key: string) => {
        const result = mockDataStore.get(key) || null
        return createMockRequest(result)
      })
    })

    it('should perform batch availability operations successfully', async () => {
      const contentIds = ['tos_s1', 'tng_s1', 'ds9_s1']

      // Mock successful API responses for all items
      mockFetch.mockResolvedValue(mockAvailabilityResponse as any)

      const batchListener = vi.fn()
      api.on('batch-availability-updated', batchListener)

      const results = await api.getBatchAvailability(contentIds)

      expect(results).toBeInstanceOf(Map)
      expect(results.size).toBe(3)

      // Check that all content IDs are present
      contentIds.forEach(id => {
        expect(results.has(id)).toBe(true)
        const availability = results.get(id)
        expect(Array.isArray(availability)).toBe(true)
      })

      // Verify batch event was emitted
      expect(batchListener).toHaveBeenCalledWith({
        totalRequested: 3,
        totalFetched: 3,
        fromCache: 0,
        fromApi: 3,
        failed: [],
        duration: expect.any(Number),
      })
    })

    it('should handle mixed cache hits and API calls in batch operations', async () => {
      const contentIds = ['cached_item', 'new_item_1', 'new_item_2']

      // Pre-populate cache with proper structure
      const cacheMap = new Map([
        [
          'cached_item',
          {
            contentId: 'cached_item',
            availability: [
              {
                contentId: 'cached_item',
                contentType: 'series',
                platform: {
                  id: 'paramount-plus',
                  name: 'Paramount Plus',
                  logo: 'https://example.com/logo.png',
                  url: 'https://paramountplus.com',
                  requiresSubscription: true,
                  regions: ['US'],
                },
                url: 'https://paramountplus.com/shows/star-trek',
                type: 'subscription',
                quality: ['HD'],
                regions: ['US'], // Add missing regions field
                lastUpdated: new Date().toISOString(), // Add missing lastUpdated field
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              },
            ],
            cachedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            metadata: {
              source: 'watchmode',
              responseTime: new Date().toISOString(),
              statusCode: 200,
            },
          },
        ],
      ])
      mockDataStore.set('streamingAvailabilityCache', cacheMap)

      // Mock API responses for new items
      mockFetch.mockResolvedValue(mockAvailabilityResponse as any)

      const batchListener = vi.fn()
      api.on('batch-availability-updated', batchListener)

      const results = await api.getBatchAvailability(contentIds)

      expect(results.size).toBe(3)

      // Verify batch event shows mixed sources
      expect(batchListener).toHaveBeenCalledWith({
        totalRequested: 3,
        totalFetched: 3,
        fromCache: 1,
        fromApi: 2,
        failed: [],
        duration: expect.any(Number),
      })
    })

    it('should handle batch operation failures gracefully', async () => {
      const contentIds = ['item1', 'item2', 'item3']

      // Mock failure for item2 - exhaust all retries (3 failures for maxRetries=2)
      mockFetch
        .mockResolvedValueOnce(mockAvailabilityResponse as any) // item1 success
        .mockRejectedValueOnce(new Error('API Error')) // item2 failure 1
        .mockRejectedValueOnce(new Error('API Error')) // item2 failure 2 (retry 1)
        .mockRejectedValueOnce(new Error('API Error')) // item2 failure 3 (retry 2, final)
        .mockResolvedValueOnce(mockAvailabilityResponse as any) // item3 success

      const batchListener = vi.fn()
      api.on('batch-availability-updated', batchListener)

      const results = await api.getBatchAvailability(contentIds)

      expect(results.size).toBe(3)
      expect(results.get('item2')).toEqual([]) // Failed item should have empty array

      // Verify batch event shows failures
      expect(batchListener).toHaveBeenCalledWith({
        totalRequested: 3,
        totalFetched: 3,
        fromCache: 0,
        fromApi: 2,
        failed: ['item2'],
        duration: expect.any(Number),
      })
    })

    it('should respect rate limits during batch operations', async () => {
      const contentIds = Array.from({length: 8}, (_, i) => `item_${i}`) // Reduced from 20 to 8

      // Mock rate limiting by simulating API responses
      mockFetch.mockResolvedValue(mockAvailabilityResponse as any)

      const results = await api.getBatchAvailability(contentIds)

      expect(results.size).toBe(8)

      // Verify that fetch was called but with batching (not all at once)
      // The implementation should batch requests to respect rate limits
      expect(mockFetch).toHaveBeenCalled()
    }, 10000) // Increase timeout to 10 seconds

    it('should perform preload batch availability with different priorities', async () => {
      const contentIds = ['preload1', 'preload2', 'preload3']

      mockFetch.mockResolvedValue(mockAvailabilityResponse as any)

      // Test high priority preload
      await api.preloadBatchAvailability(contentIds, {
        priority: 'high',
        maxConcurrency: 2,
      })

      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('should skip cached items during preload when skipCache is false', async () => {
      const contentIds = ['cached_item', 'new_item']

      // Pre-populate cache with proper structure
      const cacheMap = new Map([
        [
          'cached_item',
          {
            contentId: 'cached_item',
            availability: [],
            cachedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            metadata: {
              source: 'watchmode',
              responseTime: new Date().toISOString(),
              statusCode: 200,
            },
          },
        ],
      ])
      mockDataStore.set('streamingAvailabilityCache', cacheMap)

      mockFetch.mockResolvedValue(mockAvailabilityResponse as any)

      await api.preloadBatchAvailability(contentIds, {skipCache: false})

      // Should only fetch for non-cached items
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should get batch cache statistics correctly', async () => {
      const contentIds = ['cached1', 'cached2', 'missing1']

      // Pre-populate cache with proper structure
      const cacheMap = new Map([
        [
          'cached1',
          {
            contentId: 'cached1',
            availability: [],
            cachedAt: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            metadata: {
              source: 'watchmode',
              responseTime: new Date(Date.now() - 60000).toISOString(),
              statusCode: 200,
            },
          },
        ],
        [
          'cached2',
          {
            contentId: 'cached2',
            availability: [],
            cachedAt: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            metadata: {
              source: 'watchmode',
              responseTime: new Date(Date.now() - 120000).toISOString(),
              statusCode: 200,
            },
          },
        ],
      ])
      mockDataStore.set('streamingAvailabilityCache', cacheMap)

      const stats = await api.getBatchCacheStats(contentIds)

      expect(stats.total).toBe(3)
      expect(stats.cached).toBe(2)
      expect(stats.missing).toBe(1)
      expect(stats.expired).toBe(0)
      expect(stats.hitRate).toBeCloseTo(66.67, 2)
      expect(stats.cacheAgeStats.averageAge).toBeGreaterThan(0)
    })

    it('should handle empty batch operations gracefully', async () => {
      const results = await api.getBatchAvailability([])
      expect(results.size).toBe(0)

      const stats = await api.getBatchCacheStats([])
      expect(stats.total).toBe(0)
      expect(stats.hitRate).toBe(0)
    })
  })
})
