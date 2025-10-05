/**
 * Error handling utilities for the VBS application
 * Provides centralized error management, logging, and user-friendly error reporting
 */

export interface ErrorDetails {
  error: Error
  context: string
  timestamp: Date
  userAgent?: string
  url?: string
}

export interface ErrorHandler {
  handleError: (error: Error, context: string) => void
  logError: (details: ErrorDetails) => void
  showUserError: (message: string, isRecoverable?: boolean) => void
  getErrorSummary: () => ErrorDetails[]
}

/**
 * Create a comprehensive error handler for the application
 * Handles errors gracefully while providing debugging information
 */
export const createErrorHandler = (): ErrorHandler => {
  const errorLog: ErrorDetails[] = []
  const MAX_ERRORS = 50 // Prevent memory issues with too many stored errors

  const logError = (details: ErrorDetails): void => {
    errorLog.push(details)

    // Keep only the most recent errors
    if (errorLog.length > MAX_ERRORS) {
      errorLog.splice(0, errorLog.length - MAX_ERRORS)
    }

    // Log to console for development
    console.error(`[VBS Error] ${details.context}:`, details.error)

    // In production, you could send to error tracking service
    if (import.meta.env.PROD) {
      // Example: Send to error tracking service
      // sendToErrorService(details)
    }
  }

  const showUserError = (message: string, isRecoverable = true): void => {
    const prefix = isRecoverable ? 'Notice:' : 'Error:'
    const fullMessage = `${prefix} ${message}`

    // Show user-friendly error notification
    if ('Notification' in window && Notification.permission === 'granted') {
      // Create notification for user feedback (side effect is intentional)
      // eslint-disable-next-line no-new
      new Notification('VBS Error', {
        body: fullMessage,
        icon: '/favicon.ico',
      })
    } else if (isRecoverable) {
      console.warn(fullMessage)
    } else {
      // eslint-disable-next-line no-alert
      alert(fullMessage)
    }
  }

  const handleError = (error: Error, context: string): void => {
    const details: ErrorDetails = {
      error,
      context,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    }

    logError(details)

    // Determine error severity and user message
    if (error.name === 'QuotaExceededError') {
      showUserError(
        'Storage quota exceeded. Some data may not be saved. Try clearing browser cache.',
        true,
      )
    } else if (error.message.includes('Network')) {
      showUserError('Network error occurred. Check your internet connection.', true)
    } else if (context.includes('render') || context.includes('DOM')) {
      showUserError('Display error occurred. Try refreshing the page.', true)
    } else if (context.includes('storage')) {
      showUserError('Data save/load error. Your progress may not be preserved.', true)
    } else {
      // Generic error
      showUserError(
        'An unexpected error occurred. The application will continue to function.',
        true,
      )
    }
  }

  const getErrorSummary = (): ErrorDetails[] => {
    return [...errorLog] // Return copy to prevent external modification
  }

  return {
    handleError,
    logError,
    showUserError,
    getErrorSummary,
  }
}

/**
 * Global error handler singleton for the application
 */
let globalErrorHandler: ErrorHandler | null = null

export const getGlobalErrorHandler = (): ErrorHandler => {
  if (!globalErrorHandler) {
    globalErrorHandler = createErrorHandler()
  }
  return globalErrorHandler
}

/**
 * Utility function to wrap async operations with error handling
 */
export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context: string,
  errorHandler = getGlobalErrorHandler(),
) => {
  return async (...args: T): Promise<R | null> => {
    try {
      return await fn(...args)
    } catch (error) {
      errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), context)
      return null
    }
  }
}

/**
 * Utility function to wrap synchronous operations with error handling
 */
export const withSyncErrorHandling = <T extends any[], R>(
  fn: (...args: T) => R,
  context: string,
  errorHandler = getGlobalErrorHandler(),
) => {
  return (...args: T): R | null => {
    try {
      return fn(...args)
    } catch (error) {
      errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), context)
      return null
    }
  }
}

/**
 * Initialize global error handlers for unhandled errors and promise rejections
 */
export const initializeGlobalErrorHandling = (): void => {
  const errorHandler = getGlobalErrorHandler()

  // Handle unhandled JavaScript errors
  window.addEventListener('error', event => {
    errorHandler.handleError(event.error || new Error(event.message), 'Unhandled Error')
  })

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', event => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason))
    errorHandler.handleError(error, 'Unhandled Promise Rejection')
  })

  // Request notification permission if not already granted
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}
