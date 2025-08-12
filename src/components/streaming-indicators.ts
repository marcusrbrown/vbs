import type {
  StreamingApiInstance,
  StreamingAvailability,
  StreamingPlatform,
} from '../modules/types.js'

/**
 * Affiliate tracking configuration for deep links
 */
export interface AffiliateConfig {
  /** Enable affiliate tracking */
  enabled: boolean
  /** Affiliate tracking ID or partner code */
  affiliateId?: string
  /** UTM campaign parameters for analytics */
  utmCampaign?: string
  /** UTM source identifier */
  utmSource?: string
  /** UTM medium identifier */
  utmMedium?: string
  /** Custom tracking parameters per platform */
  customParams?: Record<string, Record<string, string>>
}

/**
 * Configuration options for streaming indicators display
 */
export interface StreamingIndicatorConfig {
  /** Maximum number of platforms to display before showing "+" indicator */
  maxPlatforms: number
  /** Whether to show pricing information */
  showPricing: boolean
  /** Whether to show quality badges (HD, 4K, etc.) */
  showQuality: boolean
  /** Whether to show direct links to platforms */
  showLinks: boolean
  /** Size variant for the indicators */
  size: 'small' | 'medium' | 'large'
  /** Layout orientation */
  layout: 'horizontal' | 'vertical'
  /** Whether to show platform icons */
  showIcons: boolean
  /** Affiliate tracking configuration */
  affiliateTracking?: AffiliateConfig
}

/**
 * Default configuration for streaming indicators
 */
const DEFAULT_CONFIG: StreamingIndicatorConfig = {
  maxPlatforms: 3,
  showPricing: true,
  showQuality: true,
  showLinks: true,
  size: 'medium',
  layout: 'horizontal',
  showIcons: true,
  affiliateTracking: {
    enabled: false,
    utmSource: 'vbs-viewing-guide',
    utmMedium: 'referral',
    utmCampaign: 'star-trek-streaming',
  },
}

/**
 * Platform information for rendering indicators
 */
interface PlatformInfo {
  id: string
  name: string
  icon: string
  color: string
  domain: string
}

/**
 * Known streaming platforms with their display information
 */
const PLATFORM_INFO: Record<string, PlatformInfo> = {
  'paramount-plus': {
    id: 'paramount-plus',
    name: 'Paramount+',
    icon: '🌟',
    color: '#0066CC',
    domain: 'paramountplus.com',
  },
  netflix: {
    id: 'netflix',
    name: 'Netflix',
    icon: '🔴',
    color: '#E50914',
    domain: 'netflix.com',
  },
  'amazon-prime': {
    id: 'amazon-prime',
    name: 'Prime Video',
    icon: '📦',
    color: '#00A8E1',
    domain: 'amazon.com',
  },
  hulu: {
    id: 'hulu',
    name: 'Hulu',
    icon: '🟢',
    color: '#1CE783',
    domain: 'hulu.com',
  },
  'apple-tv': {
    id: 'apple-tv',
    name: 'Apple TV+',
    icon: '🍎',
    color: '#000000',
    domain: 'tv.apple.com',
  },
  peacock: {
    id: 'peacock',
    name: 'Peacock',
    icon: '🦚',
    color: '#004225',
    domain: 'peacocktv.com',
  },
  'disney-plus': {
    id: 'disney-plus',
    name: 'Disney+',
    icon: '🏰',
    color: '#113CCF',
    domain: 'disneyplus.com',
  },
  'hbo-max': {
    id: 'hbo-max',
    name: 'Max',
    icon: '🎭',
    color: '#8B5BF6',
    domain: 'max.com',
  },
}

/**
 * Get platform information by platform ID, with fallback for unknown platforms
 */
const getPlatformInfo = (platform: StreamingPlatform): PlatformInfo => {
  const platformId = platform.id
  return (
    PLATFORM_INFO[platformId] || {
      id: platformId,
      name: platform.name || platformId.charAt(0).toUpperCase() + platformId.slice(1),
      icon: '📺',
      color: '#666666',
      domain: platform.url || '',
    }
  )
}

/**
 * Format price information for display
 */
const formatPrice = (price: {amount: number; currency: string}): string => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: price.currency,
  })
  return formatter.format(price.amount)
}

/**
 * Generate affiliate tracking URL with UTM parameters and custom tracking
 */
const generateAffiliateUrl = (
  originalUrl: string,
  platformId: string,
  config: AffiliateConfig,
): string => {
  if (!config.enabled || !originalUrl) {
    return originalUrl
  }

  try {
    const url = new URL(originalUrl)

    // Add UTM parameters for analytics
    if (config.utmSource) {
      url.searchParams.set('utm_source', config.utmSource)
    }
    if (config.utmMedium) {
      url.searchParams.set('utm_medium', config.utmMedium)
    }
    if (config.utmCampaign) {
      url.searchParams.set('utm_campaign', config.utmCampaign)
    }

    // Add affiliate ID if provided
    if (config.affiliateId) {
      // Platform-specific affiliate parameter mapping
      const affiliateParamMap: Record<string, string> = {
        'paramount-plus': 'ref',
        netflix: 'trackId',
        'amazon-prime': 'tag',
        hulu: 'affiliateId',
        'disney-plus': 'cid',
        'hbo-max': 'pid',
      }

      const affiliateParam = affiliateParamMap[platformId] || 'ref'
      url.searchParams.set(affiliateParam, config.affiliateId)
    }

    // Add custom platform-specific parameters
    if (config.customParams?.[platformId]) {
      for (const [key, value] of Object.entries(config.customParams[platformId])) {
        url.searchParams.set(key, value)
      }
    }

    return url.toString()
  } catch (error) {
    console.warn(`Failed to generate affiliate URL for ${platformId}:`, error)
    return originalUrl
  }
}

/**
 * Create a streaming availability indicator for a single platform
 */
const createPlatformIndicator = (
  availability: StreamingAvailability,
  config: StreamingIndicatorConfig,
): string => {
  const platform = getPlatformInfo(availability.platform)
  const hasPrice = availability.price && config.showPricing
  const hasQuality = availability.quality.length > 0 && config.showQuality
  const hasLink = availability.url && config.showLinks

  // Generate affiliate tracking URL if enabled
  const finalUrl =
    hasLink && config.affiliateTracking?.enabled && availability.url
      ? generateAffiliateUrl(availability.url, platform.id, config.affiliateTracking)
      : availability.url

  const iconHtml = config.showIcons ? `<span class="platform-icon">${platform.icon}</span>` : ''

  const priceHtml =
    hasPrice && availability.price
      ? `<span class="platform-price">${formatPrice(availability.price)}</span>`
      : ''

  const qualityHtml = hasQuality
    ? `<span class="platform-quality">${availability.quality[0]}</span>`
    : ''

  const typeClass = `type-${availability.type}`
  const sizeClass = `size-${config.size}`

  const content = `
    ${iconHtml}
    <span class="platform-name">${platform.name}</span>
    ${priceHtml}
    ${qualityHtml}
  `

  if (hasLink && finalUrl) {
    return `
      <a href="${finalUrl}"
         class="streaming-platform-indicator ${typeClass} ${sizeClass}"
         target="_blank"
         rel="noopener noreferrer"
         title="${platform.name} - ${availability.type}${hasPrice && availability.price ? ` - ${formatPrice(availability.price)}` : ''}"
         style="--platform-color: ${platform.color}"
         data-platform="${platform.id}"
         data-tracking-enabled="${config.affiliateTracking?.enabled || false}">
        ${content}
      </a>
    `
  } else {
    return `
      <div class="streaming-platform-indicator ${typeClass} ${sizeClass}"
           title="${platform.name} - ${availability.type}${hasPrice && availability.price ? ` - ${formatPrice(availability.price)}` : ''}"
           style="--platform-color: ${platform.color}"
           data-platform="${platform.id}">
        ${content}
      </div>
    `
  }
}

/**
 * Create streaming availability indicators for multiple platforms
 */
export const createStreamingIndicators = (
  availability: StreamingAvailability[],
  config: Partial<StreamingIndicatorConfig> = {},
): string => {
  const mergedConfig = {...DEFAULT_CONFIG, ...config}

  if (availability.length === 0) {
    return '<div class="streaming-indicators-empty" title="Not available on any tracked platforms">No streaming</div>'
  }

  // Sort by availability type priority: subscription > free > rent > buy
  const typePriority = {subscription: 0, free: 1, rent: 2, buy: 3}
  const sortedAvailability = [...availability].sort((a, b) => {
    const priorityA = typePriority[a.type] ?? 4
    const priorityB = typePriority[b.type] ?? 4
    return priorityA - priorityB
  })

  const visiblePlatforms = sortedAvailability.slice(0, mergedConfig.maxPlatforms)
  const remainingCount = sortedAvailability.length - mergedConfig.maxPlatforms

  const layoutClass = `layout-${mergedConfig.layout}`
  const sizeClass = `size-${mergedConfig.size}`

  const platformsHtml = visiblePlatforms
    .map(availability => createPlatformIndicator(availability, mergedConfig))
    .join('')

  const moreIndicator =
    remainingCount > 0
      ? `<div class="streaming-more-indicator" title="${remainingCount} more platforms available">+${remainingCount}</div>`
      : ''

  return `
    <div class="streaming-indicators-container ${layoutClass} ${sizeClass}">
      ${platformsHtml}
      ${moreIndicator}
    </div>
  `
}

/**
 * Create streaming indicators asynchronously by fetching availability data
 */
export const createStreamingIndicatorsAsync = async (
  contentId: string,
  streamingApi: StreamingApiInstance,
  config: Partial<StreamingIndicatorConfig> = {},
): Promise<string> => {
  try {
    // Try to get cached availability first for better performance
    const cachedAvailability = await streamingApi.getCachedAvailability(contentId)

    if (cachedAvailability && cachedAvailability.length > 0) {
      return createStreamingIndicators(cachedAvailability, config)
    }

    // If no cached data, fetch fresh data
    const availability = await streamingApi.getAvailability(contentId)
    return createStreamingIndicators(availability, config)
  } catch (error) {
    console.warn(`Failed to fetch streaming availability for ${contentId}:`, error)
    return '<div class="streaming-indicators-error" title="Unable to load streaming availability">Unavailable</div>'
  }
}

/**
 * Create a batch of streaming indicators for multiple content items
 */
export const createBatchStreamingIndicators = async (
  contentIds: string[],
  streamingApi: StreamingApiInstance,
  config: Partial<StreamingIndicatorConfig> = {},
): Promise<Map<string, string>> => {
  try {
    const batchAvailability = await streamingApi.getBatchAvailability(contentIds)
    const indicators = new Map<string, string>()

    for (const [contentId, availability] of batchAvailability) {
      indicators.set(contentId, createStreamingIndicators(availability, config))
    }

    return indicators
  } catch (error) {
    console.warn('Failed to fetch batch streaming availability:', error)

    // Return error indicators for all requested content
    const errorIndicators = new Map<string, string>()
    for (const contentId of contentIds) {
      errorIndicators.set(
        contentId,
        '<div class="streaming-indicators-error" title="Unable to load streaming availability">Unavailable</div>',
      )
    }
    return errorIndicators
  }
}

/**
 * Update streaming indicators in the DOM for a specific content item
 */
export const updateStreamingIndicators = async (
  contentId: string,
  streamingApi: StreamingApiInstance,
  config: Partial<StreamingIndicatorConfig> = {},
): Promise<void> => {
  const indicatorElements = document.querySelectorAll(`[data-streaming-content-id="${contentId}"]`)

  if (indicatorElements.length === 0) {
    return
  }

  try {
    const indicatorHtml = await createStreamingIndicatorsAsync(contentId, streamingApi, config)

    indicatorElements.forEach(element => {
      element.innerHTML = indicatorHtml
    })
  } catch (error) {
    console.warn(`Failed to update streaming indicators for ${contentId}:`, error)

    const errorHtml = '<div class="streaming-indicators-error">Error loading</div>'
    indicatorElements.forEach(element => {
      element.innerHTML = errorHtml
    })
  }
}

/**
 * Enable affiliate tracking for streaming indicators
 *
 * @param affiliateId - Affiliate ID or partner code for tracking
 * @param customParams - Custom tracking parameters per platform
 * @returns Affiliate configuration object
 */
export const enableAffiliateTracking = (
  affiliateId: string,
  customParams?: Record<string, Record<string, string>>,
): AffiliateConfig => {
  const config: AffiliateConfig = {
    enabled: true,
    affiliateId,
    utmSource: 'vbs-viewing-guide',
    utmMedium: 'referral',
    utmCampaign: 'star-trek-streaming',
  }

  if (customParams) {
    config.customParams = customParams
  }

  return config
}

/**
 * Create affiliate configuration for specific platform partnerships
 *
 * @param platformConfigs - Platform-specific affiliate configurations
 * @returns Comprehensive affiliate configuration
 */
export const createPlatformAffiliateConfig = (
  platformConfigs: Record<string, {affiliateId: string; customParams?: Record<string, string>}>,
): AffiliateConfig => {
  const customParams: Record<string, Record<string, string>> = {}
  let primaryAffiliateId = ''

  for (const [platformId, config] of Object.entries(platformConfigs)) {
    if (config.customParams) {
      customParams[platformId] = config.customParams
    }
    if (!primaryAffiliateId) {
      primaryAffiliateId = config.affiliateId
    }
  }

  return {
    enabled: true,
    affiliateId: primaryAffiliateId,
    utmSource: 'vbs-viewing-guide',
    utmMedium: 'referral',
    utmCampaign: 'star-trek-streaming',
    customParams,
  }
}
