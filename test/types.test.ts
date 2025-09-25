import type {
  AtLeastOne,
  CallbackCollection,
  CallbackKeys,
  CallbackPayload,
  DeepPartial,
  DeepReadonly,
  DeepRequired,
  ExactlyOne,
  FactoryFunction,
  FactoryParameters,
  FactoryReturnType,
  FactoryUpdate,
  FunctionProperties,
  IsFunction,
  IsNever,
  NonFunctionProperties,
  PickOptional,
  PickRequired,
  RenameKeys,
} from '../src/modules/types.js'
import {describe, expectTypeOf, it} from 'vitest'

describe('Generic Utility Types Library', () => {
  describe('Deep Utility Types', () => {
    it('should make all properties optional recursively with DeepPartial', () => {
      interface NestedObject {
        level1: {
          level2: {
            value: string
            count: number
          }
          name: string
        }
        simple: boolean
      }

      type PartialNested = DeepPartial<NestedObject>

      expectTypeOf<PartialNested>().toMatchTypeOf<{
        level1?: {
          level2?: {
            value?: string
            count?: number
          }
          name?: string
        }
        simple?: boolean
      }>()
    })

    it('should make all properties required recursively with DeepRequired', () => {
      interface OptionalNested {
        level1?: {
          level2?: {
            value?: string
            count?: number
          }
          name?: string
        }
        simple?: boolean
      }

      type RequiredNested = DeepRequired<OptionalNested>

      // Type constraint validation - DeepRequired should make all optional properties required
      expectTypeOf<RequiredNested>().toHaveProperty('level1')
      expectTypeOf<RequiredNested>().toHaveProperty('simple')

      // Verify specific property requirements
      const _testRequired: RequiredNested = {
        level1: {
          level2: {
            value: 'test',
            count: 1,
          },
          name: 'test',
        },
        simple: true,
      }
      expectTypeOf<typeof _testRequired>().toEqualTypeOf<RequiredNested>()
    })

    it('should make all properties readonly recursively with DeepReadonly', () => {
      interface MutableNested {
        level1: {
          items: string[]
          config: {
            enabled: boolean
          }
        }
        count: number
      }

      type ReadonlyNested = DeepReadonly<MutableNested>

      expectTypeOf<ReadonlyNested>().toMatchTypeOf<{
        readonly level1: {
          readonly items: readonly string[]
          readonly config: {
            readonly enabled: boolean
          }
        }
        readonly count: number
      }>()
    })
  })

  describe('Enhanced Pick/Omit Utilities', () => {
    it('should pick properties and make them optional with PickOptional', () => {
      interface Config {
        url: string
        timeout: number
        retries: number
        debug: boolean
      }

      type OptionalConfig = PickOptional<Config, 'timeout' | 'retries'>

      expectTypeOf<OptionalConfig>().toMatchTypeOf<{
        url: string
        debug: boolean
        timeout?: number
        retries?: number
      }>()
    })

    it('should pick properties and make them required with PickRequired', () => {
      interface OptionalConfig {
        url?: string
        timeout?: number
        debug?: boolean
      }

      type RequiredConfig = PickRequired<OptionalConfig, 'url'>

      expectTypeOf<RequiredConfig>().toMatchTypeOf<{
        url: string
        timeout?: number
        debug?: boolean
      }>()
    })

    it('should rename object keys with RenameKeys', () => {
      interface ApiResponse {
        user_id: string
        user_name: string
        user_email: string
        created_at: Date
      }

      type ClientUser = RenameKeys<
        ApiResponse,
        {
          user_id: 'id'
          user_name: 'name'
        }
      >

      expectTypeOf<ClientUser>().toMatchTypeOf<{
        id: string
        name: string
        user_email: string
        created_at: Date
      }>()
    })
  })

  describe('Factory Function Utilities', () => {
    it('should extract factory function return type with FactoryReturnType', () => {
      const _createCounter = () => ({
        count: 0,
        increment: () => {},
        reset: () => {},
      })

      type CounterInstance = FactoryReturnType<typeof _createCounter>

      expectTypeOf<CounterInstance>().toEqualTypeOf<{
        count: number
        increment: () => void
        reset: () => void
      }>()
    })

    it('should extract factory function parameters with FactoryParameters', () => {
      const _createRenderer = (
        _container: HTMLElement,
        _options: {theme: string},
        _enabled: boolean,
      ) => ({})

      type RendererParams = FactoryParameters<typeof _createRenderer>

      expectTypeOf<RendererParams>().toEqualTypeOf<[HTMLElement, {theme: string}, boolean]>()
    })

    it('should constrain factory functions with FactoryFunction', () => {
      const _validFactory: FactoryFunction<{init: () => void; destroy: () => void}> = () => ({
        init: () => {},
        destroy: () => {},
      })

      type FactoryResult = FactoryReturnType<typeof _validFactory>
      expectTypeOf<FactoryResult>().toEqualTypeOf<{
        init: () => void
        destroy: () => void
      }>()
    })

    it('should create partial type excluding functions with FactoryUpdate', () => {
      interface ModuleInstance {
        count: number
        name: string
        enabled: boolean
        increment: () => void
        reset: () => void
        configure: (_options: object) => void
      }

      type ModuleUpdate = FactoryUpdate<ModuleInstance>

      expectTypeOf<ModuleUpdate>().toEqualTypeOf<{
        count?: number
        name?: string
        enabled?: boolean
      }>()
    })
  })

  describe('Callback and Event Utilities', () => {
    it('should extract callback function parameters with CallbackPayload', () => {
      type ProgressCallback = (itemId: string, isWatched: boolean, timestamp: number) => void
      type ProgressPayload = CallbackPayload<ProgressCallback>

      expectTypeOf<ProgressPayload>().toEqualTypeOf<[string, boolean, number]>()
    })

    it('should create arrays of callback functions with CallbackCollection', () => {
      type EventCallbacks = CallbackCollection<{
        onChange: (value: string) => void
        onError: (error: Error) => void
        onComplete: () => void
      }>

      expectTypeOf<EventCallbacks>().toEqualTypeOf<{
        onChange: ((value: string) => void)[]
        onError: ((error: Error) => void)[]
        onComplete: (() => void)[]
      }>()
    })

    it('should create union of callback keys with CallbackKeys', () => {
      interface EventMap {
        click: (x: number, y: number) => void
        hover: (element: HTMLElement) => void
        focus: () => void
      }

      type EventNames = CallbackKeys<EventMap>

      expectTypeOf<EventNames>().toEqualTypeOf<'click' | 'hover' | 'focus'>()
    })
  })

  describe('Conditional and Utility Types', () => {
    it('should detect never type with IsNever', () => {
      type NeverCheck = IsNever<never>
      type StringCheck = IsNever<string>

      expectTypeOf<NeverCheck>().toEqualTypeOf<true>()
      expectTypeOf<StringCheck>().toEqualTypeOf<false>()
    })

    it('should detect function types with IsFunction', () => {
      type FunctionCheck = IsFunction<() => void>
      type StringCheck = IsFunction<string>
      type ObjectCheck = IsFunction<{prop: string}>

      expectTypeOf<FunctionCheck>().toEqualTypeOf<true>()
      expectTypeOf<StringCheck>().toEqualTypeOf<false>()
      expectTypeOf<ObjectCheck>().toEqualTypeOf<false>()
    })

    it('should extract only function properties with FunctionProperties', () => {
      interface Mixed {
        name: string
        count: number
        increment: () => void
        decrement: () => void
        reset: () => void
        enabled: boolean
      }

      type Methods = FunctionProperties<Mixed>

      expectTypeOf<Methods>().toEqualTypeOf<{
        increment: () => void
        decrement: () => void
        reset: () => void
      }>()
    })

    it('should extract only non-function properties with NonFunctionProperties', () => {
      interface Mixed {
        name: string
        count: number
        increment: () => void
        decrement: () => void
        enabled: boolean
      }

      type State = NonFunctionProperties<Mixed>

      expectTypeOf<State>().toEqualTypeOf<{
        name: string
        count: number
        enabled: boolean
      }>()
    })

    it('should require at least one property with AtLeastOne', () => {
      interface Options {
        name?: string
        age?: number
        email?: string
      }

      type RequireAtLeastOne = AtLeastOne<Options>

      expectTypeOf<{name: string}>().toMatchTypeOf<RequireAtLeastOne>()
      expectTypeOf<{age: number}>().toMatchTypeOf<RequireAtLeastOne>()
      expectTypeOf<{email: string}>().toMatchTypeOf<RequireAtLeastOne>()
      expectTypeOf<{name: string; age: number}>().toMatchTypeOf<RequireAtLeastOne>()
    })

    it('should allow exactly one property with ExactlyOne', () => {
      interface LoadOptions {
        url?: string
        file?: File
        data?: string
      }

      type ExactlyOneOption = ExactlyOne<LoadOptions>

      expectTypeOf<{url: string}>().toMatchTypeOf<ExactlyOneOption>()
      expectTypeOf<{file: File}>().toMatchTypeOf<ExactlyOneOption>()
      expectTypeOf<{data: string}>().toMatchTypeOf<ExactlyOneOption>()
    })
  })

  describe('Integration Tests', () => {
    it('should work with VBS factory pattern', () => {
      interface ProgressTrackerInstance {
        watchedItems: string[]
        isWatched: (_itemId: string) => boolean
        toggleItem: (_itemId: string) => void
        getProgress: () => {total: number; completed: number}
      }

      const _createProgressTracker: FactoryFunction<ProgressTrackerInstance> = () => ({
        watchedItems: [],
        isWatched: () => false,
        toggleItem: () => {},
        getProgress: () => ({total: 0, completed: 0}),
      })

      // Use the factory to demonstrate type constraints work
      const _instance = _createProgressTracker()
      expectTypeOf<typeof _instance>().toEqualTypeOf<ProgressTrackerInstance>()

      type TrackerState = NonFunctionProperties<ProgressTrackerInstance>
      type TrackerMethods = FunctionProperties<ProgressTrackerInstance>

      expectTypeOf<TrackerState>().toEqualTypeOf<{
        watchedItems: string[]
      }>()

      expectTypeOf<TrackerMethods>().toEqualTypeOf<{
        isWatched: (_itemId: string) => boolean
        toggleItem: (_itemId: string) => void
        getProgress: () => {total: number; completed: number}
      }>()

      type TrackerUpdate = FactoryUpdate<ProgressTrackerInstance>
      expectTypeOf<TrackerUpdate>().toEqualTypeOf<{
        watchedItems?: string[]
      }>()
    })

    it('should support deep operations on VBS data structures', () => {
      interface VBSConfig {
        storage: {
          type: 'localStorage' | 'indexedDB'
          options: {
            key: string
            version?: number
          }
        }
        ui: {
          theme: 'light' | 'dark'
          compact: boolean
        }
      }

      type ConfigUpdate = DeepPartial<VBSConfig>
      expectTypeOf<ConfigUpdate>().toMatchTypeOf<{
        storage?: {
          type?: 'localStorage' | 'indexedDB'
          options?: {
            key?: string
            version?: number
          }
        }
        ui?: {
          theme?: 'light' | 'dark'
          compact?: boolean
        }
      }>()

      type ImmutableConfig = DeepReadonly<VBSConfig>
      expectTypeOf<ImmutableConfig>().toMatchTypeOf<{
        readonly storage: {
          readonly type: 'localStorage' | 'indexedDB'
          readonly options: {
            readonly key: string
            readonly version?: number
          }
        }
        readonly ui: {
          readonly theme: 'light' | 'dark'
          readonly compact: boolean
        }
      }>()
    })
  })
})
