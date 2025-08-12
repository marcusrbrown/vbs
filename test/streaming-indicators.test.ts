import type {StreamingApiInstance, StreamingAvailability} from '../src/modules/types.js'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {
  createBatchStreamingIndicators,
  createStreamingIndicators,
  createStreamingIndicatorsAsync,
  updateStreamingIndicators,
} from '../src/components/streaming-indicators.js'

// Mock streaming availability data
const mockAvailability: StreamingAvailability[] = [
  {
    contentId: 'tos_s1_e1',
    contentType: 'series',
    platform: {
      id: 'paramount-plus',
      name: 'Paramount+',
      logo: '',
      url: 'https://paramountplus.com',
      requiresSubscription: true,
      regions: ['US', 'CA'],
    },
    url: 'https://paramountplus.com/shows/star-trek/',
    type: 'subscription',
    quality: ['HD', '4K'],
    regions: ['US', 'CA'],
    lastUpdated: '2025-08-10T10:00:00.000Z',
    expiresAt: '2025-08-11T10:00:00.000Z',
  },
  {
    contentId: 'tos_s1_e1',
    contentType: 'series',
    platform: {
      id: 'netflix',
      name: 'Netflix',
      logo: '',
      url: 'https://netflix.com',
      requiresSubscription: true,
      regions: ['US'],
    },
    url: 'https://netflix.com/title/70136140',
    type: 'subscription',
    quality: ['HD'],
    regions: ['US'],
    lastUpdated: '2025-08-10T10:00:00.000Z',
    expiresAt: '2025-08-11T10:00:00.000Z',
  },
  {
    contentId: 'tos_s1_e1',
    contentType: 'series',
    platform: {
      id: 'amazon-prime',
      name: 'Prime Video',
      logo: '',
      url: 'https://amazon.com',
      requiresSubscription: false,
      regions: ['US'],
    },
    url: 'https://amazon.com/dp/B075QVTLGJ',
    type: 'rent',
    price: {
      amount: 3.99,
      currency: 'USD',
    },
    quality: ['HD'],
    regions: ['US'],
    lastUpdated: '2025-08-10T10:00:00.000Z',
    expiresAt: '2025-08-11T10:00:00.000Z',
  },
]

// Mock streaming API
const createMockStreamingApi = (): StreamingApiInstance => {
  return {
    initialize: vi.fn(),
    getAvailability: vi.fn(),
    getBatchAvailability: vi.fn(),
    searchContent: vi.fn(),
    refreshAvailability: vi.fn(),
    getCachedAvailability: vi.fn(),
    clearExpiredCache: vi.fn(),
    getRateLimitStatus: vi.fn(),
    isRequestAllowed: vi.fn(),
    setPreferences: vi.fn(),
    getPreferences: vi.fn(),
    getAvailabilityByRegion: vi.fn(),
    updateRegionPreference: vi.fn(),
    destroy: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    once: vi.fn(),
    emit: vi.fn(),
    removeAllListeners: vi.fn(),
  } as StreamingApiInstance
}

describe('Streaming Indicators Component', () => {
  let mockStreamingApi: StreamingApiInstance

  beforeEach(() => {
    mockStreamingApi = createMockStreamingApi()

    // Reset DOM
    document.body.innerHTML = ''
  })

  describe('createStreamingIndicators', () => {
    it('should create streaming indicators for multiple platforms', () => {
      const result = createStreamingIndicators(mockAvailability)

      expect(result).toContain('streaming-indicators-container')
      expect(result).toContain('Paramount+')
      expect(result).toContain('Netflix')
      expect(result).toContain('Prime Video')
    })

    it('should respect maxPlatforms configuration', () => {
      const result = createStreamingIndicators(mockAvailability, {
        maxPlatforms: 2,
      })

      expect(result).toContain('Paramount+')
      expect(result).toContain('Netflix')
      expect(result).toContain('+1') // "more" indicator
    })

    it('should show empty state for no availability', () => {
      const result = createStreamingIndicators([])

      expect(result).toContain('streaming-indicators-empty')
      expect(result).toContain('No streaming')
    })

    it('should sort platforms by availability type priority', () => {
      const result = createStreamingIndicators(mockAvailability)

      // Should prioritize subscription over rent
      const paramountIndex = result.indexOf('Paramount+')
      const netflixIndex = result.indexOf('Netflix')
      const primeIndex = result.indexOf('Prime Video')

      expect(paramountIndex).toBeLessThan(primeIndex)
      expect(netflixIndex).toBeLessThan(primeIndex)
    })

    it('should handle configuration options', () => {
      const result = createStreamingIndicators(mockAvailability, {
        size: 'large',
        layout: 'vertical',
        showPricing: true,
        showQuality: true,
        showIcons: false,
      })

      expect(result).toContain('size-large')
      expect(result).toContain('layout-vertical')
      expect(result).toContain('$3.99') // Price for rent option
      expect(result).toContain('HD') // Quality indicator
    })

    it('should hide pricing when showPricing is false', () => {
      const result = createStreamingIndicators(mockAvailability, {
        showPricing: false,
      })

      expect(result).not.toContain('$3.99')
      expect(result).not.toContain('platform-price')
    })
  })

  describe('createStreamingIndicatorsAsync', () => {
    it('should fetch cached availability first', async () => {
      const getCachedAvailabilityMock = vi.spyOn(mockStreamingApi, 'getCachedAvailability')
      getCachedAvailabilityMock.mockResolvedValue(mockAvailability)

      const result = await createStreamingIndicatorsAsync('tos_s1_e1', mockStreamingApi)

      expect(getCachedAvailabilityMock).toHaveBeenCalledWith('tos_s1_e1')
      expect(result).toContain('Paramount+')
    })

    it('should handle API errors gracefully', async () => {
      const getCachedAvailabilityMock = vi.spyOn(mockStreamingApi, 'getCachedAvailability')
      getCachedAvailabilityMock.mockRejectedValue(new Error('API Error'))

      const result = await createStreamingIndicatorsAsync('tos_s1_e1', mockStreamingApi)

      expect(result).toContain('streaming-indicators-error')
      expect(result).toContain('Unavailable')
    })
  })

  describe('createBatchStreamingIndicators', () => {
    it('should fetch batch availability and create indicators for all content', async () => {
      const batchMap = new Map([
        ['tos_s1_e1', mockAvailability],
        ['tos_s1_e2', []],
      ])

      const getBatchAvailabilityMock = vi.spyOn(mockStreamingApi, 'getBatchAvailability')
      getBatchAvailabilityMock.mockResolvedValue(batchMap)

      const result = await createBatchStreamingIndicators(
        ['tos_s1_e1', 'tos_s1_e2'],
        mockStreamingApi,
      )

      expect(getBatchAvailabilityMock).toHaveBeenCalledWith(['tos_s1_e1', 'tos_s1_e2'])
      expect(result.size).toBe(2)
      expect(result.get('tos_s1_e1')).toContain('Paramount+')
      expect(result.get('tos_s1_e2')).toContain('No streaming')
    })
  })

  describe('updateStreamingIndicators', () => {
    beforeEach(() => {
      // Set up DOM with streaming indicator elements
      document.body.innerHTML = `
        <div data-streaming-content-id="tos_s1_e1">Loading...</div>
        <div data-streaming-content-id="tos_s1_e1">Loading...</div>
        <div data-streaming-content-id="tos_s1_e2">Loading...</div>
      `
    })

    it('should update all elements with matching content ID', async () => {
      const getCachedAvailabilityMock = vi.spyOn(mockStreamingApi, 'getCachedAvailability')
      getCachedAvailabilityMock.mockResolvedValue(mockAvailability)

      await updateStreamingIndicators('tos_s1_e1', mockStreamingApi)

      const elements = document.querySelectorAll('[data-streaming-content-id="tos_s1_e1"]')
      elements.forEach(element => {
        expect(element.innerHTML).toContain('Paramount+')
      })

      // Should not update different content ID
      const otherElement = document.querySelector('[data-streaming-content-id="tos_s1_e2"]')
      expect(otherElement?.innerHTML).toBe('Loading...')
    })
  })

  describe('Platform Information', () => {
    it('should handle unknown platforms gracefully', () => {
      const unknownPlatformAvailability: StreamingAvailability[] = [
        {
          contentId: 'tos_s1_e1',
          contentType: 'series',
          platform: {
            id: 'unknown-service',
            name: 'Unknown Service',
            logo: '',
            url: 'https://unknown.com',
            requiresSubscription: true,
            regions: ['US'],
          },
          url: 'https://unknown.com/content',
          type: 'subscription',
          quality: ['HD'],
          regions: ['US'],
          lastUpdated: '2025-08-10T10:00:00.000Z',
          expiresAt: '2025-08-11T10:00:00.000Z',
        },
      ]

      const result = createStreamingIndicators(unknownPlatformAvailability)

      expect(result).toContain('Unknown Service')
      expect(result).toContain('📺') // Default icon
    })

    it('should format prices correctly', () => {
      const result = createStreamingIndicators(mockAvailability, {
        showPricing: true,
      })

      expect(result).toContain('$3.99') // USD formatting
    })
  })

  describe('Accessibility', () => {
    it('should include proper ARIA attributes', () => {
      const result = createStreamingIndicators(mockAvailability, {
        showLinks: true,
      })

      expect(result).toContain('target="_blank"')
      expect(result).toContain('rel="noopener noreferrer"')
      expect(result).toContain('title=')
    })

    it('should include descriptive titles for platforms', () => {
      const result = createStreamingIndicators(mockAvailability)

      expect(result).toContain('title="Paramount+ - subscription"')
      expect(result).toContain('title="Prime Video - rent - $3.99"')
    })
  })
})
