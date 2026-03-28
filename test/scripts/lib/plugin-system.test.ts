/**
 * Tests for the plugin system.
 * Covers plugin registry management, priority ordering, error handling,
 * and built-in plugin factories.
 */

import type {NormalizedEra} from '../../../scripts/lib/data-quality.js'
import type {PluginContext} from '../../../scripts/lib/plugin-system.js'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {
  createFilterPlugin,
  createMetadataPlugin,
  createPlugin,
  createPluginRegistry,
  executePhasePlugins,
} from '../../../scripts/lib/plugin-system.js'

// ---------------------------------------------------------------------------
// Test Data
// ---------------------------------------------------------------------------

const createTestEras = (): NormalizedEra[] => [
  {
    id: 'test_era',
    title: 'Test Era',
    years: '2020-2025',
    stardates: 'Test stardates',
    description: 'Test description',
    items: [
      {
        id: 'test_s1',
        title: 'Test Season 1',
        type: 'season',
        year: '2020',
        stardate: '5000.0',
        episodes: 2,
        episodeData: [
          {
            id: 'test_s1_e1',
            title: 'Episode 1',
            season: 1,
            episode: 1,
            airDate: '2020-01-01',
            stardate: '5000.1',
            synopsis: 'Test',
          },
          {
            id: 'test_s1_e2',
            title: 'Episode 2',
            season: 1,
            episode: 2,
            airDate: '2020-01-02',
            stardate: '5000.2',
            synopsis: 'Test',
          },
        ],
      },
    ],
  },
]

const createTestContext = (): PluginContext => ({
  config: {},
  metadata: {
    mode: 'full',
    timestamp: new Date().toISOString(),
  },
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('plugin-system', () => {
  let registry: ReturnType<typeof createPluginRegistry>

  beforeEach(() => {
    registry = createPluginRegistry()
  })

  afterEach(() => {
    registry.clear()
  })

  describe('createPluginRegistry', () => {
    it('should create an empty registry', () => {
      expect(registry.size()).toBe(0)
      expect(registry.getPlugins()).toHaveLength(0)
    })

    it('should support register and unregister', () => {
      const plugin = createPlugin(
        {
          name: 'Test Plugin',
          version: '1.0.0',
          phase: 'post-normalize',
          target: 'era',
        },
        async eras => ({success: true, data: eras, warnings: []}),
      )

      registry.register(plugin)
      expect(registry.size()).toBe(1)
      expect(registry.getPlugin(plugin.id)).toBeDefined()

      const unregistered = registry.unregister(plugin.id)
      expect(unregistered).toBe(true)
      expect(registry.size()).toBe(0)
      expect(registry.getPlugin(plugin.id)).toBeUndefined()
    })

    it('should return false when unregistering non-existent plugin', () => {
      const result = registry.unregister('non-existent-id')
      expect(result).toBe(false)
    })

    it('should get plugins by phase', () => {
      const plugin1 = createPlugin(
        {name: 'Plugin 1', version: '1.0.0', phase: 'pre-normalize', target: 'era'},
        async eras => ({success: true, data: eras, warnings: []}),
      )
      const plugin2 = createPlugin(
        {name: 'Plugin 2', version: '1.0.0', phase: 'post-normalize', target: 'era'},
        async eras => ({success: true, data: eras, warnings: []}),
      )

      registry.register(plugin1)
      registry.register(plugin2)

      const prePlugins = registry.getPlugins('pre-normalize')
      const postPlugins = registry.getPlugins('post-normalize')

      expect(prePlugins).toHaveLength(1)
      expect(prePlugins[0]!.id).toBe(plugin1.id)
      expect(postPlugins).toHaveLength(1)
      expect(postPlugins[0]!.id).toBe(plugin2.id)
    })

    it('should return plugins sorted by priority', () => {
      const pluginLow = createPlugin(
        {
          name: 'Low Priority',
          version: '1.0.0',
          phase: 'post-normalize',
          target: 'era',
          priority: 100,
        },
        async eras => ({success: true, data: eras, warnings: []}),
      )
      const pluginHigh = createPlugin(
        {
          name: 'High Priority',
          version: '1.0.0',
          phase: 'post-normalize',
          target: 'era',
          priority: 1,
        },
        async eras => ({success: true, data: eras, warnings: []}),
      )

      registry.register(pluginLow)
      registry.register(pluginHigh)

      const plugins = registry.getPlugins('post-normalize')
      expect(plugins[0]!.id).toBe(pluginHigh.id)
      expect(plugins[1]!.id).toBe(pluginLow.id)
    })
  })

  describe('executePhasePlugins', () => {
    it('should execute successful plugin and return transformed data', async () => {
      const eras = createTestEras()
      const context = createTestContext()

      const plugin = createPlugin(
        {
          name: 'Success Plugin',
          version: '1.0.0',
          phase: 'post-normalize',
          target: 'era',
        },
        async input => ({
          success: true,
          data: input.map(e => ({...e, title: `${e.title} (transformed)`})),
          warnings: [],
        }),
      )

      const result = await executePhasePlugins([plugin], eras, context)

      expect(result.executedPlugins).toContain(plugin.id)
      expect(result.failedPlugins).toHaveLength(0)
      expect(result.errors).toHaveLength(0)
      expect(result.eras[0]!.title).toBe('Test Era (transformed)')
    })

    it('should continue when continueOnError is true and plugin fails', async () => {
      const eras = createTestEras()
      const context = createTestContext()

      const failingPlugin = createPlugin(
        {
          name: 'Failing Plugin',
          version: '1.0.0',
          phase: 'post-normalize',
          target: 'era',
          continueOnError: true,
        },
        async () => ({success: false, error: 'Intentional failure', warnings: []}),
      )

      const successPlugin = createPlugin(
        {
          name: 'Success Plugin',
          version: '1.0.0',
          phase: 'post-normalize',
          target: 'era',
          priority: 200,
        },
        async input => ({success: true, data: input, warnings: []}),
      )

      const result = await executePhasePlugins([failingPlugin, successPlugin], eras, context)

      expect(result.failedPlugins).toContain(failingPlugin.id)
      expect(result.errors).toHaveLength(1)
      expect(result.executedPlugins).toContain(successPlugin.id)
    })

    it('should stop when continueOnError is false and plugin fails', async () => {
      const eras = createTestEras()
      const context = createTestContext()

      const failingPlugin = createPlugin(
        {
          name: 'Failing Plugin',
          version: '1.0.0',
          phase: 'post-normalize',
          target: 'era',
          continueOnError: false,
        },
        async () => ({success: false, error: 'Critical failure', warnings: []}),
      )

      const successPlugin = createPlugin(
        {
          name: 'Success Plugin',
          version: '1.0.0',
          phase: 'post-normalize',
          target: 'era',
          priority: 200,
        },
        async input => ({success: true, data: input, warnings: []}),
      )

      const result = await executePhasePlugins([failingPlugin, successPlugin], eras, context)

      expect(result.failedPlugins).toContain(failingPlugin.id)
      expect(result.executedPlugins).not.toContain(successPlugin.id)
    })

    it('should capture thrown errors and respect continueOnError', async () => {
      const eras = createTestEras()
      const context = createTestContext()

      const throwingPlugin = createPlugin(
        {
          name: 'Throwing Plugin',
          version: '1.0.0',
          phase: 'post-normalize',
          target: 'era',
          continueOnError: true,
        },
        async () => {
          throw new Error('Unexpected error')
        },
      )

      const result = await executePhasePlugins([throwingPlugin], eras, context)

      expect(result.failedPlugins).toContain(throwingPlugin.id)
      expect(result.errors.some(e => e.pluginId === throwingPlugin.id)).toBe(true)
      expect(result.errors[0]?.error).toBe('Unexpected error')
    })

    it('should stop on thrown error when continueOnError is false', async () => {
      const eras = createTestEras()
      const context = createTestContext()

      const throwingPlugin = createPlugin(
        {
          name: 'Throwing Plugin',
          version: '1.0.0',
          phase: 'post-normalize',
          target: 'era',
          continueOnError: false,
        },
        async () => {
          throw new Error('Fatal error')
        },
      )

      const successPlugin = createPlugin(
        {
          name: 'Success Plugin',
          version: '1.0.0',
          phase: 'post-normalize',
          target: 'era',
          priority: 200,
        },
        async input => ({success: true, data: input, warnings: []}),
      )

      const result = await executePhasePlugins([throwingPlugin, successPlugin], eras, context)

      expect(result.failedPlugins).toContain(throwingPlugin.id)
      expect(result.executedPlugins).not.toContain(successPlugin.id)
    })
  })

  describe('createMetadataPlugin', () => {
    it('should add metadata to eras', async () => {
      const eras = createTestEras()
      const context = createTestContext()

      const plugin = createMetadataPlugin('test-metadata', {
        customField: 'customValue',
        generatedBy: 'test-suite',
      })

      const result = await executePhasePlugins([plugin], eras, context)

      expect(result.executedPlugins).toContain(plugin.id)
      expect(result.eras[0]!).toHaveProperty('customField')
      expect((result.eras[0] as unknown as Record<string, unknown>).customField).toBe('customValue')
    })
  })

  describe('createFilterPlugin', () => {
    it('should filter items based on predicate', async () => {
      const eras = createTestEras()
      const context = createTestContext()

      const plugin = createFilterPlugin('Filter Test', item => item.type !== 'season')

      const result = await executePhasePlugins([plugin], eras, context)

      expect(result.executedPlugins).toContain(plugin.id)
      expect(result.eras[0]!.items).toHaveLength(0)
    })
  })
})
