import type {
  EraProgress,
  ProgressData,
  ProgressTrackerEvents,
  ProgressTrackerInstance,
} from './types.js'
import {starTrekData} from '../data/star-trek-data.js'
import {createEventEmitter} from './events.js'

export const createProgressTracker = (): ProgressTrackerInstance => {
  // Private state managed via closure variables
  let watchedItems: string[] = []

  // Generic EventEmitter for type-safe event handling
  const eventEmitter = createEventEmitter<ProgressTrackerEvents>()

  // Helper functions for internal calculations
  const calculateOverallProgress = (): ProgressData => {
    const totalItems = starTrekData.reduce((sum, era) => sum + era.items.length, 0)
    const completedItems = watchedItems.length
    const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

    return {
      total: totalItems,
      completed: completedItems,
      percentage,
    }
  }

  const calculateEraProgress = (): EraProgress[] => {
    return starTrekData.map(era => {
      const completedItems = era.items.filter(item => watchedItems.includes(item.id)).length
      const totalItems = era.items.length
      const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

      return {
        eraId: era.id,
        total: totalItems,
        completed: completedItems,
        percentage,
      }
    })
  }

  // Internal helper function for progress updates
  const updateProgress = (): void => {
    const overall = calculateOverallProgress()
    const eraProgress = calculateEraProgress()
    const progressData = {overall, eraProgress}

    eventEmitter.emit('progress-update', progressData)
  }

  // Return public API object
  return {
    setWatchedItems: (items: string[]): void => {
      watchedItems = Array.isArray(items) ? items : []
      updateProgress()
    },

    toggleItem: (itemId: string): void => {
      const isWatched = watchedItems.includes(itemId)
      const newWatchedState = !isWatched

      if (isWatched) {
        watchedItems = watchedItems.filter(id => id !== itemId)
      } else {
        watchedItems.push(itemId)
      }

      eventEmitter.emit('item-toggle', {itemId, isWatched: newWatchedState})

      updateProgress()
    },

    isWatched: (itemId: string): boolean => {
      return watchedItems.includes(itemId)
    },

    resetProgress: (): void => {
      watchedItems = []
      updateProgress()
    },

    getWatchedItems: (): string[] => {
      return [...watchedItems] // Return immutable copy
    },

    updateProgress: (): void => {
      updateProgress()
    },

    calculateOverallProgress: (): ProgressData => {
      return calculateOverallProgress()
    },

    calculateEraProgress: (): EraProgress[] => {
      return calculateEraProgress()
    },

    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    once: eventEmitter.once.bind(eventEmitter),
    removeAllListeners: eventEmitter.removeAllListeners.bind(eventEmitter),
  }
}
