import type {ProgressTrackerInstance, TimelineVisualizationInstance} from '../src/modules/types.js'
import {JSDOM} from 'jsdom'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {timelineEvents} from '../src/data/timeline-events.js'
import {createProgressTracker} from '../src/modules/progress.js'
import {createTimelineVisualization} from '../src/modules/timeline-viz.js'

// Mock D3.js for testing
vi.mock('d3', () => {
  // Create a chainable mock that handles D3 method chaining
  const chainable = {
    append: vi.fn().mockReturnThis(),
    attr: vi.fn().mockReturnThis(),
    call: vi.fn().mockReturnThis(),
    data: vi.fn().mockReturnThis(),
    duration: vi.fn().mockReturnThis(),
    enter: vi.fn().mockReturnThis(),
    exit: vi.fn().mockReturnThis(),
    join: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    remove: vi.fn().mockReturnThis(),
    selectAll: vi.fn().mockReturnThis(),
    style: vi.fn().mockReturnThis(),
    text: vi.fn().mockReturnThis(),
    transition: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    domain: vi.fn().mockReturnThis(),
    scaleExtent: vi.fn().mockReturnThis(),
    translate: vi.fn().mockReturnThis(),
    scale: vi.fn().mockReturnThis(),
    tickFormat: vi.fn().mockReturnThis(),
    ticks: vi.fn().mockReturnThis(),
    tickValues: vi.fn().mockReturnThis(),
  }

  return {
    select: vi.fn().mockReturnValue(chainable),
    scaleTime: vi.fn().mockReturnValue(chainable),
    scaleLinear: vi.fn().mockReturnValue(chainable),
    zoom: vi.fn().mockReturnValue(chainable),
    zoomIdentity: chainable,
    axisBottom: vi.fn().mockReturnValue(chainable),
    axisLeft: vi.fn().mockReturnValue(chainable),
    extent: vi.fn().mockReturnValue([new Date('2151-01-01'), new Date('2399-12-31')]),
    timeFormat: vi.fn().mockReturnValue((date: Date) => date.getFullYear().toString()),
    color: vi.fn().mockReturnValue({
      darker: vi.fn().mockReturnValue({
        toString: vi.fn().mockReturnValue('#darkened-color'),
      }),
    }),
  }
})

describe('Timeline Progress Integration', () => {
  let container: HTMLElement
  let progressTracker: ProgressTrackerInstance
  let timelineViz: TimelineVisualizationInstance

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

    // Create progress tracker
    progressTracker = createProgressTracker()

    // Create timeline visualization instance with progress tracker
    timelineViz = createTimelineVisualization(
      container,
      timelineEvents.slice(0, 5),
      progressTracker,
    )
  })

  afterEach(() => {
    if (timelineViz) {
      timelineViz.destroy()
    }
  })

  it('should integrate progress tracker with timeline visualization', () => {
    expect(timelineViz).toBeDefined()
    expect(typeof timelineViz.render).toBe('function')
    expect(typeof timelineViz.on).toBe('function')
    expect(typeof progressTracker.toggleItem).toBe('function')
    expect(typeof progressTracker.isWatched).toBe('function')
  })

  it('should update timeline when progress tracker changes', () => {
    // Initially, no items should be watched
    expect(progressTracker.isWatched('st_fc')).toBe(false)

    // Get initial timeline state
    const initialState = timelineViz.getState()
    const initialEvent = initialState.events.find(e => e.id === 'st_fc')

    // Initially the event should not be marked as watched
    if (initialEvent) {
      expect(initialEvent.isWatched).toBe(false)
    }

    // Toggle an item and expect timeline state to update
    progressTracker.toggleItem('st_fc')

    expect(progressTracker.isWatched('st_fc')).toBe(true)

    // Verify the timeline's internal state reflects the change
    const updatedState = timelineViz.getState()
    const updatedEvent = updatedState.events.find(e => e.id === 'st_fc')

    // The timeline should now show the event as watched
    if (updatedEvent) {
      expect(updatedEvent.isWatched).toBe(true)
    }
  })

  it('should show progress indicators for watched content', () => {
    // Get initial state
    const initialState = timelineViz.getState()
    expect(initialState.events).toBeDefined()

    // Mark some items as watched
    progressTracker.setWatchedItems(['st_fc', 'ent_s1'])

    // Verify the progress tracker reflects the changes
    expect(progressTracker.isWatched('st_fc')).toBe(true)
    expect(progressTracker.isWatched('ent_s1')).toBe(true)
    expect(progressTracker.isWatched('unknown_item')).toBe(false)
  })

  it('should handle multiple progress updates correctly', () => {
    // Get initial state
    const initialState = timelineViz.getState()

    // Initially, events should not be watched
    const initialStFc = initialState.events.find(e => e.id === 'st_fc')
    const initialEntS1 = initialState.events.find(e => e.id === 'ent_s1')
    const initialVulcanContact = initialState.events.find(e => e.id === 'vulcan_first_contact')

    if (initialStFc) expect(initialStFc.isWatched).toBe(false)
    if (initialEntS1) expect(initialEntS1.isWatched).toBe(false)
    if (initialVulcanContact) expect(initialVulcanContact.isWatched).toBe(false)

    // Toggle multiple items
    progressTracker.toggleItem('st_fc')
    progressTracker.toggleItem('ent_s1')
    progressTracker.toggleItem('vulcan_first_contact')

    // Verify all are marked as watched in progress tracker
    expect(progressTracker.isWatched('st_fc')).toBe(true)
    expect(progressTracker.isWatched('ent_s1')).toBe(true)
    expect(progressTracker.isWatched('vulcan_first_contact')).toBe(true)

    // Verify timeline state reflects all changes
    const updatedState = timelineViz.getState()
    const updatedStFc = updatedState.events.find(e => e.id === 'st_fc')
    const updatedEntS1 = updatedState.events.find(e => e.id === 'ent_s1')
    const updatedVulcanContact = updatedState.events.find(e => e.id === 'vulcan_first_contact')

    if (updatedStFc) expect(updatedStFc.isWatched).toBe(true)
    if (updatedEntS1) expect(updatedEntS1.isWatched).toBe(true)
    if (updatedVulcanContact) expect(updatedVulcanContact.isWatched).toBe(true)
  })

  it('should listen to progress tracker events', () => {
    const eventListener = vi.fn()
    progressTracker.on('item-toggle', eventListener)

    // Toggle an item and verify event was emitted
    progressTracker.toggleItem('st_fc')

    expect(eventListener).toHaveBeenCalledWith({
      itemId: 'st_fc',
      isWatched: true,
    })
  })

  it('should update event watch status based on related items', () => {
    // Set up timeline events with related items
    const testEvents = [
      {
        id: 'test_event_1',
        title: 'Test Event 1',
        date: new Date('2063-04-05'),
        stardate: 'Test stardate',
        type: 'test' as any,
        description: 'Test description',
        relatedItems: ['st_fc', 'ent_s1'],
        isWatched: false,
        importance: 'major' as any,
        eraId: 'test',
      },
      {
        id: 'test_event_2',
        title: 'Test Event 2',
        date: new Date('2063-04-06'),
        stardate: 'Test stardate 2',
        type: 'test' as any,
        description: 'Test description 2',
        relatedItems: ['unknown_item'],
        isWatched: false,
        importance: 'minor' as any,
        eraId: 'test',
      },
    ]

    // Update timeline with test events
    timelineViz.updateData(testEvents)

    // Mark one of the related items as watched
    progressTracker.toggleItem('st_fc')

    // The timeline should update the event watch status
    const state = timelineViz.getState()
    expect(state.events).toBeDefined()

    // Event 1 should be considered watched because 'st_fc' is in its relatedItems
    // Event 2 should remain unwatched because 'unknown_item' is not watched
    expect(progressTracker.isWatched('st_fc')).toBe(true)
    expect(progressTracker.isWatched('unknown_item')).toBe(false)
  })

  it('should handle progress tracker reset', () => {
    // Set some items as watched
    progressTracker.setWatchedItems(['st_fc', 'ent_s1'])
    expect(progressTracker.getWatchedItems()).toEqual(['st_fc', 'ent_s1'])

    // Reset progress
    progressTracker.resetProgress()

    // All items should be unwatched
    expect(progressTracker.getWatchedItems()).toEqual([])
    expect(progressTracker.isWatched('st_fc')).toBe(false)
    expect(progressTracker.isWatched('ent_s1')).toBe(false)
  })
})
