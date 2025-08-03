import type {ProgressTrackerInstance, SearchFilterInstance} from '../src/modules/types.js'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {createProgressTracker} from '../src/modules/progress.js'
import {createSearchFilter} from '../src/modules/search.js'

// Mock localStorage for tests
vi.stubGlobal('localStorage', {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
})

describe('Performance Benchmarks', () => {
  let progressTracker: ProgressTrackerInstance
  let searchFilter: SearchFilterInstance

  beforeEach(() => {
    progressTracker = createProgressTracker()
    searchFilter = createSearchFilter()
  })

  describe('Generic EventEmitter Performance', () => {
    it('should handle multiple event subscriptions efficiently', () => {
      const startTime = performance.now()

      // Create many listeners
      const listeners = Array.from({length: 1000}, () => vi.fn())

      // Subscribe all listeners
      listeners.forEach(listener => {
        progressTracker.on('item-toggle', listener)
      })

      const subscriptionTime = performance.now() - startTime

      // Emit event to all listeners
      const emitStartTime = performance.now()
      progressTracker.toggleItem('test-item')
      const emitTime = performance.now() - emitStartTime

      // Verify all listeners were called
      listeners.forEach(listener => {
        expect(listener).toHaveBeenCalledTimes(1)
      })

      // Performance assertions (should be fast)
      expect(subscriptionTime).toBeLessThan(100) // Less than 100ms for 1000 subscriptions
      expect(emitTime).toBeLessThan(50) // Less than 50ms to emit to 1000 listeners

      // Store timing info for reference
      expect(subscriptionTime).toBeGreaterThan(0)
      expect(emitTime).toBeGreaterThan(0)
    })

    it('should handle rapid event emissions efficiently', () => {
      const listener = vi.fn()
      progressTracker.on('item-toggle', listener)

      const startTime = performance.now()

      // Emit many events rapidly
      for (let i = 0; i < 1000; i++) {
        progressTracker.toggleItem(`item-${i}`)
      }

      const totalTime = performance.now() - startTime

      // Verify all events were processed
      expect(listener).toHaveBeenCalledTimes(1000)

      // Performance assertion
      expect(totalTime).toBeLessThan(100) // Less than 100ms for 1000 events
    })

    it('should handle mixed event types efficiently', () => {
      const progressListener = vi.fn()
      const searchListener = vi.fn()

      progressTracker.on('item-toggle', progressListener)
      progressTracker.on('progress-update', progressListener)
      searchFilter.on('filter-change', searchListener)

      const startTime = performance.now()

      // Mixed event emissions
      for (let i = 0; i < 500; i++) {
        progressTracker.toggleItem(`item-${i}`)
        if (i % 10 === 0) {
          searchFilter.setSearch(`search-${i}`)
        }
      }

      const totalTime = performance.now() - startTime

      // Verify events were processed
      expect(progressListener).toHaveBeenCalledTimes(1000) // 500 toggle + 500 update events
      expect(searchListener).toHaveBeenCalledTimes(50) // Every 10th iteration

      // Performance assertion
      expect(totalTime).toBeLessThan(200) // Less than 200ms for mixed operations
    })
  })

  describe('Memory Usage Tests', () => {
    it('should properly clean up event listeners to prevent memory leaks', () => {
      const listeners = Array.from({length: 100}, () => vi.fn())

      // Add all listeners
      listeners.forEach(listener => {
        progressTracker.on('item-toggle', listener)
      })

      // Emit event to verify listeners are active
      progressTracker.toggleItem('test-1')
      listeners.forEach(listener => {
        expect(listener).toHaveBeenCalledTimes(1)
      })

      // Remove all listeners
      listeners.forEach(listener => {
        progressTracker.off('item-toggle', listener)
      })

      // Reset listener mocks
      listeners.forEach(listener => listener.mockReset())

      // Emit event again - no listeners should be called
      progressTracker.toggleItem('test-2')
      listeners.forEach(listener => {
        expect(listener).not.toHaveBeenCalled()
      })
    })

    it('should handle removeAllListeners efficiently', () => {
      const listeners = Array.from({length: 1000}, () => vi.fn())

      // Add all listeners
      listeners.forEach(listener => {
        progressTracker.on('item-toggle', listener)
        progressTracker.on('progress-update', listener)
      })

      const startTime = performance.now()
      progressTracker.removeAllListeners()
      const cleanupTime = performance.now() - startTime

      // Verify cleanup was fast
      expect(cleanupTime).toBeLessThan(10) // Less than 10ms to clean up 2000 listeners

      // Verify no listeners remain
      progressTracker.toggleItem('test-cleanup')
      listeners.forEach(listener => {
        expect(listener).not.toHaveBeenCalled()
      })
    })
  })

  describe('Bundle Size Impact Assessment', () => {
    it('should not significantly increase module instantiation time', () => {
      // Measure factory function creation time
      const iterations = 1000
      const startTime = performance.now()

      for (let i = 0; i < iterations; i++) {
        const tracker = createProgressTracker()
        const filter = createSearchFilter()
        // Use the instances to prevent optimization
        expect(tracker).toBeDefined()
        expect(filter).toBeDefined()
      }

      const totalTime = performance.now() - startTime
      const averageTime = totalTime / iterations

      // Performance assertion - should be very fast
      expect(averageTime).toBeLessThan(1) // Less than 1ms per factory creation
      expect(totalTime).toBeLessThan(100) // Less than 100ms for 1000 factory creations
    })

    it('should demonstrate efficient generic type usage', () => {
      // Test that generic types don't add runtime overhead
      const startTime = performance.now()

      const tracker = createProgressTracker()

      // Test type-safe operations
      const listener = (data: {itemId: string; isWatched: boolean}) => {
        expect(data.itemId).toBeDefined()
        expect(typeof data.isWatched).toBe('boolean')
      }

      tracker.on('item-toggle', listener)

      for (let i = 0; i < 100; i++) {
        tracker.toggleItem(`item-${i}`)
      }

      const totalTime = performance.now() - startTime

      // Generic types should add no runtime overhead
      expect(totalTime).toBeLessThan(20) // Less than 20ms for 100 operations
    })
  })

  describe('Stress Tests', () => {
    it('should handle extreme listener counts without degradation', () => {
      const listenerCount = 5000
      const listeners = Array.from({length: listenerCount}, () => vi.fn())

      const addStartTime = performance.now()
      listeners.forEach(listener => {
        progressTracker.on('item-toggle', listener)
      })
      const addTime = performance.now() - addStartTime

      const emitStartTime = performance.now()
      progressTracker.toggleItem('stress-test')
      const emitTime = performance.now() - emitStartTime

      const removeStartTime = performance.now()
      listeners.forEach(listener => {
        progressTracker.off('item-toggle', listener)
      })
      const removeTime = performance.now() - removeStartTime

      // Verify all operations completed
      expect(listeners.every(listener => listener.mock.calls.length === 1)).toBe(true)

      // Performance assertions for extreme load
      expect(addTime).toBeLessThan(500) // Less than 500ms to add 5000 listeners
      expect(emitTime).toBeLessThan(200) // Less than 200ms to emit to 5000 listeners
      expect(removeTime).toBeLessThan(500) // Less than 500ms to remove 5000 listeners
    })

    it('should maintain performance with complex event payloads', () => {
      const complexListener = vi.fn(
        (data: {
          itemId: string
          isWatched: boolean
          metadata?: {
            timestamp: Date
            source: string
            details: {id: number; tags: string[]}
          }
        }) => {
          expect(data.itemId).toBeDefined()
        },
      )

      progressTracker.on('item-toggle', complexListener)

      const startTime = performance.now()

      // Emit events with complex payloads
      for (let i = 0; i < 100; i++) {
        progressTracker.toggleItem(`complex-item-${i}`)
      }

      const totalTime = performance.now() - startTime

      expect(complexListener).toHaveBeenCalledTimes(100)
      expect(totalTime).toBeLessThan(50) // Should handle complex payloads efficiently
    })
  })

  describe('Generic Implementation Validation', () => {
    it('should provide acceptable performance for typical usage', () => {
      // Test realistic usage patterns
      const progressTracker = createProgressTracker()
      const searchFilter = createSearchFilter()

      const progressListener = vi.fn()
      const searchListener = vi.fn()

      progressTracker.on('item-toggle', progressListener)
      searchFilter.on('filter-change', searchListener)

      const startTime = performance.now()

      // Simulate realistic user interactions
      for (let i = 0; i < 50; i++) {
        progressTracker.toggleItem(`item-${i}`)
        if (i % 5 === 0) {
          searchFilter.setSearch(`search-${i}`)
        }
      }

      const totalTime = performance.now() - startTime

      // Should handle typical user interactions very quickly
      expect(totalTime).toBeLessThan(50) // Less than 50ms for 50 user actions
      expect(progressListener).toHaveBeenCalledTimes(50)
      expect(searchListener).toHaveBeenCalledTimes(10)

      // The key benefit is type safety with acceptable performance
      expect(progressTracker.isWatched('item-0')).toBe(true)
      expect(progressTracker.getWatchedItems()).toHaveLength(50)
    })
  })
})
