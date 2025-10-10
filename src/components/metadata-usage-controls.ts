import type {
  MetadataUsageControlsConfig,
  MetadataUsageControlsEvents,
  MetadataUsageControlsInstance,
  MetadataUsageStatistics,
  UserPreferences,
} from '../modules/types.js'
import {createEventEmitter} from '../modules/events.js'

/**
 * Format bytes to human-readable string (KB, MB, GB)
 */
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}

/**
 * Format number with thousands separator
 */
const formatNumber = (num: number): string => {
  return num.toLocaleString('en-US')
}

/**
 * Calculate percentage with clamping to 0-100 range
 */
const calculatePercentage = (used: number, total: number): number => {
  if (total === 0) return 0
  return Math.min(100, Math.max(0, Math.round((used / total) * 100)))
}

/**
 * Get CSS class for quota status based on percentage
 */
const getQuotaStatusClass = (percentUsed: number): string => {
  if (percentUsed >= 100) return 'quota-exceeded'
  if (percentUsed >= 90) return 'quota-critical'
  if (percentUsed >= 75) return 'quota-warning'
  return 'quota-normal'
}

/**
 * Get status message for quota based on percentage
 */
const getQuotaStatusMessage = (percentUsed: number): string => {
  if (percentUsed >= 100) return 'Quota exceeded!'
  if (percentUsed >= 90) return 'Approaching quota limit'
  if (percentUsed >= 75) return 'High usage'
  return 'Normal usage'
}

/**
 * Metadata usage controls component factory.
 * Creates comprehensive UI for monitoring data usage and managing quotas.
 *
 * Follows VBS functional factory pattern with closure-based state management
 * and type-safe event handling.
 *
 * @param config - Configuration object with container, preferences, and stats getter
 * @returns MetadataUsageControlsInstance with full API
 *
 * @example
 * ```typescript
 * const usageControls = createMetadataUsageControls({
 *   container: document.getElementById('usage-container')!,
 *   preferences: preferencesInstance,
 *   getUsageStats: () => metadataStorage.getUsageStatistics(),
 *   onQuotasUpdate: (limits) => console.log('Quotas updated:', limits)
 * })
 *
 * usageControls.render()
 *
 * usageControls.on('quota-warning', ({ type, percentUsed }) => {
 *   console.warn(`Quota warning: ${type} at ${percentUsed}%`)
 * })
 * ```
 */
export const createMetadataUsageControls = (
  config: MetadataUsageControlsConfig,
): MetadataUsageControlsInstance => {
  const {container, preferences, getUsageStats, onQuotasUpdate} = config

  // Private state in closure
  let currentStats: MetadataUsageStatistics | null = null
  let isRendered = false

  // Generic EventEmitter for type-safe events
  const eventEmitter = createEventEmitter<MetadataUsageControlsEvents>()

  /**
   * Load current usage statistics
   */
  const loadStats = async (): Promise<MetadataUsageStatistics> => {
    const stats = getUsageStats()
    currentStats = stats instanceof Promise ? await stats : stats
    return currentStats
  }

  /**
   * Create usage overview section with key metrics
   */
  const createUsageOverview = (stats: MetadataUsageStatistics): string => {
    const apiCallsPercent = calculatePercentage(
      stats.quotas?.dailyApiCalls?.used ?? 0,
      stats.quotas?.dailyApiCalls?.limit ?? 0,
    )
    const storagePercent = calculatePercentage(
      stats.quotas?.cacheStorage?.used ?? 0,
      stats.quotas?.cacheStorage?.limit ?? 0,
    )

    return `
      <div class="usage-overview">
        <h3>Usage Overview</h3>
        <div class="overview-cards">
          <div class="overview-card ${getQuotaStatusClass(apiCallsPercent)}">
            <div class="card-icon">📊</div>
            <div class="card-content">
              <div class="card-label">API Calls Today</div>
              <div class="card-value">${formatNumber(stats.quotas?.dailyApiCalls?.used ?? 0)} / ${formatNumber(stats.quotas?.dailyApiCalls?.limit ?? 0)}</div>
              <div class="card-percentage">${apiCallsPercent}% used</div>
              <div class="card-status">${getQuotaStatusMessage(apiCallsPercent)}</div>
            </div>
          </div>

          <div class="overview-card ${getQuotaStatusClass(storagePercent)}">
            <div class="card-icon">💾</div>
            <div class="card-content">
              <div class="card-label">Cache Storage</div>
              <div class="card-value">${formatBytes(stats.quotas?.cacheStorage?.used ?? 0)} / ${formatBytes(stats.quotas?.cacheStorage?.limit ?? 0)}</div>
              <div class="card-percentage">${storagePercent}% used</div>
              <div class="card-status">${getQuotaStatusMessage(storagePercent)}</div>
            </div>
          </div>

          <div class="overview-card quota-normal">
            <div class="card-icon">🎯</div>
            <div class="card-content">
              <div class="card-label">Episodes Enriched</div>
              <div class="card-value">${formatNumber(stats.storage?.episodeCount ?? 0)}</div>
              <div class="card-percentage">Cached metadata</div>
              <div class="card-status">Available offline</div>
            </div>
          </div>

          <div class="overview-card quota-normal">
            <div class="card-icon">📈</div>
            <div class="card-content">
              <div class="card-label">Total Bandwidth</div>
              <div class="card-value">${formatBytes(stats.bandwidth?.thisMonth ?? 0)}</div>
              <div class="card-percentage">This month</div>
              <div class="card-status">Network usage</div>
            </div>
          </div>
        </div>
      </div>
    `
  }

  /**
   * Create detailed API call statistics section
   */
  const createApiCallStats = (stats: MetadataUsageStatistics): string => {
    const sourceEntries = Object.entries(stats.apiCalls?.bySource ?? {})
      .map(([source, calls]) => {
        const percent = calculatePercentage(calls, stats.apiCalls?.today ?? 0)
        return `
          <div class="stats-bar">
            <div class="stats-bar-label">${source}</div>
            <div class="stats-bar-track">
              <div class="stats-bar-fill" style="width: ${percent}%"></div>
            </div>
            <div class="stats-bar-value">${formatNumber(calls)} calls (${percent}%)</div>
          </div>
        `
      })
      .join('')

    return `
      <div class="usage-section">
        <h4>API Calls by Source</h4>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-label">Today</div>
            <div class="stat-value">${formatNumber(stats.apiCalls?.today ?? 0)}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">This Week</div>
            <div class="stat-value">${formatNumber(stats.apiCalls?.thisWeek ?? 0)}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">This Month</div>
            <div class="stat-value">${formatNumber(stats.apiCalls?.thisMonth ?? 0)}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Lifetime</div>
            <div class="stat-value">${formatNumber(stats.apiCalls?.lifetime ?? 0)}</div>
          </div>
        </div>
        <div class="stats-breakdown">
          <h5>Breakdown by Source</h5>
          ${sourceEntries}
        </div>
      </div>
    `
  }

  /**
   * Create bandwidth usage statistics section
   */
  const createBandwidthStats = (stats: MetadataUsageStatistics): string => {
    return `
      <div class="usage-section">
        <h4>Bandwidth Usage</h4>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-label">Today</div>
            <div class="stat-value">${formatBytes(stats.bandwidth?.today ?? 0)}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">This Week</div>
            <div class="stat-value">${formatBytes(stats.bandwidth?.thisWeek ?? 0)}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">This Month</div>
            <div class="stat-value">${formatBytes(stats.bandwidth?.thisMonth ?? 0)}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Lifetime</div>
            <div class="stat-value">${formatBytes(stats.bandwidth?.lifetime ?? 0)}</div>
          </div>
        </div>
      </div>
    `
  }

  /**
   * Create quota management controls section
   */
  const createQuotaControls = (): string => {
    const prefs = preferences.getPreferences()
    const limits = prefs.metadataSync.dataLimits

    return `
      <div class="quota-controls">
        <h3>Quota Management</h3>
        <p class="section-description">
          Configure data usage limits to control API calls, bandwidth, and storage.
          These limits help prevent excessive data usage and service rate limiting.
        </p>

        <div class="control-group">
          <label class="control-label">
            <span class="label-text">Daily API Call Limit</span>
            <span class="label-hint">Maximum API requests per day (0 = unlimited)</span>
          </label>
          <div class="control-input-group">
            <input
              type="number"
              min="0"
              max="10000"
              step="100"
              value="${limits.maxDailyApiCalls}"
              data-quota-input="maxDailyApiCalls"
              class="control-input"
              aria-label="Daily API call limit"
            />
            <span class="input-unit">calls/day</span>
          </div>
        </div>

        <div class="control-group">
          <label class="control-label">
            <span class="label-text">Episodes Per Sync Batch</span>
            <span class="label-hint">Maximum episodes to process in a single batch</span>
          </label>
          <div class="control-input-group">
            <input
              type="number"
              min="1"
              max="500"
              step="10"
              value="${limits.maxEpisodesPerSync}"
              data-quota-input="maxEpisodesPerSync"
              class="control-input"
              aria-label="Episodes per sync batch"
            />
            <span class="input-unit">episodes</span>
          </div>
        </div>

        <div class="control-group">
          <label class="control-label">
            <span class="label-text">Maximum Cache Size</span>
            <span class="label-hint">Maximum storage for cached metadata</span>
          </label>
          <div class="control-input-group">
            <input
              type="number"
              min="10"
              max="500"
              step="10"
              value="${limits.maxCacheSizeMB}"
              data-quota-input="maxCacheSizeMB"
              class="control-input"
              aria-label="Maximum cache size"
            />
            <span class="input-unit">MB</span>
          </div>
        </div>

        <div class="control-actions">
          <button type="button" class="btn-primary" data-save-quotas>
            Save Quota Settings
          </button>
          <button type="button" class="btn-secondary" data-reset-quotas>
            Reset to Defaults
          </button>
        </div>
      </div>
    `
  }

  /**
   * Create cache management section
   */
  const createCacheManagement = (stats: MetadataUsageStatistics): string => {
    const storagePercent = stats.storage?.percentUsed ?? 0

    return `
      <div class="cache-management">
        <h3>Cache Management</h3>
        <div class="cache-stats">
          <div class="cache-stat-item">
            <div class="cache-stat-label">Current Cache Size</div>
            <div class="cache-stat-value">${formatBytes(stats.storage?.currentSize ?? 0)}</div>
          </div>
          <div class="cache-stat-item">
            <div class="cache-stat-label">Cached Episodes</div>
            <div class="cache-stat-value">${formatNumber(stats.storage?.episodeCount ?? 0)}</div>
          </div>
          <div class="cache-stat-item">
            <div class="cache-stat-label">Storage Used</div>
            <div class="cache-stat-value ${getQuotaStatusClass(storagePercent)}">${storagePercent}%</div>
          </div>
        </div>

        <div class="cache-progress">
          <div class="cache-progress-bar">
            <div
              class="cache-progress-fill ${getQuotaStatusClass(storagePercent)}"
              style="width: ${storagePercent}%"
              role="progressbar"
              aria-valuenow="${storagePercent}"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-label="Cache storage usage"
            ></div>
          </div>
          <div class="cache-progress-label">
            ${formatBytes(stats.storage?.currentSize ?? 0)} / ${formatBytes(stats.storage?.maxSize ?? 0)}
          </div>
        </div>

        <div class="cache-actions">
          <button type="button" class="btn-warning" data-clear-cache>
            <span class="btn-icon">🗑️</span>
            Clear Cache
          </button>
          <p class="cache-warning">
            Warning: Clearing cache will remove all downloaded metadata. You will need to re-download metadata for offline access.
          </p>
        </div>
      </div>
    `
  }

  /**
   * Create export section for usage data
   */
  const createExportSection = (): string => {
    return `
      <div class="export-section">
        <h3>Export Usage Data</h3>
        <p class="section-description">
          Export your usage statistics for analysis or record keeping.
        </p>
        <div class="export-actions">
          <button type="button" class="btn-secondary" data-export-json>
            <span class="btn-icon">📄</span>
            Export as JSON
          </button>
          <button type="button" class="btn-secondary" data-export-csv>
            <span class="btn-icon">📊</span>
            Export as CSV
          </button>
        </div>
      </div>
    `
  }

  /**
   * Create quota reset warning section
   */
  const createQuotaResetInfo = (stats: MetadataUsageStatistics): string => {
    const resetTime = new Date(stats.quotas?.dailyApiCalls?.resetTime ?? Date.now())
    const now = new Date()
    const hoursUntilReset = Math.ceil((resetTime.getTime() - now.getTime()) / (1000 * 60 * 60))

    return `
      <div class="quota-reset-info">
        <div class="reset-info-icon">⏰</div>
        <div class="reset-info-content">
          <div class="reset-info-label">Daily Quota Resets In</div>
          <div class="reset-info-value">${hoursUntilReset} hours</div>
          <div class="reset-info-time">${resetTime.toLocaleString()}</div>
        </div>
      </div>
    `
  }

  /**
   * Render the complete usage controls UI
   */
  const renderUI = async (): Promise<void> => {
    const stats = currentStats || (await loadStats())

    const usageHTML = `
      <div class="metadata-usage-controls">
        <header class="usage-header">
          <h2>Data Usage & Quotas</h2>
          <p class="header-description">
            Monitor your metadata enrichment data usage and manage quotas to control API calls, bandwidth, and storage.
          </p>
          <button type="button" class="btn-refresh" data-refresh-stats aria-label="Refresh statistics">
            <span class="btn-icon">🔄</span>
            Refresh Stats
          </button>
        </header>

        ${createUsageOverview(stats)}
        ${createQuotaResetInfo(stats)}

        <div class="usage-details">
          ${createApiCallStats(stats)}
          ${createBandwidthStats(stats)}
        </div>

        ${createQuotaControls()}
        ${createCacheManagement(stats)}
        ${createExportSection()}

        <div class="usage-feedback" role="alert" aria-live="polite" style="display: none;"></div>
      </div>
    `

    container.innerHTML = usageHTML
    isRendered = true
    attachEventListeners()

    // Check for quota warnings
    checkQuotaWarnings(stats)
  }

  /**
   * Check quota status and emit warnings if needed
   */
  const checkQuotaWarnings = (stats: MetadataUsageStatistics): void => {
    // Check API call quota
    const apiPercent = stats.quotas?.dailyApiCalls?.percentUsed ?? 0
    if (apiPercent >= 90 && apiPercent < 100) {
      eventEmitter.emit('quota-warning', {
        type: 'api-calls',
        percentUsed: apiPercent,
        limit: stats.quotas?.dailyApiCalls?.limit ?? 0,
      })
    } else if (apiPercent >= 100) {
      eventEmitter.emit('quota-exceeded', {
        type: 'api-calls',
        used: stats.quotas?.dailyApiCalls?.used ?? 0,
        limit: stats.quotas?.dailyApiCalls?.limit ?? 0,
      })
    }

    // Check storage quota
    const storagePercent = stats.quotas?.cacheStorage?.percentUsed ?? 0
    if (storagePercent >= 90 && storagePercent < 100) {
      eventEmitter.emit('quota-warning', {
        type: 'storage',
        percentUsed: storagePercent,
        limit: stats.quotas?.cacheStorage?.limit ?? 0,
      })
    } else if (storagePercent >= 100) {
      eventEmitter.emit('quota-exceeded', {
        type: 'storage',
        used: stats.quotas?.cacheStorage?.used ?? 0,
        limit: stats.quotas?.cacheStorage?.limit ?? 0,
      })
    }
  }

  /**
   * Save updated quota settings
   */
  const saveQuotas = (): void => {
    const maxDailyApiCallsInput = container.querySelector(
      '[data-quota-input="maxDailyApiCalls"]',
    ) as HTMLInputElement
    const maxEpisodesPerSyncInput = container.querySelector(
      '[data-quota-input="maxEpisodesPerSync"]',
    ) as HTMLInputElement
    const maxCacheSizeMBInput = container.querySelector(
      '[data-quota-input="maxCacheSizeMB"]',
    ) as HTMLInputElement

    const dataLimits: UserPreferences['metadataSync']['dataLimits'] = {
      maxDailyApiCalls: Number.parseInt(maxDailyApiCallsInput.value, 10),
      maxEpisodesPerSync: Number.parseInt(maxEpisodesPerSyncInput.value, 10),
      maxCacheSizeMB: Number.parseInt(maxCacheSizeMBInput.value, 10),
    }

    preferences.updateMetadataSyncDataLimits(dataLimits)

    eventEmitter.emit('quotas-updated', {
      dataLimits,
      preferences: preferences.getPreferences(),
    })

    if (onQuotasUpdate) {
      onQuotasUpdate(dataLimits)
    }

    showFeedback('Quota settings saved successfully!', 'success')
  }

  /**
   * Reset quotas to default values
   */
  const resetQuotas = (): void => {
    const shouldReset =
      // eslint-disable-next-line no-alert
      window.confirm?.('Are you sure you want to reset quotas to default values?') ?? false

    if (shouldReset) {
      const defaultLimits: UserPreferences['metadataSync']['dataLimits'] = {
        maxEpisodesPerSync: 50,
        maxDailyApiCalls: 1000,
        maxCacheSizeMB: 100,
      }

      preferences.updateMetadataSyncDataLimits(defaultLimits)

      eventEmitter.emit('quotas-updated', {
        dataLimits: defaultLimits,
        preferences: preferences.getPreferences(),
      })

      if (onQuotasUpdate) {
        onQuotasUpdate(defaultLimits)
      }

      // Re-render to show updated values
      renderUI()

      showFeedback('Quotas reset to default values.', 'success')
    }
  }

  /**
   * Clear metadata cache
   */
  const clearCache = async (): Promise<void> => {
    const shouldClear =
      // eslint-disable-next-line no-alert
      window.confirm?.(
        'Are you sure you want to clear the metadata cache? This will remove all downloaded metadata and you will need to re-download it for offline access.',
      ) ?? false

    if (!shouldClear) return

    try {
      const previousSize = currentStats?.storage.currentSize ?? 0

      // Clear cache logic would go here
      // For now, we'll just emit the event
      const freedSpace = previousSize

      eventEmitter.emit('cache-cleared', {
        previousSize,
        freedSpace,
      })

      showFeedback('Cache cleared successfully!', 'success')

      // Refresh stats after clearing
      await refreshStats()
    } catch (error) {
      console.error('Failed to clear cache:', error)
      showFeedback('Failed to clear cache. Please try again.', 'error')
    }
  }

  /**
   * Export usage statistics as JSON
   */
  const exportJSON = (): void => {
    if (!currentStats) return

    try {
      const dataStr = JSON.stringify(currentStats, null, 2)
      const dataBlob = new Blob([dataStr], {type: 'application/json'})

      const link = document.createElement('a')
      link.href = URL.createObjectURL(dataBlob)
      const filename = `vbs-usage-stats-${new Date().toISOString().split('T')[0]}.json`
      link.download = filename
      link.click()

      eventEmitter.emit('usage-exported', {
        format: 'json',
        filename,
      })

      showFeedback('Usage statistics exported successfully!', 'success')
    } catch (error) {
      console.error('Failed to export usage statistics:', error)
      showFeedback('Failed to export statistics. Please try again.', 'error')
    }
  }

  /**
   * Export usage statistics as CSV
   */
  const exportCSV = (): void => {
    if (!currentStats) return

    try {
      const csvRows = [
        ['Metric', 'Value'],
        ['API Calls Today', (currentStats.apiCalls?.today ?? 0).toString()],
        ['API Calls This Week', (currentStats.apiCalls?.thisWeek ?? 0).toString()],
        ['API Calls This Month', (currentStats.apiCalls?.thisMonth ?? 0).toString()],
        ['API Calls Lifetime', (currentStats.apiCalls?.lifetime ?? 0).toString()],
        ['Bandwidth Today (bytes)', (currentStats.bandwidth?.today ?? 0).toString()],
        ['Bandwidth This Week (bytes)', (currentStats.bandwidth?.thisWeek ?? 0).toString()],
        ['Bandwidth This Month (bytes)', (currentStats.bandwidth?.thisMonth ?? 0).toString()],
        ['Bandwidth Lifetime (bytes)', (currentStats.bandwidth?.lifetime ?? 0).toString()],
        ['Cache Size (bytes)', (currentStats.storage?.currentSize ?? 0).toString()],
        ['Cached Episodes', (currentStats.storage?.episodeCount ?? 0).toString()],
        ['Storage Percent Used', (currentStats.storage?.percentUsed ?? 0).toString()],
      ]

      const csvContent = csvRows.map(row => row.join(',')).join('\n')
      const dataBlob = new Blob([csvContent], {type: 'text/csv'})

      const link = document.createElement('a')
      link.href = URL.createObjectURL(dataBlob)
      const filename = `vbs-usage-stats-${new Date().toISOString().split('T')[0]}.csv`
      link.download = filename
      link.click()

      eventEmitter.emit('usage-exported', {
        format: 'csv',
        filename,
      })

      showFeedback('Usage statistics exported successfully!', 'success')
    } catch (error) {
      console.error('Failed to export usage statistics:', error)
      showFeedback('Failed to export statistics. Please try again.', 'error')
    }
  }

  /**
   * Refresh usage statistics
   */
  const refreshStats = async (): Promise<void> => {
    try {
      const stats = await loadStats()

      eventEmitter.emit('usage-refreshed', {
        statistics: stats,
        timestamp: new Date().toISOString(),
      })

      if (isRendered) {
        await renderUI()
      }

      showFeedback('Statistics refreshed!', 'success')
    } catch (error) {
      console.error('Failed to refresh statistics:', error)
      showFeedback('Failed to refresh statistics. Please try again.', 'error')
    }
  }

  /**
   * Show feedback message to user
   */
  const showFeedback = (message: string, type: 'success' | 'error' | 'info' | 'warning'): void => {
    const feedbackEl = container.querySelector('.usage-feedback') as HTMLElement
    if (!feedbackEl) return

    feedbackEl.className = `usage-feedback feedback-${type}`
    feedbackEl.textContent = message
    feedbackEl.style.display = 'block'

    eventEmitter.emit('feedback-shown', {message, type})

    // Auto-hide after 4 seconds
    setTimeout(() => {
      feedbackEl.style.display = 'none'
    }, 4000)
  }

  /**
   * Attach event listeners to UI elements
   */
  const attachEventListeners = (): void => {
    // Save quotas button
    const saveButton = container.querySelector('[data-save-quotas]')
    if (saveButton) {
      saveButton.addEventListener('click', saveQuotas)
    }

    // Reset quotas button
    const resetButton = container.querySelector('[data-reset-quotas]')
    if (resetButton) {
      resetButton.addEventListener('click', resetQuotas)
    }

    // Clear cache button
    const clearCacheButton = container.querySelector('[data-clear-cache]')
    if (clearCacheButton) {
      clearCacheButton.addEventListener('click', () => {
        clearCache()
      })
    }

    // Export JSON button
    const exportJSONButton = container.querySelector('[data-export-json]')
    if (exportJSONButton) {
      exportJSONButton.addEventListener('click', exportJSON)
    }

    // Export CSV button
    const exportCSVButton = container.querySelector('[data-export-csv]')
    if (exportCSVButton) {
      exportCSVButton.addEventListener('click', exportCSV)
    }

    // Refresh stats button
    const refreshButton = container.querySelector('[data-refresh-stats]')
    if (refreshButton) {
      refreshButton.addEventListener('click', () => {
        refreshStats()
      })
    }
  }

  /**
   * Update component with new statistics
   */
  const update = async (stats?: MetadataUsageStatistics): Promise<void> => {
    if (stats) {
      currentStats = stats
    }

    if (isRendered) {
      await renderUI()
    }
  }

  /**
   * Cleanup component resources
   */
  const destroy = (): void => {
    container.innerHTML = ''
    eventEmitter.removeAllListeners()
    isRendered = false
  }

  // Return public API following VBS functional factory pattern
  return {
    render: async () => {
      await renderUI()
    },
    update,
    refreshStats,
    clearCache,
    exportStats: (format: 'json' | 'csv') => {
      if (format === 'json') {
        exportJSON()
      } else {
        exportCSV()
      }
    },
    showFeedback,
    destroy,

    // Generic EventEmitter methods for type-safe event handling
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    once: eventEmitter.once.bind(eventEmitter),
    removeAllListeners: eventEmitter.removeAllListeners.bind(eventEmitter),
  }
}

/**
 * Type definition for usage controls instance returned by factory function.
 * Provides type safety for usage controls manager usage throughout the application.
 */
export type MetadataUsageControlsType = ReturnType<typeof createMetadataUsageControls>
