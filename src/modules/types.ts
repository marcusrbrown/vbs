// ============================================================================
// DOMAIN-SPECIFIC TYPES AND INTERFACES
// ============================================================================

/**
 * Core data types for Star Trek viewing guide content and user interactions.
 * These interfaces define the structure of Star Trek content, progress tracking,
 * and application state used throughout the VBS functional factory architecture.
 */

/**
 * Individual episode data with comprehensive metadata.
 * Used for episode-level tracking with detailed information including synopsis, guest stars, and connections.
 * Extended to support enriched metadata from multiple external sources (Memory Alpha, TMDB, etc.).
 *
 * @example
 * ```typescript
 * const episode: Episode = {
 *   id: 'ent_s1_e01',
 *   title: 'Broken Bow',
 *   season: 1,
 *   episode: 1,
 *   airDate: '2001-09-26',
 *   stardate: 'None',
 *   synopsis: 'Captain Archer and his crew embark on their first mission aboard Enterprise.',
 *   plotPoints: ['First contact with Klingons', 'Introduction of Temporal Cold War'],
 *   guestStars: ['John Fleck as Silik'],
 *   connections: [],
 *   // Extended metadata fields (optional for backward compatibility)
 *   productionCode: '176251',
 *   director: ['James L. Conway'],
 *   writer: ['Rick Berman', 'Brannon Braga'],
 *   memoryAlphaUrl: 'https://memory-alpha.fandom.com/wiki/Broken_Bow_(episode)',
 *   tmdbId: 228456,
 *   imdbId: 'tt0572248'
 * }
 * ```
 */
export interface Episode {
  /** Unique identifier for the episode across all series */
  id: string
  /** Episode title */
  title: string
  /** Season number */
  season: number
  /** Episode number within the season */
  episode: number
  /** Air date in YYYY-MM-DD format */
  airDate: string
  /** In-universe stardate for the episode */
  stardate: string
  /** Episode synopsis/summary */
  synopsis: string
  /** Key plot points and story elements */
  plotPoints: string[]
  /** Notable guest stars and recurring characters */
  guestStars: string[]
  /** Cross-series connections and references */
  connections: EpisodeConnection[]

  // Extended metadata fields from external sources (optional for backward compatibility)
  /** Production code for the episode (e.g., '176251') */
  productionCode?: string
  /** Director(s) of the episode */
  director?: string[]
  /** Writer(s) of the episode */
  writer?: string[]
  /** Memory Alpha URL for the episode page */
  memoryAlphaUrl?: string
  /** The Movie Database (TMDB) ID for the episode */
  tmdbId?: number
  /** Internet Movie Database (IMDb) ID for the episode */
  imdbId?: string
}

/**
 * Cross-series episode connection for tracking references and continuity.
 * Links episodes that share characters, events, or storylines across different series.
 *
 * @example
 * ```typescript
 * const connection: EpisodeConnection = {
 *   episodeId: 'tos_s2_e15',
 *   seriesId: 'tos',
 *   connectionType: 'character',
 *   description: 'Features Sarek, first introduced in this episode'
 * }
 * ```
 */
export interface EpisodeConnection {
  /** ID of the connected episode */
  episodeId: string
  /** Series ID of the connected episode */
  seriesId: string
  /** Type of connection: 'character', 'event', 'storyline', 'reference' */
  connectionType: 'character' | 'event' | 'storyline' | 'reference'
  /** Description of the connection */
  description: string
}

/**
 * Comprehensive episode metadata with data source tracking and validation status.
 * Used to track metadata enrichment from multiple external sources with freshness and reliability indicators.
 *
 * @example
 * ```typescript
 * const metadata: EpisodeMetadata = {
 *   episodeId: 'ent_s1_e01',
 *   dataSource: 'memory-alpha',
 *   lastUpdated: '2025-08-12T10:30:00.000Z',
 *   isValidated: true,
 *   confidenceScore: 0.95,
 *   version: '1.0',
 *   enrichmentStatus: 'complete',
 *   fieldValidation: {
 *     productionCode: { isValid: true, source: 'memory-alpha' },
 *     director: { isValid: true, source: 'tmdb' }
 *   }
 * }
 * ```
 */
export interface EpisodeMetadata {
  /** Episode ID this metadata belongs to */
  episodeId: string
  /** Primary data source for this metadata */
  dataSource: MetadataSourceType
  /** ISO timestamp when metadata was last updated */
  lastUpdated: string
  /** Whether the metadata has been validated for accuracy */
  isValidated: boolean
  /** Reliability score from 0-1 based on source confidence and data completeness */
  confidenceScore: number
  /** Schema version for metadata evolution tracking */
  version: string
  /** Current enrichment status */
  enrichmentStatus: 'pending' | 'partial' | 'complete' | 'failed'
  /** Validation status for individual metadata fields */
  fieldValidation?: Record<string, FieldValidationInfo>
  /** Conflict resolution history when multiple sources disagree */
  conflictResolution?: ConflictResolutionRecord[]
  /** Expiration timestamp for cache invalidation */
  expiresAt?: string
}

/**
 * Data source configuration for metadata enrichment with reliability scoring.
 * Tracks metadata source characteristics and performance metrics for intelligent source selection.
 *
 * @example
 * ```typescript
 * const source: MetadataSource = {
 *   name: 'memory-alpha',
 *   type: 'scraping',
 *   baseUrl: 'https://memory-alpha.fandom.com',
 *   confidenceLevel: 0.9,
 *   lastAccessed: '2025-08-12T10:30:00.000Z',
 *   isAvailable: true,
 *   rateLimit: { requestsPerMinute: 10, burstLimit: 5 },
 *   fields: ['synopsis', 'guestStars', 'productionCode'],
 *   reliability: { uptime: 0.99, accuracy: 0.95, latency: 250 }
 * }
 * ```
 */
export interface MetadataSource {
  /** Unique identifier for the data source */
  name: string
  /** Type of data source */
  type: MetadataSourceType
  /** Base URL for API or scraping */
  baseUrl: string
  /** Confidence level in data from this source (0-1) */
  confidenceLevel: number
  /** ISO timestamp of last successful access */
  lastAccessed: string
  /** Whether the source is currently available */
  isAvailable: boolean
  /** Rate limiting configuration */
  rateLimit: {
    requestsPerMinute: number
    burstLimit: number
  }
  /** Metadata fields this source can provide */
  fields: string[]
  /** Source reliability metrics */
  reliability: {
    uptime: number
    accuracy: number
    latency: number
  }
  /** Optional API configuration */
  apiConfig?: {
    apiKey?: string
    headers?: Record<string, string>
    timeout?: number
  }
}

/**
 * Cache configuration for metadata storage with expiration and update policies.
 * Manages IndexedDB storage for metadata with intelligent caching strategies and quota management.
 *
 * @example
 * ```typescript
 * const cache: MetadataCache = {
 *   storeName: 'episode-metadata',
 *   version: 1,
 *   keyPath: 'episodeId',
 *   expiration: { defaultTtl: 86400000, maxAge: 604800000 },
 *   updateStrategy: 'background-sync',
 *   quotaManagement: { maxSize: 50000000, cleanupThreshold: 0.8 },
 *   indexes: [
 *     { name: 'dataSource', keyPath: 'dataSource' },
 *     { name: 'lastUpdated', keyPath: 'lastUpdated' }
 *   ]
 * }
 * ```
 */
export interface MetadataCache {
  /** IndexedDB object store name */
  storeName: string
  /** Database version for schema evolution */
  version: number
  /** Primary key path for the object store */
  keyPath: string
  /** Expiration policies for cached metadata */
  expiration: {
    defaultTtl: number // Default time-to-live in milliseconds
    maxAge: number // Maximum age before forced refresh
  }
  /** Strategy for updating cached metadata */
  updateStrategy: 'immediate' | 'background-sync' | 'on-demand'
  /** Quota management for IndexedDB storage */
  quotaManagement: {
    maxSize: number // Maximum storage size in bytes
    cleanupThreshold: number // Cleanup when usage exceeds this ratio
  }
  /** Secondary indexes for efficient querying */
  indexes: {
    name: string
    keyPath: string
    unique?: boolean
  }[]
}

/**
 * Field-level validation information for metadata quality tracking.
 */
export interface FieldValidationInfo {
  /** Whether the field value is valid */
  isValid: boolean
  /** Source that provided this field value */
  source: MetadataSourceType
  /** Validation timestamp */
  validatedAt?: string
  /** Validation error message if applicable */
  error?: string
}

/**
 * Record of conflict resolution when multiple sources provide different values.
 */
export interface ConflictResolutionRecord {
  /** Field name that had conflicting values */
  fieldName: string
  /** Conflicting values from different sources */
  conflicts: {
    source: MetadataSourceType
    value: unknown
    confidence: number
  }[]
  /** Chosen resolution value */
  resolution: unknown
  /** Strategy used for resolution */
  strategy:
    | 'highest-confidence'
    | 'most-recent'
    | 'manual'
    | 'consensus'
    | 'source-priority'
    | 'field-specific'
  /** Timestamp of resolution */
  resolvedAt: string
}

/**
 * Supported metadata source types.
 */
export type MetadataSourceType =
  | 'memory-alpha'
  | 'tmdb'
  | 'imdb'
  | 'manual'
  | 'trekcore'
  | 'stapi'
  | 'startrek-com'

/**
 * Represents a single Star Trek content item (series, movie, or animated content).
 * Each item belongs to a chronological era and tracks viewing metadata.
 * Updated to support optional episode-level data for detailed tracking.
 *
 * @example
 * ```typescript
 * const item: StarTrekItem = {
 *   id: 'tos_s1',
 *   title: 'The Original Series - Season 1',
 *   type: 'series',
 *   year: '1966-1967',
 *   stardate: '1312.4-3619.2',
 *   episodes: 29,
 *   notes: 'The voyages of the original Enterprise crew',
 *   episodeData: [] // Optional array of Episode objects
 * }
 * ```
 */
export interface StarTrekItem {
  /** Unique identifier for the item across all eras */
  id: string
  /** Display title for the content */
  title: string
  /** Content type: 'series', 'movie', 'animated', etc. */
  type: string
  /** Year or year range when content was released */
  year: string
  /** In-universe stardate or stardate range */
  stardate: string
  /** Number of episodes (optional, for series content) */
  episodes?: number
  /** Additional notes or description */
  notes: string
  /** Optional array of detailed episode data for episode-level tracking */
  episodeData?: Episode[]
}

/**
 * Represents a chronological era containing related Star Trek content.
 * Eras group content by time period and provide hierarchical organization.
 *
 * @example
 * ```typescript
 * const era: StarTrekEra = {
 *   id: 'tos',
 *   title: '23rd Century – The Original Series Era',
 *   years: '2233-2293',
 *   stardates: '1312.4-9521.6',
 *   description: 'The era of Kirk, Spock, and the original Enterprise',
 *   items: [] // Array of StarTrekItem objects
 * }
 * ```
 */
export interface StarTrekEra {
  /** Unique identifier for the era */
  id: string
  /** Display title including century and era name */
  title: string
  /** Real-world year range covered by the era */
  years: string
  /** In-universe stardate range for the era */
  stardates: string
  /** Descriptive text about the era */
  description: string
  /** Array of Star Trek content items in this era */
  items: StarTrekItem[]
}

/**
 * Basic progress tracking data with completion statistics.
 * Used for both overall progress and era-specific progress calculations.
 *
 * @example
 * ```typescript
 * const progress: ProgressData = {
 *   total: 100,
 *   completed: 45,
 *   percentage: 45.0
 * }
 * ```
 */
export interface ProgressData {
  /** Total number of items */
  total: number
  /** Number of completed/watched items */
  completed: number
  /** Completion percentage (0-100) */
  percentage: number
}

/**
 * Era-specific progress data extending basic progress with era identification.
 * Used in progress calculations and UI rendering for individual eras.
 *
 * @example
 * ```typescript
 * const eraProgress: EraProgress = {
 *   eraId: 'tos',
 *   total: 29,
 *   completed: 15,
 *   percentage: 51.7
 * }
 * ```
 */
export interface EraProgress extends ProgressData {
  /** Identifier of the era this progress relates to */
  eraId: string
}

/**
 * Complete progress tracking data including overall and per-era statistics.
 * Used by progress tracker and timeline renderer for comprehensive progress display.
 *
 * @example
 * ```typescript
 * const overallProgress: OverallProgress = {
 *   overall: { total: 100, completed: 45, percentage: 45.0 },
 *   eraProgress: [
 *     { eraId: 'tos', total: 29, completed: 15, percentage: 51.7 },
 *     { eraId: 'tng', total: 35, completed: 30, percentage: 85.7 }
 *   ]
 * }
 * ```
 */
export interface OverallProgress {
  /** Overall progress across all eras */
  overall: ProgressData
  /** Progress breakdown by individual era */
  eraProgress: EraProgress[]
}

/**
 * Episode-level progress tracking data for individual episode completion.
 * Used in hierarchical progress calculations and episode-specific UI components.
 *
 * @example
 * ```typescript
 * const episodeProgress: EpisodeProgress = {
 *   episodeId: 'ent_s1_e01',
 *   seriesId: 'ent_s1',
 *   season: 1,
 *   episode: 1,
 *   isWatched: true,
 *   watchedAt: '2025-08-03T10:30:00.000Z'
 * }
 * ```
 */
export interface EpisodeProgress {
  /** Unique identifier for the episode */
  episodeId: string
  /** Identifier for the series/season this episode belongs to */
  seriesId: string
  /** Season number */
  season: number
  /** Episode number within the season */
  episode: number
  /** Whether the episode has been watched */
  isWatched: boolean
  /** Timestamp when the episode was marked as watched (optional) */
  watchedAt?: string
}

/**
 * Season-level progress tracking data for hierarchical progress calculations.
 * Aggregates episode progress within a season and provides season completion statistics.
 *
 * @example
 * ```typescript
 * const seasonProgress: SeasonProgress = {
 *   seriesId: 'ent_s1',
 *   season: 1,
 *   totalEpisodes: 26,
 *   watchedEpisodes: 15,
 *   percentage: 57.7,
 *   episodeProgress: [] // Array of EpisodeProgress objects
 * }
 * ```
 */
export interface SeasonProgress extends ProgressData {
  /** Identifier for the series this season belongs to */
  seriesId: string
  /** Season number */
  season: number
  /** Total number of episodes in the season */
  totalEpisodes: number
  /** Number of watched episodes in the season */
  watchedEpisodes: number
  /** Array of individual episode progress within this season */
  episodeProgress: EpisodeProgress[]
}

/**
 * Current state of search and filter controls.
 * Used by SearchFilter factory to track user input and filtering preferences.
 *
 * @example
 * ```typescript
 * const filterState: FilterState = {
 *   search: 'enterprise',
 *   filter: 'series',
 *   streamingPlatforms: ['paramount-plus', 'netflix'],
 *   availabilityOnly: true
 * }
 * ```
 */
export interface FilterState {
  /** Current search term entered by user */
  search: string
  /** Current filter type selection */
  filter: string
  /** Filter by specific streaming platforms */
  streamingPlatforms?: string[]
  /** Show only content available on any streaming platform */
  availabilityOnly?: boolean
  /** Filter by streaming availability type (free, subscription, rent, buy) */
  availabilityType?: string[]
  /** Filter by maximum price for paid content */
  maxPrice?: number
}

/**
 * Episode-specific filtering criteria for detailed episode search and management.
 * Used by EpisodeManager factory to handle episode-level filtering and discovery.
 *
 * @example
 * ```typescript
 * const criteria: EpisodeFilterCriteria = {
 *   searchTerm: 'borg',
 *   seriesId: 'tng',
 *   season: 3,
 *   guestStars: ['John de Lancie'],
 *   plotKeywords: ['time travel'],
 *   spoilerLevel: 'safe',
 *   streamingPlatforms: ['paramount-plus'],
 *   availabilityType: ['subscription']
 * }
 * ```
 */
export interface EpisodeFilterCriteria {
  /** Text search across episode titles, synopsis, and plot points */
  searchTerm?: string
  /** Filter by specific series ID */
  seriesId?: string
  /** Filter by specific season number */
  season?: number
  /** Filter by guest star appearances */
  guestStars?: string[]
  /** Filter by plot keywords and themes */
  plotKeywords?: string[]
  /** Spoiler safety level for content display */
  spoilerLevel?: 'safe' | 'moderate' | 'full'
  /** Filter by episode air date range */
  airDateRange?: {
    start: string
    end: string
  }
  /** Filter by watched/unwatched status */
  watchedStatus?: 'watched' | 'unwatched' | 'any'
  /** Filter by specific streaming platforms */
  streamingPlatforms?: string[]
  /** Show only content available on any streaming platform */
  availabilityOnly?: boolean
  /** Filter by streaming availability type (free, subscription, rent, buy) */
  availabilityType?: string[]
  /** Filter by maximum price for paid content */
  maxPrice?: number
}

/**
 * Data structure for progress import/export functionality.
 * Ensures version compatibility and includes metadata for data integrity.
 *
 * @example
 * ```typescript
 * const exportData: ProgressExportData = {
 *   version: '1.0',
 *   timestamp: '2025-08-02T10:30:00.000Z',
 *   progress: ['tos_s1', 'tos_s2', 'tng_s1']
 * }
 * ```
 */
export interface ProgressExportData {
  /** Data format version for compatibility checking */
  version: string
  /** ISO timestamp when data was exported */
  timestamp: string
  /** Array of watched item IDs */
  progress: string[]
}

// ============================================================================
// FACTORY INSTANCE INTERFACES
// ============================================================================

/**
 * Factory function return type definitions for the VBS functional architecture.
 * These interfaces define the public API contracts for each factory-created instance.
 * All instances use closure-based state management and dependency injection patterns.
 */

/**
 * Public API interface for ProgressTracker factory instances.
 * Manages viewing progress state and provides progress calculation functionality.
 * Uses closure-based state management for watched items and callback collections.
 *
 * @example
 * ```typescript
 * const progressTracker = createProgressTracker()
 * progressTracker.toggleItem('tos_s1')
 *
 * progressTracker.on('item-toggle', ({ itemId, isWatched }) => {
 *   console.log(`${itemId}: ${isWatched}`)
 * })
 * ```
 */
export interface ProgressTrackerInstance {
  /** Set the complete list of watched items (used for import functionality) */
  setWatchedItems: (items: string[]) => void
  /** Toggle the watched state of a specific item */
  toggleItem: (itemId: string) => void
  /** Check if a specific item is marked as watched */
  isWatched: (itemId: string) => boolean
  /** Reset all progress data (clear all watched items) */
  resetProgress: () => void
  /** Get immutable copy of currently watched item IDs */
  getWatchedItems: () => string[]
  /** Update progress calculations and notify subscribers */
  updateProgress: () => void
  /** Calculate overall progress statistics across all eras */
  calculateOverallProgress: () => ProgressData
  /** Calculate progress statistics for each individual era */
  calculateEraProgress: () => EraProgress[]

  // Generic EventEmitter methods for enhanced type safety
  /** Subscribe to an event with a type-safe listener */
  on: <TEventName extends keyof ProgressTrackerEvents>(
    eventName: TEventName,
    listener: EventListener<ProgressTrackerEvents[TEventName]>,
  ) => void
  /** Unsubscribe from an event */
  off: <TEventName extends keyof ProgressTrackerEvents>(
    eventName: TEventName,
    listener: EventListener<ProgressTrackerEvents[TEventName]>,
  ) => void
  /** Subscribe to an event once (auto-unsubscribe after first emission) */
  once: <TEventName extends keyof ProgressTrackerEvents>(
    eventName: TEventName,
    listener: EventListener<ProgressTrackerEvents[TEventName]>,
  ) => void
  /** Remove all listeners for a specific event or all events */
  removeAllListeners: <TEventName extends keyof ProgressTrackerEvents>(
    eventName?: TEventName,
  ) => void
}

/**
 * Public API interface for EpisodeTracker factory instances.
 * Manages episode-level progress tracking with hierarchical calculations and bulk operations.
 * Uses closure-based state management separate from season-level progress tracking.
 *
 * @example
 * ```typescript
 * const episodeTracker = createEpisodeTracker()
 * episodeTracker.toggleEpisode('ent_s1_e01')
 * episodeTracker.markSeasonWatched('ent_s1', 1)
 *
 * episodeTracker.on('episode-toggle', ({ episodeId, isWatched }) => {
 *   console.log(`Episode ${episodeId}: ${isWatched}`)
 * })
 * ```
 */
export interface EpisodeTrackerInstance {
  /** Set the complete list of watched episodes (used for import functionality) */
  setWatchedEpisodes: (episodeIds: string[]) => void
  /** Toggle the watched state of a specific episode */
  toggleEpisode: (episodeId: string) => void
  /** Check if a specific episode is marked as watched */
  isEpisodeWatched: (episodeId: string) => boolean
  /** Mark all episodes in a season as watched */
  markSeasonWatched: (seriesId: string, season: number) => void
  /** Mark all episodes in a season as unwatched */
  markSeasonUnwatched: (seriesId: string, season: number) => void
  /** Reset all episode progress data (clear all watched episodes) */
  resetEpisodeProgress: () => void
  /** Get immutable copy of currently watched episode IDs */
  getWatchedEpisodes: () => string[]
  /** Update episode progress calculations and notify subscribers */
  updateEpisodeProgress: () => void
  /** Calculate progress statistics for a specific season */
  calculateSeasonProgress: (seriesId: string, season: number) => SeasonProgress | null
  /** Calculate episode progress statistics across all series */
  calculateEpisodeProgress: () => SeasonProgress[]

  // Generic EventEmitter methods for enhanced type safety
  /** Subscribe to an event with a type-safe listener */
  on: <TEventName extends keyof EpisodeTrackerEvents>(
    eventName: TEventName,
    listener: EventListener<EpisodeTrackerEvents[TEventName]>,
  ) => void
  /** Unsubscribe from an event */
  off: <TEventName extends keyof EpisodeTrackerEvents>(
    eventName: TEventName,
    listener: EventListener<EpisodeTrackerEvents[TEventName]>,
  ) => void
  /** Subscribe to an event once (auto-unsubscribe after first emission) */
  once: <TEventName extends keyof EpisodeTrackerEvents>(
    eventName: TEventName,
    listener: EventListener<EpisodeTrackerEvents[TEventName]>,
  ) => void
  /** Remove all listeners for a specific event or all events */
  removeAllListeners: <TEventName extends keyof EpisodeTrackerEvents>(
    eventName?: TEventName,
  ) => void
}

/**
 * Public API interface for SearchFilter factory instances.
 * Manages search and filter state with real-time content filtering functionality.
 * Uses closure-based state management for current filters and callback collections.
 *
 * @example
 * ```typescript
 * const searchFilter = createSearchFilter()
 * searchFilter.setSearch('enterprise')
 * searchFilter.setFilter('series')
 *
 * searchFilter.on('filter-change', ({ filteredData, filterState }) => {
 *   renderTimeline(filteredData)
 *   updateSearchUI(filterState)
 * })
 * ```
 */
export interface SearchFilterInstance {
  /** Set the current search term */
  setSearch: (searchTerm: string) => void
  /** Set the current filter type */
  setFilter: (filterType: string) => void
  /** Set streaming platform filters */
  setStreamingPlatforms: (platforms: string[]) => void
  /** Set availability only filter */
  setAvailabilityOnly: (availabilityOnly: boolean) => void
  /** Set streaming availability type filters */
  setAvailabilityType: (types: string[]) => void
  /** Set maximum price filter */
  setMaxPrice: (maxPrice?: number) => void
  /** Get filtered data based on current search and filter criteria */
  getFilteredData: () => Promise<StarTrekEra[]>
  /** Check if a specific item matches current filter criteria */
  matchesFilters: (item: StarTrekItem) => Promise<boolean>
  /** Trigger filter change notifications to subscribers */
  notifyFilterChange: () => Promise<void>
  /** Get current search and filter state */
  getCurrentFilters: () => FilterState

  /** Subscribe to an event with a type-safe listener */
  on: <TEventName extends keyof SearchFilterEvents>(
    eventName: TEventName,
    listener: EventListener<SearchFilterEvents[TEventName]>,
  ) => void
  /** Unsubscribe from an event */
  off: <TEventName extends keyof SearchFilterEvents>(
    eventName: TEventName,
    listener: EventListener<SearchFilterEvents[TEventName]>,
  ) => void
  /** Subscribe to an event once (auto-unsubscribe after first emission) */
  once: <TEventName extends keyof SearchFilterEvents>(
    eventName: TEventName,
    listener: EventListener<SearchFilterEvents[TEventName]>,
  ) => void
  /** Remove all listeners for a specific event or all events */
  removeAllListeners: <TEventName extends keyof SearchFilterEvents>(eventName?: TEventName) => void
}

/**
 * Public API interface for EpisodeManager factory instances.
 * Manages episode-level filtering, search, and lazy loading functionality with spoiler-safe content display.
 * Uses closure-based state management for episode lists and filtering criteria.
 *
 * @example
 * ```typescript
 * const episodeManager = createEpisodeManager()
 * episodeManager.setFilterCriteria({ seriesId: 'ent', season: 1 })
 * episodeManager.searchEpisodes('borg')
 *
 * episodeManager.on('filter-change', ({ filteredEpisodes, filterCriteria }) => {
 *   renderEpisodeList(filteredEpisodes)
 *   updateFilterUI(filterCriteria)
 * })
 * ```
 */
export interface EpisodeManagerInstance {
  /** Set episode filtering criteria */
  setFilterCriteria: (criteria: EpisodeFilterCriteria) => void
  /** Search episodes by text across multiple fields */
  searchEpisodes: (searchTerm: string) => void
  /** Get episodes for a specific series and season */
  getEpisodesForSeason: (seriesId: string, season: number) => Episode[]
  /** Get filtered episodes based on current criteria */
  getFilteredEpisodes: () => Episode[]
  /** Load more episodes for lazy loading functionality */
  loadMoreEpisodes: (count?: number) => void
  /** Toggle episode detail expansion with spoiler control */
  toggleEpisodeDetail: (episodeId: string, spoilerLevel?: 'safe' | 'moderate' | 'full') => void
  /** Check if episode matches current filter criteria */
  matchesFilter: (episode: Episode) => boolean
  /** Get current filtering state */
  getCurrentCriteria: () => EpisodeFilterCriteria
  /** Reset all filters and search criteria */
  resetFilters: () => void
  /** Set spoiler safety level for content display */
  setSpoilerLevel: (level: 'safe' | 'moderate' | 'full') => void

  /** Subscribe to an event with a type-safe listener */
  on: <TEventName extends keyof EpisodeManagerEvents>(
    eventName: TEventName,
    listener: EventListener<EpisodeManagerEvents[TEventName]>,
  ) => void
  /** Unsubscribe from an event */
  off: <TEventName extends keyof EpisodeManagerEvents>(
    eventName: TEventName,
    listener: EventListener<EpisodeManagerEvents[TEventName]>,
  ) => void
  /** Subscribe to an event once (auto-unsubscribe after first emission) */
  once: <TEventName extends keyof EpisodeManagerEvents>(
    eventName: TEventName,
    listener: EventListener<EpisodeManagerEvents[TEventName]>,
  ) => void
  /** Remove all listeners for a specific event or all events */
  removeAllListeners: <TEventName extends keyof EpisodeManagerEvents>(
    eventName?: TEventName,
  ) => void
}

/**
 * Public API interface for TimelineRenderer factory instances.
 * Manages DOM rendering and UI interactions for the Star Trek timeline.
 * Uses dependency injection to integrate with ProgressTracker for real-time updates.
 *
 * @example
 * ```typescript
 * const timelineRenderer = createTimelineRenderer(container, progressTracker)
 * timelineRenderer.render(starTrekData)
 * timelineRenderer.expandAll()
 * ```
 */
export interface TimelineRendererInstance {
  /** Render the complete timeline with provided era data */
  render: (data: StarTrekEra[]) => void
  /** Create DOM element for a specific era section */
  createEraElement: (era: StarTrekEra) => HTMLDivElement
  /** Create HTML string for a specific Star Trek item */
  createItemElement: (item: StarTrekItem) => string
  /** Create HTML string for an individual episode */
  createEpisodeElement: (episode: Episode, seriesId: string) => string
  /** Create HTML string for episode list with lazy loading support */
  createLazyEpisodeListContent: (item: StarTrekItem) => string
  /** Toggle the expanded/collapsed state of an era section */
  toggleEra: (eraId: string) => void
  /** Toggle the expanded/collapsed state of an episode list for a series */
  toggleEpisodeList: (seriesId: string) => void
  /** Load more episodes for a specific series (lazy loading) */
  loadMoreEpisodes: (seriesId: string) => void
  /** Load streaming availability indicators for all episodes asynchronously */
  loadStreamingIndicators: () => Promise<void>
  /** Expand all era sections */
  expandAll: () => void
  /** Collapse all era sections */
  collapseAll: () => void
  /** Update progress display with new progress data */
  updateProgress: (progressData: OverallProgress) => void
  /** Update the visual state of all items based on watched status */
  updateItemStates: () => void
  /** Calculate progress statistics for a specific era */
  calculateEraProgress: (era: StarTrekEra) => EraProgress
  /** Setup keyboard navigation for episode lists in an era element */
  setupEpisodeKeyboardNavigation: (eraElement: HTMLElement) => void
}

// ============================================================================
// FACTORY FUNCTION TYPE ALIASES
// ============================================================================

/**
 * Type aliases for factory function signatures used in dependency injection.
 * These types ensure proper typing when passing factory functions as dependencies
 * and enable type-safe composition of the functional architecture.
 */

/**
 * Factory function signature for creating ProgressTracker instances.
 * Returns a ProgressTracker instance with closure-based state management.
 * Uses generic constraints to ensure type safety and proper EventEmitter integration.
 *
 * @returns ProgressTrackerInstance with methods for progress tracking
 *
 * @example
 * ```typescript
 * const createTracker: CreateProgressTracker = () => createProgressTracker()
 * const tracker = createTracker()
 *
 * // Type-safe event handling
 * tracker.on('item-toggle', ({ itemId, isWatched }) => {
 *   console.log(`${itemId} is now ${isWatched ? 'watched' : 'unwatched'}`)
 * })
 * ```
 */
export type CreateProgressTracker = () => ProgressTrackerInstance

/**
 * Factory function signature for creating SearchFilter instances.
 * Returns a SearchFilter instance with closure-based filter state management.
 * Uses generic constraints to ensure type safety and proper EventEmitter integration.
 *
 * @returns SearchFilterInstance with methods for search and filtering
 *
 * @example
 * ```typescript
 * const createFilter: CreateSearchFilter = () => createSearchFilter()
 * const filter = createFilter()
 *
 * // Type-safe event handling
 * filter.on('filter-change', ({ filteredData, filterState }) => {
 *   renderTimeline(filteredData)
 *   updateSearchUI(filterState)
 * })
 * ```
 */
export type CreateSearchFilter = () => SearchFilterInstance

/**
 * Factory function signature for creating EpisodeManager instances.
 * Returns an EpisodeManager instance with closure-based state management for episode filtering and search.
 * Uses generic constraints to ensure type safety and proper EventEmitter integration.
 *
 * @returns EpisodeManagerInstance with methods for episode management and filtering
 *
 * @example
 * ```typescript
 * const createManager: CreateEpisodeManager = () => createEpisodeManager()
 * const manager = createManager()
 *
 * // Type-safe event handling
 * manager.on('filter-change', ({ filteredEpisodes, filterCriteria }) => {
 *   renderEpisodeList(filteredEpisodes)
 *   updateFilterUI(filterCriteria)
 * })
 * ```
 */
export type CreateEpisodeManager = () => EpisodeManagerInstance

/**
 * Factory function signature for creating TimelineRenderer instances.
 * Requires dependency injection of container element and progress tracker.
 * Uses generic constraints to ensure proper typing of dependencies.
 *
 * @param container - DOM container element for timeline rendering
 * @param progressTracker - ProgressTracker instance for progress integration
 * @returns TimelineRendererInstance with methods for timeline rendering
 *
 * @example
 * ```typescript
 * const createRenderer: CreateTimelineRenderer = (container, tracker) =>
 *   createTimelineRenderer(container, tracker)
 *
 * const renderer = createRenderer(document.getElementById('timeline')!, progressTracker)
 * ```
 */
export type CreateTimelineRenderer = <
  TContainer extends HTMLElement = HTMLElement,
  TProgressTracker extends ProgressTrackerInstance = ProgressTrackerInstance,
>(
  container: TContainer,
  progressTracker: TProgressTracker,
) => TimelineRendererInstance

/**
 * Factory function signature for creating generic storage instances.
 * Uses generic constraints to ensure type-safe storage operations.
 *
 * @template TData - Type of data to be stored and retrieved
 * @param adapter - Storage adapter implementation for the specific storage backend
 * @param defaultKey - Optional default key for storage operations
 * @returns Storage instance with type-safe methods
 *
 * @example
 * ```typescript
 * interface UserPreferences {
 *   theme: 'light' | 'dark'
 *   notifications: boolean
 * }
 *
 * const createUserStorage: CreateStorage<UserPreferences> = (adapter, key) =>
 *   createStorage(adapter, key)
 * ```
 */
export type CreateStorage = <TData = unknown>(
  adapter: import('./storage.js').StorageAdapter<TData>,
  defaultKey?: string,
) => {
  save: (keyOrData: string | TData, data?: TData) => Promise<void> | void
  load: (key?: string) => Promise<TData | null> | TData | null
  remove: (key?: string) => Promise<void> | void
  clear: () => Promise<void> | void
  exists: (key?: string) => Promise<boolean> | boolean
}

// ============================================================================
// ENHANCED FACTORY UTILITY TYPES
// ============================================================================

/**
 * Extract configuration options for factory functions using utility types.
 * Combines PickOptional and PickRequired for flexible factory configuration.
 *
 * @example
 * ```typescript
 * interface RendererConfig {
 *   container: HTMLElement
 *   theme?: 'light' | 'dark'
 *   animations?: boolean
 *   progressTracker: ProgressTrackerInstance
 * }
 *
 * type RendererOptions = FactoryConfig<RendererConfig, 'container' | 'progressTracker'>
 * // Result: { container: HTMLElement; progressTracker: ProgressTrackerInstance; theme?: 'light' | 'dark'; animations?: boolean }
 * ```
 */
export type FactoryConfig<TConfig, TRequired extends keyof TConfig> = PickRequired<
  TConfig,
  TRequired
> &
  Partial<Omit<TConfig, TRequired>>

/**
 * Create a factory instance type that includes EventEmitter capabilities.
 * Combines base instance type with generic EventEmitter methods.
 *
 * @example
 * ```typescript
 * interface BaseModule {
 *   getData(): string[]
 *   setData(data: string[]): void
 * }
 *
 * interface ModuleEvents {
 *   'data-changed': { newData: string[] }
 * }
 *
 * type ModuleInstance = EventCapableFactory<BaseModule, ModuleEvents>
 * ```
 */
export type EventCapableFactory<TBase, TEvents extends EventMap> = TBase & {
  on: <TEventName extends keyof TEvents>(
    eventName: TEventName,
    listener: EventListener<TEvents[TEventName]>,
  ) => void
  off: <TEventName extends keyof TEvents>(
    eventName: TEventName,
    listener: EventListener<TEvents[TEventName]>,
  ) => void
  once: <TEventName extends keyof TEvents>(
    eventName: TEventName,
    listener: EventListener<TEvents[TEventName]>,
  ) => void
  removeAllListeners: <TEventName extends keyof TEvents>(eventName?: TEventName) => void
}

/**
 * Create a type-safe factory dependency map for dependency injection.
 * Uses utility types to ensure proper dependency relationships.
 *
 * @example
 * ```typescript
 * type AppDependencies = FactoryDependencyMap<{
 *   progressTracker: ProgressTrackerInstance
 *   searchFilter: SearchFilterInstance
 *   storage: StorageAdapter<string[]>
 * }>
 * ```
 */
export type FactoryDependencyMap<TDeps extends Record<string, unknown>> = DeepReadonly<
  Required<TDeps>
>

/**
 * Extract the state properties from a factory instance (non-function properties).
 * Useful for state synchronization and persistence in factory functions.
 *
 * @example
 * ```typescript
 * interface ModuleInstance {
 *   count: number
 *   items: string[]
 *   increment(): void
 *   reset(): void
 * }
 *
 * type ModuleState = FactoryState<ModuleInstance>  // { count: number; items: string[] }
 * ```
 */
export type FactoryState<TInstance> = NonFunctionProperties<TInstance>

/**
 * Extract the methods from a factory instance (function properties only).
 * Useful for creating method proxies and API surfaces.
 *
 * @example
 * ```typescript
 * interface ModuleInstance {
 *   count: number
 *   items: string[]
 *   increment(): void
 *   reset(): void
 * }
 *
 * type ModuleMethods = FactoryMethods<ModuleInstance>  // { increment(): void; reset(): void }
 * ```
 */
export type FactoryMethods<TInstance> = FunctionProperties<TInstance>

// ============================================================================
// GENERIC UTILITY TYPES LIBRARY
// ============================================================================

/**
 * Generic utility types for enhanced type safety and reusability in the VBS codebase.
 * These types are designed to work seamlessly with the functional factory pattern
 * and closure-based state management used throughout the application.
 */

// ----------------------------------------------------------------------------
// Deep Utility Types
// ----------------------------------------------------------------------------

/**
 * Make all properties of T optional recursively, including nested objects.
 * Useful for factory function update methods and partial state modifications.
 *
 * @example
 * ```typescript
 * interface User { profile: { name: string; age: number } }
 * type PartialUser = DeepPartial<User>  // { profile?: { name?: string; age?: number } }
 * ```
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/**
 * Make all properties of T required recursively, including nested objects.
 * Ensures complete object initialization in factory functions.
 *
 * @example
 * ```typescript
 * interface Config { api?: { url?: string; timeout?: number } }
 * type CompleteConfig = DeepRequired<Config>  // { api: { url: string; timeout: number } }
 * ```
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P]
}

/**
 * Make all properties of T readonly recursively, including nested objects.
 * Ensures immutable state in functional factory patterns.
 *
 * @example
 * ```typescript
 * interface State { items: string[]; config: { enabled: boolean } }
 * type ImmutableState = DeepReadonly<State>
 * ```
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P]
}

// ----------------------------------------------------------------------------
// Enhanced Pick/Omit Utilities
// ----------------------------------------------------------------------------

/**
 * Pick properties from T, with the picked properties made optional.
 * Useful for factory function configuration objects.
 *
 * @example
 * ```typescript
 * interface FullConfig { url: string; timeout: number; retries: number }
 * type OptionalConfig = PickOptional<FullConfig, 'timeout' | 'retries'>
 * // Result: { url: string; timeout?: number; retries?: number }
 * ```
 */
export type PickOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/**
 * Pick properties from T, with the picked properties made required.
 * Ensures critical properties are always provided in factory functions.
 *
 * @example
 * ```typescript
 * interface Config { url?: string; timeout?: number; debug?: boolean }
 * type RequiredConfig = PickRequired<Config, 'url'>
 * // Result: { url: string; timeout?: number; debug?: boolean }
 * ```
 */
export type PickRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

/**
 * Create a new type by renaming keys from T.
 * Useful for API transformations and data mapping in factory functions.
 *
 * @example
 * ```typescript
 * interface ApiResponse { user_id: string; user_name: string }
 * type ClientUser = RenameKeys<ApiResponse, { user_id: 'id'; user_name: 'name' }>
 * // Result: { id: string; name: string }
 * ```
 */
export type RenameKeys<T, M extends Partial<Record<keyof T, string>>> = {
  [K in keyof M as M[K] extends string ? M[K] : never]: K extends keyof T ? T[K] : never
} & Omit<T, keyof M>

// ----------------------------------------------------------------------------
// Factory Function Utilities
// ----------------------------------------------------------------------------

/**
 * Extract the return type of a factory function.
 * Ensures type safety when working with factory function instances.
 *
 * @example
 * ```typescript
 * const createCounter = () => ({ count: 0, increment: () => void 0 })
 * type Counter = FactoryReturnType<typeof createCounter>  // { count: number; increment: () => void }
 * ```
 */
export type FactoryReturnType<T extends (...args: any[]) => any> = ReturnType<T>

/**
 * Extract the parameters of a factory function.
 * Useful for dependency injection and factory composition.
 *
 * @example
 * ```typescript
 * const createRenderer = (container: HTMLElement, tracker: ProgressTrackerInstance) => ({})
 * type RendererDeps = FactoryParameters<typeof createRenderer>  // [HTMLElement, ProgressTrackerInstance]
 * ```
 */
export type FactoryParameters<T extends (...args: any[]) => any> = Parameters<T>

/**
 * Generic constraint for factory functions that return an object with methods.
 * Ensures factory functions follow the established pattern.
 *
 * @example
 * ```typescript
 * const createModule: FactoryFunction<{ init(): void; destroy(): void }> = () => ({
 *   init: () => {},
 *   destroy: () => {}
 * })
 * ```
 */
export type FactoryFunction<T = Record<string, any>> = (...args: any[]) => T

/**
 * Create a partial version of a factory instance for update operations.
 * Excludes function properties, focusing on state properties.
 *
 * @example
 * ```typescript
 * interface ModuleInstance { count: number; name: string; increment(): void }
 * type ModuleUpdate = FactoryUpdate<ModuleInstance>  // { count?: number; name?: string }
 * ```
 */
export type FactoryUpdate<T> = Partial<{
  [K in keyof T as T[K] extends (...args: any[]) => any ? never : K]: T[K]
}>

// ----------------------------------------------------------------------------
// Callback and Event Utilities
// ----------------------------------------------------------------------------

/**
 * Extract payload type from a callback function.
 * Ensures type safety when working with callback systems.
 *
 * @example
 * ```typescript
 * type ToggleCallback = (itemId: string, isWatched: boolean) => void
 * type TogglePayload = CallbackPayload<ToggleCallback>  // [string, boolean]
 * ```
 */
export type CallbackPayload<T extends (...args: any[]) => any> = Parameters<T>

/**
 * Create a type-safe callback collection for factory functions.
 * Supports multiple callback types with proper type inference.
 *
 * @example
 * ```typescript
 * type ModuleCallbacks = CallbackCollection<{
 *   onChange: (value: string) => void
 *   onError: (error: Error) => void
 * }>
 * ```
 */
export type CallbackCollection<T extends Record<string, (...args: any[]) => any>> = {
  [K in keyof T]: T[K][]
}

/**
 * Create a union type from callback collection keys.
 * Useful for event name validation and type-safe event emission.
 *
 * @example
 * ```typescript
 * type Events = { click: () => void; change: (value: string) => void }
 * type EventNames = CallbackKeys<Events>  // 'click' | 'change'
 * ```
 */
export type CallbackKeys<T extends Record<string, (...args: any[]) => any>> = keyof T

// ----------------------------------------------------------------------------
// Conditional and Utility Types
// ----------------------------------------------------------------------------

/**
 * Check if a type is never (empty union).
 * Useful for conditional type logic in generic constraints.
 */
export type IsNever<T> = [T] extends [never] ? true : false

/**
 * Check if a type is a function.
 * Useful for filtering object properties by type.
 */
export type IsFunction<T> = T extends (...args: any[]) => any ? true : false

/**
 * Extract only function properties from a type.
 * Useful for separating methods from state in factory instances.
 *
 * @example
 * ```typescript
 * interface Module { count: number; increment(): void; reset(): void }
 * type ModuleMethods = FunctionProperties<Module>  // { increment(): void; reset(): void }
 * ```
 */
export type FunctionProperties<T> = {
  [K in keyof T as T[K] extends (...args: any[]) => any ? K : never]: T[K]
}

/**
 * Extract only non-function properties from a type.
 * Useful for separating state from methods in factory instances.
 *
 * @example
 * ```typescript
 * interface Module { count: number; name: string; increment(): void }
 * type ModuleState = NonFunctionProperties<Module>  // { count: number; name: string }
 * ```
 */
export type NonFunctionProperties<T> = {
  [K in keyof T as T[K] extends (...args: any[]) => any ? never : K]: T[K]
}

/**
 * Create a type that requires at least one property from T.
 * Prevents empty objects in factory function parameters.
 *
 * @example
 * ```typescript
 * interface UpdateOptions { name?: string; age?: number; email?: string }
 * type RequireAtLeastOne = AtLeastOne<UpdateOptions>
 * // Must have at least one of: name, age, or email
 * ```
 */
export type AtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<keyof T, K>>>
}[keyof T]

/**
 * Create a type that allows exactly one property from T.
 * Useful for discriminated unions and exclusive options.
 *
 * @example
 * ```typescript
 * interface LoadOptions { url?: string; file?: File; data?: string }
 * type ExactlyOneOption = ExactlyOne<LoadOptions>
 * // Must have exactly one of: url, file, or data
 * ```
 */
export type ExactlyOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Record<Exclude<keyof T, K>, never>>
}[keyof T]

// ============================================================================
// GENERIC EVENT SYSTEM TYPES
// ============================================================================

/**
 * Generic event map interface for type-safe event emission and subscription.
 * All VBS event maps should extend this base interface to ensure consistency.
 */
export interface EventMap {
  [eventName: string]: unknown
}

/**
 * Generic event listener type for type-safe callback functions.
 * Used by the EventEmitter system for proper type inference.
 */
export type EventListener<TPayload = unknown> = (payload: TPayload) => void

/**
 * Event map for ProgressTracker factory instances.
 * Defines type-safe events for progress tracking and item toggle operations.
 *
 * @example
 * ```typescript
 * const progressEmitter = createEventEmitter<ProgressTrackerEvents>()
 * progressEmitter.on('item-toggle', ({ itemId, isWatched }) => {
 *   console.log(`Item ${itemId} is now ${isWatched ? 'watched' : 'unwatched'}`)
 * })
 * ```
 */
export interface ProgressTrackerEvents extends EventMap {
  /** Fired when an item's watched status is toggled */
  'item-toggle': {
    itemId: string
    isWatched: boolean
  }
  /** Fired when progress data is updated (after calculations) */
  'progress-update': {
    overall: ProgressData
    eraProgress: EraProgress[]
  }
}

/**
 * Event map for SearchFilter factory instances.
 * Defines type-safe events for search and filter state changes.
 *
 * @example
 * ```typescript
 * const searchEmitter = createEventEmitter<SearchFilterEvents>()
 * searchEmitter.on('filter-change', ({ filteredData, filterState }) => {
 *   renderTimeline(filteredData)
 * })
 * ```
 */
export interface SearchFilterEvents extends EventMap {
  /** Fired when search or filter criteria change, providing filtered results */
  'filter-change': {
    filteredData: StarTrekEra[]
    filterState: FilterState
  }
}

/**
 * Event map for storage operations.
 * Defines type-safe events for import/export and storage state changes.
 *
 * @example
 * ```typescript
 * const storageEmitter = createEventEmitter<StorageEvents>()
 * storageEmitter.on('data-imported', ({ importedItems, timestamp }) => {
 *   showNotification(`Imported ${importedItems.length} items`)
 * })
 * ```
 */
export interface StorageEvents extends EventMap {
  /** Fired when progress data is successfully imported */
  'data-imported': {
    importedItems: string[]
    timestamp: string
    version: string
  }
  /** Fired when progress data is successfully exported */
  'data-exported': {
    exportedItems: string[]
    timestamp: string
    format: string
  }
  /** Fired when storage operation encounters an error */
  'storage-error': {
    operation: 'import' | 'export' | 'save' | 'load'
    error: Error
    context?: Record<string, unknown>
  }
}

/**
 * Event map for EpisodeTracker factory instances.
 * Defines type-safe events for episode-level progress tracking and bulk operations.
 *
 * @example
 * ```typescript
 * const episodeEmitter = createEventEmitter<EpisodeTrackerEvents>()
 * episodeEmitter.on('episode-toggle', ({ episodeId, isWatched }) => {
 *   console.log(`Episode ${episodeId} is now ${isWatched ? 'watched' : 'unwatched'}`)
 * })
 * ```
 */
export interface EpisodeTrackerEvents extends EventMap {
  /** Fired when an individual episode's watched status is toggled */
  'episode-toggle': {
    episodeId: string
    isWatched: boolean
    seriesId: string
    season: number
    episode: number
  }
  /** Fired when bulk season operations are performed */
  'season-toggle': {
    seriesId: string
    season: number
    isWatched: boolean
    episodeIds: string[]
  }
  /** Fired when episode progress calculations are updated */
  'episode-progress-update': {
    seasonProgress: SeasonProgress[]
    overallProgress: ProgressData
  }
  /** Fired when bulk operations complete successfully */
  'bulk-operation-complete': {
    operation: 'mark-season-watched' | 'mark-season-unwatched'
    seriesId: string
    season: number
    affectedEpisodes: number
  }
}

/**
 * Event types for episode list management and filtering functionality.
 * Used by createEpisodeManager factory for type-safe event handling.
 */
export interface EpisodeManagerEvents extends EventMap {
  /** Fired when episode filtering criteria change */
  'filter-change': {
    filteredEpisodes: Episode[]
    filterCriteria: EpisodeFilterCriteria
  }
  /** Fired when search results are updated */
  'search-update': {
    searchTerm: string
    matchingEpisodes: Episode[]
    totalMatches: number
  }
  /** Fired when lazy loading fetches more episodes */
  'episodes-loaded': {
    loadedEpisodes: Episode[]
    totalLoaded: number
    hasMore: boolean
  }
  /** Fired when episode details are expanded/collapsed */
  'episode-detail-toggle': {
    episodeId: string
    isExpanded: boolean
    spoilerLevel: 'safe' | 'moderate' | 'full'
  }
  /** Fired when bulk episode operations are performed */
  'bulk-filter-applied': {
    filterType: string
    matchingCount: number
    totalCount: number
  }
}

/**
 * Event map for metadata enrichment system events.
 * Used with generic EventEmitter for type-safe metadata event handling.
 */
export interface MetadataEnrichmentEvents extends EventMap {
  /** Fired when metadata enrichment starts for an episode */
  'enrichment-start': {
    episodeId: string
    sources: MetadataSourceType[]
    priority: 'high' | 'medium' | 'low'
  }
  /** Fired when metadata enrichment completes successfully */
  'enrichment-complete': {
    episodeId: string
    metadata: EpisodeMetadata
    sources: MetadataSourceType[]
    duration: number
  }
  /** Fired when metadata enrichment fails */
  'enrichment-failed': {
    episodeId: string
    error: string
    sources: MetadataSourceType[]
    retryable: boolean
  }
  /** Fired when metadata conflicts are detected between sources */
  'conflict-detected': {
    episodeId: string
    fieldName: string
    conflicts: ConflictResolutionRecord['conflicts']
  }
  /** Fired when metadata conflicts are resolved */
  'conflict-resolved': {
    episodeId: string
    resolution: ConflictResolutionRecord
  }
  /** Fired when metadata is validated */
  'metadata-validated': {
    episodeId: string
    isValid: boolean
    validationErrors: string[]
  }
  /** Fired during bulk metadata operations */
  'bulk-progress': {
    completed: number
    total: number
    currentEpisodeId?: string
    estimatedTimeRemaining?: number
  }
}

/**
 * Event map for metadata storage adapter events.
 * Used with generic EventEmitter for type-safe storage event handling.
 */
export interface MetadataStorageEvents extends EventMap {
  /** Fired when metadata is successfully stored */
  'metadata-stored': {
    episodeId: string
    metadata: EpisodeMetadata
    storageSize: number
  }
  /** Fired when metadata is retrieved from storage */
  'metadata-retrieved': {
    episodeId: string
    metadata: EpisodeMetadata | null
    fromCache: boolean
  }
  /** Fired when metadata cache is cleaned up */
  'cache-cleanup': {
    removedEntries: number
    freedSpace: number
    totalEntries: number
  }
  /** Fired when storage quota approaches limit */
  'quota-warning': {
    currentUsage: number
    maxQuota: number
    usagePercentage: number
  }
  /** Fired when storage operations fail */
  'storage-error': {
    operation: 'store' | 'retrieve' | 'cleanup' | 'delete'
    episodeId?: string
    error: string
  }
}

/**
 * User preferences for application settings and customization.
 * Provides comprehensive configuration options for theme, accessibility, and user experience.
 */
export interface UserPreferences {
  /** UI theme preference - supports system auto-detection */
  theme: 'light' | 'dark' | 'auto'
  /** Enable compact view for dense information display */
  compactView: boolean
  /** Enable accessibility features (high contrast, screen reader support) */
  accessibilityMode: boolean
  /** Enable automatic video/audio playback */
  autoPlay: boolean
  /** Show spoiler content in episode descriptions */
  showSpoilers: boolean
  /** Preferred streaming services for availability filtering */
  preferredStreamingServices: string[]
  /** Interface language setting */
  language: string
  /** Notification settings */
  notifications: {
    /** Master notification toggle */
    enabled: boolean
    /** Notify about new episode releases */
    newEpisodes: boolean
    /** Remind about viewing progress goals */
    progressReminders: boolean
  }
  /** Timeline visualization preferences */
  timeline: {
    /** Show major galactic events on timeline */
    showMajorEvents: boolean
    /** Show minor events and background details */
    showMinorEvents: boolean
    /** Default zoom level for timeline view */
    defaultZoomLevel: 'year' | 'decade' | 'century'
  }
  /** Privacy and data collection settings */
  privacy: {
    /** Allow anonymous usage analytics */
    analyticsEnabled: boolean
    /** Enable crash report collection */
    crashReportsEnabled: boolean
  }
  /** Metadata synchronization settings for background enrichment operations */
  metadataSync: {
    /** Metadata sync mode: auto (background sync), manual (user-triggered only), or disabled */
    syncMode: 'auto' | 'manual' | 'disabled'
    /** Data usage limits for metadata operations */
    dataLimits: {
      /** Maximum episodes to sync per batch operation */
      maxEpisodesPerSync: number
      /** Maximum daily API calls allowed (0 = unlimited) */
      maxDailyApiCalls: number
      /** Maximum storage size for metadata cache in MB */
      maxCacheSizeMB: number
    }
    /** Network preferences for metadata sync operations */
    networkPreference: 'wifi-only' | 'any-connection' | 'manual-only'
    /** Scheduling preferences for background sync operations */
    scheduling: {
      /** Allow sync during peak hours (6pm-11pm local time) */
      allowDuringPeakHours: boolean
      /** Minimum battery level required for sync (0.0-1.0, 0 = disabled) */
      minBatteryLevel: number
      /** Pause sync when device is charging */
      pauseWhileCharging: boolean
      /** Preferred time of day for sync operations ('anytime', 'night-only', 'day-only') */
      preferredTimeOfDay: 'anytime' | 'night-only' | 'day-only'
    }
    /** Notification preferences for metadata sync operations */
    notifications: {
      /** Notify when bulk sync operations complete */
      notifyOnCompletion: boolean
      /** Notify when sync operations fail or encounter errors */
      notifyOnErrors: boolean
      /** Notify when new metadata becomes available for watched episodes */
      notifyOnUpdates: boolean
    }
    /** Conflict resolution strategy when multiple sources provide different data */
    conflictResolution: 'latest-wins' | 'merge-with-priority' | 'manual-review'
  }
}

/**
 * Event map for user preferences changes and lifecycle events.
 * Used with generic EventEmitter for type-safe preference event handling.
 */
export interface PreferencesEvents extends EventMap {
  /** Fired when preferences are successfully loaded from storage */
  'preferences-load': {
    preferences: UserPreferences
  }
  /** Fired when preferences are saved to storage */
  'preferences-save': {
    preferences: UserPreferences
  }
  /** Fired when any preference value is changed */
  'preferences-change': {
    previous: UserPreferences
    current: UserPreferences
    changes: Partial<UserPreferences>
  }
  /** Fired when theme preference changes (for immediate UI updates) */
  'theme-change': {
    theme: UserPreferences['theme']
    preferences: UserPreferences
  }
  /** Fired when compact view is toggled */
  'compact-view-change': {
    compactView: boolean
    preferences: UserPreferences
  }
  /** Fired when accessibility mode is toggled */
  'accessibility-change': {
    accessibilityMode: boolean
    preferences: UserPreferences
  }
  /** Fired when preferences are reset to defaults */
  'preferences-reset': {
    previous: UserPreferences
    current: UserPreferences
  }
  /** Fired when metadata sync mode is changed */
  'metadata-sync-mode-change': {
    syncMode: UserPreferences['metadataSync']['syncMode']
    preferences: UserPreferences
  }
  /** Fired when metadata sync data limits are updated */
  'metadata-sync-data-limits-change': {
    dataLimits: UserPreferences['metadataSync']['dataLimits']
    preferences: UserPreferences
  }
  /** Fired when metadata sync network preference is changed */
  'metadata-sync-network-change': {
    networkPreference: UserPreferences['metadataSync']['networkPreference']
    preferences: UserPreferences
  }
  /** Fired when metadata sync scheduling preferences are updated */
  'metadata-sync-scheduling-change': {
    scheduling: UserPreferences['metadataSync']['scheduling']
    preferences: UserPreferences
  }
  /** Fired when any metadata sync setting is changed */
  'metadata-sync-change': {
    metadataSync: UserPreferences['metadataSync']
    preferences: UserPreferences
  }
}

/**
 * Event map for theme system changes and lifecycle events.
 * Used with generic EventEmitter for type-safe theme event handling.
 */
export interface ThemeEvents extends EventMap {
  /** Fired when theme system is initialized */
  'theme-system-initialized': {
    initialTheme: UserPreferences['theme']
    resolvedTheme: 'light' | 'dark'
    systemPrefersDark: boolean
  }
  /** Fired when a theme is applied to the document */
  'theme-applied': {
    theme: 'light' | 'dark'
    originalTheme: UserPreferences['theme']
    properties: string[]
    timestamp: string
  }
  /** Fired when theme preference changes */
  'theme-change': {
    previousTheme: UserPreferences['theme']
    currentTheme: UserPreferences['theme']
    resolvedTheme: 'light' | 'dark'
  }
  /** Fired when system theme preference changes */
  'system-theme-change': {
    systemPrefersDark: boolean
    currentTheme: 'light' | 'dark'
  }
}

/**
 * Theme system instance interface following VBS functional factory patterns.
 * Provides comprehensive theme management with CSS custom properties and preferences integration.
 */
export interface ThemeSystemInstance {
  /** Initialize the theme system with preferences integration */
  initialize: () => 'light' | 'dark' | null
  /** Apply a specific theme */
  setTheme: (theme: UserPreferences['theme']) => 'light' | 'dark' | null
  /** Toggle between light and dark themes */
  toggleTheme: () => 'light' | 'dark' | null
  /** Get current theme preference */
  getCurrentTheme: () => UserPreferences['theme']
  /** Get resolved theme (auto converted to light/dark) */
  getResolvedTheme: () => 'light' | 'dark'
  /** Get comprehensive theme information */
  getThemeInfo: () => {
    currentTheme: UserPreferences['theme']
    resolvedTheme: 'light' | 'dark'
    systemPrefersDark: boolean
    availableThemes: string[]
    isInitialized: boolean
    cssProperties: string[]
  }
  /** Check if theme system is initialized */
  isInitialized: () => boolean
  /** Force reapply current theme */
  refresh: () => 'light' | 'dark' | null
  /** Get available CSS custom properties */
  getCSSProperties: () => string[]
  /** Get theme values for a specific theme */
  getThemeValues: (theme: 'light' | 'dark') => Record<string, string>
  /** Cleanup theme system resources */
  cleanup: () => void

  // Generic EventEmitter methods for type-safe event handling
  on: <TEventName extends keyof ThemeEvents>(
    eventName: TEventName,
    listener: EventListener<ThemeEvents[TEventName]>,
  ) => void
  off: <TEventName extends keyof ThemeEvents>(
    eventName: TEventName,
    listener: EventListener<ThemeEvents[TEventName]>,
  ) => void
  once: <TEventName extends keyof ThemeEvents>(
    eventName: TEventName,
    listener: EventListener<ThemeEvents[TEventName]>,
  ) => void
}

// ============================================================================
// FUNCTIONAL COMPOSITION PIPELINE TYPES
// ============================================================================

/**
 * Represents a single step in a data transformation pipeline.
 * Each step transforms input of type TInput to output of type TOutput.
 */
export type PipelineStep<TInput, TOutput> = (input: TInput) => TOutput

// ============================================================================
// RUNTIME VALIDATION TYPE GUARDS
// ============================================================================

/**
 * Runtime validation utilities for episode data structures.
 * These type guards prevent data corruption and ensure type safety at runtime.
 */

/**
 * Type guard to validate Episode interface structure.
 * Ensures all required fields are present and have correct types.
 *
 * @param value - The value to validate
 * @returns True if value is a valid Episode object
 */
export function isEpisode(value: unknown): value is Episode {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const episode = value as Record<string, unknown>

  return (
    typeof episode.id === 'string' &&
    typeof episode.title === 'string' &&
    typeof episode.season === 'number' &&
    typeof episode.episode === 'number' &&
    typeof episode.airDate === 'string' &&
    typeof episode.stardate === 'string' &&
    typeof episode.synopsis === 'string' &&
    Array.isArray(episode.plotPoints) &&
    episode.plotPoints.every(point => typeof point === 'string') &&
    Array.isArray(episode.guestStars) &&
    episode.guestStars.every(star => typeof star === 'string') &&
    Array.isArray(episode.connections) &&
    episode.connections.every(conn => isEpisodeConnection(conn))
  )
}

/**
 * Type guard to validate EpisodeConnection interface structure.
 * Ensures connection data integrity for cross-series references.
 *
 * @param value - The value to validate
 * @returns True if value is a valid EpisodeConnection object
 */
export function isEpisodeConnection(value: unknown): value is EpisodeConnection {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const connection = value as Record<string, unknown>
  const validConnectionTypes = ['character', 'event', 'storyline', 'reference']

  return (
    typeof connection.episodeId === 'string' &&
    typeof connection.seriesId === 'string' &&
    typeof connection.connectionType === 'string' &&
    validConnectionTypes.includes(connection.connectionType) &&
    typeof connection.description === 'string'
  )
}

/**
 * Type guard to validate EpisodeProgress interface structure.
 * Ensures episode progress data integrity for tracking functionality.
 *
 * @param value - The value to validate
 * @returns True if value is a valid EpisodeProgress object
 */
export function isEpisodeProgress(value: unknown): value is EpisodeProgress {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const progress = value as Record<string, unknown>

  return (
    typeof progress.episodeId === 'string' &&
    typeof progress.seriesId === 'string' &&
    typeof progress.season === 'number' &&
    typeof progress.episode === 'number' &&
    typeof progress.isWatched === 'boolean' &&
    (progress.watchedAt === undefined || typeof progress.watchedAt === 'string')
  )
}

/**
 * Type guard to validate SeasonProgress interface structure.
 * Ensures season progress data integrity with embedded episode progress.
 *
 * @param value - The value to validate
 * @returns True if value is a valid SeasonProgress object
 */
export function isSeasonProgress(value: unknown): value is SeasonProgress {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const progress = value as Record<string, unknown>

  return (
    typeof progress.seriesId === 'string' &&
    typeof progress.season === 'number' &&
    typeof progress.total === 'number' &&
    typeof progress.completed === 'number' &&
    typeof progress.percentage === 'number' &&
    typeof progress.totalEpisodes === 'number' &&
    typeof progress.watchedEpisodes === 'number' &&
    Array.isArray(progress.episodeProgress) &&
    progress.episodeProgress.every(ep => isEpisodeProgress(ep))
  )
}

/**
 * Type guard to validate extended StarTrekItem with episode data.
 * Validates items that may contain episodeData arrays.
 *
 * @param value - The value to validate
 * @returns True if value is a valid StarTrekItem object
 */
export function isStarTrekItemWithEpisodes(value: unknown): value is StarTrekItem {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const item = value as Record<string, unknown>

  const baseValidation =
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.type === 'string' &&
    typeof item.year === 'string' &&
    typeof item.stardate === 'string' &&
    typeof item.notes === 'string' &&
    (item.episodes === undefined || typeof item.episodes === 'number')

  if (!baseValidation) {
    return false
  }

  // Validate episodeData if present
  if (item.episodeData !== undefined) {
    return Array.isArray(item.episodeData) && item.episodeData.every(ep => isEpisode(ep))
  }

  return true
}

/**
 * Validates an array of episodes for data integrity.
 * Useful for bulk validation during data import or migration.
 *
 * @param episodes - Array of episodes to validate
 * @returns True if all episodes are valid
 */
export function validateEpisodeArray(episodes: unknown[]): episodes is Episode[] {
  return Array.isArray(episodes) && episodes.every(ep => isEpisode(ep))
}

/**
 * Configuration object for creating reusable data transformation pipelines.
 * Supports validation, transformation, side effects, and error handling.
 */
export interface PipelineConfig<TInput, TOutput> {
  /** Optional validation function to check input before processing */
  validate?: (input: TInput) => boolean
  /** Array of transformation steps to apply in order */
  steps: PipelineStep<any, any>[]
  /** Optional side effect function called with the final output */
  onComplete?: (output: TOutput) => void
  /** Optional error handler for pipeline failures */
  onError?: (error: Error, input: TInput) => void
}

/**
 * A reusable pipeline function created by createPipeline factory.
 * Takes input of type TInput and returns output of type TOutput.
 */
export type Pipeline<TInput, TOutput> = (input: TInput) => TOutput

/**
 * Configuration for search filtering pipeline operations.
 */
export interface SearchPipelineConfig {
  /** Function to normalize search terms (default: lowercase + trim) */
  normalizeSearch?: (term: string) => string
  /** Custom predicate for matching items against search terms */
  itemMatcher?: (item: StarTrekItem, normalizedTerm: string) => boolean
  /** Function called with filtered results */
  onFilterComplete?: (filteredData: StarTrekEra[], filterState: FilterState) => void
}

/**
 * Configuration for progress calculation pipeline operations.
 */
export interface ProgressPipelineConfig {
  /** Function to validate watched items array */
  validateWatchedItems?: (items: string[]) => boolean
  /** Custom progress calculation function */
  progressCalculator?: (watchedItems: string[], allItems: StarTrekItem[]) => ProgressData
  /** Function called with calculated progress */
  onProgressUpdate?: (progress: OverallProgress) => void
}

/**
 * Configuration for event handling pipeline operations.
 */
export interface EventPipelineConfig<TEvent> {
  /** Function to validate incoming events */
  validateEvent?: (event: TEvent) => boolean
  /** Function to extract relevant data from events */
  eventExtractor?: (event: TEvent) => any
  /** Function called after state updates are complete */
  onStateUpdate?: (newState: any) => void
  /** Function to handle DOM updates */
  onDOMUpdate?: (element: HTMLElement, newState: any) => void
}

// ============================================================================
// TIMELINE VISUALIZATION TYPES AND INTERFACES
// ============================================================================

/**
 * Timeline event types for categorizing different kinds of Star Trek events.
 * Used for filtering and visual styling of timeline elements.
 */
export type TimelineEventType =
  | 'series' // TV series content
  | 'movie' // Feature films
  | 'animated' // Animated series content
  | 'galactic_event' // Major galactic events
  | 'first_contact' // First contact events
  | 'war' // Conflicts and wars
  | 'technology' // Technological developments
  | 'political' // Political events
  | 'exploration' // Exploration missions

/**
 * Individual timeline event representing a specific point or period in Star Trek chronology.
 * Optimized for D3.js rendering with position, scale, and interaction properties.
 *
 * @example
 * ```typescript
 * const event: TimelineEvent = {
 *   id: 'tos_s1_premiere',
 *   title: 'The Original Series Begins',
 *   date: new Date('2266-01-01'),
 *   stardate: '1312.4',
 *   type: 'series',
 *   description: 'Captain Kirk takes command of the Enterprise',
 *   relatedItems: ['tos_s1'],
 *   isWatched: false,
 *   importance: 'major'
 * }
 * ```
 */
export interface TimelineEvent {
  /** Unique identifier for the timeline event */
  id: string
  /** Display title for the event */
  title: string
  /** Date or start date for the event */
  date: Date
  /** End date for events spanning multiple dates (optional) */
  endDate?: Date
  /** In-universe stardate for the event */
  stardate: string
  /** End stardate for multi-stardate events (optional) */
  endStardate?: string
  /** Event category for filtering and styling */
  type: TimelineEventType
  /** Detailed description of the event */
  description: string
  /** Array of related Star Trek item IDs */
  relatedItems: string[]
  /** Whether related content has been watched */
  isWatched: boolean
  /** Event importance level affecting visual prominence */
  importance: 'minor' | 'major' | 'critical'
  /** Era this event belongs to */
  eraId: string
  /** Additional metadata for rendering and interaction */
  metadata?: {
    /** Color theme for the event marker */
    color?: string
    /** Icon or symbol identifier */
    icon?: string
    /** Additional CSS classes for styling */
    cssClasses?: string[]
    /** Custom data attributes */
    dataAttributes?: Record<string, string>
  }
}

/**
 * Timeline configuration and filtering options.
 * Controls what events are displayed and how the timeline behaves.
 */
export interface TimelineConfig {
  /** Filter events by type */
  eventTypes?: TimelineEventType[]
  /** Filter events by era */
  eraIds?: string[]
  /** Filter events by watch status */
  watchStatus?: 'all' | 'watched' | 'unwatched'
  /** Filter events by importance level */
  importance?: ('minor' | 'major' | 'critical')[]
  /** Date range for filtering events */
  dateRange?: {
    start: Date
    end: Date
  }
  /** Stardate range for filtering events */
  stardateRange?: {
    start: string
    end: string
  }
  /** Whether to show only events with related items */
  showOnlyWithItems?: boolean
  /** Filter events by series ID extracted from related items */
  seriesIds?: string[]
  /** Search text for filtering events by title/description */
  searchText?: string
  /** Performance configuration for large datasets */
  performance?: Partial<TimelinePerformanceConfig>
}

/**
 * Timeline visualization dimensions and layout configuration.
 * Used for responsive design and canvas/SVG rendering setup.
 */
export interface TimelineLayout {
  /** Total width of the timeline container */
  width: number
  /** Total height of the timeline container */
  height: number
  /** Margin configuration for the timeline */
  margin: {
    top: number
    right: number
    bottom: number
    left: number
  }
  /** Timeline track height */
  trackHeight: number
  /** Spacing between timeline tracks */
  trackSpacing: number
  /** Event marker size configuration */
  markerSize: {
    width: number
    height: number
  }
  /** Font configuration for timeline text */
  fonts: {
    title: string
    subtitle: string
    body: string
  }
}

/**
 * Timeline interaction state and event handlers.
 * Manages user interactions like zoom, pan, and event selection.
 */
export interface TimelineInteraction {
  /** Current zoom level (1.0 = no zoom) */
  zoomLevel: number
  /** Current pan offset in pixels */
  panOffset: {x: number; y: number}
  /** Currently selected event ID (if any) */
  selectedEventId?: string
  /** Currently hovered event ID (if any) */
  hoveredEventId?: string
  /** Whether the timeline is in touch interaction mode */
  isTouchMode: boolean
  /** Zoom limits */
  zoomLimits: {
    min: number
    max: number
  }
}

/**
 * Timeline performance configuration and metrics.
 * Controls rendering optimization and performance monitoring.
 */
export interface TimelinePerformanceConfig {
  /** Maximum number of events to render with SVG before switching to Canvas */
  svgEventThreshold: number
  /** Target frame rate for smooth animations (fps) */
  targetFrameRate: number
  /** Maximum render time before switching to canvas (milliseconds) */
  maxRenderTimeMs: number
  /** Enable performance monitoring and metrics collection */
  enableProfiling: boolean
  /** Enable event virtualization (only render visible events) */
  enableVirtualization: boolean
  /** Viewport padding for virtualization (pixels) */
  virtualizationPadding: number
  /** Force canvas rendering regardless of event count */
  forceCanvasMode: boolean
  /** Enable progressive rendering for large datasets */
  enableProgressiveRendering: boolean
  /** Number of events to render per frame in progressive mode */
  progressiveChunkSize: number
}

/**
 * Timeline performance metrics and monitoring data.
 * Tracks rendering performance to enable adaptive optimization.
 */
export interface TimelinePerformanceMetrics {
  /** Current rendering mode: 'svg' or 'canvas' */
  renderMode: 'svg' | 'canvas'
  /** Number of events currently being rendered */
  renderedEventCount: number
  /** Total number of events in dataset */
  totalEventCount: number
  /** Number of events visible in current viewport */
  visibleEventCount: number
  /** Last render time in milliseconds */
  lastRenderTimeMs: number
  /** Average render time over last 10 renders */
  averageRenderTimeMs: number
  /** Current frame rate (fps) */
  currentFps: number
  /** Memory usage estimate (bytes) */
  memoryUsageBytes: number
  /** Whether virtualization is currently active */
  virtualizationActive: boolean
  /** Viewport bounds for virtualization */
  viewportBounds?: {
    startDate: Date
    endDate: Date
    startIndex: number
    endIndex: number
  }
}

/**
 * Timeline event map for type-safe event handling.
 * Defines events emitted by the timeline visualization component.
 */
export interface TimelineEvents extends EventMap {
  /** Fired when an event is selected on the timeline */
  'event-select': {eventId: string; event: TimelineEvent}
  /** Fired when an event is hovered */
  'event-hover': {eventId: string; event: TimelineEvent | null}
  /** Fired when timeline zoom level changes */
  'zoom-change': {zoomLevel: number; zoomCenter: {x: number; y: number}}
  /** Fired when timeline pan position changes */
  'pan-change': {panOffset: {x: number; y: number}}
  /** Fired when timeline filter configuration changes */
  'filter-change': {config: TimelineConfig}
  /** Fired when timeline layout changes (resize, etc.) */
  'layout-change': {layout: TimelineLayout}
  /** Fired when timeline export is requested */
  'export-request': {format: 'png' | 'svg'; options: ExportOptions}
  /** Fired when rendering mode changes due to performance optimization */
  'render-mode-change': {oldMode: 'svg' | 'canvas'; newMode: 'svg' | 'canvas'; reason: string}
  /** Fired when performance metrics are updated */
  'performance-update': {metrics: TimelinePerformanceMetrics}
  /** Fired when virtualization viewport changes */
  'viewport-change': {visibleEvents: TimelineEvent[]; totalEvents: number}
}

/**
 * Timeline controls event map for type-safe event handling.
 * Defines events emitted by the timeline filter controls component.
 */
export interface TimelineControlsEvents extends EventMap {
  /** Fired when filter configuration changes */
  'filter-change': {config: TimelineConfig; filterState: Partial<TimelineConfig>}
  /** Fired when filters are reset to defaults */
  'filters-reset': {config: TimelineConfig}
  /** Fired when filter configuration is exported */
  'config-export': {config: TimelineConfig; exportData: any}
  /** Fired when filter configuration is imported */
  'config-import': {config: Partial<TimelineConfig>}
  /** Fired when controls rendering is complete */
  'render-complete': {config: TimelineConfig}
}

/**
 * Timeline export configuration options.
 * Used for generating PNG/SVG files for sharing progress.
 */
export interface ExportOptions {
  /** Export file format */
  format: 'png' | 'svg'
  /** Output dimensions */
  dimensions: {
    width: number
    height: number
  }
  /** Export quality (for PNG, 0.1-1.0) */
  quality?: number
  /** Background color for export */
  backgroundColor?: string
  /** Whether to include title and metadata */
  includeMetadata?: boolean
  /** Custom filename (without extension) */
  filename?: string
}

/**
 * Public API interface for TimelineVisualization factory instances.
 * Provides methods for rendering, interaction, and data management.
 */
export interface TimelineVisualizationInstance {
  /** Render the timeline with current data and configuration */
  render: () => void
  /** Update timeline data with new events */
  updateData: (events: TimelineEvent[]) => void
  /** Update timeline configuration and re-render */
  updateConfig: (config: Partial<TimelineConfig>) => void
  /** Update timeline layout and re-render */
  updateLayout: (layout: Partial<TimelineLayout>) => void
  /** Zoom to specific level with optional center point */
  zoomTo: (level: number, center?: {x: number; y: number}) => void
  /** Pan to specific offset */
  panTo: (offset: {x: number; y: number}) => void
  /** Zoom to fit all events in view */
  zoomToFit: () => void
  /** Select specific event by ID */
  selectEvent: (eventId: string | null) => void
  /** Export timeline as image or SVG */
  exportTimeline: (options: ExportOptions) => Promise<Blob>
  /** Destroy timeline and clean up resources */
  destroy: () => void
  /** Get current timeline state */
  getState: () => {
    config: TimelineConfig
    layout: TimelineLayout
    interaction: TimelineInteraction
    events: TimelineEvent[]
    performance?: TimelinePerformanceMetrics
  }
  /** Get current performance metrics */
  getPerformanceMetrics: () => TimelinePerformanceMetrics
  /** Force switch to canvas rendering mode */
  enableCanvasMode: () => void
  /** Force switch to SVG rendering mode */
  enableSVGMode: () => void
  /** Enable automatic performance optimization */
  enableAutoOptimization: () => void

  // Generic EventEmitter methods for type-safe event handling
  on: <K extends keyof TimelineEvents>(
    event: K,
    listener: (data: TimelineEvents[K]) => void,
  ) => void
  off: <K extends keyof TimelineEvents>(
    event: K,
    listener: (data: TimelineEvents[K]) => void,
  ) => void
  once: <K extends keyof TimelineEvents>(
    event: K,
    listener: (data: TimelineEvents[K]) => void,
  ) => void
}

/**
 * Timeline controls instance interface.
 * Provides the public API for timeline filter controls component.
 */
export interface TimelineControlsInstance {
  /** Render the controls with current configuration */
  render: () => void
  /** Update controls data with new events */
  updateData: (events: TimelineEvent[]) => void
  /** Update controls configuration */
  updateConfig: (config: Partial<TimelineConfig>) => void
  /** Get current filter configuration */
  getConfig: () => TimelineConfig
  /** Get available filter options extracted from data */
  getFilterOptions: () => {
    eras: string[]
    eventTypes: string[]
    series: string[]
    importanceLevels: string[]
  }
  /** Import filter configuration from external source */
  importConfig: (config: Partial<TimelineConfig>) => void
  /** Destroy controls and clean up resources */
  destroy: () => void

  // Generic EventEmitter methods for type-safe event handling
  on: <K extends keyof TimelineControlsEvents>(
    event: K,
    listener: (data: TimelineControlsEvents[K]) => void,
  ) => void
  off: <K extends keyof TimelineControlsEvents>(
    event: K,
    listener: (data: TimelineControlsEvents[K]) => void,
  ) => void
  once: <K extends keyof TimelineControlsEvents>(
    event: K,
    listener: (data: TimelineControlsEvents[K]) => void,
  ) => void
  emit: <K extends keyof TimelineControlsEvents>(event: K, data: TimelineControlsEvents[K]) => void
  removeAllListeners: () => void
}

// ============================================================================
// STREAMING SERVICE INTEGRATION TYPES
// ============================================================================

/**
 * Streaming platform information for displaying availability data.
 * Used throughout the streaming integration system for platform identification and display.
 */
export interface StreamingPlatform {
  /** Unique platform identifier (e.g., 'netflix', 'paramount-plus') */
  id: string
  /** Display name for the platform */
  name: string
  /** Platform logo URL or icon identifier */
  logo?: string
  /** Platform website base URL */
  url: string
  /** Whether platform requires subscription */
  requiresSubscription: boolean
  /** Available in which geographic regions */
  regions: string[]
}

/**
 * Streaming availability data for a specific Star Trek content item.
 * Contains platform-specific availability information with deep linking support.
 */
export interface StreamingAvailability {
  /** Content identifier (matches StarTrekItem.id) */
  contentId: string
  /** Content type ('series', 'movie', 'animated') */
  contentType: string
  /** Platform where content is available */
  platform: StreamingPlatform
  /** Direct URL to content on the platform */
  url: string
  /** Availability type ('subscription', 'rent', 'buy', 'free') */
  type: 'subscription' | 'rent' | 'buy' | 'free'
  /** Price information (for rent/buy options) */
  price?: {
    amount: number
    currency: string
  }
  /** Quality options available (HD, 4K, etc.) */
  quality: string[]
  /** Geographic regions where available */
  regions: string[]
  /** When this availability data was last updated */
  lastUpdated: string
  /** When this data expires and should be refreshed */
  expiresAt: string
}

/**
 * Cached streaming data for efficient storage and retrieval.
 * Used by IndexedDB storage adapter for local streaming availability caching.
 */
export interface StreamingCache {
  /** Content identifier */
  contentId: string
  /** Array of streaming availability options */
  availability: StreamingAvailability[]
  /** When data was cached */
  cachedAt: string
  /** When data expires and needs refresh */
  expiresAt: string
  /** API response metadata */
  metadata: {
    /** Source API used (e.g., 'watchmode') */
    source: string
    /** Response timestamp from API */
    timestamp: string
    /** API call success status */
    success: boolean
  }
}

/**
 * Supported geographic regions for streaming availability.
 * Each region has different streaming platforms and content availability.
 */
export type SupportedRegion = 'US' | 'CA' | 'UK'

/**
 * Geographic region information with metadata for streaming availability.
 * Includes region-specific platform mappings and currency information.
 */
export interface GeographicRegion {
  /** Region code (ISO 3166-1 alpha-2) */
  code: SupportedRegion
  /** Human-readable region name */
  name: string
  /** Currency code for pricing (ISO 4217) */
  currency: string
  /** Streaming platforms available in this region */
  availablePlatforms: string[]
  /** Region-specific platform identifiers */
  platformMapping: Record<string, string>
}

/**
 * Location preferences for geographic availability handling.
 * Allows users to specify their region and location-based preferences.
 */
export interface LocationPreferences {
  /** User's preferred region for content availability */
  region: SupportedRegion
  /** Allow automatic region detection (requires user consent) */
  allowAutoDetection: boolean
  /** Show availability for other regions */
  showOtherRegions: boolean
  /** Preferred language/locale for the region */
  locale?: string
}

/**
 * User preferences for streaming service integration.
 * Extends UserPreferences with streaming-specific settings.
 */
export interface StreamingPreferences {
  /** User's preferred streaming platforms in priority order */
  preferredPlatforms: string[]
  /** Hide content not available on preferred platforms */
  hideUnavailable: boolean
  /** Show price information for rent/buy options */
  showPricing: boolean
  /** User's geographic location preferences */
  location: LocationPreferences
  /** Enable streaming availability notifications */
  enableNotifications: boolean
  /** Maximum price willing to pay for content */
  maxPrice?: {
    rent: number
    buy: number
    currency: string
  }
}

/**
 * Rate limiting configuration for streaming API calls.
 * Manages API call frequency to respect service quotas and rate limits.
 */
export interface RateLimitConfig {
  /** Maximum requests per minute */
  requestsPerMinute: number
  /** Maximum requests per hour */
  requestsPerHour: number
  /** Maximum requests per day */
  requestsPerDay: number
  /** Current request counts */
  current: {
    minute: number
    hour: number
    day: number
  }
  /** Timestamps for rate limit windows */
  windows: {
    minute: number
    hour: number
    day: number
  }
}

/**
 * Streaming API response data structure.
 * Standardized response format for external streaming service APIs.
 */
export interface StreamingApiResponse<T = unknown> {
  /** Response success status */
  success: boolean
  /** Response data */
  data?: T
  /** Error message if request failed */
  error?: string
  /** HTTP status code */
  status: number
  /** Rate limit information */
  rateLimit?: {
    remaining: number
    reset: number
    limit: number
  }
  /** Response metadata */
  metadata: {
    /** Request timestamp */
    timestamp: string
    /** Response time in milliseconds */
    responseTime: number
    /** Source API identifier */
    source: string
  }
}

/**
 * Event map for streaming API events.
 * Defines type-safe event structure for streaming-related operations.
 */
export interface StreamingApiEvents extends EventMap {
  /** Emitted when streaming availability data is updated */
  'availability-updated': {
    contentId: string
    availability: StreamingAvailability[]
    source: string
  }
  /** Emitted when rate limit is approaching */
  'rate-limit-warning': {
    current: number
    limit: number
    resetTime: number
  }
  /** Emitted when rate limit is exceeded */
  'rate-limit-exceeded': {
    retryAfter: number
    endpoint: string
  }
  /** Emitted when API error occurs */
  'api-error': {
    error: string
    endpoint: string
    status: number
  }
  /** Emitted when cache is updated */
  'cache-updated': {
    contentId: string
    cacheSize: number
    expiresAt: string
  }
  /** Emitted when cached data expires */
  'cache-expired': {
    contentId: string
    expiredAt: string
  }
  /** Emitted when background refresh completes */
  'background-refresh': {
    updatedItems: number
    failedItems: number
    duration: number
  }
  /** Emitted when user's region preference changes */
  'region-changed': {
    previousRegion: string
    newRegion: string
    timestamp: string
  }
  /** Emitted when batch availability operation completes */
  'batch-availability-updated': {
    totalRequested: number
    totalFetched: number
    fromCache: number
    fromApi: number
    failed: string[]
    duration: number
  }
}

/**
 * Streaming API instance interface following VBS functional factory pattern.
 * Provides methods for managing streaming availability data with rate limiting and caching.
 */
export interface StreamingApiInstance {
  /** Initialize the streaming API with configuration */
  initialize: (config: StreamingApiConfig) => Promise<void>
  /** Get streaming availability for specific content */
  getAvailability: (contentId: string) => Promise<StreamingAvailability[]>
  /** Get availability for multiple content items (batch operation) */
  getBatchAvailability: (contentIds: string[]) => Promise<Map<string, StreamingAvailability[]>>
  /** Search for content by title */
  searchContent: (title: string, type?: string) => Promise<StreamingApiResponse>
  /** Refresh availability data for specific content */
  refreshAvailability: (contentId: string) => Promise<StreamingAvailability[]>
  /** Get cached availability data */
  getCachedAvailability: (contentId: string) => Promise<StreamingAvailability[] | null>
  /** Clear expired cache entries */
  clearExpiredCache: () => Promise<number>
  /** Get current rate limit status */
  getRateLimitStatus: () => RateLimitConfig
  /** Check if request is allowed under rate limits */
  isRequestAllowed: () => boolean
  /** Set user preferences for streaming services */
  setPreferences: (preferences: StreamingPreferences) => void
  /** Get current streaming preferences */
  getPreferences: () => StreamingPreferences
  /** Get availability filtered by specific region */
  getAvailabilityByRegion: (contentId: string, region: string) => Promise<StreamingAvailability[]>
  /** Preload streaming availability for multiple content items in background */
  preloadBatchAvailability: (
    contentIds: string[],
    options?: {
      maxConcurrency?: number
      skipCache?: boolean
      priority?: 'high' | 'normal' | 'low'
    },
  ) => Promise<void>
  /** Get batch availability cache statistics */
  getBatchCacheStats: (contentIds: string[]) => Promise<{
    total: number
    cached: number
    expired: number
    missing: number
    hitRate: number
    cacheAgeStats: {
      newest: string | null
      oldest: string | null
      averageAge: number
    }
  }>
  /** Update user's region preference */
  updateRegionPreference: (region: string) => void
  /** Destroy instance and clean up resources */
  destroy: () => void

  // Generic EventEmitter methods for type-safe event handling
  on: <K extends keyof StreamingApiEvents>(
    event: K,
    listener: (data: StreamingApiEvents[K]) => void,
  ) => void
  off: <K extends keyof StreamingApiEvents>(
    event: K,
    listener: (data: StreamingApiEvents[K]) => void,
  ) => void
  once: <K extends keyof StreamingApiEvents>(
    event: K,
    listener: (data: StreamingApiEvents[K]) => void,
  ) => void
  emit: <K extends keyof StreamingApiEvents>(event: K, data: StreamingApiEvents[K]) => void
  removeAllListeners: () => void
}

/**
 * Configuration for streaming API initialization.
 * Contains API keys, endpoints, and operational settings.
 */
export interface StreamingApiConfig {
  /** API provider ('watchmode', 'streaming-availability') */
  provider: string
  /** API key for authentication */
  apiKey: string
  /** API base URL */
  baseUrl: string
  /** Rate limiting configuration */
  rateLimit: {
    requestsPerMinute: number
    requestsPerHour: number
    requestsPerDay: number
  }
  /** Cache configuration */
  cache: {
    /** Default expiration time in hours */
    defaultExpiration: number
    /** Maximum cache size in MB */
    maxSize: number
    /** Enable background refresh */
    backgroundRefresh: boolean
  }
  /** Default user region for availability filtering */
  defaultRegion: string
  /** Enable development/debug mode */
  debugMode: boolean
}

// ============================================================================
// METADATA ENRICHMENT API TYPES
// ============================================================================

/**
 * Configuration for metadata source integrations.
 */
export interface MetadataSourceConfig {
  memoryAlpha?: {
    enabled: boolean
    rateLimitConfig: {
      requestsPerSecond: number
      burstSize: number
    }
    retryConfig?: RetryConfig
    respectRobotsTxt?: boolean
  }
  tmdb?: {
    enabled: boolean
    apiKey?: string
    rateLimitConfig: {
      requestsPerSecond: number
      burstSize: number
    }
    retryConfig?: RetryConfig
  }
  trekCore?: {
    enabled: boolean
    rateLimitConfig: {
      requestsPerSecond: number
      burstSize: number
    }
    retryConfig?: RetryConfig
  }
  stapi?: {
    enabled: boolean
    rateLimitConfig: {
      requestsPerSecond: number
      burstSize: number
    }
    retryConfig?: RetryConfig
  }
}

/**
 * Retry configuration for API calls.
 */
export interface RetryConfig {
  maxRetries: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  jitterMs: number
}

/**
 * Rate limiting configuration for API sources.
 */
export interface SimpleRateLimitConfig {
  requestsPerSecond: number
  burstSize: number
}

/**
 * Enhanced metadata source configuration with health monitoring.
 */
export interface EnhancedMetadataSource extends MetadataSource {
  id: string
  enabled: boolean
  rateLimitConfig: SimpleRateLimitConfig
  retryConfig: RetryConfig
  priority: number
  requiresAuth?: boolean
  apiKey?: string
}

/**
 * Event map for metadata source events.
 */
export interface MetadataSourceEvents extends EventMap {
  'metadata-enriched': {
    episodeId: string
    sourceId: string
    metadata: EpisodeMetadata
  }
  'enrichment-completed': {
    episodeId: string
    sourcesUsed: MetadataSourceType[]
    confidenceScore: number
  }
  'enrichment-failed': {
    episodeId: string
    errors: {
      category: string
      message: string
      sourceApi: string
    }[]
  }
  'health-status-change': {
    sourceId: string
    isHealthy: boolean
    consecutiveFailures: number
  }
  'cache-cleared': {
    timestamp: number
  }
  'analytics-reset': {
    timestamp: number
  }
}

/**
 * Public API interface for MetadataSource factory instances.
 */
export interface MetadataSourceInstance {
  /** Enrich episode metadata using multiple sources with intelligent fallback */
  enrichEpisode: (episodeId: string) => Promise<EpisodeMetadata | null>
  /** Enrich multiple episodes in batch for optimized API usage (TASK-028) */
  enrichEpisodeBatch: (episodeIds: string[]) => Promise<Map<string, EpisodeMetadata | null>>
  /** Get health status for all sources */
  getHealthStatus: () => Record<string, any>
  /** Get API usage analytics for quota management */
  getUsageAnalytics: () => any
  /** Clear cached responses */
  clearCache: () => void
  /** Reset usage analytics (typically called at start of new quota period) */
  resetAnalytics: () => void

  // EventEmitter methods
  on: <K extends keyof MetadataSourceEvents>(
    event: K,
    listener: (data: MetadataSourceEvents[K]) => void,
  ) => void
  off: <K extends keyof MetadataSourceEvents>(
    event: K,
    listener: (data: MetadataSourceEvents[K]) => void,
  ) => void
  once: <K extends keyof MetadataSourceEvents>(
    event: K,
    listener: (data: MetadataSourceEvents[K]) => void,
  ) => void
}

// ============================================================================
// METADATA QUEUE AND BACKGROUND SYNC TYPES
// ============================================================================

/**
 * Metadata sync job definition for background processing.
 * Represents individual metadata enrichment tasks in the background sync queue.
 */
export interface MetadataQueueJob {
  /** Unique identifier for the job */
  id: string
  /** Episode ID to enrich */
  episodeId: string
  /** Job priority (higher number = higher priority) */
  priority: number
  /** Job type for different metadata operations */
  type: 'enrich' | 'refresh' | 'validate' | 'cache-warm'
  /** Current job status */
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled'
  /** Number of retry attempts */
  retryCount: number
  /** Maximum retry attempts before job fails */
  maxRetries: number
  /** ISO timestamp when job was created */
  createdAt: string
  /** ISO timestamp when job was last updated */
  updatedAt: string
  /** ISO timestamp when job should be processed (for scheduling) */
  scheduledAt: string
  /** Specific metadata sources to use for this job */
  targetSources?: string[]
  /** Additional job metadata */
  metadata?: Record<string, any>
  /** Error information if job failed */
  error?: {
    message: string
    category: string
    retryable: boolean
    lastAttemptAt: string
  }
}

/**
 * Background sync queue configuration.
 */
export interface MetadataQueueConfig {
  /** Maximum number of concurrent jobs */
  maxConcurrentJobs: number
  /** Default job priority */
  defaultPriority: number
  /** Maximum retry attempts for failed jobs */
  maxRetries: number
  /** Job timeout in milliseconds */
  jobTimeout: number
  /** Queue processing interval in milliseconds */
  processingInterval: number
  /** Enable intelligent scheduling */
  enableIntelligentScheduling: boolean
  /** Network preference for scheduling */
  networkPreference: 'any' | 'wifi-only' | 'cellular-allowed'
  /** Battery optimization settings */
  batteryOptimization: {
    enabled: boolean
    pauseOnLowBattery: boolean
    pauseWhileCharging: boolean
  }
}

/**
 * Intelligent scheduling configuration.
 */
export interface SchedulingConfig {
  /** Prefer WiFi connections for large operations */
  preferWiFi: boolean
  /** Avoid peak usage times */
  avoidPeakHours: boolean
  /** Peak hours definition (24-hour format) */
  peakHours: {
    start: number // 0-23
    end: number // 0-23
  }
  /** Maximum jobs per hour during peak times */
  peakHourLimit: number
  /** Battery level threshold to pause processing */
  lowBatteryThreshold: number
  /** Respect device charging state */
  pauseWhileCharging: boolean
}

/**
 * Progress tracking for bulk metadata operations.
 */
export interface MetadataProgress {
  /** Operation ID */
  operationId: string
  /** Total number of jobs */
  totalJobs: number
  /** Number of completed jobs */
  completedJobs: number
  /** Number of failed jobs */
  failedJobs: number
  /** Number of cancelled jobs */
  cancelledJobs: number
  /** Current job being processed */
  currentJob?: string
  /** Operation start time */
  startedAt: string
  /** Estimated completion time */
  estimatedCompletion?: string
  /** Whether operation can be cancelled */
  cancellable: boolean
  /** Operation status */
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'paused'
}

/**
 * Network condition information for intelligent scheduling.
 */
export interface NetworkCondition {
  /** Network connection type */
  type: 'wifi' | 'cellular' | 'ethernet' | 'unknown'
  /** Effective connection type */
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown'
  /** Whether connection is metered */
  isMetered: boolean
  /** Connection speed estimate in Mbps */
  downlink?: number
  /** Round-trip time estimate in ms */
  rtt?: number
}

/**
 * Device condition information for intelligent scheduling.
 */
export interface DeviceCondition {
  /** Battery charging state */
  isCharging: boolean
  /** Battery level (0-1) */
  batteryLevel?: number
  /** Whether device is in power save mode */
  isPowerSaveMode: boolean
  /** Available memory estimate in MB */
  availableMemory?: number
  /** CPU usage estimate (0-1) */
  cpuUsage?: number
}

/**
 * Event map for metadata queue operations.
 */
export interface MetadataQueueEvents extends EventMap {
  'job-added': {job: MetadataQueueJob}
  'job-started': {job: MetadataQueueJob}
  'job-completed': {job: MetadataQueueJob; result: any}
  'job-failed': {job: MetadataQueueJob; error: Error}
  'job-cancelled': {job: MetadataQueueJob}
  'queue-paused': {reason: string}
  'queue-resumed': {reason: string}
  'progress-update': {progress: MetadataProgress}
  'scheduling-changed': {condition: NetworkCondition | DeviceCondition}
}

/**
 * Public API interface for MetadataQueue factory instances.
 */
export interface MetadataQueueInstance {
  /** Add a new job to the queue */
  addJob: (job: Omit<MetadataQueueJob, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => string
  /** Cancel a specific job */
  cancelJob: (jobId: string) => boolean
  /** Cancel all jobs in queue */
  cancelAllJobs: () => number
  /** Get job by ID */
  getJob: (jobId: string) => MetadataQueueJob | null
  /** Get all jobs with optional filter */
  getJobs: (filter?: Partial<MetadataQueueJob>) => MetadataQueueJob[]
  /** Get queue status */
  getStatus: () => {
    totalJobs: number
    pendingJobs: number
    runningJobs: number
    completedJobs: number
    failedJobs: number
  }
  /** Start queue processing */
  start: () => void
  /** Pause queue processing */
  pause: (reason?: string) => void
  /** Resume queue processing */
  resume: (reason?: string) => void
  /** Update queue configuration */
  updateConfig: (config: Partial<MetadataQueueConfig>) => void
  /** Apply user preferences to queue configuration */
  applyUserPreferences: (preferences: {
    syncMode: 'auto' | 'manual' | 'disabled'
    dataLimits: {
      maxEpisodesPerSync: number
      maxDailyApiCalls: number
    }
    networkPreference: 'wifi-only' | 'any-connection' | 'manual-only'
  }) => void
  /** Clear completed jobs */
  clearCompleted: () => number
  /** Get progress for bulk operations */
  getProgress: (operationId?: string) => MetadataProgress[]

  // EventEmitter methods
  on: <K extends keyof MetadataQueueEvents>(
    event: K,
    listener: (data: MetadataQueueEvents[K]) => void,
  ) => void
  off: <K extends keyof MetadataQueueEvents>(
    event: K,
    listener: (data: MetadataQueueEvents[K]) => void,
  ) => void
  once: <K extends keyof MetadataQueueEvents>(
    event: K,
    listener: (data: MetadataQueueEvents[K]) => void,
  ) => void
}
