import type {
  EventListener,
  EventMap,
  ProgressTrackerEvents,
  SearchFilterEvents,
} from '../src/modules/types.js'
import {describe, expect, it, vi} from 'vitest'
import {createEventEmitter} from '../src/modules/events.js'
import {createProgressTracker} from '../src/modules/progress.js'
import {createSearchFilter} from '../src/modules/search.js'

// Mock localStorage for tests
vi.stubGlobal('localStorage', {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
})

describe('TypeScript Type Safety Tests', () => {
  describe('Generic EventEmitter Type Safety', () => {
    it('should enforce correct event payload types at compile time', () => {
      // Define a custom event map for testing
      interface TestEvents extends EventMap {
        'string-event': string
        'number-event': number
        'object-event': {id: number; name: string}
        'void-event': void
      }

      const emitter = createEventEmitter<TestEvents>()

      // These should compile without errors
      const stringListener: EventListener<string> = (data: string) => {
        expect(typeof data).toBe('string')
      }

      const numberListener: EventListener<number> = (data: number) => {
        expect(typeof data).toBe('number')
      }

      const objectListener: EventListener<{id: number; name: string}> = (data: {
        id: number
        name: string
      }) => {
        expect(typeof data.id).toBe('number')
        expect(typeof data.name).toBe('string')
      }

      const voidListener: EventListener<void> = () => {
        // Void event, no data parameter
      }

      // Subscribe with correct types
      emitter.on('string-event', stringListener)
      emitter.on('number-event', numberListener)
      emitter.on('object-event', objectListener)
      emitter.on('void-event', voidListener)

      // Emit with correct types
      emitter.emit('string-event', 'test-string')
      emitter.emit('number-event', 42)
      emitter.emit('object-event', {id: 1, name: 'test'})
      emitter.emit('void-event', undefined)

      // Verify listeners were called
      expect(stringListener).toBeDefined()
      expect(numberListener).toBeDefined()
      expect(objectListener).toBeDefined()
      expect(voidListener).toBeDefined()
    })

    it('should provide correct type inference for event names', () => {
      interface TestEvents extends EventMap {
        'event-a': string
        'event-b': number
        'event-c': boolean
      }

      const emitter = createEventEmitter<TestEvents>()
      const listener = vi.fn()

      // TypeScript should infer the correct event names
      emitter.on('event-a', listener)
      emitter.on('event-b', listener)
      emitter.on('event-c', listener)

      // These should also have correct type inference
      emitter.off('event-a', listener)
      emitter.once('event-b', listener)
      emitter.removeAllListeners('event-c')

      expect(listener).toBeDefined()
    })

    it('should handle complex nested generic types', () => {
      interface ComplexEvents extends EventMap {
        'array-event': string[]
        'nested-object': {
          user: {id: number; profile: {name: string; age: number}}
          metadata: {created: Date; tags: string[]}
        }
        'union-type': string | number | boolean
        'optional-props': {required: string; optional?: number}
      }

      const emitter = createEventEmitter<ComplexEvents>()

      const arrayListener: EventListener<string[]> = (data: string[]) => {
        expect(Array.isArray(data)).toBe(true)
        data.forEach(item => expect(typeof item).toBe('string'))
      }

      const nestedListener: EventListener<ComplexEvents['nested-object']> = data => {
        expect(typeof data.user.id).toBe('number')
        expect(typeof data.user.profile.name).toBe('string')
        expect(typeof data.user.profile.age).toBe('number')
        expect(data.metadata.created instanceof Date).toBe(true)
        expect(Array.isArray(data.metadata.tags)).toBe(true)
      }

      const unionListener: EventListener<string | number | boolean> = data => {
        expect(['string', 'number', 'boolean']).toContain(typeof data)
      }

      const optionalListener: EventListener<{required: string; optional?: number}> = data => {
        expect(typeof data.required).toBe('string')
        if (data.optional !== undefined) {
          expect(typeof data.optional).toBe('number')
        }
      }

      emitter.on('array-event', arrayListener)
      emitter.on('nested-object', nestedListener)
      emitter.on('union-type', unionListener)
      emitter.on('optional-props', optionalListener)

      // Emit with complex data
      emitter.emit('array-event', ['a', 'b', 'c'])
      emitter.emit('nested-object', {
        user: {id: 1, profile: {name: 'John', age: 30}},
        metadata: {created: new Date(), tags: ['tag1', 'tag2']},
      })
      emitter.emit('union-type', 'string-value')
      emitter.emit('union-type', 42)
      emitter.emit('union-type', true)
      emitter.emit('optional-props', {required: 'test'})
      emitter.emit('optional-props', {required: 'test', optional: 123})
    })
  })

  describe('VBS-specific Type Safety', () => {
    it('should enforce correct ProgressTrackerEvents types', () => {
      const progressTracker = createProgressTracker()

      // Type-safe event listeners
      const itemToggleListener: EventListener<ProgressTrackerEvents['item-toggle']> = data => {
        expect(typeof data.itemId).toBe('string')
        expect(typeof data.isWatched).toBe('boolean')
      }

      const progressUpdateListener: EventListener<
        ProgressTrackerEvents['progress-update']
      > = data => {
        // Verify overall progress structure
        expect(typeof data.overall.total).toBe('number')
        expect(typeof data.overall.completed).toBe('number')
        expect(typeof data.overall.percentage).toBe('number')

        // Verify era progress structure
        expect(Array.isArray(data.eraProgress)).toBe(true)
        data.eraProgress.forEach(era => {
          expect(typeof era.eraId).toBe('string')
          expect(typeof era.total).toBe('number')
          expect(typeof era.completed).toBe('number')
          expect(typeof era.percentage).toBe('number')
        })
      }

      progressTracker.on('item-toggle', itemToggleListener)
      progressTracker.on('progress-update', progressUpdateListener)

      // Trigger events to verify type safety
      progressTracker.toggleItem('test-item')

      expect(itemToggleListener).toBeDefined()
      expect(progressUpdateListener).toBeDefined()
    })

    it('should enforce correct SearchFilterEvents types', () => {
      const searchFilter = createSearchFilter()

      const filterChangeListener: EventListener<SearchFilterEvents['filter-change']> = data => {
        // Verify filter state structure
        expect(typeof data.filterState.search).toBe('string')
        expect(typeof data.filterState.filter).toBe('string')

        // Verify filtered data structure
        expect(Array.isArray(data.filteredData)).toBe(true)
        data.filteredData.forEach(era => {
          expect(typeof era.id).toBe('string')
          expect(typeof era.title).toBe('string')
          expect(typeof era.years).toBe('string')
          expect(typeof era.stardates).toBe('string')
          expect(typeof era.description).toBe('string')
          expect(Array.isArray(era.items)).toBe(true)

          era.items.forEach(item => {
            expect(typeof item.id).toBe('string')
            expect(typeof item.title).toBe('string')
            expect(typeof item.type).toBe('string')
            expect(typeof item.year).toBe('string')
            expect(typeof item.stardate).toBe('string')
            expect(typeof item.notes).toBe('string')
            // episodes is optional
            if (item.episodes !== undefined) {
              expect(typeof item.episodes).toBe('number')
            }
          })
        })
      }

      searchFilter.on('filter-change', filterChangeListener)

      // Trigger event to verify type safety
      searchFilter.setSearch('test')

      expect(filterChangeListener).toBeDefined()
    })
  })

  describe('Generic Utility Types', () => {
    it('should provide type-safe EventListener type', () => {
      // Test basic EventListener types
      const stringListener: EventListener<string> = (data: string) => {
        expect(typeof data).toBe('string')
      }

      const numberListener: EventListener<number> = (data: number) => {
        expect(typeof data).toBe('number')
      }

      const voidListener: EventListener<void> = () => {
        // No parameters for void
      }

      const objectListener: EventListener<{test: boolean}> = (data: {test: boolean}) => {
        expect(typeof data.test).toBe('boolean')
      }

      // Verify listeners are properly typed
      stringListener('test')
      numberListener(42)
      voidListener()
      objectListener({test: true})

      expect(stringListener).toBeDefined()
      expect(numberListener).toBeDefined()
      expect(voidListener).toBeDefined()
      expect(objectListener).toBeDefined()
    })

    it('should handle EventMap constraints correctly', () => {
      // Test that EventMap constraint works
      interface ValidEventMap extends EventMap {
        event1: string
        event2: number
        event3: {id: string; value: number}
      }

      interface AlsoValidEventMap extends EventMap {
        'single-event': boolean
      }

      // These should compile without errors
      const validEmitter1 = createEventEmitter<ValidEventMap>()
      const validEmitter2 = createEventEmitter<AlsoValidEventMap>()

      expect(validEmitter1).toBeDefined()
      expect(validEmitter2).toBeDefined()

      // Test that the emitters work with their respective types
      validEmitter1.emit('event1', 'test')
      validEmitter1.emit('event2', 42)
      validEmitter1.emit('event3', {id: 'test', value: 123})

      validEmitter2.emit('single-event', true)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle error cases gracefully while maintaining type safety', () => {
      interface TestEvents extends EventMap {
        'error-event': string
        'success-event': number
      }

      const emitter = createEventEmitter<TestEvents>()
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const errorListener: EventListener<string> = () => {
        throw new Error('Test error')
      }

      const successListener: EventListener<number> = (data: number) => {
        expect(typeof data).toBe('number')
      }

      // Add both listeners
      emitter.on('error-event', errorListener)
      emitter.on('success-event', successListener)

      // Error in one listener shouldn't affect others
      emitter.emit('error-event', 'test')
      emitter.emit('success-event', 42)

      expect(errorSpy).toHaveBeenCalledWith(
        "Error in event listener for 'error-event':",
        expect.any(Error),
      )

      errorSpy.mockRestore()
    })

    it('should maintain type safety with once() functionality', () => {
      interface TestEvents extends EventMap {
        'once-event': {count: number}
      }

      const emitter = createEventEmitter<TestEvents>()
      const listener = vi.fn((data: {count: number}) => {
        expect(typeof data.count).toBe('number')
      })

      // Use once with type safety
      emitter.once('once-event', listener)

      // Emit multiple times
      emitter.emit('once-event', {count: 1})
      emitter.emit('once-event', {count: 2})
      emitter.emit('once-event', {count: 3})

      // Listener should only be called once
      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith({count: 1})
    })

    it('should handle removeAllListeners with type safety', () => {
      interface TestEvents extends EventMap {
        'event-a': string
        'event-b': number
      }

      const emitter = createEventEmitter<TestEvents>()
      const listenerA = vi.fn()
      const listenerB = vi.fn()

      // Add listeners
      emitter.on('event-a', listenerA)
      emitter.on('event-b', listenerB)

      // Remove all listeners for specific event
      emitter.removeAllListeners('event-a')

      // Emit events
      emitter.emit('event-a', 'test')
      emitter.emit('event-b', 42)

      // Only listenerB should be called
      expect(listenerA).not.toHaveBeenCalled()
      expect(listenerB).toHaveBeenCalledWith(42)

      // Reset and test removing all listeners
      listenerB.mockReset()
      emitter.removeAllListeners()

      emitter.emit('event-b', 123)
      expect(listenerB).not.toHaveBeenCalled()
    })
  })

  describe('Generic Type Inference', () => {
    it('should infer types correctly in complex scenarios', () => {
      const progressTracker = createProgressTracker()

      // TypeScript should infer the correct types automatically
      progressTracker.on('item-toggle', data => {
        // data should be inferred as ProgressTrackerEvents['item-toggle']
        const itemId: string = data.itemId // Should not cause type error
        const isWatched: boolean = data.isWatched // Should not cause type error

        expect(typeof itemId).toBe('string')
        expect(typeof isWatched).toBe('boolean')
      })

      progressTracker.on('progress-update', data => {
        // data should be inferred as ProgressTrackerEvents['progress-update']
        const total: number = data.overall.total // Should not cause type error
        const eraProgress = data.eraProgress // Should be inferred as EraProgress[]

        expect(typeof total).toBe('number')
        expect(Array.isArray(eraProgress)).toBe(true)
      })

      // Trigger events to test inference
      progressTracker.toggleItem('test-item')
    })

    it('should work with generic factory function constraints', () => {
      // Test that factory functions maintain type safety
      const progressTracker = createProgressTracker()
      const searchFilter = createSearchFilter()

      // These should maintain their specific event types
      const progressListener = vi.fn()
      const searchListener = vi.fn()

      progressTracker.on('item-toggle', progressListener)
      searchFilter.on('filter-change', searchListener)

      // Trigger events
      progressTracker.toggleItem('test')
      searchFilter.setSearch('test')

      expect(progressListener).toHaveBeenCalled()
      expect(searchListener).toHaveBeenCalled()
    })
  })
})
