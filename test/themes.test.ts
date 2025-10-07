import type {ThemeSystemInstance} from '../src/modules/types.js'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {createThemeSystem, THEMES} from '../src/modules/themes.js'

// Mock localStorage for preferences
const mockPreferences = {
  isLoaded: vi.fn(() => true),
  get: vi.fn((key: string) => (key === 'theme' ? 'auto' : undefined)),
  set: vi.fn(),
  setTheme: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  once: vi.fn(),
} as any

// Mock window.matchMedia for system theme detection
const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(),
}))

// Mock document.documentElement for DOM manipulation
const mockDocumentElement = {
  style: {
    setProperty: vi.fn(),
  },
  dataset: {} as Record<string, string>,
}

describe('ThemeSystem', () => {
  let themeSystem: ThemeSystemInstance

  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks()

    // Setup global mocks with comprehensive browser environment
    vi.stubGlobal('window', {
      matchMedia: mockMatchMedia,
      location: {
        href: 'http://localhost:3000/test',
        hostname: 'localhost',
        port: '3000',
        protocol: 'http:',
      },
    })

    vi.stubGlobal('document', {
      documentElement: mockDocumentElement,
    })

    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Test Environment)',
    })

    // Reset mock dataset
    mockDocumentElement.dataset = {} as Record<string, string>

    // Create fresh theme system instance
    themeSystem = createThemeSystem(mockPreferences)
  })

  describe('Factory Creation', () => {
    it('should create theme system instance with correct API', () => {
      expect(themeSystem).toHaveProperty('setTheme')
      expect(themeSystem).toHaveProperty('getCurrentTheme')
      expect(themeSystem).toHaveProperty('getResolvedTheme')
      expect(themeSystem).toHaveProperty('toggleTheme')
      expect(themeSystem).toHaveProperty('getThemeInfo')
      expect(themeSystem).toHaveProperty('initialize')
      expect(themeSystem).toHaveProperty('cleanup')
      expect(themeSystem).toHaveProperty('on')
      expect(themeSystem).toHaveProperty('off')
      expect(themeSystem).toHaveProperty('once')
    })

    it('should initialize with auto theme by default', () => {
      expect(themeSystem.getCurrentTheme()).toBe(THEMES.AUTO)
    })

    it('should provide theme information', () => {
      const info = themeSystem.getThemeInfo()
      expect(info).toHaveProperty('currentTheme')
      expect(info).toHaveProperty('resolvedTheme')
      expect(info).toHaveProperty('availableThemes')
      expect(info.availableThemes).toEqual(['light', 'dark', 'auto'])
    })
  })

  describe('Theme Setting and Getting', () => {
    it('should set and get theme correctly', () => {
      themeSystem.setTheme(THEMES.LIGHT)
      expect(themeSystem.getCurrentTheme()).toBe(THEMES.LIGHT)

      themeSystem.setTheme(THEMES.DARK)
      expect(themeSystem.getCurrentTheme()).toBe(THEMES.DARK)
    })

    it('should emit theme-change event when theme is set', () => {
      const mockListener = vi.fn()
      themeSystem.on('theme-change', mockListener)

      themeSystem.setTheme(THEMES.LIGHT)

      expect(mockListener).toHaveBeenCalledWith({
        previousTheme: THEMES.AUTO,
        currentTheme: THEMES.LIGHT,
        resolvedTheme: THEMES.LIGHT,
      })
    })

    it('should update preferences when theme is set', () => {
      themeSystem.setTheme(THEMES.DARK)
      expect(mockPreferences.setTheme).toHaveBeenCalledWith(THEMES.DARK)
    })

    it('should resolve auto theme based on system preference', () => {
      // Test with system preferring light
      mockMatchMedia.mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        addListener: vi.fn(),
      })
      themeSystem.initialize()
      themeSystem.setTheme(THEMES.AUTO)
      expect(themeSystem.getResolvedTheme()).toBe(THEMES.LIGHT)

      // Test with system preferring dark
      mockMatchMedia.mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        addListener: vi.fn(),
      })
      const darkThemeSystem = createThemeSystem(mockPreferences)
      darkThemeSystem.initialize()
      darkThemeSystem.setTheme(THEMES.AUTO)
      expect(darkThemeSystem.getResolvedTheme()).toBe(THEMES.DARK)
    })
  })

  describe('Theme Toggling', () => {
    it('should toggle between light and dark themes', () => {
      themeSystem.setTheme(THEMES.LIGHT)
      themeSystem.toggleTheme()
      expect(themeSystem.getCurrentTheme()).toBe(THEMES.DARK)

      themeSystem.toggleTheme()
      expect(themeSystem.getCurrentTheme()).toBe(THEMES.LIGHT)
    })

    it('should emit theme-change event when toggling', () => {
      const mockListener = vi.fn()
      themeSystem.on('theme-change', mockListener)

      themeSystem.setTheme(THEMES.LIGHT)
      mockListener.mockClear() // Clear the set call

      themeSystem.toggleTheme()

      expect(mockListener).toHaveBeenCalledWith({
        previousTheme: THEMES.LIGHT,
        currentTheme: THEMES.DARK,
        resolvedTheme: THEMES.DARK,
      })
    })
  })

  describe('CSS Property Application', () => {
    it('should apply CSS custom properties when theme is set', () => {
      themeSystem.initialize()
      themeSystem.setTheme(THEMES.LIGHT)

      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith(
        expect.stringMatching(/^--vbs-/),
        expect.any(String),
      )
    })

    it('should set theme data attributes on document element', () => {
      themeSystem.initialize()
      themeSystem.setTheme(THEMES.LIGHT)

      expect(mockDocumentElement.dataset.theme).toBe(THEMES.LIGHT)
      expect(mockDocumentElement.dataset.vbsTheme).toBe(THEMES.LIGHT)
    })

    it('should emit theme-applied event with properties', () => {
      const mockListener = vi.fn()
      themeSystem.on('theme-applied', mockListener)

      themeSystem.initialize()
      themeSystem.setTheme(THEMES.DARK)

      expect(mockListener).toHaveBeenCalledWith({
        theme: THEMES.DARK,
        originalTheme: THEMES.DARK,
        properties: expect.any(Array),
        timestamp: expect.any(String),
      })
    })
  })

  describe('System Theme Detection', () => {
    it('should detect system theme preference on initialization', () => {
      mockMatchMedia.mockReturnValue({
        matches: true, // System prefers dark
        addEventListener: vi.fn(),
        addListener: vi.fn(),
      })

      themeSystem.initialize()

      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)')
    })

    it('should set up event listener for system theme changes', () => {
      const mockAddEventListener = vi.fn()
      mockMatchMedia.mockReturnValue({
        matches: false,
        addEventListener: mockAddEventListener,
        addListener: vi.fn(),
      })

      themeSystem.initialize()

      expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    })

    it('should emit system-theme-change event when system preference changes', () => {
      let systemChangeHandler: (e: MediaQueryListEvent) => void = () => {}

      const mockAddEventListener = vi.fn((_event, handler) => {
        systemChangeHandler = handler
      })

      mockMatchMedia.mockReturnValue({
        matches: false,
        addEventListener: mockAddEventListener,
        addListener: vi.fn(),
      })

      const mockListener = vi.fn()
      themeSystem.on('system-theme-change', mockListener)
      themeSystem.initialize()
      themeSystem.setTheme(THEMES.AUTO)

      // Simulate system theme change
      systemChangeHandler({matches: true} as MediaQueryListEvent)

      expect(mockListener).toHaveBeenCalledWith({
        systemPrefersDark: true,
        currentTheme: THEMES.DARK, // Should resolve to dark when system prefers dark
      })
    })
  })

  describe('Initialization and Cleanup', () => {
    it('should initialize only once', () => {
      const result1 = themeSystem.initialize()
      const result2 = themeSystem.initialize()

      expect(result1).toBeTypeOf('string') // First initialization returns resolved theme
      expect(result2).toBeTypeOf('string') // Second initialization returns current resolved theme (already initialized)
      expect(themeSystem.isInitialized()).toBe(true)
    })

    it('should load theme from preferences on initialization', () => {
      mockPreferences.get.mockImplementation((key: string) =>
        key === 'theme' ? THEMES.DARK : undefined,
      )
      themeSystem.initialize()

      expect(themeSystem.getCurrentTheme()).toBe(THEMES.DARK)
    })

    it('should clean up event listeners on cleanup', () => {
      const mockRemoveEventListener = vi.fn()
      mockMatchMedia.mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: mockRemoveEventListener,
        addListener: vi.fn(),
        removeListener: vi.fn(),
      })

      themeSystem.initialize()
      themeSystem.cleanup()

      expect(mockRemoveEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    })
  })

  describe('Event Handling', () => {
    it('should handle one-time event listeners', () => {
      const mockListener = vi.fn()
      themeSystem.once('theme-change', mockListener)

      themeSystem.setTheme(THEMES.LIGHT)
      themeSystem.setTheme(THEMES.DARK)

      expect(mockListener).toHaveBeenCalledTimes(1)
    })

    it('should remove event listeners correctly', () => {
      const mockListener = vi.fn()
      themeSystem.on('theme-change', mockListener)
      themeSystem.off('theme-change', mockListener)

      themeSystem.setTheme(THEMES.LIGHT)

      expect(mockListener).not.toHaveBeenCalled()
    })

    it('should handle preferences change events', () => {
      mockPreferences.on.mockImplementation((event: any, listener: any) => {
        if (event === 'theme-change') {
          // Simulate preferences theme change
          listener({theme: THEMES.DARK})
        }
      })

      themeSystem.initialize()

      expect(themeSystem.getCurrentTheme()).toBe(THEMES.DARK)
    })
  })

  describe('Error Handling', () => {
    it('should handle missing window.matchMedia gracefully', () => {
      vi.stubGlobal('window', {
        location: {
          href: 'http://localhost:3000/test',
          hostname: 'localhost',
          port: '3000',
          protocol: 'http:',
        },
      })

      expect(() => {
        const systemWithoutMatchMedia = createThemeSystem(mockPreferences)
        systemWithoutMatchMedia.initialize()
      }).not.toThrow()
    })

    it('should handle DOM manipulation errors gracefully', () => {
      mockDocumentElement.style.setProperty.mockImplementation(() => {
        throw new Error('DOM error')
      })

      expect(() => {
        themeSystem.initialize()
        themeSystem.setTheme(THEMES.LIGHT)
      }).not.toThrow()
    })

    it('should handle preferences errors gracefully', () => {
      mockPreferences.setTheme.mockImplementation(() => {
        throw new Error('Preferences error')
      })

      expect(() => {
        themeSystem.setTheme(THEMES.DARK)
      }).not.toThrow()
    })
  })

  describe('Theme Values', () => {
    it('should provide theme values for light theme', () => {
      const values = themeSystem.getThemeValues(THEMES.LIGHT)
      expect(values).toBeTypeOf('object')
      expect(values).toHaveProperty('--vbs-bg-primary')
      expect(values).toHaveProperty('--vbs-text-primary')
    })

    it('should provide theme values for dark theme', () => {
      const values = themeSystem.getThemeValues(THEMES.DARK)
      expect(values).toBeTypeOf('object')
      expect(values).toHaveProperty('--vbs-bg-primary')
      expect(values).toHaveProperty('--vbs-text-primary')
    })

    it('should have different values for light and dark themes', () => {
      const lightValues = themeSystem.getThemeValues(THEMES.LIGHT)
      const darkValues = themeSystem.getThemeValues(THEMES.DARK)

      expect(lightValues['--vbs-bg-primary']).not.toBe(darkValues['--vbs-bg-primary'])
      expect(lightValues['--vbs-text-primary']).not.toBe(darkValues['--vbs-text-primary'])
    })
  })

  describe('Integration with VBS Architecture', () => {
    it('should follow functional factory pattern', () => {
      expect(typeof createThemeSystem).toBe('function')
      expect(typeof themeSystem).toBe('object')
      expect(themeSystem.constructor).toBe(Object)
    })

    it('should integrate with preferences system', () => {
      // Verify preferences integration calls
      themeSystem.initialize()
      expect(mockPreferences.on).toHaveBeenCalledWith('theme-change', expect.any(Function))
    })

    it('should provide EventEmitter-compatible interface', () => {
      expect(typeof themeSystem.on).toBe('function')
      expect(typeof themeSystem.off).toBe('function')
      expect(typeof themeSystem.once).toBe('function')
    })
  })
})
