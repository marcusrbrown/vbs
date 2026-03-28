/**
 * Custom data overrides system for applying manual corrections and annotations
 * to generated Star Trek data that persist across regenerations.
 *
 * Unlike the data-patches system (TASK-068) which targets quick one-off fixes,
 * overrides are designed for long-lived corrections that should survive full
 * data regeneration cycles. Each override documents why it exists, enabling
 * maintainable, auditable data corrections.
 *
 * Key capabilities:
 * - Load and save override files with JSON schema validation (TASK-070)
 * - Apply overrides to normalized era data immutably
 * - Validate individual overrides before application
 * - Merge multiple override files with deduplication
 * - Track application results with skip reasons
 *
 * Integrates with existing normalized data types from data-quality.ts.
 */

import type {NormalizedEra, NormalizedMovieItem, NormalizedSeasonItem} from './data-quality.js'
import {mkdir, readFile, writeFile} from 'node:fs/promises'
import {dirname} from 'node:path'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Target types that an override can be applied to. */
export type OverrideTargetType = 'episode' | 'season' | 'movie' | 'era'

/**
 * A single data override that specifies a persistent correction to generated data.
 * Each override identifies an item by type and ID, then merges field values.
 */
export interface DataOverride {
  /** The item ID to override (e.g., 'tng_s3_e15') */
  targetId: string
  /** The type of item to override */
  targetType: OverrideTargetType
  /** Field values to override on the target item */
  fields: Record<string, unknown>
  /** Human-readable explanation of why this override exists */
  reason: string
  /** Whether to keep this override after a full data regeneration (default: true) */
  preserveOnRegeneration: boolean
}

/**
 * A collection of overrides with file-level metadata.
 * Represents the JSON structure persisted to disk.
 */
export interface DataOverridesFile {
  /** Schema version for forward compatibility (e.g., '1.0') */
  version: string
  /** Human-readable description of this overrides file */
  description: string
  /** The overrides contained in this file */
  overrides: DataOverride[]
  /** ISO 8601 timestamp of the last successful application, or null if never applied */
  lastApplied: string | null
}

/**
 * Details about an override that was skipped during application.
 */
export interface SkippedOverride {
  /** The target ID of the override that was skipped */
  targetId: string
  /** Human-readable reason for the skip */
  reason: string
}

/**
 * Summary statistics for an override application run.
 */
export interface OverrideApplicationSummary {
  /** Total number of overrides processed */
  total: number
  /** Number of overrides successfully applied */
  applied: number
  /** Number of overrides that were skipped */
  skipped: number
}

/**
 * Result of applying a set of overrides to era data.
 */
export interface OverrideApplicationResult {
  /** The modified era data after overrides have been applied */
  eras: NormalizedEra[]
  /** Target IDs of overrides that were successfully applied */
  appliedOverrides: string[]
  /** Details about overrides that were skipped */
  skippedOverrides: SkippedOverride[]
  /** Summary statistics for the override run */
  summary: OverrideApplicationSummary
}

/**
 * Result of validating a single override.
 */
export interface OverrideValidationResult {
  /** Whether the override is valid */
  valid: boolean
  /** Validation error messages (empty if valid) */
  errors: string[]
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Current override file schema version. */
const CURRENT_SCHEMA_VERSION = '1.0'

/** Default file path for the overrides JSON file. */
export const DEFAULT_OVERRIDES_PATH = 'scripts/config/data-overrides.json'

/** Valid target types for overrides. */
const VALID_TARGET_TYPES: ReadonlySet<string> = new Set<OverrideTargetType>([
  'episode',
  'season',
  'movie',
  'era',
])

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validates a single data override for correctness and completeness.
 * Checks required fields, valid enumerations, and field consistency.
 *
 * @param override - The override to validate
 * @returns Validation result with a valid flag and any errors
 *
 * @example
 * ```typescript
 * const result = validateOverride(myOverride)
 * if (!result.valid) {
 *   console.error('Override errors:', result.errors)
 * }
 * ```
 */
export const validateOverride = (override: DataOverride): OverrideValidationResult => {
  const errors: string[] = []

  // Required string fields
  if (!override.targetId || typeof override.targetId !== 'string') {
    errors.push('Override must have a non-empty string "targetId"')
  }

  if (!override.reason || typeof override.reason !== 'string') {
    errors.push('Override must have a non-empty string "reason"')
  }

  // Enumeration field
  if (!VALID_TARGET_TYPES.has(override.targetType)) {
    errors.push(
      `Invalid targetType "${String(override.targetType)}". Must be one of: ${[...VALID_TARGET_TYPES].join(', ')}`,
    )
  }

  // Fields object validation
  if (
    !override.fields ||
    typeof override.fields !== 'object' ||
    Array.isArray(override.fields) ||
    Object.keys(override.fields).length === 0
  ) {
    errors.push('Override must have a non-empty "fields" object')
  }

  // preserveOnRegeneration must be a boolean
  if (typeof override.preserveOnRegeneration !== 'boolean') {
    errors.push('"preserveOnRegeneration" must be a boolean')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if an unknown value has the expected DataOverride shape.
 *
 * @param value - The value to check
 * @returns True if the value has the required DataOverride fields
 */
const isDataOverrideShape = (value: unknown): value is DataOverride => {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const obj = value as Record<string, unknown>
  return (
    typeof obj.targetId === 'string' &&
    typeof obj.targetType === 'string' &&
    typeof obj.reason === 'string' &&
    typeof obj.fields === 'object' &&
    obj.fields !== null &&
    !Array.isArray(obj.fields) &&
    typeof obj.preserveOnRegeneration === 'boolean'
  )
}

/**
 * Type guard to check if an unknown value has the expected DataOverridesFile shape.
 *
 * @param value - The value to check
 * @returns True if the value has the required DataOverridesFile fields
 */
const isDataOverridesFileShape = (value: unknown): value is DataOverridesFile => {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const obj = value as Record<string, unknown>
  return (
    typeof obj.version === 'string' &&
    typeof obj.description === 'string' &&
    Array.isArray(obj.overrides) &&
    (obj.lastApplied === null || typeof obj.lastApplied === 'string')
  )
}

// ============================================================================
// FILE I/O
// ============================================================================

/**
 * Loads and validates a JSON overrides file from disk.
 * Returns null if the file does not exist, rather than throwing.
 * Throws on parse errors or invalid structure.
 *
 * @param filePath - Path to the JSON overrides file
 * @returns Parsed and validated overrides file, or null if the file is not found
 * @throws Error if the file exists but cannot be parsed or has invalid structure
 *
 * @example
 * ```typescript
 * const overridesFile = await loadOverridesFile('./config/data-overrides.json')
 * if (overridesFile) {
 *   console.log(`Loaded ${overridesFile.overrides.length} overrides`)
 * }
 * ```
 */
export const loadOverridesFile = async (filePath: string): Promise<DataOverridesFile | null> => {
  let content: string
  try {
    content = await readFile(filePath, 'utf-8')
  } catch (error: unknown) {
    // Return null for file-not-found; re-throw for other I/O errors
    if (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      (error as Record<string, unknown>).code === 'ENOENT'
    ) {
      return null
    }
    throw new Error(
      `Failed to read overrides file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(content) as unknown
  } catch (error) {
    throw new Error(
      `Failed to parse overrides file ${filePath} as JSON: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  if (!isDataOverridesFileShape(parsed)) {
    throw new Error(
      `Invalid overrides file structure in ${filePath}: must contain "version", "description", "overrides" array, and "lastApplied"`,
    )
  }

  // Validate each override entry has the expected shape
  for (const [index, override] of parsed.overrides.entries()) {
    if (!isDataOverrideShape(override)) {
      throw new Error(
        `Invalid override at index ${String(index)} in ${filePath}: missing required fields (targetId, targetType, fields, reason, preserveOnRegeneration)`,
      )
    }
  }

  return parsed
}

/**
 * Saves a DataOverridesFile to disk as formatted JSON.
 * Creates parent directories if they do not exist.
 *
 * @param filePath - Path where the overrides file should be saved
 * @param overridesFile - The overrides file to save
 * @throws Error if the file cannot be written
 *
 * @example
 * ```typescript
 * await saveOverridesFile('./config/data-overrides.json', overridesFile)
 * ```
 */
export const saveOverridesFile = async (
  filePath: string,
  overridesFile: DataOverridesFile,
): Promise<void> => {
  try {
    const dir = dirname(filePath)
    await mkdir(dir, {recursive: true})

    const content = `${JSON.stringify(overridesFile, null, 2)}\n`
    await writeFile(filePath, content, 'utf-8')
  } catch (error) {
    throw new Error(
      `Failed to save overrides file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Creates a new, empty DataOverridesFile structure with the given description.
 * Stamps the file with the current schema version and a null lastApplied timestamp.
 *
 * @param description - Human-readable description of this overrides file
 * @returns A new DataOverridesFile with no overrides
 *
 * @example
 * ```typescript
 * const overridesFile = createOverridesFile('Manual corrections for TNG episode data')
 * overridesFile.overrides.push(myOverride)
 * await saveOverridesFile('./config/data-overrides.json', overridesFile)
 * ```
 */
export const createOverridesFile = (description: string): DataOverridesFile => {
  return {
    version: CURRENT_SCHEMA_VERSION,
    description,
    overrides: [],
    lastApplied: null,
  }
}

// ============================================================================
// OVERRIDE APPLICATION
// ============================================================================

/**
 * Deep-clones a value using structured cloning via JSON round-trip.
 * Ensures overrides do not mutate the original data.
 *
 * @param value - The value to clone
 * @returns A deep clone of the value
 */
const deepClone = <T>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T
}

/**
 * Applies field updates to a target object, returning the modified object.
 * Performs a shallow merge — nested objects in the target are not deep-cloned.
 * Callers must provide complete nested objects in `fields` when updating
 * nested properties (e.g., pass the full array for `director` rather than
 * attempting to patch individual entries).
 *
 * @param target - The object to update
 * @param fields - Record of field names to new values
 * @returns The updated object with fields merged in
 */
const applyFieldUpdates = <T>(target: T, fields: Record<string, unknown>): T => {
  const clone = {...(target as Record<string, unknown>)}
  for (const [key, value] of Object.entries(fields)) {
    clone[key] = value
  }
  return clone as T
}

/**
 * Checks whether an item has a type field indicating it is a season (not a movie).
 *
 * @param item - A season or movie item
 * @returns True if the item is a season
 */
const isSeasonItem = (
  item: NormalizedSeasonItem | NormalizedMovieItem,
): item is NormalizedSeasonItem => {
  return item.type !== 'movie'
}

/**
 * Checks whether an item has a type field indicating it is a movie.
 *
 * @param item - A season or movie item
 * @returns True if the item is a movie
 */
const isMovieItem = (
  item: NormalizedSeasonItem | NormalizedMovieItem,
): item is NormalizedMovieItem => {
  return item.type === 'movie'
}

/**
 * Attempts to apply a single override to an episode within the given eras.
 * Searches all eras and seasons for the matching episode ID.
 *
 * @param eras - The era data to search within (mutated in place)
 * @param override - The override to apply
 * @returns True if the target episode was found and updated
 */
const applyEpisodeOverride = (eras: NormalizedEra[], override: DataOverride): boolean => {
  for (const era of eras) {
    for (const item of era.items) {
      if (isSeasonItem(item) && item.episodeData) {
        const episodeIndex = item.episodeData.findIndex(ep => ep.id === override.targetId)
        if (episodeIndex !== -1) {
          const episode = item.episodeData[episodeIndex]!
          item.episodeData[episodeIndex] = applyFieldUpdates(episode, override.fields)
          return true
        }
      }
    }
  }
  return false
}

/**
 * Attempts to apply a single override to a season item within the given eras.
 *
 * @param eras - The era data to search within (mutated in place)
 * @param override - The override to apply
 * @returns True if the target season was found and updated
 */
const applySeasonOverride = (eras: NormalizedEra[], override: DataOverride): boolean => {
  for (const era of eras) {
    const itemIndex = era.items.findIndex(
      item => item.id === override.targetId && isSeasonItem(item),
    )
    if (itemIndex !== -1) {
      era.items[itemIndex] = applyFieldUpdates(era.items[itemIndex]!, override.fields)
      return true
    }
  }
  return false
}

/**
 * Attempts to apply a single override to a movie item within the given eras.
 *
 * @param eras - The era data to search within (mutated in place)
 * @param override - The override to apply
 * @returns True if the target movie was found and updated
 */
const applyMovieOverride = (eras: NormalizedEra[], override: DataOverride): boolean => {
  for (const era of eras) {
    const itemIndex = era.items.findIndex(
      item => item.id === override.targetId && isMovieItem(item),
    )
    if (itemIndex !== -1) {
      era.items[itemIndex] = applyFieldUpdates(era.items[itemIndex]!, override.fields)
      return true
    }
  }
  return false
}

/**
 * Attempts to apply a single override to an era within the given eras array.
 *
 * @param eras - The era data to search within (mutated in place)
 * @param override - The override to apply
 * @returns True if the target era was found and updated
 */
const applyEraOverride = (eras: NormalizedEra[], override: DataOverride): boolean => {
  const eraIndex = eras.findIndex(era => era.id === override.targetId)
  if (eraIndex === -1) {
    return false
  }

  eras[eraIndex] = applyFieldUpdates(eras[eraIndex]!, override.fields)
  return true
}

/**
 * Applies a set of overrides to normalized era data.
 * Operates on a deep clone of the input to avoid mutation.
 * Invalid overrides are skipped with documented reasons.
 *
 * @param eras - The era data to apply overrides to (not mutated)
 * @param overrides - Array of overrides to apply
 * @returns Result containing modified data and application statistics
 *
 * @example
 * ```typescript
 * const result = applyOverrides(eraData, overridesFile.overrides)
 * console.log(`Applied ${result.summary.applied}/${result.summary.total} overrides`)
 * for (const skip of result.skippedOverrides) {
 *   console.warn(`Override ${skip.targetId} skipped: ${skip.reason}`)
 * }
 * ```
 */
export const applyOverrides = (
  eras: NormalizedEra[],
  overrides: DataOverride[],
): OverrideApplicationResult => {
  const clonedEras = deepClone(eras)
  const appliedOverrides: string[] = []
  const skippedOverrides: SkippedOverride[] = []

  for (const override of overrides) {
    // Validate each override before applying
    const validation = validateOverride(override)
    if (!validation.valid) {
      skippedOverrides.push({
        targetId: override.targetId ?? 'unknown',
        reason: `Validation failed: ${validation.errors.join('; ')}`,
      })
      continue
    }

    let applied = false

    try {
      switch (override.targetType) {
        case 'episode':
          applied = applyEpisodeOverride(clonedEras, override)
          break
        case 'season':
          applied = applySeasonOverride(clonedEras, override)
          break
        case 'movie':
          applied = applyMovieOverride(clonedEras, override)
          break
        case 'era':
          applied = applyEraOverride(clonedEras, override)
          break
      }
    } catch (error) {
      skippedOverrides.push({
        targetId: override.targetId,
        reason: `Runtime error: ${error instanceof Error ? error.message : String(error)}`,
      })
      continue
    }

    if (applied) {
      appliedOverrides.push(override.targetId)
    } else {
      skippedOverrides.push({
        targetId: override.targetId,
        reason: `Target not found: ${override.targetType} with id "${override.targetId}"`,
      })
    }
  }

  return {
    eras: clonedEras,
    appliedOverrides,
    skippedOverrides,
    summary: {
      total: overrides.length,
      applied: appliedOverrides.length,
      skipped: skippedOverrides.length,
    },
  }
}

// ============================================================================
// MERGE UTILITIES
// ============================================================================

/**
 * Merges multiple override files into a single DataOverridesFile.
 * Deduplicates overrides by targetId, keeping the last occurrence when
 * multiple files contain overrides for the same target. Descriptions are
 * concatenated. The most recent lastApplied timestamp is preserved.
 *
 * @param files - Override files to merge (at least one required)
 * @returns A merged DataOverridesFile
 *
 * @example
 * ```typescript
 * const merged = mergeOverridesFiles(baseOverrides, teamOverrides, localOverrides)
 * console.log(`Merged into ${merged.overrides.length} unique overrides`)
 * ```
 */
export const mergeOverridesFiles = (...files: DataOverridesFile[]): DataOverridesFile => {
  if (files.length === 0) {
    return createOverridesFile('Empty merged overrides file')
  }

  // Deduplicate by targetId, last-write-wins
  const overrideMap = new Map<string, DataOverride>()
  for (const file of files) {
    for (const override of file.overrides) {
      overrideMap.set(override.targetId, override)
    }
  }

  // Concatenate descriptions from all files
  const descriptions = files.map(f => f.description).filter(d => d.trim().length > 0)
  const mergedDescription =
    descriptions.length > 1
      ? `Merged: ${descriptions.join(' | ')}`
      : (descriptions[0] ?? 'Merged overrides file')

  // Pick the most recent lastApplied timestamp
  let latestApplied: string | null = null
  for (const file of files) {
    if (file.lastApplied !== null && (latestApplied === null || file.lastApplied > latestApplied)) {
      latestApplied = file.lastApplied
    }
  }

  return {
    version: CURRENT_SCHEMA_VERSION,
    description: mergedDescription,
    overrides: [...overrideMap.values()],
    lastApplied: latestApplied,
  }
}
