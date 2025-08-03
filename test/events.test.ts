import {beforeEach, describe, expect, it, vi} from 'vitest'
import {
  createEventEmitter,
  type EventEmitterInstance,
  type VBSProgressEvents,
  type VBSSearchEvents,
} from '../src/modules/events.js'

describe('EventEmitter', () => {
  let eventEmitter: EventEmitterInstance<VBSProgressEvents>

  beforeEach(() => {
    eventEmitter = createEventEmitter<VBSProgressEvents>()
  })

  describe('on() and emit()', () => {
    it('should register and execute event listeners', () => {
      const mockListener = vi.fn()
      const payload = {itemId: 'test-1', isWatched: true}

      eventEmitter.on('item-toggle', mockListener)
      eventEmitter.emit('item-toggle', payload)

      expect(mockListener).toHaveBeenCalledWith(payload)
      expect(mockListener).toHaveBeenCalledTimes(1)
    })

    it('should support multiple listeners for the same event', () => {
      const mockListener1 = vi.fn()
      const mockListener2 = vi.fn()
      const payload = {itemId: 'test-1', isWatched: true}

      eventEmitter.on('item-toggle', mockListener1)
      eventEmitter.on('item-toggle', mockListener2)
      eventEmitter.emit('item-toggle', payload)

      expect(mockListener1).toHaveBeenCalledWith(payload)
      expect(mockListener2).toHaveBeenCalledWith(payload)
    })

    it('should support different event types with proper type safety', () => {
      const itemToggleListener = vi.fn()
      const progressUpdateListener = vi.fn()

      const itemPayload = {itemId: 'test-1', isWatched: true}
      const progressPayload = {
        overall: {total: 100, completed: 50, percentage: 50},
        eraProgress: [{eraId: 'era-1', total: 20, completed: 10, percentage: 50}],
      }

      eventEmitter.on('item-toggle', itemToggleListener)
      eventEmitter.on('progress-update', progressUpdateListener)

      eventEmitter.emit('item-toggle', itemPayload)
      eventEmitter.emit('progress-update', progressPayload)

      expect(itemToggleListener).toHaveBeenCalledWith(itemPayload)
      expect(progressUpdateListener).toHaveBeenCalledWith(progressPayload)
    })

    it('should not execute listeners if event has no listeners', () => {
      const mockListener = vi.fn()
      eventEmitter.on('item-toggle', mockListener)

      eventEmitter.emit('progress-update', {
        overall: {total: 100, completed: 50, percentage: 50},
        eraProgress: [],
      })

      expect(mockListener).not.toHaveBeenCalled()
    })

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Test error')
      })
      const normalListener = vi.fn()
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      eventEmitter.on('item-toggle', errorListener)
      eventEmitter.on('item-toggle', normalListener)

      eventEmitter.emit('item-toggle', {itemId: 'test-1', isWatched: true})

      expect(errorListener).toHaveBeenCalled()
      expect(normalListener).toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Error in event listener for 'item-toggle':"),
        expect.any(Error),
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('off()', () => {
    it('should remove specific listeners', () => {
      const mockListener1 = vi.fn()
      const mockListener2 = vi.fn()
      const payload = {itemId: 'test-1', isWatched: true}

      eventEmitter.on('item-toggle', mockListener1)
      eventEmitter.on('item-toggle', mockListener2)
      eventEmitter.off('item-toggle', mockListener1)
      eventEmitter.emit('item-toggle', payload)

      expect(mockListener1).not.toHaveBeenCalled()
      expect(mockListener2).toHaveBeenCalledWith(payload)
    })

    it('should handle removal of non-existent listeners gracefully', () => {
      const mockListener = vi.fn()

      // Should not throw error
      expect(() => {
        eventEmitter.off('item-toggle', mockListener)
      }).not.toThrow()
    })

    it('should clean up empty listener sets', () => {
      const mockListener = vi.fn()

      eventEmitter.on('item-toggle', mockListener)
      expect(eventEmitter.listenerCount('item-toggle')).toBe(1)

      eventEmitter.off('item-toggle', mockListener)
      expect(eventEmitter.listenerCount('item-toggle')).toBe(0)
    })
  })

  describe('once()', () => {
    it('should execute listener only once', () => {
      const mockListener = vi.fn()
      const payload = {itemId: 'test-1', isWatched: true}

      eventEmitter.once('item-toggle', mockListener)
      eventEmitter.emit('item-toggle', payload)
      eventEmitter.emit('item-toggle', payload)

      expect(mockListener).toHaveBeenCalledTimes(1)
      expect(mockListener).toHaveBeenCalledWith(payload)
    })

    it('should remove itself from listener count after execution', () => {
      const mockListener = vi.fn()

      eventEmitter.once('item-toggle', mockListener)
      expect(eventEmitter.listenerCount('item-toggle')).toBe(1)

      eventEmitter.emit('item-toggle', {itemId: 'test-1', isWatched: true})
      expect(eventEmitter.listenerCount('item-toggle')).toBe(0)
    })

    it('should work alongside regular listeners', () => {
      const onceListener = vi.fn()
      const regularListener = vi.fn()
      const payload = {itemId: 'test-1', isWatched: true}

      eventEmitter.once('item-toggle', onceListener)
      eventEmitter.on('item-toggle', regularListener)

      eventEmitter.emit('item-toggle', payload)
      eventEmitter.emit('item-toggle', payload)

      expect(onceListener).toHaveBeenCalledTimes(1)
      expect(regularListener).toHaveBeenCalledTimes(2)
    })
  })

  describe('removeAllListeners()', () => {
    it('should remove all listeners for a specific event', () => {
      const mockListener1 = vi.fn()
      const mockListener2 = vi.fn()

      eventEmitter.on('item-toggle', mockListener1)
      eventEmitter.on('item-toggle', mockListener2)
      eventEmitter.on('progress-update', vi.fn())

      expect(eventEmitter.listenerCount('item-toggle')).toBe(2)
      expect(eventEmitter.listenerCount('progress-update')).toBe(1)

      eventEmitter.removeAllListeners('item-toggle')

      expect(eventEmitter.listenerCount('item-toggle')).toBe(0)
      expect(eventEmitter.listenerCount('progress-update')).toBe(1)
    })

    it('should remove all listeners for all events when no event specified', () => {
      eventEmitter.on('item-toggle', vi.fn())
      eventEmitter.on('progress-update', vi.fn())

      expect(eventEmitter.eventNames()).toHaveLength(2)

      eventEmitter.removeAllListeners()

      expect(eventEmitter.eventNames()).toHaveLength(0)
    })
  })

  describe('listenerCount()', () => {
    it('should return correct listener count', () => {
      expect(eventEmitter.listenerCount('item-toggle')).toBe(0)

      eventEmitter.on('item-toggle', vi.fn())
      expect(eventEmitter.listenerCount('item-toggle')).toBe(1)

      eventEmitter.on('item-toggle', vi.fn())
      expect(eventEmitter.listenerCount('item-toggle')).toBe(2)
    })
  })

  describe('eventNames()', () => {
    it('should return array of event names with listeners', () => {
      expect(eventEmitter.eventNames()).toEqual([])

      eventEmitter.on('item-toggle', vi.fn())
      eventEmitter.on('progress-update', vi.fn())

      const eventNames = eventEmitter.eventNames()
      expect(eventNames).toHaveLength(2)
      expect(eventNames).toContain('item-toggle')
      expect(eventNames).toContain('progress-update')
    })

    it('should update when listeners are removed', () => {
      const listener = vi.fn()
      eventEmitter.on('item-toggle', listener)
      expect(eventEmitter.eventNames()).toContain('item-toggle')

      eventEmitter.off('item-toggle', listener)
      expect(eventEmitter.eventNames()).not.toContain('item-toggle')
    })
  })

  describe('type safety', () => {
    it('should work with different event map types', () => {
      const searchEmitter = createEventEmitter<VBSSearchEvents>()
      const mockListener = vi.fn()

      searchEmitter.on('filter-change', mockListener)
      searchEmitter.emit('filter-change', {
        filteredData: [
          {
            id: 'era-1',
            title: 'Test Era',
            years: '2020-2021',
            stardates: '1.0-2.0',
            description: 'Test description',
            items: [],
          },
        ],
      })

      expect(mockListener).toHaveBeenCalled()
    })

    it('should maintain closure-based state between calls', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      // Add listeners over multiple calls
      eventEmitter.on('item-toggle', listener1)
      eventEmitter.on('item-toggle', listener2)

      // Verify state is maintained
      expect(eventEmitter.listenerCount('item-toggle')).toBe(2)

      // Emit and verify both are called
      eventEmitter.emit('item-toggle', {itemId: 'test', isWatched: true})
      expect(listener1).toHaveBeenCalled()
      expect(listener2).toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('should handle listener modification during emit', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn(() => {
        // Try to modify listeners during emit
        eventEmitter.off('item-toggle', listener1)
      })

      eventEmitter.on('item-toggle', listener1)
      eventEmitter.on('item-toggle', listener2)

      eventEmitter.emit('item-toggle', {itemId: 'test', isWatched: true})

      // Both should have been called despite listener modification
      expect(listener1).toHaveBeenCalled()
      expect(listener2).toHaveBeenCalled()
    })

    it('should handle duplicate listener registration', () => {
      const listener = vi.fn()

      eventEmitter.on('item-toggle', listener)
      eventEmitter.on('item-toggle', listener)

      // Should only be registered once (Set behavior)
      eventEmitter.emit('item-toggle', {itemId: 'test', isWatched: true})
      expect(listener).toHaveBeenCalledTimes(1)
    })
  })
})
