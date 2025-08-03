import type {
  OverallProgress,
  ProgressTrackerInstance,
  SearchFilterInstance,
  StarTrekEra,
  TimelineRendererInstance,
} from './modules/types.js'
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
const createElementsManager = () => {
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
const createEventHandlers = (
  progressTracker: ProgressTrackerInstance,
  searchFilter: SearchFilterInstance,
  timelineRenderer: TimelineRendererInstance | null,
  elementsManager: ReturnType<typeof createElementsManager>,
) => {
  const handleResetProgress = (): void => {
    // eslint-disable-next-line no-alert
    if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
      progressTracker.resetProgress()
      saveProgress([])
      timelineRenderer?.updateItemStates()
    }
  }

  const handleImportProgress = async (event: Event): Promise<void> => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    try {
      const progress = await importProgressFromFile(file)
      progressTracker.setWatchedItems(progress)
      saveProgress(progress)
      timelineRenderer?.updateItemStates()
      // eslint-disable-next-line no-alert
      alert('Progress imported successfully!')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred'
      // eslint-disable-next-line no-alert
      alert(message)
    }

    // Reset file input
    target.value = ''
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

    // Progress tracker callbacks
    progressTracker.on('item-toggle', () => {
      saveProgress(progressTracker.getWatchedItems())
      timelineRenderer?.updateItemStates()
    })

    progressTracker.on('progress-update', (progressData: OverallProgress) => {
      timelineRenderer?.updateProgress(progressData)
    })

    // Search filter callbacks
    searchFilter.on('filter-change', ({filteredData}: {filteredData: StarTrekEra[]}) => {
      timelineRenderer?.render(filteredData)
      timelineRenderer?.updateItemStates()
    })
  }

  return {
    setupEventListeners,
    handleResetProgress,
    handleImportProgress,
  }
}

// Factory function to create the main application
const createStarTrekViewingGuide = () => {
  // Create module instances
  const progressTracker = createProgressTracker()
  const searchFilter = createSearchFilter()
  let timelineRenderer: TimelineRendererInstance | null = null

  // Create managers
  const elementsManager = createElementsManager()

  const loadInitialData = (): void => {
    const savedProgress = loadProgress()
    progressTracker.setWatchedItems(savedProgress)
  }

  const render = (): void => {
    const filteredData = searchFilter.getFilteredData()
    timelineRenderer?.render(filteredData)
    timelineRenderer?.updateItemStates()
  }

  const setupApp = (): void => {
    elementsManager.initialize()

    const container = elementsManager.getContainer()
    if (container) {
      timelineRenderer = createTimelineRenderer(container, progressTracker)
    }

    const eventHandlers = createEventHandlers(
      progressTracker,
      searchFilter,
      timelineRenderer,
      elementsManager,
    )
    eventHandlers.setupEventListeners()

    loadInitialData()
    render()
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
