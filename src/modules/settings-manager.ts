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
  MetadataExpertModeInstance,
  MetadataPreferencesInstance,
  MetadataUsageControlsInstance,
  SettingsManagerConfig,
  SettingsManagerEvents,
  SettingsManagerInstance,
} from './types.js'
import {createMetadataExpertMode} from '../components/metadata-expert-mode.js'
import {createMetadataPreferences} from '../components/metadata-preferences.js'
import {createMetadataUsageControls} from '../components/metadata-usage-controls.js'
import {withErrorHandling, withSyncErrorHandling} from './error-handler.js'
import {createEventEmitter} from './events.js'
import {createLogger} from './logger.js'

/**
 * Factory function to create a settings manager instance.
 * Manages settings modal lifecycle, component initialization, and error handling.
 *
 * **Lifecycle Management:**
 * - Lazy initialization: Components are created only when modal is first opened
 * - Automatic cleanup: window.beforeunload handler ensures proper resource cleanup
 * - Idempotent destroy: Safe to call destroy() multiple times
 *
 * **Cleanup Behavior:**
 * The settings manager automatically registers a window.beforeunload handler
 * that calls destroy() to ensure proper cleanup when the page unloads. Manual
 * cleanup is also supported via the destroy() method.
 *
 * Resources cleaned up during destroy():
 * - Component instances (usage controls, preferences)
 * - Event listeners (click, keyboard, window events)
 * - EventEmitter listeners
 * - Closure state (initialization flags, component references)
 *
 * **Error Handling:**
 * All async operations are wrapped with error boundaries. Individual component
 * failures don't prevent other components from loading (graceful degradation).
 *
 * @param config - Configuration with dependencies and DOM references
 * @returns SettingsManagerInstance with full API
 *
 * @example
 * ```typescript
 * // Create settings manager with dependencies
 * const settingsManager = createSettingsManager({
 *   modalElement: document.querySelector('#settingsModal'),
 *   closeButton: document.querySelector('#closeSettingsButton'),
 *   contentContainer: document.querySelector('#settingsModalBody'),
 *   debugPanel,
 *   preferences,
 *   getUsageStats: () => metadataStorage.getUsageStatistics()
 * })
 *
 * // Open settings modal (lazy initialization happens here)
 * await settingsManager.show()
 *
 * // Listen for lifecycle events
 * settingsManager.on('settings-error', ({ error, operation }) => {
 *   console.error(`Settings error in ${operation}:`, error)
 * })
 *
 * // Manual cleanup (optional, automatic on beforeunload)
 * settingsManager.destroy()
 * ```
 *
 * @example
 * ```typescript
 * // Cleanup metrics monitoring
 * settingsManager.destroy()
 * const metrics = settingsManager.getErrorMetrics()
 * console.log(`Cleanup completed: ${metrics.initRetryCount} retries`)
 * ```
 */
export const createSettingsManager = (config: SettingsManagerConfig): SettingsManagerInstance => {
  const {modalElement, closeButton, contentContainer, debugPanel, preferences, getUsageStats} =
    config

  const logger = createLogger({
    minLevel: 'info',
    enabledCategories: ['settings'],
    consoleOutput: true,
    enableMetrics: true,
  })

  const eventEmitter = createEventEmitter<SettingsManagerEvents>()

  let isInitialized = false
  let isVisible = false
  let usageControlsInstance: MetadataUsageControlsInstance | null = null
  let preferencesInstance: MetadataPreferencesInstance | null = null
  let expertModeInstance: MetadataExpertModeInstance | null = null
  let cleanupHandlers: (() => void)[] = []

  const errorMetrics = {
    totalErrors: 0,
    errorsByCategory: {
      'component-initialization': 0,
      'render-failure': 0,
      'preferences-load': 0,
      'storage-error': 0,
      'dom-manipulation': 0,
      unknown: 0,
    } as Record<string, number>,
    lastError: null as Error | null,
    lastErrorTimestamp: null as string | null,
  }

  // Initialize count for tracking retry attempts
  let initRetryCount = 0
  const MAX_INIT_RETRIES = 3

  /**
   * Categorize errors for metrics and recovery strategies.
   * Maps error types to specific error categories for better tracking and handling.
   */
  const categorizeError = (error: Error, context: string): string => {
    const errorMessage = error.message.toLowerCase()
    const contextLower = context.toLowerCase()

    if (contextLower.includes('component') || contextLower.includes('initialization')) {
      return 'component-initialization'
    } else if (contextLower.includes('render') || errorMessage.includes('render')) {
      return 'render-failure'
    } else if (
      contextLower.includes('preferences') ||
      contextLower.includes('load') ||
      errorMessage.includes('preferences')
    ) {
      return 'preferences-load'
    } else if (
      contextLower.includes('storage') ||
      errorMessage.includes('storage') ||
      errorMessage.includes('quota')
    ) {
      return 'storage-error'
    } else if (contextLower.includes('dom') || errorMessage.includes('dom')) {
      return 'dom-manipulation'
    }
    return 'unknown'
  }

  /**
   * Show user-friendly error notification.
   * Uses CSS classes with theme system custom properties for consistent styling.
   */
  const showErrorNotification = (message: string, category: string): void => {
    const feedbackEl = document.createElement('div')
    feedbackEl.className = 'vbs-settings-error-notification'
    feedbackEl.setAttribute('role', 'alert')
    feedbackEl.setAttribute('aria-live', 'assertive')

    const categoryMarkup =
      category === 'unknown'
        ? ''
        : `<small class="vbs-settings-error-notification-category">Category: ${category}</small>`

    feedbackEl.innerHTML = `
      <div class="vbs-settings-error-notification-content">
        <span class="vbs-settings-error-notification-icon">⚠️</span>
        <div>
          <strong class="vbs-settings-error-notification-title">Settings Error</strong>
          <p class="vbs-settings-error-notification-message">${message}</p>
          ${categoryMarkup}
        </div>
      </div>
    `

    document.body.append(feedbackEl)

    setTimeout(() => {
      feedbackEl.classList.add('vbs-settings-error-notification-exit')
      setTimeout(() => {
        feedbackEl.remove()
      }, 300)
    }, 5000)
  }

  /**
   * Track error occurrence and emit metrics event.
   * Maintains closure-based error metrics for monitoring and debugging.
   */
  const trackError = (error: Error, operation: string, context: string): void => {
    const category = categorizeError(error, context)

    errorMetrics.totalErrors++
    errorMetrics.errorsByCategory[category] = (errorMetrics.errorsByCategory[category] || 0) + 1
    errorMetrics.lastError = error
    errorMetrics.lastErrorTimestamp = new Date().toISOString()

    logger.error(`Settings error in ${operation}`, {
      category,
      errorName: error.name,
      errorMessage: error.message,
      context,
      totalErrors: errorMetrics.totalErrors,
      categoryCount: errorMetrics.errorsByCategory[category],
      ...(error.stack ? {stack: error.stack} : {}),
    })
  }

  /**
   * Initialize settings components with error handling and retry logic.
   * Uses lazy initialization to defer component creation until modal is first opened.
   * Implements graceful degradation: individual component failures don't block others.
   *
   * Error Recovery Strategies:
   * - Retry initialization up to MAX_INIT_RETRIES times on transient failures
   * - Individual component failures don't prevent other components from loading
   * - Fallback to minimal UI showing error message if all components fail
   * - Preserve user data even when initialization fails
   */
  const initializeComponents = withErrorHandling(async (): Promise<void> => {
    if (isInitialized) {
      return
    }

    const startTime = performance.now()
    const initializedComponents: string[] = []
    const failedComponents: {name: string; error: Error}[] = []

    logger.info('Initializing settings components', {
      retryAttempt: initRetryCount,
      maxRetries: MAX_INIT_RETRIES,
    })

    if (!usageControlsInstance) {
      try {
        usageControlsInstance = createMetadataUsageControls({
          container: contentContainer,
          preferences,
          getUsageStats,
        })
        usageControlsInstance.render()
        initializedComponents.push('usage-controls')
        logger.info('Usage controls initialized successfully')
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        failedComponents.push({name: 'usage-controls', error: err})
        trackError(err, 'component-initialization', 'Usage controls initialization failed')

        logger.warn('Usage controls failed to initialize, continuing with other components', {
          errorMessage: err.message,
        })
      }
    }

    if (!expertModeInstance) {
      try {
        expertModeInstance = createMetadataExpertMode({
          container: contentContainer,
          preferences,
          initiallyVisible: true,
        })
        expertModeInstance.render()
        initializedComponents.push('expert-mode')
        logger.info('Expert mode toggle initialized successfully')
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        failedComponents.push({name: 'expert-mode', error: err})
        trackError(err, 'component-initialization', 'Expert mode toggle initialization failed')

        logger.warn('Expert mode toggle failed to initialize, continuing with other components', {
          errorMessage: err.message,
        })
      }
    }

    if (!preferencesInstance) {
      try {
        preferencesInstance = createMetadataPreferences({
          container: contentContainer,
          debugPanel,
          preferences,
        })
        preferencesInstance.render()
        initializedComponents.push('preferences')
        logger.info('Preferences initialized successfully')
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        failedComponents.push({name: 'preferences', error: err})
        trackError(err, 'component-initialization', 'Preferences initialization failed')

        logger.warn('Preferences failed to initialize', {
          errorMessage: err.message,
        })
      }
    }

    const duration = performance.now() - startTime

    if (initializedComponents.length === 0 && failedComponents.length > 0) {
      const retryableErrors = failedComponents.filter(
        f => f.error.message.includes('Network') || f.error.message.includes('timeout'),
      )

      // Retry on transient failures
      if (retryableErrors.length > 0 && initRetryCount < MAX_INIT_RETRIES) {
        initRetryCount++
        logger.warn('All components failed, retrying initialization', {
          attempt: initRetryCount,
          maxRetries: MAX_INIT_RETRIES,
          failedComponents: failedComponents.map(f => f.name),
        })

        // Wait briefly before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 500 * initRetryCount))
        await initializeComponents()
        return
      }

      // All retries exhausted or non-retryable errors - show fallback UI
      const errorMessage = `Failed to load settings: ${failedComponents.map(f => f.name).join(', ')}`
      showErrorNotification(
        `${errorMessage}. Some settings may be unavailable. Try refreshing the page.`,
        'component-initialization',
      )

      const firstError = failedComponents[0]
      if (firstError) {
        eventEmitter.emit('settings-error', {
          error: firstError.error,
          operation: 'component-initialization',
          context: `All settings components failed to initialize after ${initRetryCount} retries`,
          timestamp: new Date().toISOString(),
        })
      }

      // Render minimal fallback UI
      contentContainer.innerHTML = `
        <div class="vbs-settings-error-fallback">
          <h3 class="vbs-settings-error-fallback-title">⚠️ Settings Unavailable</h3>
          <p class="vbs-settings-error-fallback-message">Unable to load settings components. Please try:</p>
          <ul class="vbs-settings-error-fallback-list">
            <li>Refreshing the page</li>
            <li>Clearing browser cache</li>
            <li>Checking your internet connection</li>
          </ul>
          <p class="vbs-settings-error-fallback-note">
            Your preferences and progress data are preserved.
          </p>
        </div>
      `

      // Mark as "initialized" to prevent retry loops
      isInitialized = true
      return
    }

    // Partial success - some components initialized
    if (initializedComponents.length > 0) {
      isInitialized = true

      if (failedComponents.length > 0) {
        // Show warning for partial failure
        const failedNames = failedComponents.map(f => f.name).join(', ')
        showErrorNotification(
          `Some settings components failed to load: ${failedNames}. Other settings are available.`,
          'component-initialization',
        )

        logger.warn('Partial settings initialization', {
          initialized: initializedComponents,
          failed: failedComponents.map(f => ({name: f.name, error: f.error.message})),
        })
      }

      eventEmitter.emit('settings-render-complete', {
        componentsInitialized: initializedComponents,
        duration,
        timestamp: new Date().toISOString(),
      })

      logger.info('Settings components initialized', {
        duration,
        components: initializedComponents,
        failedComponents: failedComponents.length,
      })
    }
  }, 'settings-component-initialization')

  /**
   * Show settings modal and initialize components if needed.
   *
   * Error handling wrapper prevents modal failures from breaking the application.
   * Implements user-friendly error notifications when initialization fails.
   */
  const show = async (): Promise<void> => {
    try {
      logger.info('Opening settings modal')

      await initializeComponents()

      modalElement.style.display = 'flex'
      isVisible = true

      eventEmitter.emit('settings-open', {
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      trackError(err, 'settings-modal-show', 'Failed to open settings modal')

      eventEmitter.emit('settings-error', {
        error: err,
        operation: 'settings-modal-show',
        context: 'Settings modal failed to open',
        timestamp: new Date().toISOString(),
      })

      showErrorNotification(
        'Unable to open settings. Please try again or refresh the page.',
        categorizeError(err, 'settings-modal-show'),
      )

      logger.error('Failed to show settings modal', {
        errorMessage: err.message,
        errorName: err.name,
      })
    }
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
   *
   * Cleanup process includes:
   * - Component instance destruction (usage controls, preferences)
   * - Event listener removal (click, keyboard, window events)
   * - DOM reference clearing
   * - State reset (initialization flags, visibility state)
   * - EventEmitter cleanup
   *
   * Metrics tracked:
   * - Cleanup duration
   * - Number of resources freed (event listeners, component instances)
   * - Cleanup success/failure status
   *
   * @example
   * ```typescript
   * // Proper cleanup on application shutdown
   * window.addEventListener('beforeunload', () => {
   *   settingsManager.destroy()
   * })
   *
   * // Manual cleanup when removing settings UI
   * removeSettingsUI()
   * settingsManager.destroy()
   *
   * // Safe to call multiple times (idempotent)
   * settingsManager.destroy()
   * settingsManager.destroy() // No-op, safe
   * ```
   */
  const destroy = withSyncErrorHandling((): void => {
    const cleanupStartTime = performance.now()
    let componentsDestroyed = 0
    let eventListenersRemoved = 0
    let cleanupErrors = 0

    logger.info('Starting settings manager cleanup', {
      componentsToCleanup: [
        usageControlsInstance ? 'usage-controls' : null,
        preferencesInstance ? 'preferences' : null,
        expertModeInstance ? 'expert-mode' : null,
      ].filter(Boolean),
      eventListeners: cleanupHandlers.length,
    })

    if (usageControlsInstance) {
      try {
        usageControlsInstance.destroy()
        usageControlsInstance = null
        componentsDestroyed++
        logger.info('Usage controls instance destroyed')
      } catch (error) {
        cleanupErrors++
        const err = error instanceof Error ? error : new Error(String(error))
        logger.error('Failed to destroy usage controls', {
          error: {name: err.name, message: err.message},
        })
      }
    }

    if (preferencesInstance) {
      try {
        preferencesInstance.destroy()
        preferencesInstance = null
        componentsDestroyed++
        logger.info('Preferences instance destroyed')
      } catch (error) {
        cleanupErrors++
        const err = error instanceof Error ? error : new Error(String(error))
        logger.error('Failed to destroy preferences', {
          error: {name: err.name, message: err.message},
        })
      }
    }

    if (expertModeInstance) {
      try {
        expertModeInstance.destroy()
        expertModeInstance = null
        componentsDestroyed++
        logger.info('Expert mode toggle destroyed')
      } catch (error) {
        cleanupErrors++
        const err = error instanceof Error ? error : new Error(String(error))
        logger.error('Failed to destroy expert mode toggle', {
          error: {name: err.name, message: err.message},
        })
      }
    }

    cleanupHandlers.forEach(handler => {
      try {
        handler()
        eventListenersRemoved++
      } catch (error) {
        cleanupErrors++
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

    const cleanupDuration = performance.now() - cleanupStartTime

    logger.info('Settings manager destroyed', {
      cleanupMetrics: {
        duration: `${cleanupDuration.toFixed(2)}ms`,
        componentsDestroyed,
        eventListenersRemoved,
        cleanupErrors,
        success: cleanupErrors === 0,
      },
    })
  }, 'settings-manager-destroy')

  /**
   * Register event handlers with automatic cleanup tracking.
   *
   * All event listeners registered through this function are automatically
   * removed during destroy() to prevent memory leaks. This is the preferred
   * way to add event listeners within the settings manager.
   *
   * Cleanup handlers are stored in closure state and invoked in FIFO order
   * during destroy() execution.
   *
   * @param target - EventTarget to attach listener to (Element, Document, Window, etc.)
   * @param eventName - Event name to listen for ('click', 'keydown', 'beforeunload', etc.)
   * @param handler - Event handler function to execute
   *
   * @example
   * ```typescript
   * // Register button click handler with automatic cleanup
   * registerEventHandler(closeButton, 'click', () => {
   *   settingsManager.hide()
   * })
   *
   * // Register keyboard handler
   * registerEventHandler(document, 'keydown', (e: Event) => {
   *   if (e instanceof KeyboardEvent && e.key === 'Escape') {
   *     settingsManager.hide()
   *   }
   * })
   *
   * // All listeners automatically removed on destroy()
   * settingsManager.destroy() // Cleanup happens here
   * ```
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

  /**
   * Get error metrics for monitoring and debugging.
   * Provides insights into error frequency, categories, and recent failures.
   *
   * @returns Object containing error metrics and statistics
   *
   * @example
   * ```typescript
   * const metrics = settingsManager.getErrorMetrics()
   * console.log(`Total errors: ${metrics.totalErrors}`)
   * console.log(`Component init errors: ${metrics.errorsByCategory['component-initialization']}`)
   * ```
   */
  const getErrorMetrics = () => {
    return {
      totalErrors: errorMetrics.totalErrors,
      errorsByCategory: {...errorMetrics.errorsByCategory},
      lastError: errorMetrics.lastError
        ? {
            name: errorMetrics.lastError.name,
            message: errorMetrics.lastError.message,
            timestamp: errorMetrics.lastErrorTimestamp,
          }
        : null,
      initRetryCount,
    }
  }

  logger.info('Settings manager created')

  // Return public API
  return {
    show,
    hide,
    toggle,
    destroy,
    getErrorMetrics,
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    once: eventEmitter.once.bind(eventEmitter),
    removeAllListeners: eventEmitter.removeAllListeners.bind(eventEmitter),
  }
}
