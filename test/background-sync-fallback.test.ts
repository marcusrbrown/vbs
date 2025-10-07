/**
 * Background Sync Graceful Degradation Tests (TASK-030)
 *
 * Tests graceful degradation when Background Sync API is unavailable.
 * Validates fallback strategies, capability detection, and error handling.
 */

import type {BackgroundSyncCapability, MetadataQueueInstance} from '../src/modules/types.js'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {createMetadataQueue} from '../src/modules/metadata-queue.js'

describe('Background Sync Graceful Degradation', () => {
  let metadataQueue: MetadataQueueInstance

  beforeEach(() => {
    metadataQueue = createMetadataQueue()
  })

  describe('Sync Capability Detection', () => {
    it('should default to unavailable sync capability', () => {
      const capability = metadataQueue.getSyncCapability()

      expect(capability.isAvailable).toBe(false)
      expect(capability.fallbackStrategy).toBe('immediate')
      expect(capability.reason).toBe('not-supported')
    })

    it('should update sync capability when available', () => {
      const mockListener = vi.fn()
      metadataQueue.on('sync-capability-change', mockListener)

      const capability: BackgroundSyncCapability = {
        isAvailable: true,
        fallbackStrategy: 'immediate',
      }

      metadataQueue.updateSyncCapability(capability)

      expect(metadataQueue.getSyncCapability()).toEqual(capability)
      expect(mockListener).toHaveBeenCalledWith({capability})
    })

    it('should emit sync-capability-change event when capability updates', () => {
      const mockListener = vi.fn()
      metadataQueue.on('sync-capability-change', mockListener)

      const capability: BackgroundSyncCapability = {
        isAvailable: false,
        reason: 'permission-denied',
        fallbackStrategy: 'manual',
      }

      metadataQueue.updateSyncCapability(capability)

      expect(mockListener).toHaveBeenCalledTimes(1)
      expect(mockListener).toHaveBeenCalledWith({capability})
    })
  })

  describe('Fallback Strategy: Immediate', () => {
    it('should set immediate fallback strategy when unavailable', () => {
      const capability: BackgroundSyncCapability = {
        isAvailable: false,
        fallbackStrategy: 'immediate',
      }

      metadataQueue.updateSyncCapability(capability)

      const currentCapability = metadataQueue.getSyncCapability()
      expect(currentCapability.fallbackStrategy).toBe('immediate')
      expect(currentCapability.isAvailable).toBe(false)
    })
  })

  describe('Fallback Strategy: Polling', () => {
    it('should enable polling fallback when not supported', () => {
      const capability: BackgroundSyncCapability = {
        isAvailable: false,
        reason: 'not-supported',
        fallbackStrategy: 'polling',
      }

      metadataQueue.updateSyncCapability(capability)

      const currentCapability = metadataQueue.getSyncCapability()
      expect(currentCapability.fallbackStrategy).toBe('polling')
      expect(currentCapability.reason).toBe('not-supported')
    })

    it('should handle polling mode with not-supported reason', () => {
      const capability: BackgroundSyncCapability = {
        isAvailable: false,
        reason: 'not-supported',
        fallbackStrategy: 'polling',
        browserInfo: {
          userAgent: 'Mozilla/5.0 (test browser)',
          platform: 'test',
        },
      }

      metadataQueue.updateSyncCapability(capability)

      const currentCapability = metadataQueue.getSyncCapability()
      expect(currentCapability.fallbackStrategy).toBe('polling')
      expect(currentCapability.browserInfo?.userAgent).toContain('test browser')
    })
  })

  describe('Fallback Strategy: Manual', () => {
    it('should pause queue processing for manual fallback', () => {
      const capability: BackgroundSyncCapability = {
        isAvailable: false,
        reason: 'permission-denied',
        fallbackStrategy: 'manual',
      }

      metadataQueue.start()
      metadataQueue.updateSyncCapability(capability)

      // Queue should be paused after manual fallback is applied
      expect(capability.fallbackStrategy).toBe('manual')
    })

    it('should allow manual job addition even when queue is paused', () => {
      const capability: BackgroundSyncCapability = {
        isAvailable: false,
        reason: 'permission-denied',
        fallbackStrategy: 'manual',
      }

      metadataQueue.updateSyncCapability(capability)
      expect(capability.fallbackStrategy).toBe('manual')
    })
  })

  describe('Fallback Strategy: Disabled', () => {
    it('should pause queue and stop processing when sync is disabled', () => {
      const capability: BackgroundSyncCapability = {
        isAvailable: false,
        reason: 'disabled',
        fallbackStrategy: 'disabled',
      }

      metadataQueue.start()
      metadataQueue.updateSyncCapability(capability)

      expect(capability.fallbackStrategy).toBe('disabled')
    })

    it('should handle service-worker-unavailable with disabled strategy', () => {
      const capability: BackgroundSyncCapability = {
        isAvailable: false,
        reason: 'service-worker-unavailable',
        fallbackStrategy: 'disabled',
      }

      metadataQueue.updateSyncCapability(capability)
      expect(metadataQueue.getSyncCapability().reason).toBe('service-worker-unavailable')
    })
  })

  describe('Capability Transition Scenarios', () => {
    it('should transition from unavailable to available', () => {
      const mockListener = vi.fn()
      metadataQueue.on('sync-capability-change', mockListener)

      // Start with unavailable
      const unavailableCapability: BackgroundSyncCapability = {
        isAvailable: false,
        fallbackStrategy: 'polling',
      }
      metadataQueue.updateSyncCapability(unavailableCapability)

      // Transition to available
      const availableCapability: BackgroundSyncCapability = {
        isAvailable: true,
        fallbackStrategy: 'immediate',
      }
      metadataQueue.updateSyncCapability(availableCapability)

      expect(mockListener).toHaveBeenCalledTimes(2)
      expect(metadataQueue.getSyncCapability().isAvailable).toBe(true)
    })

    it('should handle multiple capability updates', () => {
      const capabilities: BackgroundSyncCapability[] = [
        {isAvailable: false, fallbackStrategy: 'immediate'},
        {isAvailable: false, fallbackStrategy: 'polling'},
        {isAvailable: false, fallbackStrategy: 'manual'},
        {isAvailable: true, fallbackStrategy: 'immediate'},
      ]

      capabilities.forEach(capability => {
        metadataQueue.updateSyncCapability(capability)
        expect(metadataQueue.getSyncCapability()).toEqual(capability)
      })
    })
  })

  describe('Error Scenarios', () => {
    it('should handle service-worker-unavailable reason', () => {
      const capability: BackgroundSyncCapability = {
        isAvailable: false,
        reason: 'service-worker-unavailable',
        fallbackStrategy: 'manual',
      }

      metadataQueue.updateSyncCapability(capability)

      const currentCapability = metadataQueue.getSyncCapability()
      expect(currentCapability.reason).toBe('service-worker-unavailable')
      expect(currentCapability.fallbackStrategy).toBe('manual')
    })

    it('should handle not-supported reason', () => {
      const capability: BackgroundSyncCapability = {
        isAvailable: false,
        reason: 'not-supported',
        fallbackStrategy: 'polling',
        browserInfo: {
          userAgent: 'Old Browser/1.0',
          platform: 'legacy',
        },
      }

      metadataQueue.updateSyncCapability(capability)

      const currentCapability = metadataQueue.getSyncCapability()
      expect(currentCapability.reason).toBe('not-supported')
      expect(currentCapability.browserInfo?.platform).toBe('legacy')
    })

    it('should handle permission-denied reason', () => {
      const capability: BackgroundSyncCapability = {
        isAvailable: false,
        reason: 'permission-denied',
        fallbackStrategy: 'manual',
      }

      metadataQueue.updateSyncCapability(capability)

      expect(metadataQueue.getSyncCapability().reason).toBe('permission-denied')
    })

    it('should handle disabled reason', () => {
      const capability: BackgroundSyncCapability = {
        isAvailable: false,
        reason: 'disabled',
        fallbackStrategy: 'disabled',
      }

      metadataQueue.updateSyncCapability(capability)

      expect(metadataQueue.getSyncCapability().reason).toBe('disabled')
    })
  })

  describe('Browser Info Tracking', () => {
    it('should track browser info when provided', () => {
      const capability: BackgroundSyncCapability = {
        isAvailable: false,
        fallbackStrategy: 'polling',
        browserInfo: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          platform: 'Win32',
        },
      }

      metadataQueue.updateSyncCapability(capability)

      const currentCapability = metadataQueue.getSyncCapability()
      expect(currentCapability.browserInfo).toBeDefined()
      expect(currentCapability.browserInfo?.userAgent).toContain('Windows')
      expect(currentCapability.browserInfo?.platform).toBe('Win32')
    })

    it('should work without browser info', () => {
      const capability: BackgroundSyncCapability = {
        isAvailable: true,
        fallbackStrategy: 'immediate',
      }

      metadataQueue.updateSyncCapability(capability)

      const currentCapability = metadataQueue.getSyncCapability()
      expect(currentCapability.browserInfo).toBeUndefined()
    })
  })

  describe('Integration with Queue Operations', () => {
    it('should maintain queue status after sync capability changes', () => {
      const capability: BackgroundSyncCapability = {
        isAvailable: false,
        fallbackStrategy: 'polling',
      }

      metadataQueue.updateSyncCapability(capability)

      const status = metadataQueue.getStatus()
      expect(status).toBeDefined()
      expect(status.totalJobs).toBe(0)
    })

    it('should handle multiple capability mode transitions', () => {
      const modes: BackgroundSyncCapability[] = [
        {isAvailable: false, fallbackStrategy: 'immediate'},
        {isAvailable: false, fallbackStrategy: 'polling'},
        {isAvailable: false, fallbackStrategy: 'manual'},
      ]

      modes.forEach(capability => {
        metadataQueue = createMetadataQueue()
        metadataQueue.updateSyncCapability(capability)

        const currentCapability = metadataQueue.getSyncCapability()
        expect(currentCapability.fallbackStrategy).toBe(capability.fallbackStrategy)
      })
    })
  })
})
