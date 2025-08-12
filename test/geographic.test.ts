import type {StreamingAvailability} from '../src/modules/types.js'
import {beforeEach, describe, expect, it} from 'vitest'
import {
  DEFAULT_LOCATION_PREFERENCES,
  filterAvailabilityByRegion,
  GEOGRAPHIC_REGIONS,
  getAvailablePlatforms,
  getCurrencySymbol,
  getRegionInfo,
  getRegionName,
  getRegionSpecificPlatform,
  getSupportedRegions,
  isPlatformAvailableInRegion,
  isValidRegion,
  sanitizeLocationPreferences,
  validateLocationPreferences,
} from '../src/utils/geographic.js'

describe('Geographic Availability Handling', () => {
  describe('Region Validation', () => {
    it('should validate supported regions correctly', () => {
      expect(isValidRegion('US')).toBe(true)
      expect(isValidRegion('CA')).toBe(true)
      expect(isValidRegion('UK')).toBe(true)
      expect(isValidRegion('FR')).toBe(false)
      expect(isValidRegion('INVALID')).toBe(false)
      expect(isValidRegion('')).toBe(false)
    })

    it('should return all supported regions', () => {
      const regions = getSupportedRegions()
      expect(regions).toEqual(['US', 'CA', 'UK'])
      expect(regions.length).toBe(3)
    })
  })

  describe('Region Information', () => {
    it('should return correct region information for US', () => {
      const regionInfo = getRegionInfo('US')
      expect(regionInfo.code).toBe('US')
      expect(regionInfo.name).toBe('United States')
      expect(regionInfo.currency).toBe('USD')
      expect(regionInfo.availablePlatforms).toContain('paramount-plus')
      expect(regionInfo.availablePlatforms).toContain('netflix')
      expect(regionInfo.availablePlatforms).toContain('hulu')
    })

    it('should return correct region information for Canada', () => {
      const regionInfo = getRegionInfo('CA')
      expect(regionInfo.code).toBe('CA')
      expect(regionInfo.name).toBe('Canada')
      expect(regionInfo.currency).toBe('CAD')
      expect(regionInfo.availablePlatforms).toContain('paramount-plus')
      expect(regionInfo.availablePlatforms).toContain('crave')
      expect(regionInfo.availablePlatforms).not.toContain('hulu') // Hulu not available in Canada
    })

    it('should return correct region information for UK', () => {
      const regionInfo = getRegionInfo('UK')
      expect(regionInfo.code).toBe('UK')
      expect(regionInfo.name).toBe('United Kingdom')
      expect(regionInfo.currency).toBe('GBP')
      expect(regionInfo.availablePlatforms).toContain('paramount-plus')
      expect(regionInfo.availablePlatforms).toContain('bbc-iplayer')
      expect(regionInfo.availablePlatforms).not.toContain('hulu') // Hulu not available in UK
    })

    it('should return human-readable region names', () => {
      expect(getRegionName('US')).toBe('United States')
      expect(getRegionName('CA')).toBe('Canada')
      expect(getRegionName('UK')).toBe('United Kingdom')
    })
  })

  describe('Platform Availability', () => {
    it('should return available platforms for each region', () => {
      const usPlatforms = getAvailablePlatforms('US')
      const caPlatforms = getAvailablePlatforms('CA')
      const ukPlatforms = getAvailablePlatforms('UK')

      expect(usPlatforms).toContain('hulu')
      expect(usPlatforms).toContain('peacock')
      expect(caPlatforms).not.toContain('hulu')
      expect(caPlatforms).toContain('crave')
      expect(ukPlatforms).toContain('bbc-iplayer')
      expect(ukPlatforms).not.toContain('hulu')
    })

    it('should check platform availability in regions correctly', () => {
      expect(isPlatformAvailableInRegion('paramount-plus', 'US')).toBe(true)
      expect(isPlatformAvailableInRegion('paramount-plus', 'CA')).toBe(true)
      expect(isPlatformAvailableInRegion('paramount-plus', 'UK')).toBe(true)

      expect(isPlatformAvailableInRegion('hulu', 'US')).toBe(true)
      expect(isPlatformAvailableInRegion('hulu', 'CA')).toBe(false)
      expect(isPlatformAvailableInRegion('hulu', 'UK')).toBe(false)

      expect(isPlatformAvailableInRegion('crave', 'CA')).toBe(true)
      expect(isPlatformAvailableInRegion('crave', 'US')).toBe(false)

      expect(isPlatformAvailableInRegion('bbc-iplayer', 'UK')).toBe(true)
      expect(isPlatformAvailableInRegion('bbc-iplayer', 'US')).toBe(false)
    })

    it('should return region-specific platform identifiers', () => {
      expect(getRegionSpecificPlatform('paramount-plus', 'US')).toBe('paramount_plus_us')
      expect(getRegionSpecificPlatform('paramount-plus', 'CA')).toBe('paramount_plus_ca')
      expect(getRegionSpecificPlatform('paramount-plus', 'UK')).toBe('paramount_plus_uk')

      expect(getRegionSpecificPlatform('netflix', 'US')).toBe('netflix_us')
      expect(getRegionSpecificPlatform('netflix', 'CA')).toBe('netflix_ca')

      // Should return original platform if no mapping exists
      expect(getRegionSpecificPlatform('unknown-platform', 'US')).toBe('unknown-platform')
    })
  })

  describe('Currency Handling', () => {
    it('should return correct currency symbols', () => {
      expect(getCurrencySymbol('US')).toBe('$')
      expect(getCurrencySymbol('CA')).toBe('C$')
      expect(getCurrencySymbol('UK')).toBe('£')
    })
  })

  describe('Availability Filtering', () => {
    let mockAvailability: StreamingAvailability[]

    beforeEach(() => {
      mockAvailability = [
        {
          contentId: 'tos_s1',
          contentType: 'series',
          platform: {
            id: 'paramount-plus',
            name: 'Paramount+',
            logo: 'logo.png',
            url: 'https://paramount.com',
            requiresSubscription: true,
            regions: ['US', 'CA', 'UK'],
          },
          url: 'https://paramount.com/tos',
          type: 'subscription',
          quality: ['HD'],
          regions: ['US', 'CA', 'UK'],
          lastUpdated: '2025-08-10T00:00:00Z',
          expiresAt: '2025-08-11T00:00:00Z',
        },
        {
          contentId: 'tos_s1',
          contentType: 'series',
          platform: {
            id: 'hulu',
            name: 'Hulu',
            logo: 'hulu.png',
            url: 'https://hulu.com',
            requiresSubscription: true,
            regions: ['US'],
          },
          url: 'https://hulu.com/tos',
          type: 'subscription',
          quality: ['HD'],
          regions: ['US'],
          lastUpdated: '2025-08-10T00:00:00Z',
          expiresAt: '2025-08-11T00:00:00Z',
        },
        {
          contentId: 'tos_s1',
          contentType: 'series',
          platform: {
            id: 'crave',
            name: 'Crave',
            logo: 'crave.png',
            url: 'https://crave.ca',
            requiresSubscription: true,
            regions: ['CA'],
          },
          url: 'https://crave.ca/tos',
          type: 'subscription',
          quality: ['HD'],
          regions: ['CA'],
          lastUpdated: '2025-08-10T00:00:00Z',
          expiresAt: '2025-08-11T00:00:00Z',
        },
        {
          contentId: 'tos_s1',
          contentType: 'series',
          platform: {
            id: 'bbc-iplayer',
            name: 'BBC iPlayer',
            logo: 'bbc.png',
            url: 'https://iplayer.tv',
            requiresSubscription: false,
            regions: ['UK'],
          },
          url: 'https://iplayer.tv/tos',
          type: 'free',
          quality: ['HD'],
          regions: ['UK'],
          lastUpdated: '2025-08-10T00:00:00Z',
          expiresAt: '2025-08-11T00:00:00Z',
        },
      ]
    })

    it('should filter availability by US region correctly', () => {
      const filtered = filterAvailabilityByRegion(mockAvailability, 'US')

      expect(filtered).toHaveLength(2) // Paramount+ and Hulu
      expect(filtered.map(item => item.platform.id)).toEqual(['paramount-plus', 'hulu'])
    })

    it('should filter availability by Canada region correctly', () => {
      const filtered = filterAvailabilityByRegion(mockAvailability, 'CA')

      expect(filtered).toHaveLength(2) // Paramount+ and Crave
      expect(filtered.map(item => item.platform.id)).toEqual(['paramount-plus', 'crave'])
    })

    it('should filter availability by UK region correctly', () => {
      const filtered = filterAvailabilityByRegion(mockAvailability, 'UK')

      expect(filtered).toHaveLength(2) // Paramount+ and BBC iPlayer
      expect(filtered.map(item => item.platform.id)).toEqual(['paramount-plus', 'bbc-iplayer'])
    })

    it('should handle empty availability array', () => {
      const filtered = filterAvailabilityByRegion([], 'US')
      expect(filtered).toEqual([])
    })

    it('should handle availability with ALL regions', () => {
      const globalAvailability: StreamingAvailability[] = [
        {
          contentId: 'tos_s1',
          contentType: 'series',
          platform: {
            id: 'paramount-plus',
            name: 'Paramount+',
            logo: 'logo.png',
            url: 'https://paramount.com',
            requiresSubscription: true,
            regions: ['ALL'],
          },
          url: 'https://paramount.com/tos',
          type: 'subscription',
          quality: ['HD'],
          regions: ['ALL'],
          lastUpdated: '2025-08-10T00:00:00Z',
          expiresAt: '2025-08-11T00:00:00Z',
        },
      ]

      const filtered = filterAvailabilityByRegion(globalAvailability, 'US')
      expect(filtered).toHaveLength(1)
    })
  })

  describe('Location Preferences', () => {
    it('should validate location preferences correctly', () => {
      const validPrefs = {
        region: 'US',
        allowAutoDetection: false,
        showOtherRegions: true,
        locale: 'en-US',
      }

      const invalidPrefs = {
        region: 'INVALID',
        allowAutoDetection: 'not-boolean',
        showOtherRegions: true,
      }

      expect(validateLocationPreferences(validPrefs)).toBe(true)
      expect(validateLocationPreferences(invalidPrefs)).toBe(false)
      expect(validateLocationPreferences(null)).toBe(false)
      expect(validateLocationPreferences(undefined)).toBe(false)
      expect(validateLocationPreferences({})).toBe(false)
    })

    it('should sanitize location preferences with defaults', () => {
      const incompletePrefs = {
        region: 'CA',
        allowAutoDetection: true,
        // missing showOtherRegions and locale
      }

      const sanitized = sanitizeLocationPreferences(incompletePrefs as any)

      expect(sanitized.region).toBe('CA')
      expect(sanitized.allowAutoDetection).toBe(true)
      expect(sanitized.showOtherRegions).toBe(DEFAULT_LOCATION_PREFERENCES.showOtherRegions)
      expect(sanitized.locale).toBe(DEFAULT_LOCATION_PREFERENCES.locale)
    })

    it('should use default region for invalid region codes', () => {
      const invalidRegionPrefs = {
        region: 'INVALID',
        allowAutoDetection: false,
        showOtherRegions: false,
      }

      const sanitized = sanitizeLocationPreferences(invalidRegionPrefs as any)
      expect(sanitized.region).toBe(DEFAULT_LOCATION_PREFERENCES.region)
    })

    it('should have correct default location preferences', () => {
      expect(DEFAULT_LOCATION_PREFERENCES.region).toBe('US')
      expect(DEFAULT_LOCATION_PREFERENCES.allowAutoDetection).toBe(false)
      expect(DEFAULT_LOCATION_PREFERENCES.showOtherRegions).toBe(false)
      expect(DEFAULT_LOCATION_PREFERENCES.locale).toBe('en-US')
    })
  })

  describe('Geographic Region Constants', () => {
    it('should have comprehensive platform mappings for each region', () => {
      const regions = Object.keys(GEOGRAPHIC_REGIONS)

      for (const region of regions) {
        const regionData = GEOGRAPHIC_REGIONS[region as keyof typeof GEOGRAPHIC_REGIONS]

        expect(regionData.code).toBe(region)
        expect(regionData.name).toBeTruthy()
        expect(regionData.currency).toBeTruthy()
        expect(Array.isArray(regionData.availablePlatforms)).toBe(true)
        expect(regionData.availablePlatforms.length).toBeGreaterThan(0)
        expect(typeof regionData.platformMapping).toBe('object')
      }
    })

    it('should have consistent platform mappings', () => {
      const commonPlatforms = [
        'paramount-plus',
        'netflix',
        'amazon-prime',
        'apple-tv-plus',
        'disney-plus',
      ]

      for (const platform of commonPlatforms) {
        expect(GEOGRAPHIC_REGIONS.US.availablePlatforms).toContain(platform)
        expect(GEOGRAPHIC_REGIONS.CA.availablePlatforms).toContain(platform)
        expect(GEOGRAPHIC_REGIONS.UK.availablePlatforms).toContain(platform)

        expect(GEOGRAPHIC_REGIONS.US.platformMapping[platform]).toBeDefined()
        expect(GEOGRAPHIC_REGIONS.CA.platformMapping[platform]).toBeDefined()
        expect(GEOGRAPHIC_REGIONS.UK.platformMapping[platform]).toBeDefined()
      }
    })

    it('should have region-specific platforms', () => {
      // US-specific platforms
      expect(GEOGRAPHIC_REGIONS.US.availablePlatforms).toContain('hulu')
      expect(GEOGRAPHIC_REGIONS.US.availablePlatforms).toContain('peacock')

      // Canada-specific platforms
      expect(GEOGRAPHIC_REGIONS.CA.availablePlatforms).toContain('crave')

      // UK-specific platforms
      expect(GEOGRAPHIC_REGIONS.UK.availablePlatforms).toContain('bbc-iplayer')
      expect(GEOGRAPHIC_REGIONS.UK.availablePlatforms).toContain('itv-hub')
      expect(GEOGRAPHIC_REGIONS.UK.availablePlatforms).toContain('all4')
    })
  })
})
