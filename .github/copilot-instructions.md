# GitHub Copilot Instructions for VBS

## Project Overview

VBS (View By Stardate) is a local-first Star Trek chronological viewing guide built with TypeScript, Vite, and vanilla DOM APIs. The app tracks viewing progress across 7 chronological eras spanning 22nd-32nd centuries using browser LocalStorage, with planned migration to IndexedDB for enhanced capabilities.

## Architecture Pattern

The project uses **functional factory patterns** with closures for state management and clear separation of concerns. This architecture was recently refactored from class-based patterns (July 2025) to eliminate `this` binding issues and enable better functional composition. A major generic types refactoring (August 2025) introduced type-safe EventEmitter systems and advanced TypeScript generics.

### Functional Factory Architecture with Generic EventEmitters

- `createStarTrekViewingGuide` (main.ts): Main application factory coordinating all modules and DOM interactions
- `createProgressTracker`: Factory managing watched items state with generic EventEmitter (`ProgressTrackerEvents`)
- `createSearchFilter`: Factory handling real-time search with generic EventEmitter (`SearchFilterEvents`)
- `createTimelineRenderer`: Factory rendering era-based timeline with dependency injection
- `createElementsManager`: Factory for DOM element caching and management
- `createEventEmitter<T>`: Generic EventEmitter factory with type-safe event handling
- `storage.ts`: Generic storage utilities with EventEmitter notifications (`StorageEvents`)

### Factory Function Pattern

**Factory functions with closures** for private state management:

```typescript
// Factory function with closure-based state and generic EventEmitter integration
export const createProgressTracker = (): ProgressTrackerInstance => {
  // Private state in closure
  let watchedItems: string[] = []

  // Generic EventEmitter for type-safe events
  const eventEmitter = createEventEmitter<ProgressTrackerEvents>()

  // Return public API with modern event handling
  return {
    toggleItem: (itemId: string) => {
      // Mutate closure state
      const newState = !watchedItems.includes(itemId)

      // Emit via generic EventEmitter (type-safe)
      eventEmitter.emit('item-toggle', { itemId, isWatched: newState })
    },

    // Generic EventEmitter methods (type-safe)
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    once: eventEmitter.once.bind(eventEmitter)
  }
}

// Dependency injection with generic constraints
const createTimelineRenderer = <TContainer extends HTMLElement>(
  container: TContainer,
  progressTracker: ProgressTrackerInstance
): TimelineRendererInstance => {
  // Use injected dependency in closure with type safety
  const isWatched = (itemId: string) => progressTracker.isWatched(itemId)
  // ... rest of implementation
}
```

**Key principles**: Closure-based state, generic EventEmitters for type safety, dependency injection, no `this` binding issues.

## Generic Type System

VBS implements a comprehensive generic type system (August 2025 refactoring) that enhances the functional factory architecture with type-safe event handling, storage utilities, and advanced TypeScript patterns.

### Core Generic Patterns

- **Generic EventEmitter**: `createEventEmitter<TEventMap>()` for type-safe events
- **Generic Storage**: `StorageAdapter<T>` with validation and fallback options
- **Utility Types**: 25+ types for factory functions, deep transformations, and constraints
- **Event Maps**: All modules use `EventMap` interface (`ProgressTrackerEvents`, `SearchFilterEvents`, `StorageEvents`)

### Key Implementation Details

```typescript
// Generic EventEmitter with type safety
const eventEmitter = createEventEmitter<ProgressTrackerEvents>()
eventEmitter.emit('item-toggle', { itemId: 'tos_s1', isWatched: true })

// Generic storage with validation
const storage = createStorage(new LocalStorageAdapter<string[]>({ validate: isStringArray }))

// Generic constraints in factory functions
const createRenderer = <TContainer extends HTMLElement>(container: TContainer) => { ... }
```

**For comprehensive examples and usage patterns, see `docs/generic-types-examples.md`.**

## Data Structure

The core data lives in `src/data/star-trek-data.ts` - a 570-line structured dataset:

```typescript
// Era -> Items hierarchy
interface StarTrekEra {
  id: string        // e.g., 'enterprise', 'discovery'
  title: string     // "22nd Century – Enterprise Era"
  items: StarTrekItem[]
}

interface StarTrekItem {
  id: string        // e.g., 'ent_s1', 'tos_tmp'
  type: string      // 'series', 'movie', 'animated'
  stardate: string  // "~1.1-1.26" or "Stardate 7410.2"
}
```

**Critical**: Item IDs must be unique across all eras for progress tracking. When adding content, follow existing ID patterns.

## Development Workflow

```bash
pnpm dev          # Vite dev server (port 3000)
pnpm test         # Vitest unit tests
pnpm test:ui      # Visual test runner
pnpm test:coverage # Coverage reports
pnpm build        # TypeScript + Vite production build
pnpm lint         # ESLint with @bfra.me/eslint-config
pnpm fix          # Auto-fix linting issues
```

**Build target**: `/vbs/` base path for GitHub Pages deployment.

## Git Workflow & Pre-commit Hooks

VBS uses automated Git pre-commit hooks to enforce code quality and formatting before every commit. This is managed by [simple-git-hooks](https://github.com/toplenboren/simple-git-hooks) and [lint-staged](https://github.com/lint-staged/lint-staged).

- **Pre-commit hook runs automatically** on all staged files matching supported extensions (.ts, .js, .json, .md, .css, .yaml, .yml) before every commit.
- **ESLint with Prettier**: The hook runs `eslint --fix` (using the project's ESLint and Prettier config) to auto-fix and check code style issues.
- **Commit blocking**: If any linting errors cannot be auto-fixed, the commit is blocked and errors are shown in the terminal. Fix issues and re-stage files before retrying.
- **Performance**: Only staged files are processed for speed.
- **No interference**: The hook does not run tests or affect the Vitest runner.

### Bypassing Hooks (Emergency Only)

If you must bypass the pre-commit hook (e.g., for an emergency hotfix), use:

```bash
git commit --no-verify
```

> **Warning:** Only bypass hooks for emergencies. All code must pass linting and formatting before merging to `main`.

## Testing Patterns

Use Vitest with factory function instantiation in `beforeEach`:

```typescript
describe('ProgressTracker', () => {
  let progressTracker: ProgressTrackerInstance

  beforeEach(() => {
    progressTracker = createProgressTracker() // Factory function
  })

  it('should toggle items correctly', () => {
    progressTracker.toggleItem('ent_s1')
    expect(progressTracker.isWatched('ent_s1')).toBe(true)
  })

  it('should emit type-safe events', () => {
    const mockListener = vi.fn()
    progressTracker.on('item-toggle', mockListener)

    progressTracker.toggleItem('tos_s1')

    expect(mockListener).toHaveBeenCalledWith({
      itemId: 'tos_s1',
      isWatched: true
    })
  })
})
```

**Mock LocalStorage** for storage tests. Import modules using `.js` extensions (TypeScript ES modules). Test factory functions, not classes.

## Code Style Specifics

- **Single quotes** for all string literals
- **Optional chaining** (`?.`) and nullish coalescing (`??`) everywhere
- **Explicit return types** on public methods
- **Avoid `any`** - use `unknown` with type guards instead
- **Generic constraints**: Use `<T extends SomeType>` for type-safe factory functions
- **EventEmitter pattern**: Provide modern EventEmitter methods for enhanced type safety
- **Error handling**: Always handle async operations with meaningful error messages
- **Type-safe events**: Use generic EventEmitter with defined event maps (`ProgressTrackerEvents`, `SearchFilterEvents`, etc.)

## LocalStorage Schema

Progress data structure for import/export functionality:

```typescript
interface ProgressExportData {
  version: string      // "1.0"
  timestamp: string    // ISO string
  progress: string[]   // Array of watched item IDs
}
```

**Key insight**: Progress is stored as a flat array of item IDs, not nested by era.

## Common Patterns

**DOM element caching**: All frequently accessed elements are cached in the main application's `elements` object on initialization.

**Event delegation**: Use event listeners on containers rather than individual items for performance.

**Progress calculation**: Total progress is calculated by counting watched items across all eras, not just within individual eras.

**Event handling**: Factories provide modern EventEmitter methods (`on`, `off`, `once`) for enhanced type safety.

**Generic storage operations**: Use `createStorage<T>()` with `StorageAdapter<T>` for type-safe storage with validation and EventEmitter notifications.

## Extension Points

When adding features, consider these integration points:

- **New content types**: Extend the `type` field in `StarTrekItem` and update filtering logic
- **New progress metrics**: Extend `ProgressData` interface and update calculation methods
- **New export formats**: Add handlers in `storage.ts` alongside existing JSON export
- **Timeline visualization**: The factory functions are designed for extension with chart libraries

## Planned Major Features

VBS has comprehensive implementation plans for major feature expansions:

### Episode-Level Tracking (Planned)
- Individual episode progress vs current season-level tracking
- Episode metadata: title, air date, synopsis, plot points, guest stars, connections
- Hierarchical progress: episode → season → series → era
- New interfaces: `Episode`, `EpisodeProgress`, `SeasonProgress`
- Migration system from current season-based progress

### Advanced Features (Planned)
- **Interactive Timeline**: D3.js chronological visualization with zoom/pan
- **User Preferences**: Dark/light themes, compact view, accessibility settings
- **Streaming Integration**: Paramount+/Netflix availability via APIs
- **Local-First Architecture**: Service Workers + IndexedDB replacing LocalStorage
- **PWA Capabilities**: Offline support, app installation, background sync

### Integration Guidelines for New Features
- Extend existing factory functions rather than creating new architectures
- Use IndexedDB for complex data, LocalStorage for simple preferences
- Follow closure-based state management patterns
- Implement proper TypeScript interfaces in `types.ts`
- Add comprehensive Vitest tests for all new functionality
- Use generic EventEmitter for type-safe event handling
- Leverage generic storage utilities for data persistence with validation
