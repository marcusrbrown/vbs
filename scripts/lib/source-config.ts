/**
 * Metadata source configuration and initialization helpers.
 * Provides utilities for consistent API initialization across scripts.
 */

import type {MetadataSourceConfig} from '../../src/modules/types.js'
import process from 'node:process'
import {getProductionMetadataConfig} from '../../src/data/metadata-sources-config.js'
import {createMetadataSources} from '../../src/modules/metadata-sources.js'

/**
 * Initializes metadata sources with API credentials from environment.
 * Gracefully handles missing API keys by disabling optional sources.
 *
 * @returns Configured metadata sources instance
 */
export const initializeMetadataSources = (): ReturnType<typeof createMetadataSources> => {
  const tmdbApiKey = process.env.TMDB_API_KEY
  const config = getProductionMetadataConfig(tmdbApiKey)
  return createMetadataSources(config)
}

/**
 * Loads API configuration from environment variables.
 *
 * @returns Configuration object with API keys
 */
export const loadApiConfigFromEnv = (): {tmdbApiKey?: string} => {
  const config: {tmdbApiKey?: string} = {}
  if (process.env.TMDB_API_KEY) {
    config.tmdbApiKey = process.env.TMDB_API_KEY
  }
  return config
}

/**
 * Validates that required API credentials are present.
 *
 * @param required - Array of required credential names
 * @returns Object with validation result and missing credentials
 */
export const validateApiCredentials = (
  required: string[] = [],
): {isValid: boolean; missing: string[]} => {
  const missing: string[] = []

  for (const credential of required) {
    const envVar = process.env[credential]
    if (!envVar || envVar.trim().length === 0) {
      missing.push(credential)
    }
  }

  return {
    isValid: missing.length === 0,
    missing,
  }
}

/**
 * Gets metadata source configuration with custom overrides.
 *
 * @param overrides - Partial configuration overrides
 * @returns Merged configuration
 */
export const getMetadataConfig = (
  overrides: Partial<MetadataSourceConfig> = {},
): MetadataSourceConfig => {
  const baseConfig = getProductionMetadataConfig(process.env.TMDB_API_KEY)
  return {
    ...baseConfig,
    ...overrides,
  }
}

/**
 * Checks if metadata enrichment is available based on API credentials.
 *
 * @returns Object indicating which sources are available
 */
export const checkMetadataAvailability = (): {
  tmdb: boolean
  memoryAlpha: boolean
  trekCore: boolean
  stapi: boolean
} => {
  return {
    tmdb: Boolean(process.env.TMDB_API_KEY),
    memoryAlpha: true, // Public wiki, always available
    trekCore: true, // Public site, always available
    stapi: true, // Public API, always available
  }
}

/**
 * Logs metadata source availability status to console.
 */
export const logMetadataSourceStatus = (): void => {
  const availability = checkMetadataAvailability()

  console.error('Metadata Source Status:')
  console.error(
    `  TMDB: ${availability.tmdb ? '✓ Available' : '✗ Not configured (TMDB_API_KEY missing)'}`,
  )
  console.error(`  Memory Alpha: ${availability.memoryAlpha ? '✓ Available' : '✗ Not available'}`)
  console.error(`  TrekCore: ${availability.trekCore ? '✓ Available' : '✗ Not available'}`)
  console.error(`  STAPI: ${availability.stapi ? '✓ Available' : '✗ Not available'}`)
  console.error('')
}
