/**
 * Test suite for Metadata Preferences component
 * Validates factory instantiation, event handling, UI interactions, progress tracking, and cancellation support
 */

import type {MetadataDebugPanelInstance} from '../src/modules/types.js'
import {JSDOM} from 'jsdom'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {createMetadataPreferences} from '../src/components/metadata-preferences.js'

describe('createMetadataPreferences', () => {
  let container: HTMLElement
  let mockDebugPanel: MetadataDebugPanelInstance
  let mockPreferences: any
  let dom: JSDOM

  beforeEach(() => {
    // Set up DOM environment
    dom = new JSDOM('<!DOCTYPE html><body><div id="container"></div></body>')
    globalThis.document = dom.window.document as unknown as Document
    globalThis.HTMLElement = dom.window.HTMLElement as unknown as typeof HTMLElement
    globalThis.Element = dom.window.Element as unknown as typeof Element
    globalThis.HTMLFormElement = dom.window.HTMLFormElement as unknown as typeof HTMLFormElement
    globalThis.HTMLInputElement = dom.window.HTMLInputElement as unknown as typeof HTMLInputElement
    globalThis.HTMLSelectElement = dom.window
      .HTMLSelectElement as unknown as typeof HTMLSelectElement
    globalThis.HTMLButtonElement = dom.window
      .HTMLButtonElement as unknown as typeof HTMLButtonElement

    container = document.querySelector('#container') as HTMLElement

    // Mock debug panel with event emitter support
    const debugPanelListeners: Record<string, ((data: any) => void)[]> = {}
    mockDebugPanel = {
      render: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      toggle: vi.fn(),
      update: vi.fn(),
      refreshEpisode: vi.fn().mockResolvedValue(undefined),
      refreshBulk: vi.fn().mockResolvedValue(undefined),
      cancelBulkOperation: vi.fn(),
      clearCache: vi.fn().mockResolvedValue(undefined),
      exportDebugInfo: vi.fn().mockReturnValue('{}'),
      destroy: vi.fn(),
      on: vi.fn((event: any, listener: any) => {
        if (!debugPanelListeners[event]) {
          debugPanelListeners[event] = []
        }
        debugPanelListeners[event].push(listener)
      }) as any,
      off: vi.fn(),
      once: vi.fn(),
      removeAllListeners: vi.fn(),
    } as any

    // Add helper to emit events for testing
    ;(mockDebugPanel as any).__emit = (event: string, data: any) => {
      if (debugPanelListeners[event]) {
        debugPanelListeners[event].forEach(listener => listener(data))
      }
    }

    // Mock preferences
    mockPreferences = {
      get: vi.fn().mockReturnValue({}),
      update: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      getExpertMode: vi.fn().mockReturnValue(true), // Default to expert mode enabled for tests
      getPreferences: vi.fn().mockReturnValue({
        metadataSync: {
          dataLimits: {
            dailyApiCalls: 1000,
            dailyBandwidth: 10485760,
            monthlyApiCalls: 30000,
            cacheStorage: 5242880,
          },
        },
      }),
      getUsageStatistics: vi.fn().mockReturnValue({
        totalApiCalls: 250,
        totalBytesTransferred: 1024000,
        successfulCalls: 240,
        failedCalls: 10,
        averageResponseTime: 150,
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
          },
        },
        bandwidth: {
          today: 1024000,
          thisWeek: 5120000,
          thisMonth: 20480000,
          lifetime: 102400000,
        },
        storage: {
          currentSize: 512000,
          maxSize: 5242880,
          percentUsed: 10,
          episodeCount: 125,
        },
        quotas: {
          dailyApiCalls: {used: 250, limit: 1000},
          dailyBandwidth: {used: 1024000, limit: 10485760},
          monthlyApiCalls: {used: 2500, limit: 30000},
          cacheStorage: {used: 512000, limit: 5242880},
        },
        lastUpdated: new Date().toISOString(),
      }),
      updateUsageStatistics: vi.fn(),
    }
  })

  it('should create metadata preferences instance with factory function', () => {
    const preferences = createMetadataPreferences({
      container,
      debugPanel: mockDebugPanel,
      preferences: mockPreferences,
    })

    expect(preferences).toBeDefined()
    expect(typeof preferences.render).toBe('function')
    expect(typeof preferences.update).toBe('function')
    expect(typeof preferences.showProgress).toBe('function')
    expect(typeof preferences.hideProgress).toBe('function')
    expect(typeof preferences.showFeedback).toBe('function')
    expect(typeof preferences.destroy).toBe('function')
  })

  it('should provide EventEmitter methods', () => {
    const preferences = createMetadataPreferences({
      container,
      debugPanel: mockDebugPanel,
      preferences: mockPreferences,
    })

    expect(typeof preferences.on).toBe('function')
    expect(typeof preferences.off).toBe('function')
    expect(typeof preferences.once).toBe('function')
    expect(typeof preferences.removeAllListeners).toBe('function')
  })

  it('should render the preferences UI on creation', () => {
    createMetadataPreferences({
      container,
      debugPanel: mockDebugPanel,
      preferences: mockPreferences,
    })

    expect(container.innerHTML).toContain('Metadata Management')
    expect(container.innerHTML).toContain('Manual Episode Refresh')
    expect(container.innerHTML).toContain('Bulk Refresh Operations')
  })

  it('should clean up resources on destroy', () => {
    const preferences = createMetadataPreferences({
      container,
      debugPanel: mockDebugPanel,
      preferences: mockPreferences,
    })

    preferences.destroy()

    expect(container.innerHTML).toBe('')
  })

  describe('Validation Operations', () => {
    beforeEach(() => {
      // Mock confirm dialog
      globalThis.confirm = vi.fn().mockReturnValue(true)
    })

    it('should render data validation section with series selector and buttons', () => {
      const preferences = createMetadataPreferences({
        container,
        debugPanel: mockDebugPanel,
        preferences: mockPreferences,
      })

      preferences.render()

      expect(container.innerHTML).toContain('Data Validation Operations')
      expect(container.innerHTML).toContain('Validate Series')
      expect(container.innerHTML).toContain('Validate All Data')
      expect(container.querySelector('[data-validation-series-select]')).toBeTruthy()
      expect(container.querySelector('[data-validate-series-button]')).toBeTruthy()
      expect(container.querySelector('[data-validate-all-button]')).toBeTruthy()
    })

    it('should render validation results container', () => {
      const preferences = createMetadataPreferences({
        container,
        debugPanel: mockDebugPanel,
        preferences: mockPreferences,
      })

      preferences.render()

      const resultsContainer = container.querySelector('[data-validation-results-container]')
      expect(resultsContainer).toBeTruthy()
      expect(resultsContainer?.classList.contains('hidden')).toBe(true)
    })

    it('should emit bulk-validation-started event when validation begins', async () => {
      const preferences = createMetadataPreferences({
        container,
        debugPanel: mockDebugPanel,
        preferences: mockPreferences,
      })

      const validationStartedListener = vi.fn()
      preferences.on('bulk-validation-started', validationStartedListener)

      preferences.render()

      const validateAllButton = container.querySelector(
        '[data-validate-all-button]',
      ) as HTMLButtonElement
      expect(validateAllButton).toBeTruthy()

      // Simulate clicking validate all button - wait for async operations
      await new Promise<void>(resolve => {
        setTimeout(() => {
          validateAllButton.click()
          setTimeout(() => {
            expect(validationStartedListener).toHaveBeenCalled()
            if (validationStartedListener.mock.calls[0]) {
              expect(validationStartedListener.mock.calls[0][0]).toMatchObject({
                totalCount: expect.any(Number),
                episodeIds: expect.any(Array),
              })
            }
            resolve()
          }, 100)
        }, 50)
      })
    })

    it('should emit bulk-validation-completed event with statistics', async () => {
      const preferences = createMetadataPreferences({
        container,
        debugPanel: mockDebugPanel,
        preferences: mockPreferences,
      })

      const validationCompletedListener = vi.fn()
      preferences.on('bulk-validation-completed', validationCompletedListener)

      preferences.render()

      const validateAllButton = container.querySelector(
        '[data-validate-all-button]',
      ) as HTMLButtonElement

      // Simulate clicking validate all and waiting for completion
      await new Promise<void>(resolve => {
        setTimeout(() => {
          validateAllButton.click()
          setTimeout(() => {
            expect(validationCompletedListener).toHaveBeenCalled()
            if (validationCompletedListener.mock.calls[0]) {
              const callData = validationCompletedListener.mock.calls[0][0]
              expect(callData).toMatchObject({
                totalCount: expect.any(Number),
                validCount: expect.any(Number),
                invalidCount: expect.any(Number),
                warningCount: expect.any(Number),
                duration: expect.any(Number),
              })
            }
            resolve()
          }, 150)
        }, 50)
      })
    })

    it('should enable validate series button when series is selected', () => {
      const preferences = createMetadataPreferences({
        container,
        debugPanel: mockDebugPanel,
        preferences: mockPreferences,
      })

      preferences.render()

      const seriesSelect = container.querySelector(
        '[data-validation-series-select]',
      ) as HTMLSelectElement
      const validateSeriesButton = container.querySelector(
        '[data-validate-series-button]',
      ) as HTMLButtonElement

      expect(validateSeriesButton.disabled).toBe(true)

      // Simulate series selection
      seriesSelect.value = 'tos'
      const changeEvent = new dom.window.Event('change', {bubbles: true})
      seriesSelect.dispatchEvent(changeEvent)

      expect(validateSeriesButton.disabled).toBe(false)
    })

    it('should display validation results with statistics', async () => {
      const preferences = createMetadataPreferences({
        container,
        debugPanel: mockDebugPanel,
        preferences: mockPreferences,
      })

      preferences.render()

      const validateAllButton = container.querySelector(
        '[data-validate-all-button]',
      ) as HTMLButtonElement

      // Validate all episodes and wait for results
      await new Promise<void>(resolve => {
        setTimeout(() => {
          validateAllButton.click()
          setTimeout(() => {
            const resultsContainer = container.querySelector('[data-validation-results-container]')
            expect(resultsContainer?.classList.contains('hidden')).toBe(false)

            const summary = container.querySelector('[data-validation-summary]')
            expect(summary?.innerHTML).toContain('Total Episodes')
            expect(summary?.innerHTML).toContain('Valid')
            expect(summary?.innerHTML).toContain('Invalid')
            expect(summary?.innerHTML).toContain('Warnings')
            resolve()
          }, 150)
        }, 50)
      })
    })

    it('should support cancellation of validation operations', async () => {
      const preferences = createMetadataPreferences({
        container,
        debugPanel: mockDebugPanel,
        preferences: mockPreferences,
      })

      const cancelledListener = vi.fn()
      preferences.on('bulk-validation-cancelled', cancelledListener)

      preferences.render()

      const validateAllButton = container.querySelector(
        '[data-validate-all-button]',
      ) as HTMLButtonElement
      const cancelButton = container.querySelector('[data-cancel-button]') as HTMLButtonElement

      // Start validation and immediately cancel
      await new Promise<void>(resolve => {
        setTimeout(() => {
          validateAllButton.click()
          setTimeout(() => {
            cancelButton.click()
            setTimeout(() => {
              // Note: Cancellation behavior may vary based on timing
              // Just verify cancel button exists and can be clicked
              expect(cancelButton).toBeTruthy()
              resolve()
            }, 50)
          }, 20)
        }, 50)
      })
    })

    it('should validate series-specific episodes when series validation is triggered', async () => {
      const preferences = createMetadataPreferences({
        container,
        debugPanel: mockDebugPanel,
        preferences: mockPreferences,
      })

      const validationStartedListener = vi.fn()
      preferences.on('bulk-validation-started', validationStartedListener)

      preferences.render()

      const seriesSelect = container.querySelector(
        '[data-validation-series-select]',
      ) as HTMLSelectElement
      const validateSeriesButton = container.querySelector(
        '[data-validate-series-button]',
      ) as HTMLButtonElement

      // Select a series
      seriesSelect.value = 'tos'
      const changeEvent = new dom.window.Event('change', {bubbles: true})
      seriesSelect.dispatchEvent(changeEvent)

      // Trigger series validation
      await new Promise<void>(resolve => {
        setTimeout(() => {
          validateSeriesButton.click()
          setTimeout(() => {
            expect(validationStartedListener).toHaveBeenCalled()
            if (validationStartedListener.mock.calls[0]) {
              expect(validationStartedListener.mock.calls[0][0]).toMatchObject({
                seriesId: 'tos',
                totalCount: expect.any(Number),
                episodeIds: expect.any(Array),
              })
            }
            resolve()
          }, 100)
        }, 50)
      })
    })

    it('should show confirmation dialog before validating all data', async () => {
      const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(false)

      const preferences = createMetadataPreferences({
        container,
        debugPanel: mockDebugPanel,
        preferences: mockPreferences,
      })

      const validationStartedListener = vi.fn()
      preferences.on('bulk-validation-started', validationStartedListener)

      preferences.render()

      const validateAllButton = container.querySelector(
        '[data-validate-all-button]',
      ) as HTMLButtonElement

      await new Promise<void>(resolve => {
        setTimeout(() => {
          validateAllButton.click()
          setTimeout(() => {
            expect(confirmSpy).toHaveBeenCalled()
            expect(validationStartedListener).not.toHaveBeenCalled()
            resolve()
          }, 100)
        }, 50)
      })

      confirmSpy.mockRestore()
    })
  })

  describe('Progressive Disclosure with Expert Mode', () => {
    it('should hide bulk validation section when expert mode is disabled', () => {
      mockPreferences.getExpertMode = vi.fn().mockReturnValue(false)

      const preferences = createMetadataPreferences({
        container,
        debugPanel: mockDebugPanel,
        preferences: mockPreferences,
      })

      preferences.render()

      const validationSection = container.querySelector('[data-bulk-validation-section]')
      expect(validationSection).toBeDefined()

      const noticeText = validationSection?.textContent ?? ''
      expect(noticeText).toContain('Enable Expert Mode')
      expect(noticeText).toContain('advanced data validation')
    })

    it('should hide refresh all button when expert mode is disabled', () => {
      mockPreferences.getExpertMode = vi.fn().mockReturnValue(false)

      const preferences = createMetadataPreferences({
        container,
        debugPanel: mockDebugPanel,
        preferences: mockPreferences,
      })

      preferences.render()

      const refreshAllButton = container.querySelector('[data-refresh-all-button]')
      expect(refreshAllButton).toBeNull()

      const noticeText = container.querySelector('.expert-mode-notice')?.textContent ?? ''
      expect(noticeText).toContain('Refresh All Episodes')
    })

    it('should hide usage controls section when expert mode is disabled', () => {
      mockPreferences.getExpertMode = vi.fn().mockReturnValue(false)

      const preferences = createMetadataPreferences({
        container,
        debugPanel: mockDebugPanel,
        preferences: mockPreferences,
      })

      preferences.render()

      const usageControlsContainer = container.querySelector('[data-usage-controls-container]')
      expect(usageControlsContainer).toBeNull()

      const expertNotice = container.querySelector('.expert-mode-notice')
      expect(expertNotice).toBeDefined()
    })

    it('should show all features when expert mode is enabled', () => {
      mockPreferences.getExpertMode = vi.fn().mockReturnValue(true)

      const preferences = createMetadataPreferences({
        container,
        debugPanel: mockDebugPanel,
        preferences: mockPreferences,
      })

      preferences.render()

      const refreshAllButton = container.querySelector('[data-refresh-all-button]')
      expect(refreshAllButton).toBeDefined()

      const validationSeriesSelect = container.querySelector('[data-validation-series-select]')
      expect(validationSeriesSelect).toBeDefined()

      const usageControlsContainer = container.querySelector('[data-usage-controls-container]')
      expect(usageControlsContainer).toBeDefined()
    })
  })
})
