/**
 * TypeScript types for external API response formats used in metadata enrichment.
 * Provides comprehensive type definitions for TMDB, Memory Alpha, and other Star Trek data sources.
 *
 * Follows VBS strict TypeScript guidelines and provides runtime type guards for validation.
 */

// ============================================================================
// TMDB (The Movie Database) API TYPES
// ============================================================================

/**
 * TMDB TV Episode response format.
 * @see https://developers.themoviedb.org/3/tv-episodes/get-tv-episode-details
 */
export interface TMDBEpisodeResponse {
  id: number
  name: string
  overview: string
  vote_average: number
  vote_count: number
  air_date: string | null
  episode_number: number
  production_code: string | null
  runtime: number | null
  season_number: number
  show_id: number
  still_path: string | null
  crew: TMDBCrewMember[]
  guest_stars: TMDBCastMember[]
  external_ids: TMDBExternalIds
  images?: TMDBImageCollection
  videos?: TMDBVideoCollection
}

/**
 * TMDB TV Series response format.
 * @see https://developers.themoviedb.org/3/tv/get-tv-details
 */
export interface TMDBSeriesResponse {
  id: number
  name: string
  overview: string
  backdrop_path: string | null
  poster_path: string | null
  first_air_date: string
  last_air_date: string
  episode_run_time: number[]
  genres: TMDBGenre[]
  networks: TMDBNetwork[]
  number_of_episodes: number
  number_of_seasons: number
  origin_country: string[]
  original_language: string
  original_name: string
  popularity: number
  seasons: TMDBSeason[]
  status: string
  tagline: string | null
  type: string
  vote_average: number
  vote_count: number
  created_by: TMDBCreatedBy[]
  external_ids: TMDBExternalIds
  production_companies: TMDBProductionCompany[]
}

/**
 * TMDB cast member information.
 */
export interface TMDBCastMember {
  id: number
  name: string
  character: string
  credit_id: string
  order: number
  profile_path: string | null
  gender: number | null
  known_for_department: string
}

/**
 * TMDB crew member information.
 */
export interface TMDBCrewMember {
  id: number
  name: string
  job: string
  department: string
  credit_id: string
  profile_path: string | null
  gender: number | null
  known_for_department: string
}

/**
 * TMDB external IDs for cross-referencing.
 */
export interface TMDBExternalIds {
  imdb_id: string | null
  freebase_mid: string | null
  freebase_id: string | null
  tvdb_id: number | null
  tvrage_id: number | null
  wikidata_id: string | null
  facebook_id: string | null
  instagram_id: string | null
  twitter_id: string | null
}

/**
 * TMDB genre information.
 */
export interface TMDBGenre {
  id: number
  name: string
}

/**
 * TMDB network information.
 */
export interface TMDBNetwork {
  id: number
  name: string
  logo_path: string | null
  origin_country: string
}

/**
 * TMDB season information.
 */
export interface TMDBSeason {
  id: number
  air_date: string | null
  episode_count: number
  name: string
  overview: string
  poster_path: string | null
  season_number: number
}

/**
 * TMDB created by information.
 */
export interface TMDBCreatedBy {
  id: number
  credit_id: string
  name: string
  gender: number | null
  profile_path: string | null
}

/**
 * TMDB production company information.
 */
export interface TMDBProductionCompany {
  id: number
  logo_path: string | null
  name: string
  origin_country: string
}

/**
 * TMDB image collection.
 */
export interface TMDBImageCollection {
  stills: TMDBImage[]
}

/**
 * TMDB image information.
 */
export interface TMDBImage {
  aspect_ratio: number
  file_path: string
  height: number
  width: number
  vote_average: number
  vote_count: number
}

/**
 * TMDB video collection.
 */
export interface TMDBVideoCollection {
  results: TMDBVideo[]
}

/**
 * TMDB video information.
 */
export interface TMDBVideo {
  id: string
  key: string
  name: string
  site: string
  size: number
  type: string
  iso_639_1: string
  iso_3166_1: string
  published_at: string
}

/**
 * TMDB search response for TV shows.
 */
export interface TMDBSearchResponse {
  page: number
  results: TMDBSearchResult[]
  total_pages: number
  total_results: number
}

/**
 * TMDB search result item.
 */
export interface TMDBSearchResult {
  id: number
  name: string
  original_name: string
  overview: string
  first_air_date: string
  origin_country: string[]
  original_language: string
  popularity: number
  vote_average: number
  vote_count: number
  backdrop_path: string | null
  poster_path: string | null
  genre_ids: number[]
}

/**
 * TMDB API error response.
 */
export interface TMDBErrorResponse {
  status_code: number
  status_message: string
  success: false
}

// ============================================================================
// MEMORY ALPHA SCRAPED DATA TYPES
// ============================================================================

/**
 * Memory Alpha episode information scraped from episode pages.
 * Based on common patterns in Memory Alpha episode structure.
 */
export interface MemoryAlphaEpisodeData {
  title: string
  series: string
  season: number
  episode: number
  airDate: string
  stardate: string | null
  productionCode: string | null
  director: string[]
  writer: string[]
  synopsis: string
  plotSummary: string
  guestStars: MemoryAlphaGuestStar[]
  references: MemoryAlphaReference[]
  continuity: string[]
  background: string[]
  trivia: string[]
  goofs: string[]
  apocrypha: string[]
  externalLinks: MemoryAlphaExternalLink[]
  categories: string[]
  pageUrl: string
  lastModified: string
  imageUrl: string | null
}

/**
 * Memory Alpha guest star information.
 */
export interface MemoryAlphaGuestStar {
  actor: string
  character: string
  characterUrl?: string
  actorUrl?: string
}

/**
 * Memory Alpha reference to other episodes or entities.
 */
export interface MemoryAlphaReference {
  title: string
  url: string
  type: 'episode' | 'character' | 'species' | 'technology' | 'location' | 'other'
  series?: string
}

/**
 * Memory Alpha external link.
 */
export interface MemoryAlphaExternalLink {
  title: string
  url: string
  type: 'imdb' | 'official' | 'review' | 'interview' | 'other'
}

/**
 * Memory Alpha search result.
 */
export interface MemoryAlphaSearchResult {
  title: string
  url: string
  snippet: string
  type: 'episode' | 'character' | 'series' | 'technology' | 'other'
  series?: string
  season?: number
  episode?: number
}

// ============================================================================
// IMDB API TYPES (via unofficial APIs)
// ============================================================================

/**
 * IMDb episode information from unofficial APIs.
 */
export interface IMDBEpisodeData {
  id: string
  title: string
  year: number
  rating: number | null
  ratingCount: number | null
  plot: string
  runtime: number | null
  releaseDate: string | null
  directors: IMDBPerson[]
  writers: IMDBPerson[]
  cast: IMDBCastMember[]
  genres: string[]
  parentTitle: string
  parentId: string
  season: number
  episode: number
  image?: string
}

/**
 * IMDb person information.
 */
export interface IMDBPerson {
  id: string
  name: string
  url?: string
}

/**
 * IMDb cast member with character information.
 */
export interface IMDBCastMember extends IMDBPerson {
  character: string
  characterId?: string
}

/**
 * IMDb series information.
 */
export interface IMDBSeriesData {
  id: string
  title: string
  year: string
  rating: number | null
  ratingCount: number | null
  plot: string
  runtime: string | null
  genres: string[]
  directors: IMDBPerson[]
  writers: IMDBPerson[]
  stars: IMDBPerson[]
  image?: string
  numberOfSeasons: number
  numberOfEpisodes: number
}

// ============================================================================
// TREKCORE API TYPES
// ============================================================================

/**
 * TrekCore episode information.
 */
export interface TrekCoreEpisodeData {
  id: string
  title: string
  series: string
  season: number
  episode: number
  airDate: string
  productionCode: string | null
  director: string[]
  writer: string[]
  summary: string
  cast: string[]
  guestStars: string[]
  imageGallery: TrekCoreImage[]
  videoClips: TrekCoreVideo[]
  trivia: string[]
  quotes: TrekCoreQuote[]
  pageUrl: string
}

/**
 * TrekCore image information.
 */
export interface TrekCoreImage {
  url: string
  caption: string
  category: 'production' | 'publicity' | 'screenshot' | 'behind-scenes'
}

/**
 * TrekCore video information.
 */
export interface TrekCoreVideo {
  url: string
  title: string
  duration: number
  type: 'clip' | 'trailer' | 'behind-scenes' | 'interview'
}

/**
 * TrekCore quote information.
 */
export interface TrekCoreQuote {
  character: string
  text: string
  context?: string
}

// ============================================================================
// UNIFIED API RESPONSE TYPES
// ============================================================================

/**
 * Unified metadata from all sources for comparison and merging.
 */
export interface UnifiedMetadataResponse {
  tmdb?: TMDBEpisodeResponse
  memoryAlpha?: MemoryAlphaEpisodeData
  imdb?: IMDBEpisodeData
  trekCore?: TrekCoreEpisodeData
  fetchedAt: string
  sources: {
    tmdb: boolean
    memoryAlpha: boolean
    imdb: boolean
    trekCore: boolean
  }
  errors: APIError[]
}

/**
 * Generic API error structure.
 */
export interface APIError {
  source: string
  message: string
  code?: string | number
  timestamp: string
  retriable: boolean
}

/**
 * API rate limiting information.
 */
export interface RateLimitInfo {
  remaining: number
  reset: number
  limit: number
  retryAfter?: number
}

/**
 * API response wrapper with metadata.
 */
export interface APIResponseWrapper<T> {
  data: T | null
  success: boolean
  error?: APIError
  rateLimit?: RateLimitInfo
  cached: boolean
  timestamp: string
}

// ============================================================================
// TYPE GUARDS FOR RUNTIME VALIDATION
// ============================================================================

/**
 * Type guard for TMDB episode response.
 */
export const isTMDBEpisodeResponse = (value: unknown): value is TMDBEpisodeResponse => {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>

  return (
    typeof obj.id === 'number' &&
    typeof obj.name === 'string' &&
    typeof obj.episode_number === 'number' &&
    typeof obj.season_number === 'number' &&
    Array.isArray(obj.crew) &&
    Array.isArray(obj.guest_stars)
  )
}

/**
 * Type guard for TMDB series response.
 */
export const isTMDBSeriesResponse = (value: unknown): value is TMDBSeriesResponse => {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>

  return (
    typeof obj.id === 'number' &&
    typeof obj.name === 'string' &&
    typeof obj.number_of_episodes === 'number' &&
    typeof obj.number_of_seasons === 'number' &&
    Array.isArray(obj.seasons)
  )
}

/**
 * Type guard for Memory Alpha episode data.
 */
export const isMemoryAlphaEpisodeData = (value: unknown): value is MemoryAlphaEpisodeData => {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>

  return (
    typeof obj.title === 'string' &&
    typeof obj.series === 'string' &&
    typeof obj.season === 'number' &&
    typeof obj.episode === 'number' &&
    typeof obj.pageUrl === 'string' &&
    Array.isArray(obj.director) &&
    Array.isArray(obj.writer)
  )
}

/**
 * Type guard for IMDb episode data.
 */
export const isIMDBEpisodeData = (value: unknown): value is IMDBEpisodeData => {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>

  return (
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.season === 'number' &&
    typeof obj.episode === 'number' &&
    Array.isArray(obj.directors) &&
    Array.isArray(obj.writers) &&
    Array.isArray(obj.cast)
  )
}

/**
 * Type guard for TrekCore episode data.
 */
export const isTrekCoreEpisodeData = (value: unknown): value is TrekCoreEpisodeData => {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>

  return (
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.series === 'string' &&
    typeof obj.season === 'number' &&
    typeof obj.episode === 'number' &&
    typeof obj.pageUrl === 'string'
  )
}

/**
 * Type guard for TMDB error response.
 */
export const isTMDBErrorResponse = (value: unknown): value is TMDBErrorResponse => {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>

  return (
    typeof obj.status_code === 'number' &&
    typeof obj.status_message === 'string' &&
    obj.success === false
  )
}

/**
 * Type guard for unified metadata response.
 */
export const isUnifiedMetadataResponse = (value: unknown): value is UnifiedMetadataResponse => {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>

  return (
    typeof obj.fetchedAt === 'string' &&
    typeof obj.sources === 'object' &&
    Array.isArray(obj.errors)
  )
}

/**
 * Type guard for API response wrapper.
 */
export const isAPIResponseWrapper = <T>(
  value: unknown,
  dataGuard: (data: unknown) => data is T,
): value is APIResponseWrapper<T> => {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>

  return (
    typeof obj.success === 'boolean' &&
    typeof obj.cached === 'boolean' &&
    typeof obj.timestamp === 'string' &&
    (obj.data === null || dataGuard(obj.data))
  )
}

// ============================================================================
// UTILITY TYPES FOR MAPPING
// ============================================================================

/**
 * Mapping configuration for converting external API responses to internal Episode format.
 */
export interface APIFieldMapping {
  /** Source field path (supports dot notation like 'external_ids.imdb_id') */
  sourcePath: string
  /** Target field in Episode interface */
  targetField: string
  /** Optional transformer function */
  transformer?: (value: unknown) => unknown
  /** Whether this field is required */
  required?: boolean
  /** Default value if source field is missing */
  defaultValue?: unknown
}

/**
 * Complete mapping configuration for a data source.
 */
export interface SourceMappingConfig {
  source: string
  version: string
  mappings: APIFieldMapping[]
  globalTransformers?: {
    /** Transform guest stars array to standardized format */
    guestStars?: (value: unknown) => string[]
    /** Transform director array to standardized format */
    directors?: (value: unknown) => string[]
    /** Transform writer array to standardized format */
    writers?: (value: unknown) => string[]
    /** Transform air date to ISO format */
    airDate?: (value: unknown) => string
  }
}

/**
 * Batch API request configuration.
 */
export interface BatchAPIRequest {
  source: 'tmdb' | 'memory-alpha' | 'imdb' | 'trekcore'
  episodeIds: string[]
  priority: 'high' | 'normal' | 'low'
  maxConcurrency?: number
  retryConfig?: {
    maxRetries: number
    backoffMs: number
    retryableErrors: (string | number)[]
  }
}

/**
 * Batch API response.
 */
export interface BatchAPIResponse {
  successful: Record<string, UnifiedMetadataResponse>
  failed: Record<string, APIError>
  rateLimit?: RateLimitInfo
  totalProcessed: number
  processingTimeMs: number
}

/**
 * Search query parameters for external APIs.
 */
export interface SearchQueryParams {
  title: string
  series?: string
  season?: number
  episode?: number
  year?: number
  productionCode?: string
  limit?: number
  includeAdult?: boolean
}

/**
 * Search response from external APIs.
 */
export interface SearchResponse {
  results: SearchResult[]
  totalResults: number
  page?: number
  totalPages?: number
  source: string
}

/**
 * Generic search result.
 */
export interface SearchResult {
  id: string
  title: string
  series?: string
  season?: number
  episode?: number
  year?: number
  relevanceScore: number
  url?: string
  thumbnailUrl?: string
}
