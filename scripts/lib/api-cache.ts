/**
 * File-system based API response caching for development.
 * Reduces redundant API requests during data generation script development and testing.
 *
 * Follows VBS functional factory architecture with closure-based state management.
 */

import {createHash} from 'node:crypto'
import {mkdir, readdir, readFile, rm, stat, writeFile} from 'node:fs/promises'
import {join} from 'node:path'

/**
 * Cache entry structure stored on disk.
 */
interface CacheEntry<T = unknown> {
  data: T
  cachedAt: string
  expiresAt: string
  url: string
  key: string
}

/**
 * Cache statistics for monitoring.
 */
interface CacheStats {
  totalEntries: number
  totalSize: number
  hits: number
  misses: number
  hitRate: number
  oldestEntry: string | null
  newestEntry: string | null
}

/**
 * Configuration for API cache.
 */
export interface ApiCacheConfig {
  cacheDir?: string
  defaultTtl?: number
  enabled?: boolean
  verbose?: boolean
}

/**
 * API cache instance interface.
 */
export interface ApiCacheInstance {
  get: <T = unknown>(url: string) => Promise<T | null>
  set: <T = unknown>(url: string, data: T, ttlMs?: number) => Promise<void>
  has: (url: string) => Promise<boolean>
  remove: (url: string) => Promise<boolean>
  clear: () => Promise<{removedEntries: number; freedSpace: number}>
  getStats: () => Promise<CacheStats>
  cleanupExpired: () => Promise<{removedEntries: number; freedSpace: number}>
}

/**
 * Default cache configuration.
 */
const DEFAULT_CONFIG: Required<ApiCacheConfig> = {
  cacheDir: '.cache/api-responses',
  defaultTtl: 24 * 60 * 60 * 1000, // 24 hours
  enabled: true,
  verbose: false,
}

/**
 * Generate cache key from URL.
 * Uses SHA-256 hash for consistent, collision-resistant keys.
 */
const generateCacheKey = (url: string): string => {
  const hash = createHash('sha256')
  hash.update(url)
  return hash.digest('hex')
}

/**
 * Get cache file path for a given URL.
 */
const getCacheFilePath = (cacheDir: string, url: string): string => {
  const key = generateCacheKey(url)
  return join(cacheDir, `${key}.json`)
}

/**
 * Read cache entry from disk.
 */
const readCacheEntry = async <T = unknown>(filePath: string): Promise<CacheEntry<T> | null> => {
  try {
    const content = await readFile(filePath, 'utf-8')
    const entry = JSON.parse(content) as CacheEntry<T>
    return entry
  } catch {
    return null
  }
}

/**
 * Write cache entry to disk.
 */
const writeCacheEntry = async <T = unknown>(
  filePath: string,
  entry: CacheEntry<T>,
): Promise<void> => {
  const content = JSON.stringify(entry, null, 2)
  await writeFile(filePath, content, 'utf-8')
}

/**
 * Check if cache entry is expired.
 */
const isExpired = (entry: CacheEntry): boolean => {
  const now = new Date()
  const expiresAt = new Date(entry.expiresAt)
  return now > expiresAt
}

/**
 * Create API cache instance with file-system persistence.
 * Follows VBS functional factory architecture.
 *
 * @example
 * ```typescript
 * const cache = createApiCache({
 *   cacheDir: '.cache/tmdb',
 *   defaultTtl: 24 * 60 * 60 * 1000, // 24 hours
 *   verbose: true
 * })
 *
 * // Check cache before fetching
 * const cached = await cache.get<TMDBResponse>(url)
 * if (cached) {
 *   return cached
 * }
 *
 * // Fetch and cache
 * const response = await fetch(url)
 * const data = await response.json()
 * await cache.set(url, data)
 * return data
 * ```
 */
export const createApiCache = (config: ApiCacheConfig = {}): ApiCacheInstance => {
  const finalConfig = {...DEFAULT_CONFIG, ...config}

  // Private state in closure
  const stats = {
    hits: 0,
    misses: 0,
  }

  /**
   * Ensure cache directory exists.
   */
  const ensureCacheDir = async (): Promise<void> => {
    if (!finalConfig.enabled) return
    await mkdir(finalConfig.cacheDir, {recursive: true})
  }

  /**
   * Log verbose message if enabled.
   */
  const logVerbose = (message: string): void => {
    if (finalConfig.verbose) {
      console.error(`[API Cache] ${message}`)
    }
  }

  return {
    get: async <T = unknown>(url: string): Promise<T | null> => {
      if (!finalConfig.enabled) {
        return null
      }

      try {
        await ensureCacheDir()
        const filePath = getCacheFilePath(finalConfig.cacheDir, url)
        const entry = await readCacheEntry<T>(filePath)

        if (!entry) {
          stats.misses += 1
          logVerbose(`Cache miss: ${url}`)
          return null
        }

        if (isExpired(entry)) {
          stats.misses += 1
          logVerbose(`Cache expired: ${url}`)
          // Clean up expired entry
          await rm(filePath, {force: true})
          return null
        }

        stats.hits += 1
        logVerbose(`Cache hit: ${url}`)
        return entry.data
      } catch (error) {
        logVerbose(`Cache read error: ${error instanceof Error ? error.message : String(error)}`)
        return null
      }
    },

    set: async <T = unknown>(url: string, data: T, ttlMs?: number): Promise<void> => {
      if (!finalConfig.enabled) {
        return
      }

      try {
        await ensureCacheDir()
        const filePath = getCacheFilePath(finalConfig.cacheDir, url)
        const ttl = ttlMs ?? finalConfig.defaultTtl

        const entry: CacheEntry<T> = {
          data,
          cachedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + ttl).toISOString(),
          url,
          key: generateCacheKey(url),
        }

        await writeCacheEntry(filePath, entry)
        logVerbose(`Cached: ${url} (TTL: ${ttl}ms)`)
      } catch (error) {
        logVerbose(`Cache write error: ${error instanceof Error ? error.message : String(error)}`)
      }
    },

    has: async (url: string): Promise<boolean> => {
      if (!finalConfig.enabled) {
        return false
      }

      try {
        const filePath = getCacheFilePath(finalConfig.cacheDir, url)
        const entry = await readCacheEntry(filePath)

        if (!entry) {
          return false
        }

        if (isExpired(entry)) {
          await rm(filePath, {force: true})
          return false
        }

        return true
      } catch {
        return false
      }
    },

    remove: async (url: string): Promise<boolean> => {
      if (!finalConfig.enabled) {
        return false
      }

      try {
        const filePath = getCacheFilePath(finalConfig.cacheDir, url)

        // Check if file exists before attempting removal
        try {
          await stat(filePath)
        } catch {
          return false
        }

        await rm(filePath, {force: true})
        logVerbose(`Removed from cache: ${url}`)
        return true
      } catch {
        return false
      }
    },

    clear: async (): Promise<{removedEntries: number; freedSpace: number}> => {
      if (!finalConfig.enabled) {
        return {removedEntries: 0, freedSpace: 0}
      }

      try {
        await ensureCacheDir()
        const files = await readdir(finalConfig.cacheDir)
        let removedEntries = 0
        let freedSpace = 0

        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = join(finalConfig.cacheDir, file)
            try {
              const fileStats = await stat(filePath)
              freedSpace += fileStats.size
              await rm(filePath, {force: true})
              removedEntries += 1
            } catch {
              // Ignore errors for individual file removal
            }
          }
        }

        logVerbose(`Cleared cache: ${removedEntries} entries, ${freedSpace} bytes freed`)
        return {removedEntries, freedSpace}
      } catch (error) {
        logVerbose(`Cache clear error: ${error instanceof Error ? error.message : String(error)}`)
        return {removedEntries: 0, freedSpace: 0}
      }
    },

    getStats: async (): Promise<CacheStats> => {
      if (!finalConfig.enabled) {
        return {
          totalEntries: 0,
          totalSize: 0,
          hits: stats.hits,
          misses: stats.misses,
          hitRate: 0,
          oldestEntry: null,
          newestEntry: null,
        }
      }

      try {
        await ensureCacheDir()
        const files = await readdir(finalConfig.cacheDir)
        let totalEntries = 0
        let totalSize = 0
        let oldestEntry: string | null = null
        let newestEntry: string | null = null

        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = join(finalConfig.cacheDir, file)
            try {
              const fileStats = await stat(filePath)
              totalSize += fileStats.size
              totalEntries += 1

              const entry = await readCacheEntry(filePath)
              if (entry) {
                if (!oldestEntry || entry.cachedAt < oldestEntry) {
                  oldestEntry = entry.cachedAt
                }
                if (!newestEntry || entry.cachedAt > newestEntry) {
                  newestEntry = entry.cachedAt
                }
              }
            } catch {
              // Ignore errors for individual file stats
            }
          }
        }

        const totalRequests = stats.hits + stats.misses
        const hitRate = totalRequests > 0 ? stats.hits / totalRequests : 0

        return {
          totalEntries,
          totalSize,
          hits: stats.hits,
          misses: stats.misses,
          hitRate,
          oldestEntry,
          newestEntry,
        }
      } catch (error) {
        logVerbose(`Cache stats error: ${error instanceof Error ? error.message : String(error)}`)
        return {
          totalEntries: 0,
          totalSize: 0,
          hits: stats.hits,
          misses: stats.misses,
          hitRate: 0,
          oldestEntry: null,
          newestEntry: null,
        }
      }
    },

    cleanupExpired: async (): Promise<{removedEntries: number; freedSpace: number}> => {
      if (!finalConfig.enabled) {
        return {removedEntries: 0, freedSpace: 0}
      }

      try {
        await ensureCacheDir()
        const files = await readdir(finalConfig.cacheDir)
        let removedEntries = 0
        let freedSpace = 0

        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = join(finalConfig.cacheDir, file)
            try {
              const entry = await readCacheEntry(filePath)
              if (entry && isExpired(entry)) {
                const fileStats = await stat(filePath)
                freedSpace += fileStats.size
                await rm(filePath, {force: true})
                removedEntries += 1
              }
            } catch {
              // Ignore errors for individual file processing
            }
          }
        }

        logVerbose(
          `Cleaned up expired entries: ${removedEntries} entries, ${freedSpace} bytes freed`,
        )
        return {removedEntries, freedSpace}
      } catch (error) {
        logVerbose(`Cache cleanup error: ${error instanceof Error ? error.message : String(error)}`)
        return {removedEntries: 0, freedSpace: 0}
      }
    },
  }
}
