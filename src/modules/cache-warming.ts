/**
 * Cache Warming Module for Episode Metadata
 *
 * Implements intelligent cache warming strategies to proactively fetch metadata for:
 * - Popular episodes (series/season premieres, pilot episodes)
 * - Recently watched content (next episodes in sequence)
 * - Predictive warming based on viewing patterns
 * - Newly added content
 *
 * Integrates with metadata queue and scheduler to respect user preferences and
 * network conditions while optimizing metadata availability for likely-to-be-viewed content.
 */

import type {
  CacheWarmingConfig,
  CacheWarmingEvents,
  CacheWarmingInstance,
  CacheWarmingJob,
  CacheWarmingStats,
  Episode,
  MetadataQueueInstance,
  StarTrekEra,
  WarmingStrategy,
} from './types.js'
import {starTrekData} from '../data/star-trek-data.js'
import {pipe} from '../utils/composition.js'
import {createEventEmitter} from './events.js'
import {createMetadataJob} from './metadata-queue.js'

/**
 * Default cache warming configuration
 */
const DEFAULT_CACHE_WARMING_CONFIG: CacheWarmingConfig = {
  enabled: true,
  lookAheadCount: 5,
  maxBatchSize: 10,
  defaultPriority: 2,
  enabledStrategies: ['popular-episodes', 'recently-watched', 'sequential-prediction'],
  minWarmingInterval: 60000, // 1 minute
  warmPopularOnInit: true,
}

/**
 * Factory function to create cache warming instance
 * Follows VBS functional factory architecture with closure-based state management
 */
export const createCacheWarming = (
  metadataQueue: MetadataQueueInstance,
  config: Partial<CacheWarmingConfig> = {},
): CacheWarmingInstance => {
  const warmingConfig = {...DEFAULT_CACHE_WARMING_CONFIG, ...config}
  const eventEmitter = createEventEmitter<CacheWarmingEvents>()

  // Private state managed in closure
  const warmingJobs = new Map<string, CacheWarmingJob>()
  let stats: CacheWarmingStats = {
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
  }
  let lastWarmingTime = 0
  const warmingTimes: number[] = []

  /**
   * Generate unique job ID for warming operation
   */
  const generateJobId = (): string => {
    const timestamp = Date.now()
    const random = Math.random().toString(36).slice(2, 8)
    return `warming_${timestamp}_${random}`
  }

  /**
   * Check if enough time has passed since last warming
   */
  const canWarmNow = (): boolean => {
    const timeSinceLastWarming = Date.now() - lastWarmingTime
    return timeSinceLastWarming >= warmingConfig.minWarmingInterval
  }

  /**
   * Get all episodes from the Star Trek catalog
   */
  const getAllEpisodes = (): Episode[] => {
    return pipe(
      starTrekData,
      (eras: StarTrekEra[]) => eras.flatMap(era => era.items),
      items => items.flatMap(item => item.episodeData || []),
    )
  }

  /**
   * Find episode by ID in the catalog
   */
  const findEpisodeById = (episodeId: string): Episode | null => {
    const allEpisodes = getAllEpisodes()
    return allEpisodes.find(ep => ep.id === episodeId) || null
  }

  /**
   * Extract series ID from episode ID (e.g., 'ent_s1_e01' -> 'ent_s1')
   */
  const getSeriesIdFromEpisode = (episodeId: string): string | null => {
    const match = episodeId.match(/^([a-z]+)_s(\d+)/)
    return match ? `${match[1]}_s${match[2]}` : null
  }

  /**
   * Get next N episodes in sequence for a given episode
   */
  const getNextEpisodesInSequence = (episodeId: string, count: number): Episode[] => {
    const episode = findEpisodeById(episodeId)
    if (!episode) return []

    const seriesId = getSeriesIdFromEpisode(episodeId)
    if (!seriesId) return []

    // Find the series in the catalog
    const allItems = pipe(starTrekData, (eras: StarTrekEra[]) => eras.flatMap(era => era.items))
    const series = allItems.find(item => item.id === seriesId)
    if (!series || !series.episodeData) return []

    // Find current episode index
    const episodes = series.episodeData
    const currentIndex = episodes.findIndex(ep => ep.id === episodeId)
    if (currentIndex === -1) return []

    // Return next N episodes
    return episodes.slice(currentIndex + 1, currentIndex + 1 + count)
  }

  /**
   * Identify popular episodes that should be warmed
   * Criteria: series/season premieres, pilot episodes
   */
  const getPopularEpisodes = (): Episode[] => {
    const allEpisodes = getAllEpisodes()

    return allEpisodes.filter(episode => {
      // Series premieres (S1E1)
      if (episode.season === 1 && episode.episode === 1) return true

      // Season premieres (S*E1)
      if (episode.episode === 1) return true

      return false
    })
  }

  /**
   * Get episodes from specific era
   */
  const getEraEpisodes = (eraId: string, limit: number): Episode[] => {
    const era = starTrekData.find(e => e.id === eraId)
    if (!era) return []

    const episodes = era.items.flatMap(item => item.episodeData ?? [])
    return episodes.slice(0, limit)
  }

  /**
   * Queue warming job in metadata queue
   */
  const queueWarmingJob = (
    episodeId: string,
    strategy: WarmingStrategy,
    priority: number,
    reason?: string,
  ): string => {
    const jobId = generateJobId()
    const job: CacheWarmingJob = {
      jobId,
      episodeId,
      strategy,
      priority,
      createdAt: new Date().toISOString(),
      ...(reason ? {reason} : {}),
    }

    warmingJobs.set(episodeId, job)

    // Create metadata queue job
    const metadataJob = createMetadataJob('cache-warm', episodeId, priority, {
      warmingStrategy: strategy,
      reason,
    })

    metadataQueue.addJob({
      ...metadataJob,
      retryCount: 0,
      maxRetries: 3,
      scheduledAt: new Date().toISOString(),
    })

    return jobId
  }

  /**
   * Record warming operation completion
   */
  const recordWarmingCompletion = (
    job: CacheWarmingJob,
    success: boolean,
    duration: number,
  ): void => {
    stats.totalWarmed += 1
    if (success) {
      stats.successfulWarming += 1
    } else {
      stats.failedWarming += 1
    }

    stats.warmingByStrategy[job.strategy] += 1
    stats.lastWarmingAt = new Date().toISOString()

    // Track warming times for average calculation
    warmingTimes.push(duration)
    if (warmingTimes.length > 100) {
      warmingTimes.shift()
    }
    stats.avgWarmingTime = warmingTimes.reduce((a, b) => a + b, 0) / warmingTimes.length

    // Calculate cache hit rate (successful / total)
    stats.cacheHitRate = stats.totalWarmed > 0 ? stats.successfulWarming / stats.totalWarmed : 0

    eventEmitter.emit('stats-updated', {stats: {...stats}})

    // Remove completed job
    warmingJobs.delete(job.episodeId)
  }

  // Public API
  return {
    warmPopularEpisodes: async (): Promise<string[]> => {
      if (!warmingConfig.enabled || !warmingConfig.enabledStrategies.includes('popular-episodes')) {
        return []
      }

      if (!canWarmNow()) {
        return []
      }

      const popularEpisodes = getPopularEpisodes()
      const episodeIds = popularEpisodes.map(ep => ep.id).slice(0, warmingConfig.maxBatchSize)

      eventEmitter.emit('popular-episodes-detected', {
        episodeIds,
        count: episodeIds.length,
      })

      const jobIds: string[] = []
      for (const episodeId of episodeIds) {
        if (!warmingJobs.has(episodeId)) {
          const jobId = queueWarmingJob(
            episodeId,
            'popular-episodes',
            warmingConfig.defaultPriority + 1,
            'Series/season premiere',
          )
          jobIds.push(jobId)
        }
      }

      const startTime = Date.now()
      eventEmitter.emit('warming-started', {
        job: {
          jobId: jobIds[0] || 'batch',
          episodeId: episodeIds[0] || 'unknown',
          strategy: 'popular-episodes',
          priority: warmingConfig.defaultPriority + 1,
          createdAt: new Date().toISOString(),
        },
        episodeCount: episodeIds.length,
      })

      lastWarmingTime = Date.now()

      // Simulate async completion (actual completion happens via metadata queue events)
      setTimeout(() => {
        const duration = Date.now() - startTime
        jobIds.forEach(jobId => {
          const job = Array.from(warmingJobs.values()).find(j => j.jobId === jobId)
          if (job) {
            recordWarmingCompletion(job, true, duration)
            eventEmitter.emit('warming-completed', {job, duration})
          }
        })
      }, 100)

      return episodeIds
    },

    warmRecentlyWatched: async (episodeId: string): Promise<string[]> => {
      if (!warmingConfig.enabled || !warmingConfig.enabledStrategies.includes('recently-watched')) {
        return []
      }

      if (!canWarmNow()) {
        return []
      }

      const nextEpisodes = getNextEpisodesInSequence(episodeId, warmingConfig.lookAheadCount)
      const nextEpisodeIds = nextEpisodes.map(ep => ep.id)

      if (nextEpisodeIds.length === 0) {
        return []
      }

      eventEmitter.emit('recently-watched-detected', {
        episodeId,
        nextEpisodeIds,
      })

      const jobIds: string[] = []
      for (const nextEpisodeId of nextEpisodeIds) {
        if (!warmingJobs.has(nextEpisodeId)) {
          const jobId = queueWarmingJob(
            nextEpisodeId,
            'recently-watched',
            warmingConfig.defaultPriority,
            `Next after ${episodeId}`,
          )
          jobIds.push(jobId)
        }
      }

      lastWarmingTime = Date.now()
      return nextEpisodeIds
    },

    warmSequentialEpisodes: async (episodeId: string, count?: number): Promise<string[]> => {
      if (
        !warmingConfig.enabled ||
        !warmingConfig.enabledStrategies.includes('sequential-prediction')
      ) {
        return []
      }

      const lookAhead = count || warmingConfig.lookAheadCount
      const nextEpisodes = getNextEpisodesInSequence(episodeId, lookAhead)
      const predictedEpisodeIds = nextEpisodes.map(ep => ep.id)

      if (predictedEpisodeIds.length === 0) {
        return []
      }

      const seriesId = getSeriesIdFromEpisode(episodeId)
      if (seriesId) {
        eventEmitter.emit('sequential-pattern-detected', {
          seriesId,
          currentEpisode: episodeId,
          predictedEpisodes: predictedEpisodeIds,
        })
      }

      const jobIds: string[] = []
      for (const predictedId of predictedEpisodeIds) {
        if (!warmingJobs.has(predictedId)) {
          const jobId = queueWarmingJob(
            predictedId,
            'sequential-prediction',
            warmingConfig.defaultPriority,
            `Sequential prediction from ${episodeId}`,
          )
          jobIds.push(jobId)
        }
      }

      lastWarmingTime = Date.now()
      return predictedEpisodeIds
    },

    warmEraEpisodes: async (eraId: string, limit = 10): Promise<string[]> => {
      if (!warmingConfig.enabled || !warmingConfig.enabledStrategies.includes('era-based')) {
        return []
      }

      const eraEpisodes = getEraEpisodes(eraId, limit)
      const episodeIds = eraEpisodes.map(ep => ep.id)

      const jobIds: string[] = []
      for (const episodeId of episodeIds) {
        if (!warmingJobs.has(episodeId)) {
          const jobId = queueWarmingJob(
            episodeId,
            'era-based',
            warmingConfig.defaultPriority - 1,
            `Era warming: ${eraId}`,
          )
          jobIds.push(jobId)
        }
      }

      lastWarmingTime = Date.now()
      return episodeIds
    },

    warmNewContent: async (episodeIds: string[]): Promise<string[]> => {
      if (!warmingConfig.enabled || !warmingConfig.enabledStrategies.includes('new-content')) {
        return []
      }

      // Validate that episodes exist in the data
      const validEpisodeIds = episodeIds.filter(episodeId => {
        return starTrekData.some(era =>
          era.items.some(item => (item.episodeData ?? []).some(ep => ep.id === episodeId)),
        )
      })

      if (validEpisodeIds.length === 0) {
        return []
      }

      eventEmitter.emit('new-content-detected', {
        episodeIds: validEpisodeIds,
        addedAt: new Date().toISOString(),
      })

      const jobIds: string[] = []
      for (const episodeId of validEpisodeIds) {
        if (!warmingJobs.has(episodeId)) {
          const jobId = queueWarmingJob(
            episodeId,
            'new-content',
            warmingConfig.defaultPriority + 2,
            'New content',
          )
          jobIds.push(jobId)
        }
      }

      lastWarmingTime = Date.now()
      return validEpisodeIds
    },

    warmEpisode: async (episodeId: string, priority?: number): Promise<boolean> => {
      if (!warmingConfig.enabled) {
        return false
      }

      const episode = findEpisodeById(episodeId)
      if (!episode) {
        return false
      }

      if (warmingJobs.has(episodeId)) {
        return false
      }

      const jobPriority = priority ?? warmingConfig.defaultPriority
      queueWarmingJob(episodeId, 'manual', jobPriority, 'Manual warming')

      const startTime = Date.now()
      const job = warmingJobs.get(episodeId)
      if (job) {
        eventEmitter.emit('warming-started', {
          job,
          episodeCount: 1,
        })

        // Simulate async completion
        setTimeout(() => {
          const duration = Date.now() - startTime
          recordWarmingCompletion(job, true, duration)
          eventEmitter.emit('warming-completed', {job, duration})
        }, 100)
      }

      lastWarmingTime = Date.now()
      return true
    },

    updateConfig: (newConfig: Partial<CacheWarmingConfig>): void => {
      Object.assign(warmingConfig, newConfig)
    },

    getStats: (): CacheWarmingStats => {
      return {...stats}
    },

    resetStats: (): void => {
      stats = {
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
      }
      warmingTimes.length = 0
      eventEmitter.emit('stats-updated', {stats: {...stats}})
    },

    isWarmingQueued: (episodeId: string): boolean => {
      return warmingJobs.has(episodeId)
    },

    cancelWarming: (episodeId: string): boolean => {
      const job = warmingJobs.get(episodeId)
      if (!job) {
        return false
      }

      warmingJobs.delete(episodeId)
      return true
    },

    // EventEmitter methods
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    once: eventEmitter.once.bind(eventEmitter),
  }
}
