/**
 * Configuration Loader Utility
 *
 * Loads, validates, and merges data generation configuration.
 * Uses functional style with no classes. All functions are pure
 * where possible.
 *
 * @module config-loader
 */

import {resolve} from 'node:path'
import process from 'node:process'
import {
  defaultConfig,
  type CacheConfig,
  type DataGenerationConfig,
  type ExportConfig,
  type OverridesConfig,
  type PatchesConfig,
  type PreviewConfig,
  type QualityConfig,
  type TelemetryConfig,
  type UpdateDetectionConfig,
} from '../config/data-generation.config.js'

/** Validation result from config validation */
export interface ValidationResult {
  /** Whether the configuration is valid */
  valid: boolean
  /** List of validation error messages */
  errors: string[]
}

/** Deep partial type for nested config objects */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/**
 * Returns the default data generation configuration.
 *
 * @returns A fresh copy of the default configuration
 */
export const getDefaultConfig = (): DataGenerationConfig => structuredClone(defaultConfig)

/**
 * Performs a deep merge of a partial configuration with the defaults.
 *
 * Nested objects are merged recursively. Primitive values from the
 * partial config override defaults. Missing keys fall back to defaults.
 *
 * @param partial - Partial configuration to merge with defaults
 * @returns Complete configuration with all values populated
 */
export const mergeWithDefaults = (
  partial: DeepPartial<DataGenerationConfig>,
): DataGenerationConfig => {
  const base = getDefaultConfig()

  return {
    output: partial.output ?? base.output,
    mode: partial.mode ?? base.mode,
    concurrency: partial.concurrency ?? base.concurrency,
    cache: mergeSection<CacheConfig>(base.cache, partial.cache),
    quality: mergeSection<QualityConfig>(base.quality, partial.quality),
    patches: mergeSection<PatchesConfig>(base.patches, partial.patches),
    overrides: mergeSection<OverridesConfig>(base.overrides, partial.overrides),
    export: mergeSection<ExportConfig>(base.export, partial.export),
    preview: mergeSection<PreviewConfig>(base.preview, partial.preview),
    updateDetection: mergeSection<UpdateDetectionConfig>(
      base.updateDetection,
      partial.updateDetection,
    ),
    telemetry: mergeSection<TelemetryConfig>(base.telemetry, partial.telemetry),
  }
}

/**
 * Merges a single config section with its defaults.
 *
 * @param base - Default section values
 * @param partial - Partial overrides for the section
 * @returns Merged section with all values populated
 */
const mergeSection = <T extends object>(base: T, partial: Partial<T> | undefined): T => {
  if (partial === undefined) {
    return {...base}
  }
  return {...base, ...partial}
}

/**
 * Validates a complete data generation configuration.
 *
 * Checks that all values are within acceptable ranges and that
 * required paths are non-empty strings.
 *
 * @param config - Configuration to validate
 * @returns Validation result with any error messages
 */
export const validateConfig = (config: DataGenerationConfig): ValidationResult => {
  const errors: string[] = []

  // Validate top-level fields
  if (typeof config.output !== 'string' || config.output.trim() === '') {
    errors.push('output must be a non-empty string')
  }

  if (config.mode !== 'full' && config.mode !== 'incremental') {
    errors.push('mode must be "full" or "incremental"')
  }

  if (typeof config.concurrency !== 'number' || config.concurrency < 1 || config.concurrency > 32) {
    errors.push('concurrency must be a number between 1 and 32')
  }

  // Validate cache section
  if (typeof config.cache.directory !== 'string' || config.cache.directory.trim() === '') {
    errors.push('cache.directory must be a non-empty string')
  }

  if (typeof config.cache.ttlMs !== 'number' || config.cache.ttlMs < 0) {
    errors.push('cache.ttlMs must be a non-negative number')
  }

  // Validate quality section
  if (
    typeof config.quality.minimumThreshold !== 'number' ||
    config.quality.minimumThreshold < 0 ||
    config.quality.minimumThreshold > 1
  ) {
    errors.push('quality.minimumThreshold must be a number between 0 and 1')
  }

  if (
    typeof config.quality.targetThreshold !== 'number' ||
    config.quality.targetThreshold < 0 ||
    config.quality.targetThreshold > 1
  ) {
    errors.push('quality.targetThreshold must be a number between 0 and 1')
  }

  if (config.quality.minimumThreshold > config.quality.targetThreshold) {
    errors.push('quality.minimumThreshold must not exceed quality.targetThreshold')
  }

  // Validate patches section
  if (typeof config.patches.directory !== 'string' || config.patches.directory.trim() === '') {
    errors.push('patches.directory must be a non-empty string')
  }

  // Validate overrides section
  if (typeof config.overrides.filePath !== 'string' || config.overrides.filePath.trim() === '') {
    errors.push('overrides.filePath must be a non-empty string')
  }

  // Validate export section
  if (config.export.defaultFormat !== 'json' && config.export.defaultFormat !== 'csv') {
    errors.push('export.defaultFormat must be "json" or "csv"')
  }

  if (
    typeof config.export.defaultDirectory !== 'string' ||
    config.export.defaultDirectory.trim() === ''
  ) {
    errors.push('export.defaultDirectory must be a non-empty string')
  }

  // Validate preview section
  if (typeof config.preview.maxItemsPerEra !== 'number' || config.preview.maxItemsPerEra < 1) {
    errors.push('preview.maxItemsPerEra must be a positive number')
  }

  if (
    typeof config.preview.maxEpisodesPerItem !== 'number' ||
    config.preview.maxEpisodesPerItem < 1
  ) {
    errors.push('preview.maxEpisodesPerItem must be a positive number')
  }

  // Validate update detection section
  if (
    typeof config.updateDetection.manifestPath !== 'string' ||
    config.updateDetection.manifestPath.trim() === ''
  ) {
    errors.push('updateDetection.manifestPath must be a non-empty string')
  }

  // Validate telemetry section
  if (
    typeof config.telemetry.outputPath !== 'string' ||
    config.telemetry.outputPath.trim() === ''
  ) {
    errors.push('telemetry.outputPath must be a non-empty string')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Default config file path relative to project root.
 */
const DEFAULT_CONFIG_PATH = 'scripts/config/data-generation.config.ts'

/**
 * Loads the data generation configuration from a TypeScript file.
 *
 * The loader will:
 * 1. Attempt to dynamically import the config file at the given path
 * 2. Fall back to default configuration if the file is not found
 * 3. Deep-merge the imported config with defaults (so partial configs work)
 * 4. Validate the merged configuration
 *
 * @param configPath - Optional path to the config file (absolute or relative to cwd)
 * @returns The loaded and validated configuration
 * @throws When the loaded configuration fails validation
 */
export const loadConfig = async (configPath?: string): Promise<DataGenerationConfig> => {
  const resolvedPath = resolve(process.cwd(), configPath ?? DEFAULT_CONFIG_PATH)

  let importedConfig: DeepPartial<DataGenerationConfig> = {}

  try {
    const module: unknown = await import(resolvedPath)

    if (isConfigModule(module)) {
      importedConfig = (module.config ??
        module.defaultConfig ??
        {}) as DeepPartial<DataGenerationConfig>
    }
  } catch (error: unknown) {
    const isNotFound =
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      (error as Record<string, unknown>).code === 'ERR_MODULE_NOT_FOUND'

    if (!isNotFound) {
      throw new Error(
        `Failed to load config from ${resolvedPath}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
    // File not found — fall back to defaults silently
  }

  const merged = mergeWithDefaults(importedConfig)
  const validation = validateConfig(merged)

  if (!validation.valid) {
    throw new Error(`Invalid configuration:\n${validation.errors.map(e => `  - ${e}`).join('\n')}`)
  }

  return merged
}

/**
 * Type guard to check if an imported module has a config export.
 *
 * @param module - The dynamically imported module
 * @returns Whether the module contains a recognized config export
 */
const isConfigModule = (
  module: unknown,
): module is {config?: Record<string, unknown>; defaultConfig?: Record<string, unknown>} => {
  if (module === null || typeof module !== 'object') {
    return false
  }
  const mod = module as Record<string, unknown>
  return (
    ('config' in mod && typeof mod.config === 'object') ||
    ('defaultConfig' in mod && typeof mod.defaultConfig === 'object')
  )
}
