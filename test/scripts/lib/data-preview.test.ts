/**
 * Tests for the data preview functionality.
 * Covers tree rendering, statistics, and ANSI colors.
 */

import type {NormalizedEra} from '../../../scripts/lib/data-quality.js'
import {describe, expect, it, vi} from 'vitest'
import {
  formatStatistics,
  generatePreview,
  generateStatistics,
  generateTreeView,
  printPreview,
} from '../../../scripts/lib/data-preview.js'

const createTestEras = (): NormalizedEra[] => [
  {
    id: 'tng_era',
    title: '24th Century',
    years: '2364-2379',
    stardates: 'Five-digit stardates',
    description: 'TNG era',
    items: [
      {
        id: 'tng_s1',
        title: 'Star Trek: The Next Generation Season 1',
        type: 'season',
        year: '1987',
        stardate: '41000.0-41000.0',
        episodes: 25,
        episodeData: [
          {
            id: 'tng_s1_e01',
            title: 'Encounter at Farpoint',
            season: 1,
            episode: 1,
            airDate: '1987-09-28',
            stardate: '41153.7',
            synopsis: 'Test synopsis',
          },
          {
            id: 'tng_s1_e02',
            title: 'The Naked Now',
            season: 1,
            episode: 2,
            airDate: '1987-10-05',
            stardate: '41253.3',
            synopsis: 'Another test synopsis',
          },
        ],
      },
      {
        id: 'fc',
        title: 'Star Trek: First Contact',
        type: 'movie',
        year: '1996',
        stardate: 'Stardate TBD',
        notes: 'Movie about the Borg',
      },
    ],
  },
]

describe('Data Preview', () => {
  describe('generateStatistics', () => {
    it('should calculate correct totals', () => {
      const eras = createTestEras()
      const stats = generateStatistics(eras)

      expect(stats.totalEras).toBe(1)
      expect(stats.totalItems).toBe(2)
      expect(stats.totalEpisodes).toBe(2)
      expect(stats.totalMovies).toBe(1)
      expect(stats.totalSeasons).toBe(1)
    })

    it('should calculate items by type', () => {
      const eras = createTestEras()
      const stats = generateStatistics(eras)

      expect(stats.itemsByType.season).toBe(1)
      expect(stats.itemsByType.movie).toBe(1)
    })

    it('should calculate episodes by era', () => {
      const eras = createTestEras()
      const stats = generateStatistics(eras)

      expect(stats.episodesByEra.tng_era).toBe(2)
    })

    it('should calculate average episodes per season', () => {
      const eras = createTestEras()
      const stats = generateStatistics(eras)

      expect(stats.averageEpisodesPerSeason).toBe(2)
    })

    it('should handle empty eras', () => {
      const stats = generateStatistics([])
      expect(stats.totalEras).toBe(0)
      expect(stats.totalEpisodes).toBe(0)
    })
  })

  describe('formatStatistics', () => {
    it('should format statistics as string', () => {
      const eras = createTestEras()
      const stats = generateStatistics(eras)
      const formatted = formatStatistics(stats)

      expect(formatted).toContain('Statistics:')
      expect(formatted).toContain('Total Eras:')
      expect(formatted).toContain('Total Episodes:')
    })

    it('should include items by type', () => {
      const eras = createTestEras()
      const stats = generateStatistics(eras)
      const formatted = formatStatistics(stats)

      expect(formatted).toContain('Items by Type:')
    })
  })

  describe('generateTreeView', () => {
    it('should generate tree structure', () => {
      const eras = createTestEras()
      const tree = generateTreeView(eras)

      expect(tree).toContain('24th Century')
      expect(tree).toContain('Star Trek: The Next Generation Season 1')
      expect(tree).toContain('Star Trek: First Contact')
    })

    it('should limit items per era', () => {
      const eras = createTestEras()
      const tree = generateTreeView(eras, {maxItemsPerEra: 1})

      expect(tree).toContain('... and 1 more items')
    })

    it('should limit episodes per item', () => {
      const eras = createTestEras()
      const tree = generateTreeView(eras, {maxEpisodesPerItem: 1})

      expect(tree).toContain('... and 1 more episodes')
    })
  })

  describe('generatePreview', () => {
    it('should generate complete preview', () => {
      const eras = createTestEras()
      const preview = generatePreview(eras)

      expect(preview).toContain('Star Trek Data Preview')
      expect(preview).toContain('Statistics:')
      expect(preview).toContain('24th Century')
    })

    it('should respect showStatistics option', () => {
      const eras = createTestEras()
      const preview = generatePreview(eras, {showStatistics: false})

      expect(preview).not.toContain('Statistics:')
    })

    it('should handle colorize option', () => {
      const eras = createTestEras()
      const withColor = generatePreview(eras, {colorize: true})
      const withoutColor = generatePreview(eras, {colorize: false})

      expect(withColor).not.toBe(withoutColor)
    })
  })

  describe('printPreview', () => {
    it('should write to output stream', () => {
      const eras = createTestEras()
      const output = {write: vi.fn()}
      printPreview(eras, {outputStream: output as never})

      expect(output.write).toHaveBeenCalled()
    })
  })
})
