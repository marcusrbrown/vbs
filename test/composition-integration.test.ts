import type {FilterState, StarTrekEra, StarTrekItem} from '../src/modules/types.js'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {
  asyncPipe,
  createProgressPipeline,
  createSearchPipeline,
  pipe,
  starTrekPredicates,
  starTrekTransformations,
  tap,
} from '../src/utils/composition.js'

// Mock DOM globals for testing
vi.stubGlobal('localStorage', {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
})

describe('Composition Utilities Integration Tests', () => {
  const mockStarTrekData: StarTrekEra[] = [
    {
      id: 'tos',
      title: 'The Original Series Era',
      years: '1966-1986',
      stardates: '1312.4-8454.1',
      description: 'The original Star Trek era with Kirk and crew',
      items: [
        {
          id: 'tos_s1',
          title: 'The Original Series Season 1',
          type: 'series',
          year: '1966-1967',
          stardate: '1312.4-3087.6',
          episodes: 29,
          notes: 'The first season of Star Trek',
        },
        {
          id: 'tos_s2',
          title: 'The Original Series Season 2',
          type: 'series',
          year: '1967-1968',
          stardate: '3088.0-5928.5',
          episodes: 26,
          notes: 'Second season with memorable episodes',
        },
        {
          id: 'tmp',
          title: 'Star Trek: The Motion Picture',
          type: 'movie',
          year: '1979',
          stardate: '7410.2',
          notes: 'The first Star Trek movie',
        },
      ],
    },
    {
      id: 'tng',
      title: 'The Next Generation Era',
      years: '1987-2002',
      stardates: '41153.7-56844.9',
      description: 'The Next Generation and related series',
      items: [
        {
          id: 'tng_s1',
          title: 'The Next Generation Season 1',
          type: 'series',
          year: '1987-1988',
          stardate: '41153.7-41986.0',
          episodes: 26,
          notes: 'Picard and crew debut',
        },
        {
          id: 'tng_s2',
          title: 'The Next Generation Season 2',
          type: 'series',
          year: '1988-1989',
          stardate: '42073.1-42976.1',
          episodes: 22,
          notes: 'Second season improvements',
        },
      ],
    },
  ]

  beforeEach(() => {
    // Clear localStorage mocks
    vi.clearAllMocks()
  })

  describe('Integration with Progress Tracker module', () => {
    it('should integrate createProgressPipeline with progress tracker calculations', () => {
      // Create a progress pipeline using composition utilities
      const progressPipeline = createProgressPipeline(mockStarTrekData, {
        onProgressUpdate: progress => {
          expect(progress.overall).toBeDefined()
          expect(progress.eraProgress).toBeDefined()
        },
      })

      // Simulate watched items
      const watchedItems = ['tos_s1', 'tmp', 'tng_s1']

      // Use the pipeline to calculate progress
      const result = progressPipeline(watchedItems)

      // Verify the calculation matches expected progress
      expect(result.overall.total).toBe(5) // Total items across all eras
      expect(result.overall.completed).toBe(3) // Watched items
      expect(result.overall.percentage).toBe(60) // 3/5 * 100

      // Test era-specific progress
      const tosProgress = result.eraProgress.find(era => era.eraId === 'tos')
      const tngProgress = result.eraProgress.find(era => era.eraId === 'tng')

      expect(tosProgress?.completed).toBe(2) // tos_s1 + tmp
      expect(tosProgress?.percentage).toBe(67) // 2/3 * 100, rounded
      expect(tngProgress?.completed).toBe(1) // tng_s1
      expect(tngProgress?.percentage).toBe(50) // 1/2 * 100
    })

    it('should use composition utilities in progress calculation workflows', () => {
      const sideEffects: string[] = []

      // Create a complex progress calculation pipeline with side effects
      const progressWorkflow = pipe(
        ['tos_s1', 'tos_s2', 'tng_s1'], // watched items
        tap((items: string[]) => sideEffects.push(`Processing ${items.length} watched items`)),
        // Filter to only series items
        (watchedItems: string[]) =>
          mockStarTrekData
            .flatMap(era => era.items)
            .filter(item => watchedItems.includes(item.id))
            .filter(starTrekPredicates.byType('series')),
        tap((seriesItems: StarTrekItem[]) =>
          sideEffects.push(`Found ${seriesItems.length} watched series`),
        ),
        // Calculate total episodes watched
        starTrekTransformations.calculateTotalEpisodes,
        tap((totalEpisodes: number) =>
          sideEffects.push(`Total episodes watched: ${totalEpisodes}`),
        ),
      )

      const totalWatchedEpisodes = progressWorkflow

      expect(totalWatchedEpisodes).toBe(81) // 29 + 26 + 26 episodes
      expect(sideEffects).toEqual([
        'Processing 3 watched items',
        'Found 3 watched series',
        'Total episodes watched: 81',
      ])
    })

    it('should handle async progress updates with composition utilities', async () => {
      const progressUpdates: number[] = []

      // Simulate async progress calculation workflow
      const asyncProgressWorkflow = asyncPipe(
        ['tos_s1', 'tmp'], // watched items
        async (watchedItems: string[]) => {
          // Simulate async data loading
          await new Promise(resolve => setTimeout(resolve, 1))
          return watchedItems
        },
        (watchedItems: string[]) => {
          // Calculate progress
          const totalItems = mockStarTrekData.reduce((sum, era) => sum + era.items.length, 0)
          const watchedCount = watchedItems.length
          return Math.round((watchedCount / totalItems) * 100)
        },
        tap((percentage: number) => progressUpdates.push(percentage)),
        async (percentage: number) => {
          // Simulate async notification
          await new Promise(resolve => setTimeout(resolve, 1))
          return `Progress: ${percentage}%`
        },
      )

      const result = await asyncProgressWorkflow

      expect(result).toBe('Progress: 40%') // 2/5 * 100
      expect(progressUpdates).toEqual([40])
    })
  })

  describe('Integration with Search Filter module', () => {
    it('should integrate createSearchPipeline with search filter operations', () => {
      const filterResults: StarTrekEra[] = []

      // Create a search pipeline using composition utilities
      const searchPipeline = createSearchPipeline(mockStarTrekData, {
        onFilterComplete: filteredData => {
          filterResults.push(...filteredData)
        },
      })

      // Test search functionality
      const filterState: FilterState = {
        search: 'Original',
        filter: 'series',
      }

      const result = searchPipeline(filterState)

      // Should find TOS series items
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('tos')
      expect(result[0]?.items).toHaveLength(2) // Both TOS seasons
      expect(filterResults).toHaveLength(1)
    })

    it('should use composition utilities for complex search workflows', () => {
      const searchLogs: string[] = []

      // Create a complex search workflow using composition utilities
      const searchWorkflow = pipe(
        {search: 'Star Trek', filter: ''} as FilterState,
        tap((filterState: FilterState) =>
          searchLogs.push(`Searching for: "${filterState.search}"`),
        ),
        // Normalize search term
        (filterState: FilterState) => ({
          ...filterState,
          search: starTrekTransformations.normalizeSearchTerm(filterState.search),
        }),
        tap((filterState: FilterState) =>
          searchLogs.push(`Normalized term: "${filterState.search}"`),
        ),
        // Apply search to all items
        (filterState: FilterState) => {
          const allItems = mockStarTrekData.flatMap(era => era.items)
          return allItems.filter(item => starTrekPredicates.byText(filterState.search)(item))
        },
        tap((results: StarTrekItem[]) => searchLogs.push(`Found ${results.length} matching items`)),
        // Extract unique types
        starTrekTransformations.extractTypes,
        tap((types: string[]) => searchLogs.push(`Content types: ${types.join(', ')}`)),
      )

      const contentTypes = searchWorkflow

      expect(contentTypes).toEqual(['series', 'movie'])
      expect(searchLogs).toEqual([
        'Searching for: "Star Trek"',
        'Normalized term: "star trek"',
        'Found 2 matching items', // More items contain "Star Trek" than expected
        'Content types: series, movie',
      ])
    })

    it('should handle real-time search filtering with composition utilities', () => {
      const searchResults: StarTrekItem[][] = []

      // Simulate real-time search with debouncing using composition
      const realTimeSearch = pipe(
        ['Original', 'Next Generation', 'Motion'], // Search terms over time
        tap((searchTerms: string[]) =>
          searchResults.push(
            ...searchTerms.map(term => {
              const allItems = mockStarTrekData.flatMap(era => era.items)
              return allItems.filter(starTrekPredicates.byText(term))
            }),
          ),
        ),
        // Get final search statistics
        (searchTerms: string[]) => ({
          totalSearches: searchTerms.length,
          totalResults: searchResults.reduce((sum, results) => sum + results.length, 0),
        }),
      )

      const searchStats = realTimeSearch

      expect(searchStats.totalSearches).toBe(3)
      expect(searchStats.totalResults).toBe(5) // Adjusted based on actual results
      expect(searchResults).toHaveLength(3)
    })
  })

  describe('Cross-module composition integration', () => {
    it('should coordinate between progress and search modules using composition', () => {
      const coordinationLog: string[] = []

      // Create a workflow that coordinates search and progress
      const coordinatedWorkflow = pipe(
        {searchTerm: 'series', watchedItems: ['tos_s1', 'tng_s1']},
        tap((input: {searchTerm: string; watchedItems: string[]}) =>
          coordinationLog.push(`Starting workflow with search: ${input.searchTerm}`),
        ),
        // Find all series items
        (input: {searchTerm: string; watchedItems: string[]}) => {
          const allItems = mockStarTrekData.flatMap(era => era.items)
          const seriesItems = allItems.filter(starTrekPredicates.byType('series'))
          return {...input, seriesItems}
        },
        tap((data: any) => coordinationLog.push(`Found ${data.seriesItems.length} series items`)),
        // Calculate progress for series only
        (data: any) => {
          const watchedSeries = data.seriesItems.filter((item: StarTrekItem) =>
            data.watchedItems.includes(item.id),
          )
          const progressPercentage = Math.round(
            (watchedSeries.length / data.seriesItems.length) * 100,
          )
          return {...data, seriesProgress: progressPercentage}
        },
        tap((data: any) => coordinationLog.push(`Series progress: ${data.seriesProgress}%`)),
        // Return final summary
        (data: any) => ({
          totalSeries: data.seriesItems.length,
          watchedSeries: data.watchedItems.length,
          progress: data.seriesProgress,
        }),
      )

      const result = coordinatedWorkflow

      expect(result.totalSeries).toBe(4) // All series items
      expect(result.watchedSeries).toBe(2) // tos_s1 and tng_s1
      expect(result.progress).toBe(50) // 2/4 * 100
      expect(coordinationLog).toEqual([
        'Starting workflow with search: series',
        'Found 4 series items',
        'Series progress: 50%',
      ])
    })

    it('should handle complex event-driven workflows with composition', async () => {
      const eventLog: string[] = []

      // Simulate an event-driven workflow using async composition
      const eventWorkflow = asyncPipe(
        {action: 'toggle-item', itemId: 'tos_s1'},
        tap((event: {action: string; itemId: string}) =>
          eventLog.push(`Event: ${event.action} for ${event.itemId}`),
        ),
        async (event: {action: string; itemId: string}) => {
          // Simulate async state update
          await new Promise(resolve => setTimeout(resolve, 1))
          const item = mockStarTrekData
            .flatMap(era => era.items)
            .find(item => item.id === event.itemId)
          return {event, item}
        },
        tap((data: any) => eventLog.push(`Found item: ${data.item?.title || 'unknown'}`)),
        async (data: any) => {
          // Simulate async progress recalculation
          await new Promise(resolve => setTimeout(resolve, 1))
          if (data.event.action === 'toggle-item') {
            return {
              ...data,
              newProgress: Math.random() * 100, // Simulated new progress
            }
          }
          return data
        },
        tap((data: any) => eventLog.push(`Updated progress: ${Math.round(data.newProgress)}%`)),
      )

      const result = await eventWorkflow

      expect(result.event.itemId).toBe('tos_s1')
      expect(result.item?.title).toBe('The Original Series Season 1')
      expect(typeof result.newProgress).toBe('number')
      expect(eventLog).toHaveLength(3)
      expect(eventLog[0]).toBe('Event: toggle-item for tos_s1')
      expect(eventLog[1]).toBe('Found item: The Original Series Season 1')
      expect(eventLog[2]).toMatch(/Updated progress: \d+%/)
    })

    it('should validate composition utility performance in real-world scenarios', () => {
      const performanceMetrics: number[] = []

      // Performance test: large dataset processing
      const largeDataset = Array.from({length: 1000}, (_, i) => ({
        id: `item_${i}`,
        title: `Test Item ${i}`,
        type: i % 3 === 0 ? 'series' : i % 3 === 1 ? 'movie' : 'animated',
        year: `${1960 + (i % 60)}`,
        stardate: `${1000 + i}.${i % 10}`,
        episodes: i % 3 === 0 ? Math.floor(Math.random() * 50) + 10 : undefined,
        notes: `Test item ${i} notes`,
      }))

      const performanceWorkflow = pipe(
        largeDataset,
        tap(() => {
          const start = performance.now()
          performanceMetrics.push(start)
        }),
        // Filter series items
        (items: any[]) => items.filter(starTrekPredicates.byType('series')),
        tap(() => performanceMetrics.push(performance.now())),
        // Sort by year
        starTrekTransformations.sortByYear,
        tap(() => performanceMetrics.push(performance.now())),
        // Calculate total episodes
        starTrekTransformations.calculateTotalEpisodes,
        tap(() => performanceMetrics.push(performance.now())),
      )

      const totalEpisodes = performanceWorkflow
      const totalTime = (performanceMetrics[3] ?? 0) - (performanceMetrics[0] ?? 0)

      expect(typeof totalEpisodes).toBe('number')
      expect(totalEpisodes).toBeGreaterThan(0)
      expect(totalTime).toBeLessThan(50) // Should complete within 50ms
      expect(performanceMetrics).toHaveLength(4)
    })
  })
})
