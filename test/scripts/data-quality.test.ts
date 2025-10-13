/**
 * Comprehensive test suite for data-quality.ts module.
 * Tests all quality validation, scoring, and reporting functions (TASK-026 through TASK-035).
 */

import {describe, expect, it} from 'vitest'
import {
  calculateCompletenessScore,
  calculateItemQualityScore,
  checkEpisodeCompleteness,
  checkMovieCompleteness,
  checkSeasonCompleteness,
  detectDuplicateEpisodes,
  detectDuplicateIds,
  extractEpisodeNumber,
  extractSeasonNumber,
  extractSeriesCode,
  formatQualityReport,
  generateDataDiff,
  generateEpisodeId,
  generateProvenanceComment,
  generateQualityReport,
  MINIMUM_QUALITY_THRESHOLD,
  parseProvenanceComment,
  validateAirDateOrdering,
  validateCrossReferences,
  validateEpisodeId,
  validateFormatting,
  validateIdFormat,
  validateMovieId,
  validateSeasonId,
  validateStardateOrdering,
  validateYearOrdering,
  type NormalizedEpisodeItem,
  type NormalizedEra,
  type NormalizedMovieItem,
  type NormalizedSeasonItem,
} from '../../scripts/lib/data-quality.js'

// ============================================================================
// TEST DATA FIXTURES
// ============================================================================

const createMockEpisode = (
  overrides: Partial<NormalizedEpisodeItem> = {},
): NormalizedEpisodeItem => ({
  id: 'tos_s1_e01',
  title: 'The Man Trap',
  season: 1,
  episode: 1,
  airDate: '1966-09-08',
  stardate: '1531.1',
  synopsis: 'The crew encounters a shape-shifting creature that feeds on salt.',
  plotPoints: ['Introduction of the salt vampire', 'First landing on M-113'],
  guestStars: ['Jeanne Bal as Nancy Crater'],
  connections: [],
  ...overrides,
})

const createMockSeason = (overrides: Partial<NormalizedSeasonItem> = {}): NormalizedSeasonItem => ({
  id: 'tos_s1',
  title: 'Star Trek: The Original Series Season 1',
  type: 'series',
  year: '2266',
  stardate: '1531.1-2821.5',
  episodes: 29,
  notes: 'First season of the original series',
  episodeData: [],
  ...overrides,
})

const createMockMovie = (overrides: Partial<NormalizedMovieItem> = {}): NormalizedMovieItem => ({
  id: 'tmp',
  title: 'Star Trek: The Motion Picture',
  type: 'movie',
  year: '2271',
  stardate: '7410.2',
  synopsis: 'The crew reunites to face a mysterious alien threat.',
  director: ['Robert Wise'],
  writer: ['Harold Livingston'],
  cast: ['William Shatner', 'Leonard Nimoy'],
  ...overrides,
})

const createMockEra = (overrides: Partial<NormalizedEra> = {}): NormalizedEra => ({
  id: 'tos_era',
  title: '23rd Century – Original Series Era',
  years: '2265–2293',
  stardates: 'Four-digit stardates',
  description: 'The original five-year mission and beyond',
  items: [],
  ...overrides,
})

// ============================================================================
// TASK-027: EPISODE ID VALIDATION AND AUTO-GENERATION
// ============================================================================

describe('Episode ID Validation (TASK-027)', () => {
  describe('validateEpisodeId', () => {
    it('should validate correct episode ID format', () => {
      expect(validateEpisodeId('tos_s1_e01')).toBe(true)
      expect(validateEpisodeId('tng_s3_e15')).toBe(true)
      expect(validateEpisodeId('dis_s2_e04')).toBe(true)
    })

    it('should reject invalid episode ID formats', () => {
      expect(validateEpisodeId('invalid')).toBe(false)
      expect(validateEpisodeId('TOS_S1_E01')).toBe(false)
      expect(validateEpisodeId('tos_s1')).toBe(false)
      expect(validateEpisodeId('tos_e01')).toBe(false)
      expect(validateEpisodeId('')).toBe(false)
    })
  })

  describe('generateEpisodeId', () => {
    it('should generate correct episode ID from series name', () => {
      expect(generateEpisodeId('Star Trek: The Next Generation', 3, 15)).toBe('tng_s3_e15')
      expect(generateEpisodeId('Star Trek: The Original Series', 1, 1)).toBe('tos_s1_e01')
      expect(generateEpisodeId('Star Trek: Discovery', 2, 4)).toBe('dis_s2_e04')
    })

    it('should pad episode numbers with zero', () => {
      expect(generateEpisodeId('Star Trek: Voyager', 1, 5)).toBe('voy_s1_e05')
      expect(generateEpisodeId('Star Trek: Voyager', 1, 15)).toBe('voy_s1_e15')
    })
  })

  describe('validateSeasonId', () => {
    it('should validate correct season ID format', () => {
      expect(validateSeasonId('tos_s1')).toBe(true)
      expect(validateSeasonId('tng_s7')).toBe(true)
    })

    it('should reject invalid season ID formats', () => {
      expect(validateSeasonId('tos_s1_e01')).toBe(false)
      expect(validateSeasonId('invalid')).toBe(false)
    })
  })

  describe('validateMovieId', () => {
    it('should validate correct movie ID format', () => {
      expect(validateMovieId('tmp')).toBe(true)
      expect(validateMovieId('twok')).toBe(true)
      expect(validateMovieId('st2009')).toBe(true)
    })

    it('should reject invalid movie ID formats', () => {
      expect(validateMovieId('')).toBe(false)
      expect(validateMovieId('TMP')).toBe(false)
      expect(validateMovieId('very_long_id_here')).toBe(false)
    })
  })

  describe('extractSeriesCode', () => {
    it('should extract series code from episode ID', () => {
      expect(extractSeriesCode('tos_s1_e01')).toBe('tos')
      expect(extractSeriesCode('tng_s3_e15')).toBe('tng')
      expect(extractSeriesCode('dis_s2_e04')).toBe('dis')
    })

    it('should return null for invalid episode IDs', () => {
      expect(extractSeriesCode('invalid')).toBe(null)
      expect(extractSeriesCode('tos_s1')).toBe(null)
    })
  })

  describe('extractSeasonNumber', () => {
    it('should extract season number from episode ID', () => {
      expect(extractSeasonNumber('tos_s1_e01')).toBe(1)
      expect(extractSeasonNumber('tng_s3_e15')).toBe(3)
      expect(extractSeasonNumber('dis_s10_e04')).toBe(10)
    })

    it('should return null for invalid episode IDs', () => {
      expect(extractSeasonNumber('invalid')).toBe(null)
    })
  })

  describe('extractEpisodeNumber', () => {
    it('should extract episode number from episode ID', () => {
      expect(extractEpisodeNumber('tos_s1_e01')).toBe(1)
      expect(extractEpisodeNumber('tng_s3_e15')).toBe(15)
      expect(extractEpisodeNumber('dis_s2_e04')).toBe(4)
    })

    it('should return null for invalid episode IDs', () => {
      expect(extractEpisodeNumber('invalid')).toBe(null)
    })
  })
})

// ============================================================================
// TASK-028: DUPLICATE DETECTION
// ============================================================================

describe('Duplicate Detection (TASK-028)', () => {
  describe('detectDuplicateIds', () => {
    it('should detect duplicate item IDs', () => {
      const eras: NormalizedEra[] = [
        createMockEra({
          items: [createMockSeason({id: 'tos_s1'}), createMockSeason({id: 'tos_s1'})],
        }),
      ]

      const duplicates = detectDuplicateIds(eras)
      expect(duplicates).toContain('tos_s1')
      expect(duplicates.length).toBe(1)
    })

    it('should detect duplicate episode IDs', () => {
      const eras: NormalizedEra[] = [
        createMockEra({
          items: [
            createMockSeason({
              episodeData: [
                createMockEpisode({id: 'tos_s1_e01'}),
                createMockEpisode({id: 'tos_s1_e01'}),
              ],
            }),
          ],
        }),
      ]

      const duplicates = detectDuplicateIds(eras)
      expect(duplicates).toContain('tos_s1_e01')
    })

    it('should return empty array when no duplicates', () => {
      const eras: NormalizedEra[] = [
        createMockEra({
          items: [
            createMockSeason({
              id: 'tos_s1',
              episodeData: [
                createMockEpisode({id: 'tos_s1_e01'}),
                createMockEpisode({id: 'tos_s1_e02'}),
              ],
            }),
          ],
        }),
      ]

      const duplicates = detectDuplicateIds(eras)
      expect(duplicates).toEqual([])
    })
  })

  describe('detectDuplicateEpisodes', () => {
    it('should detect episodes appearing in multiple locations', () => {
      const eras: NormalizedEra[] = [
        createMockEra({
          id: 'era1',
          items: [
            createMockSeason({
              id: 'tos_s1',
              episodeData: [createMockEpisode({id: 'tos_s1_e01'})],
            }),
            createMockSeason({
              id: 'tos_s2',
              episodeData: [createMockEpisode({id: 'tos_s1_e01'})],
            }),
          ],
        }),
      ]

      const duplicates = detectDuplicateEpisodes(eras)
      expect(duplicates.length).toBe(1)
      expect(duplicates[0]?.episodeId).toBe('tos_s1_e01')
      expect(duplicates[0]?.locations).toHaveLength(2)
    })
  })
})

// ============================================================================
// TASK-029: COMPLETENESS CHECKS
// ============================================================================

describe('Completeness Checks (TASK-029)', () => {
  describe('checkEpisodeCompleteness', () => {
    it('should pass for complete episode', () => {
      const episode = createMockEpisode()
      const result = checkEpisodeCompleteness(episode)

      expect(result.isComplete).toBe(true)
      expect(result.missingFields).toEqual([])
    })

    it('should detect missing required fields', () => {
      const episode = createMockEpisode({synopsis: ''})
      const result = checkEpisodeCompleteness(episode)

      expect(result.isComplete).toBe(false)
      expect(result.missingFields).toContain('synopsis')
    })
  })

  describe('checkSeasonCompleteness', () => {
    it('should pass for complete season', () => {
      const season = createMockSeason()
      const result = checkSeasonCompleteness(season)

      expect(result.isComplete).toBe(true)
      expect(result.missingFields).toEqual([])
    })

    it('should detect missing required fields', () => {
      const season = createMockSeason({year: ''})
      const result = checkSeasonCompleteness(season)

      expect(result.isComplete).toBe(false)
      expect(result.missingFields).toContain('year')
    })
  })

  describe('checkMovieCompleteness', () => {
    it('should pass for complete movie', () => {
      const movie = createMockMovie()
      const result = checkMovieCompleteness(movie)

      expect(result.isComplete).toBe(true)
      expect(result.missingFields).toEqual([])
    })

    it('should detect missing required fields', () => {
      const movie = createMockMovie({stardate: ''})
      const result = checkMovieCompleteness(movie)

      expect(result.isComplete).toBe(false)
      expect(result.missingFields).toContain('stardate')
    })
  })

  describe('calculateCompletenessScore', () => {
    it('should return high score for complete episode with optional fields', () => {
      const episode = createMockEpisode({
        director: ['Marc Daniels'],
        writer: ['George Clayton Johnson'],
        memoryAlphaUrl: 'https://memory-alpha.fandom.com/wiki/The_Man_Trap',
      })

      const score = calculateCompletenessScore(episode)
      expect(score).toBeGreaterThan(0.8)
    })

    it('should return lower score for minimal episode', () => {
      const episode = createMockEpisode()
      delete (episode as Partial<NormalizedEpisodeItem>).plotPoints
      delete (episode as Partial<NormalizedEpisodeItem>).guestStars
      delete (episode as Partial<NormalizedEpisodeItem>).director
      delete (episode as Partial<NormalizedEpisodeItem>).writer

      const score = calculateCompletenessScore(episode)
      expect(score).toBeLessThan(0.8)
    })
  })
})

// ============================================================================
// TASK-030: CHRONOLOGY VALIDATION
// ============================================================================

describe('Chronology Validation (TASK-030)', () => {
  describe('validateStardateOrdering', () => {
    it('should pass for correctly ordered stardates', () => {
      const items = [
        createMockSeason({stardate: '1531.1'}),
        createMockSeason({stardate: '2821.5'}),
        createMockSeason({stardate: '4523.3'}),
      ]

      const issues = validateStardateOrdering(items)
      expect(issues).toEqual([])
    })

    it('should detect out-of-order stardates', () => {
      const items = [
        createMockSeason({id: 'item1', stardate: '4523.3'}),
        createMockSeason({id: 'item2', stardate: '1531.1'}),
      ]

      const issues = validateStardateOrdering(items)
      expect(issues.length).toBeGreaterThan(0)
      expect(issues[0]?.type).toBe('stardate-order')
      expect(issues[0]?.itemId).toBe('item2')
    })

    it('should handle None and TBD stardates gracefully', () => {
      const items = [
        createMockSeason({stardate: '1531.1'}),
        createMockSeason({stardate: 'None'}),
        createMockSeason({stardate: 'TBD'}),
      ]

      const issues = validateStardateOrdering(items)
      expect(issues).toEqual([])
    })
  })

  describe('validateYearOrdering', () => {
    it('should pass for correctly ordered years', () => {
      const items = [
        createMockSeason({year: '2265'}),
        createMockSeason({year: '2266'}),
        createMockSeason({year: '2267'}),
      ]

      const issues = validateYearOrdering(items)
      expect(issues).toEqual([])
    })

    it('should detect out-of-order years', () => {
      const items = [
        createMockSeason({id: 'item1', year: '2267'}),
        createMockSeason({id: 'item2', year: '2265'}),
      ]

      const issues = validateYearOrdering(items)
      expect(issues.length).toBeGreaterThan(0)
      expect(issues[0]?.type).toBe('year-order')
    })
  })

  describe('validateAirDateOrdering', () => {
    it('should pass for correctly ordered air dates', () => {
      const episodes = [
        createMockEpisode({airDate: '1966-09-08'}),
        createMockEpisode({airDate: '1966-09-15'}),
        createMockEpisode({airDate: '1966-09-22'}),
      ]

      const issues = validateAirDateOrdering(episodes)
      expect(issues).toEqual([])
    })

    it('should detect out-of-order air dates', () => {
      const episodes = [
        createMockEpisode({id: 'ep1', airDate: '1966-09-22'}),
        createMockEpisode({id: 'ep2', airDate: '1966-09-08'}),
      ]

      const issues = validateAirDateOrdering(episodes)
      expect(issues.length).toBeGreaterThan(0)
      expect(issues[0]?.type).toBe('airdate-order')
    })
  })
})

// ============================================================================
// TASK-031: CROSS-REFERENCE VALIDATION
// ============================================================================

describe('Cross-Reference Validation (TASK-031)', () => {
  describe('validateCrossReferences', () => {
    it('should pass for valid cross-references', () => {
      const eras: NormalizedEra[] = [
        createMockEra({
          items: [
            createMockSeason({
              episodeData: [
                createMockEpisode({
                  id: 'tos_s1_e01',
                  connections: [
                    {
                      episodeId: 'tos_s1_e02',
                      seriesId: 'tos',
                      connectionType: 'storyline',
                      description: 'Continues in next episode',
                    },
                  ],
                }),
                createMockEpisode({id: 'tos_s1_e02', connections: []}),
              ],
            }),
          ],
        }),
      ]

      const issues = validateCrossReferences(eras)
      expect(issues).toEqual([])
    })

    it('should detect missing reference targets', () => {
      const eras: NormalizedEra[] = [
        createMockEra({
          items: [
            createMockSeason({
              episodeData: [
                createMockEpisode({
                  id: 'tos_s1_e01',
                  connections: [
                    {
                      episodeId: 'nonexistent_id',
                      seriesId: 'tos',
                      connectionType: 'reference',
                      description: 'References nonexistent episode',
                    },
                  ],
                }),
              ],
            }),
          ],
        }),
      ]

      const issues = validateCrossReferences(eras)
      expect(issues.length).toBeGreaterThan(0)
      expect(issues[0]?.type).toBe('missing-reference')
      expect(issues[0]?.targetItemId).toBe('nonexistent_id')
    })

    it('should detect circular references', () => {
      const eras: NormalizedEra[] = [
        createMockEra({
          items: [
            createMockSeason({
              episodeData: [
                createMockEpisode({
                  id: 'tos_s1_e01',
                  connections: [
                    {
                      episodeId: 'tos_s1_e01',
                      seriesId: 'tos',
                      connectionType: 'reference',
                      description: 'Self-reference',
                    },
                  ],
                }),
              ],
            }),
          ],
        }),
      ]

      const issues = validateCrossReferences(eras)
      expect(issues.length).toBeGreaterThan(0)
      expect(issues[0]?.type).toBe('circular-reference')
    })
  })
})

// ============================================================================
// TASK-032: DATA DIFF UTILITY
// ============================================================================

describe('Data Diff Utility (TASK-032)', () => {
  describe('generateDataDiff', () => {
    it('should detect no changes for identical data', () => {
      const data: NormalizedEra[] = [
        createMockEra({
          items: [createMockSeason()],
        }),
      ]

      const diff = generateDataDiff(data, data)
      expect(diff.hasChanges).toBe(false)
      expect(diff.summary.erasAdded).toBe(0)
      expect(diff.summary.erasRemoved).toBe(0)
      expect(diff.summary.erasModified).toBe(0)
    })

    it('should detect added eras', () => {
      const existing: NormalizedEra[] = []
      const updated: NormalizedEra[] = [createMockEra({id: 'new_era'})]

      const diff = generateDataDiff(existing, updated)
      expect(diff.hasChanges).toBe(true)
      expect(diff.summary.erasAdded).toBe(1)
      expect(diff.eraChanges[0]?.changeType).toBe('added')
    })

    it('should detect removed eras', () => {
      const existing: NormalizedEra[] = [createMockEra({id: 'old_era'})]
      const updated: NormalizedEra[] = []

      const diff = generateDataDiff(existing, updated)
      expect(diff.hasChanges).toBe(true)
      expect(diff.summary.erasRemoved).toBe(1)
      expect(diff.eraChanges[0]?.changeType).toBe('removed')
    })

    it('should detect modified eras', () => {
      const existing: NormalizedEra[] = [createMockEra({title: 'Old Title'})]
      const updated: NormalizedEra[] = [createMockEra({title: 'New Title'})]

      const diff = generateDataDiff(existing, updated)
      expect(diff.hasChanges).toBe(true)
      expect(diff.summary.erasModified).toBe(1)
      expect(diff.eraChanges[0]?.changeType).toBe('modified')
    })

    it('should detect added items', () => {
      const existing: NormalizedEra[] = [createMockEra({items: []})]
      const updated: NormalizedEra[] = [createMockEra({items: [createMockSeason()]})]

      const diff = generateDataDiff(existing, updated)
      expect(diff.hasChanges).toBe(true)
      expect(diff.summary.itemsAdded).toBe(1)
    })

    it('should detect added episodes', () => {
      const existing: NormalizedEra[] = [
        createMockEra({
          items: [createMockSeason({episodeData: []})],
        }),
      ]
      const updated: NormalizedEra[] = [
        createMockEra({
          items: [createMockSeason({episodeData: [createMockEpisode()]})],
        }),
      ]

      const diff = generateDataDiff(existing, updated)
      expect(diff.hasChanges).toBe(true)
      expect(diff.summary.episodesAdded).toBe(1)
    })
  })
})

// ============================================================================
// TASK-033: FORMATTING VALIDATION
// ============================================================================

describe('Formatting Validation (TASK-033)', () => {
  describe('validateFormatting', () => {
    it('should pass for valid TypeScript code', () => {
      const code = `export const starTrekData = [
        {
          id: 'tos_era',
          title: 'TOS Era',
          items: []
        }
      ]`

      const issues = validateFormatting(code)
      expect(issues.length).toBe(0)
    })

    it('should detect missing export statement', () => {
      const code = `const starTrekData = []`

      const issues = validateFormatting(code)
      expect(issues.some(i => i.issue.includes('Missing required export'))).toBe(true)
    })

    it('should detect improper code structure', () => {
      const code = `export const starTrekData = [`

      const issues = validateFormatting(code)
      expect(issues.some(i => i.issue.includes('closing bracket'))).toBe(true)
    })

    it('should warn about very large files', () => {
      const code = `export const starTrekData = [\n${'x\n'.repeat(25000)}]`

      const issues = validateFormatting(code)
      expect(issues.some(i => i.issue.includes('very large'))).toBe(true)
    })
  })

  describe('validateIdFormat', () => {
    it('should pass for valid IDs', () => {
      expect(validateIdFormat('tos_s1_e01', 'episode')).toBe(null)
      expect(validateIdFormat('tos_s1', 'season')).toBe(null)
      expect(validateIdFormat('tmp', 'movie')).toBe(null)
      expect(validateIdFormat('tos_era', 'era')).toBe(null)
    })

    it('should detect invalid characters', () => {
      const issue = validateIdFormat('TOS_S1_E01', 'episode')
      expect(issue).not.toBe(null)
      expect(issue?.severity).toBe('error')
    })

    it('should detect consecutive underscores', () => {
      const issue = validateIdFormat('tos__s1', 'season')
      expect(issue).not.toBe(null)
      expect(issue?.severity).toBe('warning')
    })
  })
})

// ============================================================================
// TASK-034: METADATA PROVENANCE TRACKING
// ============================================================================

describe('Metadata Provenance Tracking (TASK-034)', () => {
  describe('generateProvenanceComment', () => {
    it('should generate complete provenance comment', () => {
      const provenance = {
        primarySource: 'TMDB',
        sources: ['TMDB', 'Memory Alpha'],
        lastUpdated: '2025-10-12',
        fetchedAt: '2025-10-12',
        qualityScore: 0.85,
      }

      const comment = generateProvenanceComment(provenance)
      expect(comment).toContain('// Source: TMDB')
      expect(comment).toContain('// Additional sources: TMDB, Memory Alpha')
      expect(comment).toContain('// Last updated: 2025-10-12')
      expect(comment).toContain('// Quality score: 85.0%')
    })
  })

  describe('parseProvenanceComment', () => {
    it('should parse valid provenance comment', () => {
      const codeBlock = `
        // Source: TMDB
        // Additional sources: TMDB, Memory Alpha
        // Last updated: 2025-10-12
        // Quality score: 85.0%
      `

      const provenance = parseProvenanceComment(codeBlock)
      expect(provenance).not.toBe(null)
      expect(provenance?.primarySource).toBe('TMDB')
      expect(provenance?.sources).toContain('TMDB')
      expect(provenance?.sources).toContain('Memory Alpha')
      expect(provenance?.lastUpdated).toBe('2025-10-12')
      expect(provenance?.qualityScore).toBeCloseTo(0.85, 2)
    })

    it('should return null for invalid comment', () => {
      const codeBlock = `// Some random comment`

      const provenance = parseProvenanceComment(codeBlock)
      expect(provenance).toBe(null)
    })
  })
})

// ============================================================================
// TASK-035: QUALITY REPORT GENERATION
// ============================================================================

describe('Quality Report Generation (TASK-035)', () => {
  describe('calculateItemQualityScore', () => {
    it('should calculate high score for complete episode', () => {
      const episode = createMockEpisode({
        director: ['Marc Daniels'],
        writer: ['George Clayton Johnson'],
        productionCode: '6149-06',
        memoryAlphaUrl: 'https://memory-alpha.fandom.com/wiki/The_Man_Trap',
        tmdbId: 12345,
      })

      const score = calculateItemQualityScore(episode)
      expect(score.overallScore).toBeGreaterThan(0.7)
      expect(score.qualityGrade).toMatch(/excellent|good/)
      expect(score.hasRequiredFields).toBe(true)
      expect(score.missingFields).toEqual([])
    })

    it('should calculate lower score for minimal episode', () => {
      const episode = createMockEpisode()
      delete (episode as Partial<NormalizedEpisodeItem>).plotPoints
      delete (episode as Partial<NormalizedEpisodeItem>).guestStars
      delete (episode as Partial<NormalizedEpisodeItem>).director
      delete (episode as Partial<NormalizedEpisodeItem>).writer

      const score = calculateItemQualityScore(episode)
      expect(score.overallScore).toBeLessThan(0.8)
      expect(score.qualityGrade).toMatch(/acceptable|poor/)
    })

    it('should detect invalid episode ID', () => {
      const episode = createMockEpisode({id: 'INVALID_ID'})

      const score = calculateItemQualityScore(episode)
      expect(score.issues.length).toBeGreaterThan(0)
      expect(score.issues[0]).toContain('Invalid episode ID')
    })
  })

  describe('generateQualityReport', () => {
    it('should generate comprehensive quality report', () => {
      const eras: NormalizedEra[] = [
        createMockEra({
          items: [
            createMockSeason({
              episodeData: [
                createMockEpisode({id: 'tos_s1_e01'}),
                createMockEpisode({id: 'tos_s1_e02'}),
              ],
            }),
            createMockMovie(),
          ],
        }),
      ]

      const report = generateQualityReport(eras)

      expect(report.summary.totalEras).toBe(1)
      expect(report.summary.totalItems).toBe(2)
      expect(report.summary.totalEpisodes).toBe(2)
      expect(report.summary.averageQualityScore).toBeGreaterThan(0)
      expect(report.summary.qualityThreshold).toBe(MINIMUM_QUALITY_THRESHOLD)
      expect(report.gradeDistribution).toBeDefined()
      expect(report.validation).toBeDefined()
      expect(report.completeness).toBeDefined()
      expect(report.itemScores.length).toBeGreaterThan(0)
    })

    it('should detect quality issues in report', () => {
      const eras: NormalizedEra[] = [
        createMockEra({
          items: [
            createMockSeason({
              id: 'tos_s1',
              episodeData: [
                createMockEpisode({id: 'tos_s1_e01', synopsis: ''}),
                createMockEpisode({id: 'tos_s1_e01'}), // Duplicate
              ],
            }),
          ],
        }),
      ]

      const report = generateQualityReport(eras)

      expect(report.validation.totalValidationIssues).toBeGreaterThan(0)
      expect(report.validation.duplicateIds).toContain('tos_s1_e01')
      expect(report.summary.itemsBelowThreshold).toBeGreaterThan(0)
    })

    it('should calculate field coverage statistics', () => {
      const eras: NormalizedEra[] = [
        createMockEra({
          items: [
            createMockSeason({
              episodeData: [createMockEpisode({director: ['Marc Daniels']}), createMockEpisode()],
            }),
          ],
        }),
      ]

      const report = generateQualityReport(eras)

      expect(report.completeness.fieldCoverage).toBeDefined()
      expect(report.completeness.averageCompleteness).toBeGreaterThan(0)
      expect(report.completeness.mostMissingFields).toBeDefined()
    })
  })

  describe('formatQualityReport', () => {
    it('should format report as readable text', () => {
      const eras: NormalizedEra[] = [
        createMockEra({
          items: [createMockSeason({episodeData: [createMockEpisode()]})],
        }),
      ]

      const report = generateQualityReport(eras)
      const formatted = formatQualityReport(report)

      expect(formatted).toContain('DATA QUALITY REPORT')
      expect(formatted).toContain('SUMMARY')
      expect(formatted).toContain('QUALITY GRADE DISTRIBUTION')
      expect(formatted).toContain('VALIDATION ISSUES')
      expect(formatted).toContain('COMPLETENESS')
    })

    it('should include duplicate IDs section when present', () => {
      const eras: NormalizedEra[] = [
        createMockEra({
          items: [
            createMockSeason({
              episodeData: [
                createMockEpisode({id: 'tos_s1_e01'}),
                createMockEpisode({id: 'tos_s1_e01'}),
              ],
            }),
          ],
        }),
      ]

      const report = generateQualityReport(eras)
      const formatted = formatQualityReport(report)

      expect(formatted).toContain('DUPLICATE IDS')
      expect(formatted).toContain('tos_s1_e01')
    })
  })
})

// ============================================================================
// TASK-026: QUALITY SCORING ALGORITHMS
// ============================================================================

describe('Quality Scoring Algorithms (TASK-026)', () => {
  it('should apply correct weight distribution', () => {
    const completeEpisode = createMockEpisode({
      director: ['Marc Daniels'],
      writer: ['George Clayton Johnson'],
      productionCode: '6149-06',
      memoryAlphaUrl: 'https://memory-alpha.fandom.com/wiki/The_Man_Trap',
    })

    const minimalEpisode = createMockEpisode()
    delete (minimalEpisode as Partial<NormalizedEpisodeItem>).plotPoints
    delete (minimalEpisode as Partial<NormalizedEpisodeItem>).guestStars

    const completeScore = calculateItemQualityScore(completeEpisode)
    const minimalScore = calculateItemQualityScore(minimalEpisode)

    expect(completeScore.overallScore).toBeGreaterThan(minimalScore.overallScore)
    expect(completeScore.completeness).toBeGreaterThan(minimalScore.completeness)
  })

  it('should respect minimum quality threshold', () => {
    expect(MINIMUM_QUALITY_THRESHOLD).toBe(0.6)

    const eras: NormalizedEra[] = [
      createMockEra({
        items: [createMockSeason({episodeData: [createMockEpisode()]})],
      }),
    ]

    const report = generateQualityReport(eras, MINIMUM_QUALITY_THRESHOLD)
    expect(report.summary.qualityThreshold).toBe(MINIMUM_QUALITY_THRESHOLD)
  })
})
