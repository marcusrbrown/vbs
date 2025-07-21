import type {FilterChangeCallback, FilterState, StarTrekEra, StarTrekItem} from './types.js'
import {starTrekData} from '../data/star-trek-data.js'

export class SearchFilter {
  private currentSearch: string
  private currentFilter: string
  private callbacks: {
    onFilterChange: FilterChangeCallback[]
  }

  constructor() {
    this.currentSearch = ''
    this.currentFilter = ''
    this.callbacks = {
      onFilterChange: [],
    }
  }

  setSearch(searchTerm: string): void {
    this.currentSearch = searchTerm.toLowerCase()
    this.notifyFilterChange()
  }

  setFilter(filterType: string): void {
    this.currentFilter = filterType
    this.notifyFilterChange()
  }

  getFilteredData(): StarTrekEra[] {
    return starTrekData
      .map(era => ({
        ...era,
        items: era.items.filter(item => this.matchesFilters(item)),
      }))
      .filter(era => era.items.length > 0)
  }

  matchesFilters(item: StarTrekItem): boolean {
    const matchesSearch =
      !this.currentSearch ||
      item.title.toLowerCase().includes(this.currentSearch) ||
      item.notes.toLowerCase().includes(this.currentSearch) ||
      item.year.toLowerCase().includes(this.currentSearch)

    const matchesFilter = !this.currentFilter || item.type === this.currentFilter

    return matchesSearch && matchesFilter
  }

  notifyFilterChange(): void {
    const filteredData = this.getFilteredData()
    this.callbacks.onFilterChange.forEach(callback => callback(filteredData))
  }

  onFilterChange(callback: FilterChangeCallback): void {
    this.callbacks.onFilterChange.push(callback)
  }

  getCurrentFilters(): FilterState {
    return {
      search: this.currentSearch,
      filter: this.currentFilter,
    }
  }
}
