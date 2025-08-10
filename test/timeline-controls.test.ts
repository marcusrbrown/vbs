import type {TimelineControlsInstance, TimelineEvent} from '../src/modules/types.js'
import {JSDOM} from 'jsdom'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createTimelineControls} from '../src/components/timeline-controls.js'

describe('TimelineControls', () => {
  let dom: JSDOM
  let container: HTMLElement
  let timelineControls: TimelineControlsInstance
  let mockEvents: TimelineEvent[]

  beforeEach(() => {
    // Set up JSDOM environment
    dom = new JSDOM('<!DOCTYPE html><html><body><div id="controls"></div></body></html>')
    globalThis.document = dom.window.document
    globalThis.window = dom.window as unknown as Window & typeof globalThis
    globalThis.HTMLElement = dom.window.HTMLElement
    globalThis.HTMLSelectElement = dom.window.HTMLSelectElement
    globalThis.HTMLInputElement = dom.window.HTMLInputElement
    globalThis.HTMLButtonElement = dom.window.HTMLButtonElement
    globalThis.Event = dom.window.Event

    container = document.querySelector('#controls') as HTMLElement

    // Mock timeline events for testing
    mockEvents = [
      {
        id: 'test_event_1',
        title: 'First Warp Flight',
        date: new Date('2063-04-05'),
        stardate: 'Pre-stardate',
        type: 'technology',
        description: 'Test event 1',
        relatedItems: ['ent_s1'],
        isWatched: false,
        importance: 'critical',
        eraId: 'enterprise',
        metadata: {color: '#4CAF50', icon: 'rocket', cssClasses: []},
      },
      {
        id: 'test_event_2',
        title: 'First Contact',
        date: new Date('2063-04-05'),
        stardate: 'Pre-stardate',
        type: 'first_contact',
        description: 'Test event 2',
        relatedItems: ['tos_s1'],
        isWatched: true,
        importance: 'major',
        eraId: 'tos',
        metadata: {color: '#2196F3', icon: 'handshake', cssClasses: []},
      },
      {
        id: 'test_event_3',
        title: 'War Event',
        date: new Date('2373-01-01'),
        stardate: '50000.0',
        type: 'war',
        description: 'Test war event',
        relatedItems: ['ds9_s5'],
        isWatched: false,
        importance: 'minor',
        eraId: 'ds9',
        metadata: {color: '#F44336', icon: 'explosion', cssClasses: []},
      },
    ]

    timelineControls = createTimelineControls(container, mockEvents)
  })

  afterEach(() => {
    if (timelineControls) {
      timelineControls.destroy()
    }
  })

  describe('Initialization', () => {
    it('should create timeline controls instance with proper methods', () => {
      expect(timelineControls).toBeDefined()
      expect(typeof timelineControls.render).toBe('function')
      expect(typeof timelineControls.updateData).toBe('function')
      expect(typeof timelineControls.updateConfig).toBe('function')
      expect(typeof timelineControls.getConfig).toBe('function')
      expect(typeof timelineControls.getFilterOptions).toBe('function')
      expect(typeof timelineControls.destroy).toBe('function')
    })

    it('should extract filter options from timeline events', () => {
      // Need to call render first to trigger extractFilterOptions
      timelineControls.render()
      const filterOptions = timelineControls.getFilterOptions()

      expect(filterOptions.eras).toEqual(expect.arrayContaining(['ds9', 'enterprise', 'tos']))
      expect(filterOptions.eventTypes).toEqual(
        expect.arrayContaining(['first_contact', 'technology', 'war']),
      )
      expect(filterOptions.series).toEqual(expect.arrayContaining(['ds9', 'ent', 'tos']))
      expect(filterOptions.importanceLevels).toEqual(
        expect.arrayContaining(['critical', 'major', 'minor']),
      )
    })

    it('should initialize with default configuration', () => {
      const config = timelineControls.getConfig()
      expect(config.watchStatus).toBe('all')
      expect(config.importance).toEqual(['minor', 'major', 'critical'])
      expect(config.showOnlyWithItems).toBe(false)
    })
  })

  describe('Rendering', () => {
    it('should render timeline controls UI elements', () => {
      timelineControls.render()

      const controlsElement = container.querySelector('[data-testid="timeline-controls"]')
      expect(controlsElement).toBeTruthy()

      const eraFilter = container.querySelector('[data-testid="era-filter"]')
      const eventTypeFilter = container.querySelector('[data-testid="event-type-filter"]')
      const seriesFilter = container.querySelector('[data-testid="series-filter"]')
      const watchStatusFilter = container.querySelector('[data-testid="watch-status-filter"]')
      const importanceFilter = container.querySelector('[data-testid="importance-filter"]')
      const resetButton = container.querySelector('[data-testid="reset-filters"]')

      expect(eraFilter).toBeTruthy()
      expect(eventTypeFilter).toBeTruthy()
      expect(seriesFilter).toBeTruthy()
      expect(watchStatusFilter).toBeTruthy()
      expect(importanceFilter).toBeTruthy()
      expect(resetButton).toBeTruthy()
    })

    it('should emit render-complete event', () => {
      const mockListener = vi.fn()
      timelineControls.on('render-complete', mockListener)

      timelineControls.render()

      expect(mockListener).toHaveBeenCalledWith({
        config: expect.objectContaining({
          watchStatus: 'all',
          importance: ['minor', 'major', 'critical'],
        }),
      })
    })

    it('should populate select options with filter data', () => {
      timelineControls.render()

      const eraFilter = container.querySelector('[data-testid="era-filter"]') as HTMLSelectElement
      const eventTypeFilter = container.querySelector(
        '[data-testid="event-type-filter"]',
      ) as HTMLSelectElement

      // Check era options (All + extracted eras)
      expect(eraFilter.options.length).toBe(4) // "All Eras" + 3 eras
      expect(eraFilter.options[1]?.value).toBe('ds9')
      expect(eraFilter.options[2]?.value).toBe('enterprise')
      expect(eraFilter.options[3]?.value).toBe('tos')

      // Check event type options (All + extracted types)
      expect(eventTypeFilter.options.length).toBe(4) // "All Types" + 3 types
      expect(Array.from(eventTypeFilter.options).map(opt => opt.value)).toContain('technology')
      expect(Array.from(eventTypeFilter.options).map(opt => opt.value)).toContain('first_contact')
      expect(Array.from(eventTypeFilter.options).map(opt => opt.value)).toContain('war')
    })
  })

  describe('Filter Interactions', () => {
    beforeEach(() => {
      timelineControls.render()
    })

    it('should emit filter-change event when era filter changes', () => {
      const mockListener = vi.fn()
      timelineControls.on('filter-change', mockListener)

      const eraFilter = container.querySelector('[data-testid="era-filter"]') as HTMLSelectElement
      const option = eraFilter.querySelector('option[value="enterprise"]') as HTMLOptionElement
      option.selected = true

      // Trigger change event
      const changeEvent = new dom.window.Event('change')
      eraFilter.dispatchEvent(changeEvent)

      expect(mockListener).toHaveBeenCalledWith({
        config: expect.objectContaining({
          eraIds: ['enterprise'],
        }),
        filterState: expect.objectContaining({
          eraIds: ['enterprise'],
        }),
      })
    })

    it('should emit filter-change event when event type filter changes', () => {
      const mockListener = vi.fn()
      timelineControls.on('filter-change', mockListener)

      const eventTypeFilter = container.querySelector(
        '[data-testid="event-type-filter"]',
      ) as HTMLSelectElement
      const option = eventTypeFilter.querySelector(
        'option[value="technology"]',
      ) as HTMLOptionElement
      option.selected = true

      // Trigger change event
      const changeEvent = new dom.window.Event('change')
      eventTypeFilter.dispatchEvent(changeEvent)

      expect(mockListener).toHaveBeenCalledWith({
        config: expect.objectContaining({
          eventTypes: ['technology'],
        }),
        filterState: expect.objectContaining({
          eventTypes: ['technology'],
        }),
      })
    })

    it('should emit filter-change event when watch status changes', () => {
      const mockListener = vi.fn()
      timelineControls.on('filter-change', mockListener)

      const watchStatusFilter = container.querySelector(
        '[data-testid="watch-status-filter"]',
      ) as HTMLSelectElement
      watchStatusFilter.value = 'watched'

      // Trigger change event
      const changeEvent = new dom.window.Event('change')
      watchStatusFilter.dispatchEvent(changeEvent)

      expect(mockListener).toHaveBeenCalledWith({
        config: expect.objectContaining({
          watchStatus: 'watched',
        }),
        filterState: expect.objectContaining({
          watchStatus: 'watched',
        }),
      })
    })

    it('should handle multiple selections in multi-select filters', () => {
      const mockListener = vi.fn()
      timelineControls.on('filter-change', mockListener)

      const eraFilter = container.querySelector('[data-testid="era-filter"]') as HTMLSelectElement
      const enterpriseOption = eraFilter.querySelector(
        'option[value="enterprise"]',
      ) as HTMLOptionElement
      const tosOption = eraFilter.querySelector('option[value="tos"]') as HTMLOptionElement

      enterpriseOption.selected = true
      tosOption.selected = true

      // Trigger change event
      const changeEvent = new dom.window.Event('change')
      eraFilter.dispatchEvent(changeEvent)

      expect(mockListener).toHaveBeenCalledWith({
        config: expect.objectContaining({
          eraIds: ['enterprise', 'tos'],
        }),
        filterState: expect.objectContaining({
          eraIds: ['enterprise', 'tos'],
        }),
      })
    })
  })

  describe('Reset Functionality', () => {
    beforeEach(() => {
      timelineControls.render()
    })

    it('should reset all filters when reset button is clicked', () => {
      const mockListener = vi.fn()
      timelineControls.on('filters-reset', mockListener)

      // Set some filter values first
      const eraFilter = container.querySelector('[data-testid="era-filter"]') as HTMLSelectElement
      const option = eraFilter.querySelector('option[value="enterprise"]') as HTMLOptionElement
      option.selected = true

      const watchStatusFilter = container.querySelector(
        '[data-testid="watch-status-filter"]',
      ) as HTMLSelectElement
      watchStatusFilter.value = 'watched'

      // Click reset button
      const resetButton = container.querySelector(
        '[data-testid="reset-filters"]',
      ) as HTMLButtonElement
      const clickEvent = new dom.window.Event('click')
      resetButton.dispatchEvent(clickEvent)

      expect(mockListener).toHaveBeenCalledWith({
        config: expect.objectContaining({
          watchStatus: 'all',
        }),
      })

      // Verify UI is reset
      expect(eraFilter.selectedOptions.length).toBe(0)
      expect(watchStatusFilter.value).toBe('all')
    })

    it('should emit filter-change event after reset', () => {
      const filterChangeListener = vi.fn()
      const resetListener = vi.fn()

      timelineControls.on('filter-change', filterChangeListener)
      timelineControls.on('filters-reset', resetListener)

      const resetButton = container.querySelector(
        '[data-testid="reset-filters"]',
      ) as HTMLButtonElement
      const clickEvent = new dom.window.Event('click')
      resetButton.dispatchEvent(clickEvent)

      expect(resetListener).toHaveBeenCalledTimes(1)
      expect(filterChangeListener).toHaveBeenCalledTimes(1)
    })
  })

  describe('Configuration Management', () => {
    it('should update configuration programmatically', () => {
      const newConfig = {
        watchStatus: 'watched' as const,
        eraIds: ['enterprise'],
      }

      timelineControls.updateConfig(newConfig)

      const config = timelineControls.getConfig()
      expect(config.watchStatus).toBe('watched')
      expect(config.eraIds).toEqual(['enterprise'])
    })

    it('should update data and re-render', () => {
      const newEvents: TimelineEvent[] = [
        {
          id: 'new_event',
          title: 'New Event',
          date: new Date('2400-01-01'),
          stardate: '77000.0',
          type: 'technology',
          description: 'A new test event',
          relatedItems: ['pic_s1'],
          isWatched: false,
          importance: 'major',
          eraId: 'pic',
          metadata: {color: '#9C27B0', icon: 'tech', cssClasses: []},
        },
      ]

      timelineControls.updateData(newEvents)

      const filterOptions = timelineControls.getFilterOptions()
      expect(filterOptions.eras).toContain('pic')
      expect(filterOptions.series).toContain('pic')
    })

    it('should import configuration from external source', () => {
      const mockListener = vi.fn()
      timelineControls.on('config-import', mockListener)

      const importedConfig = {
        watchStatus: 'unwatched' as const,
        eraIds: ['tos', 'tng'],
      }

      timelineControls.importConfig(importedConfig)

      expect(mockListener).toHaveBeenCalledWith({
        config: importedConfig,
      })

      const config = timelineControls.getConfig()
      expect(config.watchStatus).toBe('unwatched')
      expect(config.eraIds).toEqual(['tos', 'tng'])
    })
  })

  describe('Event Emitter Functionality', () => {
    it('should support one-time listeners', () => {
      const mockListener = vi.fn()
      timelineControls.once('render-complete', mockListener)

      timelineControls.render()
      timelineControls.render()

      expect(mockListener).toHaveBeenCalledTimes(1)
    })

    it('should support listener removal', () => {
      const mockListener = vi.fn()
      timelineControls.on('filter-change', mockListener)

      timelineControls.render()

      const eraFilter = container.querySelector('[data-testid="era-filter"]') as HTMLSelectElement
      const option = eraFilter.querySelector('option[value="enterprise"]') as HTMLOptionElement
      option.selected = true

      const changeEvent = new dom.window.Event('change')
      eraFilter.dispatchEvent(changeEvent)

      expect(mockListener).toHaveBeenCalledTimes(1)

      // Remove listener and try again
      timelineControls.off('filter-change', mockListener)

      option.selected = false
      eraFilter.dispatchEvent(changeEvent)

      expect(mockListener).toHaveBeenCalledTimes(1) // Should not increase
    })

    it('should remove all listeners', () => {
      const mockListener1 = vi.fn()
      const mockListener2 = vi.fn()

      timelineControls.on('filter-change', mockListener1)
      timelineControls.on('render-complete', mockListener2)

      timelineControls.removeAllListeners()
      timelineControls.render()

      expect(mockListener1).not.toHaveBeenCalled()
      expect(mockListener2).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle render errors gracefully', () => {
      // Create controls with invalid container
      const invalidContainer = {} as HTMLElement
      const controlsWithError = createTimelineControls(invalidContainer, mockEvents)

      expect(() => {
        controlsWithError.render()
      }).not.toThrow()

      controlsWithError.destroy()
    })

    it('should handle destroy when not rendered', () => {
      expect(() => {
        timelineControls.destroy()
      }).not.toThrow()
    })
  })

  describe('Export Functionality', () => {
    it('should emit config-export event for PNG export', () => {
      const mockListener = vi.fn()
      timelineControls.on('config-export', mockListener)

      timelineControls.render()

      const exportButton = container.querySelector(
        '[data-testid="export-png"]',
      ) as HTMLButtonElement
      expect(exportButton).toBeTruthy()

      exportButton.click()

      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.any(Object),
          exportData: expect.objectContaining({
            format: 'png',
            options: expect.objectContaining({
              format: 'png',
              dimensions: {width: 1200, height: 800},
              quality: 0.9,
              backgroundColor: 'white',
              includeMetadata: true,
              filename: expect.stringMatching(/^star-trek-timeline-\d+$/),
            }),
          }),
        }),
      )
    })

    it('should emit config-export event for SVG export', () => {
      const mockListener = vi.fn()
      timelineControls.on('config-export', mockListener)

      timelineControls.render()

      const exportButton = container.querySelector(
        '[data-testid="export-svg"]',
      ) as HTMLButtonElement
      expect(exportButton).toBeTruthy()

      exportButton.click()

      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.any(Object),
          exportData: expect.objectContaining({
            format: 'svg',
            options: expect.objectContaining({
              format: 'svg',
              dimensions: {width: 1200, height: 800},
              backgroundColor: 'transparent',
              includeMetadata: true,
              filename: expect.stringMatching(/^star-trek-timeline-\d+$/),
            }),
          }),
        }),
      )
    })

    it('should render export buttons with correct styling', () => {
      timelineControls.render()

      const exportPngButton = container.querySelector(
        '[data-testid="export-png"]',
      ) as HTMLButtonElement
      const exportSvgButton = container.querySelector(
        '[data-testid="export-svg"]',
      ) as HTMLButtonElement

      expect(exportPngButton).toBeTruthy()
      expect(exportSvgButton).toBeTruthy()
      expect(exportPngButton.textContent?.trim()).toBe('Export PNG')
      expect(exportSvgButton.textContent?.trim()).toBe('Export SVG')
    })
  })

  describe('Series Filtering', () => {
    it('should extract series from related items correctly', () => {
      // Debug the issue by testing the regex directly
      const testItems = ['ent_s1', 'tos_s1', 'ds9_s5']
      const extractedSeries: string[] = []

      testItems.forEach(item => {
        const seriesMatch = item.match(/^([a-z0-9]+)_/)
        if (seriesMatch?.[1]) {
          extractedSeries.push(seriesMatch[1])
        }
      })

      expect(extractedSeries).toEqual(['ent', 'tos', 'ds9'])

      // Now test the actual component
      timelineControls.render()
      const filterOptions = timelineControls.getFilterOptions()

      expect(filterOptions.series).toContain('ent')
      expect(filterOptions.series).toContain('tos')
      expect(filterOptions.series).toContain('ds9')
    })

    it('should handle series filter changes', () => {
      timelineControls.render()

      const mockListener = vi.fn()
      timelineControls.on('filter-change', mockListener)

      const seriesFilter = container.querySelector(
        '[data-testid="series-filter"]',
      ) as HTMLSelectElement
      const option = seriesFilter.querySelector('option[value="ent"]') as HTMLOptionElement
      option.selected = true

      const changeEvent = new dom.window.Event('change')
      seriesFilter.dispatchEvent(changeEvent)

      expect(mockListener).toHaveBeenCalledWith({
        config: expect.objectContaining({
          seriesIds: ['ent'],
        }),
        filterState: expect.objectContaining({
          seriesIds: ['ent'],
        }),
      })
    })
  })
})
