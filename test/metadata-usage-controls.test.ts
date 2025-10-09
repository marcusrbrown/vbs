import type {MetadataUsageControlsInstance, MetadataUsageStatistics} from '../src/modules/types.js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createMetadataUsageControls} from '../src/components/metadata-usage-controls.js'

describe('MetadataUsageControls', () => {
  let container: HTMLElement
  let mockPreferences: any
  let mockGetUsageStats: () => MetadataUsageStatistics
  let mockStats: MetadataUsageStatistics
  let usageControls: MetadataUsageControlsInstance

  beforeEach(() => {
    // Create container element
    container = document.createElement('div')
    document.body.append(container)

    // Create mock usage statistics
    mockStats = {
      apiCalls: {
        today: 250,
        thisWeek: 1200,
        thisMonth: 4500,
        lifetime: 15000,
        bySource: {
          'memory-alpha': 100,
          tmdb: 80,
          trekcore: 50,
          stapi: 20,
          imdb: 15,
          manual: 10,
          'startrek-com': 5,
        },
      },
      bandwidth: {
        today: 5_242_880, // 5MB
        thisWeek: 26_214_400, // 25MB
        thisMonth: 104_857_600, // 100MB
        lifetime: 524_288_000, // 500MB
      },
      storage: {
        currentSize: 52_428_800, // 50MB
        maxSize: 104_857_600, // 100MB
        percentUsed: 50,
        episodeCount: 125,
      },
      quotas: {
        dailyApiCalls: {
          used: 250,
          limit: 1000,
          percentUsed: 25,
          resetTime: new Date(Date.now() + 3600000 * 6).toISOString(), // 6 hours from now
        },
        cacheStorage: {
          used: 52_428_800,
          limit: 104_857_600,
          percentUsed: 50,
        },
      },
      lastUpdated: new Date().toISOString(),
    }

    // Create mock preferences instance
    mockPreferences = {
      getPreferences: vi.fn().mockReturnValue({
        metadataSync: {
          dataLimits: {
            maxEpisodesPerSync: 50,
            maxDailyApiCalls: 1000,
            maxCacheSizeMB: 100,
          },
        },
      }),
      updateMetadataSyncDataLimits: vi.fn(),
    }

    // Create mock stats getter
    mockGetUsageStats = vi.fn().mockReturnValue(mockStats)

    // Create usage controls instance
    usageControls = createMetadataUsageControls({
      container,
      preferences: mockPreferences,
      getUsageStats: mockGetUsageStats,
    })
  })

  afterEach(() => {
    usageControls.destroy()
    container.remove()
  })

  describe('Factory Function', () => {
    it('should create usage controls instance with all required methods', async () => {
      expect(usageControls).toBeDefined()
      expect(typeof usageControls.render).toBe('function')
      expect(typeof usageControls.update).toBe('function')
      expect(typeof usageControls.refreshStats).toBe('function')
      expect(typeof usageControls.clearCache).toBe('function')
      expect(typeof usageControls.exportStats).toBe('function')
      expect(typeof usageControls.showFeedback).toBe('function')
      expect(typeof usageControls.destroy).toBe('function')
    })

    it('should create instance with EventEmitter methods', async () => {
      expect(typeof usageControls.on).toBe('function')
      expect(typeof usageControls.off).toBe('function')
      expect(typeof usageControls.once).toBe('function')
      expect(typeof usageControls.removeAllListeners).toBe('function')
    })
  })

  describe('UI Rendering', () => {
    it('should render usage controls UI with all sections', async () => {
      await usageControls.render()

      expect(container.querySelector('.metadata-usage-controls')).toBeTruthy()
      expect(container.querySelector('.usage-header')).toBeTruthy()
      expect(container.querySelector('.usage-overview')).toBeTruthy()
      expect(container.querySelector('.quota-controls')).toBeTruthy()
      expect(container.querySelector('.cache-management')).toBeTruthy()
      expect(container.querySelector('.export-section')).toBeTruthy()
    })

    it('should display current usage statistics', async () => {
      await usageControls.render()

      const apiCallValue = container.querySelector('.overview-card:first-child .card-value')
      expect(apiCallValue?.textContent).toContain('250')
      expect(apiCallValue?.textContent).toContain('1,000')
    })

    it('should display quota controls with current limits', async () => {
      await usageControls.render()

      const dailyApiInput = container.querySelector(
        '[data-quota-input="maxDailyApiCalls"]',
      ) as HTMLInputElement
      const episodesInput = container.querySelector(
        '[data-quota-input="maxEpisodesPerSync"]',
      ) as HTMLInputElement
      const cacheInput = container.querySelector(
        '[data-quota-input="maxCacheSizeMB"]',
      ) as HTMLInputElement

      expect(dailyApiInput.value).toBe('1000')
      expect(episodesInput.value).toBe('50')
      expect(cacheInput.value).toBe('100')
    })

    it('should display cache management section with progress', async () => {
      await usageControls.render()

      const cacheProgress = container.querySelector('.cache-progress-fill') as HTMLElement
      expect(cacheProgress.style.width).toBe('50%')
    })
  })

  describe('Event Emissions', async () => {
    it('should emit quotas-updated event when quotas are saved', async () => {
      const mockListener = vi.fn()
      usageControls.on('quotas-updated', mockListener)

      await usageControls.render()

      // Simulate quota update
      const saveButton = container.querySelector('[data-save-quotas]') as HTMLButtonElement
      expect(saveButton).toBeTruthy()

      saveButton.click()

      expect(mockListener).toHaveBeenCalledWith({
        dataLimits: expect.objectContaining({
          maxDailyApiCalls: 1000,
          maxEpisodesPerSync: 50,
          maxCacheSizeMB: 100,
        }),
        preferences: expect.any(Object),
      })
    })

    it('should emit usage-refreshed event when stats are refreshed', async () => {
      const mockListener = vi.fn()
      usageControls.on('usage-refreshed', mockListener)

      await usageControls.render()

      await usageControls.refreshStats()

      expect(mockListener).toHaveBeenCalledWith({
        statistics: expect.objectContaining({
          apiCalls: expect.any(Object),
          bandwidth: expect.any(Object),
          storage: expect.any(Object),
        }),
        timestamp: expect.any(String),
      })
    })

    it('should emit usage-exported event when stats are exported', async () => {
      const mockListener = vi.fn()
      usageControls.on('usage-exported', mockListener)

      await usageControls.render()

      // Mock URL.createObjectURL
      globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:test')

      const exportButton = container.querySelector('[data-export-json]') as HTMLButtonElement
      exportButton.click()

      expect(mockListener).toHaveBeenCalledWith({
        format: 'json',
        filename: expect.stringContaining('vbs-usage-stats'),
      })
    })
  })

  describe('Quota Management', () => {
    it('should update preferences when quotas are saved', async () => {
      await usageControls.render()

      const dailyApiInput = container.querySelector(
        '[data-quota-input="maxDailyApiCalls"]',
      ) as HTMLInputElement
      dailyApiInput.value = '2000'

      const saveButton = container.querySelector('[data-save-quotas]') as HTMLButtonElement
      saveButton.click()

      expect(mockPreferences.updateMetadataSyncDataLimits).toHaveBeenCalledWith({
        maxDailyApiCalls: 2000,
        maxEpisodesPerSync: 50,
        maxCacheSizeMB: 100,
      })
    })

    it('should reset quotas to defaults when reset button is clicked', async () => {
      globalThis.confirm = vi.fn().mockReturnValue(true)

      await usageControls.render()

      const resetButton = container.querySelector('[data-reset-quotas]') as HTMLButtonElement
      resetButton.click()

      expect(mockPreferences.updateMetadataSyncDataLimits).toHaveBeenCalledWith({
        maxEpisodesPerSync: 50,
        maxDailyApiCalls: 1000,
        maxCacheSizeMB: 100,
      })
    })
  })

  describe('Cache Management', () => {
    it('should emit cache-cleared event when cache is cleared', async () => {
      globalThis.confirm = vi.fn().mockReturnValue(true)

      const mockListener = vi.fn()
      usageControls.on('cache-cleared', mockListener)

      await usageControls.render()

      const clearButton = container.querySelector('[data-clear-cache]') as HTMLButtonElement
      clearButton.click()

      await vi.waitFor(() => {
        expect(mockListener).toHaveBeenCalledWith({
          previousSize: expect.any(Number),
          freedSpace: expect.any(Number),
        })
      })
    })

    it('should not clear cache if user cancels confirmation', async () => {
      globalThis.confirm = vi.fn().mockReturnValue(false)

      const mockListener = vi.fn()
      usageControls.on('cache-cleared', mockListener)

      await usageControls.render()

      const clearButton = container.querySelector('[data-clear-cache]') as HTMLButtonElement
      clearButton.click()

      expect(mockListener).not.toHaveBeenCalled()
    })
  })

  describe('Export Functionality', () => {
    beforeEach(() => {
      // Mock URL.createObjectURL and link.click()
      globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:test')
      HTMLAnchorElement.prototype.click = vi.fn()
    })

    it('should export stats as JSON when JSON button is clicked', async () => {
      await usageControls.render()

      const exportButton = container.querySelector('[data-export-json]') as HTMLButtonElement
      exportButton.click()

      expect(globalThis.URL.createObjectURL).toHaveBeenCalled()
    })

    it('should export stats as CSV when CSV button is clicked', async () => {
      await usageControls.render()

      const exportButton = container.querySelector('[data-export-csv]') as HTMLButtonElement
      exportButton.click()

      expect(globalThis.URL.createObjectURL).toHaveBeenCalled()
    })

    it('should use exportStats method with format parameter', async () => {
      await usageControls.render()

      globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:test')

      usageControls.exportStats('json')
      expect(globalThis.URL.createObjectURL).toHaveBeenCalled()

      usageControls.exportStats('csv')
      expect(globalThis.URL.createObjectURL).toHaveBeenCalled()
    })
  })

  describe('Quota Warning System', () => {
    it('should emit quota-warning event when approaching limit', async () => {
      const mockListener = vi.fn()
      usageControls.on('quota-warning', mockListener)

      // Create stats with high usage (90%)
      const highUsageStats = {
        ...mockStats,
        quotas: {
          ...mockStats.quotas,
          dailyApiCalls: {
            ...mockStats.quotas.dailyApiCalls,
            used: 900,
            percentUsed: 90,
          },
        },
      }

      mockGetUsageStats = vi.fn().mockReturnValue(highUsageStats)

      const controls = createMetadataUsageControls({
        container,
        preferences: mockPreferences,
        getUsageStats: mockGetUsageStats,
      })

      controls.on('quota-warning', mockListener)
      await controls.render()

      expect(mockListener).toHaveBeenCalledWith({
        type: 'api-calls',
        percentUsed: 90,
        limit: 1000,
      })

      controls.destroy()
    })

    it('should emit quota-exceeded event when limit is reached', async () => {
      const mockListener = vi.fn()

      // Create stats with exceeded quota (100%)
      const exceededStats = {
        ...mockStats,
        quotas: {
          ...mockStats.quotas,
          dailyApiCalls: {
            ...mockStats.quotas.dailyApiCalls,
            used: 1000,
            percentUsed: 100,
          },
        },
      }

      mockGetUsageStats = vi.fn().mockReturnValue(exceededStats)

      const controls = createMetadataUsageControls({
        container,
        preferences: mockPreferences,
        getUsageStats: mockGetUsageStats,
      })

      controls.on('quota-exceeded', mockListener)
      await controls.render()

      expect(mockListener).toHaveBeenCalledWith({
        type: 'api-calls',
        used: 1000,
        limit: 1000,
      })

      controls.destroy()
    })
  })

  describe('Feedback System', () => {
    it('should show feedback message when showFeedback is called', async () => {
      await usageControls.render()

      usageControls.showFeedback('Test success message', 'success')

      const feedback = container.querySelector('.usage-feedback')
      expect(feedback?.textContent).toBe('Test success message')
      expect(feedback?.classList.contains('feedback-success')).toBe(true)
    })

    it('should auto-hide feedback message after timeout', async () => {
      vi.useFakeTimers()

      await usageControls.render()
      usageControls.showFeedback('Test message', 'info')

      const feedback = container.querySelector('.usage-feedback') as HTMLElement
      expect(feedback.style.display).toBe('block')

      vi.advanceTimersByTime(4000)

      expect(feedback.style.display).toBe('none')

      vi.useRealTimers()
    })
  })

  describe('Component Lifecycle', () => {
    it('should update component with new statistics', async () => {
      await usageControls.render()

      const newStats = {
        ...mockStats,
        quotas: {
          ...mockStats.quotas,
          dailyApiCalls: {
            ...mockStats.quotas.dailyApiCalls,
            used: 500,
          },
        },
      }

      await usageControls.update(newStats)

      const apiCallValue = container.querySelector('.overview-card:first-child .card-value')
      expect(apiCallValue?.textContent).toContain('500')
    })

    it('should cleanup resources when destroyed', async () => {
      await usageControls.render()

      expect(container.querySelector('.metadata-usage-controls')).toBeTruthy()

      usageControls.destroy()

      expect(container.querySelector('.metadata-usage-controls')).toBeFalsy()
      expect(container.innerHTML).toBe('')
    })
  })

  describe('Async Stats Handling', () => {
    it('should handle async getUsageStats function', async () => {
      const asyncGetStats = vi.fn().mockResolvedValue(mockStats)

      const controls = createMetadataUsageControls({
        container,
        preferences: mockPreferences,
        getUsageStats: asyncGetStats,
      })

      controls.render()

      await vi.waitFor(() => {
        expect(container.querySelector('.metadata-usage-controls')).toBeTruthy()
      })

      controls.destroy()
    })

    it('should handle refresh with async stats', async () => {
      const asyncGetStats = vi.fn().mockResolvedValue(mockStats)

      const controls = createMetadataUsageControls({
        container,
        preferences: mockPreferences,
        getUsageStats: asyncGetStats,
      })

      controls.render()

      await controls.refreshStats()

      expect(asyncGetStats).toHaveBeenCalled()

      controls.destroy()
    })
  })
})
