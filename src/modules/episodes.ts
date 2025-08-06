import type {
  Episode,
  EpisodeFilterCriteria,
  EpisodeManagerEvents,
  EpisodeManagerInstance,
  StarTrekEra,
} from './types.js'
import {starTrekData} from '../data/star-trek-data.js'
import {curry, pipe, tap} from '../utils/composition.js'
import {createEventEmitter} from './events.js'

/**
 * Creates an episode management factory instance with closure-based state management.
 * Handles episode-level filtering, search, lazy loading, and spoiler-safe content display.
 * Uses functional composition patterns and generic EventEmitter for type-safe events.
 *
 * Features:
 * - Episode search across titles, synopsis, plot points, and guest stars
 * - Advanced filtering by series, season, guest stars, plot keywords
 * - Lazy loading for performance with large episode datasets
 * - Spoiler-safe progressive disclosure
 * - Bulk filtering operations with performance optimization
 *
 * @returns EpisodeManagerInstance with episode management methods and event handling
 *
 * @example
 * ```typescript
 * const episodeManager = createEpisodeManager()
 *
 * // Search for episodes containing 'borg'
 * episodeManager.searchEpisodes('borg')
 *
 * // Filter by specific criteria
 * episodeManager.setFilterCriteria({
 *   seriesId: 'tng',
 *   season: 3,
 *   spoilerLevel: 'safe'
 * })
 *
 * // Listen for filter changes
 * episodeManager.on('filter-change', ({ filteredEpisodes }) => {
 *   renderEpisodeList(filteredEpisodes)
 * })
 * ```
 */
export const createEpisodeManager = (): EpisodeManagerInstance => {
  // Closure variables for private state management
  let currentCriteria: EpisodeFilterCriteria = {}
  let allEpisodes: Episode[] = []
  let filteredEpisodes: Episode[] = []
  let loadedCount = 0
  let isLoading = false
  let spoilerLevel: 'safe' | 'moderate' | 'full' = 'safe'

  // Generic EventEmitter for type-safe event handling
  const eventEmitter = createEventEmitter<EpisodeManagerEvents>()

  // Constants for lazy loading
  const LOAD_BATCH_SIZE = 20
  const MAX_EPISODES_PER_LOAD = 50

  /**
   * Extract all episodes from Star Trek data structure.
   * Flattens the hierarchical era -> item -> episode structure into a flat array.
   */
  const extractAllEpisodes = (): Episode[] => {
    return pipe(
      starTrekData,
      // Extract all episodes from all eras and items
      (eras: StarTrekEra[]) => {
        return eras.flatMap(era =>
          era.items.flatMap(item => (item.episodeData ? item.episodeData : [])),
        )
      },
      // Debug tap for development tracking
      tap((episodes: Episode[]) => {
        if (episodes.length === 0) {
          console.warn('No episodes found in Star Trek data')
        }
        return undefined
      }),
    )
  }

  /**
   * Initialize episode data on first access.
   * Lazy loads all available episodes from the data structure.
   */
  const initializeEpisodes = (): void => {
    if (allEpisodes.length === 0) {
      allEpisodes = extractAllEpisodes()
      filteredEpisodes = [...allEpisodes]
    }
  }

  /**
   * Check if an episode matches the current filtering criteria.
   * Uses functional composition to combine multiple filter conditions.
   */
  const matchesFilter = (episode: Episode): boolean => {
    return pipe(
      episode,
      // Apply all filter conditions using functional composition
      episode => {
        const {searchTerm, seriesId, season, guestStars, plotKeywords, airDateRange} =
          currentCriteria

        // Text search across multiple fields
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase()
          const matchesText = [
            episode.title,
            episode.synopsis,
            ...episode.plotPoints,
            ...episode.guestStars,
          ].some(text => text.toLowerCase().includes(searchLower))

          if (!matchesText) return false
        }

        // Series filter
        if (seriesId && !episode.id.startsWith(seriesId)) {
          return false
        }

        // Season filter
        if (season !== undefined && episode.season !== season) {
          return false
        }

        // Guest stars filter
        if (guestStars && guestStars.length > 0) {
          const hasMatchingGuest = guestStars.some(guest =>
            episode.guestStars.some(episodeGuest =>
              episodeGuest.toLowerCase().includes(guest.toLowerCase()),
            ),
          )
          if (!hasMatchingGuest) return false
        }

        // Plot keywords filter
        if (plotKeywords && plotKeywords.length > 0) {
          const hasMatchingPlot = plotKeywords.some(keyword =>
            episode.plotPoints.some(point => point.toLowerCase().includes(keyword.toLowerCase())),
          )
          if (!hasMatchingPlot) return false
        }

        // Air date range filter
        if (airDateRange) {
          const episodeDate = new Date(episode.airDate)
          const startDate = new Date(airDateRange.start)
          const endDate = new Date(airDateRange.end)
          if (episodeDate < startDate || episodeDate > endDate) {
            return false
          }
        }

        return true
      },
    )
  }

  /**
   * Apply current filtering criteria to all episodes.
   * Uses functional composition for efficient filtering pipeline.
   */
  const applyFilters = (): void => {
    pipe(
      allEpisodes,
      // Filter episodes based on current criteria
      episodes => episodes.filter(matchesFilter),
      // Update filtered episodes state
      tap((filtered: Episode[]) => {
        filteredEpisodes = filtered
        return undefined
      }),
      // Emit filter change event
      filtered => {
        eventEmitter.emit('filter-change', {
          filteredEpisodes: filtered,
          filterCriteria: currentCriteria,
        })

        eventEmitter.emit('bulk-filter-applied', {
          filterType: 'episode-filter',
          matchingCount: filtered.length,
          totalCount: allEpisodes.length,
        })
      },
    )
  }

  /**
   * Curried function for episode text search.
   * Enables partial application for reusable search predicates.
   */
  const searchByText = curry((searchTerm: string, episode: Episode): boolean => {
    const searchLower = searchTerm.toLowerCase()
    return [episode.title, episode.synopsis, ...episode.plotPoints, ...episode.guestStars].some(
      text => text.toLowerCase().includes(searchLower),
    )
  })

  /**
   * Get episodes for a specific series and season.
   * Uses functional composition to filter and sort episodes.
   */
  const getEpisodesForSeason = (seriesId: string, season: number): Episode[] => {
    initializeEpisodes()

    return pipe(
      allEpisodes,
      // Filter by series and season
      episodes => episodes.filter(ep => ep.id.startsWith(seriesId) && ep.season === season),
      // Sort by episode number
      episodes => episodes.sort((a, b) => a.episode - b.episode),
    )
  }

  /**
   * Set new filtering criteria and apply filters.
   * Merges new criteria with existing criteria for incremental filtering.
   */
  const setFilterCriteria = (criteria: EpisodeFilterCriteria): void => {
    initializeEpisodes()
    currentCriteria = {...currentCriteria, ...criteria}
    applyFilters()
  }

  /**
   * Search episodes by text term across multiple fields.
   * Updates filtering criteria and applies search.
   */
  const searchEpisodes = (searchTerm: string): void => {
    initializeEpisodes()
    currentCriteria.searchTerm = searchTerm

    const matchingEpisodes = allEpisodes.filter(searchByText(searchTerm))

    applyFilters()

    eventEmitter.emit('search-update', {
      searchTerm,
      matchingEpisodes,
      totalMatches: matchingEpisodes.length,
    })
  }

  /**
   * Load more episodes for lazy loading functionality.
   * Implements batch loading for performance with large datasets.
   */
  const loadMoreEpisodes = (count: number = LOAD_BATCH_SIZE): void => {
    if (isLoading) return

    isLoading = true
    const batchSize = Math.min(count, MAX_EPISODES_PER_LOAD)
    const startIndex = loadedCount
    const endIndex = Math.min(startIndex + batchSize, filteredEpisodes.length)

    const loadedEpisodes = filteredEpisodes.slice(startIndex, endIndex)
    loadedCount = endIndex

    isLoading = false

    eventEmitter.emit('episodes-loaded', {
      loadedEpisodes,
      totalLoaded: loadedCount,
      hasMore: loadedCount < filteredEpisodes.length,
    })
  }

  /**
   * Toggle episode detail expansion with spoiler-safe content control.
   * Implements progressive disclosure based on spoiler level preferences.
   */
  const toggleEpisodeDetail = (
    episodeId: string,
    requestedSpoilerLevel: 'safe' | 'moderate' | 'full' = spoilerLevel,
  ): void => {
    const episode = allEpisodes.find(ep => ep.id === episodeId)
    if (!episode) return

    eventEmitter.emit('episode-detail-toggle', {
      episodeId,
      isExpanded: true,
      spoilerLevel: requestedSpoilerLevel,
    })
  }

  /**
   * Get current filtered episodes based on applied criteria.
   */
  const getFilteredEpisodes = (): Episode[] => {
    initializeEpisodes()
    return [...filteredEpisodes]
  }

  /**
   * Get current filtering criteria.
   */
  const getCurrentCriteria = (): EpisodeFilterCriteria => {
    return {...currentCriteria}
  }

  /**
   * Reset all filters and search criteria to default state.
   */
  const resetFilters = (): void => {
    currentCriteria = {}
    filteredEpisodes = [...allEpisodes]

    eventEmitter.emit('filter-change', {
      filteredEpisodes,
      filterCriteria: currentCriteria,
    })
  }

  /**
   * Set spoiler safety level for content display.
   */
  const setSpoilerLevel = (level: 'safe' | 'moderate' | 'full'): void => {
    spoilerLevel = level
    currentCriteria.spoilerLevel = level
  }

  // Return public API with bound EventEmitter methods
  return {
    setFilterCriteria,
    searchEpisodes,
    getEpisodesForSeason,
    getFilteredEpisodes,
    loadMoreEpisodes,
    toggleEpisodeDetail,
    matchesFilter,
    getCurrentCriteria,
    resetFilters,
    setSpoilerLevel,

    // Generic EventEmitter methods with proper binding
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    once: eventEmitter.once.bind(eventEmitter),
    removeAllListeners: eventEmitter.removeAllListeners.bind(eventEmitter),
  }
}
