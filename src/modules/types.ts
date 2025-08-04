// ============================================================================
// DOMAIN-SPECIFIC TYPES AND INTERFACES
// ============================================================================

/**
 * Core data types for Star Trek viewing guide content and user interactions.
 * These interfaces define the structure of Star Trek content, progress tracking,
 * and application state used throughout the VBS functional factory architecture.
 */

/**
 * Represents a single Star Trek content item (series, movie, or animated content).
 * Each item belongs to a chronological era and tracks viewing metadata.
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
 *   notes: 'The voyages of the original Enterprise crew'
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
 * Current state of search and filter controls.
 * Used by SearchFilter factory to track user input and filtering preferences.
 *
 * @example
 * ```typescript
 * const filterState: FilterState = {
 *   search: 'enterprise',
 *   filter: 'series'
 * }
 * ```
 */
export interface FilterState {
  /** Current search term entered by user */
  search: string
  /** Current filter type selection */
  filter: string
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
  setWatchedItems(items: string[]): void
  /** Toggle the watched state of a specific item */
  toggleItem(itemId: string): void
  /** Check if a specific item is marked as watched */
  isWatched(itemId: string): boolean
  /** Reset all progress data (clear all watched items) */
  resetProgress(): void
  /** Get immutable copy of currently watched item IDs */
  getWatchedItems(): string[]
  /** Update progress calculations and notify subscribers */
  updateProgress(): void
  /** Calculate overall progress statistics across all eras */
  calculateOverallProgress(): ProgressData
  /** Calculate progress statistics for each individual era */
  calculateEraProgress(): EraProgress[]

  // Generic EventEmitter methods for enhanced type safety
  /** Subscribe to an event with a type-safe listener */
  on<TEventName extends keyof ProgressTrackerEvents>(
    eventName: TEventName,
    listener: EventListener<ProgressTrackerEvents[TEventName]>,
  ): void
  /** Unsubscribe from an event */
  off<TEventName extends keyof ProgressTrackerEvents>(
    eventName: TEventName,
    listener: EventListener<ProgressTrackerEvents[TEventName]>,
  ): void
  /** Subscribe to an event once (auto-unsubscribe after first emission) */
  once<TEventName extends keyof ProgressTrackerEvents>(
    eventName: TEventName,
    listener: EventListener<ProgressTrackerEvents[TEventName]>,
  ): void
  /** Remove all listeners for a specific event or all events */
  removeAllListeners<TEventName extends keyof ProgressTrackerEvents>(eventName?: TEventName): void
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
  setSearch(searchTerm: string): void
  /** Set the current filter type */
  setFilter(filterType: string): void
  /** Get filtered data based on current search and filter criteria */
  getFilteredData(): StarTrekEra[]
  /** Check if a specific item matches current filter criteria */
  matchesFilters(item: StarTrekItem): boolean
  /** Trigger filter change notifications to subscribers */
  notifyFilterChange(): void
  /** Get current search and filter state */
  getCurrentFilters(): FilterState

  /** Subscribe to an event with a type-safe listener */
  on<TEventName extends keyof SearchFilterEvents>(
    eventName: TEventName,
    listener: EventListener<SearchFilterEvents[TEventName]>,
  ): void
  /** Unsubscribe from an event */
  off<TEventName extends keyof SearchFilterEvents>(
    eventName: TEventName,
    listener: EventListener<SearchFilterEvents[TEventName]>,
  ): void
  /** Subscribe to an event once (auto-unsubscribe after first emission) */
  once<TEventName extends keyof SearchFilterEvents>(
    eventName: TEventName,
    listener: EventListener<SearchFilterEvents[TEventName]>,
  ): void
  /** Remove all listeners for a specific event or all events */
  removeAllListeners<TEventName extends keyof SearchFilterEvents>(eventName?: TEventName): void
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
  render(data: StarTrekEra[]): void
  /** Create DOM element for a specific era section */
  createEraElement(era: StarTrekEra): HTMLDivElement
  /** Create HTML string for a specific Star Trek item */
  createItemElement(item: StarTrekItem): string
  /** Toggle the expanded/collapsed state of an era section */
  toggleEra(eraId: string): void
  /** Expand all era sections */
  expandAll(): void
  /** Collapse all era sections */
  collapseAll(): void
  /** Update progress display with new progress data */
  updateProgress(progressData: OverallProgress): void
  /** Update the visual state of all items based on watched status */
  updateItemStates(): void
  /** Calculate progress statistics for a specific era */
  calculateEraProgress(era: StarTrekEra): EraProgress
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
  on<TEventName extends keyof TEvents>(
    eventName: TEventName,
    listener: EventListener<TEvents[TEventName]>,
  ): void
  off<TEventName extends keyof TEvents>(
    eventName: TEventName,
    listener: EventListener<TEvents[TEventName]>,
  ): void
  once<TEventName extends keyof TEvents>(
    eventName: TEventName,
    listener: EventListener<TEvents[TEventName]>,
  ): void
  removeAllListeners<TEventName extends keyof TEvents>(eventName?: TEventName): void
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
  [K in keyof T as T[K] extends Function ? never : K]: T[K]
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
  [K in keyof T as T[K] extends Function ? K : never]: T[K]
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
  [K in keyof T as T[K] extends Function ? never : K]: T[K]
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

// ============================================================================
// FUNCTIONAL COMPOSITION PIPELINE TYPES
// ============================================================================

/**
 * Represents a single step in a data transformation pipeline.
 * Each step transforms input of type TInput to output of type TOutput.
 */
export type PipelineStep<TInput, TOutput> = (input: TInput) => TOutput

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
