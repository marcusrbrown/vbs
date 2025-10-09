import type {
  EpisodeMetadata,
  MetadataSourceAttributionConfig,
  MetadataSourceAttributionEvents,
  MetadataSourceAttributionInstance,
  MetadataSourceType,
} from '../modules/types.js'
import {createEventEmitter} from '../modules/events.js'

/**
 * Create a metadata source attribution component instance.
 * Factory function following VBS functional factory architecture pattern.
 *
 * Displays metadata source attribution and confidence scores in episode detail views,
 * showing which data sources provided the episode information and how reliable it is.
 *
 * @param config - Configuration for the metadata source attribution component
 * @returns Metadata source attribution instance with full API
 *
 * @example
 * ```typescript
 * const attribution = createMetadataSourceAttribution({
 *   episodeId: 'tos_s1_e1',
 *   metadata: episodeMetadata,
 *   displayMode: 'detailed',
 *   showFieldAttribution: true,
 * })
 *
 * const html = attribution.renderHTML()
 * container.innerHTML = html
 *
 * attribution.on('attribution-clicked', ({source}) => {
 *   console.log(`User clicked source: ${source}`)
 * })
 * ```
 */
export const createMetadataSourceAttribution = (
  config: MetadataSourceAttributionConfig,
): MetadataSourceAttributionInstance => {
  const {
    episodeId,
    metadata: initialMetadata,
    displayMode = 'compact',
    showFieldAttribution = false,
    showConflicts = false,
    interactive = false,
  } = config

  // Private state managed via closure variables
  let currentMetadata: EpisodeMetadata | undefined = initialMetadata

  // Generic EventEmitter for type-safe event handling
  const eventEmitter = createEventEmitter<MetadataSourceAttributionEvents>()

  // Confidence score thresholds based on metadata quality assessment
  // High (>80%): Reliable data from authoritative sources with cross-validation
  // Medium (50-80%): Data from secondary sources or partial validation
  // Low (<50%): Unverified data or sources with known quality issues
  const CONFIDENCE_HIGH_THRESHOLD = 0.8
  const CONFIDENCE_MEDIUM_THRESHOLD = 0.5

  // Approximate time boundaries for human-readable relative dates
  // Used for UI display only - not precise calendar calculations
  const DAYS_PER_WEEK = 7
  const DAYS_PER_MONTH = 30 // Approximation for UI purposes
  const DAYS_PER_YEAR = 365 // Approximation - doesn't account for leap years

  const formatSourceName = (source: MetadataSourceType): string => {
    const sourceNames: Record<MetadataSourceType, string> = {
      'memory-alpha': 'Memory Alpha',
      tmdb: 'The Movie Database',
      imdb: 'IMDb',
      manual: 'Manual Entry',
      trekcore: 'TrekCore',
      stapi: 'Star Trek API',
      'startrek-com': 'StarTrek.com',
    }
    return sourceNames[source] || source
  }

  const formatConfidenceScore = (score: number): string => {
    return `${Math.round(score * 100)}%`
  }

  const getConfidenceLevel = (score: number): 'high' | 'medium' | 'low' => {
    if (score >= CONFIDENCE_HIGH_THRESHOLD) return 'high'
    if (score >= CONFIDENCE_MEDIUM_THRESHOLD) return 'medium'
    return 'low'
  }

  const formatTimestamp = (isoString: string): string => {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < DAYS_PER_WEEK) return `${diffDays} days ago`
    if (diffDays < DAYS_PER_MONTH) return `${Math.floor(diffDays / DAYS_PER_WEEK)} weeks ago`
    if (diffDays < DAYS_PER_YEAR) return `${Math.floor(diffDays / DAYS_PER_MONTH)} months ago`
    return `${Math.floor(diffDays / DAYS_PER_YEAR)} years ago`
  }

  // Group fields by their data source for organized display
  const renderFieldAttribution = (): string => {
    if (!currentMetadata?.fieldValidation || !showFieldAttribution) {
      return ''
    }

    const fields = Object.entries(currentMetadata.fieldValidation)
    if (fields.length === 0) {
      return ''
    }

    const fieldsBySource: Record<string, string[]> = {}
    for (const [fieldName, validation] of fields) {
      const source = formatSourceName(validation.source)
      if (!fieldsBySource[source]) {
        fieldsBySource[source] = []
      }
      fieldsBySource[source].push(fieldName)
    }

    const fieldAttributionHTML = Object.entries(fieldsBySource)
      .map(
        ([source, fieldNames]) => `
          <div class="field-attribution-item">
            <span class="field-attribution-source">${source}:</span>
            <span class="field-attribution-fields">${fieldNames.join(', ')}</span>
          </div>
        `,
      )
      .join('')

    return `
      <div class="field-attribution-section">
        <h6 class="attribution-subsection-title">Field Sources</h6>
        <div class="field-attribution-list">
          ${fieldAttributionHTML}
        </div>
      </div>
    `
  }

  const renderConflicts = (): string => {
    if (!currentMetadata?.conflictResolution || !showConflicts) {
      return ''
    }

    const conflicts = currentMetadata.conflictResolution
    if (conflicts.length === 0) {
      return ''
    }

    const conflictsHTML = conflicts
      .map(
        conflict => `
          <div class="conflict-item">
            <div class="conflict-field">${conflict.fieldName}</div>
            <div class="conflict-details">
              <span class="conflict-strategy">${conflict.strategy.replaceAll('-', ' ')}</span>
              <span class="conflict-count">${conflict.conflicts.length} sources</span>
            </div>
          </div>
        `,
      )
      .join('')

    return `
      <div class="conflicts-section">
        <h6 class="attribution-subsection-title">Conflict Resolution</h6>
        <div class="conflicts-list">
          ${conflictsHTML}
        </div>
      </div>
    `
  }

  const renderCompact = (): string => {
    if (!currentMetadata) {
      return `
        <div class="metadata-source-attribution metadata-source-attribution--compact metadata-source-attribution--no-data">
          <span class="attribution-no-data">No metadata source information available</span>
        </div>
      `
    }

    const sourceName = formatSourceName(currentMetadata.dataSource)
    const confidenceScore = formatConfidenceScore(currentMetadata.confidenceScore)
    const confidenceLevel = getConfidenceLevel(currentMetadata.confidenceScore)
    const lastUpdated = formatTimestamp(currentMetadata.lastUpdated)

    const interactiveAttr = interactive ? 'role="button" tabindex="0"' : ''
    const ariaLabel = interactive
      ? `View detailed attribution for ${sourceName}`
      : `Metadata from ${sourceName} with ${confidenceScore} confidence`

    return `
      <div class="metadata-source-attribution metadata-source-attribution--compact ${interactive ? 'metadata-source-attribution--interactive' : ''}"
           data-episode-id="${episodeId}"
           ${interactiveAttr}
           aria-label="${ariaLabel}">
        <span class="attribution-source">${sourceName}</span>
        <span class="attribution-confidence attribution-confidence--${confidenceLevel}"
              title="Confidence: ${confidenceScore}"
              aria-label="Confidence score: ${confidenceScore}">
          ${confidenceScore}
        </span>
        <span class="attribution-updated" title="Last updated ${lastUpdated}">
          ${lastUpdated}
        </span>
      </div>
    `
  }

  const renderDetailed = (): string => {
    if (!currentMetadata) {
      return `
        <div class="metadata-source-attribution metadata-source-attribution--detailed metadata-source-attribution--no-data">
          <div class="attribution-header">
            <h6 class="attribution-title">Metadata Sources</h6>
          </div>
          <p class="attribution-no-data">No metadata source information available for this episode.</p>
        </div>
      `
    }

    const sourceName = formatSourceName(currentMetadata.dataSource)
    const confidenceScore = formatConfidenceScore(currentMetadata.confidenceScore)
    const confidenceLevel = getConfidenceLevel(currentMetadata.confidenceScore)
    const lastUpdated = formatTimestamp(currentMetadata.lastUpdated)
    const validationStatus = currentMetadata.isValidated ? 'Validated' : 'Unvalidated'
    const enrichmentStatus = currentMetadata.enrichmentStatus

    const fieldAttributionHTML = renderFieldAttribution()
    const conflictsHTML = renderConflicts()

    return `
      <div class="metadata-source-attribution metadata-source-attribution--detailed"
           data-episode-id="${episodeId}">
        <div class="attribution-header">
          <h6 class="attribution-title">Metadata Sources</h6>
          <span class="attribution-status attribution-status--${enrichmentStatus}"
                aria-label="Enrichment status: ${enrichmentStatus}">
            ${enrichmentStatus}
          </span>
        </div>

        <div class="attribution-primary">
          <div class="attribution-primary-source">
            <span class="attribution-label">Primary Source:</span>
            <span class="attribution-value">${sourceName}</span>
          </div>

          <div class="attribution-primary-confidence">
            <span class="attribution-label">Confidence:</span>
            <span class="attribution-confidence attribution-confidence--${confidenceLevel}"
                  aria-label="Confidence score: ${confidenceScore}">
              ${confidenceScore}
            </span>
          </div>

          <div class="attribution-primary-validation">
            <span class="attribution-label">Validation:</span>
            <span class="attribution-validation attribution-validation--${currentMetadata.isValidated ? 'validated' : 'unvalidated'}"
                  aria-label="Validation status: ${validationStatus}">
              ${validationStatus}
            </span>
          </div>

          <div class="attribution-primary-updated">
            <span class="attribution-label">Last Updated:</span>
            <span class="attribution-value">${lastUpdated}</span>
          </div>
        </div>

        ${fieldAttributionHTML}
        ${conflictsHTML}

        ${
          currentMetadata.version
            ? `
          <div class="attribution-version">
            <span class="attribution-version-label">Schema Version:</span>
            <span class="attribution-version-value">${currentMetadata.version}</span>
          </div>
        `
            : ''
        }
      </div>
    `
  }

  const renderHTML = (): string => {
    return displayMode === 'compact' ? renderCompact() : renderDetailed()
  }

  const updateMetadata = (metadata: EpisodeMetadata): void => {
    currentMetadata = metadata
    eventEmitter.emit('attribution-updated', {episodeId, metadata})
  }

  const getMetadata = (): EpisodeMetadata | undefined => {
    return currentMetadata ? {...currentMetadata} : undefined
  }

  const destroy = (): void => {
    eventEmitter.removeAllListeners()
    currentMetadata = undefined
  }

  return {
    renderHTML,
    updateMetadata,
    getMetadata,
    destroy,

    // Generic EventEmitter methods
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    once: eventEmitter.once.bind(eventEmitter),
    removeAllListeners: eventEmitter.removeAllListeners.bind(eventEmitter),
  }
}
