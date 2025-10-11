/**
 * Safe file reading/writing utilities and TypeScript formatting functions.
 * Provides atomic file operations and code formatting for generated files.
 */

import {mkdir, readFile, rename, writeFile} from 'node:fs/promises'
import {dirname, join} from 'node:path'

/**
 * Reads a file as UTF-8 text with error handling.
 *
 * @param filePath - Path to file to read
 * @returns File contents as string
 * @throws Error if file cannot be read
 */
export const readTextFile = async (filePath: string): Promise<string> => {
  try {
    return await readFile(filePath, 'utf-8')
  } catch (error) {
    throw new Error(
      `Failed to read file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Writes text to a file atomically with backup creation.
 * Uses atomic write pattern: write to temp file, then rename.
 *
 * @param filePath - Path to file to write
 * @param content - Content to write
 * @param createBackup - Whether to create backup of existing file (default: true)
 */
export const writeTextFileAtomic = async (
  filePath: string,
  content: string,
  createBackup = true,
): Promise<void> => {
  try {
    const dir = dirname(filePath)
    await mkdir(dir, {recursive: true})

    if (createBackup) {
      try {
        const backupPath = `${filePath}.backup`
        await readFile(filePath)
        await rename(filePath, backupPath)
      } catch {
        // File doesn't exist, no backup needed
      }
    }

    const tempPath = `${filePath}.tmp`
    await writeFile(tempPath, content, 'utf-8')

    await rename(tempPath, filePath)
  } catch (error) {
    throw new Error(
      `Failed to write file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Formats TypeScript code using Prettier (if available) or basic formatting.
 * Falls back to basic formatting if Prettier is not installed.
 *
 * @param code - TypeScript code to format
 * @returns Formatted code
 */
export const formatTypeScriptCode = async (code: string): Promise<string> => {
  try {
    // Try to use Prettier if available
    const prettier = await import('prettier')
    const formatted = await prettier.format(code, {
      parser: 'typescript',
      semi: false,
      singleQuote: true,
      trailingComma: 'all',
      printWidth: 100,
      tabWidth: 2,
      arrowParens: 'avoid',
    })
    return formatted
  } catch {
    // Prettier not available, use basic formatting
    return basicFormatTypeScript(code)
  }
}

/**
 * Basic TypeScript code formatting when Prettier is unavailable.
 * Normalizes line endings and ensures consistent spacing.
 *
 * @param code - TypeScript code to format
 * @returns Basically formatted code
 */
const basicFormatTypeScript = (code: string): string => {
  return (
    code
      // Normalize line endings
      .replaceAll('\r\n', '\n')
      // Remove trailing whitespace
      .replaceAll(/ +$/gm, '')
      // Ensure file ends with single newline
      .replace(/\n*$/, '\n')
  )
}

/**
 * Checks if a file exists and is readable.
 *
 * @param filePath - Path to file to check
 * @returns True if file exists and is readable
 */
export const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await readFile(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * Creates a backup of an existing file.
 *
 * @param filePath - Path to file to backup
 * @param backupSuffix - Suffix for backup file (default: '.backup')
 * @returns Path to backup file, or null if original doesn't exist
 */
export const createFileBackup = async (
  filePath: string,
  backupSuffix = '.backup',
): Promise<string | null> => {
  try {
    const content = await readFile(filePath)
    const backupPath = `${filePath}${backupSuffix}`
    await writeFile(backupPath, content)
    return backupPath
  } catch {
    return null
  }
}

/**
 * Ensures a directory exists, creating it if necessary.
 *
 * @param dirPath - Path to directory
 */
export const ensureDirectory = async (dirPath: string): Promise<void> => {
  await mkdir(dirPath, {recursive: true})
}

/**
 * Generates a temporary file path in the same directory as the target file.
 *
 * @param filePath - Target file path
 * @returns Temporary file path
 */
export const getTempFilePath = (filePath: string): string => {
  const dir = dirname(filePath)
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 8)
  return join(dir, `.tmp-${timestamp}-${random}`)
}

/**
 * Validates that generated code compiles by attempting to parse it.
 * Basic check - doesn't perform full TypeScript compilation.
 *
 * @param code - TypeScript code to validate
 * @returns True if code appears syntactically valid
 */
export const validateTypeScriptSyntax = (code: string): boolean => {
  try {
    // Basic syntax checks for balanced brackets
    const openBraces = (code.match(/\{/gu) ?? []).length
    const closeBraces = (code.match(/\}/gu) ?? []).length
    const openParens = (code.match(/\(/gu) ?? []).length
    const closeParens = (code.match(/\)/gu) ?? []).length
    const openBrackets = (code.match(/\[/gu) ?? []).length
    const closeBrackets = (code.match(/\]/gu) ?? []).length

    return (
      openBraces === closeBraces && openParens === closeParens && openBrackets === closeBrackets
    )
  } catch {
    return false
  }
}

/**
 * Formats JSON data with consistent spacing.
 *
 * @param data - Data to format as JSON
 * @param indent - Indentation spaces (default: 2)
 * @returns Formatted JSON string
 */
export const formatJSON = (data: unknown, indent = 2): string => {
  return JSON.stringify(data, null, indent)
}

/**
 * Options for dry-run mode.
 */
export interface DryRunOptions {
  enabled: boolean
  logPrefix?: string
}

/**
 * Executes a write operation in dry-run mode (logs instead of writing).
 *
 * @param filePath - Path to file that would be written
 * @param content - Content that would be written
 * @param options - Dry-run options
 */
export const dryRunWrite = (
  filePath: string,
  content: string,
  options: DryRunOptions = {enabled: true},
): void => {
  if (!options.enabled) {
    return
  }

  const prefix = options.logPrefix ?? '[DRY RUN]'
  const contentPreview = content.slice(0, 200)
  const truncated = content.length > 200 ? '...' : ''

  console.log(`${prefix} Would write to: ${filePath}`)
  console.log(`${prefix} Content preview:\n${contentPreview}${truncated}`)
  console.log(`${prefix} Total size: ${content.length} bytes`)
}
