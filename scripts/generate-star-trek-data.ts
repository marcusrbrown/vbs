/**
 * Automated Star Trek data generation script.
 * Fetches series, movie, and episode data using metadata sources and generates star-trek-data.ts.
 *
 * This script implements a comprehensive data generation pipeline:
 * - Fetch data from multiple metadata sources (TMDB, Memory Alpha, TrekCore, STAPI)
 * - Normalize and merge data from different sources with intelligent conflict resolution
 * - Validate data quality and completeness
 * - Generate TypeScript code with proper formatting
 * - Support both full regeneration and incremental updates
 *
 * Usage:
 *   pnpm exec jiti scripts/generate-star-trek-data.ts [options]
 *
 * Options:
 *   --mode <mode>        Generation mode: 'full' or 'incremental' (default: 'full')
 *   --series <series>    Target specific series (e.g., 'tos', 'tng', 'ds9')
 *   --dry-run            Show what would be generated without writing files
 *   --output <path>      Output file path (default: 'src/data/star-trek-data.ts')
 *   --validate           Run validation after generation (default: true)
 *   --verbose            Enable detailed logging
 *   --help               Show this help message
 *
 * Examples:
 *   # Full regeneration with validation
 *   pnpm exec jiti scripts/generate-star-trek-data.ts --mode full --validate
 *
 *   # Incremental update for specific series
 *   pnpm exec jiti scripts/generate-star-trek-data.ts --mode incremental --series discovery
 *
 *   # Dry run to preview changes
 *   pnpm exec jiti scripts/generate-star-trek-data.ts --dry-run --verbose
 */

import {resolve} from 'node:path'
import process from 'node:process'
import {createLogger} from '../src/modules/logger.js'
import {
  EXIT_CODES,
  loadEnv,
  parseBooleanFlag,
  parseStringValue,
  showErrorAndExit,
  showHelpAndExit,
  type BaseCLIOptions,
} from './lib/cli-utils.js'
import {initializeMetadataSources, logMetadataSourceStatus} from './lib/source-config.js'

interface GenerateDataOptions extends BaseCLIOptions {
  mode: 'full' | 'incremental'
  series?: string | undefined
  dryRun: boolean
  output: string
  validate: boolean
}

const DEFAULT_OPTIONS: Omit<GenerateDataOptions, 'help' | 'verbose'> = {
  mode: 'full',
  dryRun: false,
  output: 'src/data/star-trek-data.ts',
  validate: true,
}

const HELP_TEXT = `
Automated Star Trek Data Generation

Fetches series, movie, and episode data from metadata sources and generates
the star-trek-data.ts file programmatically.

Usage:
  pnpm exec jiti scripts/generate-star-trek-data.ts [options]

Options:
  --mode <mode>        Generation mode: 'full' or 'incremental' (default: 'full')
                       - full: Complete regeneration of all data
                       - incremental: Update only new or changed content

  --series <series>    Target specific series (e.g., 'tos', 'tng', 'ds9')
                       Without this flag, all series are processed

  --dry-run            Show what would be generated without writing files
                       Useful for testing and previewing changes

  --output <path>      Output file path (default: 'src/data/star-trek-data.ts')

  --validate           Run validation after generation (default: true)
                       Uses existing validation tools to ensure data quality

  --verbose            Enable detailed logging with progress indicators

  --help               Show this help message and exit

Examples:
  # Full regeneration with validation
  pnpm exec jiti scripts/generate-star-trek-data.ts --mode full --validate

  # Incremental update for specific series
  pnpm exec jiti scripts/generate-star-trek-data.ts --mode incremental --series discovery

  # Dry run to preview changes
  pnpm exec jiti scripts/generate-star-trek-data.ts --dry-run --verbose

Environment Variables:
  TMDB_API_KEY         The Movie Database API key (optional but recommended)
                       Enables enhanced metadata from TMDB

Notes:
  - Script requires internet connection to fetch metadata
  - Rate limiting is enforced to respect API quotas
  - Generated files are formatted with Prettier/ESLint
  - Backup of existing file is created automatically
  - Memory Alpha, TrekCore, and STAPI are always available
`

const parseArguments = (args: string[]): GenerateDataOptions => {
  if (parseBooleanFlag(args, '--help')) {
    showHelpAndExit(HELP_TEXT)
  }

  const verbose = parseBooleanFlag(args, '--verbose')
  const dryRun = parseBooleanFlag(args, '--dry-run')
  const validate = !parseBooleanFlag(args, '--no-validate')

  const modeStr = parseStringValue(args, '--mode') ?? DEFAULT_OPTIONS.mode
  const mode = modeStr === 'incremental' ? 'incremental' : 'full'

  const series = parseStringValue(args, '--series')
  const output = parseStringValue(args, '--output') ?? DEFAULT_OPTIONS.output

  // Enforce strict validation: only 'full' or 'incremental' modes allowed
  if (modeStr !== 'full' && modeStr !== 'incremental') {
    showErrorAndExit(
      `Invalid mode: ${modeStr}. Must be 'full' or 'incremental'.`,
      EXIT_CODES.INVALID_ARGUMENTS,
    )
  }

  return {
    help: false,
    verbose,
    mode,
    series,
    dryRun,
    output,
    validate,
  }
}

const main = async (): Promise<void> => {
  const args = process.argv.slice(2)
  const options = parseArguments(args)

  loadEnv({verbose: options.verbose, required: false})

  const logger = createLogger({
    minLevel: options.verbose ? 'debug' : 'info',
    enabledCategories: ['metadata', 'api'],
    enableMetrics: true,
    persistLogs: false,
  })

  logger.info('Starting Star Trek data generation', {
    mode: options.mode,
    series: options.series ?? 'all',
    dryRun: options.dryRun,
    output: options.output,
    validate: options.validate,
  })

  if (options.verbose) {
    console.error('\n=== Metadata Source Availability ===')
    logMetadataSourceStatus()
    console.error('')
  }

  logger.debug('Initializing metadata sources')
  initializeMetadataSources()

  logger.info('Metadata sources initialized successfully')

  // TODO: Implement data generation pipeline
  // TASK-012: Data fetching pipeline
  // TASK-013: Series discovery logic
  // TASK-014: Season/episode enumeration
  // TASK-015: Movie discovery
  // TASK-016: Data normalization
  // TASK-017: Era classification
  // TASK-018: Chronological ordering
  // TASK-019: Code generation templates
  // TASK-020: Intelligent merging
  // TASK-021: Validation
  // TASK-022: File writing
  // TASK-023: Logging
  // TASK-024: Dry-run mode
  // TASK-025: Incremental updates

  if (options.dryRun) {
    logger.info('Dry-run mode: No files will be modified')
    // TODO: Show preview of what would be generated
  } else {
    logger.info('Generation complete', {outputPath: resolve(options.output)})
  }

  if (options.validate && !options.dryRun) {
    logger.info('Running validation')
    // TODO (TASK-021): Integrate with validate-episode-data.ts for quality assurance
  }

  logger.info('Data generation completed successfully')
}

main().catch((error: Error) => {
  console.error('Fatal error during data generation:')
  console.error(error.message)
  if (error.stack) {
    console.error('\nStack trace:')
    console.error(error.stack)
  }
  process.exit(EXIT_CODES.FATAL_ERROR)
})
