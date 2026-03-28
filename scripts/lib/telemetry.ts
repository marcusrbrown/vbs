/**
 * Telemetry and Analytics for Data Generation Pipeline
 *
 * Tracks data generation success rates, performance metrics, and common issues
 * to help improve the generation pipeline over time.
 */

import {mkdir, writeFile} from 'node:fs/promises'
import {dirname} from 'node:path'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Outcome of a single generation run.
 */
export type RunOutcome = 'success' | 'partial' | 'failed'

/**
 * Represents a single data generation run.
 */
export interface TelemetryRun {
  /** Unique identifier for this run */
  id: string
  /** ISO timestamp when the run started */
  startedAt: string
  /** ISO timestamp when the run completed */
  completedAt: string
  /** Duration of the run in milliseconds */
  durationMs: number
  /** Outcome of the run */
  outcome: RunOutcome
  /** Generation mode used */
  mode: 'full' | 'incremental'
  /** Number of series processed */
  seriesProcessed: number
  /** Number of movies processed */
  moviesProcessed: number
  /** Number of episodes processed */
  episodesProcessed: number
  /** Number of eras generated */
  erasGenerated: number
  /** Total errors encountered */
  totalErrors: number
  /** Error breakdown by category */
  errorsByCategory: Record<string, number>
  /** Average quality score (0-1) */
  qualityScore: number
  /** Patches applied count */
  patchesApplied: number
  /** Overrides applied count */
  overridesApplied: number
  /** Whether validation passed */
  validationPassed: boolean
  /** Any warnings encountered */
  warnings: string[]
  /** CLI flags used */
  flags: string[]
}

/**
 * Aggregated telemetry statistics.
 */
export interface TelemetryStats {
  /** Total number of runs tracked */
  totalRuns: number
  /** Number of successful runs */
  successfulRuns: number
  /** Number of partial runs */
  partialRuns: number
  /** Number of failed runs */
  failedRuns: number
  /** Success rate as percentage */
  successRate: number
  /** Average duration per run in milliseconds */
  averageDurationMs: number
  /** Average quality score across all runs */
  averageQualityScore: number
  /** Most common error categories */
  commonErrors: {category: string; count: number}[]
  /** Average episodes processed per run */
  averageEpisodesProcessed: number
  /** Average patches applied per run */
  averagePatchesApplied: number
  /** Last run timestamp */
  lastRunAt: string | null
}

/**
 * Complete telemetry data structure persisted to disk.
 */
export interface TelemetryData {
  /** Schema version */
  version: string
  /** All tracked runs */
  runs: TelemetryRun[]
  /** Last updated timestamp */
  lastUpdated: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TELEMETRY_VERSION = '1.0'

let runIdCounter = 0

// ============================================================================
// IN-MEMORY TRACKER
// ============================================================================

/**
 * Creates a telemetry tracker for monitoring generation runs.
 */
export const createTelemetryTracker = () => {
  const runs: TelemetryRun[] = []

  /**
   * Generates a unique run ID.
   */
  const generateRunId = (): string => {
    runIdCounter++
    const timestamp = Date.now()
    return `run-${timestamp}-${runIdCounter}`
  }

  /**
   * Records the start of a generation run.
   */
  const startRun = (mode: 'full' | 'incremental', flags: string[]): string => {
    const id = generateRunId()
    const startedAt = new Date().toISOString()
    runs.push({
      id,
      startedAt,
      completedAt: '',
      durationMs: 0,
      outcome: 'success',
      mode,
      seriesProcessed: 0,
      moviesProcessed: 0,
      episodesProcessed: 0,
      erasGenerated: 0,
      totalErrors: 0,
      errorsByCategory: {},
      qualityScore: 0,
      patchesApplied: 0,
      overridesApplied: 0,
      validationPassed: true,
      warnings: [],
      flags,
    })
    return id
  }

  /**
   * Updates an in-progress run with partial data.
   */
  const updateRun = (
    runId: string,
    data: Partial<Omit<TelemetryRun, 'id' | 'startedAt'>>,
  ): void => {
    const run = runs.find(r => r.id === runId)
    if (run) {
      Object.assign(run, data)
    }
  }

  /**
   * Completes a run and records final metrics.
   */
  const completeRun = (
    runId: string,
    outcome: RunOutcome,
    metrics: {
      seriesProcessed: number
      moviesProcessed: number
      episodesProcessed: number
      erasGenerated: number
      totalErrors: number
      errorsByCategory: Record<string, number>
      qualityScore: number
      patchesApplied: number
      overridesApplied: number
      validationPassed: boolean
      warnings: string[]
    },
  ): void => {
    const run = runs.find(r => r.id === runId)
    if (run) {
      run.completedAt = new Date().toISOString()
      run.durationMs = new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()
      run.outcome = outcome
      run.seriesProcessed = metrics.seriesProcessed
      run.moviesProcessed = metrics.moviesProcessed
      run.episodesProcessed = metrics.episodesProcessed
      run.erasGenerated = metrics.erasGenerated
      run.totalErrors = metrics.totalErrors
      run.errorsByCategory = metrics.errorsByCategory
      run.qualityScore = metrics.qualityScore
      run.patchesApplied = metrics.patchesApplied
      run.overridesApplied = metrics.overridesApplied
      run.validationPassed = metrics.validationPassed
      run.warnings = metrics.warnings
    }
  }

  /**
   * Gets all tracked runs.
   */
  const getRuns = (): TelemetryRun[] => [...runs]

  /**
   * Gets runs filtered by outcome.
   */
  const getRunsByOutcome = (outcome: RunOutcome): TelemetryRun[] => {
    return runs.filter(r => r.outcome === outcome)
  }

  /**
   * Gets runs within a date range.
   */
  const getRunsInRange = (startDate: Date, endDate: Date): TelemetryRun[] => {
    return runs.filter(r => {
      const runDate = new Date(r.startedAt)
      return runDate >= startDate && runDate <= endDate
    })
  }

  /**
   * Calculates aggregated statistics across all runs.
   */
  const calculateStats = (): TelemetryStats => {
    const totalRuns = runs.length

    if (totalRuns === 0) {
      return {
        totalRuns: 0,
        successfulRuns: 0,
        partialRuns: 0,
        failedRuns: 0,
        successRate: 0,
        averageDurationMs: 0,
        averageQualityScore: 0,
        commonErrors: [],
        averageEpisodesProcessed: 0,
        averagePatchesApplied: 0,
        lastRunAt: null,
      }
    }

    const successfulRuns = runs.filter(r => r.outcome === 'success').length
    const partialRuns = runs.filter(r => r.outcome === 'partial').length
    const failedRuns = runs.filter(r => r.outcome === 'failed').length

    const totalDuration = runs.reduce((sum, r) => sum + r.durationMs, 0)
    const totalQuality = runs.reduce((sum, r) => sum + r.qualityScore, 0)
    const totalEpisodes = runs.reduce((sum, r) => sum + r.episodesProcessed, 0)
    const totalPatches = runs.reduce((sum, r) => sum + r.patchesApplied, 0)

    const errorCounts: Record<string, number> = {}
    for (const run of runs) {
      for (const [category, count] of Object.entries(run.errorsByCategory)) {
        errorCounts[category] = (errorCounts[category] ?? 0) + count
      }
    }
    const commonErrors = Object.entries(errorCounts)
      .map(([category, count]) => ({category, count}))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const sortedRuns = [...runs].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    )

    return {
      totalRuns,
      successfulRuns,
      partialRuns,
      failedRuns,
      successRate: (successfulRuns / totalRuns) * 100,
      averageDurationMs: totalDuration / totalRuns,
      averageQualityScore: totalQuality / totalRuns,
      commonErrors,
      averageEpisodesProcessed: totalEpisodes / totalRuns,
      averagePatchesApplied: totalPatches / totalRuns,
      lastRunAt: sortedRuns[0]?.startedAt ?? null,
    }
  }

  /**
   * Gets the telemetry data structure for persistence.
   */
  const getTelemetryData = (): TelemetryData => {
    return {
      version: TELEMETRY_VERSION,
      runs: [...runs],
      lastUpdated: new Date().toISOString(),
    }
  }

  /**
   * Loads previously saved telemetry data.
   */
  const loadTelemetryData = (data: TelemetryData): void => {
    if (data.version === TELEMETRY_VERSION) {
      runs.length = 0
      runs.push(...data.runs)
    }
  }

  /**
   * Clears all tracked runs.
   */
  const clear = (): void => {
    runs.length = 0
  }

  return {
    startRun,
    updateRun,
    completeRun,
    getRuns,
    getRunsByOutcome,
    getRunsInRange,
    calculateStats,
    getTelemetryData,
    loadTelemetryData,
    clear,
  }
}

// ============================================================================
// PERSISTENCE
// ============================================================================

/**
 * Saves telemetry data to disk.
 */
export const saveTelemetry = async (data: TelemetryData, filePath: string): Promise<void> => {
  try {
    const dir = dirname(filePath)
    await mkdir(dir, {recursive: true})
    const content = `${JSON.stringify(data, null, 2)}\n`
    await writeFile(filePath, content, 'utf-8')
  } catch (error) {
    console.error(`Failed to save telemetry to ${filePath}:`, error)
  }
}

/**
 * Loads telemetry data from disk.
 */
export const loadTelemetry = async (filePath: string): Promise<TelemetryData | null> => {
  try {
    const {readFile} = await import('node:fs/promises')
    const content = await readFile(filePath, 'utf-8')
    const data = JSON.parse(content) as TelemetryData
    if (data.version === TELEMETRY_VERSION) {
      return data
    }
    return null
  } catch {
    return null
  }
}

// ============================================================================
// DEFAULT INSTANCE
// ============================================================================

const defaultTracker = createTelemetryTracker()

export const getDefaultTracker = () => defaultTracker

export const trackRun = (
  mode: 'full' | 'incremental',
  flags: string[],
): ReturnType<typeof defaultTracker.startRun> => {
  return defaultTracker.startRun(mode, flags)
}

export const completeRun = defaultTracker.completeRun

export const getTelemetryStats = (): TelemetryStats => {
  return defaultTracker.calculateStats()
}

export const exportTelemetry = async (filePath: string): Promise<void> => {
  const data = defaultTracker.getTelemetryData()
  await saveTelemetry(data, filePath)
}

export const importTelemetry = async (filePath: string): Promise<boolean> => {
  const data = await loadTelemetry(filePath)
  if (data) {
    defaultTracker.loadTelemetryData(data)
    return true
  }
  return false
}
