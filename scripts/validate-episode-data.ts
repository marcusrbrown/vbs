/**
 * CLI script for comprehensive episode metadata validation and quality checking.
 * Validates episode data against schemas, calculates quality scores, and generates actionable reports.
 *
 * Real Metadata Enrichment:
 * Uses production metadata sources (Memory Alpha, TMDB, TrekCore, STAPI) with graceful fallback
 * to mock data when APIs are unavailable or credentials are missing. This ensures the script
 * works in both development (without API keys) and production (with full enrichment) environments.
 *
 * API Configuration:
 * - TMDB_API_KEY environment variable enables enhanced TMDB metadata
 * - Other sources use public APIs with rate limiting
 * - Missing credentials trigger automatic fallback to mock data
 *
 * Quality Scoring Tiers:
 * - Excellent: 90-100% complete
 * - Good: 75-89% complete
 * - Acceptable: 60-74% complete
 * - Poor: 30-59% complete
 * - Insufficient: <30% complete
 *
 * Usage:
 *   pnpm exec jiti scripts/validate-episode-data.ts [options]
 *
 * Options:
 *   --series <id>        Filter by series ID (e.g., 'ent', 'tng', 'tos')
 *   --season <num>       Filter by season number
 *   --format <type>      Output format: 'text' (default) or 'json'
 *   --verbose            Show detailed validation information
 *   --strict             Exit with error code if any validation issues found
 *   --min-quality <num>  Minimum acceptable quality score (0-1, default: 0.6)
 *   --help               Show this help message
 *
 * Exit Codes:
 *   0 - All validations passed
 *   1 - Validation errors found
 *   2 - Quality threshold not met
 *   3 - Invalid arguments
 *   4 - Fatal error during execution
 *
 * Examples:
 *   pnpm exec jiti scripts/validate-episode-data.ts
 *   pnpm exec jiti scripts/validate-episode-data.ts --series ent --format json
 *   pnpm exec jiti scripts/validate-episode-data.ts --strict --min-quality 0.8
 */

import type {
  Episode,
  EpisodeMetadata,
  MetadataSource,
  MetadataSourceType,
} from '../src/modules/types.js'
import process from 'node:process'
import {getProductionMetadataConfig} from '../src/data/metadata-sources-config.js'
import {starTrekData} from '../src/data/star-trek-data.js'
import {createQualityScorer} from '../src/modules/metadata-quality.js'
import {createMetadataSources} from '../src/modules/metadata-sources.js'
import {pipe} from '../src/utils/composition.js'
import {
  isValidEpisodeId,
  validateEpisodeWithReporting,
  type ValidationError,
  type ValidationWarning,
} from '../src/utils/metadata-validation.js'

type MetadataSourcesInstance = ReturnType<typeof createMetadataSources>

// CLI Configuration Types

interface CLIOptions {
  series?: string
  season?: number
  format: 'text' | 'json'
  verbose: boolean
  strict: boolean
  minQuality: number
  help: boolean
}

interface ValidationReport {
  summary: {
    totalEpisodes: number
    validEpisodes: number
    invalidEpisodes: number
    episodesWithWarnings: number
    averageQualityScore: number
    passedQualityThreshold: boolean
  }
  episodeResults: EpisodeValidationResult[]
  statistics: {
    fieldCoverage: Record<string, number>
    commonErrors: {error: string; count: number}[]
    commonWarnings: {warning: string; count: number}[]
    qualityDistribution: {
      excellent: number
      good: number
      acceptable: number
      poor: number
      insufficient: number
    }
  }
  timestamp: string
}

interface EpisodeValidationResult {
  episodeId: string
  episodeTitle: string
  season: number
  episode: number
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  qualityScore: number | null
  qualityGrade: string | null
  missingFields: string[]
  recommendations: string[]
}

// Metadata Source Configurations
// Memory Alpha is primary source with highest confidence for Star Trek canonical information
const MEMORY_ALPHA_SOURCE: MetadataSource = {
  name: 'Memory Alpha',
  type: 'memory-alpha',
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
}

// Fallback source used when external APIs are unavailable
const MOCK_FALLBACK_SOURCE: MetadataSource = {
  name: 'Mock Data',
  type: 'manual',
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
}

// Quality threshold for marking metadata as validated
const VALIDATION_CONFIDENCE_THRESHOLD = 0.7

// Enrichment status thresholds
const ENRICHMENT_COMPLETE_THRESHOLD = 0.9
const ENRICHMENT_PARTIAL_THRESHOLD = 0.5

const initializeMetadataSources = (): MetadataSourcesInstance => {
  const tmdbApiKey = process.env.TMDB_API_KEY
  const config = getProductionMetadataConfig(tmdbApiKey)
  return createMetadataSources(config)
}

const createMetadataSource = (template: MetadataSource): MetadataSource => ({
  ...template,
  lastAccessed: new Date().toISOString(),
})

// CLI Argument Parsing

function parseArguments(): CLIOptions {
  const args = process.argv.slice(2)
  const options: CLIOptions = {
    format: 'text',
    verbose: false,
    strict: false,
    minQuality: 0.6,
    help: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (!arg) {
      continue
    }

    switch (arg) {
      case '--series': {
        const seriesArg = args[++i]
        if (seriesArg) {
          options.series = seriesArg
        }
        break
      }
      case '--season': {
        const seasonArg = args[++i]
        if (seasonArg) {
          const seasonNum = Number.parseInt(seasonArg, 10)
          if (Number.isNaN(seasonNum)) {
            console.error('Error: --season must be a valid number')
            process.exit(3)
          }
          options.season = seasonNum
        }
        break
      }
      case '--format': {
        const formatArg = args[++i]
        if (formatArg && (formatArg === 'text' || formatArg === 'json')) {
          options.format = formatArg
        } else {
          console.error('Error: --format must be "text" or "json"')
          process.exit(3)
        }
        break
      }
      case '--verbose':
        options.verbose = true
        break
      case '--strict':
        options.strict = true
        break
      case '--min-quality': {
        const qualityArg = args[++i]
        if (qualityArg) {
          const minQuality = Number.parseFloat(qualityArg)
          if (Number.isNaN(minQuality) || minQuality < 0 || minQuality > 1) {
            console.error('Error: --min-quality must be a number between 0 and 1')
            process.exit(3)
          }
          options.minQuality = minQuality
        }
        break
      }
      case '--help':
        options.help = true
        break
      default:
        if (arg.startsWith('--')) {
          console.error(`Error: Unknown option "${arg}"`)
          process.exit(3)
        }
    }
  }

  return options
}

function showHelp(): void {
  console.log(`
CLI script for comprehensive episode metadata validation and quality checking.

Usage:
  tsx scripts/validate-episode-data.ts [options]

Options:
  --series <id>        Filter by series ID (e.g., 'ent', 'tng', 'tos')
  --season <num>       Filter by season number
  --format <type>      Output format: 'text' (default) or 'json'
  --verbose            Show detailed validation information
  --strict             Exit with error code if any validation issues found
  --min-quality <num>  Minimum acceptable quality score (0-1, default: 0.6)
  --help               Show this help message

Exit Codes:
  0 - All validations passed
  1 - Validation errors found
  2 - Quality threshold not met
  3 - Invalid arguments

Examples:
  tsx scripts/validate-episode-data.ts
  tsx scripts/validate-episode-data.ts --series ent --format json
  tsx scripts/validate-episode-data.ts --strict --min-quality 0.8
  `)
}

// ============================================================================
// EPISODE DATA EXTRACTION
// ============================================================================

function getAllEpisodes(): Episode[] {
  const episodes: Episode[] = []

  for (const era of starTrekData) {
    for (const item of era.items) {
      if (item.episodeData && Array.isArray(item.episodeData)) {
        episodes.push(...item.episodeData)
      }
    }
  }

  return episodes
}

function filterEpisodes(episodes: Episode[], options: CLIOptions): Episode[] {
  const {series, season} = options
  return pipe(
    episodes,
    eps => (series ? eps.filter(ep => ep.id.startsWith(series)) : eps),
    eps => (season ? eps.filter(ep => ep.season === season) : eps),
  )
}

// Validation & Quality Scoring

async function validateEpisode(
  episode: Episode,
  metadataSources: MetadataSourcesInstance,
): Promise<EpisodeValidationResult> {
  const validation = validateEpisodeWithReporting(episode)
  const qualityScorer = createQualityScorer()

  let qualityScore: number | null = null
  let qualityGrade: string | null = null
  let missingFields: string[] = []
  let recommendations: string[] = []

  let metadata: EpisodeMetadata | null = null
  let primarySource: MetadataSource

  try {
    metadata = await metadataSources.enrichEpisode(episode.id)
    primarySource = createMetadataSource(MEMORY_ALPHA_SOURCE)
  } catch {
    if (process.stderr.isTTY) {
      console.error(`Warning: Failed to enrich episode ${episode.id}, using fallback data`)
    }
    metadata = createMockMetadata(episode)
    primarySource = createMetadataSource(MOCK_FALLBACK_SOURCE)
  }

  if (metadata) {
    const scoreBreakdown = qualityScorer.calculateQualityScore(metadata, primarySource)

    if (scoreBreakdown) {
      qualityScore = scoreBreakdown.overall
      qualityGrade = scoreBreakdown.qualityGrade
      missingFields = scoreBreakdown.missingFields
      recommendations = scoreBreakdown.recommendations
    }
  }

  return {
    episodeId: episode.id,
    episodeTitle: episode.title,
    season: episode.season,
    episode: episode.episode,
    isValid: validation.isValid,
    errors: validation.errors,
    warnings: validation.warnings,
    qualityScore,
    qualityGrade,
    missingFields,
    recommendations,
  }
}

function createMockMetadata(episode: Episode): EpisodeMetadata | null {
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

function generateReport(results: EpisodeValidationResult[], options: CLIOptions): ValidationReport {
  const totalEpisodes = results.length
  const validEpisodes = results.filter(r => r.isValid).length
  const invalidEpisodes = totalEpisodes - validEpisodes
  const episodesWithWarnings = results.filter(r => r.warnings.length > 0).length

  const qualityScores = results
    .filter(r => r.qualityScore !== null)
    .map(r => r.qualityScore as number)
  const averageQualityScore =
    qualityScores.length > 0
      ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
      : 0

  const passedQualityThreshold = averageQualityScore >= options.minQuality

  const fieldCoverage: Record<string, number> = {}
  const errorMessages: Map<string, number> = new Map()
  const warningMessages: Map<string, number> = new Map()
  const qualityDistribution = {
    excellent: 0,
    good: 0,
    acceptable: 0,
    poor: 0,
    insufficient: 0,
  }

  for (const result of results) {
    for (const field of result.missingFields) {
      fieldCoverage[field] = (fieldCoverage[field] || 0) + 1
    }

    for (const error of result.errors) {
      const count = errorMessages.get(error.message) || 0
      errorMessages.set(error.message, count + 1)
    }

    for (const warning of result.warnings) {
      const count = warningMessages.get(warning.message) || 0
      warningMessages.set(warning.message, count + 1)
    }

    if (result.qualityGrade) {
      const grade = result.qualityGrade as keyof typeof qualityDistribution
      qualityDistribution[grade]++
    }
  }

  const commonErrors = Array.from(errorMessages.entries())
    .map(([error, count]) => ({error, count}))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const commonWarnings = Array.from(warningMessages.entries())
    .map(([warning, count]) => ({warning, count}))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    summary: {
      totalEpisodes,
      validEpisodes,
      invalidEpisodes,
      episodesWithWarnings,
      averageQualityScore,
      passedQualityThreshold,
    },
    episodeResults: results,
    statistics: {
      fieldCoverage,
      commonErrors,
      commonWarnings,
      qualityDistribution,
    },
    timestamp: new Date().toISOString(),
  }
}

// ============================================================================
// OUTPUT FORMATTING
// ============================================================================

function formatTextOutput(report: ValidationReport, options: CLIOptions): string {
  const lines: string[] = []

  lines.push('='.repeat(80))
  lines.push('EPISODE METADATA VALIDATION REPORT')
  lines.push('='.repeat(80))
  lines.push(`Timestamp: ${report.timestamp}`)
  lines.push('')

  lines.push('SUMMARY')
  lines.push('-'.repeat(80))
  lines.push(`Total Episodes:         ${report.summary.totalEpisodes}`)
  lines.push(`Valid Episodes:         ${report.summary.validEpisodes}`)
  lines.push(`Invalid Episodes:       ${report.summary.invalidEpisodes}`)
  lines.push(`Episodes with Warnings: ${report.summary.episodesWithWarnings}`)
  lines.push(
    `Average Quality Score:  ${report.summary.averageQualityScore.toFixed(3)} (threshold: ${options.minQuality})`,
  )
  lines.push(
    `Quality Threshold:      ${report.summary.passedQualityThreshold ? '✓ PASSED' : '✗ FAILED'}`,
  )
  lines.push('')

  lines.push('QUALITY DISTRIBUTION')
  lines.push('-'.repeat(80))
  lines.push(`Excellent:   ${report.statistics.qualityDistribution.excellent}`)
  lines.push(`Good:        ${report.statistics.qualityDistribution.good}`)
  lines.push(`Acceptable:  ${report.statistics.qualityDistribution.acceptable}`)
  lines.push(`Poor:        ${report.statistics.qualityDistribution.poor}`)
  lines.push(`Insufficient: ${report.statistics.qualityDistribution.insufficient}`)
  lines.push('')

  if (report.statistics.commonErrors.length > 0) {
    lines.push('COMMON ERRORS')
    lines.push('-'.repeat(80))
    for (const {error, count} of report.statistics.commonErrors) {
      lines.push(`[${count}x] ${error}`)
    }
    lines.push('')
  }

  if (report.statistics.commonWarnings.length > 0) {
    lines.push('COMMON WARNINGS')
    lines.push('-'.repeat(80))
    for (const {warning, count} of report.statistics.commonWarnings) {
      lines.push(`[${count}x] ${warning}`)
    }
    lines.push('')
  }

  const missingFieldsEntries = Object.entries(report.statistics.fieldCoverage)
  if (missingFieldsEntries.length > 0) {
    lines.push('FIELD COVERAGE GAPS')
    lines.push('-'.repeat(80))
    const sortedFields = missingFieldsEntries.sort((a, b) => b[1] - a[1]).slice(0, 10)
    for (const [field, count] of sortedFields) {
      lines.push(`${field}: missing in ${count} episodes`)
    }
    lines.push('')
  }

  if (options.verbose) {
    lines.push('DETAILED EPISODE RESULTS')
    lines.push('-'.repeat(80))
    for (const result of report.episodeResults) {
      lines.push(`\n${result.episodeId}: ${result.episodeTitle}`)
      lines.push(`  Valid: ${result.isValid ? '✓' : '✗'}`)
      if (result.qualityScore !== null) {
        lines.push(
          `  Quality: ${result.qualityScore.toFixed(3)} (${result.qualityGrade?.toUpperCase()})`,
        )
      }

      if (result.errors.length > 0) {
        lines.push('  Errors:')
        for (const error of result.errors) {
          lines.push(`    - [${error.field}] ${error.message}`)
        }
      }

      if (result.warnings.length > 0) {
        lines.push('  Warnings:')
        for (const warning of result.warnings) {
          lines.push(`    - [${warning.field}] ${warning.message}`)
        }
      }

      if (result.missingFields.length > 0) {
        lines.push(`  Missing Fields: ${result.missingFields.join(', ')}`)
      }

      if (result.recommendations.length > 0) {
        lines.push('  Recommendations:')
        for (const recommendation of result.recommendations) {
          lines.push(`    - ${recommendation}`)
        }
      }
    }
  }

  lines.push('')
  lines.push('='.repeat(80))

  return lines.join('\n')
}

function formatJsonOutput(report: ValidationReport): string {
  return JSON.stringify(report, null, 2)
}

// Main Execution

async function main(): Promise<void> {
  const options = parseArguments()

  if (options.help) {
    showHelp()
    process.exit(0)
  }

  console.error('Loading episode data...')
  const allEpisodes = getAllEpisodes()
  const filteredEpisodes = filterEpisodes(allEpisodes, options)

  if (filteredEpisodes.length === 0) {
    console.error('No episodes found matching the specified filters.')
    process.exit(3)
  }

  console.error('Initializing metadata sources...')
  const metadataSources = initializeMetadataSources()

  console.error(`Validating ${filteredEpisodes.length} episodes with real metadata enrichment...`)

  const results = await Promise.all(
    filteredEpisodes.map(episode => validateEpisode(episode, metadataSources)),
  )
  const report = generateReport(results, options)

  if (options.format === 'json') {
    console.log(formatJsonOutput(report))
  } else {
    console.log(formatTextOutput(report, options))
  }

  if (options.strict && report.summary.invalidEpisodes > 0) {
    process.exit(1)
  }

  if (options.strict && !report.summary.passedQualityThreshold) {
    process.exit(2)
  }

  process.exit(0)
}

// Execute main function with proper error handling
main().catch((error: Error) => {
  console.error('Fatal error:', error.message)
  process.exit(4)
})
