import type {PreferencesEvents, UserPreferences} from './types.js'
import {withSyncErrorHandling} from './error-handler.js'
import {createEventEmitter} from './events.js'
import {createStorage, LocalStorageAdapter} from './storage.js'

// Storage key for user preferences
const PREFERENCES_KEY = 'starTrekUserPreferences'

/**
 * Default user preferences configuration
 * Provides sensible defaults for new users while ensuring all required fields are present
 */
const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'auto',
  compactView: false,
  accessibilityMode: false,
  autoPlay: false,
  showSpoilers: false,
  preferredStreamingServices: [],
  language: 'en',
  notifications: {
    enabled: true,
    newEpisodes: true,
    progressReminders: false,
  },
  timeline: {
    showMajorEvents: true,
    showMinorEvents: false,
    defaultZoomLevel: 'decade',
  },
  privacy: {
    analyticsEnabled: false,
    crashReportsEnabled: true,
  },
  metadataSync: {
    syncMode: 'auto',
    dataLimits: {
      maxEpisodesPerSync: 50,
      maxDailyApiCalls: 1000,
      maxCacheSizeMB: 100,
    },
    networkPreference: 'wifi-only',
    scheduling: {
      allowDuringPeakHours: false,
      minBatteryLevel: 0.2,
      pauseWhileCharging: false,
      preferredTimeOfDay: 'anytime',
    },
    notifications: {
      notifyOnCompletion: true,
      notifyOnErrors: true,
      notifyOnUpdates: false,
    },
    conflictResolution: 'merge-with-priority',
  },
}

/**
 * Validation function to ensure preferences data integrity
 * Used by storage adapter to validate loaded preference data
 */
const validatePreferences = (data: unknown): data is UserPreferences => {
  if (!data || typeof data !== 'object') return false

  const prefs = data as Record<string, unknown>

  // Check required top-level properties
  const requiredFields = ['theme', 'compactView', 'accessibilityMode', 'autoPlay', 'showSpoilers']
  for (const field of requiredFields) {
    if (!(field in prefs)) return false
  }

  // Validate theme values
  const validThemes = ['light', 'dark', 'auto']
  if (typeof prefs.theme !== 'string' || !validThemes.includes(prefs.theme)) return false

  // Validate boolean fields
  const booleanFields = ['compactView', 'accessibilityMode', 'autoPlay', 'showSpoilers']
  for (const field of booleanFields) {
    if (typeof prefs[field] !== 'boolean') return false
  }

  return true
}

/**
 * Sanitize preferences data to ensure consistency and security
 * Applies defaults for missing fields and normalizes values
 */
const sanitizePreferences = (prefs: UserPreferences): UserPreferences => {
  return {
    ...DEFAULT_PREFERENCES,
    ...prefs,
    // Ensure arrays are properly initialized
    preferredStreamingServices: Array.isArray(prefs.preferredStreamingServices)
      ? prefs.preferredStreamingServices
      : DEFAULT_PREFERENCES.preferredStreamingServices,
    // Ensure nested objects have all required properties
    notifications: {
      ...DEFAULT_PREFERENCES.notifications,
      ...(prefs.notifications || {}),
    },
    timeline: {
      ...DEFAULT_PREFERENCES.timeline,
      ...(prefs.timeline || {}),
    },
    privacy: {
      ...DEFAULT_PREFERENCES.privacy,
      ...(prefs.privacy || {}),
    },
    metadataSync: {
      ...DEFAULT_PREFERENCES.metadataSync,
      ...(prefs.metadataSync || {}),
      dataLimits: {
        ...DEFAULT_PREFERENCES.metadataSync.dataLimits,
        ...(prefs.metadataSync?.dataLimits || {}),
      },
      scheduling: {
        ...DEFAULT_PREFERENCES.metadataSync.scheduling,
        ...(prefs.metadataSync?.scheduling || {}),
      },
      notifications: {
        ...DEFAULT_PREFERENCES.metadataSync.notifications,
        ...(prefs.metadataSync?.notifications || {}),
      },
    },
  }
}

/**
 * Factory function to create user preferences manager with type-safe event handling.
 * Manages user settings like theme, view options, and accessibility preferences.
 *
 * Uses closure-based state management following VBS functional factory patterns.
 * All preference changes are persisted to storage and emit events for reactive updates.
 *
 * @returns PreferencesInstance with methods for getting, setting, and managing preferences
 *
 * @example
 * ```typescript
 * const preferences = createPreferences()
 *
 * // Load initial preferences
 * await preferences.load()
 *
 * // Listen for theme changes
 * preferences.on('theme-change', ({ theme }) => {
 *   document.documentElement.setAttribute('data-theme', theme)
 * })
 *
 * // Update theme preference
 * await preferences.setTheme('dark')
 *
 * // Bulk update preferences
 * await preferences.updatePreferences({
 *   compactView: true,
 *   showSpoilers: false
 * })
 * ```
 */
export const createPreferences = () => {
  // Private state in closure
  let currentPreferences: UserPreferences = {...DEFAULT_PREFERENCES}
  let isLoaded = false

  // Create storage adapter with validation and sanitization
  const storage = createStorage(
    new LocalStorageAdapter<UserPreferences>({
      validate: validatePreferences,
      sanitize: sanitizePreferences,
      fallback: DEFAULT_PREFERENCES,
    }),
  )

  // Generic EventEmitter for type-safe preference events
  const eventEmitter = createEventEmitter<PreferencesEvents>()

  /**
   * Save preferences to storage with error handling
   * Emits save event on successful storage operation
   */
  const savePreferences = withSyncErrorHandling(() => {
    storage.save(PREFERENCES_KEY, currentPreferences)
    eventEmitter.emit('preferences-save', {preferences: currentPreferences})
  }, 'Failed to save preferences')

  /**
   * Load preferences from storage with fallback to defaults
   * Initializes preferences state and emits load event
   */
  const loadPreferences = withSyncErrorHandling(() => {
    const stored = storage.load(PREFERENCES_KEY)

    // Handle both sync and async storage adapters
    if (stored && typeof stored === 'object' && 'then' in stored) {
      // This is a Promise (async storage), but we're in sync function
      throw new Error('Async storage adapter not supported in sync load operation')
    }

    if (stored) {
      currentPreferences = sanitizePreferences(stored)
    } else {
      currentPreferences = {...DEFAULT_PREFERENCES}
    }
    isLoaded = true
    eventEmitter.emit('preferences-load', {preferences: currentPreferences})
    return currentPreferences
  }, 'Failed to load preferences')

  /**
   * Update multiple preferences at once with atomic operation
   * Merges partial updates with current preferences and saves
   */
  const updatePreferences = withSyncErrorHandling((updates: Partial<UserPreferences>) => {
    const previousPreferences = {...currentPreferences}
    currentPreferences = sanitizePreferences({...currentPreferences, ...updates})

    savePreferences()

    eventEmitter.emit('preferences-change', {
      previous: previousPreferences,
      current: currentPreferences,
      changes: updates,
    })

    return currentPreferences
  }, 'Failed to update preferences')

  // Return public API following VBS functional factory pattern
  return {
    /**
     * Load preferences from storage
     * Must be called before other operations to ensure state is initialized
     */
    load: () => loadPreferences(),

    /**
     * Get current preferences
     * Returns a copy to prevent external mutation of internal state
     */
    getPreferences: (): UserPreferences => ({...currentPreferences}),

    /**
     * Get specific preference value with type safety
     */
    get: <K extends keyof UserPreferences>(key: K): UserPreferences[K] => currentPreferences[key],

    /**
     * Update multiple preferences atomically
     * Saves to storage and emits change events
     */
    updatePreferences,

    /**
     * Set theme preference with immediate effect
     * Convenience method for common theme switching operations
     */
    setTheme: (theme: UserPreferences['theme']) => {
      updatePreferences({theme})
      eventEmitter.emit('theme-change', {theme, preferences: currentPreferences})
    },

    /**
     * Toggle compact view mode
     * Convenience method for view density switching
     */
    toggleCompactView: () => {
      const compactView = !currentPreferences.compactView
      updatePreferences({compactView})
      eventEmitter.emit('compact-view-change', {compactView, preferences: currentPreferences})
    },

    /**
     * Toggle accessibility mode
     * Convenience method for accessibility feature management
     */
    toggleAccessibilityMode: () => {
      const accessibilityMode = !currentPreferences.accessibilityMode
      updatePreferences({accessibilityMode})
      eventEmitter.emit('accessibility-change', {
        accessibilityMode,
        preferences: currentPreferences,
      })
    },

    /**
     * Set metadata sync mode (auto, manual, or disabled)
     * Convenience method for controlling background metadata enrichment
     */
    setMetadataSyncMode: (syncMode: UserPreferences['metadataSync']['syncMode']) => {
      const metadataSync = {...currentPreferences.metadataSync, syncMode}
      updatePreferences({metadataSync})
      eventEmitter.emit('metadata-sync-mode-change', {syncMode, preferences: currentPreferences})
      eventEmitter.emit('metadata-sync-change', {metadataSync, preferences: currentPreferences})
    },

    /**
     * Toggle auto sync (convenience for enabling/disabling automatic background sync)
     * Switches between 'auto' and 'manual' modes
     */
    toggleAutoSync: () => {
      const syncMode: UserPreferences['metadataSync']['syncMode'] =
        currentPreferences.metadataSync.syncMode === 'auto' ? 'manual' : 'auto'
      const metadataSync = {...currentPreferences.metadataSync, syncMode}
      updatePreferences({metadataSync})
      eventEmitter.emit('metadata-sync-mode-change', {syncMode, preferences: currentPreferences})
      eventEmitter.emit('metadata-sync-change', {metadataSync, preferences: currentPreferences})
    },

    /**
     * Update metadata sync data limits
     * Allows fine-grained control over API usage and storage
     */
    updateMetadataSyncDataLimits: (
      dataLimits: Partial<UserPreferences['metadataSync']['dataLimits']>,
    ) => {
      const metadataSync = {
        ...currentPreferences.metadataSync,
        dataLimits: {...currentPreferences.metadataSync.dataLimits, ...dataLimits},
      }
      updatePreferences({metadataSync})
      eventEmitter.emit('metadata-sync-data-limits-change', {
        dataLimits: metadataSync.dataLimits,
        preferences: currentPreferences,
      })
      eventEmitter.emit('metadata-sync-change', {metadataSync, preferences: currentPreferences})
    },

    /**
     * Set metadata sync network preference
     * Controls whether sync happens on WiFi only, any connection, or manual-only
     */
    setMetadataSyncNetworkPreference: (
      networkPreference: UserPreferences['metadataSync']['networkPreference'],
    ) => {
      const metadataSync = {...currentPreferences.metadataSync, networkPreference}
      updatePreferences({metadataSync})
      eventEmitter.emit('metadata-sync-network-change', {
        networkPreference,
        preferences: currentPreferences,
      })
      eventEmitter.emit('metadata-sync-change', {metadataSync, preferences: currentPreferences})
    },

    /**
     * Update metadata sync scheduling preferences
     * Controls when and how background sync operations are scheduled
     */
    updateMetadataSyncScheduling: (
      scheduling: Partial<UserPreferences['metadataSync']['scheduling']>,
    ) => {
      const metadataSync = {
        ...currentPreferences.metadataSync,
        scheduling: {...currentPreferences.metadataSync.scheduling, ...scheduling},
      }
      updatePreferences({metadataSync})
      eventEmitter.emit('metadata-sync-scheduling-change', {
        scheduling: metadataSync.scheduling,
        preferences: currentPreferences,
      })
      eventEmitter.emit('metadata-sync-change', {metadataSync, preferences: currentPreferences})
    },

    /**
     * Update metadata sync notification preferences
     * Controls when users are notified about sync operations
     */
    updateMetadataSyncNotifications: (
      notifications: Partial<UserPreferences['metadataSync']['notifications']>,
    ) => {
      const metadataSync = {
        ...currentPreferences.metadataSync,
        notifications: {...currentPreferences.metadataSync.notifications, ...notifications},
      }
      updatePreferences({metadataSync})
      eventEmitter.emit('metadata-sync-change', {metadataSync, preferences: currentPreferences})
    },

    /**
     * Set metadata sync conflict resolution strategy
     * Determines how conflicts between data sources are resolved
     */
    setMetadataSyncConflictResolution: (
      conflictResolution: UserPreferences['metadataSync']['conflictResolution'],
    ) => {
      const metadataSync = {...currentPreferences.metadataSync, conflictResolution}
      updatePreferences({metadataSync})
      eventEmitter.emit('metadata-sync-change', {metadataSync, preferences: currentPreferences})
    },

    /**
     * Reset preferences to default values
     * Useful for troubleshooting and user preference cleanup
     */
    reset: () => {
      const previousPreferences = {...currentPreferences}
      currentPreferences = {...DEFAULT_PREFERENCES}
      savePreferences()
      eventEmitter.emit('preferences-reset', {
        previous: previousPreferences,
        current: currentPreferences,
      })
      return currentPreferences
    },

    /**
     * Export preferences for backup or migration
     * Returns serializable preference data with metadata
     */
    export: () => ({
      version: '1.0',
      timestamp: new Date().toISOString(),
      preferences: currentPreferences,
    }),

    /**
     * Import preferences from backup data
     * Validates and sanitizes imported data before applying
     */
    import: (exportData: {preferences: UserPreferences}) => {
      if (!exportData?.preferences) {
        throw new Error('Invalid export data format')
      }

      const imported = sanitizePreferences(exportData.preferences)
      return updatePreferences(imported)
    },

    /**
     * Check if preferences have been loaded from storage
     */
    isLoaded: () => isLoaded,

    // Generic EventEmitter methods for type-safe event handling
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    once: eventEmitter.once.bind(eventEmitter),
  }
}

/**
 * Type definition for preferences instance returned by factory function
 * Provides type safety for preferences manager usage throughout the application
 */
export type PreferencesInstance = ReturnType<typeof createPreferences>
