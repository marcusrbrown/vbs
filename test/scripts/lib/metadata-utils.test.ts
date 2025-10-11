/**
 * Tests for metadata utilities (metadata fetching and normalization).
 */

import type {Episode} from '../../../src/modules/types.js'
import {describe, expect, it} from 'vitest'
import {
  createMetadataSource,
  createMockMetadata,
  METADATA_SOURCE_TEMPLATES,
} from '../../../scripts/lib/metadata-utils.js'

describe('Metadata Utilities', () => {
  describe('createMetadataSource', () => {
    it('should create metadata source with current timestamp', () => {
      const template = {
        ...METADATA_SOURCE_TEMPLATES.memoryAlpha,
        fields: [...METADATA_SOURCE_TEMPLATES.memoryAlpha.fields],
      }

      const source = createMetadataSource(template)

      expect(source.name).toBe('Memory Alpha')
      expect(source.type).toBe('memory-alpha')
      expect(source.lastAccessed).toMatch(/^\d{4}-\d{2}-\d{2}/)
    })

    it('should preserve template properties', () => {
      const template = {
        ...METADATA_SOURCE_TEMPLATES.memoryAlpha,
        fields: [...METADATA_SOURCE_TEMPLATES.memoryAlpha.fields],
      }

      const source = createMetadataSource(template)

      expect(source.name).toBe('Memory Alpha')
      expect(source.fields.length).toBeGreaterThan(0)
    })
  })

  describe('createMockMetadata', () => {
    it('should create mock metadata for valid episode', () => {
      const episode: Episode = {
        id: 'ent_s1_e1',
        title: 'Broken Bow',
        season: 1,
        episode: 1,
        airDate: '2001-09-26',
        stardate: '~1.1',
        synopsis: 'Enterprise begins its mission...',
        plotPoints: ['First contact', 'Klingon encounter'],
        guestStars: ['John Fleck'],
        connections: [],
      }

      const metadata = createMockMetadata(episode)

      expect(metadata).not.toBeNull()
      expect(metadata?.episodeId).toBe('ent_s1_e1')
      expect(metadata?.dataSource).toBe('memory-alpha')
      expect(metadata?.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}/)
      expect(typeof metadata?.confidenceScore).toBe('number')
    })

    it('should return null for invalid episode ID', () => {
      const invalidEpisode: Episode = {
        id: 'invalid-id',
        title: 'Test',
        season: 1,
        episode: 1,
        airDate: '2000-01-01',
        stardate: '1.1',
        synopsis: 'Test',
        plotPoints: [],
        guestStars: [],
        connections: [],
      }

      const metadata = createMockMetadata(invalidEpisode)
      expect(metadata).toBeNull()
    })

    it('should calculate confidence score based on field completeness', () => {
      const completeEpisode: Episode = {
        id: 'ent_s1_e1',
        title: 'Broken Bow',
        season: 1,
        episode: 1,
        airDate: '2001-09-26',
        stardate: '~1.1',
        synopsis: 'Enterprise begins its mission...',
        plotPoints: ['First contact'],
        guestStars: ['Actor'],
        connections: [],
        director: ['Director Name'],
        writer: ['Writer Name'],
      }

      const metadata = createMockMetadata(completeEpisode)
      expect(metadata?.confidenceScore).toBeGreaterThan(0.5)
    })

    it('should set enrichment status based on confidence', () => {
      const episode: Episode = {
        id: 'ent_s1_e1',
        title: 'Test',
        season: 1,
        episode: 1,
        airDate: '2000-01-01',
        stardate: '1.1',
        synopsis: 'Synopsis',
        plotPoints: [],
        guestStars: [],
        connections: [],
      }

      const metadata = createMockMetadata(episode)
      expect(metadata?.enrichmentStatus).toMatch(/pending|partial|complete|failed/)
    })

    it('should include field validation for all fields', () => {
      const episode: Episode = {
        id: 'ent_s1_e1',
        title: 'Test',
        season: 1,
        episode: 1,
        airDate: '2000-01-01',
        stardate: '1.1',
        synopsis: 'Synopsis',
        plotPoints: ['Point'],
        guestStars: [],
        connections: [],
      }

      const metadata = createMockMetadata(episode)
      expect(metadata?.fieldValidation).toBeDefined()
      if (metadata?.fieldValidation) {
        expect(metadata.fieldValidation.title).toBeDefined()
        expect(metadata.fieldValidation.season).toBeDefined()
      }
    })
  })

  describe('METADATA_SOURCE_TEMPLATES', () => {
    it('should provide Memory Alpha template', () => {
      const template = METADATA_SOURCE_TEMPLATES.memoryAlpha
      expect(template.name).toBe('Memory Alpha')
      expect(template.type).toBe('memory-alpha')
      expect(template.fields.length).toBeGreaterThan(0)
    })

    it('should provide mock fallback template', () => {
      const template = METADATA_SOURCE_TEMPLATES.mockFallback
      expect(template.name).toBe('Mock Data')
      expect(template.type).toBe('manual')
      expect(template.confidenceLevel).toBe(0.5)
    })

    it('should have different confidence levels', () => {
      const memoryAlpha = METADATA_SOURCE_TEMPLATES.memoryAlpha
      const mockFallback = METADATA_SOURCE_TEMPLATES.mockFallback
      expect(memoryAlpha.confidenceLevel).toBeGreaterThan(mockFallback.confidenceLevel)
    })
  })
})
