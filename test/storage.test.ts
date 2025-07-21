import {beforeEach, describe, expect, it} from 'vitest'
import {loadProgress, saveProgress} from '../src/modules/storage.js'

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: (key: string): string | null => localStorageMock.store[key] || null,
  setItem: (key: string, value: string): void => {
    localStorageMock.store[key] = value
  },
  clear: (): void => {
    localStorageMock.store = {}
  },
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('Storage', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  it('should save progress to localStorage', () => {
    const progress = ['item1', 'item2', 'item3']
    saveProgress(progress)

    const stored = JSON.parse(localStorage.getItem('starTrekProgress') || '[]')
    expect(stored).toEqual(progress)
  })

  it('should load progress from localStorage', () => {
    const progress = ['item1', 'item2']
    localStorage.setItem('starTrekProgress', JSON.stringify(progress))

    const loaded = loadProgress()
    expect(loaded).toEqual(progress)
  })

  it('should return empty array when no progress stored', () => {
    const loaded = loadProgress()
    expect(loaded).toEqual([])
  })

  it('should handle corrupted localStorage data', () => {
    localStorage.setItem('starTrekProgress', 'invalid-json')

    const loaded = loadProgress()
    expect(loaded).toEqual([])
  })
})
