import type {
  EpisodeManagerInstance,
  ProgressTrackerEvents,
  ProgressTrackerInstance,
  SearchFilterEvents,
  SearchFilterInstance,
  TimelineRendererInstance,
} from './modules/types.js'
import {createEpisodeManager} from './modules/episodes.js'
import {
  initializeGlobalErrorHandling,
  withErrorHandling,
  withSyncErrorHandling,
} from './modules/error-handler.js'
import {createProgressTracker} from './modules/progress.js'
import {createSearchFilter} from './modules/search.js'
import {
  exportProgress,
  importProgressFromFile,
  loadProgress,
  saveProgress,
} from './modules/storage.js'
import {createTimelineRenderer} from './modules/timeline.js'
import './style.css'

// Factory function to create DOM elements manager
export const createElementsManager = () => {
  let elements: {
    container: HTMLElement | null
    searchInput: HTMLInputElement | null
    filterSelect: HTMLSelectElement | null
    expandAllBtn: HTMLButtonElement | null
    collapseAllBtn: HTMLButtonElement | null
    resetProgressBtn: HTMLButtonElement | null
    exportProgressBtn: HTMLButtonElement | null
    importButton: HTMLButtonElement | null
    importProgressInput: HTMLInputElement | null
    episodeSearchControls: HTMLElement | null
    episodeSearchInput: HTMLInputElement | null
    seriesFilter: HTMLSelectElement | null
    seasonFilter: HTMLSelectElement | null
    guestStarFilter: HTMLInputElement | null
    clearEpisodeSearchBtn: HTMLButtonElement | null
    resetEpisodeFiltersBtn: HTMLButtonElement | null
    episodeFilterStatus: HTMLElement | null
  } = {
    container: null,
    searchInput: null,
    filterSelect: null,
    expandAllBtn: null,
    collapseAllBtn: null,
    resetProgressBtn: null,
    exportProgressBtn: null,
    importButton: null,
    importProgressInput: null,
    episodeSearchControls: null,
    episodeSearchInput: null,
    seriesFilter: null,
    seasonFilter: null,
    guestStarFilter: null,
    clearEpisodeSearchBtn: null,
    resetEpisodeFiltersBtn: null,
    episodeFilterStatus: null,
  }

  return {
    initialize: () => {
      elements = {
        container: document.querySelector('#timelineContainer'),
        searchInput: document.querySelector('#searchInput'),
        filterSelect: document.querySelector('#filterSelect'),
        expandAllBtn: document.querySelector('#expandAll'),
        collapseAllBtn: document.querySelector('#collapseAll'),
        resetProgressBtn: document.querySelector('#resetProgress'),
        exportProgressBtn: document.querySelector('#exportProgress'),
        importProgressInput: document.querySelector('#importProgress'),
        importButton: document.querySelector('#importButton'),
        episodeSearchControls: document.querySelector('#episodeSearchControls'),
        episodeSearchInput: document.querySelector('#episodeSearchInput'),
        seriesFilter: document.querySelector('#seriesFilter'),
        seasonFilter: document.querySelector('#seasonFilter'),
        guestStarFilter: document.querySelector('#guestStarFilter'),
        clearEpisodeSearchBtn: document.querySelector('#clearEpisodeSearch'),
        resetEpisodeFiltersBtn: document.querySelector('#resetEpisodeFilters'),
        episodeFilterStatus: document.querySelector('#episodeFilterStatus'),
      }

      if (!elements.container) {
        throw new Error('Timeline container not found')
      }
    },
    get: () => elements,
    getContainer: () => elements.container,
  }
}

// Factory function to create event handlers
export const createEventHandlers = (
  progressTracker: ProgressTrackerInstance,
  searchFilter: SearchFilterInstance,
  episodeManager: EpisodeManagerInstance,
  timelineRenderer: TimelineRendererInstance | null,
  elementsManager: ReturnType<typeof createElementsManager>,
) => {
  const handleResetProgress = withSyncErrorHandling((): void => {
    // eslint-disable-next-line no-alert
    if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
      progressTracker.resetProgress()
      saveProgress([])
      timelineRenderer?.updateItemStates()
    }
  }, 'Reset Progress')

  const handleImportProgress = withErrorHandling(async (event: Event): Promise<void> => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    const progress = await importProgressFromFile(file)
    progressTracker.setWatchedItems(progress)
    saveProgress(progress)
    timelineRenderer?.updateItemStates()
    // eslint-disable-next-line no-alert
    alert('Progress imported successfully!')

    // Reset file input
    target.value = ''
  }, 'Import Progress')

  const updateEpisodeFilterStatus = (customMessage?: string): void => {
    const statusElement = elementsManager.get().episodeFilterStatus
    if (!statusElement) return

    if (customMessage) {
      statusElement.textContent = customMessage
      return
    }

    const criteria = episodeManager.getCurrentCriteria()
    const filteredEpisodes = episodeManager.getFilteredEpisodes()

    const activeFilters: string[] = []
    if (criteria.searchTerm) activeFilters.push(`search: "${criteria.searchTerm}"`)
    if (criteria.seriesId) activeFilters.push(`series: ${criteria.seriesId.toUpperCase()}`)
    if (criteria.season) activeFilters.push(`season: ${criteria.season}`)
    if (criteria.guestStars && criteria.guestStars.length > 0) {
      activeFilters.push(`guest: ${criteria.guestStars.join(', ')}`)
    }

    if (activeFilters.length === 0) {
      statusElement.textContent = 'All episodes visible'
    } else {
      statusElement.textContent = `${filteredEpisodes.length} episodes found • Filters: ${activeFilters.join(' • ')}`
    }
  }

  const toggleEpisodeSearchControls = (show: boolean): void => {
    const controls = elementsManager.get().episodeSearchControls
    if (controls) {
      controls.style.display = show ? 'flex' : 'none'
    }
  }

  const setupEventListeners = (): void => {
    const elements = elementsManager.get()

    // Search and filter
    elements.searchInput?.addEventListener('input', e => {
      const target = e.target as HTMLInputElement
      searchFilter.setSearch(target.value)
    })

    elements.filterSelect?.addEventListener('change', e => {
      const target = e.target as HTMLSelectElement
      searchFilter.setFilter(target.value)
    })

    // Episode search and filtering
    elements.episodeSearchInput?.addEventListener('input', e => {
      const target = e.target as HTMLInputElement
      episodeManager.searchEpisodes(target.value)
      updateEpisodeFilterStatus()
    })

    elements.seriesFilter?.addEventListener('change', e => {
      const target = e.target as HTMLSelectElement
      const currentCriteria = episodeManager.getCurrentCriteria()
      const newCriteria = {...currentCriteria}
      if (target.value) {
        newCriteria.seriesId = target.value
      } else {
        delete newCriteria.seriesId
      }
      episodeManager.setFilterCriteria(newCriteria)
      updateEpisodeFilterStatus()
    })

    elements.seasonFilter?.addEventListener('change', e => {
      const target = e.target as HTMLSelectElement
      const currentCriteria = episodeManager.getCurrentCriteria()
      const newCriteria = {...currentCriteria}
      if (target.value) {
        newCriteria.season = Number.parseInt(target.value, 10)
      } else {
        delete newCriteria.season
      }
      episodeManager.setFilterCriteria(newCriteria)
      updateEpisodeFilterStatus()
    })

    elements.guestStarFilter?.addEventListener('input', e => {
      const target = e.target as HTMLInputElement
      const currentCriteria = episodeManager.getCurrentCriteria()
      const newCriteria = {...currentCriteria}
      if (target.value) {
        newCriteria.guestStars = [target.value]
      } else {
        delete newCriteria.guestStars
      }
      episodeManager.setFilterCriteria(newCriteria)
      updateEpisodeFilterStatus()
    })

    elements.clearEpisodeSearchBtn?.addEventListener('click', () => {
      if (elements.episodeSearchInput) {
        elements.episodeSearchInput.value = ''
        episodeManager.searchEpisodes('')
        updateEpisodeFilterStatus()
      }
    })

    elements.resetEpisodeFiltersBtn?.addEventListener('click', () => {
      // Reset all episode filter controls
      if (elements.episodeSearchInput) elements.episodeSearchInput.value = ''
      if (elements.seriesFilter) elements.seriesFilter.value = ''
      if (elements.seasonFilter) elements.seasonFilter.value = ''
      if (elements.guestStarFilter) elements.guestStarFilter.value = ''

      // Reset episode manager filters
      episodeManager.resetFilters()
      updateEpisodeFilterStatus()
    })

    // Control buttons
    elements.expandAllBtn?.addEventListener('click', () => {
      timelineRenderer?.expandAll()
    })

    elements.collapseAllBtn?.addEventListener('click', () => {
      timelineRenderer?.collapseAll()
    })

    elements.resetProgressBtn?.addEventListener('click', () => {
      handleResetProgress()
    })

    elements.exportProgressBtn?.addEventListener('click', () => {
      exportProgress(progressTracker.getWatchedItems())
    })

    elements.importButton?.addEventListener('click', () => {
      elements.importProgressInput?.click()
    })

    elements.importProgressInput?.addEventListener('change', e => {
      handleImportProgress(e).catch(console.error)
    })

    // Progress tracker callbacks with improved type safety
    progressTracker.on('item-toggle', (_data: ProgressTrackerEvents['item-toggle']) => {
      saveProgress(progressTracker.getWatchedItems())
      timelineRenderer?.updateItemStates()
    })

    progressTracker.on(
      'progress-update',
      (progressData: ProgressTrackerEvents['progress-update']) => {
        timelineRenderer?.updateProgress(progressData)
      },
    )

    // Search filter callbacks with improved type safety
    searchFilter.on('filter-change', (data: SearchFilterEvents['filter-change']) => {
      timelineRenderer?.render(data.filteredData)
      timelineRenderer?.updateItemStates()

      // Show/hide episode search controls based on whether any series items are visible
      const hasSeriesItems = data.filteredData.some(era =>
        era.items.some(
          item => item.type === 'series' && item.episodeData && item.episodeData.length > 0,
        ),
      )
      toggleEpisodeSearchControls(hasSeriesItems)
    })

    // Episode manager event callbacks
    episodeManager.on('filter-change', () => {
      updateEpisodeFilterStatus()
      // Note: Episode filtering is handled within individual episode lists
      // This event is for updating the status display
    })

    episodeManager.on('search-update', ({searchTerm, totalMatches}) => {
      updateEpisodeFilterStatus(`Found ${totalMatches} episodes matching "${searchTerm}"`)
    })
  }

  return {
    setupEventListeners,
    handleResetProgress,
    handleImportProgress,
    updateEpisodeFilterStatus,
    toggleEpisodeSearchControls,
  }
}

// Factory function to create the main application
export const createStarTrekViewingGuide = () => {
  // Create module instances
  const progressTracker = createProgressTracker()
  const searchFilter = createSearchFilter()
  const episodeManager = createEpisodeManager()
  let timelineRenderer: TimelineRendererInstance | null = null

  // Create managers
  const elementsManager = createElementsManager()

  const loadInitialData = (): void => {
    const savedProgress = loadProgress()
    progressTracker.setWatchedItems(savedProgress)
  }

  const render = (): void => {
    const elements = elementsManager.get()
    if (!elements.container) return

    // Initialize timeline renderer (takes container and progressTracker only)
    timelineRenderer = createTimelineRenderer(elements.container, progressTracker)

    // Initial render with search filter
    const filteredData = searchFilter.getFilteredData()
    timelineRenderer.render(filteredData)
    timelineRenderer.updateItemStates()
  }

  const setupApp = (): void => {
    try {
      // Initialize DOM elements manager first
      elementsManager.initialize()

      loadInitialData()
      render()

      // Create event handlers after timeline renderer is initialized
      const eventHandlers = createEventHandlers(
        progressTracker,
        searchFilter,
        episodeManager,
        timelineRenderer,
        elementsManager,
      )

      eventHandlers.setupEventListeners()

      // Initialize global error handling
      initializeGlobalErrorHandling()
    } catch (error) {
      console.error('Failed to setup Star Trek Viewing Guide:', error)

      // Fallback error display for critical initialization failures
      const container = document.querySelector('#app')
      if (container) {
        container.innerHTML =
          '<div class="error">Failed to load application. Please refresh the page.</div>'
      }
    }
  }

  const init = (): void => {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => setupApp())
    } else {
      setupApp()
    }
  }

  return {
    init,
    progressTracker,
    searchFilter,
    timelineRenderer: () => timelineRenderer,
    elementsManager,
  }
}

// Initialize the application
const app = createStarTrekViewingGuide()
app.init()
