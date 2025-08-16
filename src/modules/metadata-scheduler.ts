/**
 * Metadata Scheduler Module
 *
 * Provides intelligent scheduling for background metadata enrichment operations based on device
 * and network conditions. Optimizes sync timing to respect user preferences, battery life,
 * and network constraints while ensuring timely metadata updates.
 *
 * Features:
 * - Device condition monitoring (battery, charging, power save mode)
 * - Network condition detection (WiFi, cellular, speed, metered connections)
 * - Intelligent scheduling algorithms with configurable preferences
 * - Peak hour avoidance and rate limiting
 * - Event-driven updates for condition changes
 *
 * @module MetadataScheduler
 */

import type {DeviceCondition, NetworkCondition, SchedulingConfig} from './types.js'
import {createEventEmitter} from './events.js'

interface MetadataSchedulerEvents {
  [eventName: string]: unknown
  'condition-change': {condition: DeviceCondition & NetworkCondition}
  'schedule-update': {config: SchedulingConfig}
}

/**
 * Detect device and network conditions for intelligent scheduling.
 */
const detectConditions = (): DeviceCondition & NetworkCondition => {
  try {
    const connection = 'connection' in navigator ? (navigator as any).connection : null

    return {
      // NetworkCondition properties
      type: connection?.type === 'wifi' ? 'wifi' : 'unknown',
      effectiveType: connection?.effectiveType || '4g',
      isMetered: connection?.saveData || false,
      downlink: connection?.downlink,
      rtt: connection?.rtt,

      // DeviceCondition properties
      isCharging: true, // Simplified for now - will be updated with real battery API
      isPowerSaveMode: false,
    }
  } catch (error) {
    console.warn('Error detecting conditions:', error)
    // Return safe defaults
    return {
      type: 'unknown',
      effectiveType: '4g',
      isMetered: false,
      isCharging: true,
      isPowerSaveMode: false,
    }
  }
}

/**
 * Determine optimal scheduling configuration based on conditions.
 */
const determineScheduling = (condition: DeviceCondition & NetworkCondition): SchedulingConfig => {
  try {
    // Base configuration
    const config: SchedulingConfig = {
      preferWiFi: true,
      avoidPeakHours: true,
      peakHours: {
        start: 18,
        end: 23,
      },
      peakHourLimit: 5,
      lowBatteryThreshold: 0.2,
      pauseWhileCharging: false,
    }

    // Adjust based on network condition
    if (condition.type === 'wifi') {
      config.peakHourLimit = 10 // More aggressive on WiFi
    } else if (condition.isMetered) {
      config.peakHourLimit = 2 // Conservative on metered connections
      config.avoidPeakHours = true
    }

    // Adjust based on battery condition
    if (condition.batteryLevel && condition.batteryLevel < 0.3 && !condition.isCharging) {
      config.peakHourLimit = 1 // Very conservative when battery is low
    }

    // Adjust for power save mode
    if (condition.isPowerSaveMode) {
      config.peakHourLimit = Math.max(1, Math.floor(config.peakHourLimit / 2))
      config.avoidPeakHours = true
    }

    return config
  } catch (error) {
    console.warn('Error determining scheduling:', error)
    // Return safe defaults
    return {
      preferWiFi: true,
      avoidPeakHours: true,
      peakHours: {
        start: 18,
        end: 23,
      },
      peakHourLimit: 3,
      lowBatteryThreshold: 0.2,
      pauseWhileCharging: false,
    }
  }
}

/**
 * Check if current time is within peak hours.
 */
const isCurrentlyPeakHours = (config: SchedulingConfig): boolean => {
  const now = new Date()
  const hour = now.getHours()
  const {start, end} = config.peakHours

  if (start <= end) {
    return hour >= start && hour <= end
  } else {
    // Handle overnight peak hours (e.g., 22:00 to 06:00)
    return hour >= start || hour <= end
  }
}

/**
 * Calculate delay before next sync based on current conditions.
 */
const calculateSyncDelay = (
  config: SchedulingConfig,
  condition: DeviceCondition & NetworkCondition,
): number => {
  const baseDelay = 5 * 60 * 1000 // 5 minutes base

  // Increase delay during peak hours
  if (config.avoidPeakHours && isCurrentlyPeakHours(config)) {
    return baseDelay * 3 // 15 minutes during peak hours
  }

  // Reduce delay on WiFi
  if (config.preferWiFi && condition.type === 'wifi') {
    return baseDelay / 2 // 2.5 minutes on WiFi
  }

  // Increase delay on slow or metered connections
  if (
    condition.isMetered ||
    condition.effectiveType === 'slow-2g' ||
    condition.effectiveType === '2g'
  ) {
    return baseDelay * 2 // 10 minutes on slow/metered
  }

  // Increase delay when battery is low
  if (condition.batteryLevel && condition.batteryLevel < config.lowBatteryThreshold) {
    return baseDelay * 4 // 20 minutes when battery is low
  }

  return baseDelay
}

/**
 * Public API interface for MetadataScheduler instances.
 */
export interface MetadataSchedulerInstance {
  /** Get current device and network conditions */
  getCurrentConditions(): DeviceCondition & NetworkCondition
  /** Get current scheduling configuration */
  getSchedulingConfig(): SchedulingConfig
  /** Update scheduling configuration */
  updateSchedulingConfig(newConfig: Partial<SchedulingConfig>): void
  /** Calculate optimal delay for next sync */
  getOptimalSyncDelay(): number
  /** Check if sync should be allowed now */
  shouldAllowSync(): boolean
  /** Start condition monitoring */
  startMonitoring(): void
  /** Stop condition monitoring */
  stopMonitoring(): void
  /** Cleanup and destroy instance */
  destroy(): void

  // EventEmitter methods
  on<K extends keyof MetadataSchedulerEvents>(
    event: K,
    listener: (payload: MetadataSchedulerEvents[K]) => void,
  ): void
  off<K extends keyof MetadataSchedulerEvents>(
    event: K,
    listener: (payload: MetadataSchedulerEvents[K]) => void,
  ): void
  once<K extends keyof MetadataSchedulerEvents>(
    event: K,
    listener: (payload: MetadataSchedulerEvents[K]) => void,
  ): void
}

/**
 * Create an intelligent metadata scheduler instance.
 *
 * @param initialConfig - Initial scheduling configuration
 * @returns MetadataScheduler instance with intelligent scheduling capabilities
 */
export const createMetadataScheduler = (
  initialConfig?: Partial<SchedulingConfig>,
): MetadataSchedulerInstance => {
  // Private state
  let currentCondition = detectConditions()
  let currentConfig = determineScheduling(currentCondition)
  let monitoringInterval: number | null = null

  // Apply initial configuration overrides
  if (initialConfig) {
    currentConfig = {...currentConfig, ...initialConfig}
  }

  // Event emitter for condition and config changes
  const eventEmitter = createEventEmitter<MetadataSchedulerEvents>()

  /**
   * Update conditions and emit changes if significant.
   */
  const updateConditions = (): void => {
    const newCondition = detectConditions()
    const hasSignificantChange =
      newCondition.type !== currentCondition.type ||
      newCondition.isMetered !== currentCondition.isMetered ||
      newCondition.isCharging !== currentCondition.isCharging ||
      newCondition.isPowerSaveMode !== currentCondition.isPowerSaveMode ||
      Math.abs((newCondition.batteryLevel || 1) - (currentCondition.batteryLevel || 1)) > 0.1

    if (hasSignificantChange) {
      currentCondition = newCondition
      const newConfig = determineScheduling(currentCondition)

      // Update config if scheduling logic suggests changes
      const configChanged =
        newConfig.peakHourLimit !== currentConfig.peakHourLimit ||
        newConfig.avoidPeakHours !== currentConfig.avoidPeakHours

      if (configChanged) {
        currentConfig = newConfig
        eventEmitter.emit('schedule-update', {config: currentConfig})
      }

      eventEmitter.emit('condition-change', {condition: currentCondition})
    }
  }

  return {
    getCurrentConditions: () => ({...currentCondition}),

    getSchedulingConfig: () => ({...currentConfig}),

    updateSchedulingConfig: (newConfig: Partial<SchedulingConfig>) => {
      currentConfig = {...currentConfig, ...newConfig}
      eventEmitter.emit('schedule-update', {config: currentConfig})
    },

    getOptimalSyncDelay: () => calculateSyncDelay(currentConfig, currentCondition),

    shouldAllowSync: () => {
      // Don't sync during peak hours if configured to avoid them
      if (currentConfig.avoidPeakHours && isCurrentlyPeakHours(currentConfig)) {
        return false
      }

      // Don't sync on low battery unless charging
      if (
        currentCondition.batteryLevel &&
        currentCondition.batteryLevel < currentConfig.lowBatteryThreshold &&
        !currentCondition.isCharging
      ) {
        return false
      }

      // Don't sync while charging if configured not to
      if (currentConfig.pauseWhileCharging && currentCondition.isCharging) {
        return false
      }

      return true
    },

    startMonitoring: () => {
      if (monitoringInterval) return

      // Check conditions every 30 seconds
      monitoringInterval = window.setInterval(updateConditions, 30000)

      // Also listen for network and battery events if available
      if ('connection' in navigator) {
        ;(navigator as any).connection?.addEventListener('change', updateConditions)
      }
    },

    stopMonitoring: () => {
      if (monitoringInterval) {
        clearInterval(monitoringInterval)
        monitoringInterval = null
      }

      // Remove event listeners
      if ('connection' in navigator) {
        ;(navigator as any).connection?.removeEventListener('change', updateConditions)
      }
    },

    destroy: () => {
      // Stop monitoring
      if (monitoringInterval) {
        clearInterval(monitoringInterval)
        monitoringInterval = null
      }

      // Clear event listeners
      eventEmitter.removeAllListeners?.()
    },

    // EventEmitter methods
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    once: eventEmitter.once.bind(eventEmitter),
  }
}
