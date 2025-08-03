import type {ProgressExportData} from './types.js'

const STORAGE_KEY = 'starTrekProgress'

// Generic Storage Utilities

export interface StorageAdapter<T> {
  save(key: string, data: T): Promise<void> | void
  load(key: string): Promise<T | null> | T | null
  remove(key: string): Promise<void> | void
  clear(): Promise<void> | void
  exists(key: string): Promise<boolean> | boolean
}

export interface StorageValidationOptions<T> {
  validate?: (data: unknown) => data is T
  sanitize?: (data: T) => T
  fallback?: T
}

export class LocalStorageAdapter<T> implements StorageAdapter<T> {
  private readonly options: StorageValidationOptions<T>

  constructor(options: StorageValidationOptions<T> = {}) {
    this.options = options
  }

  save(key: string, data: T): void {
    try {
      const sanitizedData = this.options.sanitize ? this.options.sanitize(data) : data
      localStorage.setItem(key, JSON.stringify(sanitizedData))
    } catch (error) {
      throw new Error(`Failed to save data to localStorage: ${error}`)
    }
  }

  load(key: string): T | null {
    try {
      const stored = localStorage.getItem(key)
      if (!stored) {
        return this.options.fallback ?? null
      }

      const parsed = JSON.parse(stored)

      if (this.options.validate && !this.options.validate(parsed)) {
        console.warn(`Invalid data format for key "${key}", using fallback`)
        return this.options.fallback ?? null
      }

      return parsed as T
    } catch (error) {
      console.error(`Error loading data from localStorage: ${error}`)
      return this.options.fallback ?? null
    }
  }

  remove(key: string): void {
    localStorage.removeItem(key)
  }

  clear(): void {
    localStorage.clear()
  }

  exists(key: string): boolean {
    return localStorage.getItem(key) !== null
  }
}

// Generic storage utility functions
export const createStorage = <T>(
  adapter: StorageAdapter<T>,
  defaultKey?: string,
): {
  save: (keyOrData: string | T, data?: T) => Promise<void> | void
  load: (key?: string) => Promise<T | null> | T | null
  remove: (key?: string) => Promise<void> | void
  clear: () => Promise<void> | void
  exists: (key?: string) => Promise<boolean> | boolean
} => {
  return {
    save: (keyOrData: string | T, data?: T): Promise<void> | void => {
      if (typeof keyOrData === 'string' && data !== undefined) {
        return adapter.save(keyOrData, data)
      } else if (defaultKey && typeof keyOrData !== 'string') {
        return adapter.save(defaultKey, keyOrData)
      } else {
        throw new Error('Invalid arguments: provide either (key, data) or data with defaultKey')
      }
    },
    load: (key?: string): Promise<T | null> | T | null => {
      const storageKey = key ?? defaultKey
      if (!storageKey) {
        throw new Error('No key provided and no default key set')
      }
      return adapter.load(storageKey)
    },
    remove: (key?: string): Promise<void> | void => {
      const storageKey = key ?? defaultKey
      if (!storageKey) {
        throw new Error('No key provided and no default key set')
      }
      return adapter.remove(storageKey)
    },
    clear: (): Promise<void> | void => adapter.clear(),
    exists: (key?: string): Promise<boolean> | boolean => {
      const storageKey = key ?? defaultKey
      if (!storageKey) {
        throw new Error('No key provided and no default key set')
      }
      return adapter.exists(storageKey)
    },
  }
}

// Type guards for data validation
export const isStringArray = (data: unknown): data is string[] => {
  return Array.isArray(data) && data.every(item => typeof item === 'string')
}

export const isProgressExportData = (data: unknown): data is ProgressExportData => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'version' in data &&
    'timestamp' in data &&
    'progress' in data &&
    typeof (data as any).version === 'string' &&
    typeof (data as any).timestamp === 'string' &&
    isStringArray((data as any).progress)
  )
}

// Existing functions maintained for backward compatibility

// Pre-configured storage instance for progress data
const progressStorage = createStorage(
  new LocalStorageAdapter<string[]>({
    validate: isStringArray,
    fallback: [],
  }),
  STORAGE_KEY,
)

export const saveProgress = (watchedItems: string[]): void => {
  progressStorage.save(watchedItems)
}

export const loadProgress = (): string[] => {
  const result = progressStorage.load()
  // LocalStorageAdapter returns synchronously, so result won't be a Promise
  return (result as string[]) || []
}

export const exportProgress = (watchedItems: string[]): void => {
  const data: ProgressExportData = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    progress: watchedItems,
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'})
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `star-trek-progress-${new Date().toISOString().split('T')[0]}.json`
  document.body.append(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export const importProgressFromFile = async (file: File): Promise<string[]> => {
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    if (data.progress && Array.isArray(data.progress)) {
      return data.progress
    } else {
      throw new Error('Invalid progress file format')
    }
  } catch {
    throw new Error('Error reading progress file')
  }
}
