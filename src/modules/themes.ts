import type {PreferencesInstance} from './preferences.js'
import type {ThemeEvents, ThemeSystemInstance} from './types.js'
import {withSyncErrorHandling} from './error-handler.js'
import {createEventEmitter} from './events.js'

// Available theme configurations
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto',
} as const

export type Theme = (typeof THEMES)[keyof typeof THEMES]

/**
 * CSS custom property definitions for the theme system
 * Provides comprehensive color scheme and design tokens
 */
const THEME_PROPERTIES = {
  // Primary color palette
  '--vbs-color-primary': 'Primary brand color',
  '--vbs-color-primary-hover': 'Primary color hover state',
  '--vbs-color-primary-active': 'Primary color active state',

  // Background colors
  '--vbs-bg-primary': 'Main background color',
  '--vbs-bg-secondary': 'Secondary background color (cards, panels)',
  '--vbs-bg-tertiary': 'Tertiary background color (inputs, buttons)',
  '--vbs-bg-accent': 'Accent background color (highlights, selections)',

  // Text colors
  '--vbs-text-primary': 'Primary text color (headings, important text)',
  '--vbs-text-secondary': 'Secondary text color (body text)',
  '--vbs-text-tertiary': 'Tertiary text color (captions, metadata)',
  '--vbs-text-muted': 'Muted text color (disabled, placeholder)',
  '--vbs-text-inverse': 'Inverse text color (text on dark backgrounds)',

  // Border and outline colors
  '--vbs-border-primary': 'Primary border color',
  '--vbs-border-secondary': 'Secondary border color (subtle borders)',
  '--vbs-border-focus': 'Focus outline color',

  // Status colors
  '--vbs-color-success': 'Success state color',
  '--vbs-color-warning': 'Warning state color',
  '--vbs-color-error': 'Error state color',
  '--vbs-color-info': 'Information state color',

  // Star Trek specific colors
  '--vbs-color-starfleet': 'Starfleet red accent color',
  '--vbs-color-federation': 'Federation blue accent color',
  '--vbs-color-progress': 'Progress indicator color',
  '--vbs-color-progress-bg': 'Progress background color',

  // Typography
  '--vbs-font-family-primary': 'Primary font family',
  '--vbs-font-family-monospace': 'Monospace font family (code, data)',
  '--vbs-font-size-base': 'Base font size',
  '--vbs-font-weight-normal': 'Normal font weight',
  '--vbs-font-weight-bold': 'Bold font weight',
  '--vbs-line-height-base': 'Base line height',

  // Spacing and layout
  '--vbs-spacing-xs': 'Extra small spacing (4px)',
  '--vbs-spacing-sm': 'Small spacing (8px)',
  '--vbs-spacing-md': 'Medium spacing (16px)',
  '--vbs-spacing-lg': 'Large spacing (24px)',
  '--vbs-spacing-xl': 'Extra large spacing (32px)',

  // Shadows and elevation
  '--vbs-shadow-sm': 'Small shadow for subtle elevation',
  '--vbs-shadow-md': 'Medium shadow for cards and panels',
  '--vbs-shadow-lg': 'Large shadow for modals and overlays',

  // Border radius
  '--vbs-radius-sm': 'Small border radius',
  '--vbs-radius-md': 'Medium border radius',
  '--vbs-radius-lg': 'Large border radius',

  // Transitions
  '--vbs-transition-fast': 'Fast transition duration',
  '--vbs-transition-normal': 'Normal transition duration',
  '--vbs-transition-slow': 'Slow transition duration',
} as const

/**
 * Light theme color values
 */
const LIGHT_THEME_VALUES: Record<string, string> = {
  // Primary colors
  '--vbs-color-primary': '#1e40af', // Blue-700
  '--vbs-color-primary-hover': '#1d4ed8', // Blue-600
  '--vbs-color-primary-active': '#2563eb', // Blue-600

  // Background colors
  '--vbs-bg-primary': '#ffffff',
  '--vbs-bg-secondary': '#f8fafc', // Slate-50
  '--vbs-bg-tertiary': '#f1f5f9', // Slate-100
  '--vbs-bg-accent': '#e0f2fe', // Sky-100

  // Text colors
  '--vbs-text-primary': '#0f172a', // Slate-900
  '--vbs-text-secondary': '#334155', // Slate-700
  '--vbs-text-tertiary': '#64748b', // Slate-500
  '--vbs-text-muted': '#94a3b8', // Slate-400
  '--vbs-text-inverse': '#ffffff',

  // Border colors
  '--vbs-border-primary': '#e2e8f0', // Slate-200
  '--vbs-border-secondary': '#f1f5f9', // Slate-100
  '--vbs-border-focus': '#3b82f6', // Blue-500

  // Status colors
  '--vbs-color-success': '#059669', // Emerald-600
  '--vbs-color-warning': '#d97706', // Amber-600
  '--vbs-color-error': '#dc2626', // Red-600
  '--vbs-color-info': '#0284c7', // Sky-600

  // Star Trek colors
  '--vbs-color-starfleet': '#dc2626', // Red-600
  '--vbs-color-federation': '#2563eb', // Blue-600
  '--vbs-color-progress': '#059669', // Emerald-600
  '--vbs-color-progress-bg': '#f0fdf4', // Green-50

  // Typography
  '--vbs-font-family-primary': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  '--vbs-font-family-monospace':
    '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace',
  '--vbs-font-size-base': '16px',
  '--vbs-font-weight-normal': '400',
  '--vbs-font-weight-bold': '600',
  '--vbs-line-height-base': '1.5',

  // Spacing
  '--vbs-spacing-xs': '4px',
  '--vbs-spacing-sm': '8px',
  '--vbs-spacing-md': '16px',
  '--vbs-spacing-lg': '24px',
  '--vbs-spacing-xl': '32px',

  // Shadows
  '--vbs-shadow-sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  '--vbs-shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  '--vbs-shadow-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',

  // Border radius
  '--vbs-radius-sm': '4px',
  '--vbs-radius-md': '8px',
  '--vbs-radius-lg': '12px',

  // Transitions
  '--vbs-transition-fast': '150ms ease-in-out',
  '--vbs-transition-normal': '250ms ease-in-out',
  '--vbs-transition-slow': '350ms ease-in-out',
}

/**
 * Dark theme color values
 */
const DARK_THEME_VALUES: Record<string, string> = {
  // Primary colors
  '--vbs-color-primary': '#3b82f6', // Blue-500
  '--vbs-color-primary-hover': '#60a5fa', // Blue-400
  '--vbs-color-primary-active': '#2563eb', // Blue-600

  // Background colors
  '--vbs-bg-primary': '#0f172a', // Slate-900
  '--vbs-bg-secondary': '#1e293b', // Slate-800
  '--vbs-bg-tertiary': '#334155', // Slate-700
  '--vbs-bg-accent': '#1e3a8a', // Blue-900

  // Text colors
  '--vbs-text-primary': '#f8fafc', // Slate-50
  '--vbs-text-secondary': '#cbd5e1', // Slate-300
  '--vbs-text-tertiary': '#94a3b8', // Slate-400
  '--vbs-text-muted': '#64748b', // Slate-500
  '--vbs-text-inverse': '#0f172a', // Slate-900

  // Border colors
  '--vbs-border-primary': '#475569', // Slate-600
  '--vbs-border-secondary': '#334155', // Slate-700
  '--vbs-border-focus': '#60a5fa', // Blue-400

  // Status colors
  '--vbs-color-success': '#10b981', // Emerald-500
  '--vbs-color-warning': '#f59e0b', // Amber-500
  '--vbs-color-error': '#ef4444', // Red-500
  '--vbs-color-info': '#06b6d4', // Cyan-500

  // Star Trek colors
  '--vbs-color-starfleet': '#ef4444', // Red-500
  '--vbs-color-federation': '#3b82f6', // Blue-500
  '--vbs-color-progress': '#10b981', // Emerald-500
  '--vbs-color-progress-bg': '#064e3b', // Emerald-900

  // Typography (same as light)
  '--vbs-font-family-primary': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  '--vbs-font-family-monospace':
    '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace',
  '--vbs-font-size-base': '16px',
  '--vbs-font-weight-normal': '400',
  '--vbs-font-weight-bold': '600',
  '--vbs-line-height-base': '1.5',

  // Spacing (same as light)
  '--vbs-spacing-xs': '4px',
  '--vbs-spacing-sm': '8px',
  '--vbs-spacing-md': '16px',
  '--vbs-spacing-lg': '24px',
  '--vbs-spacing-xl': '32px',

  // Shadows (adjusted for dark theme)
  '--vbs-shadow-sm': '0 1px 2px 0 rgb(0 0 0 / 0.3)',
  '--vbs-shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.4)',
  '--vbs-shadow-lg': '0 10px 15px -3px rgb(0 0 0 / 0.5), 0 4px 6px -4px rgb(0 0 0 / 0.5)',

  // Border radius (same as light)
  '--vbs-radius-sm': '4px',
  '--vbs-radius-md': '8px',
  '--vbs-radius-lg': '12px',

  // Transitions (same as light)
  '--vbs-transition-fast': '150ms ease-in-out',
  '--vbs-transition-normal': '250ms ease-in-out',
  '--vbs-transition-slow': '350ms ease-in-out',
}

/**
 * Factory function to create theme system with CSS custom property management.
 * Integrates with user preferences for theme switching and system preference detection.
 *
 * Uses closure-based state management following VBS functional factory patterns.
 * Provides type-safe theme operations and reactive theme changes.
 *
 * @param preferences - PreferencesInstance for theme preference integration
 * @returns ThemeSystemInstance with methods for theme management
 *
 * @example
 * ```typescript
 * const preferences = createPreferences()
 * const themeSystem = createThemeSystem(preferences)
 *
 * // Initialize theme system
 * themeSystem.initialize()
 *
 * // Listen for theme changes
 * themeSystem.on('theme-applied', ({ theme, properties }) => {
 *   console.log(`Applied ${theme} theme with ${properties.length} properties`)
 * })
 *
 * // Apply theme programmatically
 * themeSystem.applyTheme('dark')
 *
 * // Toggle between light and dark
 * themeSystem.toggleTheme()
 * ```
 */
export const createThemeSystem = (preferences: PreferencesInstance): ThemeSystemInstance => {
  // Private state in closure
  let currentTheme: Theme = THEMES.AUTO
  let systemPrefersDark = false
  let isInitialized = false
  let mediaQueryList: MediaQueryList | null = null
  let systemThemeHandler: ((e: MediaQueryListEvent) => void) | null = null

  // Generic EventEmitter for type-safe theme events
  const eventEmitter = createEventEmitter<ThemeEvents>()

  /**
   * Get the resolved theme (converts 'auto' to actual theme)
   */
  const getCurrentResolvedTheme = (): Exclude<Theme, 'auto'> => {
    if (currentTheme === THEMES.AUTO) {
      return systemPrefersDark ? THEMES.DARK : THEMES.LIGHT
    }
    return currentTheme
  }

  /**
   * Apply CSS custom properties for a specific theme
   */
  const applyCSSProperties = withSyncErrorHandling((theme: Exclude<Theme, 'auto'>) => {
    const root = document.documentElement
    const themeValues = theme === THEMES.DARK ? DARK_THEME_VALUES : LIGHT_THEME_VALUES

    // Apply all CSS custom properties
    Object.entries(themeValues).forEach(([property, value]) => {
      root.style.setProperty(property, value)
    })

    // Set data attribute for theme-specific styling
    root.dataset['theme'] = theme
    root.dataset['vbsTheme'] = theme

    return Object.keys(themeValues)
  }, 'Failed to apply CSS properties')

  /**
   * Apply the current theme to the document
   */
  const applyCurrentTheme = withSyncErrorHandling(() => {
    const resolvedTheme = getCurrentResolvedTheme()
    const appliedProperties = applyCSSProperties(resolvedTheme)

    eventEmitter.emit('theme-applied', {
      theme: resolvedTheme,
      originalTheme: currentTheme,
      properties: appliedProperties || [],
      timestamp: new Date().toISOString(),
    })

    return resolvedTheme
  }, 'Failed to apply current theme')

  /**
   * Detect system theme preference using media queries
   * Sets up listener for system theme changes
   */
  const detectSystemTheme = withSyncErrorHandling(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)')
      systemPrefersDark = mediaQueryList.matches

      // Create and store the handler for later cleanup
      systemThemeHandler = (e: MediaQueryListEvent) => {
        systemPrefersDark = e.matches
        if (currentTheme === THEMES.AUTO) {
          applyCurrentTheme()
        }
        eventEmitter.emit('system-theme-change', {
          systemPrefersDark,
          currentTheme: getCurrentResolvedTheme(),
        })
      }

      if (mediaQueryList.addEventListener) {
        mediaQueryList.addEventListener('change', systemThemeHandler)
      } else {
        // Fallback for older browsers
        mediaQueryList.addListener(systemThemeHandler)
      }
    }
  }, 'Failed to detect system theme')

  /**
   * Set theme and update preferences
   */
  const setTheme = withSyncErrorHandling((theme: Theme) => {
    const previousTheme = currentTheme
    currentTheme = theme

    // Update preferences if they're loaded
    if (preferences.isLoaded()) {
      preferences.setTheme(theme)
    }

    const resolvedTheme = applyCurrentTheme()

    eventEmitter.emit('theme-change', {
      previousTheme,
      currentTheme: theme,
      resolvedTheme: resolvedTheme || getCurrentResolvedTheme(),
    })

    return resolvedTheme
  }, 'Failed to set theme')

  /**
   * Toggle between light and dark themes (skips auto)
   */
  const toggleTheme = withSyncErrorHandling(() => {
    const resolvedTheme = getCurrentResolvedTheme()
    const newTheme = resolvedTheme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT
    return setTheme(newTheme)
  }, 'Failed to toggle theme')

  /**
   * Initialize theme system with preferences integration
   */
  const initialize = withSyncErrorHandling(() => {
    if (isInitialized) {
      return getCurrentResolvedTheme()
    }

    // Set up system theme detection
    detectSystemTheme()

    // Load theme from preferences
    if (preferences.isLoaded()) {
      currentTheme = preferences.get('theme')
    } else {
      // Listen for preferences to load
      preferences.once('preferences-load', ({preferences: prefs}) => {
        currentTheme = prefs.theme
        applyCurrentTheme()
      })
    }

    // Listen for preference changes
    preferences.on('theme-change', ({theme}) => {
      if (theme !== currentTheme) {
        currentTheme = theme
        applyCurrentTheme()
      }
    })

    // Apply initial theme
    const resolvedTheme = applyCurrentTheme()
    isInitialized = true

    eventEmitter.emit('theme-system-initialized', {
      initialTheme: currentTheme,
      resolvedTheme: resolvedTheme || getCurrentResolvedTheme(),
      systemPrefersDark,
    })

    return resolvedTheme
  }, 'Failed to initialize theme system')

  /**
   * Get theme information and available options
   */
  const getThemeInfo = () => ({
    currentTheme,
    resolvedTheme: getCurrentResolvedTheme(),
    systemPrefersDark,
    availableThemes: Object.values(THEMES),
    isInitialized,
    cssProperties: Object.keys(THEME_PROPERTIES),
  })

  /**
   * Cleanup theme system (remove event listeners)
   */
  const cleanup = withSyncErrorHandling(() => {
    if (mediaQueryList && systemThemeHandler) {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', systemThemeHandler)
      } else {
        // Fallback for older browsers
        mediaQueryList.removeListener(systemThemeHandler)
      }
      mediaQueryList = null
      systemThemeHandler = null
    }
    isInitialized = false
    eventEmitter.removeAllListeners()
  }, 'Failed to cleanup theme system')

  // Return public API following VBS functional factory pattern
  return {
    /**
     * Initialize the theme system with preferences integration
     */
    initialize,

    /**
     * Apply a specific theme
     */
    setTheme,

    /**
     * Toggle between light and dark themes
     */
    toggleTheme,

    /**
     * Get current theme information
     */
    getCurrentTheme: () => currentTheme,

    /**
     * Get resolved theme (auto converted to light/dark)
     */
    getResolvedTheme: getCurrentResolvedTheme,

    /**
     * Get comprehensive theme information
     */
    getThemeInfo,

    /**
     * Check if theme system is initialized
     */
    isInitialized: () => isInitialized,

    /**
     * Force reapply current theme (useful for dynamic changes)
     */
    refresh: applyCurrentTheme,

    /**
     * Get available CSS custom properties
     */
    getCSSProperties: () => Object.keys(THEME_PROPERTIES),

    /**
     * Get theme values for a specific theme
     */
    getThemeValues: (theme: Exclude<Theme, 'auto'>) =>
      theme === THEMES.DARK ? {...DARK_THEME_VALUES} : {...LIGHT_THEME_VALUES},

    /**
     * Cleanup theme system resources
     */
    cleanup,

    // Generic EventEmitter methods for type-safe event handling
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    once: eventEmitter.once.bind(eventEmitter),
  }
}

/**
 * Type definition for theme system instance returned by factory function
 * Provides type safety for theme system usage throughout the application
 */
export type {ThemeSystemInstance} from './types.js'
