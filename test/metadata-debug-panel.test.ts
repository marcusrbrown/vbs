/**
 * Test suite for Metadata Debug Panel component
 * Validates factory instantiation, event handling, UI interactions, and accessibility features
 */

import type {MetadataStorageAdapterInstance} from '../src/modules/metadata-storage.js'
import type {PreferencesInstance} from '../src/modules/preferences.js'
import type {
  MetadataDebugPanelData,
  MetadataQueueInstance,
  MetadataSourceInstance,
} from '../src/modules/types.js'
import {JSDOM} from 'jsdom'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {createMetadataDebugPanel} from '../src/components/metadata-debug-panel.js'

describe('createMetadataDebugPanel', () => {
  let container: HTMLElement
  let mockMetadataSources: MetadataSourceInstance
  let mockMetadataStorage: MetadataStorageAdapterInstance
  let mockMetadataQueue: MetadataQueueInstance
  let mockPreferences: PreferencesInstance

  beforeEach(() => {
    // Set up DOM environment
    const dom = new JSDOM('<!DOCTYPE html><body><div id="container"></div></body>')
    globalThis.document = dom.window.document as unknown as Document
    globalThis.HTMLElement = dom.window.HTMLElement as unknown as typeof HTMLElement
    globalThis.Element = dom.window.Element as unknown as typeof Element

    container = document.querySelector('#container') as HTMLElement

    // Mock metadata sources
    mockMetadataSources = {
      enrichEpisode: vi.fn().mockResolvedValue(null),
      enrichEpisodeBatch: vi.fn().mockResolvedValue(new Map()),
      getHealthStatus: vi.fn().mockReturnValue({}),
      getUsageAnalytics: vi.fn().mockReturnValue({}),
      clearCache: vi.fn(),
      resetAnalytics: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      once: vi.fn(),
    }

    // Mock metadata storage
    mockMetadataStorage = {
      storeMetadata: vi.fn().mockResolvedValue(undefined),
      getMetadata: vi.fn().mockResolvedValue(null),
      hasValidMetadata: vi.fn().mockResolvedValue(false),
      updateMetadataFields: vi.fn().mockResolvedValue(undefined),
      removeMetadata: vi.fn().mockResolvedValue(undefined),
      getAllMetadata: vi.fn().mockResolvedValue({}),
      storeBatchMetadata: vi.fn().mockResolvedValue(undefined),
      cleanupExpiredMetadata: vi.fn().mockResolvedValue({removedEntries: 0, freedSpace: 0}),
      getStorageStats: vi
        .fn()
        .mockResolvedValue({totalEntries: 0, usedSpace: 0, maxQuota: 100000000}),
      validateQuota: vi.fn().mockResolvedValue(true),
      clear: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      off: vi.fn(),
      once: vi.fn(),
      removeAllListeners: vi.fn(),
    }

    // Mock metadata queue
    mockMetadataQueue = {
      addJob: vi.fn().mockReturnValue('job-id'),
      cancelJob: vi.fn().mockReturnValue(true),
      cancelAllJobs: vi.fn().mockReturnValue(0),
      getJob: vi.fn().mockReturnValue(null),
      getJobs: vi.fn().mockReturnValue([]),
      getStatus: vi.fn().mockReturnValue({
        totalJobs: 0,
        pendingJobs: 0,
        runningJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
      }),
      start: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      updateConfig: vi.fn(),
      applyUserPreferences: vi.fn(),
      clearCompleted: vi.fn().mockReturnValue(0),
      getProgress: vi.fn().mockReturnValue([]),
      getSyncCapability: vi.fn().mockReturnValue({
        isAvailable: true,
        fallbackStrategy: 'immediate',
      }),
      updateSyncCapability: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      once: vi.fn(),
    }

    // Mock preferences
    mockPreferences = {
      getExpertMode: vi.fn().mockReturnValue(false),
      setExpertMode: vi.fn(),
    } as unknown as PreferencesInstance
  })

  it('should create debug panel instance with factory function', () => {
    const debugPanel = createMetadataDebugPanel({
      container,
      metadataSources: mockMetadataSources,
      metadataStorage: mockMetadataStorage,
      metadataQueue: mockMetadataQueue,
      preferences: mockPreferences,
    })

    expect(debugPanel).toBeDefined()
    expect(typeof debugPanel.render).toBe('function')
    expect(typeof debugPanel.show).toBe('function')
    expect(typeof debugPanel.hide).toBe('function')
    expect(typeof debugPanel.toggle).toBe('function')
    expect(typeof debugPanel.update).toBe('function')
    expect(typeof debugPanel.refreshEpisode).toBe('function')
    expect(typeof debugPanel.refreshBulk).toBe('function')
    expect(typeof debugPanel.cancelBulkOperation).toBe('function')
    expect(typeof debugPanel.clearCache).toBe('function')
    expect(typeof debugPanel.exportDebugInfo).toBe('function')
    expect(typeof debugPanel.destroy).toBe('function')
  })

  it('should provide EventEmitter methods', () => {
    const debugPanel = createMetadataDebugPanel({
      container,
      metadataSources: mockMetadataSources,
      metadataStorage: mockMetadataStorage,
      metadataQueue: mockMetadataQueue,
      preferences: mockPreferences,
    })

    expect(typeof debugPanel.on).toBe('function')
    expect(typeof debugPanel.off).toBe('function')
    expect(typeof debugPanel.once).toBe('function')
    expect(typeof debugPanel.removeAllListeners).toBe('function')
  })

  it('should render loading state when no data is provided', () => {
    const debugPanel = createMetadataDebugPanel({
      container,
      metadataSources: mockMetadataSources,
      metadataStorage: mockMetadataStorage,
      metadataQueue: mockMetadataQueue,
      preferences: mockPreferences,
    })

    debugPanel.render()

    expect(container.innerHTML).toContain('Loading debug panel')
  })

  it('should render complete debug panel with data', () => {
    const debugPanel = createMetadataDebugPanel({
      container,
      metadataSources: mockMetadataSources,
      metadataStorage: mockMetadataStorage,
      metadataQueue: mockMetadataQueue,
      preferences: mockPreferences,
    })

    const mockData: MetadataDebugPanelData = {
      sources: [
        {
          id: 'tmdb',
          name: 'TMDB',
          enabled: true,
          isHealthy: true,
          reliability: {uptime: 0.99, accuracy: 0.95, latency: 200},
          stats: {
            totalRequests: 100,
            successfulRequests: 95,
            failedRequests: 5,
            averageLatency: 200,
          },
          lastAccessed: new Date().toISOString(),
        },
      ],
      qualityMetrics: {
        totalEpisodes: 800,
        completeMetadata: 600,
        partialMetadata: 150,
        noMetadata: 50,
        averageCompleteness: 0.8,
        averageConfidence: 0.9,
        freshness: {fresh: 500, stale: 200, expired: 100},
      },
      syncStatus: {
        isActive: false,
        queueStats: {pendingJobs: 0, inProgressJobs: 0, failedJobs: 0},
        cancellable: false,
      },
      storageStats: {totalEntries: 600, usedSpace: 50000000, maxQuota: 100000000, percentUsed: 50},
      recentOperations: [],
    }

    debugPanel.update(mockData)

    expect(container.innerHTML).toContain('Metadata Debug Panel')
    expect(container.innerHTML).toContain('Data Sources')
    expect(container.innerHTML).toContain('Metadata Quality')
    expect(container.innerHTML).toContain('Sync Status')
    expect(container.innerHTML).toContain('Storage Usage')
  })

  it('should emit events when actions are triggered', () => {
    const debugPanel = createMetadataDebugPanel({
      container,
      metadataSources: mockMetadataSources,
      metadataStorage: mockMetadataStorage,
      metadataQueue: mockMetadataQueue,
      preferences: mockPreferences,
    })

    const visibilityListener = vi.fn()
    debugPanel.on('panel-visibility-changed', visibilityListener)

    debugPanel.show()
    expect(visibilityListener).toHaveBeenCalledWith({isVisible: true})

    debugPanel.hide()
    expect(visibilityListener).toHaveBeenCalledWith({isVisible: false})
  })

  it('should handle refresh episode correctly', async () => {
    const debugPanel = createMetadataDebugPanel({
      container,
      metadataSources: mockMetadataSources,
      metadataStorage: mockMetadataStorage,
      metadataQueue: mockMetadataQueue,
      preferences: mockPreferences,
    })

    const refreshListener = vi.fn()
    debugPanel.on('refresh-requested', refreshListener)

    await debugPanel.refreshEpisode('tos_s1_e1')

    expect(refreshListener).toHaveBeenCalledWith({episodeId: 'tos_s1_e1'})
    expect(mockMetadataSources.enrichEpisode).toHaveBeenCalledWith('tos_s1_e1')
  })

  it('should handle bulk refresh correctly', async () => {
    const debugPanel = createMetadataDebugPanel({
      container,
      metadataSources: mockMetadataSources,
      metadataStorage: mockMetadataStorage,
      metadataQueue: mockMetadataQueue,
      preferences: mockPreferences,
    })

    const bulkStartListener = vi.fn()
    const bulkCompleteListener = vi.fn()
    debugPanel.on('bulk-refresh-started', bulkStartListener)
    debugPanel.on('bulk-refresh-completed', bulkCompleteListener)

    const episodeIds = ['tos_s1_e1', 'tos_s1_e2', 'tos_s1_e3']
    mockMetadataSources.enrichEpisodeBatch = vi.fn().mockResolvedValue(
      new Map([
        ['tos_s1_e1', {episodeId: 'tos_s1_e1'}],
        ['tos_s1_e2', {episodeId: 'tos_s1_e2'}],
        ['tos_s1_e3', null],
      ]),
    )

    await debugPanel.refreshBulk(episodeIds)

    expect(bulkStartListener).toHaveBeenCalledWith({episodeIds, totalCount: 3})
    expect(bulkCompleteListener).toHaveBeenCalledWith({
      successCount: 2,
      failCount: 1,
      duration: expect.any(Number),
    })
  })

  it('should handle bulk refresh cancellation', async () => {
    const debugPanel = createMetadataDebugPanel({
      container,
      metadataSources: mockMetadataSources,
      metadataStorage: mockMetadataStorage,
      metadataQueue: mockMetadataQueue,
      preferences: mockPreferences,
    })

    const cancelListener = vi.fn()
    debugPanel.on('bulk-refresh-cancelled', cancelListener)

    const episodeIds = ['tos_s1_e1', 'tos_s1_e2', 'tos_s1_e3']

    // Start bulk refresh with delayed resolution
    const bulkPromise = debugPanel.refreshBulk(episodeIds)

    // Cancel immediately
    debugPanel.cancelBulkOperation()

    await bulkPromise

    // Verify cancellation was triggered
    expect(cancelListener).toHaveBeenCalled()
  })

  it('should clear cache correctly', async () => {
    const debugPanel = createMetadataDebugPanel({
      container,
      metadataSources: mockMetadataSources,
      metadataStorage: mockMetadataStorage,
      metadataQueue: mockMetadataQueue,
      preferences: mockPreferences,
    })

    const cacheListener = vi.fn()
    debugPanel.on('cache-cleared', cacheListener)

    mockMetadataStorage.cleanupExpiredMetadata = vi.fn().mockResolvedValue({
      removedEntries: 10,
      freedSpace: 5000000,
    })

    await debugPanel.clearCache()

    expect(cacheListener).toHaveBeenCalledWith({clearedEntries: 10, freedSpace: 5000000})
    expect(mockMetadataStorage.cleanupExpiredMetadata).toHaveBeenCalled()
    expect(mockMetadataSources.clearCache).toHaveBeenCalled()
  })

  it('should export debug information correctly', () => {
    const debugPanel = createMetadataDebugPanel({
      container,
      metadataSources: mockMetadataSources,
      metadataStorage: mockMetadataStorage,
      metadataQueue: mockMetadataQueue,
      preferences: mockPreferences,
    })

    const mockData: MetadataDebugPanelData = {
      sources: [],
      qualityMetrics: {
        totalEpisodes: 800,
        completeMetadata: 600,
        partialMetadata: 150,
        noMetadata: 50,
        averageCompleteness: 0.8,
        averageConfidence: 0.9,
        freshness: {fresh: 500, stale: 200, expired: 100},
      },
      syncStatus: {
        isActive: false,
        queueStats: {pendingJobs: 0, inProgressJobs: 0, failedJobs: 0},
        cancellable: false,
      },
      storageStats: {totalEntries: 600, usedSpace: 50000000, maxQuota: 100000000, percentUsed: 50},
      recentOperations: [],
    }

    debugPanel.update(mockData)

    const exportedData = debugPanel.exportDebugInfo()
    const parsed = JSON.parse(exportedData)

    expect(parsed).toHaveProperty('timestamp')
    expect(parsed).toHaveProperty('panelData')
    expect(parsed).toHaveProperty('healthStatus')
    expect(parsed).toHaveProperty('usageAnalytics')
  })

  it('should toggle visibility correctly', () => {
    const debugPanel = createMetadataDebugPanel({
      container,
      metadataSources: mockMetadataSources,
      metadataStorage: mockMetadataStorage,
      metadataQueue: mockMetadataQueue,
      preferences: mockPreferences,
      initiallyVisible: false,
    })

    const mockData: MetadataDebugPanelData = {
      sources: [],
      qualityMetrics: {
        totalEpisodes: 0,
        completeMetadata: 0,
        partialMetadata: 0,
        noMetadata: 0,
        averageCompleteness: 0,
        averageConfidence: 0,
        freshness: {fresh: 0, stale: 0, expired: 0},
      },
      syncStatus: {
        isActive: false,
        queueStats: {pendingJobs: 0, inProgressJobs: 0, failedJobs: 0},
        cancellable: false,
      },
      storageStats: {totalEntries: 0, usedSpace: 0, maxQuota: 100000000, percentUsed: 0},
      recentOperations: [],
    }

    debugPanel.update(mockData)

    const visibilityListener = vi.fn()
    debugPanel.on('panel-visibility-changed', visibilityListener)

    debugPanel.toggle()
    expect(visibilityListener).toHaveBeenCalledWith({isVisible: true})

    debugPanel.toggle()
    expect(visibilityListener).toHaveBeenCalledWith({isVisible: false})
  })

  it('should handle one-time listeners correctly', () => {
    const debugPanel = createMetadataDebugPanel({
      container,
      metadataSources: mockMetadataSources,
      metadataStorage: mockMetadataStorage,
      metadataQueue: mockMetadataQueue,
      preferences: mockPreferences,
    })

    const onceListener = vi.fn()
    debugPanel.once('panel-visibility-changed', onceListener)

    debugPanel.show()
    debugPanel.hide()

    expect(onceListener).toHaveBeenCalledTimes(1)
  })

  it('should cleanup resources on destroy', () => {
    const debugPanel = createMetadataDebugPanel({
      container,
      metadataSources: mockMetadataSources,
      metadataStorage: mockMetadataStorage,
      metadataQueue: mockMetadataQueue,
      preferences: mockPreferences,
    })

    const mockData: MetadataDebugPanelData = {
      sources: [],
      qualityMetrics: {
        totalEpisodes: 0,
        completeMetadata: 0,
        partialMetadata: 0,
        noMetadata: 0,
        averageCompleteness: 0,
        averageConfidence: 0,
        freshness: {fresh: 0, stale: 0, expired: 0},
      },
      syncStatus: {
        isActive: false,
        queueStats: {pendingJobs: 0, inProgressJobs: 0, failedJobs: 0},
        cancellable: false,
      },
      storageStats: {totalEntries: 0, usedSpace: 0, maxQuota: 100000000, percentUsed: 0},
      recentOperations: [],
    }

    debugPanel.update(mockData)
    expect(container.innerHTML).not.toBe('')

    debugPanel.destroy()
    expect(container.innerHTML).toBe('')
  })

  it('should handle data source toggle events', () => {
    const debugPanel = createMetadataDebugPanel({
      container,
      metadataSources: mockMetadataSources,
      metadataStorage: mockMetadataStorage,
      metadataQueue: mockMetadataQueue,
      preferences: mockPreferences,
    })

    const sourceToggleListener = vi.fn()
    debugPanel.on('source-toggled', sourceToggleListener)

    const mockData: MetadataDebugPanelData = {
      sources: [
        {
          id: 'tmdb',
          name: 'TMDB',
          enabled: true,
          isHealthy: true,
          reliability: {uptime: 0.99, accuracy: 0.95, latency: 200},
          stats: {
            totalRequests: 100,
            successfulRequests: 95,
            failedRequests: 5,
            averageLatency: 200,
          },
          lastAccessed: new Date().toISOString(),
        },
      ],
      qualityMetrics: {
        totalEpisodes: 0,
        completeMetadata: 0,
        partialMetadata: 0,
        noMetadata: 0,
        averageCompleteness: 0,
        averageConfidence: 0,
        freshness: {fresh: 0, stale: 0, expired: 0},
      },
      syncStatus: {
        isActive: false,
        queueStats: {pendingJobs: 0, inProgressJobs: 0, failedJobs: 0},
        cancellable: false,
      },
      storageStats: {totalEntries: 0, usedSpace: 0, maxQuota: 100000000, percentUsed: 0},
      recentOperations: [],
    }

    debugPanel.update(mockData)

    const toggleCheckbox = container.querySelector<HTMLInputElement>('input[data-source="tmdb"]')
    expect(toggleCheckbox).toBeDefined()

    if (toggleCheckbox) {
      toggleCheckbox.checked = false
      toggleCheckbox.dispatchEvent(new Event('change', {bubbles: true}))
      expect(sourceToggleListener).toHaveBeenCalledWith({source: 'tmdb', enabled: false})
    }
  })
})
