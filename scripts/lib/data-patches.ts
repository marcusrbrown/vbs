/**
 * Data patch system for applying quick fixes to generated Star Trek data.
 * Enables targeted corrections to episodes, seasons, movies, and eras
 * without requiring full data regeneration.
 *
 * Key capabilities:
 * - Load and validate JSON patch files (TASK-068)
 * - Apply patches to normalized era data structures
 * - Track applied/failed patches with detailed reporting
 * - Create and save patch files for reuse
 *
 * Integrates with existing normalized data types from data-quality.ts.
 */

import type {NormalizedEra, NormalizedMovieItem, NormalizedSeasonItem} from './data-quality.js'
import {mkdir, readFile, writeFile} from 'node:fs/promises'
import {dirname} from 'node:path'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Target types that a patch can be applied to. */
export type PatchTargetType = 'episode' | 'season' | 'movie' | 'era'

/** Operations that a patch can perform on a target. */
export type PatchOperation = 'update' | 'add' | 'remove'

/**
 * A single data patch that specifies a targeted fix to generated data.
 * Each patch identifies an item by type and ID, then applies an operation.
 */
export interface DataPatch {
  /** Unique patch identifier (e.g., 'patch-tng-s3e15-stardate-fix') */
  id: string
  /** Human-readable description of what this patch fixes */
  description: string
  /** The type of item to patch */
  targetType: PatchTargetType
  /** The ID of the item to patch */
  targetId: string
  /** The operation to perform */
  operation: PatchOperation
  /** Record of field names to new values (for update/add operations) */
  fields: Record<string, unknown>
  /** ISO 8601 timestamp when this patch was created */
  createdAt: string
  /** Optional author who created this patch */
  author?: string
}

/**
 * A collection of patches with file-level metadata.
 * Represents the JSON structure persisted to disk.
 */
export interface DataPatchFile {
  /** Schema version for forward compatibility (e.g., '1.0') */
  version: string
  /** Human-readable description of this patch file */
  description: string
  /** The patches contained in this file */
  patches: DataPatch[]
}

/**
 * Result of validating a single patch.
 */
export interface PatchValidationResult {
  /** Whether the patch is valid */
  valid: boolean
  /** Validation error messages (empty if valid) */
  errors: string[]
  /** Non-fatal validation warnings */
  warnings: string[]
}

/**
 * Details about a patch that failed to apply.
 */
export interface FailedPatch {
  /** ID of the patch that failed */
  patchId: string
  /** Human-readable reason for the failure */
  reason: string
}

/**
 * Summary statistics for a patch application run.
 */
export interface PatchApplicationSummary {
  /** Total number of patches processed */
  total: number
  /** Number of patches successfully applied */
  applied: number
  /** Number of patches that failed to apply */
  failed: number
  /** Number of patches skipped (e.g., invalid) */
  skipped: number
}

/**
 * Result of applying a set of patches to era data.
 */
export interface PatchApplicationResult {
  /** The modified era data after patches have been applied */
  eras: NormalizedEra[]
  /** IDs of patches that were successfully applied */
  appliedPatches: string[]
  /** Details about patches that failed to apply */
  failedPatches: FailedPatch[]
  /** Summary statistics for the patch run */
  summary: PatchApplicationSummary
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Current patch file schema version. */
const CURRENT_SCHEMA_VERSION = '1.0'

/** Valid target types for patches. */
const VALID_TARGET_TYPES: ReadonlySet<string> = new Set<PatchTargetType>([
  'episode',
  'season',
  'movie',
  'era',
])

/** Valid patch operations. */
const VALID_OPERATIONS: ReadonlySet<string> = new Set<PatchOperation>(['update', 'add', 'remove'])

/** ISO 8601 date-time pattern for basic validation. */
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validates a single data patch for correctness and completeness.
 * Checks required fields, valid enumerations, and field consistency.
 *
 * @param patch - The patch to validate
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const result = validatePatch(myPatch)
 * if (!result.valid) {
 *   console.error('Patch errors:', result.errors)
 * }
 * ```
 */
export const validatePatch = (patch: DataPatch): PatchValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  // Required string fields
  if (!patch.id || typeof patch.id !== 'string') {
    errors.push('Patch must have a non-empty string "id"')
  }

  if (!patch.description || typeof patch.description !== 'string') {
    errors.push('Patch must have a non-empty string "description"')
  }

  if (!patch.targetId || typeof patch.targetId !== 'string') {
    errors.push('Patch must have a non-empty string "targetId"')
  }

  // Enumeration fields
  if (!VALID_TARGET_TYPES.has(patch.targetType)) {
    errors.push(
      `Invalid targetType "${String(patch.targetType)}". Must be one of: ${[...VALID_TARGET_TYPES].join(', ')}`,
    )
  }

  if (!VALID_OPERATIONS.has(patch.operation)) {
    errors.push(
      `Invalid operation "${String(patch.operation)}". Must be one of: ${[...VALID_OPERATIONS].join(', ')}`,
    )
  }

  // Fields validation
  if (patch.operation === 'remove') {
    if (patch.fields && Object.keys(patch.fields).length > 0) {
      warnings.push('Remove operation has "fields" defined; they will be ignored')
    }
  } else if (
    !patch.fields ||
    typeof patch.fields !== 'object' ||
    Object.keys(patch.fields).length === 0
  ) {
    errors.push(`Operation "${patch.operation}" requires a non-empty "fields" object`)
  }

  // Timestamp validation
  if (!patch.createdAt || typeof patch.createdAt !== 'string') {
    errors.push('Patch must have a non-empty string "createdAt"')
  } else if (!ISO_DATE_PATTERN.test(patch.createdAt)) {
    errors.push(`Invalid "createdAt" timestamp: "${patch.createdAt}". Must be ISO 8601 format`)
  }

  // Optional field warnings
  if (!patch.author) {
    warnings.push('Patch has no "author" specified')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

// ============================================================================
// PATCH FILE I/O
// ============================================================================

/**
 * Type guard to check if an unknown value is a valid DataPatch shape.
 *
 * @param value - The value to check
 * @returns True if the value has the expected DataPatch shape
 */
const isDataPatchShape = (value: unknown): value is DataPatch => {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const obj = value as Record<string, unknown>
  return (
    typeof obj.id === 'string' &&
    typeof obj.description === 'string' &&
    typeof obj.targetType === 'string' &&
    typeof obj.targetId === 'string' &&
    typeof obj.operation === 'string' &&
    typeof obj.createdAt === 'string'
  )
}

/**
 * Type guard to check if an unknown value is a valid DataPatchFile shape.
 *
 * @param value - The value to check
 * @returns True if the value has the expected DataPatchFile shape
 */
const isDataPatchFileShape = (value: unknown): value is DataPatchFile => {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const obj = value as Record<string, unknown>
  return (
    typeof obj.version === 'string' &&
    typeof obj.description === 'string' &&
    Array.isArray(obj.patches)
  )
}

/**
 * Loads and validates a JSON patch file from disk.
 * Parses the file, validates structure, and returns a typed DataPatchFile.
 *
 * @param filePath - Path to the JSON patch file
 * @returns Parsed and validated patch file
 * @throws Error if the file cannot be read or has invalid structure
 *
 * @example
 * ```typescript
 * const patchFile = await loadPatchFile('./patches/stardate-fixes.json')
 * console.log(`Loaded ${patchFile.patches.length} patches`)
 * ```
 */
export const loadPatchFile = async (filePath: string): Promise<DataPatchFile> => {
  let content: string
  try {
    content = await readFile(filePath, 'utf-8')
  } catch (error) {
    throw new Error(
      `Failed to read patch file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(content) as unknown
  } catch (error) {
    throw new Error(
      `Failed to parse patch file ${filePath} as JSON: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  if (!isDataPatchFileShape(parsed)) {
    throw new Error(
      `Invalid patch file structure in ${filePath}: must contain "version", "description", and "patches" array`,
    )
  }

  // Validate each patch entry has the expected shape
  for (const [index, patch] of parsed.patches.entries()) {
    if (!isDataPatchShape(patch)) {
      throw new Error(
        `Invalid patch at index ${String(index)} in ${filePath}: missing required fields (id, description, targetType, targetId, operation, createdAt)`,
      )
    }
  }

  return parsed
}

/**
 * Creates a new DataPatchFile structure with the given patches and description.
 * Stamps the file with the current schema version.
 *
 * @param patches - Array of patches to include
 * @param description - Human-readable description of this patch file
 * @returns A new DataPatchFile ready to be saved
 *
 * @example
 * ```typescript
 * const patchFile = createPatchFile(
 *   [myPatch1, myPatch2],
 *   'Stardate corrections for TNG Season 3',
 * )
 * ```
 */
export const createPatchFile = (patches: DataPatch[], description: string): DataPatchFile => {
  return {
    version: CURRENT_SCHEMA_VERSION,
    description,
    patches,
  }
}

/**
 * Saves a DataPatchFile to disk as formatted JSON.
 * Creates parent directories if they do not exist.
 *
 * @param filePath - Path where the patch file should be saved
 * @param patchFile - The patch file to save
 * @throws Error if the file cannot be written
 *
 * @example
 * ```typescript
 * await savePatchFile('./patches/stardate-fixes.json', patchFile)
 * ```
 */
export const savePatchFile = async (filePath: string, patchFile: DataPatchFile): Promise<void> => {
  try {
    const dir = dirname(filePath)
    await mkdir(dir, {recursive: true})

    const content = `${JSON.stringify(patchFile, null, 2)}\n`
    await writeFile(filePath, content, 'utf-8')
  } catch (error) {
    throw new Error(
      `Failed to save patch file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

// ============================================================================
// PATCH APPLICATION
// ============================================================================

/**
 * Deep-clones a value using structured cloning via JSON round-trip.
 * Ensures patches do not mutate the original data.
 *
 * @param value - The value to clone
 * @returns A deep clone of the value
 */
const deepClone = <T>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T
}

/**
 * Applies field updates to a target object, returning the modified object.
 * Centralizes the unsafe cast required when updating normalized data types
 * whose fields are not all `unknown`-compatible.
 *
 * @param target - The object to update (cast internally via unknown)
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
 * Checks whether an item has a type field indicating it is a season.
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
 * Attempts to apply a single patch to an episode within the given eras.
 *
 * @param eras - The era data to search within
 * @param patch - The patch to apply
 * @returns The target episode if found, or null
 */
const applyEpisodePatch = (eras: NormalizedEra[], patch: DataPatch): boolean => {
  for (const era of eras) {
    for (const item of era.items) {
      if (isSeasonItem(item) && item.episodeData) {
        const episodeIndex = item.episodeData.findIndex(ep => ep.id === patch.targetId)
        if (episodeIndex !== -1) {
          if (patch.operation === 'update' || patch.operation === 'add') {
            // Index is guaranteed valid by findIndex check above
            item.episodeData[episodeIndex] = applyFieldUpdates(
              item.episodeData[episodeIndex]!,
              patch.fields,
            )
          } else if (patch.operation === 'remove') {
            item.episodeData.splice(episodeIndex, 1)
          }
          return true
        }
      }
    }
  }
  return false
}

/**
 * Attempts to apply a single patch to a season item within the given eras.
 *
 * @param eras - The era data to search within
 * @param patch - The patch to apply
 * @returns True if the target was found and patched
 */
const applySeasonPatch = (eras: NormalizedEra[], patch: DataPatch): boolean => {
  for (const era of eras) {
    const itemIndex = era.items.findIndex(item => item.id === patch.targetId && isSeasonItem(item))
    if (itemIndex !== -1) {
      if (patch.operation === 'update' || patch.operation === 'add') {
        // Index is guaranteed valid by findIndex check above
        era.items[itemIndex] = applyFieldUpdates(era.items[itemIndex]!, patch.fields)
      } else if (patch.operation === 'remove') {
        era.items.splice(itemIndex, 1)
      }
      return true
    }
  }
  return false
}

/**
 * Attempts to apply a single patch to a movie item within the given eras.
 *
 * @param eras - The era data to search within
 * @param patch - The patch to apply
 * @returns True if the target was found and patched
 */
const applyMoviePatch = (eras: NormalizedEra[], patch: DataPatch): boolean => {
  for (const era of eras) {
    const itemIndex = era.items.findIndex(item => item.id === patch.targetId && isMovieItem(item))
    if (itemIndex !== -1) {
      if (patch.operation === 'update' || patch.operation === 'add') {
        // Index is guaranteed valid by findIndex check above
        era.items[itemIndex] = applyFieldUpdates(era.items[itemIndex]!, patch.fields)
      } else if (patch.operation === 'remove') {
        era.items.splice(itemIndex, 1)
      }
      return true
    }
  }
  return false
}

/**
 * Attempts to apply a single patch to an era within the given eras array.
 *
 * @param eras - The era data to search within
 * @param patch - The patch to apply
 * @returns True if the target was found and patched
 */
const applyEraPatch = (eras: NormalizedEra[], patch: DataPatch): boolean => {
  const eraIndex = eras.findIndex(era => era.id === patch.targetId)
  if (eraIndex === -1) {
    return false
  }

  if (patch.operation === 'update' || patch.operation === 'add') {
    // Index is guaranteed valid by findIndex check above
    eras[eraIndex] = applyFieldUpdates(eras[eraIndex]!, patch.fields)
  } else if (patch.operation === 'remove') {
    eras.splice(eraIndex, 1)
  }

  return true
}

/**
 * Applies a set of patches to normalized era data.
 * Operates on a deep clone of the input to avoid mutation.
 * Invalid patches are skipped, and failures are reported.
 *
 * @param eras - The era data to patch (not mutated)
 * @param patches - Array of patches to apply
 * @returns Result containing modified data and application statistics
 *
 * @example
 * ```typescript
 * const result = applyPatches(eraData, patchFile.patches)
 * console.log(`Applied ${result.summary.applied}/${result.summary.total} patches`)
 * for (const failure of result.failedPatches) {
 *   console.warn(`Patch ${failure.patchId} failed: ${failure.reason}`)
 * }
 * ```
 */
export const applyPatches = (
  eras: NormalizedEra[],
  patches: DataPatch[],
): PatchApplicationResult => {
  const clonedEras = deepClone(eras)
  const appliedPatches: string[] = []
  const failedPatches: FailedPatch[] = []
  let skipped = 0
  let failed = 0

  for (const patch of patches) {
    // Validate each patch before applying
    const validation = validatePatch(patch)
    if (!validation.valid) {
      skipped++
      failedPatches.push({
        patchId: patch.id ?? 'unknown',
        reason: `Validation failed: ${validation.errors.join('; ')}`,
      })
      continue
    }

    let applied = false

    try {
      switch (patch.targetType) {
        case 'episode':
          applied = applyEpisodePatch(clonedEras, patch)
          break
        case 'season':
          applied = applySeasonPatch(clonedEras, patch)
          break
        case 'movie':
          applied = applyMoviePatch(clonedEras, patch)
          break
        case 'era':
          applied = applyEraPatch(clonedEras, patch)
          break
      }
    } catch (error) {
      failed++
      failedPatches.push({
        patchId: patch.id,
        reason: `Runtime error: ${error instanceof Error ? error.message : String(error)}`,
      })
      continue
    }

    if (applied) {
      appliedPatches.push(patch.id)
    } else {
      failed++
      failedPatches.push({
        patchId: patch.id,
        reason: `Target not found: ${patch.targetType} with id "${patch.targetId}"`,
      })
    }
  }

  return {
    eras: clonedEras,
    appliedPatches,
    failedPatches,
    summary: {
      total: patches.length,
      applied: appliedPatches.length,
      failed,
      skipped,
    },
  }
}
