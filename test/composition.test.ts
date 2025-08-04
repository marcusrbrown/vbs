import {describe, expect, it, vi} from 'vitest'

import {compose, curry, pipe, tap} from '../src/utils/composition.js'

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
