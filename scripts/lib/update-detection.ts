/**
 * Smart update detection for the Star Trek data generation pipeline.
 * Maintains a local manifest tracking what was last fetched and compares
 * against current TMDB data to detect new seasons, episodes, or changed content.
 * Returns a targeted list of items that need updating so the generator
 * can perform incremental fetches instead of full regeneration.
 *
 * Follows VBS functional style — no classes, pure functions, closure-based state.
 */

import {mkdir, readFile, writeFile} from 'node:fs/promises'
import {dirname} from 'node:path'

/**
 * Schema version for the manifest format.
 * Bump this when the manifest structure changes to trigger a full regeneration.
 */
const MANIFEST_VERSION = '1.0'

/**
 * Default path for the update manifest file.
 */
export const DEFAULT_MANIFEST_PATH = '.cache/update-manifest.json'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Per-season metadata tracked in the manifest.
 */
export interface SeasonDetail {
  episodeCount: number
  lastAirDate: string
}

/**
 * Manifest entry for a single Star Trek series.
 * Tracks the known state of a series at the time of last generation.
 */
export interface SeriesManifestEntry {
  tmdbId: number
  name: string
  knownSeasons: number
  knownEpisodes: number
  lastUpdated: string
  seasonDetails: Record<number, SeasonDetail>
}

/**
 * Manifest entry for a single Star Trek movie.
 * Tracks the known state of a movie at the time of last generation.
 */
export interface MovieManifestEntry {
  tmdbId: number
  title: string
  releaseDate: string
  lastUpdated: string
}

/**
 * Root manifest structure persisted to disk.
 * Captures a snapshot of all known content at the time of last generation
 * so that subsequent runs can detect what has changed.
 */
export interface UpdateManifest {
  version: string
  lastFullUpdate: string
  lastCheckTimestamp: string
  series: Record<string, SeriesManifestEntry>
  movies: Record<string, MovieManifestEntry>
}

/**
 * Describes a series that has changed since the last generation
 * along with a human-readable reason explaining what changed.
 */
export interface UpdatedSeriesInfo {
  seriesCode: string
  reason: string
}

/**
 * Result of comparing current TMDB data against the local manifest.
 * Tells the generator exactly what needs to be re-fetched.
 */
export interface UpdateCheckResult {
  hasUpdates: boolean
  newSeries: string[]
  updatedSeries: UpdatedSeriesInfo[]
  newMovies: string[]
  summary: string
  checkedAt: string
}

// ---------------------------------------------------------------------------
// Input shapes — kept inline to avoid coupling to external modules
// ---------------------------------------------------------------------------

/**
 * Shape of series data passed in from the caller for comparison.
 */
export interface CurrentSeriesInfo {
  code: string
  tmdbId: number
  name: string
  seasonCount: number
  episodeCount: number
  seasons: {
    seasonNumber: number
    episodeCount: number
    lastAirDate: string
  }[]
}

/**
 * Shape of movie data passed in from the caller for comparison.
 */
export interface CurrentMovieInfo {
  id: string
  tmdbId: number
  title: string
  releaseDate: string
}

// ---------------------------------------------------------------------------
// Manifest I/O
// ---------------------------------------------------------------------------

/**
 * Creates a fresh, empty manifest with default values.
 * Used when no manifest file exists or when the schema version has changed.
 *
 * @returns A new UpdateManifest with empty series/movie records
 *
 * @example
 * ```typescript
 * const manifest = createManifest()
 * // { version: '1.0', series: {}, movies: {}, ... }
 * ```
 */
export const createManifest = (): UpdateManifest => ({
  version: MANIFEST_VERSION,
  lastFullUpdate: '',
  lastCheckTimestamp: '',
  series: {},
  movies: {},
})

/**
 * Loads an existing manifest from disk.
 * Returns `null` when the file does not exist, is unreadable, or contains
 * an incompatible schema version (which signals a full regeneration is needed).
 *
 * @param manifestPath - Absolute or relative path to the manifest JSON file
 * @returns The parsed manifest, or `null` if it cannot be used
 *
 * @example
 * ```typescript
 * const manifest = await loadManifest('.cache/update-manifest.json')
 * if (!manifest) {
 *   console.log('No manifest found — full generation required')
 * }
 * ```
 */
export const loadManifest = async (manifestPath: string): Promise<UpdateManifest | null> => {
  try {
    const content = await readFile(manifestPath, 'utf-8')
    const parsed: unknown = JSON.parse(content)

    if (!isValidManifest(parsed)) {
      return null
    }

    // Reject manifests from a different schema version
    if (parsed.version !== MANIFEST_VERSION) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

/**
 * Persists a manifest to disk, creating parent directories as needed.
 * Uses JSON with 2-space indentation for human readability.
 *
 * @param manifestPath - Absolute or relative path to the manifest JSON file
 * @param manifest - The manifest to save
 *
 * @example
 * ```typescript
 * await saveManifest('.cache/update-manifest.json', manifest)
 * ```
 */
export const saveManifest = async (
  manifestPath: string,
  manifest: UpdateManifest,
): Promise<void> => {
  const dir = dirname(manifestPath)
  await mkdir(dir, {recursive: true})
  const content = JSON.stringify(manifest, null, 2)
  await writeFile(manifestPath, content, 'utf-8')
}

// ---------------------------------------------------------------------------
// Update detection
// ---------------------------------------------------------------------------

/**
 * Compares current TMDB data against the local manifest to detect changes.
 * Identifies new series, updated series (new seasons / new episodes /
 * changed air-dates), and new movies.
 *
 * This function is **pure** — it reads the manifest but does not mutate it.
 * Call {@link updateManifestFromData} after a successful generation to persist
 * the new state.
 *
 * @param manifest - The previously saved manifest (snapshot of last known state)
 * @param currentSeries - Current series metadata from TMDB
 * @param currentMovies - Current movie metadata from TMDB
 * @returns An UpdateCheckResult describing everything that changed
 *
 * @example
 * ```typescript
 * const result = checkForUpdates(manifest, seriesList, movieList)
 * if (result.hasUpdates) {
 *   console.log(result.summary)
 * }
 * ```
 */
export const checkForUpdates = (
  manifest: UpdateManifest,
  currentSeries: CurrentSeriesInfo[],
  currentMovies: CurrentMovieInfo[],
): UpdateCheckResult => {
  const checkedAt = new Date().toISOString()

  const newSeries: string[] = []
  const updatedSeries: UpdatedSeriesInfo[] = []
  const newMovies: string[] = []

  // --- Series comparison ---------------------------------------------------
  for (const series of currentSeries) {
    const existing = manifest.series[series.code]

    if (!existing) {
      newSeries.push(series.code)
      continue
    }

    const reasons = detectSeriesChanges(existing, series)
    if (reasons.length > 0) {
      updatedSeries.push({
        seriesCode: series.code,
        reason: reasons.join('; '),
      })
    }
  }

  // --- Movie comparison ----------------------------------------------------
  for (const movie of currentMovies) {
    const existing = manifest.movies[movie.id]

    if (!existing) {
      newMovies.push(movie.id)
    }
  }

  const hasUpdates = newSeries.length > 0 || updatedSeries.length > 0 || newMovies.length > 0
  const summary = buildSummary(newSeries, updatedSeries, newMovies)

  return {
    hasUpdates,
    newSeries,
    updatedSeries,
    newMovies,
    summary,
    checkedAt,
  }
}

// ---------------------------------------------------------------------------
// Manifest update after generation
// ---------------------------------------------------------------------------

/**
 * Produces a new manifest that reflects the current state of all series and
 * movies after a successful data generation run.
 *
 * This function is **pure** — it returns a new manifest without mutating the
 * input.
 *
 * @param manifest - The previous manifest (used to preserve the version field)
 * @param series - Current series metadata to record
 * @param movies - Current movie metadata to record
 * @returns A fresh manifest capturing the current state
 *
 * @example
 * ```typescript
 * const updated = updateManifestFromData(manifest, seriesList, movieList)
 * await saveManifest('.cache/update-manifest.json', updated)
 * ```
 */
export const updateManifestFromData = (
  manifest: UpdateManifest,
  series: CurrentSeriesInfo[],
  movies: CurrentMovieInfo[],
): UpdateManifest => {
  const now = new Date().toISOString()

  const seriesEntries: Record<string, SeriesManifestEntry> = {}
  for (const s of series) {
    const seasonDetails: Record<number, SeasonDetail> = {}
    for (const season of s.seasons) {
      seasonDetails[season.seasonNumber] = {
        episodeCount: season.episodeCount,
        lastAirDate: season.lastAirDate,
      }
    }

    seriesEntries[s.code] = {
      tmdbId: s.tmdbId,
      name: s.name,
      knownSeasons: s.seasonCount,
      knownEpisodes: s.episodeCount,
      lastUpdated: now,
      seasonDetails,
    }
  }

  const movieEntries: Record<string, MovieManifestEntry> = {}
  for (const m of movies) {
    movieEntries[m.id] = {
      tmdbId: m.tmdbId,
      title: m.title,
      releaseDate: m.releaseDate,
      lastUpdated: now,
    }
  }

  return {
    version: manifest.version,
    lastFullUpdate: now,
    lastCheckTimestamp: now,
    series: seriesEntries,
    movies: movieEntries,
  }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Type guard that validates an unknown value looks like an UpdateManifest.
 * Performs structural checks on the top-level shape only — does not deeply
 * validate every nested entry.
 */
const isValidManifest = (value: unknown): value is UpdateManifest => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const obj = value as Record<string, unknown>

  return (
    typeof obj.version === 'string' &&
    typeof obj.lastFullUpdate === 'string' &&
    typeof obj.lastCheckTimestamp === 'string' &&
    typeof obj.series === 'object' &&
    obj.series !== null &&
    typeof obj.movies === 'object' &&
    obj.movies !== null
  )
}

/**
 * Detects what changed between a manifest entry and the current TMDB data
 * for a single series. Returns an array of human-readable reason strings.
 */
const detectSeriesChanges = (
  existing: SeriesManifestEntry,
  current: CurrentSeriesInfo,
): string[] => {
  const reasons: string[] = []

  // New seasons added
  if (current.seasonCount > existing.knownSeasons) {
    const added = current.seasonCount - existing.knownSeasons
    reasons.push(
      `${String(added)} new season${added > 1 ? 's' : ''} (${String(existing.knownSeasons)} → ${String(current.seasonCount)})`,
    )
  }

  // Total episode count increased
  if (current.episodeCount > existing.knownEpisodes) {
    const added = current.episodeCount - existing.knownEpisodes
    reasons.push(
      `${String(added)} new episode${added > 1 ? 's' : ''} (${String(existing.knownEpisodes)} → ${String(current.episodeCount)})`,
    )
  }

  // Per-season episode count changes (catches mid-season additions)
  for (const season of current.seasons) {
    const existingSeason = existing.seasonDetails[season.seasonNumber]

    if (!existingSeason) {
      // Season not previously tracked — already captured by season count check above
      continue
    }

    if (season.episodeCount > existingSeason.episodeCount) {
      const added = season.episodeCount - existingSeason.episodeCount
      reasons.push(
        `season ${String(season.seasonNumber)}: ${String(added)} new episode${added > 1 ? 's' : ''} (${String(existingSeason.episodeCount)} → ${String(season.episodeCount)})`,
      )
    }

    if (season.lastAirDate !== existingSeason.lastAirDate) {
      reasons.push(
        `season ${String(season.seasonNumber)}: air date changed (${existingSeason.lastAirDate} → ${season.lastAirDate})`,
      )
    }
  }

  return reasons
}

/**
 * Builds a human-readable summary string describing what has changed.
 */
const buildSummary = (
  newSeries: string[],
  updatedSeries: UpdatedSeriesInfo[],
  newMovies: string[],
): string => {
  if (newSeries.length === 0 && updatedSeries.length === 0 && newMovies.length === 0) {
    return 'No updates detected — all content is up to date.'
  }

  const parts: string[] = []

  if (newSeries.length > 0) {
    parts.push(`${String(newSeries.length)} new series: ${newSeries.join(', ')}`)
  }

  if (updatedSeries.length > 0) {
    const details = updatedSeries.map(s => `${s.seriesCode} (${s.reason})`).join('; ')
    parts.push(`${String(updatedSeries.length)} updated series: ${details}`)
  }

  if (newMovies.length > 0) {
    const label = newMovies.length > 1 ? 'movies' : 'movie'
    parts.push(`${String(newMovies.length)} new ${label}: ${newMovies.join(', ')}`)
  }

  return `${parts.join('. ')}.`
}
