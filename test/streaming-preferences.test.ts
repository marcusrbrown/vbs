import type {StreamingApiInstance, StreamingPreferences} from '../src/modules/types.js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {
  createStreamingPreferencesModal,
  createStreamingPreferencesUI,
} from '../src/components/streaming-preferences.js'

const defaultPreferences: StreamingPreferences = {
  preferredPlatforms: ['netflix'],
  hideUnavailable: false,
  showPricing: true,
  location: {region: 'US', allowAutoDetection: false, showOtherRegions: false, locale: 'en-US'},
  enableNotifications: true,
  maxPrice: {rent: 5.99, buy: 14.99, currency: 'USD'},
}

const createMockApi = () => {
  const setPreferences = vi.fn()
  const api = {
    getPreferences: vi.fn(() => defaultPreferences),
    setPreferences,
  } as unknown as StreamingApiInstance
  return {api, setPreferences}
}

describe('StreamingPreferences component', () => {
  let container: HTMLElement

  beforeEach(() => {
    vi.useFakeTimers()
    container = document.createElement('div')
    document.body.append(container)
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('renders the preferences form and returns a destroy handle', () => {
    const {api} = createMockApi()
    const ui = createStreamingPreferencesUI({container, streamingApi: api})

    expect(container.querySelector('.streaming-preferences-form')).not.toBeNull()
    expect(typeof ui.destroy).toBe('function')
  })

  it('destroy() clears the container and is idempotent', () => {
    const {api} = createMockApi()
    const ui = createStreamingPreferencesUI({container, streamingApi: api})

    ui.destroy()

    expect(container.innerHTML).toBe('')
    expect(() => ui.destroy()).not.toThrow()
  })

  it('destroy() cancels a pending debounced save', () => {
    const {api, setPreferences} = createMockApi()
    const ui = createStreamingPreferencesUI({container, streamingApi: api})

    const input = container.querySelector('input') as HTMLInputElement
    input.dispatchEvent(new Event('change'))
    ui.destroy()
    vi.advanceTimersByTime(2000)

    expect(setPreferences).not.toHaveBeenCalled()
  })

  it('debounced auto-save still runs when the component is not destroyed', () => {
    const {api, setPreferences} = createMockApi()
    createStreamingPreferencesUI({container, streamingApi: api})

    const input = container.querySelector('input') as HTMLInputElement
    input.dispatchEvent(new Event('change'))
    vi.advanceTimersByTime(1000)

    expect(setPreferences).toHaveBeenCalledTimes(1)
  })

  it('modal removes its document keydown listener on every close path', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    const {api} = createMockApi()

    createStreamingPreferencesModal(api)
    const closeButton = document.querySelector('.modal-close') as HTMLButtonElement
    closeButton.click()

    expect(document.querySelector('.streaming-preferences-modal-overlay')).toBeNull()
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))

    removeSpy.mockRestore()
  })
})
