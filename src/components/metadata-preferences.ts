/**
 * Metadata Preferences Component
 *
 * Provides user controls for manual metadata refresh operations with real-time progress tracking
 * and cancellation support. Integrates with the existing VBS preferences system.
 *
 * Features:
 * - Manual single episode refresh with source selection
 * - Bulk refresh operations (series, season, all episodes)
 * - Real-time progress indicators showing completion percentage
 * - Cancellation support for long-running bulk operations
 * - Success/error feedback with actionable messages
 * - Integration with metadata sync preferences
 * - Responsive design adapting to mobile and desktop viewports
 *
 * Integration:
 * - Integrates with metadata-debug-panel for refresh operations
 * - Uses generic EventEmitter for type-safe event handling
 * - Follows VBS theme system with CSS custom properties
 * - Provides keyboard navigation and screen reader support
 */

import type {
  MetadataPreferencesConfig,
  MetadataPreferencesEvents,
  MetadataPreferencesInstance,
  MetadataSourceType,
  MetadataUsageControlsInstance,
} from '../modules/types.js'
import {withSyncErrorHandling} from '../modules/error-handler.js'
import {createEventEmitter} from '../modules/events.js'
import {validateEpisodeWithReporting} from '../utils/metadata-validation.js'
import {createMetadataUsageControls} from './metadata-usage-controls.js'

/**
 * Create a metadata preferences component instance.
 * Factory function following VBS functional factory architecture pattern.
 *
 * @param config - Configuration for the metadata preferences component
 * @returns Metadata preferences instance with full API
 */
export const createMetadataPreferences = (
  config: MetadataPreferencesConfig,
): MetadataPreferencesInstance => {
  const {container, debugPanel, preferences: _preferences} = config

  // Private state managed via closure variables
  let isRefreshing = false
  let isValidating = false
  let currentOperation: 'single' | 'bulk' | 'validation' | null = null
  let progressData: {
    current: number
    total: number
    successCount: number
    failCount: number
  } | null = null

  interface ValidationData {
    totalCount: number
    validCount: number
    invalidCount: number
    warningCount: number
    errors: {episodeId: string; field: string; message: string}[]
    warnings: {episodeId: string; field: string; message: string; suggestion?: string}[]
  }

  let validationData: ValidationData | null = null
  let selectedSeriesId: string | null = null
  let selectedValidationSeriesId: string | null = null
  let usageControls: MetadataUsageControlsInstance | null = null

  // DOM elements cache
  const elements: {
    form?: HTMLFormElement
    singleRefreshSection?: HTMLElement
    bulkRefreshSection?: HTMLElement
    bulkValidationSection?: HTMLElement
    episodeIdInput?: HTMLInputElement
    sourceSelect?: HTMLSelectElement
    refreshButton?: HTMLButtonElement
    refreshSeriesSelect?: HTMLSelectElement
    refreshSeriesButton?: HTMLButtonElement
    refreshAllButton?: HTMLButtonElement
    validationSeriesSelect?: HTMLSelectElement
    validateSeriesButton?: HTMLButtonElement
    validateAllButton?: HTMLButtonElement
    progressContainer?: HTMLElement
    progressBar?: HTMLElement
    progressText?: HTMLElement
    cancelButton?: HTMLButtonElement
    validationResultsContainer?: HTMLElement
    feedbackContainer?: HTMLElement
    usageControlsContainer?: HTMLElement
  } = {}

  const eventEmitter = createEventEmitter<MetadataPreferencesEvents>()

  const AVAILABLE_SOURCES: {id: MetadataSourceType; name: string}[] = [
    {id: 'memory-alpha', name: 'Memory Alpha'},
    {id: 'tmdb', name: 'The Movie Database'},
    {id: 'trekcore', name: 'TrekCore'},
    {id: 'stapi', name: 'Star Trek API'},
  ]

  const AVAILABLE_SERIES = [
    {id: 'ent', name: 'Enterprise', episodeCount: 98},
    {id: 'tos', name: 'Original Series', episodeCount: 79},
    {id: 'tas', name: 'Animated Series', episodeCount: 22},
    {id: 'tng', name: 'Next Generation', episodeCount: 176},
    {id: 'ds9', name: 'Deep Space Nine', episodeCount: 173},
    {id: 'voy', name: 'Voyager', episodeCount: 168},
    {id: 'pic', name: 'Picard', episodeCount: 30},
  ]

  const createSingleRefreshSection = (): string => {
    const sourceOptions = AVAILABLE_SOURCES.map(
      source => `<option value="${source.id}">${source.name}</option>`,
    ).join('')

    return `
      <div class="metadata-preferences-section" data-single-refresh-section>
        <h3>Manual Episode Refresh</h3>
        <p class="section-description">
          Refresh metadata for a specific episode immediately. Select a data source or use automatic source selection.
        </p>

        <div class="single-refresh-controls">
          <div class="form-group">
            <label for="episode-id-input">Episode ID:</label>
            <input
              type="text"
              id="episode-id-input"
              data-episode-id-input
              placeholder="e.g., tng_s3_e15"
              aria-describedby="episode-id-help"
            />
            <small id="episode-id-help" class="form-help">
              Enter the episode identifier (e.g., tng_s3_e15 for TNG Season 3 Episode 15)
            </small>
          </div>

          <div class="form-group">
            <label for="source-select">Metadata Source:</label>
            <select id="source-select" data-source-select aria-describedby="source-help">
              <option value="">Automatic (best available)</option>
              ${sourceOptions}
            </select>
            <small id="source-help" class="form-help">
              Choose a specific source or let the system select the best available option
            </small>
          </div>

          <button
            type="button"
            class="btn-primary"
            data-refresh-button
            aria-label="Refresh episode metadata"
          >
            <span class="btn-icon">🔄</span>
            <span class="btn-text">Refresh Episode</span>
          </button>
        </div>
      </div>
    `
  }

  const createBulkRefreshSection = (): string => {
    const seriesOptions = AVAILABLE_SERIES.map(
      series =>
        `<option value="${series.id}">${series.name} (${series.episodeCount} episodes)</option>`,
    ).join('')

    return `
      <div class="metadata-preferences-section" data-bulk-refresh-section>
        <h3>Bulk Refresh Operations</h3>
        <p class="section-description">
          Refresh metadata for multiple episodes at once. These operations may take several minutes.
        </p>

        <div class="bulk-refresh-controls">
          <div class="form-group">
            <label for="refresh-series-select">Select Series:</label>
            <select
              id="refresh-series-select"
              data-refresh-series-select
              aria-describedby="series-help"
            >
              <option value="">Choose a series...</option>
              ${seriesOptions}
            </select>
            <small id="series-help" class="form-help">
              Select a series to refresh all episodes within that series
            </small>
          </div>

          <button
            type="button"
            class="btn-secondary"
            data-refresh-series-button
            disabled
            aria-label="Refresh all episodes in selected series"
          >
            <span class="btn-icon">📺</span>
            <span class="btn-text">Refresh Series</span>
          </button>

          <button
            type="button"
            class="btn-tertiary"
            data-refresh-all-button
            aria-label="Refresh all episodes across all series"
          >
            <span class="btn-icon">🌐</span>
            <span class="btn-text">Refresh All Episodes</span>
          </button>

          <p class="warning-message" role="alert">
            ⚠️ Bulk operations may consume significant API quota and take several minutes to complete.
            Progress can be cancelled at any time.
          </p>
        </div>
      </div>
    `
  }

  const createBulkValidationSection = (): string => {
    const seriesOptions = AVAILABLE_SERIES.map(
      series =>
        `<option value="${series.id}">${series.name} (${series.episodeCount} episodes)</option>`,
    ).join('')

    return `
      <div class="metadata-preferences-section" data-bulk-validation-section>
        <h3>Data Validation Operations</h3>
        <p class="section-description">
          Validate metadata quality and identify missing or incorrect data across episodes.
        </p>

        <div class="bulk-validation-controls">
          <div class="form-group">
            <label for="validation-series-select">Select Series to Validate:</label>
            <select
              id="validation-series-select"
              data-validation-series-select
              aria-describedby="validation-series-help"
            >
              <option value="">Choose a series...</option>
              ${seriesOptions}
            </select>
            <small id="validation-series-help" class="form-help">
              Validate all episodes within a specific series
            </small>
          </div>

          <button
            type="button"
            class="btn-secondary"
            data-validate-series-button
            disabled
            aria-label="Validate all episodes in selected series"
          >
            <span class="btn-icon">✓</span>
            <span class="btn-text">Validate Series</span>
          </button>

          <button
            type="button"
            class="btn-tertiary"
            data-validate-all-button
            aria-label="Validate all episodes across all series"
          >
            <span class="btn-icon">🔍</span>
            <span class="btn-text">Validate All Data</span>
          </button>

          <p class="info-message" role="status">
            ℹ️ Validation checks data quality, identifies missing fields, and detects inconsistencies.
            This operation does not modify any data.
          </p>
        </div>
      </div>
    `
  }

  const createValidationResultsSection = (): string => {
    return `
      <div class="validation-results-container hidden" data-validation-results-container role="region" aria-labelledby="validation-results-heading">
        <h3 id="validation-results-heading">Validation Results</h3>
        <div class="validation-summary" data-validation-summary>
          <!-- Summary will be injected here -->
        </div>
        <div class="validation-details" data-validation-details>
          <!-- Detailed results will be injected here -->
        </div>
      </div>
    `
  }

  const createProgressSection = (): string => {
    return `
      <div class="progress-container hidden" data-progress-container role="status" aria-live="polite">
        <div class="progress-header">
          <h4>Operation in Progress</h4>
          <button
            type="button"
            class="btn-cancel"
            data-cancel-button
            aria-label="Cancel operation"
          >
            <span class="btn-icon">✕</span>
            <span class="btn-text">Cancel</span>
          </button>
        </div>

        <div class="progress-bar-wrapper">
          <div class="progress-bar" data-progress-bar role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-fill"></div>
          </div>
          <div class="progress-text" data-progress-text>0%</div>
        </div>

        <div class="progress-details">
          <span class="progress-detail">Episodes processed: <strong>0 / 0</strong></span>
          <span class="progress-detail success-count">Successful: <strong>0</strong></span>
          <span class="progress-detail fail-count">Failed: <strong>0</strong></span>
        </div>
      </div>
    `
  }

  const createFeedbackSection = (): string => {
    return `
      <div class="feedback-container hidden" data-feedback-container role="alert" aria-live="assertive">
        <!-- Feedback messages will be injected here -->
      </div>
    `
  }

  const showProgress = (): void => {
    if (!elements.progressContainer) return

    elements.progressContainer.classList.remove('hidden')
    elements.progressContainer.classList.add('visible')
  }

  const hideProgress = (): void => {
    if (!elements.progressContainer) return

    elements.progressContainer.classList.remove('visible')
    elements.progressContainer.classList.add('hidden')
  }

  const updateProgress = (current: number, total: number, success: number, fail: number): void => {
    if (!elements.progressBar || !elements.progressText) return

    progressData = {current, total, successCount: success, failCount: fail}

    const percentage = total > 0 ? Math.round((current / total) * 100) : 0
    const progressFill = elements.progressBar.querySelector('.progress-fill') as HTMLElement

    if (progressFill) {
      progressFill.style.width = `${percentage}%`
    }

    elements.progressBar.setAttribute('aria-valuenow', percentage.toString())
    elements.progressText.textContent = `${percentage}%`

    const detailsContainer = elements.progressContainer?.querySelector(
      '.progress-details',
    ) as HTMLElement
    if (detailsContainer) {
      detailsContainer.innerHTML = `
        <span class="progress-detail">Episodes processed: <strong>${current} / ${total}</strong></span>
        <span class="progress-detail success-count">Successful: <strong>${success}</strong></span>
        <span class="progress-detail fail-count">Failed: <strong>${fail}</strong></span>
      `
    }
  }

  const showFeedback = (message: string, type: 'success' | 'error' | 'info'): void => {
    if (!elements.feedbackContainer) return

    const iconMap = {
      success: '✓',
      error: '✗',
      info: 'ℹ',
    }

    elements.feedbackContainer.className = `feedback-container visible feedback-${type}`
    elements.feedbackContainer.innerHTML = `
      <span class="feedback-icon">${iconMap[type]}</span>
      <span class="feedback-message">${message}</span>
      <button
        type="button"
        class="feedback-close"
        aria-label="Dismiss feedback"
        onclick="this.parentElement.classList.add('hidden')"
      >
        ✕
      </button>
    `

    setTimeout(() => {
      elements.feedbackContainer?.classList.remove('visible')
      elements.feedbackContainer?.classList.add('hidden')
    }, 5000)
  }

  const handleSingleRefresh = withSyncErrorHandling(async (): Promise<void> => {
    if (isRefreshing || !elements.episodeIdInput) return

    const episodeId = elements.episodeIdInput.value.trim()
    if (!episodeId) {
      showFeedback('Please enter a valid episode ID', 'error')
      return
    }

    const sourceValue = elements.sourceSelect?.value || undefined
    const source = sourceValue ? (sourceValue as MetadataSourceType) : undefined

    isRefreshing = true
    currentOperation = 'single'

    try {
      showProgress()
      updateProgress(0, 1, 0, 0)

      eventEmitter.emit('refresh-started', {
        episodeId,
        ...(source && {source}),
      })

      await debugPanel.refreshEpisode(episodeId, source)

      updateProgress(1, 1, 1, 0)
      showFeedback(`Successfully refreshed metadata for ${episodeId}`, 'success')

      eventEmitter.emit('refresh-completed', {
        episodeId,
        ...(source && {source}),
        success: true,
      })
    } catch (error) {
      updateProgress(1, 1, 0, 1)
      showFeedback(
        `Failed to refresh metadata for ${episodeId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error',
      )

      eventEmitter.emit('refresh-completed', {
        episodeId,
        ...(source && {source}),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      isRefreshing = false
      currentOperation = null
      setTimeout(hideProgress, 2000)
    }
  }, 'Failed to refresh episode metadata')

  const handleSeriesRefresh = withSyncErrorHandling(async (): Promise<void> => {
    if (isRefreshing || !selectedSeriesId) return

    const series = AVAILABLE_SERIES.find(s => s.id === selectedSeriesId)
    if (!series) return

    isRefreshing = true
    currentOperation = 'bulk'

    const episodeIds = generateSeriesEpisodeIds(series.id, series.episodeCount)

    try {
      showProgress()
      updateProgress(0, episodeIds.length, 0, 0)

      eventEmitter.emit('bulk-refresh-started', {
        seriesId: series.id,
        episodeIds,
        totalCount: episodeIds.length,
      })

      let successCount = 0
      let failCount = 0

      for (let i = 0; i < episodeIds.length; i++) {
        if (!isRefreshing) {
          showFeedback('Bulk refresh operation cancelled', 'info')
          eventEmitter.emit('bulk-refresh-cancelled', {
            processedCount: i,
            remainingCount: episodeIds.length - i,
          })
          return
        }

        const episodeId = episodeIds[i]
        if (!episodeId) continue

        try {
          await debugPanel.refreshEpisode(episodeId)
          successCount++
        } catch {
          failCount++
        }

        updateProgress(i + 1, episodeIds.length, successCount, failCount)
      }

      showFeedback(
        `Series refresh completed: ${successCount} successful, ${failCount} failed`,
        successCount > 0 ? 'success' : 'error',
      )

      eventEmitter.emit('bulk-refresh-completed', {
        seriesId: series.id,
        successCount,
        failCount,
        duration: 0,
      })
    } catch (error) {
      showFeedback(
        `Series refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error',
      )
    } finally {
      isRefreshing = false
      currentOperation = null
      setTimeout(hideProgress, 2000)
    }
  }, 'Failed to refresh series metadata')

  const handleRefreshAll = withSyncErrorHandling(async (): Promise<void> => {
    if (isRefreshing) return

    // eslint-disable-next-line no-alert
    const confirmed = globalThis.confirm(
      'This will refresh metadata for all episodes across all series. This may take several minutes and consume significant API quota. Continue?',
    )

    if (!confirmed) return

    isRefreshing = true
    currentOperation = 'bulk'

    const allEpisodeIds = AVAILABLE_SERIES.flatMap(series =>
      generateSeriesEpisodeIds(series.id, series.episodeCount),
    )

    try {
      showProgress()
      updateProgress(0, allEpisodeIds.length, 0, 0)

      eventEmitter.emit('bulk-refresh-started', {
        episodeIds: allEpisodeIds,
        totalCount: allEpisodeIds.length,
      })

      let successCount = 0
      let failCount = 0

      for (let i = 0; i < allEpisodeIds.length; i++) {
        if (!isRefreshing) {
          showFeedback('Bulk refresh operation cancelled', 'info')
          eventEmitter.emit('bulk-refresh-cancelled', {
            processedCount: i,
            remainingCount: allEpisodeIds.length - i,
          })
          return
        }

        const episodeId = allEpisodeIds[i]
        if (!episodeId) continue

        try {
          await debugPanel.refreshEpisode(episodeId)
          successCount++
        } catch {
          failCount++
        }

        updateProgress(i + 1, allEpisodeIds.length, successCount, failCount)
      }

      showFeedback(
        `Full refresh completed: ${successCount} successful, ${failCount} failed`,
        successCount > 0 ? 'success' : 'error',
      )

      eventEmitter.emit('bulk-refresh-completed', {
        successCount,
        failCount,
        duration: 0,
      })
    } catch (error) {
      showFeedback(
        `Full refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error',
      )
    } finally {
      isRefreshing = false
      currentOperation = null
      setTimeout(hideProgress, 2000)
    }
  }, 'Failed to refresh all metadata')

  const handleCancel = (): void => {
    if (currentOperation === 'bulk') {
      isRefreshing = false
      debugPanel.cancelBulkOperation()
      showFeedback('Cancelling operation...', 'info')
    } else if (currentOperation === 'validation') {
      isValidating = false
      showFeedback('Cancelling validation...', 'info')
    }
  }

  // Mock episode data generator for validation testing
  // Real implementation will fetch actual episode metadata from storage
  const createMockEpisodeForValidation = (episodeId: string) => ({
    id: episodeId,
    title: 'Mock Episode',
    season: 1,
    episode: 1,
    airDate: '2024-01-01',
    stardate: 'None',
    synopsis: 'Mock synopsis for validation testing',
    plotPoints: ['Plot point 1'],
    guestStars: [],
    connections: [],
  })

  // Generate episode IDs for a series
  // Temporary helper - real implementation will query actual episode data
  const generateSeriesEpisodeIds = (seriesId: string, episodeCount: number): string[] => {
    const episodeIds: string[] = []
    let currentEpisode = 1
    let currentSeason = 1

    while (episodeIds.length < episodeCount) {
      episodeIds.push(`${seriesId}_s${currentSeason}_e${currentEpisode}`)
      currentEpisode++

      if (currentEpisode > 26) {
        currentEpisode = 1
        currentSeason++
      }
    }

    return episodeIds
  }

  const handleValidateSeries = withSyncErrorHandling(async (): Promise<void> => {
    if (isValidating || !selectedValidationSeriesId) return

    const series = AVAILABLE_SERIES.find(s => s.id === selectedValidationSeriesId)
    if (!series) return

    isValidating = true
    currentOperation = 'validation'

    const episodeIds = generateSeriesEpisodeIds(series.id, series.episodeCount)

    try {
      showProgress()
      updateProgress(0, episodeIds.length, 0, 0)

      eventEmitter.emit('bulk-validation-started', {
        seriesId: series.id,
        episodeIds,
        totalCount: episodeIds.length,
      })

      validationData = {
        totalCount: episodeIds.length,
        validCount: 0,
        invalidCount: 0,
        warningCount: 0,
        errors: [],
        warnings: [],
      }

      for (let i = 0; i < episodeIds.length; i++) {
        if (!isValidating) {
          showFeedback('Validation operation cancelled', 'info')
          eventEmitter.emit('bulk-validation-cancelled', {
            processedCount: i,
            remainingCount: episodeIds.length - i,
          })
          return
        }

        const episodeId = episodeIds[i]
        if (!episodeId) continue

        const mockEpisodeData = createMockEpisodeForValidation(episodeId)
        const validationResult = validateEpisodeWithReporting(mockEpisodeData)

        if (validationResult.isValid) {
          validationData.validCount++
        } else {
          validationData.invalidCount++
        }

        validationResult.errors.forEach(error => {
          if (!validationData) return
          validationData.errors.push({
            episodeId,
            field: error.field,
            message: error.message,
          })
        })

        validationResult.warnings.forEach(warning => {
          if (!validationData) return
          validationData.warningCount++
          const warningEntry: {
            episodeId: string
            field: string
            message: string
            suggestion?: string
          } = {
            episodeId,
            field: warning.field,
            message: warning.message,
          }
          if (warning.suggestion) {
            warningEntry.suggestion = warning.suggestion
          }
          validationData.warnings.push(warningEntry)
        })

        if (!validationData) continue
        updateProgress(
          i + 1,
          episodeIds.length,
          validationData.validCount,
          validationData.invalidCount,
        )
      }

      displayValidationResults(validationData)

      const message = `Series validation completed: ${validationData.validCount} valid, ${validationData.invalidCount} invalid, ${validationData.warningCount} warnings`
      showFeedback(message, validationData.invalidCount === 0 ? 'success' : 'info')

      eventEmitter.emit('bulk-validation-completed', {
        seriesId: series.id,
        totalCount: validationData.totalCount,
        validCount: validationData.validCount,
        invalidCount: validationData.invalidCount,
        warningCount: validationData.warningCount,
        duration: 0,
      })
    } catch (error) {
      showFeedback(
        `Series validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error',
      )
    } finally {
      isValidating = false
      currentOperation = null
      setTimeout(hideProgress, 2000)
    }
  }, 'Failed to validate series metadata')

  const handleValidateAll = withSyncErrorHandling(async (): Promise<void> => {
    if (isValidating) return

    // eslint-disable-next-line no-alert
    const confirmed = globalThis.confirm(
      'This will validate metadata for all episodes across all series. This operation checks data quality without making any changes. Continue?',
    )

    if (!confirmed) return

    isValidating = true
    currentOperation = 'validation'

    const allEpisodeIds = AVAILABLE_SERIES.flatMap(series =>
      generateSeriesEpisodeIds(series.id, series.episodeCount),
    )

    try {
      showProgress()
      updateProgress(0, allEpisodeIds.length, 0, 0)

      eventEmitter.emit('bulk-validation-started', {
        episodeIds: allEpisodeIds,
        totalCount: allEpisodeIds.length,
      })

      validationData = {
        totalCount: allEpisodeIds.length,
        validCount: 0,
        invalidCount: 0,
        warningCount: 0,
        errors: [],
        warnings: [],
      }

      for (let i = 0; i < allEpisodeIds.length; i++) {
        if (!isValidating) {
          showFeedback('Validation operation cancelled', 'info')
          eventEmitter.emit('bulk-validation-cancelled', {
            processedCount: i,
            remainingCount: allEpisodeIds.length - i,
          })
          return
        }

        const episodeId = allEpisodeIds[i]
        if (!episodeId) continue

        const mockEpisodeData = createMockEpisodeForValidation(episodeId)
        const validationResult = validateEpisodeWithReporting(mockEpisodeData)

        if (validationResult.isValid) {
          validationData.validCount++
        } else {
          validationData.invalidCount++
        }

        validationResult.errors.forEach(error => {
          if (!validationData) return
          validationData.errors.push({
            episodeId,
            field: error.field,
            message: error.message,
          })
        })

        validationResult.warnings.forEach(warning => {
          if (!validationData) return
          validationData.warningCount++
          const warningEntry: {
            episodeId: string
            field: string
            message: string
            suggestion?: string
          } = {
            episodeId,
            field: warning.field,
            message: warning.message,
          }
          if (warning.suggestion) {
            warningEntry.suggestion = warning.suggestion
          }
          validationData.warnings.push(warningEntry)
        })

        if (!validationData) continue
        updateProgress(
          i + 1,
          allEpisodeIds.length,
          validationData.validCount,
          validationData.invalidCount,
        )
      }

      displayValidationResults(validationData)

      const message = `Full validation completed: ${validationData.validCount} valid, ${validationData.invalidCount} invalid, ${validationData.warningCount} warnings`
      showFeedback(message, validationData.invalidCount === 0 ? 'success' : 'info')

      eventEmitter.emit('bulk-validation-completed', {
        totalCount: validationData.totalCount,
        validCount: validationData.validCount,
        invalidCount: validationData.invalidCount,
        warningCount: validationData.warningCount,
        duration: 0,
      })
    } catch (error) {
      showFeedback(
        `Full validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error',
      )
    } finally {
      isValidating = false
      currentOperation = null
      setTimeout(hideProgress, 2000)
    }
  }, 'Failed to validate all metadata')

  const displayValidationResults = (data: ValidationData): void => {
    if (!elements.validationResultsContainer) return

    const resultsContainer = elements.validationResultsContainer
    resultsContainer.classList.remove('hidden')

    const summaryEl = resultsContainer.querySelector('[data-validation-summary]')
    if (summaryEl) {
      summaryEl.innerHTML = `
        <div class="validation-summary-stats">
          <div class="stat-item stat-total">
            <span class="stat-label">Total Episodes:</span>
            <span class="stat-value">${data.totalCount}</span>
          </div>
          <div class="stat-item stat-valid">
            <span class="stat-label">Valid:</span>
            <span class="stat-value">${data.validCount}</span>
          </div>
          <div class="stat-item stat-invalid">
            <span class="stat-label">Invalid:</span>
            <span class="stat-value">${data.invalidCount}</span>
          </div>
          <div class="stat-item stat-warnings">
            <span class="stat-label">Warnings:</span>
            <span class="stat-value">${data.warningCount}</span>
          </div>
        </div>
      `
    }

    const detailsEl = resultsContainer.querySelector('[data-validation-details]')
    if (detailsEl) {
      let detailsHTML = ''

      if (data.errors.length > 0) {
        detailsHTML += `
          <div class="validation-errors">
            <h4>Errors (${data.errors.length})</h4>
            <ul class="validation-list">
              ${data.errors
                .slice(0, 20)
                .map(
                  error => `
                <li class="validation-item validation-error">
                  <strong>${error.episodeId}</strong> - ${error.field}: ${error.message}
                </li>
              `,
                )
                .join('')}
              ${data.errors.length > 20 ? `<li class="validation-item">... and ${data.errors.length - 20} more errors</li>` : ''}
            </ul>
          </div>
        `
      }

      if (data.warnings.length > 0) {
        detailsHTML += `
          <div class="validation-warnings">
            <h4>Warnings (${data.warnings.length})</h4>
            <ul class="validation-list">
              ${data.warnings
                .slice(0, 20)
                .map(
                  warning => `
                <li class="validation-item validation-warning">
                  <strong>${warning.episodeId}</strong> - ${warning.field}: ${warning.message}
                  ${warning.suggestion ? `<br><em>Suggestion: ${warning.suggestion}</em>` : ''}
                </li>
              `,
                )
                .join('')}
              ${data.warnings.length > 20 ? `<li class="validation-item">... and ${data.warnings.length - 20} more warnings</li>` : ''}
            </ul>
          </div>
        `
      }

      if (data.errors.length === 0 && data.warnings.length === 0) {
        detailsHTML =
          '<p class="validation-success">✅ All episodes passed validation with no errors or warnings.</p>'
      }

      detailsEl.innerHTML = detailsHTML
    }
  }

  const setupEventListeners = (): void => {
    if (!elements.form) return

    // Single episode refresh
    elements.refreshButton?.addEventListener('click', handleSingleRefresh)

    // Series selection
    elements.refreshSeriesSelect?.addEventListener('change', event => {
      const select = event.target as HTMLSelectElement
      selectedSeriesId = select.value || null

      if (elements.refreshSeriesButton) {
        elements.refreshSeriesButton.disabled = !selectedSeriesId
      }
    })

    // Series refresh
    elements.refreshSeriesButton?.addEventListener('click', handleSeriesRefresh)

    // Refresh all
    elements.refreshAllButton?.addEventListener('click', handleRefreshAll)

    // Validation series selection
    elements.validationSeriesSelect?.addEventListener('change', event => {
      const select = event.target as HTMLSelectElement
      selectedValidationSeriesId = select.value || null

      if (elements.validateSeriesButton) {
        elements.validateSeriesButton.disabled = !selectedValidationSeriesId
      }
    })

    // Series validation
    elements.validateSeriesButton?.addEventListener('click', handleValidateSeries)

    // Validate all
    elements.validateAllButton?.addEventListener('click', handleValidateAll)

    // Cancel operation
    elements.cancelButton?.addEventListener('click', handleCancel)

    // Listen to debug panel events for progress updates
    debugPanel.on('bulk-refresh-started', (data: {totalCount: number}) => {
      updateProgress(0, data.totalCount, 0, 0)
    })

    debugPanel.on('bulk-refresh-completed', (data: {successCount: number; failCount: number}) => {
      const total = data.successCount + data.failCount
      updateProgress(total, total, data.successCount, data.failCount)
    })

    debugPanel.on('bulk-refresh-cancelled', (data: {processedCount: number}) => {
      if (progressData) {
        updateProgress(
          data.processedCount,
          progressData.total,
          progressData.successCount,
          progressData.failCount,
        )
      }
    })
  }

  const render = (): void => {
    container.innerHTML = `
      <div class="metadata-preferences-container">
        <div class="preferences-header">
          <h2>Metadata Management</h2>
          <p>Manage metadata refresh operations, data usage quotas, and monitor API consumption.</p>
        </div>

        <form class="metadata-preferences-form">
          ${createSingleRefreshSection()}
          ${createBulkRefreshSection()}
          ${createBulkValidationSection()}
          ${createProgressSection()}
          ${createValidationResultsSection()}
          ${createFeedbackSection()}

          <div class="metadata-preferences-section" data-usage-controls-section>
            <div data-usage-controls-container></div>
          </div>
        </form>
      </div>
    `

    // Cache DOM elements
    elements.form = container.querySelector('.metadata-preferences-form') as HTMLFormElement
    elements.singleRefreshSection = container.querySelector(
      '[data-single-refresh-section]',
    ) as HTMLElement
    elements.bulkRefreshSection = container.querySelector(
      '[data-bulk-refresh-section]',
    ) as HTMLElement
    elements.episodeIdInput = container.querySelector('[data-episode-id-input]') as HTMLInputElement
    elements.sourceSelect = container.querySelector('[data-source-select]') as HTMLSelectElement
    elements.refreshButton = container.querySelector('[data-refresh-button]') as HTMLButtonElement
    elements.refreshSeriesSelect = container.querySelector(
      '[data-refresh-series-select]',
    ) as HTMLSelectElement
    elements.refreshSeriesButton = container.querySelector(
      '[data-refresh-series-button]',
    ) as HTMLButtonElement
    elements.refreshAllButton = container.querySelector(
      '[data-refresh-all-button]',
    ) as HTMLButtonElement
    elements.bulkValidationSection = container.querySelector(
      '[data-bulk-validation-section]',
    ) as HTMLElement
    elements.validationSeriesSelect = container.querySelector(
      '[data-validation-series-select]',
    ) as HTMLSelectElement
    elements.validateSeriesButton = container.querySelector(
      '[data-validate-series-button]',
    ) as HTMLButtonElement
    elements.validateAllButton = container.querySelector(
      '[data-validate-all-button]',
    ) as HTMLButtonElement
    elements.progressContainer = container.querySelector('[data-progress-container]') as HTMLElement
    elements.progressBar = container.querySelector('[data-progress-bar]') as HTMLElement
    elements.progressText = container.querySelector('[data-progress-text]') as HTMLElement
    elements.cancelButton = container.querySelector('[data-cancel-button]') as HTMLButtonElement
    elements.validationResultsContainer = container.querySelector(
      '[data-validation-results-container]',
    ) as HTMLElement
    elements.feedbackContainer = container.querySelector('[data-feedback-container]') as HTMLElement
    elements.usageControlsContainer = container.querySelector(
      '[data-usage-controls-container]',
    ) as HTMLElement

    setupEventListeners()
    initializeUsageControls()
  }

  const initializeUsageControls = (): void => {
    if (!elements.usageControlsContainer || !_preferences) return

    // Clean up existing instance if any
    if (usageControls) {
      usageControls.destroy()
    }

    // Create and render usage controls component
    usageControls = createMetadataUsageControls({
      container: elements.usageControlsContainer,
      preferences: _preferences,
      getUsageStats: () => _preferences.getUsageStatistics(),
      onQuotasUpdate: dataLimits => {
        eventEmitter.emit('quotas-updated', {dataLimits})
      },
    })

    usageControls.render()

    // Wire up usage controls events to metadata preferences events
    usageControls.on('quota-warning', data => {
      eventEmitter.emit('quota-warning', data)
    })

    usageControls.on('quota-exceeded', data => {
      eventEmitter.emit('quota-exceeded', data)
    })

    usageControls.on('cache-cleared', data => {
      eventEmitter.emit('cache-cleared', data)
    })
  }

  const update = (): void => {
    render()
  }

  const destroy = (): void => {
    isRefreshing = false
    currentOperation = null
    progressData = null

    // Clean up usage controls
    if (usageControls) {
      usageControls.destroy()
      usageControls = null
    }

    eventEmitter.removeAllListeners()
    container.innerHTML = ''
  }

  // Initial render
  render()

  return {
    render,
    update,
    showProgress,
    hideProgress,
    showFeedback,
    destroy,
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    once: eventEmitter.once.bind(eventEmitter),
    removeAllListeners: eventEmitter.removeAllListeners.bind(eventEmitter),
  }
}
