import {beforeEach, describe, expect, it} from 'vitest'
import {SearchFilter} from '../src/modules/search.js'

describe('SearchFilter', () => {
  let searchFilter: SearchFilter

  beforeEach(() => {
    searchFilter = new SearchFilter()
  })

  it('should initialize with empty filters', () => {
    const filters = searchFilter.getCurrentFilters()
    expect(filters.search).toBe('')
    expect(filters.filter).toBe('')
  })

  it('should set search term', () => {
    searchFilter.setSearch('Enterprise')
    expect(searchFilter.getCurrentFilters().search).toBe('enterprise')
  })

  it('should set filter type', () => {
    searchFilter.setFilter('movie')
    expect(searchFilter.getCurrentFilters().filter).toBe('movie')
  })

  it('should match items correctly', () => {
    const testItem = {
      id: 'ent_s1',
      title: 'Star Trek: Enterprise',
      notes: 'First warp flight era',
      year: '2151',
      type: 'series',
      stardate: '~1.1-1.26',
    }

    searchFilter.setSearch('enterprise')
    expect(searchFilter.matchesFilters(testItem)).toBe(true)

    searchFilter.setSearch('voyager')
    expect(searchFilter.matchesFilters(testItem)).toBe(false)

    searchFilter.setSearch('')
    searchFilter.setFilter('series')
    expect(searchFilter.matchesFilters(testItem)).toBe(true)

    searchFilter.setFilter('movie')
    expect(searchFilter.matchesFilters(testItem)).toBe(false)
  })
})
