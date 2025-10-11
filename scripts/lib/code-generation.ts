/**
 * TypeScript AST generation utilities for programmatic code creation.
 * Provides template-based code generation with type safety and formatting.
 */

import type {Episode} from '../../src/modules/types.js'

/**
 * Options for code generation.
 */
export interface CodeGenerationOptions {
  includeComments?: boolean
  includeMetadataProvenance?: boolean
  useExplicitTypes?: boolean
}

/**
 * Generates TypeScript import statements.
 *
 * @param imports - Map of import specifiers to module paths
 * @returns Formatted import statements
 */
export const generateImports = (imports: Record<string, string[]>): string => {
  return Object.entries(imports)
    .map(([modulePath, specifiers]) => {
      if (specifiers.length === 0) {
        return ''
      }
      const sortedSpecifiers = [...specifiers].sort()
      if (sortedSpecifiers.length === 1) {
        return `import type {${sortedSpecifiers[0]}} from '${modulePath}'`
      }
      return `import type {\n  ${sortedSpecifiers.join(',\n  ')},\n} from '${modulePath}'`
    })
    .filter(Boolean)
    .join('\n')
}

/**
 * Generates a TypeScript type annotation for a value.
 *
 * @param value - Value to generate type for
 * @returns TypeScript type annotation
 */
export const generateTypeAnnotation = (value: unknown): string => {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (Array.isArray(value)) return 'unknown[]'

  const type = typeof value
  switch (type) {
    case 'string':
      return 'string'
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'object':
      return 'Record<string, unknown>'
    default:
      return 'unknown'
  }
}

/**
 * Generates a properly escaped TypeScript string literal.
 *
 * @param value - String value to escape
 * @returns Escaped string literal with quotes
 */
export const generateStringLiteral = (value: string): string => {
  const escaped = value
    .replaceAll('\\', String.raw`\\`)
    .replaceAll("'", String.raw`\'`)
    .replaceAll('\n', String.raw`\n`)
    .replaceAll('\r', String.raw`\r`)
    .replaceAll('\t', String.raw`\t`)

  return `'${escaped}'`
}

/**
 * Generates a TypeScript array literal.
 *
 * @param items - Array items to include
 * @param inline - Whether to format inline or multiline (default: auto)
 * @returns Formatted array literal
 */
export const generateArrayLiteral = (items: unknown[], inline?: boolean): string => {
  if (items.length === 0) return '[]'

  const shouldInline = inline ?? items.length <= 3

  if (shouldInline) {
    const formattedItems = items.map(item => formatValue(item)).join(', ')
    return `[${formattedItems}]`
  }

  const formattedItems = items.map(item => `  ${formatValue(item)}`).join(',\n')
  return `[\n${formattedItems},\n]`
}

/**
 * Generates a TypeScript object literal.
 *
 * @param obj - Object to generate literal for
 * @param indent - Indentation level (default: 0)
 * @returns Formatted object literal
 */
export const generateObjectLiteral = (obj: Record<string, unknown>, indent = 0): string => {
  const entries = Object.entries(obj)
  if (entries.length === 0) return '{}'

  const indentStr = '  '.repeat(indent)
  const innerIndentStr = '  '.repeat(indent + 1)

  const formattedEntries = entries
    .map(([key, value]) => {
      const formattedValue = formatValue(value, indent + 1)
      return `${innerIndentStr}${key}: ${formattedValue}`
    })
    .join(',\n')

  return `{\n${formattedEntries},\n${indentStr}}`
}

/**
 * Formats a value for code generation.
 *
 * @param value - Value to format
 * @param indent - Current indentation level
 * @returns Formatted value
 */
const formatValue = (value: unknown, indent = 0): string => {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return generateStringLiteral(value)
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return generateArrayLiteral(value)
  if (typeof value === 'object')
    return generateObjectLiteral(value as Record<string, unknown>, indent)
  return 'undefined'
}

/**
 * Generates TypeScript code for an Episode object.
 *
 * @param episode - Episode data to generate code for
 * @param options - Code generation options
 * @returns TypeScript code string
 */
export const generateEpisodeCode = (
  episode: Episode,
  options: CodeGenerationOptions = {},
): string => {
  const lines: string[] = []

  if (options.includeComments) {
    lines.push(`// ${episode.title}`)
    lines.push(`// Season ${episode.season}, Episode ${episode.episode}`)
  }

  lines.push(generateObjectLiteral(episode as unknown as Record<string, unknown>))

  return lines.join('\n')
}

/**
 * Generates a complete TypeScript module with exports.
 *
 * @param moduleName - Name of the module/variable to export
 * @param data - Data to export
 * @param options - Code generation options
 * @returns Complete TypeScript module code
 */
export const generateModule = (
  moduleName: string,
  data: unknown,
  options: CodeGenerationOptions = {},
): string => {
  const lines: string[] = []

  if (options.includeComments) {
    lines.push('/**')
    lines.push(` * Generated TypeScript module: ${moduleName}`)
    lines.push(' * This file is auto-generated. Do not edit manually.')
    if (options.includeMetadataProvenance) {
      lines.push(` * Generated at: ${new Date().toISOString()}`)
    }
    lines.push(' */')
  }

  const typeAnnotation = options.useExplicitTypes ? `: ${generateTypeAnnotation(data)}` : ''
  const formattedData = formatValue(data)

  lines.push(`export const ${moduleName}${typeAnnotation} = ${formattedData}`)

  return lines.join('\n')
}

/**
 * Generates a JSDoc comment block.
 *
 * @param description - Main description
 * @param tags - JSDoc tags (e.g., \@param, \@returns)
 * @returns Formatted JSDoc comment
 */
export const generateJSDoc = (description: string, tags: Record<string, string> = {}): string => {
  const lines = ['/**', ` * ${description}`]

  const tagEntries = Object.entries(tags)
  if (tagEntries.length > 0) {
    lines.push(' *')
    for (const [tag, value] of tagEntries) {
      lines.push(` * @${tag} ${value}`)
    }
  }

  lines.push(' */')
  return lines.join('\n')
}

/**
 * Generates TypeScript interface definition.
 *
 * @param interfaceName - Name of the interface
 * @param fields - Interface fields with types
 * @param options - Generation options
 * @returns TypeScript interface code
 */
export const generateInterface = (
  interfaceName: string,
  fields: Record<string, string>,
  options: CodeGenerationOptions = {},
): string => {
  const lines: string[] = []

  if (options.includeComments) {
    lines.push(generateJSDoc(`${interfaceName} interface definition`))
  }

  lines.push(`export interface ${interfaceName} {`)

  for (const [fieldName, fieldType] of Object.entries(fields)) {
    lines.push(`  ${fieldName}: ${fieldType}`)
  }

  lines.push('}')

  return lines.join('\n')
}

/**
 * Wraps code in a namespace for organization.
 *
 * @param namespaceName - Namespace name
 * @param content - Code to wrap
 * @returns Namespaced code
 */
export const generateNamespace = (namespaceName: string, content: string): string => {
  return `export namespace ${namespaceName} {\n${content}\n}`
}
