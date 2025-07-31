export interface StarTrekItem {
  id: string
  title: string
  type: string
  year: string
  stardate: string
  episodes?: number
  notes: string
}

export interface StarTrekEra {
  id: string
  title: string
  years: string
  stardates: string
  description: string
  items: StarTrekItem[]
}

export interface ProgressData {
  total: number
  completed: number
  percentage: number
}

export interface EraProgress extends ProgressData {
  eraId: string
}

export interface OverallProgress {
  overall: ProgressData
  eraProgress: EraProgress[]
}

export interface FilterState {
  search: string
  filter: string
}

export interface ProgressExportData {
  version: string
  timestamp: string
  progress: string[]
}

export type ItemToggleCallback = (itemId: string, isWatched: boolean) => void
export type ProgressUpdateCallback = (progressData: OverallProgress) => void
export type FilterChangeCallback = (filteredData: StarTrekEra[]) => void

// Factory function return type definitions
export interface ProgressTrackerInstance {
  setWatchedItems(items: string[]): void
  toggleItem(itemId: string): void
  isWatched(itemId: string): boolean
  resetProgress(): void
  getWatchedItems(): string[]
  updateProgress(): void
  calculateOverallProgress(): ProgressData
  calculateEraProgress(): EraProgress[]
  onItemToggle(callback: ItemToggleCallback): void
  onProgressUpdate(callback: ProgressUpdateCallback): void
}

export interface SearchFilterInstance {
  setSearch(searchTerm: string): void
  setFilter(filterType: string): void
  getFilteredData(): StarTrekEra[]
  matchesFilters(item: StarTrekItem): boolean
  notifyFilterChange(): void
  onFilterChange(callback: FilterChangeCallback): void
  getCurrentFilters(): FilterState
}

export interface TimelineRendererInstance {
  render(data: StarTrekEra[]): void
  createEraElement(era: StarTrekEra): HTMLDivElement
  createItemElement(item: StarTrekItem): string
  toggleEra(eraId: string): void
  expandAll(): void
  collapseAll(): void
  updateProgress(progressData: OverallProgress): void
  updateItemStates(): void
  calculateEraProgress(era: StarTrekEra): EraProgress
}
