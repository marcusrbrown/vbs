import type {
  ExportOptions,
  ProgressTrackerInstance,
  TimelineConfig,
  TimelineEvent,
  TimelineEvents,
  TimelineInteraction,
  TimelineLayout,
  TimelineVisualizationInstance,
} from './types.js'

import * as d3 from 'd3'
import {curry, pipe} from '../utils/composition.js'
import {withErrorHandling, withSyncErrorHandling} from './error-handler.js'
import {createEventEmitter} from './events.js'

/**
 * Factory function to create an interactive D3.js timeline visualization instance.
 * Follows the VBS functional factory pattern with closure-based state management
 * and generic EventEmitter for type-safe event handling.
 *
 * Features include:
 * - Interactive zoom and pan with touch support
 * - Event filtering by type, era, and watch status
 * - Progress integration showing watched/unwatched episodes
 * - Responsive design with configurable layout
 * - Export functionality for PNG/SVG sharing
 * - Performance optimization for large datasets
 *
 * @param container - DOM element to render the timeline in
 * @param initialEvents - Initial array of timeline events to display
 * @param progressTracker - Progress tracker instance for watch status integration
 * @param initialConfig - Initial timeline configuration
 * @returns Timeline visualization instance with full API
 *
 * @example
 * ```typescript
 * const progressTracker = createProgressTracker()
 * const timelineViz = createTimelineVisualization(
 *   document.getElementById('timeline-container'),
 *   timelineEvents,
 *   progressTracker,
 *   { eventTypes: ['series', 'movie'], watchStatus: 'all' }
 * )
 *
 * timelineViz.on('event-select', ({ eventId, event }) => {
 *   console.log('Selected event:', event.title)
 * })
 *
 * timelineViz.render()
 * ```
 */
export const createTimelineVisualization = <TContainer extends HTMLElement>(
  container: TContainer,
  initialEvents: TimelineEvent[] = [],
  progressTracker: ProgressTrackerInstance,
  initialConfig: Partial<TimelineConfig> = {},
): TimelineVisualizationInstance => {
  // Private state managed via closure variables
  let events: TimelineEvent[] = [...initialEvents]
  let config: TimelineConfig = {
    watchStatus: 'all',
    importance: ['minor', 'major', 'critical'],
    showOnlyWithItems: false,
    ...initialConfig,
  }

  let layout: TimelineLayout = {
    width: container.clientWidth || 800,
    height: container.clientHeight || 400,
    margin: {top: 40, right: 40, bottom: 60, left: 80},
    trackHeight: 30,
    trackSpacing: 10,
    markerSize: {width: 12, height: 12},
    fonts: {
      title: '14px sans-serif',
      subtitle: '12px sans-serif',
      body: '11px sans-serif',
    },
  }

  const interaction: TimelineInteraction = {
    zoomLevel: 1,
    panOffset: {x: 0, y: 0},
    isTouchMode: false,
    zoomLimits: {min: 0.1, max: 10},
  }

  // Mobile and touch interaction state
  let touchStartDistance = 0
  let touchStartTime = 0
  let lastTouchEnd = 0
  let isDoubleTapPrevented = false

  // D3.js visualization elements
  let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
  let chartGroup: d3.Selection<SVGGElement, unknown, null, undefined>
  let xScale: d3.ScaleTime<number, number>
  let yScale: d3.ScaleLinear<number, number>
  let zoom: d3.ZoomBehavior<SVGSVGElement, unknown>

  // Generic EventEmitter for type-safe event handling
  const eventEmitter = createEventEmitter<TimelineEvents>()

  // Event handlers (defined early to avoid hoisting issues)
  const handleEventClick = curry((_event: Event, d: TimelineEvent): void => {
    interaction.selectedEventId = d.id
    eventEmitter.emit('event-select', {eventId: d.id, event: d})
  })

  const handleEventHover = curry((_event: Event, d: TimelineEvent): void => {
    interaction.hoveredEventId = d.id
    eventEmitter.emit('event-hover', {eventId: d.id, event: d})
  })

  const handleEventLeave = (): void => {
    delete interaction.hoveredEventId
    eventEmitter.emit('event-hover', {eventId: '', event: null})
  }

  // Handle zoom events
  const handleZoom = withSyncErrorHandling(
    (event: d3.D3ZoomEvent<SVGSVGElement, unknown>): void => {
      const {transform} = event

      interaction.zoomLevel = transform.k
      interaction.panOffset = {x: transform.x, y: transform.y}

      // Apply transform to chart group
      chartGroup.attr(
        'transform',
        `translate(${layout.margin.left + transform.x}, ${layout.margin.top + transform.y}) scale(${transform.k})`,
      )

      // Emit zoom change event
      eventEmitter.emit('zoom-change', {
        zoomLevel: interaction.zoomLevel,
        zoomCenter: {x: transform.x, y: transform.y},
      })
    },
    'Failed to handle zoom event',
  )

  // Initialize D3.js visualization
  const initializeVisualization = withSyncErrorHandling((): void => {
    // Clear any existing content
    d3.select(container).selectAll('*').remove()

    // Create main SVG element
    svg = d3
      .select(container)
      .append('svg')
      .attr('width', layout.width)
      .attr('height', layout.height)
      .attr('class', 'timeline-visualization')

    // Create main chart group with margins
    chartGroup = svg
      .append('g')
      .attr('transform', `translate(${layout.margin.left}, ${layout.margin.top})`)

    // Initialize scales
    const chartWidth = layout.width - layout.margin.left - layout.margin.right
    const chartHeight = layout.height - layout.margin.top - layout.margin.bottom

    xScale = d3.scaleTime().range([0, chartWidth])

    yScale = d3.scaleLinear().range([chartHeight, 0])

    // Initialize zoom behavior
    zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([interaction.zoomLimits.min, interaction.zoomLimits.max])
      .on('zoom', handleZoom)

    svg.call(zoom)

    // Set up touch detection
    container.addEventListener('touchstart', () => {
      interaction.isTouchMode = true
    })
  }, 'Failed to initialize timeline visualization')

  // Filter events based on current configuration
  const getFilteredEvents = (): TimelineEvent[] => {
    return pipe(
      events,
      // Filter by event types
      evts =>
        config.eventTypes ? evts.filter(evt => config.eventTypes?.includes(evt.type)) : evts,
      // Filter by era IDs
      evts => (config.eraIds ? evts.filter(evt => config.eraIds?.includes(evt.eraId)) : evts),
      // Filter by watch status
      evts => {
        if (config.watchStatus === 'watched') return evts.filter(evt => evt.isWatched)
        if (config.watchStatus === 'unwatched') return evts.filter(evt => !evt.isWatched)
        return evts
      },
      // Filter by importance
      evts =>
        config.importance ? evts.filter(evt => config.importance?.includes(evt.importance)) : evts,
      // Filter by related items
      evts => (config.showOnlyWithItems ? evts.filter(evt => evt.relatedItems.length > 0) : evts),
      // Filter by date range
      evts => {
        if (config.dateRange && config.dateRange.start && config.dateRange.end) {
          const dateRange = config.dateRange
          return evts.filter(evt => evt.date >= dateRange.start && evt.date <= dateRange.end)
        }
        return evts
      },
      // Sort by date
      evts => evts.sort((a, b) => a.date.getTime() - b.date.getTime()),
    )
  }

  // Update scales based on filtered data
  const updateScales = withSyncErrorHandling((): void => {
    const filteredEvents = getFilteredEvents()

    if (filteredEvents.length === 0) {
      console.warn('No events to display in timeline')
      return
    }

    // Update x-scale domain based on event dates
    const dateExtent = d3.extent(filteredEvents, d => d.date) as [Date, Date]
    xScale.domain(dateExtent)

    // Update y-scale domain based on tracks (for now, single track)
    const trackCount = 1 // TODO: Multiple tracks for different event types
    yScale.domain([0, trackCount])
  }, 'Failed to update timeline scales')

  // Render timeline events
  const renderEvents = withSyncErrorHandling((): void => {
    const filteredEvents = getFilteredEvents()

    // Bind data to event markers
    const eventMarkers = chartGroup
      .selectAll<SVGCircleElement, TimelineEvent>('.event-marker')
      .data(filteredEvents, d => d.id)

    // Enter selection - create new markers
    eventMarkers
      .enter()
      .append('circle')
      .attr('class', 'event-marker')
      .attr('r', layout.markerSize.width / 2)
      .attr('cx', d => xScale(d.date))
      .attr('cy', layout.trackHeight / 2)
      .style('fill', d => {
        const baseColor = d.metadata?.color || '#2196F3'
        // Dim unwatched events and brighten watched events
        return d.isWatched ? baseColor : d3.color(baseColor)?.darker(1).toString() || baseColor
      })
      .style('stroke', d => (d.isWatched ? '#4CAF50' : '#fff'))
      .style('stroke-width', d => (d.isWatched ? 3 : 2))
      .style('opacity', d => (d.isWatched ? 1 : 0.6))
      .style('cursor', 'pointer')
      .on('click', handleEventClick)
      .on('mouseover', handleEventHover)
      .on('mouseout', handleEventLeave)

    // Update selection - update existing markers with progress indicators
    eventMarkers
      .transition()
      .duration(300)
      .attr('cx', d => xScale(d.date))
      .style('fill', d => {
        const baseColor = d.metadata?.color || '#2196F3'
        return d.isWatched ? baseColor : d3.color(baseColor)?.darker(1).toString() || baseColor
      })
      .style('stroke', d => (d.isWatched ? '#4CAF50' : '#fff'))
      .style('stroke-width', d => (d.isWatched ? 3 : 2))
      .style('opacity', d => (d.isWatched ? 1 : 0.6))

    // Exit selection - remove old markers
    eventMarkers.exit().transition().duration(300).attr('r', 0).remove()

    // Add progress indicators (checkmarks for watched events)
    const progressIndicators = chartGroup
      .selectAll<SVGTextElement, TimelineEvent>('.progress-indicator')
      .data(
        filteredEvents.filter(d => d.isWatched),
        d => d.id,
      )

    progressIndicators
      .enter()
      .append('text')
      .attr('class', 'progress-indicator')
      .attr('x', d => xScale(d.date))
      .attr('y', layout.trackHeight / 2 + 5)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#4CAF50')
      .style('font-weight', 'bold')
      .text('✓')

    progressIndicators
      .transition()
      .duration(300)
      .attr('x', d => xScale(d.date))

    progressIndicators.exit().remove()

    // Add event labels with watch status styling
    const eventLabels = chartGroup
      .selectAll<SVGTextElement, TimelineEvent>('.event-label')
      .data(filteredEvents, d => d.id)

    eventLabels
      .enter()
      .append('text')
      .attr('class', 'event-label')
      .attr('x', d => xScale(d.date))
      .attr('y', layout.trackHeight / 2 - 15)
      .attr('text-anchor', 'middle')
      .style('font', layout.fonts.body)
      .style('fill', d => (d.isWatched ? '#333' : '#666'))
      .style('font-weight', d => (d.isWatched ? 'bold' : 'normal'))
      .text(d => d.title)

    eventLabels
      .transition()
      .duration(300)
      .attr('x', d => xScale(d.date))
      .style('fill', d => (d.isWatched ? '#333' : '#666'))
      .style('font-weight', d => (d.isWatched ? 'bold' : 'normal'))
      .text(d => d.title)

    eventLabels.exit().remove()
  }, 'Failed to render timeline events')

  // Render axes
  const renderAxes = withSyncErrorHandling((): void => {
    const chartHeight = layout.height - layout.margin.top - layout.margin.bottom

    // X-axis (time)
    const xAxis = d3
      .axisBottom(xScale)
      .tickFormat((domainValue: Date | d3.NumberValue) => {
        return d3.timeFormat('%Y')(domainValue as Date)
      })
      .ticks(10)

    chartGroup
      .selectAll('.x-axis')
      .data([null])
      .join('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(xAxis as any)

    // Y-axis (tracks) - minimal for now
    const yAxis = d3.axisLeft(yScale).tickValues([])

    chartGroup
      .selectAll('.y-axis')
      .data([null])
      .join('g')
      .attr('class', 'y-axis')
      .call(yAxis as any)
  }, 'Failed to render timeline axes')

  // Public API methods
  const render = withSyncErrorHandling((): void => {
    if (!svg) {
      initializeVisualization()
    }

    updateScales()
    renderAxes()
    renderEvents()
  }, 'Failed to render timeline visualization')

  // Progress integration functions (defined after render to avoid hoisting issues)
  const updateEventWatchStatus = (): void => {
    events = events.map(event => ({
      ...event,
      isWatched: event.relatedItems.some(itemId => progressTracker.isWatched(itemId)),
    }))
  }

  // Listen to progress tracker changes and update timeline
  const setupProgressIntegration = (): void => {
    progressTracker.on('item-toggle', () => {
      updateEventWatchStatus()
      render() // Re-render timeline with updated progress
    })

    progressTracker.on('progress-update', () => {
      updateEventWatchStatus()
      render() // Re-render timeline with updated progress
    })

    // Initial update
    updateEventWatchStatus()
  }

  // Setup progress integration after render function is defined
  setupProgressIntegration()

  const updateData = withSyncErrorHandling((newEvents: TimelineEvent[]): void => {
    events = [...newEvents]
    render()
  }, 'Failed to update timeline data')

  const updateConfig = withSyncErrorHandling((newConfig: Partial<TimelineConfig>): void => {
    config = {...config, ...newConfig}
    render()
    eventEmitter.emit('filter-change', {config})
  }, 'Failed to update timeline configuration')

  const updateLayout = withSyncErrorHandling((newLayout: Partial<TimelineLayout>): void => {
    layout = {...layout, ...newLayout}

    if (svg) {
      svg.attr('width', layout.width).attr('height', layout.height)
    }

    render()
    eventEmitter.emit('layout-change', {layout})
  }, 'Failed to update timeline layout')

  const zoomTo = withSyncErrorHandling((level: number, center?: {x: number; y: number}): void => {
    if (!svg) return

    const zoomLevel = Math.max(
      interaction.zoomLimits.min,
      Math.min(interaction.zoomLimits.max, level),
    )
    const zoomCenter = center || {x: layout.width / 2, y: layout.height / 2}

    svg
      .transition()
      .duration(300)
      .call(transition =>
        zoom.transform(
          transition,
          d3.zoomIdentity.translate(zoomCenter.x, zoomCenter.y).scale(zoomLevel),
        ),
      )
  }, 'Failed to zoom timeline')

  const panTo = withSyncErrorHandling((offset: {x: number; y: number}): void => {
    if (!svg) return

    svg
      .transition()
      .duration(300)
      .call(transition =>
        zoom.transform(
          transition,
          d3.zoomIdentity.translate(offset.x, offset.y).scale(interaction.zoomLevel),
        ),
      )
  }, 'Failed to pan timeline')

  const zoomToFit = withSyncErrorHandling((): void => {
    const filteredEvents = getFilteredEvents()
    if (filteredEvents.length === 0) return

    const dateExtent = d3.extent(filteredEvents, d => d.date) as [Date, Date]
    const chartWidth = layout.width - layout.margin.left - layout.margin.right

    // Calculate appropriate zoom level to fit all events
    const timeSpan = dateExtent[1].getTime() - dateExtent[0].getTime()
    const pixelsPerMs = chartWidth / timeSpan
    const targetZoom = Math.min(
      interaction.zoomLimits.max,
      Math.max(interaction.zoomLimits.min, pixelsPerMs * 0.8),
    )

    zoomTo(targetZoom)
  }, 'Failed to zoom timeline to fit')

  const selectEvent = withSyncErrorHandling((eventId: string | null): void => {
    if (eventId) {
      interaction.selectedEventId = eventId
    } else {
      delete interaction.selectedEventId
    }

    // Update visual state of markers
    chartGroup
      .selectAll('.event-marker')
      .classed('selected', d => (d as TimelineEvent).id === eventId)
  }, 'Failed to select timeline event')

  const exportTimeline = withErrorHandling(async (options: ExportOptions): Promise<Blob> => {
    if (!svg) {
      throw new Error('Timeline not initialized')
    }

    const {format, dimensions, quality = 0.9, backgroundColor = 'white'} = options

    if (format === 'svg') {
      // Export as SVG
      const svgElement = svg.node()
      if (!svgElement) {
        throw new Error('SVG element not found')
      }
      const serializer = new XMLSerializer()
      const svgString = serializer.serializeToString(svgElement)
      return new Blob([svgString], {type: 'image/svg+xml'})
    } else {
      // Export as PNG using canvas
      const canvas = document.createElement('canvas')
      canvas.width = dimensions.width
      canvas.height = dimensions.height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Canvas context not available')
      }
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Convert SVG to canvas (simplified implementation)
      const svgElement = svg.node()
      if (!svgElement) {
        throw new Error('SVG element not found')
      }
      const serializer = new XMLSerializer()
      const svgString = serializer.serializeToString(svgElement)

      const img = new Image()
      const svgBlob = new Blob([svgString], {type: 'image/svg+xml'})
      const url = URL.createObjectURL(svgBlob)

      return new Promise<Blob>((resolve, reject) => {
        img.addEventListener('load', () => {
          ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height)
          URL.revokeObjectURL(url)
          canvas.toBlob(
            (blob: Blob | null) => {
              if (blob) {
                resolve(blob)
              } else {
                reject(new Error('Failed to create blob from canvas'))
              }
            },
            'image/png',
            quality,
          )
        })
        img.addEventListener('error', () => reject(new Error('Failed to load image')))
        img.src = url
      })
    }
  }, 'Failed to export timeline') as (options: ExportOptions) => Promise<Blob>

  const getState = () => ({
    config,
    layout,
    interaction,
    events: [...events],
  })

  // Calculate distance between two touch points for touch interactions
  const getTouchDistance = (touches: TouchList): number => {
    if (touches.length < 2) return 0
    const touch1 = touches[0]
    const touch2 = touches[1]
    if (!touch1 || !touch2) return 0
    return Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY)
  }

  // Handle double tap to zoom
  const handleDoubleTap = withSyncErrorHandling((touch: Touch): void => {
    if (isDoubleTapPrevented) return

    // Calculate touch position relative to SVG
    const rect = svg.node()?.getBoundingClientRect()
    if (!rect) return

    const touchX = touch.clientX - rect.left
    const touchY = touch.clientY - rect.top

    // Toggle between zoom levels on double tap
    const targetZoom = interaction.zoomLevel > 1 ? 1 : 2
    zoomTo(targetZoom, {x: touchX, y: touchY})
  }, 'Failed to handle double tap')

  // Handle touch start for pinch-to-zoom and touch detection
  const handleTouchStart = withSyncErrorHandling((event: TouchEvent): void => {
    interaction.isTouchMode = true
    touchStartTime = Date.now()

    if (event.touches.length === 2) {
      // Pinch-to-zoom start
      touchStartDistance = getTouchDistance(event.touches)
      event.preventDefault() // Prevent default browser zoom
    }

    // Handle single touch for tap detection
    if (event.touches.length === 1) {
      const now = Date.now()
      const touch = event.touches[0]
      if (touch && now - lastTouchEnd <= 300 && now - touchStartTime <= 100) {
        // Double tap detected - check timing to prevent false positives
        event.preventDefault()
        handleDoubleTap(touch)
        isDoubleTapPrevented = true
      }
    }
  }, 'Failed to handle touch start')

  // Handle touch move for pinch-to-zoom
  const handleTouchMove = withSyncErrorHandling((event: TouchEvent): void => {
    if (event.touches.length === 2 && touchStartDistance > 0) {
      const currentDistance = getTouchDistance(event.touches)
      const scaleChange = currentDistance / touchStartDistance

      // Apply zoom with limits
      const newZoom = Math.max(
        interaction.zoomLimits.min,
        Math.min(interaction.zoomLimits.max, interaction.zoomLevel * scaleChange),
      )

      if (newZoom !== interaction.zoomLevel) {
        // Calculate center point between touches
        const touch1 = event.touches[0]
        const touch2 = event.touches[1]
        if (touch1 && touch2) {
          const centerX = (touch1.clientX + touch2.clientX) / 2
          const centerY = (touch1.clientY + touch2.clientY) / 2

          zoomTo(newZoom, {x: centerX, y: centerY})
          touchStartDistance = currentDistance
        }
      }
      event.preventDefault()
    }
  }, 'Failed to handle touch move')

  // Handle touch end
  const handleTouchEnd = withSyncErrorHandling((event: TouchEvent): void => {
    if (event.touches.length === 0) {
      touchStartDistance = 0
      lastTouchEnd = Date.now()

      // Reset double tap prevention after delay
      setTimeout(() => {
        isDoubleTapPrevented = false
      }, 300)
    }
  }, 'Failed to handle touch end')

  // Enhanced resize handler for responsive design
  const handleResize = withSyncErrorHandling((): void => {
    const containerRect = container.getBoundingClientRect()
    const newWidth = containerRect.width || 800
    const newHeight = containerRect.height || 400

    // Update layout for responsive design
    const responsiveLayout: Partial<TimelineLayout> = {
      width: newWidth,
      height: newHeight,
    }

    // Adjust margins and font sizes for mobile devices
    if (newWidth < 768) {
      responsiveLayout.margin = {
        top: 20,
        right: 20,
        bottom: 40,
        left: 40,
      }
      responsiveLayout.fonts = {
        title: '12px sans-serif',
        subtitle: '10px sans-serif',
        body: '9px sans-serif',
      }
      responsiveLayout.markerSize = {
        width: 8,
        height: 8,
      }
    } else {
      responsiveLayout.margin = {
        top: 40,
        right: 40,
        bottom: 60,
        left: 80,
      }
      responsiveLayout.fonts = {
        title: '14px sans-serif',
        subtitle: '12px sans-serif',
        body: '11px sans-serif',
      }
      responsiveLayout.markerSize = {
        width: 12,
        height: 12,
      }
    }

    updateLayout(responsiveLayout)
  }, 'Failed to handle resize')

  // Setup touch and resize event listeners after initialization
  const setupEventListeners = withSyncErrorHandling((): void => {
    // Add touch event listeners for enhanced mobile support
    container.addEventListener('touchstart', handleTouchStart, {passive: false})
    container.addEventListener('touchmove', handleTouchMove, {passive: false})
    container.addEventListener('touchend', handleTouchEnd, {passive: true})

    // Add resize listener for responsive design
    window.addEventListener('resize', handleResize, {passive: true})

    // Initial responsive adjustment
    handleResize()
  }, 'Failed to setup event listeners')

  // Enhanced destroy function with proper cleanup
  const enhancedDestroy = withSyncErrorHandling((): void => {
    // Clean up touch and resize event listeners
    container.removeEventListener('touchstart', handleTouchStart)
    container.removeEventListener('touchmove', handleTouchMove)
    container.removeEventListener('touchend', handleTouchEnd)
    window.removeEventListener('resize', handleResize)

    // Clean up D3 elements
    if (svg) {
      svg.remove()
    }
    eventEmitter.removeAllListeners()
  }, 'Failed to destroy timeline visualization')

  // Initialize the visualization
  initializeVisualization()

  // Setup enhanced touch and responsive event listeners
  setupEventListeners()

  // Return public API
  return {
    render,
    updateData,
    updateConfig,
    updateLayout,
    zoomTo,
    panTo,
    zoomToFit,
    selectEvent,
    exportTimeline,
    destroy: enhancedDestroy, // Use enhanced destroy with touch cleanup
    getState,

    // Generic EventEmitter methods for type-safe event handling
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    once: eventEmitter.once.bind(eventEmitter),
  }
}
