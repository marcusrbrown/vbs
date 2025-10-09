import type {EpisodeMetadata, MetadataQualityIndicatorInstance} from '../src/modules/types.js'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {createMetadataQualityIndicator} from '../src/components/metadata-quality-indicator.js'

describe('createMetadataQualityIndicator', () => {
  let indicator: MetadataQualityIndicatorInstance
  const episodeId = 'tos_s1_e01'

  beforeEach(() => {
    indicator = createMetadataQualityIndicator({
      episodeId,
      displayMode: 'badge',
      showTooltips: true,
      interactive: false,
    })
  })

  describe('factory creation', () => {
    it('should create indicator instance with default configuration', () => {
      expect(indicator).toBeDefined()
      expect(indicator.renderHTML).toBeDefined()
      expect(indicator.update).toBeDefined()
      expect(indicator.setEnrichmentStatus).toBeDefined()
      expect(indicator.getIndicator).toBeDefined()
      expect(indicator.destroy).toBeDefined()
    })

    it('should create indicator with custom configuration', () => {
      const customIndicator = createMetadataQualityIndicator({
        episodeId: 'tng_s3_e15',
        displayMode: 'detailed',
        showTooltips: false,
        interactive: true,
      })

      expect(customIndicator).toBeDefined()
      const html = customIndicator.renderHTML()
      expect(html).toContain('metadata-quality-indicator--detailed')
      expect(html).toContain('metadata-quality-indicator--interactive')
    })

    it('should support initial metadata in configuration', () => {
      const metadata: EpisodeMetadata = {
        episodeId,
        dataSource: 'tmdb',
        lastUpdated: new Date().toISOString(),
        isValidated: true,
        confidenceScore: 0.95,
        version: '1.0',
        enrichmentStatus: 'complete',
      }

      const indicatorWithMetadata = createMetadataQualityIndicator({
        episodeId,
        metadata,
      })

      const qualityData = indicatorWithMetadata.getIndicator()
      expect(qualityData.completeness).not.toBe('none')
      expect(qualityData.freshness).toBe('fresh')
    })
  })

  describe('completeness calculation', () => {
    it('should return "none" for missing metadata', () => {
      const qualityData = indicator.getIndicator()
      expect(qualityData.completeness).toBe('none')
      expect(qualityData.completenessScore).toBe(0)
    })

    it('should return "basic" for partial metadata', () => {
      const metadata: EpisodeMetadata = {
        episodeId,
        dataSource: 'memory-alpha',
        lastUpdated: new Date().toISOString(),
        isValidated: false,
        confidenceScore: 0.5,
        version: '1.0',
        enrichmentStatus: 'partial',
      }

      indicator.update(metadata)
      const qualityData = indicator.getIndicator()
      expect(qualityData.completeness).toBe('basic')
      expect(qualityData.completenessScore).toBe(35)
    })

    it('should return "detailed" for enriched metadata with validation', () => {
      const metadata: EpisodeMetadata = {
        episodeId,
        dataSource: 'tmdb',
        lastUpdated: new Date().toISOString(),
        isValidated: true,
        confidenceScore: 0.85,
        version: '1.0',
        enrichmentStatus: 'complete',
        fieldValidation: {
          director: {isValid: true, source: 'tmdb'},
          writer: {isValid: true, source: 'tmdb'},
          productionCode: {isValid: true, source: 'memory-alpha'},
        },
      }

      indicator.update(metadata)
      const qualityData = indicator.getIndicator()
      expect(qualityData.completeness).toBe('detailed')
      expect(qualityData.completenessScore).toBe(70)
    })

    it('should return "comprehensive" for complete validated metadata', () => {
      const metadata: EpisodeMetadata = {
        episodeId,
        dataSource: 'tmdb',
        lastUpdated: new Date().toISOString(),
        isValidated: true,
        confidenceScore: 0.95,
        version: '1.0',
        enrichmentStatus: 'complete',
        fieldValidation: {
          director: {isValid: true, source: 'tmdb'},
          writer: {isValid: true, source: 'tmdb'},
          productionCode: {isValid: true, source: 'memory-alpha'},
          guestStars: {isValid: true, source: 'memory-alpha'},
          plotPoints: {isValid: true, source: 'memory-alpha'},
          synopsis: {isValid: true, source: 'tmdb'},
          airDate: {isValid: true, source: 'tmdb'},
          stardate: {isValid: true, source: 'memory-alpha'},
          memoryAlphaUrl: {isValid: true, source: 'memory-alpha'},
        },
      }

      indicator.update(metadata)
      const qualityData = indicator.getIndicator()
      expect(qualityData.completeness).toBe('comprehensive')
      expect(qualityData.completenessScore).toBe(100)
    })

    it('should handle failed enrichment status', () => {
      const metadata: EpisodeMetadata = {
        episodeId,
        dataSource: 'tmdb',
        lastUpdated: new Date().toISOString(),
        isValidated: false,
        confidenceScore: 0,
        version: '1.0',
        enrichmentStatus: 'failed',
      }

      indicator.update(metadata)
      const qualityData = indicator.getIndicator()
      expect(qualityData.completeness).toBe('none')
    })
  })

  describe('freshness calculation', () => {
    it('should return "outdated" for missing metadata', () => {
      const qualityData = indicator.getIndicator()
      expect(qualityData.freshness).toBe('outdated')
    })

    it('should return "fresh" for recent metadata (< 7 days)', () => {
      const metadata: EpisodeMetadata = {
        episodeId,
        dataSource: 'tmdb',
        lastUpdated: new Date().toISOString(), // Today
        isValidated: true,
        confidenceScore: 0.9,
        version: '1.0',
        enrichmentStatus: 'complete',
      }

      indicator.update(metadata)
      const qualityData = indicator.getIndicator()
      expect(qualityData.freshness).toBe('fresh')
    })

    it('should return "stale" for metadata 7-30 days old', () => {
      const fifteenDaysAgo = new Date()
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)

      const metadata: EpisodeMetadata = {
        episodeId,
        dataSource: 'tmdb',
        lastUpdated: fifteenDaysAgo.toISOString(),
        isValidated: true,
        confidenceScore: 0.9,
        version: '1.0',
        enrichmentStatus: 'complete',
      }

      indicator.update(metadata)
      const qualityData = indicator.getIndicator()
      expect(qualityData.freshness).toBe('stale')
    })

    it('should return "outdated" for metadata > 30 days old', () => {
      const sixtyDaysAgo = new Date()
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

      const metadata: EpisodeMetadata = {
        episodeId,
        dataSource: 'tmdb',
        lastUpdated: sixtyDaysAgo.toISOString(),
        isValidated: true,
        confidenceScore: 0.9,
        version: '1.0',
        enrichmentStatus: 'complete',
      }

      indicator.update(metadata)
      const qualityData = indicator.getIndicator()
      expect(qualityData.freshness).toBe('outdated')
    })
  })

  describe('HTML rendering', () => {
    it('should render basic HTML structure', () => {
      const html = indicator.renderHTML()

      expect(html).toContain('metadata-quality-indicator')
      expect(html).toContain(`data-episode-id="${episodeId}"`)
      expect(html).toContain('metadata-quality-badge--completeness')
      expect(html).toContain('metadata-quality-badge--freshness')
    })

    it('should render completeness badge with correct class', () => {
      const html = indicator.renderHTML()

      expect(html).toContain('metadata-quality-badge--none') // No metadata initially
    })

    it('should render freshness badge with correct class', () => {
      const html = indicator.renderHTML()

      expect(html).toContain('metadata-quality-badge--outdated') // No metadata initially
    })

    it('should include tooltips when enabled', () => {
      const html = indicator.renderHTML()

      expect(html).toContain('title=')
      expect(html).toContain('Completeness:')
      expect(html).toContain('Last updated:')
    })

    it('should omit tooltips when disabled', () => {
      const noTooltipIndicator = createMetadataQualityIndicator({
        episodeId,
        showTooltips: false,
      })

      const html = noTooltipIndicator.renderHTML()
      expect(html).not.toContain('title=')
    })

    it('should render detailed mode with labels', () => {
      const detailedIndicator = createMetadataQualityIndicator({
        episodeId,
        displayMode: 'detailed',
      })

      const html = detailedIndicator.renderHTML()
      expect(html).toContain('metadata-quality-indicator--detailed')
      expect(html).toContain('metadata-quality-badge__label')
    })

    it('should render interactive mode with button role', () => {
      const interactiveIndicator = createMetadataQualityIndicator({
        episodeId,
        interactive: true,
      })

      const html = interactiveIndicator.renderHTML()
      expect(html).toContain('metadata-quality-indicator--interactive')
      expect(html).toContain('role="button"')
      expect(html).toContain('tabindex="0"')
    })

    it('should include accessibility attributes', () => {
      const html = indicator.renderHTML()

      expect(html).toContain('role="status"')
      expect(html).toContain('aria-label')
      expect(html).toContain('aria-hidden="true"') // For icons
    })

    it('should not render enrichment status initially', () => {
      const html = indicator.renderHTML()
      expect(html).not.toContain('metadata-quality-badge--enriching')
    })

    it('should render enrichment status when active', () => {
      indicator.setEnrichmentStatus(true)
      const html = indicator.renderHTML()

      expect(html).toContain('metadata-quality-badge--enriching')
      expect(html).toContain('metadata-quality-badge__spinner')
    })
  })

  describe('metadata updates', () => {
    it('should update indicator with new metadata', () => {
      const metadata: EpisodeMetadata = {
        episodeId,
        dataSource: 'tmdb',
        lastUpdated: new Date().toISOString(),
        isValidated: true,
        confidenceScore: 0.9,
        version: '1.0',
        enrichmentStatus: 'complete',
      }

      indicator.update(metadata)
      const qualityData = indicator.getIndicator()

      expect(qualityData.completeness).not.toBe('none')
      expect(qualityData.freshness).toBe('fresh')
    })

    it('should emit quality-updated event on update', () => {
      const mockListener = vi.fn()
      indicator.on('quality-updated', mockListener)

      const metadata: EpisodeMetadata = {
        episodeId,
        dataSource: 'tmdb',
        lastUpdated: new Date().toISOString(),
        isValidated: true,
        confidenceScore: 0.9,
        version: '1.0',
        enrichmentStatus: 'complete',
      }

      indicator.update(metadata)

      expect(mockListener).toHaveBeenCalledWith({
        episodeId,
        indicator: expect.objectContaining({
          episodeId,
          completeness: expect.any(String),
          freshness: expect.any(String),
        }),
      })
    })
  })

  describe('enrichment status', () => {
    it('should set enrichment status', () => {
      indicator.setEnrichmentStatus(true)
      const qualityData = indicator.getIndicator()
      expect(qualityData.isEnriching).toBe(true)
    })

    it('should emit enrichment-status-changed event', () => {
      const mockListener = vi.fn()
      indicator.on('enrichment-status-changed', mockListener)

      indicator.setEnrichmentStatus(true)

      expect(mockListener).toHaveBeenCalledWith({
        episodeId,
        isEnriching: true,
      })
    })

    it('should not emit event if status unchanged', () => {
      const mockListener = vi.fn()
      indicator.on('enrichment-status-changed', mockListener)

      indicator.setEnrichmentStatus(false)
      indicator.setEnrichmentStatus(false)

      expect(mockListener).not.toHaveBeenCalled()
    })
  })

  describe('event handling', () => {
    it('should support on/off event handling', () => {
      const mockListener = vi.fn()

      indicator.on('quality-updated', mockListener)
      indicator.off('quality-updated', mockListener)

      const metadata: EpisodeMetadata = {
        episodeId,
        dataSource: 'tmdb',
        lastUpdated: new Date().toISOString(),
        isValidated: true,
        confidenceScore: 0.9,
        version: '1.0',
        enrichmentStatus: 'complete',
      }

      indicator.update(metadata)

      expect(mockListener).not.toHaveBeenCalled()
    })

    it('should support once event handling', () => {
      const mockListener = vi.fn()
      indicator.once('quality-updated', mockListener)

      const metadata: EpisodeMetadata = {
        episodeId,
        dataSource: 'tmdb',
        lastUpdated: new Date().toISOString(),
        isValidated: true,
        confidenceScore: 0.9,
        version: '1.0',
        enrichmentStatus: 'complete',
      }

      indicator.update(metadata)
      indicator.update(metadata)

      expect(mockListener).toHaveBeenCalledTimes(1)
    })
  })

  describe('data source extraction', () => {
    it('should extract primary data source', () => {
      const metadata: EpisodeMetadata = {
        episodeId,
        dataSource: 'tmdb',
        lastUpdated: new Date().toISOString(),
        isValidated: true,
        confidenceScore: 0.9,
        version: '1.0',
        enrichmentStatus: 'complete',
      }

      indicator.update(metadata)
      const qualityData = indicator.getIndicator()

      expect(qualityData.availableSources).toContain('tmdb')
    })

    it('should extract sources from field validation', () => {
      const metadata: EpisodeMetadata = {
        episodeId,
        dataSource: 'tmdb',
        lastUpdated: new Date().toISOString(),
        isValidated: true,
        confidenceScore: 0.9,
        version: '1.0',
        enrichmentStatus: 'complete',
        fieldValidation: {
          director: {isValid: true, source: 'tmdb'},
          productionCode: {isValid: true, source: 'memory-alpha'},
          guestStars: {isValid: true, source: 'trekcore'},
        },
      }

      indicator.update(metadata)
      const qualityData = indicator.getIndicator()

      expect(qualityData.availableSources).toContain('tmdb')
      expect(qualityData.availableSources).toContain('memory-alpha')
      expect(qualityData.availableSources).toContain('trekcore')
    })

    it('should deduplicate sources', () => {
      const metadata: EpisodeMetadata = {
        episodeId,
        dataSource: 'tmdb',
        lastUpdated: new Date().toISOString(),
        isValidated: true,
        confidenceScore: 0.9,
        version: '1.0',
        enrichmentStatus: 'complete',
        fieldValidation: {
          director: {isValid: true, source: 'tmdb'},
          writer: {isValid: true, source: 'tmdb'},
        },
      }

      indicator.update(metadata)
      const qualityData = indicator.getIndicator()

      const tmdbCount = qualityData.availableSources.filter(s => s === 'tmdb').length
      expect(tmdbCount).toBe(1)
    })
  })

  describe('component lifecycle', () => {
    it('should cleanup resources on destroy', () => {
      const mockListener = vi.fn()
      indicator.on('quality-updated', mockListener)

      indicator.destroy()

      const metadata: EpisodeMetadata = {
        episodeId,
        dataSource: 'tmdb',
        lastUpdated: new Date().toISOString(),
        isValidated: true,
        confidenceScore: 0.9,
        version: '1.0',
        enrichmentStatus: 'complete',
      }

      indicator.update(metadata)

      expect(mockListener).not.toHaveBeenCalled()
    })
  })
})
