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

  // Logger for settings operations
  const logger = createLogger({
    minLevel: 'info',
    enabledCategories: ['metadata'],
    consoleOutput: true,
  })

  // Generic EventEmitter for type-safe events
  const eventEmitter = createEventEmitter<SettingsManagerEvents>()

  // Private state managed via closure variables
  let isInitialized = false
  let isVisible = false
  let usageControlsInstance: MetadataUsageControlsInstance | null = null
  let preferencesInstance: MetadataPreferencesInstance | null = null
  let cleanupHandlers: (() => void)[] = []

  /**
   * Initialize settings components with error handling.
   * Lazy initialization pattern - only creates components when first needed.
   */
  const initializeComponents = withErrorHandling(async (): Promise<void> => {
    if (isInitialized) {
      logger.debug('Components already initialized, skipping')
      return
    }

    const startTime = performance.now()
    const initializedComponents: string[] = []

    logger.info('Initializing settings components')

    try {
      // Initialize metadata usage controls
      if (!usageControlsInstance) {
        logger.debug('Creating metadata usage controls component')
        usageControlsInstance = createMetadataUsageControls({
          container: contentContainer,
          preferences,
          getUsageStats,
        })
        usageControlsInstance.render()
        initializedComponents.push('usage-controls')
        logger.debug('Metadata usage controls initialized')
      }

      // Initialize metadata preferences
      if (!preferencesInstance) {
        logger.debug('Creating metadata preferences component')
        preferencesInstance = createMetadataPreferences({
          container: contentContainer,
          debugPanel,
          preferences,
        })
        preferencesInstance.render()
        initializedComponents.push('preferences')
        logger.debug('Metadata preferences initialized')
      }

      const duration = performance.now() - startTime
      isInitialized = true

      // Emit render complete event
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

      // Emit error event with sanitized information
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
   * Wrapped with error handling to prevent modal failures from breaking app.
   */
  const show = async (): Promise<void> => {
    const safeShow = withErrorHandling(async (): Promise<void> => {
      logger.info('Opening settings modal')

      // Initialize components on first show
      await initializeComponents()

      // Show modal
      modalElement.style.display = 'flex'
      isVisible = true

      // Emit open event
      eventEmitter.emit('settings-open', {
        timestamp: new Date().toISOString(),
      })

      logger.debug('Settings modal opened successfully')
    }, 'settings-modal-show')

    await safeShow()
  }

  /**
   * Hide settings modal.
   * Wrapped with error handling to ensure modal can always be closed.
   */
  const hide = withSyncErrorHandling((): void => {
    logger.info('Closing settings modal')

    modalElement.style.display = 'none'
    isVisible = false

    // Emit close event
    eventEmitter.emit('settings-close', {
      timestamp: new Date().toISOString(),
    })

    logger.debug('Settings modal closed successfully')
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
   * Idempotent - can be called multiple times safely.
   */
  const destroy = withSyncErrorHandling((): void => {
    logger.info('Destroying settings manager')

    // Cleanup component instances
    if (usageControlsInstance) {
      logger.debug('Destroying usage controls instance')
      usageControlsInstance.destroy()
      usageControlsInstance = null
    }

    if (preferencesInstance) {
      logger.debug('Destroying preferences instance')
      preferencesInstance.destroy()
      preferencesInstance = null
    }

    // Execute registered cleanup handlers
    cleanupHandlers.forEach(handler => {
      try {
        handler()
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        logger.error('Cleanup handler error', {
          error: {
            name: err.name,
            message: err.message,
            ...(err.stack ? {stack: err.stack} : {}),
          },
        })
      }
    })
    cleanupHandlers = []

    // Reset state
    isInitialized = false
    isVisible = false

    // Remove all event listeners
    eventEmitter.removeAllListeners()

    logger.info('Settings manager destroyed successfully')
  }, 'settings-manager-destroy')

  /**
   * Register event handlers with cleanup tracking.
   * Ensures proper cleanup when destroy() is called.
   */
  const registerEventHandler = <E extends EventTarget>(
    target: E,
    eventName: string,
    handler: EventListener,
  ): void => {
    target.addEventListener(eventName, handler)

    // Track cleanup handler
    cleanupHandlers.push(() => {
      target.removeEventListener(eventName, handler)
    })
  }

  // Setup close button event handler
  const handleCloseClick = (): void => {
    hide()
  }
  registerEventHandler(closeButton, 'click', handleCloseClick)

  // Setup click-outside-to-close handler
  const handleBackdropClick = (e: Event): void => {
    if (e.target === modalElement) {
      hide()
    }
  }
  registerEventHandler(modalElement, 'click', handleBackdropClick)

  // Setup Escape key handler
  const handleKeyDown = (e: Event): void => {
    if (e instanceof KeyboardEvent && e.key === 'Escape' && isVisible) {
      hide()
    }
  }
  registerEventHandler(document, 'keydown', handleKeyDown)

  // Setup window.beforeunload handler for cleanup
  const handleBeforeUnload = (): void => {
    destroy()
  }
  registerEventHandler(window, 'beforeunload', handleBeforeUnload)

  logger.info('Settings manager created successfully')

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
