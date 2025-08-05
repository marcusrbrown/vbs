import type {
  Episode,
  EpisodeProgress,
  EraProgress,
  ProgressData,
  ProgressTrackerEvents,
  ProgressTrackerInstance,
  SeasonProgress,
  StarTrekEra,
  StarTrekItem,
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

/**
 * Calculate season-level progress for a specific series and season.
 * Determines completion based on episode-level or season-level tracking.
 *
 * @param seriesId - The series identifier (e.g., 'ent_s1')
 * @param season - The season number
 * @param watchedItems - Array of watched item/episode IDs
 * @returns SeasonProgress object with episode details, or null if series not found
 */
export const calculateSeasonProgress = (
  seriesId: string,
  season: number,
  watchedItems: string[],
): SeasonProgress | null => {
  return pipe(
    starTrekData,
    // Find the series
    (eras: StarTrekEra[]) => eras.flatMap(era => era.items),
    (items: StarTrekItem[]) => items.find(item => item.id === seriesId),
    (item: StarTrekItem | undefined) => {
      if (!item || !item.episodeData) {
        return null
      }

      // Filter episodes for the specific season
      const seasonEpisodes = item.episodeData.filter(episode => episode.season === season)

      if (seasonEpisodes.length === 0) {
        return null
      }

      // Calculate episode progress
      const episodeProgress: EpisodeProgress[] = seasonEpisodes.map(episode => ({
        episodeId: episode.id,
        seriesId: item.id,
        season: episode.season,
        episode: episode.episode,
        isWatched: watchedItems.includes(episode.id),
        ...(watchedItems.includes(episode.id) && {
          watchedAt: new Date().toISOString(),
        }),
      }))

      const totalEpisodes = seasonEpisodes.length
      const watchedEpisodes = episodeProgress.filter(ep => ep.isWatched).length
      const percentage = totalEpisodes > 0 ? Math.round((watchedEpisodes / totalEpisodes) * 100) : 0

      return {
        seriesId: item.id,
        season,
        totalEpisodes,
        watchedEpisodes,
        total: totalEpisodes,
        completed: watchedEpisodes,
        percentage,
        episodeProgress,
      } as SeasonProgress
    },
  )
}

/**
 * Calculate episode-level progress across all series with episode data.
 * Returns array of SeasonProgress objects for all seasons.
 *
 * @param watchedItems - Array of watched item/episode IDs
 * @returns Array of SeasonProgress objects
 */
export const calculateEpisodeProgress = (watchedItems: string[]): SeasonProgress[] => {
  return pipe(
    starTrekData,
    (eras: StarTrekEra[]) => eras.flatMap(era => era.items),
    (items: StarTrekItem[]) =>
      items.filter(item => item.episodeData && item.episodeData.length > 0),
    (itemsWithEpisodes: StarTrekItem[]) => {
      const seasonProgress: SeasonProgress[] = []

      for (const item of itemsWithEpisodes) {
        const episodes = item.episodeData || []

        // Group episodes by season
        const seasonGroups = new Map<number, Episode[]>()
        for (const episode of episodes) {
          if (!seasonGroups.has(episode.season)) {
            seasonGroups.set(episode.season, [])
          }
          const seasonEpisodes = seasonGroups.get(episode.season)
          if (seasonEpisodes) {
            seasonEpisodes.push(episode)
          }
        }

        // Create progress for each season
        for (const [seasonNumber] of seasonGroups.entries()) {
          const progress = calculateSeasonProgress(item.id, seasonNumber, watchedItems)
          if (progress) {
            seasonProgress.push(progress)
          }
        }
      }

      return seasonProgress
    },
  )
}

/**
 * Check if episode-level tracking is available for a given item.
 * Returns true if the item has episode data that can be tracked.
 *
 * @param itemId - The item identifier to check
 * @returns True if episode-level tracking is available
 */
export const hasEpisodeData = (itemId: string): boolean => {
  return pipe(
    starTrekData,
    (eras: StarTrekEra[]) => eras.flatMap(era => era.items),
    (items: StarTrekItem[]) => items.find(item => item.id === itemId),
    (item: StarTrekItem | undefined) => Boolean(item?.episodeData && item.episodeData.length > 0),
  )
}

/**
 * Get all episodes for a specific series item.
 * Returns empty array if no episode data exists.
 *
 * @param itemId - The series item identifier
 * @returns Array of Episode objects
 */
export const getEpisodesForItem = (itemId: string): Episode[] => {
  return pipe(
    starTrekData,
    (eras: StarTrekEra[]) => eras.flatMap(era => era.items),
    (items: StarTrekItem[]) => items.find(item => item.id === itemId),
    (item: StarTrekItem | undefined) => item?.episodeData || [],
  )
}
