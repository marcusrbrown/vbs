import {beforeEach, describe, expect, it} from 'vitest'
import {
  createStorage,
  isProgressExportData,
  isStringArray,
  loadProgress,
  LocalStorageAdapter,
  saveProgress,
} from '../src/modules/storage.js'

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: (key: string): string | null => localStorageMock.store[key] || null,
  setItem: (key: string, value: string): void => {
    localStorageMock.store[key] = value
  },
  removeItem: (key: string): void => {
    delete localStorageMock.store[key]
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

describe('Generic Storage Utilities', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  describe('LocalStorageAdapter', () => {
    it('should save and load data with type safety', () => {
      const adapter = new LocalStorageAdapter<string[]>({
        validate: isStringArray,
        fallback: [],
      })

      const testData = ['item1', 'item2']
      adapter.save('test-key', testData)

      const loaded = adapter.load('test-key')
      expect(loaded).toEqual(testData)
    })

    it('should return fallback for invalid data', () => {
      const adapter = new LocalStorageAdapter<string[]>({
        validate: isStringArray,
        fallback: ['fallback'],
      })

      localStorage.setItem('test-key', '"not-an-array"')

      const loaded = adapter.load('test-key')
      expect(loaded).toEqual(['fallback'])
    })

    it('should return null when no fallback provided and no data exists', () => {
      const adapter = new LocalStorageAdapter<string[]>()

      const loaded = adapter.load('nonexistent-key')
      expect(loaded).toBeNull()
    })

    it('should check if key exists', () => {
      const adapter = new LocalStorageAdapter<string>()

      expect(adapter.exists('test-key')).toBe(false)

      adapter.save('test-key', 'test-value')
      expect(adapter.exists('test-key')).toBe(true)
    })

    it('should remove data', () => {
      const adapter = new LocalStorageAdapter<string>()

      adapter.save('test-key', 'test-value')
      expect(adapter.exists('test-key')).toBe(true)

      adapter.remove('test-key')
      expect(adapter.exists('test-key')).toBe(false)
    })

    it('should sanitize data before saving', () => {
      const adapter = new LocalStorageAdapter<string>({
        sanitize: data => data.trim(),
      })

      adapter.save('test-key', '  trimmed  ')
      const loaded = adapter.load('test-key')
      expect(loaded).toBe('trimmed')
    })

    it('should handle save errors gracefully', () => {
      const adapter = new LocalStorageAdapter<object>()

      // Create circular reference to trigger JSON.stringify error
      const circular: any = {}
      circular.self = circular

      expect(() => adapter.save('test-key', circular)).toThrow(
        'Failed to save data to localStorage',
      )
    })
  })

  describe('createStorage helper', () => {
    it('should work with default key', () => {
      const adapter = new LocalStorageAdapter<string[]>({
        validate: isStringArray,
        fallback: [],
      })
      const storage = createStorage(adapter, 'default-key')

      const testData = ['item1', 'item2']
      storage.save(testData)

      const loaded = storage.load()
      expect(loaded).toEqual(testData)
    })

    it('should work with explicit key', () => {
      const adapter = new LocalStorageAdapter<string>()
      const storage = createStorage(adapter)

      storage.save('explicit-key', 'test-value')

      const loaded = storage.load('explicit-key')
      expect(loaded).toBe('test-value')
    })

    it('should throw error when no key provided', () => {
      const adapter = new LocalStorageAdapter<string>()
      const storage = createStorage(adapter)

      expect(() => {
        storage.load()
      }).toThrow('No key provided and no default key set')
    })
  })

  describe('Type Guards', () => {
    it('should validate string arrays correctly', () => {
      expect(isStringArray(['item1', 'item2'])).toBe(true)
      expect(isStringArray([])).toBe(true)
      expect(isStringArray(['item1', 123])).toBe(false)
      expect(isStringArray('not-array')).toBe(false)
      expect(isStringArray(null)).toBe(false)
    })

    it('should validate progress export data correctly', () => {
      const validData = {
        version: '1.0',
        timestamp: '2023-01-01T00:00:00Z',
        progress: ['item1', 'item2'],
      }
      expect(isProgressExportData(validData)).toBe(true)

      const invalidData = {
        version: 1, // should be string
        timestamp: '2023-01-01T00:00:00Z',
        progress: ['item1', 'item2'],
      }
      expect(isProgressExportData(invalidData)).toBe(false)

      expect(isProgressExportData(null)).toBe(false)
      expect(isProgressExportData('not-object')).toBe(false)
    })
  })
})
