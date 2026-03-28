/**
 * Data Preview Module
 *
 * Generates structured previews of Star Trek viewing guide data
 * before writing files. Provides tree views, statistics, and
 * formatted output for verifying generated data quality.
 *
 * @module data-preview
 */

import type {
  NormalizedEpisodeItem,
  NormalizedEra,
  NormalizedMovieItem,
  NormalizedSeasonItem,
} from './data-quality.js'

import process from 'node:process'

// ── ANSI Color Helpers ──────────────────────────────────────────────

const ANSI = {
  reset: '\u001B[0m',
  bold: '\u001B[1m',
  dim: '\u001B[2m',
  cyan: '\u001B[36m',
  green: '\u001B[32m',
  yellow: '\u001B[33m',
  magenta: '\u001B[35m',
  blue: '\u001B[34m',
  white: '\u001B[37m',
} as const

/**
 * Creates a colorizer function that applies ANSI codes when enabled.
 * Returns a pass-through function when colorization is disabled.
 */
const createColorizer = (enabled: boolean) => {
  if (!enabled) {
    return {
      bold: (s: string) => s,
      dim: (s: string) => s,
      cyan: (s: string) => s,
      green: (s: string) => s,
      yellow: (s: string) => s,
      magenta: (s: string) => s,
      blue: (s: string) => s,
      white: (s: string) => s,
    }
  }
  return {
    bold: (s: string) => `${ANSI.bold}${s}${ANSI.reset}`,
    dim: (s: string) => `${ANSI.dim}${s}${ANSI.reset}`,
    cyan: (s: string) => `${ANSI.cyan}${s}${ANSI.reset}`,
    green: (s: string) => `${ANSI.green}${s}${ANSI.reset}`,
    yellow: (s: string) => `${ANSI.yellow}${s}${ANSI.reset}`,
    magenta: (s: string) => `${ANSI.magenta}${s}${ANSI.reset}`,
    blue: (s: string) => `${ANSI.blue}${s}${ANSI.reset}`,
    white: (s: string) => `${ANSI.white}${s}${ANSI.reset}`,
  }
}

// ── Public Interfaces ───────────────────────────────────────────────

/** Options controlling preview output format and content. */
export interface PreviewOptions {
  /** Maximum number of items to show per era (default: 3) */
  maxItemsPerEra: number
  /** Maximum number of episodes to show per item (default: 2) */
  maxEpisodesPerItem: number
  /** Whether to show individual episode details (default: true) */
  showEpisodeDetails: boolean
  /** Whether to show aggregate statistics (default: true) */
  showStatistics: boolean
  /** Whether to use ANSI colors in output (default: true) */
  colorize: boolean
  /** Output stream for printPreview (default: process.stderr) */
  outputStream: {write: (s: string) => void}
}

/** Aggregate statistics about the generated data. */
export interface PreviewStatistics {
  /** Total number of eras */
  totalEras: number
  /** Total number of items across all eras */
  totalItems: number
  /** Total number of episodes across all seasons */
  totalEpisodes: number
  /** Total number of movie items */
  totalMovies: number
  /** Total number of season items */
  totalSeasons: number
  /** Count of items grouped by type */
  itemsByType: Record<string, number>
  /** Count of episodes grouped by era id */
  episodesByEra: Record<string, number>
  /** Average episodes per season (0 if no seasons) */
  averageEpisodesPerSeason: number
}

// ── Defaults ────────────────────────────────────────────────────────

const DEFAULT_OPTIONS: PreviewOptions = {
  maxItemsPerEra: 3,
  maxEpisodesPerItem: 2,
  showEpisodeDetails: true,
  showStatistics: true,
  colorize: true,
  outputStream: process.stderr,
}

/** Merges partial user options with defaults. */
const resolveOptions = (opts?: Partial<PreviewOptions>): PreviewOptions => ({
  ...DEFAULT_OPTIONS,
  ...opts,
})

// ── Type Guards ─────────────────────────────────────────────────────

/** Determines whether an item is a season (has episodeData array). */
const isSeason = (item: NormalizedSeasonItem | NormalizedMovieItem): item is NormalizedSeasonItem =>
  'episodeData' in item || (item.type !== undefined && item.type === 'season')

/** Determines whether an item is a movie. */
const isMovie = (item: NormalizedSeasonItem | NormalizedMovieItem): item is NormalizedMovieItem =>
  item.type !== undefined && item.type === 'movie'

// ── Statistics ──────────────────────────────────────────────────────

/**
 * Calculates aggregate statistics about the generated data.
 *
 * Iterates through all eras and their items to produce counts
 * of episodes, seasons, movies, and per-era breakdowns.
 *
 * @param eras - Array of normalized eras to analyze
 * @returns Computed statistics object
 */
export const generateStatistics = (eras: NormalizedEra[]): PreviewStatistics => {
  let totalEpisodes = 0
  let totalMovies = 0
  let totalSeasons = 0
  let totalItems = 0
  const itemsByType: Record<string, number> = {}
  const episodesByEra: Record<string, number> = {}

  for (const era of eras) {
    let eraEpisodeCount = 0

    for (const item of era.items) {
      totalItems++
      const itemType = item.type ?? 'unknown'
      itemsByType[itemType] = (itemsByType[itemType] ?? 0) + 1

      if (isSeason(item)) {
        totalSeasons++
        const episodeCount = getEpisodeCount(item)
        totalEpisodes += episodeCount
        eraEpisodeCount += episodeCount
      } else if (isMovie(item)) {
        totalMovies++
      }
    }

    episodesByEra[era.id] = eraEpisodeCount
  }

  const averageEpisodesPerSeason =
    totalSeasons > 0 ? Math.round((totalEpisodes / totalSeasons) * 10) / 10 : 0

  return {
    totalEras: eras.length,
    totalItems,
    totalEpisodes,
    totalMovies,
    totalSeasons,
    itemsByType,
    episodesByEra,
    averageEpisodesPerSeason,
  }
}

/**
 * Returns the episode count for a season item.
 * Prefers the length of episodeData array, falls back to episodes field.
 */
const getEpisodeCount = (item: NormalizedSeasonItem): number => {
  if (item.episodeData && item.episodeData.length > 0) {
    return item.episodeData.length
  }
  return item.episodes ?? 0
}

// ── Formatting ──────────────────────────────────────────────────────

/**
 * Formats statistics into a human-readable string.
 *
 * @param stats - The statistics to format
 * @returns Multi-line formatted statistics string
 */
export const formatStatistics = (stats: PreviewStatistics): string => {
  const lines: string[] = []

  lines.push('📊 Statistics:')
  lines.push(`  Total Eras:     ${String(stats.totalEras)}`)
  lines.push(`  Total Items:    ${String(stats.totalItems)}`)
  lines.push(`  Total Episodes: ${String(stats.totalEpisodes)}`)
  lines.push(`  Total Movies:   ${String(stats.totalMovies)}`)
  lines.push(`  Total Seasons:  ${String(stats.totalSeasons)}`)
  lines.push(`  Avg Eps/Season: ${String(stats.averageEpisodesPerSeason)}`)

  if (Object.keys(stats.itemsByType).length > 0) {
    lines.push('')
    lines.push('  Items by Type:')
    for (const [type, count] of Object.entries(stats.itemsByType)) {
      lines.push(`    ${type}: ${String(count)}`)
    }
  }

  if (Object.keys(stats.episodesByEra).length > 0) {
    lines.push('')
    lines.push('  Episodes by Era:')
    for (const [eraId, count] of Object.entries(stats.episodesByEra)) {
      lines.push(`    ${eraId}: ${String(count)}`)
    }
  }

  return lines.join('\n')
}

/**
 * Formats a single episode line for the tree view.
 */
const formatEpisodeLine = (
  episode: NormalizedEpisodeItem,
  isLast: boolean,
  parentPrefix: string,
): string => {
  const connector = isLast ? '└─' : '├─'
  const airDate = episode.airDate ? ` (${episode.airDate})` : ''
  return `${parentPrefix}${connector} ${episode.id}: ${episode.title}${airDate}`
}

/**
 * Formats a single item (season or movie) for the tree view.
 */
const formatItemLine = (
  item: NormalizedSeasonItem | NormalizedMovieItem,
  isLast: boolean,
  options: PreviewOptions,
): string[] => {
  const lines: string[] = []
  const connector = isLast ? '└─' : '├─'
  const typeLabel = item.type ? ` [${item.type}]` : ''
  const yearLabel = item.year ? ` (${item.year})` : ''

  if (isSeason(item)) {
    const episodeCount = getEpisodeCount(item)
    const episodeSuffix = episodeCount > 0 ? ` - ${String(episodeCount)} episodes` : ''
    lines.push(`  ${connector} ${item.title}${typeLabel}${yearLabel}${episodeSuffix}`)

    if (options.showEpisodeDetails && item.episodeData && item.episodeData.length > 0) {
      const childPrefix = isLast ? '     ' : '  │  '
      const episodesToShow = item.episodeData.slice(0, options.maxEpisodesPerItem)
      const remaining = item.episodeData.length - episodesToShow.length

      for (let i = 0; i < episodesToShow.length; i++) {
        const episode = episodesToShow[i]
        if (!episode) continue
        const isLastEpisode = i === episodesToShow.length - 1 && remaining === 0
        lines.push(formatEpisodeLine(episode, isLastEpisode, childPrefix))
      }

      if (remaining > 0) {
        lines.push(`${childPrefix}└─ ... and ${String(remaining)} more episodes`)
      }
    }
  } else {
    lines.push(`  ${connector} ${item.title}${typeLabel}${yearLabel}`)
  }

  return lines
}

// ── Tree View ───────────────────────────────────────────────────────

/**
 * Generates a tree-like view of eras, their items, and episodes.
 *
 * Uses Unicode box-drawing characters (├─, └─, │) to render
 * a hierarchical tree structure showing the data at a glance.
 *
 * @param eras - Array of normalized eras to render
 * @param options - Partial preview options (merged with defaults)
 * @returns Formatted tree view string
 */
export const generateTreeView = (
  eras: NormalizedEra[],
  options?: Partial<PreviewOptions>,
): string => {
  const opts = resolveOptions(options)
  const lines: string[] = []

  for (const era of eras) {
    const yearsLabel = era.years ? ` (${era.years})` : ''
    lines.push(`📁 ${era.title}${yearsLabel}`)

    const itemsToShow = era.items.slice(0, opts.maxItemsPerEra)
    const remainingItems = era.items.length - itemsToShow.length

    for (let i = 0; i < itemsToShow.length; i++) {
      const item = itemsToShow[i]
      if (!item) continue
      const isLastItem = i === itemsToShow.length - 1 && remainingItems === 0
      const itemLines = formatItemLine(item, isLastItem, opts)
      lines.push(...itemLines)
    }

    if (remainingItems > 0) {
      lines.push(`  └─ ... and ${String(remainingItems)} more items`)
    }

    lines.push('')
  }

  return lines.join('\n')
}

// ── Preview Generation ──────────────────────────────────────────────

/**
 * Generates a complete formatted string preview of the data.
 *
 * Combines a header, optional statistics section, and tree view
 * into a single formatted string suitable for display.
 *
 * @param eras - Array of normalized eras to preview
 * @param options - Partial preview options (merged with defaults)
 * @returns Complete formatted preview string
 */
export const generatePreview = (
  eras: NormalizedEra[],
  options?: Partial<PreviewOptions>,
): string => {
  const opts = resolveOptions(options)
  const c = createColorizer(opts.colorize)
  const sections: string[] = []

  sections.push(c.bold(c.cyan('=== Star Trek Data Preview ===')))
  sections.push('')

  if (opts.showStatistics) {
    const stats = generateStatistics(eras)
    sections.push(formatStatistics(stats))
    sections.push('')
  }

  sections.push(generateTreeView(eras, opts))

  return sections.join('\n')
}

/**
 * Prints the preview directly to the configured output stream.
 *
 * This is a convenience wrapper around generatePreview that writes
 * the result to the output stream (defaults to process.stderr).
 *
 * @param eras - Array of normalized eras to preview
 * @param options - Partial preview options (merged with defaults)
 */
export const printPreview = (eras: NormalizedEra[], options?: Partial<PreviewOptions>): void => {
  const opts = resolveOptions(options)
  const output = generatePreview(eras, opts)
  opts.outputStream.write(`${output}\n`)
}
