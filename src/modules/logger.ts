/**
 * Logger Module
 *
 * Provides comprehensive logging and monitoring capabilities for any application domain.
 * Implements configurable log levels, filtering, persistence, and performance metrics tracking
 * following VBS functional factory architecture.
 *
 * This is a generic, reusable logging utility that can be used across different modules
 * (metadata operations, user actions, API calls, etc.) with domain-specific configuration.
 */

import type {
  LogEntry,
  LoggerConfig,
  LoggerEvents,
  LoggerInstance,
  LogLevel,
  OperationMetrics,
} from './types.js'
import {createEventEmitter} from './events.js'

/**
 * Default logger configuration with production-ready settings.
 * These defaults are suitable for general application logging but can be customized
 * for specific use cases (e.g., metadata sync, user interactions, API monitoring).
 */
const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
  minLevel: 'info',
  maxEntries: 1000,
  enabledCategories: [],
  persistLogs: false,
  consoleOutput: true,
  includeEnvironment: true,
  captureStackTraces: true,
  logRetentionMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  enableMetrics: true,
  metricsWindowMs: 60 * 60 * 1000, // 1 hour
}

/**
 * Log level hierarchy for severity comparison.
 * Used internally to filter logs based on minimum level configuration.
 */
const LOG_LEVEL_HIERARCHY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  critical: 4,
}

/**
 * Factory function to create a logger instance.
 * Manages comprehensive logging with configurable levels, filtering, and metrics.
 *
 * This logger is domain-agnostic and can be used for any type of logging:
 * - Metadata sync operations
 * - User interactions
 * - API calls and responses
 * - Service Worker events
 * - Performance monitoring
 * - Error tracking
 *
 * @param config - Optional logger configuration to override defaults
 * @returns LoggerInstance with full logging capabilities
 *
 * @example
 * ```typescript
 * // Create a logger for metadata operations
 * const metadataLogger = createLogger({
 *   minLevel: 'info',
 *   enabledCategories: ['metadata', 'api'],
 *   consoleOutput: true,
 * })
 *
 * // Create a logger for user interactions
 * const userLogger = createLogger({
 *   minLevel: 'debug',
 *   enabledCategories: ['user'],
 *   persistLogs: true,
 * })
 * ```
 */
export const createLogger = (config: Partial<LoggerConfig> = {}): LoggerInstance => {
  const loggerConfig: LoggerConfig = {...DEFAULT_LOGGER_CONFIG, ...config}
  const eventEmitter = createEventEmitter<LoggerEvents>()

  // Logger state managed in closure
  const logs: LogEntry[] = []
  let entryCounter = 0

  // Performance metrics state
  const operationTimings: number[] = []
  const errorCounts: Map<string, number> = new Map()
  const sourceCounts: Map<string, number> = new Map()

  /**
   * Generate unique log entry ID with timestamp and counter.
   */
  const generateLogId = (): string => {
    entryCounter += 1
    return `log_${Date.now()}_${entryCounter}`
  }

  /**
   * Check if log level should be captured based on configuration.
   * Filters by both severity level and category.
   */
  const shouldCapture = (level: LogLevel, category?: LogEntry['category']): boolean => {
    const levelMeetsThreshold =
      LOG_LEVEL_HIERARCHY[level] >= LOG_LEVEL_HIERARCHY[loggerConfig.minLevel]

    const categoryEnabled =
      loggerConfig.enabledCategories.length === 0 ||
      (category != null && loggerConfig.enabledCategories.includes(category))

    return levelMeetsThreshold && categoryEnabled
  }

  /**
   * Get environment information for log entries.
   * Captures browser, platform, and execution context details.
   */
  const getEnvironmentInfo = (): LogEntry['environment'] => {
    if (!loggerConfig.includeEnvironment) {
      return undefined
    }

    return {
      userAgent: globalThis.navigator?.userAgent,
      platform: globalThis.navigator?.platform,
      serviceWorker: 'ServiceWorkerGlobalScope' in globalThis,
    }
  }

  /**
   * Output log entry to console if configured.
   * Uses appropriate console method based on log level.
   */
  const outputToConsole = (entry: LogEntry): void => {
    if (!loggerConfig.consoleOutput) return

    const prefix = `[VBS ${entry.category.toUpperCase()} ${entry.level.toUpperCase()}]`
    const message = `${prefix} ${entry.message}`

    // Conditional context passing prevents "undefined" from appearing in output
    const args = entry.context ? [message, entry.context] : [message]

    switch (entry.level) {
      case 'debug':
      case 'info':
        console.info(...args)
        break
      case 'warn':
        console.warn(...args)
        break
      case 'error':
      case 'critical':
        console.error(...args)
        break
    }
  }

  /**
   * Track operation metrics from log entry context.
   * Updates timing statistics and error categorization.
   */
  const trackMetrics = (entry: LogEntry): void => {
    if (!loggerConfig.enableMetrics) return

    if (entry.context?.durationMs != null) {
      operationTimings.push(entry.context.durationMs)

      if (operationTimings.length > 1000) {
        operationTimings.shift()
      }
    }

    if (entry.level === 'error' || entry.level === 'critical') {
      const errorCategory = entry.context?.error?.category ?? 'unknown'
      errorCounts.set(errorCategory, (errorCounts.get(errorCategory) ?? 0) + 1)
    }

    if (entry.context?.source != null) {
      const source = entry.context.source as string
      sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1)
    }
  }

  /**
   * Cleanup old log entries based on retention policy.
   * Removes entries older than configured retention period.
   */
  const cleanupOldLogs = (): number => {
    const now = Date.now()
    const cutoffTime = now - loggerConfig.logRetentionMs

    const initialCount = logs.length
    let index = 0

    while (index < logs.length) {
      const entry = logs[index]
      if (entry) {
        const logTime = new Date(entry.timestamp).getTime()
        if (logTime < cutoffTime) {
          logs.splice(index, 1)
        } else {
          index += 1
        }
      } else {
        index += 1
      }
    }

    return initialCount - logs.length
  }

  /**
   * Enforce maximum log entries limit to prevent memory bloat.
   * Removes oldest entries when limit is exceeded.
   */
  const enforceMaxEntries = (): number => {
    if (logs.length <= loggerConfig.maxEntries) {
      return 0
    }

    const entriesToRemove = logs.length - loggerConfig.maxEntries
    logs.splice(0, entriesToRemove)
    return entriesToRemove
  }

  /**
   * Create a log entry with full context, environment, and metadata.
   * Automatically captures stack traces for errors when configured.
   */
  const createLogEntry = (
    level: LogLevel,
    category: LogEntry['category'],
    message: string,
    context: LogEntry['context'] | undefined,
  ): LogEntry => {
    const envInfo = getEnvironmentInfo()

    const entry: LogEntry = {
      id: generateLogId(),
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      ...(context && {context}),
      ...(envInfo && {environment: envInfo}),
    }

    if (
      loggerConfig.captureStackTraces &&
      (level === 'error' || level === 'critical') &&
      context?.error == null
    ) {
      const errorStack = new Error('Log context capture').stack
      if (entry.context && errorStack) {
        entry.context.error = {
          name: 'LogContext',
          message,
          stack: errorStack,
        }
      }
    }

    return entry
  }

  /**
   * Core logging function with full processing pipeline.
   * Handles filtering, storage, metrics tracking, and event emission.
   */
  const log = (
    level: LogLevel,
    category: LogEntry['category'],
    message: string,
    context?: LogEntry['context'],
  ): void => {
    if (!shouldCapture(level, category)) return

    const entry = createLogEntry(level, category, message, context)

    logs.push(entry)
    outputToConsole(entry)
    trackMetrics(entry)

    eventEmitter.emit('log-created', {entry})

    if (level === 'error') {
      eventEmitter.emit('error-logged', {
        entry,
        errorCount: Array.from(errorCounts.values()).reduce((sum, count) => sum + count, 0),
      })
    }

    if (level === 'critical') {
      const operationId = entry.context?.operationId
      eventEmitter.emit('critical-error', {
        entry,
        ...(operationId && {operationId}),
      })
    }

    cleanupOldLogs()
    const removed = enforceMaxEntries()

    if (removed > 0 && logs.length >= loggerConfig.maxEntries * 0.9) {
      const oldestEntry = logs[0]
      if (oldestEntry) {
        const oldestAge = Date.now() - new Date(oldestEntry.timestamp).getTime()

        eventEmitter.emit('storage-warning', {
          currentEntries: logs.length,
          maxEntries: loggerConfig.maxEntries,
          oldestEntryAge: oldestAge,
        })
      }
    }
  }

  /**
   * Calculate current operation metrics from tracked data.
   * Provides success rates, timing percentiles, and error categorization.
   */
  const calculateMetrics = (): OperationMetrics => {
    const now = Date.now()
    const windowStart = now - loggerConfig.metricsWindowMs

    const recentLogs = logs.filter(entry => new Date(entry.timestamp).getTime() >= windowStart)

    // Count successful operations (info level logs in the configured categories)
    const successfulOps = recentLogs.filter(entry => entry.level === 'info').length

    // Count failed operations (error and critical level logs)
    const failedOps = recentLogs.filter(
      entry => entry.level === 'error' || entry.level === 'critical',
    ).length

    const totalOps = successfulOps + failedOps

    const sortedTimings = [...operationTimings].sort((a, b) => a - b)
    const p95Index = Math.floor(sortedTimings.length * 0.95)

    const errorsByCategory: Record<string, number> = {}
    for (const [category, count] of errorCounts.entries()) {
      errorsByCategory[category] = count
    }

    const operationsBySource: Record<string, number> = {}
    for (const [source, count] of sourceCounts.entries()) {
      operationsBySource[source] = count
    }

    return {
      totalOperations: totalOps,
      successfulOperations: successfulOps,
      failedOperations: failedOps,
      successRate: totalOps > 0 ? successfulOps / totalOps : 0,
      averageDurationMs:
        operationTimings.length > 0
          ? operationTimings.reduce((sum, val) => sum + val, 0) / operationTimings.length
          : 0,
      minDurationMs: sortedTimings.length > 0 ? (sortedTimings[0] ?? 0) : 0,
      maxDurationMs: sortedTimings.length > 0 ? (sortedTimings.at(-1) ?? 0) : 0,
      p95DurationMs: sortedTimings.length > 0 ? (sortedTimings[p95Index] ?? 0) : 0,
      errorsByCategory,
      operationsBySource: operationsBySource as OperationMetrics['operationsBySource'],
      timeWindowMs: loggerConfig.metricsWindowMs,
      calculatedAt: new Date().toISOString(),
    }
  }

  // Public API implementation - domain-agnostic logging methods
  const debug = (message: string, context?: LogEntry['context']): void => {
    const category = (context?.category ?? 'metadata') as LogEntry['category']
    log('debug', category, message, context)
  }

  const info = (message: string, context?: LogEntry['context']): void => {
    const category = (context?.category ?? 'metadata') as LogEntry['category']
    log('info', category, message, context)
  }

  const warn = (message: string, context?: LogEntry['context']): void => {
    const category = (context?.category ?? 'metadata') as LogEntry['category']
    log('warn', category, message, context)
  }

  const error = (message: string, context?: LogEntry['context']): void => {
    const category = (context?.category ?? 'error') as LogEntry['category']
    log('error', category, message, context)
  }

  const critical = (message: string, context?: LogEntry['context']): void => {
    const category = (context?.category ?? 'error') as LogEntry['category']
    log('critical', category, message, context)
  }

  const getLogs = (filter?: {
    level?: LogLevel
    category?: LogEntry['category']
    startTime?: string
    endTime?: string
    operationId?: string
  }): LogEntry[] => {
    let filtered = [...logs]

    if (filter?.level != null) {
      filtered = filtered.filter(entry => entry.level === filter.level)
    }

    if (filter?.category != null) {
      filtered = filtered.filter(entry => entry.category === filter.category)
    }

    if (filter?.startTime != null) {
      const startMs = new Date(filter.startTime).getTime()
      filtered = filtered.filter(entry => new Date(entry.timestamp).getTime() >= startMs)
    }

    if (filter?.endTime != null) {
      const endMs = new Date(filter.endTime).getTime()
      filtered = filtered.filter(entry => new Date(entry.timestamp).getTime() <= endMs)
    }

    if (filter?.operationId != null) {
      filtered = filtered.filter(entry => entry.context?.operationId === filter.operationId)
    }

    return filtered
  }

  const getMetrics = (): OperationMetrics => {
    const metrics = calculateMetrics()
    eventEmitter.emit('metrics-updated', {metrics})
    return metrics
  }

  const clearLogs = (reason: 'manual' | 'retention' | 'storage-limit' = 'manual'): number => {
    const clearedCount = logs.length
    logs.length = 0
    operationTimings.length = 0
    errorCounts.clear()
    sourceCounts.clear()

    eventEmitter.emit('logs-cleared', {clearedCount, reason})
    return clearedCount
  }

  const updateConfig = (newConfig: Partial<LoggerConfig>): void => {
    Object.assign(loggerConfig, newConfig)
  }

  const exportLogs = (): string => {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        config: loggerConfig,
        logs,
        metrics: calculateMetrics(),
      },
      null,
      2,
    )
  }

  const getStats = () => {
    const entriesByLevel: Record<LogLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      critical: 0,
    }

    const entriesByCategory: Record<string, number> = {}

    for (const entry of logs) {
      entriesByLevel[entry.level] += 1
      entriesByCategory[entry.category] = (entriesByCategory[entry.category] ?? 0) + 1
    }

    return {
      totalEntries: logs.length,
      entriesByLevel,
      entriesByCategory,
      oldestEntry: logs.length > 0 ? (logs[0]?.timestamp ?? null) : null,
      newestEntry: logs.length > 0 ? (logs.at(-1)?.timestamp ?? null) : null,
    }
  }

  return {
    debug,
    info,
    warn,
    error,
    critical,
    getLogs,
    getMetrics,
    clearLogs,
    updateConfig,
    exportLogs,
    getStats,
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    once: eventEmitter.once.bind(eventEmitter),
  }
}
