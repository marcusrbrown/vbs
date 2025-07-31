import type {
  EraProgress,
  ItemToggleCallback,
  ProgressData,
  ProgressTrackerInstance,
  ProgressUpdateCallback,
} from './types.js'
import {starTrekData} from '../data/star-trek-data.js'

export const createProgressTracker = (): ProgressTrackerInstance => {
  // Private state managed via closure variables
  let watchedItems: string[] = []
  const callbacks: {
    onItemToggle: ItemToggleCallback[]
    onProgressUpdate: ProgressUpdateCallback[]
  } = {
    onItemToggle: [],
    onProgressUpdate: [],
  }

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

    callbacks.onProgressUpdate.forEach(callback => callback({overall, eraProgress}))
  }

  // Return public API object
  return {
    setWatchedItems: (items: string[]): void => {
      watchedItems = Array.isArray(items) ? items : []
      updateProgress()
    },

    toggleItem: (itemId: string): void => {
      const isWatched = watchedItems.includes(itemId)

      if (isWatched) {
        watchedItems = watchedItems.filter(id => id !== itemId)
      } else {
        watchedItems.push(itemId)
      }

      callbacks.onItemToggle.forEach(callback => callback(itemId, !isWatched))
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

    onItemToggle: (callback: ItemToggleCallback): void => {
      callbacks.onItemToggle.push(callback)
    },

    onProgressUpdate: (callback: ProgressUpdateCallback): void => {
      callbacks.onProgressUpdate.push(callback)
    },
  }
}
