import type {UserPreferences} from '../src/modules/types.js'

import {beforeEach, describe, expect, it, vi} from 'vitest'
import {createPreferences, type PreferencesInstance} from '../src/modules/preferences.js'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

vi.stubGlobal('localStorage', localStorageMock)

describe('Preferences', () => {
  let preferences: PreferencesInstance

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)

    // Create fresh preferences instance
    preferences = createPreferences()
  })

  describe('Factory Function Creation', () => {
    it('should create preferences instance with factory function', () => {
      expect(preferences).toBeDefined()
      expect(typeof preferences.load).toBe('function')
      expect(typeof preferences.getPreferences).toBe('function')
      expect(typeof preferences.updatePreferences).toBe('function')
    })

    it('should provide EventEmitter methods', () => {
      expect(typeof preferences.on).toBe('function')
      expect(typeof preferences.off).toBe('function')
      expect(typeof preferences.once).toBe('function')
    })
  })

  describe('Default Preferences', () => {
    it('should initialize with default preferences', () => {
      preferences.load()
      const prefs = preferences.getPreferences()

      expect(prefs.theme).toBe('auto')
      expect(prefs.compactView).toBe(false)
      expect(prefs.accessibilityMode).toBe(false)
      expect(prefs.autoPlay).toBe(false)
      expect(prefs.showSpoilers).toBe(false)
      expect(prefs.language).toBe('en')
      expect(Array.isArray(prefs.preferredStreamingServices)).toBe(true)
    })

    it('should have proper nested object defaults', () => {
      preferences.load()
      const prefs = preferences.getPreferences()

      expect(prefs.notifications).toBeDefined()
      expect(prefs.notifications.enabled).toBe(true)
      expect(prefs.notifications.newEpisodes).toBe(true)
      expect(prefs.notifications.progressReminders).toBe(false)

      expect(prefs.timeline).toBeDefined()
      expect(prefs.timeline.showMajorEvents).toBe(true)
      expect(prefs.timeline.showMinorEvents).toBe(false)
      expect(prefs.timeline.defaultZoomLevel).toBe('decade')

      expect(prefs.privacy).toBeDefined()
      expect(prefs.privacy.analyticsEnabled).toBe(false)
      expect(prefs.privacy.crashReportsEnabled).toBe(true)
    })
  })

  describe('Loading and Saving', () => {
    it('should load preferences from localStorage', () => {
      const storedPrefs: UserPreferences = {
        theme: 'dark',
        compactView: true,
        accessibilityMode: false,
        autoPlay: true,
        showSpoilers: true,
        preferredStreamingServices: ['netflix', 'paramount-plus'],
        language: 'en',
        notifications: {
          enabled: false,
          newEpisodes: false,
          progressReminders: true,
        },
        timeline: {
          showMajorEvents: false,
          showMinorEvents: true,
          defaultZoomLevel: 'year',
        },
        privacy: {
          analyticsEnabled: true,
          crashReportsEnabled: false,
        },
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedPrefs))

      preferences.load()
      const loadedPrefs = preferences.getPreferences()

      expect(loadedPrefs.theme).toBe('dark')
      expect(loadedPrefs.compactView).toBe(true)
      expect(loadedPrefs.preferredStreamingServices).toEqual(['netflix', 'paramount-plus'])
      expect(loadedPrefs.notifications.enabled).toBe(false)
      expect(loadedPrefs.timeline.defaultZoomLevel).toBe('year')
    })

    it('should save preferences to localStorage when updated', () => {
      preferences.load()
      preferences.updatePreferences({theme: 'light', compactView: true})

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'starTrekUserPreferences',
        expect.stringContaining('"theme":"light"'),
      )
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'starTrekUserPreferences',
        expect.stringContaining('"compactView":true'),
      )
    })

    it('should handle corrupted localStorage data gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json')

      expect(() => preferences.load()).not.toThrow()
      const prefs = preferences.getPreferences()
      expect(prefs.theme).toBe('auto') // Should use defaults
    })
  })

  describe('Event Handling', () => {
    it('should emit preferences-load event when loaded', () => {
      const loadListener = vi.fn()
      preferences.on('preferences-load', loadListener)

      preferences.load()

      expect(loadListener).toHaveBeenCalledWith({
        preferences: expect.objectContaining({
          theme: 'auto',
          compactView: false,
        }),
      })
    })

    it('should emit preferences-change event when updated', () => {
      const changeListener = vi.fn()
      preferences.on('preferences-change', changeListener)

      preferences.load()
      preferences.updatePreferences({theme: 'dark', compactView: true})

      expect(changeListener).toHaveBeenCalledWith({
        previous: expect.objectContaining({theme: 'auto'}),
        current: expect.objectContaining({theme: 'dark'}),
        changes: {theme: 'dark', compactView: true},
      })
    })

    it('should emit theme-change event when theme is set', () => {
      const themeListener = vi.fn()
      preferences.on('theme-change', themeListener)

      preferences.load()
      preferences.setTheme('dark')

      expect(themeListener).toHaveBeenCalledWith({
        theme: 'dark',
        preferences: expect.objectContaining({theme: 'dark'}),
      })
    })

    it('should emit compact-view-change event when toggled', () => {
      const compactListener = vi.fn()
      preferences.on('compact-view-change', compactListener)

      preferences.load()
      preferences.toggleCompactView()

      expect(compactListener).toHaveBeenCalledWith({
        compactView: true,
        preferences: expect.objectContaining({compactView: true}),
      })
    })

    it('should emit accessibility-change event when toggled', () => {
      const accessibilityListener = vi.fn()
      preferences.on('accessibility-change', accessibilityListener)

      preferences.load()
      preferences.toggleAccessibilityMode()

      expect(accessibilityListener).toHaveBeenCalledWith({
        accessibilityMode: true,
        preferences: expect.objectContaining({accessibilityMode: true}),
      })
    })

    it('should support one-time listeners', () => {
      const onceListener = vi.fn()
      preferences.once('preferences-change', onceListener)

      preferences.load()
      preferences.updatePreferences({theme: 'dark'})
      preferences.updatePreferences({theme: 'light'})

      expect(onceListener).toHaveBeenCalledTimes(1)
    })
  })

  describe('Convenience Methods', () => {
    beforeEach(() => {
      preferences.load()
    })

    it('should set theme preference correctly', () => {
      preferences.setTheme('dark')
      expect(preferences.get('theme')).toBe('dark')

      preferences.setTheme('light')
      expect(preferences.get('theme')).toBe('light')

      preferences.setTheme('auto')
      expect(preferences.get('theme')).toBe('auto')
    })

    it('should toggle compact view correctly', () => {
      expect(preferences.get('compactView')).toBe(false)

      preferences.toggleCompactView()
      expect(preferences.get('compactView')).toBe(true)

      preferences.toggleCompactView()
      expect(preferences.get('compactView')).toBe(false)
    })

    it('should toggle accessibility mode correctly', () => {
      expect(preferences.get('accessibilityMode')).toBe(false)

      preferences.toggleAccessibilityMode()
      expect(preferences.get('accessibilityMode')).toBe(true)

      preferences.toggleAccessibilityMode()
      expect(preferences.get('accessibilityMode')).toBe(false)
    })

    it('should get specific preference values with type safety', () => {
      preferences.updatePreferences({
        theme: 'dark',
        language: 'es',
        preferredStreamingServices: ['netflix'],
      })

      expect(preferences.get('theme')).toBe('dark')
      expect(preferences.get('language')).toBe('es')
      expect(preferences.get('preferredStreamingServices')).toEqual(['netflix'])
    })
  })

  describe('Reset and Persistence', () => {
    it('should reset preferences to defaults', () => {
      const resetListener = vi.fn()
      preferences.on('preferences-reset', resetListener)

      preferences.load()
      preferences.updatePreferences({theme: 'dark', compactView: true})

      const resetPrefs = preferences.reset()

      expect(resetPrefs.theme).toBe('auto')
      expect(resetPrefs.compactView).toBe(false)
      expect(resetListener).toHaveBeenCalledWith({
        previous: expect.objectContaining({theme: 'dark'}),
        current: expect.objectContaining({theme: 'auto'}),
      })
    })

    it('should track loading state correctly', () => {
      expect(preferences.isLoaded()).toBe(false)

      preferences.load()
      expect(preferences.isLoaded()).toBe(true)
    })
  })

  describe('Export and Import', () => {
    it('should export preferences with metadata', () => {
      preferences.load()
      preferences.updatePreferences({theme: 'dark', compactView: true})

      const exported = preferences.export()

      expect(exported.version).toBe('1.0')
      expect(exported.timestamp).toBeDefined()
      expect(typeof exported.timestamp).toBe('string')
      expect(exported.preferences.theme).toBe('dark')
      expect(exported.preferences.compactView).toBe(true)
    })

    it('should import preferences successfully', () => {
      const importData = {
        preferences: {
          theme: 'light' as const,
          compactView: true,
          accessibilityMode: true,
          autoPlay: false,
          showSpoilers: true,
          preferredStreamingServices: ['paramount-plus'],
          language: 'es',
          notifications: {
            enabled: false,
            newEpisodes: true,
            progressReminders: false,
          },
          timeline: {
            showMajorEvents: true,
            showMinorEvents: true,
            defaultZoomLevel: 'century' as const,
          },
          privacy: {
            analyticsEnabled: true,
            crashReportsEnabled: false,
          },
        },
      }

      preferences.load()
      const imported = preferences.import(importData)

      expect(imported).toBeDefined()
      if (imported) {
        expect(imported.theme).toBe('light')
        expect(imported.compactView).toBe(true)
        expect(imported.accessibilityMode).toBe(true)
        expect(imported.language).toBe('es')
        expect(imported.timeline.defaultZoomLevel).toBe('century')
      }
    })

    it('should handle invalid import data', () => {
      preferences.load()

      expect(() => preferences.import({} as any)).toThrow('Invalid export data format')
      expect(() => preferences.import({preferences: null} as any)).toThrow(
        'Invalid export data format',
      )
    })
  })

  describe('Data Validation and Sanitization', () => {
    it('should sanitize missing nested objects', () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({
          theme: 'dark',
          compactView: true,
          accessibilityMode: false,
          autoPlay: false,
          showSpoilers: false,
          preferredStreamingServices: [],
          language: 'en',
          // Missing nested objects
        }),
      )

      preferences.load()
      const prefs = preferences.getPreferences()

      expect(prefs.notifications).toBeDefined()
      expect(prefs.timeline).toBeDefined()
      expect(prefs.privacy).toBeDefined()
    })

    it('should handle non-array streaming services', () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({
          theme: 'dark',
          compactView: true,
          accessibilityMode: false,
          autoPlay: false,
          showSpoilers: false,
          preferredStreamingServices: 'not-an-array', // Invalid data
          language: 'en',
          notifications: {enabled: true, newEpisodes: true, progressReminders: false},
          timeline: {showMajorEvents: true, showMinorEvents: false, defaultZoomLevel: 'decade'},
          privacy: {analyticsEnabled: false, crashReportsEnabled: true},
        }),
      )

      preferences.load()
      const prefs = preferences.getPreferences()

      expect(Array.isArray(prefs.preferredStreamingServices)).toBe(true)
      expect(prefs.preferredStreamingServices).toEqual([])
    })
  })
})
