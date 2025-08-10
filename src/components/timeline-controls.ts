import type {
  TimelineConfig,
  TimelineControlsEvents,
  TimelineControlsInstance,
  TimelineEvent,
  TimelineEventType,
} from '../modules/types.js'

import {withSyncErrorHandling} from '../modules/error-handler.js'
import {createEventEmitter} from '../modules/events.js'
import {curry} from '../utils/composition.js'

/**
 * Factory function to create timeline filter controls for interactive timeline visualization.
 * Provides UI controls for filtering timeline events by era, event type, series, and other criteria.
 * Follows the VBS functional factory pattern with closure-based state management.
 *
 * Features include:
 * - Era filtering with multi-select support
 * - Event type filtering (technology, war, first_contact, etc.)
 * - Series filtering extracted from related items
 * - Watch status filtering (all, watched, unwatched)
 * - Importance level filtering
 * - Reset to default filters
 *
 * @param container - DOM element to render the controls in
 * @param initialEvents - Timeline events for extracting filter options
 * @param initialConfig - Initial timeline configuration
 * @returns Timeline controls instance with full API
 */
export const createTimelineControls = <TContainer extends HTMLElement>(
  container: TContainer,
  initialEvents: TimelineEvent[] = [],
  initialConfig: Partial<TimelineConfig> = {},
): TimelineControlsInstance => {
  // Private state managed via closure variables
  let events: TimelineEvent[] = [...initialEvents]
  let config: TimelineConfig = {
    watchStatus: 'all',
    importance: ['minor', 'major', 'critical'],
    showOnlyWithItems: false,
    ...initialConfig,
  }

  // Cache for extracted filter options
  let filterOptions: {
    eras: string[]
    eventTypes: string[]
    series: string[]
    importanceLevels: string[]
  } = {
    eras: [],
    eventTypes: [],
    series: [],
    importanceLevels: [],
  }

  // DOM elements cache
  let eraSelect: HTMLSelectElement
  let eventTypeSelect: HTMLSelectElement
  let seriesSelect: HTMLSelectElement
  let watchStatusSelect: HTMLSelectElement
  let importanceSelect: HTMLSelectElement
  let resetButton: HTMLButtonElement
  let exportPngButton: HTMLButtonElement
  let exportSvgButton: HTMLButtonElement

  // Generic EventEmitter for type-safe event handling
  const eventEmitter = createEventEmitter<TimelineControlsEvents>()

  // Format functions for display names
  const formatEraName = (eraId: string): string => {
    const eraNames: Record<string, string> = {
      enterprise: 'Enterprise Era (22nd Century)',
      discovery: 'Discovery Era (23rd Century)',
      tos: 'Original Series Era (23rd Century)',
      tmp: 'Motion Picture Era (23rd Century)',
      tng: 'Next Generation Era (24th Century)',
      ds9: 'Deep Space Nine Era (24th Century)',
      voy: 'Voyager Era (24th Century)',
      ent: 'Enterprise Era (24th Century)',
      pic: 'Picard Era (25th Century)',
      dis: 'Discovery Future (32nd Century)',
    }
    return eraNames[eraId] || eraId.toUpperCase()
  }

  const formatEventType = (type: string): string => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const formatSeriesName = (seriesId: string): string => {
    const seriesNames: Record<string, string> = {
      ent: 'Enterprise',
      dis: 'Discovery',
      tos: 'Original Series',
      tas: 'Animated Series',
      tmp: 'Motion Pictures',
      tng: 'Next Generation',
      ds9: 'Deep Space Nine',
      voy: 'Voyager',
      pic: 'Picard',
      ld: 'Lower Decks',
      pro: 'Prodigy',
      snw: 'Strange New Worlds',
    }
    return seriesNames[seriesId] || seriesId.toUpperCase()
  }

  const formatImportanceLevel = (level: string): string => {
    return level.charAt(0).toUpperCase() + level.slice(1)
  }

  // Extract unique filter options from timeline events
  const extractFilterOptions = (): void => {
    const eras = new Set<string>()
    const eventTypes = new Set<string>()
    const series = new Set<string>()
    const importanceLevels = new Set<string>()

    events.forEach(event => {
      if (event.eraId) eras.add(event.eraId)
      if (event.type) eventTypes.add(event.type)
      if (event.importance) importanceLevels.add(event.importance)

      // Extract series from related items (e.g., 'tos_s1' -> 'tos', 'ds9_s5' -> 'ds9')
      event.relatedItems.forEach(item => {
        const seriesMatch = item.match(/^([a-z0-9]+)_/)
        if (seriesMatch?.[1]) {
          series.add(seriesMatch[1])
        }
      })
    })

    filterOptions = {
      eras: Array.from(eras).sort(),
      eventTypes: Array.from(eventTypes).sort(),
      series: Array.from(series).sort(),
      importanceLevels: Array.from(importanceLevels),
    }
  }

  // Create HTML structure for filter controls
  const createControlsHTML = (): string => {
    return `
      <div class="timeline-controls" data-testid="timeline-controls">
        <div class="timeline-controls__header">
          <h3 class="timeline-controls__title">Timeline Filters</h3>
          <div class="timeline-controls__actions">
            <button class="timeline-controls__reset" data-testid="reset-filters">
              Reset Filters
            </button>
            <div class="timeline-controls__export">
              <button class="timeline-controls__export-png" data-testid="export-png">
                Export PNG
              </button>
              <button class="timeline-controls__export-svg" data-testid="export-svg">
                Export SVG
              </button>
            </div>
          </div>
        </div>

        <div class="timeline-controls__grid">
          <div class="timeline-controls__group">
            <label for="era-filter" class="timeline-controls__label">Era</label>
            <select id="era-filter" class="timeline-controls__select" multiple data-testid="era-filter">
              <option value="">All Eras</option>
              ${filterOptions.eras
                .map(era => `<option value="${era}">${formatEraName(era)}</option>`)
                .join('')}
            </select>
          </div>

          <div class="timeline-controls__group">
            <label for="event-type-filter" class="timeline-controls__label">Event Type</label>
            <select id="event-type-filter" class="timeline-controls__select" multiple data-testid="event-type-filter">
              <option value="">All Types</option>
              ${filterOptions.eventTypes
                .map(type => `<option value="${type}">${formatEventType(type)}</option>`)
                .join('')}
            </select>
          </div>

          <div class="timeline-controls__group">
            <label for="series-filter" class="timeline-controls__label">Series</label>
            <select id="series-filter" class="timeline-controls__select" multiple data-testid="series-filter">
              <option value="">All Series</option>
              ${filterOptions.series
                .map(series => `<option value="${series}">${formatSeriesName(series)}</option>`)
                .join('')}
            </select>
          </div>

          <div class="timeline-controls__group">
            <label for="watch-status-filter" class="timeline-controls__label">Watch Status</label>
            <select id="watch-status-filter" class="timeline-controls__select" data-testid="watch-status-filter">
              <option value="all">All Episodes</option>
              <option value="watched">Watched Only</option>
              <option value="unwatched">Unwatched Only</option>
            </select>
          </div>

          <div class="timeline-controls__group">
            <label for="importance-filter" class="timeline-controls__label">Importance</label>
            <select id="importance-filter" class="timeline-controls__select" multiple data-testid="importance-filter">
              ${filterOptions.importanceLevels
                .map(
                  level =>
                    `<option value="${level}" selected>${formatImportanceLevel(level)}</option>`,
                )
                .join('')}
            </select>
          </div>
        </div>
      </div>
    `
  }

  // Get selected values from multi-select elements
  const getSelectedValues = (selectElement: HTMLSelectElement): string[] => {
    return Array.from(selectElement.selectedOptions)
      .map(option => option.value)
      .filter(value => value !== '')
  }

  // Update configuration from form inputs
  const updateConfigFromInputs = (): void => {
    const eraIds = getSelectedValues(eraSelect)
    const eventTypes = getSelectedValues(eventTypeSelect) as TimelineEventType[]
    const seriesIds = getSelectedValues(seriesSelect)
    const watchStatus = watchStatusSelect.value as 'all' | 'watched' | 'unwatched'
    const importance = getSelectedValues(importanceSelect) as ('minor' | 'major' | 'critical')[]

    const newConfig: Partial<TimelineConfig> = {}

    if (eraIds.length > 0) newConfig.eraIds = eraIds
    if (eventTypes.length > 0) newConfig.eventTypes = eventTypes
    if (seriesIds.length > 0) newConfig.seriesIds = seriesIds
    newConfig.watchStatus = watchStatus
    if (importance.length > 0) newConfig.importance = importance

    config = {...config, ...newConfig}
    eventEmitter.emit('filter-change', {config, filterState: newConfig})
  }

  // Event handlers
  const handleFilterChange = curry((_event: Event): void => {
    updateConfigFromInputs()
  })

  const handleResetFilters = curry((_event: Event): void => {
    // Reset all form inputs to defaults
    Array.from(eraSelect.options).forEach(option => {
      option.selected = false
    })
    Array.from(eventTypeSelect.options).forEach(option => {
      option.selected = false
    })
    Array.from(seriesSelect.options).forEach(option => {
      option.selected = false
    })
    watchStatusSelect.value = 'all'

    // Select all importance levels
    Array.from(importanceSelect.options).forEach(option => {
      option.selected = true
    })

    updateConfigFromInputs()
    eventEmitter.emit('filters-reset', {config})
  })

  // Export event handlers
  const handleExportPng = curry((_event: Event): void => {
    const exportOptions = {
      format: 'png' as const,
      dimensions: {width: 1200, height: 800},
      quality: 0.9,
      backgroundColor: 'white',
      includeMetadata: true,
      filename: `star-trek-timeline-${Date.now()}`,
    }
    eventEmitter.emit('config-export', {
      config,
      exportData: {format: 'png', options: exportOptions},
    })
  })

  const handleExportSvg = curry((_event: Event): void => {
    const exportOptions = {
      format: 'svg' as const,
      dimensions: {width: 1200, height: 800},
      backgroundColor: 'transparent',
      includeMetadata: true,
      filename: `star-trek-timeline-${Date.now()}`,
    }
    eventEmitter.emit('config-export', {
      config,
      exportData: {format: 'svg', options: exportOptions},
    })
  })

  // Cache DOM elements after render
  const cacheElements = (): void => {
    eraSelect = container.querySelector('[data-testid="era-filter"]') as HTMLSelectElement
    eventTypeSelect = container.querySelector(
      '[data-testid="event-type-filter"]',
    ) as HTMLSelectElement
    seriesSelect = container.querySelector('[data-testid="series-filter"]') as HTMLSelectElement
    watchStatusSelect = container.querySelector(
      '[data-testid="watch-status-filter"]',
    ) as HTMLSelectElement
    importanceSelect = container.querySelector(
      '[data-testid="importance-filter"]',
    ) as HTMLSelectElement
    resetButton = container.querySelector('[data-testid="reset-filters"]') as HTMLButtonElement
    exportPngButton = container.querySelector('[data-testid="export-png"]') as HTMLButtonElement
    exportSvgButton = container.querySelector('[data-testid="export-svg"]') as HTMLButtonElement
  }

  // Attach event listeners to form elements
  const attachEventListeners = (): void => {
    eraSelect?.addEventListener('change', handleFilterChange)
    eventTypeSelect?.addEventListener('change', handleFilterChange)
    seriesSelect?.addEventListener('change', handleFilterChange)
    watchStatusSelect?.addEventListener('change', handleFilterChange)
    importanceSelect?.addEventListener('change', handleFilterChange)
    resetButton?.addEventListener('click', handleResetFilters)
    exportPngButton?.addEventListener('click', handleExportPng)
    exportSvgButton?.addEventListener('click', handleExportSvg)
  }

  // Remove event listeners
  const removeEventListeners = (): void => {
    eraSelect?.removeEventListener('change', handleFilterChange)
    eventTypeSelect?.removeEventListener('change', handleFilterChange)
    seriesSelect?.removeEventListener('change', handleFilterChange)
    watchStatusSelect?.removeEventListener('change', handleFilterChange)
    importanceSelect?.removeEventListener('change', handleFilterChange)
    resetButton?.removeEventListener('click', handleResetFilters)
    exportPngButton?.removeEventListener('click', handleExportPng)
    exportSvgButton?.removeEventListener('click', handleExportSvg)
  }

  // Public API methods
  const render = withSyncErrorHandling((): void => {
    extractFilterOptions()
    container.innerHTML = createControlsHTML()
    cacheElements()
    attachEventListeners()

    // Set initial values from config
    if (config.eraIds) {
      config.eraIds.forEach(eraId => {
        const option = eraSelect.querySelector(`option[value="${eraId}"]`) as HTMLOptionElement
        if (option) option.selected = true
      })
    }

    if (config.eventTypes) {
      config.eventTypes.forEach(type => {
        const option = eventTypeSelect.querySelector(`option[value="${type}"]`) as HTMLOptionElement
        if (option) option.selected = true
      })
    }

    if (config.seriesIds) {
      config.seriesIds.forEach(seriesId => {
        const option = seriesSelect.querySelector(
          `option[value="${seriesId}"]`,
        ) as HTMLOptionElement
        if (option) option.selected = true
      })
    }

    if (config.watchStatus) {
      watchStatusSelect.value = config.watchStatus
    }

    eventEmitter.emit('render-complete', {config})
  }, 'Failed to render timeline controls')

  const updateData = withSyncErrorHandling((newEvents: TimelineEvent[]): void => {
    events = [...newEvents]
    render()
  }, 'Failed to update timeline controls data')

  const updateConfig = withSyncErrorHandling((newConfig: Partial<TimelineConfig>): void => {
    config = {...config, ...newConfig}
    render()
  }, 'Failed to update timeline controls configuration')

  const getConfig = (): TimelineConfig => ({...config})

  const getFilterOptions = () => ({...filterOptions})

  const destroy = withSyncErrorHandling((): void => {
    removeEventListeners()
    container.innerHTML = ''
    eventEmitter.removeAllListeners()
  }, 'Failed to destroy timeline controls')

  const importConfig = withSyncErrorHandling((importedConfig: Partial<TimelineConfig>): void => {
    updateConfig(importedConfig)
    eventEmitter.emit('config-import', {config: importedConfig})
  }, 'Failed to import timeline controls configuration')

  // Return public API
  return {
    render,
    updateData,
    updateConfig,
    getConfig,
    getFilterOptions,
    importConfig,
    destroy,

    // Generic EventEmitter methods for type-safe event handling
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    once: eventEmitter.once.bind(eventEmitter),
    emit: eventEmitter.emit.bind(eventEmitter),
    removeAllListeners: eventEmitter.removeAllListeners.bind(eventEmitter),
  }
}
