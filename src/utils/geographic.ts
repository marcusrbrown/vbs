import type {GeographicRegion, LocationPreferences, SupportedRegion} from '../modules/types.js'

/**
 * Geographic availability handling utilities for streaming services.
 * Provides region-specific platform mappings, validation, and filtering logic.
 */

/**
 * Supported geographic regions with comprehensive metadata.
 * Each region includes platform availability, currency, and region-specific identifiers.
 */
export const GEOGRAPHIC_REGIONS: Record<SupportedRegion, GeographicRegion> = {
  US: {
    code: 'US',
    name: 'United States',
    currency: 'USD',
    availablePlatforms: [
      'paramount-plus',
      'netflix',
      'amazon-prime',
      'hulu',
      'apple-tv-plus',
      'disney-plus',
      'hbo-max',
      'peacock',
      'tubi',
      'pluto-tv',
      'crackle',
    ],
    platformMapping: {
      'paramount-plus': 'paramount_plus_us',
      netflix: 'netflix_us',
      'amazon-prime': 'amazon_prime_us',
      hulu: 'hulu_us',
      'apple-tv-plus': 'apple_tv_plus_us',
      'disney-plus': 'disney_plus_us',
      'hbo-max': 'hbo_max_us',
      peacock: 'peacock_us',
      tubi: 'tubi_us',
      'pluto-tv': 'pluto_tv_us',
      crackle: 'crackle_us',
    },
  },
  CA: {
    code: 'CA',
    name: 'Canada',
    currency: 'CAD',
    availablePlatforms: [
      'paramount-plus',
      'netflix',
      'amazon-prime',
      'apple-tv-plus',
      'disney-plus',
      'crave',
      'tubi',
      'pluto-tv',
    ],
    platformMapping: {
      'paramount-plus': 'paramount_plus_ca',
      netflix: 'netflix_ca',
      'amazon-prime': 'amazon_prime_ca',
      'apple-tv-plus': 'apple_tv_plus_ca',
      'disney-plus': 'disney_plus_ca',
      crave: 'crave_ca',
      tubi: 'tubi_ca',
      'pluto-tv': 'pluto_tv_ca',
    },
  },
  UK: {
    code: 'UK',
    name: 'United Kingdom',
    currency: 'GBP',
    availablePlatforms: [
      'paramount-plus',
      'netflix',
      'amazon-prime',
      'apple-tv-plus',
      'disney-plus',
      'bbc-iplayer',
      'itv-hub',
      'all4',
      'sky-go',
    ],
    platformMapping: {
      'paramount-plus': 'paramount_plus_uk',
      netflix: 'netflix_uk',
      'amazon-prime': 'amazon_prime_uk',
      'apple-tv-plus': 'apple_tv_plus_uk',
      'disney-plus': 'disney_plus_uk',
      'bbc-iplayer': 'bbc_iplayer_uk',
      'itv-hub': 'itv_hub_uk',
      all4: 'all4_uk',
      'sky-go': 'sky_go_uk',
    },
  },
}

/**
 * Default location preferences for new users.
 * Defaults to US region with manual region selection.
 */
export const DEFAULT_LOCATION_PREFERENCES: LocationPreferences = {
  region: 'US',
  allowAutoDetection: false,
  showOtherRegions: false,
  locale: 'en-US',
}

/**
 * Validate if a region code is supported.
 * @param region Region code to validate
 * @returns True if region is supported
 */
export const isValidRegion = (region: string): region is SupportedRegion => {
  return region in GEOGRAPHIC_REGIONS
}

/**
 * Get geographic region information by code.
 * @param region Region code
 * @returns GeographicRegion object or null if not found
 */
export const getRegionInfo = (region: SupportedRegion): GeographicRegion => {
  return GEOGRAPHIC_REGIONS[region]
}

/**
 * Get available streaming platforms for a specific region.
 * @param region Region code
 * @returns Array of platform identifiers available in the region
 */
export const getAvailablePlatforms = (region: SupportedRegion): string[] => {
  return GEOGRAPHIC_REGIONS[region].availablePlatforms
}

/**
 * Get region-specific platform identifier for API calls.
 * @param platform Generic platform identifier
 * @param region Target region
 * @returns Region-specific platform identifier or original if no mapping exists
 */
export const getRegionSpecificPlatform = (platform: string, region: SupportedRegion): string => {
  const regionInfo = GEOGRAPHIC_REGIONS[region]
  return regionInfo.platformMapping[platform] || platform
}

/**
 * Filter streaming availability by region.
 * Removes platforms not available in the specified region.
 * @param availability Array of streaming availability data
 * @param region Target region for filtering
 * @returns Filtered availability array
 */
export const filterAvailabilityByRegion = <T extends {platform: {id: string}; regions: string[]}>(
  availability: T[],
  region: SupportedRegion,
): T[] => {
  const availablePlatforms = getAvailablePlatforms(region)

  return availability.filter(item => {
    // Check if platform is available in the region
    const platformAvailable = availablePlatforms.includes(item.platform.id)

    // Check if content is specifically available in this region
    const regionAvailable = item.regions.includes(region) || item.regions.includes('ALL')

    return platformAvailable && regionAvailable
  })
}

/**
 * Get currency symbol for a region.
 * @param region Region code
 * @returns Currency symbol string
 */
export const getCurrencySymbol = (region: SupportedRegion): string => {
  const currencySymbols: Record<string, string> = {
    USD: '$',
    CAD: 'C$',
    GBP: '£',
  }

  const currency = GEOGRAPHIC_REGIONS[region].currency
  return currencySymbols[currency] || currency
}

/**
 * Validate location preferences data structure.
 * @param data Unknown data to validate
 * @returns True if data is valid LocationPreferences
 */
export const validateLocationPreferences = (data: unknown): data is LocationPreferences => {
  if (!data || typeof data !== 'object') return false

  const prefs = data as Record<string, unknown>

  return (
    typeof prefs.region === 'string' &&
    isValidRegion(prefs.region) &&
    typeof prefs.allowAutoDetection === 'boolean' &&
    typeof prefs.showOtherRegions === 'boolean'
  )
}

/**
 * Sanitize location preferences with defaults.
 * @param prefs Location preferences to sanitize
 * @returns Sanitized location preferences
 */
export const sanitizeLocationPreferences = (prefs: LocationPreferences): LocationPreferences => {
  return {
    ...DEFAULT_LOCATION_PREFERENCES,
    ...prefs,
    region: isValidRegion(prefs.region) ? prefs.region : DEFAULT_LOCATION_PREFERENCES.region,
  }
}

/**
 * Get human-readable region name.
 * @param region Region code
 * @returns Human-readable region name
 */
export const getRegionName = (region: SupportedRegion): string => {
  return GEOGRAPHIC_REGIONS[region].name
}

/**
 * Get all supported regions as an array.
 * @returns Array of supported region codes
 */
export const getSupportedRegions = (): SupportedRegion[] => {
  return Object.keys(GEOGRAPHIC_REGIONS) as SupportedRegion[]
}

/**
 * Check if a platform is available in a specific region.
 * @param platform Platform identifier
 * @param region Region code
 * @returns True if platform is available in the region
 */
export const isPlatformAvailableInRegion = (platform: string, region: SupportedRegion): boolean => {
  return getAvailablePlatforms(region).includes(platform)
}
