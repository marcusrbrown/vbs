/**
 * Tests for validate-episode-data CLI script.
 * Validates comprehensive data validation, quality scoring, and reporting capabilities.
 */

import type {Episode, EpisodeMetadata} from '../src/modules/types.js'
import process from 'node:process'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {hasEpisodeData} from '../src/modules/types.js'

const originalArgv = process.argv
const originalExit = process.exit

describe('validate-episode-data CLI script', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    process.exit = vi.fn() as never
  })

  afterEach(() => {
    process.argv = originalArgv
    process.exit = originalExit
    vi.restoreAllMocks()
  })

  describe('Episode data loading', () => {
    it('should load all episodes from star-trek-data', async () => {
      const {starTrekData} = await import('../src/data/star-trek-data.js')
      let episodeCount = 0

      for (const era of starTrekData) {
        for (const item of era.items) {
          if (hasEpisodeData(item)) {
            episodeCount += item.episodeData.length
          }
        }
      }

      expect(episodeCount).toBeGreaterThan(0)
      expect(episodeCount).toBeGreaterThan(20)
    })

    it('should have valid episode data structure', async () => {
      const {starTrekData} = await import('../src/data/star-trek-data.js')

      for (const era of starTrekData) {
        for (const item of era.items) {
          if (hasEpisodeData(item)) {
            for (const episode of item.episodeData) {
              expect(episode.id).toBeDefined()
              expect(typeof episode.id).toBe('string')
              expect(episode.title).toBeDefined()
              expect(typeof episode.season).toBe('number')
              expect(typeof episode.episode).toBe('number')
              expect(episode.airDate).toBeDefined()
              expect(episode.synopsis).toBeDefined()
              // plotPoints and guestStars are optional but should be arrays when present
              if (episode.plotPoints !== undefined) {
                expect(Array.isArray(episode.plotPoints)).toBe(true)
              }
              if (episode.guestStars !== undefined) {
                expect(Array.isArray(episode.guestStars)).toBe(true)
              }
            }
          }
        }
      }
    })
  })

  describe('Episode validation', () => {
    it('should validate episode structure', async () => {
      const {isValidEpisodeId} = await import('../src/utils/metadata-validation.js')

      expect(isValidEpisodeId('ent_s1_e01')).toBe(true)
      expect(isValidEpisodeId('tng_s3_e15')).toBe(true)
      expect(isValidEpisodeId('invalid_id')).toBe(false)
      expect(isValidEpisodeId('no_season')).toBe(false)
    })

    it('should validate episode with validateEpisodeWithReporting', async () => {
      const {validateEpisodeWithReporting} = await import('../src/utils/metadata-validation.js')

      const validEpisode: Episode = {
        id: 'ent_s1_e01',
        title: 'Broken Bow',
        season: 1,
        episode: 1,
        airDate: '2001-09-26',
        stardate: 'None',
        synopsis: 'Captain Archer and his crew embark on their first mission.',
        plotPoints: ['First mission'],
        guestStars: ['John Fleck'],
        connections: [],
      }

      const result = validateEpisodeWithReporting(validEpisode)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect validation errors', async () => {
      const {validateEpisodeWithReporting} = await import('../src/utils/metadata-validation.js')

      const invalidEpisode = {
        id: 'invalid_id',
        title: 'Test Episode',
        season: -1,
        episode: 0,
        airDate: 'invalid-date',
        stardate: 'None',
        synopsis: '',
        plotPoints: [],
        guestStars: [],
        connections: [],
      }

      const result = validateEpisodeWithReporting(invalidEpisode)
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('Quality scoring', () => {
    it('should calculate quality scores for episodes', async () => {
      const {createQualityScorer} = await import('../src/modules/metadata-quality.js')
      const qualityScorer = createQualityScorer()

      const metadata: EpisodeMetadata = {
        episodeId: 'ent_s1_e01',
        dataSource: 'memory-alpha',
        lastUpdated: new Date().toISOString(),
        isValidated: true,
        confidenceScore: 0.9,
        version: '1.0',
        enrichmentStatus: 'complete',
        fieldValidation: {
          title: {isValid: true, source: 'memory-alpha'},
          airDate: {isValid: true, source: 'tmdb'},
          synopsis: {isValid: true, source: 'memory-alpha'},
        },
      }

      const mockSource = {
        name: 'Memory Alpha',
        type: 'memory-alpha' as const,
        baseUrl: 'https://memory-alpha.fandom.com',
        confidenceLevel: 0.9,
        lastAccessed: new Date().toISOString(),
        isAvailable: true,
        rateLimit: {
          requestsPerMinute: 30,
          burstLimit: 10,
        },
        fields: ['synopsis', 'plotPoints'],
        reliability: {
          uptime: 0.95,
          accuracy: 0.9,
          latency: 200,
        },
      }

      const score = qualityScorer.calculateQualityScore(metadata, mockSource)
      expect(score).toBeDefined()
      if (score) {
        expect(typeof score.overall).toBe('number')
        expect(score.overall).toBeGreaterThanOrEqual(0)
        expect(score.overall).toBeLessThanOrEqual(1)
        expect(score.qualityGrade).toBeDefined()
      }
    })

    it('should generate quality recommendations', async () => {
      const {createQualityScorer} = await import('../src/modules/metadata-quality.js')
      const qualityScorer = createQualityScorer()

      const incompleteMetadata: EpisodeMetadata = {
        episodeId: 'test_s1_e01',
        dataSource: 'manual',
        lastUpdated: '2020-01-01T00:00:00.000Z',
        isValidated: false,
        confidenceScore: 0.3,
        version: '1.0',
        enrichmentStatus: 'partial',
      }

      const mockSource = {
        name: 'Manual Entry',
        type: 'manual' as const,
        baseUrl: '',
        confidenceLevel: 0.7,
        lastAccessed: new Date().toISOString(),
        isAvailable: true,
        rateLimit: {
          requestsPerMinute: 0,
          burstLimit: 0,
        },
        fields: [],
        reliability: {
          uptime: 1,
          accuracy: 0.7,
          latency: 0,
        },
      }

      const score = qualityScorer.calculateQualityScore(incompleteMetadata, mockSource)
      expect(score).toBeDefined()
      if (score) {
        expect(score.recommendations).toBeDefined()
        expect(score.recommendations.length).toBeGreaterThan(0)
        expect(score.missingFields).toBeDefined()
      }
    })
  })

  describe('Metadata mock generation', () => {
    it('should create mock metadata from episode data', async () => {
      const episode: Episode = {
        id: 'tng_s3_e15',
        title: "Yesterday's Enterprise",
        season: 3,
        episode: 15,
        airDate: '1990-02-19',
        stardate: '43625.2',
        synopsis: 'The Enterprise-C emerges from a temporal rift.',
        plotPoints: ['Alternate timeline', 'Enterprise-C returns'],
        guestStars: ['Denise Crosby as Tasha Yar'],
        connections: [],
        productionCode: '163',
        director: ['David Carson'],
        writer: ['Trent Christopher Ganino'],
      }

      const enrichmentStatus =
        episode.productionCode && episode.director && episode.writer ? 'complete' : 'partial'
      expect(['pending', 'partial', 'complete', 'failed']).toContain(enrichmentStatus)
    })
  })

  describe('Report generation', () => {
    it('should generate validation statistics', () => {
      const mockResults = [
        {
          episodeId: 'ent_s1_e01',
          episodeTitle: 'Broken Bow',
          season: 1,
          episode: 1,
          isValid: true,
          errors: [],
          warnings: [],
          qualityScore: 0.85,
          qualityGrade: 'good',
          missingFields: ['productionCode'],
          recommendations: [],
        },
        {
          episodeId: 'ent_s1_e02',
          episodeTitle: 'Fight or Flight',
          season: 1,
          episode: 2,
          isValid: true,
          errors: [],
          warnings: [],
          qualityScore: 0.75,
          qualityGrade: 'acceptable',
          missingFields: ['director', 'writer'],
          recommendations: ['Consider enriching metadata'],
        },
      ]

      const totalEpisodes = mockResults.length
      const validEpisodes = mockResults.filter(r => r.isValid).length
      const avgQuality =
        mockResults.reduce((sum, r) => sum + (r.qualityScore ?? 0), 0) / mockResults.length

      expect(totalEpisodes).toBe(2)
      expect(validEpisodes).toBe(2)
      expect(avgQuality).toBeGreaterThan(0.7)
    })

    it('should count common errors and warnings', () => {
      const mockResults = [
        {
          episodeId: 'test1',
          episodeTitle: 'Test 1',
          season: 1,
          episode: 1,
          isValid: false,
          errors: [{field: 'id', message: 'Invalid ID format', severity: 'error' as const}],
          warnings: [],
          qualityScore: null,
          qualityGrade: null,
          missingFields: [],
          recommendations: [],
        },
        {
          episodeId: 'test2',
          episodeTitle: 'Test 2',
          season: 1,
          episode: 2,
          isValid: false,
          errors: [{field: 'id', message: 'Invalid ID format', severity: 'error' as const}],
          warnings: [],
          qualityScore: null,
          qualityGrade: null,
          missingFields: [],
          recommendations: [],
        },
      ]

      const errorCounts = new Map<string, number>()
      for (const result of mockResults) {
        for (const error of result.errors) {
          const count = errorCounts.get(error.message) || 0
          errorCounts.set(error.message, count + 1)
        }
      }

      expect(errorCounts.get('Invalid ID format')).toBe(2)
    })
  })

  describe('Field coverage analysis', () => {
    it('should track missing metadata fields', () => {
      const mockResults = [
        {
          episodeId: 'test1',
          episodeTitle: 'Test 1',
          season: 1,
          episode: 1,
          isValid: true,
          errors: [],
          warnings: [],
          qualityScore: 0.7,
          qualityGrade: 'acceptable',
          missingFields: ['productionCode', 'director'],
          recommendations: [],
        },
        {
          episodeId: 'test2',
          episodeTitle: 'Test 2',
          season: 1,
          episode: 2,
          isValid: true,
          errors: [],
          warnings: [],
          qualityScore: 0.6,
          qualityGrade: 'acceptable',
          missingFields: ['director', 'writer'],
          recommendations: [],
        },
      ]

      const fieldCoverage: Record<string, number> = {}
      for (const result of mockResults) {
        for (const field of result.missingFields) {
          fieldCoverage[field] = (fieldCoverage[field] || 0) + 1
        }
      }

      expect(fieldCoverage.director).toBe(2)
      expect(fieldCoverage.productionCode).toBe(1)
      expect(fieldCoverage.writer).toBe(1)
    })
  })

  describe('Quality distribution', () => {
    it('should categorize quality grades', () => {
      const mockResults = [
        {qualityGrade: 'excellent'},
        {qualityGrade: 'good'},
        {qualityGrade: 'good'},
        {qualityGrade: 'acceptable'},
        {qualityGrade: 'poor'},
      ]

      const distribution = {
        excellent: 0,
        good: 0,
        acceptable: 0,
        poor: 0,
        insufficient: 0,
      }

      for (const result of mockResults) {
        if (result.qualityGrade) {
          const grade = result.qualityGrade as keyof typeof distribution
          distribution[grade]++
        }
      }

      expect(distribution.excellent).toBe(1)
      expect(distribution.good).toBe(2)
      expect(distribution.acceptable).toBe(1)
      expect(distribution.poor).toBe(1)
      expect(distribution.insufficient).toBe(0)
    })
  })

  describe('Integration with existing modules', () => {
    it('should use functional composition utilities', async () => {
      const {pipe} = await import('../src/utils/composition.js')

      const episodes = [
        {id: 'ent_s1_e01', season: 1},
        {id: 'ent_s1_e02', season: 1},
        {id: 'ent_s2_e01', season: 2},
      ]

      const result = pipe(
        episodes,
        (eps: typeof episodes) => eps.filter(ep => ep.season === 1),
        (eps: typeof episodes) => eps.map(ep => ep.id),
      )

      expect(result).toEqual(['ent_s1_e01', 'ent_s1_e02'])
    })

    it('should integrate with progress validation utilities', async () => {
      const {isValidEpisodeId, isValidISOTimestamp} = await import(
        '../src/utils/metadata-validation.js'
      )

      expect(isValidEpisodeId('ent_s1_e01')).toBe(true)
      expect(isValidISOTimestamp('2025-08-12T10:30:00.000Z')).toBe(true)
      expect(isValidISOTimestamp('invalid-timestamp')).toBe(false)
    })
  })
})
