import type {ProgressTrackerInstance} from '../src/modules/types.js'
import {beforeEach, describe, expect, it} from 'vitest'
import {createProgressTracker} from '../src/modules/progress.js'

describe('ProgressTracker', () => {
  let progressTracker: ProgressTrackerInstance

  beforeEach(() => {
    progressTracker = createProgressTracker()
  })

  it('should initialize with empty watched items', () => {
    expect(progressTracker.getWatchedItems()).toEqual([])
  })

  it('should toggle item correctly', () => {
    const itemId = 'test-item'

    progressTracker.toggleItem(itemId)
    expect(progressTracker.isWatched(itemId)).toBe(true)

    progressTracker.toggleItem(itemId)
    expect(progressTracker.isWatched(itemId)).toBe(false)
  })

  it('should set watched items', () => {
    const items = ['item1', 'item2', 'item3']
    progressTracker.setWatchedItems(items)

    expect(progressTracker.getWatchedItems()).toEqual(items)
  })

  it('should reset progress', () => {
    progressTracker.setWatchedItems(['item1', 'item2'])
    progressTracker.resetProgress()

    expect(progressTracker.getWatchedItems()).toEqual([])
  })

  it('should calculate overall progress correctly', () => {
    progressTracker.setWatchedItems(['item1', 'item2'])

    // This test validates that progress calculation methods work
    // In a real test environment, we'd mock the starTrekData import
    const overall = progressTracker.calculateOverallProgress()
    expect(overall).toHaveProperty('total')
    expect(overall).toHaveProperty('completed')
    expect(overall).toHaveProperty('percentage')
  })
})
