# VBS Functional Composition Examples

This document provides comprehensive examples of functional composition patterns used throughout the VBS (View By Stardate) application. These examples demonstrate real-world usage of the composition utilities in `src/utils/composition.ts`.

## Table of Contents

- [Basic Composition Patterns](#basic-composition-patterns)
- [VBS-Specific Pipeline Examples](#vbs-specific-pipeline-examples)
- [Star Trek Data Transformations](#star-trek-data-transformations)
- [Progress Calculation Patterns](#progress-calculation-patterns)
- [Search and Filtering Examples](#search-and-filtering-examples)
- [Event Handling with Composition](#event-handling-with-composition)
- [Debugging and Development](#debugging-and-development)
- [Error Handling Patterns](#error-handling-patterns)
- [Async Composition Examples](#async-composition-examples)
- [Performance Optimization](#performance-optimization)

## Basic Composition Patterns

### Using `pipe()` for Left-to-Right Data Flow

The `pipe()` function enables intuitive left-to-right data transformation:

```typescript
import type { StarTrekEra, StarTrekItem } from '../src/modules/types.js'
import { pipe, tap } from '../src/utils/composition.js'

// Basic data transformation pipeline
const processEraData = (eras: StarTrekEra[]) => {
  return pipe(
    eras,
    // Filter out empty eras
    (eras) => eras.filter(era => era.items.length > 0),
    // Add progress calculations
    (eras) => eras.map(era => ({
      ...era,
      totalItems: era.items.length,
      watchedCount: era.items.filter(item => isWatched(item.id)).length
    })),
    // Sort by chronological order
    (eras) => eras.sort((a, b) => a.title.localeCompare(b.title)),
    // Add debugging
    tap(eras => console.log(`Processed ${eras.length} eras`))
  )
}
```

### Using `compose()` for Mathematical Composition

The `compose()` function applies functions right-to-left:

```typescript
import { compose } from '../src/utils/composition.js'

// Compose utility functions
const normalizeTitle = (title: string) => title.toLowerCase().trim()
const removeSpecialChars = (title: string) => title.replaceAll(/[^\w\s]/g, '')
const splitWords = (title: string) => title.split(/\s+/)

// Right-to-left composition
const processSearchTerm = compose(
  splitWords,
  removeSpecialChars,
  normalizeTitle
)

// Usage
const searchWords = processSearchTerm("Star Trek: The Next Generation!")
// Result: ["star", "trek", "the", "next", "generation"]
```

### Using `curry()` for Partial Application

The `curry()` function enables reusable, partially applied functions:

```typescript
import { curry } from '../src/utils/composition.js'

// Curried predicate functions
const filterByType = curry((type: string, item: StarTrekItem) => item.type === type)
const filterByEra = curry((eraId: string, item: StarTrekItem) => item.eraId === eraId)
const filterByWatchStatus = curry((isWatched: boolean, item: StarTrekItem) =>
  watchedItems.includes(item.id) === isWatched
)

// Create specialized predicates
const isMovie = filterByType('movie')
const isSeries = filterByType('series')
const isAnimated = filterByType('animated')
const isFromTOS = filterByEra('tos')
const isUnwatched = filterByWatchStatus(false)

// Use in filter chains
const unwatchedTOSMovies = allItems.filter(pipe(isFromTOS, isMovie, isUnwatched))
```

## VBS-Specific Pipeline Examples

### Search Pipeline with Real-Time Filtering

```typescript
import { createSearchPipeline, curry, pipe, tap } from '../src/utils/composition.js'

// Create a comprehensive search pipeline
const searchPipeline = createSearchPipeline(starTrekData, {
  onFilterStart: (query, filterType) => {
    console.log(`Starting search: "${query}" with filter: ${filterType}`)
  },
  onFilterComplete: (results, state) => {
    updateSearchResults(results)
    updateProgressBars(calculateProgress(results))
    updateURLParams(state)
  },
  onError: (error) => {
    console.error('Search pipeline error:', error)
    showErrorMessage('Search failed. Please try again.')
  }
})

// Advanced search with multiple criteria
const performAdvancedSearch = (
  searchTerm: string,
  contentType: string,
  eraId: string,
  watchedStatus: 'all' | 'watched' | 'unwatched'
) => {
  return pipe(
    starTrekData,
    // Apply text search
    data => searchPipeline.applyTextFilter(data, searchTerm),
    // Apply content type filter
    data => contentType === 'all' ? data : data.filter(filterByType(contentType)),
    // Apply era filter
    data => eraId === 'all' ? data : data.filter(filterByEra(eraId)),
    // Apply watch status filter
    data => watchedStatus === 'all' ? data : data.filter(filterByWatchStatus(watchedStatus === 'watched')),
    // Update UI with results
    tap(results => {
      updateSearchResultsCount(results.length)
      highlightMatchingTerms(searchTerm)
    })
  )
}
```

### Progress Calculation Pipeline

```typescript
import { createProgressPipeline, pipe, tap } from '../src/utils/composition.js'

// Comprehensive progress tracking pipeline
const progressPipeline = createProgressPipeline(starTrekData, {
  onProgressUpdate: (progress) => {
    updateProgressBars(progress)
    saveProgressToStorage(progress)
    triggerProgressNotifications(progress)
  },
  onMilestoneReached: (milestone) => {
    showMilestoneNotification(milestone)
    updateAchievements(milestone)
  }
})

// Calculate detailed progress metrics
const calculateDetailedProgress = () => {
  return pipe(
    starTrekData,
    // Calculate per-era progress
    eras => eras.map(era => ({
      ...era,
      progress: {
        total: era.items.length,
        watched: era.items.filter(item => isWatched(item.id)).length,
        percentage: Math.round(
          (era.items.filter(item => isWatched(item.id)).length / era.items.length) * 100
        )
      }
    })),
    // Calculate overall progress
    eras => {
      const totalItems = eras.reduce((sum, era) => sum + era.items.length, 0)
      const watchedItems = eras.reduce((sum, era) => sum + era.progress.watched, 0)

      return {
        eras,
        overall: {
          total: totalItems,
          watched: watchedItems,
          percentage: Math.round((watchedItems / totalItems) * 100),
          remaining: totalItems - watchedItems
        }
      }
    },
    // Add milestone calculations
    progressData => ({
      ...progressData,
      milestones: calculateMilestones(progressData.overall),
      streaks: calculateWatchingStreaks(),
      recentActivity: getRecentWatchActivity()
    }),
    tap(progress => {
      console.log(`Progress: ${progress.overall.percentage}% complete`)
      updateProgressNotifications(progress)
    })
  )
}
```

## Star Trek Data Transformations

### Era and Item Processing

```typescript
import { curry, pipe, tap } from '../src/utils/composition.js'

// Transform raw Star Trek data into UI-ready format
const transformDataForUI = (rawData: StarTrekEra[]) => {
  return pipe(
    rawData,
    // Enhance eras with metadata
    eras => eras.map(era => ({
      ...era,
      id: era.id || generateEraId(era.title),
      displayTitle: formatEraTitle(era.title),
      timespan: extractTimespan(era.title),
      isExpanded: getEraExpansionState(era.id),
      itemCount: era.items.length
    })),
    // Enhance items with metadata
    eras => eras.map(era => ({
      ...era,
      items: era.items.map(item => ({
        ...item,
        isWatched: isWatched(item.id),
        displayTitle: formatItemTitle(item.title),
        year: extractYear(item.stardate),
        progress: getItemProgress(item.id),
        streamingAvailability: getStreamingInfo(item.id)
      }))
    })),
    // Sort and organize
    eras => eras.sort((a, b) => a.timespan.start - b.timespan.start),
    tap(eras => console.log(`Transformed ${eras.length} eras for UI`))
  )
}

// Extract specific data types with predicates
const starTrekPredicates = {
  byType: curry((type: string, item: StarTrekItem) => item.type === type),
  byEra: curry((eraId: string, item: StarTrekItem) => item.eraId === eraId),
  byText: curry((searchTerm: string, item: StarTrekItem) =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.stardate.toLowerCase().includes(searchTerm.toLowerCase())
  ),
  isWatched: (item: StarTrekItem) => isWatched(item.id),
  isUnwatched: (item: StarTrekItem) => !isWatched(item.id),
  hasStardate: (item: StarTrekItem) => item.stardate && item.stardate !== 'Unknown'
}

// Star Trek data transformations
const starTrekTransformations = {
  extractTitles: (items: StarTrekItem[]) => items.map(item => item.title),
  extractByEra: curry((eraId: string, eras: StarTrekEra[]) =>
    eras.find(era => era.id === eraId)?.items || []
  ),
  groupByType: (items: StarTrekItem[]) => {
    return items.reduce((groups, item) => {
      const type = item.type
      if (!groups[type]) groups[type] = []
      groups[type].push(item)
      return groups
    }, {} as Record<string, StarTrekItem[]>)
  },
  sortByStardate: (items: StarTrekItem[]) =>
    items.sort((a, b) => a.stardate.localeCompare(b.stardate))
}
```

## Progress Calculation Patterns

### Hierarchical Progress Tracking

```typescript
import { curry, pipe, tap } from '../src/utils/composition.js'

// Calculate progress at multiple levels
const calculateHierarchicalProgress = () => {
  return pipe(
    starTrekData,
    // Item-level progress
    eras => eras.map(era => ({
      ...era,
      items: era.items.map(item => ({
        ...item,
        progress: {
          isWatched: isWatched(item.id),
          watchedDate: getWatchedDate(item.id),
          rating: getUserRating(item.id),
          notes: getUserNotes(item.id)
        }
      }))
    })),
    // Era-level progress
    eras => eras.map(era => {
      const watchedCount = era.items.filter(item => item.progress.isWatched).length
      return {
        ...era,
        progress: {
          total: era.items.length,
          watched: watchedCount,
          percentage: Math.round((watchedCount / era.items.length) * 100),
          averageRating: calculateAverageRating(era.items),
          completedSeries: countCompletedSeries(era.items),
          completedMovies: countCompletedMovies(era.items)
        }
      }
    }),
    // Overall progress
    eras => {
      const totalItems = eras.reduce((sum, era) => sum + era.progress.total, 0)
      const watchedItems = eras.reduce((sum, era) => sum + era.progress.watched, 0)

      return {
        eras,
        overall: {
          total: totalItems,
          watched: watchedItems,
          percentage: Math.round((watchedItems / totalItems) * 100),
          completedEras: eras.filter(era => era.progress.percentage === 100).length,
          nextUnwatchedItem: findNextUnwatchedItem(eras)
        }
      }
    },
    tap(progress => updateProgressDisplay(progress))
  )
}

// Progress milestone calculations
const calculateMilestones = curry((progressPercentage: number, milestones: number[]) => {
  return milestones.filter(milestone => progressPercentage >= milestone)
})

const checkForNewMilestones = (previousProgress: number, currentProgress: number) => {
  const milestones = [10, 25, 50, 75, 90, 100]
  const newMilestones = milestones.filter(
    milestone => previousProgress < milestone && currentProgress >= milestone
  )

  return pipe(
    newMilestones,
    milestones => milestones.map(milestone => ({
      percentage: milestone,
      title: getMilestoneTitle(milestone),
      description: getMilestoneDescription(milestone),
      reward: getMilestoneReward(milestone)
    })),
    tap(milestones => {
      if (milestones.length > 0) {
        showMilestoneNotifications(milestones)
      }
    })
  )
}
```

## Search and Filtering Examples

### Advanced Search Implementation

```typescript
import { compose, curry, pipe, tap } from '../src/utils/composition.js'

// Text normalization pipeline
const normalizeSearchTerm = compose(
  (term: string) => term.split(/\s+/).filter(word => word.length > 0),
  (term: string) => term.replaceAll(/[^\w\s]/g, ' '),
  (term: string) => term.toLowerCase().trim()
)

// Fuzzy search with scoring
const createFuzzySearcher = curry((searchTerms: string[], item: StarTrekItem) => {
  const itemText = `${item.title} ${item.stardate}`.toLowerCase()
  const score = searchTerms.reduce((score, term) => {
    if (itemText.includes(term)) {
      return score + (itemText.indexOf(term) === 0 ? 2 : 1) // Boost for title start matches
    }
    return score
  }, 0)

  return { item, score }
})

// Complete search pipeline
const performSearch = (searchQuery: string, filters: SearchFilters) => {
  return pipe(
    searchQuery,
    normalizeSearchTerm,
    searchTerms => pipe(
      starTrekData,
      // Flatten all items
      eras => eras.flatMap(era =>
        era.items.map(item => ({ ...item, eraId: era.id, eraTitle: era.title }))
      ),
      // Apply type filter
      items => filters.type === 'all'
        ? items
        : items.filter(starTrekPredicates.byType(filters.type)),
      // Apply era filter
      items => filters.era === 'all'
        ? items
        : items.filter(item => item.eraId === filters.era),
      // Apply watch status filter
      items => filters.watchStatus === 'all'
        ? items
        : items.filter(filters.watchStatus === 'watched'
            ? starTrekPredicates.isWatched
            : starTrekPredicates.isUnwatched),
      // Apply fuzzy search if query exists
      items => searchTerms.length > 0
        ? pipe(
            items,
            items => items.map(createFuzzySearcher(searchTerms)),
            scored => scored.filter(({ score }) => score > 0),
            scored => scored.sort((a, b) => b.score - a.score),
            scored => scored.map(({ item }) => item)
          )
        : items,
      // Limit results
      items => items.slice(0, filters.maxResults || 100),
      tap(results => {
        console.log(`Search "${searchQuery}" returned ${results.length} results`)
        updateSearchStats(searchQuery, results.length)
      })
    )
  )
}
```

## Event Handling with Composition

### Curried Event Handlers

```typescript
import { curry, pipe, tap } from '../src/utils/composition.js'

// Curried event handler factory
const createEventHandler = curry((
  action: string,
  validator: (data: any) => boolean,
  handler: (data: any) => void,
  event: Event
) => {
  event.preventDefault()

  return pipe(
    event.target,
    target => extractDataFromTarget(target, action),
    tap(data => console.log(`${action} event with data:`, data)),
    data => validator(data) ? data : null,
    data => data ? handler(data) : console.warn(`Invalid data for ${action}`)
  )
})

// Specialized event handlers
const handleItemToggle = createEventHandler(
  'toggle-item',
  (data) => data.itemId && typeof data.itemId === 'string',
  (data) => {
    toggleWatchedStatus(data.itemId)
    updateProgressBars()
    saveProgressToStorage()
  }
)

const handleEraExpansion = createEventHandler(
  'toggle-era',
  (data) => data.eraId && typeof data.expanded === 'boolean',
  (data) => {
    setEraExpanded(data.eraId, data.expanded)
    saveUIState()
  }
)

const handleSearch = createEventHandler(
  'search',
  (data) => typeof data.query === 'string',
  (data) => {
    const results = performSearch(data.query, getCurrentFilters())
    updateSearchResults(results)
    updateURL({ search: data.query })
  }
)

// Event pipeline for complex interactions
const createEventPipeline = (eventType: string, handlers: ((data: any) => void)[]) => {
  return curry((event: Event) => {
    return pipe(
      event,
      extractEventData,
      validateEventData,
      tap(data => console.log(`Processing ${eventType}:`, data)),
      data => handlers.reduce((result, handler) => {
        handler(data)
        return result
      }, data),
      tap(() => console.log(`Completed ${eventType} processing`))
    )
  })
}
```

## Debugging and Development

### Debug Utilities with Composition

```typescript
import { curry, pipe, tap } from '../src/utils/composition.js'

// Debug tap variants
const debugTap = curry((label: string, value: any) => {
  console.log(`[DEBUG ${label}]:`, value)
  return value
})

const perfTap = curry((label: string, value: any) => {
  console.time(label)
  console.log(`[PERF START ${label}]:`, value)
  return value
})

const perfTapEnd = curry((label: string, value: any) => {
  console.timeEnd(label)
  console.log(`[PERF END ${label}]:`, value)
  return value
})

const conditionalTap = curry((condition: (value: any) => boolean, callback: (value: any) => void, value: any) => {
  if (condition(value)) {
    callback(value)
  }
  return value
})

// Create debug pipeline
const createDebugPipe = (config: {
  enableLogging?: boolean
  enableTiming?: boolean
  enableConditionals?: boolean
  label?: string
}) => {
  const { enableLogging = true, enableTiming = false, enableConditionals = false, label = 'Debug' } = config

  return (...operations: ((value: any) => any)[]) => {
    return pipe(
      ...operations.flatMap((op, index) => [
        enableTiming ? perfTap(`${label} Step ${index + 1}`) : (x: any) => x,
        op,
        enableLogging ? debugTap(`${label} Step ${index + 1} Result`) : (x: any) => x,
        enableTiming ? perfTapEnd(`${label} Step ${index + 1}`) : (x: any) => x,
        enableConditionals ? conditionalTap(
          (value) => Array.isArray(value) && value.length > 100,
          (value) => console.warn(`Large array detected: ${value.length} items`)
        ) : (x: any) => x
      ])
    )
  }
}

// Usage example with Star Trek data processing
const debugProcessStarTrekData = createDebugPipe({
  enableLogging: true,
  enableTiming: true,
  label: 'Star Trek Data Processing'
})

const processedData = debugProcessStarTrekData(
  (data: StarTrekEra[]) => data.filter(era => era.items.length > 0),
  (data: StarTrekEra[]) => data.map(era => ({
    ...era,
    progress: calculateEraProgress(era)
  })),
  (data: StarTrekEra[]) => data.sort((a, b) => a.title.localeCompare(b.title))
)(starTrekData)
```

## Error Handling Patterns

### Robust Error Handling in Pipelines

```typescript
import { curry, pipe, tap } from '../src/utils/composition.js'

// Error handling utilities
const tryCatch = curry((errorHandler: (error: Error) => any, operation: (value: any) => any, value: any) => {
  try {
    return operation(value)
  } catch (error) {
    console.error('Pipeline error:', error)
    return errorHandler(error)
  }
})

const withFallback = curry((fallbackValue: any, operation: (value: any) => any, value: any) => {
  return tryCatch(() => fallbackValue, operation, value)
})

const logAndContinue = curry((operation: (value: any) => any, value: any) => {
  return tryCatch((error) => {
    console.error('Operation failed, continuing with original value:', error)
    return value
  }, operation, value)
})

// Composition error boundary
const compositionErrorBoundary = curry((
  operations: ((value: any) => any)[],
  options: { fallbackValue?: any; enableLogging?: boolean } = {},
  value: any
) => {
  const { fallbackValue = null, enableLogging = true } = options

  try {
    return pipe(...operations)(value)
  } catch (error) {
    if (enableLogging) {
      console.error('Composition pipeline failed:', error)
    }
    return fallbackValue
  }
})

// Safe Star Trek data processing
const safeProcessStarTrekData = (data: StarTrekEra[]) => {
  return compositionErrorBoundary([
    logAndContinue((eras: StarTrekEra[]) =>
      eras.filter(era => era.items && era.items.length > 0)
    ),
    withFallback([], (eras: StarTrekEra[]) =>
      eras.map(era => ({
        ...era,
        progress: calculateProgress(era) // This might throw
      }))
    ),
    logAndContinue((eras: StarTrekEra[]) =>
      eras.sort((a, b) => a.title.localeCompare(b.title))
    ),
    tap(eras => console.log(`Successfully processed ${eras.length} eras`))
  ], {
    fallbackValue: data, // Return original data if all fails
    enableLogging: true
  })(data)
}
```

## Async Composition Examples

### Asynchronous Data Processing

```typescript
import { asyncCompose, asyncPipe, curry, tap } from '../src/utils/composition.js'

// Async operations
const fetchUserProgress = async (userId: string): Promise<string[]> => {
  const response = await fetch(`/api/progress/${userId}`)
  return response.json()
}

const validateProgressData = async (progress: string[]): Promise<string[]> => {
  return progress.filter(itemId => isValidItemId(itemId))
}

const syncWithRemote = async (progress: string[]): Promise<string[]> => {
  await fetch('/api/sync', {
    method: 'POST',
    body: JSON.stringify({ progress }),
    headers: { 'Content-Type': 'application/json' }
  })
  return progress
}

// Async pipeline for progress synchronization
const syncProgressWithServer = async (userId: string) => {
  return asyncPipe(
    userId,
    fetchUserProgress,
    tap(async (progress) => console.log(`Fetched ${progress.length} items`)),
    validateProgressData,
    tap(async (progress) => console.log(`Validated ${progress.length} items`)),
    syncWithRemote,
    tap(async (progress) => console.log(`Synced ${progress.length} items`))
  )
}

// Async composition for data enrichment
const enrichStarTrekDataAsync = async (data: StarTrekEra[]) => {
  return asyncPipe(
    data,
    async (eras) => Promise.all(
      eras.map(async (era) => ({
        ...era,
        streamingInfo: await fetchStreamingInfo(era.id),
        userRatings: await fetchUserRatings(era.id)
      }))
    ),
    async (eras) => Promise.all(
      eras.map(async (era) => ({
        ...era,
        items: await Promise.all(
          era.items.map(async (item) => ({
            ...item,
            availability: await checkAvailability(item.id),
            recommendations: await getRecommendations(item.id)
          }))
        )
      }))
    ),
    tap(async (eras) => console.log(`Enriched ${eras.length} eras with external data`))
  )
}
```

## Performance Optimization

### Memoization and Caching with Composition

```typescript
import { curry, pipe, tap } from '../src/utils/composition.js'

// Memoization utility
const memoize = <T extends (...args: any[]) => any>(fn: T): T => {
  const cache = new Map()

  return ((...args: any[]) => {
    const key = JSON.stringify(args)
    if (cache.has(key)) {
      return cache.get(key)
    }

    const result = fn(...args)
    cache.set(key, result)
    return result
  }) as T
}

// Memoized expensive operations
const memoizedCalculateProgress = memoize(calculateProgress)
const memoizedSearchFilter = memoize(performSearch)
const memoizedDataTransform = memoize(transformDataForUI)

// Batch processing for large datasets
const batchProcess = curry((batchSize: number, processor: (batch: any[]) => any[], items: any[]) => {
  const batches = []
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize))
  }

  return batches.flatMap(processor)
})

// Optimized data processing pipeline
const optimizedProcessStarTrekData = (data: StarTrekEra[]) => {
  return pipe(
    data,
    // Use memoized transformation
    memoizedDataTransform,
    // Process in batches for large datasets
    batchProcess(50, (batch: StarTrekEra[]) =>
      batch.map(era => ({
        ...era,
        progress: memoizedCalculateProgress(era)
      }))
    ),
    // Cache results
    tap(results => {
      cacheResults('processed-star-trek-data', results)
    })
  )
}

// Lazy evaluation utilities
const lazy = <T>(supplier: () => T) => {
  let cached: { value: T } | null = null
  return () => {
    if (!cached) {
      cached = { value: supplier() }
    }
    return cached.value
  }
}

// Lazy-loaded expensive computations
const lazyStarTrekStats = lazy(() =>
  pipe(
    starTrekData,
    calculateDetailedStatistics,
    formatStatisticsForDisplay,
    tap(stats => console.log('Generated expensive statistics'))
  )
)
```

## Integration Examples

### Complete Application Flow

```typescript
import { asyncPipe, curry, pipe, tap } from '../src/utils/composition.js'

// Main application initialization pipeline
const initializeVBSApplication = async () => {
  return asyncPipe(
    'vbs-app',
    // Load configuration
    async (appId) => ({
      appId,
      config: await loadConfiguration(),
      user: await getCurrentUser()
    }),
    // Load data
    async (context) => ({
      ...context,
      starTrekData: await loadStarTrekData(),
      userProgress: await loadUserProgress(context.user.id)
    }),
    // Initialize modules
    async (context) => ({
      ...context,
      modules: {
        progressTracker: createProgressTracker(context.userProgress),
        searchFilter: createSearchFilter(context.starTrekData),
        timelineRenderer: createTimelineRenderer(context.starTrekData),
        storageManager: createStorageManager(context.config.storage)
      }
    }),
    // Setup UI
    async (context) => {
      const ui = initializeUI(context.modules)
      setupEventListeners(context.modules, ui)
      return { ...context, ui }
    },
    // Final setup
    tap(async (context) => {
      console.log('VBS Application initialized successfully')
      await context.modules.progressTracker.syncWithServer()
      context.ui.render()
    })
  )
}

// Complete user interaction flow
const handleUserInteraction = curry((action: string, data: any) => {
  return pipe(
    { action, data, timestamp: Date.now() },
    // Validate interaction
    interaction => validateUserInteraction(interaction),
    // Process action
    interaction => {
      switch (interaction.action) {
        case 'toggle-item':
          return processItemToggle(interaction.data)
        case 'search':
          return processSearch(interaction.data)
        case 'filter':
          return processFilter(interaction.data)
        default:
          throw new Error(`Unknown action: ${interaction.action}`)
      }
    },
    // Update state
    tap(result => updateApplicationState(result)),
    // Update UI
    tap(result => updateUI(result)),
    // Log analytics
    tap(result => logUserAnalytics(action, result)),
    // Save state
    tap(result => saveApplicationState(result))
  )
})
```

---

These examples demonstrate the power and flexibility of functional composition in the VBS application. The composition utilities enable clean, maintainable, and testable code while providing excellent TypeScript support throughout the data transformation pipelines.

For more information about the composition utilities, see:

- [`src/utils/composition.ts`](../src/utils/composition.ts) - Full implementation
- [VBS Architecture Documentation](../.github/copilot-instructions.md) - Project patterns
- [Generic Types Examples](./generic-types-examples.md) - Advanced TypeScript patterns
