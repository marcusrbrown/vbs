import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {
  createErrorHandler,
  initializeGlobalErrorHandling,
  withErrorHandling,
  withSyncErrorHandling,
} from '../src/modules/error-handler'

describe('Error Handler', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  let alertSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Mock console methods and alert
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    alertSpy.mockRestore()
  })

  describe('createErrorHandler', () => {
    it('should create error handler with required methods', () => {
      const errorHandler = createErrorHandler()
      expect(errorHandler).toBeDefined()
      expect(typeof errorHandler.handleError).toBe('function')
      expect(typeof errorHandler.logError).toBe('function')
      expect(typeof errorHandler.showUserError).toBe('function')
      expect(typeof errorHandler.getErrorSummary).toBe('function')
    })

    it('should handle errors with context', () => {
      const errorHandler = createErrorHandler()
      const testError = new Error('Test error')

      errorHandler.handleError(testError, 'Test Context')

      expect(consoleErrorSpy).toHaveBeenCalledWith('[VBS Error] Test Context:', testError)
    })

    it('should log error details', () => {
      const errorHandler = createErrorHandler()
      const testError = new Error('Test error')
      const errorDetails = {
        error: testError,
        context: 'Test Context',
        timestamp: new Date(),
        userAgent: 'test-agent',
        url: 'http://localhost/test',
      }

      errorHandler.logError(errorDetails)

      expect(consoleErrorSpy).toHaveBeenCalledWith('[VBS Error] Test Context:', testError)

      const summary = errorHandler.getErrorSummary()
      expect(summary).toHaveLength(1)

      const firstError = summary[0]
      expect(firstError).toBeDefined()
      expect(firstError?.error).toBe(testError)
      expect(firstError?.context).toBe('Test Context')
    })

    it('should show user errors with warning for recoverable errors', () => {
      const errorHandler = createErrorHandler()

      errorHandler.showUserError('Test recoverable error', true)

      expect(consoleWarnSpy).toHaveBeenCalledWith('Notice: Test recoverable error')
    })

    it('should show user errors with alert for non-recoverable errors', () => {
      const errorHandler = createErrorHandler()

      errorHandler.showUserError('Test critical error', false)

      expect(alertSpy).toHaveBeenCalledWith('Error: Test critical error')
    })

    it('should limit error log size', () => {
      const errorHandler = createErrorHandler()
      const maxErrors = 50

      // Add more than the maximum number of errors
      for (let i = 0; i < maxErrors + 10; i++) {
        errorHandler.logError({
          error: new Error(`Error ${i}`),
          context: `Context ${i}`,
          timestamp: new Date(),
        })
      }

      const summary = errorHandler.getErrorSummary()
      expect(summary).toHaveLength(maxErrors)

      // Should have the most recent errors
      const lastError = summary.at(-1)
      expect(lastError).toBeDefined()
      expect(lastError?.context).toBe(`Context ${maxErrors + 9}`)
    })

    it('should handle specific error types with appropriate messages', () => {
      const errorHandler = createErrorHandler()

      // Quota exceeded error
      const quotaError = new Error('Storage quota exceeded')
      quotaError.name = 'QuotaExceededError'
      errorHandler.handleError(quotaError, 'storage context')

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Notice: Storage quota exceeded. Some data may not be saved. Try clearing browser cache.',
      )

      // Network error
      const networkError = new Error('Network request failed')
      errorHandler.handleError(networkError, 'network context')

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Notice: Network error occurred. Check your internet connection.',
      )

      // Render error
      const renderError = new Error('DOM manipulation failed')
      errorHandler.handleError(renderError, 'render context')

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Notice: Display error occurred. Try refreshing the page.',
      )

      // Storage error
      const storageError = new Error('LocalStorage failed')
      errorHandler.handleError(storageError, 'storage context')

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Notice: Data save/load error. Your progress may not be preserved.',
      )

      // Generic error
      const genericError = new Error('Unknown error')
      errorHandler.handleError(genericError, 'generic context')

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Notice: An unexpected error occurred. The application will continue to function.',
      )
    })
  })

  describe('withErrorHandling', () => {
    it('should handle async function errors', async () => {
      const testError = new Error('Async test error')
      const asyncFunction = vi.fn().mockRejectedValue(testError)

      const wrappedFunction = withErrorHandling(asyncFunction, 'Test Context')

      await wrappedFunction()

      expect(asyncFunction).toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalledWith('[VBS Error] Test Context:', testError)
    })

    it('should execute async functions successfully', async () => {
      const asyncFunction = vi.fn().mockResolvedValue('success')

      const wrappedFunction = withErrorHandling(asyncFunction, 'Test Context')

      const result = await wrappedFunction()

      expect(asyncFunction).toHaveBeenCalled()
      expect(result).toBe('success')
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it('should pass arguments to wrapped async function', async () => {
      const asyncFunction = vi.fn().mockResolvedValue('success')

      const wrappedFunction = withErrorHandling(asyncFunction, 'Test Context')

      await wrappedFunction('arg1', 'arg2')

      expect(asyncFunction).toHaveBeenCalledWith('arg1', 'arg2')
    })
  })

  describe('withSyncErrorHandling', () => {
    it('should handle sync function errors', () => {
      const testError = new Error('Sync test error')
      const syncFunction = vi.fn().mockImplementation(() => {
        throw testError
      })

      const wrappedFunction = withSyncErrorHandling(syncFunction, 'Test Context')

      wrappedFunction()

      expect(syncFunction).toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalledWith('[VBS Error] Test Context:', testError)
    })

    it('should execute sync functions successfully', () => {
      const syncFunction = vi.fn().mockReturnValue('success')

      const wrappedFunction = withSyncErrorHandling(syncFunction, 'Test Context')

      const result = wrappedFunction()

      expect(syncFunction).toHaveBeenCalled()
      expect(result).toBe('success')
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it('should pass arguments to wrapped sync function', () => {
      const syncFunction = vi.fn().mockReturnValue('success')

      const wrappedFunction = withSyncErrorHandling(syncFunction, 'Test Context')

      wrappedFunction('arg1', 'arg2')

      expect(syncFunction).toHaveBeenCalledWith('arg1', 'arg2')
    })
  })

  describe('initializeGlobalErrorHandling', () => {
    it('should initialize global error handlers', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      initializeGlobalErrorHandling()

      expect(addEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function))

      addEventListenerSpy.mockRestore()
    })

    it('should handle global errors', () => {
      initializeGlobalErrorHandling()

      const testError = new Error('Global test error')
      const errorEvent = new ErrorEvent('error', {
        error: testError,
        message: 'Global test error',
        filename: 'test.js',
        lineno: 42,
        colno: 10,
      })

      window.dispatchEvent(errorEvent)

      expect(consoleErrorSpy).toHaveBeenCalledWith('[VBS Error] Unhandled Error:', testError)
    })

    it('should handle unhandled promise rejections', () => {
      initializeGlobalErrorHandling()

      const testError = new Error('Promise rejection test')

      // Create a mock unhandledrejection event
      const rejectionEvent = new Event('unhandledrejection')
      // Add reason property to mock the PromiseRejectionEvent
      Object.defineProperty(rejectionEvent, 'reason', {
        value: testError,
        writable: false,
      })

      window.dispatchEvent(rejectionEvent)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[VBS Error] Unhandled Promise Rejection:',
        testError,
      )
    })
  })

  describe('Integration', () => {
    it('should maintain error history', () => {
      const errorHandler = createErrorHandler()

      errorHandler.handleError(new Error('Error 1'), 'Context 1')
      errorHandler.handleError(new Error('Error 2'), 'Context 2')
      errorHandler.handleError(new Error('Error 3'), 'Context 3')

      const summary = errorHandler.getErrorSummary()
      expect(summary).toHaveLength(3)
      expect(summary[0]?.context).toBe('Context 1')
      expect(summary[1]?.context).toBe('Context 2')
      expect(summary[2]?.context).toBe('Context 3')
    })

    it('should return immutable error summary', () => {
      const errorHandler = createErrorHandler()
      errorHandler.handleError(new Error('Test error'), 'Test context')

      const summary1 = errorHandler.getErrorSummary()
      const summary2 = errorHandler.getErrorSummary()

      expect(summary1).not.toBe(summary2) // Different array instances
      expect(summary1).toEqual(summary2) // But same content
    })
  })
})
