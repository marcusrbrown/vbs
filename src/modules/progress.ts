import type {
  EraProgress,
  ItemToggleCallback,
  ProgressData,
  ProgressUpdateCallback,
} from './types.js'
import {starTrekData} from '../data/star-trek-data.js'

export class ProgressTracker {
  private watchedItems: string[]
  private callbacks: {
    onItemToggle: ItemToggleCallback[]
    onProgressUpdate: ProgressUpdateCallback[]
  }

  constructor() {
    this.watchedItems = []
    this.callbacks = {
      onItemToggle: [],
      onProgressUpdate: [],
    }
  }

  setWatchedItems(items: string[]): void {
    this.watchedItems = Array.isArray(items) ? items : []
    this.updateProgress()
  }

  toggleItem(itemId: string): void {
    const isWatched = this.watchedItems.includes(itemId)

    if (isWatched) {
      this.watchedItems = this.watchedItems.filter(id => id !== itemId)
    } else {
      this.watchedItems.push(itemId)
    }

    this.callbacks.onItemToggle.forEach(callback => callback(itemId, !isWatched))
    this.updateProgress()
  }

  isWatched(itemId: string): boolean {
    return this.watchedItems.includes(itemId)
  }

  resetProgress(): void {
    this.watchedItems = []
    this.updateProgress()
  }

  getWatchedItems(): string[] {
    return [...this.watchedItems]
  }

  updateProgress(): void {
    const overall = this.calculateOverallProgress()
    const eraProgress = this.calculateEraProgress()

    this.callbacks.onProgressUpdate.forEach(callback => callback({overall, eraProgress}))
  }

  calculateOverallProgress(): ProgressData {
    const totalItems = starTrekData.reduce((sum, era) => sum + era.items.length, 0)
    const completedItems = this.watchedItems.length
    const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

    return {
      total: totalItems,
      completed: completedItems,
      percentage,
    }
  }

  calculateEraProgress(): EraProgress[] {
    return starTrekData.map(era => {
      const completedItems = era.items.filter(item => this.watchedItems.includes(item.id)).length
      const totalItems = era.items.length
      const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

      return {
        eraId: era.id,
        total: totalItems,
        completed: completedItems,
        percentage,
      }
    })
  }

  onItemToggle(callback: ItemToggleCallback): void {
    this.callbacks.onItemToggle.push(callback)
  }

  onProgressUpdate(callback: ProgressUpdateCallback): void {
    this.callbacks.onProgressUpdate.push(callback)
  }
}
