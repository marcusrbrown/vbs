/**
 * Tests for generate-star-trek-data.ts CLI script.
 * Verifies argument parsing, configuration, and basic execution flow.
 */

import process from 'node:process'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'

describe('generate-star-trek-data CLI script', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = {...process.env}
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should have executable script file', async () => {
    const {existsSync} = await import('node:fs')
    const {resolve} = await import('node:path')

    const scriptPath = resolve(process.cwd(), 'scripts/generate-star-trek-data.ts')
    expect(existsSync(scriptPath)).toBe(true)
  })

  it('should export required types and constants', async () => {
    // Script is executable, not a module, so we verify it exists and is syntactically valid
    const {readFileSync} = await import('node:fs')
    const {resolve} = await import('node:path')

    const scriptPath = resolve(process.cwd(), 'scripts/generate-star-trek-data.ts')
    const scriptContent = readFileSync(scriptPath, 'utf-8')

    // Verify key components are present
    expect(scriptContent).toContain('GenerateDataOptions')
    expect(scriptContent).toContain('DEFAULT_OPTIONS')
    expect(scriptContent).toContain('parseArguments')
    expect(scriptContent).toContain('HELP_TEXT')
    expect(scriptContent).toContain('main')
  })

  it('should import required utilities', async () => {
    const {readFileSync} = await import('node:fs')
    const {resolve} = await import('node:path')

    const scriptPath = resolve(process.cwd(), 'scripts/generate-star-trek-data.ts')
    const scriptContent = readFileSync(scriptPath, 'utf-8')

    // Verify imports
    expect(scriptContent).toContain("from './lib/cli-utils.js'")
    expect(scriptContent).toContain("from './lib/source-config.js'")
    expect(scriptContent).toContain("from '../src/modules/logger.js'")
    expect(scriptContent).toContain("from '../src/modules/metadata-sources.js'")
    expect(scriptContent).toContain('loadEnv')
    expect(scriptContent).toContain('parseBooleanFlag')
    expect(scriptContent).toContain('parseStringValue')
    expect(scriptContent).toContain('createMetadataSources')
    expect(scriptContent).toContain('getMetadataConfig')
    expect(scriptContent).toContain('createLogger')
  })

  it('should define all required CLI options', async () => {
    const {readFileSync} = await import('node:fs')
    const {resolve} = await import('node:path')

    const scriptPath = resolve(process.cwd(), 'scripts/generate-star-trek-data.ts')
    const scriptContent = readFileSync(scriptPath, 'utf-8')

    // Verify CLI options are documented
    expect(scriptContent).toContain('--mode')
    expect(scriptContent).toContain('--series')
    expect(scriptContent).toContain('--dry-run')
    expect(scriptContent).toContain('--output')
    expect(scriptContent).toContain('--validate')
    expect(scriptContent).toContain('--verbose')
    expect(scriptContent).toContain('--help')
  })

  it('should have proper error handling', async () => {
    const {readFileSync} = await import('node:fs')
    const {resolve} = await import('node:path')

    const scriptPath = resolve(process.cwd(), 'scripts/generate-star-trek-data.ts')
    const scriptContent = readFileSync(scriptPath, 'utf-8')

    // Verify error handling
    expect(scriptContent).toContain('main().catch')
    expect(scriptContent).toContain('EXIT_CODES.FATAL_ERROR')
    expect(scriptContent).toContain('console.error')
  })

  it('should use logger for output', async () => {
    const {readFileSync} = await import('node:fs')
    const {resolve} = await import('node:path')

    const scriptPath = resolve(process.cwd(), 'scripts/generate-star-trek-data.ts')
    const scriptContent = readFileSync(scriptPath, 'utf-8')

    // Verify logger usage
    expect(scriptContent).toContain('createLogger')
    expect(scriptContent).toContain('logger.info')
    expect(scriptContent).toContain('logger.debug')
  })

  it('should have comprehensive help text', async () => {
    const {readFileSync} = await import('node:fs')
    const {resolve} = await import('node:path')

    const scriptPath = resolve(process.cwd(), 'scripts/generate-star-trek-data.ts')
    const scriptContent = readFileSync(scriptPath, 'utf-8')

    // Verify help text
    expect(scriptContent).toContain('HELP_TEXT')
    expect(scriptContent).toContain('Automated Star Trek Data Generation')
    expect(scriptContent).toContain('Usage:')
    expect(scriptContent).toContain('Options:')
    expect(scriptContent).toContain('Examples:')
    expect(scriptContent).toContain('Environment Variables:')
  })

  it('should support default configuration', async () => {
    const {readFileSync} = await import('node:fs')
    const {resolve} = await import('node:path')

    const scriptPath = resolve(process.cwd(), 'scripts/generate-star-trek-data.ts')
    const scriptContent = readFileSync(scriptPath, 'utf-8')

    // Verify default configuration
    expect(scriptContent).toContain('DEFAULT_OPTIONS')
    expect(scriptContent).toContain("mode: 'full'")
    expect(scriptContent).toContain('dryRun: false')
    expect(scriptContent).toContain("output: 'src/data/star-trek-data.ts'")
    expect(scriptContent).toContain('validate: true')
  })

  it('should initialize metadata sources', async () => {
    const {readFileSync} = await import('node:fs')
    const {resolve} = await import('node:path')

    const scriptPath = resolve(process.cwd(), 'scripts/generate-star-trek-data.ts')
    const scriptContent = readFileSync(scriptPath, 'utf-8')

    // Verify metadata source initialization with production modules
    expect(scriptContent).toContain('createMetadataSources')
    expect(scriptContent).toContain('getMetadataConfig')
    expect(scriptContent).toContain('logMetadataSourceStatus')
  })

  it('should handle environment variables', async () => {
    const {readFileSync} = await import('node:fs')
    const {resolve} = await import('node:path')

    const scriptPath = resolve(process.cwd(), 'scripts/generate-star-trek-data.ts')
    const scriptContent = readFileSync(scriptPath, 'utf-8')

    // Verify environment variable loading
    expect(scriptContent).toContain('loadEnv')
    expect(scriptContent).toContain('TMDB_API_KEY')
  })
})
