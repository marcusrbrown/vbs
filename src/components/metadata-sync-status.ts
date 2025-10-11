/**
 * Metadata Sync Status Indicator Component
 *
 * Provides persistent, non-intrusive status indicators for background metadata sync operations.
 * Displays real-time notifications about sync progress, completion, and errors with expandable details.
 *
 * Features:
 * - Toast-style notifications for sync operations (info, success, warning, error)
 * - Real-time progress tracking with percentage completion
 * - Service Worker integration for background sync monitoring
 * - Auto-hide behavior for success notifications
 * - Expandable details for error messages and operation specifics
 * - Queue management for multiple simultaneous notifications
 * - Responsive positioning (top-right, bottom-right, etc.)
 * - Keyboard accessible with screen reader support
 *
 * Integration:
 * - Listens to Service Worker postMessage events for background sync updates
 * - Uses generic EventEmitter for type-safe event handling
 * - Follows VBS theme system with CSS custom properties
 * - Integrates with main application UI without blocking content
 */

import type {
  MetadataSyncStatusIndicatorConfig,
  MetadataSyncStatusIndicatorEvents,
  MetadataSyncStatusIndicatorInstance,
  SyncNotification,
  SyncStatusDisplayMode,
  SyncStatusNotificationType,
} from '../modules/types.js'
import {withSyncErrorHandling} from '../modules/error-handler.js'
import {createEventEmitter} from '../modules/events.js'

import './metadata-sync-status.css'

/**
 * Create a metadata sync status indicator component instance.
 * Factory function following VBS functional factory architecture pattern.
 *
 * @param config - Configuration for the sync status indicator
 * @returns Metadata sync status indicator instance with full API
 */
export const createMetadataSyncStatusIndicator = (
  config: MetadataSyncStatusIndicatorConfig,
): MetadataSyncStatusIndicatorInstance => {
  const {
    container,
    initialMode = 'compact',
    position = 'bottom-right',
    maxNotifications = 3,
    defaultAutoHideDelay = 5000,
    enableServiceWorkerIntegration = true,
    serviceWorkerRegistration = null,
    enableDesktopNotifications = false,
  } = config

  // Private state managed via closure variables
  let displayMode: SyncStatusDisplayMode = initialMode
  let notifications: SyncNotification[] = []
  const notificationElements = new Map<string, HTMLElement>()
  const autoHideTimers = new Map<string, number>()

  // DOM elements cache
  const elements: {
    indicatorContainer?: HTMLElement
    notificationsList?: HTMLElement
    expandToggle?: HTMLButtonElement
  } = {}

  const eventEmitter = createEventEmitter<MetadataSyncStatusIndicatorEvents>()

  const generateNotificationId = (): string => {
    return `notification_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  }

  const formatRelativeTime = (timestamp: string): string => {
    const now = Date.now()
    const then = new Date(timestamp).getTime()
    const diff = now - then

    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

  const getNotificationIcon = (type: SyncStatusNotificationType): string => {
    switch (type) {
      case 'info':
        return 'ℹ️'
      case 'success':
        return '✅'
      case 'warning':
        return '⚠️'
      case 'error':
        return '❌'
      default:
        return 'ℹ️'
    }
  }

  const createNotificationElement = (notification: SyncNotification): HTMLElement => {
    const notificationEl = document.createElement('div')
    notificationEl.className = `vbs-sync-notification vbs-sync-notification--${notification.type} vbs-sync-notification--${displayMode}`
    notificationEl.setAttribute('role', 'alert')
    notificationEl.setAttribute('aria-live', notification.type === 'error' ? 'assertive' : 'polite')
    notificationEl.dataset.notificationId = notification.id

    const icon = document.createElement('span')
    icon.className = 'vbs-sync-notification__icon'
    icon.setAttribute('aria-hidden', 'true')
    icon.textContent = getNotificationIcon(notification.type)

    const content = document.createElement('div')
    content.className = 'vbs-sync-notification__content'

    const message = document.createElement('div')
    message.className = 'vbs-sync-notification__message'
    message.textContent = notification.message

    content.append(message)

    if (notification.details && displayMode === 'expanded') {
      const details = document.createElement('div')
      details.className = 'vbs-sync-notification__details'
      details.textContent = notification.details
      content.append(details)
    }

    if (typeof notification.progress === 'number' && notification.progress >= 0) {
      const progressContainer = document.createElement('div')
      progressContainer.className = 'vbs-sync-notification__progress'

      const progressBar = document.createElement('div')
      progressBar.className = 'vbs-sync-notification__progress-bar'
      progressBar.style.width = `${notification.progress}%`
      progressBar.setAttribute('role', 'progressbar')
      progressBar.setAttribute('aria-valuenow', notification.progress.toString())
      progressBar.setAttribute('aria-valuemin', '0')
      progressBar.setAttribute('aria-valuemax', '100')
      progressBar.setAttribute('aria-label', `${notification.progress}% complete`)

      progressContainer.append(progressBar)
      content.append(progressContainer)
    }

    const timestamp = document.createElement('div')
    timestamp.className = 'vbs-sync-notification__timestamp'
    timestamp.textContent = formatRelativeTime(notification.timestamp)
    content.append(timestamp)

    notificationEl.append(icon, content)

    if (notification.dismissible) {
      const dismissButton = document.createElement('button')
      dismissButton.className = 'vbs-sync-notification__dismiss'
      dismissButton.type = 'button'
      dismissButton.setAttribute('aria-label', 'Dismiss notification')
      dismissButton.textContent = '✕'

      dismissButton.addEventListener('click', () => {
        dismissNotification(notification.id)
      })

      notificationEl.append(dismissButton)
    }

    return notificationEl
  }

  const renderNotifications = withSyncErrorHandling(() => {
    if (!elements.notificationsList) return

    // Clear existing notifications from DOM
    elements.notificationsList.innerHTML = ''
    notificationElements.clear()

    // Limit to maxNotifications
    const visibleNotifications = notifications.slice(0, maxNotifications)

    visibleNotifications.forEach(notification => {
      const notificationEl = createNotificationElement(notification)
      notificationElements.set(notification.id, notificationEl)
      elements.notificationsList?.append(notificationEl)
    })

    // Update container visibility
    if (elements.indicatorContainer) {
      if (notifications.length > 0) {
        elements.indicatorContainer.classList.add('vbs-sync-status--visible')
      } else {
        elements.indicatorContainer.classList.remove('vbs-sync-status--visible')
      }
    }
  }, 'metadata-sync-status:renderNotifications')

  const setupAutoHide = (notificationId: string, delay: number) => {
    const timerId = window.setTimeout(() => {
      dismissNotification(notificationId)
    }, delay)

    autoHideTimers.set(notificationId, timerId)
  }

  const clearAutoHide = (notificationId: string) => {
    const timerId = autoHideTimers.get(notificationId)
    if (timerId) {
      window.clearTimeout(timerId)
      autoHideTimers.delete(notificationId)
    }
  }

  const showNotification = (
    type: SyncStatusNotificationType,
    message: string,
    options: {
      details?: string
      autoHide?: boolean
      autoHideDelay?: number
      progress?: number
      operationId?: string
    } = {},
  ): string => {
    const notificationId = generateNotificationId()

    // Auto-hide success/info by default to avoid notification fatigue
    const autoHide = options.autoHide ?? (type === 'success' || type === 'info')
    const autoHideDelay = options.autoHideDelay ?? defaultAutoHideDelay

    const notification: SyncNotification = {
      id: notificationId,
      type,
      message,
      ...(options.details !== undefined && {details: options.details}),
      timestamp: new Date().toISOString(),
      autoHide,
      ...(autoHideDelay !== undefined && {autoHideDelay}),
      ...(options.operationId !== undefined && {operationId: options.operationId}),
      ...(options.progress !== undefined && {progress: options.progress}),
      dismissible: true,
    }

    // Add to beginning for most-recent-first display
    notifications.unshift(notification)
    renderNotifications()

    if (autoHide && autoHideDelay) {
      setupAutoHide(notificationId, autoHideDelay)
    }

    eventEmitter.emit('notification-added', {notification})

    // Create system notification for important updates when user has granted permission
    if (
      enableDesktopNotifications &&
      'Notification' in window &&
      Notification.permission === 'granted' &&
      options.details
    ) {
      // Create desktop notification (side effect is intentional)
      // eslint-disable-next-line no-new
      new Notification(`VBS: ${message}`, {
        body: options.details,
        icon: '/vbs/favicon.ico',
        tag: notificationId,
      })
    }

    return notificationId
  }

  const dismissNotification = (notificationId: string): boolean => {
    const index = notifications.findIndex(n => n.id === notificationId)
    if (index === -1) return false

    notifications.splice(index, 1)
    clearAutoHide(notificationId)
    renderNotifications()

    eventEmitter.emit('notification-dismissed', {notificationId})

    return true
  }

  const clearAllNotifications = withSyncErrorHandling(() => {
    autoHideTimers.forEach(timerId => window.clearTimeout(timerId))
    autoHideTimers.clear()
    notifications = []
    renderNotifications()
  }, 'metadata-sync-status:clearAllNotifications')

  const updateProgress = (notificationId: string, progress: number) => {
    const notification = notifications.find(n => n.id === notificationId)
    if (!notification) return

    notification.progress = Math.max(0, Math.min(100, progress))

    const notificationEl = notificationElements.get(notificationId)
    if (notificationEl) {
      const progressBar = notificationEl.querySelector('.vbs-sync-notification__progress-bar')
      if (progressBar instanceof HTMLElement) {
        progressBar.style.width = `${notification.progress}%`
        progressBar.setAttribute('aria-valuenow', notification.progress.toString())
        progressBar.setAttribute('aria-label', `${notification.progress}% complete`)
      }
    }
  }

  const updateNotification = (
    notificationId: string,
    updates: {message?: string; details?: string; type?: SyncStatusNotificationType},
  ) => {
    const notification = notifications.find(n => n.id === notificationId)
    if (!notification) return

    if (updates.message !== undefined) notification.message = updates.message
    if (updates.details !== undefined) notification.details = updates.details
    if (updates.type !== undefined) notification.type = updates.type

    renderNotifications()
  }

  const setDisplayMode = (mode: SyncStatusDisplayMode) => {
    if (displayMode === mode) return

    displayMode = mode

    if (elements.indicatorContainer) {
      elements.indicatorContainer.classList.toggle('vbs-sync-status--expanded', mode === 'expanded')
      elements.indicatorContainer.classList.toggle('vbs-sync-status--compact', mode === 'compact')
    }

    renderNotifications()
    eventEmitter.emit('mode-changed', {mode})
  }

  const getDisplayMode = (): SyncStatusDisplayMode => displayMode

  const getNotifications = (): SyncNotification[] => [...notifications]

  const handleServiceWorkerMessage = (event: MessageEvent) => {
    const {type, data} = event.data

    switch (type) {
      case 'metadata-sync-started': {
        showNotification('info', `Syncing ${data.totalJobs} episodes...`, {
          details: `Operation: ${data.operationType}`,
          autoHide: false,
          progress: 0,
          operationId: data.operationId,
        })

        eventEmitter.emit('sync-started', {
          operationId: data.operationId,
          operationType: data.operationType,
          totalJobs: data.totalJobs,
        })

        break
      }

      case 'metadata-sync-progress': {
        const notification = notifications.find(n => n.operationId === data.operationId)
        if (notification) {
          updateProgress(notification.id, data.percentComplete)

          eventEmitter.emit('sync-progress', {
            operationId: data.operationId,
            completedJobs: data.completedJobs,
            totalJobs: data.totalJobs,
            percentComplete: data.percentComplete,
          })
        }
        break
      }

      case 'metadata-sync-completed': {
        const notification = notifications.find(n => n.operationId === data.operationId)
        if (notification) {
          dismissNotification(notification.id)
        }

        showNotification('success', `Sync complete: ${data.completedJobs} episodes updated`, {
          details: `Duration: ${Math.round(data.duration / 1000)}s`,
          autoHide: true,
          autoHideDelay: 5000,
        })

        eventEmitter.emit('sync-completed', {
          operationId: data.operationId,
          completedJobs: data.completedJobs,
          duration: data.duration,
        })

        break
      }

      case 'metadata-sync-failed': {
        const notification = notifications.find(n => n.operationId === data.operationId)
        if (notification) {
          dismissNotification(notification.id)
        }

        showNotification('error', 'Sync failed', {
          details: data.error,
          autoHide: false,
        })

        eventEmitter.emit('sync-failed', {
          operationId: data.operationId,
          error: data.error,
        })

        break
      }
    }
  }

  const setupServiceWorkerIntegration = withSyncErrorHandling(() => {
    if (!enableServiceWorkerIntegration) return

    if (serviceWorkerRegistration && serviceWorkerRegistration.active) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)
    } else if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(() => {
          navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)
        })
        .catch((error: unknown) => {
          console.error('Service Worker registration failed:', error)
        })
    }
  }, 'metadata-sync-status:setupServiceWorkerIntegration')

  const createDOMStructure = withSyncErrorHandling(() => {
    const indicatorContainer = document.createElement('div')
    indicatorContainer.className = `vbs-sync-status vbs-sync-status--${position} vbs-sync-status--${displayMode}`
    indicatorContainer.setAttribute('role', 'region')
    indicatorContainer.setAttribute('aria-label', 'Metadata sync status notifications')

    const notificationsList = document.createElement('div')
    notificationsList.className = 'vbs-sync-status__notifications'

    indicatorContainer.append(notificationsList)
    container.append(indicatorContainer)

    elements.indicatorContainer = indicatorContainer
    elements.notificationsList = notificationsList
  }, 'metadata-sync-status:createDOMStructure')

  const render = withSyncErrorHandling(() => {
    createDOMStructure()
    setupServiceWorkerIntegration()
    renderNotifications()
  }, 'metadata-sync-status:render')

  const destroy = withSyncErrorHandling(() => {
    autoHideTimers.forEach(timerId => window.clearTimeout(timerId))
    autoHideTimers.clear()

    if (enableServiceWorkerIntegration) {
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage)
    }

    if (elements.indicatorContainer) {
      elements.indicatorContainer.remove()
    }

    notifications = []
    notificationElements.clear()
    eventEmitter.removeAllListeners()
  }, 'metadata-sync-status:destroy')

  // Initialize component
  render()

  return {
    showNotification,
    dismissNotification,
    clearAllNotifications,
    updateProgress,
    updateNotification,
    setDisplayMode,
    getDisplayMode,
    getNotifications,
    render,
    destroy,
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    once: eventEmitter.once.bind(eventEmitter),
    removeAllListeners: eventEmitter.removeAllListeners.bind(eventEmitter),
  }
}
