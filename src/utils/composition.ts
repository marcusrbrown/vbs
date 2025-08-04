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

import type {
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
