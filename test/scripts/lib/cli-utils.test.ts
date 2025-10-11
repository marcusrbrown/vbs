/**
 * Tests for CLI utilities (argument parsing, help display, output formatting).
 */

import process from 'node:process'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {
  createProgressIndicator,
  EXIT_CODES,
  formatReportSection,
  formatTable,
  parseBooleanFlag,
  parseNumericValue,
  parseStringValue,
  showErrorAndExit,
  showHelpAndExit,
  validateRequiredOptions,
} from '../../../scripts/lib/cli-utils.js'

describe('CLI Utilities', () => {
  describe('parseBooleanFlag', () => {
    it('should return true when flag is present', () => {
      const args = ['--verbose', '--strict', '--help']
      expect(parseBooleanFlag(args, '--verbose')).toBe(true)
      expect(parseBooleanFlag(args, '--strict')).toBe(true)
    })

    it('should return false when flag is absent', () => {
      const args = ['--verbose', '--strict']
      expect(parseBooleanFlag(args, '--help')).toBe(false)
      expect(parseBooleanFlag(args, '--quiet')).toBe(false)
    })

    it('should handle empty arguments array', () => {
      expect(parseBooleanFlag([], '--verbose')).toBe(false)
    })
  })

  describe('parseStringValue', () => {
    it('should parse string value following flag', () => {
      const args = ['--series', 'ent', '--format', 'json']
      expect(parseStringValue(args, '--series')).toBe('ent')
      expect(parseStringValue(args, '--format')).toBe('json')
    })

    it('should return undefined when flag not found', () => {
      const args = ['--series', 'ent']
      expect(parseStringValue(args, '--format')).toBeUndefined()
    })

    it('should return undefined when flag is last argument', () => {
      const args = ['--series', 'ent', '--format']
      expect(parseStringValue(args, '--format')).toBeUndefined()
    })

    it('should handle empty arguments array', () => {
      expect(parseStringValue([], '--series')).toBeUndefined()
    })
  })

  describe('parseNumericValue', () => {
    it('should parse integer values', () => {
      const args = ['--season', '3', '--episode', '15']
      expect(parseNumericValue(args, '--season')).toBe(3)
      expect(parseNumericValue(args, '--episode')).toBe(15)
    })

    it('should parse float values', () => {
      const args = ['--min-quality', '0.75', '--threshold', '0.5']
      expect(parseNumericValue(args, '--min-quality')).toBe(0.75)
      expect(parseNumericValue(args, '--threshold')).toBe(0.5)
    })

    it('should return undefined for non-numeric values', () => {
      const args = ['--season', 'invalid']
      expect(parseNumericValue(args, '--season')).toBeUndefined()
    })

    it('should return undefined when flag not found', () => {
      const args = ['--series', 'ent']
      expect(parseNumericValue(args, '--season')).toBeUndefined()
    })

    it('should handle negative numbers', () => {
      const args = ['--offset', '-5']
      expect(parseNumericValue(args, '--offset')).toBe(-5)
    })
  })

  describe('validateRequiredOptions', () => {
    it('should not throw when all required options present', () => {
      const options = {series: 'ent', season: 3, format: 'json'}
      expect(() => validateRequiredOptions(options, ['series'])).not.toThrow()
    })

    it('should throw error for missing required options', () => {
      const options: Record<string, unknown> = {series: 'ent', format: 'json'}
      expect(() => validateRequiredOptions(options, ['series', 'season'])).toThrow(
        'Missing required options: season',
      )
    })

    it('should throw error for multiple missing options', () => {
      const options: Record<string, unknown> = {format: 'json'}
      expect(() => validateRequiredOptions(options, ['series', 'season'])).toThrow(
        'Missing required options: series, season',
      )
    })

    it('should handle undefined values as missing', () => {
      const options: Record<string, unknown> = {series: 'ent', season: undefined}
      expect(() => validateRequiredOptions(options, ['series', 'season'])).toThrow(
        'Missing required options: season',
      )
    })

    it('should handle null values as missing', () => {
      const options: Record<string, unknown> = {series: 'ent', season: null}
      expect(() => validateRequiredOptions(options, ['series', 'season'])).toThrow(
        'Missing required options: season',
      )
    })

    it('should handle empty required array', () => {
      const options = {series: 'ent'}
      expect(() => validateRequiredOptions(options, [])).not.toThrow()
    })
  })

  describe('showHelpAndExit', () => {
    let processExitSpy: unknown
    let consoleLogSpy: unknown

    beforeEach(() => {
      processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    })

    it('should display help text and exit with code 0', () => {
      const helpText = 'Usage: script [options]'
      showHelpAndExit(helpText)

      expect(consoleLogSpy).toHaveBeenCalledWith(helpText)
      expect(processExitSpy).toHaveBeenCalledWith(EXIT_CODES.SUCCESS)
    })

    it('should support custom exit code', () => {
      const helpText = 'Usage: script [options]'
      showHelpAndExit(helpText, EXIT_CODES.INVALID_ARGUMENTS)

      expect(consoleLogSpy).toHaveBeenCalledWith(helpText)
      expect(processExitSpy).toHaveBeenCalledWith(EXIT_CODES.INVALID_ARGUMENTS)
    })
  })

  describe('showErrorAndExit', () => {
    let processExitSpy: unknown
    let consoleErrorSpy: unknown

    beforeEach(() => {
      processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    })

    it('should display error message and exit with INVALID_ARGUMENTS', () => {
      const message = 'Invalid option: --unknown'
      showErrorAndExit(message)

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error: Invalid option: --unknown')
      expect(processExitSpy).toHaveBeenCalledWith(EXIT_CODES.INVALID_ARGUMENTS)
    })

    it('should support custom exit code', () => {
      const message = 'Fatal error occurred'
      showErrorAndExit(message, EXIT_CODES.FATAL_ERROR)

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error: Fatal error occurred')
      expect(processExitSpy).toHaveBeenCalledWith(EXIT_CODES.FATAL_ERROR)
    })
  })

  describe('formatReportSection', () => {
    it('should format section with title and content', () => {
      const title = 'SUMMARY'
      const content = ['Total: 100', 'Valid: 95', 'Invalid: 5']
      const result = formatReportSection(title, content)

      expect(result).toContain('='.repeat(80))
      expect(result).toContain(title)
      expect(result).toContain('Total: 100')
      expect(result).toContain('Valid: 95')
      expect(result).toContain('Invalid: 5')
    })

    it('should handle empty content array', () => {
      const result = formatReportSection('EMPTY', [])
      expect(result).toContain('EMPTY')
      expect(result).toContain('='.repeat(80))
    })
  })

  describe('formatTable', () => {
    it('should format table with headers and rows', () => {
      const headers = ['Name', 'Season', 'Episodes']
      const rows = [
        ['Enterprise', '1', '26'],
        ['The Original Series', '1', '29'],
      ]
      const result = formatTable(headers, rows)

      expect(result).toContain('Name')
      expect(result).toContain('Season')
      expect(result).toContain('Episodes')
      expect(result).toContain('Enterprise')
      expect(result).toContain('The Original Series')
      expect(result).toContain('|')
      expect(result).toContain('-')
    })

    it('should align columns properly', () => {
      const headers = ['ID', 'Title']
      const rows = [
        ['1', 'Short'],
        ['12345', 'Very Long Title Here'],
      ]
      const result = formatTable(headers, rows)

      const lines = result.split('\n')
      expect(lines.length).toBeGreaterThan(2)
      // All data rows should have consistent width
      const dataLines = lines.slice(2)
      const widths = dataLines.map(line => line.length)
      const firstWidth = widths[0]
      for (const width of widths) {
        expect(width).toBe(firstWidth)
      }
    })

    it('should handle empty rows', () => {
      const headers = ['Column1', 'Column2']
      const result = formatTable(headers, [])

      expect(result).toContain('Column1')
      expect(result).toContain('Column2')
    })
  })

  describe('createProgressIndicator', () => {
    it('should create progress indicator', () => {
      const progress = createProgressIndicator(100, 'episodes')
      expect(progress).toHaveProperty('update')
      expect(progress).toHaveProperty('complete')
    })

    it('should call update without errors', () => {
      const progress = createProgressIndicator(100, 'episodes')
      expect(() => progress.update(25)).not.toThrow()
    })

    it('should call complete without errors', () => {
      const progress = createProgressIndicator(10, 'items')
      expect(() => progress.complete()).not.toThrow()
    })
  })

  describe('EXIT_CODES', () => {
    it('should provide standard exit codes', () => {
      expect(EXIT_CODES.SUCCESS).toBe(0)
      expect(EXIT_CODES.VALIDATION_ERROR).toBe(1)
      expect(EXIT_CODES.QUALITY_THRESHOLD_NOT_MET).toBe(2)
      expect(EXIT_CODES.INVALID_ARGUMENTS).toBe(3)
      expect(EXIT_CODES.FATAL_ERROR).toBe(4)
    })
  })

  describe('loadEnv', () => {
    let originalEnv: NodeJS.ProcessEnv

    beforeEach(() => {
      originalEnv = {...process.env}
    })

    afterEach(() => {
      process.env = originalEnv
      vi.restoreAllMocks()
    })

    it('should load environment variables without error when .env exists', async () => {
      const {loadEnv} = await import('../../../scripts/lib/cli-utils.js')
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
      loadEnv()
      expect(exitSpy).not.toHaveBeenCalled()
      exitSpy.mockRestore()
    })

    it('should log success message in verbose mode', async () => {
      const {loadEnv} = await import('../../../scripts/lib/cli-utils.js')
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      loadEnv({verbose: true})
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Loading environment'))
      errorSpy.mockRestore()
    })

    it('should handle default options correctly', async () => {
      const {loadEnv} = await import('../../../scripts/lib/cli-utils.js')
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
      loadEnv()
      expect(exitSpy).not.toHaveBeenCalled()
      exitSpy.mockRestore()
    })
  })
})
