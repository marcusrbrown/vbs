# VBS Generic Types Usage Examples

This document provides comprehensive examples for using the VBS generic type system, including generic EventEmitter patterns, storage utilities, and advanced TypeScript utility types.

## Table of Contents

1. [Generic EventEmitter Examples](#generic-eventemitter-examples)
2. [Generic Storage Utilities](#generic-storage-utilities)
3. [Factory Function Generic Constraints](#factory-function-generic-constraints)
4. [Utility Types Library](#utility-types-library)
5. [Common Patterns](#common-patterns)
6. [Troubleshooting Guide](#troubleshooting-guide)

## Generic EventEmitter Examples

### Basic Event Map Definition

```typescript
import { createEventEmitter, type EventListener, type EventMap } from './modules/events.js'

// Define your event map with type-safe payloads
interface UserEvents extends EventMap {
  'user-login': { userId: string; timestamp: Date }
  'user-logout': { userId: string; sessionDuration: number }
  'profile-update': { userId: string; changes: Record<string, unknown> }
}

// Create type-safe EventEmitter
const userEventEmitter = createEventEmitter<UserEvents>()
```

### Type-Safe Event Handling

```typescript
// Type-safe event listeners - TypeScript will validate payload structure
userEventEmitter.on('user-login', (data) => {
  // data is automatically typed as UserEvents['user-login']
  console.log(`User ${data.userId} logged in at ${data.timestamp}`)
})

userEventEmitter.on('profile-update', ({ userId, changes }) => {
  // Destructuring works with full type safety
  console.log(`User ${userId} updated profile:`, changes)
})

// Type-safe event emission
userEventEmitter.emit('user-login', {
  userId: 'user123',
  timestamp: new Date()
  // TypeScript error if you miss required properties or use wrong types
})
```

### Factory Function Integration

```typescript
interface ModuleEvents extends EventMap {
  'data-changed': { newData: string[]; timestamp: string }
  'error-occurred': { error: Error; operation: string }
}

export const createDataModule = (): DataModuleInstance => {
  // Private state in closure
  const data: string[] = []

  // Generic EventEmitter for type-safe events
  const eventEmitter = createEventEmitter<ModuleEvents>()

  return {
    addItem: (item: string) => {
      data.push(item)

      // Type-safe event emission
      eventEmitter.emit('data-changed', {
        newData: [...data],
        timestamp: new Date().toISOString()
      })
    },

    // Expose EventEmitter methods
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    once: eventEmitter.once.bind(eventEmitter)
  }
}
```

### Advanced Event Patterns

```typescript
// Complex event payloads with nested types
interface ProgressEvents extends EventMap {
  'progress-update': {
    overall: { total: number; completed: number; percentage: number }
    details: { id: string; status: 'pending' | 'completed' | 'error' }[]
    metadata: { startTime: Date; estimatedCompletion?: Date }
  }
}

const progressEmitter = createEventEmitter<ProgressEvents>()

// Multiple listeners for the same event
progressEmitter.on('progress-update', (data) => {
  // Update UI progress bar
  updateProgressBar(data.overall.percentage)
})

progressEmitter.on('progress-update', (data) => {
  // Log progress to analytics
  logAnalytics('progress', data.overall)
})

// Once listeners for one-time events
progressEmitter.once('progress-update', (data) => {
  // Show initial progress notification
  showNotification(`Progress started: ${data.overall.percentage}%`)
})
```

## Generic Storage Utilities

### Basic Storage Adapter Usage

```typescript
import { createStorage, LocalStorageAdapter, type StorageAdapter } from './modules/storage.js'

// Type-safe storage for user preferences
interface UserPreferences {
  theme: 'light' | 'dark'
  language: string
  notifications: boolean
}

// Create validated storage
const prefsStorage = createStorage(
  new LocalStorageAdapter<UserPreferences>({
    validate: (data): data is UserPreferences => {
      return (
        typeof data === 'object' &&
        data !== null &&
        typeof (data as any).theme === 'string' &&
        ['light', 'dark'].includes((data as any).theme) &&
        typeof (data as any).language === 'string' &&
        typeof (data as any).notifications === 'boolean'
      )
    },
    fallback: {
      theme: 'light',
      language: 'en',
      notifications: true
    }
  }),
  'userPreferences'
)

// Usage with automatic type inference
const preferences = prefsStorage.load() // Type: UserPreferences | null
prefsStorage.save({
  theme: 'dark',
  language: 'en',
  notifications: false
}) // Type-checked at compile time
```

### Custom Storage Adapter

```typescript
// Create a custom storage adapter for IndexedDB
class IndexedDBAdapter<T> implements StorageAdapter<T> {
  constructor(
    private dbName: string,
    private storeName: string,
    private options: StorageValidationOptions<T> = {}
  ) {}

  async save(key: string, data: T): Promise<void> {
    const sanitizedData = this.options.sanitize ? this.options.sanitize(data) : data

    // Simplified IndexedDB implementation
    // In production, use a proper IndexedDB wrapper or library
    const db = await this.openDatabase()
    const transaction = db.transaction([this.storeName], 'readwrite')
    const store = transaction.objectStore(this.storeName)

    return new Promise((resolve, reject) => {
      const request = store.put(sanitizedData, key)
      request.onsuccess = () => resolve()
      request.addEventListener('error', () => reject(request.error))
    })
  }

  async load(key: string): Promise<T | null> {
    const db = await this.openDatabase()
    const transaction = db.transaction([this.storeName], 'readonly')
    const store = transaction.objectStore(this.storeName)

    return new Promise((resolve, reject) => {
      const request = store.get(key)
      request.onsuccess = () => {
        const result = request.result

        if (!result) {
          resolve(this.options.fallback ?? null)
          return
        }

        if (this.options.validate && !this.options.validate(result)) {
          console.warn(`Invalid data format for key "${key}", using fallback`)
          resolve(this.options.fallback ?? null)
          return
        }

        resolve(result as T)
      }
      request.addEventListener('error', () => reject(request.error))
    })
  }

  private async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1)
      request.onsuccess = () => resolve(request.result)
      request.addEventListener('error', () => reject(request.error))

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName)
        }
      }
    })
  }

  // Simplified implementations for other methods
  async remove(key: string): Promise<void> {
    const db = await this.openDatabase()
    const transaction = db.transaction([this.storeName], 'readwrite')
    const store = transaction.objectStore(this.storeName)
    store.delete(key)
  }

  async clear(): Promise<void> {
    const db = await this.openDatabase()
    const transaction = db.transaction([this.storeName], 'readwrite')
    const store = transaction.objectStore(this.storeName)
    store.clear()
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.load(key)
    return result !== null
  }
}

// Usage with async storage
const asyncStorage = createStorage(
  new IndexedDBAdapter<string[]>('vbsDB', 'progress', {
    validate: isStringArray,
    fallback: []
  }),
  'watchedItems'
)

// All methods return Promises when using async adapter
const items = await asyncStorage.load() // Type: string[] | null
await asyncStorage.save(['tos_s1', 'tng_s1'])
```

### Storage with Events

```typescript
import { storageEventEmitter } from './modules/storage.js'

// Listen to storage events
storageEventEmitter.on('data-imported', ({ importedItems, timestamp }) => {
  showNotification(`Imported ${importedItems.length} items`)
  updateUI(importedItems)
})

storageEventEmitter.on('storage-error', ({ operation, error, context }) => {
  console.error(`Storage ${operation} failed:`, error)
  showErrorMessage(`Failed to ${operation} data: ${error.message}`)
})
```

## Factory Function Generic Constraints

### Generic Container Constraints

```typescript
// Generic constraints for DOM elements
const createRenderer = <TContainer extends HTMLElement>(
  container: TContainer,
  options: RendererOptions
): RendererInstance => {
  // TypeScript knows container is an HTMLElement with all its methods
  container.innerHTML = ''
  container.classList.add('vbs-renderer')

  return {
    render: (data: unknown[]) => {
      // Type-safe DOM manipulation
      data.forEach(item => {
        const element = document.createElement('div')
        element.textContent = String(item)
        container.append(element)
      })
    }
  }
}

// Usage with specific element types
const divRenderer = createRenderer(
  document.querySelector('#timeline') as HTMLDivElement,
  { theme: 'dark' }
)

const sectionRenderer = createRenderer(
  document.querySelector('#content') as HTMLSectionElement,
  { theme: 'light' }
)
```

### Multi-Generic Factory Functions

```typescript
// Factory with multiple generic parameters
const createDataManager = <
  TData extends Record<string, unknown>,
  TEvents extends EventMap,
  TStorage extends StorageAdapter<TData>
>(
  storage: TStorage,
  eventEmitter: EventEmitterInstance<TEvents>,
  initialData: TData
): DataManagerInstance<TData, TEvents> => {
  let data = { ...initialData }

  return {
    getData: (): TData => ({ ...data }),

    updateData: (updates: Partial<TData>) => {
      data = { ...data, ...updates }

      // Type-safe event emission (if TEvents includes 'data-updated')
      if ('data-updated' in eventEmitter) {
        (eventEmitter as any).emit('data-updated', { data: { ...data } })
      }

      // Type-safe storage
      storage.save('data', data)
    }
  }
}
```

## Utility Types Library

### Deep Utility Types

```typescript
import type {
  DeepPartial,
  DeepReadonly,
  DeepRequired
} from './modules/types.js'

// DeepPartial: Make all properties optional recursively
interface Config {
  api: {
    url: string
    timeout: number
    headers: {
      authorization: string
      contentType: string
    }
  }
  ui: {
    theme: string
    compact: boolean
  }
}

type PartialConfig = DeepPartial<Config>
// Result: {
//   api?: {
//     url?: string
//     timeout?: number
//     headers?: {
//       authorization?: string
//       contentType?: string
//     }
//   }
//   ui?: {
//     theme?: string
//     compact?: boolean
//   }
// }

// DeepRequired: Make all properties required recursively
type CompleteConfig = DeepRequired<PartialConfig>
// Result: Config (all properties required again)

// DeepReadonly: Make all properties readonly recursively
type ImmutableConfig = DeepReadonly<Config>
// Result: All properties and nested properties are readonly
```

### Factory Function Utilities

```typescript
import type {
  FactoryFunction,
  FactoryParameters,
  FactoryReturnType
} from './modules/types.js'

// Extract factory return type
const createCounter = (initialValue = 0) => ({
  count: initialValue,
  increment: () => {},
  decrement: () => {},
  reset: () => {}
})

type CounterInstance = FactoryReturnType<typeof createCounter>
// Result: {
//   count: number
//   increment: () => void
//   decrement: () => void
//   reset: () => void
// }

// Extract factory parameters
type CounterParams = FactoryParameters<typeof createCounter>
// Result: [initialValue?: number]

// Constrain factory function signature
const createValidModule: FactoryFunction<{
  init(): void
  destroy(): void
}> = () => ({
  init: () => console.log('initialized'),
  destroy: () => console.log('destroyed')
})
```

### Property Manipulation Types

```typescript
import type {
  FunctionProperties,
  NonFunctionProperties,
  PickOptional,
  PickRequired
} from './modules/types.js'

interface Module {
  name: string
  version: number
  enabled: boolean
  init(): void
  start(): void
  stop(): void
}

// Extract only function properties
type ModuleMethods = FunctionProperties<Module>
// Result: {
//   init(): void
//   start(): void
//   stop(): void
// }

// Extract only non-function properties
type ModuleState = NonFunctionProperties<Module>
// Result: {
//   name: string
//   version: number
//   enabled: boolean
// }

// Pick only required properties
interface OptionalConfig {
  host: string
  port?: number
  ssl?: boolean
  timeout?: number
}

type RequiredOnly = PickRequired<OptionalConfig>
// Result: { host: string }

type OptionalOnly = PickOptional<OptionalConfig>
// Result: { port?: number; ssl?: boolean; timeout?: number }
```

## Common Patterns

### Module with Events and Storage

```typescript
interface ModuleEvents extends EventMap {
  'state-changed': { newState: ModuleState; oldState: ModuleState }
  'error': { error: Error; context: string }
}

interface ModuleState {
  active: boolean
  data: string[]
}

const createModule = (): ModuleInstance => {
  // Private state
  let state: ModuleState = { active: false, data: [] }

  // Generic EventEmitter
  const eventEmitter = createEventEmitter<ModuleEvents>()

  // Generic storage
  const storage = createStorage(
    new LocalStorageAdapter<ModuleState>({
      validate: isModuleState,
      fallback: { active: false, data: [] }
    }),
    'moduleState'
  )

  // Load initial state
  const savedState = storage.load()
  if (savedState) {
    state = savedState
  }

  return {
    getState: () => ({ ...state }),

    setState: (newState: Partial<ModuleState>) => {
      const oldState = { ...state }
      state = { ...state, ...newState }

      // Save to storage
      storage.save(state)

      // Emit event
      eventEmitter.emit('state-changed', {
        newState: { ...state },
        oldState
      })
    },

    // EventEmitter methods
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    once: eventEmitter.once.bind(eventEmitter)
  }
}
```

### Cross-Module Communication

```typescript
// Module A
interface ModuleAEvents extends EventMap {
  'data-ready': { data: string[] }
}

const moduleA = createModuleA()

// Module B
interface ModuleBEvents extends EventMap {
  'processing-complete': { result: ProcessedData }
}

const moduleB = createModuleB()

// Type-safe cross-module communication
moduleA.on('data-ready', ({ data }) => {
  // Process data in module B
  moduleB.processData(data)
})

moduleB.on('processing-complete', ({ result }) => {
  // Use processed result in main app
  updateUI(result)
})
```

## Troubleshooting Guide

### Common TypeScript Errors

#### 1. "Type 'X' is not assignable to type 'EventMap'"

```typescript
// ❌ Wrong: Missing EventMap extension
interface MyEvents {
  'custom-event': { data: string }
}

// ✅ Correct: Extend EventMap
interface MyEvents extends EventMap {
  'custom-event': { data: string }
}
```

#### 2. "Property does not exist on type"

```typescript
// ❌ Wrong: Trying to access event-specific payload properties
eventEmitter.on('some-event', (data) => {
  console.log(data.specificProperty) // TypeScript error
})

// ✅ Correct: Type assertion or proper event map
interface MyEvents extends EventMap {
  'some-event': { specificProperty: string }
}

const typedEmitter = createEventEmitter<MyEvents>()
typedEmitter.on('some-event', (data) => {
  console.log(data.specificProperty) // Works!
})
```

#### 3. "Argument of type is not assignable to parameter"

```typescript
// ❌ Wrong: Missing required properties
eventEmitter.emit('user-login', { userId: 'test' }) // Missing timestamp

// ✅ Correct: Include all required properties
eventEmitter.emit('user-login', {
  userId: 'test',
  timestamp: new Date()
})
```

#### 4. "Generic type 'T' is not assignable"

```typescript
// ❌ Wrong: Storage adapter without proper constraints
const createStorage = <T>(adapter: StorageAdapter<T>) => {
  // ...
}

// ✅ Correct: Add appropriate constraints
const createStorage = <T extends Record<string, unknown>>(
  adapter: StorageAdapter<T>
) => {
  // ...
}
```

### Runtime Issues

#### 1. EventEmitter not triggering listeners

```typescript
// Check: Are you binding the context correctly?
// ❌ Wrong:
return {
  on: eventEmitter.on, // Loses context
}

// ✅ Correct:
return {
  on: eventEmitter.on.bind(eventEmitter),
}
```

#### 2. Storage validation failing

```typescript
// Check: Is your validator comprehensive?
const validate = (data: unknown): data is MyType => {
  // ❌ Too simple:
  return typeof data === 'object'

  // ✅ Comprehensive:
  return (
    typeof data === 'object' &&
    data !== null &&
    'requiredProperty' in data &&
    typeof (data as any).requiredProperty === 'string'
  )
}
```

#### 3. Memory leaks with event listeners

```typescript
// ❌ Wrong: Not cleaning up listeners
const setupListeners = () => {
  eventEmitter.on('event', handler)
}

// ✅ Correct: Clean up when done
const setupListeners = () => {
  eventEmitter.on('event', handler)

  return () => {
    eventEmitter.off('event', handler)
  }
}
```

### Performance Considerations

1. **EventEmitter Performance**: EventEmitters are lightweight, but remove unused listeners
2. **Storage Validation**: Complex validators can impact performance; cache validation results
3. **Generic Constraints**: TypeScript generics don't add runtime overhead
4. **Closure Memory**: Factory functions create closures; avoid capturing unnecessary variables

### Best Practices Summary

1. Always extend `EventMap` for event definitions
2. Use generic constraints (`<T extends SomeType>`) for type safety
3. Provide fallback values in storage validation options
4. Document generic parameters with JSDoc comments
5. Test generic behavior with comprehensive type safety tests
6. Use `createEventEmitter<T>()` for all event handling
7. Apply generic storage patterns for data persistence
8. Clean up event listeners to prevent memory leaks
9. Keep validators simple but comprehensive
10. Leverage utility types for complex transformations
