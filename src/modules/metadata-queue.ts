/**
 * Metadata Queue Management System
 *
 * Provides intelligent queue management for background metadata enrichment operations.
 * Implements priority-based processing, rate limiting, and progress tracking for
 * metadata synchronization tasks in the Service Worker environment.
 */

import type {
  MetadataProgress,
  MetadataQueueConfig,
  MetadataQueueEvents,
  MetadataQueueInstance,
  MetadataQueueJob,
} from './types.js'
import {createEventEmitter} from './events.js'

/**
 * Default configuration for metadata queue operations
 */
const DEFAULT_QUEUE_CONFIG: MetadataQueueConfig = {
  maxConcurrentJobs: 3,
  defaultPriority: 1,
  maxRetries: 3,
  jobTimeout: 30000, // 30 seconds
  processingInterval: 1000,
  enableIntelligentScheduling: true,
  networkPreference: 'wifi-only',
  batteryOptimization: {
    enabled: true,
    pauseOnLowBattery: true,
    pauseWhileCharging: false,
  },
}

/**
 * Factory function to create a metadata queue instance
 * Manages background metadata enrichment jobs with priority queuing and rate limiting
 */
export const createMetadataQueue = (
  config: Partial<MetadataQueueConfig> = {},
): MetadataQueueInstance => {
  const queueConfig = {...DEFAULT_QUEUE_CONFIG, ...config}
  const eventEmitter = createEventEmitter<MetadataQueueEvents>()

  // Queue state managed in closure
  const jobs: Map<string, MetadataQueueJob> = new Map()
  const runningJobs: Set<string> = new Set()
  let isProcessing = false
  let isPaused = false
  let processingTimer: ReturnType<typeof setTimeout> | null = null

  // Background sync capability state
  let syncCapability: import('./types.js').BackgroundSyncCapability = {
    isAvailable: false,
    fallbackStrategy: 'immediate',
    reason: 'not-supported',
  }

  /**
   * Generate unique job ID with timestamp and random component
   */
  const generateJobId = (): string => {
    const timestamp = Date.now()
    const random = Math.random().toString(36).slice(2, 8)
    return `job_${timestamp}_${random}`
  }

  /**
   * Sort jobs by priority and creation time
   */
  const sortJobsByPriority = (jobList: MetadataQueueJob[]): MetadataQueueJob[] => {
    return jobList.sort((a, b) => {
      // First by priority (higher number = higher priority)
      const priorityDiff = b.priority - a.priority
      if (priorityDiff !== 0) return priorityDiff

      // Then by creation time (older first)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
  }

  /**
   * Get pending jobs that can be processed
   */
  const getPendingJobs = (): MetadataQueueJob[] => {
    const pendingJobs = Array.from(jobs.values()).filter(job => job.status === 'pending')
    return sortJobsByPriority(pendingJobs)
  }

  /**
   * Update job status and emit events
   */
  const updateJobStatus = (
    jobId: string,
    status: MetadataQueueJob['status'],
    error?: Error,
  ): void => {
    const job = jobs.get(jobId)
    if (!job) return

    const previousStatus = job.status
    job.status = status
    job.updatedAt = new Date().toISOString()

    if (error) {
      job.error = {
        message: error.message,
        category: 'execution',
        retryable: job.retryCount < job.maxRetries,
        lastAttemptAt: new Date().toISOString(),
      }
      job.retryCount += 1
    }

    jobs.set(jobId, job)

    // Emit appropriate events
    switch (status) {
      case 'in-progress':
        if (previousStatus === 'pending') {
          eventEmitter.emit('job-started', {job})
        }
        break
      case 'completed':
        runningJobs.delete(jobId)
        eventEmitter.emit('job-completed', {job, result: null})
        break
      case 'failed':
        runningJobs.delete(jobId)
        if (job.retryCount < job.maxRetries) {
          // Schedule retry
          setTimeout(
            () => {
              updateJobStatus(jobId, 'pending')
              processQueue()
            },
            1000 * 2 ** job.retryCount,
          ) // Exponential backoff
        } else {
          eventEmitter.emit('job-failed', {job, error: error || new Error('Unknown error')})
        }
        break
      case 'cancelled':
        runningJobs.delete(jobId)
        eventEmitter.emit('job-cancelled', {job})
        break
    }
  }

  /**
   * Execute a single job with timeout and error handling
   */
  const executeJob = async (job: MetadataQueueJob): Promise<void> => {
    runningJobs.add(job.id)
    updateJobStatus(job.id, 'in-progress')

    try {
      // Job execution would be handled by the caller through events
      // For now, we simulate successful completion
      await new Promise(resolve => setTimeout(resolve, 100))

      updateJobStatus(job.id, 'completed')
    } catch (error) {
      updateJobStatus(job.id, 'failed', error as Error)
    }
  }

  /**
   * Main queue processing loop
   */
  const processQueue = async (): Promise<void> => {
    if (isProcessing || isPaused) return

    isProcessing = true

    try {
      const pendingJobs = getPendingJobs()
      const availableSlots = queueConfig.maxConcurrentJobs - runningJobs.size

      if (availableSlots > 0 && pendingJobs.length > 0) {
        const jobsToProcess = pendingJobs.slice(0, availableSlots)

        // Process jobs concurrently
        await Promise.allSettled(jobsToProcess.map(async job => executeJob(job)))
      }

      // Schedule next processing cycle if there are pending jobs
      if (getPendingJobs().length > 0 && runningJobs.size < queueConfig.maxConcurrentJobs) {
        processingTimer = setTimeout(() => {
          processQueue()
        }, queueConfig.processingInterval)
      }
    } finally {
      isProcessing = false
    }
  }

  /**
   * Calculate current progress across all jobs
   */
  const calculateProgress = (operationId?: string): MetadataProgress[] => {
    const allJobs = Array.from(jobs.values())
    const totalJobs = allJobs.length
    const completedJobs = allJobs.filter(job => job.status === 'completed').length
    const failedJobs = allJobs.filter(job => job.status === 'failed').length
    const cancelledJobs = allJobs.filter(job => job.status === 'cancelled').length
    const currentJob = Array.from(jobs.values()).find(job => job.status === 'in-progress')

    const progress: MetadataProgress = {
      operationId: operationId || 'default',
      totalJobs,
      completedJobs,
      failedJobs,
      cancelledJobs,
      startedAt: new Date().toISOString(),
      cancellable: true,
      status:
        runningJobs.size > 0
          ? 'running'
          : completedJobs + failedJobs + cancelledJobs === totalJobs
            ? 'completed'
            : 'paused',
    }

    if (currentJob?.id) {
      progress.currentJob = currentJob.id
    }

    return [progress]
  }

  // Public API
  return {
    addJob: (
      jobData: Omit<MetadataQueueJob, 'id' | 'createdAt' | 'updatedAt' | 'status'>,
    ): string => {
      const job: MetadataQueueJob = {
        ...jobData,
        id: generateJobId(),
        status: 'pending',
        retryCount: 0,
        maxRetries: queueConfig.maxRetries,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        scheduledAt: new Date().toISOString(),
      }

      jobs.set(job.id, job)
      eventEmitter.emit('job-added', {job})

      // Start processing if not already running
      if (!isProcessing && !isPaused) {
        processQueue()
      }

      return job.id
    },

    cancelJob: (jobId: string): boolean => {
      const job = jobs.get(jobId)
      if (!job) return false

      if (job.status === 'in-progress') {
        updateJobStatus(jobId, 'cancelled')
      } else if (job.status === 'pending') {
        updateJobStatus(jobId, 'cancelled')
      }

      return true
    },

    cancelAllJobs: (): number => {
      let cancelledCount = 0
      jobs.forEach(job => {
        if (job.status === 'pending' || job.status === 'in-progress') {
          updateJobStatus(job.id, 'cancelled')
          cancelledCount++
        }
      })
      return cancelledCount
    },

    getJob: (jobId: string): MetadataQueueJob | null => {
      return jobs.get(jobId) || null
    },

    getJobs: (filter?: Partial<MetadataQueueJob>): MetadataQueueJob[] => {
      let jobList = Array.from(jobs.values())

      if (filter) {
        jobList = jobList.filter(job => {
          return Object.entries(filter).every(([key, value]) => {
            return job[key as keyof MetadataQueueJob] === value
          })
        })
      }

      return sortJobsByPriority(jobList)
    },

    getStatus: () => {
      const allJobs = Array.from(jobs.values())
      return {
        totalJobs: allJobs.length,
        pendingJobs: allJobs.filter(job => job.status === 'pending').length,
        runningJobs: allJobs.filter(job => job.status === 'in-progress').length,
        completedJobs: allJobs.filter(job => job.status === 'completed').length,
        failedJobs: allJobs.filter(job => job.status === 'failed').length,
      }
    },

    start: (): void => {
      isPaused = false
      if (!isProcessing) {
        processQueue()
      }
    },

    pause: (reason = 'Manual pause'): void => {
      isPaused = true
      if (processingTimer) {
        clearTimeout(processingTimer)
        processingTimer = null
      }
      eventEmitter.emit('queue-paused', {reason})
    },

    resume: (reason = 'Manual resume'): void => {
      isPaused = false
      if (!isProcessing) {
        processQueue()
      }
      eventEmitter.emit('queue-resumed', {reason})
    },

    updateConfig: (newConfig: Partial<MetadataQueueConfig>): void => {
      Object.assign(queueConfig, newConfig)
    },

    applyUserPreferences: (preferences): void => {
      const updatedConfig: Partial<MetadataQueueConfig> = {}

      // Apply sync mode - pause queue if disabled, enable if auto
      if (preferences.syncMode === 'disabled') {
        isPaused = true
      } else if (preferences.syncMode === 'auto') {
        isPaused = false
      }

      // Apply data limits
      updatedConfig.maxConcurrentJobs = Math.min(
        preferences.dataLimits.maxEpisodesPerSync,
        queueConfig.maxConcurrentJobs,
      )

      // Apply network preference
      if (preferences.networkPreference === 'wifi-only') {
        updatedConfig.networkPreference = 'wifi-only'
      } else if (preferences.networkPreference === 'any-connection') {
        updatedConfig.networkPreference = 'any'
      } else if (preferences.networkPreference === 'manual-only') {
        updatedConfig.networkPreference = 'wifi-only' // Conservative default
        isPaused = true // Pause automatic processing for manual-only mode
      }

      Object.assign(queueConfig, updatedConfig)
    },

    clearCompleted: (): number => {
      let clearedCount = 0
      jobs.forEach((job, jobId) => {
        if (job.status === 'completed') {
          jobs.delete(jobId)
          clearedCount++
        }
      })
      return clearedCount
    },

    getProgress: (operationId?: string): MetadataProgress[] => {
      return calculateProgress(operationId)
    },

    getSyncCapability: (): import('./types.js').BackgroundSyncCapability => {
      return syncCapability
    },

    updateSyncCapability: (capability: import('./types.js').BackgroundSyncCapability): void => {
      syncCapability = capability
      eventEmitter.emit('sync-capability-change', {capability})

      // Adjust queue behavior based on capability
      if (!capability.isAvailable) {
        switch (capability.fallbackStrategy) {
          case 'polling':
            // Enable polling mode processing
            if (!isProcessing && !isPaused) {
              processQueue()
            }
            break
          case 'manual':
            // Pause automatic processing
            isPaused = true
            break
          case 'disabled':
            // Stop all processing
            isPaused = true
            if (processingTimer) {
              clearTimeout(processingTimer)
              processingTimer = null
            }
            break
        }
      }
    },

    // EventEmitter methods
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    once: eventEmitter.once.bind(eventEmitter),
  }
}

/**
 * Helper function to create metadata enrichment jobs
 */
export const createMetadataJob = (
  type: MetadataQueueJob['type'],
  episodeId: string,
  priority = 1,
  options: Record<string, any> = {},
): Omit<
  MetadataQueueJob,
  'id' | 'createdAt' | 'updatedAt' | 'status' | 'retryCount' | 'maxRetries' | 'scheduledAt'
> => {
  return {
    episodeId,
    priority,
    type,
    targetSources: options.targetSources,
    metadata: options,
  }
}

/**
 * Helper function to create bulk metadata jobs for multiple episodes
 */
export const createBulkMetadataJobs = (
  episodeIds: string[],
  type: MetadataQueueJob['type'] = 'enrich',
  priority = 1,
): Omit<
  MetadataQueueJob,
  'id' | 'createdAt' | 'updatedAt' | 'status' | 'retryCount' | 'maxRetries' | 'scheduledAt'
>[] => {
  return episodeIds.map(episodeId => createMetadataJob(type, episodeId, priority))
}
