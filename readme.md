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

- **TypeScript**: Full type safety with modern ES modules
- **Functional Factories**: Closure-based state management without `this` binding
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

VBS uses a **functional factory pattern** with closures for state management:

### Functional Factory Pattern

```typescript
// Factory function with closure-based state
export const createProgressTracker = (): ProgressTrackerInstance => {
  // Private state in closure
  const watchedItems: string[] = []

  // Return public API object
  return {
    toggleItem: (itemId: string) => { /* mutate closure state */ },
    isWatched: (itemId: string) => watchedItems.includes(itemId),
    getWatchedItems: () => [...watchedItems] // immutable copy
  }
}
```

### Key Architectural Benefits

- **No `this` binding issues**: Closures eliminate context problems
- **Immutable state copies**: Controlled mutations prevent bugs
- **Dependency injection**: Clean separation of concerns
- **Functional composition**: Easy testing and extensibility

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
