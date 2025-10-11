/**
 * Shared metadata fetching and normalization utilities.
 * Provides reusable functions for enriching episode data with metadata from external sources.
 *
 * Follows VBS functional factory patterns with composition utilities for data transformation.
 */

import type {createMetadataSources} from '../../src/modules/metadata-sources.js'
import type {
  Episode,
  EpisodeMetadata,
  MetadataSource,
  MetadataSourceType,
} from '../../src/modules/types.js'
import process from 'node:process'
import {isValidEpisodeId} from '../../src/utils/metadata-validation.js'

// Confidence threshold for marking metadata as validated
const VALIDATION_CONFIDENCE_THRESHOLD = 0.7

// Enrichment status thresholds
const ENRICHMENT_COMPLETE_THRESHOLD = 0.9
const ENRICHMENT_PARTIAL_THRESHOLD = 0.5

/**
 * Creates a MetadataSource object with current timestamp.
 */
export const createMetadataSource = (template: MetadataSource): MetadataSource => ({
  ...template,
  lastAccessed: new Date().toISOString(),
})

/**
 * Creates mock metadata for episodes when external APIs are unavailable.
 * Used as fallback to ensure validation script works without API credentials.
 */
export const createMockMetadata = (episode: Episode): EpisodeMetadata | null => {
  if (!isValidEpisodeId(episode.id)) {
    return null
  }

  const fieldValidation: Record<string, {isValid: boolean; source: MetadataSourceType}> = {
    title: {isValid: Boolean(episode.title), source: 'memory-alpha'},
    airDate: {isValid: Boolean(episode.airDate), source: 'tmdb'},
    season: {isValid: episode.season > 0, source: 'memory-alpha'},
    episode: {isValid: episode.episode > 0, source: 'memory-alpha'},
    synopsis: {isValid: Boolean(episode.synopsis), source: 'memory-alpha'},
    plotPoints: {isValid: episode.plotPoints.length > 0, source: 'memory-alpha'},
    guestStars: {isValid: episode.guestStars.length > 0, source: 'memory-alpha'},
  }

  if (episode.productionCode) {
    fieldValidation.productionCode = {isValid: true, source: 'memory-alpha'}
  }
  if (episode.director) {
    fieldValidation.director = {isValid: episode.director.length > 0, source: 'tmdb'}
  }
  if (episode.writer) {
    fieldValidation.writer = {isValid: episode.writer.length > 0, source: 'tmdb'}
  }
  if (episode.tmdbId) {
    fieldValidation.tmdbId = {isValid: true, source: 'tmdb'}
  }
  if (episode.imdbId) {
    fieldValidation.imdbId = {isValid: true, source: 'imdb'}
  }
  if (episode.memoryAlphaUrl) {
    fieldValidation.memoryAlphaUrl = {isValid: true, source: 'memory-alpha'}
  }

  const validFieldCount = Object.values(fieldValidation).filter(v => v.isValid).length
  const totalFields = Object.keys(fieldValidation).length
  const confidenceScore = totalFields > 0 ? validFieldCount / totalFields : 0

  let enrichmentStatus: 'pending' | 'partial' | 'complete' | 'failed' = 'pending'
  if (confidenceScore >= ENRICHMENT_COMPLETE_THRESHOLD) {
    enrichmentStatus = 'complete'
  } else if (confidenceScore >= ENRICHMENT_PARTIAL_THRESHOLD) {
    enrichmentStatus = 'partial'
  } else if (confidenceScore === 0) {
    enrichmentStatus = 'failed'
  }

  return {
    episodeId: episode.id,
    dataSource: 'memory-alpha',
    lastUpdated: new Date().toISOString(),
    isValidated: confidenceScore >= VALIDATION_CONFIDENCE_THRESHOLD,
    confidenceScore,
    version: '1.0',
    enrichmentStatus,
    fieldValidation,
  }
}

/**
 * Enriches an episode with metadata from external sources.
 * Falls back to mock data if enrichment fails.
 *
 * @param episode - Episode to enrich with metadata
 * @param metadataSources - Metadata sources instance for fetching data
 * @returns Enriched metadata or null if enrichment completely fails
 */
export const enrichEpisodeWithFallback = async (
  episode: Episode,
  metadataSources: ReturnType<typeof createMetadataSources>,
): Promise<EpisodeMetadata | null> => {
  try {
    return await metadataSources.enrichEpisode(episode.id)
  } catch (error) {
    if (process.stderr.isTTY === true) {
      console.error(
        `Warning: Failed to enrich episode ${episode.id}, using fallback data:`,
        error instanceof Error ? error.message : String(error),
      )
    }
    return createMockMetadata(episode)
  }
}

/**
 * Predefined metadata source templates for common sources.
 */
export const METADATA_SOURCE_TEMPLATES = {
  memoryAlpha: {
    name: 'Memory Alpha',
    type: 'memory-alpha' as MetadataSourceType,
    baseUrl: 'https://memory-alpha.fandom.com',
    confidenceLevel: 0.9,
    lastAccessed: '',
    isAvailable: true,
    rateLimit: {
      requestsPerMinute: 60,
      burstLimit: 10,
    },
    fields: ['synopsis', 'plotPoints', 'productionCode', 'memoryAlphaUrl'],
    reliability: {
      uptime: 0.95,
      accuracy: 0.9,
      latency: 200,
    },
  },
  mockFallback: {
    name: 'Mock Data',
    type: 'manual' as MetadataSourceType,
    baseUrl: '',
    confidenceLevel: 0.5,
    lastAccessed: '',
    isAvailable: true,
    rateLimit: {
      requestsPerMinute: 0,
      burstLimit: 0,
    },
    fields: [],
    reliability: {
      uptime: 1,
      accuracy: 0.5,
      latency: 0,
    },
  },
} as const
