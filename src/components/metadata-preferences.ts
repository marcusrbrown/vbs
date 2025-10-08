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
} from '../modules/types.js'
import {withSyncErrorHandling} from '../modules/error-handler.js'
import {createEventEmitter} from '../modules/events.js'

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
  let currentOperation: 'single' | 'bulk' | null = null
  let progressData: {
    current: number
    total: number
    successCount: number
    failCount: number
  } | null = null
  let selectedSeriesId: string | null = null

  // DOM elements cache
  const elements: {
    form?: HTMLFormElement
    singleRefreshSection?: HTMLElement
    bulkRefreshSection?: HTMLElement
    episodeIdInput?: HTMLInputElement
    sourceSelect?: HTMLSelectElement
    refreshButton?: HTMLButtonElement
    refreshSeriesSelect?: HTMLSelectElement
    refreshSeriesButton?: HTMLButtonElement
    refreshAllButton?: HTMLButtonElement
    progressContainer?: HTMLElement
    progressBar?: HTMLElement
    progressText?: HTMLElement
    cancelButton?: HTMLButtonElement
    feedbackContainer?: HTMLElement
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

  const createProgressSection = (): string => {
    return `
      <div class="progress-container hidden" data-progress-container role="status" aria-live="polite">
        <div class="progress-header">
          <h4>Refresh in Progress</h4>
          <button
            type="button"
            class="btn-cancel"
            data-cancel-button
            aria-label="Cancel refresh operation"
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
    }
  }

  // Simplified implementation - real implementation would query actual episode data
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
          <h2>Metadata Refresh Controls</h2>
          <p>Manually refresh episode metadata with real-time progress tracking and cancellation support.</p>
        </div>

        <form class="metadata-preferences-form">
          ${createSingleRefreshSection()}
          ${createBulkRefreshSection()}
          ${createProgressSection()}
          ${createFeedbackSection()}
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
    elements.progressContainer = container.querySelector('[data-progress-container]') as HTMLElement
    elements.progressBar = container.querySelector('[data-progress-bar]') as HTMLElement
    elements.progressText = container.querySelector('[data-progress-text]') as HTMLElement
    elements.cancelButton = container.querySelector('[data-cancel-button]') as HTMLButtonElement
    elements.feedbackContainer = container.querySelector('[data-feedback-container]') as HTMLElement

    setupEventListeners()
  }

  const update = (): void => {
    render()
  }

  const destroy = (): void => {
    isRefreshing = false
    currentOperation = null
    progressData = null
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
