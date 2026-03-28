/**
 * Plugin System for Custom Data Transformations and Enrichment Strategies
 *
 * Provides a flexible plugin architecture for extending the data generation
 * pipeline with custom transformations, validations, and enrichment strategies.
 */

import type {NormalizedEra, NormalizedMovieItem, NormalizedSeasonItem} from './data-quality.js'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Lifecycle phase at which a plugin executes.
 */
export type PluginPhase =
  | 'pre-normalize'
  | 'post-normalize'
  | 'pre-patch'
  | 'post-patch'
  | 'pre-override'
  | 'post-override'
  | 'pre-export'

/**
 * Target type that a plugin can operate on.
 */
export type PluginTarget = 'era' | 'season' | 'movie' | 'episode' | 'all'

/**
 * Configuration options for a plugin.
 */
export interface PluginOptions {
  /** Human-readable name of the plugin */
  name: string
  /** Plugin version for compatibility checking */
  version: string
  /** Lifecycle phase when the plugin executes */
  phase: PluginPhase
  /** Target data type the plugin operates on */
  target: PluginTarget
  /** Execution priority (lower = earlier) */
  priority?: number
  /** Whether to continue pipeline on plugin error */
  continueOnError?: boolean
}

/**
 * Input context passed to plugin transformation functions.
 */
export interface PluginContext {
  /** Plugin configuration options */
  config: Record<string, unknown>
  /** Metadata about the current generation run */
  metadata: {
    mode: 'full' | 'incremental'
    series?: string
    timestamp: string
  }
}

/**
 * Result returned by a plugin transformation.
 */
export interface PluginResult {
  /** Whether the transformation was successful */
  success: boolean
  /** Transformed data (if applicable) */
  data?: NormalizedEra[]
  /** Error message if transformation failed */
  error?: string
  /** Warnings generated during transformation */
  warnings: string[]
}

/**
 * Transformation function type.
 */
export type TransformFn = (eras: NormalizedEra[], context: PluginContext) => Promise<PluginResult>

/**
 * A registered plugin instance.
 */
export interface Plugin {
  /** Unique identifier for the plugin */
  id: string
  /** Plugin configuration */
  options: PluginOptions
  /** The transformation function */
  transform: TransformFn
}

/**
 * Registry interface for managing plugins.
 */
export interface PluginRegistry {
  register: (plugin: Plugin) => void
  unregister: (pluginId: string) => boolean
  getPlugins: (phase?: PluginPhase) => Plugin[]
  getPlugin: (pluginId: string) => Plugin | undefined
  clear: () => void
  size: () => number
}

// ============================================================================
// PLUGIN REGISTRY
// ============================================================================

let pluginIdCounter = 0

/**
 * Creates a new plugin with the given options and transform function.
 */
export const createPlugin = (options: PluginOptions, transform: TransformFn): Plugin => {
  pluginIdCounter++
  return {
    id: `plugin-${pluginIdCounter}-${options.name.toLowerCase().replaceAll(/\s+/g, '-')}`,
    options: {
      priority: 100,
      continueOnError: false,
      ...options,
    },
    transform,
  }
}

/**
 * Creates a registry for managing plugins.
 */
export const createPluginRegistry = (): PluginRegistry => {
  const plugins: Plugin[] = []

  const register = (plugin: Plugin): void => {
    plugins.push(plugin)
  }

  const unregister = (pluginId: string): boolean => {
    const index = plugins.findIndex(p => p.id === pluginId)
    if (index !== -1) {
      plugins.splice(index, 1)
      return true
    }
    return false
  }

  const getPlugins = (phase?: PluginPhase): Plugin[] => {
    const filtered = phase ? plugins.filter(p => p.options.phase === phase) : plugins
    return [...filtered].sort((a, b) => (a.options.priority ?? 100) - (b.options.priority ?? 100))
  }

  const getPlugin = (pluginId: string): Plugin | undefined => {
    return plugins.find(p => p.id === pluginId)
  }

  const clear = (): void => {
    plugins.length = 0
  }

  const size = (): number => plugins.length

  return {
    register,
    unregister,
    getPlugins,
    getPlugin,
    clear,
    size,
  }
}

// ============================================================================
// PLUGIN EXECUTION
// ============================================================================

/**
 * Executes a single plugin's transform function.
 */
const executePlugin = async (
  plugin: Plugin,
  input: NormalizedEra[],
  context: PluginContext,
): Promise<{result: PluginResult; executed: boolean}> => {
  try {
    const result = await plugin.transform(input, context)
    return {result, executed: true}
  } catch (error) {
    return {
      result: {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        warnings: [],
      },
      executed: false,
    }
  }
}

/**
 * Executes all plugins for a given phase on era data.
 */
export const executePhasePlugins = async (
  plugins: Plugin[],
  eras: NormalizedEra[],
  context: PluginContext,
): Promise<{
  eras: NormalizedEra[]
  errors: {pluginId: string; error: string}[]
  warnings: {pluginId: string; warning: string}[]
  executedPlugins: string[]
  failedPlugins: string[]
}> => {
  const errors: {pluginId: string; error: string}[] = []
  const warnings: {pluginId: string; warning: string}[] = []
  const executedPlugins: string[] = []
  const failedPlugins: string[] = []
  let currentEras = eras

  for (const plugin of plugins) {
    const {result, executed} = await executePlugin(plugin, currentEras, context)

    if (executed) {
      executedPlugins.push(plugin.id)

      if (result.warnings && result.warnings.length > 0) {
        for (const warning of result.warnings) {
          warnings.push({pluginId: plugin.id, warning})
        }
      }

      if (result.success && result.data) {
        currentEras = result.data
      } else if (!result.success && result.error) {
        errors.push({pluginId: plugin.id, error: result.error})
        failedPlugins.push(plugin.id)

        if (!plugin.options.continueOnError) {
          break
        }
      }
    } else {
      // NEW: Handle thrown errors from plugins that did not execute
      failedPlugins.push(plugin.id)
      if (result?.error) {
        errors.push({pluginId: plugin.id, error: result.error})
      }
      if (!plugin.options.continueOnError) {
        break
      }
    }
  }

  return {
    eras: currentEras,
    errors,
    warnings,
    executedPlugins,
    failedPlugins,
  }
}

/**
 * Runs the complete plugin pipeline on era data.
 */
export const runPluginPipeline = async (
  registry: ReturnType<typeof createPluginRegistry>,
  eras: NormalizedEra[],
  metadata: PluginContext['metadata'],
): Promise<{
  success: boolean
  eras: NormalizedEra[]
  errors: {pluginId: string; error: string}[]
  warnings: {pluginId: string; warning: string}[]
  executedPlugins: string[]
  failedPlugins: string[]
}> => {
  const allErrors: {pluginId: string; error: string}[] = []
  const allWarnings: {pluginId: string; warning: string}[] = []
  const executedPlugins: string[] = []
  const failedPlugins: string[] = []
  let currentEras = eras

  const phases: PluginPhase[] = [
    'pre-normalize',
    'post-normalize',
    'pre-patch',
    'post-patch',
    'pre-override',
    'post-override',
    'pre-export',
  ]

  for (const phase of phases) {
    const plugins = registry.getPlugins(phase)

    if (plugins.length === 0) {
      continue
    }

    const context: PluginContext = {
      config: {},
      metadata,
    }

    const phaseResult = await executePhasePlugins(plugins, currentEras, context)

    currentEras = phaseResult.eras
    allErrors.push(...phaseResult.errors)
    allWarnings.push(...phaseResult.warnings)
    executedPlugins.push(...phaseResult.executedPlugins)
    failedPlugins.push(...phaseResult.failedPlugins)
  }

  return {
    success: allErrors.length === 0,
    eras: currentEras,
    errors: allErrors,
    warnings: allWarnings,
    executedPlugins: [...new Set(executedPlugins)],
    failedPlugins: [...new Set(failedPlugins)],
  }
}

// ============================================================================
// BUILT-IN PLUGIN FACTORIES
// ============================================================================

/**
 * Creates a plugin that adds custom metadata to eras.
 */
export const createMetadataPlugin = (name: string, metadata: Record<string, unknown>): Plugin => {
  return createPlugin(
    {
      name,
      version: '1.0.0',
      phase: 'post-override',
      target: 'era',
      priority: 200,
    },
    async eras => {
      return {
        success: true,
        data: eras.map(era => ({
          ...era,
          ...metadata,
        })),
        warnings: [],
      }
    },
  )
}

/**
 * Creates a plugin that filters out items based on a predicate.
 */
export const createFilterPlugin = (
  name: string,
  predicate: (item: NormalizedSeasonItem | NormalizedMovieItem) => boolean,
): Plugin => {
  return createPlugin(
    {
      name,
      version: '1.0.0',
      phase: 'post-override',
      target: 'all',
      priority: 150,
    },
    async eras => {
      return {
        success: true,
        data: eras.map(era => ({
          ...era,
          items: era.items.filter(predicate),
        })),
        warnings: [],
      }
    },
  )
}

// ============================================================================
// DEFAULT REGISTRY
// ============================================================================

const defaultRegistry = createPluginRegistry()

export const getDefaultRegistry = () => defaultRegistry

export const registerDefaultPlugin = (plugin: Plugin): void => {
  defaultRegistry.register(plugin)
}

export const clearDefaultPlugins = (): void => {
  defaultRegistry.clear()
}
