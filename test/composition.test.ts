import type {
  EventPipelineConfig,
  FilterState,
  PipelineConfig,
  ProgressPipelineConfig,
  SearchPipelineConfig,
  StarTrekEra,
  StarTrekItem,
} from '../src/modules/types.js'

import {describe, expect, it, vi} from 'vitest'
import {
  asyncCompose,
  asyncPipe,
  asyncTap,
  compose,
  compositionErrorBoundary,
  conditionalTap,
  createDebugPipe,
  createEventPipeline,
  createPipeline,
  createPipelineInspector,
  createProgressPipeline,
  createSearchPipeline,
  curry,
  debugTap,
  perfTap,
  pipe,
  recover,
  starTrekPredicates,
  starTrekTransformations,
  tap,
  tryCatch,
} from '../src/utils/composition.js'

describe('Functional Composition Utilities', () => {
  describe('pipe function', () => {
    it('should return original value when no functions provided', () => {
      const value = 'test'
      const result = pipe(value)
      expect(result).toBe(value)
    })

    it('should apply single function correctly', () => {
      const result = pipe('hello', (s: string) => s.toUpperCase())
      expect(result).toBe('HELLO')
    })

    it('should chain multiple functions left to right', () => {
      const result = pipe(
        'hello',
        (s: string) => s.toUpperCase(),
        (s: string) => `${s}!`,
        (s: string) => s.length,
      )
      expect(result).toBe(6)
    })

    it('should maintain type safety through transformation chain', () => {
      const result = pipe(
        [1, 2, 3, 4, 5],
        (arr: number[]) => arr.filter(n => n > 2),
        (arr: number[]) => arr.map(n => n * 2),
        (arr: number[]) => arr.reduce((sum, n) => sum + n, 0),
      )
      expect(result).toBe(24) // [3, 4, 5] -> [6, 8, 10] -> 24
    })

    it('should work with complex data transformations', () => {
      interface User {
        name: string
        age: number
        active: boolean
      }

      const users: User[] = [
        {name: 'Alice', age: 25, active: true},
        {name: 'Bob', age: 30, active: false},
        {name: 'Charlie', age: 35, active: true},
      ]

      const result = pipe(
        users,
        (users: User[]) => users.filter(u => u.active),
        (users: User[]) => users.map(u => u.name),
        (names: string[]) => names.join(', '),
      )

      expect(result).toBe('Alice, Charlie')
    })
  })

  describe('compose function', () => {
    it('should apply single function correctly', () => {
      const fn = compose((s: string) => s.toUpperCase())
      const result = fn('hello')
      expect(result).toBe('HELLO')
    })

    it('should compose multiple functions right to left', () => {
      const fn = compose(
        (n: number) => n * 2,
        (s: string) => s.length,
        (s: string) => s.toUpperCase(),
      )
      const result = fn('hello')
      expect(result).toBe(10) // 'hello' -> 'HELLO' -> 5 -> 10
    })

    it('should follow mathematical composition semantics', () => {
      const addOne = (n: number) => n + 1
      const multiplyTwo = (n: number) => n * 2
      const square = (n: number) => n * n

      // f(g(h(x))) where f=square, g=multiplyTwo, h=addOne
      const composed = compose(square, multiplyTwo, addOne)
      const result = composed(3)

      // 3 -> 4 -> 8 -> 64
      expect(result).toBe(64)
    })

    it('should maintain type safety in composition', () => {
      interface Product {
        name: string
        price: number
      }

      const products: Product[] = [
        {name: 'Apple', price: 1.5},
        {name: 'Banana', price: 0.8},
      ]

      const totalPrice = compose(
        (sum: number) => `$${sum.toFixed(2)}`,
        (products: Product[]) => products.reduce((sum, p) => sum + p.price, 0),
      )

      const result = totalPrice(products)
      expect(result).toBe('$2.30')
    })
  })

  describe('curry function', () => {
    it('should curry a simple binary function', () => {
      const add = (a: number, b: number) => a + b
      const curriedAdd = curry(add)

      expect(curriedAdd(5)(3)).toBe(8)
    })

    it('should support partial application', () => {
      const add = (a: number, b: number, c: number) => a + b + c
      const curriedAdd = curry(add)

      const add10 = curriedAdd(10)
      const add10and5 = add10(5)
      const result = add10and5(3)

      expect(result).toBe(18)
    })

    it('should work with all arguments at once', () => {
      const multiply = (a: number, b: number, c: number) => a * b * c
      const curriedMultiply = curry(multiply)

      // When all arguments are provided, curry should call the function directly
      const result = curriedMultiply(2)(3)(4)
      expect(result).toBe(24)
    })

    it('should support custom arity', () => {
      const variadicSum = (...nums: number[]) => nums.reduce((sum, n) => sum + n, 0)
      const curriedSum = curry(variadicSum, 3)

      const result = curriedSum(1)(2)(3)
      expect(result).toBe(6)
    })

    it('should create reusable predicates', () => {
      const hasProperty = curry((key: string, value: any, obj: any) => obj[key] === value)

      const isActive = hasProperty('active')(true)

      const user1 = {name: 'Alice', active: true}
      const user2 = {name: 'Bob', active: false}

      expect(isActive(user1)).toBe(true)
      expect(isActive(user2)).toBe(false)
    })

    it('should work in filter operations', () => {
      const greaterThan = curry((threshold: number, value: number) => value > threshold)
      const numbers = [1, 5, 10, 15, 20]

      const result = numbers.filter(greaterThan(10))
      expect(result).toEqual([15, 20])
    })
  })

  describe('tap function', () => {
    it('should execute side effect and return original value', () => {
      const sideEffect = vi.fn()
      const tapFn = tap(sideEffect)

      const result = tapFn('test')

      expect(sideEffect).toHaveBeenCalledWith('test')
      expect(result).toBe('test')
    })

    it('should work in pipe chains for debugging', () => {
      const logs: string[] = []
      const log = (message: string) => (value: any) =>
        logs.push(`${message}: ${JSON.stringify(value)}`)

      const result = pipe(
        [1, 2, 3, 4, 5],
        tap(log('Initial')),
        (arr: number[]) => arr.filter(n => n > 2),
        tap(log('After filter')),
        (arr: number[]) => arr.map(n => n * 2),
        tap(log('After map')),
        (arr: number[]) => arr.reduce((sum, n) => sum + n, 0),
      )

      expect(result).toBe(24)
      expect(logs).toEqual(['Initial: [1,2,3,4,5]', 'After filter: [3,4,5]', 'After map: [6,8,10]'])
    })

    it('should not affect type flow in pipelines', () => {
      const sideEffect = vi.fn()

      const result = pipe(
        'hello',
        tap(sideEffect),
        (s: string) => s.toUpperCase(),
        tap(sideEffect),
        (s: string) => s.length,
      )

      expect(result).toBe(5)
      expect(sideEffect).toHaveBeenCalledTimes(2)
      expect(sideEffect).toHaveBeenNthCalledWith(1, 'hello')
      expect(sideEffect).toHaveBeenNthCalledWith(2, 'HELLO')
    })

    it('should handle complex objects in side effects', () => {
      interface ProcessingState {
        data: number[]
        step: string
      }

      const states: ProcessingState[] = []
      const trackState = tap((state: ProcessingState) => states.push({...state}))

      const result = pipe(
        {data: [1, 2, 3], step: 'initial'},
        trackState,
        (state: ProcessingState) => ({...state, data: state.data.map(n => n * 2), step: 'doubled'}),
        trackState,
        (state: ProcessingState) => ({
          ...state,
          data: state.data.filter(n => n > 2),
          step: 'filtered',
        }),
        trackState,
        (state: ProcessingState) => state.data.length,
      )

      expect(result).toBe(2)
      expect(states).toHaveLength(3)
      expect(states[0]).toEqual({data: [1, 2, 3], step: 'initial'})
      expect(states[1]).toEqual({data: [2, 4, 6], step: 'doubled'})
      expect(states[2]).toEqual({data: [4, 6], step: 'filtered'})
    })
  })

  describe('integration with VBS patterns', () => {
    it('should work with Star Trek data filtering patterns', () => {
      interface StarTrekItem {
        id: string
        title: string
        type: string
        year: string
      }

      const items: StarTrekItem[] = [
        {id: 'tos_s1', title: 'The Original Series S1', type: 'series', year: '1966'},
        {id: 'tmp', title: 'The Motion Picture', type: 'movie', year: '1979'},
        {id: 'tng_s1', title: 'The Next Generation S1', type: 'series', year: '1987'},
      ]

      const isType = curry((type: string, item: StarTrekItem) => item.type === type)
      const extractTitles = (items: StarTrekItem[]) => items.map(item => item.title)

      const seriesTitles = pipe(
        items,
        (items: StarTrekItem[]) => items.filter(isType('series')),
        extractTitles,
      )

      expect(seriesTitles).toEqual(['The Original Series S1', 'The Next Generation S1'])
    })

    it('should work with progress calculation patterns', () => {
      const watchedItems = ['tos_s1', 'tmp']
      const allItems = ['tos_s1', 'tmp', 'tng_s1', 'ds9_s1']

      const calculateProgress = pipe(
        allItems,
        (items: string[]) => items.filter(id => watchedItems.includes(id)),
        (watched: string[]) => watched.length,
        (watchedCount: number) => (watchedCount / allItems.length) * 100,
        (percentage: number) => Math.round(percentage),
      )

      expect(calculateProgress).toBe(50)
    })

    it('should compose with EventEmitter patterns', () => {
      interface ProgressEvent {
        itemId: string
        isWatched: boolean
        totalProgress: number
      }

      const events: ProgressEvent[] = []
      const emitProgress = tap((event: ProgressEvent) => events.push(event))

      const processProgressUpdate = compose(
        emitProgress,
        (data: {itemId: string; isWatched: boolean; total: number}): ProgressEvent => ({
          itemId: data.itemId,
          isWatched: data.isWatched,
          totalProgress: data.total,
        }),
      )

      const result = processProgressUpdate({itemId: 'tos_s1', isWatched: true, total: 75})

      expect(result.itemId).toBe('tos_s1')
      expect(result.isWatched).toBe(true)
      expect(result.totalProgress).toBe(75)
      expect(events).toHaveLength(1)
      expect(events[0]).toEqual(result)
    })
  })

  describe('type safety and edge cases', () => {
    it('should handle empty arrays in transformations', () => {
      const result = pipe(
        [] as number[],
        (arr: number[]) => arr.filter(n => n > 0),
        (arr: number[]) => arr.map(n => n * 2),
        (arr: number[]) => arr.length,
      )

      expect(result).toBe(0)
    })

    it('should handle null and undefined values safely', () => {
      const safeLength = (str: string | null | undefined): number => str?.length ?? 0

      const result = pipe(null as string | null, safeLength, (len: number) => len * 2)

      expect(result).toBe(0)
    })

    it('should maintain immutability in transformations', () => {
      const originalArray = [1, 2, 3]
      const result = pipe(
        originalArray,
        (arr: number[]) => [...arr, 4], // Create new array
        (arr: number[]) => arr.map(n => n * 2), // Create new array
      )

      expect(originalArray).toEqual([1, 2, 3]) // Original unchanged
      expect(result).toEqual([2, 4, 6, 8])
    })
  })
})

describe('Pipeline Creation Utilities', () => {
  describe('createPipeline function', () => {
    it('should create a basic pipeline with validation and steps', () => {
      const config: PipelineConfig<string, number> = {
        validate: (input: string) => typeof input === 'string' && input.length > 0,
        steps: [(s: string) => s.trim(), (s: string) => s.length, (n: number) => n * 2],
      }

      const pipeline = createPipeline(config)
      const result = pipeline('  hello  ')

      expect(result).toBe(10) // 'hello'.length * 2
    })

    it('should handle validation failure', () => {
      const config: PipelineConfig<string, number> = {
        validate: (input: string) => input.length > 5,
        steps: [(s: string) => s.length],
      }

      const pipeline = createPipeline(config)

      expect(() => pipeline('hi')).toThrow('Pipeline input validation failed')
    })

    it('should execute completion callback', () => {
      const onComplete = vi.fn()
      const config: PipelineConfig<string, number> = {
        steps: [(s: string) => s.length],
        onComplete,
      }

      const pipeline = createPipeline(config)
      const result = pipeline('test')

      expect(result).toBe(4)
      expect(onComplete).toHaveBeenCalledWith(4)
    })

    it('should handle errors with error callback', () => {
      const onError = vi.fn()
      const config: PipelineConfig<string, number> = {
        steps: [
          (_: string) => {
            throw new Error('Test error')
          },
        ],
        onError,
      }

      const pipeline = createPipeline(config)

      expect(() => pipeline('test')).toThrow('Test error')
      expect(onError).toHaveBeenCalledWith(expect.any(Error), 'test')
    })
  })

  describe('createSearchPipeline function', () => {
    const mockEras: StarTrekEra[] = [
      {
        id: 'tos',
        title: 'The Original Series Era',
        years: '1966-1979',
        stardates: '1312.4-7410.2',
        description: 'The original Star Trek era',
        items: [
          {
            id: 'tos_s1',
            title: 'The Original Series S1',
            type: 'series',
            year: '1966-1967',
            stardate: '1312.4-3087.6',
            notes: 'Classic Trek',
          },
          {
            id: 'tmp',
            title: 'The Motion Picture',
            type: 'movie',
            year: '1979',
            stardate: '7410.2',
            notes: 'First Trek movie',
          },
        ],
      },
      {
        id: 'tng',
        title: 'The Next Generation Era',
        years: '1987-1994',
        stardates: '41153.7-47988.0',
        description: 'The Next Generation era',
        items: [
          {
            id: 'tng_s1',
            title: 'The Next Generation S1',
            type: 'series',
            year: '1987-1988',
            stardate: '41153.7-41986.0',
            notes: 'New crew',
          },
        ],
      },
    ]

    it('should create a search pipeline that filters by search term', () => {
      const pipeline = createSearchPipeline(mockEras)
      const filterState: FilterState = {search: 'original', filter: ''}

      const result = pipeline(filterState)

      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('tos')
      expect(result[0]?.items).toHaveLength(1)
      expect(result[0]?.items?.[0]?.id).toBe('tos_s1')
    })

    it('should filter by content type', () => {
      const pipeline = createSearchPipeline(mockEras)
      const filterState: FilterState = {search: '', filter: 'movie'}

      const result = pipeline(filterState)

      expect(result).toHaveLength(1)
      expect(result[0]?.items).toHaveLength(1)
      expect(result[0]?.items?.[0]?.type).toBe('movie')
    })

    it('should combine search and filter criteria', () => {
      const pipeline = createSearchPipeline(mockEras)
      const filterState: FilterState = {search: 'motion', filter: 'movie'}

      const result = pipeline(filterState)

      expect(result).toHaveLength(1)
      expect(result[0]?.items).toHaveLength(1)
      expect(result[0]?.items?.[0]?.id).toBe('tmp')
    })

    it('should execute filter complete callback', () => {
      const onFilterComplete = vi.fn()
      const config: SearchPipelineConfig = {onFilterComplete}
      const pipeline = createSearchPipeline(mockEras, config)
      const filterState: FilterState = {search: 'original', filter: ''}

      const result = pipeline(filterState)

      expect(onFilterComplete).toHaveBeenCalledWith(result, expect.any(Object))
    })

    it('should return empty array when no matches found', () => {
      const pipeline = createSearchPipeline(mockEras)
      const filterState: FilterState = {search: 'nonexistent', filter: ''}

      const result = pipeline(filterState)

      expect(result).toHaveLength(0)
    })
  })

  describe('createProgressPipeline function', () => {
    const mockEras: StarTrekEra[] = [
      {
        id: 'tos',
        title: 'TOS Era',
        years: '1966-1979',
        stardates: '1312.4-7410.2',
        description: 'The original era',
        items: [
          {
            id: 'tos_s1',
            title: 'TOS S1',
            type: 'series',
            year: '1966',
            stardate: '1312.4',
            notes: '',
          },
          {
            id: 'tos_s2',
            title: 'TOS S2',
            type: 'series',
            year: '1967',
            stardate: '2000.0',
            notes: '',
          },
          {
            id: 'tmp',
            title: 'Motion Picture',
            type: 'movie',
            year: '1979',
            stardate: '7410.2',
            notes: '',
          },
        ],
      },
      {
        id: 'tng',
        title: 'TNG Era',
        years: '1987-1994',
        stardates: '41153.7-47988.0',
        description: 'The Next Generation era',
        items: [
          {
            id: 'tng_s1',
            title: 'TNG S1',
            type: 'series',
            year: '1987',
            stardate: '41153.7',
            notes: '',
          },
          {
            id: 'tng_s2',
            title: 'TNG S2',
            type: 'series',
            year: '1988',
            stardate: '42073.1',
            notes: '',
          },
        ],
      },
    ]

    it('should calculate progress for watched items', () => {
      const pipeline = createProgressPipeline(mockEras)
      const watchedItems = ['tos_s1', 'tmp', 'tng_s1']

      const result = pipeline(watchedItems)

      expect(result.overall.total).toBe(5)
      expect(result.overall.completed).toBe(3)
      expect(result.overall.percentage).toBe(60)
      expect(result.eraProgress).toHaveLength(2)
    })

    it('should calculate era-specific progress', () => {
      const pipeline = createProgressPipeline(mockEras)
      const watchedItems = ['tos_s1', 'tos_s2'] // Only TOS items

      const result = pipeline(watchedItems)

      const tosProgress = result.eraProgress.find(era => era.eraId === 'tos')
      const tngProgress = result.eraProgress.find(era => era.eraId === 'tng')

      expect(tosProgress?.percentage).toBe(67) // 2 out of 3 items
      expect(tngProgress?.percentage).toBe(0) // 0 out of 2 items
    })

    it('should handle empty watched items', () => {
      const pipeline = createProgressPipeline(mockEras)
      const watchedItems: string[] = []

      const result = pipeline(watchedItems)

      expect(result.overall.completed).toBe(0)
      expect(result.overall.percentage).toBe(0)
      expect(result.eraProgress.every(era => era.percentage === 0)).toBe(true)
    })

    it('should execute progress update callback', () => {
      const onProgressUpdate = vi.fn()
      const config: ProgressPipelineConfig = {onProgressUpdate}
      const pipeline = createProgressPipeline(mockEras, config)
      const watchedItems = ['tos_s1']

      const result = pipeline(watchedItems)

      expect(onProgressUpdate).toHaveBeenCalledWith(result)
    })

    it('should validate watched items if validator provided', () => {
      const validateWatchedItems = vi.fn(() => false)
      const config: ProgressPipelineConfig = {validateWatchedItems}
      const pipeline = createProgressPipeline(mockEras, config)

      expect(() => pipeline(['tos_s1'])).toThrow('Pipeline input validation failed')
      expect(validateWatchedItems).toHaveBeenCalledWith(['tos_s1'])
    })
  })

  describe('createEventPipeline function', () => {
    it('should create an event processing pipeline', () => {
      const onStateUpdate = vi.fn()
      const onDOMUpdate = vi.fn()

      const config: EventPipelineConfig<MouseEvent> = {
        eventExtractor: (event: MouseEvent) => ({
          type: 'click',
          target: event.target,
          timestamp: Date.now(),
        }),
        onStateUpdate,
        onDOMUpdate,
      }

      const pipeline = createEventPipeline(config)
      const mockEvent = {
        target: document.createElement('button'),
        type: 'click',
      } as unknown as MouseEvent

      const result = pipeline(mockEvent)

      expect(result.type).toBe('click')
      expect(onStateUpdate).toHaveBeenCalled()
    })

    it('should validate events if validator provided', () => {
      const validateEvent = vi.fn(() => false)

      const config: EventPipelineConfig<MouseEvent> = {
        validateEvent,
        eventExtractor: (event: MouseEvent) => event,
      }

      const pipeline = createEventPipeline(config)
      const mockEvent = {} as MouseEvent

      expect(() => pipeline(mockEvent)).toThrow('Pipeline input validation failed')
      expect(validateEvent).toHaveBeenCalledWith(mockEvent)
    })

    it('should handle DOM updates when element provided', () => {
      const element = document.createElement('div')
      const onDOMUpdate = vi.fn()

      const config: EventPipelineConfig<MouseEvent> = {
        eventExtractor: (_event: MouseEvent) => ({element, data: 'test'}),
        onDOMUpdate,
      }

      const pipeline = createEventPipeline(config)
      const mockEvent = {} as MouseEvent

      pipeline(mockEvent)

      expect(onDOMUpdate).toHaveBeenCalledWith(element, {element, data: 'test'})
    })
  })
})

describe('Star Trek Predicates and Transformations', () => {
  const mockItems: StarTrekItem[] = [
    {
      id: 'tos_s1',
      title: 'The Original Series S1',
      type: 'series',
      year: '1966-1967',
      stardate: '1312.4-3087.6',
      episodes: 29,
      notes: '',
    },
    {
      id: 'tmp',
      title: 'The Motion Picture',
      type: 'movie',
      year: '1979',
      stardate: '7410.2',
      notes: '',
    },
    {
      id: 'tng_s1',
      title: 'The Next Generation S1',
      type: 'series',
      year: '1987-1988',
      stardate: '41153.7-41986.0',
      episodes: 26,
      notes: '',
    },
    {
      id: 'tas_s1',
      title: 'The Animated Series S1',
      type: 'animated',
      year: '1973-1974',
      stardate: '5373.4-6063.4',
      episodes: 16,
      notes: '',
    },
  ]

  describe('starTrekPredicates', () => {
    it('should filter by type correctly', () => {
      const isMovie = starTrekPredicates.byType('movie')
      const isSeries = starTrekPredicates.byType('series')

      const movies = mockItems.filter(isMovie)
      const series = mockItems.filter(isSeries)

      expect(movies).toHaveLength(1)
      expect(movies).toHaveLength(1)
      expect(movies[0]?.id).toBe('tmp')
      expect(series).toHaveLength(2)
      expect(series.map(s => s.id)).toEqual(['tos_s1', 'tng_s1'])
    })

    it('should filter by year correctly', () => {
      const from1960s = starTrekPredicates.byYear('196')
      const from1980s = starTrekPredicates.byYear('198')

      const sixties = mockItems.filter(from1960s)
      const eighties = mockItems.filter(from1980s)

      expect(sixties).toHaveLength(1)
      expect(sixties[0]?.id).toBe('tos_s1')
      expect(eighties).toHaveLength(1)
      expect(eighties[0]?.id).toBe('tng_s1')
    })

    it('should filter by text search correctly', () => {
      const hasOriginal = starTrekPredicates.byText('original')
      const hasMotion = starTrekPredicates.byText('Motion')

      const originalItems = mockItems.filter(hasOriginal)
      const motionItems = mockItems.filter(hasMotion)

      expect(originalItems).toHaveLength(1)
      expect(originalItems[0]?.id).toBe('tos_s1')
      expect(motionItems).toHaveLength(1)
      expect(motionItems[0]?.id).toBe('tmp')
    })

    it('should filter by episode count correctly', () => {
      const longSeries = starTrekPredicates.byEpisodeCount(25, undefined)
      const shortSeries = starTrekPredicates.byEpisodeCount(10, 20)

      const longShows = mockItems.filter(longSeries)
      const shortShows = mockItems.filter(shortSeries)

      expect(longShows).toHaveLength(2) // TOS and TNG have 29 and 26 episodes
      expect(shortShows).toHaveLength(1) // TAS has 16 episodes
      expect(shortShows[0]?.id).toBe('tas_s1')
    })

    it('should filter by watched status correctly', () => {
      const watchedItems = ['tos_s1', 'tmp']
      const isWatched = starTrekPredicates.byWatchedStatus(watchedItems, true)
      const isUnwatched = starTrekPredicates.byWatchedStatus(watchedItems, false)

      const watched = mockItems.filter(isWatched)
      const unwatched = mockItems.filter(isUnwatched)

      expect(watched).toHaveLength(2)
      expect(watched.map(w => w.id)).toEqual(['tos_s1', 'tmp'])
      expect(unwatched).toHaveLength(2)
      expect(unwatched.map(w => w.id)).toEqual(['tng_s1', 'tas_s1'])
    })
  })

  describe('starTrekTransformations', () => {
    it('should normalize search terms correctly', () => {
      const normalized1 = starTrekTransformations.normalizeSearchTerm('  Enterprise  ')
      const normalized2 = starTrekTransformations.normalizeSearchTerm('KIRK')

      expect(normalized1).toBe('enterprise')
      expect(normalized2).toBe('kirk')
    })

    it('should extract unique types correctly', () => {
      const types = starTrekTransformations.extractTypes(mockItems)

      expect(types).toHaveLength(3)
      expect(types).toEqual(expect.arrayContaining(['series', 'movie', 'animated']))
    })

    it('should calculate total episodes correctly', () => {
      const totalEpisodes = starTrekTransformations.calculateTotalEpisodes(mockItems)

      expect(totalEpisodes).toBe(71) // 29 + 26 + 16 (tmp has no episodes)
    })

    it('should sort items by year correctly', () => {
      const sorted = starTrekTransformations.sortByYear(mockItems)

      expect(sorted[0]?.id).toBe('tos_s1') // 1966
      expect(sorted[1]?.id).toBe('tas_s1') // 1973
      expect(sorted[2]?.id).toBe('tmp') // 1979
      expect(sorted[3]?.id).toBe('tng_s1') // 1987
    })

    it('should create era summary correctly', () => {
      const mockEras: StarTrekEra[] = [
        {
          id: 'tos',
          title: 'TOS Era',
          years: '1966-1979',
          stardates: '1312.4-7410.2',
          description: 'Original era',
          items: mockItems.slice(0, 2),
        }, // tos_s1, tmp
        {
          id: 'tng',
          title: 'TNG Era',
          years: '1987-1994',
          stardates: '41153.7-47988.0',
          description: 'Next Generation era',
          items: mockItems.slice(2),
        }, // tng_s1, tas_s1
      ]

      const summary = starTrekTransformations.createEraSummary(mockEras)

      expect(summary.totalEras).toBe(2)
      expect(summary.totalItems).toBe(4)
      expect(summary.totalEpisodes).toBe(71)
      expect(summary.typeBreakdown.series).toBe(2)
      expect(summary.typeBreakdown.movie).toBe(1)
      expect(summary.typeBreakdown.animated).toBe(1)
    })
  })
})

describe('Async Composition Utilities', () => {
  describe('asyncPipe function', () => {
    it('should handle mixed sync and async functions', async () => {
      const result = await asyncPipe(
        'hello',
        (s: string) => s.toUpperCase(), // sync
        async (s: string) => `${s}!`, // async
        (s: string) => s.length, // sync
      )

      expect(result).toBe(6) // 'HELLO!'.length
    })

    it('should handle all async functions', async () => {
      const result = await asyncPipe(
        5,
        async (n: number) => n * 2,
        async (n: number) => n + 1,
        async (n: number) => n.toString(),
      )

      expect(result).toBe('11') // ((5 * 2) + 1).toString()
    })

    it('should handle all sync functions', async () => {
      const result = await asyncPipe(
        [1, 2, 3],
        (arr: number[]) => arr.map(n => n * 2),
        (arr: number[]) => arr.filter(n => n > 2),
        (arr: number[]) => arr.length,
      )

      expect(result).toBe(2) // [4, 6].length
    })

    it('should handle errors in async operations', async () => {
      const asyncPipeline = asyncPipe(
        'test',
        (s: string) => s.toUpperCase(),
        async (_s: string) => {
          throw new Error('Async error')
        },
      )

      await expect(asyncPipeline).rejects.toThrow('Async error')
    })
  })

  describe('asyncCompose function', () => {
    it('should compose async functions right to left', async () => {
      const transform = asyncCompose(
        async (n: number) => n * 2,
        (s: string) => s.length,
        (s: string) => s.toUpperCase(),
      )

      const result = await transform('hello')

      expect(result).toBe(10) // 'hello' -> 'HELLO' -> 5 -> 10
    })

    it('should handle mixed sync and async functions', async () => {
      const transform = asyncCompose(
        (n: number) => `Result: ${n}`, // sync
        async (n: number) => n * 3, // async
        (s: string) => s.length, // sync
      )

      const result = await transform('test')

      expect(result).toBe('Result: 12') // 'test' -> 4 -> 12 -> 'Result: 12'
    })
  })

  describe('asyncTap function', () => {
    it('should execute async side effects without affecting the pipeline', async () => {
      const sideEffects: string[] = []

      const asyncTapFn = asyncTap(async (value: string) => {
        sideEffects.push(`Processed: ${value}`)
      })

      const result = await asyncPipe(
        'hello',
        (s: string) => s.toUpperCase(),
        asyncTapFn,
        (s: string) => s.length,
      )

      expect(result).toBe(5)
      expect(sideEffects).toEqual(['Processed: HELLO'])
    })

    it('should handle both sync and async side effects', async () => {
      const logs: string[] = []

      const syncTap = asyncTap((value: number) => {
        logs.push(`Sync: ${value}`)
      })

      const asyncTapFn = asyncTap(async (value: number) => {
        logs.push(`Async: ${value}`)
      })

      const result = await asyncPipe(
        10,
        syncTap,
        (n: number) => n * 2,
        asyncTapFn,
        (n: number) => n + 5,
      )

      expect(result).toBe(25)
      expect(logs).toEqual(['Sync: 10', 'Async: 20'])
    })
  })
})

describe('Error Handling Utilities', () => {
  describe('tryCatch function', () => {
    it('should handle errors with fallback', () => {
      const safeParseJson = tryCatch((jsonString: string) => JSON.parse(jsonString), {
        strategy: 'return',
        fallback: {error: 'Parse failed'},
      })

      const validResult = safeParseJson('{"test": true}')
      const errorResult = safeParseJson('invalid json')

      expect(validResult).toEqual({test: true})
      expect(errorResult).toEqual({error: 'Parse failed'})
    })

    it('should handle errors with retry strategy', () => {
      let attemptCount = 0
      const flakeyFunction = tryCatch(
        () => {
          attemptCount++
          if (attemptCount < 3) {
            throw new Error('Temporary failure')
          }
          return 'success'
        },
        {
          strategy: 'retry',
          maxRetries: 3,
          retryDelay: 0,
        },
      )

      const result = flakeyFunction(undefined)

      expect(result).toBe('success')
      expect(attemptCount).toBe(3)
    })

    it('should use fallback after max retries exceeded', () => {
      let attemptCount = 0
      const alwaysFailFunction = tryCatch(
        () => {
          attemptCount++
          throw new Error('Always fails')
        },
        {
          strategy: 'retry',
          maxRetries: 2,
          retryDelay: 0,
          fallback: 'fallback used',
        },
      )

      const result = alwaysFailFunction(undefined)

      expect(result).toBe('fallback used')
      expect(attemptCount).toBe(2) // Initial attempt + 1 retry (maxRetries is additional retries)
    })
  })

  describe('recover function', () => {
    it('should try recovery strategies in order', async () => {
      const strategies = [
        async () => {
          throw new Error('First strategy failed')
        },
        async () => {
          throw new Error('Second strategy failed')
        },
        async () => 'third strategy succeeded',
      ]

      const recoverFunction = recover(strategies)
      const result = await recoverFunction('input')

      expect(result).toBe('third strategy succeeded')
    })

    it('should throw error when all strategies fail', async () => {
      const strategies = [
        async () => {
          throw new Error('Strategy 1 failed')
        },
        async () => {
          throw new Error('Strategy 2 failed')
        },
      ]

      const recoverFunction = recover(strategies)

      await expect(recoverFunction('input')).rejects.toThrow('All recovery strategies failed')
    })

    it('should return result from first successful strategy', async () => {
      const strategies = [async () => 'first strategy worked', async () => 'second strategy worked']

      const recoverFunction = recover(strategies)
      const result = await recoverFunction('input')

      expect(result).toBe('first strategy worked')
    })
  })

  describe('Debugging Utilities', () => {
    describe('createDebugPipe function', () => {
      it('should create debug-enabled pipeline with detailed execution info', () => {
        const debugPipe = createDebugPipe({
          enableLogging: false, // Disable logging in tests
          enableTiming: true,
          label: 'Test Pipeline',
        })

        const [result, debugInfo] = debugPipe(
          'hello',
          (s: string) => s.toUpperCase(),
          (s: string) => `${s}!`,
          (s: string) => s.length,
        )

        expect(result).toBe(6)
        expect(debugInfo.label).toBe('Test Pipeline')
        expect(debugInfo.stepCount).toBe(3)
        expect(debugInfo.steps).toHaveLength(3)
        expect(debugInfo.result).toBe(6)
        expect(debugInfo.totalDuration).toBeGreaterThanOrEqual(0)
        expect(debugInfo.error).toBeUndefined()

        // Check individual steps
        const steps = debugInfo.steps
        expect(steps[0]?.step).toBe(1)
        expect(steps[0]?.input).toBe('hello')
        expect(steps[0]?.output).toBe('HELLO')
        expect(steps[0]?.duration).toBeGreaterThanOrEqual(0)

        expect(steps[1]?.input).toBe('HELLO')
        expect(steps[1]?.output).toBe('HELLO!')

        expect(steps[2]?.input).toBe('HELLO!')
        expect(steps[2]?.output).toBe(6)
      })

      it('should capture errors in debug pipeline', () => {
        const debugPipe = createDebugPipe({
          enableLogging: false,
          label: 'Error Pipeline',
        })

        expect(() => {
          debugPipe(
            'hello',
            (s: string) => s.toUpperCase(),
            () => {
              throw new Error('Test error')
            },
            (s: string) => s.length,
          )
        }).toThrow('Test error')
      })
    })

    describe('debugTap function', () => {
      it('should log values without affecting pipeline flow', () => {
        const mockLogger = vi.fn()
        const tapFunction = debugTap('Test Debug', {logger: mockLogger})

        const result = pipe(
          'hello',
          (s: string) => s.toUpperCase(),
          tapFunction as (s: string) => string,
          (s: string) => s.length,
        )

        expect(result).toBe(5)
        expect(mockLogger).toHaveBeenCalledWith('🔍 Test Debug:', '"HELLO"')
      })

      it('should handle complex objects with depth control', () => {
        const mockLogger = vi.fn()
        const complexObject = {a: 1, b: {c: 2}}
        const tapFunction = debugTap('Complex Object', {depth: 2, logger: mockLogger})

        const result = tapFunction(complexObject)

        expect(result).toBe(complexObject)
        expect(mockLogger).toHaveBeenCalledWith('🔍 Complex Object:', complexObject)
      })
    })

    describe('perfTap function', () => {
      it('should measure and log timing without affecting pipeline', () => {
        const mockLogger = vi.fn()
        const tapFunction = perfTap('Performance Test', mockLogger)

        const result = pipe(
          100,
          (n: number) => n * 2,
          tapFunction as (n: number) => number,
          (n: number) => n + 1,
        )

        expect(result).toBe(201)
        expect(mockLogger).toHaveBeenCalledWith(
          expect.stringMatching(/⏱️ Performance Test: \d+\.\d{2}ms/),
        )
      })
    })

    describe('conditionalTap function', () => {
      it('should only execute when predicate is true', () => {
        const mockSideEffect = vi.fn()
        const tapFunction = conditionalTap((arr: number[]) => arr.length > 2, mockSideEffect)

        // Should not execute - array too small
        pipe([1, 2], tapFunction, (arr: number[]) => arr.length)
        expect(mockSideEffect).not.toHaveBeenCalled()

        // Should execute - array large enough
        pipe([1, 2, 3, 4], tapFunction, (arr: number[]) => arr.length)
        expect(mockSideEffect).toHaveBeenCalledWith([1, 2, 3, 4])
      })
    })

    describe('createPipelineInspector function', () => {
      it('should track type and size changes through pipeline', () => {
        const inspector = createPipelineInspector({
          trackTypes: true,
          trackSizes: true,
          saveHistory: true,
        })

        const [result, analysis] = inspector.inspect(
          'hello',
          (s: string) => s.split(''),
          (arr: string[]) => arr.length,
          (n: number) => n > 3,
        )

        expect(result).toBe(true)
        expect(analysis.finalType).toBe('boolean')
        expect(analysis.finalSize).toBe(1)
        expect(analysis.stepCount).toBe(3)
        expect(analysis.typeHistory).toEqual(['string', 'object', 'number', 'boolean'])
        expect(analysis.sizeHistory).toEqual([5, 5, 1, 1])
        expect(analysis.fullHistory).toHaveLength(4)
      })

      it('should maintain history size limits', () => {
        const inspector = createPipelineInspector({
          saveHistory: true,
          maxHistorySize: 2,
        })

        inspector.inspect(
          1,
          (n: number) => n + 1,
          (n: number) => n * 2,
          (n: number) => n - 1,
        )

        const history = inspector.getHistory()
        expect(history.length).toBeLessThanOrEqual(2)
      })

      it('should clear history when requested', () => {
        const inspector = createPipelineInspector({saveHistory: true})

        inspector.inspect(1, (n: number) => n + 1)
        expect(inspector.getHistory().length).toBeGreaterThan(0)

        inspector.clearHistory()
        expect(inspector.getHistory().length).toBe(0)
      })
    })

    describe('compositionErrorBoundary function', () => {
      it('should handle successful execution', () => {
        const safePipeline = compositionErrorBoundary([
          (x: number) => x * 2,
          (x: number) => x + 10,
          (x: number) => x / 2,
        ])

        const result = safePipeline(5)

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.result).toBe(10) // (5 * 2 + 10) / 2 = 10
          expect(result.steps).toBe(3)
        }
      })

      it('should handle errors gracefully', () => {
        const safePipeline = compositionErrorBoundary([
          (x: number) => x * 2,
          () => {
            throw new Error('Division by zero')
          },
          (x: number) => x + 1,
        ])

        const result = safePipeline(5)

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.message).toBe('Division by zero')
          expect(result.errorStep).toBeGreaterThan(0)
          expect(result.partialResult).toBe(10) // After first step
        }
      })

      it('should use fallback value when provided', () => {
        const safePipeline = compositionErrorBoundary(
          [
            (x: number) => x * 2,
            () => {
              throw new Error('Test error')
            },
          ],
          {
            fallbackValue: 'fallback result',
          },
        )

        const result = safePipeline(5)

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.result).toBe('fallback result')
        }
      })

      it('should call error handler when provided', () => {
        const mockErrorHandler = vi.fn()
        const safePipeline = compositionErrorBoundary(
          [
            () => {
              throw new Error('Test error')
            },
          ],
          {
            onError: mockErrorHandler,
          },
        )

        safePipeline(5)

        expect(mockErrorHandler).toHaveBeenCalledWith(
          expect.any(Error),
          expect.any(Number),
          expect.any(Number),
        )
      })
    })
  })
})
