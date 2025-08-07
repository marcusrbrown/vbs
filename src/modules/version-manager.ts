/**
 * Version Management System for VBS
 * Handles schema evolution, compatibility checks, and version migrations
 */

import {withSyncErrorHandling} from './error-handler.js'

/**
 * Version information structure for tracking schema evolution.
 */
export interface VersionInfo {
  major: number
  minor: number
  patch: number
  prerelease?: string
  build?: string
}

/**
 * Schema version mapping for different data structures.
 */
export interface SchemaVersionMap {
  storage: VersionInfo
  progress: VersionInfo
  episodes: VersionInfo
  preferences: VersionInfo
  migration: VersionInfo
}

/**
 * Version compatibility matrix for forward/backward compatibility checks.
 */
export interface CompatibilityMatrix {
  backward: {
    storage: VersionInfo[]
    progress: VersionInfo[]
    episodes: VersionInfo[]
    preferences: VersionInfo[]
    migration: VersionInfo[]
  }
  forward: {
    storage: VersionInfo[]
    progress: VersionInfo[]
    episodes: VersionInfo[]
    preferences: VersionInfo[]
    migration: VersionInfo[]
  }
}

/**
 * Version migration strategy for handling schema changes.
 */
export interface MigrationStrategy {
  from: VersionInfo
  to: VersionInfo
  strategy: 'automatic' | 'manual' | 'unsupported'
  migrationFunction?: (data: unknown) => unknown
  warningMessage?: string
}

// Current application versions
export const CURRENT_VERSIONS: SchemaVersionMap = {
  storage: {major: 2, minor: 0, patch: 0},
  progress: {major: 2, minor: 0, patch: 0},
  episodes: {major: 1, minor: 0, patch: 0},
  preferences: {major: 1, minor: 0, patch: 0},
  migration: {major: 1, minor: 0, patch: 0},
}

// Version compatibility matrix
export const COMPATIBILITY_MATRIX: CompatibilityMatrix = {
  backward: {
    storage: [
      {major: 1, minor: 0, patch: 0},
      {major: 1, minor: 1, patch: 0},
    ],
    progress: [{major: 1, minor: 0, patch: 0}],
    episodes: [],
    preferences: [],
    migration: [],
  },
  forward: {
    storage: [
      {major: 2, minor: 1, patch: 0},
      {major: 2, minor: 2, patch: 0},
    ],
    progress: [{major: 2, minor: 1, patch: 0}],
    episodes: [{major: 1, minor: 1, patch: 0}],
    preferences: [{major: 1, minor: 1, patch: 0}],
    migration: [{major: 1, minor: 1, patch: 0}],
  },
}

/**
 * Version management factory function for handling schema evolution.
 */
export const createVersionManager = () => {
  const VERSION_STORAGE_KEY = 'vbs_version_info'

  /**
   * Parse version string into VersionInfo object.
   * Supports semantic versioning format (1.2.3-alpha.1+build.123)
   */
  const parseVersion = withSyncErrorHandling((versionString: string): VersionInfo => {
    const versionRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([a-z\d.-]+))?(?:\+([a-z\d.-]+))?$/i
    const match = versionString.match(versionRegex)

    if (!match || !match[1] || !match[2] || !match[3]) {
      throw new Error(`Invalid version format: ${versionString}`)
    }

    const result: VersionInfo = {
      major: Number.parseInt(match[1], 10),
      minor: Number.parseInt(match[2], 10),
      patch: Number.parseInt(match[3], 10),
    }

    if (match[4]) {
      result.prerelease = match[4]
    }

    if (match[5]) {
      result.build = match[5]
    }

    return result
  }, 'parseVersion')

  /**
   * Convert VersionInfo object to semantic version string.
   */
  const formatVersion = (version: VersionInfo): string => {
    let versionString = `${version.major}.${version.minor}.${version.patch}`

    if (version.prerelease) {
      versionString += `-${version.prerelease}`
    }

    if (version.build) {
      versionString += `+${version.build}`
    }

    return versionString
  }

  /**
   * Compare two versions using semantic versioning rules.
   * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
   */
  const compareVersions = (v1: VersionInfo, v2: VersionInfo): number => {
    if (v1.major !== v2.major) {
      return v1.major < v2.major ? -1 : 1
    }

    if (v1.minor !== v2.minor) {
      return v1.minor < v2.minor ? -1 : 1
    }

    if (v1.patch !== v2.patch) {
      return v1.patch < v2.patch ? -1 : 1
    }

    // Compare prerelease versions
    if (v1.prerelease && !v2.prerelease) {
      return -1 // prerelease < release
    }

    if (!v1.prerelease && v2.prerelease) {
      return 1 // release > prerelease
    }

    if (v1.prerelease && v2.prerelease) {
      return v1.prerelease.localeCompare(v2.prerelease)
    }

    return 0 // versions are equal
  }

  /**
   * Check if version v1 is compatible with version v2.
   */
  const isCompatible = (v1: VersionInfo, schema: keyof SchemaVersionMap): boolean => {
    const isBackwardCompatible = COMPATIBILITY_MATRIX.backward[schema].some(
      (compatibleVersion: VersionInfo) => compareVersions(v1, compatibleVersion) === 0,
    )

    const isForwardCompatible = COMPATIBILITY_MATRIX.forward[schema].some(
      (compatibleVersion: VersionInfo) => compareVersions(v1, compatibleVersion) === 0,
    )

    const isCurrentVersion = compareVersions(v1, CURRENT_VERSIONS[schema]) === 0

    return isBackwardCompatible || isForwardCompatible || isCurrentVersion
  }

  /**
   * Get stored version information from localStorage.
   */
  const getStoredVersions = withSyncErrorHandling((): SchemaVersionMap | null => {
    const stored = localStorage.getItem(VERSION_STORAGE_KEY)
    if (!stored) {
      return null
    }

    return JSON.parse(stored) as SchemaVersionMap
  }, 'getStoredVersions')

  /**
   * Save version information to localStorage.
   */
  const saveVersions = withSyncErrorHandling((versions: SchemaVersionMap): void => {
    localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(versions))
  }, 'saveVersions')

  /**
   * Check if schema migration is needed for any data structure.
   */
  const isMigrationNeeded = (): {
    needed: boolean
    schemas: (keyof SchemaVersionMap)[]
    strategies: MigrationStrategy[]
  } => {
    const storedVersions = getStoredVersions()

    if (!storedVersions) {
      // First time setup - no migration needed
      return {needed: false, schemas: [], strategies: []}
    }

    const schemasNeedingMigration: (keyof SchemaVersionMap)[] = []
    const migrationStrategies: MigrationStrategy[] = []

    for (const [schema, currentVersion] of Object.entries(CURRENT_VERSIONS) as [
      keyof SchemaVersionMap,
      VersionInfo,
    ][]) {
      const storedVersion = storedVersions[schema]

      if (compareVersions(storedVersion, currentVersion) !== 0) {
        schemasNeedingMigration.push(schema)

        // Determine migration strategy
        const isCompatible_ = isCompatible(storedVersion, schema)
        const strategy: MigrationStrategy = {
          from: storedVersion,
          to: currentVersion,
          strategy: isCompatible_ ? 'automatic' : 'manual',
        }

        if (!isCompatible_) {
          strategy.warningMessage = `Manual migration required for ${schema} from ${formatVersion(storedVersion)} to ${formatVersion(currentVersion)}`
        }

        migrationStrategies.push(strategy)
      }
    }

    return {
      needed: schemasNeedingMigration.length > 0,
      schemas: schemasNeedingMigration,
      strategies: migrationStrategies,
    }
  }

  /**
   * Initialize version tracking for first-time setup.
   */
  const initializeVersions = withSyncErrorHandling((): void => {
    const existingVersions = getStoredVersions()

    if (!existingVersions) {
      saveVersions(CURRENT_VERSIONS)
    }
  }, 'initializeVersions')

  /**
   * Update version information after successful migration.
   */
  const updateVersions = withSyncErrorHandling((updates: Partial<SchemaVersionMap>): void => {
    const currentVersions = getStoredVersions() || CURRENT_VERSIONS

    const updatedVersions: SchemaVersionMap = {
      ...currentVersions,
      ...updates,
    }

    saveVersions(updatedVersions)
  }, 'updateVersions')

  /**
   * Validate data structure version compatibility.
   */
  const validateCompatibility = (
    dataVersion: VersionInfo,
    schema: keyof SchemaVersionMap,
  ): {
    compatible: boolean
    strategy: 'use-as-is' | 'migrate' | 'reject'
    message: string
  } => {
    const currentVersion = CURRENT_VERSIONS[schema]
    const comparison = compareVersions(dataVersion, currentVersion)

    if (comparison === 0) {
      return {
        compatible: true,
        strategy: 'use-as-is',
        message: 'Data version matches current version',
      }
    }

    const compatible = isCompatible(dataVersion, schema)

    if (compatible) {
      return {
        compatible: true,
        strategy: 'migrate',
        message: `Data version ${formatVersion(dataVersion)} is compatible and can be migrated to ${formatVersion(currentVersion)}`,
      }
    }

    return {
      compatible: false,
      strategy: 'reject',
      message: `Data version ${formatVersion(dataVersion)} is not compatible with current version ${formatVersion(currentVersion)}`,
    }
  }

  return {
    parseVersion,
    formatVersion,
    compareVersions,
    isCompatible,
    getStoredVersions,
    saveVersions,
    isMigrationNeeded,
    initializeVersions,
    updateVersions,
    validateCompatibility,
    // Constants
    CURRENT_VERSIONS,
    COMPATIBILITY_MATRIX,
  }
}

/**
 * Global version manager instance for the application.
 */
export const versionManager = createVersionManager()
