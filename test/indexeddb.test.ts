import {beforeEach, describe, expect, it, vi} from 'vitest'
import {IndexedDBAdapter, isStringArray} from '../src/modules/storage.js'

// Mock IndexedDB for testing
const mockIDBRequest = {
  result: null as any,
  addEventListener: vi.fn(),
}

const mockObjectStore = {
  put: vi.fn(() => mockIDBRequest),
  get: vi.fn(() => mockIDBRequest),
  delete: vi.fn(() => mockIDBRequest),
  clear: vi.fn(() => mockIDBRequest),
  count: vi.fn(() => mockIDBRequest),
}

const mockTransaction = {
  objectStore: vi.fn(() => mockObjectStore),
}

const mockIDBDatabase = {
  objectStoreNames: {
    contains: vi.fn(),
  },
  createObjectStore: vi.fn(),
  transaction: vi.fn(() => mockTransaction),
}

const mockIndexedDB = {
  open: vi.fn(() => mockIDBRequest),
}

// Setup global mocks
vi.stubGlobal('indexedDB', mockIndexedDB)
vi.stubGlobal('IDBOpenDBRequest', () => mockIDBRequest)

describe('IndexedDBAdapter', () => {
  let adapter: IndexedDBAdapter<string[]>

  beforeEach(() => {
    vi.clearAllMocks()

    adapter = new IndexedDBAdapter<string[]>('TestDB', 'testStore', 1, {
      validate: isStringArray,
      fallback: [],
    })

    // Setup default mock behaviors
    mockIDBDatabase.objectStoreNames.contains.mockReturnValue(false)
    mockIDBDatabase.transaction.mockReturnValue(mockTransaction)
    mockTransaction.objectStore.mockReturnValue(mockObjectStore)

    // Default successful behavior for openDB
    mockIDBRequest.result = mockIDBDatabase
    mockIDBRequest.addEventListener.mockImplementation((event, callback) => {
      if (event === 'success') {
        // Use setTimeout to make it async
        setTimeout(callback, 0)
      }
    })
  })

  describe('constructor', () => {
    it('should use default values when no parameters provided', () => {
      const defaultAdapter = new IndexedDBAdapter<string[]>()
      expect(defaultAdapter).toBeDefined()
    })

    it('should accept custom configuration', () => {
      const customAdapter = new IndexedDBAdapter<string[]>('CustomDB', 'customStore', 2, {
        validate: isStringArray,
        fallback: ['default'],
      })
      expect(customAdapter).toBeDefined()
    })
  })

  describe('openDB', () => {
    it('should open database successfully', async () => {
      // Mock successful database opening
      mockIDBRequest.result = mockIDBDatabase
      mockIDBRequest.addEventListener.mockImplementation((event, callback) => {
        if (event === 'success') {
          callback()
        }
      })

      // Access private method via type assertion for testing
      const db = await (adapter as any).openDB()
      expect(db).toBe(mockIDBDatabase)
      expect(mockIndexedDB.open).toHaveBeenCalledWith('TestDB', 1)
    })

    it('should handle database opening errors', async () => {
      mockIDBRequest.addEventListener.mockImplementation((event, callback) => {
        if (event === 'error') {
          callback()
        }
      })

      await expect((adapter as any).openDB()).rejects.toThrow('Failed to open IndexedDB')
    })

    it('should create object store on upgrade', async () => {
      mockIDBRequest.result = mockIDBDatabase
      mockIDBDatabase.objectStoreNames.contains.mockReturnValue(false)

      mockIDBRequest.addEventListener.mockImplementation((event, callback) => {
        if (event === 'upgradeneeded') {
          callback({target: mockIDBRequest})
        } else if (event === 'success') {
          callback()
        }
      })

      await (adapter as any).openDB()

      expect(mockIDBDatabase.createObjectStore).toHaveBeenCalledWith('testStore')
    })
  })

  describe('save', () => {
    it('should save data successfully', async () => {
      const testData = ['item1', 'item2']

      // Mock for the put operation
      const putRequest = {
        result: null,
        addEventListener: vi.fn((event, callback) => {
          if (event === 'success') setTimeout(callback, 0)
        }),
      }

      mockObjectStore.put.mockReturnValue(putRequest)

      await adapter.save('test-key', testData)

      expect(mockObjectStore.put).toHaveBeenCalledWith(testData, 'test-key')
    })

    it('should handle save errors', async () => {
      // Mock for the put operation that fails
      const putRequest = {
        result: null,
        addEventListener: vi.fn((event, callback) => {
          if (event === 'error') setTimeout(callback, 0)
        }),
      }

      mockObjectStore.put.mockReturnValue(putRequest)

      await expect(adapter.save('test-key', ['data'])).rejects.toThrow(
        'Failed to save data to IndexedDB',
      )
    })

    it('should sanitize data if sanitize function provided', async () => {
      const sanitizer = vi.fn((data: string[]) => data.map(item => item.toUpperCase()))
      const adapterWithSanitizer = new IndexedDBAdapter<string[]>('TestDB', 'testStore', 1, {
        sanitize: sanitizer,
      })

      // Mock for the put operation
      const putRequest = {
        result: null,
        addEventListener: vi.fn((event, callback) => {
          if (event === 'success') setTimeout(callback, 0)
        }),
      }

      mockObjectStore.put.mockReturnValue(putRequest)

      await adapterWithSanitizer.save('test-key', ['item1', 'item2'])

      expect(sanitizer).toHaveBeenCalledWith(['item1', 'item2'])
      expect(mockObjectStore.put).toHaveBeenCalledWith(['ITEM1', 'ITEM2'], 'test-key')
    })
  })

  describe('load', () => {
    it('should load data successfully', async () => {
      const testData = ['item1', 'item2']

      // Mock for the get operation
      const getRequest = {
        result: testData,
        addEventListener: vi.fn((event, callback) => {
          if (event === 'success') setTimeout(callback, 0)
        }),
      }

      mockObjectStore.get.mockReturnValue(getRequest)

      const result = await adapter.load('test-key')

      expect(result).toEqual(testData)
      expect(mockObjectStore.get).toHaveBeenCalledWith('test-key')
    })

    it('should return fallback when data not found', async () => {
      // Mock for the get operation that returns undefined
      const getRequest = {
        result: undefined,
        addEventListener: vi.fn((event, callback) => {
          if (event === 'success') setTimeout(callback, 0)
        }),
      }

      mockObjectStore.get.mockReturnValue(getRequest)

      const result = await adapter.load('test-key')

      expect(result).toEqual([])
    })

    it('should return fallback for invalid data', async () => {
      const invalidData = 'not-an-array'

      // Mock for the get operation that returns invalid data
      const getRequest = {
        result: invalidData,
        addEventListener: vi.fn((event, callback) => {
          if (event === 'success') setTimeout(callback, 0)
        }),
      }

      mockObjectStore.get.mockReturnValue(getRequest)

      const result = await adapter.load('test-key')

      expect(result).toEqual([])
    })

    it('should handle load errors', async () => {
      // Mock for the get operation that fails
      const getRequest = {
        result: null,
        addEventListener: vi.fn((event, callback) => {
          if (event === 'error') setTimeout(callback, 0)
        }),
      }

      mockObjectStore.get.mockReturnValue(getRequest)

      const result = await adapter.load('test-key')

      expect(result).toEqual([])
    })
  })

  describe('remove', () => {
    it('should remove data successfully', async () => {
      // Mock for the delete operation
      const deleteRequest = {
        result: null,
        addEventListener: vi.fn((event, callback) => {
          if (event === 'success') setTimeout(callback, 0)
        }),
      }

      mockObjectStore.delete.mockReturnValue(deleteRequest)

      await adapter.remove('test-key')

      expect(mockObjectStore.delete).toHaveBeenCalledWith('test-key')
    })

    it('should handle remove errors', async () => {
      // Mock for the delete operation that fails
      const deleteRequest = {
        result: null,
        addEventListener: vi.fn((event, callback) => {
          if (event === 'error') setTimeout(callback, 0)
        }),
      }

      mockObjectStore.delete.mockReturnValue(deleteRequest)

      await expect(adapter.remove('test-key')).rejects.toThrow(
        'Failed to remove data from IndexedDB',
      )
    })
  })

  describe('clear', () => {
    it('should clear data successfully', async () => {
      // Mock for the clear operation
      const clearRequest = {
        result: null,
        addEventListener: vi.fn((event, callback) => {
          if (event === 'success') setTimeout(callback, 0)
        }),
      }

      mockObjectStore.clear.mockReturnValue(clearRequest)

      await adapter.clear()

      expect(mockObjectStore.clear).toHaveBeenCalled()
    })

    it('should handle clear errors', async () => {
      // Mock for the clear operation that fails
      const clearRequest = {
        result: null,
        addEventListener: vi.fn((event, callback) => {
          if (event === 'error') setTimeout(callback, 0)
        }),
      }

      mockObjectStore.clear.mockReturnValue(clearRequest)

      await expect(adapter.clear()).rejects.toThrow('Failed to clear IndexedDB')
    })
  })

  describe('exists', () => {
    it('should return true when data exists', async () => {
      // Mock for the count operation that returns 1
      const countRequest = {
        result: 1,
        addEventListener: vi.fn((event, callback) => {
          if (event === 'success') setTimeout(callback, 0)
        }),
      }

      mockObjectStore.count.mockReturnValue(countRequest)

      const result = await adapter.exists('test-key')

      expect(result).toBe(true)
      expect(mockObjectStore.count).toHaveBeenCalledWith('test-key')
    })

    it('should return false when data does not exist', async () => {
      // Mock for the count operation that returns 0
      const countRequest = {
        result: 0,
        addEventListener: vi.fn((event, callback) => {
          if (event === 'success') setTimeout(callback, 0)
        }),
      }

      mockObjectStore.count.mockReturnValue(countRequest)

      const result = await adapter.exists('test-key')

      expect(result).toBe(false)
    })

    it('should handle exists check errors', async () => {
      // Mock for the count operation that fails
      const countRequest = {
        result: null,
        addEventListener: vi.fn((event, callback) => {
          if (event === 'error') setTimeout(callback, 0)
        }),
      }

      mockObjectStore.count.mockReturnValue(countRequest)

      await expect(adapter.exists('test-key')).rejects.toThrow(
        'Failed to check existence in IndexedDB',
      )
    })
  })
})
