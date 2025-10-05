import type {
  EventListener,
  EventMap,
  ProgressTrackerEvents,
  SearchFilterEvents,
  StarTrekEra,
  StarTrekItem,
} from '../src/modules/types.js'
import {assertType, describe, expectTypeOf, test} from 'vitest'

import {createEventEmitter} from '../src/modules/events.js'
import {createProgressTracker} from '../src/modules/progress.js'
import {createSearchFilter} from '../src/modules/search.js'
import {asyncCompose, asyncPipe, compose, curry, pipe, tap} from '../src/utils/composition.js'

// Helper functions for type checking tests
function processItems<T extends {id: string; name: string}>(items: T[]): string {
  return pipe(
    items,
    (items: T[]) => items.filter(item => item.name.length > 0),
    (filteredItems: T[]) => filteredItems.map(item => item.id),
    (ids: string[]) => ids.join(','),
  )
}

function safeTransform<T, U>(input: T, transform: (input: T) => U, fallback: U): U {
  try {
    return transform(input)
  } catch {
    return fallback
  }
}

function processValue(input: string | number): number {
  return pipe(
    input,
    (value: string | number) => (typeof value === 'string' ? value.length : value),
    (n: number) => n * 2,
  )
}

function extractDeepValue(obj: DeepObject): string {
  return pipe(
    obj,
    (o: DeepObject) => o.level1,
    (level1: DeepObject['level1']) => level1.level2,
    (level2: DeepObject['level1']['level2']) => level2.level3,
  )
}

interface DeepObject {
  level1: {
    level2: {
      level3: string
    }
  }
}

/**
 * Type checking tests for VBS functional composition and generic type system.
 * These tests focus on compile-time type checking using Vitest's type testing capabilities.
 *
 * Note: These tests are only statically analyzed by TypeScript compiler,
 * not executed at runtime. Use *.test-d.ts extension for type-only tests.
 */

describe('EventEmitter Type Safety', () => {
  test('should enforce correct event payload types', () => {
    interface TestEvents extends EventMap {
      'string-event': string
      'number-event': number
      'object-event': {id: number; name: string}
      'void-event': void
    }

    const emitter = createEventEmitter<TestEvents>()

    // Test event listener type constraints
    expectTypeOf<typeof emitter.on>().parameter(0).toEqualTypeOf<keyof TestEvents>()
    expectTypeOf<typeof emitter.on>().parameter(1).toMatchTypeOf<EventListener<any>>()

    // Test emit method type constraints
    expectTypeOf<typeof emitter.emit>().parameter(0).toEqualTypeOf<keyof TestEvents>()

    // Test that string event requires string payload
    expectTypeOf<typeof emitter.emit>().toBeCallableWith('string-event', 'test')
    // @ts-expect-error string event should not accept number
    assertType(emitter.emit('string-event', 42))

    // Test that number event requires number payload
    expectTypeOf<typeof emitter.emit>().toBeCallableWith('number-event', 42)
    // @ts-expect-error number event should not accept string
    assertType(emitter.emit('number-event', 'invalid'))

    // Test that object event requires correct object structure
    expectTypeOf<typeof emitter.emit>().toBeCallableWith('object-event', {id: 1, name: 'test'})
    // @ts-expect-error object event should not accept missing properties
    assertType(emitter.emit('object-event', {id: 1}))

    // Test that void event accepts undefined
    expectTypeOf<typeof emitter.emit>().toBeCallableWith('void-event', undefined)
    // @ts-expect-error void event should not accept other values
    assertType(emitter.emit('void-event', 'invalid'))
  })

  test('should provide correct EventListener type inference', () => {
    // Test basic EventListener types - VBS EventListener always expects payload parameter
    expectTypeOf<EventListener<string>>().toEqualTypeOf<(payload: string) => void>()
    expectTypeOf<EventListener<number>>().toEqualTypeOf<(payload: number) => void>()

    // Test complex EventListener types
    interface ComplexPayload {
      user: {id: number}
      metadata: string[]
    }
    expectTypeOf<EventListener<ComplexPayload>>().toEqualTypeOf<(payload: ComplexPayload) => void>()

    // Test actual VBS event payload types
    interface ItemTogglePayload {
      itemId: string
      isWatched: boolean
    }
    expectTypeOf<EventListener<ItemTogglePayload>>().toEqualTypeOf<
      (payload: ItemTogglePayload) => void
    >()
  })

  test('should enforce VBS-specific event types', () => {
    const _progressTracker = createProgressTracker()
    const _searchFilter = createSearchFilter()

    // Test ProgressTrackerEvents type constraints
    expectTypeOf<typeof _progressTracker.on>()
      .parameter(0)
      .toEqualTypeOf<keyof ProgressTrackerEvents>()
    expectTypeOf<typeof _progressTracker.on>().parameter(1).toMatchTypeOf<EventListener<any>>()

    // Test SearchFilterEvents type constraints
    expectTypeOf<typeof _searchFilter.on>().parameter(0).toEqualTypeOf<keyof SearchFilterEvents>()
    expectTypeOf<typeof _searchFilter.on>().parameter(1).toMatchTypeOf<EventListener<any>>()

    // Test specific event payload types
    expectTypeOf<ProgressTrackerEvents['item-toggle']>().toEqualTypeOf<{
      itemId: string
      isWatched: boolean
    }>()

    expectTypeOf<ProgressTrackerEvents['progress-update']>().toMatchTypeOf<{
      overall: {total: number; completed: number; percentage: number}
      eraProgress: {
        eraId: string
        total: number
        completed: number
        percentage: number
      }[]
    }>()
  })
})

describe('Composition Utilities Type Safety', () => {
  test('should infer pipe function types correctly', () => {
    // Test basic pipe type inference
    const result1 = pipe(
      'hello',
      (s: string) => s.length,
      (n: number) => n * 2,
      (n: number) => n.toString(),
    )
    expectTypeOf(result1).toEqualTypeOf<string>()

    // Test complex object transformations
    interface User {
      name: string
      age: number
    }
    interface UserProfile {
      displayName: string
      isAdult: boolean
    }

    const result2 = pipe(
      {name: 'John', age: 25} as User,
      (user: User): UserProfile => ({
        displayName: user.name.toUpperCase(),
        isAdult: user.age >= 18,
      }),
      (profile: UserProfile) => `${profile.displayName} (${profile.isAdult ? 'Adult' : 'Minor'})`,
    )
    expectTypeOf(result2).toEqualTypeOf<string>()

    // Test array transformations
    const result3 = pipe(
      [1, 2, 3, 4, 5],
      (arr: number[]) => arr.filter(n => n > 2),
      (arr: number[]) => arr.map(n => n.toString()),
      (arr: string[]) => arr.join(','),
    )
    expectTypeOf(result3).toEqualTypeOf<string>()
  })

  test('should infer compose function types correctly', () => {
    // Test basic compose type inference (right-to-left)
    const transform = compose(
      (n: number) => n.toString(),
      (n: number) => n * 2,
      (s: string) => s.length,
    )
    expectTypeOf(transform).toEqualTypeOf<(input: string) => string>()

    // Test that the function can be called with correct input type
    expectTypeOf(transform).toBeCallableWith('hello')
    // @ts-expect-error should not accept number input
    assertType(transform(42))
  })

  test('should infer curry function types correctly', () => {
    // Test basic curry type inference
    const add = (a: number, b: number, c: number) => a + b + c
    const curriedAdd = curry(add)

    // Test partial application types
    expectTypeOf(curriedAdd).toBeCallableWith(1)
    expectTypeOf(curriedAdd).toBeCallableWith(1, 2)
    expectTypeOf(curriedAdd).toBeCallableWith(1, 2, 3)

    const partialAdd = curriedAdd(5)
    expectTypeOf(partialAdd).toBeCallableWith(3)
    expectTypeOf(partialAdd).toBeCallableWith(3, 2)
  })

  test('should infer async composition types correctly', () => {
    // Test asyncPipe type inference
    const asyncResult = asyncPipe(
      'hello',
      (s: string) => s.toUpperCase(),
      async (s: string) => `${s}!`,
      (s: string) => s.length,
    )
    expectTypeOf(asyncResult).toEqualTypeOf<Promise<number>>()

    // Test asyncCompose type inference
    const asyncTransform = asyncCompose(
      async (n: number) => n.toString(),
      async (s: string) => s.length,
    )
    expectTypeOf(asyncTransform).toBeFunction()
    expectTypeOf(asyncTransform).parameter(0).toEqualTypeOf<string>()
  })

  test('should handle tap function without changing type', () => {
    // Test that tap preserves the input type
    const result = pipe(
      42,
      tap((_n: number) => undefined), // Use undefined instead of void 0
      (n: number) => n.toString(),
    )
    expectTypeOf(result).toEqualTypeOf<string>()

    // Test tap with different types
    const stringResult = pipe(
      'hello',
      tap((_s: string) => undefined), // Use undefined instead of void 0
      (s: string) => s.toUpperCase(),
    )
    expectTypeOf(stringResult).toEqualTypeOf<string>()
  })
})

describe('VBS Domain Types', () => {
  test('should enforce StarTrekItem type constraints', () => {
    // Test required properties
    expectTypeOf<StarTrekItem>().toHaveProperty('id').toEqualTypeOf<string>()
    expectTypeOf<StarTrekItem>().toHaveProperty('title').toEqualTypeOf<string>()
    expectTypeOf<StarTrekItem>().toHaveProperty('type').toEqualTypeOf<string>()
    expectTypeOf<StarTrekItem>().toHaveProperty('year').toEqualTypeOf<string>()
    expectTypeOf<StarTrekItem>().toHaveProperty('stardate').toEqualTypeOf<string>()
    expectTypeOf<StarTrekItem>().toHaveProperty('notes').toEqualTypeOf<string>()

    // Test optional properties
    expectTypeOf<StarTrekItem>().toHaveProperty('episodes').toEqualTypeOf<number | undefined>()

    // Test that invalid properties are rejected
    // @ts-expect-error invalid property should not exist
    assertType<StarTrekItem['invalidProperty']>('should not exist')
  })

  test('should enforce StarTrekEra type constraints', () => {
    // Test required properties
    expectTypeOf<StarTrekEra>().toHaveProperty('id').toEqualTypeOf<string>()
    expectTypeOf<StarTrekEra>().toHaveProperty('title').toEqualTypeOf<string>()
    expectTypeOf<StarTrekEra>().toHaveProperty('years').toEqualTypeOf<string>()
    expectTypeOf<StarTrekEra>().toHaveProperty('stardates').toEqualTypeOf<string>()
    expectTypeOf<StarTrekEra>().toHaveProperty('description').toEqualTypeOf<string>()
    expectTypeOf<StarTrekEra>().toHaveProperty('items').toEqualTypeOf<StarTrekItem[]>()
  })

  test('should handle composition with VBS types', () => {
    // Test StarTrekItem transformations
    const items: StarTrekItem[] = []
    const seriesCount = pipe(
      items,
      (items: StarTrekItem[]) => items.filter(item => item.type === 'series'),
      (series: StarTrekItem[]) => series.length,
    )
    expectTypeOf(seriesCount).toEqualTypeOf<number>()

    // Test era transformations
    const eras: StarTrekEra[] = []
    const eraNames = pipe(
      eras,
      (eras: StarTrekEra[]) => eras.map(era => era.title),
      (titles: string[]) => titles.join(', '),
    )
    expectTypeOf(eraNames).toEqualTypeOf<string>()
  })
})

describe('Generic Type Constraints', () => {
  test('should handle complex generic constraints', () => {
    // Test generic function with constraints
    expectTypeOf(processItems).toEqualTypeOf<
      <T extends {id: string; name: string}>(items: T[]) => string
    >()

    // Test that function works with valid types
    const validItems = [{id: '1', name: 'Item 1', extra: 'data'}]
    expectTypeOf(processItems).toBeCallableWith(validItems)

    // @ts-expect-error should not accept items without required properties
    assertType(processItems([{id: '1'}]))
  })

  test('should handle conditional types in composition', () => {
    // Test conditional type transformations
    type ConditionalTransform<T> = T extends string ? number : string

    function conditionalPipe<T>(input: T): ConditionalTransform<T> {
      if (typeof input === 'string') {
        return (input as string).length as ConditionalTransform<T>
      }
      return String(input) as ConditionalTransform<T>
    }

    // Test type inference for conditional types
    expectTypeOf(conditionalPipe<string>).toEqualTypeOf<(input: string) => number>()
    expectTypeOf(conditionalPipe<number>).toEqualTypeOf<(input: number) => string>()
  })

  test('should handle mapped types in composition', () => {
    // Test with custom Partial type
    type CustomPartial<T> = {
      [P in keyof T]?: T[P]
    }

    interface FullUser {
      id: number
      name: string
      email: string
    }

    function processPartialUser(partial: CustomPartial<FullUser>): FullUser {
      return pipe(partial, (user: CustomPartial<FullUser>) => ({
        id: user.id ?? 0,
        name: user.name ?? 'Unknown',
        email: user.email ?? 'no-email',
      }))
    }

    expectTypeOf(processPartialUser).toEqualTypeOf<(partial: CustomPartial<FullUser>) => FullUser>()
    expectTypeOf(processPartialUser).toBeCallableWith({name: 'John'})
    expectTypeOf(processPartialUser).toBeCallableWith({id: 1, email: 'test@example.com'})
  })
})

describe('Error Handling Type Safety', () => {
  test('should maintain type safety in error scenarios', () => {
    // Test generic error handling function
    expectTypeOf(safeTransform).toEqualTypeOf<
      <T, U>(input: T, transform: (input: T) => U, fallback: U) => U
    >()

    // Test that function maintains type relationships
    const stringResult = safeTransform('hello', (s: string) => s.length, 0)
    expectTypeOf(stringResult).toEqualTypeOf<number>()

    // @ts-expect-error fallback must match transform return type
    assertType(safeTransform('hello', (s: string) => s.length, 'invalid'))
  })

  test('should handle union types in composition', () => {
    // Test union type handling
    expectTypeOf(processValue).toEqualTypeOf<(input: string | number) => number>()
    expectTypeOf(processValue).toBeCallableWith('hello')
    expectTypeOf(processValue).toBeCallableWith(42)
    // @ts-expect-error should not accept boolean
    assertType(processValue(true))
  })
})

describe('Advanced Generic Patterns', () => {
  test('should handle factory function type constraints', () => {
    // Test that factory functions maintain their return types
    const progressTracker = createProgressTracker()
    const searchFilter = createSearchFilter()

    expectTypeOf(progressTracker).toHaveProperty('on').toBeFunction()
    expectTypeOf(progressTracker).toHaveProperty('off').toBeFunction()
    expectTypeOf(progressTracker).toHaveProperty('once').toBeFunction()
    expectTypeOf(progressTracker).toHaveProperty('toggleItem').toBeFunction()
    expectTypeOf(progressTracker).toHaveProperty('isWatched').toBeFunction()

    expectTypeOf(searchFilter).toHaveProperty('on').toBeFunction()
    expectTypeOf(searchFilter).toHaveProperty('off').toBeFunction()
    expectTypeOf(searchFilter).toHaveProperty('setSearch').toBeFunction()
    expectTypeOf(searchFilter).toHaveProperty('setFilter').toBeFunction()
  })

  test('should enforce EventMap constraint', () => {
    // Test that EventMap requires proper structure
    interface ValidEventMap extends EventMap {
      event1: string
      event2: number
      event3: {id: string; value: number}
    }

    expectTypeOf<ValidEventMap>().toMatchTypeOf<EventMap>()

    // Test with valid event map
    const _emitter = createEventEmitter<ValidEventMap>()
    expectTypeOf<typeof _emitter>().toHaveProperty('emit').toBeFunction()
  })

  test('should handle deep type transformations', () => {
    // Test nested type transformations
    expectTypeOf(extractDeepValue).toEqualTypeOf<(obj: DeepObject) => string>()

    const result = extractDeepValue({
      level1: {
        level2: {
          level3: 'deep value',
        },
      },
    })
    expectTypeOf(result).toEqualTypeOf<string>()
  })
})
