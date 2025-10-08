/**
 * Logger Tests
 *
 * Comprehensive test suite for the generic logging and monitoring system.
 * Tests all logging levels, filtering, metrics calculation, and event emissions.
 */

import type {LoggerInstance} from '../src/modules/types.js'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {createLogger} from '../src/modules/logger.js'

describe('Logger', () => {
  let logger: LoggerInstance

  beforeEach(() => {
    logger = createLogger()
  })

  describe('Basic Logging', () => {
    it('should create logger instance with default configuration', () => {
      expect(logger).toBeDefined()
      expect(typeof logger.debug).toBe('function')
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.warn).toBe('function')
      expect(typeof logger.error).toBe('function')
      expect(typeof logger.critical).toBe('function')
    })

    it('should log debug messages when debug level enabled', () => {
      const debugLogger = createLogger({minLevel: 'debug'})
      debugLogger.debug('Test debug message', {operationId: 'test-op-1'})

      const logs = debugLogger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs.at(0)?.level).toBe('debug')
      expect(logs.at(0)?.message).toBe('Test debug message')
      expect(logs.at(0)?.context?.operationId).toBe('test-op-1')
    })

    it('should log info messages', () => {
      logger.info('Test info message', {episodeId: 'tos_s1_e1'})

      const logs = logger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs.at(0)?.level).toBe('info')
      expect(logs.at(0)?.message).toBe('Test info message')
      expect(logs.at(0)?.context?.episodeId).toBe('tos_s1_e1')
    })

    it('should log warning messages', () => {
      logger.warn('Test warning message')

      const logs = logger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs.at(0)?.level).toBe('warn')
      expect(logs.at(0)?.message).toBe('Test warning message')
    })

    it('should log error messages', () => {
      logger.error('Test error message', {
        error: {
          name: 'TestError',
          message: 'Something went wrong',
        },
      })

      const logs = logger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs.at(0)?.level).toBe('error')
      expect(logs.at(0)?.message).toBe('Test error message')
      expect(logs.at(0)?.context?.error?.name).toBe('TestError')
    })

    it('should log critical messages', () => {
      logger.critical('Test critical message')

      const logs = logger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs.at(0)?.level).toBe('critical')
      expect(logs.at(0)?.message).toBe('Test critical message')
    })
  })

  describe('Log Filtering', () => {
    beforeEach(() => {
      logger.info('Info message 1', {operationId: 'op-1'})
      logger.warn('Warning message 1', {operationId: 'op-1'})
      logger.error('Error message 1', {operationId: 'op-2'})
      logger.debug('Debug message 1', {operationId: 'op-2'})
    })

    it('should filter logs by level', () => {
      const errorLogs = logger.getLogs({level: 'error'})
      expect(errorLogs).toHaveLength(1)
      expect(errorLogs.at(0)?.level).toBe('error')
    })

    it('should filter logs by category', () => {
      logger.info('Metadata log', {category: 'metadata'})
      logger.error('Error log', {category: 'error'})

      const metadataLogs = logger.getLogs({category: 'metadata'})
      const errorLogs = logger.getLogs({category: 'error'})

      expect(metadataLogs.length).toBeGreaterThan(0)
      expect(errorLogs.length).toBeGreaterThan(0)
    })

    it('should filter logs by operation ID', () => {
      const op1Logs = logger.getLogs({operationId: 'op-1'})
      expect(op1Logs).toHaveLength(2)
      expect(op1Logs.every(log => log.context?.operationId === 'op-1')).toBe(true)
    })

    it('should filter logs by time range', () => {
      const startTime = new Date().toISOString()

      // Wait a bit to ensure different timestamps
      setTimeout(() => {
        logger.info('New message after start time')
      }, 10)

      setTimeout(() => {
        const logsAfterStart = logger.getLogs({startTime})
        expect(logsAfterStart.length).toBeGreaterThan(0)
      }, 50)
    })
  })

  describe('Metrics Calculation', () => {
    it('should calculate metrics for successful operations', () => {
      logger.info('Operation 1 complete', {
        category: 'metadata',
        durationMs: 100,
      })
      logger.info('Operation 2 complete', {
        category: 'metadata',
        durationMs: 200,
      })
      logger.info('Operation 3 complete', {
        category: 'metadata',
        durationMs: 150,
      })

      const metrics = logger.getMetrics()

      expect(metrics.successfulOperations).toBe(3)
      expect(metrics.averageDurationMs).toBe(150)
      expect(metrics.minDurationMs).toBe(100)
      expect(metrics.maxDurationMs).toBe(200)
    })

    it('should calculate metrics for failed operations', () => {
      logger.info('Successful operation', {category: 'metadata'})
      logger.error('Failed operation 1', {category: 'metadata'})
      logger.error('Failed operation 2', {category: 'metadata'})

      const metrics = logger.getMetrics()

      expect(metrics.successfulOperations).toBe(1)
      expect(metrics.failedOperations).toBe(2)
      expect(metrics.totalOperations).toBe(3)
      expect(metrics.successRate).toBeCloseTo(0.333, 2)
    })

    it('should calculate 95th percentile duration', () => {
      // Add 100 operations with varying durations
      for (let i = 1; i <= 100; i++) {
        logger.info(`Operation ${i}`, {
          category: 'metadata',
          durationMs: i * 10,
        })
      }

      const metrics = logger.getMetrics()

      expect(metrics.p95DurationMs).toBeGreaterThan(0)
      expect(metrics.p95DurationMs).toBeLessThanOrEqual(metrics.maxDurationMs)
    })

    it('should handle metrics with no operations', () => {
      const metrics = logger.getMetrics()

      expect(metrics.totalOperations).toBe(0)
      expect(metrics.successfulOperations).toBe(0)
      expect(metrics.failedOperations).toBe(0)
      expect(metrics.successRate).toBe(0)
      expect(metrics.averageDurationMs).toBe(0)
    })
  })

  describe('Event Emissions', () => {
    it('should emit log-created event', () => {
      const mockListener = vi.fn()
      logger.on('log-created', mockListener)

      logger.info('Test message')

      expect(mockListener).toHaveBeenCalledTimes(1)
      expect(mockListener).toHaveBeenCalledWith({
        entry: expect.objectContaining({
          level: 'info',
          message: 'Test message',
        }),
      })
    })

    it('should emit error-logged event for errors', () => {
      const mockListener = vi.fn()
      logger.on('error-logged', mockListener)

      logger.error('Test error')

      expect(mockListener).toHaveBeenCalledTimes(1)
      expect(mockListener).toHaveBeenCalledWith({
        entry: expect.objectContaining({
          level: 'error',
        }),
        errorCount: 1,
      })
    })

    it('should emit critical-error event for critical logs', () => {
      const mockListener = vi.fn()
      logger.on('critical-error', mockListener)

      logger.critical('Critical issue', {operationId: 'critical-op'})

      expect(mockListener).toHaveBeenCalledTimes(1)
      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          entry: expect.objectContaining({
            level: 'critical',
          }),
        }),
      )
    })

    it('should emit metrics-updated event', () => {
      const mockListener = vi.fn()
      logger.on('metrics-updated', mockListener)

      logger.info('Test operation', {durationMs: 100})
      logger.getMetrics()

      expect(mockListener).toHaveBeenCalledTimes(1)
      expect(mockListener).toHaveBeenCalledWith({
        metrics: expect.objectContaining({
          totalOperations: expect.any(Number),
          successRate: expect.any(Number),
        }),
      })
    })

    it('should emit logs-cleared event', () => {
      const mockListener = vi.fn()
      logger.on('logs-cleared', mockListener)

      logger.info('Test message')
      const clearedCount = logger.clearLogs('manual')

      expect(mockListener).toHaveBeenCalledTimes(1)
      expect(mockListener).toHaveBeenCalledWith({
        clearedCount,
        reason: 'manual',
      })
    })
  })

  describe('Configuration', () => {
    it('should respect minimum log level', () => {
      const filteredLogger = createLogger({minLevel: 'warn'})

      filteredLogger.debug('Debug message')
      filteredLogger.info('Info message')
      filteredLogger.warn('Warning message')
      filteredLogger.error('Error message')

      const logs = filteredLogger.getLogs()

      expect(logs).toHaveLength(2)
      expect(logs.some(log => log.level === 'warn')).toBe(true)
      expect(logs.some(log => log.level === 'error')).toBe(true)
    })

    it('should respect category filtering', () => {
      const categoryLogger = createLogger({
        enabledCategories: ['metadata'],
      })

      categoryLogger.info('Metadata message', {category: 'metadata'})
      categoryLogger.error('Error message', {category: 'error'})

      const logs = categoryLogger.getLogs()

      expect(logs.every(log => log.category === 'metadata')).toBe(true)
    })

    it('should enforce maximum log entries', () => {
      const limitedLogger = createLogger({maxEntries: 10})

      // Add 20 log entries
      for (let i = 0; i < 20; i++) {
        limitedLogger.info(`Message ${i}`)
      }

      const logs = limitedLogger.getLogs()

      expect(logs.length).toBeLessThanOrEqual(10)
    })

    it('should allow configuration updates', () => {
      logger.info('Initial message')

      logger.updateConfig({minLevel: 'error'})

      logger.info('Info message')
      logger.error('Error message')

      const logs = logger.getLogs()

      expect(logs.some(log => log.level === 'error')).toBe(true)
    })
  })

  describe('Utility Methods', () => {
    beforeEach(() => {
      // Default logger filters debug level, so only 4 logs will be stored
      logger.debug('Debug log')
      logger.info('Info log')
      logger.warn('Warning log')
      logger.error('Error log')
      logger.critical('Critical log')
    })

    it('should get logger statistics', () => {
      const stats = logger.getStats()

      expect(stats.totalEntries).toBe(4) // Debug filtered by default
      expect(stats.entriesByLevel.info).toBe(1)
      expect(stats.entriesByLevel.warn).toBe(1)
      expect(stats.entriesByLevel.error).toBe(1)
      expect(stats.entriesByLevel.critical).toBe(1)
      expect(stats.oldestEntry).toBeTruthy()
      expect(stats.newestEntry).toBeTruthy()
    })

    it('should export logs as JSON', () => {
      const exported = logger.exportLogs()

      expect(exported).toBeTruthy()

      const parsed = JSON.parse(exported)
      expect(parsed.logs).toBeDefined()
      expect(parsed.metrics).toBeDefined()
      expect(parsed.exportedAt).toBeDefined()
    })

    it('should clear all logs', () => {
      expect(logger.getLogs()).toHaveLength(4) // Debug filtered by default

      const clearedCount = logger.clearLogs()

      expect(clearedCount).toBe(4)
      expect(logger.getLogs()).toHaveLength(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle logs without context', () => {
      logger.info('Message without context')

      const logs = logger.getLogs()

      expect(logs).toHaveLength(1)
      expect(logs.at(0)?.message).toBe('Message without context')
    })

    it('should handle empty log message', () => {
      logger.info('')

      const logs = logger.getLogs()

      expect(logs).toHaveLength(1)
      expect(logs.at(0)?.message).toBe('')
    })

    it('should generate unique log IDs', () => {
      logger.info('Message 1')
      logger.info('Message 2')
      logger.info('Message 3')

      const logs = logger.getLogs()
      const ids = logs.map(log => log.id)

      expect(new Set(ids).size).toBe(3)
    })

    it('should handle very long context objects', () => {
      const largeContext = {
        data: Array.from({length: 1000}, (_, i) => `item-${i}`),
      }

      logger.info('Large context log', largeContext)

      const logs = logger.getLogs()

      expect(logs).toHaveLength(1)
      expect(logs.at(0)?.context).toBeDefined()
    })
  })
})
