/**
 * Tests for TypeScript code generation utilities.
 */

import {describe, expect, it} from 'vitest'
import {
  generateArrayLiteral,
  generateEpisodeCode,
  generateImports,
  generateJSDoc,
  generateModule,
  generateObjectLiteral,
  generateStringLiteral,
  generateTypeAnnotation,
} from '../../../scripts/lib/code-generation.js'

describe('Code Generation', () => {
  describe('generateStringLiteral', () => {
    it('should generate simple string literal', () => {
      const result = generateStringLiteral('hello')
      expect(result).toBe("'hello'")
    })

    it('should escape single quotes', () => {
      const result = generateStringLiteral("it's")
      expect(result).toBe(String.raw`'it\'s'`)
    })

    it('should escape backslashes', () => {
      const result = generateStringLiteral(String.raw`path\to\file`)
      expect(result).toBe(String.raw`'path\\to\\file'`)
    })

    it('should escape newlines', () => {
      const result = generateStringLiteral('line1\nline2')
      expect(result).toBe(String.raw`'line1\nline2'`)
    })

    it('should handle mixed special characters', () => {
      const input = `It's a path: C:\\Users\nNext line`
      const result = generateStringLiteral(input)
      expect(result).toContain(String.raw`\'`)
      expect(result).toContain(String.raw`\\`)
      expect(result).toContain(String.raw`\n`)
    })
  })

  describe('generateArrayLiteral', () => {
    it('should generate empty array', () => {
      const result = generateArrayLiteral([])
      expect(result).toBe('[]')
    })

    it('should generate inline array for short arrays', () => {
      const result = generateArrayLiteral([1, 2, 3])
      expect(result).toBe('[1, 2, 3]')
    })

    it('should generate multiline array for long arrays', () => {
      const result = generateArrayLiteral([1, 2, 3, 4, 5])
      expect(result).toContain('[\n')
      expect(result).toContain(',\n]')
    })

    it('should handle string items', () => {
      const result = generateArrayLiteral(['a', 'b', 'c'])
      expect(result).toContain("'a'")
      expect(result).toContain("'b'")
      expect(result).toContain("'c'")
    })

    it('should handle forced inline formatting', () => {
      const result = generateArrayLiteral([1, 2, 3, 4, 5], true)
      expect(result).not.toContain('\n')
    })

    it('should handle forced multiline formatting', () => {
      const result = generateArrayLiteral([1, 2], false)
      expect(result).toContain('[\n')
    })
  })

  describe('generateObjectLiteral', () => {
    it('should generate empty object', () => {
      const result = generateObjectLiteral({})
      expect(result).toBe('{}')
    })

    it('should generate simple object', () => {
      const result = generateObjectLiteral({name: 'test', value: 42})
      expect(result).toContain('name:')
      expect(result).toContain("'test'")
      expect(result).toContain('value:')
      expect(result).toContain('42')
    })

    it('should handle nested objects', () => {
      const result = generateObjectLiteral({outer: {inner: 'value'}})
      expect(result).toContain('outer:')
      expect(result).toContain('inner:')
      expect(result).toContain("'value'")
    })

    it('should handle mixed types', () => {
      const result = generateObjectLiteral({
        str: 'string',
        num: 123,
        bool: true,
        arr: [1, 2, 3],
      })
      expect(result).toContain("str: 'string'")
      expect(result).toContain('num: 123')
      expect(result).toContain('bool: true')
      expect(result).toContain('arr: [1, 2, 3]')
    })

    it('should respect indentation', () => {
      const result = generateObjectLiteral({a: 1}, 2)
      const lines = result.split('\n')
      expect(lines[1]).toMatch(/^\s{6}a:/)
    })
  })

  describe('generateTypeAnnotation', () => {
    it('should generate string type', () => {
      expect(generateTypeAnnotation('hello')).toBe('string')
    })

    it('should generate number type', () => {
      expect(generateTypeAnnotation(42)).toBe('number')
    })

    it('should generate boolean type', () => {
      expect(generateTypeAnnotation(true)).toBe('boolean')
    })

    it('should generate null type', () => {
      expect(generateTypeAnnotation(null)).toBe('null')
    })

    it('should generate undefined type', () => {
      expect(generateTypeAnnotation(undefined)).toBe('undefined')
    })

    it('should generate array type', () => {
      expect(generateTypeAnnotation([1, 2, 3])).toBe('unknown[]')
    })

    it('should generate object type', () => {
      expect(generateTypeAnnotation({a: 1})).toBe('Record<string, unknown>')
    })
  })

  describe('generateImports', () => {
    it('should generate single import', () => {
      const imports = {'./module.js': ['Type']}
      const result = generateImports(imports)
      expect(result).toBe("import type {Type} from './module.js'")
    })

    it('should generate multiple imports from same module', () => {
      const imports = {'./types.js': ['TypeA', 'TypeB', 'TypeC']}
      const result = generateImports(imports)
      expect(result).toContain('import type {')
      expect(result).toContain('TypeA')
      expect(result).toContain('TypeB')
      expect(result).toContain('TypeC')
      expect(result).toContain("from './types.js'")
    })

    it('should sort import specifiers alphabetically', () => {
      const imports = {'./types.js': ['Zebra', 'Apple', 'Banana']}
      const result = generateImports(imports)
      const appleIndex = result.indexOf('Apple')
      const bananaIndex = result.indexOf('Banana')
      const zebraIndex = result.indexOf('Zebra')
      expect(appleIndex).toBeLessThan(bananaIndex)
      expect(bananaIndex).toBeLessThan(zebraIndex)
    })

    it('should handle multiple modules', () => {
      const imports = {
        './types.js': ['TypeA'],
        './utils.js': ['UtilB'],
      }
      const result = generateImports(imports)
      expect(result).toContain("from './types.js'")
      expect(result).toContain("from './utils.js'")
    })

    it('should handle empty import specifiers', () => {
      const imports = {'./module.js': []}
      const result = generateImports(imports)
      expect(result).toBe('')
    })
  })

  describe('generateJSDoc', () => {
    it('should generate simple JSDoc comment', () => {
      const result = generateJSDoc('This is a description')
      expect(result).toContain('/**')
      expect(result).toContain(' * This is a description')
      expect(result).toContain(' */')
    })

    it('should handle multiline descriptions', () => {
      const result = generateJSDoc('Line 1\nLine 2\nLine 3')
      expect(result).toContain('Line 1')
      expect(result).toContain('Line 2')
      expect(result).toContain('Line 3')
    })

    it('should include tags when provided', () => {
      const tags = {
        param: 'value - The value',
        returns: 'Result',
      }
      const result = generateJSDoc('Description', tags)
      expect(result).toContain(' * @param value - The value')
      expect(result).toContain(' * @returns Result')
    })

    it('should handle empty description', () => {
      const result = generateJSDoc('')
      expect(result).toContain('/**')
      expect(result).toContain(' */')
    })
  })

  describe('generateEpisodeCode', () => {
    it('should generate episode object code', () => {
      const episode = {
        id: 'ent_s1_e1',
        title: 'Broken Bow',
        season: 1,
        episode: 1,
        airDate: '2001-09-26',
        stardate: '~1.1',
        synopsis: 'The crew of Enterprise...',
        plotPoints: ['First contact'],
        guestStars: [],
        connections: [],
      }
      const result = generateEpisodeCode(episode)
      expect(result).toContain('id:')
      expect(result).toContain("'ent_s1_e1'")
      expect(result).toContain('title:')
      expect(result).toContain("'Broken Bow'")
    })

    it('should include comments when enabled', () => {
      const episode = {
        id: 'ent_s1_e1',
        title: 'Broken Bow',
        season: 1,
        episode: 1,
        airDate: '2001-09-26',
        stardate: '~1.1',
        synopsis: 'Test',
        plotPoints: [],
        guestStars: [],
        connections: [],
      }
      const result = generateEpisodeCode(episode, {includeComments: true})
      expect(result).toContain('// Broken Bow')
      expect(result).toContain('// Season 1, Episode 1')
    })
  })

  describe('generateModule', () => {
    it('should generate complete module with export', () => {
      const data = {value: 42}
      const result = generateModule('myModule', data)
      expect(result).toContain('export const myModule')
      expect(result).toContain('value: 42')
    })

    it('should include comments when enabled', () => {
      const result = generateModule('test', {}, {includeComments: true})
      expect(result).toContain('/**')
      expect(result).toContain(' * Generated TypeScript module: test')
      expect(result).toContain(' * This file is auto-generated')
    })

    it('should include metadata provenance when enabled', () => {
      const result = generateModule(
        'test',
        {},
        {includeComments: true, includeMetadataProvenance: true},
      )
      expect(result).toContain('Generated at:')
      expect(result).toMatch(/\d{4}-\d{2}-\d{2}/)
    })

    it('should include explicit types when enabled', () => {
      const result = generateModule('test', {a: 1}, {useExplicitTypes: true})
      expect(result).toContain(': Record<string, unknown>')
    })
  })
})
