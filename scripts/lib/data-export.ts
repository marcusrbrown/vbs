/**
 * Data export functionality for converting generated Star Trek data
 * to alternate formats (JSON, CSV) for external analysis and tooling.
 *
 * Supports two primary export formats:
 * - JSON: Structured hierarchical export with optional pretty-printing
 * - CSV: Flat tabular export with proper field escaping
 *
 * Two flattening strategies are available:
 * - Episode-level: One row per episode, with era and item context
 * - Item-level: One row per season/movie, with aggregated episode counts
 *
 * Key capabilities:
 * - Export normalized era data to JSON or CSV format (TASK-071)
 * - Flatten hierarchical era/item/episode data into tabular records
 * - Properly escape CSV fields containing commas, quotes, or newlines
 * - Track export metadata including record counts and file sizes
 *
 * Integrates with existing normalized data types from data-quality.ts.
 */

import type {
  NormalizedEpisodeItem,
  NormalizedEra,
  NormalizedMovieItem,
  NormalizedSeasonItem,
} from './data-quality.js'
import {mkdir, stat, writeFile} from 'node:fs/promises'
import {dirname} from 'node:path'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Supported export format identifiers. */
export type ExportFormat = 'json' | 'csv'

/** Configuration options for data export operations. */
export interface ExportOptions {
  /** Target export format. */
  format: ExportFormat
  /** Filesystem path for the exported file. */
  outputPath: string
  /** Whether to include episodeData in the export (default: true). */
  includeEpisodeDetails: boolean
  /** For CSV, flatten episodes into individual rows (default: false). */
  flattenEpisodes: boolean
  /** For JSON, pretty-print output with indentation (default: true). */
  prettyPrint: boolean
}

/** Metadata returned after a successful export operation. */
export interface ExportResult {
  /** The format used for the export. */
  format: ExportFormat
  /** Filesystem path where the export was written. */
  outputPath: string
  /** Number of top-level records exported. */
  recordCount: number
  /** Size of the exported file in bytes. */
  fileSize: number
  /** ISO 8601 timestamp of when the export completed. */
  exportedAt: string
}

/**
 * Flat episode-level record for CSV export and tabular analysis.
 * Each row represents a single episode (or a movie with empty episode fields).
 */
export interface FlatEpisodeRecord {
  /** Parent era identifier. */
  eraId: string
  /** Parent era display title. */
  eraTitle: string
  /** Parent item (season/movie) identifier. */
  itemId: string
  /** Parent item display title. */
  itemTitle: string
  /** Item type discriminator (e.g. 'season', 'movie'). */
  itemType: string
  /** Release year or year range. */
  year: string
  /** Episode identifier, or empty string for movies. */
  episodeId: string
  /** Episode title, or empty string for movies. */
  episodeTitle: string
  /** Season number, or 0 for movies. */
  season: number
  /** Episode number within the season, or 0 for movies. */
  episode: number
  /** Original air date in ISO format. */
  airDate: string
  /** In-universe stardate reference. */
  stardate: string
  /** Episode or movie synopsis. */
  synopsis: string
}

/**
 * Flat item-level record for CSV export and tabular analysis.
 * Each row represents a single season or movie with aggregated metadata.
 */
export interface FlatItemRecord {
  /** Parent era identifier. */
  eraId: string
  /** Parent era display title. */
  eraTitle: string
  /** Item identifier. */
  itemId: string
  /** Item display title. */
  itemTitle: string
  /** Item type discriminator (e.g. 'season', 'movie'). */
  itemType: string
  /** Release year or year range. */
  year: string
  /** In-universe stardate reference. */
  stardate: string
  /** Number of episodes in a season, or 0 for movies. */
  episodeCount: number
  /** Additional notes or annotations. */
  notes: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default export options applied when not explicitly provided. */
const DEFAULT_OPTIONS: ExportOptions = {
  format: 'json',
  outputPath: './export/star-trek-data.json',
  includeEpisodeDetails: true,
  flattenEpisodes: false,
  prettyPrint: true,
}

/** Column headers for episode-level CSV export. */
const EPISODE_CSV_HEADERS: readonly (keyof FlatEpisodeRecord)[] = [
  'eraId',
  'eraTitle',
  'itemId',
  'itemTitle',
  'itemType',
  'year',
  'episodeId',
  'episodeTitle',
  'season',
  'episode',
  'airDate',
  'stardate',
  'synopsis',
] as const

/** Column headers for item-level CSV export. */
const ITEM_CSV_HEADERS: readonly (keyof FlatItemRecord)[] = [
  'eraId',
  'eraTitle',
  'itemId',
  'itemTitle',
  'itemType',
  'year',
  'stardate',
  'episodeCount',
  'notes',
] as const

// ============================================================================
// CSV UTILITIES
// ============================================================================

/**
 * Escapes a single CSV field value according to RFC 4180.
 * Fields containing commas, double quotes, or newlines are wrapped
 * in double quotes, with internal double quotes doubled.
 *
 * @param value - The raw field value to escape.
 * @returns The properly escaped CSV field string.
 */
export const escapeCsvField = (value: string | number): string => {
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replaceAll('"', '""')}"`
  }
  return str
}

/**
 * Converts an array of records into a CSV string with headers.
 *
 * @param headers - Ordered column header names.
 * @param records - Array of record objects to serialize.
 * @returns A complete CSV string including header row and data rows.
 */
const recordsToCsv = <K extends string>(
  headers: readonly K[],
  records: readonly Record<K, string | number>[],
): string => {
  const headerRow = headers.map(h => escapeCsvField(h)).join(',')
  const dataRows = records.map(record => headers.map(h => escapeCsvField(record[h])).join(','))
  return [headerRow, ...dataRows].join('\n')
}

// ============================================================================
// DATA FLATTENING
// ============================================================================

/**
 * Determines whether an item is a season (has episodeData) vs a movie.
 *
 * @param item - A normalized season or movie item.
 * @returns True if the item is a NormalizedSeasonItem.
 */
const isSeasonItem = (
  item: NormalizedSeasonItem | NormalizedMovieItem,
): item is NormalizedSeasonItem => {
  return 'episodeData' in item || item.type === 'season'
}

/**
 * Flattens hierarchical era data into episode-level flat records.
 * Each episode becomes one record; movies produce a single record
 * with empty episode-specific fields.
 *
 * @param eras - Array of normalized era structures to flatten.
 * @returns Array of flat episode records suitable for CSV export.
 */
export const convertErasToFlatRecords = (eras: NormalizedEra[]): FlatEpisodeRecord[] => {
  const records: FlatEpisodeRecord[] = []

  for (const era of eras) {
    for (const item of era.items) {
      if (isSeasonItem(item)) {
        const episodes = item.episodeData ?? []
        if (episodes.length > 0) {
          for (const ep of episodes) {
            records.push(buildEpisodeRecord(era, item, ep))
          }
        } else {
          // Season with no episode data — emit a single row
          records.push({
            eraId: era.id,
            eraTitle: era.title,
            itemId: item.id,
            itemTitle: item.title,
            itemType: item.type,
            year: item.year,
            episodeId: '',
            episodeTitle: '',
            season: 0,
            episode: 0,
            airDate: '',
            stardate: item.stardate,
            synopsis: '',
          })
        }
      } else {
        // Movie item — single row with movie-specific fields
        records.push(buildMovieRecord(era, item))
      }
    }
  }

  return records
}

/**
 * Flattens hierarchical era data into item-level flat records.
 * Each season or movie becomes one record with aggregated metadata.
 *
 * @param eras - Array of normalized era structures to flatten.
 * @returns Array of flat item records suitable for CSV export.
 */
export const convertErasToItemRecords = (eras: NormalizedEra[]): FlatItemRecord[] => {
  const records: FlatItemRecord[] = []

  for (const era of eras) {
    for (const item of era.items) {
      if (isSeasonItem(item)) {
        records.push({
          eraId: era.id,
          eraTitle: era.title,
          itemId: item.id,
          itemTitle: item.title,
          itemType: item.type,
          year: item.year,
          stardate: item.stardate,
          episodeCount: item.episodeData?.length ?? item.episodes ?? 0,
          notes: item.notes ?? '',
        })
      } else {
        records.push({
          eraId: era.id,
          eraTitle: era.title,
          itemId: item.id,
          itemTitle: item.title,
          itemType: item.type,
          year: item.year,
          stardate: item.stardate,
          episodeCount: 0,
          notes: item.notes ?? '',
        })
      }
    }
  }

  return records
}

/**
 * Builds a FlatEpisodeRecord from an episode within a season.
 *
 * @param era - The parent era.
 * @param season - The parent season item.
 * @param ep - The episode to convert.
 * @returns A flat episode record.
 */
const buildEpisodeRecord = (
  era: NormalizedEra,
  season: NormalizedSeasonItem,
  ep: NormalizedEpisodeItem,
): FlatEpisodeRecord => ({
  eraId: era.id,
  eraTitle: era.title,
  itemId: season.id,
  itemTitle: season.title,
  itemType: season.type,
  year: season.year,
  episodeId: ep.id,
  episodeTitle: ep.title,
  season: ep.season,
  episode: ep.episode,
  airDate: ep.airDate,
  stardate: ep.stardate,
  synopsis: ep.synopsis,
})

/**
 * Builds a FlatEpisodeRecord from a movie item.
 *
 * @param era - The parent era.
 * @param movie - The movie item to convert.
 * @returns A flat episode record with empty episode-specific fields.
 */
const buildMovieRecord = (era: NormalizedEra, movie: NormalizedMovieItem): FlatEpisodeRecord => ({
  eraId: era.id,
  eraTitle: era.title,
  itemId: movie.id,
  itemTitle: movie.title,
  itemType: movie.type,
  year: movie.year,
  episodeId: '',
  episodeTitle: '',
  season: 0,
  episode: 0,
  airDate: '',
  stardate: movie.stardate,
  synopsis: movie.synopsis ?? '',
})

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Resolves partial export options against defaults.
 *
 * @param partial - User-provided partial options.
 * @returns Fully resolved export options.
 */
const resolveOptions = (partial: Partial<ExportOptions>): ExportOptions => ({
  ...DEFAULT_OPTIONS,
  ...partial,
})

/**
 * Ensures the output directory exists, creating it recursively if needed.
 *
 * @param outputPath - The target file path whose parent directory should exist.
 */
const ensureOutputDirectory = async (outputPath: string): Promise<void> => {
  const dir = dirname(outputPath)
  await mkdir(dir, {recursive: true})
}

/**
 * Retrieves the file size in bytes for a given path.
 *
 * @param filePath - Path to the file.
 * @returns The file size in bytes.
 */
const getFileSize = async (filePath: string): Promise<number> => {
  const stats = await stat(filePath)
  return stats.size
}

/**
 * Strips episodeData from era items when includeEpisodeDetails is false.
 * Returns a deep copy to avoid mutating the original data.
 *
 * @param eras - The source era data.
 * @param includeEpisodeDetails - Whether to retain episodeData.
 * @returns A (potentially filtered) copy of the era data.
 */
const prepareEraData = (eras: NormalizedEra[], includeEpisodeDetails: boolean): NormalizedEra[] => {
  if (includeEpisodeDetails) {
    return eras
  }

  return eras.map(era => ({
    ...era,
    items: era.items.map(item => {
      if (isSeasonItem(item)) {
        const {episodeData: _removed, ...rest} = item
        return rest as NormalizedSeasonItem
      }
      return item
    }),
  }))
}

/**
 * Exports normalized era data to a JSON file.
 *
 * When `flattenEpisodes` is true, the output is an array of flat episode
 * records rather than the hierarchical era structure. When `prettyPrint`
 * is true (default), output is indented with 2 spaces.
 *
 * @param eras - Array of normalized era data to export.
 * @param options - Partial export options (defaults applied automatically).
 * @returns Export result metadata including file size and record count.
 */
export const exportToJson = async (
  eras: NormalizedEra[],
  options: Partial<ExportOptions> = {},
): Promise<ExportResult> => {
  const resolved = resolveOptions({...options, format: 'json'})
  await ensureOutputDirectory(resolved.outputPath)

  let data: unknown
  let recordCount: number

  if (resolved.flattenEpisodes) {
    const records = convertErasToFlatRecords(eras)
    data = records
    recordCount = records.length
  } else {
    const prepared = prepareEraData(eras, resolved.includeEpisodeDetails)
    data = prepared
    recordCount = prepared.length
  }

  const indent = resolved.prettyPrint ? 2 : undefined
  const content = JSON.stringify(data, null, indent)
  await writeFile(resolved.outputPath, content, 'utf-8')

  const fileSize = await getFileSize(resolved.outputPath)

  return {
    format: 'json',
    outputPath: resolved.outputPath,
    recordCount,
    fileSize,
    exportedAt: new Date().toISOString(),
  }
}

/**
 * Exports normalized era data to a CSV file.
 *
 * When `flattenEpisodes` is true, the output contains one row per episode
 * (using FlatEpisodeRecord columns). When false, the output contains one
 * row per item/season/movie (using FlatItemRecord columns).
 *
 * CSV fields are properly escaped per RFC 4180: values containing commas,
 * double quotes, or newlines are wrapped in double quotes with internal
 * quotes doubled.
 *
 * @param eras - Array of normalized era data to export.
 * @param options - Partial export options (defaults applied automatically).
 * @returns Export result metadata including file size and record count.
 */
export const exportToCsv = async (
  eras: NormalizedEra[],
  options: Partial<ExportOptions> = {},
): Promise<ExportResult> => {
  const resolved = resolveOptions({...options, format: 'csv'})
  await ensureOutputDirectory(resolved.outputPath)

  let content: string
  let recordCount: number

  if (resolved.flattenEpisodes) {
    const records = convertErasToFlatRecords(eras)
    content = recordsToCsv(EPISODE_CSV_HEADERS, records)
    recordCount = records.length
  } else {
    const records = convertErasToItemRecords(eras)
    content = recordsToCsv(ITEM_CSV_HEADERS, records)
    recordCount = records.length
  }

  await writeFile(resolved.outputPath, content, 'utf-8')

  const fileSize = await getFileSize(resolved.outputPath)

  return {
    format: 'csv',
    outputPath: resolved.outputPath,
    recordCount,
    fileSize,
    exportedAt: new Date().toISOString(),
  }
}

/**
 * Main entry point for data export. Delegates to the appropriate
 * format-specific exporter based on the `format` option.
 *
 * @param eras - Array of normalized era data to export.
 * @param options - Partial export options (defaults applied automatically).
 * @returns Export result metadata including file size and record count.
 * @throws Error if an unsupported format is specified.
 */
export const exportData = async (
  eras: NormalizedEra[],
  options: Partial<ExportOptions> = {},
): Promise<ExportResult> => {
  const resolved = resolveOptions(options)

  switch (resolved.format) {
    case 'json':
      return exportToJson(eras, resolved)
    case 'csv':
      return exportToCsv(eras, resolved)
    default: {
      const exhaustiveCheck: never = resolved.format
      throw new Error(`Unsupported export format: ${String(exhaustiveCheck)}`)
    }
  }
}
