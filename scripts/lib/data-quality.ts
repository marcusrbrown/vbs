/**
 * Data quality validation and scoring utilities for Star Trek data generation.
 * Provides comprehensive quality assessment, validation, and reporting for generated data.
 *
 * Key capabilities:
 * - Quality scoring algorithms (TASK-026)
 * - Episode ID validation and auto-generation (TASK-027)
 * - Duplicate detection and conflict resolution (TASK-028)
 * - Completeness validation (TASK-029)
 * - Chronology validation (TASK-030)
 * - Cross-reference validation (TASK-031)
 * - Data diff utilities (TASK-032)
 * - Formatting validation (TASK-033)
 * - Metadata provenance tracking (TASK-034)
 * - Quality report generation (TASK-035)
 *
 * Integrates with existing validation infrastructure from metadata-validation.ts
 * and metadata-quality.ts while providing script-specific data generation validation.
 */

import type {QualityGrade} from '../../src/modules/metadata-quality.js'
import {isValidEpisodeId} from './data-validation.js'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Normalized episode item structure from generated data.
 */
export interface NormalizedEpisodeItem {
  id: string
  title: string
  season: number
  episode: number
  airDate: string
  stardate: string
  synopsis: string
  plotPoints?: string[]
  guestStars?: string[]
  connections?: string[]
  productionCode?: string
  director?: string[]
  writer?: string[]
  memoryAlphaUrl?: string
  tmdbId?: number
  imdbId?: string
}

/**
 * Normalized season/series item structure.
 */
export interface NormalizedSeasonItem {
  id: string
  title: string
  type: string
  year: string
  stardate: string
  episodes?: number
  notes?: string
  episodeData?: NormalizedEpisodeItem[]
}

/**
 * Normalized movie item structure.
 */
export interface NormalizedMovieItem {
  id: string
  title: string
  type: string
  year: string
  stardate: string
  synopsis?: string
  notes?: string
  director?: string[]
  writer?: string[]
  cast?: string[]
  tmdbId?: number
  imdbId?: string
}

/**
 * Normalized era structure.
 */
export interface NormalizedEra {
  id: string
  title: string
  years: string
  stardates: string
  description: string
  items: (NormalizedSeasonItem | NormalizedMovieItem)[]
}

/**
 * Quality score breakdown for an individual item.
 */
export interface ItemQualityScore {
  itemId: string
  overallScore: number
  completeness: number
  hasRequiredFields: boolean
  missingFields: string[]
  qualityGrade: QualityGrade
  issues: string[]
  warnings: string[]
}

/**
 * Data quality report for entire generated dataset.
 */
export interface DataQualityReport {
  summary: {
    totalEras: number
    totalItems: number
    totalEpisodes: number
    averageQualityScore: number
    itemsAboveThreshold: number
    itemsBelowThreshold: number
    qualityThreshold: number
  }
  gradeDistribution: {
    excellent: number
    good: number
    acceptable: number
    poor: number
    insufficient: number
  }
  validation: {
    totalValidationIssues: number
    duplicateIds: string[]
    invalidEpisodeIds: string[]
    chronologyIssues: ChronologyIssue[]
    crossReferenceIssues: CrossReferenceIssue[]
    formattingIssues: FormattingIssue[]
  }
  completeness: {
    averageCompleteness: number
    fieldCoverage: Record<string, number>
    mostMissingFields: {field: string; missingCount: number}[]
  }
  provenance: {
    sourceDistribution: Record<string, number>
    sourceQualityScores: Record<string, number>
  }
  itemScores: ItemQualityScore[]
  generatedAt: string
}

/**
 * Chronology validation issue.
 */
export interface ChronologyIssue {
  itemId: string
  type: 'stardate-order' | 'year-order' | 'airdate-order'
  severity: 'error' | 'warning'
  message: string
  expectedValue?: string
  actualValue?: string
}

/**
 * Cross-reference validation issue.
 */
export interface CrossReferenceIssue {
  sourceItemId: string
  targetItemId: string
  type: 'missing-reference' | 'invalid-reference' | 'circular-reference'
  message: string
}

/**
 * Formatting validation issue.
 */
export interface FormattingIssue {
  itemId: string
  field: string
  issue: string
  severity: 'error' | 'warning'
}

/**
 * Data diff result comparing generated vs. existing data.
 */
export interface DataDiffResult {
  hasChanges: boolean
  summary: {
    erasAdded: number
    erasRemoved: number
    erasModified: number
    itemsAdded: number
    itemsRemoved: number
    itemsModified: number
    episodesAdded: number
    episodesRemoved: number
    episodesModified: number
  }
  eraChanges: EraChange[]
  itemChanges: ItemChange[]
  episodeChanges: EpisodeChange[]
}

/**
 * Era-level change record.
 */
export interface EraChange {
  eraId: string
  changeType: 'added' | 'removed' | 'modified'
  fieldsChanged?: string[]
  before?: Partial<NormalizedEra>
  after?: Partial<NormalizedEra>
}

/**
 * Item-level change record.
 */
export interface ItemChange {
  eraId: string
  itemId: string
  changeType: 'added' | 'removed' | 'modified'
  fieldsChanged?: string[]
  before?: Partial<NormalizedSeasonItem | NormalizedMovieItem>
  after?: Partial<NormalizedSeasonItem | NormalizedMovieItem>
}

/**
 * Episode-level change record.
 */
export interface EpisodeChange {
  seasonId: string
  episodeId: string
  changeType: 'added' | 'removed' | 'modified'
  fieldsChanged?: string[]
  before?: Partial<NormalizedEpisodeItem>
  after?: Partial<NormalizedEpisodeItem>
}

/**
 * Metadata provenance information.
 */
export interface MetadataProvenance {
  sources: string[]
  primarySource: string
  lastUpdated: string
  fetchedAt: string
  qualityScore: number
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Episode ID format pattern: series_s{season}_e{episode}
 * Examples: tos_s1_e01, tng_s3_e15, dis_s2_e04
 */
const EPISODE_ID_PATTERN = /^[a-z]+_s\d+_e\d+$/

/**
 * Season ID format pattern: series_s{season}
 * Examples: tos_s1, tng_s3, dis_s2
 */
const SEASON_ID_PATTERN = /^[a-z]+_s\d+$/

/**
 * Movie ID format pattern: short code
 * Examples: tmp, twok, st2009
 */
const MOVIE_ID_PATTERN = /^[a-z0-9]+$/

/**
 * Required fields for episode validation.
 */
const REQUIRED_EPISODE_FIELDS = [
  'id',
  'title',
  'season',
  'episode',
  'airDate',
  'stardate',
  'synopsis',
] as const

/**
 * Required fields for season/series validation.
 */
const REQUIRED_SEASON_FIELDS = ['id', 'title', 'type', 'year', 'stardate'] as const

/**
 * Required fields for movie validation.
 */
const REQUIRED_MOVIE_FIELDS = ['id', 'title', 'type', 'year', 'stardate'] as const

/**
 * Quality scoring weights for different aspects.
 */
const QUALITY_WEIGHTS = {
  completeness: 0.5,
  validity: 0.3,
  richness: 0.2,
} as const

/**
 * Minimum quality threshold (aligned with generate-star-trek-data.ts).
 */
export const MINIMUM_QUALITY_THRESHOLD = 0.6

// ============================================================================
// EPISODE ID VALIDATION (TASK-027)
// ============================================================================

/**
 * Validate episode ID format: series_s{season}_e{episode}
 */
export const validateEpisodeId = (episodeId: string): boolean => {
  return isValidEpisodeId(episodeId) && EPISODE_ID_PATTERN.test(episodeId)
}

/**
 * Series code mapping for known Star Trek series.
 * Maps normalized series names to their standard abbreviations.
 */
export const SERIES_CODE_MAP: Record<string, string> = {
  'the original series': 'tos',
  'the animated series': 'tas',
  'the next generation': 'tng',
  'deep space nine': 'ds9',
  voyager: 'voy',
  enterprise: 'ent',
  discovery: 'dis',
  picard: 'pic',
  'lower decks': 'ld',
  prodigy: 'pro',
  'strange new worlds': 'snw',
}

/**
 * Generate episode ID from series name, season, and episode numbers.
 * Uses mapping table for known series, falls back to first 3 characters for unknown series.
 *
 * @param seriesName - Full series name (e.g., "Star Trek: The Next Generation")
 * @param season - Season number
 * @param episode - Episode number
 * @returns Generated episode ID (e.g., "tng_s3_e15")
 */
export const generateEpisodeId = (seriesName: string, season: number, episode: number): string => {
  const normalized = seriesName
    .toLowerCase()
    .replace(/^star trek:?\s*/i, '')
    .trim()

  const seriesCode = SERIES_CODE_MAP[normalized] ?? normalized.replaceAll(/\s+/g, '').slice(0, 3)

  return `${seriesCode}_s${season}_e${String(episode).padStart(2, '0')}`
}

/**
 * Generate series code from series name for ID generation.
 * Maps known series names to short codes, falls back to first 3 characters.
 *
 * @param seriesName - Full series name (e.g., "Star Trek: The Next Generation")
 * @returns Series code (e.g., "tng")
 */
export const generateSeriesCode = (seriesName: string): string => {
  const normalized = seriesName
    .toLowerCase()
    .replace(/^star trek:?\s*/i, '')
    .trim()

  return SERIES_CODE_MAP[normalized] ?? normalized.replaceAll(/\s+/g, '').slice(0, 3)
}

/**
 * Validate season ID format: series_s{season}
 */
export const validateSeasonId = (seasonId: string): boolean => {
  return SEASON_ID_PATTERN.test(seasonId)
}

/**
 * Validate movie ID format: short alphanumeric code.
 */
export const validateMovieId = (movieId: string): boolean => {
  return MOVIE_ID_PATTERN.test(movieId) && movieId.length > 0 && movieId.length <= 10
}

/**
 * Extract series code from episode ID.
 *
 * @param episodeId - Episode ID (e.g., "tng_s3_e15")
 * @returns Series code (e.g., "tng")
 */
export const extractSeriesCode = (episodeId: string): string | null => {
  const match = episodeId.match(/^([a-z]+)_s\d+_e\d+$/)
  return match?.[1] ?? null
}

/**
 * Extract season number from episode ID.
 *
 * @param episodeId - Episode ID (e.g., "tng_s3_e15")
 * @returns Season number (e.g., 3)
 */
export const extractSeasonNumber = (episodeId: string): number | null => {
  const match = episodeId.match(/^[a-z]+_s(\d+)_e\d+$/)
  return match?.[1] ? Number.parseInt(match[1], 10) : null
}

/**
 * Extract episode number from episode ID.
 *
 * @param episodeId - Episode ID (e.g., "tng_s3_e15")
 * @returns Episode number (e.g., 15)
 */
export const extractEpisodeNumber = (episodeId: string): number | null => {
  const match = episodeId.match(/^[a-z]+_s\d+_e(\d+)$/)
  return match?.[1] ? Number.parseInt(match[1], 10) : null
}

// ============================================================================
// DUPLICATE DETECTION (TASK-028)
// ============================================================================

/**
 * Detect duplicate IDs across all eras and items.
 *
 * @param eras - Array of normalized eras
 * @returns Array of duplicate IDs found
 */
export const detectDuplicateIds = (eras: NormalizedEra[]): string[] => {
  const seenIds = new Set<string>()
  const duplicates = new Set<string>()

  for (const era of eras) {
    for (const item of era.items) {
      if (seenIds.has(item.id)) {
        duplicates.add(item.id)
      }
      seenIds.add(item.id)

      if ('episodeData' in item && item.episodeData) {
        for (const episode of item.episodeData) {
          if (seenIds.has(episode.id)) {
            duplicates.add(episode.id)
          }
          seenIds.add(episode.id)
        }
      }
    }
  }

  return [...duplicates].sort()
}

/**
 * Detect duplicate episodes across different seasons (possible data conflicts).
 *
 * @param eras - Array of normalized eras
 * @returns Array of {episodeId, locations} where episodes appear multiple times
 */
export const detectDuplicateEpisodes = (
  eras: NormalizedEra[],
): {episodeId: string; locations: string[]}[] => {
  const episodeLocations = new Map<string, string[]>()

  for (const era of eras) {
    for (const item of era.items) {
      if ('episodeData' in item && item.episodeData) {
        for (const episode of item.episodeData) {
          const locations = episodeLocations.get(episode.id) ?? []
          locations.push(`${era.id}/${item.id}`)
          episodeLocations.set(episode.id, locations)
        }
      }
    }
  }

  const duplicates: {episodeId: string; locations: string[]}[] = []
  for (const [episodeId, locations] of episodeLocations.entries()) {
    if (locations.length > 1) {
      duplicates.push({episodeId, locations})
    }
  }

  return duplicates.sort((a, b) => a.episodeId.localeCompare(b.episodeId))
}

// ============================================================================
// COMPLETENESS CHECKS (TASK-029)
// ============================================================================

/**
 * Check if episode has all required fields populated.
 *
 * @param episode - Episode to validate
 * @returns Object with validation result and missing fields
 */
export const checkEpisodeCompleteness = (
  episode: NormalizedEpisodeItem,
): {isComplete: boolean; missingFields: string[]} => {
  const missingFields: string[] = []

  for (const field of REQUIRED_EPISODE_FIELDS) {
    const value = episode[field]
    if (value === undefined || value === null || value === '') {
      missingFields.push(field)
    }
  }

  return {
    isComplete: missingFields.length === 0,
    missingFields,
  }
}

/**
 * Check if season/series item has all required fields populated.
 *
 * @param item - Season/series item to validate
 * @returns Object with validation result and missing fields
 */
export const checkSeasonCompleteness = (
  item: NormalizedSeasonItem,
): {isComplete: boolean; missingFields: string[]} => {
  const missingFields: string[] = []

  for (const field of REQUIRED_SEASON_FIELDS) {
    const value = item[field]
    if (value === undefined || value === null || value === '') {
      missingFields.push(field)
    }
  }

  return {
    isComplete: missingFields.length === 0,
    missingFields,
  }
}

/**
 * Check if movie has all required fields populated.
 *
 * @param item - Movie item to validate
 * @returns Object with validation result and missing fields
 */
export const checkMovieCompleteness = (
  item: NormalizedMovieItem,
): {isComplete: boolean; missingFields: string[]} => {
  const missingFields: string[] = []

  for (const field of REQUIRED_MOVIE_FIELDS) {
    const value = item[field]
    if (value === undefined || value === null || value === '') {
      missingFields.push(field)
    }
  }

  return {
    isComplete: missingFields.length === 0,
    missingFields,
  }
}

/**
 * Calculate completeness score for an item (0-1 scale).
 * Considers both required and optional fields with different weights.
 *
 * @param item - Item to score
 * @returns Completeness score from 0 to 1
 */
export const calculateCompletenessScore = (
  item: NormalizedEpisodeItem | NormalizedSeasonItem | NormalizedMovieItem,
): number => {
  const requiredFields =
    'episode' in item
      ? REQUIRED_EPISODE_FIELDS
      : 'episodes' in item
        ? REQUIRED_SEASON_FIELDS
        : REQUIRED_MOVIE_FIELDS

  const optionalFields = ['notes', 'synopsis', 'director', 'writer', 'memoryAlphaUrl', 'tmdbId']

  let requiredScore = 0
  let optionalScore = 0

  for (const field of requiredFields) {
    const value = item[field as keyof typeof item]
    if (value !== undefined && value !== null && value !== '') {
      requiredScore += 1
    }
  }

  for (const field of optionalFields) {
    const value = item[field as keyof typeof item]
    if (value !== undefined && value !== null && value !== '') {
      optionalScore += 1
    }
  }

  const requiredWeight = 0.7
  const optionalWeight = 0.3

  const normalizedRequired = requiredScore / requiredFields.length
  const normalizedOptional = optionalScore / optionalFields.length

  return normalizedRequired * requiredWeight + normalizedOptional * optionalWeight
}

// ============================================================================
// CHRONOLOGY VALIDATION (TASK-030)
// ============================================================================

/**
 * Validate stardate ordering within an era.
 * Stardates should generally increase chronologically.
 *
 * @param items - Array of items within an era
 * @returns Array of chronology issues found
 */
export const validateStardateOrdering = (
  items: (NormalizedSeasonItem | NormalizedMovieItem)[],
): ChronologyIssue[] => {
  const issues: ChronologyIssue[] = []
  let previousStardate: number | null = null

  for (const item of items) {
    const stardate = extractNumericStardate(item.stardate)

    if (stardate !== null && previousStardate !== null && stardate < previousStardate) {
      issues.push({
        itemId: item.id,
        type: 'stardate-order',
        severity: 'warning',
        message: `Stardate ${item.stardate} is earlier than previous item's stardate`,
        expectedValue: `>= ${previousStardate}`,
        actualValue: String(stardate),
      })
    }

    if (stardate !== null) {
      previousStardate = stardate
    }
  }

  return issues
}

/**
 * Validate year ordering within an era.
 * Years should generally increase chronologically.
 *
 * @param items - Array of items within an era
 * @returns Array of chronology issues found
 */
export const validateYearOrdering = (
  items: (NormalizedSeasonItem | NormalizedMovieItem)[],
): ChronologyIssue[] => {
  const issues: ChronologyIssue[] = []
  let previousYear: number | null = null

  for (const item of items) {
    const year = extractNumericYear(item.year)

    if (year !== null && previousYear !== null && year < previousYear) {
      issues.push({
        itemId: item.id,
        type: 'year-order',
        severity: 'warning',
        message: `Year ${item.year} is earlier than previous item's year`,
        expectedValue: `>= ${previousYear}`,
        actualValue: String(year),
      })
    }

    if (year !== null) {
      previousYear = year
    }
  }

  return issues
}

/**
 * Validate episode air date ordering within a season.
 * Episodes should be ordered by their air dates.
 *
 * @param episodes - Array of episodes within a season
 * @returns Array of chronology issues found
 */
export const validateAirDateOrdering = (episodes: NormalizedEpisodeItem[]): ChronologyIssue[] => {
  const issues: ChronologyIssue[] = []
  let previousDate: Date | null = null

  for (const episode of episodes) {
    const airDate = new Date(episode.airDate)

    if (
      !Number.isNaN(airDate.getTime()) &&
      previousDate !== null &&
      airDate < previousDate &&
      !Number.isNaN(previousDate.getTime())
    ) {
      issues.push({
        itemId: episode.id,
        type: 'airdate-order',
        severity: 'warning',
        message: `Air date ${episode.airDate} is earlier than previous episode`,
        expectedValue: `>= ${previousDate.toISOString().split('T')[0]}`,
        actualValue: episode.airDate,
      })
    }

    if (!Number.isNaN(airDate.getTime())) {
      previousDate = airDate
    }
  }

  return issues
}

/**
 * Extract numeric stardate from stardate string for comparison.
 * Handles various formats: "4xxxx", "~1.1-1.26", "Stardate 7410.2", etc.
 *
 * @param stardateString - Stardate string from item
 * @returns Numeric stardate or null if cannot be parsed
 */
const extractNumericStardate = (stardateString: string): number | null => {
  if (stardateString === 'None' || stardateString === 'TBD') {
    return null
  }

  const match = stardateString.match(/(\d+\.?\d*)/) ?? stardateString.match(/~(\d+)\.(\d+)/)
  if (!match?.[1]) {
    return null
  }

  return Number.parseFloat(match[1])
}

/**
 * Extract numeric year from year string for comparison.
 * Handles formats: "2151", "2364–2379", "TBD", etc.
 *
 * @param yearString - Year string from item
 * @returns Numeric year or null if cannot be parsed
 */
const extractNumericYear = (yearString: string): number | null => {
  if (yearString === 'TBD' || yearString === 'None') {
    return null
  }

  const match = yearString.match(/(\d{4})/)
  if (!match?.[1]) {
    return null
  }

  return Number.parseInt(match[1], 10)
}

// ============================================================================
// CROSS-REFERENCE VALIDATION (TASK-031)
// ============================================================================

/**
 * Validate cross-references between episodes (connections field).
 * Ensures referenced episode IDs actually exist in the dataset.
 *
 * @param eras - Array of normalized eras
 * @returns Array of cross-reference issues found
 */
export const validateCrossReferences = (eras: NormalizedEra[]): CrossReferenceIssue[] => {
  const issues: CrossReferenceIssue[] = []
  const allEpisodeIds = new Set<string>()

  for (const era of eras) {
    for (const item of era.items) {
      if ('episodeData' in item && item.episodeData) {
        for (const episode of item.episodeData) {
          allEpisodeIds.add(episode.id)
        }
      }
    }
  }

  for (const era of eras) {
    for (const item of era.items) {
      if ('episodeData' in item && item.episodeData) {
        for (const episode of item.episodeData) {
          if (episode.connections && episode.connections.length > 0) {
            for (const connectionId of episode.connections) {
              if (!allEpisodeIds.has(connectionId)) {
                issues.push({
                  sourceItemId: episode.id,
                  targetItemId: connectionId,
                  type: 'missing-reference',
                  message: `Episode ${episode.id} references non-existent episode ${connectionId}`,
                })
              }
            }

            const circularRef = episode.connections.find(id => id === episode.id)
            if (circularRef) {
              issues.push({
                sourceItemId: episode.id,
                targetItemId: circularRef,
                type: 'circular-reference',
                message: `Episode ${episode.id} references itself`,
              })
            }
          }
        }
      }
    }
  }

  return issues
}

// ============================================================================
// DATA DIFF UTILITY (TASK-032)
// ============================================================================

/**
 * Compare two datasets and generate a diff report.
 * Identifies added, removed, and modified eras, items, and episodes.
 *
 * @param existingData - Current data (from star-trek-data.ts)
 * @param newData - Newly generated data
 * @returns Comprehensive diff result
 */
export const generateDataDiff = (
  existingData: NormalizedEra[],
  newData: NormalizedEra[],
): DataDiffResult => {
  const eraChanges: EraChange[] = []
  const itemChanges: ItemChange[] = []
  const episodeChanges: EpisodeChange[] = []

  const existingEraMap = new Map(existingData.map(era => [era.id, era]))
  const newEraMap = new Map(newData.map(era => [era.id, era]))

  for (const newEra of newData) {
    const existingEra = existingEraMap.get(newEra.id)

    if (!existingEra) {
      eraChanges.push({
        eraId: newEra.id,
        changeType: 'added',
        after: newEra,
      })
      continue
    }

    const eraFieldChanges = compareObjects(existingEra, newEra, ['items'])
    if (eraFieldChanges.length > 0) {
      eraChanges.push({
        eraId: newEra.id,
        changeType: 'modified',
        fieldsChanged: eraFieldChanges,
        before: existingEra,
        after: newEra,
      })
    }

    const {itemChanges: eraItemChanges, episodeChanges: eraEpisodeChanges} = compareEraItems(
      newEra.id,
      existingEra.items,
      newEra.items,
    )
    itemChanges.push(...eraItemChanges)
    episodeChanges.push(...eraEpisodeChanges)
  }

  for (const existingEra of existingData) {
    if (!newEraMap.has(existingEra.id)) {
      eraChanges.push({
        eraId: existingEra.id,
        changeType: 'removed',
        before: existingEra,
      })
    }
  }

  const summary = {
    erasAdded: eraChanges.filter(c => c.changeType === 'added').length,
    erasRemoved: eraChanges.filter(c => c.changeType === 'removed').length,
    erasModified: eraChanges.filter(c => c.changeType === 'modified').length,
    itemsAdded: itemChanges.filter(c => c.changeType === 'added').length,
    itemsRemoved: itemChanges.filter(c => c.changeType === 'removed').length,
    itemsModified: itemChanges.filter(c => c.changeType === 'modified').length,
    episodesAdded: episodeChanges.filter(c => c.changeType === 'added').length,
    episodesRemoved: episodeChanges.filter(c => c.changeType === 'removed').length,
    episodesModified: episodeChanges.filter(c => c.changeType === 'modified').length,
  }

  return {
    hasChanges:
      summary.erasAdded +
        summary.erasRemoved +
        summary.erasModified +
        summary.itemsAdded +
        summary.itemsRemoved +
        summary.itemsModified +
        summary.episodesAdded +
        summary.episodesRemoved +
        summary.episodesModified >
      0,
    summary,
    eraChanges,
    itemChanges,
    episodeChanges,
  }
}

/**
 * Compare items within an era.
 */
const compareEraItems = (
  eraId: string,
  existingItems: (NormalizedSeasonItem | NormalizedMovieItem)[],
  newItems: (NormalizedSeasonItem | NormalizedMovieItem)[],
): {itemChanges: ItemChange[]; episodeChanges: EpisodeChange[]} => {
  const itemChanges: ItemChange[] = []
  const episodeChanges: EpisodeChange[] = []

  const existingItemMap = new Map(existingItems.map(item => [item.id, item]))
  const newItemMap = new Map(newItems.map(item => [item.id, item]))

  for (const newItem of newItems) {
    const existingItem = existingItemMap.get(newItem.id)

    if (!existingItem) {
      itemChanges.push({
        eraId,
        itemId: newItem.id,
        changeType: 'added',
        after: newItem,
      })
      continue
    }

    const itemFieldChanges = compareObjects(existingItem, newItem, ['episodeData'])
    if (itemFieldChanges.length > 0) {
      itemChanges.push({
        eraId,
        itemId: newItem.id,
        changeType: 'modified',
        fieldsChanged: itemFieldChanges,
        before: existingItem,
        after: newItem,
      })
    }

    if ('episodeData' in newItem && 'episodeData' in existingItem) {
      const newEpisodeChanges = compareEpisodes(
        newItem.id,
        existingItem.episodeData ?? [],
        newItem.episodeData ?? [],
      )
      episodeChanges.push(...newEpisodeChanges)
    }
  }

  for (const existingItem of existingItems) {
    if (!newItemMap.has(existingItem.id)) {
      itemChanges.push({
        eraId,
        itemId: existingItem.id,
        changeType: 'removed',
        before: existingItem,
      })
    }
  }

  return {itemChanges, episodeChanges}
}

/**
 * Compare episodes within a season.
 */
const compareEpisodes = (
  seasonId: string,
  existingEpisodes: NormalizedEpisodeItem[],
  newEpisodes: NormalizedEpisodeItem[],
): EpisodeChange[] => {
  const changes: EpisodeChange[] = []

  const existingEpisodeMap = new Map(existingEpisodes.map(ep => [ep.id, ep]))
  const newEpisodeMap = new Map(newEpisodes.map(ep => [ep.id, ep]))

  for (const newEpisode of newEpisodes) {
    const existingEpisode = existingEpisodeMap.get(newEpisode.id)

    if (!existingEpisode) {
      changes.push({
        seasonId,
        episodeId: newEpisode.id,
        changeType: 'added',
        after: newEpisode,
      })
      continue
    }

    const episodeFieldChanges = compareObjects(existingEpisode, newEpisode)
    if (episodeFieldChanges.length > 0) {
      changes.push({
        seasonId,
        episodeId: newEpisode.id,
        changeType: 'modified',
        fieldsChanged: episodeFieldChanges,
        before: existingEpisode,
        after: newEpisode,
      })
    }
  }

  for (const existingEpisode of existingEpisodes) {
    if (!newEpisodeMap.has(existingEpisode.id)) {
      changes.push({
        seasonId,
        episodeId: existingEpisode.id,
        changeType: 'removed',
        before: existingEpisode,
      })
    }
  }

  return changes
}

/**
 * Compare two objects field-by-field, returning list of changed fields.
 *
 * @param objA - First object
 * @param objB - Second object
 * @param excludeFields - Fields to exclude from comparison
 * @returns Array of field names that differ
 */
const compareObjects = (objA: object, objB: object, excludeFields: string[] = []): string[] => {
  const changedFields: string[] = []
  const allKeys = new Set([...Object.keys(objA), ...Object.keys(objB)])

  for (const key of allKeys) {
    if (excludeFields.includes(key)) {
      continue
    }

    const valueA = (objA as Record<string, unknown>)[key]
    const valueB = (objB as Record<string, unknown>)[key]

    if (JSON.stringify(valueA) !== JSON.stringify(valueB)) {
      changedFields.push(key)
    }
  }

  return changedFields
}

// ============================================================================
// FORMATTING VALIDATION (TASK-033)
// ============================================================================

/**
 * Validate that generated code can be parsed as valid TypeScript.
 * Checks for syntax errors and common formatting issues.
 *
 * @param generatedCode - TypeScript code to validate
 * @returns Array of formatting issues found
 */
export const validateFormatting = (generatedCode: string): FormattingIssue[] => {
  const issues: FormattingIssue[] = []

  if (!generatedCode.includes('export const starTrekData')) {
    issues.push({
      itemId: 'global',
      field: 'export',
      issue: 'Missing required export statement',
      severity: 'error',
    })
  }

  if (!generatedCode.trim().endsWith(']')) {
    issues.push({
      itemId: 'global',
      field: 'structure',
      issue: 'Generated code does not end with closing bracket',
      severity: 'error',
    })
  }

  // Check for obvious syntax errors (unbalanced quotes, brackets)
  // Note: This is a basic check - proper validation requires TypeScript compilation
  const openBrackets = (generatedCode.match(/\[/g) || []).length
  const closeBrackets = (generatedCode.match(/\]/g) || []).length
  if (openBrackets !== closeBrackets) {
    issues.push({
      itemId: 'global',
      field: 'brackets',
      issue: 'Unbalanced square brackets detected',
      severity: 'error',
    })
  }

  const lineCount = generatedCode.split('\n').length
  if (lineCount > 20_000) {
    issues.push({
      itemId: 'global',
      field: 'size',
      issue: `Generated file is very large (${lineCount} lines)`,
      severity: 'warning',
    })
  }

  return issues
}

/**
 * Validate that IDs follow naming conventions and are TypeScript-safe.
 *
 * @param id - ID to validate
 * @param idType - Type of ID (episode, season, movie, era)
 * @returns Formatting issue if invalid, null otherwise
 */
export const validateIdFormat = (
  id: string,
  idType: 'episode' | 'season' | 'movie' | 'era',
): FormattingIssue | null => {
  if (/[^a-z0-9_]/.test(id)) {
    return {
      itemId: id,
      field: 'id',
      issue: `${idType} ID contains invalid characters (only lowercase letters, numbers, underscores allowed)`,
      severity: 'error',
    }
  }

  if (id.includes('__')) {
    return {
      itemId: id,
      field: 'id',
      issue: `${idType} ID contains consecutive underscores`,
      severity: 'warning',
    }
  }

  if (id.startsWith('_') || id.endsWith('_')) {
    return {
      itemId: id,
      field: 'id',
      issue: `${idType} ID starts or ends with underscore`,
      severity: 'warning',
    }
  }

  return null
}

// ============================================================================
// METADATA PROVENANCE TRACKING (TASK-034)
// ============================================================================

/**
 * Generate provenance comment for an item.
 * Documents which source provided the data and when it was last updated.
 *
 * @param provenance - Provenance information
 * @returns Comment string for code generation
 */
export const generateProvenanceComment = (provenance: MetadataProvenance): string => {
  const sourceList = provenance.sources.join(', ')
  const lines = [
    `// Source: ${provenance.primarySource}`,
    `// Additional sources: ${sourceList}`,
    `// Last updated: ${provenance.lastUpdated}`,
    `// Quality score: ${(provenance.qualityScore * 100).toFixed(1)}%`,
  ]
  return lines.join('\n')
}

/**
 * Parse provenance information from existing code comments.
 *
 * @param codeBlock - Code block containing provenance comments
 * @returns Parsed provenance information or null if not found
 */
export const parseProvenanceComment = (codeBlock: string): MetadataProvenance | null => {
  const sourceMatch = codeBlock.match(/\/\/ Source: (.+)/)
  const additionalMatch = codeBlock.match(/\/\/ Additional sources: (.+)/)
  const updatedMatch = codeBlock.match(/\/\/ Last updated: (.+)/)
  const qualityMatch = codeBlock.match(/\/\/ Quality score: ([\d.]+)%/)

  if (!sourceMatch?.[1] || !updatedMatch?.[1]) {
    return null
  }

  const additionalSources = additionalMatch?.[1]?.split(', ').filter(s => s.trim()) ?? []

  return {
    primarySource: sourceMatch[1],
    sources: [sourceMatch[1], ...additionalSources],
    lastUpdated: updatedMatch[1],
    fetchedAt: updatedMatch[1],
    qualityScore: qualityMatch?.[1] ? Number.parseFloat(qualityMatch[1]) / 100 : 0,
  }
}

// ============================================================================
// QUALITY REPORT GENERATION (TASK-035)
// ============================================================================

/**
 * Calculate quality score for an individual item.
 *
 * @param item - Item to score
 * @returns Quality score breakdown
 */
export const calculateItemQualityScore = (
  item: NormalizedEpisodeItem | NormalizedSeasonItem | NormalizedMovieItem,
): ItemQualityScore => {
  const completenessScore = calculateCompletenessScore(item)
  const completeness = checkEpisodeCompleteness(item as NormalizedEpisodeItem)

  const validityScore = calculateValidityScore(item)
  const richnessScore = calculateRichnessScore(item)

  const overallScore =
    completenessScore * QUALITY_WEIGHTS.completeness +
    validityScore * QUALITY_WEIGHTS.validity +
    richnessScore * QUALITY_WEIGHTS.richness

  const qualityGrade = determineQualityGrade(overallScore)

  const issues: string[] = []
  const warnings: string[] = []

  if (item.id && !validateEpisodeId(item.id) && 'episode' in item) {
    issues.push(`Invalid episode ID format: ${item.id}`)
  }

  if (completeness.missingFields.length > 0) {
    warnings.push(`Missing required fields: ${completeness.missingFields.join(', ')}`)
  }

  return {
    itemId: item.id,
    overallScore,
    completeness: completenessScore,
    hasRequiredFields: completeness.isComplete,
    missingFields: completeness.missingFields,
    qualityGrade,
    issues,
    warnings,
  }
}

/**
 * Calculate validity score based on ID format and field structure.
 */
const calculateValidityScore = (
  item: NormalizedEpisodeItem | NormalizedSeasonItem | NormalizedMovieItem,
): number => {
  let validityScore = 1

  if ('episode' in item && !validateEpisodeId(item.id)) {
    validityScore -= 0.3
  }

  if ('airDate' in item) {
    const airDate = new Date(item.airDate)
    if (Number.isNaN(airDate.getTime())) {
      validityScore -= 0.2
    }
  }

  if ('synopsis' in item && typeof item.synopsis === 'string') {
    // Empty synopsis is a critical issue
    if (item.synopsis.length === 0) {
      validityScore -= 0.5
    }
    // Short synopsis (< 20 chars) is also problematic
    else if (item.synopsis.length < 20) {
      validityScore -= 0.2
    }
  }

  return Math.max(0, validityScore)
}

/**
 * Calculate richness score based on optional field population.
 */
const calculateRichnessScore = (
  item: NormalizedEpisodeItem | NormalizedSeasonItem | NormalizedMovieItem,
): number => {
  const richFields = [
    'plotPoints',
    'guestStars',
    'director',
    'writer',
    'productionCode',
    'memoryAlphaUrl',
    'tmdbId',
  ]

  let presentCount = 0
  for (const field of richFields) {
    const value = item[field as keyof typeof item]
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        if (value.length > 0) {
          presentCount += 1
        }
      } else {
        presentCount += 1
      }
    }
  }

  return presentCount / richFields.length
}

/**
 * Determine quality grade from score.
 */
const determineQualityGrade = (score: number): QualityGrade => {
  if (score >= 0.9) return 'excellent'
  if (score >= 0.75) return 'good'
  if (score >= 0.6) return 'acceptable'
  if (score >= 0.4) return 'poor'
  return 'insufficient'
}

/**
 * Generate comprehensive data quality report for entire dataset.
 *
 * @param eras - Array of normalized eras
 * @param qualityThreshold - Minimum acceptable quality score (default: 0.6)
 * @returns Comprehensive quality report
 */
export const generateQualityReport = (
  eras: NormalizedEra[],
  qualityThreshold: number = MINIMUM_QUALITY_THRESHOLD,
): DataQualityReport => {
  const itemScores: ItemQualityScore[] = []
  const fieldCoverageMap = new Map<string, number>()

  for (const era of eras) {
    for (const item of era.items) {
      const itemScore = calculateItemQualityScore(item)
      itemScores.push(itemScore)

      const allFields = Object.keys(item)
      for (const field of allFields) {
        const value = item[field as keyof typeof item]
        const isPopulated = value !== undefined && value !== null && value !== ''
        const currentCount = fieldCoverageMap.get(field) ?? 0
        if (isPopulated) {
          fieldCoverageMap.set(field, currentCount + 1)
        }
      }

      if ('episodeData' in item && item.episodeData) {
        for (const episode of item.episodeData) {
          const episodeScore = calculateItemQualityScore(episode)
          itemScores.push(episodeScore)

          const episodeFields = Object.keys(episode)
          for (const field of episodeFields) {
            const value = episode[field as keyof typeof episode]
            const isPopulated = value !== undefined && value !== null && value !== ''
            const currentCount = fieldCoverageMap.get(field) ?? 0
            if (isPopulated) {
              fieldCoverageMap.set(field, currentCount + 1)
            }
          }
        }
      }
    }
  }

  const totalEpisodes = itemScores.filter(s => s.itemId.includes('_e')).length
  const averageQualityScore =
    itemScores.reduce((sum, s) => sum + s.overallScore, 0) / itemScores.length || 0
  const itemsAboveThreshold = itemScores.filter(s => s.overallScore >= qualityThreshold).length
  const itemsBelowThreshold = itemScores.length - itemsAboveThreshold

  const gradeDistribution = {
    excellent: itemScores.filter(s => s.qualityGrade === 'excellent').length,
    good: itemScores.filter(s => s.qualityGrade === 'good').length,
    acceptable: itemScores.filter(s => s.qualityGrade === 'acceptable').length,
    poor: itemScores.filter(s => s.qualityGrade === 'poor').length,
    insufficient: itemScores.filter(s => s.qualityGrade === 'insufficient').length,
  }

  const duplicateIds = detectDuplicateIds(eras)
  const invalidEpisodeIds = itemScores
    .filter(s => s.issues.some(i => i.includes('Invalid episode ID')))
    .map(s => s.itemId)

  const chronologyIssues: ChronologyIssue[] = []
  for (const era of eras) {
    chronologyIssues.push(...validateStardateOrdering(era.items))
    chronologyIssues.push(...validateYearOrdering(era.items))

    for (const item of era.items) {
      if ('episodeData' in item && item.episodeData) {
        chronologyIssues.push(...validateAirDateOrdering(item.episodeData))
      }
    }
  }

  const crossReferenceIssues = validateCrossReferences(eras)

  const formattingIssues: FormattingIssue[] = []
  for (const era of eras) {
    const eraIdIssue = validateIdFormat(era.id, 'era')
    if (eraIdIssue) formattingIssues.push(eraIdIssue)

    for (const item of era.items) {
      const itemType = 'episodes' in item ? 'season' : 'movie'
      const itemIdIssue = validateIdFormat(item.id, itemType)
      if (itemIdIssue) formattingIssues.push(itemIdIssue)

      if ('episodeData' in item && item.episodeData) {
        for (const episode of item.episodeData) {
          const episodeIdIssue = validateIdFormat(episode.id, 'episode')
          if (episodeIdIssue) formattingIssues.push(episodeIdIssue)
        }
      }
    }
  }

  const fieldCoverage: Record<string, number> = {}
  for (const [field, count] of fieldCoverageMap.entries()) {
    fieldCoverage[field] = count
  }

  const missingFieldCounts = new Map<string, number>()
  for (const score of itemScores) {
    for (const field of score.missingFields) {
      missingFieldCounts.set(field, (missingFieldCounts.get(field) ?? 0) + 1)
    }
  }

  const mostMissingFields = [...missingFieldCounts.entries()]
    .map(([field, count]) => ({field, missingCount: count}))
    .sort((a, b) => b.missingCount - a.missingCount)
    .slice(0, 10)

  const averageCompleteness =
    itemScores.reduce((sum, s) => sum + s.completeness, 0) / itemScores.length || 0

  return {
    summary: {
      totalEras: eras.length,
      totalItems: eras.reduce((sum, era) => sum + era.items.length, 0),
      totalEpisodes,
      averageQualityScore,
      itemsAboveThreshold,
      itemsBelowThreshold,
      qualityThreshold,
    },
    gradeDistribution,
    validation: {
      totalValidationIssues:
        duplicateIds.length +
        invalidEpisodeIds.length +
        chronologyIssues.length +
        crossReferenceIssues.length +
        formattingIssues.length,
      duplicateIds,
      invalidEpisodeIds,
      chronologyIssues,
      crossReferenceIssues,
      formattingIssues,
    },
    completeness: {
      averageCompleteness,
      fieldCoverage,
      mostMissingFields,
    },
    provenance: {
      sourceDistribution: {},
      sourceQualityScores: {},
    },
    itemScores,
    generatedAt: new Date().toISOString(),
  }
}

/**
 * Format quality report as human-readable text.
 *
 * @param report - Quality report to format
 * @returns Formatted report string
 */
export const formatQualityReport = (report: DataQualityReport): string => {
  const lines: string[] = []

  lines.push('='.repeat(80))
  lines.push('DATA QUALITY REPORT')
  lines.push('='.repeat(80))
  lines.push('')

  lines.push('SUMMARY')
  lines.push('-'.repeat(80))
  lines.push(`Total Eras: ${report.summary.totalEras}`)
  lines.push(`Total Items: ${report.summary.totalItems}`)
  lines.push(`Total Episodes: ${report.summary.totalEpisodes}`)
  lines.push(`Average Quality Score: ${(report.summary.averageQualityScore * 100).toFixed(1)}%`)
  lines.push(`Items Above Threshold: ${report.summary.itemsAboveThreshold}`)
  lines.push(`Items Below Threshold: ${report.summary.itemsBelowThreshold}`)
  lines.push(`Quality Threshold: ${(report.summary.qualityThreshold * 100).toFixed(0)}%`)
  lines.push('')

  lines.push('QUALITY GRADE DISTRIBUTION')
  lines.push('-'.repeat(80))
  lines.push(`Excellent (≥90%): ${report.gradeDistribution.excellent}`)
  lines.push(`Good (75-89%): ${report.gradeDistribution.good}`)
  lines.push(`Acceptable (60-74%): ${report.gradeDistribution.acceptable}`)
  lines.push(`Poor (40-59%): ${report.gradeDistribution.poor}`)
  lines.push(`Insufficient (<40%): ${report.gradeDistribution.insufficient}`)
  lines.push('')

  lines.push('VALIDATION ISSUES')
  lines.push('-'.repeat(80))
  lines.push(`Total Issues: ${report.validation.totalValidationIssues}`)
  lines.push(`Duplicate IDs: ${report.validation.duplicateIds.length}`)
  lines.push(`Invalid Episode IDs: ${report.validation.invalidEpisodeIds.length}`)
  lines.push(`Chronology Issues: ${report.validation.chronologyIssues.length}`)
  lines.push(`Cross-Reference Issues: ${report.validation.crossReferenceIssues.length}`)
  lines.push(`Formatting Issues: ${report.validation.formattingIssues.length}`)
  lines.push('')

  if (report.validation.duplicateIds.length > 0) {
    lines.push('DUPLICATE IDS')
    lines.push('-'.repeat(80))
    for (const dupId of report.validation.duplicateIds.slice(0, 10)) {
      lines.push(`  - ${dupId}`)
    }
    if (report.validation.duplicateIds.length > 10) {
      lines.push(`  ... and ${report.validation.duplicateIds.length - 10} more`)
    }
    lines.push('')
  }

  lines.push('COMPLETENESS')
  lines.push('-'.repeat(80))
  lines.push(`Average Completeness: ${(report.completeness.averageCompleteness * 100).toFixed(1)}%`)
  lines.push('')
  lines.push('Most Missing Fields:')
  for (const {field, missingCount} of report.completeness.mostMissingFields.slice(0, 5)) {
    lines.push(`  - ${field}: ${missingCount} items`)
  }
  lines.push('')

  lines.push(`Generated at: ${report.generatedAt}`)
  lines.push('='.repeat(80))

  return lines.join('\n')
}
