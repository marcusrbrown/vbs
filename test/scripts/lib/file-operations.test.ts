/**
 * Tests for file operation utilities (atomic writes, formatting, backup).
 */

import {mkdir, readFile, rm, writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import process from 'node:process'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {
  createFileBackup,
  dryRunWrite,
  fileExists,
  formatTypeScriptCode,
  readTextFile,
  validateTypeScriptSyntax,
  writeTextFileAtomic,
} from '../../../scripts/lib/file-operations.js'

const TEST_DIR = join(process.cwd(), 'test/fixtures/file-ops-test')

describe('File Operations', () => {
  beforeEach(async () => {
    try {
      await rm(TEST_DIR, {recursive: true, force: true})
    } catch {
      // Directory doesn't exist, ignore
    }
    await mkdir(TEST_DIR, {recursive: true})
  })

  describe('readTextFile', () => {
    it('should read file contents as UTF-8', async () => {
      const filePath = join(TEST_DIR, 'test.txt')
      const content = 'Hello, World!'
      await writeFile(filePath, content, 'utf-8')

      const result = await readTextFile(filePath)
      expect(result).toBe(content)
    })

    it('should throw error for non-existent file', async () => {
      const filePath = join(TEST_DIR, 'nonexistent.txt')
      await expect(readTextFile(filePath)).rejects.toThrow('Failed to read file')
    })

    it('should handle multi-line content', async () => {
      const filePath = join(TEST_DIR, 'multiline.txt')
      const content = 'Line 1\nLine 2\nLine 3'
      await writeFile(filePath, content, 'utf-8')

      const result = await readTextFile(filePath)
      expect(result).toBe(content)
    })
  })

  describe('writeTextFileAtomic', () => {
    it('should write file atomically', async () => {
      const filePath = join(TEST_DIR, 'atomic.txt')
      const content = 'Atomic write test'

      await writeTextFileAtomic(filePath, content)

      const result = await readFile(filePath, 'utf-8')
      expect(result).toBe(content)
    })

    it('should create directories if they do not exist', async () => {
      const filePath = join(TEST_DIR, 'nested', 'deep', 'file.txt')
      const content = 'Nested file'

      await writeTextFileAtomic(filePath, content)

      const result = await readFile(filePath, 'utf-8')
      expect(result).toBe(content)
    })

    it('should create backup of existing file by default', async () => {
      const filePath = join(TEST_DIR, 'backup-test.txt')
      const originalContent = 'Original content'
      const newContent = 'New content'

      await writeFile(filePath, originalContent, 'utf-8')
      await writeTextFileAtomic(filePath, newContent)

      const backupPath = `${filePath}.backup`
      const backupExists = await fileExists(backupPath)
      expect(backupExists).toBe(true)

      const backupContent = await readFile(backupPath, 'utf-8')
      expect(backupContent).toBe(originalContent)

      const newFileContent = await readFile(filePath, 'utf-8')
      expect(newFileContent).toBe(newContent)
    })

    it('should skip backup when createBackup is false', async () => {
      const filePath = join(TEST_DIR, 'no-backup.txt')
      const originalContent = 'Original'
      const newContent = 'New'

      await writeFile(filePath, originalContent, 'utf-8')
      await writeTextFileAtomic(filePath, newContent, false)

      const backupPath = `${filePath}.backup`
      const backupExists = await fileExists(backupPath)
      expect(backupExists).toBe(false)
    })

    it('should handle write errors gracefully', async () => {
      const invalidPath = '/invalid/path/file.txt'
      await expect(writeTextFileAtomic(invalidPath, 'content')).rejects.toThrow(
        'Failed to write file',
      )
    })
  })

  describe('formatTypeScriptCode', () => {
    it('should format TypeScript code', async () => {
      const unformatted = 'const x=1;const y=2;'
      const formatted = await formatTypeScriptCode(unformatted)

      expect(formatted).toContain('const x = 1')
      expect(formatted).toContain('const y = 2')
    })

    it('should normalize line endings', async () => {
      const codeWithCRLF = 'const x = 1\r\nconst y = 2\r\n'
      const formatted = await formatTypeScriptCode(codeWithCRLF)

      expect(formatted).not.toContain('\r\n')
      expect(formatted).toContain('\n')
    })

    it('should remove trailing whitespace', async () => {
      const codeWithTrailing = 'const x = 1   \nconst y = 2   \n'
      const formatted = await formatTypeScriptCode(codeWithTrailing)

      const lines = formatted.split('\n')
      for (const line of lines) {
        if (line.length > 0) {
          expect(line).not.toMatch(/ +$/)
        }
      }
    })

    it('should ensure file ends with single newline', async () => {
      const codeWithoutNewline = 'const x = 1'
      const formatted = await formatTypeScriptCode(codeWithoutNewline)

      expect(formatted.endsWith('\n')).toBe(true)
      expect(formatted.endsWith('\n\n')).toBe(false)
    })
  })

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      const filePath = join(TEST_DIR, 'exists.txt')
      await writeFile(filePath, 'content', 'utf-8')

      const result = await fileExists(filePath)
      expect(result).toBe(true)
    })

    it('should return false for non-existent file', async () => {
      const filePath = join(TEST_DIR, 'nonexistent.txt')

      const result = await fileExists(filePath)
      expect(result).toBe(false)
    })

    it('should check for directory existence', async () => {
      const result = await fileExists(TEST_DIR)
      expect(typeof result).toBe('boolean')
    })
  })

  describe('createFileBackup', () => {
    it('should create backup with default suffix', async () => {
      const filePath = join(TEST_DIR, 'backup-test.txt')
      const content = 'Original content'
      await writeFile(filePath, content, 'utf-8')

      const backupPath = await createFileBackup(filePath)

      expect(backupPath).toBe(`${filePath}.backup`)
      const backupContent = await readFile(backupPath as string, 'utf-8')
      expect(backupContent).toBe(content)
    })

    it('should create backup with custom suffix', async () => {
      const filePath = join(TEST_DIR, 'custom-backup.txt')
      const content = 'Custom backup test'
      await writeFile(filePath, content, 'utf-8')

      const backupPath = await createFileBackup(filePath, '.old')

      expect(backupPath).toBe(`${filePath}.old`)
      const backupContent = await readFile(backupPath as string, 'utf-8')
      expect(backupContent).toBe(content)
    })

    it('should return null if original file does not exist', async () => {
      const filePath = join(TEST_DIR, 'nonexistent.txt')

      const backupPath = await createFileBackup(filePath)
      expect(backupPath).toBeNull()
    })
  })

  describe('validateTypeScriptSyntax', () => {
    it('should validate correct TypeScript syntax', () => {
      const validCode = 'const x: number = 1;\nfunction foo() { return x; }'
      expect(validateTypeScriptSyntax(validCode)).toBe(true)
    })

    it('should detect mismatched brackets', () => {
      const invalidCode = 'const obj = { a: 1, b: 2'
      expect(validateTypeScriptSyntax(invalidCode)).toBe(false)
    })

    it('should detect mismatched parentheses', () => {
      const invalidCode = 'function foo(a, b {'
      expect(validateTypeScriptSyntax(invalidCode)).toBe(false)
    })

    it('should detect mismatched square brackets', () => {
      const invalidCode = 'const arr = [1, 2, 3'
      expect(validateTypeScriptSyntax(invalidCode)).toBe(false)
    })

    it('should handle nested structures', () => {
      const validCode = 'const obj = { nested: { arr: [1, 2, 3], func: () => {} } }'
      expect(validateTypeScriptSyntax(validCode)).toBe(true)
    })

    it('should handle strings with brackets', () => {
      const validCode = 'const str = "This has { brackets } and [arrays]"'
      expect(validateTypeScriptSyntax(validCode)).toBe(true)
    })
  })

  describe('dryRunWrite', () => {
    it('should display content without writing file', async () => {
      const filePath = join(TEST_DIR, 'dry-run.txt')
      const content = 'This is a dry run'

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

      await dryRunWrite(filePath, content)

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[DRY RUN]'))
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(filePath))

      const exists = await fileExists(filePath)
      expect(exists).toBe(false)

      consoleSpy.mockRestore()
    })

    it('should show content preview', async () => {
      const filePath = join(TEST_DIR, 'preview.txt')
      const content = 'Line 1\nLine 2\nLine 3'

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

      await dryRunWrite(filePath, content)

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Line 1'))
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Line 2'))
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Line 3'))

      consoleSpy.mockRestore()
    })
  })
})
