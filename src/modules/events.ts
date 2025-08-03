export type EventListener<TPayload = unknown> = (payload: TPayload) => void

export type EventMap = Record<string, unknown>

/**
 * Generic EventEmitter implementation for type-safe event emission and subscription.
 * Designed to work with the VBS functional factory architecture and closure-based state management.
 *
 * @template TEventMap - Map of event names to their payload types
 */
export interface EventEmitterInstance<TEventMap extends EventMap> {
  /**
   * Subscribe to an event with a type-safe listener
   */
  on<TEventName extends keyof TEventMap>(
    eventName: TEventName,
    listener: EventListener<TEventMap[TEventName]>,
  ): void

  /**
   * Unsubscribe from an event
   */
  off<TEventName extends keyof TEventMap>(
    eventName: TEventName,
    listener: EventListener<TEventMap[TEventName]>,
  ): void

  /**
   * Emit an event with type-safe payload
   */
  emit<TEventName extends keyof TEventMap>(
    eventName: TEventName,
    payload: TEventMap[TEventName],
  ): void

  /**
   * Subscribe to an event once (auto-unsubscribe after first emission)
   */
  once<TEventName extends keyof TEventMap>(
    eventName: TEventName,
    listener: EventListener<TEventMap[TEventName]>,
  ): void

  /**
   * Remove all listeners for a specific event or all events
   */
  removeAllListeners<TEventName extends keyof TEventMap>(eventName?: TEventName): void

  /**
   * Get the number of listeners for a specific event
   */
  listenerCount<TEventName extends keyof TEventMap>(eventName: TEventName): number

  /**
   * Get all event names that have listeners
   */
  eventNames(): (keyof TEventMap)[]
}

/**
 * Factory function to create a generic EventEmitter instance
 * Follows the VBS functional factory pattern with closure-based state management
 */
export const createEventEmitter = <
  TEventMap extends EventMap,
>(): EventEmitterInstance<TEventMap> => {
  // Private state managed via closure variables - using any for internal storage to avoid complex generic constraints
  const listeners = new Map<keyof TEventMap, Set<EventListener<any>>>()

  // Helper function to ensure listener set exists for event
  const ensureListenerSet = <TEventName extends keyof TEventMap>(
    eventName: TEventName,
  ): Set<EventListener<any>> => {
    if (!listeners.has(eventName)) {
      listeners.set(eventName, new Set())
    }
    const listenerSet = listeners.get(eventName)
    if (!listenerSet) {
      throw new Error(`Failed to create listener set for event: ${String(eventName)}`)
    }
    return listenerSet
  }

  // Return public API object
  return {
    on: <TEventName extends keyof TEventMap>(
      eventName: TEventName,
      listener: EventListener<TEventMap[TEventName]>,
    ): void => {
      const listenerSet = ensureListenerSet(eventName)
      listenerSet.add(listener as EventListener<any>)
    },

    off: <TEventName extends keyof TEventMap>(
      eventName: TEventName,
      listener: EventListener<TEventMap[TEventName]>,
    ): void => {
      const listenerSet = listeners.get(eventName)
      if (listenerSet) {
        listenerSet.delete(listener as EventListener<any>)
        // Clean up empty sets
        if (listenerSet.size === 0) {
          listeners.delete(eventName)
        }
      }
    },

    emit: <TEventName extends keyof TEventMap>(
      eventName: TEventName,
      payload: TEventMap[TEventName],
    ): void => {
      const listenerSet = listeners.get(eventName)
      if (listenerSet) {
        // Create a copy of listeners to avoid issues if listeners are modified during iteration
        const listenersArray = Array.from(listenerSet)
        listenersArray.forEach(listener => {
          try {
            listener(payload)
          } catch (error) {
            // Log errors but don't stop other listeners from executing
            console.error(`Error in event listener for '${String(eventName)}':`, error)
          }
        })
      }
    },

    once: <TEventName extends keyof TEventMap>(
      eventName: TEventName,
      listener: EventListener<TEventMap[TEventName]>,
    ): void => {
      const onceWrapper = (payload: TEventMap[TEventName]): void => {
        // Remove the wrapper before calling the original listener
        const listenerSet = listeners.get(eventName)
        if (listenerSet) {
          listenerSet.delete(onceWrapper as EventListener<any>)
          if (listenerSet.size === 0) {
            listeners.delete(eventName)
          }
        }
        listener(payload)
      }

      const listenerSet = ensureListenerSet(eventName)
      listenerSet.add(onceWrapper as EventListener<any>)
    },

    removeAllListeners: <TEventName extends keyof TEventMap>(eventName?: TEventName): void => {
      if (eventName === undefined) {
        listeners.clear()
      } else {
        listeners.delete(eventName)
      }
    },

    listenerCount: <TEventName extends keyof TEventMap>(eventName: TEventName): number => {
      const listenerSet = listeners.get(eventName)
      return listenerSet ? listenerSet.size : 0
    },

    eventNames: (): (keyof TEventMap)[] => {
      return Array.from(listeners.keys())
    },
  }
}

// Utility type for creating event maps with specific event signatures
export type CreateEventMap<T extends Record<string, unknown>> = T

// Example usage and type definitions for VBS-specific events
export interface VBSProgressEvents extends EventMap {
  'item-toggle': {itemId: string; isWatched: boolean}
  'progress-update': {
    overall: {total: number; completed: number; percentage: number}
    eraProgress: {eraId: string; total: number; completed: number; percentage: number}[]
  }
}

export interface VBSSearchEvents extends EventMap {
  'filter-change': {
    filteredData: {
      id: string
      title: string
      years: string
      stardates: string
      description: string
      items: {
        id: string
        title: string
        type: string
        year: string
        stardate: string
        episodes?: number
        notes: string
      }[]
    }[]
  }
}

// Factory function type aliases for consistency with existing patterns
export type CreateEventEmitter = <TEventMap extends EventMap>() => EventEmitterInstance<TEventMap>
