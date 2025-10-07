import type {ProgressExportData, StorageEvents} from './types.js'
import {withErrorHandling, withSyncErrorHandling} from './error-handler.js'
import {createEventEmitter} from './events.js'
import {isMigrationNeeded, performMigration} from './migration.js'
import {versionManager} from './version-manager.js'

const STORAGE_KEY = 'starTrekProgress'
const EPISODE_STORAGE_KEY = 'starTrekEpisodeProgress'
const STORAGE_VERSION_KEY = 'starTrekStorageVersion'

/**
 * Enhanced progress data structure supporting both season and episode level tracking.
 */
export interface EnhancedProgressData {
  version: '2.0'
  timestamp: string
  seasonProgress: string[] // Legacy season-level progress
  episodeProgress: string[] // New episode-level progress
  migrationInfo?: {
    migratedFrom: string
    migrationDate: string
    originalItemCount: number
  }
}

/**
 * Storage version information for migration tracking.
 */
export interface StorageVersionInfo {
  currentVersion: '1.0' | '2.0'
  lastUpdated: string
  migrationHistory: {
    from: string
    to: string
    timestamp: string
    success: boolean
  }[]
}

// Storage event emitter for type-safe event handling
const storageEventEmitter = createEventEmitter<StorageEvents>()

// Export the event emitter for external usage
export {storageEventEmitter}

// Generic Storage Utilities

export interface StorageAdapter<T> {
  save: (key: string, data: T) => Promise<void> | void
  load: (key: string) => Promise<T | null> | T | null
  remove: (key: string) => Promise<void> | void
  clear: () => Promise<void> | void
  exists: (key: string) => Promise<boolean> | boolean
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

// IndexedDB adapter for async storage operations
export class IndexedDBAdapter<T> implements StorageAdapter<T> {
  private readonly dbName: string
  private readonly storeName: string
  private readonly version: number
  private readonly options: StorageValidationOptions<T>

  constructor(
    dbName = 'StarTrekVBS',
    storeName = 'progress',
    version = 1,
    options: StorageValidationOptions<T> = {},
  ) {
    this.dbName = dbName
    this.storeName = storeName
    this.version = version
    this.options = options
  }

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.addEventListener('error', () => reject(new Error('Failed to open IndexedDB')))
      request.addEventListener('success', () => resolve(request.result))

      request.addEventListener('upgradeneeded', event => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName)
        }
      })
    })
  }

  async save(key: string, data: T): Promise<void> {
    try {
      const sanitizedData = this.options.sanitize ? this.options.sanitize(data) : data
      const db = await this.openDB()
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)

      return new Promise((resolve, reject) => {
        const request = store.put(sanitizedData, key)
        request.addEventListener('error', () =>
          reject(new Error('Failed to save data to IndexedDB')),
        )
        request.addEventListener('success', () => resolve())
      })
    } catch (error) {
      throw new Error(`Failed to save data to IndexedDB: ${error}`)
    }
  }

  async load(key: string): Promise<T | null> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)

      return new Promise(resolve => {
        const request = store.get(key)
        request.addEventListener('error', () => {
          console.error('Error loading data from IndexedDB')
          resolve(this.options.fallback ?? null)
        })
        request.addEventListener('success', () => {
          const result = request.result

          if (result === undefined) {
            return resolve(this.options.fallback ?? null)
          }

          if (this.options.validate && !this.options.validate(result)) {
            console.warn(`Invalid data format for key "${key}", using fallback`)
            return resolve(this.options.fallback ?? null)
          }

          resolve(result as T)
        })
      })
    } catch (error) {
      console.error(`Error loading data from IndexedDB: ${error}`)
      return this.options.fallback ?? null
    }
  }

  async remove(key: string): Promise<void> {
    const db = await this.openDB()
    const transaction = db.transaction([this.storeName], 'readwrite')
    const store = transaction.objectStore(this.storeName)

    return new Promise((resolve, reject) => {
      const request = store.delete(key)
      request.addEventListener('error', () =>
        reject(new Error('Failed to remove data from IndexedDB')),
      )
      request.addEventListener('success', () => resolve())
    })
  }

  async clear(): Promise<void> {
    const db = await this.openDB()
    const transaction = db.transaction([this.storeName], 'readwrite')
    const store = transaction.objectStore(this.storeName)

    return new Promise((resolve, reject) => {
      const request = store.clear()
      request.addEventListener('error', () => reject(new Error('Failed to clear IndexedDB')))
      request.addEventListener('success', () => resolve())
    })
  }

  async exists(key: string): Promise<boolean> {
    const db = await this.openDB()
    const transaction = db.transaction([this.storeName], 'readonly')
    const store = transaction.objectStore(this.storeName)

    return new Promise((resolve, reject) => {
      const request = store.count(key)
      request.addEventListener('error', () =>
        reject(new Error('Failed to check existence in IndexedDB')),
      )
      request.addEventListener('success', () => resolve(request.result > 0))
    })
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

// Enhanced Migration Detection and Storage Strategy System

/**
 * Storage migration strategy information.
 */
export interface StorageMigrationStrategy {
  needsLocalStorageToIndexedDB: boolean
  needsSeasonToEpisode: boolean
  canAutoMigrate: boolean
  requiresUserConsent: boolean
  estimatedDataSize: number
  migrationSteps: string[]
}

/**
 * Enhanced migration detection that checks both storage backend and data format.
 */
export const detectMigrationNeeds = withSyncErrorHandling((): StorageMigrationStrategy => {
  // Initialize version management
  versionManager.initializeVersions()

  // Check if IndexedDB is available
  const indexedDBAvailable = 'indexedDB' in window && indexedDB !== null

  // Check current storage usage
  const hasLocalStorageData =
    localStorage.getItem(STORAGE_KEY) !== null || localStorage.getItem(EPISODE_STORAGE_KEY) !== null

  // Check version requirements
  const versionMigration = versionManager.isMigrationNeeded()

  // Load current progress to check format
  const localStorageProgress = localStorage.getItem(STORAGE_KEY)
  const currentProgress: string[] = localStorageProgress ? JSON.parse(localStorageProgress) : []

  // Check if season-to-episode migration is needed
  const needsDataMigration = isMigrationNeeded(currentProgress)

  // Estimate data size for migration planning
  const estimatedSize = new Blob([localStorageProgress || '']).size

  const strategy: StorageMigrationStrategy = {
    needsLocalStorageToIndexedDB: indexedDBAvailable && hasLocalStorageData,
    needsSeasonToEpisode: needsDataMigration,
    canAutoMigrate: indexedDBAvailable && estimatedSize < 1024 * 1024, // Auto-migrate if < 1MB
    requiresUserConsent: estimatedSize >= 1024 * 100, // Require consent if >= 100KB
    estimatedDataSize: estimatedSize,
    migrationSteps: [],
  }

  // Build migration steps list
  if (strategy.needsLocalStorageToIndexedDB) {
    strategy.migrationSteps.push('Transfer data from LocalStorage to IndexedDB')
  }

  if (strategy.needsSeasonToEpisode) {
    strategy.migrationSteps.push('Convert season-level progress to episode-level tracking')
  }

  if (versionMigration.needed) {
    strategy.migrationSteps.push(`Update schema versions: ${versionMigration.schemas.join(', ')}`)
  }

  return strategy
}, 'detectMigrationNeeds')

/**
 * Check if IndexedDB storage should be used based on availability and migration status.
 */
export const shouldUseIndexedDB = withSyncErrorHandling((): boolean => {
  // Check browser support
  if (!('indexedDB' in window) || indexedDB === null) {
    return false
  }

  // Check migration strategy
  const strategy = detectMigrationNeeds()

  if (!strategy) {
    // If detection fails, fall back to LocalStorage
    return false
  }

  // Use IndexedDB if:
  // 1. No migration needed, OR
  // 2. Migration needed but can auto-migrate
  return !strategy.needsLocalStorageToIndexedDB || strategy.canAutoMigrate
}, 'shouldUseIndexedDB')

/**
 * Get the appropriate storage adapter based on migration status and browser capabilities.
 */
export const getOptimalStorageAdapter = withSyncErrorHandling(
  <T>(options: StorageValidationOptions<T> = {}): StorageAdapter<T> => {
    const useIndexedDB = shouldUseIndexedDB()

    if (useIndexedDB) {
      // Emit event for potential UI updates
      storageEventEmitter.emit('storageAdapterChanged', {
        newAdapter: 'IndexedDB',
        oldAdapter: 'LocalStorage',
        reason: 'optimization',
      })

      return new IndexedDBAdapter<T>('StarTrekVBS', 'progress', 1, options)
    } else {
      // Fall back to LocalStorage
      storageEventEmitter.emit('storageAdapterChanged', {
        newAdapter: 'LocalStorage',
        oldAdapter: 'IndexedDB',
        reason: 'fallback',
      })

      return new LocalStorageAdapter<T>(options)
    }
  },
  'getOptimalStorageAdapter',
)

/**
 * Perform automatic migration if safe to do so.
 */
export const performAutomaticMigration = withErrorHandling(
  async (): Promise<{
    success: boolean
    strategy: StorageMigrationStrategy | null
    errors: string[]
  }> => {
    const strategy = detectMigrationNeeds()
    const errors: string[] = []

    if (!strategy) {
      return {
        success: false,
        strategy: null,
        errors: ['Failed to detect migration needs'],
      }
    }

    // Only proceed with automatic migration if safe
    if (!strategy.canAutoMigrate) {
      return {
        success: false,
        strategy,
        errors: ['Automatic migration not safe - user consent required'],
      }
    }

    try {
      // Perform season-to-episode migration if needed
      if (strategy.needsSeasonToEpisode) {
        const currentProgress = localStorage.getItem(STORAGE_KEY)
        if (currentProgress) {
          const progress = JSON.parse(currentProgress) as string[]
          const migrationResult = performMigration(progress)

          if (migrationResult.success) {
            // Update storage with migrated data
            localStorage.setItem(STORAGE_KEY, JSON.stringify(migrationResult.migratedItems))

            // Emit migration success event
            storageEventEmitter.emit('migrationCompleted', {
              from: 'season-level',
              to: 'episode-level',
              itemCount: migrationResult.migratedItems.length,
              backupAvailable: migrationResult.canRollback,
            })
          } else {
            errors.push(...migrationResult.errors)
          }
        }
      }

      // Perform LocalStorage to IndexedDB migration if needed
      if (strategy.needsLocalStorageToIndexedDB && errors.length === 0) {
        const localData = localStorage.getItem(STORAGE_KEY)
        if (localData) {
          const adapter = new IndexedDBAdapter<string[]>('StarTrekVBS', 'progress', 1)
          await adapter.save(STORAGE_KEY, JSON.parse(localData))

          // Verify the migration
          const verified = await adapter.load(STORAGE_KEY)
          if (verified) {
            // Emit successful storage migration event
            storageEventEmitter.emit('storageBackendMigrated', {
              from: 'LocalStorage',
              to: 'IndexedDB',
              itemCount: JSON.parse(localData).length,
              preserveBackup: true,
            })
          } else {
            errors.push('Failed to verify IndexedDB migration')
          }
        }
      }

      // Update version tracking
      if (errors.length === 0) {
        versionManager.updateVersions({
          storage: versionManager.CURRENT_VERSIONS.storage,
          progress: versionManager.CURRENT_VERSIONS.progress,
        })
      }

      return {
        success: errors.length === 0,
        strategy,
        errors,
      }
    } catch (error) {
      errors.push(`Migration failed: ${error}`)
      return {
        success: false,
        strategy,
        errors,
      }
    }
  },
  'performAutomaticMigration',
)

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

/**
 * Type guard for enhanced progress data structure.
 */
export const isEnhancedProgressData = (data: unknown): data is EnhancedProgressData => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'version' in data &&
    'timestamp' in data &&
    'seasonProgress' in data &&
    'episodeProgress' in data &&
    (data as any).version === '2.0' &&
    typeof (data as any).timestamp === 'string' &&
    isStringArray((data as any).seasonProgress) &&
    isStringArray((data as any).episodeProgress)
  )
}

/**
 * Type guard for storage version information.
 */
export const isStorageVersionInfo = (data: unknown): data is StorageVersionInfo => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'currentVersion' in data &&
    'lastUpdated' in data &&
    'migrationHistory' in data &&
    typeof (data as any).currentVersion === 'string' &&
    typeof (data as any).lastUpdated === 'string' &&
    Array.isArray((data as any).migrationHistory)
  )
}

// Existing functions maintained for backward compatibility

// Adaptive storage instance for progress data - auto-detects optimal storage backend
let _progressStorage: ReturnType<typeof createStorage<string[]>> | null = null

const getProgressStorage = () => {
  if (!_progressStorage) {
    const adapter = getOptimalStorageAdapter<string[]>({
      validate: isStringArray,
      fallback: [],
    })
    if (!adapter) {
      throw new Error('Failed to get storage adapter')
    }
    _progressStorage = createStorage(adapter, STORAGE_KEY)
  }
  return _progressStorage
}

export const saveProgress = withErrorHandling(async (watchedItems: string[]): Promise<void> => {
  try {
    // Perform automatic migration if needed before saving
    const migrationResult = await performAutomaticMigration()
    if (migrationResult?.strategy?.needsLocalStorageToIndexedDB && !migrationResult.success) {
      // If migration is needed but failed, still proceed with LocalStorage
      console.warn('Migration needed but automatic migration failed, continuing with LocalStorage')
    }

    const storage = getProgressStorage()
    const saveResult = storage.save(watchedItems)

    // Handle both sync and async storage operations
    if (saveResult instanceof Promise) {
      await saveResult
    }

    // Emit success event with appropriate format indicator
    const adapter = shouldUseIndexedDB() ? 'IndexedDB' : 'LocalStorage'
    storageEventEmitter.emit('data-exported', {
      exportedItems: [...watchedItems],
      timestamp: new Date().toISOString(),
      format: adapter,
    })
  } catch (error) {
    storageEventEmitter.emit('storage-error', {
      operation: 'save',
      error: error instanceof Error ? error : new Error(String(error)),
      context: {itemCount: watchedItems.length},
    })
    throw error
  }
}, 'saveProgress')

export const loadProgress = withErrorHandling(async (): Promise<string[]> => {
  try {
    // Perform automatic migration if needed before loading
    const migrationResult = await performAutomaticMigration()
    if (migrationResult?.strategy?.needsLocalStorageToIndexedDB && !migrationResult.success) {
      // If migration is needed but failed, still proceed with LocalStorage
      console.warn('Migration needed but automatic migration failed, continuing with LocalStorage')
    }

    const storage = getProgressStorage()
    const loadResult = storage.load()

    // Handle both sync and async storage operations
    const loadedItems = loadResult instanceof Promise ? await loadResult : loadResult
    const finalItems = (loadedItems as string[]) || []

    // Emit success event with appropriate format indicator
    storageEventEmitter.emit('data-imported', {
      importedItems: [...finalItems],
      timestamp: new Date().toISOString(),
      version: '1.0',
    })

    return finalItems
  } catch (error) {
    storageEventEmitter.emit('storage-error', {
      operation: 'load',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    return []
  }
}, 'loadProgress')

// Enhanced storage functions for episode-level progress

/**
 * Get current storage version information.
 */
export const getStorageVersion = (): StorageVersionInfo => {
  try {
    const stored = localStorage.getItem(STORAGE_VERSION_KEY)
    if (!stored) {
      return {
        currentVersion: '1.0',
        lastUpdated: new Date().toISOString(),
        migrationHistory: [],
      }
    }

    const parsed = JSON.parse(stored)
    if (isStorageVersionInfo(parsed)) {
      return parsed
    }

    return {
      currentVersion: '1.0',
      lastUpdated: new Date().toISOString(),
      migrationHistory: [],
    }
  } catch {
    return {
      currentVersion: '1.0',
      lastUpdated: new Date().toISOString(),
      migrationHistory: [],
    }
  }
}

/**
 * Save storage version information.
 */
export const saveStorageVersion = (versionInfo: StorageVersionInfo): void => {
  try {
    localStorage.setItem(STORAGE_VERSION_KEY, JSON.stringify(versionInfo))
  } catch (error) {
    console.error('Failed to save storage version:', error)
  }
}

/**
 * Save enhanced progress data with episode-level support.
 */
export const saveEnhancedProgress = (data: EnhancedProgressData): void => {
  try {
    localStorage.setItem(EPISODE_STORAGE_KEY, JSON.stringify(data))

    storageEventEmitter.emit('data-exported', {
      exportedItems: [...data.seasonProgress, ...data.episodeProgress],
      timestamp: data.timestamp,
      format: 'enhanced-localStorage',
    })
  } catch (error) {
    storageEventEmitter.emit('storage-error', {
      operation: 'save',
      error: error instanceof Error ? error : new Error(String(error)),
      context: {
        seasonItemCount: data.seasonProgress.length,
        episodeItemCount: data.episodeProgress.length,
      },
    })
    throw error
  }
}

/**
 * Load progress with automatic migration support.
 * Detects current storage format and migrates if necessary.
 */
export const loadProgressWithMigration = async (): Promise<{
  seasonProgress: string[]
  episodeProgress: string[]
  migrationPerformed: boolean
}> => {
  try {
    const versionInfo = getStorageVersion()

    // Try to load enhanced progress data first
    const enhancedData = localStorage.getItem(EPISODE_STORAGE_KEY)
    if (enhancedData) {
      try {
        const parsed = JSON.parse(enhancedData)
        if (isEnhancedProgressData(parsed)) {
          return {
            seasonProgress: parsed.seasonProgress,
            episodeProgress: parsed.episodeProgress,
            migrationPerformed: false,
          }
        }
      } catch {
        // Fall through to legacy handling
      }
    }

    // Load legacy progress data using the new async loadProgress function
    const legacyProgress = await loadProgress()

    // Ensure we have valid progress data
    if (!legacyProgress) {
      return {
        seasonProgress: [],
        episodeProgress: [],
        migrationPerformed: false,
      }
    }

    // Check if migration is needed
    if (isMigrationNeeded(legacyProgress)) {
      const migrationResult = performMigration(legacyProgress)

      if (migrationResult.success) {
        // Save migrated data in enhanced format
        const enhancedData: EnhancedProgressData = {
          version: '2.0',
          timestamp: new Date().toISOString(),
          seasonProgress: migrationResult.backupData,
          episodeProgress: migrationResult.migratedItems,
          migrationInfo: {
            migratedFrom: 'season-level',
            migrationDate: new Date().toISOString(),
            originalItemCount: migrationResult.backupData.length,
          },
        }

        saveEnhancedProgress(enhancedData)

        // Update version info
        const newVersionInfo: StorageVersionInfo = {
          currentVersion: '2.0',
          lastUpdated: new Date().toISOString(),
          migrationHistory: [
            ...versionInfo.migrationHistory,
            {
              from: '1.0',
              to: '2.0',
              timestamp: new Date().toISOString(),
              success: true,
            },
          ],
        }
        saveStorageVersion(newVersionInfo)

        return {
          seasonProgress: enhancedData.seasonProgress,
          episodeProgress: enhancedData.episodeProgress,
          migrationPerformed: true,
        }
      }
    }

    // No migration needed or migration failed, return legacy data
    return {
      seasonProgress: legacyProgress,
      episodeProgress: [],
      migrationPerformed: false,
    }
  } catch (error) {
    storageEventEmitter.emit('storage-error', {
      operation: 'load',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    return {
      seasonProgress: [],
      episodeProgress: [],
      migrationPerformed: false,
    }
  }
}

/**
 * Save episode-level progress with automatic format handling.
 */
export const saveEpisodeProgress = (episodeIds: string[], seasonIds: string[] = []): void => {
  const data: EnhancedProgressData = {
    version: '2.0',
    timestamp: new Date().toISOString(),
    seasonProgress: seasonIds,
    episodeProgress: episodeIds,
  }

  saveEnhancedProgress(data)
}

export const exportProgress = (watchedItems: string[]): void => {
  try {
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

    // Emit success event
    storageEventEmitter.emit('data-exported', {
      exportedItems: [...watchedItems],
      timestamp: data.timestamp,
      format: 'json',
    })
  } catch (error) {
    storageEventEmitter.emit('storage-error', {
      operation: 'export',
      error: error instanceof Error ? error : new Error(String(error)),
      context: {itemCount: watchedItems.length},
    })
    throw error
  }
}

export const importProgressFromFile = async (file: File): Promise<string[]> => {
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    if (data.progress && Array.isArray(data.progress)) {
      // Emit success event
      storageEventEmitter.emit('data-imported', {
        importedItems: [...data.progress],
        timestamp: data.timestamp || new Date().toISOString(),
        version: data.version || '1.0',
      })

      return data.progress
    } else {
      const error = new Error('Invalid progress file format')
      storageEventEmitter.emit('storage-error', {
        operation: 'import',
        error,
        context: {fileName: file.name, fileSize: file.size},
      })
      throw error
    }
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error('Error reading progress file')
    storageEventEmitter.emit('storage-error', {
      operation: 'import',
      error: errorObj,
      context: {fileName: file.name, fileSize: file.size},
    })
    throw errorObj
  }
}
