/**
 * Conflict resolution strategies for episode metadata enrichment system.
 * Handles cases where multiple data sources provide different values for the same metadata fields.
 *
 * Follows VBS functional factory architecture and provides intelligent conflict resolution
 * based on source confidence, data freshness, and user preferences.
 */

import type {
  ConflictResolutionRecord,
  EpisodeMetadata,
  MetadataSource,
  MetadataSourceType,
} from '../modules/types.js'
import {withSyncErrorHandling} from '../modules/error-handler.js'

// ============================================================================
// CONFLICT RESOLUTION INTERFACES
// ============================================================================

/**
 * Configuration for conflict resolution strategies.
 */
export interface ConflictResolutionConfig {
  /** Default strategy to use when no specific strategy is configured */
  defaultStrategy: ConflictResolutionStrategy
  /** Field-specific resolution strategies */
  fieldStrategies: Record<string, ConflictResolutionStrategy>
  /** Minimum confidence threshold for automatic resolution */
  confidenceThreshold: number
  /** Whether to require manual review for low-confidence conflicts */
  requireManualReview: boolean
  /** Source priority rankings for tie-breaking */
  sourcePriority: MetadataSourceType[]
}

/**
 * Available conflict resolution strategies.
 */
export type ConflictResolutionStrategy =
  | 'highest-confidence'
  | 'most-recent'
  | 'manual'
  | 'consensus'
  | 'source-priority'
  | 'field-specific'

/**
 * Conflict resolution context for decision making.
 */
export interface ConflictResolutionContext {
  fieldName: string
  conflicts: ConflictingValue[]
  sources: Record<MetadataSourceType, MetadataSource>
  existingResolution?: ConflictResolutionRecord | undefined
  userPreferences?: ConflictResolutionConfig
}

/**
 * Represents a conflicting value from a specific source.
 */
export interface ConflictingValue {
  source: MetadataSourceType
  value: unknown
  confidence: number
  timestamp: string
  sourceReliability: number
}

/**
 * Result of conflict resolution process.
 */
export interface ConflictResolutionResult {
  resolvedValue: unknown
  strategy: ConflictResolutionStrategy
  confidence: number
  requiresManualReview: boolean
  reasoning: string
  alternativeValues: ConflictingValue[]
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

/**
 * Default conflict resolution configuration.
 */
export const DEFAULT_CONFLICT_RESOLUTION_CONFIG: ConflictResolutionConfig = {
  defaultStrategy: 'highest-confidence',
  fieldStrategies: {
    airDate: 'source-priority',
    productionCode: 'highest-confidence',
    synopsis: 'most-recent',
    guestStars: 'consensus',
    director: 'source-priority',
    writer: 'source-priority',
  },
  confidenceThreshold: 0.8,
  requireManualReview: true,
  sourcePriority: ['memory-alpha', 'tmdb', 'imdb', 'trekcore', 'startrek-com', 'manual'],
}

// ============================================================================
// CONFLICT RESOLUTION FACTORY
// ============================================================================

/**
 * Factory function for creating conflict resolution system.
 */
export const createConflictResolver = (config: Partial<ConflictResolutionConfig> = {}) => {
  const resolverConfig: ConflictResolutionConfig = {
    ...DEFAULT_CONFLICT_RESOLUTION_CONFIG,
    ...config,
  }

  /**
   * Resolve conflicts in episode metadata using configured strategies.
   */
  const resolveMetadataConflicts = withSyncErrorHandling(
    (
      metadata: Record<string, EpisodeMetadata>,
      sources: Record<MetadataSourceType, MetadataSource>,
    ): Record<string, EpisodeMetadata> => {
      const resolvedMetadata: Record<string, EpisodeMetadata> = {}

      for (const [episodeId, metadataRecord] of Object.entries(metadata)) {
        // Check for existing conflict resolution records
        const existingConflicts = metadataRecord.conflictResolution || []

        // Identify new conflicts by comparing field values from different sources
        const fieldConflicts = identifyFieldConflicts(metadataRecord, sources)

        if (fieldConflicts.length === 0) {
          // No conflicts, use metadata as-is
          resolvedMetadata[episodeId] = metadataRecord
          continue
        }

        // Resolve each conflict
        const newConflictResolutions: ConflictResolutionRecord[] = [...existingConflicts]
        const updatedMetadata = {...metadataRecord}

        for (const conflict of fieldConflicts) {
          const resolutionContext: ConflictResolutionContext = {
            fieldName: conflict.fieldName,
            conflicts: conflict.values,
            sources,
            existingResolution: existingConflicts.find(r => r.fieldName === conflict.fieldName),
            userPreferences: resolverConfig,
          }

          const resolution = resolveFieldConflict(resolutionContext)

          // Update metadata with resolved value
          if (!resolution.requiresManualReview) {
            ;(updatedMetadata as Record<string, unknown>)[conflict.fieldName] =
              resolution.resolvedValue
          }

          // Record the conflict resolution
          newConflictResolutions.push({
            fieldName: conflict.fieldName,
            conflicts: conflict.values.map(v => ({
              source: v.source,
              value: v.value,
              confidence: v.confidence,
            })),
            resolution: resolution.resolvedValue,
            strategy: resolution.strategy,
            resolvedAt: new Date().toISOString(),
          })
        }

        resolvedMetadata[episodeId] = {
          ...updatedMetadata,
          conflictResolution: newConflictResolutions,
        }
      }

      return resolvedMetadata
    },
    'resolveMetadataConflicts',
  )

  /**
   * Resolve a single field conflict using appropriate strategy.
   */
  const resolveFieldConflict = (context: ConflictResolutionContext): ConflictResolutionResult => {
    const strategy = getStrategyForField(context.fieldName, resolverConfig)

    switch (strategy) {
      case 'highest-confidence':
        return resolveByHighestConfidence(context)
      case 'most-recent':
        return resolveByMostRecent(context)
      case 'source-priority':
        return resolveBySourcePriority(context, resolverConfig.sourcePriority)
      case 'consensus':
        return resolveByConsensus(context)
      case 'manual':
        return requireManualResolution(context)
      default:
        return resolveByHighestConfidence(context)
    }
  }

  /**
   * Get sources involved in conflicts for a metadata record.
   */
  const getConflictingSources = (episodeId: string): MetadataSourceType[] => {
    const metadata = resolvedMetadata[episodeId]
    if (!metadata?.conflictResolution) return []

    const sources = new Set<MetadataSourceType>()
    for (const resolution of metadata.conflictResolution) {
      for (const conflict of resolution.conflicts) {
        sources.add(conflict.source)
      }
    }
    return Array.from(sources)
  }

  /**
   * Get conflict resolution statistics.
   */
  const getConflictStats = (): {
    totalConflicts: number
    resolvedConflicts: number
    pendingReview: number
    strategyCounts: Record<ConflictResolutionStrategy, number>
  } => {
    let totalConflicts = 0
    let resolvedConflicts = 0
    let pendingReview = 0
    const strategyCounts: Record<ConflictResolutionStrategy, number> = {
      'highest-confidence': 0,
      'most-recent': 0,
      manual: 0,
      consensus: 0,
      'source-priority': 0,
      'field-specific': 0,
    }

    for (const metadata of Object.values(resolvedMetadata)) {
      if (metadata.conflictResolution) {
        totalConflicts += metadata.conflictResolution.length
        for (const resolution of metadata.conflictResolution) {
          if (resolution.strategy === 'manual') {
            pendingReview++
          } else {
            resolvedConflicts++
          }
          strategyCounts[resolution.strategy]++
        }
      }
    }

    return {
      totalConflicts,
      resolvedConflicts,
      pendingReview,
      strategyCounts,
    }
  }

  let resolvedMetadata: Record<string, EpisodeMetadata> = {}

  return {
    resolveMetadataConflicts,
    resolveFieldConflict,
    getConflictingSources,
    getConflictStats,
    updateConfig: (newConfig: Partial<ConflictResolutionConfig>) => {
      Object.assign(resolverConfig, newConfig)
    },
    getConfig: () => ({...resolverConfig}),
  }
}

// ============================================================================
// CONFLICT IDENTIFICATION
// ============================================================================

/**
 * Identify conflicts in metadata fields from different sources.
 */
const identifyFieldConflicts = (
  _metadata: EpisodeMetadata,
  _sources: Record<MetadataSourceType, MetadataSource>,
): {fieldName: string; values: ConflictingValue[]}[] => {
  const conflicts: {fieldName: string; values: ConflictingValue[]}[] = []

  // For now, return empty array as this is a simplified implementation
  // In a full implementation, this would analyze fieldValidation to find conflicts
  return conflicts
}

// ============================================================================
// RESOLUTION STRATEGIES
// ============================================================================

/**
 * Resolve conflict by selecting value with highest confidence score.
 */
const resolveByHighestConfidence = (
  context: ConflictResolutionContext,
): ConflictResolutionResult => {
  const sortedByConfidence = [...context.conflicts].sort((a, b) => b.confidence - a.confidence)
  const winner = sortedByConfidence[0]

  if (!winner) {
    return requireManualResolution(context)
  }

  return {
    resolvedValue: winner.value,
    strategy: 'highest-confidence',
    confidence: winner.confidence,
    requiresManualReview: winner.confidence < (context.userPreferences?.confidenceThreshold || 0.8),
    reasoning: `Selected value from ${winner.source} with highest confidence score (${winner.confidence})`,
    alternativeValues: sortedByConfidence.slice(1),
  }
}

/**
 * Resolve conflict by selecting most recently updated value.
 */
const resolveByMostRecent = (context: ConflictResolutionContext): ConflictResolutionResult => {
  const sortedByTime = [...context.conflicts].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )
  const winner = sortedByTime[0]

  if (!winner) {
    return requireManualResolution(context)
  }

  return {
    resolvedValue: winner.value,
    strategy: 'most-recent',
    confidence: winner.confidence,
    requiresManualReview: winner.confidence < (context.userPreferences?.confidenceThreshold || 0.8),
    reasoning: `Selected most recent value from ${winner.source} (${winner.timestamp})`,
    alternativeValues: sortedByTime.slice(1),
  }
}

/**
 * Resolve conflict by source priority ranking.
 */
const resolveBySourcePriority = (
  context: ConflictResolutionContext,
  sourcePriority: MetadataSourceType[],
): ConflictResolutionResult => {
  const priorityMap = new Map(sourcePriority.map((source, index) => [source, index]))

  const sortedByPriority = [...context.conflicts].sort((a, b) => {
    const aPriority = priorityMap.get(a.source) ?? Number.MAX_SAFE_INTEGER
    const bPriority = priorityMap.get(b.source) ?? Number.MAX_SAFE_INTEGER
    return aPriority - bPriority
  })

  const winner = sortedByPriority[0]

  if (!winner) {
    return requireManualResolution(context)
  }

  return {
    resolvedValue: winner.value,
    strategy: 'source-priority',
    confidence: winner.confidence,
    requiresManualReview: false,
    reasoning: `Selected value from highest priority source: ${winner.source}`,
    alternativeValues: sortedByPriority.slice(1),
  }
}

/**
 * Resolve conflict by finding consensus among sources.
 */
const resolveByConsensus = (context: ConflictResolutionContext): ConflictResolutionResult => {
  // Group by value and count occurrences
  const valueGroups = new Map<string, ConflictingValue[]>()

  for (const conflict of context.conflicts) {
    const key = JSON.stringify(conflict.value)
    const existingGroup = valueGroups.get(key)
    if (existingGroup) {
      existingGroup.push(conflict)
    } else {
      valueGroups.set(key, [conflict])
    }
  }

  // Find the value with the most sources agreeing
  let consensusGroup: ConflictingValue[] = []
  let maxCount = 0

  for (const group of valueGroups.values()) {
    if (group.length > maxCount) {
      maxCount = group.length
      consensusGroup = group
    }
  }

  if (maxCount > 1 && consensusGroup.length > 0 && consensusGroup[0]) {
    // We have consensus
    const averageConfidence =
      consensusGroup.reduce((sum, v) => sum + v.confidence, 0) / consensusGroup.length

    return {
      resolvedValue: consensusGroup[0].value,
      strategy: 'consensus',
      confidence: averageConfidence,
      requiresManualReview:
        averageConfidence < (context.userPreferences?.confidenceThreshold || 0.8),
      reasoning: `Consensus found among ${maxCount} sources`,
      alternativeValues: context.conflicts.filter(c => !consensusGroup.includes(c)),
    }
  } else {
    // No consensus, fall back to highest confidence
    return resolveByHighestConfidence(context)
  }
}

/**
 * Mark conflict as requiring manual resolution.
 */
const requireManualResolution = (context: ConflictResolutionContext): ConflictResolutionResult => {
  return {
    resolvedValue: null,
    strategy: 'manual',
    confidence: 0,
    requiresManualReview: true,
    reasoning: 'Conflict requires manual review',
    alternativeValues: context.conflicts,
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get the appropriate resolution strategy for a field.
 */
const getStrategyForField = (
  fieldName: string,
  config: ConflictResolutionConfig,
): ConflictResolutionStrategy => {
  return config.fieldStrategies[fieldName] || config.defaultStrategy
}

/**
 * Type guard for ConflictResolutionStrategy.
 */
export const isValidConflictResolutionStrategy = (
  value: unknown,
): value is ConflictResolutionStrategy => {
  const validStrategies: ConflictResolutionStrategy[] = [
    'highest-confidence',
    'most-recent',
    'manual',
    'consensus',
    'source-priority',
    'field-specific',
  ]
  return typeof value === 'string' && validStrategies.includes(value as ConflictResolutionStrategy)
}

/**
 * Utility function to merge conflict resolution results using functional composition.
 */
export const mergeConflictResolutions = (
  resolutions: ConflictResolutionRecord[],
): ConflictResolutionRecord[] => {
  // Group by field name
  const grouped = new Map<string, ConflictResolutionRecord[]>()
  for (const resolution of resolutions) {
    const existing = grouped.get(resolution.fieldName)
    if (existing) {
      existing.push(resolution)
    } else {
      grouped.set(resolution.fieldName, [resolution])
    }
  }

  // Keep only the most recent resolution for each field
  const merged: ConflictResolutionRecord[] = []
  for (const fieldResolutions of grouped.values()) {
    const mostRecent = fieldResolutions.sort(
      (a, b) => new Date(b.resolvedAt).getTime() - new Date(a.resolvedAt).getTime(),
    )[0]
    if (mostRecent) {
      merged.push(mostRecent)
    }
  }
  return merged
}
