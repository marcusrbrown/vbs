import type {
  FilterState,
  SearchFilterEvents,
  SearchFilterInstance,
  StarTrekEra,
  StarTrekItem,
} from './types.js'
import {starTrekData} from '../data/star-trek-data.js'
import {createSearchPipeline, pipe, starTrekPredicates, tap} from '../utils/composition.js'
import {createEventEmitter} from './events.js'

export const createSearchFilter = (): SearchFilterInstance => {
  // Closure variables for private state
  let currentSearch = ''
  let currentFilter = ''

  // Generic EventEmitter for type-safe event handling
  const eventEmitter = createEventEmitter<SearchFilterEvents>()

  const matchesFilters = (item: StarTrekItem): boolean => {
    return pipe(
      item,
      // Create a predicate that combines search and type filters
      item => {
        const matchesSearch = currentSearch ? starTrekPredicates.byText(currentSearch)(item) : true
        const matchesFilter = currentFilter ? starTrekPredicates.byType(currentFilter)(item) : true

        return matchesSearch && matchesFilter
      },
    )
  }

  const getFilteredData = (): StarTrekEra[] => {
    const searchPipeline = createSearchPipeline(starTrekData, {
      onFilterComplete: (filteredData, _filterState) => {
        // Pipeline handles filtering, just return the result
        return filteredData
      },
    })

    return searchPipeline({search: currentSearch, filter: currentFilter})
  }

  const getCurrentFilters = (): FilterState => {
    return {
      search: currentSearch,
      filter: currentFilter,
    }
  }

  const notifyFilterChange = (): void => {
    pipe(
      getCurrentFilters(),
      // Debug tap to track filter changes
      tap((filterState: FilterState) => {
        // Could add debugging logic here if needed during development
        return filterState
      }),
      // Get filtered data and emit change event
      filterState => {
        const filteredData = getFilteredData()
        eventEmitter.emit('filter-change', {filteredData, filterState})
      },
    )
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
