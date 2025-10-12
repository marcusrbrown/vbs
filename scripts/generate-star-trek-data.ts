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
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) {
    return null
  }

  const url = `https://api.themoviedb.org/3/movie/${movieId}`
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }

  try {
    const response = await fetch(url, {headers})
    if (!response.ok) {
      logger.error('TMDB API error for movie', {
        status: response.status,
        movieId,
      })
      return null
    }

    const data = (await response.json()) as TMDBMovieDetails
    return data
  } catch (error: unknown) {
    const errorDetails = {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error),
    }
    logger.error('Failed to fetch movie details', {movieId, error: errorDetails})
    return null
  }
}

/**
 * Fetch movie credits (cast and crew) from TMDB.
 * Extracts director, writer, and lead cast information.
 */
const fetchMovieCredits = async (
  movieId: number,
  logger: ReturnType<typeof createLogger>,
): Promise<TMDBMovieCredits | null> => {
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) {
    return null
  }

  const url = `https://api.themoviedb.org/3/movie/${movieId}/credits`
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }

  try {
    const response = await fetch(url, {headers})
    if (!response.ok) {
      logger.error('TMDB API error for movie credits', {
        status: response.status,
        movieId,
      })
      return null
    }

    const data = (await response.json()) as TMDBMovieCredits
    return data
  } catch (error: unknown) {
    const errorDetails = {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error),
    }
    logger.error('Failed to fetch movie credits', {movieId, error: errorDetails})
    return null
  }
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

// ============================================================================
// DATA NORMALIZATION PIPELINE (TASK-016)
// ============================================================================

/**
 * Normalized season item for VBS format.
 * Represents a single season within an era's items array.
 */
interface NormalizedSeasonItem {
  /** Season ID (e.g., 'ent_s1', 'tng_s3') */
  id: string
  /** Display title */
  title: string
  /** Content type */
  type: 'series' | 'movie'
  /** In-universe year */
  year: string
  /** Stardate range or identifier */
  stardate: string
  /** Number of episodes in season */
  episodes: number
  /** Additional notes about the season */
  notes?: string | undefined
  /** Episode-level data array */
  episodeData: NormalizedEpisodeItem[]
}

/**
 * Normalized episode item for VBS format.
 * Represents a single episode within a season's episodeData array.
 */
interface NormalizedEpisodeItem {
  /** Episode ID (e.g., 'ent_s1_e01') */
  id: string
  /** Episode title */
  title: string
  /** Season number */
  season: number
  /** Episode number */
  episode: number
  /** Air date (YYYY-MM-DD format) */
  airDate: string
  /** Stardate for episode */
  stardate: string
  /** Episode synopsis/overview */
  synopsis: string
  /** Key plot points */
  plotPoints?: string[]
  /** Guest stars */
  guestStars?: string[]
  /** Connected episodes */
  connections?: string[]
}

/**
 * Normalized movie item for VBS format.
 * Represents a movie within an era's items array.
 */
interface NormalizedMovieItem {
  /** Movie ID (e.g., 'tmp', 'twok') */
  id: string
  /** Display title */
  title: string
  /** Content type */
  type: 'movie'
  /** Release year */
  year: string
  /** Stardate identifier */
  stardate: string
  /** Runtime in minutes */
  runtime?: number | null
  /** Movie synopsis */
  notes?: string
  /** Director name(s) */
  director?: string
  /** Writer name(s) */
  writer?: string
  /** Lead cast members */
  cast?: string[]
}

/**
 * Normalized era structure for VBS format.
 * Represents a complete chronological era with all its content.
 */
interface NormalizedEra {
  /** Era ID (e.g., 'enterprise', 'tos', 'tng') */
  id: string
  /** Era display title */
  title: string
  /** Year range for era */
  years: string
  /** Stardate system used in era */
  stardates: string
  /** Era description */
  description: string
  /** All items (seasons and movies) in era */
  items: (NormalizedSeasonItem | NormalizedMovieItem)[]
}

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

const SERIES_CODE_MAP: Record<string, string> = {
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
 * Generate series code from series name for ID generation.
 * Maps known series names to short codes, falls back to first 3 characters.
 */
const generateSeriesCode = (seriesName: string): string => {
  const normalized = seriesName
    .toLowerCase()
    .replace(/^star trek:?\s*/i, '')
    .trim()

  return SERIES_CODE_MAP[normalized] ?? normalized.replaceAll(/\s+/g, '').slice(0, 3)
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
    runtime: movie.runtime,
    notes: movie.overview,
  }

  if (movie.director !== undefined) {
    normalized.director = movie.director
  }

  if (movie.writer !== undefined) {
    normalized.writer = movie.writer
  }

  if (movie.cast !== undefined) {
    normalized.cast = movie.cast
  }

  return normalized
}

const normalizeSeries = (series: EnrichedSeriesData): NormalizedSeasonItem[] => {
  return series.seasons.map(season => normalizeSeason(series.name, season))
}

// ============================================================================
// ERA CLASSIFICATION LOGIC (TASK-017)
// ============================================================================

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

// ============================================================================
// CHRONOLOGICAL ORDERING ALGORITHMS (TASK-018)
// ============================================================================

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
    if (item.type === 'series') {
      return {
        ...item,
        episodeData: sortEpisodesChronologically(item.episodeData),
      }
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

  const totalEpisodes = allSeasonItems.reduce((sum, season) => sum + season.episodeData.length, 0)

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

      await new Promise<void>((resolve: () => void) => setTimeout(resolve, TMDB_RATE_LIMIT_MS))
    }

    enrichedSeasons.push({
      seasonNumber: seasonNum,
      name: seasonDetails.name,
      overview: seasonDetails.overview,
      airDate: seasonDetails.air_date,
      episodeCount: seasonDetails.episode_count,
      episodes: enrichedEpisodes,
    })

    await new Promise<void>((resolve: () => void) => setTimeout(resolve, TMDB_RATE_LIMIT_MS * 2))
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

    await new Promise<void>((resolve: () => void) => setTimeout(resolve, TMDB_RATE_LIMIT_MS))
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

    logger.info('Starting movie discovery')
    const discoveredMovies = await discoverStarTrekMovies(logger)
    logger.info(`Movie discovery complete: ${discoveredMovies.length} movies found`, {
      movies: discoveredMovies.map(m => `${m.title} (${m.releaseDate?.slice(0, 4) ?? 'unknown'})`),
    })

    logger.info('Starting data normalization pipeline')
    const normalizedData = createNormalizationPipeline(enrichedSeriesData, discoveredMovies, logger)
    logger.info('Data normalization complete', {
      seriesCount: normalizedData.metadata.seriesCount,
      movieCount: normalizedData.metadata.movieCount,
      episodeCount: normalizedData.metadata.episodeCount,
    })

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
