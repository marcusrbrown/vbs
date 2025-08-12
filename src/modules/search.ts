import type {
  FilterState,
  SearchFilterEvents,
  SearchFilterInstance,
  StarTrekEra,
  StarTrekItem,
  StreamingApiInstance,
} from './types.js'
import {starTrekData} from '../data/star-trek-data.js'
import {createSearchPipeline, pipe, starTrekPredicates, tap} from '../utils/composition.js'
import {createEventEmitter} from './events.js'

export const createSearchFilter = (streamingApi?: StreamingApiInstance): SearchFilterInstance => {
  // Closure variables for private state
  let currentSearch = ''
  let currentFilter = ''
  let currentStreamingPlatforms: string[] = []
  let currentAvailabilityOnly = false
  let currentAvailabilityType: string[] = []
  let currentMaxPrice: number | undefined

  // Generic EventEmitter for type-safe event handling
  const eventEmitter = createEventEmitter<SearchFilterEvents>()

  /**
   * Check if item matches streaming availability criteria
   */
  const matchesStreamingCriteria = async (item: StarTrekItem): Promise<boolean> => {
    if (!streamingApi) {
      return true // No streaming API available, skip streaming filters
    }

    if (
      !currentAvailabilityOnly &&
      currentStreamingPlatforms.length === 0 &&
      currentAvailabilityType.length === 0 &&
      !currentMaxPrice
    ) {
      return true // No streaming filters applied
    }

    try {
      const availability = await streamingApi.getAvailability(item.id)

      if (currentAvailabilityOnly && availability.length === 0) {
        return false // Require availability but none found
      }

      if (currentStreamingPlatforms.length > 0) {
        const hasMatchingPlatform = availability.some(avail =>
          currentStreamingPlatforms.includes(avail.platform.id),
        )
        if (!hasMatchingPlatform) {
          return false
        }
      }

      if (currentAvailabilityType.length > 0) {
        const hasMatchingType = availability.some(avail =>
          currentAvailabilityType.includes(avail.type),
        )
        if (!hasMatchingType) {
          return false
        }
      }

      if (currentMaxPrice !== undefined) {
        const withinPriceRange = availability.some(
          avail => !avail.price || (avail.price && avail.price.amount <= (currentMaxPrice ?? 0)),
        )
        if (!withinPriceRange) {
          return false
        }
      }

      return true
    } catch (error) {
      console.warn(`Failed to check streaming availability for ${item.id}:`, error)
      return !currentAvailabilityOnly // If error and availability required, exclude; otherwise include
    }
  }

  const matchesFilters = async (item: StarTrekItem): Promise<boolean> => {
    return pipe(
      item,
      // Create a predicate that combines search and type filters
      async item => {
        const matchesSearch = currentSearch ? starTrekPredicates.byText(currentSearch)(item) : true
        const matchesTypeFilter = currentFilter
          ? starTrekPredicates.byType(currentFilter)(item)
          : true
        const matchesStreaming = await matchesStreamingCriteria(item)

        return matchesSearch && matchesTypeFilter && matchesStreaming
      },
    )
  }

  const getFilteredData = async (): Promise<StarTrekEra[]> => {
    const searchPipeline = createSearchPipeline(starTrekData, {
      onFilterComplete: (filteredData, _filterState) => {
        return filteredData
      },
    })

    // First apply basic search and type filters
    const basicFiltered = searchPipeline({search: currentSearch, filter: currentFilter})

    // Then apply streaming filters if API is available
    if (
      streamingApi &&
      (currentAvailabilityOnly ||
        currentStreamingPlatforms.length > 0 ||
        currentAvailabilityType.length > 0 ||
        currentMaxPrice !== undefined)
    ) {
      const streamingFiltered: StarTrekEra[] = []

      for (const era of basicFiltered) {
        const filteredItems: StarTrekItem[] = []

        for (const item of era.items) {
          if (await matchesStreamingCriteria(item)) {
            filteredItems.push(item)
          }
        }

        if (filteredItems.length > 0) {
          streamingFiltered.push({
            ...era,
            items: filteredItems,
          })
        }
      }

      return streamingFiltered
    }

    return basicFiltered
  }

  const getCurrentFilters = (): FilterState => {
    const filters: FilterState = {
      search: currentSearch,
      filter: currentFilter,
    }

    if (currentStreamingPlatforms.length > 0) {
      filters.streamingPlatforms = currentStreamingPlatforms
    }

    if (currentAvailabilityOnly) {
      filters.availabilityOnly = currentAvailabilityOnly
    }

    if (currentAvailabilityType.length > 0) {
      filters.availabilityType = currentAvailabilityType
    }

    if (currentMaxPrice !== undefined) {
      filters.maxPrice = currentMaxPrice
    }

    return filters
  }

  const notifyFilterChange = async (): Promise<void> => {
    pipe(
      getCurrentFilters(),
      // Debug tap to track filter changes
      tap((filterState: FilterState) => {
        return filterState
      }),
      // Get filtered data and emit change event
      async filterState => {
        const filteredData = await getFilteredData()
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

  const setStreamingPlatforms = (platforms: string[]): void => {
    currentStreamingPlatforms = platforms
    notifyFilterChange()
  }

  const setAvailabilityOnly = (availabilityOnly: boolean): void => {
    currentAvailabilityOnly = availabilityOnly
    notifyFilterChange()
  }

  const setAvailabilityType = (types: string[]): void => {
    currentAvailabilityType = types
    notifyFilterChange()
  }

  const setMaxPrice = (maxPrice?: number): void => {
    currentMaxPrice = maxPrice
    notifyFilterChange()
  }

  // Return public API
  return {
    setSearch,
    setFilter,
    setStreamingPlatforms,
    setAvailabilityOnly,
    setAvailabilityType,
    setMaxPrice,
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
