import type {EpisodeMetadata} from '../src/modules/types.js'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {createMetadataSourceAttribution} from '../src/components/metadata-source-attribution.js'

describe('createMetadataSourceAttribution', () => {
  const episodeId = 'tos_s1_e01'
  const mockMetadata: EpisodeMetadata = {
    episodeId,
    dataSource: 'tmdb',
    lastUpdated: new Date('2025-10-08T10:00:00.000Z').toISOString(),
    isValidated: true,
    confidenceScore: 0.85,
    version: '1.0',
    enrichmentStatus: 'complete',
    fieldValidation: {
      plotSummary: {isValid: true, source: 'tmdb'},
      guestStars: {isValid: true, source: 'memory-alpha'},
    },
    conflictResolution: [
      {
        fieldName: 'airDate',
        conflicts: [
          {source: 'tmdb', value: '1966-09-08', confidence: 0.9},
          {source: 'memory-alpha', value: '1966-09-08', confidence: 0.85},
        ],
        resolution: '1966-09-08',
        strategy: 'highest-confidence',
        resolvedAt: new Date().toISOString(),
      },
    ],
  }

  describe('Factory Creation', () => {
    it('should create attribution instance with minimum config', () => {
      const attribution = createMetadataSourceAttribution({episodeId})

      expect(attribution).toBeDefined()
      expect(attribution.renderHTML).toBeTypeOf('function')
      expect(attribution.updateMetadata).toBeTypeOf('function')
      expect(attribution.getMetadata).toBeTypeOf('function')
      expect(attribution.destroy).toBeTypeOf('function')
    })

    it('should create attribution instance with full config', () => {
      const attribution = createMetadataSourceAttribution({
        episodeId,
        metadata: mockMetadata,
        displayMode: 'detailed',
        showFieldAttribution: true,
        showConflicts: true,
        interactive: true,
      })

      expect(attribution).toBeDefined()
      expect(attribution.getMetadata()).toEqual(mockMetadata)
    })

    it('should provide EventEmitter methods', () => {
      const attribution = createMetadataSourceAttribution({episodeId})

      expect(attribution.on).toBeTypeOf('function')
      expect(attribution.off).toBeTypeOf('function')
      expect(attribution.once).toBeTypeOf('function')
      expect(attribution.removeAllListeners).toBeTypeOf('function')
    })
  })

  describe('HTML Rendering - Compact Mode', () => {
    it('should render compact attribution with metadata', () => {
      const attribution = createMetadataSourceAttribution({
        episodeId,
        metadata: mockMetadata,
        displayMode: 'compact',
      })

      const html = attribution.renderHTML()

      expect(html).toContain('metadata-source-attribution')
      expect(html).toContain('metadata-source-attribution--compact')
      expect(html).toContain('The Movie Database')
      expect(html).toContain('85%')
      expect(html).toContain('attribution-confidence--high')
    })

    it('should render compact attribution without metadata', () => {
      const attribution = createMetadataSourceAttribution({
        episodeId,
        displayMode: 'compact',
      })

      const html = attribution.renderHTML()

      expect(html).toContain('metadata-source-attribution--no-data')
      expect(html).toContain('No metadata source information available')
    })

    it('should render interactive compact attribution', () => {
      const attribution = createMetadataSourceAttribution({
        episodeId,
        metadata: mockMetadata,
        displayMode: 'compact',
        interactive: true,
      })

      const html = attribution.renderHTML()

      expect(html).toContain('metadata-source-attribution--interactive')
      expect(html).toContain('role="button"')
      expect(html).toContain('tabindex="0"')
    })

    it('should include proper ARIA labels in compact mode', () => {
      const attribution = createMetadataSourceAttribution({
        episodeId,
        metadata: mockMetadata,
        displayMode: 'compact',
      })

      const html = attribution.renderHTML()

      expect(html).toContain('aria-label')
      expect(html).toContain('Confidence score:')
    })
  })

  describe('HTML Rendering - Detailed Mode', () => {
    it('should render detailed attribution with metadata', () => {
      const attribution = createMetadataSourceAttribution({
        episodeId,
        metadata: mockMetadata,
        displayMode: 'detailed',
      })

      const html = attribution.renderHTML()

      expect(html).toContain('metadata-source-attribution--detailed')
      expect(html).toContain('Metadata Sources')
      expect(html).toContain('The Movie Database')
      expect(html).toContain('85%')
      expect(html).toContain('Validated')
      expect(html).toContain('complete')
    })

    it('should render detailed attribution without metadata', () => {
      const attribution = createMetadataSourceAttribution({
        episodeId,
        displayMode: 'detailed',
      })

      const html = attribution.renderHTML()

      expect(html).toContain('metadata-source-attribution--no-data')
      expect(html).toContain('No metadata source information available')
    })

    it('should render field attribution when enabled', () => {
      const attribution = createMetadataSourceAttribution({
        episodeId,
        metadata: mockMetadata,
        displayMode: 'detailed',
        showFieldAttribution: true,
      })

      const html = attribution.renderHTML()

      expect(html).toContain('Field Sources')
      expect(html).toContain('The Movie Database')
      expect(html).toContain('Memory Alpha')
      expect(html).toContain('plotSummary')
      expect(html).toContain('guestStars')
    })

    it('should not render field attribution when disabled', () => {
      const attribution = createMetadataSourceAttribution({
        episodeId,
        metadata: mockMetadata,
        displayMode: 'detailed',
        showFieldAttribution: false,
      })

      const html = attribution.renderHTML()

      expect(html).not.toContain('Field Sources')
    })

    it('should render conflict resolution when enabled', () => {
      const attribution = createMetadataSourceAttribution({
        episodeId,
        metadata: mockMetadata,
        displayMode: 'detailed',
        showConflicts: true,
      })

      const html = attribution.renderHTML()

      expect(html).toContain('Conflict Resolution')
      expect(html).toContain('airDate')
      expect(html).toContain('highest confidence')
      expect(html).toContain('2 sources')
    })

    it('should not render conflict resolution when disabled', () => {
      const attribution = createMetadataSourceAttribution({
        episodeId,
        metadata: mockMetadata,
        displayMode: 'detailed',
        showConflicts: false,
      })

      const html = attribution.renderHTML()

      expect(html).not.toContain('Conflict Resolution')
    })

    it('should render schema version when available', () => {
      const attribution = createMetadataSourceAttribution({
        episodeId,
        metadata: mockMetadata,
        displayMode: 'detailed',
      })

      const html = attribution.renderHTML()

      expect(html).toContain('Schema Version')
      expect(html).toContain('1.0')
    })
  })

  describe('Confidence Score Display', () => {
    it('should display high confidence (>= 80%)', () => {
      const attribution = createMetadataSourceAttribution({
        episodeId,
        metadata: {...mockMetadata, confidenceScore: 0.9},
        displayMode: 'compact',
      })

      const html = attribution.renderHTML()

      expect(html).toContain('90%')
      expect(html).toContain('attribution-confidence--high')
    })

    it('should display medium confidence (50-79%)', () => {
      const attribution = createMetadataSourceAttribution({
        episodeId,
        metadata: {...mockMetadata, confidenceScore: 0.65},
        displayMode: 'compact',
      })

      const html = attribution.renderHTML()

      expect(html).toContain('65%')
      expect(html).toContain('attribution-confidence--medium')
    })

    it('should display low confidence (< 50%)', () => {
      const attribution = createMetadataSourceAttribution({
        episodeId,
        metadata: {...mockMetadata, confidenceScore: 0.3},
        displayMode: 'compact',
      })

      const html = attribution.renderHTML()

      expect(html).toContain('30%')
      expect(html).toContain('attribution-confidence--low')
    })
  })

  describe('Timestamp Formatting', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-10-08T10:00:00.000Z'))
    })

    it('should display "Today" for same-day timestamps', () => {
      const attribution = createMetadataSourceAttribution({
        episodeId,
        metadata: {
          ...mockMetadata,
          lastUpdated: new Date('2025-10-08T08:00:00.000Z').toISOString(),
        },
        displayMode: 'compact',
      })

      const html = attribution.renderHTML()

      expect(html).toContain('Today')
    })

    it('should display "Yesterday" for 1-day-old timestamps', () => {
      const attribution = createMetadataSourceAttribution({
        episodeId,
        metadata: {
          ...mockMetadata,
          lastUpdated: new Date('2025-10-07T10:00:00.000Z').toISOString(),
        },
        displayMode: 'compact',
      })

      const html = attribution.renderHTML()

      expect(html).toContain('Yesterday')
    })

    it('should display days for < 1 week old', () => {
      const attribution = createMetadataSourceAttribution({
        episodeId,
        metadata: {
          ...mockMetadata,
          lastUpdated: new Date('2025-10-03T10:00:00.000Z').toISOString(),
        },
        displayMode: 'compact',
      })

      const html = attribution.renderHTML()

      expect(html).toContain('5 days ago')
    })

    it('should display weeks for < 1 month old', () => {
      const attribution = createMetadataSourceAttribution({
        episodeId,
        metadata: {
          ...mockMetadata,
          lastUpdated: new Date('2025-09-24T10:00:00.000Z').toISOString(),
        },
        displayMode: 'compact',
      })

      const html = attribution.renderHTML()

      expect(html).toContain('2 weeks ago')
    })
  })

  describe('Metadata Updates', () => {
    it('should update metadata successfully', () => {
      const attribution = createMetadataSourceAttribution({episodeId})

      expect(attribution.getMetadata()).toBeUndefined()

      attribution.updateMetadata(mockMetadata)

      expect(attribution.getMetadata()).toEqual(mockMetadata)
    })

    it('should emit attribution-updated event', () => {
      const attribution = createMetadataSourceAttribution({episodeId})
      const listener = vi.fn()

      attribution.on('attribution-updated', listener)
      attribution.updateMetadata(mockMetadata)

      expect(listener).toHaveBeenCalledWith({episodeId, metadata: mockMetadata})
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('should re-render with updated metadata', () => {
      const attribution = createMetadataSourceAttribution({
        episodeId,
        displayMode: 'compact',
      })

      let html = attribution.renderHTML()
      expect(html).toContain('No metadata source information available')

      attribution.updateMetadata(mockMetadata)
      html = attribution.renderHTML()

      expect(html).toContain('The Movie Database')
      expect(html).toContain('85%')
    })
  })

  describe('Event Emissions', () => {
    it('should support on() event listener', () => {
      const attribution = createMetadataSourceAttribution({episodeId})
      const listener = vi.fn()

      attribution.on('attribution-updated', listener)
      attribution.updateMetadata(mockMetadata)

      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('should support off() event listener removal', () => {
      const attribution = createMetadataSourceAttribution({episodeId})
      const listener = vi.fn()

      attribution.on('attribution-updated', listener)
      attribution.off('attribution-updated', listener)
      attribution.updateMetadata(mockMetadata)

      expect(listener).not.toHaveBeenCalled()
    })

    it('should support once() for one-time listeners', () => {
      const attribution = createMetadataSourceAttribution({episodeId})
      const listener = vi.fn()

      attribution.once('attribution-updated', listener)
      attribution.updateMetadata(mockMetadata)
      attribution.updateMetadata({...mockMetadata, confidenceScore: 0.9})

      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('should support removeAllListeners()', () => {
      const attribution = createMetadataSourceAttribution({episodeId})
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      attribution.on('attribution-updated', listener1)
      attribution.on('attribution-updated', listener2)
      attribution.removeAllListeners('attribution-updated')
      attribution.updateMetadata(mockMetadata)

      expect(listener1).not.toHaveBeenCalled()
      expect(listener2).not.toHaveBeenCalled()
    })
  })

  describe('Component Lifecycle', () => {
    it('should cleanup on destroy', () => {
      const attribution = createMetadataSourceAttribution({
        episodeId,
        metadata: mockMetadata,
      })

      const listener = vi.fn()
      attribution.on('attribution-updated', listener)

      attribution.destroy()

      expect(attribution.getMetadata()).toBeUndefined()
      attribution.updateMetadata(mockMetadata)
      expect(listener).not.toHaveBeenCalled()
    })

    it('should handle multiple destroy calls', () => {
      const attribution = createMetadataSourceAttribution({episodeId})

      expect(() => {
        attribution.destroy()
        attribution.destroy()
      }).not.toThrow()
    })
  })

  describe('Data Source Formatting', () => {
    it('should format memory-alpha source name', () => {
      const attribution = createMetadataSourceAttribution({
        episodeId,
        metadata: {...mockMetadata, dataSource: 'memory-alpha'},
        displayMode: 'compact',
      })

      const html = attribution.renderHTML()

      expect(html).toContain('Memory Alpha')
    })

    it('should format tmdb source name', () => {
      const attribution = createMetadataSourceAttribution({
        episodeId,
        metadata: {...mockMetadata, dataSource: 'tmdb'},
        displayMode: 'compact',
      })

      const html = attribution.renderHTML()

      expect(html).toContain('The Movie Database')
    })

    it('should format stapi source name', () => {
      const attribution = createMetadataSourceAttribution({
        episodeId,
        metadata: {...mockMetadata, dataSource: 'stapi'},
        displayMode: 'compact',
      })

      const html = attribution.renderHTML()

      expect(html).toContain('Star Trek API')
    })

    it('should handle manual source', () => {
      const attribution = createMetadataSourceAttribution({
        episodeId,
        metadata: {...mockMetadata, dataSource: 'manual'},
        displayMode: 'compact',
      })

      const html = attribution.renderHTML()

      expect(html).toContain('Manual Entry')
    })
  })

  describe('Enrichment Status Display', () => {
    it('should display pending status', () => {
      const attribution = createMetadataSourceAttribution({
        episodeId,
        metadata: {...mockMetadata, enrichmentStatus: 'pending'},
        displayMode: 'detailed',
      })

      const html = attribution.renderHTML()

      expect(html).toContain('attribution-status--pending')
      expect(html).toContain('pending')
    })

    it('should display partial status', () => {
      const attribution = createMetadataSourceAttribution({
        episodeId,
        metadata: {...mockMetadata, enrichmentStatus: 'partial'},
        displayMode: 'detailed',
      })

      const html = attribution.renderHTML()

      expect(html).toContain('attribution-status--partial')
      expect(html).toContain('partial')
    })

    it('should display complete status', () => {
      const attribution = createMetadataSourceAttribution({
        episodeId,
        metadata: mockMetadata,
        displayMode: 'detailed',
      })

      const html = attribution.renderHTML()

      expect(html).toContain('attribution-status--complete')
      expect(html).toContain('complete')
    })

    it('should display failed status', () => {
      const attribution = createMetadataSourceAttribution({
        episodeId,
        metadata: {...mockMetadata, enrichmentStatus: 'failed'},
        displayMode: 'detailed',
      })

      const html = attribution.renderHTML()

      expect(html).toContain('attribution-status--failed')
      expect(html).toContain('failed')
    })
  })

  describe('Validation Status Display', () => {
    it('should display validated status', () => {
      const attribution = createMetadataSourceAttribution({
        episodeId,
        metadata: mockMetadata,
        displayMode: 'detailed',
      })

      const html = attribution.renderHTML()

      expect(html).toContain('attribution-validation--validated')
      expect(html).toContain('Validated')
    })

    it('should display unvalidated status', () => {
      const attribution = createMetadataSourceAttribution({
        episodeId,
        metadata: {...mockMetadata, isValidated: false},
        displayMode: 'detailed',
      })

      const html = attribution.renderHTML()

      expect(html).toContain('attribution-validation--unvalidated')
      expect(html).toContain('Unvalidated')
    })
  })
})
