import type {
  ProgressTrackerEvents,
  ProgressTrackerInstance,
  SearchFilterInstance,
} from '../src/modules/types.js'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {createProgressTracker} from '../src/modules/progress.js'
import {createSearchFilter} from '../src/modules/search.js'
import {createTimelineRenderer} from '../src/modules/timeline.js'

// Mock DOM globals for testing
vi.stubGlobal('localStorage', {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
})

describe('Generic EventEmitter Integration Tests', () => {
  let progressTracker: ProgressTrackerInstance
  let searchFilter: SearchFilterInstance
  let mockContainer: HTMLElement

  beforeEach(() => {
    // Create fresh instances for each test
    progressTracker = createProgressTracker()
    searchFilter = createSearchFilter()

    // Create a mock DOM container
    mockContainer = document.createElement('div')
    mockContainer.id = 'timelineContainer'
    document.body.append(mockContainer)
  })

  describe('Cross-module communication using generic EventEmitter', () => {
    it('should allow progress tracker to communicate with timeline renderer through events', () => {
      const progressUpdateSpy = vi.fn()
      const itemToggleSpy = vi.fn()

      // Subscribe to progress tracker events
      progressTracker.on('progress-update', progressUpdateSpy)
      progressTracker.on('item-toggle', itemToggleSpy)

      // Trigger an item toggle
      progressTracker.toggleItem('ent_s1')

      // Verify event communication
      expect(itemToggleSpy).toHaveBeenCalledWith({
        itemId: 'ent_s1',
        isWatched: true,
      })

      expect(progressUpdateSpy).toHaveBeenCalledWith({
        overall: expect.objectContaining({
          total: expect.any(Number),
          completed: expect.any(Number),
          percentage: expect.any(Number),
        }),
        eraProgress: expect.arrayContaining([
          expect.objectContaining({
            eraId: expect.any(String),
            total: expect.any(Number),
            completed: expect.any(Number),
            percentage: expect.any(Number),
          }),
        ]),
      })
    })

    it('should allow search filter to communicate filtered data through events', () => {
      const filterChangeSpy = vi.fn()

      // Subscribe to search filter events
      searchFilter.on('filter-change', filterChangeSpy)

      // Trigger a search
      searchFilter.setSearch('Enterprise')

      // Verify event communication
      expect(filterChangeSpy).toHaveBeenCalledWith({
        filterState: expect.objectContaining({
          search: 'enterprise', // Search is normalized to lowercase
          filter: '',
        }),
        filteredData: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            title: expect.any(String),
            items: expect.any(Array),
          }),
        ]),
      })
    })

    it('should support multiple subscribers to the same event', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()
      const listener3 = vi.fn()

      // Multiple subscribers to progress update
      progressTracker.on('progress-update', listener1)
      progressTracker.on('progress-update', listener2)
      progressTracker.on('progress-update', listener3)

      // Trigger event
      progressTracker.toggleItem('tos_s1')

      // All listeners should be called
      expect(listener1).toHaveBeenCalled()
      expect(listener2).toHaveBeenCalled()
      expect(listener3).toHaveBeenCalled()
    })
  })

  describe('Factory function dependency injection with generic constraints', () => {
    it('should allow timeline renderer to depend on progress tracker with type safety', () => {
      // This test verifies that dependency injection works with generic constraints
      const container = document.createElement('div')
      const renderer = createTimelineRenderer(container, progressTracker)

      expect(renderer).toBeDefined()
      expect(typeof renderer.render).toBe('function')
      expect(typeof renderer.updateItemStates).toBe('function')
      expect(typeof renderer.updateProgress).toBe('function')
    })

    it('should maintain type safety across factory function boundaries', () => {
      const mockListener = vi.fn()

      // Type-safe event subscription across factory boundaries
      progressTracker.on('item-toggle', (data: ProgressTrackerEvents['item-toggle']) => {
        mockListener(data)
        // Type checking ensures we can access properties safely
        expect(typeof data.itemId).toBe('string')
        expect(typeof data.isWatched).toBe('boolean')
      })

      progressTracker.toggleItem('test-item')

      expect(mockListener).toHaveBeenCalledWith({
        itemId: 'test-item',
        isWatched: true,
      })
    })
  })

  describe('Type safety working correctly in integrated scenarios', () => {
    it('should enforce correct event payload types', () => {
      const mockListener = vi.fn()

      // This should compile with correct types
      progressTracker.on('item-toggle', (data: ProgressTrackerEvents['item-toggle']) => {
        mockListener(data.itemId, data.isWatched)
      })

      progressTracker.toggleItem('test-item')

      expect(mockListener).toHaveBeenCalledWith('test-item', true)
    })

    it('should support event unsubscription with type safety', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      // Subscribe both listeners
      progressTracker.on('item-toggle', listener1)
      progressTracker.on('item-toggle', listener2)

      // Trigger event - both should be called
      progressTracker.toggleItem('test-item-1')
      expect(listener1).toHaveBeenCalledTimes(1)
      expect(listener2).toHaveBeenCalledTimes(1)

      // Unsubscribe one listener
      progressTracker.off('item-toggle', listener1)

      // Trigger event again - only listener2 should be called
      progressTracker.toggleItem('test-item-2')
      expect(listener1).toHaveBeenCalledTimes(1) // Still 1
      expect(listener2).toHaveBeenCalledTimes(2) // Now 2
    })

    it('should support once() functionality across modules', () => {
      const listener = vi.fn()

      // Subscribe with once()
      progressTracker.once('item-toggle', listener)

      // Trigger multiple times
      progressTracker.toggleItem('test-item-1')
      progressTracker.toggleItem('test-item-2')
      progressTracker.toggleItem('test-item-3')

      // Listener should only be called once
      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith({
        itemId: 'test-item-1',
        isWatched: true,
      })
    })

    it('should handle event listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Test error')
      })
      const normalListener = vi.fn()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Add both listeners
      progressTracker.on('item-toggle', errorListener)
      progressTracker.on('item-toggle', normalListener)

      // Trigger event
      progressTracker.toggleItem('test-item')

      // Error should be logged but not stop other listeners
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error in event listener for 'item-toggle':",
        expect.any(Error),
      )
      expect(normalListener).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should provide listener management functionality', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      // Add listeners
      progressTracker.on('item-toggle', listener1)
      progressTracker.on('progress-update', listener2)

      // Trigger events to verify listeners are working
      progressTracker.toggleItem('test-item')

      expect(listener1).toHaveBeenCalledWith({
        itemId: 'test-item',
        isWatched: true,
      })
      expect(listener2).toHaveBeenCalled()

      // Remove a listener and verify it no longer receives events
      progressTracker.off('item-toggle', listener1)

      // Reset the mock to check if it gets called again
      listener1.mockReset()

      // Trigger another event
      progressTracker.toggleItem('test-item-2')

      // listener1 should not be called, listener2 should be called
      expect(listener1).not.toHaveBeenCalled()
      expect(listener2).toHaveBeenCalledTimes(2) // Called twice now
    })
  })

  describe('Complex interaction scenarios', () => {
    it('should handle coordinated updates between all modules', () => {
      const progressSpy = vi.fn()
      const filterSpy = vi.fn()

      // Set up listeners
      progressTracker.on('progress-update', progressSpy)
      searchFilter.on('filter-change', filterSpy)

      // Simulate a complex workflow
      searchFilter.setSearch('Original Series')
      progressTracker.toggleItem('tos_s1')
      searchFilter.setFilter('series')

      // Verify all events were fired
      expect(progressSpy).toHaveBeenCalled()
      expect(filterSpy).toHaveBeenCalledTimes(2) // Once for search, once for filter
    })

    it('should support removeAllListeners functionality', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()
      const listener3 = vi.fn()

      // Add multiple listeners for different events
      progressTracker.on('item-toggle', listener1)
      progressTracker.on('item-toggle', listener2)
      progressTracker.on('progress-update', listener3)

      // Trigger event to verify listeners are working
      progressTracker.toggleItem('test-item')
      expect(listener1).toHaveBeenCalled()
      expect(listener2).toHaveBeenCalled()
      expect(listener3).toHaveBeenCalled()

      // Reset mocks
      listener1.mockReset()
      listener2.mockReset()
      listener3.mockReset()

      // Remove all listeners for item-toggle
      progressTracker.removeAllListeners('item-toggle')

      // Trigger event again - only progress-update listener should be called
      progressTracker.toggleItem('test-item-2')

      expect(listener1).not.toHaveBeenCalled()
      expect(listener2).not.toHaveBeenCalled()
      expect(listener3).toHaveBeenCalled()

      // Reset mocks again
      listener3.mockReset()

      // Remove all listeners
      progressTracker.removeAllListeners()

      // Trigger event again - no listeners should be called
      progressTracker.toggleItem('test-item-3')

      expect(listener1).not.toHaveBeenCalled()
      expect(listener2).not.toHaveBeenCalled()
      expect(listener3).not.toHaveBeenCalled()
    })
  })
})
