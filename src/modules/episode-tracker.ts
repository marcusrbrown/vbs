import type {
  Episode,
  EpisodeProgress,
  EpisodeTrackerEvents,
  EpisodeTrackerInstance,
  ProgressData,
  SeasonProgress,
  StarTrekEra,
  StarTrekItem,
} from './types.js'
import {starTrekData} from '../data/star-trek-data.js'
import {pipe} from '../utils/composition.js'
import {createEventEmitter} from './events.js'

/**
 * Factory function for creating episode-level progress tracker instances.
 * Uses closure-based state management for episode tracking separate from season-level progress.
 * Provides hierarchical progress calculations and bulk operations with type-safe event emission.
 *
 * @returns EpisodeTrackerInstance with methods for episode-level progress tracking
 */
export const createEpisodeTracker = (): EpisodeTrackerInstance => {
  // Private state managed via closure variables
  let watchedEpisodes: string[] = []

  // Generic EventEmitter for type-safe event handling
  const eventEmitter = createEventEmitter<EpisodeTrackerEvents>()

  // Helper function to get all episodes for a specific series
  const getEpisodesForSeries = (seriesId: string): Episode[] => {
    return pipe(
      starTrekData,
      (eras: StarTrekEra[]) => eras.flatMap(era => era.items),
      (items: StarTrekItem[]) => items.find(item => item.id === seriesId),
      (item: StarTrekItem | undefined) => item?.episodeData || [],
    )
  }

  // Helper function to get episodes for a specific season
  const getEpisodesForSeason = (seriesId: string, season: number): Episode[] => {
    const allEpisodes = getEpisodesForSeries(seriesId)
    return allEpisodes.filter(episode => episode.season === season)
  }

  // Helper function to calculate overall progress across all episodes
  const calculateOverallEpisodeProgress = (): ProgressData => {
    return pipe(
      starTrekData,
      // Get all episodes from all series
      (eras: StarTrekEra[]) => eras.flatMap(era => era.items),
      (items: StarTrekItem[]) => items.flatMap(item => item.episodeData || []),
      // Calculate progress
      (allEpisodes: Episode[]) => {
        const totalEpisodes = allEpisodes.length
        const completedEpisodes = allEpisodes.filter(episode =>
          watchedEpisodes.includes(episode.id),
        ).length
        const percentage =
          totalEpisodes > 0 ? Math.round((completedEpisodes / totalEpisodes) * 100) : 0

        return {
          total: totalEpisodes,
          completed: completedEpisodes,
          percentage,
        }
      },
    )
  }

  // Helper function to calculate progress for all seasons
  const calculateAllSeasonProgress = (): SeasonProgress[] => {
    return pipe(
      starTrekData,
      (eras: StarTrekEra[]) => eras.flatMap(era => era.items),
      (items: StarTrekItem[]) =>
        items.filter(item => item.episodeData && item.episodeData.length > 0),
      (itemsWithEpisodes: StarTrekItem[]) => {
        const seasonMap = new Map<string, SeasonProgress>()

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

          // Create SeasonProgress for each season
          for (const [seasonNumber, seasonEpisodes] of seasonGroups.entries()) {
            const seasonKey = `${item.id}_${seasonNumber}`
            const watchedInSeason: Episode[] = seasonEpisodes.filter(episode =>
              watchedEpisodes.includes(episode.id),
            )

            const episodeProgress: EpisodeProgress[] = seasonEpisodes.map(episode => ({
              episodeId: episode.id,
              seriesId: item.id,
              season: episode.season,
              episode: episode.episode,
              isWatched: watchedEpisodes.includes(episode.id),
              ...(watchedEpisodes.includes(episode.id) && {
                watchedAt: new Date().toISOString(),
              }),
            }))

            const totalEpisodes = seasonEpisodes.length
            const watchedEpisodeCount: number = watchedInSeason.length
            const percentage =
              totalEpisodes > 0 ? Math.round((watchedEpisodeCount / totalEpisodes) * 100) : 0

            seasonMap.set(seasonKey, {
              seriesId: item.id,
              season: seasonNumber,
              totalEpisodes,
              watchedEpisodes: watchedEpisodeCount,
              total: totalEpisodes,
              completed: watchedEpisodeCount,
              percentage,
              episodeProgress,
            })
          }
        }

        return Array.from(seasonMap.values())
      },
    )
  }

  // Helper function to update episode progress calculations
  const updateEpisodeProgress = (): void => {
    const seasonProgress = calculateAllSeasonProgress()
    const overallProgress = calculateOverallEpisodeProgress()

    eventEmitter.emit('episode-progress-update', {
      seasonProgress,
      overallProgress,
    })
  }

  // Return public API object
  return {
    setWatchedEpisodes: (episodeIds: string[]): void => {
      watchedEpisodes = Array.isArray(episodeIds) ? episodeIds : []
      updateEpisodeProgress()
    },

    toggleEpisode: (episodeId: string): void => {
      // Find episode details for event emission
      const allEpisodes = pipe(
        starTrekData,
        (eras: StarTrekEra[]) => eras.flatMap(era => era.items),
        (items: StarTrekItem[]) => items.flatMap(item => item.episodeData || []),
      )

      const episode = allEpisodes.find(ep => ep.id === episodeId)
      const isWatched = watchedEpisodes.includes(episodeId)
      const newWatchedState = !isWatched

      if (isWatched) {
        watchedEpisodes = watchedEpisodes.filter(epId => epId !== episodeId)
      } else {
        watchedEpisodes.push(episodeId)
      }

      if (episode) {
        eventEmitter.emit('episode-toggle', {
          episodeId,
          isWatched: newWatchedState,
          seriesId: episode.id.replace(/_e\d+$/, ''), // Extract series from episode ID
          season: episode.season,
          episode: episode.episode,
        })
      }

      updateEpisodeProgress()
    },

    isEpisodeWatched: (episodeId: string): boolean => {
      return watchedEpisodes.includes(episodeId)
    },

    markSeasonWatched: (seriesId: string, season: number): void => {
      const seasonEpisodes = getEpisodesForSeason(seriesId, season)
      const episodeIds = seasonEpisodes.map(episode => episode.id)

      // Add all episode IDs that aren't already watched
      const newEpisodes = episodeIds.filter(id => !watchedEpisodes.includes(id))
      watchedEpisodes.push(...newEpisodes)

      eventEmitter.emit('season-toggle', {
        seriesId,
        season,
        isWatched: true,
        episodeIds,
      })

      eventEmitter.emit('bulk-operation-complete', {
        operation: 'mark-season-watched',
        seriesId,
        season,
        affectedEpisodes: episodeIds.length,
      })

      updateEpisodeProgress()
    },

    markSeasonUnwatched: (seriesId: string, season: number): void => {
      const seasonEpisodes = getEpisodesForSeason(seriesId, season)
      const episodeIds = seasonEpisodes.map(episode => episode.id)

      // Remove all episode IDs for this season
      watchedEpisodes = watchedEpisodes.filter(id => !episodeIds.includes(id))

      eventEmitter.emit('season-toggle', {
        seriesId,
        season,
        isWatched: false,
        episodeIds,
      })

      eventEmitter.emit('bulk-operation-complete', {
        operation: 'mark-season-unwatched',
        seriesId,
        season,
        affectedEpisodes: episodeIds.length,
      })

      updateEpisodeProgress()
    },

    resetEpisodeProgress: (): void => {
      watchedEpisodes = []
      updateEpisodeProgress()
    },

    getWatchedEpisodes: (): string[] => {
      return [...watchedEpisodes] // Return immutable copy
    },

    updateEpisodeProgress: (): void => {
      updateEpisodeProgress()
    },

    calculateSeasonProgress: (seriesId: string, season: number): SeasonProgress | null => {
      const allProgress = calculateAllSeasonProgress()
      return (
        allProgress.find(
          progress => progress.seriesId === seriesId && progress.season === season,
        ) || null
      )
    },

    calculateEpisodeProgress: (): SeasonProgress[] => {
      return calculateAllSeasonProgress()
    },

    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    once: eventEmitter.once.bind(eventEmitter),
    removeAllListeners: eventEmitter.removeAllListeners.bind(eventEmitter),
  }
}
