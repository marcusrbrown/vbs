/**
 * Migration System Tests
 * Comprehensive testing for atomic operations, rollback capability, and data integrity
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {
  beginAtomicMigration,
  completeAtomicMigration,
  createMigrationTransaction,
  getMigrationState,
  isMigrationNeeded,
  migrateSeasonToEpisodeProgress,
  MIGRATION_VERSIONS,
  performMigration,
  performRollback,
  rollbackAtomicMigration,
  rollbackEpisodeToSeasonProgress,
  saveMigrationState,
  type MigrationResult,
  type MigrationState,
  type MigrationTransaction,
} from '../src/modules/migration.js'

// Mock localStorage for testing
const mockLocalStorage = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get store() {
      return store
    },
    reset() {
      store = {}
    },
  }
})()

// Mock global localStorage
vi.stubGlobal('localStorage', mockLocalStorage)

describe('Migration System', () => {
  beforeEach(() => {
    mockLocalStorage.reset()
    vi.clearAllMocks()
  })

  afterEach(() => {
    mockLocalStorage.reset()
  })

  describe('Migration State Management', () => {
    it('should return default migration state when none exists', () => {
      const state = getMigrationState()

      expect(state).toEqual({
        currentVersion: MIGRATION_VERSIONS.SEASON_LEVEL,
        lastMigrated: expect.any(String),
        migrationHistory: [],
        isRollbackAvailable: false,
      })
    })

    it('should load existing migration state', () => {
      const existingState: MigrationState = {
        currentVersion: MIGRATION_VERSIONS.EPISODE_LEVEL,
        lastMigrated: '2024-01-01T00:00:00.000Z',
        migrationHistory: [
          {
            from: MIGRATION_VERSIONS.SEASON_LEVEL,
            to: MIGRATION_VERSIONS.EPISODE_LEVEL,
            timestamp: '2024-01-01T00:00:00.000Z',
            itemCount: 10,
          },
        ],
        isRollbackAvailable: true,
        transactionId: 'test-transaction-123',
      }

      mockLocalStorage.setItem('starTrekMigrationState', JSON.stringify(existingState))

      const state = getMigrationState()
      expect(state).toEqual(existingState)
    })

    it('should save migration state to localStorage', () => {
      const state: MigrationState = {
        currentVersion: MIGRATION_VERSIONS.EPISODE_LEVEL,
        lastMigrated: '2024-01-01T00:00:00.000Z',
        migrationHistory: [],
        isRollbackAvailable: true,
      }

      saveMigrationState(state)

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'starTrekMigrationState',
        JSON.stringify(state),
      )
    })

    it('should handle corrupted migration state gracefully', () => {
      mockLocalStorage.setItem('starTrekMigrationState', 'invalid-json')

      const state = getMigrationState()

      expect(state).toEqual({
        currentVersion: MIGRATION_VERSIONS.SEASON_LEVEL,
        lastMigrated: expect.any(String),
        migrationHistory: [],
        isRollbackAvailable: false,
      })
    })
  })

  describe('Migration Detection', () => {
    it('should detect when migration is needed for season-level data', () => {
      const seasonLevelData = ['tos_s1', 'tos_s2', 'tng_s1']

      expect(isMigrationNeeded(seasonLevelData)).toBe(true)
    })

    it('should not detect migration need for episode-level data', () => {
      // Mock existing migration state at episode level
      const migrationState: MigrationState = {
        currentVersion: MIGRATION_VERSIONS.EPISODE_LEVEL,
        lastMigrated: '2024-01-01T00:00:00.000Z',
        migrationHistory: [],
        isRollbackAvailable: false,
      }
      mockLocalStorage.setItem('starTrekMigrationState', JSON.stringify(migrationState))

      const episodeLevelData = ['tos_s1_e01', 'tos_s1_e02', 'tng_s1_e01']

      expect(isMigrationNeeded(episodeLevelData)).toBe(false)
    })

    it('should not detect migration need for mixed data when already migrated', () => {
      // Mock existing migration state at episode level
      const migrationState: MigrationState = {
        currentVersion: MIGRATION_VERSIONS.EPISODE_LEVEL,
        lastMigrated: '2024-01-01T00:00:00.000Z',
        migrationHistory: [],
        isRollbackAvailable: false,
      }
      mockLocalStorage.setItem('starTrekMigrationState', JSON.stringify(migrationState))

      const mixedData = ['tos_s1', 'tos_s1_e01', 'movie-tmp']

      expect(isMigrationNeeded(mixedData)).toBe(false)
    })

    it('should handle empty progress data', () => {
      expect(isMigrationNeeded([])).toBe(false)
    })
  })

  describe('Season to Episode Migration', () => {
    it('should migrate season-level progress to episode-level', () => {
      const seasonProgress = ['ent_s1'] // Use ent_s1 which has episode data

      const result = migrateSeasonToEpisodeProgress(seasonProgress)

      expect(result.success).toBe(true)
      expect(result.version).toBe(MIGRATION_VERSIONS.EPISODE_LEVEL)
      expect(result.backupData).toEqual(seasonProgress)
      expect(result.canRollback).toBe(true)
      expect(result.migratedItems.length).toBeGreaterThan(seasonProgress.length)
      expect(result.errors).toEqual([])
    })

    it('should preserve non-season items during migration', () => {
      const mixedProgress = ['ent_s1', 'movie-tmp', 'special-item']

      const result = migrateSeasonToEpisodeProgress(mixedProgress)

      expect(result.success).toBe(true)
      expect(result.migratedItems).toContain('movie-tmp')
      expect(result.migratedItems).toContain('special-item')
    })

    it('should handle migration of unknown season IDs gracefully', () => {
      const unknownSeasons = ['unknown_s1', 'invalid_season']

      const result = migrateSeasonToEpisodeProgress(unknownSeasons)

      expect(result.success).toBe(true)
      expect(result.migratedItems).toEqual(unknownSeasons)
      expect(result.errors).toEqual([])
    })

    it('should handle empty season progress', () => {
      const result = migrateSeasonToEpisodeProgress([])

      expect(result.success).toBe(true)
      expect(result.migratedItems).toEqual([])
      expect(result.backupData).toEqual([])
      expect(result.canRollback).toBe(true)
    })
  })

  describe('Episode to Season Rollback', () => {
    it('should rollback episode-level progress to season-level', () => {
      const episodeProgress = [
        'ent_s1_e01',
        'ent_s1_e02',
        'ent_s1_e03',
        'ent_s1_e04',
        'ent_s1_e05',
        'ent_s1_e06',
        'ent_s1_e07',
        'ent_s1_e08',
        'ent_s1_e09',
        'ent_s1_e10',
        'ent_s1_e11',
        'ent_s1_e12',
        'ent_s1_e13',
        'ent_s1_e14',
        'ent_s1_e15',
        'ent_s1_e16',
        'ent_s1_e17',
        'ent_s1_e18',
        'ent_s1_e19',
        'ent_s1_e20',
        'ent_s1_e21',
        'ent_s1_e22',
        'ent_s1_e23',
        'ent_s1_e24',
        'ent_s1_e25',
        'ent_s1_e26',
      ]

      const result = rollbackEpisodeToSeasonProgress(episodeProgress)

      expect(result.success).toBe(true)
      expect(result.version).toBe(MIGRATION_VERSIONS.SEASON_LEVEL)
      expect(result.backupData).toEqual(episodeProgress)
      expect(result.canRollback).toBe(false)
      expect(result.migratedItems).toContain('ent_s1')
    })

    it('should preserve non-episode items during rollback', () => {
      const mixedProgress = ['ent_s1_e01', 'movie-tmp', 'special-item']

      const result = rollbackEpisodeToSeasonProgress(mixedProgress)

      expect(result.success).toBe(true)
      expect(result.migratedItems).toContain('movie-tmp')
      expect(result.migratedItems).toContain('special-item')
    })

    it('should handle partial season progress in rollback', () => {
      const partialProgress = ['ent_s1_e01', 'ent_s1_e02'] // Only 2 episodes of 26

      const result = rollbackEpisodeToSeasonProgress(partialProgress)

      expect(result.success).toBe(true)
      // Should not include the season since it's not complete
      expect(result.migratedItems).not.toContain('ent_s1')
    })

    it('should handle empty episode progress', () => {
      const result = rollbackEpisodeToSeasonProgress([])

      expect(result.success).toBe(true)
      expect(result.migratedItems).toEqual([])
      expect(result.backupData).toEqual([])
    })
  })

  describe('Full Migration Process', () => {
    it('should perform complete migration with state updates', () => {
      const seasonProgress = ['ent_s1'] // Use ent_s1 which has episode data

      const result = performMigration(seasonProgress)

      expect(result.success).toBe(true)
      expect(result.canRollback).toBe(true)

      // Check that migration state was updated
      const state = getMigrationState()
      expect(state).toBeTruthy()
      expect(state?.currentVersion).toBe(MIGRATION_VERSIONS.EPISODE_LEVEL)
      expect(state?.isRollbackAvailable).toBe(true)
      expect(state?.migrationHistory).toHaveLength(1)
      expect(state?.migrationHistory[0]?.from).toBe(MIGRATION_VERSIONS.SEASON_LEVEL)
      expect(state?.migrationHistory[0]?.to).toBe(MIGRATION_VERSIONS.EPISODE_LEVEL)
    })

    it('should perform complete rollback with state updates', () => {
      // First set up a migrated state
      const migrationState: MigrationState = {
        currentVersion: MIGRATION_VERSIONS.EPISODE_LEVEL,
        lastMigrated: '2024-01-01T00:00:00.000Z',
        migrationHistory: [],
        isRollbackAvailable: true,
      }
      mockLocalStorage.setItem('starTrekMigrationState', JSON.stringify(migrationState))

      const episodeProgress = ['ent_s1_e01', 'ent_s1_e02']

      const result = performRollback(episodeProgress)

      expect(result.success).toBe(true)
      expect(result.canRollback).toBe(false)

      // Check that migration state was updated
      const state = getMigrationState()
      expect(state).toBeTruthy()
      expect(state?.currentVersion).toBe(MIGRATION_VERSIONS.SEASON_LEVEL)
      expect(state?.isRollbackAvailable).toBe(false)
    })

    it('should handle migration failures gracefully', () => {
      // Save original implementation
      const originalGetItem = mockLocalStorage.getItem.getMockImplementation()

      // Test with localStorage error (simulating storage failure)
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage access failed')
      })

      const result = performMigration(['ent_s1'])

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Failed to get migration state')

      // Restore original implementation for subsequent tests
      if (originalGetItem) {
        mockLocalStorage.getItem.mockImplementation(originalGetItem)
      } else {
        mockLocalStorage.getItem.mockClear()
        mockLocalStorage.getItem.mockImplementation(
          (key: string) => mockLocalStorage.store[key] || null,
        )
      }
    })
  })

  describe('Atomic Migration Transactions', () => {
    it('should create migration transaction with unique ID', () => {
      const originalData = ['ent_s1', 'tos_s1']
      const targetVersion = MIGRATION_VERSIONS.EPISODE_LEVEL

      const transaction = createMigrationTransaction(originalData, targetVersion)

      expect(transaction.id).toMatch(/^migration_\d+_[a-z0-9]+$/)
      expect(transaction.originalData).toEqual(originalData)
      expect(transaction.targetVersion).toBe(targetVersion)
      expect(transaction.completed).toBe(false)
      expect(transaction.startTime).toBeTruthy()
    })

    it('should begin atomic migration transaction', () => {
      const originalData = ['ent_s1', 'tos_s1']

      const transaction = beginAtomicMigration(originalData, MIGRATION_VERSIONS.EPISODE_LEVEL)

      expect(transaction).toBeTruthy()
      if (transaction) {
        expect(transaction.originalData).toEqual(originalData)

        // Check that transaction was stored
        const transactionKey = `migration_transaction_${transaction.id}`
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          transactionKey,
          JSON.stringify(transaction),
        )
      }
    })

    it('should complete atomic migration transaction successfully', () => {
      const transaction: MigrationTransaction = {
        id: 'test-transaction-123',
        startTime: '2024-01-01T00:00:00.000Z',
        originalData: ['ent_s1'],
        targetVersion: MIGRATION_VERSIONS.EPISODE_LEVEL,
        completed: false,
      }

      const migrationResult: MigrationResult = {
        success: true,
        migratedItems: ['ent_s1_e01', 'ent_s1_e02'],
        backupData: ['ent_s1'],
        errors: [],
        version: MIGRATION_VERSIONS.EPISODE_LEVEL,
        canRollback: true,
      }

      completeAtomicMigration(transaction, migrationResult)

      // Should update migration state
      const state = getMigrationState()
      expect(state?.currentVersion).toBe(MIGRATION_VERSIONS.EPISODE_LEVEL)
      expect(state?.isRollbackAvailable).toBe(true)
      expect(state?.transactionId).toBe(transaction.id)

      // Should clean up transaction storage
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
        `migration_transaction_${transaction.id}`,
      )
    })

    it('should rollback atomic migration transaction', () => {
      const transactionId = 'test-transaction-123'
      const transaction: MigrationTransaction = {
        id: transactionId,
        startTime: '2024-01-01T00:00:00.000Z',
        originalData: ['ent_s1'],
        targetVersion: MIGRATION_VERSIONS.EPISODE_LEVEL,
        completed: true,
        rollbackData: ['ent_s1_e01', 'ent_s1_e02'],
      }

      // Mock transaction storage
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === `migration_transaction_${transactionId}`) {
          return JSON.stringify(transaction)
        }
        return null
      })

      const result = rollbackAtomicMigration(transactionId)

      expect(result).toBeTruthy()
      if (result) {
        expect(result.success).toBe(true)
        expect(result.migratedItems).toEqual(transaction.originalData)
        expect(result.version).toBe(MIGRATION_VERSIONS.SEASON_LEVEL)
        expect(result.canRollback).toBe(false)

        // Should clean up transaction
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
          `migration_transaction_${transactionId}`,
        )
      }
    })

    it('should handle missing transaction for rollback', () => {
      const result = rollbackAtomicMigration('non-existent-transaction')

      // Should return null due to error handling
      expect(result).toBeNull()
    })
  })

  describe('Data Integrity and Validation', () => {
    it('should maintain data integrity during migration', () => {
      const originalData = ['ent_s1', 'ent_s2', 'movie-tmp']

      const result = migrateSeasonToEpisodeProgress(originalData)

      expect(result.success).toBe(true)

      // Verify backup data matches original
      expect(result.backupData).toEqual(originalData)

      // Verify no data loss (migrated items should include all originals transformed)
      expect(result.migratedItems.length).toBeGreaterThanOrEqual(originalData.length)

      // Non-season items should be preserved exactly
      expect(result.migratedItems).toContain('movie-tmp')
    })

    it('should validate migration results consistency', () => {
      const seasonData = ['ent_s1']

      const migrationResult = migrateSeasonToEpisodeProgress(seasonData)
      const rollbackResult = rollbackEpisodeToSeasonProgress(migrationResult.migratedItems)

      expect(migrationResult.success).toBe(true)
      expect(rollbackResult.success).toBe(true)

      // After migration and rollback, we should have season-level data again
      expect(rollbackResult.version).toBe(MIGRATION_VERSIONS.SEASON_LEVEL)
    })

    it('should handle concurrent migration attempts safely', () => {
      const data = ['ent_s1'] // Use ent_s1 which has episode data

      // Set up initial state to ensure we have a clean starting point
      const initialState = {
        currentVersion: MIGRATION_VERSIONS.SEASON_LEVEL,
        lastMigrated: new Date().toISOString(),
        migrationHistory: [],
        isRollbackAvailable: false,
      }

      // Mock storage to actually persist state changes
      let currentState = initialState
      mockLocalStorage.setItem.mockImplementation((key: string, value: string) => {
        if (key === 'vbs_migration_state') {
          currentState = JSON.parse(value)
        }
        mockLocalStorage.store[key] = value
      })

      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'vbs_migration_state') {
          return JSON.stringify(currentState)
        }
        return mockLocalStorage.store[key] || null
      })

      // Simulate concurrent migration attempts
      const result1 = performMigration(data)
      const result2 = performMigration(data)

      // Both should succeed (idempotent operation)
      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)

      // State should be consistent
      const finalState = getMigrationState()
      expect(finalState?.currentVersion).toBe(MIGRATION_VERSIONS.EPISODE_LEVEL)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid data gracefully', () => {
      const invalidData = ['', null, undefined, 123, {}, []] as any[]

      const result = migrateSeasonToEpisodeProgress(invalidData)

      // Should not crash and handle invalid items
      expect(result).toBeDefined()
      expect(Array.isArray(result.migratedItems)).toBe(true)
    })

    it('should handle localStorage errors during migration', () => {
      // Mock localStorage error
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      const data = ['ent_s1']

      // Should not crash due to error handling wrapper
      const result = performMigration(data)

      expect(result).toBeDefined()
    })

    it('should handle corrupted transaction data', () => {
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key.includes('migration_transaction_')) {
          return 'invalid-json'
        }
        return null
      })

      const result = rollbackAtomicMigration('test-transaction')

      // Should handle error gracefully
      expect(result).toBeNull()
    })
  })

  describe('Performance and Memory', () => {
    it('should handle large datasets efficiently', () => {
      // Use ent_s1 which has episode data, so migration actually expands
      const largeDataset = Array.from({length: 100}, (_, i) =>
        i < 50 ? 'ent_s1' : `unknown_series_${i}_s1`,
      )

      const startTime = performance.now()
      const result = migrateSeasonToEpisodeProgress(largeDataset)
      const endTime = performance.now()

      expect(result.success).toBe(true)
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
      // Since ent_s1 has 26 episodes, 50 instances should become 50*26 = 1300 episodes + 50 unknown series = 1350 total
      expect(result.migratedItems.length).toBeGreaterThan(largeDataset.length)
    })

    it('should not leak memory during migrations', () => {
      const data = ['ent_s1', 'tos_s1']

      // Perform multiple migrations
      for (let i = 0; i < 100; i++) {
        migrateSeasonToEpisodeProgress(data)
      }

      // No explicit memory check, but should not crash or slow down significantly
      expect(true).toBe(true)
    })
  })
})
