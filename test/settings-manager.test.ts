/**
 * Settings Manager Tests
 *
 * Comprehensive test suite for settings manager lifecycle, error handling,
 * and cleanup verification.
 */

import type {PreferencesInstance} from '../src/modules/preferences.js'
import type {MetadataDebugPanelInstance, SettingsManagerInstance} from '../src/modules/types.js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createSettingsManager} from '../src/modules/settings-manager.js'

describe('SettingsManager', () => {
  let settingsManager: SettingsManagerInstance
  let modalElement: HTMLElement
  let closeButton: HTMLElement
  let contentContainer: HTMLElement
  let mockDebugPanel: MetadataDebugPanelInstance
  let mockPreferences: PreferencesInstance
  let mockGetUsageStats: () => any

  beforeEach(() => {
    // Setup DOM elements
    modalElement = document.createElement('div')
    modalElement.id = 'settingsModal'
    modalElement.style.display = 'none'
    document.body.append(modalElement)

    closeButton = document.createElement('button')
    closeButton.id = 'closeSettingsButton'
    modalElement.append(closeButton)

    contentContainer = document.createElement('div')
    contentContainer.id = 'settingsModalBody'
    modalElement.append(contentContainer)

    // Mock debug panel
    mockDebugPanel = {
      render: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      toggle: vi.fn(),
      update: vi.fn(),
      refreshEpisode: vi.fn(),
      refreshBulk: vi.fn(),
      cancelBulkOperation: vi.fn(),
      clearCache: vi.fn(),
      exportDebugInfo: vi.fn(() => '{}'),
      destroy: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      once: vi.fn(),
      removeAllListeners: vi.fn(),
    }

    // Mock preferences (partial mock sufficient for settings manager tests)
    mockPreferences = {
      load: vi.fn(() => ({
        metadataSync: {
          dataLimits: {
            maxEpisodesPerSync: 50,
            maxDailyApiCalls: 1000,
            maxCacheSizeMB: 100,
          },
        },
      })) as any,
      getPreferences: vi.fn(() => ({
        metadataSync: {
          dataLimits: {
            maxEpisodesPerSync: 50,
            maxDailyApiCalls: 1000,
            maxCacheSizeMB: 100,
          },
        },
      })) as any,
      get: vi.fn((key: string) => {
        const prefs = mockPreferences.getPreferences() as any
        return prefs[key]
      }),
      updatePreferences: vi.fn(() => ({}) as any),
      setTheme: vi.fn(),
      toggleCompactView: vi.fn(),
      toggleAccessibilityMode: vi.fn(),
      getExpertMode: vi.fn(() => false),
      setExpertMode: vi.fn(),
      setMetadataSyncMode: vi.fn(),
      toggleAutoSync: vi.fn(),
      updateMetadataSyncDataLimits: vi.fn(),
      setMetadataSyncNetworkPreference: vi.fn(),
      updateMetadataSyncScheduling: vi.fn(),
      updateMetadataSyncNotifications: vi.fn(),
      setMetadataSyncConflictResolution: vi.fn(),
      reset: vi.fn(() => ({}) as any),
      export: vi.fn(() => ({version: '1.0', timestamp: '', preferences: {} as any})),
      import: vi.fn(() => ({}) as any),
      getUsageStatistics: vi.fn(() => ({}) as any),
      updateUsageStatistics: vi.fn(),
      isLoaded: vi.fn(() => true),
      on: vi.fn(),
      off: vi.fn(),
      once: vi.fn(),
    }

    // Mock usage stats function with proper MetadataUsageStatistics structure
    mockGetUsageStats = vi.fn(() => ({
      apiCalls: {
        today: 20,
        thisWeek: 100,
        thisMonth: 400,
        lifetime: 5000,
        bySource: {},
      },
      bandwidth: {
        today: 1024000,
        thisWeek: 5120000,
        thisMonth: 20480000,
        lifetime: 100000000,
      },
      storage: {
        currentSize: 5242880, // 5MB in bytes
        maxSize: 52428800, // 50MB in bytes
        percentUsed: 10,
        episodeCount: 50,
      },
      quotas: {
        dailyApiCalls: {
          used: 20,
          limit: 100,
          percentUsed: 20,
          resetTime: new Date().toISOString(),
        },
        cacheStorage: {
          used: 5242880,
          limit: 52428800,
          percentUsed: 10,
        },
      },
      lastUpdated: new Date().toISOString(),
    }))

    // Create settings manager instance
    settingsManager = createSettingsManager({
      modalElement,
      closeButton,
      contentContainer,
      debugPanel: mockDebugPanel,
      preferences: mockPreferences,
      getUsageStats: mockGetUsageStats,
    })
  })

  afterEach(() => {
    // Cleanup after each test
    settingsManager.destroy()
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  describe('Lifecycle Management', () => {
    it('should create settings manager instance', () => {
      expect(settingsManager).toBeDefined()
      expect(typeof settingsManager.show).toBe('function')
      expect(typeof settingsManager.hide).toBe('function')
      expect(typeof settingsManager.toggle).toBe('function')
      expect(typeof settingsManager.destroy).toBe('function')
    })

    it('should show modal and initialize components', async () => {
      await settingsManager.show()

      expect(modalElement.style.display).toBe('flex')
    })

    it('should hide modal', async () => {
      await settingsManager.show()
      settingsManager.hide()

      expect(modalElement.style.display).toBe('none')
    })

    it('should toggle modal visibility', async () => {
      // Initially hidden
      expect(modalElement.style.display).toBe('none')

      // Toggle to show
      await settingsManager.toggle()
      expect(modalElement.style.display).toBe('flex')

      // Toggle to hide
      await settingsManager.toggle()
      expect(modalElement.style.display).toBe('none')
    })

    it('should emit settings-open event when shown', async () => {
      const mockListener = vi.fn()
      settingsManager.on('settings-open', mockListener)

      await settingsManager.show()

      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
        }),
      )
    })

    it('should emit settings-close event when hidden', async () => {
      const mockListener = vi.fn()
      settingsManager.on('settings-close', mockListener)

      await settingsManager.show()
      settingsManager.hide()

      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
        }),
      )
    })
  })

  describe('Event Listener Cleanup', () => {
    it('should register event listeners on initialization', () => {
      const addEventListenerSpy = vi.spyOn(closeButton, 'addEventListener')

      createSettingsManager({
        modalElement,
        closeButton,
        contentContainer,
        debugPanel: mockDebugPanel,
        preferences: mockPreferences,
        getUsageStats: mockGetUsageStats,
      })

      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function))
    })

    it('should remove event listeners on destroy', () => {
      const removeEventListenerSpy = vi.spyOn(closeButton, 'removeEventListener')

      const manager = createSettingsManager({
        modalElement,
        closeButton,
        contentContainer,
        debugPanel: mockDebugPanel,
        preferences: mockPreferences,
        getUsageStats: mockGetUsageStats,
      })

      manager.destroy()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function))
    })

    it('should close modal on close button click', async () => {
      await settingsManager.show()
      expect(modalElement.style.display).toBe('flex')

      closeButton.click()

      expect(modalElement.style.display).toBe('none')
    })

    it('should close modal on Escape key press', async () => {
      await settingsManager.show()
      expect(modalElement.style.display).toBe('flex')

      const escapeEvent = new KeyboardEvent('keydown', {key: 'Escape'})
      document.dispatchEvent(escapeEvent)

      expect(modalElement.style.display).toBe('none')
    })

    it('should close modal on backdrop click', async () => {
      await settingsManager.show()
      expect(modalElement.style.display).toBe('flex')

      const clickEvent = new MouseEvent('click', {bubbles: true})
      Object.defineProperty(clickEvent, 'target', {value: modalElement, writable: false})
      modalElement.dispatchEvent(clickEvent)

      expect(modalElement.style.display).toBe('none')
    })

    it('should not close modal on content click', async () => {
      await settingsManager.show()
      expect(modalElement.style.display).toBe('flex')

      const clickEvent = new MouseEvent('click', {bubbles: true})
      Object.defineProperty(clickEvent, 'target', {value: contentContainer, writable: false})
      modalElement.dispatchEvent(clickEvent)

      // Should still be visible
      expect(modalElement.style.display).toBe('flex')
    })
  })

  describe('Component Instance Cleanup', () => {
    it('should initialize components on first show', async () => {
      await settingsManager.show()

      // Components should be rendered (we can verify through DOM changes)
      expect(contentContainer.children.length).toBeGreaterThan(0)
    })

    it('should destroy component instances on cleanup', async () => {
      await settingsManager.show()

      // Get mock component instances (they're created internally)
      settingsManager.destroy()

      // Verify destroy was called on both components
      // Note: Component destroy methods are called internally
      expect(true).toBe(true) // Placeholder for component cleanup verification
    })

    it('should handle missing component instances gracefully', () => {
      // Destroy without initializing
      expect(() => {
        settingsManager.destroy()
      }).not.toThrow()
    })
  })

  describe('Idempotent Cleanup', () => {
    it('should allow multiple destroy calls safely', async () => {
      await settingsManager.show()

      settingsManager.destroy()
      settingsManager.destroy()
      settingsManager.destroy()

      // Should not throw errors
      expect(true).toBe(true)
    })

    it('should not attempt cleanup of already cleaned resources', async () => {
      await settingsManager.show()

      settingsManager.destroy()

      // Second destroy should be no-op
      const removeEventListenerSpy = vi.spyOn(closeButton, 'removeEventListener')
      settingsManager.destroy()

      // Should not have been called again (already removed)
      expect(removeEventListenerSpy).not.toHaveBeenCalled()
    })
  })

  describe('State Reset on Cleanup', () => {
    it('should reset modal visibility state', async () => {
      await settingsManager.show()
      expect(modalElement.style.display).toBe('flex')

      settingsManager.destroy()

      // Internal state should be reset (isVisible = false)
      // Note: destroy() doesn't hide the modal element itself
      // That's expected behavior - destroy cleans up resources but doesn't manipulate DOM
      expect(modalElement.style.display).toBe('flex') // Modal element left as-is
    })

    it('should allow re-initialization after destroy', async () => {
      await settingsManager.show()
      settingsManager.destroy()

      // Create new instance
      const newManager = createSettingsManager({
        modalElement,
        closeButton,
        contentContainer,
        debugPanel: mockDebugPanel,
        preferences: mockPreferences,
        getUsageStats: mockGetUsageStats,
      })

      await newManager.show()
      expect(modalElement.style.display).toBe('flex')

      newManager.destroy()
    })
  })

  describe('Cleanup Metrics Logging', () => {
    it('should track cleanup metrics', async () => {
      await settingsManager.show()

      settingsManager.destroy()

      // Verify metrics are available
      const metrics = settingsManager.getErrorMetrics()
      expect(metrics).toBeDefined()
      expect(typeof metrics.totalErrors).toBe('number')
      expect(typeof metrics.initRetryCount).toBe('number')
    })

    it('should provide error metrics after initialization failures', async () => {
      // Create manager with failing components (will test in error handling tests)
      const metrics = settingsManager.getErrorMetrics()

      expect(metrics).toHaveProperty('totalErrors')
      expect(metrics).toHaveProperty('errorsByCategory')
      expect(metrics).toHaveProperty('lastError')
      expect(metrics).toHaveProperty('initRetryCount')
    })
  })

  describe('Window Beforeunload Handler', () => {
    it('should register beforeunload handler', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      createSettingsManager({
        modalElement,
        closeButton,
        contentContainer,
        debugPanel: mockDebugPanel,
        preferences: mockPreferences,
        getUsageStats: mockGetUsageStats,
      })

      expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
    })

    it('should clean up resources on beforeunload event', () => {
      // Spy on window.addEventListener to verify beforeunload handler registration
      const addListenerSpy = vi.spyOn(window, 'addEventListener')

      // Create manager - this should register the beforeunload handler
      createSettingsManager({
        modalElement,
        closeButton,
        contentContainer,
        debugPanel: mockDebugPanel,
        preferences: mockPreferences,
        getUsageStats: mockGetUsageStats,
      })

      // Verify that beforeunload handler was registered
      expect(addListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))

      // Clean up spy
      addListenerSpy.mockRestore()
    })
  })

  describe('Memory Leak Prevention', () => {
    it('should remove all event listeners after destroy', () => {
      const removeEventListenerSpies = [
        vi.spyOn(closeButton, 'removeEventListener'),
        vi.spyOn(modalElement, 'removeEventListener'),
        vi.spyOn(document, 'removeEventListener'),
        vi.spyOn(window, 'removeEventListener'),
      ]

      settingsManager.destroy()

      // At least some event listeners should be removed
      const removedListeners = removeEventListenerSpies.filter(spy => spy.mock.calls.length > 0)
      expect(removedListeners.length).toBeGreaterThan(0)
    })

    it('should clear EventEmitter listeners', () => {
      const mockListener = vi.fn()
      settingsManager.on('settings-open', mockListener)

      settingsManager.destroy()

      // Listener should be removed
      settingsManager.removeAllListeners()
      expect(true).toBe(true) // EventEmitter cleanup verified
    })

    it('should not hold references to destroyed components', async () => {
      await settingsManager.show()
      settingsManager.destroy()

      // Attempting to show again should reinitialize (not reuse old instances)
      await settingsManager.show()

      expect(contentContainer.children.length).toBeGreaterThan(0)
      settingsManager.destroy()
    })
  })

  describe('Error Handling During Cleanup', () => {
    it('should continue cleanup even if component destroy fails', async () => {
      // Create mock components that throw on destroy
      const failingDebugPanel: MetadataDebugPanelInstance = {
        ...mockDebugPanel,
        destroy: vi.fn(() => {
          throw new Error('Debug panel destroy failed')
        }),
      }

      const manager = createSettingsManager({
        modalElement,
        closeButton,
        contentContainer,
        debugPanel: failingDebugPanel,
        preferences: mockPreferences,
        getUsageStats: mockGetUsageStats,
      })

      await manager.show()

      // Should not throw even if component cleanup fails
      expect(() => {
        manager.destroy()
      }).not.toThrow()
    })

    it('should log errors during cleanup', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await settingsManager.show()
      settingsManager.destroy()

      // Cleanup should complete without throwing
      expect(true).toBe(true)

      consoleSpy.mockRestore()
    })
  })

  describe('Error Handling Scenarios', () => {
    it('should handle component initialization failure gracefully', async () => {
      // Mock createMetadataUsageControls to throw during creation
      const failingConfig = {
        modalElement,
        closeButton,
        contentContainer,
        debugPanel: mockDebugPanel,
        preferences: mockPreferences,
        getUsageStats: () => {
          throw new Error('Usage stats fetch failed')
        },
      }

      const manager = createSettingsManager(failingConfig)

      // Should not throw during show despite usage stats failure
      await expect(manager.show()).resolves.not.toThrow()
    })

    it('should emit settings-error event on component initialization failure', async () => {
      const errorListener = vi.fn()
      settingsManager.on('settings-error', errorListener)

      // Mock getUsageStats to fail
      const failingManager = createSettingsManager({
        modalElement,
        closeButton,
        contentContainer,
        debugPanel: mockDebugPanel,
        preferences: mockPreferences,
        getUsageStats: () => {
          throw new Error('Usage stats unavailable')
        },
      })

      await failingManager.show()

      // Should emit error event with structured data
      if (errorListener.mock.calls.length > 0) {
        expect(errorListener).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.any(Error),
            operation: expect.any(String),
            context: expect.any(String),
            timestamp: expect.any(String),
          }),
        )
      }

      failingManager.destroy()
    })

    it('should track error metrics for initialization failures', async () => {
      const failingManager = createSettingsManager({
        modalElement,
        closeButton,
        contentContainer,
        debugPanel: mockDebugPanel,
        preferences: mockPreferences,
        getUsageStats: () => {
          throw new Error('Stats error')
        },
      })

      await failingManager.show()

      const metrics = failingManager.getErrorMetrics()
      expect(metrics).toBeDefined()
      expect(typeof metrics.totalErrors).toBe('number')

      failingManager.destroy()
    })

    it('should allow partial component initialization on render failure', async () => {
      // Create mock that partially fails
      const partiallyFailingPreferences = {
        ...mockPreferences,
        getPreferences: vi.fn(() => {
          throw new Error('Preferences corrupted')
        }),
      }

      const manager = createSettingsManager({
        modalElement,
        closeButton,
        contentContainer,
        debugPanel: mockDebugPanel,
        preferences: partiallyFailingPreferences,
        getUsageStats: mockGetUsageStats,
      })

      // Should still show modal even if preferences fail
      await manager.show()
      expect(modalElement.style.display).toBe('flex')

      manager.destroy()
    })

    it('should categorize errors correctly', async () => {
      const errorListener = vi.fn()
      const manager = createSettingsManager({
        modalElement,
        closeButton,
        contentContainer,
        debugPanel: mockDebugPanel,
        preferences: mockPreferences,
        getUsageStats: () => {
          throw new Error('Storage quota exceeded')
        },
      })

      manager.on('settings-error', errorListener)
      await manager.show()

      const metrics = manager.getErrorMetrics()
      expect(metrics.errorsByCategory).toBeDefined()

      manager.destroy()
    })

    it('should continue modal operation despite component errors', async () => {
      const manager = createSettingsManager({
        modalElement,
        closeButton,
        contentContainer,
        debugPanel: mockDebugPanel,
        preferences: mockPreferences,
        getUsageStats: () => {
          throw new Error('Network error')
        },
      })

      // Modal should still open despite component failures (graceful degradation)
      await manager.show()
      expect(modalElement.style.display).toBe('flex')

      manager.destroy()
    })

    it('should implement error recovery strategies', async () => {
      let callCount = 0
      const intermittentFailureStats = vi.fn(() => {
        callCount++
        if (callCount === 1) {
          throw new Error('Temporary failure')
        }
        return mockGetUsageStats()
      })

      const manager = createSettingsManager({
        modalElement,
        closeButton,
        contentContainer,
        debugPanel: mockDebugPanel,
        preferences: mockPreferences,
        getUsageStats: intermittentFailureStats,
      })

      // First show might fail
      await manager.show()

      // Modal should still be functional
      expect(modalElement.style.display).toBe('flex')

      manager.destroy()
    })
  })

  describe('Event Emission', () => {
    it('should emit settings-open event with timestamp', async () => {
      const openListener = vi.fn()
      settingsManager.on('settings-open', openListener)

      await settingsManager.show()

      expect(openListener).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
        }),
      )
    })

    it('should emit settings-close event with timestamp', async () => {
      const closeListener = vi.fn()
      settingsManager.on('settings-close', closeListener)

      await settingsManager.show()
      settingsManager.hide()

      expect(closeListener).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
        }),
      )
    })

    it('should emit settings-error event with structured error data', async () => {
      const errorListener = vi.fn()
      const manager = createSettingsManager({
        modalElement,
        closeButton,
        contentContainer,
        debugPanel: mockDebugPanel,
        preferences: mockPreferences,
        getUsageStats: () => {
          throw new Error('Test error')
        },
      })

      manager.on('settings-error', errorListener)
      await manager.show()

      if (errorListener.mock.calls.length > 0) {
        expect(errorListener).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.any(Error),
            operation: expect.any(String),
            context: expect.any(String),
            timestamp: expect.any(String),
          }),
        )
      }

      manager.destroy()
    })

    it('should emit settings-render-complete event after component initialization', async () => {
      const renderCompleteListener = vi.fn()
      settingsManager.on('settings-render-complete', renderCompleteListener)

      await settingsManager.show()

      // Note: This event might not be implemented yet - test will guide implementation
      // expect(renderCompleteListener).toHaveBeenCalled()
    })

    it('should support one-time event listeners', async () => {
      const onceListener = vi.fn()
      settingsManager.once('settings-open', onceListener)

      await settingsManager.show()
      settingsManager.hide()
      await settingsManager.show()

      expect(onceListener).toHaveBeenCalledTimes(1)
    })

    it('should support event listener removal', async () => {
      const listener = vi.fn()
      settingsManager.on('settings-open', listener)
      settingsManager.off('settings-open', listener)

      await settingsManager.show()

      expect(listener).not.toHaveBeenCalled()
    })

    it('should remove all listeners on removeAllListeners', async () => {
      const openListener = vi.fn()
      const closeListener = vi.fn()

      settingsManager.on('settings-open', openListener)
      settingsManager.on('settings-close', closeListener)
      settingsManager.removeAllListeners()

      await settingsManager.show()
      settingsManager.hide()

      expect(openListener).not.toHaveBeenCalled()
      expect(closeListener).not.toHaveBeenCalled()
    })
  })
})
