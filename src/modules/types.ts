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
