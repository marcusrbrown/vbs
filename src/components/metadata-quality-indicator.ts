import type {
  EpisodeMetadata,
  EpisodeQualityIndicator,
  MetadataCompletenessLevel,
  MetadataFreshnessState,
  MetadataQualityIndicatorConfig,
  MetadataQualityIndicatorEvents,
  MetadataQualityIndicatorInstance,
  MetadataSourceType,
} from '../modules/types.js'
import {createEventEmitter} from '../modules/events.js'

const COMPLETENESS_LABELS: Record<MetadataCompletenessLevel, string> = {
  none: 'No Data',
  basic: 'Basic',
  detailed: 'Detailed',
  comprehensive: 'Complete',
}

const COMPLETENESS_ICONS: Record<MetadataCompletenessLevel, string> = {
  none: '○',
  basic: '◔',
  detailed: '◑',
  comprehensive: '●',
}

const COMPLETENESS_SCORES: Record<MetadataCompletenessLevel, number> = {
  none: 0,
  basic: 35,
  detailed: 70,
  comprehensive: 100,
}

const FRESHNESS_LABELS: Record<MetadataFreshnessState, string> = {
  fresh: 'Fresh',
  stale: 'Stale',
  outdated: 'Outdated',
}

const FRESHNESS_ICONS: Record<MetadataFreshnessState, string> = {
  fresh: '✓',
  stale: '⚠',
  outdated: '✗',
}

// Freshness thresholds in days
const FRESHNESS_FRESH_DAYS = 7
const FRESHNESS_STALE_DAYS = 30

// Validated field count thresholds for quality levels
const COMPREHENSIVE_FIELD_THRESHOLD = 8
const DETAILED_FIELD_THRESHOLD = 4

/**
 * Creates a metadata quality indicator component for episode lists.
 * Displays visual badges showing metadata completeness and freshness.
 * Follows VBS functional factory pattern with closure-based state management.
 *
 * Features:
 * - Visual completeness badges (none/basic/detailed/comprehensive)
 * - Freshness indicators (fresh/stale/outdated)
 * - Interactive tooltips with quality details
 * - Real-time enrichment status
 * - Accessible with ARIA labels and semantic HTML
 * - Theme integration with CSS custom properties
 *
 * @param config - Configuration including episodeId and optional metadata
 * @returns MetadataQualityIndicatorInstance with rendering and update methods
 *
 * @example
 * ```typescript
 * const indicator = createMetadataQualityIndicator({
 *   episodeId: 'tos_s1_e01',
 *   metadata: episodeMetadata,
 *   displayMode: 'badge',
 *   interactive: true
 * })
 *
 * const html = indicator.renderHTML()
 * indicator.on('indicator-clicked', ({ episodeId }) => {
 *   showMetadataDetails(episodeId)
 * })
 * ```
 */
export const createMetadataQualityIndicator = (
  config: MetadataQualityIndicatorConfig,
): MetadataQualityIndicatorInstance => {
  let currentMetadata: EpisodeMetadata | null = config.metadata ?? null
  let isEnriching = false
  const displayMode = config.displayMode ?? 'badge'
  const showTooltips = config.showTooltips ?? true
  const interactive = config.interactive ?? false

  const eventEmitter = createEventEmitter<MetadataQualityIndicatorEvents>()

  const calculateCompleteness = (metadata: EpisodeMetadata | null): MetadataCompletenessLevel => {
    if (!metadata) return 'none'

    if (metadata.enrichmentStatus === 'pending') return 'none'
    if (metadata.enrichmentStatus === 'failed') return 'none'

    let validatedFieldCount = 0
    if (metadata.fieldValidation) {
      validatedFieldCount = Object.values(metadata.fieldValidation).filter(
        validation => validation.isValid,
      ).length
    }

    if (metadata.enrichmentStatus === 'complete' && metadata.isValidated) {
      return validatedFieldCount >= COMPREHENSIVE_FIELD_THRESHOLD ? 'comprehensive' : 'detailed'
    }

    if (metadata.enrichmentStatus === 'partial') {
      return validatedFieldCount >= DETAILED_FIELD_THRESHOLD ? 'detailed' : 'basic'
    }

    return 'basic'
  }

  const calculateFreshness = (metadata: EpisodeMetadata | null): MetadataFreshnessState => {
    if (!metadata || !metadata.lastUpdated) return 'outdated'

    const now = Date.now()
    const lastUpdate = new Date(metadata.lastUpdated).getTime()
    const ageInDays = (now - lastUpdate) / (1000 * 60 * 60 * 24)

    if (ageInDays <= FRESHNESS_FRESH_DAYS) return 'fresh'
    if (ageInDays <= FRESHNESS_STALE_DAYS) return 'stale'
    return 'outdated'
  }

  const calculateCompletenessScore = (metadata: EpisodeMetadata | null): number => {
    if (!metadata) return 0
    return COMPLETENESS_SCORES[calculateCompleteness(metadata)]
  }

  const extractAvailableSources = (metadata: EpisodeMetadata | null): MetadataSourceType[] => {
    if (!metadata) return []

    const sources: MetadataSourceType[] = [metadata.dataSource]

    if (metadata.fieldValidation) {
      Object.values(metadata.fieldValidation).forEach(validation => {
        if (!sources.includes(validation.source)) {
          sources.push(validation.source)
        }
      })
    }

    return sources
  }

  const getIndicator = (): EpisodeQualityIndicator => {
    const completeness = calculateCompleteness(currentMetadata)
    const freshness = calculateFreshness(currentMetadata)

    return {
      episodeId: config.episodeId,
      completeness,
      freshness,
      completenessScore: calculateCompletenessScore(currentMetadata),
      confidenceScore: currentMetadata ? Math.round(currentMetadata.confidenceScore * 100) : 0,
      lastUpdated: currentMetadata?.lastUpdated ?? null,
      isEnriching,
      availableSources: extractAvailableSources(currentMetadata),
    }
  }

  const renderCompletenessBadge = (indicator: EpisodeQualityIndicator): string => {
    const {completeness, completenessScore} = indicator
    const label = COMPLETENESS_LABELS[completeness]
    const icon = COMPLETENESS_ICONS[completeness]

    return `
      <span class="metadata-quality-badge metadata-quality-badge--completeness metadata-quality-badge--${completeness}"
            role="status"
            aria-label="Metadata completeness: ${label} (${completenessScore}%)"
            ${showTooltips ? `title="Completeness: ${label} (${completenessScore}%)"` : ''}>
        <span class="metadata-quality-badge__icon" aria-hidden="true">${icon}</span>
        ${displayMode === 'detailed' ? `<span class="metadata-quality-badge__label">${label}</span>` : ''}
      </span>
    `
  }

  const renderFreshnessBadge = (indicator: EpisodeQualityIndicator): string => {
    const {freshness, lastUpdated} = indicator
    const label = FRESHNESS_LABELS[freshness]
    const icon = FRESHNESS_ICONS[freshness]

    const formattedDate = lastUpdated
      ? new Date(lastUpdated).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : 'Never'

    return `
      <span class="metadata-quality-badge metadata-quality-badge--freshness metadata-quality-badge--${freshness}"
            role="status"
            aria-label="Metadata freshness: ${label}, last updated ${formattedDate}"
            ${showTooltips ? `title="Last updated: ${formattedDate}"` : ''}>
        <span class="metadata-quality-badge__icon" aria-hidden="true">${icon}</span>
        ${displayMode === 'detailed' ? `<span class="metadata-quality-badge__label">${label}</span>` : ''}
      </span>
    `
  }

  const renderEnrichmentStatus = (): string => {
    if (!isEnriching) return ''

    return `
      <span class="metadata-quality-badge metadata-quality-badge--enriching"
            role="status"
            aria-label="Metadata enrichment in progress"
            ${showTooltips ? 'title="Updating metadata..."' : ''}>
        <span class="metadata-quality-badge__spinner" aria-hidden="true">⟳</span>
        ${displayMode === 'detailed' ? '<span class="metadata-quality-badge__label">Updating...</span>' : ''}
      </span>
    `
  }

  const renderHTML = (): string => {
    const indicator = getIndicator()

    const containerClass = `metadata-quality-indicator metadata-quality-indicator--${displayMode}${
      interactive ? ' metadata-quality-indicator--interactive' : ''
    }`

    return `
      <div class="${containerClass}"
           data-episode-id="${config.episodeId}"
           ${interactive ? 'role="button" tabindex="0"' : ''}
           ${interactive ? `aria-label="View metadata quality details for episode ${config.episodeId}"` : ''}>
        ${renderCompletenessBadge(indicator)}
        ${renderFreshnessBadge(indicator)}
        ${renderEnrichmentStatus()}
      </div>
    `
  }

  const update = (metadata: EpisodeMetadata): void => {
    currentMetadata = metadata
    const indicator = getIndicator()

    eventEmitter.emit('quality-updated', {
      episodeId: config.episodeId,
      indicator,
    })
  }

  const setEnrichmentStatus = (enriching: boolean): void => {
    if (isEnriching === enriching) return

    isEnriching = enriching
    eventEmitter.emit('enrichment-status-changed', {
      episodeId: config.episodeId,
      isEnriching: enriching,
    })
  }

  const destroy = (): void => {
    eventEmitter.removeAllListeners()
    currentMetadata = null
  }

  // Return public API
  return {
    renderHTML,
    update,
    setEnrichmentStatus,
    getIndicator,
    destroy,
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    once: eventEmitter.once.bind(eventEmitter),
    removeAllListeners: eventEmitter.removeAllListeners.bind(eventEmitter),
  }
}
