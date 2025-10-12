/**
 * Automated Star Trek data generation script.
 *
 * Generates src/data/star-trek-data.ts by fetching episode and movie metadata from multiple
 * sources (TMDB, Memory Alpha, TrekCore, STAPI), validating quality, and organizing content
 * chronologically. Integrates with production metadata modules for consistency and reliability.
 *
 * Key capabilities: multi-source fetching, quality scoring (0.6 minimum threshold), automatic
 * rate limiting, error tracking, and health monitoring with source fallback.
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
 *
 * Environment Variables:
 *   TMDB_API_KEY         TMDB API Read Access Token (optional, enables enhanced metadata)
 *   DEBUG                Enable verbose debug logging (default: false)
 *   MIN_METADATA_QUALITY Minimum quality threshold 0-1 (default: 0.6)
 *
 * For comprehensive documentation, see: docs/data-generation.md
 */

import type {MetadataSource, MetadataSourceInstance} from '../src/modules/types.js'
import {resolve} from 'node:path'
import process from 'node:process'
import {withErrorHandling} from '../src/modules/error-handler.js'
import {createLogger} from '../src/modules/logger.js'
import {
  createQualityScorer,
  DEFAULT_QUALITY_SCORING_CONFIG,
} from '../src/modules/metadata-quality.js'
import {createMetadataSources} from '../src/modules/metadata-sources.js'
import {
  EXIT_CODES,
  loadEnv,
  parseBooleanFlag,
  parseStringValue,
  showErrorAndExit,
  showHelpAndExit,
  type BaseCLIOptions,
} from './lib/cli-utils.js'
import {
  detectDuplicateIds,
  formatQualityReport,
  generateDataDiff,
  generateQualityReport,
  generateSeriesCode,
  MINIMUM_QUALITY_THRESHOLD,
  type NormalizedEpisodeItem,
  type NormalizedEra,
  type NormalizedMovieItem,
  type NormalizedSeasonItem,
} from './lib/data-quality.js'
import {getMetadataConfig, logMetadataSourceStatus} from './lib/source-config.js'

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

/**
 * TMDB movie search result structure.
 */
interface TMDBMovieSearchResult {
  page: number
  results: {
    id: number
    title: string
    original_title: string
    release_date: string
    overview: string
  }[]
  total_pages: number
  total_results: number
}

/**
 * TMDB movie details response structure.
 */
interface TMDBMovieDetails {
  id: number
  title: string
  original_title: string
  release_date: string
  overview: string
  runtime: number | null
  budget: number
  revenue: number
  vote_average: number
  vote_count: number
  status: string
}

/**
 * TMDB movie credits response structure.
 */
interface TMDBMovieCredits {
  id: number
  cast: {
    id: number
    name: string
    character: string
    order: number
  }[]
  crew: {
    id: number
    name: string
    job: string
    department: string
  }[]
}

/**
 * Enriched movie data combining TMDB metadata.
 */
interface EnrichedMovieData {
  /** Movie ID in VBS format (e.g., 'tmp', 'twok') */
  movieId: string
  /** TMDB movie ID */
  tmdbId: number
  /** Movie title */
  title: string
  /** Release date (YYYY-MM-DD format) */
  releaseDate: string
  /** Movie overview/synopsis */
  overview: string
  /** Runtime in minutes */
  runtime: number | null
  /** Director name(s) */
  director?: string | undefined
  /** Writer name(s) */
  writer?: string | undefined
  /** Lead cast members */
  cast?: string[] | undefined
  /** TMDB vote average */
  voteAverage?: number | undefined
  /** TMDB vote count */
  voteCount?: number | undefined
}

interface GenerateDataOptions extends BaseCLIOptions {
  mode: 'full' | 'incremental'
  series?: string | undefined
  dryRun: boolean
  output: string
  validate: boolean
}

/**
 * Error tracking structure for comprehensive error reporting.
 */
interface ErrorTracker {
  /** Total errors encountered */
  totalErrors: number
  /** Errors by category (network, rate-limit, data-format, etc.) */
  errorsByCategory: Map<string, number>
  /** Errors by source API */
  errorsBySource: Map<string, number>
  /** Failed episode IDs for retry guidance */
  failedEpisodes: string[]
  /** Detailed error messages with context */
  errorDetails: {
    episodeId: string
    category: string
    message: string
    sourceApi: string
    timestamp: Date
  }[]
}

/**
 * Health monitoring structure for API sources.
 */
interface HealthMonitor {
  /** Health check results by source */
  healthBySource: Map<
    string,
    {
      isHealthy: boolean
      consecutiveFailures: number
      lastCheck: Date
    }
  >
  /** Sources that have been marked unhealthy */
  unhealthySources: string[]
}

/**
 * Quality threshold constants.
 * MINIMUM_QUALITY_THRESHOLD (0.6) imported from data-quality.ts
 * Target threshold for good quality average (75%)
 */
const QUALITY_THRESHOLD_TARGET = 0.75 // Target average quality score (good grade)

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
 * Known Star Trek movies with their titles for discovery via TMDB search.
 * Includes theatrical releases, TV movies, and special presentations.
 */
const STAR_TREK_MOVIES = [
  'Star Trek: The Motion Picture',
  'Star Trek II: The Wrath of Khan',
  'Star Trek III: The Search for Spock',
  'Star Trek IV: The Voyage Home',
  'Star Trek V: The Final Frontier',
  'Star Trek VI: The Undiscovered Country',
  'Star Trek: Generations',
  'Star Trek: First Contact',
  'Star Trek: Insurrection',
  'Star Trek: Nemesis',
  'Star Trek',
  'Star Trek Into Darkness',
  'Star Trek Beyond',
] as const

/**
 * Movie ID mapping for generating VBS-compatible identifiers.
 * Maps normalized movie titles to short IDs used throughout VBS.
 */
const MOVIE_ID_MAP: Record<string, string> = {
  'the motion picture': 'tmp',
  'ii: the wrath of khan': 'twok',
  'the wrath of khan': 'twok',
  'iii: the search for spock': 'tsfs',
  'the search for spock': 'tsfs',
  'iv: the voyage home': 'tvh',
  'the voyage home': 'tvh',
  'v: the final frontier': 'tff',
  'the final frontier': 'tff',
  'vi: the undiscovered country': 'tuc',
  'the undiscovered country': 'tuc',
  generations: 'gen',
  'first contact': 'fc',
  insurrection: 'ins',
  nemesis: 'nem',
  'star trek': 'st2009',
  'into darkness': 'stid',
  beyond: 'stb',
} as const

/**
 * Rate limiting delay between TMDB API requests (milliseconds).
 * TMDB quota: 40 requests per 10 seconds, so 250ms = 4 req/s is safe.
 */
const TMDB_RATE_LIMIT_MS = 250

/**
 * Fetch series details from TMDB by series ID.
 * Uses modern TMDB API authentication with Bearer token (API Read Access Token).
 */
const fetchSeriesDetails = async (
  seriesId: number,
  logger: ReturnType<typeof createLogger>,
): Promise<DiscoveredSeries | null> => {
  return withErrorHandling(async () => {
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

    const response = await fetch(url, {headers})
    if (!response.ok) {
      logger.error('TMDB API error for series', {
        status: response.status,
        seriesId,
        guidance:
          response.status === 429
            ? 'Rate limit exceeded. Wait before retrying.'
            : response.status === 401
              ? 'Authentication failed. Check TMDB_API_KEY is valid.'
              : response.status >= 500
                ? 'TMDB service unavailable. Retry later.'
                : 'Invalid request. Check series ID.',
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
  }, `fetch-series-details-${seriesId}`)()
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
 * Search TMDB for a specific Star Trek movie by title.
 * Uses modern TMDB API authentication with Bearer token (API Read Access Token).
 */
const searchMovie = async (
  movieTitle: string,
  logger: ReturnType<typeof createLogger>,
): Promise<number | null> => {
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) {
    return null
  }

  const url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(movieTitle)}`
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }

  try {
    const response = await fetch(url, {headers})
    if (!response.ok) {
      logger.error('TMDB search error', {movieTitle, status: response.status})
      return null
    }

    const data = (await response.json()) as TMDBMovieSearchResult

    const match = data.results.find(
      (result: TMDBMovieSearchResult['results'][number]) =>
        result.title.toLowerCase().includes('star trek') &&
        (result.title
          .toLowerCase()
          .includes(movieTitle.toLowerCase().replace('star trek', '').trim()) ||
          movieTitle.toLowerCase().includes(result.title.toLowerCase())),
    )

    if (match) {
      logger.info(`Found movie: ${match.title} (ID: ${match.id})`)
    }

    return match?.id ?? null
  } catch (error: unknown) {
    const errorDetails = {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error),
    }
    logger.error('Failed to search for movie', {movieTitle, error: errorDetails})
    return null
  }
}

/**
 * Fetch movie details from TMDB by movie ID.
 * Uses modern TMDB API authentication with Bearer token (API Read Access Token).
 */
const fetchMovieDetails = async (
  movieId: number,
  logger: ReturnType<typeof createLogger>,
): Promise<TMDBMovieDetails | null> => {
  return withErrorHandling(async () => {
    const apiKey = process.env.TMDB_API_KEY
    if (!apiKey) {
      return null
    }

    const url = `https://api.themoviedb.org/3/movie/${movieId}`
    const headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }

    const response = await fetch(url, {headers})
    if (!response.ok) {
      logger.error('TMDB API error for movie', {
        status: response.status,
        movieId,
        guidance:
          response.status === 429
            ? 'Rate limit exceeded. Implement exponential backoff.'
            : response.status === 404
              ? 'Movie not found. Verify TMDB movie ID.'
              : 'API error - check TMDB service status.',
      })
      return null
    }

    const data = (await response.json()) as TMDBMovieDetails
    return data
  }, `fetch-movie-details-${movieId}`)()
}

/**
 * Fetch movie credits (cast and crew) from TMDB.
 * Extracts director, writer, and lead cast information.
 */
const fetchMovieCredits = async (
  movieId: number,
  logger: ReturnType<typeof createLogger>,
): Promise<TMDBMovieCredits | null> => {
  return withErrorHandling(async () => {
    const apiKey = process.env.TMDB_API_KEY
    if (!apiKey) {
      return null
    }

    const url = `https://api.themoviedb.org/3/movie/${movieId}/credits`
    const headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }

    const response = await fetch(url, {headers})
    if (!response.ok) {
      logger.error('TMDB API error for movie credits', {
        status: response.status,
        movieId,
        guidance: 'Credits endpoint unavailable. Movie details will be incomplete.',
      })
      return null
    }

    const data = (await response.json()) as TMDBMovieCredits
    return data
  }, `fetch-movie-credits-${movieId}`)()
}

/**
 * Generate VBS movie ID from movie title.
 * Examples: "Star Trek: The Motion Picture" → "tmp", "Star Trek II: The Wrath of Khan" → "twok"
 */
const generateMovieId = (movieTitle: string): string => {
  const normalized = movieTitle
    .toLowerCase()
    .replace(/^star trek:?\s*/i, '')
    .trim()

  return MOVIE_ID_MAP[normalized] ?? normalized.replaceAll(/\s+/g, '').slice(0, 6)
}

/**
 * Transform TMDB movie data to VBS format with crew information.
 * Extracts director, writers, and top cast members from TMDB credits.
 */
const enrichMovieData = (
  movieTitle: string,
  tmdbMovie: TMDBMovieDetails,
  tmdbCredits: TMDBMovieCredits | null,
): EnrichedMovieData => {
  const directors =
    tmdbCredits?.crew.filter(crew => crew.job === 'Director').map(crew => crew.name) ?? []
  const writers =
    tmdbCredits?.crew
      .filter(crew => crew.job === 'Writer' || crew.job === 'Screenplay')
      .map(crew => crew.name) ?? []
  const leadCast = tmdbCredits?.cast.slice(0, 5).map(actor => actor.name) ?? []

  return {
    movieId: generateMovieId(movieTitle),
    tmdbId: tmdbMovie.id,
    title: tmdbMovie.title,
    releaseDate: tmdbMovie.release_date,
    overview: tmdbMovie.overview,
    runtime: tmdbMovie.runtime,
    director: directors.length > 0 ? directors.join(', ') : undefined,
    writer: writers.length > 0 ? writers.join(', ') : undefined,
    cast: leadCast.length > 0 ? leadCast : undefined,
    voteAverage: tmdbMovie.vote_average > 0 ? tmdbMovie.vote_average : undefined,
    voteCount: tmdbMovie.vote_count > 0 ? tmdbMovie.vote_count : undefined,
  }
}

/**
 * Discover Star Trek movies from TMDB by searching predefined movie list.
 * Rate limits requests to respect TMDB quota (40 req/10s).
 */
const discoverStarTrekMovies = async (
  logger: ReturnType<typeof createLogger>,
): Promise<EnrichedMovieData[]> => {
  logger.info('Starting Star Trek movie discovery')

  if (!process.env.TMDB_API_KEY) {
    logger.warn('TMDB_API_KEY not configured - movie discovery skipped')
    return []
  }

  const discovered: EnrichedMovieData[] = []

  logger.info(`Searching for ${STAR_TREK_MOVIES.length} Star Trek movies`)

  for (const movieTitle of STAR_TREK_MOVIES) {
    await new Promise(resolve => setTimeout(resolve, TMDB_RATE_LIMIT_MS))

    const movieId = await searchMovie(movieTitle, logger)
    if (!movieId) {
      logger.warn(`Movie not found: ${movieTitle}`)
      continue
    }

    const movieDetails = await fetchMovieDetails(movieId, logger)
    if (!movieDetails) {
      logger.warn(`Failed to fetch details for movie ID ${movieId}`)
      continue
    }

    await new Promise(resolve => setTimeout(resolve, TMDB_RATE_LIMIT_MS))

    const movieCredits = await fetchMovieCredits(movieId, logger)

    const enrichedMovie = enrichMovieData(movieTitle, movieDetails, movieCredits)
    discovered.push(enrichedMovie)

    logger.info(
      `Discovered movie: ${enrichedMovie.title} (${enrichedMovie.releaseDate?.slice(0, 4) ?? 'unknown year'})`,
    )
  }

  logger.info(`Movie discovery complete: Found ${discovered.length} movies`)
  return discovered
}

/**
 * NOTE: Normalized data types (NormalizedEra, NormalizedSeasonItem, NormalizedEpisodeItem, NormalizedMovieItem)
 * are imported from data-quality.ts to ensure consistency across validation and generation.
 */

/**
 * Complete normalized data ready for code generation.
 * Includes all eras with their content normalized to VBS format.
 */
interface NormalizedData {
  /** All chronological eras */
  eras: NormalizedEra[]
  /** Generation metadata */
  metadata: {
    /** Generation timestamp */
    generatedAt: string
    /** TMDB series count */
    seriesCount: number
    /** TMDB movie count */
    movieCount: number
    /** Total episodes */
    episodeCount: number
  }
}

const PLACEHOLDER_STARDATE = 'None'
const PLACEHOLDER_YEAR = 'TBD'
const PLACEHOLDER_MOVIE_STARDATE = 'Stardate TBD'

/**
 * Normalize enriched episode data to VBS format.
 * Transforms TMDB episode metadata into target star-trek-data.ts structure.
 */
const normalizeEpisode = (episode: EnrichedEpisodeData): NormalizedEpisodeItem => {
  const normalized: NormalizedEpisodeItem = {
    id: episode.episodeId,
    title: episode.title,
    season: episode.season,
    episode: episode.episode,
    airDate: episode.airDate,
    stardate: PLACEHOLDER_STARDATE,
    synopsis: episode.overview,
    connections: [],
  }

  if (episode.guestStars !== undefined) {
    normalized.guestStars = episode.guestStars
  }

  return normalized
}

/**
 * Normalize enriched season data to VBS format.
 */
const normalizeSeason = (seriesName: string, season: EnrichedSeasonData): NormalizedSeasonItem => {
  const seriesCode = generateSeriesCode(seriesName)
  const seasonId = `${seriesCode}_s${season.seasonNumber}`

  const airYear = season.airDate
    ? new Date(season.airDate).getFullYear().toString()
    : PLACEHOLDER_YEAR

  return {
    id: seasonId,
    title: `${seriesName} Season ${season.seasonNumber}`,
    type: 'series',
    year: airYear,
    stardate: `~${season.seasonNumber}.1-${season.seasonNumber}.${season.episodeCount}`,
    episodes: season.episodeCount,
    episodeData: season.episodes.map(normalizeEpisode),
  }
}

/**
 * Normalize enriched movie data to VBS format.
 */
const normalizeMovie = (movie: EnrichedMovieData): NormalizedMovieItem => {
  const releaseYear = movie.releaseDate
    ? new Date(movie.releaseDate).getFullYear().toString()
    : PLACEHOLDER_YEAR

  const normalized: NormalizedMovieItem = {
    id: movie.movieId,
    title: movie.title,
    type: 'movie',
    year: releaseYear,
    stardate: PLACEHOLDER_MOVIE_STARDATE,
    notes: movie.overview,
  }

  // Convert string fields to arrays to match NormalizedMovieItem interface
  if (movie.director !== undefined) {
    normalized.director = [movie.director]
  }

  if (movie.writer !== undefined) {
    normalized.writer = [movie.writer]
  }

  if (movie.cast !== undefined) {
    normalized.cast = movie.cast
  }

  return normalized
}

const normalizeSeries = (series: EnrichedSeriesData): NormalizedSeasonItem[] => {
  return series.seasons.map(season => normalizeSeason(series.name, season))
}

/**
 * Source priority for data merging.
 * Higher priority sources override data from lower priority sources.
 */
const SOURCE_PRIORITY = {
  'memory-alpha': 3,
  tmdb: 2,
  trekcore: 1,
  stapi: 1,
} as const

/**
 * Merge episode data from multiple sources using priority-based resolution.
 * Priority: Memory Alpha > TMDB > TrekCore > STAPI
 *
 * Currently only TMDB is implemented, but this function is prepared for
 * future integration with Memory Alpha, TrekCore, and STAPI sources.
 *
 * @param episodeData - Array of episode data from different sources
 * @returns Merged episode data with highest priority values
 */
export const mergeEpisodeFromSources = (
  episodeData: (Partial<EnrichedEpisodeData> & {source: string})[],
): EnrichedEpisodeData | null => {
  if (episodeData.length === 0) {
    return null
  }

  const sorted = [...episodeData].sort((a, b) => {
    const priorityA = SOURCE_PRIORITY[a.source as keyof typeof SOURCE_PRIORITY] ?? 0
    const priorityB = SOURCE_PRIORITY[b.source as keyof typeof SOURCE_PRIORITY] ?? 0
    return priorityB - priorityA
  })

  const merged = {...sorted[0]} as EnrichedEpisodeData

  for (const data of sorted.slice(1)) {
    if (merged.title == null && data.title != null) merged.title = data.title
    if (merged.overview == null && data.overview != null) merged.overview = data.overview
    if (merged.airDate == null && data.airDate != null) merged.airDate = data.airDate
    if (merged.runtime == null && data.runtime != null) merged.runtime = data.runtime
    if (merged.director == null && data.director != null) merged.director = data.director
    if (merged.writer == null && data.writer != null) merged.writer = data.writer
    if (merged.guestStars == null && data.guestStars != null) merged.guestStars = data.guestStars
    if (merged.voteAverage == null && data.voteAverage != null)
      merged.voteAverage = data.voteAverage
    if (merged.voteCount == null && data.voteCount != null) merged.voteCount = data.voteCount
  }

  return merged
}

/**
 * Merge movie data from multiple sources using priority-based resolution.
 * Priority: Memory Alpha > TMDB > TrekCore > STAPI
 *
 * Currently only TMDB is implemented, but this function is prepared for
 * future integration with Memory Alpha, TrekCore, and STAPI sources.
 *
 * @param movieData - Array of movie data from different sources
 * @returns Merged movie data with highest priority values
 */
export const mergeMovieFromSources = (
  movieData: (Partial<EnrichedMovieData> & {source: string})[],
): EnrichedMovieData | null => {
  if (movieData.length === 0) {
    return null
  }

  const sorted = [...movieData].sort((a, b) => {
    const priorityA = SOURCE_PRIORITY[a.source as keyof typeof SOURCE_PRIORITY] ?? 0
    const priorityB = SOURCE_PRIORITY[b.source as keyof typeof SOURCE_PRIORITY] ?? 0
    return priorityB - priorityA
  })

  const merged = {...sorted[0]} as EnrichedMovieData

  for (const data of sorted.slice(1)) {
    if (merged.title == null && data.title != null) merged.title = data.title
    if (merged.overview == null && data.overview != null) merged.overview = data.overview
    if (merged.releaseDate == null && data.releaseDate != null)
      merged.releaseDate = data.releaseDate
    if (merged.runtime == null && data.runtime != null) merged.runtime = data.runtime
    if (merged.director == null && data.director != null) merged.director = data.director
    if (merged.writer == null && data.writer != null) merged.writer = data.writer
    if (merged.cast == null && data.cast != null) merged.cast = data.cast
    if (merged.voteAverage == null && data.voteAverage != null)
      merged.voteAverage = data.voteAverage
    if (merged.voteCount == null && data.voteCount != null) merged.voteCount = data.voteCount
  }

  return merged
}

/**
 * Conflict resolution for when multiple sources provide different values for same field.
 * Uses source priority to determine which value to keep.
 *
 * Currently prepared for future use when multiple sources are integrated.
 *
 * @param values - Array of {value, source} tuples
 * @returns Resolved value from highest priority source
 */
export const resolveConflict = <T>(values: {value: T; source: string}[]): T | undefined => {
  if (values.length === 0) {
    return undefined
  }

  const sorted = [...values].sort((a, b) => {
    const priorityA = SOURCE_PRIORITY[a.source as keyof typeof SOURCE_PRIORITY] ?? 0
    const priorityB = SOURCE_PRIORITY[b.source as keyof typeof SOURCE_PRIORITY] ?? 0
    return priorityB - priorityA
  })

  const firstValue = sorted[0]
  if (firstValue == null) {
    return undefined
  }

  return firstValue.value
}

/**
 * Era IDs for type-safe classification.
 * Represents the chronological eras in Star Trek universe.
 */
type EraId =
  | 'enterprise'
  | 'discovery_snw'
  | 'tos_era'
  | 'tng_era'
  | 'picard_era'
  | 'far_future'
  | 'kelvin_timeline'

/**
 * Era definition mapping for chronological classification.
 * Maps series/movie identifiers to their corresponding Star Trek eras.
 */
interface EraDefinition {
  /** Era ID for VBS format */
  id: EraId
  /** Display title for era */
  title: string
  /** Year range (in-universe chronology) */
  years: string
  /** Stardate system description */
  stardates: string
  /** Era description */
  description: string
  /** Series codes belonging to this era */
  seriesCodes: string[]
  /** Movie IDs belonging to this era */
  movieIds: string[]
  /** Sort order for chronological display */
  sortOrder: number
}

/**
 * Chronological era definitions for Star Trek content.
 * Based on in-universe timeline and narrative continuity.
 *
 * Note: Discovery series spans multiple eras - seasons 1-2 are in
 * discovery_snw era, while seasons 3+ are in far_future era.
 */
const ERA_DEFINITIONS: EraDefinition[] = [
  {
    id: 'enterprise',
    title: '22nd Century – Enterprise Era',
    years: '2151–2161',
    stardates: 'Earth years & simple logs',
    description: 'The beginning of human space exploration and first contact protocols',
    seriesCodes: ['ent'],
    movieIds: [],
    sortOrder: 1,
  },
  {
    id: 'discovery_snw',
    title: 'Mid-23rd Century – Discovery & Strange New Worlds Era',
    years: '2256–2259',
    stardates: 'Four-digit stardates',
    description: "The era of the USS Discovery and Captain Pike's Enterprise",
    seriesCodes: ['dis', 'snw'],
    movieIds: [],
    sortOrder: 2,
  },
  {
    id: 'tos_era',
    title: '23rd Century – Original Series Era',
    years: '2265–2293',
    stardates: 'Four-digit stardates',
    description: 'The original five-year mission and beyond',
    seriesCodes: ['tos', 'tas'],
    movieIds: ['tmp', 'twok', 'tsfs', 'tvh', 'tff', 'tuc'],
    sortOrder: 3,
  },
  {
    id: 'tng_era',
    title: '24th Century – Next Generation Era',
    years: '2364–2379',
    stardates: 'Five-digit stardates (41xxx-5xxxx)',
    description:
      'The Next Generation, Deep Space Nine, and Voyager running concurrently across the Alpha and Delta Quadrants',
    seriesCodes: ['tng', 'ds9', 'voy'],
    movieIds: ['gen', 'fc', 'ins', 'nem'],
    sortOrder: 4,
  },
  {
    id: 'picard_era',
    title: '25th Century – Picard Era',
    years: '2399–2401',
    stardates: 'Five-digit stardates',
    description: 'The return of Jean-Luc Picard and the evolving Federation',
    seriesCodes: ['pic', 'ld', 'pro'],
    movieIds: [],
    sortOrder: 5,
  },
  {
    id: 'far_future',
    title: '32nd Century – Far Future',
    years: '3188+',
    stardates: 'Post-Burn chronology',
    description: 'The distant future after the Burn event',
    seriesCodes: ['dis'],
    movieIds: [],
    sortOrder: 6,
  },
  {
    id: 'kelvin_timeline',
    title: 'Kelvin Timeline',
    years: '2233–2263 (Alternate Reality)',
    stardates: 'Alternate timeline stardates',
    description: "The alternate reality created by Nero's temporal incursion",
    seriesCodes: [],
    movieIds: ['st2009', 'stid', 'stb'],
    sortOrder: 7,
  },
]

/**
 * Classify a series by name into its corresponding era.
 * Uses series code mapping and era definitions.
 *
 * @returns Era ID if classified, null if series is unrecognized
 */
const classifySeries = (seriesName: string): EraId | null => {
  const seriesCode = generateSeriesCode(seriesName)
  const era = ERA_DEFINITIONS.find(e => e.seriesCodes.includes(seriesCode))
  return era?.id ?? null
}

/**
 * Classify a movie by its ID into its corresponding era.
 * Uses movie ID mapping and era definitions.
 *
 * @returns Era ID if classified, null if movie is unrecognized
 */
const classifyMovie = (movieId: string): EraId | null => {
  const era = ERA_DEFINITIONS.find(e => e.movieIds.includes(movieId))
  return era?.id ?? null
}

/**
 * Special handling for Discovery series which spans multiple eras.
 * Seasons 1-2 are in Discovery/SNW era, Seasons 3+ are in Far Future era.
 *
 * @param seasonNumber - Season number to classify
 * @returns Era ID for the Discovery season
 */
const classifyDiscoverySeason = (seasonNumber: number): EraId => {
  return seasonNumber <= 2 ? 'discovery_snw' : 'far_future'
}

/**
 * Group normalized items into chronological eras.
 * Handles special cases like Discovery spanning multiple eras.
 */
const groupItemsByEra = (
  seasonItems: NormalizedSeasonItem[],
  movieItems: NormalizedMovieItem[],
  logger: ReturnType<typeof createLogger>,
): NormalizedEra[] => {
  logger.info('Grouping content into chronological eras')

  const eraItemsMap = new Map<EraId, (NormalizedSeasonItem | NormalizedMovieItem)[]>()

  const addToEra = (eraId: EraId, item: NormalizedSeasonItem | NormalizedMovieItem): void => {
    const items = eraItemsMap.get(eraId) ?? []
    items.push(item)
    eraItemsMap.set(eraId, items)
  }

  for (const season of seasonItems) {
    const seriesName = season.title.replace(/\s+Season\s+\d+$/i, '').trim()
    let eraId = classifySeries(seriesName)

    if (seriesName.toLowerCase().includes('discovery')) {
      const seasonMatch = season.id.match(/_s(\d+)$/)
      const seasonNumber = seasonMatch?.[1] ? Number.parseInt(seasonMatch[1], 10) : 1
      eraId = classifyDiscoverySeason(seasonNumber)
    }

    if (eraId === null) {
      logger.warn(`Unable to classify series: ${seriesName}`, {seasonId: season.id})
      continue
    }

    addToEra(eraId, season)
  }

  for (const movie of movieItems) {
    const eraId = classifyMovie(movie.id)

    if (eraId === null) {
      logger.warn(`Unable to classify movie: ${movie.title}`, {movieId: movie.id})
      continue
    }

    addToEra(eraId, movie)
  }

  const eras: NormalizedEra[] = ERA_DEFINITIONS.filter(eraDef => eraItemsMap.has(eraDef.id))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(eraDef => {
      const items = eraItemsMap.get(eraDef.id) ?? []
      return {
        id: eraDef.id,
        title: eraDef.title,
        years: eraDef.years,
        stardates: eraDef.stardates,
        description: eraDef.description,
        items,
      }
    })

  logger.info('Era classification complete', {
    eraCount: eras.length,
    eraBreakdown: eras.map(era => ({id: era.id, itemCount: era.items.length})),
  })

  return eras
}

/**
 * Extract numeric year from year string for sorting.
 * Returns Infinity for placeholders to ensure they sort after known dates.
 */
const extractYearForSorting = (yearString: string): number => {
  if (yearString === 'TBD' || !yearString) {
    return Infinity
  }

  const match = yearString.match(/^\d{4}/)
  return match ? Number.parseInt(match[0], 10) : Infinity
}

/**
 * Extract numeric stardate for sorting across different era formats.
 * Returns Infinity for placeholders to maintain sort stability.
 */
const extractStardateForSorting = (stardateString: string): number => {
  if (stardateString === 'None' || stardateString === 'TBD' || stardateString === 'Stardate TBD') {
    return Infinity
  }

  const stardatePatterns = [/~?(\d+)\.(\d+)/, /Stardate\s+(\d+)\.(\d+)/, /(\d+)\.(\d+)-/]

  for (const pattern of stardatePatterns) {
    const match = stardateString.match(pattern)
    if (match?.[1] != null && match?.[2] != null) {
      const wholePart = Number.parseInt(match[1], 10)
      const decimalPart = Number.parseInt(match[2], 10)
      return wholePart + decimalPart / 100
    }
  }

  return Infinity
}

/**
 * Compare items chronologically using in-universe timeline markers.
 * Primary sort: year, Secondary sort: stardate for fine-grained ordering.
 */
const compareItemsChronologically = (
  a: NormalizedSeasonItem | NormalizedMovieItem,
  b: NormalizedSeasonItem | NormalizedMovieItem,
): number => {
  const yearA = extractYearForSorting(a.year)
  const yearB = extractYearForSorting(b.year)

  if (yearA !== yearB) {
    return yearA - yearB
  }

  const stardateA = extractStardateForSorting(a.stardate)
  const stardateB = extractStardateForSorting(b.stardate)

  return stardateA - stardateB
}

/**
 * Sort episodes by real-world air date for accurate chronological ordering.
 * Falls back to episode number when air dates are invalid.
 */
const sortEpisodesChronologically = (
  episodes: NormalizedEpisodeItem[],
): NormalizedEpisodeItem[] => {
  return [...episodes].sort((a, b) => {
    const dateA = new Date(a.airDate).getTime()
    const dateB = new Date(b.airDate).getTime()

    if (!Number.isNaN(dateA) && !Number.isNaN(dateB)) {
      return dateA - dateB
    }

    return a.episode - b.episode
  })
}

/**
 * Apply chronological ordering to era items and nested episodes.
 * Maintains immutability by creating new objects rather than mutating.
 */
const sortEraChronologically = (era: NormalizedEra): NormalizedEra => {
  const sortedItems = [...era.items].sort(compareItemsChronologically).map(item => {
    // Type guard: only seasons have episodeData
    if (item.type !== 'movie' && 'episodeData' in item && item.episodeData !== undefined) {
      return {
        ...item,
        episodeData: sortEpisodesChronologically(item.episodeData),
      } as NormalizedSeasonItem
    }
    return item
  })

  return {
    ...era,
    items: sortedItems,
  }
}

/**
 * Apply chronological ordering to all eras based on in-universe timelines.
 */
const applyChronologicalOrdering = (eras: NormalizedEra[]): NormalizedEra[] => {
  return eras.map(sortEraChronologically)
}

/**
 * Create data normalization pipeline with era classification.
 * Transforms enriched metadata into VBS format grouped by chronological eras.
 */
const createNormalizationPipeline = (
  allSeries: EnrichedSeriesData[],
  allMovies: EnrichedMovieData[],
  logger: ReturnType<typeof createLogger>,
): NormalizedData => {
  logger.info('Starting data normalization pipeline')

  const allSeasonItems: NormalizedSeasonItem[] = allSeries.flatMap(normalizeSeries)

  const allMovieItems: NormalizedMovieItem[] = allMovies.map(normalizeMovie)

  const totalEpisodes = allSeasonItems.reduce(
    (sum, season) => sum + (season.episodeData?.length ?? 0),
    0,
  )

  logger.info('Normalization complete', {
    seasonItems: allSeasonItems.length,
    movieItems: allMovieItems.length,
    totalEpisodes,
  })

  const eras = groupItemsByEra(allSeasonItems, allMovieItems, logger)

  logger.info('Applying chronological ordering to eras')
  const sortedEras = applyChronologicalOrdering(eras)

  logger.info('Chronological ordering complete', {
    eraCount: sortedEras.length,
  })

  return {
    eras: sortedEras,
    metadata: {
      generatedAt: new Date().toISOString(),
      seriesCount: allSeries.length,
      movieCount: allMovies.length,
      episodeCount: totalEpisodes,
    },
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
  return withErrorHandling(async () => {
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

    const response = await fetch(url, {headers})
    if (!response.ok) {
      logger.error('TMDB API error for season', {
        status: response.status,
        seriesId,
        seasonNumber,
        guidance:
          response.status === 404
            ? 'Season not found. Verify season number is valid for this series.'
            : response.status === 429
              ? 'Rate limit reached. Token bucket will handle retry automatically.'
              : 'Check TMDB service availability and API credentials.',
      })
      return null
    }

    const data = (await response.json()) as TMDBSeasonDetails
    return data
  }, `fetch-season-details-${seriesId}-s${seasonNumber}`)()
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
 * Enumerate all seasons and episodes for a discovered series using production metadata sources.
 * Uses token bucket rate limiting from metadata-sources module (no manual delays needed).
 */
const enumerateSeriesEpisodes = async (
  series: DiscoveredSeries,
  logger: ReturnType<typeof createLogger>,
  metadataSources: MetadataSourceInstance,
): Promise<EnrichedSeriesData> => {
  logger.info(`Enumerating episodes for: ${series.name}`)

  const enrichedSeasons: EnrichedSeasonData[] = []
  const qualityStats = {
    totalProcessed: 0,
    totalFiltered: 0,
    scores: [] as number[],
    gradeDistribution: {excellent: 0, good: 0, acceptable: 0, poor: 0},
    commonMissingFields: new Map<string, number>(),
  }

  for (let seasonNum = 1; seasonNum <= series.numberOfSeasons; seasonNum++) {
    logger.debug(`Fetching season ${seasonNum} of ${series.numberOfSeasons}`)

    const seasonDetails = await fetchSeasonDetails(series.id, seasonNum, logger)
    if (!seasonDetails) {
      logger.warn(`Failed to fetch season ${seasonNum} for ${series.name}`)
      continue
    }

    const enrichedEpisodes: EnrichedEpisodeData[] = []
    const qualityScorer = createQualityScorer(DEFAULT_QUALITY_SCORING_CONFIG)
    let filteredCount = 0

    const metadataSourceMap: Record<string, MetadataSource> = {
      'memory-alpha': {
        name: 'Memory Alpha',
        type: 'memory-alpha',
        baseUrl: 'https://memory-alpha.fandom.com',
        confidenceLevel: 0.9,
        lastAccessed: new Date().toISOString(),
        isAvailable: true,
        rateLimit: {requestsPerMinute: 60, burstLimit: 10},
        fields: ['synopsis', 'plotPoints', 'productionCode', 'memoryAlphaUrl'],
        reliability: {uptime: 0.95, accuracy: 0.9, latency: 200},
      },
      tmdb: {
        name: 'TMDB',
        type: 'tmdb',
        baseUrl: 'https://api.themoviedb.org/3',
        confidenceLevel: 0.85,
        lastAccessed: new Date().toISOString(),
        isAvailable: true,
        rateLimit: {requestsPerMinute: 40, burstLimit: 8},
        fields: ['title', 'airDate', 'overview', 'director', 'writer', 'tmdbId'],
        reliability: {uptime: 0.98, accuracy: 0.85, latency: 150},
      },
      trekcore: {
        name: 'TrekCore',
        type: 'trekcore',
        baseUrl: 'https://www.trekcore.com',
        confidenceLevel: 0.8,
        lastAccessed: new Date().toISOString(),
        isAvailable: true,
        rateLimit: {requestsPerMinute: 30, burstLimit: 5},
        fields: ['guestStars', 'screenshots'],
        reliability: {uptime: 0.9, accuracy: 0.8, latency: 250},
      },
      manual: {
        name: 'Manual Data',
        type: 'manual',
        baseUrl: '',
        confidenceLevel: 0.5,
        lastAccessed: new Date().toISOString(),
        isAvailable: true,
        rateLimit: {requestsPerMinute: 0, burstLimit: 0},
        fields: [],
        reliability: {uptime: 1, accuracy: 0.5, latency: 0},
      },
    }

    for (const episode of seasonDetails.episodes) {
      logger.debug(`Fetching episode S${seasonNum}E${episode.episode_number}: ${episode.name}`)

      const episodeId = generateEpisodeId(series.name, seasonNum, episode.episode_number)

      const metadata = await metadataSources.enrichEpisode(episodeId)

      if (metadata) {
        const sourceKey = metadata.dataSource
        const source = metadataSourceMap[sourceKey] ?? metadataSourceMap.manual

        if (!source) {
          logger.warn(`No metadata source found for ${episodeId}, skipping quality scoring`)
          continue
        }

        const qualityScore = qualityScorer.calculateQualityScore(metadata, source)

        if (qualityScore) {
          qualityStats.totalProcessed++
          qualityStats.scores.push(qualityScore.overall)

          if (qualityScore.qualityGrade === 'excellent') qualityStats.gradeDistribution.excellent++
          if (qualityScore.qualityGrade === 'good') qualityStats.gradeDistribution.good++
          if (qualityScore.qualityGrade === 'acceptable')
            qualityStats.gradeDistribution.acceptable++
          if (qualityScore.qualityGrade === 'poor') qualityStats.gradeDistribution.poor++

          for (const field of qualityScore.missingFields) {
            qualityStats.commonMissingFields.set(
              field,
              (qualityStats.commonMissingFields.get(field) ?? 0) + 1,
            )
          }

          logger.debug(`Quality score for ${episodeId}`, {
            overall: qualityScore.overall,
            grade: qualityScore.qualityGrade,
            completeness: qualityScore.completeness,
            accuracy: qualityScore.accuracy,
          })

          if (qualityScore.overall >= MINIMUM_QUALITY_THRESHOLD) {
            const enrichedEpisode: EnrichedEpisodeData = {
              episodeId,
              tmdbId: episode.id,
              title: episode.name,
              season: seasonNum,
              episode: episode.episode_number,
              airDate: episode.air_date,
              overview: episode.overview,
              runtime: episode.runtime,
              director: undefined,
              writer: undefined,
              guestStars: undefined,
              voteAverage: episode.vote_average > 0 ? episode.vote_average : undefined,
              voteCount: episode.vote_count > 0 ? episode.vote_count : undefined,
            }
            enrichedEpisodes.push(enrichedEpisode)

            if (qualityScore.recommendations.length > 0) {
              logger.debug(`Quality recommendations for ${episodeId}`, {
                recommendations: qualityScore.recommendations,
                missingFields: qualityScore.missingFields,
              })
            }
          } else {
            filteredCount++
            qualityStats.totalFiltered++
            logger.warn(`Episode ${episodeId} filtered due to low quality score`, {
              overall: qualityScore.overall,
              grade: qualityScore.qualityGrade,
              missingFields: qualityScore.missingFields,
              recommendations: qualityScore.recommendations,
            })
          }
        }
      } else {
        logger.warn(`Failed to enrich episode ${episodeId}`)
      }
    }

    if (filteredCount > 0) {
      logger.info(`Season ${seasonNum}: Filtered ${filteredCount} low-quality episodes`)
    }

    enrichedSeasons.push({
      seasonNumber: seasonNum,
      name: seasonDetails.name,
      overview: seasonDetails.overview,
      airDate: seasonDetails.air_date,
      episodeCount: seasonDetails.episode_count,
      episodes: enrichedEpisodes,
    })
  }

  const totalEpisodes = enrichedSeasons.reduce((sum, s) => sum + s.episodes.length, 0)

  logger.info(
    `Enumeration complete for ${series.name}: ${enrichedSeasons.length} seasons, ${totalEpisodes} episodes`,
  )

  if (qualityStats.totalProcessed > 0) {
    const avgQuality =
      qualityStats.scores.reduce((sum, score) => sum + score, 0) / qualityStats.scores.length
    const passRate =
      ((qualityStats.totalProcessed - qualityStats.totalFiltered) / qualityStats.totalProcessed) *
      100

    const topMissingFields = Array.from(qualityStats.commonMissingFields.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([field, count]) => `${field} (${count})`)

    logger.info(`Quality Summary for ${series.name}`, {
      totalProcessed: qualityStats.totalProcessed,
      totalFiltered: qualityStats.totalFiltered,
      averageQuality: avgQuality.toFixed(3),
      passRate: `${passRate.toFixed(1)}%`,
      gradeDistribution: qualityStats.gradeDistribution,
      topMissingFields,
    })

    if (avgQuality < QUALITY_THRESHOLD_TARGET) {
      logger.warn(
        `Average quality score (${avgQuality.toFixed(3)}) below target threshold (${QUALITY_THRESHOLD_TARGET}) for ${series.name}`,
      )
    }
  }

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
  }

  logger.info(`Discovery complete: Found ${discovered.length} series`)
  return discovered
}

const escapeStringForTS = (str: string): string => {
  return str
    .replaceAll('\\', '\\\\')
    .replaceAll("'", String.raw`\'`)
    .replaceAll('\n', String.raw`\n`)
    .replaceAll('\r', String.raw`\r`)
    .replaceAll('\t', String.raw`\t`)
}

const generateEpisodeCode = (episode: NormalizedEpisodeItem, indent: string): string => {
  const lines: string[] = []

  lines.push(`${indent}{`)
  lines.push(`${indent}  id: '${episode.id}',`)
  lines.push(`${indent}  title: '${escapeStringForTS(episode.title)}',`)
  lines.push(`${indent}  season: ${episode.season},`)
  lines.push(`${indent}  episode: ${episode.episode},`)
  lines.push(`${indent}  airDate: '${episode.airDate}',`)
  lines.push(`${indent}  stardate: '${episode.stardate}',`)
  lines.push(`${indent}  synopsis: '${escapeStringForTS(episode.synopsis)}',`)

  if (episode.plotPoints != null && episode.plotPoints.length > 0) {
    lines.push(`${indent}  plotPoints: [`)
    episode.plotPoints.forEach(point => {
      lines.push(`${indent}    '${escapeStringForTS(point)}',`)
    })
    lines.push(`${indent}  ],`)
  } else {
    lines.push(`${indent}  plotPoints: [],`)
  }

  if (episode.guestStars != null && episode.guestStars.length > 0) {
    lines.push(`${indent}  guestStars: [`)
    episode.guestStars.forEach(star => {
      lines.push(`${indent}    '${escapeStringForTS(star)}',`)
    })
    lines.push(`${indent}  ],`)
  } else {
    lines.push(`${indent}  guestStars: [],`)
  }

  lines.push(`${indent}  connections: [],`)
  lines.push(`${indent}},`)

  return lines.join('\n')
}

const generateItemCode = (
  item: NormalizedSeasonItem | NormalizedMovieItem,
  indent: string,
): string => {
  const lines: string[] = []

  lines.push(`${indent}{`)
  lines.push(`${indent}  id: '${item.id}',`)
  lines.push(`${indent}  title: '${escapeStringForTS(item.title)}',`)
  lines.push(`${indent}  type: '${item.type}',`)
  lines.push(`${indent}  year: '${item.year}',`)
  lines.push(`${indent}  stardate: '${item.stardate}',`)

  if ('episodes' in item) {
    lines.push(`${indent}  episodes: ${item.episodes},`)
  }

  if (item.notes != null) {
    lines.push(`${indent}  notes: '${escapeStringForTS(item.notes)}',`)
  }

  if ('episodeData' in item && item.episodeData.length > 0) {
    lines.push(`${indent}  episodeData: [`)
    item.episodeData.forEach(episode => {
      lines.push(generateEpisodeCode(episode, `${indent}    `))
    })
    lines.push(`${indent}  ],`)
  }

  lines.push(`${indent}},`)

  return lines.join('\n')
}

const generateEraCode = (era: NormalizedEra, indent: string): string => {
  const lines: string[] = []

  lines.push(`${indent}{`)
  lines.push(`${indent}  id: '${era.id}',`)
  lines.push(`${indent}  title: '${escapeStringForTS(era.title)}',`)
  lines.push(`${indent}  years: '${era.years}',`)
  lines.push(`${indent}  stardates: '${escapeStringForTS(era.stardates)}',`)
  lines.push(`${indent}  description: '${escapeStringForTS(era.description)}',`)
  lines.push(`${indent}  items: [`)

  era.items.forEach(item => {
    lines.push(generateItemCode(item, `${indent}    `))
  })

  lines.push(`${indent}  ],`)
  lines.push(`${indent}},`)

  return lines.join('\n')
}

const generateStarTrekDataFile = (normalizedData: NormalizedData): string => {
  const lines: string[] = []

  lines.push('export const starTrekData = [')

  normalizedData.eras.forEach(era => {
    lines.push(generateEraCode(era, '  '))
  })

  lines.push(']')
  lines.push('')

  return lines.join('\n')
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

/**
 * Existing era data structure from star-trek-data.ts for incremental merging.
 */
interface ExistingEraData {
  id: string
  title: string
  years: string
  stardates: string
  description: string
  items: {
    id: string
    title: string
    notes?: string | undefined
    [key: string]: unknown
  }[]
}

/**
 * Merge new generated data with existing data while preserving manual edits.
 * Incremental mode preserves:
 * - Custom notes fields
 * - Manual corrections to metadata
 * - Additional fields not generated automatically
 *
 * @param existingData - Current star-trek-data.ts content
 * @param newData - Newly generated data
 * @returns Merged data preserving manual edits
 */
export const mergeIncrementalData = (
  existingData: ExistingEraData[],
  newData: NormalizedEra[],
): NormalizedEra[] => {
  const mergedEras: NormalizedEra[] = []

  for (const newEra of newData) {
    const existingEra = existingData.find(e => e.id === newEra.id)

    if (existingEra == null) {
      mergedEras.push(newEra)
      continue
    }

    const mergedItems: (NormalizedSeasonItem | NormalizedMovieItem)[] = []

    for (const newItem of newEra.items) {
      const existingItem = existingEra.items.find(i => i.id === newItem.id)

      if (existingItem == null) {
        mergedItems.push(newItem)
        continue
      }

      const mergedItem: NormalizedSeasonItem | NormalizedMovieItem = {
        ...newItem,
      }

      if (existingItem.notes !== undefined) {
        mergedItem.notes = existingItem.notes
      }

      mergedItems.push(mergedItem)
    }

    mergedEras.push({
      ...newEra,
      items: mergedItems,
    })
  }

  return mergedEras
}

/**
 * Load existing star-trek-data.ts for incremental updates.
 * Parses the exported data array from the TypeScript file.
 *
 * @param filePath - Path to existing star-trek-data.ts
 * @returns Parsed existing data array, or null if file doesn't exist
 */
export const loadExistingData = async (filePath: string): Promise<ExistingEraData[] | null> => {
  try {
    const {fileExists} = await import('./lib/file-operations.js')
    const exists = await fileExists(filePath)

    if (!exists) {
      return null
    }

    const absolutePath = resolve(filePath)
    const dataModule = await import(absolutePath)
    const existingData = dataModule.starTrekData as ExistingEraData[]

    return existingData
  } catch {
    return null
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
  const metadataConfig = getMetadataConfig()
  const metadataSources: MetadataSourceInstance = createMetadataSources(metadataConfig)
  logger.info('Metadata sources initialized successfully')

  // Initialize error tracking and health monitoring
  const errorTracker: ErrorTracker = {
    totalErrors: 0,
    errorsByCategory: new Map(),
    errorsBySource: new Map(),
    failedEpisodes: [],
    errorDetails: [],
  }

  const healthMonitor: HealthMonitor = {
    healthBySource: new Map(),
    unhealthySources: [],
  }

  // Enhanced error event handler with comprehensive categorization
  metadataSources.on('enrichment-failed', ({episodeId, errors}) => {
    errorTracker.totalErrors++
    errorTracker.failedEpisodes.push(episodeId)

    errors.forEach(error => {
      // Track by category
      const categoryCount = errorTracker.errorsByCategory.get(error.category) ?? 0
      errorTracker.errorsByCategory.set(error.category, categoryCount + 1)

      // Track by source
      const sourceCount = errorTracker.errorsBySource.get(error.sourceApi) ?? 0
      errorTracker.errorsBySource.set(error.sourceApi, sourceCount + 1)

      // Store detailed error
      errorTracker.errorDetails.push({
        episodeId,
        category: error.category,
        message: error.message,
        sourceApi: error.sourceApi,
        timestamp: new Date(),
      })
    })

    // Determine if error is retryable and provide actionable guidance
    const retryableCategories = ['network', 'rate-limit', 'timeout', 'service-unavailable']
    const hasRetryableErrors = errors.some(e => retryableCategories.includes(e.category))

    logger.error('Metadata enrichment failed', {
      episodeId,
      errorCount: errors.length,
      errors: errors.map(e => ({category: e.category, message: e.message, source: e.sourceApi})),
      retryable: hasRetryableErrors,
      guidance: hasRetryableErrors
        ? 'Error is retryable - will attempt automatic fallback to alternative sources'
        : 'Error requires manual intervention - check data format and API availability',
    })
  })

  // Enhanced health monitoring event handler
  metadataSources.on('health-status-change', ({sourceId, isHealthy, consecutiveFailures}) => {
    // Update health monitor
    healthMonitor.healthBySource.set(sourceId, {
      isHealthy,
      consecutiveFailures,
      lastCheck: new Date(),
    })

    if (!isHealthy && !healthMonitor.unhealthySources.includes(sourceId)) {
      healthMonitor.unhealthySources.push(sourceId)
    } else if (isHealthy && healthMonitor.unhealthySources.includes(sourceId)) {
      healthMonitor.unhealthySources = healthMonitor.unhealthySources.filter(s => s !== sourceId)
    }

    const status = isHealthy ? 'healthy' : 'unhealthy'
    const severity = consecutiveFailures >= 3 ? 'CRITICAL' : 'WARNING'

    logger.warn(`[${severity}] API health status changed: ${sourceId} is now ${status}`, {
      consecutiveFailures,
      recommendation:
        !isHealthy && consecutiveFailures >= 3
          ? 'Consider switching to alternative sources or pausing data generation'
          : 'Monitoring for recovery',
    })
  })

  try {
    logger.info('Starting data fetching pipeline')

    const discoveredSeries = await discoverStarTrekSeries(logger, options.series)
    logger.info(`Discovered ${discoveredSeries.length} Star Trek series`, {
      series: discoveredSeries.map((s: DiscoveredSeries) => s.name),
    })

    logger.info('Starting season/episode enumeration')
    const enrichedSeriesData: EnrichedSeriesData[] = []

    for (const series of discoveredSeries) {
      const enrichedData = await enumerateSeriesEpisodes(series, logger, metadataSources)
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

    logger.info('Starting movie discovery')
    const discoveredMovies = await discoverStarTrekMovies(logger)
    logger.info(`Movie discovery complete: ${discoveredMovies.length} movies found`, {
      movies: discoveredMovies.map(m => `${m.title} (${m.releaseDate?.slice(0, 4) ?? 'unknown'})`),
    })

    logger.info('Starting data normalization pipeline')
    let normalizedData = createNormalizationPipeline(enrichedSeriesData, discoveredMovies, logger)
    logger.info('Data normalization complete', {
      seriesCount: normalizedData.metadata.seriesCount,
      movieCount: normalizedData.metadata.movieCount,
      episodeCount: normalizedData.metadata.episodeCount,
    })

    // Run quality validation on normalized data (TASK-026 through TASK-035)
    logger.info('Running data quality validation')
    const qualityReport = generateQualityReport(normalizedData.eras)

    logger.info('Quality validation complete', {
      averageQualityScore: `${(qualityReport.summary.averageQualityScore * 100).toFixed(1)}%`,
      itemsAboveThreshold: qualityReport.summary.itemsAboveThreshold,
      itemsBelowThreshold: qualityReport.summary.itemsBelowThreshold,
      totalValidationIssues: qualityReport.validation.totalValidationIssues,
    })

    // Display quality report
    if (options.verbose) {
      console.error('\n=== Data Quality Report ===')
      console.error(formatQualityReport(qualityReport))
      console.error('')
    }

    // Check for duplicate IDs (TASK-028)
    const duplicateIds = detectDuplicateIds(normalizedData.eras)
    if (duplicateIds.length > 0) {
      logger.error('Duplicate IDs detected', {
        count: duplicateIds.length,
        duplicates: duplicateIds,
      })
      throw new Error(`Data validation failed: ${duplicateIds.length} duplicate IDs found`)
    }

    // Check quality threshold
    if (
      qualityReport.summary.averageQualityScore < qualityReport.summary.qualityThreshold &&
      qualityReport.summary.itemsBelowThreshold > 0
    ) {
      logger.warn('Quality threshold not met', {
        threshold: `${(qualityReport.summary.qualityThreshold * 100).toFixed(0)}%`,
        actual: `${(qualityReport.summary.averageQualityScore * 100).toFixed(1)}%`,
        itemsBelowThreshold: qualityReport.summary.itemsBelowThreshold,
      })
    }

    if (options.mode === 'incremental') {
      logger.info('Running in incremental mode - loading existing data')
      const existingData = await loadExistingData(resolve(options.output))

      if (existingData === null) {
        logger.warn('No existing data found - falling back to full generation')
      } else {
        logger.info('Existing data loaded - merging with new data', {
          existingEras: existingData.length,
        })

        // Generate diff before merging (TASK-032)
        // Note: existingData is typed as ExistingEraData[] which is a looser type than NormalizedEra[]
        // This is safe because generateDataDiff only accesses common properties
        const dataDiff = generateDataDiff(
          existingData as unknown as NormalizedEra[],
          normalizedData.eras,
        )

        if (dataDiff.hasChanges) {
          logger.info('Data changes detected', {
            erasAdded: dataDiff.summary.erasAdded,
            erasRemoved: dataDiff.summary.erasRemoved,
            erasModified: dataDiff.summary.erasModified,
            itemsAdded: dataDiff.summary.itemsAdded,
            itemsRemoved: dataDiff.summary.itemsRemoved,
            itemsModified: dataDiff.summary.itemsModified,
            episodesAdded: dataDiff.summary.episodesAdded,
            episodesRemoved: dataDiff.summary.episodesRemoved,
            episodesModified: dataDiff.summary.episodesModified,
          })

          if (options.verbose && dataDiff.episodeChanges.length > 0) {
            console.error('\n=== Episode Changes (first 10) ===')
            dataDiff.episodeChanges.slice(0, 10).forEach(change => {
              console.error(
                `  ${change.changeType.toUpperCase()}: ${change.episodeId}${
                  change.fieldsChanged ? ` (${change.fieldsChanged.join(', ')})` : ''
                }`,
              )
            })
            if (dataDiff.episodeChanges.length > 10) {
              console.error(`  ... and ${dataDiff.episodeChanges.length - 10} more changes`)
            }
            console.error('')
          }
        } else {
          logger.info('No data changes detected - output will remain unchanged')
        }

        const mergedEras = mergeIncrementalData(existingData, normalizedData.eras)
        normalizedData = {
          ...normalizedData,
          eras: mergedEras,
        }

        logger.info('Incremental merge complete', {
          erasMerged: mergedEras.length,
        })
      }
    }

    logger.info('Generating TypeScript code for star-trek-data.ts')
    const generatedCode = generateStarTrekDataFile(normalizedData)
    logger.info('Code generation complete', {
      codeLength: generatedCode.length,
      linesOfCode: generatedCode.split('\n').length,
    })

    logger.info('Multi-source merging infrastructure ready', {
      supportedSources: ['Memory Alpha', 'TMDB', 'TrekCore', 'STAPI'],
      currentSource: 'TMDB',
      mergingFunctions: ['mergeEpisodeFromSources', 'mergeMovieFromSources', 'resolveConflict'],
    })

    if (options.dryRun) {
      logger.info('Dry-run mode: No files will be modified')
      logger.info('Preview of generated data:', {
        seriesCount: normalizedData.metadata.seriesCount,
        movieCount: normalizedData.metadata.movieCount,
        episodeCount: normalizedData.metadata.episodeCount,
        eraCount: normalizedData.eras.length,
        codeLength: generatedCode.length,
        linesOfCode: generatedCode.split('\n').length,
      })

      const previewLength = Math.min(1000, generatedCode.length)
      console.error('\n=== Generated Code Preview (first 1000 chars) ===')
      console.error(generatedCode.slice(0, previewLength))
      if (generatedCode.length > previewLength) {
        console.error(`\n... (${generatedCode.length - previewLength} more characters)`)
      }
      console.error('===\n')

      logger.info('Dry-run complete - no files were modified')
    } else {
      logger.info('Writing generated data to file', {outputPath: resolve(options.output)})

      const {writeTextFileAtomic, formatTypeScriptCode} = await import('./lib/file-operations.js')

      logger.debug('Formatting TypeScript code with Prettier')
      const formattedCode = await formatTypeScriptCode(generatedCode)

      logger.debug('Writing file atomically with backup creation')
      await writeTextFileAtomic(resolve(options.output), formattedCode, true)

      logger.info('File written successfully', {
        outputPath: resolve(options.output),
        backupPath: `${resolve(options.output)}.backup`,
        fileSize: formattedCode.length,
      })

      if (options.validate) {
        logger.info('Running data validation')

        const {validateEpisodeWithReporting} = await import('./lib/data-validation.js')

        let validationErrors = 0
        let validationWarnings = 0

        for (const era of normalizedData.eras) {
          for (const item of era.items) {
            if ('episodeData' in item && item.episodeData != null) {
              for (const episode of item.episodeData) {
                const validationResult = validateEpisodeWithReporting(episode as never)

                if (validationResult.errors.length > 0) {
                  validationErrors += validationResult.errors.length
                  logger.warn(`Validation errors for episode ${episode.id}`, {
                    errors: validationResult.errors.map(e => e.message),
                  })
                }

                if (validationResult.warnings.length > 0) {
                  validationWarnings += validationResult.warnings.length
                  logger.debug(`Validation warnings for episode ${episode.id}`, {
                    warnings: validationResult.warnings.map(w => w.message),
                  })
                }
              }
            }
          }
        }

        logger.info('Data validation complete', {
          totalEpisodes: normalizedData.metadata.episodeCount,
          validationErrors,
          validationWarnings,
        })

        if (validationErrors > 0) {
          logger.warn(
            `Generated data has ${validationErrors} validation errors - review and fix before production use`,
          )
        }
      }

      logger.info('Generation complete', {outputPath: resolve(options.output)})
    }

    // Generate comprehensive error summary report (TASK-018)
    logger.info('\n=== Error Summary Report ===')
    const usageAnalytics = metadataSources.getUsageAnalytics()

    logger.info('API Usage Statistics', {
      totalRequests: usageAnalytics.totalRequests,
      requestsPerHour: usageAnalytics.requestsPerHour,
      averageResponseTime: `${usageAnalytics.averageResponseTime}ms`,
      cacheHitRate: `${(usageAnalytics.cacheHitRate * 100).toFixed(1)}%`,
      errorRate: `${(usageAnalytics.errorRate * 100).toFixed(1)}%`,
    })

    // Display errors by source
    if (errorTracker.totalErrors > 0) {
      logger.warn('Error Breakdown by Source', {
        totalErrors: errorTracker.totalErrors,
        errorsBySource: Object.fromEntries(errorTracker.errorsBySource),
      })

      logger.warn('Error Breakdown by Category', {
        errorsByCategory: Object.fromEntries(errorTracker.errorsByCategory),
      })

      logger.warn('Failed Episodes', {
        count: errorTracker.failedEpisodes.length,
        episodeIds: errorTracker.failedEpisodes.slice(0, 10), // Show first 10
        truncated: errorTracker.failedEpisodes.length > 10,
      })

      // Provide actionable error guidance (TASK-022)
      const retryableErrors = errorTracker.errorDetails.filter(e =>
        ['network', 'rate-limit', 'timeout', 'service-unavailable'].includes(e.category),
      ).length

      logger.warn('Error Resolution Guidance', {
        retryableErrors,
        totalErrors: errorTracker.totalErrors,
        recommendation:
          retryableErrors > 0
            ? 'Re-run the script to retry failed episodes. Network and rate-limit errors typically resolve on retry.'
            : 'Manual intervention required. Check API credentials, data format, and service availability.',
        affectedEpisodes: errorTracker.failedEpisodes,
      })
    } else {
      logger.info('No errors encountered during generation')
    }

    // Generate health status report (TASK-019)
    logger.info('\n=== API Health Status Report ===')
    const healthStatus = metadataSources.getHealthStatus()

    Object.entries(healthStatus).forEach(([sourceId, status]) => {
      const healthLevel = status.isHealthy
        ? 'HEALTHY'
        : status.consecutiveFailures >= 3
          ? 'CRITICAL'
          : 'DEGRADED'

      logger.info(`Source: ${sourceId}`, {
        status: healthLevel,
        consecutiveFailures: status.consecutiveFailures,
        lastSuccessful: status.lastSuccessful
          ? new Date(status.lastSuccessful).toISOString()
          : 'never',
        averageResponseTime: `${status.responseTimeMs}ms`,
      })
    })

    // Display unhealthy sources warning (TASK-020)
    if (healthMonitor.unhealthySources.length > 0) {
      logger.warn('Unhealthy Sources Detected', {
        unhealthySources: healthMonitor.unhealthySources,
        impact: 'Data quality may be affected. Consider alternative sources or retry later.',
        fallbackStrategy:
          'Automatic fallback to alternative sources was attempted during enrichment.',
      })
    }

    logger.info('Data generation completed successfully', {
      mode: options.mode,
      seriesProcessed: normalizedData.metadata.seriesCount,
      moviesProcessed: normalizedData.metadata.movieCount,
      totalEpisodes: normalizedData.metadata.episodeCount,
      erasGenerated: normalizedData.eras.length,
      outputPath: resolve(options.output),
      dryRun: options.dryRun,
      validated: options.validate && !options.dryRun,
      errors: errorTracker.totalErrors,
      errorRate: `${((errorTracker.totalErrors / normalizedData.metadata.episodeCount) * 100).toFixed(1)}%`,
    })
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
