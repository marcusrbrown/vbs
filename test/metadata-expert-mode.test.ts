/**
 * Metadata Expert Mode Component Tests
 *
 * Comprehensive test suite for the expert mode toggle component following VBS testing patterns.
 * Tests factory function creation, UI rendering, event handling, and integration with preferences.
 */

import type {PreferencesInstance} from '../src/modules/preferences.js'
import type {MetadataExpertModeInstance} from '../src/modules/types.js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createMetadataExpertMode} from '../src/components/metadata-expert-mode.js'

describe('Metadata Expert Mode Toggle', () => {
  let container: HTMLElement
  let mockPreferences: PreferencesInstance
  let expertMode: MetadataExpertModeInstance

  beforeEach(() => {
    // Create DOM container
    container = document.createElement('div')
    document.body.append(container)

    // Create mock preferences instance
    mockPreferences = {
      getExpertMode: vi.fn(() => false),
      setExpertMode: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      once: vi.fn(),
    } as unknown as PreferencesInstance
  })

  afterEach(() => {
    if (expertMode) {
      expertMode.destroy()
    }
    container.remove()
  })

  describe('Factory Function', () => {
    it('should create expert mode toggle instance', () => {
      expertMode = createMetadataExpertMode({
        container,
        preferences: mockPreferences,
      })

      expect(expertMode).toBeDefined()
      expect(expertMode.render).toBeDefined()
      expect(expertMode.show).toBeDefined()
      expect(expertMode.hide).toBeDefined()
      expect(expertMode.isEnabled).toBeDefined()
      expect(expertMode.setEnabled).toBeDefined()
      expect(expertMode.destroy).toBeDefined()
      expect(expertMode.on).toBeDefined()
      expect(expertMode.off).toBeDefined()
      expect(expertMode.once).toBeDefined()
    })

    it('should initialize with disabled expert mode by default', () => {
      expertMode = createMetadataExpertMode({
        container,
        preferences: mockPreferences,
      })

      expect(expertMode.isEnabled()).toBe(false)
      expect(mockPreferences.getExpertMode).toHaveBeenCalled()
    })

    it('should initialize with enabled expert mode if preference is set', () => {
      ;(mockPreferences.getExpertMode as ReturnType<typeof vi.fn>).mockReturnValue(true)

      expertMode = createMetadataExpertMode({
        container,
        preferences: mockPreferences,
      })

      expect(expertMode.isEnabled()).toBe(true)
    })
  })

  describe('UI Rendering', () => {
    beforeEach(() => {
      expertMode = createMetadataExpertMode({
        container,
        preferences: mockPreferences,
      })
    })

    it('should render component HTML structure', () => {
      expertMode.render()

      expect(container.querySelector('.metadata-expert-mode')).toBeTruthy()
      expect(container.querySelector('.expert-mode-header')).toBeTruthy()
      expect(container.querySelector('.expert-mode-title')).toBeTruthy()
      expect(container.querySelector('.expert-mode-toggle')).toBeTruthy()
      expect(container.querySelector('input[type="checkbox"]')).toBeTruthy()
      expect(container.querySelector('.expert-mode-description')).toBeTruthy()
      expect(container.querySelector('.expert-mode-features')).toBeTruthy()
    })

    it('should render with correct initial checked state (disabled)', () => {
      expertMode.render()

      const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement
      expect(checkbox.checked).toBe(false)
    })

    it('should render with correct initial checked state (enabled)', () => {
      ;(mockPreferences.getExpertMode as ReturnType<typeof vi.fn>).mockReturnValue(true)

      expertMode = createMetadataExpertMode({
        container,
        preferences: mockPreferences,
      })
      expertMode.render()

      const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement
      expect(checkbox.checked).toBe(true)
    })

    it('should display correct description text when disabled', () => {
      expertMode.render()

      const description = container.querySelector('.expert-mode-description')
      expect(description?.textContent).toContain('Standard mode active')
      expect(description?.textContent).toContain(
        'Toggle expert mode to reveal advanced metadata management',
      )
    })

    it('should display correct description text when enabled', () => {
      ;(mockPreferences.getExpertMode as ReturnType<typeof vi.fn>).mockReturnValue(true)

      expertMode = createMetadataExpertMode({
        container,
        preferences: mockPreferences,
      })
      expertMode.render()

      const description = container.querySelector('.expert-mode-description')
      expect(description?.textContent).toContain('Advanced features enabled')
      expect(description?.textContent).toContain('Detailed debugging panels')
    })

    it('should render feature list', () => {
      expertMode.render()

      const features = container.querySelectorAll('.expert-mode-features li')
      expect(features.length).toBeGreaterThan(0)
      expect(features[0]?.textContent).toContain('Detailed operation logs')
    })

    it('should have proper ARIA attributes', () => {
      expertMode.render()

      const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement
      const description = container.querySelector('.expert-mode-description') as HTMLElement

      expect(checkbox.getAttribute('aria-label')).toBe('Toggle expert mode')
      expect(checkbox.getAttribute('aria-describedby')).toBe('expert-mode-description')
      expect(description.getAttribute('role')).toBe('status')
      expect(description.getAttribute('aria-live')).toBe('polite')
    })
  })

  describe('Toggle Interaction', () => {
    beforeEach(() => {
      expertMode = createMetadataExpertMode({
        container,
        preferences: mockPreferences,
      })
      expertMode.render()
    })

    it('should update preference when checkbox is toggled', () => {
      const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement

      checkbox.click()

      expect(mockPreferences.setExpertMode).toHaveBeenCalledWith(true)
    })

    it('should emit expert-mode-changed event when toggled', () => {
      const mockListener = vi.fn()
      expertMode.on('expert-mode-changed', mockListener)

      const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement
      checkbox.click()

      expect(mockListener).toHaveBeenCalledWith({enabled: true})
    })

    it('should update description text when toggled on', () => {
      const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement
      const description = container.querySelector('.expert-mode-description') as HTMLElement

      checkbox.click()

      expect(description.textContent).toContain('Advanced features enabled')
    })

    it('should update description text when toggled off', () => {
      // Start with enabled state
      ;(mockPreferences.getExpertMode as ReturnType<typeof vi.fn>).mockReturnValue(true)
      expertMode.destroy()
      expertMode = createMetadataExpertMode({
        container,
        preferences: mockPreferences,
      })
      expertMode.render()

      const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement
      const description = container.querySelector('.expert-mode-description') as HTMLElement

      checkbox.click()

      expect(description.textContent).toContain('Standard mode active')
    })
  })

  describe('Programmatic State Management', () => {
    beforeEach(() => {
      expertMode = createMetadataExpertMode({
        container,
        preferences: mockPreferences,
      })
      expertMode.render()
    })

    it('should enable expert mode programmatically', () => {
      expertMode.setEnabled(true)

      expect(mockPreferences.setExpertMode).toHaveBeenCalledWith(true)
      expect(expertMode.isEnabled()).toBe(true)
    })

    it('should disable expert mode programmatically', () => {
      expertMode.setEnabled(false)

      expect(mockPreferences.setExpertMode).toHaveBeenCalledWith(false)
      expect(expertMode.isEnabled()).toBe(false)
    })

    it('should update UI when enabled programmatically', () => {
      expertMode.setEnabled(true)

      const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement
      const description = container.querySelector('.expert-mode-description') as HTMLElement

      expect(checkbox.checked).toBe(true)
      expect(description.textContent).toContain('Advanced features enabled')
    })

    it('should emit event when enabled programmatically', () => {
      const mockListener = vi.fn()
      expertMode.on('expert-mode-changed', mockListener)

      expertMode.setEnabled(true)

      expect(mockListener).toHaveBeenCalledWith({enabled: true})
    })
  })

  describe('Visibility Management', () => {
    beforeEach(() => {
      expertMode = createMetadataExpertMode({
        container,
        preferences: mockPreferences,
      })
      expertMode.render()
    })

    it('should show component', () => {
      expertMode.hide()
      expertMode.show()

      const wrapper = container.querySelector('.metadata-expert-mode') as HTMLElement
      expect(wrapper.style.display).not.toBe('none')
    })

    it('should hide component', () => {
      expertMode.hide()

      const wrapper = container.querySelector('.metadata-expert-mode') as HTMLElement
      expect(wrapper.style.display).toBe('none')
    })

    it('should initialize with correct visibility', () => {
      // Test with initiallyVisible: false
      expertMode.destroy()
      expertMode = createMetadataExpertMode({
        container,
        preferences: mockPreferences,
        initiallyVisible: false,
      })
      expertMode.render()

      const wrapper = container.querySelector('.metadata-expert-mode') as HTMLElement
      expect(wrapper.style.display).toBe('none')
    })
  })

  describe('Event Emitter Methods', () => {
    beforeEach(() => {
      expertMode = createMetadataExpertMode({
        container,
        preferences: mockPreferences,
      })
      expertMode.render()
    })

    it('should support on() for event listening', () => {
      const mockListener = vi.fn()
      expertMode.on('expert-mode-changed', mockListener)

      expertMode.setEnabled(true)

      expect(mockListener).toHaveBeenCalled()
    })

    it('should support off() for removing listeners', () => {
      const mockListener = vi.fn()
      expertMode.on('expert-mode-changed', mockListener)
      expertMode.off('expert-mode-changed', mockListener)

      expertMode.setEnabled(true)

      expect(mockListener).not.toHaveBeenCalled()
    })

    it('should support once() for one-time listeners', () => {
      const mockListener = vi.fn()
      expertMode.once('expert-mode-changed', mockListener)

      expertMode.setEnabled(true)
      expertMode.setEnabled(false)

      expect(mockListener).toHaveBeenCalledTimes(1)
    })
  })

  describe('Cleanup', () => {
    beforeEach(() => {
      expertMode = createMetadataExpertMode({
        container,
        preferences: mockPreferences,
      })
      expertMode.render()
    })

    it('should clean up DOM on destroy', () => {
      expertMode.destroy()

      expect(container.innerHTML).toBe('')
    })

    it('should remove event listeners on destroy', () => {
      const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement

      expertMode.destroy()

      checkbox.click() // Should not trigger anything

      expect(mockPreferences.setExpertMode).not.toHaveBeenCalled()
    })
  })
})
