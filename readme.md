# 🖖 VBS: View By Stardate

> A Modern Star Trek Chronological Viewing Guide

[![Build Status](https://img.shields.io/github/actions/workflow/status/marcusrbrown/vbs/ci.yaml?branch=main&style=flat-square)](https://github.com/marcusrbrown/vbs/actions) [![Node.js](https://img.shields.io/badge/Node.js-22.x-3c873a?style=flat-square&logo=node.js)](https://nodejs.org) [![TypeScript](https://img.shields.io/badge/TypeScript-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org) [![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

[Features](#features) • [Quick Start](#quick-start) • [Development](#development) • [Architecture](#architecture) • [Contributing](#contributing)

VBS (View By Stardate) is a modern, local-first web application that helps Star Trek fans watch all series and movies in chronological order by in-universe stardate. Built with TypeScript and Vite, it features a functional factory architecture for robust state management and comprehensive progress tracking across the entire Star Trek universe.

> **💡 Local-First Design**: All your viewing progress is stored locally in your browser with export/import capabilities for data portability.

## Features

### Progress Tracking

- **Persistent Storage**: Local progress tracking with browser storage
- **Progress Visualization**: Overall and era-specific progress indicators
- **Data Portability**: Export/import functionality for backup and sync
- **Hierarchical Progress**: Season-level tracking with planned episode-level support

### Content Organization

- **Chronological Order**: 7 eras spanning 22nd-32nd centuries (1,000+ years)
- **Comprehensive Coverage**: All series, movies, and animated content
- **Detailed Metadata**: Stardate ranges, episode counts, and contextual notes
- **Smart Filtering**: Real-time search and content type filtering

### Modern Architecture

- **TypeScript**: Full type safety with modern ES modules and advanced generics
- **Functional Factories**: Closure-based state management with generic EventEmitter integration
- **Generic Utilities**: Type-safe storage adapters and comprehensive utility type library
- **Responsive Design**: Mobile-first approach with modern CSS
- **Performance**: Vite build system with optimized chunking

### Developer Experience

- **Testing**: Comprehensive test suite with Vitest and coverage reporting
- **Code Quality**: ESLint + Prettier with automated pre-commit hooks
- **CI/CD**: Automated testing and deployment to GitHub Pages
- **Modern Tooling**: pnpm package management and TypeScript strict mode

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org) 22.x or later
- [pnpm](https://pnpm.io) (recommended) or npm

### Local Development

1. **Clone the repository**

   ```bash
   git clone https://github.com/marcusrbrown/vbs.git
   cd vbs
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Start development server**

   ```bash
   pnpm dev
   ```

4. **Open in browser**

   ```text
   http://localhost:3000
   ```

## 📖 Usage Guide

### Getting Started

1. **Browse eras**: Click on any era header to expand and view the content
2. **Mark as watched**: Check the box next to any series or movie you've completed
3. **Track progress**: Watch your progress bars fill up as you advance through Star Trek history
4. **Search content**: Use the search bar to find specific series or episodes
5. **Filter by type**: Use the dropdown to show only series, movies, or animated content

### Managing Your Progress

- **Auto-save**: Your progress is automatically saved to your browser's local storage
- **Export progress**: Click "Export Progress" to download a JSON backup file
- **Import progress**: Click "Import Progress" to restore from a previously exported file
- **Reset progress**: Use "Reset Progress" to start fresh (with confirmation)

### Viewing Controls

- **Expand All**: Open all era sections at once
- **Collapse All**: Close all era sections for a cleaner view
- **Search**: Find content across all eras instantly
- **Filter**: Show only specific types of content

## Development

### Development Workflow

```bash
pnpm dev          # Start development server (port 3000)
pnpm test         # Run test suite with Vitest
pnpm test:ui      # Launch interactive test runner
pnpm test:coverage # Generate coverage reports
pnpm build        # TypeScript compilation + Vite build
pnpm lint         # Run ESLint checks
pnpm fix          # Auto-fix linting issues
pnpm type-check   # TypeScript type checking
```

### Project Structure

```text
vbs/
├── src/
│   ├── main.ts              # Main application factory
│   ├── style.css            # Global styles and Star Trek theme
│   ├── data/
│   │   └── star-trek-data.ts # Comprehensive Star Trek dataset (570 lines)
│   └── modules/
│       ├── progress.ts      # Progress tracking factory
│       ├── search.ts        # Search and filtering factory
│       ├── timeline.ts      # Timeline rendering factory
│       ├── storage.ts       # Import/export functionality
│       └── types.ts         # TypeScript interfaces
├── test/                    # Vitest test suite
├── index.html              # Application entry point
├── vite.config.ts          # Vite configuration
└── package.json            # Dependencies and scripts
```

### Code Quality

The project uses automated code quality tools:

- **Pre-commit hooks**: Lint and format all staged files before commits
- **ESLint**: Comprehensive linting with TypeScript support
- **Prettier**: Consistent code formatting
- **TypeScript**: Strict type checking for reliability

## Architecture

VBS uses a **functional factory pattern** with closures for state management and **generic TypeScript utilities** for enhanced type safety:

### Functional Factory Pattern with Generic EventEmitters

```typescript
// Factory function with closure-based state and generic EventEmitter integration
export const createProgressTracker = (): ProgressTrackerInstance => {
  // Private state in closure
  const watchedItems: string[] = []

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

### Functional Composition Utilities

VBS includes a comprehensive functional composition utilities module (`src/utils/composition.ts`) with 3000+ lines of utilities for elegant data transformation pipelines:

```typescript
import { compose, curry, pipe, tap } from './utils/composition.js'

// Left-to-right data flow with pipe()
const processStarTrekData = pipe(
  starTrekData,
  data => data.filter(era => era.items.length > 0),
  data => data.map(era => ({ ...era, progress: calculateProgress(era) })),
  tap(data => console.log('Processed data:', data.length, 'eras')),
  data => data.sort((a, b) => a.title.localeCompare(b.title))
)

// Curried functions for reusable predicates
const filterByType = curry((type: string, item: StarTrekItem) => item.type === type)
const isMovie = filterByType('movie')
const isSeries = filterByType('series')

// Progress calculation pipeline
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

// VBS-specific pipeline builders
const searchPipeline = createSearchPipeline(starTrekData, {
  onFilterComplete: (filteredData, filterState) => updateUI(filteredData)
})

const progressPipeline = createProgressPipeline(allEras, {
  onProgressUpdate: (progress) => saveProgress(progress)
})
```

**Core Functions:**

- **`pipe()`**: Left-to-right function composition for intuitive data flow
- **`compose()`**: Right-to-left mathematical composition
- **`curry()`**: Partial application with automatic arity detection
- **`tap()`**: Side effects in pipelines without breaking type flow
- **`asyncPipe()` & `asyncCompose()`**: Async composition with Promise handling

**VBS-Specific Features:**

- **Pipeline Builders**: `createSearchPipeline()`, `createProgressPipeline()`, `createEventPipeline()`
- **Star Trek Predicates**: `starTrekPredicates.byType()`, `byText()`, `byEra()`
- **Star Trek Transformations**: `starTrekTransformations.extractTitles()`, `extractByEra()`
- **Debug Utilities**: `debugTap()`, `perfTap()`, `createDebugPipe()` for development

### Generic Storage Utilities

VBS includes a comprehensive generic storage system for type-safe data persistence:

```typescript
// Generic storage adapter pattern
interface StorageAdapter<T> {
  save(key: string, data: T): Promise<void> | void
  load(key: string): Promise<T | null> | T | null
  remove(key: string): Promise<void> | void
  clear(): Promise<void> | void
  exists(key: string): Promise<boolean> | boolean
}

// Type-safe LocalStorage implementation
const progressStorage = createStorage(
  new LocalStorageAdapter<string[]>({
    validate: isStringArray,
    fallback: []
  }),
  'starTrekProgress'
)

// Usage with automatic type inference
progressStorage.save(['tos_s1', 'tng_s1']) // Type: string[]
const progress = progressStorage.load()    // Type: string[] | null
```

### Key Architectural Benefits

- **No `this` binding issues**: Closures eliminate context problems
- **Type-safe event handling**: Generic EventEmitter with compile-time type checking
- **Generic storage adapters**: Reusable storage patterns with data validation
- **Comprehensive utility types**: Advanced TypeScript patterns for maintainability
- **Functional composition**: Easy testing and extensibility
- **Future-ready foundation**: Prepared for IndexedDB migration and episode-level tracking

### Data Structure

Star Trek content is organized hierarchically:

```typescript
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

## 🗓️ Chronological Coverage

The viewing guide follows this chronological progression by in-universe stardate:

1. **22nd Century** - Enterprise Era (2151-2161)
2. **Mid-23rd Century** - Discovery & Strange New Worlds Era (2256-2261)
3. **23rd Century** - Original Series Era (2265-2293)
4. **24th Century** - Next Generation Era (2364-2379)
5. **Late 24th Century** - Lower Decks & Prodigy Era (2380-2383)
6. **25th Century** - Picard Era (2399-2401)
7. **32nd Century** - Far Future Discovery Era (3188-3191)

## Deployment

The application is automatically deployed to GitHub Pages via GitHub Actions:

- **Production**: [https://marcusrbrown.github.io/vbs/](https://marcusrbrown.github.io/vbs/)
- **Build target**: `/vbs/` base path for GitHub Pages
- **Deployment**: Triggered on pushes to `main` branch

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 90+
- ✅ Safari 14+
- ✅ Edge 90+

Modern browsers with ES2020+ support are required.

## Contributing

Contributions are welcome! Here's how to get involved:

### Ways to Contribute

- **Content Updates**: Add new series, correct stardate information, improve viewing notes
- **Bug Fixes**: Report and fix issues with the interface or functionality
- **Feature Enhancements**: Implement new features like episode-level tracking
- **Documentation**: Improve README, add code comments, write guides

### Development Setup

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and test thoroughly
4. Ensure all tests pass (`pnpm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Planned Features

- **Episode-Level Tracking**: Individual episode progress vs current season-level
- **Interactive Timeline**: D3.js chronological visualization with zoom/pan
- **Streaming Integration**: Paramount+/Netflix availability via APIs
- **PWA Capabilities**: Offline support and app installation

## Acknowledgments

- **Gene Roddenberry** and all Star Trek creators for the incredible universe
- **Memory Alpha contributors** for maintaining comprehensive Star Trek databases
- **Star Trek fans worldwide** who keep the spirit of exploration alive
- **Open source community** for tools and inspiration

---

**Live long and prosper!** 🖖
