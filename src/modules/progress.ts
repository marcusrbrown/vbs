import type {
  EraProgress,
  ProgressData,
  ProgressTrackerEvents,
  ProgressTrackerInstance,
} from './types.js'
import {starTrekData} from '../data/star-trek-data.js'
import {createProgressPipeline, pipe, tap} from '../utils/composition.js'
import {createEventEmitter} from './events.js'

export const createProgressTracker = (): ProgressTrackerInstance => {
  // Private state managed via closure variables
  let watchedItems: string[] = []

  // Generic EventEmitter for type-safe event handling
  const eventEmitter = createEventEmitter<ProgressTrackerEvents>()

  // Helper functions for internal calculations
  const calculateOverallProgress = (): ProgressData => {
    return pipe(
      starTrekData,
      // Calculate totals from all eras
      eras => eras.reduce((sum, era) => sum + era.items.length, 0),
      // Create progress data with totals and completion
      totalItems => {
        const completedItems = watchedItems.length
        const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

        return {
          total: totalItems,
          completed: completedItems,
          percentage,
        }
      },
    )
  }

  const calculateEraProgress = (): EraProgress[] => {
    return pipe(
      starTrekData,
      // Transform each era to progress data
      eras =>
        eras.map(era => {
          const completedItems = era.items.filter(item => watchedItems.includes(item.id)).length
          const totalItems = era.items.length
          const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

          return {
            eraId: era.id,
            total: totalItems,
            completed: completedItems,
            percentage,
          }
        }),
    )
  }

  // Internal helper function for progress updates using composition pipeline
  const updateProgress = (): void => {
    const progressPipeline = createProgressPipeline(starTrekData, {
      onProgressUpdate: progressData => {
        eventEmitter.emit('progress-update', progressData)
      },
    })

    // Execute the pipeline with current watched items
    progressPipeline(watchedItems)
  }

  // Return public API object
  return {
    setWatchedItems: (items: string[]): void => {
      watchedItems = Array.isArray(items) ? items : []
      updateProgress()
    },

    toggleItem: (itemId: string): void => {
      pipe(
        itemId,
        // Track the toggle action for debugging
        tap((id: string) => {
          // Could add debugging/analytics here
          return id
        }),
        // Process the toggle operation
        id => {
          const isWatched = watchedItems.includes(id)
          const newWatchedState = !isWatched

          if (isWatched) {
            watchedItems = watchedItems.filter(item => item !== id)
          } else {
            watchedItems.push(id)
          }

          eventEmitter.emit('item-toggle', {itemId: id, isWatched: newWatchedState})
          updateProgress()
        },
      )
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
