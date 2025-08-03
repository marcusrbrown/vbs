import type {
  FilterState,
  SearchFilterEvents,
  SearchFilterInstance,
  StarTrekEra,
  StarTrekItem,
} from './types.js'
import {starTrekData} from '../data/star-trek-data.js'
import {createEventEmitter} from './events.js'

export const createSearchFilter = (): SearchFilterInstance => {
  // Closure variables for private state
  let currentSearch = ''
  let currentFilter = ''

  // Generic EventEmitter for type-safe event handling
  const eventEmitter = createEventEmitter<SearchFilterEvents>()

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

  const getCurrentFilters = (): FilterState => {
    return {
      search: currentSearch,
      filter: currentFilter,
    }
  }

  const notifyFilterChange = (): void => {
    const filteredData = getFilteredData()
    const filterState = getCurrentFilters()

    eventEmitter.emit('filter-change', {filteredData, filterState})
  }

  const setSearch = (searchTerm: string): void => {
    currentSearch = searchTerm.toLowerCase()
    notifyFilterChange()
  }

  const setFilter = (filterType: string): void => {
    currentFilter = filterType
    notifyFilterChange()
  }

  // Return public API
  return {
    setSearch,
    setFilter,
    getFilteredData,
    matchesFilters,
    notifyFilterChange,
    getCurrentFilters,

    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    once: eventEmitter.once.bind(eventEmitter),
    removeAllListeners: eventEmitter.removeAllListeners.bind(eventEmitter),
  }
}
