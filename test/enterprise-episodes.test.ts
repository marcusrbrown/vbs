import {describe, expect, it} from 'vitest'

import {starTrekData} from '../src/data/star-trek-data.js'
import {
  hasEpisodeData,
  isEpisode,
  isStarTrekItemWithEpisodes,
  validateEpisodeArray,
} from '../src/modules/types.js'

describe('Enterprise Season 1 Episode Data', () => {
  it('should have Enterprise era with episode data', () => {
    const enterpriseEra = starTrekData.find(era => era.id === 'enterprise')
    expect(enterpriseEra).toBeDefined()

    const entS1 = enterpriseEra?.items.find(item => item.id === 'ent_s1')
    expect(entS1).toBeDefined()
    if (entS1 && hasEpisodeData(entS1)) {
      expect(entS1.episodeData).toBeDefined()
      expect(entS1.episodeData).toHaveLength(26)
    }
  })

  it('should have valid episode data structure', () => {
    const enterpriseEra = starTrekData.find(era => era.id === 'enterprise')
    const entS1 = enterpriseEra?.items.find(item => item.id === 'ent_s1')

    expect(isStarTrekItemWithEpisodes(entS1)).toBe(true)

    if (entS1 && hasEpisodeData(entS1)) {
      expect(validateEpisodeArray(entS1.episodeData)).toBe(true)

      entS1.episodeData.forEach(episode => {
        expect(isEpisode(episode)).toBe(true)
      })
    }
  })

  it('should have correct episode details for Broken Bow', () => {
    const enterpriseEra = starTrekData.find(era => era.id === 'enterprise')
    const entS1 = enterpriseEra?.items.find(item => item.id === 'ent_s1')

    if (entS1 && hasEpisodeData(entS1)) {
      const brokenBow = entS1.episodeData.find(ep => ep.id === 'ent_s1_e01')

      expect(brokenBow).toBeDefined()
      expect(brokenBow?.title).toBe('Broken Bow')
      expect(brokenBow?.season).toBe(1)
      expect(brokenBow?.episode).toBe(1)
      expect(brokenBow?.airDate).toBe('2001-09-26')
      expect(brokenBow?.plotPoints).toContain('First mission of Enterprise NX-01')
      expect(brokenBow?.guestStars).toContain('John Fleck as Silik')
    }
  })

  it('should have episode connections for related episodes', () => {
    const enterpriseEra = starTrekData.find(era => era.id === 'enterprise')
    const entS1 = enterpriseEra?.items.find(item => item.id === 'ent_s1')

    if (entS1 && hasEpisodeData(entS1)) {
      const shadowsOfPJem = entS1.episodeData.find(ep => ep.id === 'ent_s1_e14')
      expect(shadowsOfPJem).toBeDefined()
      expect(shadowsOfPJem?.connections).toHaveLength(1)

      if (shadowsOfPJem?.connections?.[0]) {
        expect(shadowsOfPJem.connections[0].episodeId).toBe('ent_s1_e06')
        expect(shadowsOfPJem.connections[0].connectionType).toBe('event')
      }

      const shockwave = entS1.episodeData.find(ep => ep.id === 'ent_s1_e22')
      expect(shockwave).toBeDefined()
      expect(shockwave?.connections).toHaveLength(1)

      if (shockwave?.connections?.[0]) {
        expect(shockwave.connections[0].episodeId).toBe('ent_s1_e10')
        expect(shockwave.connections[0].connectionType).toBe('storyline')
      }
    }
  })

  it('should have proper episode numbering', () => {
    const enterpriseEra = starTrekData.find(era => era.id === 'enterprise')
    const entS1 = enterpriseEra?.items.find(item => item.id === 'ent_s1')

    if (entS1 && hasEpisodeData(entS1)) {
      const episodeNumbers = entS1.episodeData.map(ep => ep.episode).sort((a, b) => a - b)
      const expectedNumbers = Array.from({length: 26}, (_, i) => i + 1)
      expect(episodeNumbers).toEqual(expectedNumbers)

      entS1.episodeData.forEach(episode => {
        expect(episode.season).toBe(1)
      })
    }
  })

  it('should have comprehensive metadata for each episode', () => {
    const enterpriseEra = starTrekData.find(era => era.id === 'enterprise')
    const entS1 = enterpriseEra?.items.find(item => item.id === 'ent_s1')

    if (entS1 && hasEpisodeData(entS1)) {
      entS1.episodeData.forEach(episode => {
        expect(episode.id).toBeTruthy()
        expect(episode.title).toBeTruthy()
        expect(episode.airDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(episode.synopsis).toBeTruthy()
        expect(Array.isArray(episode.plotPoints)).toBe(true)
        expect(Array.isArray(episode.guestStars)).toBe(true)
        expect(Array.isArray(episode.connections)).toBe(true)

        expect(episode.id).toMatch(/^ent_s1_e\d{2}$/)
      })
    }
  })
})
