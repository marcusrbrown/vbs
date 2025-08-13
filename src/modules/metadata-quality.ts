/**
 * Metadata quality scoring system for episode metadata enrichment.
 * Provides intelligent ranking of data source reliability, completeness, and overall quality.
 *
 * Follows VBS functional factory architecture and uses composition utilities for scoring pipelines.
 */

import type {EpisodeMetadata, MetadataSource, MetadataSourceType} from '../modules/types.js'
import {withSyncErrorHandling} from '../modules/error-handler.js'
import {pipe} from '../utils/composition.js'

// ============================================================================
// QUALITY SCORING INTERFACES
// ============================================================================

/**
 * Configuration for quality scoring system.
 */
export interface QualityScoringConfig {
  /** Weight factors for different quality aspects */
  weights: {
    completeness: number // 0.4 - How complete the metadata is
    accuracy: number // 0.3 - Historical accuracy of the source
    freshness: number // 0.2 - How recent the data is
    sourceReliability: number // 0.1 - Overall source reliability
  }
  /** Minimum thresholds for quality gates */
  thresholds: {
    excellent: number // 0.9
    good: number // 0.75
    acceptable: number // 0.6
    poor: number // 0.4
  }
  /** Field importance weights for completeness scoring */
  fieldImportance: Record<string, number>
  /** Decay factors for freshness scoring */
  freshnessDecay: {
    halfLifeDays: number // Days after which freshness score halves
    minimumScore: number // Minimum freshness score (never goes to 0)
  }
}

/**
 * Quality score breakdown for detailed analysis.
 */
export interface QualityScoreBreakdown {
  overall: number
  completeness: number
  accuracy: number
  freshness: number
  sourceReliability: number
  qualityGrade: QualityGrade
  recommendations: string[]
  missingFields: string[]
  lowConfidenceFields: string[]
}

/**
 * Quality grade classification.
 */
export type QualityGrade = 'excellent' | 'good' | 'acceptable' | 'poor' | 'insufficient'

/**
 * Source performance metrics for quality assessment.
 */
export interface SourcePerformanceMetrics {
  source: MetadataSourceType
  totalRequests: number
  successfulRequests: number
  averageResponseTime: number
  accuracyRate: number
  lastUpdated: string
  fieldCompleteness: Record<string, number>
  confidenceDistribution: {
    high: number // % of fields with confidence > 0.8
    medium: number // % of fields with confidence 0.5-0.8
    low: number // % of fields with confidence < 0.5
  }
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

/**
 * Default quality scoring configuration.
 */
export const DEFAULT_QUALITY_SCORING_CONFIG: QualityScoringConfig = {
  weights: {
    completeness: 0.4,
    accuracy: 0.3,
    freshness: 0.2,
    sourceReliability: 0.1,
  },
  thresholds: {
    excellent: 0.9,
    good: 0.75,
    acceptable: 0.6,
    poor: 0.4,
  },
  fieldImportance: {
    // Core episode information
    title: 1,
    airDate: 1,
    season: 1,
    episode: 1,
    synopsis: 0.9,

    // Production information
    productionCode: 0.7,
    director: 0.8,
    writer: 0.8,

    // External references
    tmdbId: 0.6,
    imdbId: 0.6,
    memoryAlphaUrl: 0.5,

    // Enhanced metadata
    guestStars: 0.7,
    plotPoints: 0.8,
    connections: 0.6,
  },
  freshnessDecay: {
    halfLifeDays: 30,
    minimumScore: 0.1,
  },
}

// ============================================================================
// QUALITY SCORING FACTORY
// ============================================================================

/**
 * Factory function for creating quality scoring system.
 */
export const createQualityScorer = (config: Partial<QualityScoringConfig> = {}) => {
  const scoringConfig: QualityScoringConfig = {
    ...DEFAULT_QUALITY_SCORING_CONFIG,
    ...config,
    weights: {...DEFAULT_QUALITY_SCORING_CONFIG.weights, ...config.weights},
    thresholds: {...DEFAULT_QUALITY_SCORING_CONFIG.thresholds, ...config.thresholds},
    fieldImportance: {...DEFAULT_QUALITY_SCORING_CONFIG.fieldImportance, ...config.fieldImportance},
    freshnessDecay: {...DEFAULT_QUALITY_SCORING_CONFIG.freshnessDecay, ...config.freshnessDecay},
  }

  /**
   * Calculate comprehensive quality score for episode metadata.
   */
  const calculateQualityScore = withSyncErrorHandling(
    (
      metadata: EpisodeMetadata,
      source: MetadataSource,
      performanceMetrics?: SourcePerformanceMetrics,
    ): QualityScoreBreakdown => {
      const completenessScore = calculateCompletenessScore(metadata)
      const accuracyScore = calculateAccuracyScore(metadata, performanceMetrics)
      const freshnessScore = calculateFreshnessScore(metadata)
      const sourceReliabilityScore = calculateSourceReliabilityScore(source, performanceMetrics)

      const overall = pipe(
        [completenessScore, accuracyScore, freshnessScore, sourceReliabilityScore],
        (scores: number[]) => scores,
        (scores: number[]) => {
          const [completeness, accuracy, freshness, reliability] = scores
          return (
            (completeness ?? 0) * scoringConfig.weights.completeness +
            (accuracy ?? 0) * scoringConfig.weights.accuracy +
            (freshness ?? 0) * scoringConfig.weights.freshness +
            (reliability ?? 0) * scoringConfig.weights.sourceReliability
          )
        },
      )

      const qualityGrade = getQualityGrade(overall)
      const recommendations = generateRecommendations(metadata, source, {
        completeness: completenessScore,
        accuracy: accuracyScore,
        freshness: freshnessScore,
        sourceReliability: sourceReliabilityScore,
      })

      return {
        overall,
        completeness: completenessScore,
        accuracy: accuracyScore,
        freshness: freshnessScore,
        sourceReliability: sourceReliabilityScore,
        qualityGrade,
        recommendations,
        missingFields: getMissingFields(metadata),
        lowConfidenceFields: getLowConfidenceFields(metadata),
      }
    },
    'calculateQualityScore',
  )

  /**
   * Compare multiple metadata sources and rank by quality.
   */
  const rankSources = (
    metadataRecords: Record<MetadataSourceType, EpisodeMetadata>,
    sources: Record<MetadataSourceType, MetadataSource>,
    performanceMetrics?: Record<MetadataSourceType, SourcePerformanceMetrics>,
  ): {source: MetadataSourceType; score: QualityScoreBreakdown}[] => {
    const rankings: {source: MetadataSourceType; score: QualityScoreBreakdown}[] = []

    for (const [sourceType, metadata] of Object.entries(metadataRecords)) {
      const source = sources[sourceType as MetadataSourceType]
      const metrics = performanceMetrics?.[sourceType as MetadataSourceType]

      if (source) {
        const score = calculateQualityScore(metadata, source, metrics)
        if (score) {
          rankings.push({source: sourceType as MetadataSourceType, score})
        }
      }
    }

    return rankings.sort((a, b) => b.score.overall - a.score.overall)
  }

  /**
   * Get quality statistics across multiple episodes.
   */
  const getQualityStatistics = (
    episodeMetadata: Record<string, EpisodeMetadata>,
    sources: Record<MetadataSourceType, MetadataSource>,
  ): {
    averageQuality: number
    qualityDistribution: Record<QualityGrade, number>
    sourceRankings: Record<MetadataSourceType, number>
    commonIssues: string[]
  } => {
    const allScores: QualityScoreBreakdown[] = []
    const sourceScores: Record<MetadataSourceType, number[]> = {} as Record<
      MetadataSourceType,
      number[]
    >

    for (const metadata of Object.values(episodeMetadata)) {
      const source = sources[metadata.dataSource]
      if (source) {
        const score = calculateQualityScore(metadata, source)
        if (score) {
          allScores.push(score)

          if (!sourceScores[metadata.dataSource]) {
            sourceScores[metadata.dataSource] = []
          }
          sourceScores[metadata.dataSource].push(score.overall)
        }
      }
    }

    const averageQuality =
      allScores.reduce((sum, score) => sum + score.overall, 0) / allScores.length

    const qualityDistribution: Record<QualityGrade, number> = {
      excellent: 0,
      good: 0,
      acceptable: 0,
      poor: 0,
      insufficient: 0,
    }

    for (const score of allScores) {
      qualityDistribution[score.qualityGrade]++
    }

    // Convert counts to percentages
    const totalScores = allScores.length
    const gradeKeys: QualityGrade[] = ['excellent', 'good', 'acceptable', 'poor', 'insufficient']
    for (const grade of gradeKeys) {
      qualityDistribution[grade] = (qualityDistribution[grade] / totalScores) * 100
    }

    const sourceRankings: Record<MetadataSourceType, number> = {} as Record<
      MetadataSourceType,
      number
    >
    for (const [source, scores] of Object.entries(sourceScores)) {
      sourceRankings[source as MetadataSourceType] =
        scores.reduce((sum, score) => sum + score, 0) / scores.length
    }

    const commonIssues = extractCommonIssues(allScores)

    return {
      averageQuality,
      qualityDistribution,
      sourceRankings,
      commonIssues,
    }
  }

  return {
    calculateQualityScore,
    rankSources,
    getQualityStatistics,
    updateConfig: (newConfig: Partial<QualityScoringConfig>) => {
      Object.assign(scoringConfig, newConfig)
    },
    getConfig: () => ({...scoringConfig}),
  }
}

// ============================================================================
// SCORING ALGORITHMS
// ============================================================================

/**
 * Calculate completeness score based on available metadata fields.
 */
const calculateCompletenessScore = (metadata: EpisodeMetadata): number => {
  const config = DEFAULT_QUALITY_SCORING_CONFIG
  const metadataRecord = metadata as unknown as Record<string, unknown>

  let totalWeight = 0
  let presentWeight = 0

  for (const [fieldName, importance] of Object.entries(config.fieldImportance)) {
    totalWeight += importance

    const fieldValue = metadataRecord[fieldName]
    if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
      // Check if it's an array that's not empty or a string that's not empty
      if (Array.isArray(fieldValue)) {
        if (fieldValue.length > 0) {
          presentWeight += importance
        }
      } else if (typeof fieldValue === 'string') {
        if (fieldValue.trim().length > 0) {
          presentWeight += importance
        }
      } else {
        presentWeight += importance
      }
    }
  }

  return totalWeight > 0 ? presentWeight / totalWeight : 0
}

/**
 * Calculate accuracy score based on field validation and source confidence.
 */
const calculateAccuracyScore = (
  metadata: EpisodeMetadata,
  performanceMetrics?: SourcePerformanceMetrics,
): number => {
  let accuracyScore = metadata.confidenceScore || 0.5

  // Factor in field validation if available
  if (metadata.fieldValidation) {
    const validationScores: number[] = []
    for (const validation of Object.values(metadata.fieldValidation)) {
      validationScores.push(validation.isValid ? 1 : 0)
    }

    if (validationScores.length > 0) {
      const validationAverage =
        validationScores.reduce((sum, score) => sum + score, 0) / validationScores.length
      accuracyScore = (accuracyScore + validationAverage) / 2
    }
  }

  // Factor in historical performance metrics
  if (performanceMetrics) {
    accuracyScore = (accuracyScore + performanceMetrics.accuracyRate) / 2
  }

  return Math.min(Math.max(accuracyScore, 0), 1)
}

/**
 * Calculate freshness score based on how recently the metadata was updated.
 */
const calculateFreshnessScore = (metadata: EpisodeMetadata): number => {
  const config = DEFAULT_QUALITY_SCORING_CONFIG.freshnessDecay
  const now = Date.now()
  const lastUpdated = new Date(metadata.lastUpdated).getTime()
  const daysSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60 * 24)

  // Exponential decay with half-life
  const freshness = 0.5 ** (daysSinceUpdate / config.halfLifeDays)

  return Math.max(freshness, config.minimumScore)
}

/**
 * Calculate source reliability score based on source metrics and configuration.
 */
const calculateSourceReliabilityScore = (
  source: MetadataSource,
  performanceMetrics?: SourcePerformanceMetrics,
): number => {
  let reliabilityScore = source.confidenceLevel

  // Factor in uptime and performance
  reliabilityScore = (reliabilityScore + source.reliability.uptime) / 2
  reliabilityScore = (reliabilityScore + source.reliability.accuracy) / 2

  // Factor in performance metrics if available
  if (performanceMetrics) {
    const successRate = performanceMetrics.successfulRequests / performanceMetrics.totalRequests
    reliabilityScore = (reliabilityScore + successRate) / 2
  }

  return Math.min(Math.max(reliabilityScore, 0), 1)
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get quality grade based on overall score.
 */
const getQualityGrade = (score: number): QualityGrade => {
  const config = DEFAULT_QUALITY_SCORING_CONFIG.thresholds

  if (score >= config.excellent) return 'excellent'
  if (score >= config.good) return 'good'
  if (score >= config.acceptable) return 'acceptable'
  if (score >= config.poor) return 'poor'
  return 'insufficient'
}

/**
 * Generate quality improvement recommendations.
 */
const generateRecommendations = (
  metadata: EpisodeMetadata,
  source: MetadataSource,
  scores: {
    completeness: number
    accuracy: number
    freshness: number
    sourceReliability: number
  },
): string[] => {
  const recommendations: string[] = []

  if (scores.completeness < 0.7) {
    recommendations.push('Consider enriching metadata with additional fields from other sources')
  }

  if (scores.accuracy < 0.8) {
    recommendations.push('Validate metadata accuracy against multiple sources')
  }

  if (scores.freshness < 0.6) {
    recommendations.push('Update metadata from source to get latest information')
  }

  if (scores.sourceReliability < 0.7) {
    recommendations.push(
      `Consider using alternative sources with higher reliability than ${source.name}`,
    )
  }

  if (metadata.conflictResolution && metadata.conflictResolution.length > 0) {
    recommendations.push('Review conflict resolution decisions for accuracy')
  }

  return recommendations
}

/**
 * Get list of missing important fields.
 */
const getMissingFields = (metadata: EpisodeMetadata): string[] => {
  const config = DEFAULT_QUALITY_SCORING_CONFIG
  const metadataRecord = metadata as unknown as Record<string, unknown>
  const missing: string[] = []

  for (const [fieldName, importance] of Object.entries(config.fieldImportance)) {
    if (importance >= 0.7) {
      // Only consider important fields
      const fieldValue = metadataRecord[fieldName]
      if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
        missing.push(fieldName)
      }
    }
  }

  return missing
}

/**
 * Get list of fields with low confidence scores.
 */
const getLowConfidenceFields = (metadata: EpisodeMetadata): string[] => {
  const lowConfidence: string[] = []

  if (metadata.fieldValidation) {
    for (const [fieldName, validation] of Object.entries(metadata.fieldValidation)) {
      if (!validation.isValid || (metadata.confidenceScore && metadata.confidenceScore < 0.6)) {
        lowConfidence.push(fieldName)
      }
    }
  }

  return lowConfidence
}

/**
 * Extract common quality issues from score breakdown array.
 */
const extractCommonIssues = (scores: QualityScoreBreakdown[]): string[] => {
  const issueFrequency: Record<string, number> = {}

  for (const score of scores) {
    for (const recommendation of score.recommendations) {
      issueFrequency[recommendation] = (issueFrequency[recommendation] || 0) + 1
    }
  }

  // Return issues that appear in more than 20% of episodes
  const threshold = scores.length * 0.2
  return Object.entries(issueFrequency)
    .filter(([_issue, frequency]) => frequency >= threshold)
    .sort(([_a, freqA], [_b, freqB]) => freqB - freqA)
    .map(([issue]) => issue)
}

/**
 * Type guard for QualityGrade.
 */
export const isValidQualityGrade = (value: unknown): value is QualityGrade => {
  const validGrades: QualityGrade[] = ['excellent', 'good', 'acceptable', 'poor', 'insufficient']
  return typeof value === 'string' && validGrades.includes(value as QualityGrade)
}
