import {mkdir, rm, writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {createApiCache} from '../../scripts/lib/api-cache.js'

describe('API Cache', () => {
  const testCacheDir = '.cache/test-api-cache'

  beforeEach(async () => {
    // Ensure clean state
    await rm(testCacheDir, {recursive: true, force: true})
    await mkdir(testCacheDir, {recursive: true})
  })

  afterEach(async () => {
    // Cleanup
    await rm(testCacheDir, {recursive: true, force: true})
  })

  describe('Cache Operations', () => {
    it('should cache and retrieve data successfully', async () => {
      const cache = createApiCache({cacheDir: testCacheDir})
      const testUrl = 'https://api.example.com/test'
      const testData = {id: 1, name: 'Test'}

      await cache.set(testUrl, testData)
      const retrieved = await cache.get<typeof testData>(testUrl)

      expect(retrieved).toEqual(testData)
    })

    it('should return null for cache miss', async () => {
      const cache = createApiCache({cacheDir: testCacheDir})
      const result = await cache.get('https://api.example.com/nonexistent')

      expect(result).toBeNull()
    })

    it('should handle cache expiration', async () => {
      const cache = createApiCache({
        cacheDir: testCacheDir,
        defaultTtl: 100, // 100ms TTL
      })
      const testUrl = 'https://api.example.com/expiring'
      const testData = {message: 'expires soon'}

      await cache.set(testUrl, testData)

      // Should be available immediately
      let result = await cache.get(testUrl)
      expect(result).toEqual(testData)

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150))

      // Should be expired now
      result = await cache.get(testUrl)
      expect(result).toBeNull()
    })

    it('should support custom TTL per entry', async () => {
      const cache = createApiCache({cacheDir: testCacheDir})
      const testUrl = 'https://api.example.com/custom-ttl'
      const testData = {ttl: 'custom'}

      await cache.set(testUrl, testData, 200) // 200ms TTL

      const result = await cache.get(testUrl)
      expect(result).toEqual(testData)
    })

    it('should check if URL has valid cached response', async () => {
      const cache = createApiCache({cacheDir: testCacheDir})
      const testUrl = 'https://api.example.com/check'

      expect(await cache.has(testUrl)).toBe(false)

      await cache.set(testUrl, {data: 'test'})
      expect(await cache.has(testUrl)).toBe(true)
    })

    it('should remove specific cache entry', async () => {
      const cache = createApiCache({cacheDir: testCacheDir})
      const testUrl = 'https://api.example.com/remove'
      const testData = {data: 'to be removed'}

      await cache.set(testUrl, testData)
      expect(await cache.has(testUrl)).toBe(true)

      const removed = await cache.remove(testUrl)
      expect(removed).toBe(true)
      expect(await cache.has(testUrl)).toBe(false)
    })

    it('should return false when removing nonexistent entry', async () => {
      const cache = createApiCache({cacheDir: testCacheDir})
      const removed = await cache.remove('https://api.example.com/nonexistent')

      expect(removed).toBe(false)
    })
  })

  describe('Cache Management', () => {
    it('should clear all cache entries', async () => {
      const cache = createApiCache({cacheDir: testCacheDir})

      await cache.set('https://api.example.com/1', {id: 1})
      await cache.set('https://api.example.com/2', {id: 2})
      await cache.set('https://api.example.com/3', {id: 3})

      const stats = await cache.getStats()
      expect(stats.totalEntries).toBe(3)

      const result = await cache.clear()
      expect(result.removedEntries).toBe(3)
      expect(result.freedSpace).toBeGreaterThan(0)

      const newStats = await cache.getStats()
      expect(newStats.totalEntries).toBe(0)
    })

    it('should cleanup only expired entries', async () => {
      const cache = createApiCache({
        cacheDir: testCacheDir,
        defaultTtl: 100, // 100ms
      })

      // Add entries that will expire
      await cache.set('https://api.example.com/expired1', {id: 1})
      await cache.set('https://api.example.com/expired2', {id: 2})

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150))

      // Add entry that won't expire
      await cache.set('https://api.example.com/fresh', {id: 3})

      const result = await cache.cleanupExpired()
      expect(result.removedEntries).toBe(2)

      const stats = await cache.getStats()
      expect(stats.totalEntries).toBe(1)
    })
  })

  describe('Cache Statistics', () => {
    it('should track cache hits and misses', async () => {
      const cache = createApiCache({cacheDir: testCacheDir})
      const testUrl = 'https://api.example.com/stats'

      // Cache miss
      await cache.get(testUrl)

      // Cache set and hit
      await cache.set(testUrl, {data: 'test'})
      await cache.get(testUrl)
      await cache.get(testUrl)

      const stats = await cache.getStats()
      expect(stats.hits).toBe(2)
      expect(stats.misses).toBe(1)
      expect(stats.hitRate).toBeCloseTo(0.667, 2)
    })

    it('should calculate total cache size', async () => {
      const cache = createApiCache({cacheDir: testCacheDir})

      await cache.set('https://api.example.com/data1', {data: 'a'.repeat(1000)})
      await cache.set('https://api.example.com/data2', {data: 'b'.repeat(1000)})

      const stats = await cache.getStats()
      expect(stats.totalSize).toBeGreaterThan(2000)
      expect(stats.totalEntries).toBe(2)
    })

    it('should track oldest and newest cache entries', async () => {
      const cache = createApiCache({cacheDir: testCacheDir})

      await cache.set('https://api.example.com/old', {data: 'old'})
      await new Promise(resolve => setTimeout(resolve, 50))
      await cache.set('https://api.example.com/new', {data: 'new'})

      const stats = await cache.getStats()
      expect(stats.oldestEntry).not.toBeNull()
      expect(stats.newestEntry).not.toBeNull()

      if (stats.oldestEntry && stats.newestEntry) {
        const oldTime = new Date(stats.oldestEntry).getTime()
        const newTime = new Date(stats.newestEntry).getTime()
        expect(newTime).toBeGreaterThan(oldTime)
      }
    })
  })

  describe('Cache Disabled Mode', () => {
    it('should bypass cache when disabled', async () => {
      const cache = createApiCache({
        cacheDir: testCacheDir,
        enabled: false,
      })

      const testUrl = 'https://api.example.com/disabled'
      const testData = {data: 'test'}

      await cache.set(testUrl, testData)
      const result = await cache.get(testUrl)

      expect(result).toBeNull()

      const stats = await cache.getStats()
      expect(stats.totalEntries).toBe(0)
    })

    it('should return empty results when disabled', async () => {
      const cache = createApiCache({
        cacheDir: testCacheDir,
        enabled: false,
      })

      expect(await cache.has('test')).toBe(false)
      expect(await cache.remove('test')).toBe(false)

      const clearResult = await cache.clear()
      expect(clearResult.removedEntries).toBe(0)
      expect(clearResult.freedSpace).toBe(0)
    })
  })

  describe('Cache Key Generation', () => {
    it('should generate consistent keys for same URL', async () => {
      const cache = createApiCache({cacheDir: testCacheDir})
      const url = 'https://api.example.com/consistent'
      const data = {consistent: true}

      await cache.set(url, data)
      const result = await cache.get(url)

      expect(result).toEqual(data)
    })

    it('should generate different keys for different URLs', async () => {
      const cache = createApiCache({cacheDir: testCacheDir})

      await cache.set('https://api.example.com/url1', {id: 1})
      await cache.set('https://api.example.com/url2', {id: 2})

      const result1 = await cache.get('https://api.example.com/url1')
      const result2 = await cache.get('https://api.example.com/url2')

      expect(result1).toEqual({id: 1})
      expect(result2).toEqual({id: 2})
    })

    it('should handle URLs with query parameters', async () => {
      const cache = createApiCache({cacheDir: testCacheDir})
      const url1 = 'https://api.example.com/search?q=star+trek'
      const url2 = 'https://api.example.com/search?q=star+wars'

      await cache.set(url1, {query: 'star trek'})
      await cache.set(url2, {query: 'star wars'})

      const result1 = await cache.get(url1)
      const result2 = await cache.get(url2)

      expect(result1).toEqual({query: 'star trek'})
      expect(result2).toEqual({query: 'star wars'})
    })
  })

  describe('Error Handling', () => {
    it('should handle missing cache directory gracefully', async () => {
      const cache = createApiCache({cacheDir: testCacheDir})

      // Directory should be created automatically
      await cache.set('https://api.example.com/test', {data: 'test'})
      const result = await cache.get('https://api.example.com/test')

      expect(result).toEqual({data: 'test'})
    })

    it('should handle invalid cache file format', async () => {
      const cache = createApiCache({cacheDir: testCacheDir})
      const testUrl = 'https://api.example.com/invalid'

      // First set a valid entry to create the file, then corrupt it
      await cache.set(testUrl, {data: 'valid'})

      // Find the cache file that was created
      const {createHash} = await import('node:crypto')
      const hash = createHash('sha256').update(testUrl).digest('hex')
      const cacheFile = join(testCacheDir, `${hash}.json`)

      // Corrupt the cache file with invalid JSON
      await writeFile(cacheFile, 'invalid json{', 'utf-8')

      const result = await cache.get(testUrl)
      expect(result).toBeNull()
    })
  })

  describe('File System Operations', () => {
    it('should create cache directory if it does not exist', async () => {
      const cache = createApiCache({cacheDir: join(testCacheDir, 'nested', 'dir')})

      await cache.set('https://api.example.com/test', {data: 'test'})
      const result = await cache.get('https://api.example.com/test')

      expect(result).toEqual({data: 'test'})
    })

    it('should persist cache entries across cache instances', async () => {
      const cache1 = createApiCache({cacheDir: testCacheDir})
      await cache1.set('https://api.example.com/persistent', {data: 'persistent'})

      const cache2 = createApiCache({cacheDir: testCacheDir})
      const result = await cache2.get('https://api.example.com/persistent')

      expect(result).toEqual({data: 'persistent'})
    })
  })
})
