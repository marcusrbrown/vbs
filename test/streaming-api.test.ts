/**
 * Test suite for Streaming API functionality
 * Tests Watchmode integration, caching, rate limiting, and preferences
 */

import type {StreamingApiConfig, StreamingPreferences} from '../src/modules/types.js'
import {beforeEach, describe, expect, it, vi, type MockedFunction} from 'vitest'
import {createStreamingApi} from '../src/modules/streaming-api.js'

// Mock IndexedDB for testing
const mockIDBRequest = {
  result: null as any,
  addEventListener: vi.fn((event: string, callback: () => void) => {
    if (event === 'success') {
      // Simulate immediate success for most operations
      setTimeout(callback, 0)
    }
  }),
}

const mockObjectStore = {
  put: vi.fn(() => mockIDBRequest),
  get: vi.fn(() => ({
    ...mockIDBRequest,
    result: null, // Return null for cache misses
  })),
  delete: vi.fn(() => mockIDBRequest),
  clear: vi.fn(() => mockIDBRequest),
}

const mockTransaction = {
  objectStore: vi.fn(() => mockObjectStore),
}

const mockIDBDatabase = {
  objectStoreNames: {
    contains: vi.fn(() => true),
  },
  createObjectStore: vi.fn(),
  transaction: vi.fn(() => mockTransaction),
}

const mockIndexedDB = {
  open: vi.fn(() => ({
    ...mockIDBRequest,
    addEventListener: vi.fn((event: string, callback: () => void) => {
      if (event === 'success') {
        mockIDBRequest.result = mockIDBDatabase
        setTimeout(callback, 0)
      }
    }),
  })),
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
      requestsPerMinute: 10,
      requestsPerHour: 100,
      requestsPerDay: 500,
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
})
