/**
 * Automated Star Trek data generation script.
 * Fetches series, movie, and episode data using metadata sources and generates star-trek-data.ts.
 *
 * This script implements a comprehensive data generation pipeline:
 * - Fetch data from multiple metadata sources (TMDB, Memory Alpha, TrekCore, STAPI)
 * - Normalize and merge data from different sources with intelligent conflict resolution
 * - Validate data quality and completeness
 * - Generate TypeScript code with proper formatting
 * - Support both full regeneration and incremental updates
 *
 * Usage:
 *   pnpm exec jiti scripts/generate-star-trek-data.ts [options]
 *
 * Options:
 *   --mode <mode>        Generation mode: 'full' or 'incremental' (default: 'full')
 *   --series <series>    Target specific series (e.g., 'tos', 'tng', 'ds9')
 *   --dry-run            Show what would be generated without writing files
 *   --output <path>      Output file path (default: 'src/data/star-trek-data.ts')
 *   --validate           Run validation after generation (default: true)
 *   --verbose            Enable detailed logging
 *   --help               Show this help message
 *
 * Examples:
 *   # Full regeneration with validation
 *   pnpm exec jiti scripts/generate-star-trek-data.ts --mode full --validate
 *
 *   # Incremental update for specific series
 *   pnpm exec jiti scripts/generate-star-trek-data.ts --mode incremental --series discovery
 *
 *   # Dry run to preview changes
 *   pnpm exec jiti scripts/generate-star-trek-data.ts --dry-run --verbose
 */

import {resolve} from 'node:path'
import process from 'node:process'
import {createLogger} from '../src/modules/logger.js'
import {
  EXIT_CODES,
  loadEnv,
  parseBooleanFlag,
  parseStringValue,
  showErrorAndExit,
  showHelpAndExit,
  type BaseCLIOptions,
} from './lib/cli-utils.js'
import {initializeMetadataSources, logMetadataSourceStatus} from './lib/source-config.js'

/**
 * Discovered series information from TMDB.
 */
interface DiscoveredSeries {
  /** TMDB series ID */
  id: number
  /** Series name */
  name: string
  /** Original name (often same as name) */
  originalName: string
  /** First air date (YYYY-MM-DD format) */
  firstAirDate: string
  /** Overview/description */
  overview: string
  /** Number of seasons */
  numberOfSeasons: number
  /** Number of episodes */
  numberOfEpisodes: number
  /** Series status (e.g., 'Ended', 'Returning Series') */
  status: string
}

/**
 * TMDB search result structure for TV series.
 */
interface TMDBSearchResult {
  page: number
  results: {
    id: number
    name: string
    original_name: string
    first_air_date: string
    overview: string
  }[]
  total_pages: number
  total_results: number
}

/**
 * TMDB TV series details response structure.
 */
interface TMDBSeriesDetails {
  id: number
  name: string
  original_name: string
  first_air_date: string
  overview: string
  number_of_seasons: number
  number_of_episodes: number
  status: string
  seasons: {
    season_number: number
    episode_count: number
    air_date: string
    name: string
  }[]
}

/**
 * TMDB season details response structure.
 */
interface TMDBSeasonDetails {
  id: number
  name: string
  overview: string
  season_number: number
  air_date: string
  episode_count: number
  episodes: {
    id: number
    name: string
    overview: string
    episode_number: number
    season_number: number
    air_date: string
    runtime: number | null
    still_path: string | null
    vote_average: number
    vote_count: number
  }[]
}

/**
 * TMDB episode details response structure with crew information.
 */
interface TMDBEpisodeDetails {
  id: number
  name: string
  overview: string
  episode_number: number
  season_number: number
  air_date: string
  runtime: number | null
  still_path: string | null
  vote_average: number
  vote_count: number
  crew: {
    id: number
    name: string
    job: string
    department: string
  }[]
  guest_stars: {
    id: number
    name: string
    character: string
    order: number
  }[]
}

/**
 * Enriched episode data combining TMDB and other metadata sources.
 */
interface EnrichedEpisodeData {
  /** Episode ID in VBS format (e.g., 'tos_s1_e01') */
  episodeId: string
  /** TMDB episode ID */
  tmdbId: number
  /** Episode title */
  title: string
  /** Season number */
  season: number
  /** Episode number within season */
  episode: number
  /** Air date (YYYY-MM-DD format) */
  airDate: string
  /** Episode overview/synopsis */
  overview: string
  /** Runtime in minutes */
  runtime: number | null
  /** Director name(s) */
  director?: string | undefined
  /** Writer name(s) */
  writer?: string | undefined
  /** Guest stars */
  guestStars?: string[] | undefined
  /** TMDB vote average */
  voteAverage?: number | undefined
  /** TMDB vote count */
  voteCount?: number | undefined
}

/**
 * Enriched season data with all episodes.
 */
interface EnrichedSeasonData {
  /** Season number */
  seasonNumber: number
  /** Season name */
  name: string
  /** Season overview */
  overview: string
  /** Season air date */
  airDate: string
  /** Episode count */
  episodeCount: number
  /** All episodes in season */
  episodes: EnrichedEpisodeData[]
}

/**
 * Complete series data with all seasons and episodes.
 */
interface EnrichedSeriesData {
  /** TMDB series ID */
  seriesId: number
  /** Series name */
  name: string
  /** Series overview */
  overview: string
  /** First air date */
  firstAirDate: string
  /** Series status */
  status: string
  /** All seasons */
  seasons: EnrichedSeasonData[]
}

interface GenerateDataOptions extends BaseCLIOptions {
  mode: 'full' | 'incremental'
  series?: string | undefined
  dryRun: boolean
  output: string
  validate: boolean
}

const DEFAULT_OPTIONS: Omit<GenerateDataOptions, 'help' | 'verbose'> = {
  mode: 'full',
  dryRun: false,
  output: 'src/data/star-trek-data.ts',
  validate: true,
}

const HELP_TEXT = `
Automated Star Trek Data Generation

Fetches series, movie, and episode data from metadata sources and generates
the star-trek-data.ts file programmatically.

Usage:
  pnpm exec jiti scripts/generate-star-trek-data.ts [options]

Options:
  --mode <mode>        Generation mode: 'full' or 'incremental' (default: 'full')
                       - full: Complete regeneration of all data
                       - incremental: Update only new or changed content

  --series <series>    Target specific series (e.g., 'tos', 'tng', 'ds9')
                       Without this flag, all series are processed

  --dry-run            Show what would be generated without writing files
                       Useful for testing and previewing changes

  --output <path>      Output file path (default: 'src/data/star-trek-data.ts')

  --validate           Run validation after generation (default: true)
                       Uses existing validation tools to ensure data quality

  --verbose            Enable detailed logging with progress indicators

  --help               Show this help message and exit

Examples:
  # Full regeneration with validation
  pnpm exec jiti scripts/generate-star-trek-data.ts --mode full --validate

  # Incremental update for specific series
  pnpm exec jiti scripts/generate-star-trek-data.ts --mode incremental --series discovery

  # Dry run to preview changes
  pnpm exec jiti scripts/generate-star-trek-data.ts --dry-run --verbose

Environment Variables:
  TMDB_API_KEY         The Movie Database API Read Access Token (optional but recommended)
                       Set to your TMDB API Read Access Token (Bearer token)
                       Get yours at: https://www.themoviedb.org/settings/api
                       Enables enhanced metadata from TMDB

Notes:
  - Script requires internet connection to fetch metadata
  - Rate limiting is enforced to respect API quotas
  - Generated files are formatted with Prettier/ESLint
  - Backup of existing file is created automatically
  - Memory Alpha, TrekCore, and STAPI are always available
`

/**
 * Known Star Trek series with their names for discovery via TMDB search.
 */
const STAR_TREK_SERIES = [
  'Star Trek: The Original Series',
  'Star Trek: The Animated Series',
  'Star Trek: The Next Generation',
  'Star Trek: Deep Space Nine',
  'Star Trek: Voyager',
  'Star Trek: Enterprise',
  'Star Trek: Discovery',
  'Star Trek: Picard',
  'Star Trek: Lower Decks',
  'Star Trek: Prodigy',
  'Star Trek: Strange New Worlds',
] as const

/**
 * Fetch series details from TMDB by series ID.
 * Uses modern TMDB API authentication with Bearer token (API Read Access Token).
 */
const fetchSeriesDetails = async (
  seriesId: number,
  logger: ReturnType<typeof createLogger>,
): Promise<DiscoveredSeries | null> => {
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) {
    logger.warn('TMDB_API_KEY not configured, skipping TMDB queries')
    return null
  }

  const url = `https://api.themoviedb.org/3/tv/${seriesId}`
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }

  try {
    const response = await fetch(url, {headers})
    if (!response.ok) {
      logger.error('TMDB API error for series', {
        status: response.status,
        seriesId,
      })
      return null
    }

    const data = (await response.json()) as TMDBSeriesDetails

    return {
      id: data.id,
      name: data.name,
      originalName: data.original_name,
      firstAirDate: data.first_air_date,
      overview: data.overview,
      numberOfSeasons: data.number_of_seasons,
      numberOfEpisodes: data.number_of_episodes,
      status: data.status,
    }
  } catch (error: unknown) {
    const errorDetails = {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error),
    }
    logger.error('Failed to fetch series details', {seriesId, error: errorDetails})
    return null
  }
}

/**
 * Search TMDB for a specific Star Trek series by name.
 * Uses modern TMDB API authentication with Bearer token (API Read Access Token).
 */
const searchSeries = async (
  seriesName: string,
  logger: ReturnType<typeof createLogger>,
): Promise<number | null> => {
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) {
    return null
  }

  const url = `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(seriesName)}`
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }

  try {
    const response = await fetch(url, {headers})
    if (!response.ok) {
      logger.error('TMDB search error', {seriesName, status: response.status})
      return null
    }

    const data = (await response.json()) as TMDBSearchResult

    const match = data.results.find(
      (result: TMDBSearchResult['results'][number]) =>
        result.name.toLowerCase().includes('star trek') &&
        (result.name
          .toLowerCase()
          .includes(seriesName.toLowerCase().replace('star trek:', '').trim()) ||
          seriesName.toLowerCase().includes(result.name.toLowerCase())),
    )

    return match?.id ?? null
  } catch (error: unknown) {
    const errorDetails = {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error),
    }
    logger.error('Failed to search for series', {seriesName, error: errorDetails})
    return null
  }
}

/**
 * Fetch season details from TMDB including episode list.
 * Uses Bearer token authentication for TMDB API v3.
 */
const fetchSeasonDetails = async (
  seriesId: number,
  seasonNumber: number,
  logger: ReturnType<typeof createLogger>,
): Promise<TMDBSeasonDetails | null> => {
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) {
    logger.warn('TMDB_API_KEY not configured, skipping season details fetch')
    return null
  }

  const url = `https://api.themoviedb.org/3/tv/${seriesId}/season/${seasonNumber}`
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }

  try {
    const response = await fetch(url, {headers})
    if (!response.ok) {
      logger.error('TMDB API error for season', {
        status: response.status,
        seriesId,
        seasonNumber,
      })
      return null
    }

    const data = (await response.json()) as TMDBSeasonDetails
    return data
  } catch (error: unknown) {
    const errorDetails = {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error),
    }
    logger.error('Failed to fetch season details', {seriesId, seasonNumber, error: errorDetails})
    return null
  }
}

/**
 * Fetch episode details from TMDB with crew and guest star information.
 * Includes directors, writers, and guest stars for comprehensive metadata.
 */
const fetchEpisodeDetails = async (
  seriesId: number,
  seasonNumber: number,
  episodeNumber: number,
  logger: ReturnType<typeof createLogger>,
): Promise<TMDBEpisodeDetails | null> => {
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) {
    logger.warn('TMDB_API_KEY not configured, skipping episode details fetch')
    return null
  }

  const url = `https://api.themoviedb.org/3/tv/${seriesId}/season/${seasonNumber}/episode/${episodeNumber}`
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }

  try {
    const response = await fetch(url, {headers})
    if (!response.ok) {
      logger.error('TMDB API error for episode', {
        status: response.status,
        seriesId,
        seasonNumber,
        episodeNumber,
      })
      return null
    }

    const data = (await response.json()) as TMDBEpisodeDetails
    return data
  } catch (error: unknown) {
    const errorDetails = {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error),
    }
    logger.error('Failed to fetch episode details', {
      seriesId,
      seasonNumber,
      episodeNumber,
      error: errorDetails,
    })
    return null
  }
}

/**
 * Generate VBS episode ID following naming convention: series_s{season}_e{episode}
 * Example: "Star Trek: The Next Generation" S3E15 → "tng_s3_e15"
 */
const generateEpisodeId = (seriesName: string, season: number, episode: number): string => {
  const seriesCode = seriesName
    .toLowerCase()
    .replace(/^star trek:?\s*/i, '')
    .replaceAll(/\s+/g, '')
    .slice(0, 3)

  return `${seriesCode}_s${season}_e${episode}`
}

/**
 * Transform TMDB episode data to VBS format with crew information.
 * Extracts directors, writers, and top 5 guest stars from TMDB crew data.
 */
const enrichEpisodeData = (
  seriesName: string,
  seasonNumber: number,
  episodeNumber: number,
  tmdbEpisode: TMDBEpisodeDetails,
): EnrichedEpisodeData => {
  const directors = tmdbEpisode.crew.filter(crew => crew.job === 'Director').map(crew => crew.name)
  const writers = tmdbEpisode.crew
    .filter(crew => crew.job === 'Writer' || crew.job === 'Teleplay')
    .map(crew => crew.name)

  return {
    episodeId: generateEpisodeId(seriesName, seasonNumber, episodeNumber),
    tmdbId: tmdbEpisode.id,
    title: tmdbEpisode.name,
    season: seasonNumber,
    episode: episodeNumber,
    airDate: tmdbEpisode.air_date,
    overview: tmdbEpisode.overview,
    runtime: tmdbEpisode.runtime,
    director: directors.length > 0 ? directors.join(', ') : undefined,
    writer: writers.length > 0 ? writers.join(', ') : undefined,
    guestStars:
      tmdbEpisode.guest_stars.length > 0
        ? tmdbEpisode.guest_stars.slice(0, 5).map(star => `${star.name} as ${star.character}`)
        : undefined,
    voteAverage: tmdbEpisode.vote_average > 0 ? tmdbEpisode.vote_average : undefined,
    voteCount: tmdbEpisode.vote_count > 0 ? tmdbEpisode.vote_count : undefined,
  }
}

/**
 * Enumerate all seasons and episodes for a discovered series with rate limiting.
 * Rate limits: 250ms between episodes (~4 req/s), 500ms between seasons to respect TMDB quota (40 req/10s).
 */
const enumerateSeriesEpisodes = async (
  series: DiscoveredSeries,
  logger: ReturnType<typeof createLogger>,
): Promise<EnrichedSeriesData> => {
  logger.info(`Enumerating episodes for: ${series.name}`)

  const enrichedSeasons: EnrichedSeasonData[] = []

  for (let seasonNum = 1; seasonNum <= series.numberOfSeasons; seasonNum++) {
    logger.debug(`Fetching season ${seasonNum} of ${series.numberOfSeasons}`)

    const seasonDetails = await fetchSeasonDetails(series.id, seasonNum, logger)
    if (!seasonDetails) {
      logger.warn(`Failed to fetch season ${seasonNum} for ${series.name}`)
      continue
    }

    const enrichedEpisodes: EnrichedEpisodeData[] = []

    for (const episode of seasonDetails.episodes) {
      logger.debug(`Fetching episode S${seasonNum}E${episode.episode_number}: ${episode.name}`)

      const episodeDetails = await fetchEpisodeDetails(
        series.id,
        seasonNum,
        episode.episode_number,
        logger,
      )

      if (episodeDetails) {
        const enrichedEpisode = enrichEpisodeData(
          series.name,
          seasonNum,
          episode.episode_number,
          episodeDetails,
        )
        enrichedEpisodes.push(enrichedEpisode)
      } else {
        logger.warn(`Failed to fetch episode details for S${seasonNum}E${episode.episode_number}`)
      }

      await new Promise<void>((resolve: () => void) => setTimeout(resolve, 250))
    }

    enrichedSeasons.push({
      seasonNumber: seasonNum,
      name: seasonDetails.name,
      overview: seasonDetails.overview,
      airDate: seasonDetails.air_date,
      episodeCount: seasonDetails.episode_count,
      episodes: enrichedEpisodes,
    })

    await new Promise<void>((resolve: () => void) => setTimeout(resolve, 500))
  }

  logger.info(
    `Enumeration complete for ${series.name}: ${enrichedSeasons.length} seasons, ` +
      `${enrichedSeasons.reduce((sum, s) => sum + s.episodes.length, 0)} episodes`,
  )

  return {
    seriesId: series.id,
    name: series.name,
    overview: series.overview,
    firstAirDate: series.firstAirDate,
    status: series.status,
    seasons: enrichedSeasons,
  }
}

/**
 * Discover Star Trek series from TMDB by searching predefined series list.
 * Supports filtering to specific series when provided.
 */
const discoverStarTrekSeries = async (
  logger: ReturnType<typeof createLogger>,
  filterSeries?: string,
): Promise<DiscoveredSeries[]> => {
  logger.info('Starting Star Trek series discovery')

  if (!process.env.TMDB_API_KEY) {
    logger.warn('TMDB_API_KEY not configured - series discovery will be limited')
    return []
  }

  const discovered: DiscoveredSeries[] = []

  // Filter series list if specific series requested
  const seriesToDiscover = filterSeries
    ? STAR_TREK_SERIES.filter((name: string) =>
        name.toLowerCase().includes(filterSeries.toLowerCase()),
      )
    : STAR_TREK_SERIES

  logger.info(`Searching for ${seriesToDiscover.length} Star Trek series`)

  for (const seriesName of seriesToDiscover) {
    logger.debug(`Searching for: ${seriesName}`)

    const seriesId = await searchSeries(seriesName, logger)
    if (!seriesId) {
      logger.warn(`Could not find TMDB ID for: ${seriesName}`)
      continue
    }

    logger.debug(`Found TMDB ID ${seriesId} for: ${seriesName}`)

    const details = await fetchSeriesDetails(seriesId, logger)
    if (details) {
      discovered.push(details)
      logger.info(
        `Discovered: ${details.name} (${details.numberOfSeasons} seasons, ${details.numberOfEpisodes} episodes)`,
      )
    }

    await new Promise<void>((resolve: () => void) => setTimeout(resolve, 250))
  }

  logger.info(`Discovery complete: Found ${discovered.length} series`)
  return discovered
}

const parseArguments = (args: string[]): GenerateDataOptions => {
  if (parseBooleanFlag(args, '--help')) {
    showHelpAndExit(HELP_TEXT)
  }

  const verbose = parseBooleanFlag(args, '--verbose')
  const dryRun = parseBooleanFlag(args, '--dry-run')
  const validate = !parseBooleanFlag(args, '--no-validate')

  const modeStr = parseStringValue(args, '--mode') ?? DEFAULT_OPTIONS.mode
  const mode = modeStr === 'incremental' ? 'incremental' : 'full'

  const series = parseStringValue(args, '--series')
  const output = parseStringValue(args, '--output') ?? DEFAULT_OPTIONS.output

  // Enforce strict validation: only 'full' or 'incremental' modes allowed
  if (modeStr !== 'full' && modeStr !== 'incremental') {
    showErrorAndExit(
      `Invalid mode: ${modeStr}. Must be 'full' or 'incremental'.`,
      EXIT_CODES.INVALID_ARGUMENTS,
    )
  }

  return {
    help: false,
    verbose,
    mode,
    series,
    dryRun,
    output,
    validate,
  }
}

const main = async (): Promise<void> => {
  const args = process.argv.slice(2)
  const options = parseArguments(args)

  loadEnv({verbose: options.verbose, required: false})

  const logger = createLogger({
    minLevel: options.verbose ? 'debug' : 'info',
    enabledCategories: ['metadata', 'api'],
    enableMetrics: true,
    persistLogs: false,
  })

  logger.info('Starting Star Trek data generation', {
    mode: options.mode,
    series: options.series ?? 'all',
    dryRun: options.dryRun,
    output: options.output,
    validate: options.validate,
  })

  if (options.verbose) {
    console.error('\n=== Metadata Source Availability ===')
    logMetadataSourceStatus()
    console.error('')
  }

  logger.debug('Initializing metadata sources')
  initializeMetadataSources()
  logger.info('Metadata sources initialized successfully')

  try {
    logger.info('Starting data fetching pipeline')

    const discoveredSeries = await discoverStarTrekSeries(logger, options.series)
    logger.info(`Discovered ${discoveredSeries.length} Star Trek series`, {
      series: discoveredSeries.map((s: DiscoveredSeries) => s.name),
    })

    logger.info('Starting season/episode enumeration')
    const enrichedSeriesData: EnrichedSeriesData[] = []

    for (const series of discoveredSeries) {
      const enrichedData = await enumerateSeriesEpisodes(series, logger)
      enrichedSeriesData.push(enrichedData)
    }

    logger.info('Episode enumeration complete', {
      seriesCount: enrichedSeriesData.length,
      totalEpisodes: enrichedSeriesData.reduce(
        (sum, s) =>
          sum + s.seasons.reduce((seasonSum, season) => seasonSum + season.episodes.length, 0),
        0,
      ),
    })

    // TASK-015: Movie discovery (implementation follows)
    logger.debug('Movie discovery will be implemented next')

    // TASK-016: Data normalization (implementation follows)
    logger.debug('Data normalization pipeline will be implemented next')

    // TASK-017: Era classification (implementation follows)
    logger.debug('Era classification will be implemented next')

    // TASK-018: Chronological ordering (implementation follows)
    logger.debug('Chronological ordering will be implemented next')

    // TASK-019: Code generation templates (implementation follows)
    logger.debug('Code generation templates will be implemented next')

    // TASK-020: Intelligent merging (implementation follows)
    logger.debug('Intelligent merging will be implemented next')

    if (options.dryRun) {
      logger.info('Dry-run mode: No files will be modified')
      logger.info('Preview of enriched data:', {
        seriesCount: enrichedSeriesData.length,
        seriesNames: enrichedSeriesData.map((s: EnrichedSeriesData) => s.name),
        sampleEpisodes: enrichedSeriesData.slice(0, 2).map((s: EnrichedSeriesData) => ({
          series: s.name,
          firstEpisode: s.seasons[0]?.episodes[0],
        })),
      })
    } else {
      // TASK-022: File writing (implementation follows)
      logger.info('Generation complete', {outputPath: resolve(options.output)})
    }

    if (options.validate && !options.dryRun) {
      // TASK-021: Validation integration
      logger.info('Running validation')
      // Integration with validate-episode-data.ts will be implemented
    }

    logger.info('Data generation completed successfully')
  } catch (error: unknown) {
    if (error instanceof Error) {
      const errorDetails: {name: string; message: string; stack?: string} = {
        name: error.name,
        message: error.message,
      }
      if (error.stack) {
        errorDetails.stack = error.stack
      }
      logger.error('Data generation failed', {error: errorDetails})
    } else {
      logger.error('Data generation failed', {
        error: {name: 'UnknownError', message: String(error)},
      })
    }
    throw error
  }
}

main().catch((error: Error) => {
  console.error('Fatal error during data generation:')
  console.error(error.message)
  if (error.stack) {
    console.error('\nStack trace:')
    console.error(error.stack)
  }
  process.exit(EXIT_CODES.FATAL_ERROR)
})
