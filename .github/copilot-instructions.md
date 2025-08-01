# GitHub Copilot Instructions for VBS

## Project Overview

VBS (View By Stardate) is a local-first Star Trek chronological viewing guide built with TypeScript, Vite, and vanilla DOM APIs. The app tracks viewing progress across 7 chronological eras spanning 22nd-32nd centuries using browser LocalStorage.

## Architecture Pattern

The project uses **functional factory patterns** with closures for state management and clear separation of concerns:

### Current: Functional Factory Architecture

- `StarTrekViewingGuide` (main.ts): Central coordinator managing DOM elements and module interactions
- `createProgressTracker`: Factory function managing watched items state and progress calculations
- `createSearchFilter`: Factory function handling real-time search and content filtering
- `createTimelineRenderer`: Factory function rendering era-based timeline with collapsible sections
- `storage.ts`: Handles import/export of progress data as JSON

### Factory Function Pattern

**Factory functions with closures** for state management:

```typescript
// Factory function approach
export const createProgressTracker = () => {
  let watchedItems: string[] = []

  return {
    toggleItem: (itemId: string) => { /* closure-based state */ },
    isWatched: (itemId: string) => watchedItems.includes(itemId),
    getWatchedItems: () => [...watchedItems], // immutable copy
    calculateProgress: () => calculateOverallProgress(watchedItems)
  }
}

// Pure function utilities
export const calculateEraProgress = (watchedIds: string[], items: StarTrekItem[]) => ({
  total: items.length,
  completed: items.filter(item => watchedIds.includes(item.id)).length,
  percentage: Math.round((completed / items.length) * 100)
})

// Composition over inheritance
const createApp = () => {
  const progress = createProgressTracker()
  const search = createSearchFilter()
  const timeline = createTimelineRenderer()

  // Connect via function composition
  const updateProgress = (itemId: string) => {
    progress.toggleItem(itemId)
    timeline.updateProgress(progress.getWatchedItems())
  }

  return { progress, search, timeline, updateProgress }
}
```

**Key principles**: Immutable state with controlled mutations, composable pure functions, no `this` binding issues.

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
pnpm build        # TypeScript + Vite production build
pnpm lint         # ESLint with @bfra.me/eslint-config
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

Use Vitest with `describe` suites grouping related functionality:

```typescript
describe('ProgressTracker', () => {
  let progressTracker: ReturnType<typeof createProgressTracker>

  beforeEach(() => {
    progressTracker = createProgressTracker()
  })
```

**Mock LocalStorage** for storage-related tests. Import modules using `.js` extensions (TypeScript ES modules).

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
