/**
 * Tests for the data patches system.
 * Covers patch validation, file I/O, and patch application logic.
 */

import type {DataPatch, PatchOperation} from '../../../scripts/lib/data-patches.js'
import type {NormalizedEra} from '../../../scripts/lib/data-quality.js'
import {mkdir, rm, writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import process from 'node:process'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {
  applyPatches,
  createPatchFile,
  loadPatchFile,
  savePatchFile,
  validatePatch,
} from '../../../scripts/lib/data-patches.js'

const TEST_DIR = join(process.cwd(), 'test/fixtures/data-patches-test')
const TEST_PATCH_PATH = join(TEST_DIR, 'test-patch.json')

const createTestEras = (): NormalizedEra[] => [
  {
    id: 'tng_era',
    title: '24th Century',
    years: '2364-2379',
    stardates: 'Five-digit stardates',
    description: 'TNG era',
    items: [
      {
        id: 'tng_s1',
        title: 'Star Trek: The Next Generation Season 1',
        type: 'season',
        year: '1987',
        stardate: '41000.0-41000.0',
        episodes: 25,
        episodeData: [
          {
            id: 'tng_s1_e01',
            title: 'Encounter at Farpoint',
            season: 1,
            episode: 1,
            airDate: '1987-09-28',
            stardate: '41153.7',
            synopsis: 'Test synopsis',
          },
        ],
      },
    ],
  },
]

const createValidPatch = (): DataPatch => ({
  id: 'patch-tng-s1-e1-title',
  description: 'Fix episode title',
  targetType: 'episode',
  targetId: 'tng_s1_e01',
  operation: 'update',
  fields: {title: 'Encounter at Farpoint, Part 1'},
  createdAt: '2024-01-01T00:00:00.000Z',
  author: 'Test Author',
})

describe('Data Patches', () => {
  beforeEach(async () => {
    try {
      await rm(TEST_DIR, {recursive: true, force: true})
    } catch {
      // Directory doesn't exist yet
    }
    await mkdir(TEST_DIR, {recursive: true})
  })

  afterEach(async () => {
    try {
      await rm(TEST_DIR, {recursive: true, force: true})
    } catch {
      // Cleanup best-effort
    }
  })

  describe('validatePatch', () => {
    it('should validate a correct patch', () => {
      const patch = createValidPatch()
      const result = validatePatch(patch)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject patch with missing id', () => {
      const patch: DataPatch = {...createValidPatch(), id: ''}
      const result = validatePatch(patch)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('id'))).toBe(true)
    })

    it('should reject patch with invalid targetType', () => {
      const patch: DataPatch = {...createValidPatch(), targetType: 'invalid' as never}
      const result = validatePatch(patch)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('targetType'))).toBe(true)
    })

    it('should reject patch with invalid operation', () => {
      const patch: DataPatch = {...createValidPatch(), operation: 'invalid' as PatchOperation}
      const result = validatePatch(patch)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('operation'))).toBe(true)
    })

    it('should warn about fields on remove operation', () => {
      const basePatch = createValidPatch()
      const patch: DataPatch = {
        id: basePatch.id,
        description: basePatch.description,
        targetType: basePatch.targetType,
        targetId: basePatch.targetId,
        operation: 'remove',
        fields: {title: 'test'},
        createdAt: basePatch.createdAt,
        author: basePatch.author!,
      }
      const result = validatePatch(patch)
      expect(result.warnings.some(w => w.includes('fields'))).toBe(true)
    })

    it('should require fields for update operation', () => {
      const basePatch = createValidPatch()
      const patch: DataPatch = {
        id: basePatch.id,
        description: basePatch.description,
        targetType: basePatch.targetType,
        targetId: basePatch.targetId,
        operation: 'update',
        fields: {},
        createdAt: basePatch.createdAt,
        author: basePatch.author!,
      }
      const result = validatePatch(patch)
      expect(result.valid).toBe(false)
    })
  })

  describe('Patch file I/O', () => {
    it('should save and load a patch file', async () => {
      const patchFile = createPatchFile([createValidPatch()], 'Test patches')
      await savePatchFile(TEST_PATCH_PATH, patchFile)

      const loaded = await loadPatchFile(TEST_PATCH_PATH)
      expect(loaded.version).toBe('1.0')
      expect(loaded.description).toBe('Test patches')
      expect(loaded.patches).toHaveLength(1)
      expect(loaded.patches[0]?.id).toBe('patch-tng-s1-e1-title')
    })

    it('should throw on invalid JSON', async () => {
      await writeFile(TEST_PATCH_PATH, 'not json', 'utf-8')
      await expect(loadPatchFile(TEST_PATCH_PATH)).rejects.toThrow()
    })

    it('should throw on invalid structure', async () => {
      await writeFile(TEST_PATCH_PATH, JSON.stringify({foo: 'bar'}), 'utf-8')
      await expect(loadPatchFile(TEST_PATCH_PATH)).rejects.toThrow()
    })

    it('should create parent directories when saving', async () => {
      const nestedPath = join(TEST_DIR, 'nested', 'deep', 'patch.json')
      const patchFile = createPatchFile([], 'Empty')
      await savePatchFile(nestedPath, patchFile)

      const loaded = await loadPatchFile(nestedPath)
      expect(loaded.version).toBe('1.0')
    })
  })

  describe('applyPatches', () => {
    it('should apply update patch to episode', () => {
      const eras = createTestEras()
      const patch = createValidPatch()
      const result = applyPatches(eras, [patch])

      expect(result.summary.applied).toBe(1)
      expect(result.summary.failed).toBe(0)
      const seasonItem = result.eras[0]?.items[0]
      if (seasonItem && 'episodeData' in seasonItem) {
        expect(seasonItem.episodeData?.[0]?.title).toBe('Encounter at Farpoint, Part 1')
      }
    })

    it('should apply update patch to season', () => {
      const eras = createTestEras()
      const patch: DataPatch = {
        id: 'patch-tng-s1-title',
        description: 'Fix season title',
        targetType: 'season',
        targetId: 'tng_s1',
        operation: 'update',
        fields: {title: 'TNG Season 1'},
        createdAt: '2024-01-01T00:00:00.000Z',
      }
      const result = applyPatches(eras, [patch])

      expect(result.summary.applied).toBe(1)
      expect(result.eras[0]?.items[0]?.title).toBe('TNG Season 1')
    })

    it('should skip invalid patches', () => {
      const eras = createTestEras()
      const invalidPatch: DataPatch = {...createValidPatch(), id: ''}
      const result = applyPatches(eras, [invalidPatch])

      expect(result.summary.skipped).toBe(1)
      expect(result.summary.applied).toBe(0)
    })

    it('should report failed patches for non-existent targets', () => {
      const eras = createTestEras()
      const patch: DataPatch = {...createValidPatch(), targetId: 'nonexistent'}
      const result = applyPatches(eras, [patch])

      expect(result.summary.failed).toBe(1)
      expect(result.failedPatches[0]?.reason).toContain('not found')
    })

    it('should not mutate original data', () => {
      const eras = createTestEras()
      const seasonItem = eras[0]?.items[0]
      let originalTitle: string | undefined
      if (seasonItem && 'episodeData' in seasonItem && seasonItem.episodeData?.[0]) {
        originalTitle = seasonItem.episodeData[0]?.title
      }
      applyPatches(eras, [createValidPatch()])
      const item = eras[0]?.items[0]
      if (item && 'episodeData' in item && item.episodeData?.[0]) {
        expect(item.episodeData[0]?.title).toBe(originalTitle)
      }
    })
  })
})
