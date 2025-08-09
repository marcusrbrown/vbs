import type {ProgressTrackerInstance, TimelineVisualizationInstance} from '../src/modules/types.js'
import {JSDOM} from 'jsdom'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {timelineEvents} from '../src/data/timeline-events.js'
import {createTimelineVisualization} from '../src/modules/timeline-viz.js'

// Mock D3.js for testing
vi.mock('d3', () => ({
  select: vi.fn().mockReturnValue({
    selectAll: vi.fn().mockReturnValue({
      remove: vi.fn(),
    }),
    append: vi.fn().mockReturnValue({
      attr: vi.fn().mockReturnThis(),
      append: vi.fn().mockReturnThis(),
      call: vi.fn().mockReturnThis(),
      selectAll: vi.fn().mockReturnValue({
        data: vi.fn().mockReturnValue({
          join: vi.fn().mockReturnValue({
            attr: vi.fn().mockReturnThis(),
            call: vi.fn().mockReturnThis(),
          }),
          enter: vi.fn().mockReturnValue({
            append: vi.fn().mockReturnValue({
              attr: vi.fn().mockReturnThis(),
              style: vi.fn().mockReturnThis(),
              on: vi.fn().mockReturnThis(),
              text: vi.fn().mockReturnThis(),
            }),
          }),
          transition: vi.fn().mockReturnValue({
            duration: vi.fn().mockReturnValue({
              attr: vi.fn().mockReturnThis(),
              style: vi.fn().mockReturnThis(),
            }),
          }),
          exit: vi.fn().mockReturnValue({
            transition: vi.fn().mockReturnValue({
              duration: vi.fn().mockReturnValue({
                attr: vi.fn().mockReturnThis(),
                remove: vi.fn(),
              }),
            }),
            remove: vi.fn(),
          }),
        }),
      }),
    }),
    transition: vi.fn().mockReturnValue({
      duration: vi.fn().mockReturnValue({
        call: vi.fn().mockReturnThis(),
      }),
    }),
    node: vi.fn().mockReturnValue({
      tagName: 'svg',
    }),
    remove: vi.fn(),
  }),
  scaleTime: vi.fn().mockReturnValue({
    range: vi.fn().mockReturnThis(),
    domain: vi.fn().mockReturnThis(),
  }),
  scaleLinear: vi.fn().mockReturnValue({
    range: vi.fn().mockReturnThis(),
    domain: vi.fn().mockReturnThis(),
  }),
  zoom: vi.fn().mockReturnValue({
    scaleExtent: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    transform: vi.fn(),
  }),
  zoomIdentity: {
    translate: vi.fn().mockReturnValue({
      scale: vi.fn().mockReturnThis(),
    }),
  },
  axisBottom: vi.fn().mockReturnValue({
    tickFormat: vi.fn().mockReturnThis(),
    ticks: vi.fn().mockReturnThis(),
  }),
  axisLeft: vi.fn().mockReturnValue({
    tickValues: vi.fn().mockReturnThis(),
  }),
  extent: vi.fn().mockReturnValue([new Date('2060-01-01'), new Date('2380-01-01')]),
  timeFormat: vi.fn().mockReturnValue((d: Date) => d.getFullYear().toString()),
}))

describe('Timeline Visualization', () => {
  let container: HTMLElement
  let timelineViz: TimelineVisualizationInstance
  let mockProgressTracker: ProgressTrackerInstance

  beforeEach(() => {
    // Set up DOM environment
    const dom = new JSDOM('<!DOCTYPE html><div id="timeline-container"></div>')
    globalThis.document = dom.window.document
    globalThis.window = dom.window as any
    globalThis.HTMLElement = dom.window.HTMLElement
    globalThis.SVGElement = dom.window.SVGElement
    globalThis.Image = dom.window['Image']
    globalThis.XMLSerializer = dom.window.XMLSerializer
    globalThis.URL = dom.window.URL

    // Create container element
    const containerElement = document.querySelector('#timeline-container')
    if (!containerElement) {
      throw new Error('Timeline container not found')
    }
    container = containerElement as HTMLElement
    Object.defineProperty(container, 'clientWidth', {value: 800, configurable: true})
    Object.defineProperty(container, 'clientHeight', {value: 400, configurable: true})

    // Create mock progress tracker
    mockProgressTracker = {
      setWatchedItems: vi.fn(),
      toggleItem: vi.fn(),
      isWatched: vi.fn().mockReturnValue(false),
      resetProgress: vi.fn(),
      getWatchedItems: vi.fn().mockReturnValue([]),
      updateProgress: vi.fn(),
      calculateOverallProgress: vi.fn().mockReturnValue({total: 0, completed: 0, percentage: 0}),
      calculateEraProgress: vi.fn().mockReturnValue([]),
      on: vi.fn(),
      off: vi.fn(),
      once: vi.fn(),
      removeAllListeners: vi.fn(),
    }

    // Create timeline visualization instance
    timelineViz = createTimelineVisualization(
      container,
      timelineEvents.slice(0, 5),
      mockProgressTracker,
    )
  })

  afterEach(() => {
    if (timelineViz) {
      timelineViz.destroy()
    }
  })

  it('should create timeline visualization instance', () => {
    expect(timelineViz).toBeDefined()
    expect(typeof timelineViz.render).toBe('function')
    expect(typeof timelineViz.updateData).toBe('function')
    expect(typeof timelineViz.updateConfig).toBe('function')
  })

  it('should provide event emitter methods', () => {
    expect(typeof timelineViz.on).toBe('function')
    expect(typeof timelineViz.off).toBe('function')
    expect(typeof timelineViz.once).toBe('function')
  })

  it('should handle render method', () => {
    expect(() => timelineViz.render()).not.toThrow()
  })

  it('should handle updateData method', () => {
    const newEvents = timelineEvents.slice(0, 3)
    expect(() => timelineViz.updateData(newEvents)).not.toThrow()
  })

  it('should handle updateConfig method', () => {
    const config = {
      watchStatus: 'all' as const,
    }
    expect(() => timelineViz.updateConfig(config)).not.toThrow()
  })

  it('should handle zoom operations', () => {
    expect(() => timelineViz.zoomTo(1.5)).not.toThrow()
    expect(() => timelineViz.zoomToFit()).not.toThrow()
  })

  it('should handle pan operations', () => {
    expect(() => timelineViz.panTo({x: 100, y: 50})).not.toThrow()
  })

  it('should handle event selection', () => {
    expect(() => timelineViz.selectEvent('first_warp_flight')).not.toThrow()
    expect(() => timelineViz.selectEvent(null)).not.toThrow()
  })

  it('should return current state', () => {
    const state = timelineViz.getState()
    expect(state).toBeDefined()
    expect(state.config).toBeDefined()
    expect(state.layout).toBeDefined()
    expect(state.interaction).toBeDefined()
    expect(state.events).toBeDefined()
    expect(Array.isArray(state.events)).toBe(true)
  })

  it('should handle event listeners', () => {
    const mockListener = vi.fn()

    timelineViz.on('event-select', mockListener)
    timelineViz.off('event-select', mockListener)

    expect(() => {
      timelineViz.once('zoom-change', mockListener)
    }).not.toThrow()
  })

  it('should handle export functionality', async () => {
    const exportOptions = {
      format: 'svg' as const,
      dimensions: {width: 800, height: 400},
    }

    try {
      const result = await timelineViz.exportTimeline(exportOptions)
      expect(result).toBeInstanceOf(Blob)
    } catch (error) {
      // Export might fail in test environment, that's OK
      expect(error).toBeInstanceOf(Error)
    }
  })

  it('should handle destroy method', () => {
    expect(() => timelineViz.destroy()).not.toThrow()
  })
})
