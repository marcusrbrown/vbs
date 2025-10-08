/**
 * Metadata Debug Panel Component
 *
 * Provides comprehensive debugging and visualization capabilities for the metadata enrichment system.
 * Follows VBS functional factory architecture with closure-based state management.
 *
 * Features:
 * - Data source status visualization with health monitoring
 * - Metadata quality metrics display with completeness indicators
 * - Sync operation progress tracking with cancellation support
 * - Manual refresh controls for individual episodes or bulk operations
 * - Storage usage statistics and cache management
 * - Recent operations log for troubleshooting
 * - Export debug information for support or analysis
 *
 * Integration:
 * - Integrates with existing preferences system for seamless UX
 * - Uses generic EventEmitter for type-safe event handling
 * - Follows VBS theme system with CSS custom properties
 * - Provides keyboard navigation and screen reader support
 */

import type {MetadataStorageAdapterInstance} from '../modules/metadata-storage.js'
import type {
  MetadataDebugPanelData,
  MetadataDebugPanelEvents,
  MetadataDebugPanelInstance,
  MetadataQueueInstance,
  MetadataSourceInstance,
  MetadataSourceType,
} from '../modules/types.js'
import {withSyncErrorHandling} from '../modules/error-handler.js'
import {createEventEmitter} from '../modules/events.js'

/**
 * Configuration for metadata debug panel component.
 */
export interface MetadataDebugPanelConfig {
  /** Container element for the debug panel */
  container: HTMLElement
  /** Metadata sources instance for data source operations */
  metadataSources: MetadataSourceInstance
  /** Metadata storage instance for cache operations */
  metadataStorage: MetadataStorageAdapterInstance
  /** Metadata queue instance for sync operations */
  metadataQueue: MetadataQueueInstance
  /** Initial visibility state */
  initiallyVisible?: boolean
  /** Enable expert mode features */
  expertMode?: boolean
}

/**
 * Create a metadata debug panel component instance.
 * Factory function following VBS functional factory architecture pattern.
 *
 * @param config - Configuration for the debug panel
 * @returns Metadata debug panel instance with full API
 */
export const createMetadataDebugPanel = (
  config: MetadataDebugPanelConfig,
): MetadataDebugPanelInstance => {
  const {container, metadataSources, metadataStorage, initiallyVisible = false} = config

  // Private state managed via closure variables
  let isVisible = initiallyVisible
  let currentData: MetadataDebugPanelData | null = null
  let bulkOperationCancelled = false
  let activeRefreshController: AbortController | null = null

  // DOM elements cache
  const elements: {
    panel?: HTMLElement
    sourcesContainer?: HTMLElement
    qualityMetricsContainer?: HTMLElement
    syncStatusContainer?: HTMLElement
    storageStatsContainer?: HTMLElement
    operationsLogContainer?: HTMLElement
    refreshAllButton?: HTMLButtonElement
    clearCacheButton?: HTMLButtonElement
    exportButton?: HTMLButtonElement
    closeButton?: HTMLButtonElement
    cancelOperationButton?: HTMLButtonElement
  } = {}

  // Generic EventEmitter for type-safe event handling
  const eventEmitter = createEventEmitter<MetadataDebugPanelEvents>()

  /**
   * Format bytes to human-readable string
   */
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`
  }

  /**
   * Format timestamp to relative time string
   */
  const formatRelativeTime = (timestamp: string | null): string => {
    if (!timestamp) return 'Never'

    const now = Date.now()
    const then = new Date(timestamp).getTime()
    const diff = now - then

    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return `${seconds}s ago`
  }

  /**
   * Render data source status visualization
   */
  const renderDataSources = (
    sourcesContainer: HTMLElement,
    sources: MetadataDebugPanelData['sources'],
  ): void => {
    const sourcesHTML = sources
      .map(source => {
        const healthClass = source.isHealthy ? 'source-healthy' : 'source-unhealthy'
        const enabledClass = source.enabled ? 'source-enabled' : 'source-disabled'
        const successRate =
          source.stats.totalRequests > 0
            ? Math.round((source.stats.successfulRequests / source.stats.totalRequests) * 100)
            : 0

        return `
        <div class="metadata-source-card ${healthClass} ${enabledClass}">
          <div class="source-header">
            <div class="source-title">
              <span class="source-icon">${source.isHealthy ? '✓' : '✗'}</span>
              <h4>${source.name}</h4>
            </div>
            <label class="source-toggle">
              <input
                type="checkbox"
                ${source.enabled ? 'checked' : ''}
                data-source="${source.id}"
                aria-label="Toggle ${source.name}"
              />
              <span class="toggle-label">${source.enabled ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>

          <div class="source-metrics">
            <div class="metric">
              <span class="metric-label">Success Rate</span>
              <span class="metric-value">${successRate}%</span>
            </div>
            <div class="metric">
              <span class="metric-label">Avg Latency</span>
              <span class="metric-value">${source.stats.averageLatency}ms</span>
            </div>
            <div class="metric">
              <span class="metric-label">Uptime</span>
              <span class="metric-value">${Math.round(source.reliability.uptime * 100)}%</span>
            </div>
            <div class="metric">
              <span class="metric-label">Accuracy</span>
              <span class="metric-value">${Math.round(source.reliability.accuracy * 100)}%</span>
            </div>
          </div>

          ${
            source.error
              ? `
          <div class="source-error">
            <span class="error-icon">⚠️</span>
            <span class="error-message">${source.error.message}</span>
            <span class="error-time">${formatRelativeTime(source.error.timestamp)}</span>
          </div>
          `
              : ''
          }

          <div class="source-stats">
            <span>Total Requests: ${source.stats.totalRequests}</span>
            <span>Last Accessed: ${formatRelativeTime(source.lastAccessed)}</span>
          </div>
        </div>
      `
      })
      .join('')

    sourcesContainer.innerHTML = `
      <h3>Data Sources</h3>
      <div class="sources-grid">
        ${sourcesHTML}
      </div>
    `

    // Attach event listeners for source toggles
    sourcesContainer.querySelectorAll<HTMLInputElement>('input[data-source]').forEach(toggle => {
      toggle.addEventListener('change', e => {
        const target = e.target as HTMLInputElement
        const sourceId = target.dataset.source as MetadataSourceType
        const enabled = target.checked

        withSyncErrorHandling(() => {
          eventEmitter.emit('source-toggled', {source: sourceId, enabled})
        }, 'Failed to toggle metadata source')()
      })
    })
  }

  /**
   * Render metadata quality metrics visualization
   */
  const renderQualityMetrics = (
    metricsContainer: HTMLElement,
    metrics: MetadataDebugPanelData['qualityMetrics'],
  ): void => {
    const completenessPercent = Math.round(metrics.averageCompleteness * 100)
    const confidencePercent = Math.round(metrics.averageConfidence * 100)

    metricsContainer.innerHTML = `
      <h3>Metadata Quality</h3>
      <div class="quality-metrics-grid">
        <div class="quality-card">
          <div class="quality-label">Total Episodes</div>
          <div class="quality-value">${metrics.totalEpisodes}</div>
        </div>

        <div class="quality-card">
          <div class="quality-label">Complete Metadata</div>
          <div class="quality-value">${metrics.completeMetadata}</div>
          <div class="quality-progress">
            <div class="progress-bar" style="width: ${(metrics.completeMetadata / metrics.totalEpisodes) * 100}%"></div>
          </div>
        </div>

        <div class="quality-card">
          <div class="quality-label">Partial Metadata</div>
          <div class="quality-value">${metrics.partialMetadata}</div>
          <div class="quality-progress">
            <div class="progress-bar warning" style="width: ${(metrics.partialMetadata / metrics.totalEpisodes) * 100}%"></div>
          </div>
        </div>

        <div class="quality-card">
          <div class="quality-label">No Metadata</div>
          <div class="quality-value">${metrics.noMetadata}</div>
          <div class="quality-progress">
            <div class="progress-bar error" style="width: ${(metrics.noMetadata / metrics.totalEpisodes) * 100}%"></div>
          </div>
        </div>

        <div class="quality-card">
          <div class="quality-label">Avg Completeness</div>
          <div class="quality-value">${completenessPercent}%</div>
        </div>

        <div class="quality-card">
          <div class="quality-label">Avg Confidence</div>
          <div class="quality-value">${confidencePercent}%</div>
        </div>
      </div>

      <div class="freshness-metrics">
        <h4>Metadata Freshness</h4>
        <div class="freshness-grid">
          <div class="freshness-item">
            <span class="freshness-label">Fresh (&lt; 7 days)</span>
            <span class="freshness-value">${metrics.freshness.fresh}</span>
          </div>
          <div class="freshness-item">
            <span class="freshness-label">Stale (7-30 days)</span>
            <span class="freshness-value">${metrics.freshness.stale}</span>
          </div>
          <div class="freshness-item">
            <span class="freshness-label">Expired (&gt; 30 days)</span>
            <span class="freshness-value">${metrics.freshness.expired}</span>
          </div>
        </div>
      </div>
    `
  }

  /**
   * Render sync status visualization
   */
  const renderSyncStatus = (
    statusContainer: HTMLElement,
    status: MetadataDebugPanelData['syncStatus'],
  ): void => {
    const activeClass = status.isActive ? 'sync-active' : 'sync-idle'

    statusContainer.innerHTML = `
      <h3>Sync Status</h3>
      <div class="sync-status-card ${activeClass}">
        ${
          status.isActive && status.progress != null
            ? `
          <div class="sync-progress">
            <div class="sync-header">
              <span class="sync-operation">${status.operationType}</span>
              <span class="sync-percentage">${status.progress.percentComplete}%</span>
            </div>
            <div class="sync-progress-bar">
              <div class="progress-fill" style="width: ${status.progress.percentComplete}%"></div>
            </div>
            <div class="sync-details">
              <span>${status.progress.completedJobs} / ${status.progress.totalJobs} completed</span>
              ${status.progress.failedJobs > 0 ? `<span class="sync-failures">${status.progress.failedJobs} failed</span>` : ''}
              ${status.estimatedCompletion ? `<span>ETA: ${status.estimatedCompletion}</span>` : ''}
            </div>
            ${
              status.cancellable
                ? `
            <button class="cancel-operation-btn" data-cancel-operation>
              Cancel Operation
            </button>
            `
                : ''
            }
          </div>
        `
            : `
          <div class="sync-idle-state">
            <span class="sync-icon">✓</span>
            <span>No active sync operations</span>
          </div>
        `
        }

        <div class="queue-stats">
          <h4>Queue Statistics</h4>
          <div class="queue-metrics">
            <div class="queue-metric">
              <span class="queue-label">Pending</span>
              <span class="queue-value">${status.queueStats.pendingJobs}</span>
            </div>
            <div class="queue-metric">
              <span class="queue-label">In Progress</span>
              <span class="queue-value">${status.queueStats.inProgressJobs}</span>
            </div>
            <div class="queue-metric">
              <span class="queue-label">Failed</span>
              <span class="queue-value">${status.queueStats.failedJobs}</span>
            </div>
          </div>
        </div>
      </div>
    `

    // Attach cancel button listener if present
    const cancelButton = statusContainer.querySelector<HTMLButtonElement>('[data-cancel-operation]')
    if (cancelButton) {
      cancelButton.addEventListener('click', () => {
        withSyncErrorHandling(() => {
          cancelBulkOperation()
        }, 'Failed to cancel operation')()
      })
    }
  }

  /**
   * Render storage statistics
   */
  const renderStorageStats = (
    statsContainer: HTMLElement,
    stats: MetadataDebugPanelData['storageStats'],
  ): void => {
    statsContainer.innerHTML = `
      <h3>Storage Usage</h3>
      <div class="storage-stats-card">
        <div class="storage-visual">
          <div class="storage-bar">
            <div class="storage-used" style="width: ${stats.percentUsed}%"></div>
          </div>
          <span class="storage-label">${stats.percentUsed}% used</span>
        </div>

        <div class="storage-metrics">
          <div class="storage-metric">
            <span class="metric-label">Total Entries</span>
            <span class="metric-value">${stats.totalEntries}</span>
          </div>
          <div class="storage-metric">
            <span class="metric-label">Used Space</span>
            <span class="metric-value">${formatBytes(stats.usedSpace)}</span>
          </div>
          <div class="storage-metric">
            <span class="metric-label">Max Quota</span>
            <span class="metric-value">${formatBytes(stats.maxQuota)}</span>
          </div>
        </div>
      </div>
    `
  }

  /**
   * Render recent operations log
   */
  const renderOperationsLog = (
    logContainer: HTMLElement,
    operations: MetadataDebugPanelData['recentOperations'],
  ): void => {
    const operationsHTML = operations
      .slice(0, 10)
      .map(op => {
        const statusClass =
          op.status === 'success'
            ? 'op-success'
            : op.status === 'failed'
              ? 'op-failed'
              : 'op-cancelled'
        const statusIcon = op.status === 'success' ? '✓' : op.status === 'failed' ? '✗' : '⊘'

        return `
        <div class="operation-log-entry ${statusClass}">
          <span class="op-icon">${statusIcon}</span>
          <div class="op-content">
            <div class="op-header">
              <span class="op-type">${op.type}</span>
              ${op.episodeId ? `<span class="op-episode">${op.episodeId}</span>` : ''}
              ${op.source ? `<span class="op-source">${op.source}</span>` : ''}
            </div>
            <div class="op-footer">
              <span class="op-time">${formatRelativeTime(op.timestamp)}</span>
              ${op.duration ? `<span class="op-duration">${op.duration}ms</span>` : ''}
              ${op.error ? `<span class="op-error">${op.error}</span>` : ''}
            </div>
          </div>
        </div>
      `
      })
      .join('')

    logContainer.innerHTML = `
      <h3>Recent Operations</h3>
      <div class="operations-log">
        ${operations.length > 0 ? operationsHTML : '<p class="empty-state">No recent operations</p>'}
      </div>
    `
  }

  /**
   * Render the complete debug panel UI
   */
  const render = (): void => {
    if (!currentData) {
      container.innerHTML = '<div class="metadata-debug-panel loading">Loading debug panel...</div>'
      return
    }

    // Create main panel structure
    const panelHTML = `
      <div class="metadata-debug-panel ${isVisible ? 'visible' : 'hidden'}">
        <div class="debug-panel-header">
          <h2>Metadata Debug Panel</h2>
          <div class="header-actions">
            <button class="btn-refresh-all" data-refresh-all aria-label="Refresh all metadata">
              🔄 Refresh All
            </button>
            <button class="btn-clear-cache" data-clear-cache aria-label="Clear metadata cache">
              🗑️ Clear Cache
            </button>
            <button class="btn-export" data-export aria-label="Export debug information">
              📥 Export
            </button>
            <button class="btn-close" data-close aria-label="Close debug panel">
              ✕
            </button>
          </div>
        </div>

        <div class="debug-panel-content">
          <div class="debug-section" data-sources></div>
          <div class="debug-section" data-quality-metrics></div>
          <div class="debug-section" data-sync-status></div>
          <div class="debug-section" data-storage-stats></div>
          <div class="debug-section" data-operations-log></div>
        </div>
      </div>
    `

    container.innerHTML = panelHTML

    // Cache DOM elements
    const panel = container.querySelector<HTMLElement>('.metadata-debug-panel')
    const sourcesContainer = container.querySelector<HTMLElement>('[data-sources]')
    const qualityMetricsContainer = container.querySelector<HTMLElement>('[data-quality-metrics]')
    const syncStatusContainer = container.querySelector<HTMLElement>('[data-sync-status]')
    const storageStatsContainer = container.querySelector<HTMLElement>('[data-storage-stats]')
    const operationsLogContainer = container.querySelector<HTMLElement>('[data-operations-log]')
    const refreshAllButton = container.querySelector<HTMLButtonElement>('[data-refresh-all]')
    const clearCacheButton = container.querySelector<HTMLButtonElement>('[data-clear-cache]')
    const exportButton = container.querySelector<HTMLButtonElement>('[data-export]')
    const closeButton = container.querySelector<HTMLButtonElement>('[data-close]')

    if (panel) elements.panel = panel
    if (sourcesContainer) elements.sourcesContainer = sourcesContainer
    if (qualityMetricsContainer) elements.qualityMetricsContainer = qualityMetricsContainer
    if (syncStatusContainer) elements.syncStatusContainer = syncStatusContainer
    if (storageStatsContainer) elements.storageStatsContainer = storageStatsContainer
    if (operationsLogContainer) elements.operationsLogContainer = operationsLogContainer
    if (refreshAllButton) elements.refreshAllButton = refreshAllButton
    if (clearCacheButton) elements.clearCacheButton = clearCacheButton
    if (exportButton) elements.exportButton = exportButton
    if (closeButton) elements.closeButton = closeButton

    // Render individual sections
    if (elements.sourcesContainer) {
      renderDataSources(elements.sourcesContainer, currentData.sources)
    }
    if (elements.qualityMetricsContainer) {
      renderQualityMetrics(elements.qualityMetricsContainer, currentData.qualityMetrics)
    }
    if (elements.syncStatusContainer) {
      renderSyncStatus(elements.syncStatusContainer, currentData.syncStatus)
    }
    if (elements.storageStatsContainer) {
      renderStorageStats(elements.storageStatsContainer, currentData.storageStats)
    }
    if (elements.operationsLogContainer) {
      renderOperationsLog(elements.operationsLogContainer, currentData.recentOperations)
    }

    // Attach event listeners
    attachEventListeners()
  }

  /**
   * Attach event listeners to interactive elements
   */
  const attachEventListeners = (): void => {
    if (elements.refreshAllButton) {
      elements.refreshAllButton.addEventListener('click', () => {
        withSyncErrorHandling(async () => {
          // Trigger bulk refresh - implementation will depend on available episode data
          eventEmitter.emit('bulk-refresh-started', {episodeIds: [], totalCount: 0})
        }, 'Failed to start bulk refresh')()
      })
    }

    if (elements.clearCacheButton) {
      elements.clearCacheButton.addEventListener('click', () => {
        withSyncErrorHandling(async () => {
          await clearCache()
        }, 'Failed to clear cache')()
      })
    }

    if (elements.exportButton) {
      elements.exportButton.addEventListener('click', () => {
        withSyncErrorHandling(() => {
          const debugInfo = exportDebugInfo()
          const blob = new Blob([debugInfo], {type: 'application/json'})
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `vbs-debug-${Date.now()}.json`
          a.click()
          URL.revokeObjectURL(url)
        }, 'Failed to export debug information')()
      })
    }

    if (elements.closeButton) {
      elements.closeButton.addEventListener('click', () => {
        hide()
      })
    }
  }

  /**
   * Show the debug panel
   */
  const show = (): void => {
    isVisible = true
    if (elements.panel) {
      elements.panel.classList.remove('hidden')
      elements.panel.classList.add('visible')
    }
    eventEmitter.emit('panel-visibility-changed', {isVisible: true})
  }

  /**
   * Hide the debug panel
   */
  const hide = (): void => {
    isVisible = false
    if (elements.panel) {
      elements.panel.classList.remove('visible')
      elements.panel.classList.add('hidden')
    }
    eventEmitter.emit('panel-visibility-changed', {isVisible: false})
  }

  /**
   * Toggle visibility of the debug panel
   */
  const toggle = (): void => {
    if (isVisible) {
      hide()
    } else {
      show()
    }
  }

  /**
   * Update debug panel with latest data
   */
  const update = (data?: Partial<MetadataDebugPanelData>): void => {
    if (data) {
      currentData = currentData ? {...currentData, ...data} : (data as MetadataDebugPanelData)
    }
    render()
  }

  /**
   * Refresh metadata for specific episode
   */
  const refreshEpisode = async (episodeId: string, source?: MetadataSourceType): Promise<void> => {
    eventEmitter.emit('refresh-requested', {
      episodeId,
      ...(source && {source}),
    })
    await metadataSources.enrichEpisode(episodeId)
  }

  /**
   * Trigger bulk metadata refresh
   */
  const refreshBulk = async (episodeIds: string[]): Promise<void> => {
    bulkOperationCancelled = false
    activeRefreshController = new AbortController()

    const startTime = Date.now()
    let successCount = 0
    let failCount = 0

    eventEmitter.emit('bulk-refresh-started', {episodeIds, totalCount: episodeIds.length})

    try {
      const results = await metadataSources.enrichEpisodeBatch(episodeIds)

      results.forEach(result => {
        if (bulkOperationCancelled) return
        if (result) {
          successCount++
        } else {
          failCount++
        }
      })

      const duration = Date.now() - startTime

      if (bulkOperationCancelled) {
        eventEmitter.emit('bulk-refresh-cancelled', {
          processedCount: successCount + failCount,
          remainingCount: episodeIds.length - (successCount + failCount),
        })
      } else {
        eventEmitter.emit('bulk-refresh-completed', {successCount, failCount, duration})
      }
    } finally {
      activeRefreshController = null
    }
  }

  /**
   * Cancel ongoing bulk operation
   */
  const cancelBulkOperation = (): void => {
    bulkOperationCancelled = true
    if (activeRefreshController) {
      activeRefreshController.abort()
      activeRefreshController = null
    }
  }

  /**
   * Clear metadata cache
   */
  const clearCache = async (): Promise<void> => {
    const result = await metadataStorage.cleanupExpiredMetadata()
    eventEmitter.emit('cache-cleared', {
      clearedEntries: result.removedEntries,
      freedSpace: result.freedSpace,
    })
    await metadataSources.clearCache()
  }

  /**
   * Export debug information as JSON
   */
  const exportDebugInfo = (): string => {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      panelData: currentData,
      healthStatus: metadataSources.getHealthStatus(),
      usageAnalytics: metadataSources.getUsageAnalytics(),
    }
    return JSON.stringify(debugInfo, null, 2)
  }

  /**
   * Destroy the component and cleanup resources
   */
  const destroy = (): void => {
    cancelBulkOperation()
    eventEmitter.removeAllListeners()
    container.innerHTML = ''
  }

  // Public API
  return {
    render,
    show,
    hide,
    toggle,
    update,
    refreshEpisode,
    refreshBulk,
    cancelBulkOperation,
    clearCache,
    exportDebugInfo,
    destroy,
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    once: eventEmitter.once.bind(eventEmitter),
    removeAllListeners: eventEmitter.removeAllListeners.bind(eventEmitter),
  }
}
