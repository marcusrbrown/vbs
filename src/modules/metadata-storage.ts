/**
 * Specialized storage adapter for episode metadata with caching, quota management, and EventEmitter integration.
 * Extends existing VBS storage patterns with metadata-specific operations and IndexedDB optimization.
 *
 * Follows VBS functional factory architecture and provides comprehensive metadata storage capabilities
 * with background sync support, conflict resolution, and intelligent caching strategies.
 */

import type {StorageAdapter, StorageValidationOptions} from '../modules/storage.js'
import type {EpisodeMetadata, MetadataCache, MetadataStorageEvents} from '../modules/types.js'
import {createEventEmitter} from '../modules/events.js'
import {isValidEpisodeMetadata} from '../utils/metadata-validation.js'

/**
 * Metadata storage adapter configuration.
 */
export interface MetadataStorageConfig extends MetadataCache {
  /** Optional fallback for failed storage operations */
  fallbackAdapter?: StorageAdapter<EpisodeMetadata>
  /** Enable automatic cleanup of expired metadata */
  autoCleanup: boolean
  /** Cleanup interval in milliseconds */
  cleanupInterval: number
}

/**
 * Enhanced metadata storage adapter instance interface.
 */
export interface MetadataStorageAdapterInstance {
  /** Store episode metadata with validation and expiration tracking */
  storeMetadata(episodeId: string, metadata: EpisodeMetadata): Promise<void>
  /** Retrieve episode metadata with freshness validation */
  getMetadata(episodeId: string): Promise<EpisodeMetadata | null>
  /** Check if metadata exists and is not expired */
  hasValidMetadata(episodeId: string): Promise<boolean>
  /** Update specific metadata fields without replacing entire record */
  updateMetadataFields(episodeId: string, fields: Partial<EpisodeMetadata>): Promise<void>
  /** Remove metadata for specific episode */
  removeMetadata(episodeId: string): Promise<void>
  /** Get all metadata for bulk operations */
  getAllMetadata(): Promise<Record<string, EpisodeMetadata>>
  /** Store multiple metadata records in batch */
  storeBatchMetadata(metadataMap: Record<string, EpisodeMetadata>): Promise<void>
  /** Clean up expired metadata entries */
  cleanupExpiredMetadata(): Promise<{removedEntries: number; freedSpace: number}>
  /** Get storage usage statistics */
  getStorageStats(): Promise<{totalEntries: number; usedSpace: number; maxQuota: number}>
  /** Validate storage quota and trigger cleanup if needed */
  validateQuota(): Promise<boolean>
  /** Clear all metadata storage */
  clear(): Promise<void>

  // Generic EventEmitter methods for enhanced type safety
  /** Subscribe to an event with a type-safe listener */
  on<TEventName extends keyof MetadataStorageEvents>(
    eventName: TEventName,
    listener: (payload: MetadataStorageEvents[TEventName]) => void,
  ): void
  /** Unsubscribe from an event */
  off<TEventName extends keyof MetadataStorageEvents>(
    eventName: TEventName,
    listener: (payload: MetadataStorageEvents[TEventName]) => void,
  ): void
  /** Subscribe to an event once (auto-unsubscribe after first emission) */
  once<TEventName extends keyof MetadataStorageEvents>(
    eventName: TEventName,
    listener: (payload: MetadataStorageEvents[TEventName]) => void,
  ): void
  /** Remove all listeners for a specific event or all events */
  removeAllListeners<TEventName extends keyof MetadataStorageEvents>(eventName?: TEventName): void
}

/**
 * Enhanced IndexedDB adapter specifically for episode metadata with advanced caching features.
 */
class MetadataIndexedDBAdapter implements StorageAdapter<EpisodeMetadata> {
  private readonly dbName: string
  private readonly storeName: string
  private readonly version: number
  private readonly options: StorageValidationOptions<EpisodeMetadata>

  constructor(
    dbName: string,
    storeName: string,
    version: number,
    options: StorageValidationOptions<EpisodeMetadata> = {},
  ) {
    this.dbName = dbName
    this.storeName = storeName
    this.version = version
    this.options = {
      validate: isValidEpisodeMetadata,
      ...options,
    }
  }

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.addEventListener('error', () =>
        reject(new Error('Failed to open metadata IndexedDB')),
      )
      request.addEventListener('success', () => resolve(request.result))

      request.addEventListener('upgradeneeded', event => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, {keyPath: 'episodeId'})

          // Create indexes for efficient querying
          store.createIndex('dataSource', 'dataSource', {unique: false})
          store.createIndex('lastUpdated', 'lastUpdated', {unique: false})
          store.createIndex('enrichmentStatus', 'enrichmentStatus', {unique: false})
          store.createIndex('confidenceScore', 'confidenceScore', {unique: false})
        }
      })
    })
  }

  async save(_key: string, data: EpisodeMetadata): Promise<void> {
    try {
      const sanitizedData = this.options.sanitize ? this.options.sanitize(data) : data
      const db = await this.openDB()
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)

      return new Promise((resolve, reject) => {
        const request = store.put(sanitizedData)
        request.addEventListener('error', () =>
          reject(new Error('Failed to save metadata to IndexedDB')),
        )
        request.addEventListener('success', () => resolve())
      })
    } catch (error) {
      throw new Error(`Failed to save metadata to IndexedDB: ${error}`)
    }
  }

  async load(key: string): Promise<EpisodeMetadata | null> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)

      return new Promise(resolve => {
        const request = store.get(key)
        request.addEventListener('error', () => {
          console.error('Error loading metadata from IndexedDB')
          resolve(this.options.fallback ?? null)
        })
        request.addEventListener('success', () => {
          const result = request.result

          if (result === undefined) {
            return resolve(this.options.fallback ?? null)
          }

          if (this.options.validate && !this.options.validate(result)) {
            console.warn(`Invalid metadata format for episode "${key}", using fallback`)
            return resolve(this.options.fallback ?? null)
          }

          resolve(result as EpisodeMetadata)
        })
      })
    } catch (error) {
      console.error(`Error loading metadata from IndexedDB: ${error}`)
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
        reject(new Error('Failed to remove metadata from IndexedDB')),
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
      request.addEventListener('error', () =>
        reject(new Error('Failed to clear metadata from IndexedDB')),
      )
      request.addEventListener('success', () => resolve())
    })
  }

  async exists(key: string): Promise<boolean> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)

      return new Promise(resolve => {
        const request = store.count(key)
        request.addEventListener('error', () => resolve(false))
        request.addEventListener('success', () => resolve(request.result > 0))
      })
    } catch {
      return false
    }
  }

  async getAllEntries(): Promise<EpisodeMetadata[]> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)

      return new Promise((resolve, reject) => {
        const request = store.getAll()
        request.addEventListener('error', () =>
          reject(new Error('Failed to get all metadata entries')),
        )
        request.addEventListener('success', () => resolve(request.result))
      })
    } catch (error) {
      console.error(`Error getting all metadata entries: ${error}`)
      return []
    }
  }

  async getStorageSize(): Promise<number> {
    try {
      // Estimate storage usage based on JSON serialization
      const allEntries = await this.getAllEntries()
      const jsonString = JSON.stringify(allEntries)
      return new Blob([jsonString]).size
    } catch {
      return 0
    }
  }
}

/**
 * Factory function to create a MetadataStorageAdapter instance.
 * Follows VBS functional factory patterns with closure-based state management.
 */
export const createMetadataStorageAdapter = (
  config: MetadataStorageConfig,
): MetadataStorageAdapterInstance => {
  // Private state managed via closure
  const adapter = new MetadataIndexedDBAdapter('StarTrekVBS', config.storeName, config.version, {
    validate: isValidEpisodeMetadata,
  })

  // EventEmitter for type-safe event handling
  const eventEmitter = createEventEmitter<MetadataStorageEvents>()

  // Start automatic cleanup if enabled
  if (config.autoCleanup) {
    // Store timer reference for cleanup scheduling
    setInterval(() => {
      cleanupExpiredMetadata().catch(error => {
        console.error('Automatic metadata cleanup failed:', error)
      })
    }, config.cleanupInterval)
  }

  // Helper function to check if metadata is expired
  const isExpired = (metadata: EpisodeMetadata): boolean => {
    if (!metadata.expiresAt) {
      return false
    }
    return new Date(metadata.expiresAt).getTime() < Date.now()
  }

  // Helper function to calculate storage size
  const calculateStorageSize = (metadata: EpisodeMetadata): number => {
    return new Blob([JSON.stringify(metadata)]).size
  }

  // Core storage operations with event emission
  const storeMetadata = async (episodeId: string, metadata: EpisodeMetadata): Promise<void> => {
    try {
      // Set expiration if not provided
      if (!metadata.expiresAt) {
        const expirationTime = Date.now() + config.expiration.defaultTtl
        metadata.expiresAt = new Date(expirationTime).toISOString()
      }

      await adapter.save(episodeId, metadata)

      const storageSize = calculateStorageSize(metadata)

      eventEmitter.emit('metadata-stored', {
        episodeId,
        metadata,
        storageSize,
      })

      // Check quota after storing
      await validateQuota()
    } catch (error) {
      eventEmitter.emit('storage-error', {
        operation: 'store',
        episodeId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  const getMetadata = async (episodeId: string): Promise<EpisodeMetadata | null> => {
    try {
      const metadata = await adapter.load(episodeId)
      const fromCache = metadata !== null

      if (metadata && isExpired(metadata)) {
        // Remove expired metadata
        await adapter.remove(episodeId)
        eventEmitter.emit('metadata-retrieved', {
          episodeId,
          metadata: null,
          fromCache: false,
        })
        return null
      }

      eventEmitter.emit('metadata-retrieved', {
        episodeId,
        metadata,
        fromCache,
      })

      return metadata
    } catch (error) {
      eventEmitter.emit('storage-error', {
        operation: 'retrieve',
        episodeId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  const hasValidMetadata = async (episodeId: string): Promise<boolean> => {
    const metadata = await getMetadata(episodeId)
    return metadata !== null && metadata.isValidated
  }

  const updateMetadataFields = async (
    episodeId: string,
    fields: Partial<EpisodeMetadata>,
  ): Promise<void> => {
    const existingMetadata = await adapter.load(episodeId)
    if (!existingMetadata) {
      throw new Error(`No metadata found for episode: ${episodeId}`)
    }

    const updatedMetadata: EpisodeMetadata = {
      ...existingMetadata,
      ...fields,
      lastUpdated: new Date().toISOString(),
    }

    await storeMetadata(episodeId, updatedMetadata)
  }

  const removeMetadata = async (episodeId: string): Promise<void> => {
    try {
      await adapter.remove(episodeId)
    } catch (error) {
      eventEmitter.emit('storage-error', {
        operation: 'delete',
        episodeId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  const getAllMetadata = async (): Promise<Record<string, EpisodeMetadata>> => {
    const allEntries = await adapter.getAllEntries()
    const metadataMap: Record<string, EpisodeMetadata> = {}

    for (const metadata of allEntries) {
      if (!isExpired(metadata)) {
        metadataMap[metadata.episodeId] = metadata
      }
    }

    return metadataMap
  }

  const storeBatchMetadata = async (
    metadataMap: Record<string, EpisodeMetadata>,
  ): Promise<void> => {
    const promises = Object.entries(metadataMap).map(async ([episodeId, metadata]) =>
      storeMetadata(episodeId, metadata),
    )
    await Promise.all(promises)
  }

  const cleanupExpiredMetadata = async (): Promise<{
    removedEntries: number
    freedSpace: number
  }> => {
    const allEntries = await adapter.getAllEntries()
    let removedEntries = 0
    let freedSpace = 0

    for (const metadata of allEntries) {
      if (isExpired(metadata)) {
        const storageSize = calculateStorageSize(metadata)
        await adapter.remove(metadata.episodeId)
        removedEntries++
        freedSpace += storageSize
      }
    }

    const totalEntries = allEntries.length - removedEntries

    eventEmitter.emit('cache-cleanup', {
      removedEntries,
      freedSpace,
      totalEntries,
    })

    return {removedEntries, freedSpace}
  }

  const getStorageStats = async (): Promise<{
    totalEntries: number
    usedSpace: number
    maxQuota: number
  }> => {
    const allEntries = await adapter.getAllEntries()
    const usedSpace = await adapter.getStorageSize()

    return {
      totalEntries: allEntries.length,
      usedSpace,
      maxQuota: config.quotaManagement.maxSize,
    }
  }

  const validateQuota = async (): Promise<boolean> => {
    const stats = await getStorageStats()
    const usagePercentage = stats.usedSpace / stats.maxQuota

    if (usagePercentage > config.quotaManagement.cleanupThreshold) {
      eventEmitter.emit('quota-warning', {
        currentUsage: stats.usedSpace,
        maxQuota: stats.maxQuota,
        usagePercentage,
      })

      // Trigger cleanup
      await cleanupExpiredMetadata()
      return false
    }

    return true
  }

  const clear = async (): Promise<void> => {
    try {
      await adapter.clear()
    } catch (error) {
      eventEmitter.emit('storage-error', {
        operation: 'delete',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  // Return public API with EventEmitter integration
  return {
    storeMetadata,
    getMetadata,
    hasValidMetadata,
    updateMetadataFields,
    removeMetadata,
    getAllMetadata,
    storeBatchMetadata,
    cleanupExpiredMetadata,
    getStorageStats,
    validateQuota,
    clear,

    // EventEmitter methods
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    once: eventEmitter.once.bind(eventEmitter),
    removeAllListeners: eventEmitter.removeAllListeners.bind(eventEmitter),
  }
}

/**
 * Default metadata storage configuration following VBS patterns.
 */
export const createDefaultMetadataStorageConfig = (): MetadataStorageConfig => ({
  storeName: 'episode-metadata',
  version: 1,
  keyPath: 'episodeId',
  expiration: {
    defaultTtl: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
  updateStrategy: 'background-sync',
  quotaManagement: {
    maxSize: 50 * 1024 * 1024, // 50MB
    cleanupThreshold: 0.8, // 80%
  },
  indexes: [
    {name: 'dataSource', keyPath: 'dataSource'},
    {name: 'lastUpdated', keyPath: 'lastUpdated'},
    {name: 'enrichmentStatus', keyPath: 'enrichmentStatus'},
  ],
  autoCleanup: true,
  cleanupInterval: 60 * 60 * 1000, // 1 hour
})
