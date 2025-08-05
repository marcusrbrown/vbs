import type {Episode, StarTrekEra, StarTrekItem} from './types.js'
import {starTrekData} from '../data/star-trek-data.js'
import {pipe} from '../utils/composition.js'

// Migration version constants
export const MIGRATION_VERSIONS = {
  SEASON_LEVEL: '1.0',
  EPISODE_LEVEL: '2.0',
} as const

export type MigrationVersion = (typeof MIGRATION_VERSIONS)[keyof typeof MIGRATION_VERSIONS]

// Storage key for migration state
const MIGRATION_STATE_KEY = 'starTrekMigrationState'

/**
 * Migration state tracking for version management.
 */
export interface MigrationState {
  currentVersion: MigrationVersion
  lastMigrated: string
  backupData?: string[]
  migrationHistory: {
    from: MigrationVersion
    to: MigrationVersion
    timestamp: string
    itemCount: number
  }[]
}

/**
 * Migration result information.
 */
export interface MigrationResult {
  success: boolean
  migratedItems: string[]
  backupData: string[]
  errors: string[]
  version: MigrationVersion
}

/**
 * Get current migration state from localStorage.
 */
export const getMigrationState = (): MigrationState => {
  try {
    const stored = localStorage.getItem(MIGRATION_STATE_KEY)
    if (!stored) {
      return {
        currentVersion: MIGRATION_VERSIONS.SEASON_LEVEL,
        lastMigrated: new Date().toISOString(),
        migrationHistory: [],
      }
    }

    const state = JSON.parse(stored) as MigrationState
    return {
      currentVersion: state.currentVersion || MIGRATION_VERSIONS.SEASON_LEVEL,
      lastMigrated: state.lastMigrated || new Date().toISOString(),
      ...(state.backupData !== undefined && {backupData: state.backupData}),
      migrationHistory: state.migrationHistory || [],
    }
  } catch (error) {
    console.warn('Failed to load migration state, using default:', error)
    return {
      currentVersion: MIGRATION_VERSIONS.SEASON_LEVEL,
      lastMigrated: new Date().toISOString(),
      migrationHistory: [],
    }
  }
}

/**
 * Save migration state to localStorage.
 */
export const saveMigrationState = (state: MigrationState): void => {
  try {
    localStorage.setItem(MIGRATION_STATE_KEY, JSON.stringify(state))
  } catch (error) {
    console.error('Failed to save migration state:', error)
  }
}

/**
 * Get all episodes for a given series/season combination.
 * Returns empty array if no episode data exists.
 */
export const getEpisodesForSeries = (seriesId: string): Episode[] => {
  return pipe(
    starTrekData,
    // Find all items across all eras
    (eras: StarTrekEra[]) => eras.flatMap(era => era.items),
    // Find the specific series
    (items: StarTrekItem[]) => items.find(item => item.id === seriesId),
    // Extract episode data if it exists
    (item: StarTrekItem | undefined) => item?.episodeData || [],
  )
}

/**
 * Extract season number from season-level series ID.
 * Examples: 'ent_s1' -> 1, 'tos_s2' -> 2
 */
export const extractSeasonFromSeriesId = (seriesId: string): number => {
  const match = seriesId.match(/_s(\d+)$/)
  return match?.[1] ? Number.parseInt(match[1], 10) : 1
}

/**
 * Get the base series ID from a season-level ID.
 * Examples: 'ent_s1' -> 'ent', 'tos_s2' -> 'tos'
 */
export const getBaseSeriesId = (seriesId: string): string => {
  return seriesId.replace(/_s\d+$/, '')
}

/**
 * Generate episode IDs for a given season.
 * Maps season-level progress to individual episode IDs.
 */
export const generateEpisodeIds = (seriesId: string): string[] => {
  const episodes = getEpisodesForSeries(seriesId)

  if (episodes.length === 0) {
    // If no episode data exists, we can't migrate to episode level
    console.warn(`No episode data found for series: ${seriesId}`)
    return []
  }

  return episodes.map(episode => episode.id)
}

/**
 * Migrate season-level progress to episode-level progress.
 * Converts items like 'ent_s1' to individual episode IDs like ['ent_s1_e01', 'ent_s1_e02', ...]
 */
export const migrateSeasonToEpisodeProgress = (seasonLevelProgress: string[]): MigrationResult => {
  const migratedItems: string[] = []
  const errors: string[] = []

  return pipe(
    seasonLevelProgress,
    // Process each season-level item
    (originalItems: string[]) => {
      for (const item of originalItems) {
        try {
          // Check if this looks like a season-level ID (contains _s followed by number)
          if (/_s\d+$/.test(item)) {
            const episodeIds = generateEpisodeIds(item)
            if (episodeIds.length > 0) {
              migratedItems.push(...episodeIds)
            } else {
              // Keep the original item if no episode data exists
              migratedItems.push(item)
              console.warn(`No episode data for ${item}, keeping original`)
            }
          } else {
            // Keep non-season items as-is (movies, other content)
            migratedItems.push(item)
          }
        } catch (error) {
          errors.push(`Failed to migrate ${item}: ${error}`)
          // Keep original item on error
          migratedItems.push(item)
        }
      }

      return {
        success: errors.length === 0,
        migratedItems,
        backupData: originalItems,
        errors,
        version: MIGRATION_VERSIONS.EPISODE_LEVEL,
      } as MigrationResult
    },
  )
}

/**
 * Rollback episode-level progress to season-level progress.
 * Consolidates episode IDs back to season-level IDs for compatibility.
 */
export const rollbackEpisodeToSeasonProgress = (
  episodeLevelProgress: string[],
): MigrationResult => {
  const seasonItems: string[] = []
  const errors: string[] = []
  const seasonMap = new Map<string, Set<string>>()

  return pipe(
    episodeLevelProgress,
    // Group episodes by series/season
    (episodes: string[]) => {
      for (const episodeId of episodes) {
        try {
          // Extract series info from episode ID (e.g., 'ent_s1_e01' -> 'ent_s1')
          const seasonMatch = episodeId.match(/^(.+_s\d+)_e\d+$/)
          if (seasonMatch?.[1]) {
            const seasonId = seasonMatch[1]
            if (!seasonMap.has(seasonId)) {
              seasonMap.set(seasonId, new Set())
            }
            const episodeSet = seasonMap.get(seasonId)
            if (episodeSet) {
              episodeSet.add(episodeId)
            }
          } else {
            // Keep non-episode items as-is (movies, etc.)
            seasonItems.push(episodeId)
          }
        } catch (error) {
          errors.push(`Failed to rollback ${episodeId}: ${error}`)
          seasonItems.push(episodeId)
        }
      }

      // Add season IDs for completed seasons
      for (const [seasonId, episodeIds] of seasonMap.entries()) {
        const totalEpisodes = getEpisodesForSeries(seasonId)
        if (totalEpisodes.length > 0 && episodeIds.size === totalEpisodes.length) {
          // All episodes watched, mark entire season as watched
          seasonItems.push(seasonId)
        }
        // If not all episodes are watched, we lose partial progress in rollback
        // This is expected behavior for rollback scenarios
      }

      return {
        success: errors.length === 0,
        migratedItems: seasonItems,
        backupData: episodes,
        errors,
        version: MIGRATION_VERSIONS.SEASON_LEVEL,
      } as MigrationResult
    },
  )
}

/**
 * Check if migration is needed based on current state and data format.
 */
export const isMigrationNeeded = (currentProgress: string[]): boolean => {
  const migrationState = getMigrationState()

  // If already at episode level, no migration needed
  if (migrationState.currentVersion === MIGRATION_VERSIONS.EPISODE_LEVEL) {
    return false
  }

  // Check if any items are season-level format
  const hasSeasonLevelItems = currentProgress.some(item => item.match(/_s\d+$/))

  return hasSeasonLevelItems
}

/**
 * Perform migration from season-level to episode-level progress.
 * Updates migration state and returns result.
 */
export const performMigration = (currentProgress: string[]): MigrationResult => {
  const migrationState = getMigrationState()
  const timestamp = new Date().toISOString()

  // Perform the actual migration
  const result = migrateSeasonToEpisodeProgress(currentProgress)

  if (result.success) {
    // Update migration state
    const newState: MigrationState = {
      currentVersion: MIGRATION_VERSIONS.EPISODE_LEVEL,
      lastMigrated: timestamp,
      backupData: result.backupData,
      migrationHistory: [
        ...migrationState.migrationHistory,
        {
          from: migrationState.currentVersion,
          to: MIGRATION_VERSIONS.EPISODE_LEVEL,
          timestamp,
          itemCount: result.migratedItems.length,
        },
      ],
    }

    saveMigrationState(newState)
  } else {
    console.error('Migration failed:', result.errors)
  }

  return result
}

/**
 * Perform rollback from episode-level to season-level progress.
 * Updates migration state and returns result.
 */
export const performRollback = (currentProgress: string[]): MigrationResult => {
  const migrationState = getMigrationState()
  const timestamp = new Date().toISOString()

  // Perform the actual rollback
  const result = rollbackEpisodeToSeasonProgress(currentProgress)

  if (result.success) {
    // Update migration state
    const newState: MigrationState = {
      currentVersion: MIGRATION_VERSIONS.SEASON_LEVEL,
      lastMigrated: timestamp,
      backupData: result.backupData,
      migrationHistory: [
        ...migrationState.migrationHistory,
        {
          from: migrationState.currentVersion,
          to: MIGRATION_VERSIONS.SEASON_LEVEL,
          timestamp,
          itemCount: result.migratedItems.length,
        },
      ],
    }

    saveMigrationState(newState)
  } else {
    console.error('Rollback failed:', result.errors)
  }

  return result
}
