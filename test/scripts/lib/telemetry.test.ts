/**
 * Tests for the telemetry module.
 * Covers telemetry tracker, stats calculation, persistence, and version handling.
 */

import type {RunOutcome, TelemetryData, TelemetryRun} from '../../../scripts/lib/telemetry.js'
import {rm} from 'node:fs/promises'
import {join} from 'node:path'
import process from 'node:process'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {
  createTelemetryTracker,
  loadTelemetry,
  saveTelemetry,
} from '../../../scripts/lib/telemetry.js'

const TEST_DIR = join(process.cwd(), 'test/fixtures/telemetry-test')

const createTestRun = (overrides: Partial<TelemetryRun> = {}): TelemetryRun => ({
  id: `run-${Date.now()}-${Math.random()}`,
  startedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  durationMs: 1800000,
  outcome: 'success' as RunOutcome,
  mode: 'full',
  seriesProcessed: 5,
  moviesProcessed: 2,
  episodesProcessed: 178,
  erasGenerated: 7,
  totalErrors: 0,
  errorsByCategory: {},
  qualityScore: 0.92,
  patchesApplied: 2,
  overridesApplied: 1,
  validationPassed: true,
  warnings: [],
  flags: ['--verbose'],
  ...overrides,
})

describe('telemetry', () => {
  let tracker: ReturnType<typeof createTelemetryTracker>

  beforeEach(async () => {
    try {
      await rm(TEST_DIR, {recursive: true, force: true})
    } catch {}
    tracker = createTelemetryTracker()
  })

  afterEach(async () => {
    tracker.clear()
    try {
      await rm(TEST_DIR, {recursive: true, force: true})
    } catch {}
  })

  describe('Stats calculation', () => {
    it('should return zero values for empty runs', () => {
      const stats = tracker.calculateStats()

      expect(stats.totalRuns).toBe(0)
      expect(stats.successRate).toBe(0)
      expect(stats.averageDurationMs).toBe(0)
      expect(stats.averageQualityScore).toBe(0)
      expect(stats.averageEpisodesProcessed).toBe(0)
      expect(stats.averagePatchesApplied).toBe(0)
    })

    it('should calculate 100% success rate for single successful run', () => {
      const runId = tracker.startRun('full', ['--verbose'])
      tracker.completeRun(runId, 'success', {
        seriesProcessed: 5,
        moviesProcessed: 2,
        episodesProcessed: 42,
        erasGenerated: 7,
        totalErrors: 0,
        errorsByCategory: {},
        qualityScore: 0.95,
        patchesApplied: 0,
        overridesApplied: 0,
        validationPassed: true,
        warnings: [],
      })

      const stats = tracker.calculateStats()

      expect(stats.totalRuns).toBe(1)
      expect(stats.successfulRuns).toBe(1)
      expect(stats.successRate).toBe(100)
      expect(stats.averageEpisodesProcessed).toBe(42)
    })

    it('should calculate correct counts for mixed outcomes', () => {
      const run1 = tracker.startRun('full', ['--verbose'])
      tracker.completeRun(run1, 'success', {
        seriesProcessed: 5,
        moviesProcessed: 2,
        episodesProcessed: 20,
        erasGenerated: 7,
        totalErrors: 0,
        errorsByCategory: {},
        qualityScore: 0.9,
        patchesApplied: 0,
        overridesApplied: 0,
        validationPassed: true,
        warnings: [],
      })

      const run2 = tracker.startRun('incremental', ['--verbose'])
      tracker.completeRun(run2, 'partial', {
        seriesProcessed: 3,
        moviesProcessed: 1,
        episodesProcessed: 30,
        erasGenerated: 4,
        totalErrors: 1,
        errorsByCategory: {api: 1},
        qualityScore: 0.7,
        patchesApplied: 0,
        overridesApplied: 0,
        validationPassed: true,
        warnings: ['partial data'],
      })

      const run3 = tracker.startRun('full', ['--verbose'])
      tracker.completeRun(run3, 'failed', {
        seriesProcessed: 1,
        moviesProcessed: 0,
        episodesProcessed: 10,
        erasGenerated: 2,
        totalErrors: 5,
        errorsByCategory: {api: 3, validation: 2},
        qualityScore: 0.5,
        patchesApplied: 0,
        overridesApplied: 0,
        validationPassed: false,
        warnings: [],
      })

      const stats = tracker.calculateStats()

      expect(stats.totalRuns).toBe(3)
      expect(stats.successfulRuns).toBe(1)
      expect(stats.partialRuns).toBe(1)
      expect(stats.failedRuns).toBe(1)
      expect(stats.successRate).toBeCloseTo(33.33, 1)
      expect(stats.averageEpisodesProcessed).toBeCloseTo(20, 0)
    })

    it('should aggregate common errors correctly', () => {
      const run1 = tracker.startRun('full', ['--verbose'])
      tracker.completeRun(run1, 'failed', {
        seriesProcessed: 1,
        moviesProcessed: 0,
        episodesProcessed: 5,
        erasGenerated: 1,
        totalErrors: 3,
        errorsByCategory: {api: 2, network: 1},
        qualityScore: 0.3,
        patchesApplied: 0,
        overridesApplied: 0,
        validationPassed: false,
        warnings: [],
      })

      const run2 = tracker.startRun('full', ['--verbose'])
      tracker.completeRun(run2, 'failed', {
        seriesProcessed: 1,
        moviesProcessed: 0,
        episodesProcessed: 5,
        erasGenerated: 1,
        totalErrors: 2,
        errorsByCategory: {api: 2},
        qualityScore: 0.3,
        patchesApplied: 0,
        overridesApplied: 0,
        validationPassed: false,
        warnings: [],
      })

      const stats = tracker.calculateStats()

      expect(stats.commonErrors).toBeDefined()
      expect(stats.commonErrors.length).toBeGreaterThan(0)
      expect(stats.commonErrors[0]!.category).toBe('api')
      expect(stats.commonErrors[0]!.count).toBe(4)
    })
  })

  describe('Run lifecycle', () => {
    it('should start run and return runId', () => {
      const runId = tracker.startRun('full', ['--verbose', '--dry-run'])

      expect(runId).toBeDefined()
      expect(typeof runId).toBe('string')
      expect(runId).toMatch(/^run-\d+-\d+$/)
    })

    it('should update run with partial data', () => {
      const runId = tracker.startRun('full', [])
      tracker.updateRun(runId, {seriesProcessed: 3, episodesProcessed: 50})

      const runs = tracker.getRuns()
      const run = runs.find(r => r.id === runId)

      expect(run!.seriesProcessed).toBe(3)
      expect(run!.episodesProcessed).toBe(50)
    })

    it('should complete run and set outcome', () => {
      const runId = tracker.startRun('incremental', ['--verbose'])
      tracker.completeRun(runId, 'partial', {
        seriesProcessed: 2,
        moviesProcessed: 1,
        episodesProcessed: 25,
        erasGenerated: 3,
        totalErrors: 0,
        errorsByCategory: {},
        qualityScore: 0.8,
        patchesApplied: 1,
        overridesApplied: 0,
        validationPassed: true,
        warnings: ['limited data'],
      })

      const byOutcome = tracker.getRunsByOutcome('partial')

      expect(byOutcome.some(r => r.id === runId)).toBe(true)
      expect(byOutcome[0]!.outcome).toBe('partial')
    })
  })

  describe('Run filtering', () => {
    it('should filter runs by outcome', () => {
      const run1 = tracker.startRun('full', [])
      tracker.completeRun(run1, 'success', {
        seriesProcessed: 5,
        moviesProcessed: 2,
        episodesProcessed: 100,
        erasGenerated: 7,
        totalErrors: 0,
        errorsByCategory: {},
        qualityScore: 0.9,
        patchesApplied: 0,
        overridesApplied: 0,
        validationPassed: true,
        warnings: [],
      })

      const run2 = tracker.startRun('full', [])
      tracker.completeRun(run2, 'failed', {
        seriesProcessed: 1,
        moviesProcessed: 0,
        episodesProcessed: 5,
        erasGenerated: 1,
        totalErrors: 3,
        errorsByCategory: {api: 3},
        qualityScore: 0.2,
        patchesApplied: 0,
        overridesApplied: 0,
        validationPassed: false,
        warnings: [],
      })

      const successes = tracker.getRunsByOutcome('success')
      const failures = tracker.getRunsByOutcome('failed')

      expect(successes).toHaveLength(1)
      expect(failures).toHaveLength(1)
    })

    it('should filter runs by date range', () => {
      const middleDate = new Date('2024-06-01')

      tracker.clear()

      tracker.startRun('full', [])
      const oldRun = tracker.getRuns()[0]
      oldRun!.startedAt = new Date('2024-01-01').toISOString()
      oldRun!.completedAt = new Date('2024-01-01').toISOString()
      oldRun!.durationMs = 1000

      const run2Id = tracker.startRun('full', [])
      const run2 = tracker.getRuns().find(r => r.id === run2Id)
      run2!.startedAt = middleDate.toISOString()
      run2!.completedAt = middleDate.toISOString()
      run2!.durationMs = 1000

      const runsInRange = tracker.getRunsInRange(new Date('2024-04-01'), new Date('2024-08-01'))

      expect(runsInRange.some(r => r.id === run2Id)).toBe(true)
    })
  })

  describe('Version handling', () => {
    it('should load data with matching version', () => {
      const run = createTestRun()
      const data: TelemetryData = {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        runs: [run],
      }

      tracker.loadTelemetryData(data)

      const runs = tracker.getRuns()
      expect(runs).toHaveLength(1)
      expect(runs[0]!.id).toBe(run.id)
    })

    it('should ignore data with mismatched version', () => {
      const run = createTestRun({id: 'mismatch-run'})
      const data: TelemetryData = {
        version: '99.99',
        lastUpdated: new Date().toISOString(),
        runs: [run],
      }

      tracker.loadTelemetryData(data)

      const runs = tracker.getRuns()
      expect(runs.some(r => r.id === 'mismatch-run')).toBe(false)
    })
  })

  describe('Persistence', () => {
    const testFile = join(TEST_DIR, 'telemetry.json')

    it('should save and load telemetry data', async () => {
      const runId = tracker.startRun('full', ['--verbose'])
      tracker.completeRun(runId, 'success', {
        seriesProcessed: 5,
        moviesProcessed: 2,
        episodesProcessed: 100,
        erasGenerated: 7,
        totalErrors: 0,
        errorsByCategory: {},
        qualityScore: 0.9,
        patchesApplied: 0,
        overridesApplied: 0,
        validationPassed: true,
        warnings: [],
      })

      const data = tracker.getTelemetryData()
      await saveTelemetry(data, testFile)

      const loaded = await loadTelemetry(testFile)

      expect(loaded).not.toBeNull()
      expect(loaded!.version).toBe('1.0')
      expect(loaded!.runs.length).toBeGreaterThan(0)
    })

    it('should return null for non-existent file', async () => {
      const loaded = await loadTelemetry('/non/existent/path.json')
      expect(loaded).toBeNull()
    })
  })
})
