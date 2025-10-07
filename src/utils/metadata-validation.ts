/**
 * Metadata validation utilities for episode metadata enrichment system.
 * Provides type guards, validation schemas, and sanitization functions for ensuring data integrity
 * across multiple external sources (Memory Alpha, TMDB, etc.).
 *
 * Follows VBS self-explanatory code commenting guidelines and functional patterns.
 */

import type {
  Episode,
  EpisodeMetadata,
  FieldValidationInfo,
  MetadataSource,
  MetadataSourceType,
} from '../modules/types.js'

// ============================================================================
// TYPE GUARDS FOR RUNTIME VALIDATION
// ============================================================================

/**
 * Type guard to validate MetadataSourceType values.
 */
export const isValidMetadataSourceType = (value: unknown): value is MetadataSourceType => {
  const validSources: MetadataSourceType[] = [
    'memory-alpha',
    'tmdb',
    'imdb',
    'manual',
    'trekcore',
    'startrek-com',
  ]
  return typeof value === 'string' && validSources.includes(value as MetadataSourceType)
}

/**
 * Type guard to validate Episode interface with optional extended metadata fields.
 */
export const isValidEpisode = (value: unknown): value is Episode => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const episode = value as Record<string, unknown>

  // Validate required fields
  const hasRequiredFields =
    typeof episode.id === 'string' &&
    typeof episode.title === 'string' &&
    typeof episode.season === 'number' &&
    typeof episode.episode === 'number' &&
    typeof episode.airDate === 'string' &&
    typeof episode.stardate === 'string' &&
    typeof episode.synopsis === 'string' &&
    Array.isArray(episode.plotPoints) &&
    Array.isArray(episode.guestStars) &&
    Array.isArray(episode.connections)

  if (!hasRequiredFields) {
    return false
  }

  // Validate array contents
  const plotPoints = episode.plotPoints as unknown[]
  const guestStars = episode.guestStars as unknown[]

  const hasValidArrays =
    plotPoints.every((point: unknown) => typeof point === 'string') &&
    guestStars.every((star: unknown) => typeof star === 'string')

  if (!hasValidArrays) {
    return false
  }

  // Validate optional extended metadata fields
  if (episode.productionCode !== undefined && typeof episode.productionCode !== 'string') {
    return false
  }

  if (episode.director !== undefined && !Array.isArray(episode.director)) {
    return false
  }

  if (episode.director) {
    const directors = episode.director as unknown[]
    if (!directors.every((dir: unknown) => typeof dir === 'string')) {
      return false
    }
  }

  if (episode.writer !== undefined && !Array.isArray(episode.writer)) {
    return false
  }

  if (episode.writer) {
    const writers = episode.writer as unknown[]
    if (!writers.every((writer: unknown) => typeof writer === 'string')) {
      return false
    }
  }

  if (episode.memoryAlphaUrl !== undefined && typeof episode.memoryAlphaUrl !== 'string') {
    return false
  }

  if (episode.tmdbId !== undefined && typeof episode.tmdbId !== 'number') {
    return false
  }

  if (episode.imdbId !== undefined && typeof episode.imdbId !== 'string') {
    return false
  }

  return true
}

/**
 * Type guard to validate EpisodeMetadata interface.
 */
export const isValidEpisodeMetadata = (value: unknown): value is EpisodeMetadata => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const metadata = value as Record<string, unknown>

  const hasRequiredFields =
    typeof metadata.episodeId === 'string' &&
    isValidMetadataSourceType(metadata.dataSource) &&
    typeof metadata.lastUpdated === 'string' &&
    typeof metadata.isValidated === 'boolean' &&
    typeof metadata.confidenceScore === 'number' &&
    typeof metadata.version === 'string' &&
    typeof metadata.enrichmentStatus === 'string'

  if (!hasRequiredFields) {
    return false
  }

  // Validate confidence score range
  const confidenceScore = metadata.confidenceScore as number
  if (confidenceScore < 0 || confidenceScore > 1) {
    return false
  }

  // Validate enrichment status
  const validStatuses = ['pending', 'partial', 'complete', 'failed']
  if (!validStatuses.includes(metadata.enrichmentStatus as string)) {
    return false
  }

  // Validate ISO timestamp format for lastUpdated
  if (!isValidISOTimestamp(metadata.lastUpdated as string)) {
    return false
  }

  return true
}

/**
 * Type guard to validate MetadataSource interface.
 */
export const isValidMetadataSource = (value: unknown): value is MetadataSource => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const source = value as Record<string, unknown>

  const hasRequiredFields =
    typeof source.name === 'string' &&
    isValidMetadataSourceType(source.type) &&
    typeof source.baseUrl === 'string' &&
    typeof source.confidenceLevel === 'number' &&
    typeof source.lastAccessed === 'string' &&
    typeof source.isAvailable === 'boolean' &&
    source.rateLimit &&
    typeof source.rateLimit === 'object' &&
    Array.isArray(source.fields) &&
    source.reliability &&
    typeof source.reliability === 'object'

  if (!hasRequiredFields) {
    return false
  }

  // Validate confidence level range
  const confidenceLevel = source.confidenceLevel as number
  if (confidenceLevel < 0 || confidenceLevel > 1) {
    return false
  }

  // Validate rate limit configuration
  const rateLimit = source.rateLimit as Record<string, unknown>
  if (typeof rateLimit.requestsPerMinute !== 'number' || typeof rateLimit.burstLimit !== 'number') {
    return false
  }

  // Validate reliability metrics
  const reliability = source.reliability as Record<string, unknown>
  if (
    typeof reliability.uptime !== 'number' ||
    typeof reliability.accuracy !== 'number' ||
    typeof reliability.latency !== 'number'
  ) {
    return false
  }

  // Validate fields array contains only strings
  const fields = source.fields as unknown[]
  if (!fields.every((field: unknown) => typeof field === 'string')) {
    return false
  }

  return true
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validates ISO 8601 timestamp format.
 */
export const isValidISOTimestamp = (timestamp: string): boolean => {
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?$/
  if (!isoRegex.test(timestamp)) {
    return false
  }

  const date = new Date(timestamp)
  return !Number.isNaN(date.getTime())
}

/**
 * Validates episode ID format following VBS patterns (e.g., 'ent_s1_e01').
 */
export const isValidEpisodeId = (episodeId: string): boolean => {
  const episodeIdPattern = /^[a-z]+_s\d+_e\d+$/
  return episodeIdPattern.test(episodeId)
}

/**
 * Validates URL format for external metadata sources.
 */
export const isValidMetadataUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Validates IMDB ID format (e.g., 'tt0572248').
 */
export const isValidImdbId = (imdbId: string): boolean => {
  const imdbPattern = /^tt\d{7,}$/
  return imdbPattern.test(imdbId)
}

// ============================================================================
// SANITIZATION FUNCTIONS
// ============================================================================

/**
 * Sanitizes HTML content from external sources to prevent XSS attacks.
 * Basic implementation - consider using DOMPurify for production.
 */
export const sanitizeHtmlContent = (content: string): string => {
  return content
    .replaceAll(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replaceAll(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replaceAll(/javascript:/gi, '')
    .replaceAll(/on\w+\s*=/gi, '')
    .trim()
}

/**
 * Sanitizes and validates episode metadata from external sources.
 */
export const sanitizeEpisodeMetadata = (episode: Partial<Episode>): Partial<Episode> => {
  const sanitized: Partial<Episode> = {}

  // Sanitize string fields
  if (episode.title) {
    sanitized.title = sanitizeHtmlContent(episode.title)
  }

  if (episode.synopsis) {
    sanitized.synopsis = sanitizeHtmlContent(episode.synopsis)
  }

  if (episode.productionCode) {
    sanitized.productionCode = episode.productionCode.trim()
  }

  // Sanitize array fields
  if (episode.plotPoints) {
    sanitized.plotPoints = episode.plotPoints
      .map(point => sanitizeHtmlContent(point))
      .filter(point => point.length > 0)
  }

  if (episode.guestStars) {
    sanitized.guestStars = episode.guestStars
      .map(star => sanitizeHtmlContent(star))
      .filter(star => star.length > 0)
  }

  if (episode.director) {
    sanitized.director = episode.director
      .map(dir => sanitizeHtmlContent(dir))
      .filter(dir => dir.length > 0)
  }

  if (episode.writer) {
    sanitized.writer = episode.writer
      .map(writer => sanitizeHtmlContent(writer))
      .filter(writer => writer.length > 0)
  }

  // Validate and sanitize URLs
  if (episode.memoryAlphaUrl && isValidMetadataUrl(episode.memoryAlphaUrl)) {
    sanitized.memoryAlphaUrl = episode.memoryAlphaUrl
  }

  // Validate IMDB ID
  if (episode.imdbId && isValidImdbId(episode.imdbId)) {
    sanitized.imdbId = episode.imdbId
  }

  // Validate numeric fields
  if (episode.tmdbId && typeof episode.tmdbId === 'number' && episode.tmdbId > 0) {
    sanitized.tmdbId = episode.tmdbId
  }

  return sanitized
}

// ============================================================================
// VALIDATION REPORTING
// ============================================================================

/**
 * Validation result with detailed error information.
 */
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

/**
 * Detailed validation error with field-specific information.
 */
export interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning'
  source?: MetadataSourceType
}

/**
 * Validation warning for non-critical issues.
 */
export interface ValidationWarning {
  field: string
  message: string
  suggestion?: string
}

/**
 * Comprehensive validation of episode metadata with detailed reporting.
 */
export const validateEpisodeWithReporting = (episode: unknown): ValidationResult => {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  if (!isValidEpisode(episode)) {
    errors.push({
      field: 'episode',
      message: 'Episode object does not match required interface',
      severity: 'error',
    })
    return {isValid: false, errors, warnings}
  }

  const validEpisode = episode

  // Validate episode ID format
  if (!isValidEpisodeId(validEpisode.id)) {
    errors.push({
      field: 'id',
      message: 'Episode ID must follow pattern: series_s{season}_e{episode}',
      severity: 'error',
    })
  }

  // Validate air date format
  const fullDateString = `${validEpisode.airDate}T00:00:00.000Z`
  if (!isValidISOTimestamp(fullDateString)) {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/
    if (!datePattern.test(validEpisode.airDate)) {
      errors.push({
        field: 'airDate',
        message: 'Air date must be in YYYY-MM-DD format',
        severity: 'error',
      })
    }
  }

  // Check for minimum content requirements
  if (validEpisode.synopsis.length < 10) {
    warnings.push({
      field: 'synopsis',
      message: 'Synopsis is very short',
      suggestion: 'Consider enriching with more detailed plot summary',
    })
  }

  if (validEpisode.plotPoints.length === 0) {
    warnings.push({
      field: 'plotPoints',
      message: 'No plot points defined',
      suggestion: 'Add key story elements for better searchability',
    })
  }

  // Validate optional extended metadata
  if (validEpisode.memoryAlphaUrl && !isValidMetadataUrl(validEpisode.memoryAlphaUrl)) {
    errors.push({
      field: 'memoryAlphaUrl',
      message: 'Memory Alpha URL is not a valid HTTP/HTTPS URL',
      severity: 'error',
    })
  }

  if (validEpisode.imdbId && !isValidImdbId(validEpisode.imdbId)) {
    errors.push({
      field: 'imdbId',
      message: 'IMDB ID must follow pattern: tt followed by 7+ digits',
      severity: 'error',
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Creates a FieldValidationInfo object from validation results.
 */
export const createFieldValidationInfo = (
  isValid: boolean,
  source: MetadataSourceType,
  error?: string,
): FieldValidationInfo => {
  const validationInfo: FieldValidationInfo = {
    isValid,
    source,
    validatedAt: new Date().toISOString(),
  }

  if (error) {
    validationInfo.error = error
  }

  return validationInfo
}
