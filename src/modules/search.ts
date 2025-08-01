import type {
  FilterChangeCallback,
  FilterState,
  SearchFilterInstance,
  StarTrekEra,
  StarTrekItem,
} from './types.js'
import {starTrekData} from '../data/star-trek-data.js'

export const createSearchFilter = (): SearchFilterInstance => {
  // Closure variables for private state
  let currentSearch = ''
  let currentFilter = ''
  const callbacks = {
    onFilterChange: [] as FilterChangeCallback[],
  }

  const matchesFilters = (item: StarTrekItem): boolean => {
    const matchesSearch =
      !currentSearch ||
      item.title.toLowerCase().includes(currentSearch) ||
      item.notes.toLowerCase().includes(currentSearch) ||
      item.year.toLowerCase().includes(currentSearch)

    const matchesFilter = !currentFilter || item.type === currentFilter

    return matchesSearch && matchesFilter
  }

  const getFilteredData = (): StarTrekEra[] => {
    return starTrekData
      .map(era => ({
        ...era,
        items: era.items.filter(item => matchesFilters(item)),
      }))
      .filter(era => era.items.length > 0)
  }

  const notifyFilterChange = (): void => {
    const filteredData = getFilteredData()
    callbacks.onFilterChange.forEach(callback => callback(filteredData))
  }

  const setSearch = (searchTerm: string): void => {
    currentSearch = searchTerm.toLowerCase()
    notifyFilterChange()
  }

  const setFilter = (filterType: string): void => {
    currentFilter = filterType
    notifyFilterChange()
  }

  const onFilterChange = (callback: FilterChangeCallback): void => {
    callbacks.onFilterChange.push(callback)
  }

  const getCurrentFilters = (): FilterState => {
    return {
      search: currentSearch,
      filter: currentFilter,
    }
  }

  // Return public API
  return {
    setSearch,
    setFilter,
    getFilteredData,
    matchesFilters,
    notifyFilterChange,
    onFilterChange,
    getCurrentFilters,
  }
}
