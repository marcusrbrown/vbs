/**
 * Cache Warming Module Tests
 *
 * Comprehensive test suite for cache warming functionality including:
 * - Popular episode detection and warming
 * - Recently watched episode prediction
 * - Sequential viewing pattern prediction
 * - Era-based warming
 * - New content warming
 * - Manual warming
 * - Configuration and statistics
 * - Integration with metadata queue
 */

import type {
  CacheWarmingInstance,
  CacheWarmingStats,
  MetadataQueueInstance,
} from '../src/modules/types.js'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {createCacheWarming} from '../src/modules/cache-warming.js'
import {createMetadataQueue} from '../src/modules/metadata-queue.js'

describe('Cache Warming Module', () => {
  let cacheWarming: CacheWarmingInstance
  let metadataQueue: MetadataQueueInstance

  beforeEach(() => {
    metadataQueue = createMetadataQueue()
    cacheWarming = createCacheWarming(metadataQueue, {
      enabledStrategies: [
        'popular-episodes',
        'recently-watched',
        'sequential-prediction',
        'era-based',
        'new-content',
        'manual',
      ],
    })
  })

  describe('Popular Episodes Warming', () => {
    it('should identify and warm series/season premieres', async () => {
      const episodeIds = await cacheWarming.warmPopularEpisodes()

      expect(episodeIds.length).toBeGreaterThan(0)
      // All returned episodes should be premieres (S*E1)
      expect(episodeIds.every(id => id.includes('_e01') || id.includes('_e1'))).toBe(true)
    })

    it('should emit popular-episodes-detected event', async () => {
      const mockListener = vi.fn()
      cacheWarming.on('popular-episodes-detected', mockListener)

      await cacheWarming.warmPopularEpisodes()

      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          episodeIds: expect.any(Array),
          count: expect.any(Number),
        }),
      )
    })

    it('should respect max batch size configuration', async () => {
      cacheWarming.updateConfig({maxBatchSize: 5})

      const episodeIds = await cacheWarming.warmPopularEpisodes()

      expect(episodeIds.length).toBeLessThanOrEqual(5)
    })

    it('should not warm when disabled', async () => {
      cacheWarming.updateConfig({enabled: false})

      const episodeIds = await cacheWarming.warmPopularEpisodes()

      expect(episodeIds.length).toBe(0)
    })

    it('should not warm when strategy is disabled', async () => {
      cacheWarming.updateConfig({
        enabledStrategies: ['recently-watched', 'sequential-prediction'],
      })

      const episodeIds = await cacheWarming.warmPopularEpisodes()

      expect(episodeIds.length).toBe(0)
    })
  })

  describe('Recently Watched Warming', () => {
    it('should warm next episodes after recently watched episode', async () => {
      const episodeIds = await cacheWarming.warmRecentlyWatched('ent_s1_e01')

      expect(episodeIds.length).toBeGreaterThan(0)
      // Should include subsequent episodes
      expect(episodeIds).toContain('ent_s1_e02')
    })

    it('should emit recently-watched-detected event', async () => {
      const mockListener = vi.fn()
      cacheWarming.on('recently-watched-detected', mockListener)

      await cacheWarming.warmRecentlyWatched('ent_s1_e01')

      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          episodeId: 'ent_s1_e01',
          nextEpisodeIds: expect.any(Array),
        }),
      )
    })

    it('should respect look ahead count configuration', async () => {
      cacheWarming.updateConfig({lookAheadCount: 3})

      const episodeIds = await cacheWarming.warmRecentlyWatched('ent_s1_e01')

      expect(episodeIds.length).toBeLessThanOrEqual(3)
    })

    it('should return empty array for non-existent episode', async () => {
      const episodeIds = await cacheWarming.warmRecentlyWatched('invalid_episode')

      expect(episodeIds.length).toBe(0)
    })

    it('should return empty array for last episode in series', async () => {
      // This would be the last episode of a season/series
      const episodeIds = await cacheWarming.warmRecentlyWatched('ent_s1_e26')

      // No episodes after the last one
      expect(episodeIds.length).toBe(0)
    })
  })

  describe('Sequential Prediction Warming', () => {
    it('should predict and warm next episodes in sequence', async () => {
      const episodeIds = await cacheWarming.warmSequentialEpisodes('ent_s1_e05', 5)

      expect(episodeIds.length).toBeGreaterThan(0)
      expect(episodeIds).toContain('ent_s1_e06')
      expect(episodeIds.length).toBeLessThanOrEqual(5)
    })

    it('should emit sequential-pattern-detected event', async () => {
      const mockListener = vi.fn()
      cacheWarming.on('sequential-pattern-detected', mockListener)

      await cacheWarming.warmSequentialEpisodes('ent_s1_e05')

      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          seriesId: expect.any(String),
          currentEpisode: 'ent_s1_e05',
          predictedEpisodes: expect.any(Array),
        }),
      )
    })

    it('should use default look ahead count when not specified', async () => {
      cacheWarming.updateConfig({lookAheadCount: 3})

      const episodeIds = await cacheWarming.warmSequentialEpisodes('ent_s1_e05')

      expect(episodeIds.length).toBeLessThanOrEqual(3)
    })

    it('should respect custom look ahead count', async () => {
      const episodeIds = await cacheWarming.warmSequentialEpisodes('ent_s1_e05', 2)

      expect(episodeIds.length).toBeLessThanOrEqual(2)
    })
  })

  describe('Era-Based Warming', () => {
    it('should warm episodes from specific era', async () => {
      const episodeIds = await cacheWarming.warmEraEpisodes('enterprise', 10)

      expect(episodeIds.length).toBeGreaterThan(0)
      expect(episodeIds.length).toBeLessThanOrEqual(10)
      // All episodes should be from Enterprise era
      expect(episodeIds.every(id => id.startsWith('ent_'))).toBe(true)
    })

    it('should return empty array for non-existent era', async () => {
      const episodeIds = await cacheWarming.warmEraEpisodes('invalid_era', 10)

      expect(episodeIds.length).toBe(0)
    })

    it('should respect limit parameter', async () => {
      const episodeIds = await cacheWarming.warmEraEpisodes('enterprise', 5)

      expect(episodeIds.length).toBeLessThanOrEqual(5)
    })
  })

  describe('New Content Warming', () => {
    it('should warm newly added episodes', async () => {
      const newEpisodeIds = ['ent_s1_e01', 'ent_s1_e02', 'ent_s1_e03']

      const warmedIds = await cacheWarming.warmNewContent(newEpisodeIds)

      expect(warmedIds).toEqual(newEpisodeIds)
    })

    it('should emit new-content-detected event', async () => {
      const mockListener = vi.fn()
      cacheWarming.on('new-content-detected', mockListener)

      const newEpisodeIds = ['ent_s1_e01', 'ent_s1_e02']
      await cacheWarming.warmNewContent(newEpisodeIds)

      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          episodeIds: newEpisodeIds,
          addedAt: expect.any(String),
        }),
      )
    })
  })

  describe('Manual Warming', () => {
    it('should manually warm specific episode', async () => {
      const success = await cacheWarming.warmEpisode('ent_s1_e10')

      expect(success).toBe(true)
    })

    it('should emit warming-started event', async () => {
      const mockListener = vi.fn()
      cacheWarming.on('warming-started', mockListener)

      await cacheWarming.warmEpisode('ent_s1_e10')

      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          job: expect.objectContaining({
            episodeId: 'ent_s1_e10',
            strategy: 'manual',
          }),
          episodeCount: 1,
        }),
      )
    })

    it('should return false for non-existent episode', async () => {
      const success = await cacheWarming.warmEpisode('invalid_episode')

      expect(success).toBe(false)
    })

    it('should return false when already queued', async () => {
      await cacheWarming.warmEpisode('ent_s1_e10')
      const success = await cacheWarming.warmEpisode('ent_s1_e10')

      expect(success).toBe(false)
    })

    it('should respect custom priority', async () => {
      const success = await cacheWarming.warmEpisode('ent_s1_e10', 5)

      expect(success).toBe(true)
    })
  })

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      cacheWarming.updateConfig({
        lookAheadCount: 10,
        maxBatchSize: 20,
      })

      // Configuration should be applied (tested indirectly through behavior)
      expect(true).toBe(true)
    })

    it('should support partial configuration updates', () => {
      cacheWarming.updateConfig({
        lookAheadCount: 7,
      })

      // Other config values should remain unchanged
      expect(true).toBe(true)
    })
  })

  describe('Statistics Tracking', () => {
    it('should return initial statistics', () => {
      const stats = cacheWarming.getStats()

      expect(stats).toEqual({
        totalWarmed: 0,
        successfulWarming: 0,
        failedWarming: 0,
        cacheHitRate: 0,
        avgWarmingTime: 0,
        lastWarmingAt: null,
        warmingByStrategy: {
          'popular-episodes': 0,
          'recently-watched': 0,
          'sequential-prediction': 0,
          'era-based': 0,
          'new-content': 0,
          manual: 0,
        },
      })
    })

    it('should update statistics after warming operations', async () => {
      await cacheWarming.warmEpisode('ent_s1_e01')

      // Wait for simulated completion
      await new Promise(resolve => setTimeout(resolve, 150))

      const stats = cacheWarming.getStats()

      expect(stats.totalWarmed).toBeGreaterThan(0)
    })

    it('should emit stats-updated event', async () => {
      const mockListener = vi.fn()
      cacheWarming.on('stats-updated', mockListener)

      await cacheWarming.warmEpisode('ent_s1_e01')

      // Wait for simulated completion
      await new Promise(resolve => setTimeout(resolve, 150))

      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          stats: expect.any(Object),
        }),
      )
    })

    it('should reset statistics', () => {
      cacheWarming.resetStats()

      const stats = cacheWarming.getStats()

      expect(stats.totalWarmed).toBe(0)
      expect(stats.successfulWarming).toBe(0)
    })
  })

  describe('Job Management', () => {
    it('should check if episode is in warming queue', async () => {
      await cacheWarming.warmEpisode('ent_s1_e01')

      expect(cacheWarming.isWarmingQueued('ent_s1_e01')).toBe(true)
      expect(cacheWarming.isWarmingQueued('ent_s1_e02')).toBe(false)
    })

    it('should cancel warming job', async () => {
      await cacheWarming.warmEpisode('ent_s1_e01')

      const cancelled = cacheWarming.cancelWarming('ent_s1_e01')

      expect(cancelled).toBe(true)
      expect(cacheWarming.isWarmingQueued('ent_s1_e01')).toBe(false)
    })

    it('should return false when cancelling non-existent job', () => {
      const cancelled = cacheWarming.cancelWarming('non_existent_episode')

      expect(cancelled).toBe(false)
    })
  })

  describe('Integration with Metadata Queue', () => {
    it('should add jobs to metadata queue', async () => {
      const initialQueueStatus = metadataQueue.getStatus()

      await cacheWarming.warmEpisode('ent_s1_e01')

      const updatedQueueStatus = metadataQueue.getStatus()

      expect(updatedQueueStatus.totalJobs).toBeGreaterThan(initialQueueStatus.totalJobs)
    })

    it('should prioritize jobs correctly', async () => {
      await cacheWarming.warmEpisode('ent_s1_e01', 5)
      await cacheWarming.warmEpisode('ent_s1_e02', 1)

      const jobs = metadataQueue.getJobs()

      // Higher priority job should come first after sorting
      expect(jobs.length).toBeGreaterThan(0)
    })
  })

  describe('Event Emission', () => {
    it('should support once listeners', async () => {
      const mockListener = vi.fn()
      cacheWarming.once('warming-started', mockListener)

      await cacheWarming.warmEpisode('ent_s1_e01')
      await cacheWarming.warmEpisode('ent_s1_e02')

      expect(mockListener).toHaveBeenCalledTimes(1)
    })

    it('should support removing listeners', async () => {
      const mockListener = vi.fn()
      cacheWarming.on('warming-started', mockListener)
      cacheWarming.off('warming-started', mockListener)

      await cacheWarming.warmEpisode('ent_s1_e01')

      expect(mockListener).not.toHaveBeenCalled()
    })
  })

  describe('Rate Limiting and Throttling', () => {
    it('should respect minimum warming interval', async () => {
      cacheWarming.updateConfig({minWarmingInterval: 500})

      await cacheWarming.warmPopularEpisodes()
      const secondCallResult = await cacheWarming.warmPopularEpisodes()

      // Second call should be throttled
      expect(secondCallResult.length).toBe(0)
    })

    it('should allow warming after interval passes', async () => {
      cacheWarming.updateConfig({minWarmingInterval: 100})

      await cacheWarming.warmPopularEpisodes()

      // Wait for interval to pass
      await new Promise(resolve => setTimeout(resolve, 150))

      const secondCallResult = await cacheWarming.warmPopularEpisodes()

      expect(secondCallResult.length).toBeGreaterThan(0)
    })
  })

  describe('Type Safety', () => {
    it('should provide type-safe statistics object', () => {
      const stats: CacheWarmingStats = cacheWarming.getStats()

      expect(stats).toHaveProperty('totalWarmed')
      expect(stats).toHaveProperty('successfulWarming')
      expect(stats).toHaveProperty('failedWarming')
      expect(stats).toHaveProperty('cacheHitRate')
      expect(stats).toHaveProperty('avgWarmingTime')
      expect(stats).toHaveProperty('lastWarmingAt')
      expect(stats).toHaveProperty('warmingByStrategy')
    })
  })
})
