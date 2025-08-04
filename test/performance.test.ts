import type {
  ProgressTrackerInstance,
  SearchFilterInstance,
  StarTrekEra,
  StarTrekItem,
} from '../src/modules/types.js'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {createProgressTracker} from '../src/modules/progress.js'
import {createSearchFilter} from '../src/modules/search.js'
import {
  compose,
  createProgressPipeline,
  createSearchPipeline,
  curry,
  pipe,
  starTrekTransformations,
  tap,
} from '../src/utils/composition.js'

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
      expect(totalTime).toBeLessThan(200) // Less than 200ms for 1000 events (more lenient for different environments)
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

  describe('Composition Utilities Performance Benchmarks', () => {
    // Mock data for benchmarking
    const mockItems: StarTrekItem[] = Array.from({length: 1000}, (_, i) => ({
      id: `item-${i}`,
      title: `Test Item ${i}`,
      type: i % 3 === 0 ? 'series' : i % 3 === 1 ? 'movie' : 'animated',
      year: `${1960 + i}`,
      stardate: `${1000 + i}.${i % 10}`,
      ...(i % 3 === 0 && {episodes: 26}),
      notes: `Test notes for item ${i}`,
    }))

    const mockEras: StarTrekEra[] = [
      {
        id: 'test-era-1',
        title: 'Test Era 1',
        years: '1960-1970',
        stardates: '1000.0-2000.0',
        description: 'First test era',
        items: mockItems.slice(0, 500),
      },
      {
        id: 'test-era-2',
        title: 'Test Era 2',
        years: '1970-1980',
        stardates: '2000.0-3000.0',
        description: 'Second test era',
        items: mockItems.slice(500),
      },
    ]

    describe('pipe() vs manual chaining', () => {
      it('should have minimal overhead compared to manual function chaining', () => {
        const iterations = 10000
        const testValue = 'test'

        // Manual chaining benchmark
        const manualStart = performance.now()
        for (let i = 0; i < iterations; i++) {
          const step1 = testValue.toUpperCase()
          const step2 = `${step1}!`
          const step3 = step2.length
          expect(step3).toBe(5)
        }
        const manualTime = performance.now() - manualStart

        // Pipe chaining benchmark
        const pipeStart = performance.now()
        for (let i = 0; i < iterations; i++) {
          const result = pipe(
            testValue,
            (s: string) => s.toUpperCase(),
            (s: string) => `${s}!`,
            (s: string) => s.length,
          )
          expect(result).toBe(5)
        }
        const pipeTime = performance.now() - pipeStart

        // Pipe should be within reasonable overhead (less than 2x manual)
        const overhead = pipeTime / manualTime
        expect(overhead).toBeLessThan(2)

        // Both should be very fast
        expect(manualTime).toBeLessThan(500) // More lenient timing
        expect(pipeTime).toBeLessThan(1000)
      })
    })

    describe('compose() vs manual composition', () => {
      it('should have minimal overhead for function composition', () => {
        const iterations = 5000

        // Create functions for testing
        const upperCase = (s: string) => s.toUpperCase()
        const addExclamation = (s: string) => `${s}!`
        const getLength = (s: string) => s.length

        // Manual composition benchmark
        const manualStart = performance.now()
        for (let i = 0; i < iterations; i++) {
          const composed = (input: string) => getLength(addExclamation(upperCase(input)))
          const result = composed('test')
          expect(result).toBe(5)
        }
        const manualTime = performance.now() - manualStart

        // compose() benchmark
        const composeStart = performance.now()
        for (let i = 0; i < iterations; i++) {
          const composed = compose(getLength, addExclamation, upperCase)
          const result = composed('test')
          expect(result).toBe(5)
        }
        const composeTime = performance.now() - composeStart

        // Reasonable overhead
        const overhead = composeTime / manualTime
        expect(overhead).toBeLessThan(2)

        expect(manualTime).toBeLessThan(200) // More lenient for different environments
        expect(composeTime).toBeLessThan(400)
      })
    })

    describe('curry() vs manual partial application', () => {
      it('should provide efficient partial application', () => {
        const iterations = 5000

        const add = (a: number, b: number, c: number) => a + b + c

        // Manual partial application benchmark
        const manualStart = performance.now()
        for (let i = 0; i < iterations; i++) {
          const partialAdd = (b: number, c: number) => add(10, b, c)
          const result = partialAdd(20, 30)
          expect(result).toBe(60)
        }
        const manualTime = performance.now() - manualStart

        // curry() benchmark
        const curryStart = performance.now()
        for (let i = 0; i < iterations; i++) {
          const curriedAdd = curry(add)
          const partialAdd = curriedAdd(10)
          const result = partialAdd(20)(30)
          expect(result).toBe(60)
        }
        const curryTime = performance.now() - curryStart

        // Currying has higher overhead but should still be reasonable
        const overhead = curryTime / manualTime
        expect(overhead).toBeLessThan(5) // More lenient for currying

        expect(manualTime).toBeLessThan(100) // More lenient expectations
        expect(curryTime).toBeLessThan(500) // Much more lenient for currying
      })
    })

    describe('VBS-specific transformation performance', () => {
      it('should efficiently transform Star Trek data', () => {
        const iterations = 100

        // Manual filtering and transformation benchmark
        const manualStart = performance.now()
        for (let i = 0; i < iterations; i++) {
          const seriesItems = mockItems.filter(item => item.type === 'series')
          const types = [...new Set(mockItems.map(item => item.type))]
          const totalEpisodes = mockItems.reduce((total, item) => total + (item.episodes ?? 0), 0)
          expect(seriesItems.length).toBeGreaterThan(0)
          expect(types.length).toBeGreaterThan(0)
          expect(totalEpisodes).toBeGreaterThan(0)
        }
        const manualTime = performance.now() - manualStart

        // Pipeline benchmark using composition utilities
        const pipelineStart = performance.now()
        for (let i = 0; i < iterations; i++) {
          const seriesCount = pipe(
            mockItems,
            (items: StarTrekItem[]) => items.filter(item => item.type === 'series'),
            (items: StarTrekItem[]) => items.length,
          )
          const types = starTrekTransformations.extractTypes(mockItems)
          const totalEpisodes = starTrekTransformations.calculateTotalEpisodes(mockItems)
          expect(seriesCount).toBeGreaterThan(0)
          expect(types.length).toBeGreaterThan(0)
          expect(totalEpisodes).toBeGreaterThan(0)
        }
        const pipelineTime = performance.now() - pipelineStart

        // Pipeline should be competitive with manual approach
        const overhead = pipelineTime / manualTime
        expect(overhead).toBeLessThan(3)

        expect(manualTime).toBeLessThan(100)
        expect(pipelineTime).toBeLessThan(300)
      })

      it('should efficiently handle progress calculations', () => {
        const iterations = 50
        const watchedItems = mockItems.slice(0, 500).map(item => item.id)

        // Manual progress calculation benchmark
        const manualStart = performance.now()
        for (let i = 0; i < iterations; i++) {
          const eraProgress = mockEras.map(era => {
            const watchedInEra = era.items.filter(item => watchedItems.includes(item.id))
            return {
              eraId: era.id,
              watched: watchedInEra.length,
              total: era.items.length,
              percentage: Math.round((watchedInEra.length / era.items.length) * 100),
            }
          })
          const totalWatched = eraProgress.reduce((sum, era) => sum + era.watched, 0)
          const totalItems = eraProgress.reduce((sum, era) => sum + era.total, 0)
          const overallPercentage = Math.round((totalWatched / totalItems) * 100)
          expect(overallPercentage).toBeGreaterThanOrEqual(0)
        }
        const manualTime = performance.now() - manualStart

        // Pipeline progress calculation benchmark
        const pipelineStart = performance.now()
        for (let i = 0; i < iterations; i++) {
          const progressPipeline = createProgressPipeline(mockEras)
          const result = progressPipeline(watchedItems)
          expect(result.overall.percentage).toBeGreaterThanOrEqual(0)
        }
        const pipelineTime = performance.now() - pipelineStart

        // Progress pipeline should be reasonably efficient
        const overhead = pipelineTime / manualTime
        expect(overhead).toBeLessThan(4) // More complex operations, higher tolerance

        expect(manualTime).toBeLessThan(100)
        expect(pipelineTime).toBeLessThan(400)
      })

      it('should efficiently handle search operations', () => {
        const iterations = 100
        const searchTerm = 'test'

        // Manual search benchmark
        const manualStart = performance.now()
        for (let i = 0; i < iterations; i++) {
          const normalizedTerm = searchTerm.toLowerCase().trim()
          const filteredItems = mockItems.filter(
            item =>
              item.title.toLowerCase().includes(normalizedTerm) ||
              item.notes?.toLowerCase().includes(normalizedTerm),
          )
          const groupedByEra = mockEras.map(era => ({
            era,
            matchingItems: era.items.filter(item => filteredItems.includes(item)),
          }))
          expect(groupedByEra).toBeDefined()
        }
        const manualTime = performance.now() - manualStart

        // Pipeline search benchmark
        const pipelineStart = performance.now()
        for (let i = 0; i < iterations; i++) {
          const searchPipeline = createSearchPipeline(mockEras)
          const result = searchPipeline({
            search: searchTerm,
            filter: '',
          })
          expect(result).toBeDefined()
        }
        const pipelineTime = performance.now() - pipelineStart

        // Search pipeline should be competitive
        const overhead = pipelineTime / manualTime
        expect(overhead).toBeLessThan(3)

        expect(manualTime).toBeLessThan(200)
        expect(pipelineTime).toBeLessThan(600)
      })
    })

    describe('Complex composition performance', () => {
      it('should handle deep function chains efficiently', () => {
        const iterations = 1000

        // Create a deep chain of simple operations
        const deepManualStart = performance.now()
        for (let i = 0; i < iterations; i++) {
          let result = i
          result = result + 1
          result = result * 2
          result = result - 3
          result = result / 2
          result = result + 5
          result = result * 3
          result = result - 10
          result = result / 4
          result = result + 15
          expect(result).toBeGreaterThan(0)
        }
        const deepManualTime = performance.now() - deepManualStart

        // Same operations using pipe
        const deepPipeStart = performance.now()
        for (let i = 0; i < iterations; i++) {
          const result = pipe(
            i,
            (n: number) => n + 1,
            (n: number) => n * 2,
            (n: number) => n - 3,
            (n: number) => n / 2,
            (n: number) => n + 5,
            (n: number) => n * 3,
            (n: number) => n - 10,
            (n: number) => n / 4,
            (n: number) => n + 15,
          )
          expect(result).toBeGreaterThan(0)
        }
        const deepPipeTime = performance.now() - deepPipeStart

        // Deep composition should maintain reasonable performance
        const overhead = deepPipeTime / deepManualTime
        expect(overhead).toBeLessThan(3)

        expect(deepManualTime).toBeLessThan(50)
        expect(deepPipeTime).toBeLessThan(150)
      })

      it('should handle side effects (tap) with minimal overhead', () => {
        const iterations = 5000
        let sideEffectCounter = 0

        // Manual side effects benchmark
        const manualStart = performance.now()
        for (let i = 0; i < iterations; i++) {
          const step1 = i * 2
          sideEffectCounter++
          const step2 = step1 + 10
          sideEffectCounter++
          const result = step2 / 2
          expect(result).toBe(i + 5)
        }
        const manualTime = performance.now() - manualStart

        // Reset counter
        sideEffectCounter = 0

        // tap() side effects benchmark
        const tapStart = performance.now()
        for (let i = 0; i < iterations; i++) {
          const result = pipe(
            i,
            (n: number) => n * 2,
            tap(() => sideEffectCounter++),
            (n: number) => n + 10,
            tap(() => sideEffectCounter++),
            (n: number) => n / 2,
          )
          expect(result).toBe(i + 5)
        }
        const tapTime = performance.now() - tapStart

        // tap() should add minimal overhead
        const overhead = tapTime / manualTime
        expect(overhead).toBeLessThan(2.5)

        expect(manualTime).toBeLessThan(50)
        expect(tapTime).toBeLessThan(125)
      })
    })
  })
})
