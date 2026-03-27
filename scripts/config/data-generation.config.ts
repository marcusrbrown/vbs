/**
 * Data Generation Configuration
 *
 * User-editable configuration for the Star Trek data generation pipeline.
 * All settings have sensible defaults. Override only what you need.
 *
 * @module data-generation.config
 */

/** Output generation mode */
export type GenerationMode = 'full' | 'incremental'

/** Export format for generated data */
export type ExportFormat = 'json' | 'csv'

/** API cache settings */
export interface CacheConfig {
  /** Whether API response caching is enabled */
  enabled: boolean
  /** Directory for cached API responses */
  directory: string
  /** Cache time-to-live in milliseconds (default: 24 hours) */
  ttlMs: number
}

/** Quality validation settings */
export interface QualityConfig {
  /** Minimum acceptable quality score (0-1) */
  minimumThreshold: number
  /** Target quality score to aim for (0-1) */
  targetThreshold: number
  /** Whether to fail the pipeline if quality is below minimum */
  failOnBelowMinimum: boolean
}

/** Data patch settings */
export interface PatchesConfig {
  /** Whether data patches are enabled */
  enabled: boolean
  /** Directory containing patch files */
  directory: string
  /** Whether to automatically apply patches during generation */
  autoApply: boolean
}

/** Data overrides settings */
export interface OverridesConfig {
  /** Whether data overrides are enabled */
  enabled: boolean
  /** Path to the overrides file */
  filePath: string
  /** Whether to automatically apply overrides during generation */
  autoApply: boolean
}

/** Export settings */
export interface ExportConfig {
  /** Default export format */
  defaultFormat: ExportFormat
  /** Default directory for exported files */
  defaultDirectory: string
  /** Whether to include full episode details in exports */
  includeEpisodeDetails: boolean
}

/** Preview settings */
export interface PreviewConfig {
  /** Maximum items to display per era in preview */
  maxItemsPerEra: number
  /** Maximum episodes to display per item in preview */
  maxEpisodesPerItem: number
  /** Whether to show generation statistics */
  showStatistics: boolean
  /** Whether to colorize terminal output */
  colorize: boolean
}

/** Update detection settings */
export interface UpdateDetectionConfig {
  /** Whether update detection is enabled */
  enabled: boolean
  /** Path to the update manifest file */
  manifestPath: string
}

/** Telemetry settings */
export interface TelemetryConfig {
  /** Whether telemetry collection is enabled */
  enabled: boolean
  /** Path for telemetry output */
  outputPath: string
}

/** Complete data generation configuration */
export interface DataGenerationConfig {
  /** Output file path for generated data */
  output: string
  /** Default generation mode */
  mode: GenerationMode
  /** Default concurrency for parallel operations */
  concurrency: number
  /** API cache settings */
  cache: CacheConfig
  /** Quality validation settings */
  quality: QualityConfig
  /** Data patch settings */
  patches: PatchesConfig
  /** Data overrides settings */
  overrides: OverridesConfig
  /** Export settings */
  export: ExportConfig
  /** Preview settings */
  preview: PreviewConfig
  /** Update detection settings */
  updateDetection: UpdateDetectionConfig
  /** Telemetry settings */
  telemetry: TelemetryConfig
}

/**
 * Default data generation configuration.
 *
 * All paths are relative to the project root.
 * Override individual settings by modifying this object.
 */
export const defaultConfig: DataGenerationConfig = {
  output: 'src/generated/viewing-guide.json',
  mode: 'full',
  concurrency: 4,
  cache: {
    enabled: true,
    directory: '.cache/api-responses',
    ttlMs: 24 * 60 * 60 * 1000, // 24 hours
  },
  quality: {
    minimumThreshold: 0.7,
    targetThreshold: 0.9,
    failOnBelowMinimum: true,
  },
  patches: {
    enabled: true,
    directory: 'scripts/data/patches',
    autoApply: true,
  },
  overrides: {
    enabled: true,
    filePath: 'scripts/data/overrides.json',
    autoApply: true,
  },
  export: {
    defaultFormat: 'json',
    defaultDirectory: 'dist/data',
    includeEpisodeDetails: true,
  },
  preview: {
    maxItemsPerEra: 10,
    maxEpisodesPerItem: 5,
    showStatistics: true,
    colorize: true,
  },
  updateDetection: {
    enabled: true,
    manifestPath: '.cache/update-manifest.json',
  },
  telemetry: {
    enabled: false,
    outputPath: '.cache/telemetry.json',
  },
}

/**
 * Active configuration export.
 *
 * Import this in pipeline scripts to access the current configuration.
 * To customize, modify the values below or use the config loader utility.
 */
export const config: DataGenerationConfig = {...defaultConfig}
