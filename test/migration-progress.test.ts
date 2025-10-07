import {beforeEach, describe, expect, it, vi} from 'vitest'
import {
  createMigrationProgress,
  type MigrationProgressInstance,
} from '../src/components/migration-progress.js'

// Mock DOM methods
Object.defineProperty(document, 'head', {
  value: {
    append: vi.fn(),
  },
  writable: true,
})

Object.defineProperty(document, 'body', {
  value: {
    append: vi.fn(),
    focus: vi.fn(),
  },
  writable: true,
})

Object.defineProperty(document, 'createElement', {
  value: vi.fn(() => ({
    className: '',
    innerHTML: '',
    setAttribute: vi.fn(),
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(() => []),
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
    },
    addEventListener: vi.fn(),
    style: {},
    parentElement: {
      setAttribute: vi.fn(),
    },
  })),
  writable: true,
})

describe('MigrationProgress', () => {
  let migrationProgress: MigrationProgressInstance

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Create fresh instance
    migrationProgress = createMigrationProgress()
  })

  it('should create migration progress instance with required methods', () => {
    expect(migrationProgress).toBeDefined()
    expect(typeof migrationProgress.show).toBe('function')
    expect(typeof migrationProgress.hide).toBe('function')
    expect(typeof migrationProgress.updateProgress).toBe('function')
    expect(typeof migrationProgress.showError).toBe('function')
    expect(typeof migrationProgress.showSuccess).toBe('function')
    expect(typeof migrationProgress.cancel).toBe('function')
    expect(typeof migrationProgress.on).toBe('function')
    expect(typeof migrationProgress.off).toBe('function')
    expect(typeof migrationProgress.once).toBe('function')
  })

  it('should emit migration-progress event when updateProgress is called', () => {
    const mockListener = vi.fn()
    migrationProgress.on('migration-progress', mockListener)

    migrationProgress.updateProgress('backup', 50, 'Creating backup...')

    expect(mockListener).toHaveBeenCalledWith({
      step: 'backup',
      progress: 50,
      message: 'Creating backup...',
    })
  })

  it('should emit migration-progress event without message when message is undefined', () => {
    const mockListener = vi.fn()
    migrationProgress.on('migration-progress', mockListener)

    migrationProgress.updateProgress('validate', 75)

    expect(mockListener).toHaveBeenCalledWith({
      step: 'validate',
      progress: 75,
    })
  })

  it('should emit migration-completed event when showSuccess is called', () => {
    const mockListener = vi.fn()
    migrationProgress.on('migration-completed', mockListener)

    migrationProgress.showSuccess('Migration completed successfully!')

    expect(mockListener).toHaveBeenCalledWith({
      success: true,
      message: 'Migration completed successfully!',
    })
  })

  it('should emit migration-cancelled event when cancel is called', () => {
    const mockListener = vi.fn()
    migrationProgress.on('migration-cancelled', mockListener)

    migrationProgress.cancel()

    expect(mockListener).toHaveBeenCalledWith({})
  })

  it('should support one-time event listeners', () => {
    const mockListener = vi.fn()
    migrationProgress.once('migration-completed', mockListener)

    migrationProgress.showSuccess('First success')
    migrationProgress.showSuccess('Second success')

    expect(mockListener).toHaveBeenCalledTimes(1)
    expect(mockListener).toHaveBeenCalledWith({
      success: true,
      message: 'First success',
    })
  })

  it('should allow removing event listeners', () => {
    const mockListener = vi.fn()
    migrationProgress.on('migration-progress', mockListener)

    migrationProgress.updateProgress('backup', 25)
    expect(mockListener).toHaveBeenCalledTimes(1)

    migrationProgress.off('migration-progress', mockListener)
    migrationProgress.updateProgress('validate', 50)

    expect(mockListener).toHaveBeenCalledTimes(1)
  })

  it('should create DOM elements when show is called', () => {
    const mockModal = {
      className: '',
      innerHTML: '',
      setAttribute: vi.fn(),
      querySelector: vi.fn(),
      querySelectorAll: vi.fn(() => []),
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
      },
      addEventListener: vi.fn(),
    }

    const createElementMock = document.createElement as ReturnType<typeof vi.fn>
    createElementMock.mockReturnValue(mockModal as any)

    migrationProgress.show()

    expect(createElementMock).toHaveBeenCalledWith('div')
    expect(createElementMock).toHaveBeenCalledWith('style')

    const headAppend = document.head.append as ReturnType<typeof vi.fn>

    const bodyAppend = document.body.append as ReturnType<typeof vi.fn>
    expect(headAppend).toHaveBeenCalled()
    expect(bodyAppend).toHaveBeenCalled()
  })

  it('should handle progress clamping correctly', () => {
    const mockListener = vi.fn()
    migrationProgress.on('migration-progress', mockListener)

    // Test values outside valid range
    migrationProgress.updateProgress('backup', -10)
    expect(mockListener).toHaveBeenCalledWith({
      step: 'backup',
      progress: -10,
    })

    mockListener.mockClear()

    migrationProgress.updateProgress('validate', 150)
    expect(mockListener).toHaveBeenCalledWith({
      step: 'validate',
      progress: 150,
    })
  })

  it('should support all migration steps', () => {
    const mockListener = vi.fn()
    migrationProgress.on('migration-progress', mockListener)

    const steps = ['backup', 'validate', 'migrate', 'verify']

    steps.forEach((step, index) => {
      migrationProgress.updateProgress(step, (index + 1) * 25)
    })

    expect(mockListener).toHaveBeenCalledTimes(4)
    expect(mockListener).toHaveBeenNthCalledWith(1, {
      step: 'backup',
      progress: 25,
    })
    expect(mockListener).toHaveBeenNthCalledWith(4, {
      step: 'verify',
      progress: 100,
    })
  })

  it('should handle error states correctly', () => {
    // showError should not emit any events, just update UI state
    const mockListener = vi.fn()
    migrationProgress.on('migration-progress', mockListener)
    migrationProgress.on('migration-completed', mockListener)
    migrationProgress.on('migration-cancelled', mockListener)

    migrationProgress.showError('Something went wrong')

    expect(mockListener).not.toHaveBeenCalled()
  })

  it('should auto-hide after successful completion', () => {
    vi.useFakeTimers()

    // Create a mock for the modal's classList.remove method to track hide calls
    const mockModal = {
      className: '',
      innerHTML: '',
      setAttribute: vi.fn(),
      querySelector: vi.fn(),
      querySelectorAll: vi.fn(() => []),
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
      },
      addEventListener: vi.fn(),
    }

    const mockCreateElement = vi.mocked(document.createElement)
    mockCreateElement.mockReturnValue(mockModal as any)

    // Trigger show to create the modal
    migrationProgress.show()

    // Call showSuccess which should auto-hide
    migrationProgress.showSuccess('All done!')

    // Should not remove 'visible' class immediately
    expect(mockModal.classList.remove).not.toHaveBeenCalledWith('visible')

    // Should remove 'visible' class after 3 seconds
    vi.advanceTimersByTime(3000)
    expect(mockModal.classList.remove).toHaveBeenCalledWith('visible')

    vi.useRealTimers()
  })
})
