// ============================================================================
// FUNCTIONAL COMPOSITION UTILITIES
// ============================================================================

/**
 * Core functional composition utilities providing pipe(), compose(), curry(), and tap()
 * functions for elegant data transformation pipelines in the VBS application.
 *
 * These utilities maintain type safety through comprehensive TypeScript generics
 * and integrate seamlessly with VBS's functional factory architecture.
 */

import type {EventEmitterInstance} from '../modules/events.js'
import type {
  EventMap,
  EventPipelineConfig,
  FilterState,
  OverallProgress,
  Pipeline,
  PipelineConfig,
  ProgressPipelineConfig,
  SearchPipelineConfig,
  StarTrekEra,
  StarTrekItem,
} from '../modules/types.js'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Generic function type that takes input of type T and returns output of type U
 */
export type UnaryFunction<T, U> = (arg: T) => U

/**
 * Function type that can take multiple arguments and return a value
 */
export type Func = (...args: any[]) => any

/**
 * Extracts the return type of a function
 */
export type ReturnType<T extends Func> = T extends (...args: any[]) => infer R ? R : never

/**
 * Extracts the parameters of a function as a tuple
 */
export type Parameters<T extends Func> = T extends (...args: infer P) => any ? P : never

/**
 * Curried function type that supports partial application
 */
export type Curried<TArgs extends readonly unknown[], TReturn> = TArgs extends readonly [
  infer THead,
  ...infer TTail,
]
  ? (arg: THead) => Curried<TTail, TReturn>
  : TReturn

// ============================================================================
// PIPE FUNCTION - LEFT TO RIGHT COMPOSITION
// ============================================================================

/**
 * Pipes the output of one function to the input of the next, left to right.
 * Enables intuitive data flow visualization in transformation chains.
 *
 * @param value - Initial value to pipe through functions
 * @returns Result after applying all functions to value
 *
 * @example
 * ```typescript
 * const result = pipe(
 *   'hello',
 *   (s: string) => s.toUpperCase(),
 *   (s: string) => `${s}!`,
 *   (s: string) => s.length
 * ) // Returns: 6
 * ```
 */
export function pipe<T>(value: T): T
export function pipe<T, A>(value: T, fn1: UnaryFunction<T, A>): A
export function pipe<T, A, B>(value: T, fn1: UnaryFunction<T, A>, fn2: UnaryFunction<A, B>): B
export function pipe<T, A, B, C>(
  value: T,
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
): C
export function pipe<T, A, B, C, D>(
  value: T,
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>,
): D
export function pipe<T, A, B, C, D, E>(
  value: T,
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>,
  fn5: UnaryFunction<D, E>,
): E
export function pipe<T, A, B, C, D, E, F>(
  value: T,
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>,
  fn5: UnaryFunction<D, E>,
  fn6: UnaryFunction<E, F>,
): F
export function pipe<T, A, B, C, D, E, F, G>(
  value: T,
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>,
  fn5: UnaryFunction<D, E>,
  fn6: UnaryFunction<E, F>,
  fn7: UnaryFunction<F, G>,
): G
export function pipe<T, A, B, C, D, E, F, G, H>(
  value: T,
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>,
  fn5: UnaryFunction<D, E>,
  fn6: UnaryFunction<E, F>,
  fn7: UnaryFunction<F, G>,
  fn8: UnaryFunction<G, H>,
): H
export function pipe<T, A, B, C, D, E, F, G, H, I>(
  value: T,
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>,
  fn5: UnaryFunction<D, E>,
  fn6: UnaryFunction<E, F>,
  fn7: UnaryFunction<F, G>,
  fn8: UnaryFunction<G, H>,
  fn9: UnaryFunction<H, I>,
): I
export function pipe<T, A, B, C, D, E, F, G, H, I, J>(
  value: T,
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>,
  fn5: UnaryFunction<D, E>,
  fn6: UnaryFunction<E, F>,
  fn7: UnaryFunction<F, G>,
  fn8: UnaryFunction<G, H>,
  fn9: UnaryFunction<H, I>,
  fn10: UnaryFunction<I, J>,
): J
export function pipe(value: any, ...fns: UnaryFunction<any, any>[]): any {
  return fns.reduce((acc, fn) => fn(acc), value)
}

// ============================================================================
// COMPOSE FUNCTION - RIGHT TO LEFT COMPOSITION
// ============================================================================

/**
 * Composes functions right to left, following mathematical composition semantics.
 * Useful when you want to read composition in mathematical order.
 *
 * @returns Composed function that applies all functions right to left
 *
 * @example
 * ```typescript
 * const transform = compose(
 *   (n: number) => n * 2,
 *   (s: string) => s.length,
 *   (s: string) => s.toUpperCase()
 * )
 * const result = transform('hello') // Returns: 10 (5 * 2)
 * ```
 */
export function compose<A>(fn1: UnaryFunction<A, A>): UnaryFunction<A, A>
export function compose<A, B>(fn1: UnaryFunction<A, B>): UnaryFunction<A, B>
export function compose<A, B, C>(
  fn1: UnaryFunction<B, C>,
  fn2: UnaryFunction<A, B>,
): UnaryFunction<A, C>
export function compose<A, B, C, D>(
  fn1: UnaryFunction<C, D>,
  fn2: UnaryFunction<B, C>,
  fn3: UnaryFunction<A, B>,
): UnaryFunction<A, D>
export function compose<A, B, C, D, E>(
  fn1: UnaryFunction<D, E>,
  fn2: UnaryFunction<C, D>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<A, B>,
): UnaryFunction<A, E>
export function compose<A, B, C, D, E, F>(
  fn1: UnaryFunction<E, F>,
  fn2: UnaryFunction<D, E>,
  fn3: UnaryFunction<C, D>,
  fn4: UnaryFunction<B, C>,
  fn5: UnaryFunction<A, B>,
): UnaryFunction<A, F>
export function compose<A, B, C, D, E, F, G>(
  fn1: UnaryFunction<F, G>,
  fn2: UnaryFunction<E, F>,
  fn3: UnaryFunction<D, E>,
  fn4: UnaryFunction<C, D>,
  fn5: UnaryFunction<B, C>,
  fn6: UnaryFunction<A, B>,
): UnaryFunction<A, G>
export function compose<A, B, C, D, E, F, G, H>(
  fn1: UnaryFunction<G, H>,
  fn2: UnaryFunction<F, G>,
  fn3: UnaryFunction<E, F>,
  fn4: UnaryFunction<D, E>,
  fn5: UnaryFunction<C, D>,
  fn6: UnaryFunction<B, C>,
  fn7: UnaryFunction<A, B>,
): UnaryFunction<A, H>
export function compose<A, B, C, D, E, F, G, H, I>(
  fn1: UnaryFunction<H, I>,
  fn2: UnaryFunction<G, H>,
  fn3: UnaryFunction<F, G>,
  fn4: UnaryFunction<E, F>,
  fn5: UnaryFunction<D, E>,
  fn6: UnaryFunction<C, D>,
  fn7: UnaryFunction<B, C>,
  fn8: UnaryFunction<A, B>,
): UnaryFunction<A, I>
export function compose<A, B, C, D, E, F, G, H, I, J>(
  fn1: UnaryFunction<I, J>,
  fn2: UnaryFunction<H, I>,
  fn3: UnaryFunction<G, H>,
  fn4: UnaryFunction<F, G>,
  fn5: UnaryFunction<E, F>,
  fn6: UnaryFunction<D, E>,
  fn7: UnaryFunction<C, D>,
  fn8: UnaryFunction<B, C>,
  fn9: UnaryFunction<A, B>,
): UnaryFunction<A, J>
export function compose<A, B, C, D, E, F, G, H, I, J, K>(
  fn1: UnaryFunction<J, K>,
  fn2: UnaryFunction<I, J>,
  fn3: UnaryFunction<H, I>,
  fn4: UnaryFunction<G, H>,
  fn5: UnaryFunction<F, G>,
  fn6: UnaryFunction<E, F>,
  fn7: UnaryFunction<D, E>,
  fn8: UnaryFunction<C, D>,
  fn9: UnaryFunction<B, C>,
  fn10: UnaryFunction<A, B>,
): UnaryFunction<A, K>
export function compose(...fns: UnaryFunction<any, any>[]): UnaryFunction<any, any> {
  return (value: any) => fns.reduceRight((acc, fn) => fn(acc), value)
}

// ============================================================================
// CURRY FUNCTION - PARTIAL APPLICATION UTILITY
// ============================================================================

/**
 * Transforms a function with multiple parameters into a sequence of functions,
 * each taking a single argument. Supports partial application for reusable predicates.
 *
 * @param fn - Function to be curried
 * @param arity - Number of arguments (optional, defaults to fn.length)
 * @returns Curried function supporting partial application
 *
 * @example
 * ```typescript
 * const add = (a: number, b: number, c: number) => a + b + c
 * const curriedAdd = curry(add)
 *
 * const add10 = curriedAdd(10)
 * const add10and5 = add10(5)
 * const result = add10and5(3) // Returns: 18
 *
 * // Or use it directly
 * const result2 = curriedAdd(1)(2)(3) // Returns: 6
 * ```
 */
export function curry<T extends Func>(fn: T, arity: number = fn.length): any {
  return function curried(...args: any[]): any {
    if (args.length >= arity) {
      return fn(...args)
    }
    return (...nextArgs: any[]) => curried(...args, ...nextArgs)
  }
}

// ============================================================================
// TAP FUNCTION - SIDE EFFECTS IN PIPELINES
// ============================================================================

/**
 * Executes a side effect function on a value and returns the original value unchanged.
 * Useful for logging, debugging, or triggering callbacks within pipelines.
 *
 * @param fn - Side effect function to execute (return value is ignored)
 * @returns Function that applies side effect and returns original value
 *
 * @example
 * ```typescript
 * const result = pipe(
 *   [1, 2, 3],
 *   tap(arr => console.log('Before filter:', arr)),
 *   (arr: number[]) => arr.filter(n => n > 1),
 *   tap(arr => console.log('After filter:', arr)),
 *   (arr: number[]) => arr.length
 * ) // Logs: "Before filter: [1, 2, 3]", "After filter: [2, 3]", Returns: 2
 * ```
 */
export function tap<T>(fn: (value: T) => void): UnaryFunction<T, T> {
  return (value: T): T => {
    fn(value)
    return value
  }
}

// ============================================================================
// UTILITY TYPE EXPORTS
// ============================================================================

// Types are already exported above, no need to re-export

// ============================================================================
// VBS-SPECIFIC PIPELINE BUILDERS
// ============================================================================

// VBS-SPECIFIC PIPELINE BUILDERS
// ============================================================================

/**
 * Creates a reusable data transformation pipeline from a configuration object.
 * Combines validation, transformation steps, side effects, and error handling
 * into a single composable function.
 *
 * @param config - Pipeline configuration with validation, steps, and callbacks
 * @returns Reusable pipeline function that applies all transformations
 *
 * @example
 * ```typescript
 * const numberPipeline = createPipeline<string, number>({
 *   validate: (input) => typeof input === 'string',
 *   steps: [
 *     (s: string) => s.trim(),
 *     (s: string) => parseInt(s, 10),
 *     (n: number) => n * 2
 *   ],
 *   onComplete: (result) => console.log('Result:', result)
 * })
 *
 * const result = numberPipeline('  42  ') // Logs: "Result: 84", Returns: 84
 * ```
 */
export function createPipeline<TInput, TOutput>(
  config: PipelineConfig<TInput, TOutput>,
): Pipeline<TInput, TOutput> {
  return (input: TInput): TOutput => {
    try {
      // Validate input if validator provided
      if (config.validate && !config.validate(input)) {
        throw new Error('Pipeline input validation failed')
      }

      // Apply all transformation steps using reduce
      const result = config.steps.reduce((acc, step) => step(acc), input as unknown) as TOutput

      // Execute completion callback if provided
      if (config.onComplete) {
        config.onComplete(result)
      }

      return result
    } catch (error) {
      // Handle errors if error handler provided
      if (config.onError) {
        config.onError(error as Error, input)
      }
      throw error
    }
  }
}

/**
 * Creates a specialized pipeline for search term filtering operations.
 * Handles the complete search flow: normalization → item filtering → era filtering → notifications.
 *
 * @param allEras - Array of all Star Trek eras to filter
 * @param config - Search pipeline configuration options
 * @returns Pipeline function that processes search terms into filtered results
 *
 * @example
 * ```typescript
 * const searchPipeline = createSearchPipeline(starTrekData, {
 *   onFilterComplete: (filteredData, filterState) => {
 *     console.log(`Found ${filteredData.length} matching eras`)
 *   }
 * })
 *
 * const results = searchPipeline({ search: 'Enterprise', filter: 'series' })
 * ```
 */
export function createSearchPipeline(
  allEras: StarTrekEra[],
  config: SearchPipelineConfig = {},
): Pipeline<FilterState, StarTrekEra[]> {
  const {
    normalizeSearch = (term: string) => term.toLowerCase().trim(),
    itemMatcher = (item: StarTrekItem, normalizedTerm: string) =>
      item.title.toLowerCase().includes(normalizedTerm) ||
      item.notes.toLowerCase().includes(normalizedTerm) ||
      item.year.toLowerCase().includes(normalizedTerm),
    onFilterComplete,
  } = config

  const pipelineConfig: PipelineConfig<FilterState, StarTrekEra[]> = {
    validate: filterState =>
      typeof filterState.search === 'string' && typeof filterState.filter === 'string',
    steps: [
      // Step 1: Normalize search term
      (filterState: FilterState) => ({
        ...filterState,
        search: normalizeSearch(filterState.search),
      }),
      // Step 2: Filter items within each era
      (filterState: FilterState) =>
        allEras.map(era => ({
          ...era,
          items: era.items.filter(item => {
            const matchesSearch = !filterState.search || itemMatcher(item, filterState.search)
            const matchesFilter = !filterState.filter || item.type === filterState.filter
            return matchesSearch && matchesFilter
          }),
        })),
      // Step 3: Remove eras with no matching items
      (eras: StarTrekEra[]) => eras.filter(era => era.items.length > 0),
    ],
  }

  if (onFilterComplete) {
    pipelineConfig.onComplete = (filteredData: StarTrekEra[]) => {
      const filterState = {search: '', filter: ''} // Will be passed from context
      onFilterComplete(filteredData, filterState)
    }
  }

  return createPipeline<FilterState, StarTrekEra[]>(pipelineConfig)
}

/**
 * Creates a specialized pipeline for progress calculation operations.
 * Handles the complete progress flow: validation → era calculations → overall calculation → notifications.
 *
 * @param allEras - Array of all Star Trek eras for progress calculation
 * @param config - Progress pipeline configuration options
 * @returns Pipeline function that processes watched items into progress data
 *
 * @example
 * ```typescript
 * const progressPipeline = createProgressPipeline(starTrekData, {
 *   onProgressUpdate: (progress) => {
 *     console.log(`Overall progress: ${progress.overall.percentage}%`)
 *   }
 * })
 *
 * const progress = progressPipeline(['tos_s1', 'ent_s1', 'tng_s1'])
 * ```
 */
export function createProgressPipeline(
  allEras: StarTrekEra[],
  config: ProgressPipelineConfig = {},
): Pipeline<string[], OverallProgress> {
  const {validateWatchedItems, onProgressUpdate} = config

  const pipelineConfig: PipelineConfig<string[], OverallProgress> = {
    steps: [
      // Step 1: Calculate progress for each era
      (watchedItems: string[]) =>
        allEras.map(era => {
          const completedItems = era.items.filter(item => watchedItems.includes(item.id)).length
          const totalItems = era.items.length
          const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

          return {
            eraId: era.id,
            total: totalItems,
            completed: completedItems,
            percentage,
          }
        }),
      // Step 2: Calculate overall progress
      (eraProgress: any[]) => {
        const totalItems = allEras.reduce((sum, era) => sum + era.items.length, 0)
        const completedItems = eraProgress.reduce((sum, era) => sum + era.completed, 0)
        const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

        return {
          overall: {
            total: totalItems,
            completed: completedItems,
            percentage,
          },
          eraProgress,
        }
      },
    ],
  }

  if (validateWatchedItems) {
    pipelineConfig.validate = validateWatchedItems
  } else {
    pipelineConfig.validate = items => Array.isArray(items)
  }

  if (onProgressUpdate) {
    pipelineConfig.onComplete = onProgressUpdate
  }

  return createPipeline<string[], OverallProgress>(pipelineConfig)
}

/**
 * Creates a specialized pipeline for event handling operations.
 * Handles the complete event flow: validation → extraction → state updates → DOM rendering.
 *
 * @param config - Event pipeline configuration options
 * @returns Pipeline function that processes events through state updates to DOM changes
 *
 * @example
 * ```typescript
 * const eventPipeline = createEventPipeline<MouseEvent>({
 *   validateEvent: (event) => event.target instanceof HTMLElement,
 *   eventExtractor: (event) => ({ id: event.target.dataset.itemId }),
 *   onStateUpdate: (state) => console.log('State updated:', state),
 *   onDOMUpdate: (element, state) => element.classList.toggle('active')
 * })
 *
 * element.addEventListener('click', eventPipeline)
 * ```
 */
export function createEventPipeline<TEvent>(
  config: EventPipelineConfig<TEvent>,
): Pipeline<TEvent, any> {
  const {validateEvent, eventExtractor, onStateUpdate, onDOMUpdate} = config

  const pipelineConfig: PipelineConfig<TEvent, any> = {
    steps: [
      // Step 1: Extract relevant data from event
      eventExtractor ?? ((event: TEvent) => event),
      // Step 2: Apply state updates (this would be customized per use case)
      tap((extractedData: any) => {
        if (onStateUpdate) {
          onStateUpdate(extractedData)
        }
      }),
      // Step 3: Handle DOM updates if element and handler provided
      tap((extractedData: any) => {
        if (onDOMUpdate && extractedData.element) {
          onDOMUpdate(extractedData.element, extractedData)
        }
      }),
    ],
  }

  if (validateEvent) {
    pipelineConfig.validate = validateEvent
  }

  return createPipeline<TEvent, any>(pipelineConfig)
}

// ============================================================================
// SPECIALIZED PREDICATES AND TRANSFORMATIONS FOR STAR TREK DATA
// ============================================================================

/**
 * Predicate functions for filtering Star Trek items based on various criteria.
 * These curried functions can be composed into complex filtering pipelines.
 */
export const starTrekPredicates = {
  /**
   * Creates a predicate that matches items by type (series, movie, animated).
   *
   * @param type - The content type to match
   * @returns Predicate function for filtering items
   *
   * @example
   * ```typescript
   * const isMovie = starTrekPredicates.byType('movie')
   * const movies = items.filter(isMovie)
   * ```
   */
  byType: curry((type: string, item: StarTrekItem) => item.type === type),

  /**
   * Creates a predicate that matches items by year or year range.
   *
   * @param year - The year to match (can be partial)
   * @returns Predicate function for filtering items
   *
   * @example
   * ```typescript
   * const from1990s = starTrekPredicates.byYear('199')
   * const nineties = items.filter(from1990s)
   * ```
   */
  byYear: curry((year: string, item: StarTrekItem) => item.year.includes(year)),

  /**
   * Creates a predicate that matches items containing specific text in title or notes.
   *
   * @param searchTerm - The text to search for (case-insensitive)
   * @returns Predicate function for filtering items
   *
   * @example
   * ```typescript
   * const hasEnterprise = starTrekPredicates.byText('enterprise')
   * const enterpriseItems = items.filter(hasEnterprise)
   * ```
   */
  byText: curry((searchTerm: string, item: StarTrekItem) => {
    const term = searchTerm.toLowerCase()
    return item.title.toLowerCase().includes(term) || item.notes.toLowerCase().includes(term)
  }),

  /**
   * Creates a predicate that matches items with episode counts within a range.
   *
   * @param minEpisodes - Minimum number of episodes
   * @param maxEpisodes - Maximum number of episodes (optional)
   * @returns Predicate function for filtering items
   *
   * @example
   * ```typescript
   * const longSeries = starTrekPredicates.byEpisodeCount(20, 30)
   * const longRunning = items.filter(longSeries)
   * ```
   */
  byEpisodeCount: curry(
    (minEpisodes: number, maxEpisodes: number | undefined, item: StarTrekItem) => {
      if (!item.episodes) return false
      if (maxEpisodes) {
        return item.episodes >= minEpisodes && item.episodes <= maxEpisodes
      }
      return item.episodes >= minEpisodes
    },
  ),

  /**
   * Creates a predicate that matches items by their watched status.
   *
   * @param watchedItems - Array of watched item IDs
   * @param isWatched - Whether to match watched (true) or unwatched (false) items
   * @returns Predicate function for filtering items
   *
   * @example
   * ```typescript
   * const watchedItems = ['tos_s1', 'ent_s1']
   * const isWatched = starTrekPredicates.byWatchedStatus(watchedItems, true)
   * const watched = items.filter(isWatched)
   * ```
   */
  byWatchedStatus: curry((watchedItems: string[], isWatched: boolean, item: StarTrekItem) => {
    const itemIsWatched = watchedItems.includes(item.id)
    return isWatched ? itemIsWatched : !itemIsWatched
  }),
}

/**
 * Transformation functions for converting and normalizing Star Trek data.
 * These functions can be composed into data processing pipelines.
 */
export const starTrekTransformations = {
  /**
   * Normalizes search terms by trimming and converting to lowercase.
   *
   * @param term - Search term to normalize
   * @returns Normalized search term
   *
   * @example
   * ```typescript
   * const normalized = starTrekTransformations.normalizeSearchTerm('  Enterprise  ')
   * // Returns: 'enterprise'
   * ```
   */
  normalizeSearchTerm: (term: string): string => term.trim().toLowerCase(),

  /**
   * Extracts unique content types from an array of Star Trek items.
   *
   * @param items - Array of Star Trek items
   * @returns Array of unique content types
   *
   * @example
   * ```typescript
   * const types = starTrekTransformations.extractTypes(starTrekData.flatMap(era => era.items))
   * // Returns: ['series', 'movie', 'animated']
   * ```
   */
  extractTypes: (items: StarTrekItem[]): string[] => [...new Set(items.map(item => item.type))],

  /**
   * Calculates total episode count for an array of Star Trek items.
   *
   * @param items - Array of Star Trek items
   * @returns Total number of episodes
   *
   * @example
   * ```typescript
   * const totalEpisodes = starTrekTransformations.calculateTotalEpisodes(era.items)
   * ```
   */
  calculateTotalEpisodes: (items: StarTrekItem[]): number =>
    items.reduce((total, item) => total + (item.episodes ?? 0), 0),

  /**
   * Sorts Star Trek items by their year (chronologically).
   *
   * @param items - Array of Star Trek items to sort
   * @returns Sorted array of items
   *
   * @example
   * ```typescript
   * const sortedItems = starTrekTransformations.sortByYear(era.items)
   * ```
   */
  sortByYear: (items: StarTrekItem[]): StarTrekItem[] =>
    [...items].sort((a, b) => {
      // Extract first year from year string for comparison
      const yearA = Number.parseInt(a.year.match(/\d{4}/)?.[0] ?? '0', 10)
      const yearB = Number.parseInt(b.year.match(/\d{4}/)?.[0] ?? '0', 10)
      return yearA - yearB
    }),

  /**
   * Creates a summary object with metadata about Star Trek eras.
   *
   * @param eras - Array of Star Trek eras
   * @returns Summary object with counts and statistics
   *
   * @example
   * ```typescript
   * const summary = starTrekTransformations.createEraSummary(starTrekData)
   * ```
   */
  createEraSummary: (
    eras: StarTrekEra[],
  ): {
    totalEras: number
    totalItems: number
    totalEpisodes: number
    typeBreakdown: Record<string, number>
  } => {
    const allItems = eras.flatMap(era => era.items)
    const typeBreakdown = allItems.reduce(
      (acc, item) => {
        acc[item.type] = (acc[item.type] ?? 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return {
      totalEras: eras.length,
      totalItems: allItems.length,
      totalEpisodes: starTrekTransformations.calculateTotalEpisodes(allItems),
      typeBreakdown,
    }
  },

  /**
   * Filters eras to only include those with items matching a predicate.
   *
   * @param predicate - Function to test each item
   * @param eras - Array of Star Trek eras to filter
   * @returns Filtered eras containing only matching items
   *
   * @example
   * ```typescript
   * const moviesOnly = starTrekTransformations.filterErasByItems(
   *   item => item.type === 'movie',
   *   starTrekData
   * )
   * ```
   */
  filterErasByItems: curry((predicate: (item: StarTrekItem) => boolean, eras: StarTrekEra[]) =>
    eras
      .map(era => ({
        ...era,
        items: era.items.filter(predicate),
      }))
      .filter(era => era.items.length > 0),
  ),
}

// ============================================================================
// EVENT-AWARE COMPOSITION UTILITIES (PHASE 4 - TASK-016)
// ============================================================================

/**
 * Configuration for creating event-aware pipelines that integrate with generic EventEmitter system.
 * Enables pipelines to emit events at various stages while maintaining type safety.
 *
 * @template TInput - Input type for the pipeline
 * @template TOutput - Output type for the pipeline
 * @template TEventMap - Event map type for type-safe event emissions
 */
export interface EventAwarePipelineConfig<TInput, TOutput, TEventMap extends EventMap>
  extends PipelineConfig<TInput, TOutput> {
  /** EventEmitter instance for emitting pipeline events */
  eventEmitter: EventEmitterInstance<TEventMap>
  /** Event name to emit when pipeline starts */
  onStartEvent?: keyof TEventMap
  /** Event name to emit when pipeline completes successfully */
  onSuccessEvent?: keyof TEventMap
  /** Event name to emit when pipeline encounters an error */
  onErrorEvent?: keyof TEventMap
  /** Function to create event payload for start event */
  createStartPayload?: (input: TInput) => TEventMap[keyof TEventMap]
  /** Function to create event payload for success event */
  createSuccessPayload?: (output: TOutput, input: TInput) => TEventMap[keyof TEventMap]
  /** Function to create event payload for error event */
  createErrorPayload?: (error: Error, input: TInput) => TEventMap[keyof TEventMap]
}

/**
 * Creates an event-aware pipeline that integrates with the generic EventEmitter system.
 * Emits type-safe events at pipeline start, success, and error stages.
 *
 * @param config - Event-aware pipeline configuration
 * @returns Pipeline function that emits events during execution
 *
 * @example
 * ```typescript
 * interface MyEvents extends EventMap {
 *   'pipeline-start': { input: string }
 *   'pipeline-success': { output: number, input: string }
 *   'pipeline-error': { error: string, input: string }
 * }
 *
 * const eventEmitter = createEventEmitter<MyEvents>()
 * const pipeline = createEventAwarePipeline({
 *   eventEmitter,
 *   onStartEvent: 'pipeline-start',
 *   onSuccessEvent: 'pipeline-success',
 *   onErrorEvent: 'pipeline-error',
 *   steps: [
 *     (s: string) => s.trim(),
 *     (s: string) => parseInt(s, 10)
 *   ],
 *   createStartPayload: (input) => ({ input }),
 *   createSuccessPayload: (output, input) => ({ output, input }),
 *   createErrorPayload: (error, input) => ({ error: error.message, input })
 * })
 * ```
 */
export function createEventAwarePipeline<TInput, TOutput, TEventMap extends EventMap>(
  config: EventAwarePipelineConfig<TInput, TOutput, TEventMap>,
): Pipeline<TInput, TOutput> {
  return (input: TInput): TOutput => {
    try {
      // Emit pipeline start event if configured
      if (config.onStartEvent && config.createStartPayload) {
        const payload = config.createStartPayload(input)
        config.eventEmitter.emit(config.onStartEvent, payload)
      }

      // Validate input if validator provided
      if (config.validate && !config.validate(input)) {
        throw new Error('Pipeline input validation failed')
      }

      // Apply all transformation steps using reduce
      const result = config.steps.reduce((acc, step) => step(acc), input as unknown) as TOutput

      // Emit pipeline success event if configured
      if (config.onSuccessEvent && config.createSuccessPayload) {
        const payload = config.createSuccessPayload(result, input)
        config.eventEmitter.emit(config.onSuccessEvent, payload)
      }

      // Execute completion callback if provided
      if (config.onComplete) {
        config.onComplete(result)
      }

      return result
    } catch (error) {
      const err = error as Error

      // Emit pipeline error event if configured
      if (config.onErrorEvent && config.createErrorPayload) {
        const payload = config.createErrorPayload(err, input)
        config.eventEmitter.emit(config.onErrorEvent, payload)
      }

      // Handle errors if error handler provided
      if (config.onError) {
        config.onError(err, input)
      }
      throw err
    }
  }
}

/**
 * Creates an event-aware tap function that emits events when values pass through.
 * Integrates with the generic EventEmitter system for type-safe event emissions.
 *
 * @param eventEmitter - EventEmitter instance for emitting events
 * @param eventName - Name of the event to emit
 * @param createPayload - Function to create event payload from the tapped value
 * @returns Tap function that emits events and passes values through unchanged
 *
 * @example
 * ```typescript
 * interface DebugEvents extends EventMap {
 *   'value-debug': { value: number, stage: string }
 * }
 *
 * const eventEmitter = createEventEmitter<DebugEvents>()
 * const debugTap = createEventAwareTap(
 *   eventEmitter,
 *   'value-debug',
 *   (value: number) => ({ value, stage: 'middle' })
 * )
 *
 * const result = pipe(
 *   42,
 *   (n: number) => n * 2,
 *   debugTap, // Emits debug event with value 84
 *   (n: number) => n + 1
 * )
 * ```
 */
export function createEventAwareTap<T, TEventMap extends EventMap>(
  eventEmitter: EventEmitterInstance<TEventMap>,
  eventName: keyof TEventMap,
  createPayload: (value: T) => TEventMap[keyof TEventMap],
): UnaryFunction<T, T> {
  return (value: T): T => {
    try {
      const payload = createPayload(value)
      eventEmitter.emit(eventName, payload)
    } catch (error) {
      console.error(`Error in event-aware tap for '${String(eventName)}':`, error)
    }
    return value
  }
}

/**
 * Creates an event-aware curry function that emits events during partial application.
 * Useful for tracking function composition and debugging curried function chains.
 *
 * @param eventEmitter - EventEmitter instance for emitting events
 * @param eventName - Name of the event to emit on each curry step
 * @param fn - Function to be curried
 * @param arity - Number of arguments (optional, defaults to fn.length)
 * @returns Curried function that emits events during partial application
 *
 * @example
 * ```typescript
 * interface CurryEvents extends EventMap {
 *   'curry-step': { appliedArgs: unknown[], remainingArgs: number }
 * }
 *
 * const eventEmitter = createEventEmitter<CurryEvents>()
 * const add = (a: number, b: number, c: number) => a + b + c
 * const eventAwareCurried = createEventAwareCurry(
 *   eventEmitter,
 *   'curry-step',
 *   add
 * )
 *
 * const step1 = eventAwareCurried(10) // Emits curry-step event
 * const step2 = step1(5) // Emits curry-step event
 * const result = step2(3) // Final result: 18
 * ```
 */
export function createEventAwareCurry<T extends Func, TEventMap extends EventMap>(
  eventEmitter: EventEmitterInstance<TEventMap>,
  eventName: keyof TEventMap,
  fn: T,
  arity: number = fn.length,
): any {
  function curried(...args: any[]): any {
    try {
      const payload = {
        appliedArgs: args,
        remainingArgs: Math.max(0, arity - args.length),
      } as TEventMap[keyof TEventMap]
      eventEmitter.emit(eventName, payload)
    } catch (error) {
      console.error(`Error in event-aware curry for '${String(eventName)}':`, error)
    }

    if (args.length >= arity) {
      return fn(...args)
    }
    return (...nextArgs: any[]) => curried(...args, ...nextArgs)
  }

  return curried
}

/**
 * Progress tracking events for event-aware composition utilities
 */
export interface CompositionEvents extends EventMap {
  'pipeline-start': {pipelineId: string; input: unknown}
  'pipeline-success': {pipelineId: string; output: unknown; duration: number}
  'pipeline-error': {pipelineId: string; error: string; input: unknown}
  'tap-value': {tapId: string; value: unknown}
  'curry-step': {functionName: string; appliedArgs: unknown[]; remainingArgs: number}
}

/**
 * Creates a specialized VBS progress pipeline that integrates with EventEmitter for progress notifications.
 * Extends the existing progress pipeline with event emissions for better integration.
 *
 * @param allEras - Array of all Star Trek eras for progress calculation
 * @param eventEmitter - EventEmitter instance for progress events
 * @param eventName - Name of the event to emit for progress updates
 * @param config - Progress pipeline configuration options
 * @returns Event-aware pipeline function for progress calculations
 */
export function createEventAwareProgressPipeline<TEventMap extends EventMap>(
  allEras: StarTrekEra[],
  eventEmitter: EventEmitterInstance<TEventMap>,
  eventName: keyof TEventMap,
  config: ProgressPipelineConfig = {},
): Pipeline<string[], OverallProgress> {
  const basePipeline = createProgressPipeline(allEras, config)

  return (watchedItems: string[]): OverallProgress => {
    try {
      const result = basePipeline(watchedItems)

      // Emit progress update event
      const payload = {
        overall: result.overall,
        eraProgress: result.eraProgress,
      } as TEventMap[keyof TEventMap]
      eventEmitter.emit(eventName, payload)

      return result
    } catch (error) {
      console.error('Error in event-aware progress pipeline:', error)
      throw error
    }
  }
}

// ============================================================================
// GENERIC STORAGE PIPELINE UTILITIES (PHASE 4 - TASK-017)
// ============================================================================

/**
 * Generic storage operation types for pipeline utilities
 */
export type StorageOperation = 'save' | 'load' | 'remove' | 'clear' | 'exists'

/**
 * Configuration for storage-aware pipelines that work with both LocalStorage and IndexedDB
 */
export interface StoragePipelineConfig<TInput, TOutput> {
  /** Operation to perform (save, load, remove, etc.) */
  operation: StorageOperation
  /** Storage key to use for the operation */
  key: string
  /** Optional validation function for loaded data */
  validate?: (data: unknown) => data is TOutput
  /** Optional transformation of input before storage */
  serialize?: (input: TInput) => unknown
  /** Optional transformation of stored data after loading */
  deserialize?: (data: unknown) => TOutput
  /** Fallback value for failed load operations */
  fallback?: TOutput
  /** Error handling strategy */
  onError?: (error: Error, operation: StorageOperation, key: string) => void
}

/**
 * Generic storage adapter interface compatible with both sync and async storage
 */
export interface GenericStorageAdapter<T = unknown> {
  save(key: string, data: T): Promise<void> | void
  load(key: string): Promise<T | null> | T | null
  remove(key: string): Promise<void> | void
  clear(): Promise<void> | void
  exists(key: string): Promise<boolean> | boolean
}

/**
 * Creates a storage-aware pipeline that can work with both sync and async storage adapters.
 * Automatically handles Promise resolution for async operations while maintaining compatibility.
 *
 * @param adapter - Storage adapter (LocalStorage, IndexedDB, etc.)
 * @param config - Storage pipeline configuration
 * @returns Pipeline function for storage operations
 *
 * @example
 * ```typescript
 * const localStorageAdapter = new LocalStorageAdapter<string[]>()
 * const savePipeline = createStoragePipeline(localStorageAdapter, {
 *   operation: 'save',
 *   key: 'user-preferences',
 *   serialize: (prefs) => JSON.stringify(prefs)
 * })
 *
 * const preferences = ['dark-theme', 'compact-view']
 * await savePipeline(preferences)
 * ```
 */
export function createStoragePipeline<TInput, TOutput>(
  adapter: GenericStorageAdapter,
  config: StoragePipelineConfig<TInput, TOutput>,
): (input: TInput) => Promise<TOutput | void> {
  return async (input: TInput): Promise<TOutput | void> => {
    try {
      switch (config.operation) {
        case 'save': {
          const dataToSave = config.serialize ? config.serialize(input) : input
          const result = adapter.save(config.key, dataToSave)
          if (result instanceof Promise) {
            await result
          }
          break
        }

        case 'load': {
          const result = adapter.load(config.key)
          const loadedData = result instanceof Promise ? await result : result

          if (loadedData === null) {
            return config.fallback
          }

          if (config.validate && !config.validate(loadedData)) {
            console.warn(`Storage validation failed for key "${config.key}"`)
            return config.fallback
          }

          return config.deserialize ? config.deserialize(loadedData) : (loadedData as TOutput)
        }

        case 'remove': {
          const result = adapter.remove(config.key)
          if (result instanceof Promise) {
            await result
          }
          break
        }

        case 'clear': {
          const result = adapter.clear()
          if (result instanceof Promise) {
            await result
          }
          break
        }

        case 'exists': {
          const result = adapter.exists(config.key)
          const exists = result instanceof Promise ? await result : result
          return exists as unknown as TOutput
        }

        default:
          throw new Error(`Unknown storage operation: ${config.operation}`)
      }
    } catch (error) {
      const err = error as Error
      if (config.onError) {
        config.onError(err, config.operation, config.key)
      }
      throw err
    }
  }
}

/**
 * Creates a specialized pipeline for VBS progress data storage operations.
 * Handles the complete flow: validation → serialization → storage → event notification.
 *
 * @param adapter - Storage adapter for progress data
 * @param eventEmitter - Optional EventEmitter for storage events
 * @returns Storage pipeline specialized for VBS progress data
 *
 * @example
 * ```typescript
 * const progressStorage = createProgressStoragePipeline(
 *   new IndexedDBAdapter<string[]>('StarTrekVBS', 'progress'),
 *   eventEmitter
 * )
 *
 * // Save progress
 * await progressStorage.save(['tos_s1', 'ent_s1', 'tng_s1'])
 *
 * // Load progress
 * const savedProgress = await progressStorage.load()
 * ```
 */
export function createProgressStoragePipeline<TEventMap extends EventMap>(
  adapter: GenericStorageAdapter<string[]>,
  eventEmitter?: EventEmitterInstance<TEventMap>,
): {
  save: (input: string[]) => Promise<void>
  load: (input: void) => Promise<string[]>
  clear: (input: void) => Promise<void>
  export: Pipeline<string[], unknown>
  import: Pipeline<unknown, string[]>
} {
  const validateProgressData = (data: unknown): data is string[] =>
    Array.isArray(data) && data.every(item => typeof item === 'string')

  const createExportData = (watchedItems: string[]) => ({
    version: '1.0',
    timestamp: new Date().toISOString(),
    progress: watchedItems,
  })

  const extractImportData = (data: unknown): string[] => {
    if (typeof data === 'object' && data !== null && 'progress' in data) {
      const exportData = data as {progress: unknown}
      if (validateProgressData(exportData.progress)) {
        return exportData.progress
      }
    }
    if (validateProgressData(data)) {
      return data
    }
    throw new Error('Invalid import data format')
  }

  const emitStorageEvent = (eventType: string, data?: unknown) => {
    if (eventEmitter) {
      try {
        const payload = {eventType, data, timestamp: Date.now()} as TEventMap[keyof TEventMap]
        // Try to emit using a generic event name - this would need to be configured per use case
        const eventNames = eventEmitter.eventNames()
        const storageEventName = eventNames.find(name => String(name).includes('storage'))
        if (storageEventName) {
          eventEmitter.emit(storageEventName, payload)
        }
      } catch (error) {
        console.error('Error emitting storage event:', error)
      }
    }
  }

  return {
    save: async (watchedItems: string[]) => {
      const result = adapter.save('starTrekProgress', watchedItems)
      if (result instanceof Promise) {
        await result
      }
      emitStorageEvent('save-success', {itemCount: watchedItems.length})
    },

    load: async (): Promise<string[]> => {
      try {
        const result = adapter.load('starTrekProgress')
        const loadedData = result instanceof Promise ? await result : result

        if (loadedData === null) {
          emitStorageEvent('load-fallback', {fallback: []})
          return []
        }

        if (!validateProgressData(loadedData)) {
          console.warn('Storage validation failed for progress data')
          emitStorageEvent('load-validation-error', {data: loadedData})
          return []
        }

        emitStorageEvent('load-success', {itemCount: loadedData.length})
        return loadedData
      } catch (error) {
        const err = error as Error
        emitStorageEvent('load-error', {error: err.message})
        console.error('Storage load error:', err)
        return []
      }
    },

    clear: async () => {
      try {
        const result = adapter.clear()
        if (result instanceof Promise) {
          await result
        }
        emitStorageEvent('clear-success', {})
      } catch (error) {
        const err = error as Error
        emitStorageEvent('clear-error', {error: err.message})
        console.error('Storage clear error:', err)
        throw err
      }
    },

    export: (watchedItems: string[]) => {
      try {
        const exportData = createExportData(watchedItems)
        emitStorageEvent('export-success', {itemCount: watchedItems.length})
        return exportData
      } catch (error) {
        const err = error as Error
        emitStorageEvent('export-error', {error: err.message})
        throw err
      }
    },

    import: (data: unknown) => {
      try {
        const importedProgress = extractImportData(data)
        emitStorageEvent('import-success', {itemCount: importedProgress.length})
        return importedProgress
      } catch (error) {
        const err = error as Error
        emitStorageEvent('import-error', {error: err.message})
        throw err
      }
    },
  }
}

/**
 * Creates storage adapters with composition-friendly interfaces for IndexedDB migration.
 * Provides unified interface for LocalStorage → IndexedDB transition.
 */
export const storageAdapterFactory = {
  /**
   * Creates a LocalStorage adapter with validation and composition support
   */
  localStorage: <T>(
    options: {
      validate?: (data: unknown) => data is T
      fallback?: T
    } = {},
  ): GenericStorageAdapter<T> => ({
    save(key: string, data: T): void {
      localStorage.setItem(key, JSON.stringify(data))
    },

    load(key: string): T | null {
      const stored = localStorage.getItem(key)
      if (!stored) return options.fallback ?? null

      try {
        const parsed = JSON.parse(stored)
        if (options.validate && !options.validate(parsed)) {
          return options.fallback ?? null
        }
        return parsed
      } catch {
        return options.fallback ?? null
      }
    },

    remove(key: string): void {
      localStorage.removeItem(key)
    },

    clear(): void {
      localStorage.clear()
    },

    exists(key: string): boolean {
      return localStorage.getItem(key) !== null
    },
  }),

  /**
   * Creates an IndexedDB adapter placeholder for future implementation
   * Currently returns a Promise-based interface for compatibility
   */
  indexedDB: <T>(
    _dbName = 'StarTrekVBS',
    _storeName = 'data',
    _version = 1,
  ): GenericStorageAdapter<T> => ({
    async save(key: string, data: T): Promise<void> {
      // Future IndexedDB implementation
      console.warn('IndexedDB adapter not yet implemented, falling back to localStorage')
      localStorage.setItem(`idb:${key}`, JSON.stringify(data))
    },

    async load(key: string): Promise<T | null> {
      // Future IndexedDB implementation
      console.warn('IndexedDB adapter not yet implemented, falling back to localStorage')
      const stored = localStorage.getItem(`idb:${key}`)
      return stored ? JSON.parse(stored) : null
    },

    async remove(key: string): Promise<void> {
      // Future IndexedDB implementation
      localStorage.removeItem(`idb:${key}`)
    },

    async clear(): Promise<void> {
      // Future IndexedDB implementation - clear only IDB-prefixed keys
      const keys = Object.keys(localStorage).filter(k => k.startsWith('idb:'))
      keys.forEach(key => localStorage.removeItem(key))
    },

    async exists(key: string): Promise<boolean> {
      // Future IndexedDB implementation
      return localStorage.getItem(`idb:${key}`) !== null
    },
  }),
}

// ============================================================================
// EPISODE-LEVEL TRACKING PIPELINE FOUNDATIONS (PHASE 4 - TASK-018)
// ============================================================================

/**
 * Episode metadata interface for future episode-level tracking implementation
 */
export interface Episode {
  /** Unique identifier for the episode */
  id: string
  /** Season identifier this episode belongs to */
  seasonId: string
  /** Episode number within the season */
  episodeNumber: number
  /** Episode title */
  title: string
  /** Air date */
  airDate: string
  /** Runtime in minutes */
  runtime?: number
  /** Episode synopsis */
  synopsis?: string
  /** Guest stars */
  guestStars?: string[]
  /** Plot connections to other episodes */
  connections?: string[]
  /** Stardate for this specific episode */
  stardate?: string
}

/**
 * Season metadata interface for hierarchical episode organization
 */
export interface Season {
  /** Unique identifier for the season */
  id: string
  /** Series identifier this season belongs to */
  seriesId: string
  /** Season number */
  seasonNumber: number
  /** Season title (if applicable) */
  title?: string
  /** Year range for the season */
  year: string
  /** Array of episodes in this season */
  episodes: Episode[]
}

/**
 * Enhanced series interface with episode-level data
 */
export interface SeriesWithEpisodes extends StarTrekItem {
  /** Array of seasons containing episodes */
  seasons?: Season[]
  /** Total episode count (calculated from seasons) */
  totalEpisodes?: number
}

/**
 * Episode-level progress tracking data
 */
export interface EpisodeProgress {
  /** Episode ID */
  episodeId: string
  /** Whether the episode has been watched */
  watched: boolean
  /** Watch date (optional) */
  watchDate?: string
  /** User rating (1-5, optional) */
  rating?: number
  /** User notes (optional) */
  notes?: string
}

/**
 * Season-level progress aggregation
 */
export interface SeasonProgress {
  /** Season ID */
  seasonId: string
  /** Total episodes in season */
  totalEpisodes: number
  /** Number of watched episodes */
  watchedEpisodes: number
  /** Completion percentage */
  percentage: number
  /** Episode-level progress details */
  episodes: EpisodeProgress[]
}

/**
 * Series-level progress aggregation
 */
export interface SeriesProgress {
  /** Series ID */
  seriesId: string
  /** Total episodes across all seasons */
  totalEpisodes: number
  /** Number of watched episodes */
  watchedEpisodes: number
  /** Completion percentage */
  percentage: number
  /** Season-level progress details */
  seasons: SeasonProgress[]
}

/**
 * Configuration for episode-level progress pipelines
 */
export interface EpisodeProgressPipelineConfig {
  /** Validation function for episode progress data */
  validateEpisodeProgress?: (data: unknown) => data is EpisodeProgress[]
  /** Callback for progress updates */
  onProgressUpdate?: (progress: SeriesProgress[]) => void
  /** Error handling */
  onError?: (error: Error) => void
}

/**
 * Creates a pipeline for calculating episode-level progress from individual episode tracking.
 * Provides the foundation for future episode-level feature implementation.
 *
 * @param seriesData - Array of series with episode data
 * @param config - Episode progress pipeline configuration
 * @returns Pipeline function for episode progress calculations
 *
 * @example
 * ```typescript
 * const episodeProgressPipeline = createEpisodeProgressPipeline(seriesWithEpisodes, {
 *   onProgressUpdate: (progress) => {
 *     console.log(`Series progress calculated for ${progress.length} series`)
 *   }
 * })
 *
 * const episodeProgress: EpisodeProgress[] = [
 *   { episodeId: 'tos_s1_e1', watched: true, watchDate: '2024-01-01' },
 *   { episodeId: 'tos_s1_e2', watched: true, watchDate: '2024-01-02' }
 * ]
 *
 * const seriesProgress = episodeProgressPipeline(episodeProgress)
 * ```
 */
export function createEpisodeProgressPipeline(
  seriesData: SeriesWithEpisodes[],
  config: EpisodeProgressPipelineConfig = {},
): Pipeline<EpisodeProgress[], SeriesProgress[]> {
  const {validateEpisodeProgress, onProgressUpdate, onError} = config

  return (episodeProgress: EpisodeProgress[]): SeriesProgress[] => {
    try {
      // Validate input if validator provided
      if (validateEpisodeProgress && !validateEpisodeProgress(episodeProgress)) {
        throw new Error('Episode progress validation failed')
      }

      // Create a lookup map for episode progress
      const progressLookup = new Map<string, EpisodeProgress>()
      episodeProgress.forEach(progress => {
        progressLookup.set(progress.episodeId, progress)
      })

      // Calculate progress for each series
      const seriesProgress: SeriesProgress[] = seriesData.map(series => {
        if (!series.seasons) {
          // Fallback for series without episode data
          return {
            seriesId: series.id,
            totalEpisodes: series.episodes ?? 0,
            watchedEpisodes: 0,
            percentage: 0,
            seasons: [],
          }
        }

        const seasonProgress: SeasonProgress[] = series.seasons.map(season => {
          const episodeProgressData: EpisodeProgress[] = season.episodes.map(episode => {
            return (
              progressLookup.get(episode.id) ?? {
                episodeId: episode.id,
                watched: false,
              }
            )
          })

          const watchedCount = episodeProgressData.filter(ep => ep.watched).length
          const totalCount = season.episodes.length

          return {
            seasonId: season.id,
            totalEpisodes: totalCount,
            watchedEpisodes: watchedCount,
            percentage: totalCount > 0 ? Math.round((watchedCount / totalCount) * 100) : 0,
            episodes: episodeProgressData,
          }
        })

        const totalEpisodes = seasonProgress.reduce((sum, season) => sum + season.totalEpisodes, 0)
        const watchedEpisodes = seasonProgress.reduce(
          (sum, season) => sum + season.watchedEpisodes,
          0,
        )

        return {
          seriesId: series.id,
          totalEpisodes,
          watchedEpisodes,
          percentage: totalEpisodes > 0 ? Math.round((watchedEpisodes / totalEpisodes) * 100) : 0,
          seasons: seasonProgress,
        }
      })

      // Execute completion callback if provided
      if (onProgressUpdate) {
        onProgressUpdate(seriesProgress)
      }

      return seriesProgress
    } catch (error) {
      const err = error as Error
      if (onError) {
        onError(err)
      }
      throw err
    }
  }
}

/**
 * Creates specialized predicates for episode-level filtering and search operations.
 * Extends the existing Star Trek predicates with episode-specific functionality.
 */
export const episodePredicates = {
  /**
   * Creates a predicate that matches episodes by air date range.
   *
   * @param startDate - Start date (YYYY-MM-DD format)
   * @param endDate - End date (YYYY-MM-DD format, optional)
   * @returns Predicate function for filtering episodes
   */
  byAirDateRange: curry((startDate: string, endDate: string | undefined, episode: Episode) => {
    if (endDate) {
      return episode.airDate >= startDate && episode.airDate <= endDate
    }
    return episode.airDate >= startDate
  }),

  /**
   * Creates a predicate that matches episodes by runtime (useful for finding specials).
   *
   * @param minRuntime - Minimum runtime in minutes
   * @param maxRuntime - Maximum runtime in minutes (optional)
   * @returns Predicate function for filtering episodes
   */
  byRuntime: curry((minRuntime: number, maxRuntime: number | undefined, episode: Episode) => {
    if (!episode.runtime) return false
    if (maxRuntime) {
      return episode.runtime >= minRuntime && episode.runtime <= maxRuntime
    }
    return episode.runtime >= minRuntime
  }),

  /**
   * Creates a predicate that matches episodes containing specific guest stars.
   *
   * @param guestStar - Guest star name to search for
   * @returns Predicate function for filtering episodes
   */
  byGuestStar: curry((guestStar: string, episode: Episode) => {
    if (!episode.guestStars) return false
    return episode.guestStars.some(star => star.toLowerCase().includes(guestStar.toLowerCase()))
  }),

  /**
   * Creates a predicate that matches episodes with specific connections.
   *
   * @param connectionId - Episode ID to find connections to
   * @returns Predicate function for filtering episodes
   */
  byConnection: curry((connectionId: string, episode: Episode) => {
    if (!episode.connections) return false
    return episode.connections.includes(connectionId)
  }),

  /**
   * Creates a predicate that matches episodes by watch status.
   *
   * @param episodeProgress - Array of episode progress data
   * @param watched - Whether to match watched (true) or unwatched (false) episodes
   * @returns Predicate function for filtering episodes
   */
  byWatchStatus: curry((episodeProgress: EpisodeProgress[], watched: boolean, episode: Episode) => {
    const progress = episodeProgress.find(p => p.episodeId === episode.id)
    return progress ? progress.watched === watched : !watched
  }),
}

/**
 * Episode-level transformation utilities for data processing pipelines.
 */
export const episodeTransformations = {
  /**
   * Converts season-level progress data to current VBS item-level format.
   * Provides backward compatibility during episode-level feature rollout.
   *
   * @param seriesProgress - Episode-level progress data
   * @returns Array of watched item IDs in current VBS format
   */
  convertToItemProgress: (seriesProgress: SeriesProgress[]): string[] => {
    const watchedItems: string[] = []

    seriesProgress.forEach(series => {
      // If all episodes in a series are watched, mark the series as watched
      if (series.watchedEpisodes === series.totalEpisodes && series.totalEpisodes > 0) {
        watchedItems.push(series.seriesId)
      }
      // Otherwise, check if any full seasons are watched
      else {
        series.seasons.forEach(season => {
          if (season.watchedEpisodes === season.totalEpisodes && season.totalEpisodes > 0) {
            watchedItems.push(season.seasonId)
          }
        })
      }
    })

    return watchedItems
  },

  /**
   * Calculates viewing statistics from episode progress data.
   *
   * @param seriesProgress - Episode-level progress data
   * @returns Viewing statistics object
   */
  calculateViewingStats: (seriesProgress: SeriesProgress[]) => {
    const totalEpisodes = seriesProgress.reduce((sum, series) => sum + series.totalEpisodes, 0)
    const watchedEpisodes = seriesProgress.reduce((sum, series) => sum + series.watchedEpisodes, 0)
    const completedSeries = seriesProgress.filter(
      series => series.watchedEpisodes === series.totalEpisodes && series.totalEpisodes > 0,
    ).length

    const averageCompletion =
      seriesProgress.length > 0
        ? seriesProgress.reduce((sum, series) => sum + series.percentage, 0) / seriesProgress.length
        : 0

    return {
      totalEpisodes,
      watchedEpisodes,
      completedSeries,
      totalSeries: seriesProgress.length,
      overallPercentage:
        totalEpisodes > 0 ? Math.round((watchedEpisodes / totalEpisodes) * 100) : 0,
      averageCompletion: Math.round(averageCompletion),
    }
  },

  /**
   * Groups episodes by decade for chronological analysis.
   *
   * @param episodes - Array of episodes to group
   * @returns Episodes grouped by decade
   */
  groupByDecade: (episodes: Episode[]) => {
    const decades = new Map<string, Episode[]>()

    episodes.forEach(episode => {
      const year = new Date(episode.airDate).getFullYear()
      const decade = `${Math.floor(year / 10) * 10}s`

      if (!decades.has(decade)) {
        decades.set(decade, [])
      }
      const decadeEpisodes = decades.get(decade)
      if (decadeEpisodes) {
        decadeEpisodes.push(episode)
      }
    })

    return Object.fromEntries(decades)
  },

  /**
   * Finds episode connections and builds a connection graph.
   *
   * @param episodes - Array of episodes to analyze
   * @returns Connection graph showing episode relationships
   */
  buildConnectionGraph: (episodes: Episode[]) => {
    const connections = new Map<string, string[]>()

    episodes.forEach(episode => {
      if (episode.connections) {
        connections.set(episode.id, episode.connections)

        // Add reverse connections
        episode.connections.forEach(connectedId => {
          if (!connections.has(connectedId)) {
            connections.set(connectedId, [])
          }
          const connectedEpisodes = connections.get(connectedId)
          if (connectedEpisodes && !connectedEpisodes.includes(episode.id)) {
            connectedEpisodes.push(episode.id)
          }
        })
      }
    })

    return Object.fromEntries(connections)
  },
}

// ============================================================================
// ASYNC COMPOSITION UTILITIES (PHASE 4 - TASK-019)
// ============================================================================

/**
 * Async version of UnaryFunction that returns a Promise
 */
export type AsyncUnaryFunction<T, U> = (arg: T) => Promise<U>

/**
 * Mixed function type that can be either sync or async
 */
export type MixedUnaryFunction<T, U> = UnaryFunction<T, U> | AsyncUnaryFunction<T, U>

/**
 * Async version of pipe function that handles both sync and async functions.
 * Pipes the output of one function to the input of the next, left to right,
 * with automatic Promise handling for async operations.
 *
 * @param value - Initial value to pipe through functions
 * @returns Promise resolving to result after applying all functions
 *
 * @example
 * ```typescript
 * const result = await asyncPipe(
 *   'hello',
 *   (s: string) => s.toUpperCase(), // sync function
 *   async (s: string) => `${s}!`,   // async function
 *   (s: string) => s.length         // sync function
 * ) // Returns: Promise<6>
 * ```
 */
export function asyncPipe<T>(value: T): Promise<T>
export function asyncPipe<T, A>(value: T, fn1: MixedUnaryFunction<T, A>): Promise<A>
export function asyncPipe<T, A, B>(
  value: T,
  fn1: MixedUnaryFunction<T, A>,
  fn2: MixedUnaryFunction<A, B>,
): Promise<B>
export function asyncPipe<T, A, B, C>(
  value: T,
  fn1: MixedUnaryFunction<T, A>,
  fn2: MixedUnaryFunction<A, B>,
  fn3: MixedUnaryFunction<B, C>,
): Promise<C>
export function asyncPipe<T, A, B, C, D>(
  value: T,
  fn1: MixedUnaryFunction<T, A>,
  fn2: MixedUnaryFunction<A, B>,
  fn3: MixedUnaryFunction<B, C>,
  fn4: MixedUnaryFunction<C, D>,
): Promise<D>
export function asyncPipe<T, A, B, C, D, E>(
  value: T,
  fn1: MixedUnaryFunction<T, A>,
  fn2: MixedUnaryFunction<A, B>,
  fn3: MixedUnaryFunction<B, C>,
  fn4: MixedUnaryFunction<C, D>,
  fn5: MixedUnaryFunction<D, E>,
): Promise<E>
export function asyncPipe<T, A, B, C, D, E, F>(
  value: T,
  fn1: MixedUnaryFunction<T, A>,
  fn2: MixedUnaryFunction<A, B>,
  fn3: MixedUnaryFunction<B, C>,
  fn4: MixedUnaryFunction<C, D>,
  fn5: MixedUnaryFunction<D, E>,
  fn6: MixedUnaryFunction<E, F>,
): Promise<F>
export function asyncPipe<T, A, B, C, D, E, F, G>(
  value: T,
  fn1: MixedUnaryFunction<T, A>,
  fn2: MixedUnaryFunction<A, B>,
  fn3: MixedUnaryFunction<B, C>,
  fn4: MixedUnaryFunction<C, D>,
  fn5: MixedUnaryFunction<D, E>,
  fn6: MixedUnaryFunction<E, F>,
  fn7: MixedUnaryFunction<F, G>,
): Promise<G>
export function asyncPipe<T, A, B, C, D, E, F, G, H>(
  value: T,
  fn1: MixedUnaryFunction<T, A>,
  fn2: MixedUnaryFunction<A, B>,
  fn3: MixedUnaryFunction<B, C>,
  fn4: MixedUnaryFunction<C, D>,
  fn5: MixedUnaryFunction<D, E>,
  fn6: MixedUnaryFunction<E, F>,
  fn7: MixedUnaryFunction<F, G>,
  fn8: MixedUnaryFunction<G, H>,
): Promise<H>
export function asyncPipe<T, A, B, C, D, E, F, G, H, I>(
  value: T,
  fn1: MixedUnaryFunction<T, A>,
  fn2: MixedUnaryFunction<A, B>,
  fn3: MixedUnaryFunction<B, C>,
  fn4: MixedUnaryFunction<C, D>,
  fn5: MixedUnaryFunction<D, E>,
  fn6: MixedUnaryFunction<E, F>,
  fn7: MixedUnaryFunction<F, G>,
  fn8: MixedUnaryFunction<G, H>,
  fn9: MixedUnaryFunction<H, I>,
): Promise<I>
export function asyncPipe<T, A, B, C, D, E, F, G, H, I, J>(
  value: T,
  fn1: MixedUnaryFunction<T, A>,
  fn2: MixedUnaryFunction<A, B>,
  fn3: MixedUnaryFunction<B, C>,
  fn4: MixedUnaryFunction<C, D>,
  fn5: MixedUnaryFunction<D, E>,
  fn6: MixedUnaryFunction<E, F>,
  fn7: MixedUnaryFunction<F, G>,
  fn8: MixedUnaryFunction<G, H>,
  fn9: MixedUnaryFunction<H, I>,
  fn10: MixedUnaryFunction<I, J>,
): Promise<J>
export async function asyncPipe(value: any, ...fns: MixedUnaryFunction<any, any>[]): Promise<any> {
  let result = value
  for (const fn of fns) {
    result = await Promise.resolve(fn(result))
  }
  return result
}

/**
 * Async version of compose function that handles both sync and async functions.
 * Composes functions right to left with automatic Promise handling.
 *
 * @returns Composed function that applies all functions right to left asynchronously
 *
 * @example
 * ```typescript
 * const transform = asyncCompose(
 *   async (n: number) => n * 2,  // async function
 *   (s: string) => s.length,     // sync function
 *   (s: string) => s.toUpperCase() // sync function
 * )
 * const result = await transform('hello') // Returns: Promise<10>
 * ```
 */
export function asyncCompose<A>(fn1: MixedUnaryFunction<A, A>): AsyncUnaryFunction<A, A>
export function asyncCompose<A, B>(fn1: MixedUnaryFunction<A, B>): AsyncUnaryFunction<A, B>
export function asyncCompose<A, B, C>(
  fn1: MixedUnaryFunction<B, C>,
  fn2: MixedUnaryFunction<A, B>,
): AsyncUnaryFunction<A, C>
export function asyncCompose<A, B, C, D>(
  fn1: MixedUnaryFunction<C, D>,
  fn2: MixedUnaryFunction<B, C>,
  fn3: MixedUnaryFunction<A, B>,
): AsyncUnaryFunction<A, D>
export function asyncCompose<A, B, C, D, E>(
  fn1: MixedUnaryFunction<D, E>,
  fn2: MixedUnaryFunction<C, D>,
  fn3: MixedUnaryFunction<B, C>,
  fn4: MixedUnaryFunction<A, B>,
): AsyncUnaryFunction<A, E>
export function asyncCompose<A, B, C, D, E, F>(
  fn1: MixedUnaryFunction<E, F>,
  fn2: MixedUnaryFunction<D, E>,
  fn3: MixedUnaryFunction<C, D>,
  fn4: MixedUnaryFunction<B, C>,
  fn5: MixedUnaryFunction<A, B>,
): AsyncUnaryFunction<A, F>
export function asyncCompose<A, B, C, D, E, F, G>(
  fn1: MixedUnaryFunction<F, G>,
  fn2: MixedUnaryFunction<E, F>,
  fn3: MixedUnaryFunction<D, E>,
  fn4: MixedUnaryFunction<C, D>,
  fn5: MixedUnaryFunction<B, C>,
  fn6: MixedUnaryFunction<A, B>,
): AsyncUnaryFunction<A, G>
export function asyncCompose<A, B, C, D, E, F, G, H>(
  fn1: MixedUnaryFunction<G, H>,
  fn2: MixedUnaryFunction<F, G>,
  fn3: MixedUnaryFunction<E, F>,
  fn4: MixedUnaryFunction<D, E>,
  fn5: MixedUnaryFunction<C, D>,
  fn6: MixedUnaryFunction<B, C>,
  fn7: MixedUnaryFunction<A, B>,
): AsyncUnaryFunction<A, H>
export function asyncCompose<A, B, C, D, E, F, G, H, I>(
  fn1: MixedUnaryFunction<H, I>,
  fn2: MixedUnaryFunction<G, H>,
  fn3: MixedUnaryFunction<F, G>,
  fn4: MixedUnaryFunction<E, F>,
  fn5: MixedUnaryFunction<D, E>,
  fn6: MixedUnaryFunction<C, D>,
  fn7: MixedUnaryFunction<B, C>,
  fn8: MixedUnaryFunction<A, B>,
): AsyncUnaryFunction<A, I>
export function asyncCompose<A, B, C, D, E, F, G, H, I, J>(
  fn1: MixedUnaryFunction<I, J>,
  fn2: MixedUnaryFunction<H, I>,
  fn3: MixedUnaryFunction<G, H>,
  fn4: MixedUnaryFunction<F, G>,
  fn5: MixedUnaryFunction<E, F>,
  fn6: MixedUnaryFunction<D, E>,
  fn7: MixedUnaryFunction<C, D>,
  fn8: MixedUnaryFunction<B, C>,
  fn9: MixedUnaryFunction<A, B>,
): AsyncUnaryFunction<A, J>
export function asyncCompose<A, B, C, D, E, F, G, H, I, J, K>(
  fn1: MixedUnaryFunction<J, K>,
  fn2: MixedUnaryFunction<I, J>,
  fn3: MixedUnaryFunction<H, I>,
  fn4: MixedUnaryFunction<G, H>,
  fn5: MixedUnaryFunction<F, G>,
  fn6: MixedUnaryFunction<E, F>,
  fn7: MixedUnaryFunction<D, E>,
  fn8: MixedUnaryFunction<C, D>,
  fn9: MixedUnaryFunction<B, C>,
  fn10: MixedUnaryFunction<A, B>,
): AsyncUnaryFunction<A, K>
export function asyncCompose(...fns: MixedUnaryFunction<any, any>[]): AsyncUnaryFunction<any, any> {
  return async (value: any) => {
    let result = value
    for (let i = fns.length - 1; i >= 0; i--) {
      const fn = fns[i]
      if (fn) {
        result = await Promise.resolve(fn(result))
      }
    }
    return result
  }
}

/**
 * Async version of tap function that handles both sync and async side effects.
 * Executes a side effect function (sync or async) and returns the original value.
 *
 * @param fn - Side effect function to execute (return value is ignored)
 * @returns Function that applies side effect asynchronously and returns original value
 *
 * @example
 * ```typescript
 * const result = await asyncPipe(
 *   [1, 2, 3],
 *   asyncTap(async arr => {
 *     await logToDatabase('Processing:', arr)
 *   }),
 *   (arr: number[]) => arr.filter(n => n > 1),
 *   asyncTap(async arr => {
 *     await saveToCache('filtered', arr)
 *   }),
 *   (arr: number[]) => arr.length
 * ) // Returns: Promise<2>
 * ```
 */
export function asyncTap<T>(fn: (value: T) => void | Promise<void>): AsyncUnaryFunction<T, T> {
  return async (value: T): Promise<T> => {
    await Promise.resolve(fn(value))
    return value
  }
}

/**
 * Creates async pipelines with enhanced error handling and cancellation support.
 * Provides foundation for complex async operations in future VBS features.
 */
export interface AsyncPipelineConfig<TInput, TOutput> {
  /** Array of async transformation steps */
  steps: MixedUnaryFunction<any, any>[]
  /** Input validation function */
  validate?: (input: TInput) => boolean | Promise<boolean>
  /** Completion callback */
  onComplete?: (output: TOutput) => void | Promise<void>
  /** Error handler */
  onError?: (error: Error, input: TInput) => void | Promise<void>
  /** Timeout in milliseconds for the entire pipeline */
  timeout?: number
  /** AbortSignal for cancellation support */
  signal?: AbortSignal
}

/**
 * Creates an async pipeline with timeout and cancellation support.
 * Designed for complex async operations like IndexedDB transactions and API calls.
 *
 * @param config - Async pipeline configuration
 * @returns Async pipeline function with enhanced error handling
 *
 * @example
 * ```typescript
 * const controller = new AbortController()
 * const asyncPipeline = createAsyncPipeline<string, number>({
 *   steps: [
 *     (s: string) => s.trim(),
 *     async (s: string) => await fetchDataFromAPI(s),
 *     async (data: any) => await saveToIndexedDB(data),
 *     (data: any) => data.id
 *   ],
 *   timeout: 5000,
 *   signal: controller.signal,
 *   onError: async (error) => await logErrorToService(error)
 * })
 *
 * const result = await asyncPipeline('user-input')
 * ```
 */
export function createAsyncPipeline<TInput, TOutput>(
  config: AsyncPipelineConfig<TInput, TOutput>,
): AsyncUnaryFunction<TInput, TOutput> {
  return async (input: TInput): Promise<TOutput> => {
    // Check for cancellation
    if (config.signal?.aborted) {
      throw new Error('Pipeline was cancelled')
    }

    try {
      // Create timeout promise if timeout is specified
      const timeoutPromise = config.timeout
        ? new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Pipeline timeout')), config.timeout)
          })
        : null

      // Create cancellation promise if signal is provided
      const cancellationPromise = config.signal
        ? new Promise<never>((_, reject) => {
            const signal = config.signal
            if (signal) {
              signal.addEventListener('abort', () => reject(new Error('Pipeline cancelled')))
            }
          })
        : null

      // Create the main pipeline execution promise
      const pipelinePromise = (async () => {
        // Validate input if validator provided
        if (config.validate) {
          const isValid = await Promise.resolve(config.validate(input))
          if (!isValid) {
            throw new Error('Async pipeline input validation failed')
          }
        }

        // Apply all transformation steps
        let result: any = input
        for (const step of config.steps) {
          result = await Promise.resolve(step(result))
        }

        // Execute completion callback if provided
        if (config.onComplete) {
          await Promise.resolve(config.onComplete(result))
        }

        return result as TOutput
      })()

      // Race between pipeline, timeout, and cancellation
      const promises = [pipelinePromise]
      if (timeoutPromise) promises.push(timeoutPromise)
      if (cancellationPromise) promises.push(cancellationPromise)

      return await Promise.race(promises)
    } catch (error) {
      const err = error as Error

      // Handle errors if error handler provided
      if (config.onError) {
        await Promise.resolve(config.onError(err, input))
      }
      throw err
    }
  }
}

/**
 * Utility for batch processing with async composition.
 * Processes arrays of items through async pipelines with concurrency control.
 *
 * @param items - Array of items to process
 * @param pipeline - Async pipeline function to apply to each item
 * @param options - Batch processing options
 * @param options.concurrency - Maximum number of concurrent operations
 * @param options.onProgress - Progress callback function
 * @param options.onError - Error handling callback function
 * @returns Promise resolving to array of processed results
 *
 * @example
 * ```typescript
 * const items = ['item1', 'item2', 'item3']
 * const pipeline = createAsyncPipeline({
 *   steps: [
 *     async (item: string) => await processItem(item),
 *     async (result: any) => await validateResult(result)
 *   ]
 * })
 *
 * const results = await asyncBatchProcess(items, pipeline, {
 *   concurrency: 3,
 *   onProgress: (completed, total) => console.log(`${completed}/${total}`)
 * })
 * ```
 */
export async function asyncBatchProcess<TInput, TOutput>(
  items: TInput[],
  pipeline: AsyncUnaryFunction<TInput, TOutput>,
  options: {
    concurrency?: number
    onProgress?: (completed: number, total: number) => void
    onError?: (error: Error, item: TInput, index: number) => void
  } = {},
): Promise<TOutput[]> {
  const {concurrency = 3, onProgress, onError} = options
  const results: TOutput[] = []
  let completed = 0

  // Process items in batches with controlled concurrency
  const processBatch = async (batch: {item: TInput; index: number}[]): Promise<void> => {
    const promises = batch.map(async ({item, index}) => {
      try {
        const result = await pipeline(item)
        results[index] = result
        completed++
        if (onProgress) {
          onProgress(completed, items.length)
        }
      } catch (error) {
        if (onError) {
          onError(error as Error, item, index)
        }
        throw error
      }
    })

    await Promise.all(promises)
  }

  // Split items into batches
  const batches: {item: TInput; index: number}[][] = []
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items
      .slice(i, i + concurrency)
      .map((item, batchIndex) => ({item, index: i + batchIndex}))
    batches.push(batch)
  }

  // Process all batches sequentially (but items within each batch concurrently)
  for (const batch of batches) {
    await processBatch(batch)
  }

  return results
}

// ============================================================================
// ERROR HANDLING COMPOSITION UTILITIES (PHASE 4 - TASK-020)
// ============================================================================

/**
 * Error handling strategy types for composition utilities
 */
export type ErrorHandlingStrategy = 'throw' | 'return' | 'ignore' | 'retry'

/**
 * Configuration for error handling in composition utilities
 */
export interface ErrorHandlingConfig<TInput, TOutput> {
  /** Strategy to use when error occurs */
  strategy: ErrorHandlingStrategy
  /** Fallback value to return on error (for 'return' strategy) */
  fallback?: TOutput
  /** Maximum retry attempts (for 'retry' strategy) */
  maxRetries?: number
  /** Delay between retries in milliseconds */
  retryDelay?: number
  /** Custom error handler function */
  onError?: (error: Error, input: TInput, attempt?: number) => void
  /** Predicate to determine if error should be handled */
  shouldHandle?: (error: Error) => boolean
}

/**
 * Wraps a function with try-catch error handling and recovery strategies.
 * Provides robust error management for composition pipelines.
 *
 * @param fn - Function to wrap with error handling
 * @param config - Error handling configuration
 * @returns Function with error handling applied
 *
 * @example
 * ```typescript
 * const safeParseJson = tryCatch(
 *   (jsonString: string) => JSON.parse(jsonString),
 *   {
 *     strategy: 'return',
 *     fallback: {},
 *     onError: (error) => console.warn('JSON parse failed:', error)
 *   }
 * )
 *
 * const result = safeParseJson('invalid json') // Returns: {}
 * ```
 */
export function tryCatch<TInput, TOutput>(
  fn: UnaryFunction<TInput, TOutput>,
  config: ErrorHandlingConfig<TInput, TOutput>,
): UnaryFunction<TInput, TOutput | undefined> {
  return (input: TInput): TOutput | undefined => {
    const attemptExecution = (attempt = 1): TOutput | undefined => {
      try {
        return fn(input)
      } catch (error) {
        const err = error as Error

        // Check if error should be handled
        if (config.shouldHandle && !config.shouldHandle(err)) {
          throw err
        }

        // Execute error callback if provided
        if (config.onError) {
          config.onError(err, input, attempt)
        }

        // Handle based on strategy
        switch (config.strategy) {
          case 'throw':
            throw err

          case 'return':
            return config.fallback

          case 'ignore':
            return undefined

          case 'retry': {
            const maxRetries = config.maxRetries ?? 3
            if (attempt < maxRetries) {
              // Add delay if specified
              if (config.retryDelay) {
                // Note: This is a synchronous implementation
                // For async retry with delay, use asyncTryCatch
                const start = Date.now()
                while (Date.now() - start < config.retryDelay) {
                  // Busy wait (not ideal, but synchronous)
                }
              }
              return attemptExecution(attempt + 1)
            }
            return config.fallback
          }

          default:
            throw err
        }
      }
    }

    return attemptExecution()
  }
}

/**
 * Async version of tryCatch with proper delay support for retries.
 * Provides comprehensive error handling for async composition pipelines.
 *
 * @param fn - Async function to wrap with error handling
 * @param config - Error handling configuration
 * @returns Async function with error handling applied
 *
 * @example
 * ```typescript
 * const safeFetch = asyncTryCatch(
 *   async (url: string) => {
 *     const response = await fetch(url)
 *     if (!response.ok) throw new Error('Network error')
 *     return response.json()
 *   },
 *   {
 *     strategy: 'retry',
 *     maxRetries: 3,
 *     retryDelay: 1000,
 *     fallback: null,
 *     onError: (error, url, attempt) =>
 *       console.log(`Fetch failed for ${url}, attempt ${attempt}: ${error.message}`)
 *   }
 * )
 *
 * const data = await safeFetch('/api/data')
 * ```
 */
export function asyncTryCatch<TInput, TOutput>(
  fn: AsyncUnaryFunction<TInput, TOutput>,
  config: ErrorHandlingConfig<TInput, TOutput>,
): AsyncUnaryFunction<TInput, TOutput | undefined> {
  return async (input: TInput): Promise<TOutput | undefined> => {
    const attemptExecution = async (attempt = 1): Promise<TOutput | undefined> => {
      try {
        return await fn(input)
      } catch (error) {
        const err = error as Error

        // Check if error should be handled
        if (config.shouldHandle && !config.shouldHandle(err)) {
          throw err
        }

        // Execute error callback if provided
        if (config.onError) {
          config.onError(err, input, attempt)
        }

        // Handle based on strategy
        switch (config.strategy) {
          case 'throw':
            throw err

          case 'return':
            return config.fallback

          case 'ignore':
            return undefined

          case 'retry': {
            const maxRetries = config.maxRetries ?? 3
            if (attempt < maxRetries) {
              // Add async delay if specified
              if (config.retryDelay) {
                await new Promise(resolve => setTimeout(resolve, config.retryDelay))
              }
              return attemptExecution(attempt + 1)
            }
            return config.fallback
          }

          default:
            throw err
        }
      }
    }

    return attemptExecution()
  }
}

/**
 * Creates a recovery function that attempts multiple fallback strategies.
 * Useful for creating resilient data loading and processing pipelines.
 *
 * @param strategies - Array of recovery functions to try in order
 * @returns Function that attempts each recovery strategy until one succeeds
 *
 * @example
 * ```typescript
 * const recoverData = recover([
 *   // Try cache first
 *   async (key: string) => await loadFromCache(key),
 *   // Try backup API
 *   async (key: string) => await loadFromBackupAPI(key),
 *   // Use hardcoded fallback
 *   (key: string) => getDefaultData(key)
 * ])
 *
 * const data = await recoverData('user-preferences')
 * ```
 */
export function recover<TInput, TOutput>(
  strategies: MixedUnaryFunction<TInput, TOutput>[],
): AsyncUnaryFunction<TInput, TOutput> {
  return async (input: TInput): Promise<TOutput> => {
    const errors: Error[] = []

    for (const strategy of strategies) {
      try {
        if (strategy) {
          return await Promise.resolve(strategy(input))
        }
      } catch (error) {
        errors.push(error as Error)
        // Continue to next strategy
      }
    }

    // If all strategies failed, throw combined error
    const combinedMessage = errors.map((err, i) => `Strategy ${i + 1}: ${err.message}`).join('; ')
    throw new Error(`All recovery strategies failed: ${combinedMessage}`)
  }
}

/**
 * Creates a circuit breaker pattern for composition utilities.
 * Prevents cascading failures by temporarily disabling failing operations.
 *
 * @param fn - Function to protect with circuit breaker
 * @param config - Circuit breaker configuration
 * @param config.failureThreshold - Number of failures before opening circuit
 * @param config.recoveryTimeout - Time to wait before attempting recovery (ms)
 * @param config.onStateChange - Callback for circuit state changes
 * @returns Function with circuit breaker protection
 *
 * @example
 * ```typescript
 * const protectedAPI = circuitBreaker(
 *   async (data: any) => await callExternalAPI(data),
 *   {
 *     failureThreshold: 5,
 *     recoveryTimeout: 30000,
 *     onStateChange: (state) => console.log(`Circuit breaker: ${state}`)
 *   }
 * )
 * ```
 */
export function circuitBreaker<TInput, TOutput>(
  fn: AsyncUnaryFunction<TInput, TOutput>,
  config: {
    failureThreshold: number
    recoveryTimeout: number
    onStateChange?: (state: 'closed' | 'open' | 'half-open') => void
  },
): AsyncUnaryFunction<TInput, TOutput> {
  let state: 'closed' | 'open' | 'half-open' = 'closed'
  let failureCount = 0
  let lastFailureTime = 0

  return async (input: TInput): Promise<TOutput> => {
    const now = Date.now()

    // Check if circuit should transition from open to half-open
    if (state === 'open' && now - lastFailureTime > config.recoveryTimeout) {
      state = 'half-open'
      if (config.onStateChange) {
        config.onStateChange(state)
      }
    }

    // If circuit is open, fail fast
    if (state === 'open') {
      throw new Error('Circuit breaker is open')
    }

    try {
      const result = await fn(input)

      // If successful and was half-open, close the circuit
      if (state === 'half-open') {
        state = 'closed'
        failureCount = 0
        if (config.onStateChange) {
          config.onStateChange(state)
        }
      }

      return result
    } catch (error) {
      failureCount++
      lastFailureTime = now

      // If failure threshold reached, open the circuit
      if (failureCount >= config.failureThreshold) {
        state = 'open'
        if (config.onStateChange) {
          config.onStateChange(state)
        }
      }

      throw error
    }
  }
}

/**
 * Wraps composition pipelines with comprehensive error boundaries.
 * Provides logging, recovery, and graceful degradation for complex pipelines.
 *
 * @param pipeline - Pipeline function to protect
 * @param config - Error boundary configuration
 * @param config.fallback - Fallback function for error recovery
 * @param config.onError - Error handling callback
 * @param config.enableRecovery - Whether to enable retry mechanism
 * @param config.maxRetries - Maximum number of retry attempts
 * @param config.retryDelay - Delay between retries in milliseconds
 * @returns Protected pipeline with error boundary
 *
 * @example
 * ```typescript
 * const protectedPipeline = withErrorBoundary(
 *   createAsyncPipeline({
 *     steps: [step1, step2, step3]
 *   }),
 *   {
 *     fallback: (input) => getDefaultResult(input),
 *     onError: async (error, input) => {
 *       await logErrorToService(error, input)
 *       await notifyAdministrators(error)
 *     },
 *     enableRecovery: true
 *   }
 * )
 * ```
 */
export function withErrorBoundary<TInput, TOutput>(
  pipeline: AsyncUnaryFunction<TInput, TOutput>,
  config: {
    fallback?: (input: TInput) => TOutput | Promise<TOutput>
    onError?: (error: Error, input: TInput) => void | Promise<void>
    enableRecovery?: boolean
    maxRetries?: number
    retryDelay?: number
  },
): AsyncUnaryFunction<TInput, TOutput> {
  return async (input: TInput): Promise<TOutput> => {
    const attemptPipeline = async (attempt = 1): Promise<TOutput> => {
      try {
        return await pipeline(input)
      } catch (error) {
        const err = error as Error

        // Log error if handler provided
        if (config.onError) {
          await Promise.resolve(config.onError(err, input))
        }

        // Try recovery if enabled
        if (config.enableRecovery && attempt < (config.maxRetries ?? 1)) {
          if (config.retryDelay) {
            await new Promise(resolve => setTimeout(resolve, config.retryDelay))
          }
          return attemptPipeline(attempt + 1)
        }

        // Use fallback if provided
        if (config.fallback) {
          return await Promise.resolve(config.fallback(input))
        }

        // Re-throw if no recovery options
        throw err
      }
    }

    return attemptPipeline()
  }
}
