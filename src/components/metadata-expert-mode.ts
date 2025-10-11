/**
 * Expert Mode Toggle Component
 *
 * Provides a toggle control for enabling/disabling expert mode, which reveals advanced
 * metadata management and troubleshooting features throughout the VBS application.
 *
 * Expert mode enables:
 * - Advanced debugging panels and operation logs
 * - Detailed metadata source attribution
 * - Low-level storage and cache management
 * - Raw API response inspection
 * - Performance metrics and diagnostics
 *
 * Follows VBS functional factory architecture with closure-based state management
 * and generic EventEmitter for type-safe event handling.
 *
 * Integration:
 * - Integrates with preferences system for persistent storage
 * - Uses VBS theme system with CSS custom properties
 * - Provides keyboard navigation and screen reader support
 * - Follows progressive disclosure patterns for feature visibility
 */

import type {PreferencesInstance} from '../modules/preferences.js'
import type {MetadataExpertModeEvents, MetadataExpertModeInstance} from '../modules/types.js'
import {createEventEmitter} from '../modules/events.js'

/**
 * Configuration for expert mode toggle component
 */
export interface MetadataExpertModeConfig {
  /** Container element for the toggle */
  container: HTMLElement
  /** Preferences instance for state management */
  preferences: PreferencesInstance
  /** Initial visibility state */
  initiallyVisible?: boolean
}

/**
 * Create an expert mode toggle component instance.
 * Factory function following VBS functional factory architecture pattern.
 *
 * @param config - Configuration for the expert mode toggle
 * @returns Expert mode toggle instance with full API
 *
 * @example
 * ```typescript
 * const expertMode = createMetadataExpertMode({
 *   container: document.getElementById('expert-mode-container')!,
 *   preferences: preferencesInstance,
 * })
 *
 * expertMode.render()
 *
 * expertMode.on('expert-mode-changed', ({ enabled }) => {
 *   console.log('Expert mode:', enabled ? 'enabled' : 'disabled')
 *   updateAdvancedFeatureVisibility(enabled)
 * })
 * ```
 */
export const createMetadataExpertMode = (
  config: MetadataExpertModeConfig,
): MetadataExpertModeInstance => {
  const {container, preferences, initiallyVisible = true} = config

  // Private state in closure
  let isVisible = initiallyVisible
  let currentState = preferences.getExpertMode()

  // DOM elements cache
  const elements: {
    wrapper?: HTMLElement
    toggle?: HTMLInputElement
    description?: HTMLElement
  } = {}

  // Generic EventEmitter for type-safe events
  const eventEmitter = createEventEmitter<MetadataExpertModeEvents>()

  /**
   * Handle toggle change event
   */
  const handleToggleChange = (event: Event): void => {
    const target = event.target as HTMLInputElement
    const enabled = target.checked

    currentState = enabled
    preferences.setExpertMode(enabled)
    eventEmitter.emit('expert-mode-changed', {enabled})

    // Update description text
    if (elements.description) {
      elements.description.textContent = enabled
        ? 'Advanced features enabled. Detailed debugging panels, performance metrics, and low-level controls are now visible.'
        : 'Standard mode active. Toggle expert mode to reveal advanced metadata management and troubleshooting features.'
    }
  }

  /**
   * Create the HTML structure for expert mode toggle
   */
  const createHTML = (): string => {
    const enabled = currentState

    return `
      <div class="metadata-expert-mode" style="${isVisible ? '' : 'display: none;'}">
        <div class="expert-mode-header">
          <div class="expert-mode-title">
            <span class="expert-mode-icon" aria-hidden="true">🔧</span>
            <h3>Expert Mode</h3>
          </div>
          <label class="expert-mode-toggle">
            <input
              type="checkbox"
              ${enabled ? 'checked' : ''}
              aria-label="Toggle expert mode"
              aria-describedby="expert-mode-description"
            />
            <span class="toggle-slider"></span>
            <span class="toggle-label">${enabled ? 'Enabled' : 'Disabled'}</span>
          </label>
        </div>
        <p
          id="expert-mode-description"
          class="expert-mode-description"
          role="status"
          aria-live="polite"
        >
          ${
            enabled
              ? 'Advanced features enabled. Detailed debugging panels, performance metrics, and low-level controls are now visible.'
              : 'Standard mode active. Toggle expert mode to reveal advanced metadata management and troubleshooting features.'
          }
        </p>
        <div class="expert-mode-features">
          <h4>Expert Features:</h4>
          <ul>
            <li>🔍 Detailed operation logs and debugging panels</li>
            <li>📊 Performance metrics and API response times</li>
            <li>🛠️ Advanced cache management and cleanup tools</li>
            <li>🔗 Raw metadata source attribution and conflict resolution</li>
            <li>⚙️ Low-level configuration and troubleshooting options</li>
          </ul>
        </div>
      </div>
    `
  }

  /**
   * Render the component
   */
  const render = (): void => {
    container.innerHTML = createHTML()

    elements.wrapper = container.querySelector('.metadata-expert-mode') as HTMLElement
    elements.toggle = container.querySelector('input[type="checkbox"]') as HTMLInputElement
    elements.description = container.querySelector('.expert-mode-description') as HTMLElement

    if (elements.toggle) {
      elements.toggle.addEventListener('change', handleToggleChange)
    }

    // Listen for external preference changes
    preferences.on('expert-mode-changed', (data: {enabled: boolean}) => {
      currentState = data.enabled
      if (elements.toggle) {
        elements.toggle.checked = data.enabled
      }
      if (elements.description) {
        elements.description.textContent = data.enabled
          ? 'Advanced features enabled. Detailed debugging panels, performance metrics, and low-level controls are now visible.'
          : 'Standard mode active. Toggle expert mode to reveal advanced metadata management and troubleshooting features.'
      }
    })
  }

  /**
   * Show the component
   */
  const show = (): void => {
    isVisible = true
    if (elements.wrapper) {
      elements.wrapper.style.display = ''
    }
  }

  /**
   * Hide the component
   */
  const hide = (): void => {
    isVisible = false
    if (elements.wrapper) {
      elements.wrapper.style.display = 'none'
    }
  }

  /**
   * Get current expert mode state
   */
  const isEnabled = (): boolean => {
    return currentState
  }

  /**
   * Set expert mode state programmatically
   */
  const setEnabled = (enabled: boolean): void => {
    currentState = enabled
    preferences.setExpertMode(enabled)

    if (elements.toggle) {
      elements.toggle.checked = enabled
    }
    if (elements.description) {
      elements.description.textContent = enabled
        ? 'Advanced features enabled. Detailed debugging panels, performance metrics, and low-level controls are now visible.'
        : 'Standard mode active. Toggle expert mode to reveal advanced metadata management and troubleshooting features.'
    }

    eventEmitter.emit('expert-mode-changed', {enabled})
  }

  /**
   * Clean up resources
   */
  const destroy = (): void => {
    if (elements.toggle) {
      elements.toggle.removeEventListener('change', handleToggleChange)
    }
    eventEmitter.removeAllListeners()
    container.innerHTML = ''
  }

  return {
    render,
    show,
    hide,
    isEnabled,
    setEnabled,
    destroy,
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    once: eventEmitter.once.bind(eventEmitter),
    removeAllListeners: eventEmitter.removeAllListeners.bind(eventEmitter),
  }
}
