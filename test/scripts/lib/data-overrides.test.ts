/**
 * Tests for the data overrides system.
 * Covers override validation, file I/O, and override application.
 */

import type {DataOverride} from '../../../scripts/lib/data-overrides.js'
import type {NormalizedEra} from '../../../scripts/lib/data-quality.js'
import {mkdir, rm, writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import process from 'node:process'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {
  applyOverrides,
  createOverridesFile,
  DEFAULT_OVERRIDES_PATH,
  loadOverridesFile,
  mergeOverridesFiles,
  saveOverridesFile,
  validateOverride,
} from '../../../scripts/lib/data-overrides.js'

const TEST_DIR = join(process.cwd(), 'test/fixtures/data-overrides-test')
const TEST_OVERRIDES_PATH = join(TEST_DIR, 'test-overrides.json')

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

const createValidOverride = (): DataOverride => ({
  targetId: 'tng_s1_e01',
  targetType: 'episode',
  fields: {title: 'Overridden Title'},
  reason: 'Correct title from official source',
  preserveOnRegeneration: true,
})

describe('Data Overrides', () => {
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

  describe('validateOverride', () => {
    it('should validate a correct override', () => {
      const override = createValidOverride()
      const result = validateOverride(override)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject override with missing targetId', () => {
      const override = {...createValidOverride(), targetId: ''}
      const result = validateOverride(override)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('targetId'))).toBe(true)
    })

    it('should reject override with invalid targetType', () => {
      const override = {
        ...createValidOverride(),
        targetType: 'invalid' as DataOverride['targetType'],
      }
      const result = validateOverride(override)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('targetType'))).toBe(true)
    })

    it('should require preserveOnRegeneration to be boolean', () => {
      const override = {
        ...createValidOverride(),
        preserveOnRegeneration: 'yes' as unknown as boolean,
      }
      const result = validateOverride(override)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('boolean'))).toBe(true)
    })

    it('should require non-empty fields object', () => {
      const override = {...createValidOverride(), fields: {}}
      const result = validateOverride(override)
      expect(result.valid).toBe(false)
    })
  })

  describe('Override file I/O', () => {
    it('should return null for non-existent file', async () => {
      const result = await loadOverridesFile(join(TEST_DIR, 'nonexistent.json'))
      expect(result).toBeNull()
    })

    it('should save and load an overrides file', async () => {
      const overridesFile = createOverridesFile('Test overrides')
      overridesFile.overrides.push(createValidOverride())
      await saveOverridesFile(TEST_OVERRIDES_PATH, overridesFile)

      const loaded = await loadOverridesFile(TEST_OVERRIDES_PATH)
      expect(loaded).not.toBeNull()
      expect(loaded?.description).toBe('Test overrides')
      expect(loaded?.overrides).toHaveLength(1)
    })

    it('should throw on invalid JSON', async () => {
      await writeFile(TEST_OVERRIDES_PATH, 'not json', 'utf-8')
      await expect(loadOverridesFile(TEST_OVERRIDES_PATH)).rejects.toThrow()
    })

    it('should create empty overrides file', () => {
      const file = createOverridesFile('Empty')
      expect(file.overrides).toHaveLength(0)
      expect(file.lastApplied).toBeNull()
    })
  })

  describe('applyOverrides', () => {
    it('should apply override to episode', () => {
      const eras = createTestEras()
      const result = applyOverrides(eras, [createValidOverride()])

      expect(result.summary.applied).toBe(1)
      const seasonItem = result.eras[0]?.items[0]
      if (seasonItem && 'episodeData' in seasonItem) {
        expect(seasonItem.episodeData?.[0]?.title).toBe('Overridden Title')
      }
    })

    it('should skip invalid overrides', () => {
      const eras = createTestEras()
      const invalidOverride = {...createValidOverride(), targetId: ''}
      const result = applyOverrides(eras, [invalidOverride])

      expect(result.summary.skipped).toBe(1)
      expect(result.summary.applied).toBe(0)
    })

    it('should skip overrides for non-existent targets', () => {
      const eras = createTestEras()
      const override = {...createValidOverride(), targetId: 'nonexistent'}
      const result = applyOverrides(eras, [override])

      expect(result.summary.skipped).toBe(1)
      expect(result.skippedOverrides[0]?.reason).toContain('not found')
    })

    it('should not mutate original data', () => {
      const eras = createTestEras()
      const seasonItem = eras[0]?.items?.[0] as (typeof eras)[0]['items'][0] | undefined
      let originalTitle: string | undefined
      if (seasonItem && 'episodeData' in seasonItem) {
        const episodeItem = seasonItem as {episodeData?: {title?: string}[]}
        originalTitle = episodeItem.episodeData?.[0]?.title
      }
      applyOverrides(eras, [createValidOverride()])
      const item = eras[0]?.items?.[0] as (typeof eras)[0]['items'][0] | undefined
      if (item && 'episodeData' in item) {
        const episodeItem = item as {episodeData?: {title?: string}[]}
        expect(episodeItem.episodeData?.[0]?.title).toBe(originalTitle)
      }
    })
  })

  describe('mergeOverridesFiles', () => {
    it('should merge multiple override files', () => {
      const file1 = createOverridesFile('File 1')
      file1.overrides.push({...createValidOverride(), targetId: 'tng_s1_e01'})

      const file2 = createOverridesFile('File 2')
      file2.overrides.push({...createValidOverride(), targetId: 'tng_s1_e02'})

      const merged = mergeOverridesFiles(file1, file2)
      expect(merged.overrides).toHaveLength(2)
      expect(merged.description).toContain('Merged')
    })

    it('should deduplicate by targetId', () => {
      const file1 = createOverridesFile('File 1')
      file1.overrides.push({...createValidOverride(), targetId: 'tng_s1_e01'})

      const file2 = createOverridesFile('File 2')
      file2.overrides.push({
        ...createValidOverride(),
        targetId: 'tng_s1_e01',
        fields: {title: 'Different'},
      })

      const merged = mergeOverridesFiles(file1, file2)
      expect(merged.overrides).toHaveLength(1)
    })

    it('should handle empty merge', () => {
      const merged = mergeOverridesFiles()
      expect(merged.overrides).toHaveLength(0)
    })
  })

  describe('DEFAULT_OVERRIDES_PATH', () => {
    it('should point to the correct location', () => {
      expect(DEFAULT_OVERRIDES_PATH).toBe('scripts/config/data-overrides.json')
    })
  })
})
