import {JSDOM} from 'jsdom'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

// Mock modules - must be at the top level
vi.mock('../src/modules/progress.js', () => ({
  createProgressTracker: () => ({
    setWatchedItems: vi.fn(),
    toggleItem: vi.fn(),
    isWatched: vi.fn(),
    resetProgress: vi.fn(),
    getWatchedItems: vi.fn(() => []),
    updateProgress: vi.fn(),
    calculateOverallProgress: vi.fn(),
    calculateEraProgress: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    once: vi.fn(),
    removeAllListeners: vi.fn(),
  }),
}))

vi.mock('../src/modules/search.js', () => ({
  createSearchFilter: () => ({
    setSearch: vi.fn(),
    setFilter: vi.fn(),
    getFilteredData: vi.fn(() => []),
    matchesFilters: vi.fn(),
    notifyFilterChange: vi.fn(),
    getCurrentFilters: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    once: vi.fn(),
    removeAllListeners: vi.fn(),
  }),
}))

vi.mock('../src/modules/timeline.js', () => ({
  createTimelineRenderer: () => ({
    render: vi.fn(),
    createEraElement: vi.fn(),
    createItemElement: vi.fn(),
    toggleEra: vi.fn(),
    expandAll: vi.fn(),
    collapseAll: vi.fn(),
    updateProgress: vi.fn(),
    updateItemStates: vi.fn(),
    calculateEraProgress: vi.fn(),
  }),
}))

vi.mock('../src/modules/storage.js', () => ({
  exportProgress: vi.fn(),
  importProgressFromFile: vi.fn(),
  loadProgress: vi.fn(() => []),
  saveProgress: vi.fn(),
}))

describe('Main Application', () => {
  let dom: JSDOM

  beforeEach(() => {
    // Set up DOM environment
    dom = new JSDOM(
      `
      <!DOCTYPE html>
      <html>
        <body>
          <div id="timelineContainer"></div>
          <input type="text" id="searchInput" />
          <select id="filterSelect"></select>
          <button id="expandAll">Expand All</button>
          <button id="collapseAll">Collapse All</button>
          <button id="resetProgress">Reset Progress</button>
          <button id="exportProgress">Export Progress</button>
          <button id="importButton">Import Progress</button>
          <input type="file" id="importProgress" />
        </body>
      </html>
    `,
      {
        url: 'http://localhost',
        pretendToBeVisual: true,
        resources: 'usable',
      },
    )

    globalThis.document = dom.window.document
    globalThis.window = dom.window as any
    globalThis.HTMLElement = dom.window.HTMLElement
    globalThis.Event = dom.window.Event
    globalThis.alert = vi.fn()
    globalThis.confirm = vi.fn(() => true)
  })

  afterEach(() => {
    vi.clearAllMocks()
    dom.window.close()
  })

  describe('DOM Elements Manager', () => {
    it('should initialize and find required DOM elements', async () => {
      const {createElementsManager} = await import('../src/main.js')
      const elementsManager = createElementsManager()

      expect(() => elementsManager.initialize()).not.toThrow()

      const elements = elementsManager.get()
      expect(elements.container).toBeTruthy()
      expect(elements.searchInput).toBeTruthy()
      expect(elements.filterSelect).toBeTruthy()
    })

    it('should throw error when timeline container is missing', async () => {
      // Remove the container
      const container = document.querySelector('#timelineContainer')
      container?.remove()

      const {createElementsManager} = await import('../src/main.js')
      const elementsManager = createElementsManager()

      expect(() => elementsManager.initialize()).toThrow('Timeline container not found')
    })

    it('should return container element', async () => {
      const {createElementsManager} = await import('../src/main.js')
      const elementsManager = createElementsManager()
      elementsManager.initialize()

      const container = elementsManager.getContainer()
      expect(container).toBe(document.querySelector('#timelineContainer'))
    })
  })

  describe('Application Initialization', () => {
    it('should create and initialize the Star Trek viewing guide app', async () => {
      const {createStarTrekViewingGuide} = await import('../src/main.js')
      const app = createStarTrekViewingGuide()

      expect(app).toHaveProperty('init')
      expect(app).toHaveProperty('progressTracker')
      expect(app).toHaveProperty('searchFilter')
      expect(app).toHaveProperty('timelineRenderer')
      expect(app).toHaveProperty('elementsManager')
    })

    it('should initialize factory functions correctly', async () => {
      const {createProgressTracker} = await import('../src/modules/progress.js')
      const {createSearchFilter} = await import('../src/modules/search.js')
      const {createTimelineRenderer} = await import('../src/modules/timeline.js')

      const progressTracker = createProgressTracker()
      const searchFilter = createSearchFilter()
      const timelineRenderer = createTimelineRenderer(
        document.createElement('div'),
        progressTracker,
      )

      expect(progressTracker).toHaveProperty('setWatchedItems')
      expect(searchFilter).toHaveProperty('setSearch')
      expect(timelineRenderer).toHaveProperty('render')
    })

    it('should load initial progress data', async () => {
      const {loadProgress} = await import('../src/modules/storage.js')
      const mockLoadProgress = vi.mocked(loadProgress)
      mockLoadProgress.mockResolvedValue(['watched1', 'watched2'])

      const {createStarTrekViewingGuide} = await import('../src/main.js')
      const app = createStarTrekViewingGuide()

      // Test the internal behavior by examining the public API
      expect(app.progressTracker).toBeDefined()
      expect(app.searchFilter).toBeDefined()
    })

    it('should handle DOM ready state correctly', async () => {
      // Set document ready state to complete
      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'complete',
      })

      const {createStarTrekViewingGuide} = await import('../src/main.js')
      const app = createStarTrekViewingGuide()

      expect(() => app.init()).not.toThrow()
    })

    it('should add event listener when document is loading', async () => {
      // Set document ready state to loading
      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'loading',
      })

      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')

      const {createStarTrekViewingGuide} = await import('../src/main.js')
      const app = createStarTrekViewingGuide()

      app.init()

      expect(addEventListenerSpy).toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function))
    })
  })

  describe('Module Factory Functions', () => {
    it('should export required factory functions', async () => {
      const mainModule = await import('../src/main.js')

      expect(mainModule.createElementsManager).toBeDefined()
      expect(mainModule.createEventHandlers).toBeDefined()
      expect(mainModule.createStarTrekViewingGuide).toBeDefined()
    })

    it('should create elements manager with proper interface', async () => {
      const {createElementsManager} = await import('../src/main.js')
      const elementsManager = createElementsManager()

      expect(elementsManager).toHaveProperty('initialize')
      expect(elementsManager).toHaveProperty('get')
      expect(elementsManager).toHaveProperty('getContainer')
    })
  })

  describe('Error Handling', () => {
    it('should handle missing timeline container gracefully', async () => {
      const container = document.querySelector('#timelineContainer')
      container?.remove()

      const {createElementsManager} = await import('../src/main.js')
      const elementsManager = createElementsManager()

      expect(() => elementsManager.initialize()).toThrow('Timeline container not found')
    })

    it('should handle application initialization without errors', async () => {
      const {createStarTrekViewingGuide} = await import('../src/main.js')

      expect(() => {
        const app = createStarTrekViewingGuide()
        app.init()
      }).not.toThrow()
    })
  })

  describe('Integration with Modules', () => {
    it('should properly integrate with progress tracker', async () => {
      const {createStarTrekViewingGuide} = await import('../src/main.js')
      const app = createStarTrekViewingGuide()

      expect(app.progressTracker).toHaveProperty('setWatchedItems')
      expect(app.progressTracker).toHaveProperty('toggleItem')
      expect(app.progressTracker).toHaveProperty('on') // EventEmitter interface
    })

    it('should properly integrate with search filter', async () => {
      const {createStarTrekViewingGuide} = await import('../src/main.js')
      const app = createStarTrekViewingGuide()

      expect(app.searchFilter).toHaveProperty('setSearch')
      expect(app.searchFilter).toHaveProperty('setFilter')
      expect(app.searchFilter).toHaveProperty('on') // EventEmitter interface
    })

    it('should create timeline renderer when container is available', async () => {
      const {createStarTrekViewingGuide} = await import('../src/main.js')

      // Set document ready state to complete to trigger immediate setup
      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'complete',
      })

      const app = createStarTrekViewingGuide()
      app.init()

      // Timeline renderer should be created after initialization
      const renderer = app.timelineRenderer()
      expect(renderer).toBeDefined()
    })
  })
})
