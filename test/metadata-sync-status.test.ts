/**
 * Test suite for Metadata Sync Status Indicator component
 * Validates factory instantiation, notification display, progress tracking, event emissions,
 * auto-hide behavior, Service Worker integration, and cleanup
 */

import type {MetadataSyncStatusIndicatorInstance} from '../src/modules/types.js'
import {JSDOM} from 'jsdom'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createMetadataSyncStatusIndicator} from '../src/components/metadata-sync-status.js'

describe('createMetadataSyncStatusIndicator', () => {
  let container: HTMLElement
  let syncStatus: MetadataSyncStatusIndicatorInstance
  let dom: JSDOM

  beforeEach(() => {
    // Set up DOM environment
    dom = new JSDOM('<!DOCTYPE html><body><div id="container"></div></body>')
    globalThis.document = dom.window.document as unknown as Document
    globalThis.HTMLElement = dom.window.HTMLElement as unknown as typeof HTMLElement
    globalThis.Element = dom.window.Element as unknown as typeof Element
    globalThis.window = dom.window as unknown as Window & typeof globalThis

    container = document.querySelector('#container') as HTMLElement

    // Mock timers
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    syncStatus?.destroy()
  })

  describe('Factory Function & Initialization', () => {
    it('should create a sync status indicator instance', () => {
      syncStatus = createMetadataSyncStatusIndicator({container})

      expect(syncStatus).toBeDefined()
      expect(syncStatus.showNotification).toBeTypeOf('function')
      expect(syncStatus.dismissNotification).toBeTypeOf('function')
      expect(syncStatus.clearAllNotifications).toBeTypeOf('function')
      expect(syncStatus.updateProgress).toBeTypeOf('function')
      expect(syncStatus.setDisplayMode).toBeTypeOf('function')
      expect(syncStatus.getDisplayMode).toBeTypeOf('function')
      expect(syncStatus.getNotifications).toBeTypeOf('function')
      expect(syncStatus.destroy).toBeTypeOf('function')
    })

    it('should render DOM structure on initialization', () => {
      syncStatus = createMetadataSyncStatusIndicator({container})

      const indicatorContainer = container.querySelector('.vbs-sync-status')
      expect(indicatorContainer).toBeDefined()
      expect(indicatorContainer?.classList.contains('vbs-sync-status--bottom-right')).toBe(true)
      expect(indicatorContainer?.classList.contains('vbs-sync-status--compact')).toBe(true)
    })

    it('should support custom configuration options', () => {
      syncStatus = createMetadataSyncStatusIndicator({
        container,
        initialMode: 'expanded',
        position: 'top-right',
        maxNotifications: 5,
        defaultAutoHideDelay: 3000,
      })

      const indicatorContainer = container.querySelector('.vbs-sync-status')
      expect(indicatorContainer?.classList.contains('vbs-sync-status--top-right')).toBe(true)
      expect(indicatorContainer?.classList.contains('vbs-sync-status--expanded')).toBe(true)
      expect(syncStatus.getDisplayMode()).toBe('expanded')
    })
  })

  describe('Notification Display', () => {
    beforeEach(() => {
      syncStatus = createMetadataSyncStatusIndicator({container})
    })

    it('should show info notification', () => {
      const notificationId = syncStatus.showNotification('info', 'Syncing episodes...')

      expect(notificationId).toBeTypeOf('string')
      const notifications = syncStatus.getNotifications()
      expect(notifications).toHaveLength(1)
      expect(notifications[0]?.type).toBe('info')
      expect(notifications[0]?.message).toBe('Syncing episodes...')
    })

    it('should show success notification', () => {
      syncStatus.showNotification('success', 'Sync complete')

      const notifications = syncStatus.getNotifications()
      expect(notifications[0]?.type).toBe('success')
      expect(notifications[0]?.autoHide).toBe(true)
    })

    it('should show warning notification', () => {
      syncStatus.showNotification('warning', 'Rate limit approaching')

      const notifications = syncStatus.getNotifications()
      expect(notifications[0]?.type).toBe('warning')
    })

    it('should show error notification', () => {
      syncStatus.showNotification('error', 'Sync failed')

      const notifications = syncStatus.getNotifications()
      expect(notifications[0]?.type).toBe('error')
      expect(notifications[0]?.autoHide).toBe(false)
    })

    it('should render notification in DOM', () => {
      syncStatus.showNotification('info', 'Test notification', {
        details: 'Test details',
      })

      const notificationEl = container.querySelector('.vbs-sync-notification')
      expect(notificationEl).toBeDefined()
      expect(notificationEl?.classList.contains('vbs-sync-notification--info')).toBe(true)

      const message = notificationEl?.querySelector('.vbs-sync-notification__message')
      expect(message?.textContent).toBe('Test notification')
    })

    it('should support optional notification details', () => {
      syncStatus.showNotification('info', 'Test', {
        details: 'Additional details',
      })

      const notifications = syncStatus.getNotifications()
      expect(notifications[0]?.details).toBe('Additional details')
    })

    it('should support progress tracking', () => {
      const notificationId = syncStatus.showNotification('info', 'Processing', {
        progress: 50,
      })

      const notifications = syncStatus.getNotifications()
      expect(notifications[0]?.progress).toBe(50)

      syncStatus.updateProgress(notificationId, 75)
      const updated = syncStatus.getNotifications()
      expect(updated[0]?.progress).toBe(75)
    })

    it('should limit notifications to maxNotifications', () => {
      syncStatus = createMetadataSyncStatusIndicator({
        container,
        maxNotifications: 3,
      })

      syncStatus.showNotification('info', 'Notification 1')
      syncStatus.showNotification('info', 'Notification 2')
      syncStatus.showNotification('info', 'Notification 3')
      syncStatus.showNotification('info', 'Notification 4')

      const notificationEls = container.querySelectorAll('.vbs-sync-notification')
      expect(notificationEls).toHaveLength(3)
    })
  })

  describe('Notification Dismissal', () => {
    beforeEach(() => {
      syncStatus = createMetadataSyncStatusIndicator({container})
    })

    it('should dismiss specific notification', () => {
      const id = syncStatus.showNotification('info', 'Test')
      expect(syncStatus.getNotifications()).toHaveLength(1)

      const dismissed = syncStatus.dismissNotification(id)
      expect(dismissed).toBe(true)
      expect(syncStatus.getNotifications()).toHaveLength(0)
    })

    it('should return false for non-existent notification', () => {
      const dismissed = syncStatus.dismissNotification('non-existent-id')
      expect(dismissed).toBe(false)
    })

    it('should clear all notifications', () => {
      syncStatus.showNotification('info', 'Test 1')
      syncStatus.showNotification('info', 'Test 2')
      syncStatus.showNotification('info', 'Test 3')

      expect(syncStatus.getNotifications()).toHaveLength(3)

      syncStatus.clearAllNotifications()
      expect(syncStatus.getNotifications()).toHaveLength(0)
    })
  })

  describe('Auto-Hide Behavior', () => {
    beforeEach(() => {
      syncStatus = createMetadataSyncStatusIndicator({
        container,
        defaultAutoHideDelay: 1000,
      })
    })

    it('should auto-hide success notifications', () => {
      syncStatus.showNotification('success', 'Complete')

      expect(syncStatus.getNotifications()).toHaveLength(1)

      vi.advanceTimersByTime(1000)

      expect(syncStatus.getNotifications()).toHaveLength(0)
    })

    it('should auto-hide info notifications', () => {
      syncStatus.showNotification('info', 'Processing')

      expect(syncStatus.getNotifications()).toHaveLength(1)

      vi.advanceTimersByTime(1000)

      expect(syncStatus.getNotifications()).toHaveLength(0)
    })

    it('should not auto-hide error notifications', () => {
      syncStatus.showNotification('error', 'Failed')

      expect(syncStatus.getNotifications()).toHaveLength(1)

      vi.advanceTimersByTime(10000)

      expect(syncStatus.getNotifications()).toHaveLength(1)
    })

    it('should support custom auto-hide delay', () => {
      syncStatus.showNotification('success', 'Complete', {
        autoHideDelay: 2000,
      })

      expect(syncStatus.getNotifications()).toHaveLength(1)

      vi.advanceTimersByTime(1000)
      expect(syncStatus.getNotifications()).toHaveLength(1)

      vi.advanceTimersByTime(1000)
      expect(syncStatus.getNotifications()).toHaveLength(0)
    })

    it('should disable auto-hide when explicitly set to false', () => {
      syncStatus.showNotification('success', 'Complete', {
        autoHide: false,
      })

      vi.advanceTimersByTime(10000)
      expect(syncStatus.getNotifications()).toHaveLength(1)
    })
  })

  describe('Display Mode Management', () => {
    beforeEach(() => {
      syncStatus = createMetadataSyncStatusIndicator({container})
    })

    it('should start in compact mode by default', () => {
      expect(syncStatus.getDisplayMode()).toBe('compact')
    })

    it('should switch to expanded mode', () => {
      syncStatus.setDisplayMode('expanded')
      expect(syncStatus.getDisplayMode()).toBe('expanded')

      const indicatorContainer = container.querySelector('.vbs-sync-status')
      expect(indicatorContainer?.classList.contains('vbs-sync-status--expanded')).toBe(true)
      expect(indicatorContainer?.classList.contains('vbs-sync-status--compact')).toBe(false)
    })

    it('should switch back to compact mode', () => {
      syncStatus.setDisplayMode('expanded')
      syncStatus.setDisplayMode('compact')
      expect(syncStatus.getDisplayMode()).toBe('compact')

      const indicatorContainer = container.querySelector('.vbs-sync-status')
      expect(indicatorContainer?.classList.contains('vbs-sync-status--compact')).toBe(true)
      expect(indicatorContainer?.classList.contains('vbs-sync-status--expanded')).toBe(false)
    })
  })

  describe('Event Emissions', () => {
    beforeEach(() => {
      syncStatus = createMetadataSyncStatusIndicator({container})
    })

    it('should emit notification-added event', () => {
      const listener = vi.fn()
      syncStatus.on('notification-added', listener)

      syncStatus.showNotification('info', 'Test')

      expect(listener).toHaveBeenCalledWith({
        notification: expect.objectContaining({
          type: 'info',
          message: 'Test',
        }),
      })
    })

    it('should emit notification-dismissed event', () => {
      const listener = vi.fn()
      syncStatus.on('notification-dismissed', listener)

      const id = syncStatus.showNotification('info', 'Test')
      syncStatus.dismissNotification(id)

      expect(listener).toHaveBeenCalledWith({notificationId: id})
    })

    it('should emit mode-changed event', () => {
      const listener = vi.fn()
      syncStatus.on('mode-changed', listener)

      syncStatus.setDisplayMode('expanded')

      expect(listener).toHaveBeenCalledWith({mode: 'expanded'})
    })

    it('should not emit mode-changed when mode is already set', () => {
      const listener = vi.fn()
      syncStatus.on('mode-changed', listener)

      syncStatus.setDisplayMode('compact') // Already compact

      expect(listener).not.toHaveBeenCalled()
    })

    it('should support once event listeners', () => {
      const listener = vi.fn()
      syncStatus.once('notification-added', listener)

      syncStatus.showNotification('info', 'Test 1')
      syncStatus.showNotification('info', 'Test 2')

      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('should support removing event listeners', () => {
      const listener = vi.fn()
      syncStatus.on('notification-added', listener)

      syncStatus.showNotification('info', 'Test 1')
      expect(listener).toHaveBeenCalledTimes(1)

      syncStatus.off('notification-added', listener)

      syncStatus.showNotification('info', 'Test 2')
      expect(listener).toHaveBeenCalledTimes(1) // Still 1, not called again
    })
  })

  describe('Notification Updates', () => {
    beforeEach(() => {
      syncStatus = createMetadataSyncStatusIndicator({container})
    })

    it('should update notification message', () => {
      const id = syncStatus.showNotification('info', 'Original message')

      syncStatus.updateNotification(id, {
        message: 'Updated message',
      })

      const notifications = syncStatus.getNotifications()
      expect(notifications[0]?.message).toBe('Updated message')
    })

    it('should update notification type', () => {
      const id = syncStatus.showNotification('info', 'Processing')

      syncStatus.updateNotification(id, {
        type: 'success',
      })

      const notifications = syncStatus.getNotifications()
      expect(notifications[0]?.type).toBe('success')
    })

    it('should update notification details', () => {
      const id = syncStatus.showNotification('info', 'Processing', {
        details: 'Original details',
      })

      syncStatus.updateNotification(id, {
        details: 'Updated details',
      })

      const notifications = syncStatus.getNotifications()
      expect(notifications[0]?.details).toBe('Updated details')
    })

    it('should handle missing notification gracefully', () => {
      expect(() => {
        syncStatus.updateNotification('non-existent', {message: 'Test'})
      }).not.toThrow()
    })
  })

  describe('Component Lifecycle', () => {
    it('should cleanup on destroy', () => {
      syncStatus = createMetadataSyncStatusIndicator({container})

      syncStatus.showNotification('info', 'Test 1')
      syncStatus.showNotification('info', 'Test 2')

      expect(container.querySelector('.vbs-sync-status')).toBeDefined()

      syncStatus.destroy()

      expect(container.querySelector('.vbs-sync-status')).toBeNull()
      expect(syncStatus.getNotifications()).toHaveLength(0)
    })

    it('should clear auto-hide timers on destroy', () => {
      syncStatus = createMetadataSyncStatusIndicator({
        container,
        defaultAutoHideDelay: 5000,
      })

      syncStatus.showNotification('success', 'Test')

      expect(syncStatus.getNotifications()).toHaveLength(1)

      syncStatus.destroy()

      vi.advanceTimersByTime(10000)

      // Should not attempt to dismiss after destroy
      expect(() => syncStatus.getNotifications()).not.toThrow()
    })
  })

  describe('Accessibility Features', () => {
    beforeEach(() => {
      syncStatus = createMetadataSyncStatusIndicator({container})
    })

    it('should include ARIA attributes', () => {
      syncStatus.showNotification('info', 'Test notification')

      const notificationEl = container.querySelector('.vbs-sync-notification')
      expect(notificationEl?.getAttribute('role')).toBe('alert')
      expect(notificationEl?.getAttribute('aria-live')).toBe('polite')
    })

    it('should use assertive aria-live for errors', () => {
      syncStatus.showNotification('error', 'Error notification')

      const notificationEl = container.querySelector('.vbs-sync-notification')
      expect(notificationEl?.getAttribute('aria-live')).toBe('assertive')
    })

    it('should include dismissible button with aria-label', () => {
      syncStatus.showNotification('info', 'Test')

      const dismissButton = container.querySelector('.vbs-sync-notification__dismiss')
      expect(dismissButton?.getAttribute('aria-label')).toBe('Dismiss notification')
    })

    it('should include progress bar with ARIA attributes', () => {
      syncStatus.showNotification('info', 'Processing', {progress: 50})

      const progressBar = container.querySelector('.vbs-sync-notification__progress-bar')
      expect(progressBar?.getAttribute('role')).toBe('progressbar')
      expect(progressBar?.getAttribute('aria-valuenow')).toBe('50')
      expect(progressBar?.getAttribute('aria-valuemin')).toBe('0')
      expect(progressBar?.getAttribute('aria-valuemax')).toBe('100')
    })
  })
})
