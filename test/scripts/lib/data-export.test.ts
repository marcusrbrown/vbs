/**
 * Tests for the data export functionality.
 * Covers JSON/CSV export, flattening, and field escaping.
 */

import type {NormalizedEra} from '../../../scripts/lib/data-quality.js'
import {mkdir, readFile, rm} from 'node:fs/promises'
import {join} from 'node:path'
import process from 'node:process'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {
  convertErasToFlatRecords,
  convertErasToItemRecords,
  escapeCsvField,
  exportData,
  exportToCsv,
  exportToJson,
} from '../../../scripts/lib/data-export.js'

const TEST_DIR = join(process.cwd(), 'test/fixtures/data-export-test')

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
            synopsis: 'Test synopsis for episode',
          },
        ],
      },
      {
        id: 'fc',
        title: 'Star Trek: First Contact',
        type: 'movie',
        year: '1996',
        stardate: 'Stardate TBD',
        notes: 'Movie about the Borg',
      },
    ],
  },
]

describe('Data Export', () => {
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

  describe('escapeCsvField', () => {
    it('should return plain string for simple values', () => {
      expect(escapeCsvField('hello')).toBe('hello')
      expect(escapeCsvField(123)).toBe('123')
    })

    it('should escape commas', () => {
      expect(escapeCsvField('hello, world')).toBe('"hello, world"')
    })

    it('should escape quotes', () => {
      expect(escapeCsvField('say "hello"')).toBe('"say ""hello"""')
    })

    it('should escape newlines', () => {
      expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"')
    })
  })

  describe('convertErasToFlatRecords', () => {
    it('should flatten era data to episode records', () => {
      const eras = createTestEras()
      const records = convertErasToFlatRecords(eras)

      expect(records.length).toBeGreaterThan(0)
      expect(records[0]).toHaveProperty('eraId')
      expect(records[0]).toHaveProperty('episodeId')
      expect(records[0]).toHaveProperty('episodeTitle')
    })

    it('should handle movies with empty episode fields', () => {
      const eras = createTestEras()
      const records = convertErasToFlatRecords(eras)
      const movieRecord = records.find(r => r.itemType === 'movie')

      expect(movieRecord).toBeDefined()
      expect(movieRecord?.episodeId).toBe('')
      expect(movieRecord?.episodeTitle).toBe('')
    })

    it('should handle empty episodeData', () => {
      const testEras = createTestEras()
      const testEra = testEras[0]
      const firstItem = testEra?.items?.[0]
      if (!testEra || !firstItem) {
        throw new Error('Test setup: expected at least one era and item')
      }
      const eras: NormalizedEra[] = [
        {
          ...testEra,
          items: [
            {
              ...firstItem,
              episodeData: [],
            },
          ],
        },
      ]
      const records = convertErasToFlatRecords(eras)
      expect(records.length).toBeGreaterThan(0)
    })
  })

  describe('convertErasToItemRecords', () => {
    it('should flatten era data to item records', () => {
      const eras = createTestEras()
      const records = convertErasToItemRecords(eras)

      expect(records.length).toBe(2)
      expect(records[0]?.itemType).toBe('season')
      expect(records[1]?.itemType).toBe('movie')
    })

    it('should count episodes for seasons', () => {
      const eras = createTestEras()
      const records = convertErasToItemRecords(eras)
      const seasonRecord = records.find(r => r.itemType === 'season')

      expect(seasonRecord?.episodeCount).toBe(1)
    })
  })

  describe('exportToJson', () => {
    it('should export to JSON file', async () => {
      const eras = createTestEras()
      const outputPath = join(TEST_DIR, 'export.json')
      const result = await exportToJson(eras, {outputPath})

      expect(result.format).toBe('json')
      expect(result.outputPath).toBe(outputPath)
      expect(result.recordCount).toBeGreaterThan(0)

      const content = await readFile(outputPath, 'utf-8')
      const parsed = JSON.parse(content)
      expect(Array.isArray(parsed)).toBe(true)
    })

    it('should create output directory', async () => {
      const eras = createTestEras()
      const outputPath = join(TEST_DIR, 'nested', 'deep', 'export.json')
      const result = await exportToJson(eras, {outputPath})

      expect(result.format).toBe('json')
    })
  })

  describe('exportToCsv', () => {
    it('should export to CSV file', async () => {
      const eras = createTestEras()
      const outputPath = join(TEST_DIR, 'export.csv')
      const result = await exportToCsv(eras, {outputPath})

      expect(result.format).toBe('csv')
      expect(result.outputPath).toBe(outputPath)

      const content = await readFile(outputPath, 'utf-8')
      expect(content).toContain('eraId')
      expect(content).toContain('tng_s1')
    })

    it('should flatten episodes when requested', async () => {
      const eras = createTestEras()
      const outputPath = join(TEST_DIR, 'flattened.csv')
      const result = await exportToCsv(eras, {outputPath, flattenEpisodes: true})

      expect(result.recordCount).toBe(2)
    })
  })

  describe('exportData', () => {
    it('should delegate to JSON exporter for json format', async () => {
      const eras = createTestEras()
      const outputPath = join(TEST_DIR, 'delegated.json')
      const result = await exportData(eras, {format: 'json', outputPath})

      expect(result.format).toBe('json')
    })

    it('should delegate to CSV exporter for csv format', async () => {
      const eras = createTestEras()
      const outputPath = join(TEST_DIR, 'delegated.csv')
      const result = await exportData(eras, {format: 'csv', outputPath})

      expect(result.format).toBe('csv')
    })

    it('should throw on unsupported format', async () => {
      const eras = createTestEras()
      await expect(
        exportData(eras, {format: 'xml' as never, outputPath: 'test.xml'}),
      ).rejects.toThrow('Unsupported export format')
    })
  })
})
