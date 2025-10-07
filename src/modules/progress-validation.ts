import {isEpisode, type Episode, type EpisodeProgress, type SeasonProgress} from './types.js'

/**
 * Validation and error recovery utilities for episode progress data.
 * Ensures data integrity and provides graceful error handling for corrupted progress.
 */

/**
 * Validation result for progress data.
 */
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  recoveredData?: string[]
}

/**
 * Validate episode ID format and structure.
 */
export const isValidEpisodeId = (episodeId: string): boolean => {
  // Episode IDs should match pattern: series_s{season}_e{episode}
  // Examples: 'ent_s1_e01', 'tos_s2_e15', 'tng_s1_e26'
  return /^[a-z]+_s\d+_e\d+$/.test(episodeId)
}

/**
 * Validate season ID format and structure.
 */
export const isValidSeasonId = (seasonId: string): boolean => {
  // Season IDs should match pattern: series_s{season}
  // Examples: 'ent_s1', 'tos_s2', 'tng_s1'
  return /^[a-z]+_s\d+$/.test(seasonId)
}

/**
 * Validate series ID format and structure.
 */
export const isValidSeriesId = (seriesId: string): boolean => {
  // Series IDs should match pattern: series or series_s{season}
  // Examples: 'ent', 'tos', 'tng', 'ent_s1', 'tos_s2'
  return /^[a-z]+(?:_s\d+)?$/.test(seriesId)
}

/**
 * Validate and sanitize episode progress data.
 * Removes invalid entries and provides error reporting.
 */
export const validateEpisodeProgress = (episodeIds: string[]): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []
  const validEpisodes: string[] = []
  const duplicates = new Set<string>()

  for (const episodeId of episodeIds) {
    // Check for valid format
    if (!isValidEpisodeId(episodeId)) {
      errors.push(`Invalid episode ID format: ${episodeId}`)
      continue
    }

    // Check for duplicates
    if (duplicates.has(episodeId)) {
      warnings.push(`Duplicate episode ID found: ${episodeId}`)
      continue
    }

    duplicates.add(episodeId)
    validEpisodes.push(episodeId)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    recoveredData: validEpisodes,
  }
}

/**
 * Validate and sanitize season progress data.
 * Removes invalid entries and provides error reporting.
 */
export const validateSeasonProgress = (seasonIds: string[]): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []
  const validSeasons: string[] = []
  const duplicates = new Set<string>()

  for (const seasonId of seasonIds) {
    // Check for valid format
    if (!isValidSeasonId(seasonId) && !isValidSeriesId(seasonId)) {
      errors.push(`Invalid season ID format: ${seasonId}`)
      continue
    }

    // Check for duplicates
    if (duplicates.has(seasonId)) {
      warnings.push(`Duplicate season ID found: ${seasonId}`)
      continue
    }

    duplicates.add(seasonId)
    validSeasons.push(seasonId)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    recoveredData: validSeasons,
  }
}

/**
 * Validate EpisodeProgress object structure.
 */
export const isValidEpisodeProgress = (progress: unknown): progress is EpisodeProgress => {
  if (typeof progress !== 'object' || progress === null) {
    return false
  }

  const ep = progress as Record<string, unknown>

  return (
    typeof ep.episodeId === 'string' &&
    typeof ep.seriesId === 'string' &&
    typeof ep.season === 'number' &&
    typeof ep.episode === 'number' &&
    typeof ep.isWatched === 'boolean' &&
    isValidEpisodeId(ep.episodeId) &&
    isValidSeriesId(ep.seriesId) &&
    ep.season > 0 &&
    ep.episode > 0 &&
    (ep.watchedAt === undefined || typeof ep.watchedAt === 'string')
  )
}

/**
 * Validate SeasonProgress object structure.
 */
export const isValidSeasonProgress = (progress: unknown): progress is SeasonProgress => {
  if (typeof progress !== 'object' || progress === null) {
    return false
  }

  const sp = progress as Record<string, unknown>

  return (
    typeof sp.seriesId === 'string' &&
    typeof sp.season === 'number' &&
    typeof sp.totalEpisodes === 'number' &&
    typeof sp.watchedEpisodes === 'number' &&
    typeof sp.total === 'number' &&
    typeof sp.completed === 'number' &&
    typeof sp.percentage === 'number' &&
    Array.isArray(sp.episodeProgress) &&
    isValidSeriesId(sp.seriesId) &&
    sp.season > 0 &&
    sp.totalEpisodes >= 0 &&
    sp.watchedEpisodes >= 0 &&
    sp.watchedEpisodes <= sp.totalEpisodes &&
    sp.total === sp.totalEpisodes &&
    sp.completed === sp.watchedEpisodes &&
    sp.percentage >= 0 &&
    sp.percentage <= 100 &&
    (sp.episodeProgress as unknown[]).every(ep => isValidEpisodeProgress(ep))
  )
}

/**
 * Check if a string is a valid ISO date string.
 */
export const isValidDateString = (dateString: string): boolean => {
  // Check for YYYY-MM-DD format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false
  }

  const date = new Date(dateString)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(dateString)
}

/**
 * Validate Episode object structure.
 */
export const validateEpisodeData = (episode: unknown): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  if (!isEpisode(episode)) {
    errors.push('Invalid episode structure')
    return {
      isValid: false,
      errors,
      warnings,
    }
  }

  const ep: Episode = episode

  // Additional validation beyond type checking
  if (!isValidEpisodeId(ep.id)) {
    errors.push(`Invalid episode ID format: ${ep.id}`)
  }

  if (ep.season <= 0) {
    errors.push(`Invalid season number: ${ep.season}`)
  }

  if (ep.episode <= 0) {
    errors.push(`Invalid episode number: ${ep.episode}`)
  }

  if (ep.airDate && !isValidDateString(ep.airDate)) {
    warnings.push(`Invalid air date format: ${ep.airDate}`)
  }

  if (ep.plotPoints.length === 0) {
    warnings.push(`Episode ${ep.id} has no plot points`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Recover and sanitize corrupted progress data.
 * Attempts to salvage as much valid data as possible.
 */
export const recoverProgressData = (
  data: unknown,
): {
  episodeProgress: string[]
  seasonProgress: string[]
  errors: string[]
  warnings: string[]
} => {
  const errors: string[] = []
  const warnings: string[] = []
  let episodeProgress: string[] = []
  let seasonProgress: string[] = []

  try {
    // Handle different data formats
    if (Array.isArray(data)) {
      // Simple array of IDs
      const episodeValidation = validateEpisodeProgress(
        data.filter(item => typeof item === 'string'),
      )
      const seasonValidation = validateSeasonProgress(data.filter(item => typeof item === 'string'))

      if (episodeValidation.recoveredData) {
        episodeProgress = episodeValidation.recoveredData.filter(id => isValidEpisodeId(id))
      }
      if (seasonValidation.recoveredData) {
        seasonProgress = seasonValidation.recoveredData.filter(
          id => isValidSeasonId(id) || isValidSeriesId(id),
        )
      }

      errors.push(...episodeValidation.errors, ...seasonValidation.errors)
      warnings.push(...episodeValidation.warnings, ...seasonValidation.warnings)
    } else if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>

      // Enhanced progress data format
      if (Array.isArray(obj.episodeProgress)) {
        const validation = validateEpisodeProgress(
          obj.episodeProgress.filter(item => typeof item === 'string'),
        )
        if (validation.recoveredData) {
          episodeProgress = validation.recoveredData
        }
        errors.push(...validation.errors)
        warnings.push(...validation.warnings)
      }

      if (Array.isArray(obj.seasonProgress)) {
        const validation = validateSeasonProgress(
          obj.seasonProgress.filter(item => typeof item === 'string'),
        )
        if (validation.recoveredData) {
          seasonProgress = validation.recoveredData
        }
        errors.push(...validation.errors)
        warnings.push(...validation.warnings)
      }

      // Legacy progress format
      if (Array.isArray(obj.progress)) {
        const validation = validateSeasonProgress(
          obj.progress.filter(item => typeof item === 'string'),
        )
        if (validation.recoveredData) {
          seasonProgress = validation.recoveredData
        }
        errors.push(...validation.errors)
        warnings.push(...validation.warnings)
      }
    } else {
      errors.push('Invalid data format: expected array or object')
    }
  } catch (error) {
    errors.push(`Recovery failed: ${error}`)
  }

  return {
    episodeProgress,
    seasonProgress,
    errors,
    warnings,
  }
}
