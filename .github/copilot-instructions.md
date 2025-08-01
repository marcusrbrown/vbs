# GitHub Copilot Instructions for VBS

## Project Overview

VBS (View By Stardate) is a local-first Star Trek chronological viewing guide built with TypeScript, Vite, and vanilla DOM APIs. The app tracks viewing progress across 7 chronological eras spanning 22nd-32nd centuries using browser LocalStorage, with planned migration to IndexedDB for enhanced capabilities.

## Architecture Pattern

The project uses **functional factory patterns** with closures for state management and clear separation of concerns. This architecture was recently refactored from class-based patterns (July 2025) to eliminate `this` binding issues and enable better functional composition.

### Functional Factory Architecture

- `createStarTrekViewingGuide` (main.ts): Main application factory coordinating all modules and DOM interactions
- `createProgressTracker`: Factory managing watched items state and hierarchical progress calculations
- `createSearchFilter`: Factory handling real-time search and content filtering with callbacks
- `createTimelineRenderer`: Factory rendering era-based timeline with collapsible sections and progress integration
- `createElementsManager`: Factory for DOM element caching and management
- `storage.ts`: Handles import/export of progress data as JSON (planned upgrade to IndexedDB)

### Factory Function Pattern

**Factory functions with closures** for private state management:

```typescript
// Factory function with closure-based state
export const createProgressTracker = (): ProgressTrackerInstance => {
  // Private state in closure
  let watchedItems: string[] = []
  const callbacks: {
    onItemToggle: ItemToggleCallback[]
    onProgressUpdate: ProgressUpdateCallback[]
  } = { onItemToggle: [], onProgressUpdate: [] }

  // Private helper functions
  const calculateOverallProgress = (): ProgressData => { /* ... */ }
  const updateProgress = (): void => { /* notify callbacks */ }

  // Return public API object
  return {
    toggleItem: (itemId: string) => { /* mutate closure state */ },
    isWatched: (itemId: string) => watchedItems.includes(itemId),
    getWatchedItems: () => [...watchedItems], // immutable copy
    onItemToggle: (callback: ItemToggleCallback) => callbacks.onItemToggle.push(callback)
  }
}

// Dependency injection between factories
const createTimelineRenderer = (
  container: HTMLElement,
  progressTracker: ProgressTrackerInstance
): TimelineRendererInstance => {
  // Use injected dependency in closure
  const isWatched = (itemId: string) => progressTracker.isWatched(itemId)
  // ... rest of implementation
}
```

**Key principles**: Immutable state copies, controlled mutations via closures, dependency injection, no `this` binding issues.

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
})
```

**Mock LocalStorage** for storage tests. Import modules using `.js` extensions (TypeScript ES modules). Test factory functions, not classes.

## Code Style Specifics

- **Single quotes** for all string literals
- **Optional chaining** (`?.`) and nullish coalescing (`??`) everywhere
- **Explicit return types** on public methods
- **Avoid `any`** - use `unknown` with type guards instead
- **Error handling**: Always handle async operations with meaningful error messages

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
