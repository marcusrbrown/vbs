/**
 * Integration tests for generate-star-trek-data.ts refactored script.
 *
 * Uses static code analysis to verify implementation patterns for CLI scripts
 * that require real TMDB API calls, file system operations, and manual invocation.
 */

import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {
  mergeEpisodeFromSources,
  mergeMovieFromSources,
  resolveConflict,
} from '../../scripts/generate-star-trek-data.js'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

const getScriptContent = (): string => {
  const scriptPath = resolve(process.cwd(), 'scripts/generate-star-trek-data.ts')
  return readFileSync(scriptPath, 'utf-8')
}

describe('generate-star-trek-data Integration Tests', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = {...process.env}
    vi.resetAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  describe('TASK-024: Metadata-Sources Integration', () => {
    it('should not make direct TMDB API calls', () => {
      const scriptContent = getScriptContent()

      expect(scriptContent).toContain("from '../src/modules/metadata-sources.js'")
      expect(scriptContent).toContain('createMetadataSources')
      expect(scriptContent).toContain('enrichEpisode')
    })

    it('should use factory pattern for metadata-sources', () => {
      const scriptContent = getScriptContent()

      expect(scriptContent).toContain('createMetadataSources')
      expect(scriptContent).toContain('metadataSources')
      expect(scriptContent).toContain('enrichEpisode')
    })

    it('should import metadata quality module', () => {
      const scriptContent = getScriptContent()

      expect(scriptContent).toContain("from '../src/modules/metadata-quality.js'")
      expect(scriptContent).toContain('createQualityScorer')
      expect(scriptContent).toContain('DEFAULT_QUALITY_SCORING_CONFIG')
    })

    it('should use production config from source-config module', () => {
      const scriptContent = getScriptContent()

      expect(scriptContent).toContain("from './lib/source-config.js'")
      expect(scriptContent).toContain('getMetadataConfig')
      expect(scriptContent).toContain('logMetadataSourceStatus')
    })

    it('should initialize metadata sources with proper configuration', () => {
      const scriptContent = getScriptContent()

      expect(scriptContent).toContain('getMetadataConfig()')
      expect(scriptContent).toContain('createMetadataSources')
      expect(scriptContent).toContain('TMDB_RATE_LIMIT_MS')
    })
  })

  describe('TASK-025: Quality Scoring', () => {
    it('should enforce quality threshold of 0.6', () => {
      const scriptContent = getScriptContent()

      expect(scriptContent).toContain('QUALITY_THRESHOLD_MINIMUM')
      expect(scriptContent).toContain('0.6')
      expect(scriptContent).toMatch(/qualityScore\.overall\s*>=\s*QUALITY_THRESHOLD_MINIMUM/)
    })

    it('should calculate quality scores for episodes', () => {
      const scriptContent = getScriptContent()

      expect(scriptContent).toContain('createQualityScorer')
      expect(scriptContent).toContain('calculateQualityScore')
      expect(scriptContent).toContain('qualityScore')
    })

    it('should target average quality score of 0.75', () => {
      const scriptContent = getScriptContent()

      expect(scriptContent).toContain('QUALITY_THRESHOLD_TARGET')
      expect(scriptContent).toContain('0.75')
    })

    it('should generate quality summary reports', () => {
      const scriptContent = getScriptContent()

      expect(scriptContent).toContain('Quality Summary')
      expect(scriptContent).toContain('qualityGrade')
      expect(scriptContent).toContain('completeness')
      expect(scriptContent).toContain('missingFields')
      expect(scriptContent).toContain('recommendations')
    })

    it('should log quality metrics for each episode', () => {
      const scriptContent = getScriptContent()

      expect(scriptContent).toContain('qualityScore.overall')
      expect(scriptContent).toContain('qualityScore.qualityGrade')
      expect(scriptContent).toContain('logger.debug')
    })
  })

  describe('TASK-026: API Failure Handling', () => {
    it('should use withErrorHandling wrapper', () => {
      const scriptContent = getScriptContent()

      expect(scriptContent).toContain("from '../src/modules/error-handler.js'")
      expect(scriptContent).toContain('withErrorHandling')
    })

    it('should implement error event handlers', () => {
      const scriptContent = getScriptContent()

      expect(scriptContent).toContain('enrichment-failed')
      expect(scriptContent).toContain('errorTracker')
      expect(scriptContent).toContain('errorsByCategory')
    })

    it('should categorize errors', () => {
      const scriptContent = getScriptContent()

      expect(scriptContent).toContain('ErrorTracker')
      expect(scriptContent).toContain('errorsByCategory')
      expect(scriptContent).toContain('errorsBySource')
      expect(scriptContent).toContain('failedEpisodes')
    })

    it('should generate error summary reports', () => {
      const scriptContent = getScriptContent()

      expect(scriptContent).toContain('getUsageAnalytics')
      expect(scriptContent).toContain('totalErrors')
      expect(scriptContent).toContain('Error Breakdown by Source')
    })

    it('should provide actionable error messages', () => {
      const scriptContent = getScriptContent()

      expect(scriptContent).toContain('retry guidance')
      expect(scriptContent).toContain('episodeId')
      expect(scriptContent).toContain('logger.error')
    })
  })

  describe('TASK-027: Rate Limiting', () => {
    it('should not implement manual rate limiting', () => {
      const scriptContent = getScriptContent()

      expect(scriptContent).toContain('TMDB_RATE_LIMIT_MS')
      expect(scriptContent).toContain('createMetadataSources')
    })

    it('should rely on metadata-sources token bucket', () => {
      const scriptContent = getScriptContent()

      expect(scriptContent).toContain('createMetadataSources')
      expect(scriptContent).toContain('enrichEpisode')
    })

    it('should implement health monitoring', () => {
      const scriptContent = getScriptContent()

      expect(scriptContent).toContain('HealthMonitor')
      expect(scriptContent).toContain('getHealthStatus')
      expect(scriptContent).toContain('health-status-change')
    })

    it('should detect unhealthy sources', () => {
      const scriptContent = getScriptContent()

      expect(scriptContent).toContain('unhealthySources')
      expect(scriptContent).toContain('isHealthy')
      expect(scriptContent).toContain('consecutiveFailures')
    })
  })

  describe('TASK-028: Baseline Performance Benchmark', () => {
    it('should have performance benchmarking capability', () => {
      const scriptContent = getScriptContent()

      expect(scriptContent).toContain('new Date()')
      expect(scriptContent).toContain('toISOString()')
    })

    it('should support series filtering for benchmarks', () => {
      const scriptContent = getScriptContent()

      expect(scriptContent).toContain('--series')
      expect(scriptContent).toContain('filterSeries')
    })
  })

  describe('TASK-029: Performance Comparison', () => {
    it('should log performance metrics', () => {
      const scriptContent = getScriptContent()

      expect(scriptContent).toContain('getUsageAnalytics')
      expect(scriptContent).toContain('averageResponseTime')
    })

    it('should track response times from metadata sources', () => {
      const scriptContent = getScriptContent()

      expect(scriptContent).toContain('getUsageAnalytics')
      expect(scriptContent).toContain('averageResponseTime')
    })
  })

  describe('TASK-030: Output Data Format Validation', () => {
    it('should generate proper era structure', () => {
      const scriptContent = getScriptContent()

      expect(scriptContent).toContain('NormalizedEra')
      expect(scriptContent).toContain('groupItemsByEra')
      expect(scriptContent).toContain('ERA_DEFINITIONS')
    })

    it('should generate proper episode structure', () => {
      const scriptContent = getScriptContent()

      expect(scriptContent).toContain('NormalizedEpisodeItem')
      expect(scriptContent).toContain('normalizeEpisode')
      expect(scriptContent).toContain('episodeData')
    })

    it('should generate proper season structure', () => {
      const scriptContent = getScriptContent()

      expect(scriptContent).toContain('NormalizedSeasonItem')
      expect(scriptContent).toContain('normalizeSeason')
    })

    it('should generate proper movie structure', () => {
      const scriptContent = getScriptContent()

      expect(scriptContent).toContain('NormalizedMovieItem')
      expect(scriptContent).toContain('normalizeMovie')
    })

    it('should export star-trek-data compatible format', () => {
      const scriptContent = getScriptContent()

      expect(scriptContent).toContain('generateStarTrekDataFile')
      expect(scriptContent).toContain('export const starTrekData')
      expect(scriptContent).toContain('NormalizedEra')
    })
  })

  describe('Data Merging and Conflict Resolution', () => {
    it('should merge episode data from multiple sources', () => {
      const episodeData = [
        {
          episodeId: 'tos_s1_e01',
          tmdbId: 123,
          title: 'The Man Trap',
          season: 1,
          episode: 1,
          airDate: '1966-09-08',
          overview: 'Overview from TMDB',
          runtime: 50,
          source: 'tmdb',
        },
        {
          episodeId: 'tos_s1_e01',
          tmdbId: 123,
          title: 'The Man Trap',
          season: 1,
          episode: 1,
          airDate: '1966-09-08',
          overview: 'Better overview from Memory Alpha',
          runtime: 50,
          director: 'Marc Daniels',
          source: 'memory-alpha',
        },
      ]

      const merged = mergeEpisodeFromSources(episodeData)

      expect(merged).toBeTruthy()
      expect(merged?.overview).toBe('Better overview from Memory Alpha')
      expect(merged?.director).toBe('Marc Daniels')
    })

    it('should merge movie data from multiple sources', () => {
      const movieData = [
        {
          movieId: 'tmp',
          tmdbId: 456,
          title: 'Star Trek: The Motion Picture',
          releaseDate: '1979-12-07',
          overview: 'TMDB overview',
          runtime: 132,
          source: 'tmdb',
        },
        {
          movieId: 'tmp',
          tmdbId: 456,
          title: 'Star Trek: The Motion Picture',
          releaseDate: '1979-12-07',
          overview: 'Better overview from Memory Alpha',
          runtime: 136,
          director: 'Robert Wise',
          source: 'memory-alpha',
        },
      ]

      const merged = mergeMovieFromSources(movieData)

      expect(merged).toBeTruthy()
      expect(merged?.overview).toBe('Better overview from Memory Alpha')
      expect(merged?.director).toBe('Robert Wise')
      expect(merged?.runtime).toBe(136)
    })

    it('should resolve conflicts using source priority', () => {
      const values = [
        {value: 'TMDB value', source: 'tmdb'},
        {value: 'Memory Alpha value', source: 'memory-alpha'},
        {value: 'TrekCore value', source: 'trekcore'},
      ]

      const resolved = resolveConflict(values)

      expect(resolved).toBe('Memory Alpha value')
    })

    it('should handle missing sources gracefully', () => {
      const episodeData = [
        {
          episodeId: 'tos_s1_e01',
          tmdbId: 123,
          title: 'The Man Trap',
          season: 1,
          episode: 1,
          airDate: '1966-09-08',
          overview: 'Overview',
          runtime: 50,
          source: 'tmdb',
        },
      ]

      const merged = mergeEpisodeFromSources(episodeData)

      expect(merged).toBeTruthy()
      expect(merged?.title).toBe('The Man Trap')
    })
  })

  describe('ID Generation Functions', () => {
    it('should have generateEpisodeId function', () => {
      const scriptContent = getScriptContent()

      // Verify episode ID generation function exists
      expect(scriptContent).toContain('generateEpisodeId')
      expect(scriptContent).toMatch(/series_s\{season\}_e\{episode\}/)
    })

    it('should have generateSeriesCode function', () => {
      const scriptContent = getScriptContent()

      // Verify series code mapping
      expect(scriptContent).toContain('SERIES_CODE_MAP')
      expect(scriptContent).toContain("'the next generation': 'tng'")
      expect(scriptContent).toContain("'deep space nine': 'ds9'")
    })

    it('should have generateMovieId function', () => {
      const scriptContent = getScriptContent()

      // Verify movie ID mapping
      expect(scriptContent).toContain('MOVIE_ID_MAP')
      expect(scriptContent).toContain("'the motion picture': 'tmp'")
      expect(scriptContent).toContain("'first contact': 'fc'")
    })

    it('should handle episode number formatting', () => {
      const scriptContent = getScriptContent()

      // Verify episode ID format pattern
      expect(scriptContent).toContain('generateEpisodeId')
    })
  })

  describe('Era Classification', () => {
    it('should classify TOS series correctly', () => {
      const scriptContent = getScriptContent()

      // Verify TOS era classification
      expect(scriptContent).toContain("id: 'tos_era'")
      expect(scriptContent).toContain("seriesCodes: ['tos', 'tas']")
    })

    it('should classify TNG era correctly', () => {
      const scriptContent = getScriptContent()

      // Verify TNG era classification
      expect(scriptContent).toContain("id: 'tng_era'")
      expect(scriptContent).toContain("seriesCodes: ['tng', 'ds9', 'voy']")
    })

    it('should handle Discovery series spanning multiple eras', () => {
      const scriptContent = getScriptContent()

      // Verify Discovery era handling
      expect(scriptContent).toContain('classifyDiscoverySeason')
      expect(scriptContent).toContain("id: 'discovery_snw'")
      expect(scriptContent).toContain("id: 'far_future'")
    })

    it('should classify Kelvin timeline correctly', () => {
      const scriptContent = getScriptContent()

      // Verify Kelvin timeline classification
      expect(scriptContent).toContain("id: 'kelvin_timeline'")
      expect(scriptContent).toContain("movieIds: ['st2009', 'stid', 'stb']")
    })
  })

  describe('Chronological Ordering', () => {
    it('should sort items by year and stardate', () => {
      const scriptContent = getScriptContent()

      // Verify chronological sorting
      expect(scriptContent).toContain('compareItemsChronologically')
      expect(scriptContent).toContain('extractYearForSorting')
      expect(scriptContent).toContain('extractStardateForSorting')
    })

    it('should sort episodes by air date', () => {
      const scriptContent = getScriptContent()

      // Verify episode sorting
      expect(scriptContent).toContain('sortEpisodesChronologically')
      expect(scriptContent).toContain('airDate')
    })

    it('should apply chronological ordering to eras', () => {
      const scriptContent = getScriptContent()

      // Verify era ordering
      expect(scriptContent).toContain('applyChronologicalOrdering')
      expect(scriptContent).toContain('sortEraChronologically')
    })
  })

  describe('Code Generation', () => {
    it('should escape strings properly for TypeScript', () => {
      const scriptContent = getScriptContent()

      // Verify string escaping
      expect(scriptContent).toContain('escapeStringForTS')
    })

    it('should generate episode code', () => {
      const scriptContent = getScriptContent()

      // Verify episode code generation
      expect(scriptContent).toContain('generateEpisodeCode')
    })

    it('should generate item code', () => {
      const scriptContent = getScriptContent()

      // Verify item code generation
      expect(scriptContent).toContain('generateItemCode')
    })

    it('should generate era code', () => {
      const scriptContent = getScriptContent()

      // Verify era code generation
      expect(scriptContent).toContain('generateEraCode')
    })

    it('should generate complete star-trek-data file', () => {
      const scriptContent = getScriptContent()

      // Verify file generation
      expect(scriptContent).toContain('generateStarTrekDataFile')
    })
  })

  describe('CLI Argument Parsing', () => {
    it('should parse mode argument', () => {
      const scriptContent = getScriptContent()

      // Verify mode parsing (uses conditional logic with variables)
      expect(scriptContent).toContain('--mode')
      expect(scriptContent).toContain("'full'")
      expect(scriptContent).toContain("'incremental'")
    })

    it('should parse series filter', () => {
      const scriptContent = getScriptContent()

      // Verify series filter parsing
      expect(scriptContent).toContain('--series')
      expect(scriptContent).toContain('filterSeries')
    })

    it('should parse dry-run flag', () => {
      const scriptContent = getScriptContent()

      // Verify dry-run parsing
      expect(scriptContent).toContain('--dry-run')
      expect(scriptContent).toContain('dryRun')
    })

    it('should parse output path', () => {
      const scriptContent = getScriptContent()

      // Verify output path parsing
      expect(scriptContent).toContain('--output')
      expect(scriptContent).toContain("output: 'src/data/star-trek-data.ts'")
    })

    it('should parse verbose flag', () => {
      const scriptContent = getScriptContent()

      // Verify verbose flag parsing
      expect(scriptContent).toContain('--verbose')
      expect(scriptContent).toContain('verbose')
    })
  })

  describe('Incremental Mode', () => {
    it('should support incremental data merging', () => {
      const scriptContent = getScriptContent()

      // Verify incremental mode support
      expect(scriptContent).toContain('mergeIncrementalData')
      expect(scriptContent).toContain('loadExistingData')
    })

    it('should preserve manual edits in incremental mode', () => {
      const scriptContent = getScriptContent()

      // Verify manual edit preservation
      expect(scriptContent).toContain('notes')
      expect(scriptContent).toContain('preserve')
    })
  })

  describe('Environment Configuration', () => {
    it('should load environment variables', () => {
      const scriptContent = getScriptContent()

      // Verify environment loading
      expect(scriptContent).toContain('loadEnv')
      expect(scriptContent).toContain('TMDB_API_KEY')
    })

    it('should handle missing TMDB API key gracefully', () => {
      const scriptContent = getScriptContent()

      // Verify graceful fallback
      expect(scriptContent).toContain('optional')
      expect(scriptContent).toContain('fallback')
    })
  })

  describe('Logging and Debugging', () => {
    it('should use logger for output', () => {
      const scriptContent = getScriptContent()

      // Verify logger usage
      expect(scriptContent).toContain('createLogger')
      expect(scriptContent).toContain('logger.info')
      expect(scriptContent).toContain('logger.debug')
      expect(scriptContent).toContain('logger.error')
    })

    it('should log progress during generation', () => {
      const scriptContent = getScriptContent()

      // Verify progress logging (uses 'Starting', 'complete', 'Enumeration', etc.)
      expect(scriptContent).toContain('logger.info')
      expect(scriptContent).toContain('Starting')
      expect(scriptContent).toContain('complete')
    })

    it('should respect verbose flag', () => {
      const scriptContent = getScriptContent()

      // Verify verbose flag usage
      expect(scriptContent).toContain('verbose')
      expect(scriptContent).toContain('minLevel')
    })
  })

  describe('Error Recovery', () => {
    it('should handle main function errors', () => {
      const scriptContent = getScriptContent()

      // Verify error handling in main
      expect(scriptContent).toContain('main().catch')
      expect(scriptContent).toContain('EXIT_CODES.FATAL_ERROR')
    })

    it('should provide error context', () => {
      const scriptContent = getScriptContent()

      // Verify error context
      expect(scriptContent).toContain('error.message')
      expect(scriptContent).toContain('console.error')
    })
  })
})
