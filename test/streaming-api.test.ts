/**
 * Test suite for Streaming API functionality
 * Tests Watchmode integration, caching, rate limiting, and preferences
 */

import type {StreamingApiConfig, StreamingPreferences} from '../src/modules/types.js'
import {beforeEach, describe, expect, it, vi, type MockedFunction} from 'vitest'
import {createStreamingApi} from '../src/modules/streaming-api.js'

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
      region: 'US',
      enableNotifications: true,
    }

    api.setPreferences(newPreferences)
    const savedPreferences = api.getPreferences()
    expect(savedPreferences.preferredPlatforms).toEqual(['netflix', 'hulu'])
    expect(savedPreferences.hideUnavailable).toBe(true)
  })

  it('should handle cached availability data', async () => {
    const api = createStreamingApi()
    await api.initialize(mockConfig)

    // Test with no cached data
    const cached = api.getCachedAvailability('test-content-id')
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
})
