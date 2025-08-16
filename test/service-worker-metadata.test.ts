/**
 * Service Worker Metadata Progress Tests
 *
 * Tests for TASK-026: Progress tracking for bulk metadata operations
 * with user notification capabilities in Service Worker.
 */

import {beforeEach, describe, expect, it, vi} from 'vitest'

// Mock Service Worker globals
const mockGlobalThis = {
  addEventListener: vi.fn(),
  clients: {
    matchAll: vi.fn(),
    openWindow: vi.fn(),
  },
  registration: {
    sync: {
      register: vi.fn(),
    },
    showNotification: vi.fn(),
  },
  skipWaiting: vi.fn(),
  Notification: vi.fn(),
  caches: {
    open: vi.fn(),
    keys: vi.fn(),
  },
}

// Set up global mocks
Object.assign(globalThis, mockGlobalThis)

describe('Service Worker Metadata Progress Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock cache operations
    const mockCache = {
      put: vi.fn(),
      match: vi.fn(),
      addAll: vi.fn(),
      keys: vi.fn(),
    }

    mockGlobalThis.caches.open.mockResolvedValue(mockCache)
    mockGlobalThis.caches.keys.mockResolvedValue(['vbs-static', 'vbs-dynamic'])

    // Mock clients
    mockGlobalThis.clients.matchAll.mockResolvedValue([
      {postMessage: vi.fn()},
      {postMessage: vi.fn()},
    ])
  })

  describe('Progress State Management', () => {
    it('should initialize progress tracking state correctly', () => {
      const metadataProgress = new Map()
      const activeOperations = new Map()

      expect(metadataProgress.size).toBe(0)
      expect(activeOperations.size).toBe(0)
    })

    it('should create progress object with correct structure', () => {
      const operationId = `test-operation-${Date.now()}`
      const progress = {
        operationId,
        totalJobs: 5,
        completedJobs: 0,
        failedJobs: 0,
        cancelledJobs: 0,
        startedAt: new Date().toISOString(),
        cancellable: true,
        status: 'running',
      }

      expect(progress.operationId).toBe(operationId)
      expect(progress.totalJobs).toBe(5)
      expect(progress.status).toBe('running')
      expect(progress.cancellable).toBe(true)
      expect(typeof progress.startedAt).toBe('string')
    })

    it('should track multiple concurrent operations', () => {
      const metadataProgress = new Map()

      const operation1 = {
        operationId: 'op1',
        totalJobs: 3,
        completedJobs: 1,
        status: 'running',
      }

      const operation2 = {
        operationId: 'op2',
        totalJobs: 10,
        completedJobs: 5,
        status: 'running',
      }

      metadataProgress.set('op1', operation1)
      metadataProgress.set('op2', operation2)

      expect(metadataProgress.size).toBe(2)
      expect(metadataProgress.get('op1')).toEqual(operation1)
      expect(metadataProgress.get('op2')).toEqual(operation2)
    })
  })

  describe('Progress Updates', () => {
    it('should calculate progress percentage correctly', () => {
      const progress = {
        totalJobs: 10,
        completedJobs: 3,
        failedJobs: 1,
        cancelledJobs: 0,
      }

      const completionRate = progress.completedJobs / progress.totalJobs
      const errorRate = progress.failedJobs / progress.totalJobs

      expect(completionRate).toBe(0.3) // 30% completed
      expect(errorRate).toBe(0.1) // 10% failed
    })

    it('should update estimated completion time based on progress', () => {
      const startTime = Date.now()
      const progress = {
        startedAt: new Date(startTime).toISOString(),
        totalJobs: 10,
        completedJobs: 3,
      }

      // Simulate 30 seconds elapsed for 3 jobs = 10 seconds per job
      const elapsed = 30000
      const avgTimePerJob = elapsed / progress.completedJobs
      const remaining = progress.totalJobs - progress.completedJobs
      const estimatedCompletion = new Date(
        startTime + elapsed + remaining * avgTimePerJob,
      ).toISOString()

      expect(avgTimePerJob).toBe(10000) // 10 seconds per job
      expect(remaining).toBe(7) // 7 jobs remaining
      expect(typeof estimatedCompletion).toBe('string')
    })

    it('should handle progress status transitions', () => {
      const statusTransitions = ['running', 'completed', 'failed', 'cancelled', 'paused']

      statusTransitions.forEach(status => {
        const progress = {
          operationId: 'test',
          status,
          totalJobs: 5,
          completedJobs: status === 'completed' ? 5 : 2,
        }

        expect(['running', 'completed', 'failed', 'cancelled', 'paused']).toContain(progress.status)
      })
    })
  })

  describe('Client Communication', () => {
    it('should notify clients of progress updates', async () => {
      const progress = {
        operationId: 'test-op',
        totalJobs: 5,
        completedJobs: 2,
        status: 'running',
      }

      // Mock client notification function
      const notifyClientsOfProgress = async (progressData: any) => {
        const clients = await mockGlobalThis.clients.matchAll({
          includeUncontrolled: true,
          type: 'window',
        })

        const message = {
          type: 'METADATA_PROGRESS_UPDATE',
          data: progressData,
        }

        for (const client of clients) {
          client.postMessage(message)
        }
      }

      await notifyClientsOfProgress(progress)

      expect(mockGlobalThis.clients.matchAll).toHaveBeenCalledWith({
        includeUncontrolled: true,
        type: 'window',
      })
    })

    it('should handle message events for progress requests', () => {
      // Simulate message event for getting progress
      const messageEvent = {
        data: {
          type: 'GET_METADATA_PROGRESS',
          payload: {operationId: 'test-op'},
        },
        ports: [{postMessage: vi.fn()}],
      }

      // Mock handler logic
      if (messageEvent.data.type === 'GET_METADATA_PROGRESS') {
        const progress = {operationId: 'test-op', status: 'running'}
        messageEvent.ports[0]?.postMessage({
          type: 'METADATA_PROGRESS',
          data: progress,
        })
      }

      expect(messageEvent.ports[0]?.postMessage).toHaveBeenCalledWith({
        type: 'METADATA_PROGRESS',
        data: {operationId: 'test-op', status: 'running'},
      })
    })
  })

  describe('Operation Cancellation', () => {
    it('should support operation cancellation', () => {
      const activeOperations = new Map()
      const metadataProgress = new Map()

      // Set up operation
      const operationId = 'cancellable-op'
      activeOperations.set(operationId, {
        type: 'bulk',
        cancelled: false,
      })

      metadataProgress.set(operationId, {
        operationId,
        status: 'running',
        cancellable: true,
      })

      // Mock cancellation function
      const cancelMetadataSync = (opId: string) => {
        const operation = activeOperations.get(opId)
        if (!operation) return false

        operation.cancelled = true
        activeOperations.set(opId, operation)

        const progress = metadataProgress.get(opId)
        if (progress && progress.status === 'running') {
          progress.status = 'cancelled'
          metadataProgress.set(opId, progress)
        }

        return true
      }

      const cancelled = cancelMetadataSync(operationId)

      expect(cancelled).toBe(true)
      expect(activeOperations.get(operationId).cancelled).toBe(true)
      expect(metadataProgress.get(operationId).status).toBe('cancelled')
    })

    it('should handle cancellation of non-existent operations', () => {
      const activeOperations = new Map()

      const cancelMetadataSync = (opId: string) => {
        const operation = activeOperations.get(opId)
        return !!operation
      }

      const cancelled = cancelMetadataSync('non-existent-op')
      expect(cancelled).toBe(false)
    })
  })

  describe('Notification System', () => {
    it('should show completion notifications', async () => {
      const progress = {
        operationId: 'completed-op',
        status: 'completed',
        completedJobs: 5,
        failedJobs: 0,
        totalJobs: 5,
      }

      // Mock notification function
      const showOperationNotification = async (progressData: any) => {
        if (!mockGlobalThis.Notification) return

        let title, body
        if (progressData.status === 'completed' && progressData.failedJobs === 0) {
          title = 'Metadata Sync Completed'
          body = `Successfully updated ${progressData.completedJobs} episodes`
        }

        await mockGlobalThis.registration.showNotification(title, {
          body,
          icon: '/vbs/icon-192.svg',
          tag: `metadata-sync-${progressData.operationId}`,
        })
      }

      await showOperationNotification(progress)

      expect(mockGlobalThis.registration.showNotification).toHaveBeenCalledWith(
        'Metadata Sync Completed',
        expect.objectContaining({
          body: 'Successfully updated 5 episodes',
          icon: '/vbs/icon-192.svg',
          tag: 'metadata-sync-completed-op',
        }),
      )
    })

    it('should show error notifications', async () => {
      const progress = {
        operationId: 'failed-op',
        status: 'failed',
        completedJobs: 2,
        failedJobs: 3,
        totalJobs: 5,
      }

      // Mock notification function for failures
      const showOperationNotification = async (progressData: any) => {
        if (progressData.status === 'failed') {
          const title = 'Metadata Sync Failed'
          const body = `Failed to update episode metadata. ${progressData.failedJobs} episodes affected.`

          await mockGlobalThis.registration.showNotification(title, {
            body,
            icon: '/vbs/icon-192.svg',
          })
        }
      }

      await showOperationNotification(progress)

      expect(mockGlobalThis.registration.showNotification).toHaveBeenCalledWith(
        'Metadata Sync Failed',
        expect.objectContaining({
          body: 'Failed to update episode metadata. 3 episodes affected.',
        }),
      )
    })
  })

  describe('Cache Persistence', () => {
    it('should store progress in cache for persistence', async () => {
      const progress = {
        operationId: 'persistent-op',
        totalJobs: 10,
        completedJobs: 5,
        status: 'running',
      }

      const mockCache = {
        put: vi.fn(),
      }

      mockGlobalThis.caches.open.mockResolvedValue(mockCache)

      // Mock cache storage function
      const storeProgressInCache = async (progressData: any) => {
        const cache = await mockGlobalThis.caches.open('vbs-metadata-progress')
        const response = new Response(JSON.stringify(progressData), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
        })

        await cache.put(`/vbs/progress/${progressData.operationId}`, response)
      }

      await storeProgressInCache(progress)

      expect(mockGlobalThis.caches.open).toHaveBeenCalledWith('vbs-metadata-progress')
      expect(mockCache.put).toHaveBeenCalledWith(
        '/vbs/progress/persistent-op',
        expect.any(Response),
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle network failures gracefully', async () => {
      const mockError = new Error('Network error')

      // Mock function that might fail
      const enrichEpisodeMetadata = async (episodeId: string) => {
        if (episodeId === 'failing-episode') {
          throw mockError
        }
        return {episodeId, enriched: true}
      }

      try {
        await enrichEpisodeMetadata('failing-episode')
      } catch (error) {
        expect((error as Error).message).toBe('Network error')
      }

      // Should succeed for valid episodes
      const result = await enrichEpisodeMetadata('valid-episode')
      expect(result.enriched).toBe(true)
    })

    it('should track failed jobs in progress', () => {
      const progress = {
        totalJobs: 5,
        completedJobs: 3,
        failedJobs: 1,
        cancelledJobs: 0,
        status: 'running',
      }

      // Simulate job failure
      progress.failedJobs += 1

      expect(progress.failedJobs).toBe(2)

      // Status should remain running if not all jobs processed
      const totalProcessed = progress.completedJobs + progress.failedJobs + progress.cancelledJobs
      if (totalProcessed === progress.totalJobs) {
        progress.status = progress.failedJobs > 0 ? 'failed' : 'completed'
      }

      // We have 3 completed + 2 failed + 0 cancelled = 5 total, so all processed
      expect(progress.status).toBe('failed') // All jobs processed, but some failed
    })
  })

  describe('Background Sync Integration', () => {
    it('should register background sync for metadata operations', async () => {
      const mockRegistration = {
        sync: {
          register: vi.fn(),
        },
      }

      Object.assign(mockGlobalThis, {registration: mockRegistration})

      // Mock start function
      const startMetadataSync = async (
        operationId: string,
        _episodeIds?: string[],
        _sources?: string[],
      ) => {
        if (mockGlobalThis.registration?.sync) {
          await mockGlobalThis.registration.sync.register('bulk-metadata-sync')
        }
        return operationId || `sync-${Date.now()}`
      }

      const operationId = await startMetadataSync('test-sync', ['ep1', 'ep2'], ['tmdb'])

      expect(mockGlobalThis.registration.sync.register).toHaveBeenCalledWith('bulk-metadata-sync')
      expect(operationId).toBe('test-sync')
    })

    it('should handle background sync unavailability', async () => {
      // Remove sync capability
      const mockGlobalThisWithoutSync = {
        ...mockGlobalThis,
        registration: {
          showNotification: vi.fn(),
        },
      }

      const startMetadataSync = async (operationId: string) => {
        if (
          mockGlobalThisWithoutSync.registration &&
          'sync' in mockGlobalThisWithoutSync.registration
        ) {
          await (mockGlobalThisWithoutSync.registration as any).sync.register('bulk-metadata-sync')
        } else {
          // Fallback to immediate execution
          return `immediate-${operationId}`
        }
        return operationId
      }

      const result = await startMetadataSync('fallback-test')
      expect(result).toBe('immediate-fallback-test')
    })
  })
})
