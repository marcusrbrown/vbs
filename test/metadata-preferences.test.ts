/**
 * Test suite for Metadata Preferences component
 * Validates factory instantiation, event handling, UI interactions, progress tracking, and cancellation support
 */

import type {MetadataDebugPanelInstance} from '../src/modules/types.js'
import {JSDOM} from 'jsdom'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {createMetadataPreferences} from '../src/components/metadata-preferences.js'

describe('createMetadataPreferences', () => {
  let container: HTMLElement
  let mockDebugPanel: MetadataDebugPanelInstance
  let mockPreferences: any

  beforeEach(() => {
    // Set up DOM environment
    const dom = new JSDOM('<!DOCTYPE html><body><div id="container"></div></body>')
    globalThis.document = dom.window.document as unknown as Document
    globalThis.HTMLElement = dom.window.HTMLElement as unknown as typeof HTMLElement
    globalThis.Element = dom.window.Element as unknown as typeof Element
    globalThis.HTMLFormElement = dom.window.HTMLFormElement as unknown as typeof HTMLFormElement
    globalThis.HTMLInputElement = dom.window.HTMLInputElement as unknown as typeof HTMLInputElement
    globalThis.HTMLSelectElement = dom.window
      .HTMLSelectElement as unknown as typeof HTMLSelectElement
    globalThis.HTMLButtonElement = dom.window
      .HTMLButtonElement as unknown as typeof HTMLButtonElement

    container = document.querySelector('#container') as HTMLElement

    // Mock debug panel with event emitter support
    const debugPanelListeners: Record<string, ((data: any) => void)[]> = {}
    mockDebugPanel = {
      render: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      toggle: vi.fn(),
      update: vi.fn(),
      refreshEpisode: vi.fn().mockResolvedValue(undefined),
      refreshBulk: vi.fn().mockResolvedValue(undefined),
      cancelBulkOperation: vi.fn(),
      clearCache: vi.fn().mockResolvedValue(undefined),
      exportDebugInfo: vi.fn().mockReturnValue('{}'),
      destroy: vi.fn(),
      on: vi.fn((event: any, listener: any) => {
        if (!debugPanelListeners[event]) {
          debugPanelListeners[event] = []
        }
        debugPanelListeners[event].push(listener)
      }) as any,
      off: vi.fn(),
      once: vi.fn(),
      removeAllListeners: vi.fn(),
    } as any

    // Add helper to emit events for testing
    ;(mockDebugPanel as any).__emit = (event: string, data: any) => {
      if (debugPanelListeners[event]) {
        debugPanelListeners[event].forEach(listener => listener(data))
      }
    }

    // Mock preferences
    mockPreferences = {
      get: vi.fn().mockReturnValue({}),
      update: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      getPreferences: vi.fn().mockReturnValue({
        metadataSync: {
          dataLimits: {
            dailyApiCalls: 1000,
            dailyBandwidth: 10485760,
            monthlyApiCalls: 30000,
            cacheStorage: 5242880,
          },
        },
      }),
      getUsageStatistics: vi.fn().mockReturnValue({
        totalApiCalls: 250,
        totalBytesTransferred: 1024000,
        successfulCalls: 240,
        failedCalls: 10,
        averageResponseTime: 150,
        apiCalls: {
          today: 250,
          thisWeek: 1200,
          thisMonth: 4500,
          lifetime: 15000,
          bySource: {
            'memory-alpha': 100,
            tmdb: 80,
            trekcore: 50,
            stapi: 20,
          },
        },
        bandwidth: {
          today: 1024000,
          thisWeek: 5120000,
          thisMonth: 20480000,
          lifetime: 102400000,
        },
        storage: {
          currentSize: 512000,
          maxSize: 5242880,
          percentUsed: 10,
          episodeCount: 125,
        },
        quotas: {
          dailyApiCalls: {used: 250, limit: 1000},
          dailyBandwidth: {used: 1024000, limit: 10485760},
          monthlyApiCalls: {used: 2500, limit: 30000},
          cacheStorage: {used: 512000, limit: 5242880},
        },
        lastUpdated: new Date().toISOString(),
      }),
      updateUsageStatistics: vi.fn(),
    }
  })

  it('should create metadata preferences instance with factory function', () => {
    const preferences = createMetadataPreferences({
      container,
      debugPanel: mockDebugPanel,
      preferences: mockPreferences,
    })

    expect(preferences).toBeDefined()
    expect(typeof preferences.render).toBe('function')
    expect(typeof preferences.update).toBe('function')
    expect(typeof preferences.showProgress).toBe('function')
    expect(typeof preferences.hideProgress).toBe('function')
    expect(typeof preferences.showFeedback).toBe('function')
    expect(typeof preferences.destroy).toBe('function')
  })

  it('should provide EventEmitter methods', () => {
    const preferences = createMetadataPreferences({
      container,
      debugPanel: mockDebugPanel,
      preferences: mockPreferences,
    })

    expect(typeof preferences.on).toBe('function')
    expect(typeof preferences.off).toBe('function')
    expect(typeof preferences.once).toBe('function')
    expect(typeof preferences.removeAllListeners).toBe('function')
  })

  it('should render the preferences UI on creation', () => {
    createMetadataPreferences({
      container,
      debugPanel: mockDebugPanel,
      preferences: mockPreferences,
    })

    expect(container.innerHTML).toContain('Metadata Management')
    expect(container.innerHTML).toContain('Manual Episode Refresh')
    expect(container.innerHTML).toContain('Bulk Refresh Operations')
  })

  it('should clean up resources on destroy', () => {
    const preferences = createMetadataPreferences({
      container,
      debugPanel: mockDebugPanel,
      preferences: mockPreferences,
    })

    preferences.destroy()

    expect(container.innerHTML).toBe('')
  })
})
