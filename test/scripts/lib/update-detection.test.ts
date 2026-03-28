/**
 * Tests for the smart update detection system.
 * Covers manifest I/O, change detection logic, and manifest updates.
 */

import type {
  CurrentMovieInfo,
  CurrentSeriesInfo,
  UpdateManifest,
} from '../../../scripts/lib/update-detection.js'
import {mkdir, readFile, rm, writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import process from 'node:process'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {
  checkForUpdates,
  createManifest,
  DEFAULT_MANIFEST_PATH,
  loadManifest,
  saveManifest,
  updateManifestFromData,
} from '../../../scripts/lib/update-detection.js'

const TEST_DIR = join(process.cwd(), 'test/fixtures/update-detection-test')
const TEST_MANIFEST_PATH = join(TEST_DIR, 'update-manifest.json')

/**
 * Helper to create a populated manifest for testing.
 */
const createTestManifest = (): UpdateManifest => ({
  version: '1.0',
  lastFullUpdate: '2024-01-01T00:00:00.000Z',
  lastCheckTimestamp: '2024-01-01T00:00:00.000Z',
  series: {
    tng: {
      tmdbId: 655,
      name: 'Star Trek: The Next Generation',
      knownSeasons: 7,
      knownEpisodes: 178,
      lastUpdated: '2024-01-01T00:00:00.000Z',
      seasonDetails: {
        1: {episodeCount: 26, lastAirDate: '1988-05-16'},
        2: {episodeCount: 22, lastAirDate: '1989-07-17'},
        7: {episodeCount: 26, lastAirDate: '1994-05-23'},
      },
    },
    snw: {
      tmdbId: 103516,
      name: 'Star Trek: Strange New Worlds',
      knownSeasons: 2,
      knownEpisodes: 20,
      lastUpdated: '2024-01-01T00:00:00.000Z',
      seasonDetails: {
        1: {episodeCount: 10, lastAirDate: '2022-07-07'},
        2: {episodeCount: 10, lastAirDate: '2023-08-10'},
      },
    },
  },
  movies: {
    'wrath-of-khan': {
      tmdbId: 154,
      title: 'Star Trek II: The Wrath of Khan',
      releaseDate: '1982-06-04',
      lastUpdated: '2024-01-01T00:00:00.000Z',
    },
  },
})

/**
 * Helper to build a CurrentSeriesInfo matching TNG in the test manifest.
 */
const createTngSeries = (overrides?: Partial<CurrentSeriesInfo>): CurrentSeriesInfo => ({
  code: 'tng',
  tmdbId: 655,
  name: 'Star Trek: The Next Generation',
  seasonCount: 7,
  episodeCount: 178,
  seasons: [
    {seasonNumber: 1, episodeCount: 26, lastAirDate: '1988-05-16'},
    {seasonNumber: 2, episodeCount: 22, lastAirDate: '1989-07-17'},
    {seasonNumber: 7, episodeCount: 26, lastAirDate: '1994-05-23'},
  ],
  ...overrides,
})

/**
 * Helper to build a CurrentSeriesInfo matching SNW in the test manifest.
 */
const createSnwSeries = (overrides?: Partial<CurrentSeriesInfo>): CurrentSeriesInfo => ({
  code: 'snw',
  tmdbId: 103516,
  name: 'Star Trek: Strange New Worlds',
  seasonCount: 2,
  episodeCount: 20,
  seasons: [
    {seasonNumber: 1, episodeCount: 10, lastAirDate: '2022-07-07'},
    {seasonNumber: 2, episodeCount: 10, lastAirDate: '2023-08-10'},
  ],
  ...overrides,
})

const testMovie: CurrentMovieInfo = {
  id: 'wrath-of-khan',
  tmdbId: 154,
  title: 'Star Trek II: The Wrath of Khan',
  releaseDate: '1982-06-04',
}

describe('Update Detection', () => {
  // ---------------------------------------------------------------------------
  // createManifest
  // ---------------------------------------------------------------------------

  describe('createManifest', () => {
    it('should create an empty manifest with correct version', () => {
      const manifest = createManifest()

      expect(manifest.version).toBe('1.0')
      expect(manifest.lastFullUpdate).toBe('')
      expect(manifest.lastCheckTimestamp).toBe('')
      expect(manifest.series).toEqual({})
      expect(manifest.movies).toEqual({})
    })

    it('should return a new object each time', () => {
      const a = createManifest()
      const b = createManifest()

      expect(a).not.toBe(b)
      expect(a).toEqual(b)
    })
  })

  // ---------------------------------------------------------------------------
  // DEFAULT_MANIFEST_PATH
  // ---------------------------------------------------------------------------

  describe('DEFAULT_MANIFEST_PATH', () => {
    it('should point to the .cache directory', () => {
      expect(DEFAULT_MANIFEST_PATH).toBe('.cache/update-manifest.json')
    })
  })

  // ---------------------------------------------------------------------------
  // loadManifest / saveManifest
  // ---------------------------------------------------------------------------

  describe('Manifest I/O', () => {
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

    describe('loadManifest', () => {
      it('should return null when file does not exist', async () => {
        const result = await loadManifest(join(TEST_DIR, 'nonexistent.json'))
        expect(result).toBeNull()
      })

      it('should return null for invalid JSON', async () => {
        await writeFile(TEST_MANIFEST_PATH, 'not json at all', 'utf-8')
        const result = await loadManifest(TEST_MANIFEST_PATH)
        expect(result).toBeNull()
      })

      it('should return null for JSON that is not a valid manifest', async () => {
        await writeFile(TEST_MANIFEST_PATH, JSON.stringify({foo: 'bar'}), 'utf-8')
        const result = await loadManifest(TEST_MANIFEST_PATH)
        expect(result).toBeNull()
      })

      it('should return null for a different schema version', async () => {
        const outdated = {...createTestManifest(), version: '0.9'}
        await writeFile(TEST_MANIFEST_PATH, JSON.stringify(outdated), 'utf-8')
        const result = await loadManifest(TEST_MANIFEST_PATH)
        expect(result).toBeNull()
      })

      it('should load a valid manifest', async () => {
        const manifest = createTestManifest()
        await writeFile(TEST_MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8')

        const loaded = await loadManifest(TEST_MANIFEST_PATH)
        expect(loaded).toEqual(manifest)
      })
    })

    describe('saveManifest', () => {
      it('should write manifest as formatted JSON', async () => {
        const manifest = createTestManifest()
        await saveManifest(TEST_MANIFEST_PATH, manifest)

        const raw = await readFile(TEST_MANIFEST_PATH, 'utf-8')
        const parsed: unknown = JSON.parse(raw)
        expect(parsed).toEqual(manifest)
      })

      it('should create parent directories if needed', async () => {
        const nested = join(TEST_DIR, 'nested', 'deep', 'manifest.json')
        const manifest = createManifest()

        await saveManifest(nested, manifest)

        const loaded = await loadManifest(nested)
        expect(loaded).toEqual(manifest)
      })
    })

    describe('round-trip', () => {
      it('should survive save then load', async () => {
        const manifest = createTestManifest()
        await saveManifest(TEST_MANIFEST_PATH, manifest)

        const loaded = await loadManifest(TEST_MANIFEST_PATH)
        expect(loaded).toEqual(manifest)
      })
    })
  })

  // ---------------------------------------------------------------------------
  // checkForUpdates
  // ---------------------------------------------------------------------------

  describe('checkForUpdates', () => {
    it('should report no updates when nothing changed', () => {
      const manifest = createTestManifest()
      const series = [createTngSeries(), createSnwSeries()]
      const movies = [testMovie]

      const result = checkForUpdates(manifest, series, movies)

      expect(result.hasUpdates).toBe(false)
      expect(result.newSeries).toEqual([])
      expect(result.updatedSeries).toEqual([])
      expect(result.newMovies).toEqual([])
      expect(result.summary).toContain('No updates detected')
      expect(result.checkedAt).toBeTruthy()
    })

    it('should detect a brand new series', () => {
      const manifest = createTestManifest()
      const newSeries: CurrentSeriesInfo = {
        code: 'ld',
        tmdbId: 85948,
        name: 'Star Trek: Lower Decks',
        seasonCount: 5,
        episodeCount: 50,
        seasons: [{seasonNumber: 1, episodeCount: 10, lastAirDate: '2020-10-08'}],
      }
      const series = [createTngSeries(), createSnwSeries(), newSeries]

      const result = checkForUpdates(manifest, series, [testMovie])

      expect(result.hasUpdates).toBe(true)
      expect(result.newSeries).toEqual(['ld'])
      expect(result.summary).toContain('1 new series')
      expect(result.summary).toContain('ld')
    })

    it('should detect a new season in an existing series', () => {
      const manifest = createTestManifest()
      const snwWithNewSeason = createSnwSeries({
        seasonCount: 3,
        episodeCount: 30,
        seasons: [
          {seasonNumber: 1, episodeCount: 10, lastAirDate: '2022-07-07'},
          {seasonNumber: 2, episodeCount: 10, lastAirDate: '2023-08-10'},
          {seasonNumber: 3, episodeCount: 10, lastAirDate: '2025-01-15'},
        ],
      })

      const result = checkForUpdates(manifest, [createTngSeries(), snwWithNewSeason], [testMovie])

      expect(result.hasUpdates).toBe(true)
      expect(result.updatedSeries).toHaveLength(1)

      const snwUpdate = result.updatedSeries[0]
      expect(snwUpdate).toBeDefined()
      expect(snwUpdate?.seriesCode).toBe('snw')
      expect(snwUpdate?.reason).toContain('new season')
      expect(snwUpdate?.reason).toContain('2 → 3')
    })

    it('should detect new episodes in an existing season', () => {
      const manifest = createTestManifest()
      const snwWithExtraEpisode = createSnwSeries({
        episodeCount: 21,
        seasons: [
          {seasonNumber: 1, episodeCount: 10, lastAirDate: '2022-07-07'},
          {seasonNumber: 2, episodeCount: 11, lastAirDate: '2023-09-15'},
        ],
      })

      const result = checkForUpdates(
        manifest,
        [createTngSeries(), snwWithExtraEpisode],
        [testMovie],
      )

      expect(result.hasUpdates).toBe(true)
      expect(result.updatedSeries).toHaveLength(1)

      const snwUpdate = result.updatedSeries[0]
      expect(snwUpdate).toBeDefined()
      expect(snwUpdate?.seriesCode).toBe('snw')
      expect(snwUpdate?.reason).toContain('new episode')
    })

    it('should detect a changed air date', () => {
      const manifest = createTestManifest()
      const snwWithChangedDate = createSnwSeries({
        seasons: [
          {seasonNumber: 1, episodeCount: 10, lastAirDate: '2022-07-07'},
          {seasonNumber: 2, episodeCount: 10, lastAirDate: '2023-09-01'},
        ],
      })

      const result = checkForUpdates(manifest, [createTngSeries(), snwWithChangedDate], [testMovie])

      expect(result.hasUpdates).toBe(true)
      expect(result.updatedSeries).toHaveLength(1)

      const snwUpdate = result.updatedSeries[0]
      expect(snwUpdate).toBeDefined()
      expect(snwUpdate?.reason).toContain('air date changed')
    })

    it('should detect new movies', () => {
      const manifest = createTestManifest()
      const newMovie: CurrentMovieInfo = {
        id: 'search-for-spock',
        tmdbId: 157,
        title: 'Star Trek III: The Search for Spock',
        releaseDate: '1984-06-01',
      }

      const result = checkForUpdates(
        manifest,
        [createTngSeries(), createSnwSeries()],
        [testMovie, newMovie],
      )

      expect(result.hasUpdates).toBe(true)
      expect(result.newMovies).toEqual(['search-for-spock'])
      expect(result.summary).toContain('1 new movie')
    })

    it('should detect multiple changes at once', () => {
      const manifest = createTestManifest()
      const newSeries: CurrentSeriesInfo = {
        code: 'pro',
        tmdbId: 106393,
        name: 'Star Trek: Prodigy',
        seasonCount: 2,
        episodeCount: 40,
        seasons: [{seasonNumber: 1, episodeCount: 20, lastAirDate: '2022-12-29'}],
      }
      const snwWithNewSeason = createSnwSeries({
        seasonCount: 3,
        episodeCount: 30,
        seasons: [
          {seasonNumber: 1, episodeCount: 10, lastAirDate: '2022-07-07'},
          {seasonNumber: 2, episodeCount: 10, lastAirDate: '2023-08-10'},
          {seasonNumber: 3, episodeCount: 10, lastAirDate: '2025-01-15'},
        ],
      })
      const newMovie: CurrentMovieInfo = {
        id: 'the-voyage-home',
        tmdbId: 168,
        title: 'Star Trek IV: The Voyage Home',
        releaseDate: '1986-11-26',
      }

      const result = checkForUpdates(
        manifest,
        [createTngSeries(), snwWithNewSeason, newSeries],
        [testMovie, newMovie],
      )

      expect(result.hasUpdates).toBe(true)
      expect(result.newSeries).toEqual(['pro'])
      expect(result.updatedSeries).toHaveLength(1)
      expect(result.newMovies).toEqual(['the-voyage-home'])
      expect(result.summary).toContain('new series')
      expect(result.summary).toContain('updated series')
      expect(result.summary).toContain('new movie')
    })

    it('should include a checkedAt ISO timestamp', () => {
      const before = new Date().toISOString()
      const manifest = createTestManifest()

      const result = checkForUpdates(manifest, [], [])

      expect(result.checkedAt >= before).toBe(true)
    })

    it('should work with an empty manifest', () => {
      const manifest = createManifest()
      const series = [createTngSeries()]
      const movies = [testMovie]

      const result = checkForUpdates(manifest, series, movies)

      expect(result.hasUpdates).toBe(true)
      expect(result.newSeries).toEqual(['tng'])
      expect(result.newMovies).toEqual(['wrath-of-khan'])
    })
  })

  // ---------------------------------------------------------------------------
  // updateManifestFromData
  // ---------------------------------------------------------------------------

  describe('updateManifestFromData', () => {
    it('should produce a manifest reflecting all provided series', () => {
      const manifest = createManifest()
      const series = [createTngSeries(), createSnwSeries()]

      const updated = updateManifestFromData(manifest, series, [])

      expect(updated.version).toBe('1.0')
      expect(Object.keys(updated.series)).toEqual(['tng', 'snw'])

      const tng = updated.series.tng
      expect(tng).toBeDefined()
      expect(tng?.tmdbId).toBe(655)
      expect(tng?.knownSeasons).toBe(7)
      expect(tng?.knownEpisodes).toBe(178)
      expect(tng?.name).toBe('Star Trek: The Next Generation')
    })

    it('should produce a manifest reflecting all provided movies', () => {
      const manifest = createManifest()

      const updated = updateManifestFromData(manifest, [], [testMovie])

      expect(Object.keys(updated.movies)).toEqual(['wrath-of-khan'])

      const wok = updated.movies['wrath-of-khan']
      expect(wok).toBeDefined()
      expect(wok?.tmdbId).toBe(154)
      expect(wok?.title).toBe('Star Trek II: The Wrath of Khan')
      expect(wok?.releaseDate).toBe('1982-06-04')
    })

    it('should populate seasonDetails from the seasons array', () => {
      const manifest = createManifest()
      const series = [createSnwSeries()]

      const updated = updateManifestFromData(manifest, series, [])

      const snw = updated.series.snw
      expect(snw).toBeDefined()
      expect(snw?.seasonDetails[1]).toEqual({
        episodeCount: 10,
        lastAirDate: '2022-07-07',
      })
      expect(snw?.seasonDetails[2]).toEqual({
        episodeCount: 10,
        lastAirDate: '2023-08-10',
      })
    })

    it('should set timestamps on all entries', () => {
      const before = new Date().toISOString()
      const manifest = createManifest()

      const updated = updateManifestFromData(manifest, [createTngSeries()], [testMovie])

      expect(updated.lastFullUpdate >= before).toBe(true)
      expect(updated.lastCheckTimestamp >= before).toBe(true)

      const tngTimestamp = updated.series.tng?.lastUpdated ?? ''
      expect(tngTimestamp >= before).toBe(true)

      const wokTimestamp = updated.movies['wrath-of-khan']?.lastUpdated ?? ''
      expect(wokTimestamp >= before).toBe(true)
    })

    it('should preserve the manifest version', () => {
      const manifest = createManifest()
      manifest.version = '1.0'

      const updated = updateManifestFromData(manifest, [], [])

      expect(updated.version).toBe('1.0')
    })

    it('should not mutate the input manifest', () => {
      const manifest = createTestManifest()
      const originalSeries = {...manifest.series}

      updateManifestFromData(manifest, [createTngSeries()], [])

      expect(manifest.series).toEqual(originalSeries)
    })
  })
})
