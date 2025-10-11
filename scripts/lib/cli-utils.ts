/**
 * Common CLI utilities for argument parsing, help display, and output formatting.
 * Provides reusable patterns for building command-line tools.
 */

import {resolve} from 'node:path'
import process from 'node:process'
import {config as dotenvConfig} from 'dotenv'

/**
 * Generic CLI options interface that can be extended by specific scripts.
 */
export interface BaseCLIOptions {
  help: boolean
  verbose: boolean
}

/**
 * Exit codes for CLI scripts following UNIX conventions.
 */
export const EXIT_CODES = {
  SUCCESS: 0,
  VALIDATION_ERROR: 1,
  QUALITY_THRESHOLD_NOT_MET: 2,
  INVALID_ARGUMENTS: 3,
  FATAL_ERROR: 4,
} as const

/**
 * Loads environment variables from .env file.
 * Searches for .env file in project root and loads it using dotenv.
 * Silently continues if .env file is not found (optional configuration).
 *
 * @param options - Configuration options for dotenv
 * @param options.verbose - Log environment loading status (default: false)
 * @param options.required - Exit with error if .env file is missing (default: false)
 */
export const loadEnv = (options: {verbose?: boolean; required?: boolean} = {}): void => {
  const {verbose = false, required = false} = options

  const envPath = resolve(process.cwd(), '.env')

  if (verbose === true) {
    console.error(`Loading environment from: ${envPath}`)
  }

  const result = dotenvConfig({path: envPath})

  if (result.error != null) {
    const errorMessage = result.error.message
    const isFileNotFound =
      errorMessage.includes('ENOENT') || result.error.code === 'NOT_FOUND_DOTENV_ENVIRONMENT'

    if (isFileNotFound) {
      if (required === true) {
        console.error('Error: .env file not found and is required')
        console.error('Create .env file from .env.example:')
        console.error('  cp .env.example .env')
        process.exit(EXIT_CODES.INVALID_ARGUMENTS)
      }
      if (verbose === true) {
        console.error('Note: .env file not found, using system environment variables only')
      }
    } else {
      console.error(`Error loading .env file: ${errorMessage}`)
      if (required === true) {
        process.exit(EXIT_CODES.INVALID_ARGUMENTS)
      }
    }
  } else if (verbose === true) {
    console.error('✓ Environment variables loaded successfully')
  }
}

/**
 * Parses a boolean flag from command-line arguments.
 *
 * @param args - Command-line arguments array
 * @param flag - Flag to look for (e.g., '--verbose')
 * @returns True if flag is present, false otherwise
 */
export const parseBooleanFlag = (args: string[], flag: string): boolean => {
  return args.includes(flag)
}

/**
 * Parses a string value from command-line arguments.
 *
 * @param args - Command-line arguments array
 * @param flag - Flag to look for (e.g., '--series')
 * @returns Value following the flag, or undefined if not found
 */
export const parseStringValue = (args: string[], flag: string): string | undefined => {
  const index = args.indexOf(flag)
  if (index === -1 || index === args.length - 1) {
    return undefined
  }
  return args[index + 1]
}

/**
 * Parses a numeric value from command-line arguments.
 *
 * @param args - Command-line arguments array
 * @param flag - Flag to look for (e.g., '--season')
 * @returns Parsed number, or undefined if not found or invalid
 */
export const parseNumericValue = (args: string[], flag: string): number | undefined => {
  const value = parseStringValue(args, flag)
  if (value === undefined) {
    return undefined
  }
  const parsed = Number.parseFloat(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

/**
 * Validates that required arguments are present.
 *
 * @param options - Parsed options object
 * @param required - Array of required option keys
 * @throws Error if required options are missing
 */
export const validateRequiredOptions = <T extends Record<string, unknown>>(
  options: T,
  required: (keyof T)[],
): void => {
  const missing = required.filter(key => options[key] === undefined || options[key] === null)
  if (missing.length > 0) {
    throw new Error(`Missing required options: ${missing.join(', ')}`)
  }
}

/**
 * Displays help message and exits.
 *
 * @param helpText - Help message to display
 * @param exitCode - Exit code (default: 0)
 */
export const showHelpAndExit = (helpText: string, exitCode: number = EXIT_CODES.SUCCESS): never => {
  console.log(helpText)
  process.exit(exitCode)
}

/**
 * Displays error message and exits with error code.
 *
 * @param message - Error message to display
 * @param exitCode - Exit code (default: INVALID_ARGUMENTS)
 */
export const showErrorAndExit = (
  message: string,
  exitCode: number = EXIT_CODES.INVALID_ARGUMENTS,
): never => {
  console.error(`Error: ${message}`)
  process.exit(exitCode)
}

/**
 * Formats a report summary with dividers for console output.
 *
 * @param title - Report title
 * @param content - Report content lines
 * @returns Formatted report string
 */
export const formatReportSection = (title: string, content: string[]): string => {
  const divider = '='.repeat(80)
  return [divider, title, divider, ...content, ''].join('\n')
}

/**
 * Creates a progress indicator for long-running operations.
 *
 * @param total - Total number of items to process
 * @param itemName - Name of items being processed (e.g., 'episodes')
 * @returns Object with update and complete methods
 */
export const createProgressIndicator = (
  total: number,
  itemName: string,
): {update: (increment?: number) => void; complete: () => void} => {
  let current = 0

  return {
    update: (increment = 1): void => {
      current += increment
      const percentage = Math.round((current / total) * 100)
      if (process.stderr.isTTY === true) {
        process.stderr.write(`\rProcessing ${itemName}: ${current}/${total} (${percentage}%)`)
      }
    },
    complete: (): void => {
      if (process.stderr.isTTY === true) {
        process.stderr.write('\n')
      }
      console.error(`Completed processing ${total} ${itemName}`)
    },
  }
}

/**
 * Formats a table for console output.
 *
 * @param headers - Table column headers
 * @param rows - Table rows (array of arrays)
 * @returns Formatted table string
 */
export const formatTable = (headers: string[], rows: string[][]): string => {
  const columnWidths = headers.map((header, index) => {
    const rowValues = rows.map(row => row[index] ?? '')
    const maxRowWidth = Math.max(...rowValues.map(val => val.length))
    return Math.max(header.length, maxRowWidth)
  })

  const formatRow = (cells: string[]): string => {
    return cells
      .map((cell, index) => {
        const width = columnWidths[index] ?? 0
        return cell.padEnd(width)
      })
      .join(' | ')
  }

  const separator = columnWidths.map(width => '-'.repeat(width)).join('-+-')

  return [formatRow(headers), separator, ...rows.map(formatRow)].join('\n')
}
