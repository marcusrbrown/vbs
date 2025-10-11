# GitHub Copilot Instructions for VBS

> **Purpose**: Guide AI coding agents in contributing to VBS following established architectural patterns, security practices, and code quality standards.

## Quick Reference

**Architecture**: Functional factory patterns with closures | **Testing**: Vitest with factory instantiation | **Style**: TypeScript strict mode with single quotes | **Build**: Vite with `/vbs/` base path

**Key Principles**: Type safety · Functional composition · Generic EventEmitters · No `this` binding · Closure-based state

## Project Overview

VBS (View By Stardate) is a local-first Star Trek chronological viewing guide built with TypeScript, Vite, and vanilla DOM APIs. The app tracks viewing progress across 7 chronological eras spanning 22nd-32nd centuries using browser LocalStorage, with planned migration to IndexedDB for enhanced capabilities.

**Core Features**: Episode progress tracking · Timeline visualization (D3.js) · Metadata enrichment (Memory Alpha, TMDB) · Theme system · Streaming integration

## Architecture Pattern

The project uses **functional factory patterns** with closures for state management and clear separation of concerns. This architecture was refactored from class-based patterns to eliminate `this` binding issues and enable better functional composition. The generic types system introduces type-safe EventEmitter systems and advanced TypeScript generics for enhanced developer experience.

### Functional Factory Architecture with Generic EventEmitters

**Core Application & State Management:**
- `createStarTrekViewingGuide` (main.ts): Main application factory coordinating all modules and DOM interactions
- `createProgressTracker` (progress.ts): Factory managing watched items state with generic EventEmitter (`ProgressTrackerEvents`)
- `createEpisodeTracker` (episode-tracker.ts): Factory for episode-level progress tracking with hierarchical calculations (`EpisodeTrackerEvents`)
- `createEpisodeManager` (episodes.ts): Factory for episode filtering, search, and spoiler-safe content management (`EpisodeManagerEvents`)
- `createSearchFilter` (search.ts): Factory handling real-time search with generic EventEmitter (`SearchFilterEvents`)

**UI & Visualization:**
- `createTimelineRenderer` (timeline.ts): Factory rendering era-based timeline with dependency injection
- `createTimelineVisualization` (timeline-viz.ts): Interactive timeline visualization with D3.js integration
- `createElementsManager`: Factory for DOM element caching and management

**Settings & Preferences:**
- `createSettingsManager` (settings-manager.ts): Centralized settings coordination with validation, persistence, and UI synchronization
- `createPreferences` (preferences.ts): User settings management with persistent storage
- `createThemeSystem` (themes.ts): CSS custom properties system with Star Trek theming and auto-detection

**Metadata & External Integration:**
- `createMetadataSources` (metadata-sources.ts): External API integration for episode metadata enrichment
- `createMetadataStorage` (metadata-storage.ts): Persistent storage layer for cached episode metadata
- `createMetadataQueue` (metadata-queue.ts): Request queue management with rate limiting
- `createMetadataScheduler` (metadata-scheduler.ts): Background scheduling system for metadata updates
- `createStreamingApi` (streaming-api.ts): Streaming service availability and content discovery
- `createCacheWarming` (cache-warming.ts): Proactive caching utilities for metadata and content preloading

**Core Utilities:**
- `createEventEmitter<T>` (events.ts): Generic EventEmitter factory with type-safe event handling
- `createLogger` (logger.ts): Generic logging utility with configurable levels, filtering, metrics, and persistence
- `createStorage` (storage.ts): Generic storage utilities with EventEmitter notifications (`StorageEvents`)
- `migration.ts`: Data migration utilities for schema evolution and version management
- `progress-validation.ts`: Validation and error recovery for progress data integrity
- `error-handler.ts`: Centralized error management with `withErrorHandling()` and `withSyncErrorHandling()` wrappers

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
- **Generic Logger**: `createLogger(config)` for domain-agnostic logging with configurable levels, filtering, and metrics
- **Generic Storage**: `StorageAdapter<T>` with validation and fallback options
- **Utility Types**: 25+ types for factory functions, deep transformations, and constraints
- **Event Maps**: All modules use `EventMap` interface (`ProgressTrackerEvents`, `SearchFilterEvents`, `StorageEvents`, `LoggerEvents`)
- **Error Handling**: `withErrorHandling()` and `withSyncErrorHandling()` utilities for consistent error boundaries

### Key Implementation Details

```typescript
// Generic EventEmitter with type safety and full listener management
const eventEmitter = createEventEmitter<ProgressTrackerEvents>()
eventEmitter.emit('item-toggle', { itemId: 'tos_s1', isWatched: true })
eventEmitter.once('progress-update', (data) => console.log('One-time listener'))

// Generic logger for any domain (metadata, user actions, API calls, etc.)
const metadataLogger = createLogger({
  minLevel: 'info',
  enabledCategories: ['metadata', 'api'],
  enableMetrics: true,
})
metadataLogger.info('Operation complete', { durationMs: 123, episodeId: 'tos_s1_e1' })
const metrics = metadataLogger.getMetrics() // Success rates, p95 latency, etc.

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

VBS extends the functional factory pattern to UI components in `src/components/` with co-located CSS files:

**Timeline & Visualization Components:**
- `createTimelineControls` (timeline-controls.ts): Interactive controls for timeline navigation and filtering
- `createTimelineVisualization` (timeline-viz.ts): D3.js-based timeline rendering with zoom and pan

**Streaming Service Components:**
- `createStreamingIndicators` (streaming-indicators.ts): UI components showing streaming service availability
- `createStreamingPreferences` (streaming-preferences.ts): User interface for streaming service configuration

**Metadata Management Components:**
- `createMetadataDebugPanel` (metadata-debug-panel.ts): Developer tool for inspecting and debugging metadata operations
- `createMetadataExpertMode` (metadata-expert-mode.ts): Advanced metadata management interface for power users
- `createMetadataPreferences` (metadata-preferences.ts): User interface for configuring metadata enrichment preferences
- `createMetadataQualityIndicator` (metadata-quality-indicator.ts): Visual indicator for metadata completeness and quality scores
- `createMetadataSourceAttribution` (metadata-source-attribution.ts): Display component for metadata source attribution and licensing
- `createMetadataSyncStatus` (metadata-sync-status.ts): Real-time synchronization status indicator for metadata operations
- `createMetadataUsageControls` (metadata-usage-controls.ts): UI controls for managing metadata fetching and caching behavior

**Utility Components:**
- `createMigrationProgress` (migration-progress.ts): Progress indicator component for data migration operations

### Component Patterns
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

**Key Patterns:**
- **DOM element caching**: Components cache frequently accessed elements in closure
- **Co-located CSS**: Each component has a matching `.css` file (e.g., `timeline-controls.ts` + `timeline-controls.css`)
- **CSS class management**: Use scoped classes with `--vbs-` prefix for CSS custom properties
- **Event delegation**: Components use event delegation for performance
- **Cleanup handling**: All components provide `destroy()` method for proper cleanup
- **Responsive design**: Components adapt to container size using CSS custom properties

## Service Worker & PWA

VBS implements Progressive Web App capabilities with a Service Worker for offline support and background synchronization:
```typescript
// Service Worker registration in main.ts
const registerServiceWorker = async (): Promise<void> => {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.register('/vbs/sw.js', {
      scope: '/vbs/',
    })

    // Detect Background Sync API support
    await detectBackgroundSyncSupport(registration)
  }
}

// Background sync detection with graceful degradation
const detectBackgroundSyncSupport = async (
  registration: ServiceWorkerRegistration
): Promise<void> => {
  // Check for Background Sync API availability
  // Falls back to immediate execution, polling, manual sync, or disabled based on capability
}
```

### PWA Features

- **Service Worker**: Registered at `/vbs/sw.js` with `/vbs/` scope for GitHub Pages deployment
- **Background Sync**: Automatic metadata enrichment when network is available
- **Fallback Strategies**: Graceful degradation when Background Sync unavailable:
  - `immediate`: Execute metadata operations immediately
  - `polling`: Use polling-based background updates
  - `manual`: Require manual sync trigger
  - `disabled`: Metadata sync completely disabled
- **Update Detection**: Automatic detection of new service worker versions with user notification

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

## CLI Scripts & Utilities

VBS includes CLI scripts in `scripts/` for data validation, metadata management, and code generation.

### Shared CLI Utilities (`scripts/lib/cli-utils.ts`)

Reusable utilities for building command-line tools:

```typescript
import {
  loadEnv,
  parseBooleanFlag,
  parseStringValue,
  parseNumericValue,
  validateRequiredOptions,
  showHelpAndExit,
  showErrorAndExit,
  createProgressIndicator,
  formatTable,
  EXIT_CODES
} from './lib/cli-utils.js'

// Environment loading (always call first in scripts)
loadEnv()  // Silent by default
loadEnv({verbose: true})  // Log loading status
loadEnv({required: true})  // Exit if .env missing

// Argument parsing
const verbose = parseBooleanFlag(args, '--verbose')
const series = parseStringValue(args, '--series')
const season = parseNumericValue(args, '--season')

// Validation
validateRequiredOptions({series, season}, ['series'])  // Throws if missing

// Exit codes
process.exit(EXIT_CODES.SUCCESS)  // 0
process.exit(EXIT_CODES.VALIDATION_ERROR)  // 1
process.exit(EXIT_CODES.INVALID_ARGUMENTS)  // 3
```

### Script Development Pattern

```typescript
import {loadEnv} from './lib/cli-utils.js'

// Load environment variables first
loadEnv()

// Parse arguments
const options = parseArguments()

// Main execution
async function main(): Promise<void> {
  try {
    // Script logic
  } catch (error: Error) {
    console.error('Fatal error:', error.message)
    process.exit(EXIT_CODES.FATAL_ERROR)
  }
}

main().catch((error: Error) => {
  console.error('Unhandled error:', error.message)
  process.exit(EXIT_CODES.FATAL_ERROR)
})
```

### Metadata Source Configuration

Scripts use `scripts/lib/source-config.ts` for consistent API initialization:

```typescript
import {
  initializeMetadataSources,
  logMetadataSourceStatus,
  checkMetadataAvailability
} from './lib/source-config.js'

// Initialize with automatic credential detection
const metadataSources = initializeMetadataSources()

// Log which sources are available
logMetadataSourceStatus()
// Output:
//   TMDB: ✓ Available
//   Memory Alpha: ✓ Available
//   TrekCore: ✓ Available
//   STAPI: ✓ Available

// Check availability programmatically
const availability = checkMetadataAvailability()
if (availability.tmdb) {
  // Use TMDB features
}
```

**Key Patterns:**
- Always call `loadEnv()` before accessing `process.env`
- Use `EXIT_CODES` constants for consistent exit codes
- Gracefully handle missing API credentials with fallbacks
- Use `console.error()` for status messages (keeps stdout clean for JSON output)
- Implement `--help` flag using `showHelpAndExit()`

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

### Environment Configuration

VBS uses **dotenv** for managing API credentials and configuration in development:

```bash
# Setup environment (first time only)
cp .env.example .env
# Edit .env with your API keys (TMDB_API_KEY, etc.)
```

**Environment Variables:**
- `TMDB_API_KEY` - The Movie Database API key (optional, enables enhanced metadata)
- See `docs/environment-variables.md` for complete documentation

**Loading in Scripts:**
```typescript
import {loadEnv} from './lib/cli-utils.js'

// Load .env file at script start (optional, silent if missing)
loadEnv()

// Or with verbose logging
loadEnv({verbose: true})

// Or require .env file (exit if missing)
loadEnv({required: true})

// Access environment variables
const tmdbKey = process.env.TMDB_API_KEY
```

**Key Patterns:**
- Scripts automatically load `.env` via `loadEnv()` utility
- Graceful fallback when credentials missing (metadata sources work without API keys)
- `.env` files excluded from git (never commit credentials)
- Use `<API_KEY>` placeholders in examples and documentation

### Package Manager Commands

```bash
pnpm dev           # Vite dev server (port 3000)
pnpm test          # Vitest unit tests
pnpm test:ui       # Visual test runner
pnpm test:coverage # Coverage reports with @vitest/coverage-v8
pnpm build         # TypeScript compilation + Vite production build
pnpm lint          # ESLint with @bfra.me/eslint-config
pnpm fix           # Auto-fix linting issues
pnpm type-check    # TypeScript type checking without emit
pnpm preview       # Preview production build (port 4173)
```

**Package Manager**: This project uses pnpm@10.18.1 with workspace support. Always use `pnpm` commands, not `npm` or `yarn`.

**Build Configuration**:
- **Base path**: `/vbs/` for GitHub Pages deployment
- **Manual chunking**: Data layer (`star-trek-data.ts`) bundled separately for optimal caching
- **Source maps**: Enabled for production debugging
- **Dev server**: Port 3000 with auto-open browser
- **Preview server**: Port 4173 for production build testing

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

**Mock LocalStorage** for storage tests. **CRITICAL**: Import modules using `.js` extensions (TypeScript ES modules) - this is required for proper module resolution. Test factory functions, not classes. Always test both successful operations and event emissions. Use `vi.fn()` for mocking event listeners and async operations.

### Environment Variable Testing

Test code that depends on environment variables with proper isolation:

```typescript
import {afterEach, beforeEach, describe, expect, it} from 'vitest'

describe('API Integration', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = {...process.env}
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should use TMDB when API key is configured', () => {
    process.env.TMDB_API_KEY = 'test-key-123'
    // Test with credentials
  })

  it('should fallback when API key is missing', () => {
    delete process.env.TMDB_API_KEY
    // Test graceful fallback
  })
})
```

**Key patterns**: Save/restore `process.env` in before/after hooks, test both with and without credentials, verify graceful fallbacks.

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

### Required Patterns
- **CRITICAL: `.js` extensions in imports**: TypeScript ES modules require `.js` extensions for proper module resolution
  ```typescript
  // ✅ CORRECT - Always use .js extension
  import {createProgressTracker} from './progress.js'
  import {loadEnv} from '../lib/cli-utils.js'

  // ❌ WRONG - Missing .js extension will cause runtime errors
  import {createProgressTracker} from './progress'
  import {loadEnv} from '../lib/cli-utils'
  ```
- **Single quotes** for all string literals
- **Optional chaining** (`?.`) and nullish coalescing (`??`) for safe property access
- **Explicit return types** on all public methods and exported functions
- **Generic constraints**: Use `<T extends SomeType>` for type-safe factory functions
- **Type-safe events**: Use generic EventEmitter with defined event maps (`ProgressTrackerEvents`, `SearchFilterEvents`)
- **Functional composition**: Use `pipe()` for left-to-right data flow, `curry()` for reusable predicates
- **Error boundaries**: Wrap async operations with `withErrorHandling()` or `withSyncErrorHandling()`

### Anti-Patterns to Avoid
- ❌ **Never use `any`** - use `unknown` with type guards or proper types
- ❌ **No class-based patterns** - use functional factories with closures instead
- ❌ **No `this` binding** - rely on closure scope for state management
- ❌ **No hardcoded credentials** - use runtime configuration for API keys
- ❌ **No inline styles** - use CSS custom properties and theme system
- ❌ **No direct DOM manipulation outside components** - use component factories
- ❌ **No synchronous localStorage writes in loops** - batch operations
- ❌ **No missing cleanup** - all components must provide `destroy()` method

### Accessibility Requirements
- ✅ **Semantic HTML**: Use appropriate ARIA labels and roles
- ✅ **Keyboard navigation**: Ensure all interactive elements are keyboard accessible
- ✅ **Screen reader support**: Provide meaningful `aria-label` and `aria-describedby` attributes
- ✅ **Focus management**: Implement visible focus indicators with `:focus-visible`
- ✅ **Color contrast**: Maintain WCAG AA standards (4.5:1 for normal text)

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

- **DOM element caching**: All frequently accessed elements are cached in the main application's `elements` object on initialization.
- **Event delegation**: Use event listeners on containers rather than individual items for performance.
- **Progress calculation**: Total progress is calculated by counting watched items across all eras, not just within individual eras.
- **Episode ID validation**: Use predefined patterns for episode (`tng_s3_e15`), season (`tng_s3`), and series (`tng`) IDs with validation utilities.
- **Hierarchical progress**: Calculate progress at multiple levels (episode → season → series → era) using composition utilities.
- **Data migration**: Version progress data with migration utilities and backup mechanisms for schema evolution.
- **Spoiler-safe filtering**: Progressive disclosure of episode content based on user preferences and spoiler levels.
- **Error recovery**: Validate and sanitize corrupted progress data with graceful fallbacks and user notifications.
- **Event handling**: Factories provide modern EventEmitter methods (`on`, `off`, `once`) for enhanced type safety.
- **Generic storage operations**: Use `createStorage<T>()` with `StorageAdapter<T>` for type-safe storage with validation and EventEmitter notifications.
- **Functional composition patterns**: Use `pipe()` for intuitive left-to-right data flow, `curry()` for reusable predicates, and VBS-specific pipeline builders (`createSearchPipeline`, `createProgressPipeline`) for complex transformations.
- **Metadata enrichment pipelines**: Combine multiple sources with conflict resolution and quality validation using functional composition:
```typescript
const enrichedMetadata = await pipe(
  episodeId,
  (id) => metadataSources.fetchFromAllSources(id),
  (responses) => conflictResolution.resolveAll(responses),
  (resolved) => metadataQuality.validateAndScore(resolved),
  tap((metadata) => metadataStorage.cacheWithTTL(metadata))
)
```

## Extension Points

When adding features, consider these integration points:

- **New content types**: Extend the `type` field in `StarTrekItem` and update filtering logic
- **New progress metrics**: Extend `ProgressData` interface and update calculation methods
- **New export formats**: Add handlers in `storage.ts` alongside existing JSON export
- **Timeline visualization**: The factory functions are designed for extension with chart libraries
- **Episode metadata**: Add new fields to `Episode` interface for enhanced episode tracking
- **Metadata sources**: Add new API integrations in `metadata-sources.ts` following existing token bucket rate limiting pattern
- **Conflict resolution strategies**: Extend `conflict-resolution.ts` with new resolution strategies for specific field types
- **Metadata storage**: Customize caching policies and TTL values in `metadata-storage.ts` for different data types
- **Queue job types**: Add new metadata operation types beyond `enrich`, `refresh`, `validate`, `cache-warm` in `metadata-queue.ts`
- **Migration strategies**: Extend `migration.ts` with new version handlers for schema evolution
- **Validation rules**: Add new validation patterns in `progress-validation.ts` for data integrity
- **Spoiler management**: Extend spoiler-safe filtering with new content classification levels
- **Composition pipelines**: Create new pipeline builders using `createPipeline()` for domain-specific transformations
- **Debug utilities**: Use `debugTap()`, `perfTap()`, and `createDebugPipe()` for development and troubleshooting

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
