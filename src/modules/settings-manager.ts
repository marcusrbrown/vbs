/**
 * Settings Manager Module
 *
 * Provides centralized settings modal lifecycle management with comprehensive error handling
 * and cleanup mechanisms. Extracts settings-related logic from main.ts into a dedicated
 * factory following VBS functional factory architecture patterns.
 *
 * Features:
 * - Modal visibility management (show/hide/toggle)
 * - Component lifecycle coordination (preferences, usage controls, debug panel)
 * - Error boundaries with comprehensive error handling
 * - Proper cleanup and resource management
 * - Type-safe event emission for settings lifecycle events
 *
 * Architecture:
 * - Functional factory pattern with closure-based state management
 * - Generic EventEmitter for type-safe event handling
 * - Dependency injection for settings components
 * - Error handling wrappers for all async operations
 */

import type {
  MetadataPreferencesInstance,
  MetadataUsageControlsInstance,
  SettingsManagerConfig,
  SettingsManagerEvents,
  SettingsManagerInstance,
} from './types.js'
import {createMetadataPreferences} from '../components/metadata-preferences.js'
import {createMetadataUsageControls} from '../components/metadata-usage-controls.js'
import {withErrorHandling, withSyncErrorHandling} from './error-handler.js'
import {createEventEmitter} from './events.js'
import {createLogger} from './logger.js'

/**
 * Factory function to create a settings manager instance.
 * Manages settings modal lifecycle, component initialization, and error handling.
 *
 * @param config - Configuration with dependencies and DOM references
 * @returns SettingsManagerInstance with full API
 *
 * @example
 * ```typescript
 * const settingsManager = createSettingsManager({
 *   modalElement: document.querySelector('#settingsModal'),
 *   closeButton: document.querySelector('#closeSettingsButton'),
 *   contentContainer: document.querySelector('#settingsModalBody'),
 *   debugPanel,
 *   preferences,
 *   getUsageStats: () => metadataStorage.getUsageStatistics()
 * })
 *
 * // Open settings modal
 * await settingsManager.show()
 *
 * // Listen for lifecycle events
 * settingsManager.on('settings-error', ({ error, operation }) => {
 *   console.error(`Settings error in ${operation}:`, error)
 * })
 * ```
 */
export const createSettingsManager = (config: SettingsManagerConfig): SettingsManagerInstance => {
  const {modalElement, closeButton, contentContainer, debugPanel, preferences, getUsageStats} =
    config

  const logger = createLogger({
    minLevel: 'info',
    enabledCategories: ['metadata'],
    consoleOutput: true,
  })

  const eventEmitter = createEventEmitter<SettingsManagerEvents>()

  let isInitialized = false
  let isVisible = false
  let usageControlsInstance: MetadataUsageControlsInstance | null = null
  let preferencesInstance: MetadataPreferencesInstance | null = null
  let cleanupHandlers: (() => void)[] = []

  /**
   * Initialize settings components with error handling.
   * Uses lazy initialization to defer component creation until modal is first opened.
   */
  const initializeComponents = withErrorHandling(async (): Promise<void> => {
    if (isInitialized) {
      return
    }

    const startTime = performance.now()
    const initializedComponents: string[] = []

    logger.info('Initializing settings components')

    try {
      if (!usageControlsInstance) {
        usageControlsInstance = createMetadataUsageControls({
          container: contentContainer,
          preferences,
          getUsageStats,
        })
        usageControlsInstance.render()
        initializedComponents.push('usage-controls')
      }

      if (!preferencesInstance) {
        preferencesInstance = createMetadataPreferences({
          container: contentContainer,
          debugPanel,
          preferences,
        })
        preferencesInstance.render()
        initializedComponents.push('preferences')
      }

      const duration = performance.now() - startTime
      isInitialized = true

      eventEmitter.emit('settings-render-complete', {
        componentsInitialized: initializedComponents,
        duration,
        timestamp: new Date().toISOString(),
      })

      logger.info('Settings components initialized successfully', {
        duration,
        components: initializedComponents,
      })
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      logger.error('Failed to initialize settings components', {
        error: {
          name: err.name,
          message: err.message,
          ...(err.stack ? {stack: err.stack} : {}),
        },
      })

      eventEmitter.emit('settings-error', {
        error: err,
        operation: 'component-initialization',
        context: 'Settings components failed to initialize',
        timestamp: new Date().toISOString(),
      })

      throw err
    }
  }, 'settings-component-initialization')

  /**
   * Show settings modal and initialize components if needed.
   * Error handling wrapper prevents modal failures from breaking the application.
   */
  const show = async (): Promise<void> => {
    const safeShow = withErrorHandling(async (): Promise<void> => {
      logger.info('Opening settings modal')

      await initializeComponents()

      modalElement.style.display = 'flex'
      isVisible = true

      eventEmitter.emit('settings-open', {
        timestamp: new Date().toISOString(),
      })
    }, 'settings-modal-show')

    await safeShow()
  }

  /**
   * Hide settings modal.
   * Error handling wrapper ensures modal can always be closed even if event emission fails.
   */
  const hide = withSyncErrorHandling((): void => {
    modalElement.style.display = 'none'
    isVisible = false

    eventEmitter.emit('settings-close', {
      timestamp: new Date().toISOString(),
    })

    logger.info('Settings modal closed')
  }, 'settings-modal-hide')

  /**
   * Toggle settings modal visibility.
   */
  const toggle = async (): Promise<void> => {
    if (isVisible) {
      hide()
    } else {
      await show()
    }
  }

  /**
   * Cleanup event listeners and component instances.
   * Idempotent design allows safe repeated calls.
   */
  const destroy = withSyncErrorHandling((): void => {
    if (usageControlsInstance) {
      usageControlsInstance.destroy()
      usageControlsInstance = null
    }

    if (preferencesInstance) {
      preferencesInstance.destroy()
      preferencesInstance = null
    }

    cleanupHandlers.forEach(handler => {
      try {
        handler()
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        logger.error('Cleanup handler failed', {
          error: {
            name: err.name,
            message: err.message,
            ...(err.stack ? {stack: err.stack} : {}),
          },
        })
      }
    })
    cleanupHandlers = []

    isInitialized = false
    isVisible = false

    eventEmitter.removeAllListeners()

    logger.info('Settings manager destroyed')
  }, 'settings-manager-destroy')

  /**
   * Register event handlers with cleanup tracking.
   * Cleanup handlers are automatically invoked during destroy().
   */
  const registerEventHandler = <E extends EventTarget>(
    target: E,
    eventName: string,
    handler: EventListener,
  ): void => {
    target.addEventListener(eventName, handler)
    cleanupHandlers.push(() => {
      target.removeEventListener(eventName, handler)
    })
  }

  const handleCloseClick = (): void => {
    hide()
  }
  registerEventHandler(closeButton, 'click', handleCloseClick)

  const handleBackdropClick = (e: Event): void => {
    if (e.target === modalElement) {
      hide()
    }
  }
  registerEventHandler(modalElement, 'click', handleBackdropClick)

  const handleKeyDown = (e: Event): void => {
    if (e instanceof KeyboardEvent && e.key === 'Escape' && isVisible) {
      hide()
    }
  }
  registerEventHandler(document, 'keydown', handleKeyDown)

  const handleBeforeUnload = (): void => {
    destroy()
  }
  registerEventHandler(window, 'beforeunload', handleBeforeUnload)

  logger.info('Settings manager created')

  // Return public API
  return {
    show,
    hide,
    toggle,
    destroy,
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    once: eventEmitter.once.bind(eventEmitter),
    removeAllListeners: eventEmitter.removeAllListeners.bind(eventEmitter),
  }
}
