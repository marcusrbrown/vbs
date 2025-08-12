import type {StreamingApiInstance, StreamingPreferences} from '../modules/types.js'

/**
 * Configuration for streaming service preferences UI component
 */
export interface StreamingPreferencesConfig {
  /** Container element for the preferences UI */
  container: HTMLElement
  /** Streaming API instance for preferences management */
  streamingApi: StreamingApiInstance
  /** Callback when preferences are updated */
  onPreferencesChange?: (preferences: StreamingPreferences) => void
}

/**
 * Streaming service preferences UI component factory
 * Creates a comprehensive settings interface for user streaming preferences
 */
export const createStreamingPreferencesUI = (config: StreamingPreferencesConfig): void => {
  const {container, streamingApi, onPreferencesChange} = config

  // Get current preferences
  let currentPreferences = streamingApi.getPreferences()

  /**
   * Available streaming platforms with display information
   */
  const AVAILABLE_PLATFORMS = [
    {id: 'paramount-plus', name: 'Paramount+', icon: '🌟'},
    {id: 'netflix', name: 'Netflix', icon: '🎬'},
    {id: 'amazon-prime', name: 'Amazon Prime Video', icon: '📦'},
    {id: 'hulu', name: 'Hulu', icon: '🟢'},
    {id: 'disney-plus', name: 'Disney+', icon: '🏰'},
    {id: 'hbo-max', name: 'Max', icon: '🎭'},
  ]

  /**
   * Available regions with display information
   */
  const AVAILABLE_REGIONS = [
    {id: 'US', name: 'United States', flag: '🇺🇸'},
    {id: 'CA', name: 'Canada', flag: '🇨🇦'},
    {id: 'UK', name: 'United Kingdom', flag: '🇬🇧'},
  ]

  /**
   * Create platform preference checkboxes
   */
  const createPlatformSection = (): string => {
    const platformCheckboxes = AVAILABLE_PLATFORMS.map(platform => {
      const isChecked = currentPreferences.preferredPlatforms.includes(platform.id)
      return `
        <label class="streaming-platform-option">
          <input
            type="checkbox"
            value="${platform.id}"
            ${isChecked ? 'checked' : ''}
            data-platform="${platform.id}"
          />
          <span class="platform-icon">${platform.icon}</span>
          <span class="platform-name">${platform.name}</span>
        </label>
      `
    }).join('')

    return `
      <div class="streaming-preferences-section">
        <h3>Preferred Streaming Services</h3>
        <p class="section-description">Select your preferred streaming platforms for content availability.</p>
        <div class="platform-grid">
          ${platformCheckboxes}
        </div>
      </div>
    `
  }

  /**
   * Create region preference selector
   */
  const createRegionSection = (): string => {
    const regionOptions = AVAILABLE_REGIONS.map(region => {
      const isSelected = currentPreferences.location.region === region.id
      return `
        <option value="${region.id}" ${isSelected ? 'selected' : ''}>
          ${region.flag} ${region.name}
        </option>
      `
    }).join('')

    return `
      <div class="streaming-preferences-section">
        <h3>Geographic Region</h3>
        <p class="section-description">Your region affects content availability and pricing.</p>
        <div class="region-controls">
          <label class="region-selector">
            <span>Region:</span>
            <select data-region-selector>
              ${regionOptions}
            </select>
          </label>
          <label class="region-option">
            <input
              type="checkbox"
              ${currentPreferences.location.allowAutoDetection ? 'checked' : ''}
              data-auto-detection
            />
            Auto-detect my location
          </label>
          <label class="region-option">
            <input
              type="checkbox"
              ${currentPreferences.location.showOtherRegions ? 'checked' : ''}
              data-show-other-regions
            />
            Show content from other regions
          </label>
        </div>
      </div>
    `
  }

  /**
   * Create display preferences section
   */
  const createDisplaySection = (): string => {
    return `
      <div class="streaming-preferences-section">
        <h3>Display Preferences</h3>
        <p class="section-description">Customize how streaming information is displayed.</p>
        <div class="display-controls">
          <label class="display-option">
            <input
              type="checkbox"
              ${currentPreferences.hideUnavailable ? 'checked' : ''}
              data-hide-unavailable
            />
            Hide content not available on my preferred services
          </label>
          <label class="display-option">
            <input
              type="checkbox"
              ${currentPreferences.showPricing ? 'checked' : ''}
              data-show-pricing
            />
            Show pricing information
          </label>
          <label class="display-option">
            <input
              type="checkbox"
              ${currentPreferences.enableNotifications ? 'checked' : ''}
              data-enable-notifications
            />
            Enable availability notifications
          </label>
        </div>
      </div>
    `
  }

  /**
   * Create price filtering section
   */
  const createPriceSection = (): string => {
    const maxPrice = currentPreferences.maxPrice ?? {rent: 5.99, buy: 14.99, currency: 'USD'}

    return `
      <div class="streaming-preferences-section">
        <h3>Price Filtering</h3>
        <p class="section-description">Set maximum prices for content filtering.</p>
        <div class="price-controls">
          <label class="price-input">
            <span>Max Rental Price:</span>
            <input
              type="number"
              min="0"
              max="20"
              step="0.99"
              value="${maxPrice.rent}"
              data-max-rent-price
            />
            <span class="currency">${maxPrice.currency}</span>
          </label>
          <label class="price-input">
            <span>Max Purchase Price:</span>
            <input
              type="number"
              min="0"
              max="50"
              step="0.99"
              value="${maxPrice.buy}"
              data-max-buy-price
            />
            <span class="currency">${maxPrice.currency}</span>
          </label>
        </div>
      </div>
    `
  }

  /**
   * Create action buttons
   */
  const createActionSection = (): string => {
    return `
      <div class="streaming-preferences-actions">
        <button type="button" class="btn-primary" data-save-preferences>
          Save Preferences
        </button>
        <button type="button" class="btn-secondary" data-reset-preferences>
          Reset to Defaults
        </button>
        <button type="button" class="btn-tertiary" data-export-preferences>
          Export Settings
        </button>
      </div>
    `
  }

  /**
   * Render the complete preferences UI
   */
  const renderPreferencesUI = (): void => {
    const preferencesHTML = `
      <div class="streaming-preferences-container">
        <header class="preferences-header">
          <h2>Streaming Service Preferences</h2>
          <p>Customize your streaming service experience and content availability preferences.</p>
        </header>
        <form class="streaming-preferences-form">
          ${createPlatformSection()}
          ${createRegionSection()}
          ${createDisplaySection()}
          ${createPriceSection()}
          ${createActionSection()}
        </form>
      </div>
    `

    container.innerHTML = preferencesHTML
    attachEventListeners()
  }

  /**
   * Collect current form values into preferences object
   */
  const collectPreferences = (): StreamingPreferences => {
    const form = container.querySelector('.streaming-preferences-form') as HTMLFormElement

    // Collect platform preferences
    const platformCheckboxes = form.querySelectorAll('[data-platform]')
    const preferredPlatforms: string[] = []
    platformCheckboxes.forEach(checkbox => {
      const input = checkbox as HTMLInputElement
      if (input.checked) {
        preferredPlatforms.push(input.value)
      }
    })

    // Collect region preferences
    const regionSelector = form.querySelector('[data-region-selector]') as HTMLSelectElement
    const autoDetection = form.querySelector('[data-auto-detection]') as HTMLInputElement
    const showOtherRegions = form.querySelector('[data-show-other-regions]') as HTMLInputElement

    // Collect display preferences
    const hideUnavailable = form.querySelector('[data-hide-unavailable]') as HTMLInputElement
    const showPricing = form.querySelector('[data-show-pricing]') as HTMLInputElement
    const enableNotifications = form.querySelector(
      '[data-enable-notifications]',
    ) as HTMLInputElement

    // Collect price preferences
    const maxRentPrice = form.querySelector('[data-max-rent-price]') as HTMLInputElement
    const maxBuyPrice = form.querySelector('[data-max-buy-price]') as HTMLInputElement
    const currentMaxPrice = currentPreferences.maxPrice ?? {rent: 5.99, buy: 14.99, currency: 'USD'}

    return {
      preferredPlatforms,
      hideUnavailable: hideUnavailable.checked,
      showPricing: showPricing.checked,
      location: {
        region: regionSelector.value as 'US' | 'CA' | 'UK',
        allowAutoDetection: autoDetection.checked,
        showOtherRegions: showOtherRegions.checked,
        locale: currentPreferences.location.locale || 'en-US',
      },
      enableNotifications: enableNotifications.checked,
      maxPrice: {
        rent: Number.parseFloat(maxRentPrice.value),
        buy: Number.parseFloat(maxBuyPrice.value),
        currency: currentMaxPrice.currency, // Keep existing currency
      },
    }
  }

  /**
   * Save preferences and notify listeners
   */
  const savePreferences = (): void => {
    try {
      const newPreferences = collectPreferences()
      streamingApi.setPreferences(newPreferences)
      currentPreferences = newPreferences

      // Notify callback
      if (onPreferencesChange) {
        onPreferencesChange(newPreferences)
      }

      // Show success feedback
      showFeedback('Preferences saved successfully!', 'success')
    } catch (error) {
      console.error('Failed to save streaming preferences:', error)
      showFeedback('Failed to save preferences. Please try again.', 'error')
    }
  }

  /**
   * Reset to default preferences
   */
  const resetPreferences = (): void => {
    const shouldReset =
      // eslint-disable-next-line no-alert
      window.confirm?.('Are you sure you want to reset all streaming preferences to defaults?') ??
      false
    if (shouldReset) {
      try {
        // Create default preferences
        const defaultPreferences: StreamingPreferences = {
          preferredPlatforms: ['paramount-plus', 'netflix', 'amazon-prime', 'hulu'],
          hideUnavailable: false,
          showPricing: true,
          location: {
            region: 'US',
            allowAutoDetection: false,
            showOtherRegions: false,
            locale: 'en-US',
          },
          enableNotifications: true,
          maxPrice: {
            rent: 5.99,
            buy: 14.99,
            currency: 'USD',
          },
        }

        streamingApi.setPreferences(defaultPreferences)
        currentPreferences = defaultPreferences
        renderPreferencesUI() // Re-render with defaults

        // Notify callback
        if (onPreferencesChange) {
          onPreferencesChange(currentPreferences)
        }

        showFeedback('Preferences reset to defaults.', 'success')
      } catch (error) {
        console.error('Failed to reset streaming preferences:', error)
        showFeedback('Failed to reset preferences. Please try again.', 'error')
      }
    }
  }

  /**
   * Export preferences as JSON file
   */
  const exportPreferences = (): void => {
    try {
      const preferences = collectPreferences()
      const dataStr = JSON.stringify(preferences, null, 2)
      const dataBlob = new Blob([dataStr], {type: 'application/json'})

      const link = document.createElement('a')
      link.href = URL.createObjectURL(dataBlob)
      link.download = `vbs-streaming-preferences-${new Date().toISOString().split('T')[0]}.json`
      link.click()

      showFeedback('Preferences exported successfully!', 'success')
    } catch (error) {
      console.error('Failed to export streaming preferences:', error)
      showFeedback('Failed to export preferences. Please try again.', 'error')
    }
  }

  /**
   * Show user feedback message
   */
  const showFeedback = (message: string, type: 'success' | 'error'): void => {
    const existingFeedback = container.querySelector('.preferences-feedback')
    if (existingFeedback) {
      existingFeedback.remove()
    }

    const feedback = document.createElement('div')
    feedback.className = `preferences-feedback feedback-${type}`
    feedback.textContent = message

    const header = container.querySelector('.preferences-header')
    if (header) {
      header.after(feedback)
    }

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (feedback.parentNode) {
        feedback.remove()
      }
    }, 3000)
  }

  /**
   * Attach event listeners to form elements
   */
  const attachEventListeners = (): void => {
    const form = container.querySelector('.streaming-preferences-form') as HTMLFormElement

    // Save button
    const saveButton = form.querySelector('[data-save-preferences]') as HTMLButtonElement
    saveButton.addEventListener('click', savePreferences)

    // Reset button
    const resetButton = form.querySelector('[data-reset-preferences]') as HTMLButtonElement
    resetButton.addEventListener('click', resetPreferences)

    // Export button
    const exportButton = form.querySelector('[data-export-preferences]') as HTMLButtonElement
    exportButton.addEventListener('click', exportPreferences)

    // Auto-save on input changes (debounced)
    let saveTimeout: number | undefined
    const debouncedSave = (): void => {
      if (saveTimeout) {
        clearTimeout(saveTimeout)
      }
      saveTimeout = window.setTimeout(() => {
        const newPreferences = collectPreferences()
        streamingApi.setPreferences(newPreferences)
        currentPreferences = newPreferences

        if (onPreferencesChange) {
          onPreferencesChange(newPreferences)
        }
      }, 1000) // 1 second debounce
    }

    // Add change listeners to all form inputs
    const allInputs = form.querySelectorAll('input, select')
    allInputs.forEach(input => {
      input.addEventListener('change', debouncedSave)
    })
  }

  // Initial render
  renderPreferencesUI()
}

/**
 * Create a modal dialog for streaming preferences
 */
export const createStreamingPreferencesModal = (streamingApi: StreamingApiInstance): void => {
  // Create modal container
  const modal = document.createElement('div')
  modal.className = 'streaming-preferences-modal-overlay'
  modal.innerHTML = `
    <div class="streaming-preferences-modal">
      <header class="modal-header">
        <button class="modal-close" aria-label="Close preferences">&times;</button>
      </header>
      <div class="modal-content"></div>
    </div>
  `

  document.body.append(modal)

  const contentContainer = modal.querySelector('.modal-content') as HTMLElement
  const closeButton = modal.querySelector('.modal-close') as HTMLButtonElement

  // Close modal handlers
  const closeModal = (): void => {
    modal.remove()
  }

  closeButton.addEventListener('click', closeModal)
  modal.addEventListener('click', event => {
    if (event.target === modal) {
      closeModal()
    }
  })

  // Escape key handler
  const handleEscape = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      closeModal()
      document.removeEventListener('keydown', handleEscape)
    }
  }
  document.addEventListener('keydown', handleEscape)

  // Create preferences UI in modal
  createStreamingPreferencesUI({
    container: contentContainer,
    streamingApi,
    onPreferencesChange: preferences => {
      // Emit a global event for other components to listen to
      const event = new CustomEvent('streaming-preferences-changed', {
        detail: preferences,
      })
      window.dispatchEvent(event)
    },
  })
}
