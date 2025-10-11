/**
 * Reusable data validation utilities for episode and series data.
 * Provides validation logic that can be used across data generation and validation scripts.
 *
 * Re-exports validation functions from src/utils/metadata-validation.ts for use in scripts.
 */

export {
  createFieldValidationInfo,
  isValidEpisode,
  isValidEpisodeId,
  isValidEpisodeMetadata,
  isValidImdbId,
  isValidISOTimestamp,
  isValidMetadataSource,
  isValidMetadataSourceType,
  isValidMetadataUrl,
  sanitizeEpisodeMetadata,
  sanitizeHtmlContent,
  validateEpisodeWithReporting,
  type ValidationError,
  type ValidationResult,
  type ValidationWarning,
} from '../../src/utils/metadata-validation.js'
