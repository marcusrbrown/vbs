import type {OverallProgress, StarTrekEra} from './modules/types.js'
import {ProgressTracker} from './modules/progress.js'
import {SearchFilter} from './modules/search.js'
import {
  exportProgress,
  importProgressFromFile,
  loadProgress,
  saveProgress,
} from './modules/storage.js'
import {TimelineRenderer} from './modules/timeline.js'
import './style.css'

class StarTrekViewingGuide {
  private progressTracker: ProgressTracker
  private searchFilter: SearchFilter
  private timelineRenderer: TimelineRenderer | null
  private elements: {
    container: HTMLElement | null
    searchInput: HTMLInputElement | null
    filterSelect: HTMLSelectElement | null
    expandAllBtn: HTMLButtonElement | null
    collapseAllBtn: HTMLButtonElement | null
    resetProgressBtn: HTMLButtonElement | null
    exportProgressBtn: HTMLButtonElement | null
    importButton: HTMLButtonElement | null
    importProgressInput: HTMLInputElement | null
  }

  constructor() {
    this.progressTracker = new ProgressTracker()
    this.searchFilter = new SearchFilter()
    this.timelineRenderer = null
    this.elements = {
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

    this.init()
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupApp())
    } else {
      this.setupApp()
    }
  }

  setupApp() {
    this.initializeElements()
    this.setupEventListeners()
    this.loadInitialData()
    this.render()
  }

  initializeElements(): void {
    this.elements = {
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

    if (!this.elements.container) {
      throw new Error('Timeline container not found')
    }

    this.timelineRenderer = new TimelineRenderer(this.elements.container, this.progressTracker)
  }

  setupEventListeners(): void {
    // Search and filter
    this.elements.searchInput?.addEventListener('input', e => {
      const target = e.target as HTMLInputElement
      this.searchFilter.setSearch(target.value)
    })

    this.elements.filterSelect?.addEventListener('change', e => {
      const target = e.target as HTMLSelectElement
      this.searchFilter.setFilter(target.value)
    })

    // Control buttons
    this.elements.expandAllBtn?.addEventListener('click', () => {
      this.timelineRenderer?.expandAll()
    })

    this.elements.collapseAllBtn?.addEventListener('click', () => {
      this.timelineRenderer?.collapseAll()
    })

    this.elements.resetProgressBtn?.addEventListener('click', () => {
      this.handleResetProgress()
    })

    this.elements.exportProgressBtn?.addEventListener('click', () => {
      exportProgress(this.progressTracker.getWatchedItems())
    })

    this.elements.importButton?.addEventListener('click', () => {
      this.elements.importProgressInput?.click()
    })

    this.elements.importProgressInput?.addEventListener('change', e => {
      this.handleImportProgress(e).catch(console.error)
    })

    // Progress tracker callbacks
    this.progressTracker.onItemToggle((_itemId, _isWatched) => {
      saveProgress(this.progressTracker.getWatchedItems())
      this.timelineRenderer?.updateItemStates()
    })

    this.progressTracker.onProgressUpdate((progressData: OverallProgress) => {
      this.timelineRenderer?.updateProgress(progressData)
    })

    // Search filter callbacks
    this.searchFilter.onFilterChange((filteredData: StarTrekEra[]) => {
      this.timelineRenderer?.render(filteredData)
      this.timelineRenderer?.updateItemStates()
    })
  }

  loadInitialData(): void {
    const savedProgress = loadProgress()
    this.progressTracker.setWatchedItems(savedProgress)
  }

  render(): void {
    const filteredData = this.searchFilter.getFilteredData()
    this.timelineRenderer?.render(filteredData)
    this.timelineRenderer?.updateItemStates()
  }

  handleResetProgress(): void {
    // eslint-disable-next-line no-alert
    if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
      this.progressTracker.resetProgress()
      saveProgress([])
      this.timelineRenderer?.updateItemStates()
    }
  }

  async handleImportProgress(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    try {
      const progress = await importProgressFromFile(file)
      this.progressTracker.setWatchedItems(progress)
      saveProgress(progress)
      this.timelineRenderer?.updateItemStates()
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
}

// Initialize the application
// eslint-disable-next-line no-new
new StarTrekViewingGuide()
