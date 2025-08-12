# GitHub Copilot Instructions for VBS

## Project Overview

VBS (View By Stardate) is a local-first Star Trek chronological viewing guide built with TypeScript, Vite, and vanilla DOM APIs. The app tracks viewing progress across 7 chronological eras spanning 22nd-32nd centuries using browser LocalStorage, with planned migration to IndexedDB for enhanced capabilities.

## Architecture Pattern

The project uses **functional factory patterns** with closures for state management and clear separation of concerns. This architecture was refactored from class-based patterns to eliminate `this` binding issues and enable better functional composition. The generic types system introduces type-safe EventEmitter systems and advanced TypeScript generics for enhanced developer experience.

### Functional Factory Architecture with Generic EventEmitters

- `createStarTrekViewingGuide` (main.ts): Main application factory coordinating all modules and DOM interactions
- `createProgressTracker`: Factory managing watched items state with generic EventEmitter (`ProgressTrackerEvents`)
- `createEpisodeTracker`: Factory for episode-level progress tracking with hierarchical calculations (`EpisodeTrackerEvents`)
- `createEpisodeManager`: Factory for episode filtering, search, and spoiler-safe content management (`EpisodeManagerEvents`)
- `createSearchFilter`: Factory handling real-time search with generic EventEmitter (`SearchFilterEvents`)
- `createTimelineRenderer`: Factory rendering era-based timeline with dependency injection
- `createElementsManager`: Factory for DOM element caching and management
- `createEventEmitter<T>`: Generic EventEmitter factory with type-safe event handling
- `storage.ts`: Generic storage utilities with EventEmitter notifications (`StorageEvents`)
- `migration.ts`: Data migration utilities for schema evolution and version management
- `progress-validation.ts`: Validation and error recovery for progress data integrity
- `themes.ts`: CSS custom properties system with Star Trek theming and auto-detection
- `preferences.ts`: User settings management with persistent storage
- `timeline-viz.ts`: Interactive timeline visualization with D3.js integration
- `streaming-api.ts`: Streaming service availability and content discovery

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

## Functional Composition Utilities

VBS includes a comprehensive functional composition utilities module (`src/utils/composition.ts`) with 3000+ lines of utilities for elegant data transformation pipelines. These utilities are actively integrated throughout the codebase.

### Core Composition Functions

- **`pipe()`**: Left-to-right function composition for intuitive data flow
- **`compose()`**: Right-to-left mathematical composition
- **`curry()`**: Partial application with automatic arity detection
- **`tap()`**: Side effects in pipelines without breaking type flow
- **`asyncPipe()` & `asyncCompose()`**: Async composition with Promise handling

### VBS-Specific Pipeline Builders

```typescript
// Specialized pipelines for Star Trek data processing
const searchPipeline = createSearchPipeline(starTrekData, {
  onFilterComplete: (filteredData, filterState) => updateUI(filteredData)
})

const progressPipeline = createProgressPipeline(allEras, {
  onProgressUpdate: (progress) => saveProgress(progress)
})

// Star Trek predicates and transformations
const activeShows = pipe(
  starTrekData,
  starTrekPredicates.byType('series'),
  starTrekTransformations.extractTitles,
  tap(titles => console.log('Active shows:', titles))
)
```

### Integrated Usage in Modules

Composition utilities are used throughout existing modules:

```typescript
// In progress.ts - Progress calculations
const calculateOverallProgress = (): ProgressData => {
  return pipe(
    starTrekData,
    eras => eras.reduce((sum, era) => sum + era.items.length, 0),
    totalItems => ({
      total: totalItems,
      completed: watchedItems.length,
      percentage: Math.round((watchedItems.length / totalItems) * 100)
    })
  )
}

// In search.ts - Filter matching
const matchesFilters = (item: StarTrekItem): boolean => {
  return pipe(
    item,
    item => {
      const matchesSearch = currentSearch ? starTrekPredicates.byText(currentSearch)(item) : true
      const matchesFilter = currentFilter ? starTrekPredicates.byType(currentFilter)(item) : true
      return matchesSearch && matchesFilter
    }
  )
}

// In timeline.ts - Curried event handlers
const updateEraExpansion = curry((isExpanded: boolean, eraId: string) => {
  // Toggle era display with functional composition
})
```

### Debugging and Development Tools

```typescript
// Debug pipe with performance tracking
const debugPipe = createDebugPipe({
  enableLogging: true,
  enableTiming: true,
  label: 'Star Trek Data Processing'
})

const [result, debugInfo] = debugPipe(
  starTrekData,
  starTrekTransformations.extractByEra('tos'),
  starTrekPredicates.byType('series'),
  tap(data => console.log('Intermediate result:', data))
)

// Specialized debug taps
const result = pipe(
  starTrekData,
  debugTap('After data load'),
  perfTap('Processing time'),
  conditionalTap(
    data => data.length > 100,
    data => console.warn('Large dataset detected')
  )
)
```

## Generic Type System

VBS implements a comprehensive generic type system that enhances the functional factory architecture with type-safe event handling, storage utilities, and advanced TypeScript patterns.

### Core Generic Patterns

- **Generic EventEmitter**: `createEventEmitter<TEventMap>()` for type-safe events with full listener management
- **Generic Storage**: `StorageAdapter<T>` with validation and fallback options
- **Utility Types**: 25+ types for factory functions, deep transformations, and constraints
- **Event Maps**: All modules use `EventMap` interface (`ProgressTrackerEvents`, `SearchFilterEvents`, `StorageEvents`)
- **Error Handling**: `withErrorHandling()` and `withSyncErrorHandling()` utilities for consistent error boundaries

### Key Implementation Details

```typescript
// Generic EventEmitter with type safety and full listener management
const eventEmitter = createEventEmitter<ProgressTrackerEvents>()
eventEmitter.emit('item-toggle', { itemId: 'tos_s1', isWatched: true })
eventEmitter.once('progress-update', (data) => console.log('One-time listener'))

// Generic storage with validation
const storage = createStorage(new LocalStorageAdapter<string[]>({ validate: isStringArray }))

// Error handling utilities for consistent error boundaries
const safeAsyncOperation = withErrorHandling(async () => {
  // risky async operation
})

// Generic constraints in factory functions
const createRenderer = <TContainer extends HTMLElement>(container: TContainer) => { ... }
```

**For comprehensive examples and usage patterns, see `docs/generic-types-examples.md`.**

## Theme System & CSS Custom Properties

VBS implements a comprehensive theme system using CSS custom properties for consistent Star Trek-inspired styling:

```typescript
// Theme management with auto-detection
const themeSystem = createThemeSystem(preferences)

// CSS custom properties for consistent theming
const THEME_PROPERTIES = {
  '--vbs-color-primary': 'Primary brand color',
  '--vbs-color-starfleet': 'Starfleet red accent color',
  '--vbs-bg-primary': 'Main background color',
  '--vbs-text-primary': 'Primary text color',
  // ... comprehensive design token system
}

// Theme switching with preference persistence
themeSystem.setTheme('dark') // 'light', 'dark', 'auto'
themeSystem.on('theme-change', (theme) => updateCSS(theme))
```

### Star Trek Design Tokens

The theme system includes Star Trek-specific design tokens:
- **Color palette**: Starfleet red, Enterprise blue, Deep Space Nine gold
- **Typography**: LCARS-inspired font stacks and sizing
- **Spacing**: Consistent spacing based on 8px grid system
- **Era-specific styling**: Visual cues for different Star Trek eras

## Component Architecture

VBS extends the functional factory pattern to UI components in `src/components/`:

```typescript
// Component factory with DOM management
const createTimelineControls = <TContainer extends HTMLElement>(
  container: TContainer,
  initialEvents: TimelineEvent[],
  initialConfig: Partial<TimelineConfig>
): TimelineControlsInstance => {
  // Private component state
  let config: TimelineConfig = { ...initialConfig }
  let filterOptions = extractFilterOptions(initialEvents)

  // DOM element creation and caching
  const elements = createComponentElements(container)

  // Event handling with composition utilities
  const handleFilterChange = curry((filterType: string, value: any) => {
    // Update config and emit events
  })

  return {
    updateEvents: (newEvents: TimelineEvent[]) => { /* */ },
    setConfig: (newConfig: Partial<TimelineConfig>) => { /* */ },
    destroy: () => cleanup(),
    on: eventEmitter.on.bind(eventEmitter),
    // ... full component API
  }
}
```

### Component Patterns

- **DOM element caching**: Components cache frequently accessed elements in closure
- **CSS class management**: Use CSS modules or scoped classes with `--vbs-` prefix
- **Event delegation**: Components use event delegation for performance
- **Cleanup handling**: All components provide `destroy()` method for proper cleanup
- **Responsive design**: Components adapt to container size using CSS custom properties

## Timeline Visualization

The timeline system provides interactive D3.js-based visualization:

```typescript
// Timeline with event filtering and zoom capabilities
const timeline = createTimelineVisualization(container, {
  events: timelineEvents,
  initialZoom: { start: 2151, end: 2400 }, // Enterprise to Voyager era
  showConnections: true,
  groupByEra: true
})

// Event interaction with composition utilities
const eventPipeline = pipe(
  timelineEvents,
  filterByEra(selectedEra),
  filterByImportance(minImportance),
  sortByStardate,
  tap(events => timeline.updateEvents(events))
)
```

### Timeline Event Structure

```typescript
interface TimelineEvent {
  id: string                    // 'dominion_war_start'
  title: string                 // 'Dominion War Begins'
  stardate: number             // 49011.4
  era: string                  // 'ds9'
  type: TimelineEventType      // 'war' | 'technology' | 'first_contact'
  importance: 'minor' | 'major' | 'critical'
  relatedItems: string[]       // Related episode/movie IDs
  description?: string         // Optional detailed description
}
```

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

## Component System Data Flow

VBS components follow a unidirectional data flow pattern with event-driven updates:

```typescript
// Main application coordinates component communication
const app = createStarTrekViewingGuide()

// Components receive data and emit events upward
const timelineControls = createTimelineControls(controlsContainer, events)
const timelineViz = createTimelineVisualization(vizContainer, events)

// Event coordination through main application
timelineControls.on('filter-change', (filters) => {
  const filteredEvents = applyFilters(events, filters)
  timelineViz.updateEvents(filteredEvents)
})

// Progress tracking integration
progressTracker.on('progress-update', () => {
  const updatedEvents = enrichEventsWithProgress(events, progressTracker)
  timelineViz.updateEvents(updatedEvents)
})
```

## Episode-Level Architecture

VBS implements hierarchical progress tracking with episode-level granularity:

### ID Convention Patterns

```typescript
// ID format patterns for validation and structure
const episodeId = 'tng_s3_e15'    // series_s{season}_e{episode}
const seasonId = 'tng_s3'         // series_s{season}
const seriesId = 'tng'            // series identifier

// Validation patterns
const EPISODE_ID_PATTERN = /^[a-z]+_s\d+_e\d+$/
const SEASON_ID_PATTERN = /^[a-z]+_s\d+$/
const SERIES_ID_PATTERN = /^[a-z]+(?:_s\d+)?$/
```

### Hierarchical Progress Tracking

```typescript
// Episode-level progress with hierarchical calculations
const episodeTracker = createEpisodeTracker()

// Track individual episodes
episodeTracker.toggleEpisode('tng_s3_e15')

// Calculate nested progress: episode → season → series → era
const seasonProgress = episodeTracker.getSeasonProgress('tng', 3)
const seriesProgress = episodeTracker.getSeriesProgress('tng')
```

### Data Migration & Versioning

```typescript
// Migration between schema versions
import { MIGRATION_VERSIONS, migratePipelineData } from './migration.js'

// Migrate from season-level to episode-level tracking
const migrationResult = await migratePipelineData(
  currentProgress,
  MIGRATION_VERSIONS.SEASON_LEVEL,
  MIGRATION_VERSIONS.EPISODE_LEVEL
)

// Migration state tracking with backup
const migrationState = getMigrationState()
// { currentVersion: '2.0', lastMigrated: '2025-08-07', backupData: [...] }
```

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

Use Vitest with factory function instantiation in `beforeEach` and comprehensive event testing:

```typescript
import type { ProgressTrackerInstance } from '../src/modules/types.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('ProgressTracker', () => {
  let progressTracker: ProgressTrackerInstance

  beforeEach(() => {
    progressTracker = createProgressTracker() // Factory function
  })

  it('should toggle items correctly', () => {
    progressTraker.toggleItem('ent_s1')
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

  it('should handle one-time listeners', () => {
    const mockListener = vi.fn()
    progressTracker.once('progress-update', mockListener)

    progressTracker.toggleItem('item1')
    progressTracker.toggleItem('item2')

    expect(mockListener).toHaveBeenCalledTimes(1)
  })
})
```

**Mock LocalStorage** for storage tests. Import modules using `.js` extensions (TypeScript ES modules). Test factory functions, not classes. Always test both successful operations and event emissions. Use `vi.fn()` for mocking event listeners and async operations.

### Episode Management & Validation Testing

Test episode-level functionality with hierarchical progress and validation:

```typescript
describe('EpisodeTracker', () => {
  let episodeTracker: EpisodeTrackerInstance

  beforeEach(() => {
    episodeTracker = createEpisodeTracker()
  })

  it('should track episodes with hierarchical progress', () => {
    episodeTracker.toggleEpisode('tng_s3_e15')

    const seasonProgress = episodeTracker.getSeasonProgress('tng', 3)
    expect(seasonProgress.episodesWatched).toContain('tng_s3_e15')

    const seriesProgress = episodeTracker.getSeriesProgress('tng')
    expect(seriesProgress.totalEpisodes).toBeGreaterThan(0)
  })

  it('should validate episode ID formats', () => {
    expect(isValidEpisodeId('tng_s3_e15')).toBe(true)
    expect(isValidEpisodeId('invalid_id')).toBe(false)
  })

  it('should handle data migration', async () => {
    const result = await migratePipelineData(
      ['tng_s3'], // Season-level data
      MIGRATION_VERSIONS.SEASON_LEVEL,
      MIGRATION_VERSIONS.EPISODE_LEVEL
    )
    expect(result.success).toBe(true)
    expect(result.migratedItems.length).toBeGreaterThan(0)
  })
})

describe('EpisodeManager', () => {
  it('should filter episodes with spoiler safety', () => {
    const episodeManager = createEpisodeManager()

    episodeManager.setFilterCriteria({
      seriesId: 'tng',
      spoilerLevel: 'safe'
    })

    const mockListener = vi.fn()
    episodeManager.on('filter-change', mockListener)

    expect(mockListener).toHaveBeenCalledWith({
      filteredEpisodes: expect.arrayContaining([
        expect.objectContaining({ spoilerLevel: 'safe' })
      ])
    })
  })
})
```

### Composition Utilities Testing

Test functional composition utilities with comprehensive type safety and integration testing:

```typescript
describe('Functional Composition', () => {
  it('should pipe data through transformation chain', () => {
    const result = pipe(
      [1, 2, 3, 4, 5],
      (arr: number[]) => arr.filter(n => n > 2),
      (arr: number[]) => arr.map(n => n * 2),
      (arr: number[]) => arr.reduce((sum, n) => sum + n, 0)
    )
    expect(result).toBe(24) // [3, 4, 5] -> [6, 8, 10] -> 24
  })

  it('should handle curried functions', () => {
    const add = curry((a: number, b: number, c: number) => a + b + c)
    const add10 = add(10)
    const add10and5 = add10(5)
    expect(add10and5(3)).toBe(18)
  })

  it('should use tap for side effects', () => {
    const sideEffect = vi.fn()
    const result = pipe(
      'test',
      tap(sideEffect),
      (s: string) => s.toUpperCase()
    )
    expect(sideEffect).toHaveBeenCalledWith('test')
    expect(result).toBe('TEST')
  })

  it('should integrate with Star Trek data pipelines', () => {
    const mockData = [{ id: 'tos', title: 'Original Series', items: [] }]
    const pipeline = createProgressPipeline(mockData, {
      onProgressUpdate: vi.fn()
    })
    expect(typeof pipeline).toBe('function')
  })
})
```

### Error Handling Testing

```typescript
// Test composition error boundaries
it('should handle errors in composition chains', () => {
  const safeOperation = compositionErrorBoundary(
    [
      (x: number) => x * 2,
      () => { throw new Error('Test error') },
      (x: number) => x + 1
    ],
    { fallbackValue: -1, enableLogging: false }
  )

  expect(safeOperation(5)).toBe(-1)
})
```

## Code Style Specifics

- **Single quotes** for all string literals
- **Optional chaining** (`?.`) and nullish coalescing (`??`) everywhere
- **Explicit return types** on public methods
- **Avoid `any`** - use `unknown` with type guards instead
- **Generic constraints**: Use `<T extends SomeType>` for type-safe factory functions
- **EventEmitter pattern**: Provide modern EventEmitter methods for enhanced type safety
- **Error handling**: Always handle async operations with meaningful error messages
- **Type-safe events**: Use generic EventEmitter with defined event maps (`ProgressTrackerEvents`, `SearchFilterEvents`, etc.)
- **Functional composition**: Use `pipe()` for left-to-right data flow, `compose()` for mathematical composition
- **Reusable predicates**: Create curried functions with `curry()` for partial application patterns
- **Side effects**: Use `tap()` for logging/debugging without breaking composition chains
- **Error boundaries**: Wrap risky operations with `compositionErrorBoundary()` or `tryCatch()`

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

**Episode ID validation**: Use predefined patterns for episode (`tng_s3_e15`), season (`tng_s3`), and series (`tng`) IDs with validation utilities.

**Hierarchical progress**: Calculate progress at multiple levels (episode → season → series → era) using composition utilities.

**Data migration**: Version progress data with migration utilities and backup mechanisms for schema evolution.

**Spoiler-safe filtering**: Progressive disclosure of episode content based on user preferences and spoiler levels.

**Error recovery**: Validate and sanitize corrupted progress data with graceful fallbacks and user notifications.

**Event handling**: Factories provide modern EventEmitter methods (`on`, `off`, `once`) for enhanced type safety.

**Generic storage operations**: Use `createStorage<T>()` with `StorageAdapter<T>` for type-safe storage with validation and EventEmitter notifications.

**Functional composition patterns**: Use `pipe()` for intuitive left-to-right data flow, `curry()` for reusable predicates, and VBS-specific pipeline builders (`createSearchPipeline`, `createProgressPipeline`) for complex transformations.

## Extension Points

When adding features, consider these integration points:

- **New content types**: Extend the `type` field in `StarTrekItem` and update filtering logic
- **New progress metrics**: Extend `ProgressData` interface and update calculation methods
- **New export formats**: Add handlers in `storage.ts` alongside existing JSON export
- **Timeline visualization**: The factory functions are designed for extension with chart libraries
- **Episode metadata**: Add new fields to `Episode` interface for enhanced episode tracking
- **Migration strategies**: Extend `migration.ts` with new version handlers for schema evolution
- **Validation rules**: Add new validation patterns in `progress-validation.ts` for data integrity
- **Spoiler management**: Extend spoiler-safe filtering with new content classification levels
- **Composition pipelines**: Create new pipeline builders using `createPipeline()` for domain-specific transformations
- **Debug utilities**: Use `debugTap()`, `perfTap()`, and `createDebugPipe()` for development and troubleshooting

## Planned Major Features

VBS has comprehensive implementation plans for major feature expansions:

### Episode-Level Tracking (Implemented)
- ✅ Individual episode progress with hierarchical tracking (episode → season → series → era)
- ✅ Episode management with advanced filtering, search, and spoiler-safe content
- ✅ Data migration system with version management and backup capabilities
- ✅ Progress validation and error recovery utilities
- 🚧 Episode metadata expansion: Enhanced plot points, guest stars, and cross-references

### Advanced Features (Planned)
- **Interactive Timeline**: D3.js chronological visualization with zoom/pan ✅ **Implemented**
- **User Preferences**: Dark/light themes, compact view, accessibility settings ✅ **Implemented**
- **Streaming Integration**: Paramount+/Netflix availability via APIs ✅ **Implemented**
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
- Integrate functional composition utilities for elegant data transformation pipelines
- Use debugging utilities (`debugTap`, `createDebugPipe`) for development and troubleshooting
- Follow ID validation patterns for data integrity (`isValidEpisodeId`, `isValidSeasonId`)
- Implement migration strategies for schema changes using `migration.ts` utilities
- Use spoiler-safe progressive disclosure for sensitive content
