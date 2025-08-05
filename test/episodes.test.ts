import {describe, expect, it} from 'vitest'

import {
  isEpisode,
  isEpisodeConnection,
  isEpisodeProgress,
  isSeasonProgress,
  isStarTrekItemWithEpisodes,
  validateEpisodeArray,
  type Episode,
  type EpisodeConnection,
  type EpisodeProgress,
  type SeasonProgress,
} from '../src/modules/types.js'

describe('Episode Data Types', () => {
  describe('Episode interface', () => {
    it('should create valid episode objects', () => {
      const episode: Episode = {
        id: 'ent_s1_e01',
        title: 'Broken Bow',
        season: 1,
        episode: 1,
        airDate: '2001-09-26',
        stardate: 'None',
        synopsis: 'Captain Archer and his crew embark on their first mission.',
        plotPoints: ['First mission', 'Temporal Cold War introduction'],
        guestStars: ['John Fleck as Silik'],
        connections: [],
      }

      expect(episode.id).toBe('ent_s1_e01')
      expect(episode.title).toBe('Broken Bow')
      expect(episode.season).toBe(1)
      expect(episode.episode).toBe(1)
      expect(episode.plotPoints).toHaveLength(2)
      expect(episode.guestStars).toHaveLength(1)
      expect(episode.connections).toHaveLength(0)
    })
  })

  describe('EpisodeConnection interface', () => {
    it('should create valid episode connections', () => {
      const connection: EpisodeConnection = {
        episodeId: 'ent_s1_e14',
        seriesId: 'ent_s1',
        connectionType: 'event',
        description: 'Direct sequel to "The Andorian Incident"',
      }

      expect(connection.episodeId).toBe('ent_s1_e14')
      expect(connection.connectionType).toBe('event')
    })

    it('should support all connection types', () => {
      const connectionTypes: EpisodeConnection['connectionType'][] = [
        'character',
        'event',
        'storyline',
        'reference',
      ]

      connectionTypes.forEach(type => {
        const connection: EpisodeConnection = {
          episodeId: 'test_episode',
          seriesId: 'test_series',
          connectionType: type,
          description: `Test ${type} connection`,
        }
        expect(connection.connectionType).toBe(type)
      })
    })
  })

  describe('EpisodeProgress interface', () => {
    it('should create valid episode progress', () => {
      const progress: EpisodeProgress = {
        episodeId: 'ent_s1_e01',
        seriesId: 'ent_s1',
        season: 1,
        episode: 1,
        isWatched: true,
        watchedAt: '2025-08-05T10:30:00.000Z',
      }

      expect(progress.episodeId).toBe('ent_s1_e01')
      expect(progress.isWatched).toBe(true)
      expect(progress.watchedAt).toBeDefined()
    })

    it('should work without watchedAt timestamp', () => {
      const progress: EpisodeProgress = {
        episodeId: 'ent_s1_e02',
        seriesId: 'ent_s1',
        season: 1,
        episode: 2,
        isWatched: false,
      }

      expect(progress.isWatched).toBe(false)
      expect(progress.watchedAt).toBeUndefined()
    })
  })

  describe('SeasonProgress interface', () => {
    it('should create valid season progress', () => {
      const episodeProgress: EpisodeProgress[] = [
        {
          episodeId: 'ent_s1_e01',
          seriesId: 'ent_s1',
          season: 1,
          episode: 1,
          isWatched: true,
        },
        {
          episodeId: 'ent_s1_e02',
          seriesId: 'ent_s1',
          season: 1,
          episode: 2,
          isWatched: false,
        },
      ]

      const seasonProgress: SeasonProgress = {
        seriesId: 'ent_s1',
        season: 1,
        total: 26,
        completed: 1,
        percentage: 3.8,
        totalEpisodes: 26,
        watchedEpisodes: 1,
        episodeProgress,
      }

      expect(seasonProgress.seriesId).toBe('ent_s1')
      expect(seasonProgress.season).toBe(1)
      expect(seasonProgress.totalEpisodes).toBe(26)
      expect(seasonProgress.watchedEpisodes).toBe(1)
      expect(seasonProgress.episodeProgress).toHaveLength(2)
    })
  })
})

describe('Episode Type Guards', () => {
  describe('isEpisode', () => {
    it('should validate correct episode objects', () => {
      const validEpisode = {
        id: 'ent_s1_e01',
        title: 'Broken Bow',
        season: 1,
        episode: 1,
        airDate: '2001-09-26',
        stardate: 'None',
        synopsis: 'Test synopsis',
        plotPoints: ['Point 1', 'Point 2'],
        guestStars: ['Guest 1'],
        connections: [],
      }

      expect(isEpisode(validEpisode)).toBe(true)
    })

    it('should reject invalid episode objects', () => {
      const invalidEpisodes = [
        null,
        undefined,
        {},
        {id: 'test'}, // Missing required fields
        {
          id: 'test',
          title: 'Test',
          season: 'not a number', // Wrong type
          episode: 1,
          airDate: '2001-01-01',
          stardate: 'None',
          synopsis: 'Test',
          plotPoints: [],
          guestStars: [],
          connections: [],
        },
        {
          id: 'test',
          title: 'Test',
          season: 1,
          episode: 1,
          airDate: '2001-01-01',
          stardate: 'None',
          synopsis: 'Test',
          plotPoints: 'not an array', // Wrong type
          guestStars: [],
          connections: [],
        },
      ]

      invalidEpisodes.forEach(episode => {
        expect(isEpisode(episode)).toBe(false)
      })
    })
  })

  describe('isEpisodeConnection', () => {
    it('should validate correct connection objects', () => {
      const validConnection = {
        episodeId: 'ent_s1_e14',
        seriesId: 'ent_s1',
        connectionType: 'event',
        description: 'Test connection',
      }

      expect(isEpisodeConnection(validConnection)).toBe(true)
    })

    it('should reject invalid connection objects', () => {
      const invalidConnections = [
        null,
        undefined,
        {},
        {episodeId: 'test'}, // Missing fields
        {
          episodeId: 'test',
          seriesId: 'test',
          connectionType: 'invalid_type', // Invalid connection type
          description: 'Test',
        },
      ]

      invalidConnections.forEach(connection => {
        expect(isEpisodeConnection(connection)).toBe(false)
      })
    })

    it('should validate all connection types', () => {
      const validTypes = ['character', 'event', 'storyline', 'reference']

      validTypes.forEach(type => {
        const connection = {
          episodeId: 'test',
          seriesId: 'test',
          connectionType: type,
          description: 'Test',
        }
        expect(isEpisodeConnection(connection)).toBe(true)
      })
    })
  })

  describe('isEpisodeProgress', () => {
    it('should validate correct progress objects', () => {
      const validProgress = {
        episodeId: 'ent_s1_e01',
        seriesId: 'ent_s1',
        season: 1,
        episode: 1,
        isWatched: true,
        watchedAt: '2025-08-05T10:30:00.000Z',
      }

      expect(isEpisodeProgress(validProgress)).toBe(true)
    })

    it('should validate progress without watchedAt', () => {
      const validProgress = {
        episodeId: 'ent_s1_e01',
        seriesId: 'ent_s1',
        season: 1,
        episode: 1,
        isWatched: false,
      }

      expect(isEpisodeProgress(validProgress)).toBe(true)
    })

    it('should reject invalid progress objects', () => {
      const invalidProgress = [
        null,
        undefined,
        {},
        {episodeId: 'test'}, // Missing fields
        {
          episodeId: 'test',
          seriesId: 'test',
          season: 'not a number', // Wrong type
          episode: 1,
          isWatched: true,
        },
      ]

      invalidProgress.forEach(progress => {
        expect(isEpisodeProgress(progress)).toBe(false)
      })
    })
  })

  describe('isSeasonProgress', () => {
    it('should validate correct season progress objects', () => {
      const validSeasonProgress = {
        seriesId: 'ent_s1',
        season: 1,
        total: 26,
        completed: 10,
        percentage: 38.5,
        totalEpisodes: 26,
        watchedEpisodes: 10,
        episodeProgress: [
          {
            episodeId: 'ent_s1_e01',
            seriesId: 'ent_s1',
            season: 1,
            episode: 1,
            isWatched: true,
          },
        ],
      }

      expect(isSeasonProgress(validSeasonProgress)).toBe(true)
    })

    it('should reject invalid season progress objects', () => {
      const invalidSeasonProgress = [
        null,
        undefined,
        {},
        {seriesId: 'test'}, // Missing fields
        {
          seriesId: 'test',
          season: 1,
          total: 26,
          completed: 10,
          percentage: 38.5,
          totalEpisodes: 26,
          watchedEpisodes: 10,
          episodeProgress: 'not an array', // Wrong type
        },
      ]

      invalidSeasonProgress.forEach(progress => {
        expect(isSeasonProgress(progress)).toBe(false)
      })
    })
  })

  describe('isStarTrekItemWithEpisodes', () => {
    it('should validate StarTrekItem with episode data', () => {
      const validItem = {
        id: 'ent_s1',
        title: 'Enterprise Season 1',
        type: 'series',
        year: '2151',
        stardate: '~1.1-1.26',
        episodes: 26,
        notes: 'Test notes',
        episodeData: [
          {
            id: 'ent_s1_e01',
            title: 'Broken Bow',
            season: 1,
            episode: 1,
            airDate: '2001-09-26',
            stardate: 'None',
            synopsis: 'Test synopsis',
            plotPoints: [],
            guestStars: [],
            connections: [],
          },
        ],
      }

      expect(isStarTrekItemWithEpisodes(validItem)).toBe(true)
    })

    it('should validate StarTrekItem without episode data', () => {
      const validItem = {
        id: 'ent_s1',
        title: 'Enterprise Season 1',
        type: 'series',
        year: '2151',
        stardate: '~1.1-1.26',
        episodes: 26,
        notes: 'Test notes',
      }

      expect(isStarTrekItemWithEpisodes(validItem)).toBe(true)
    })

    it('should reject invalid StarTrekItem objects', () => {
      const invalidItems = [
        null,
        undefined,
        {},
        {id: 'test'}, // Missing required fields
        {
          id: 'test',
          title: 'Test',
          type: 'series',
          year: '2151',
          stardate: 'None',
          notes: 'Test',
          episodeData: 'not an array', // Wrong type
        },
      ]

      invalidItems.forEach(item => {
        expect(isStarTrekItemWithEpisodes(item)).toBe(false)
      })
    })
  })

  describe('validateEpisodeArray', () => {
    it('should validate array of episodes', () => {
      const episodes = [
        {
          id: 'ent_s1_e01',
          title: 'Broken Bow',
          season: 1,
          episode: 1,
          airDate: '2001-09-26',
          stardate: 'None',
          synopsis: 'Test synopsis',
          plotPoints: [],
          guestStars: [],
          connections: [],
        },
        {
          id: 'ent_s1_e02',
          title: 'Fight or Flight',
          season: 1,
          episode: 2,
          airDate: '2001-10-03',
          stardate: 'None',
          synopsis: 'Test synopsis',
          plotPoints: [],
          guestStars: [],
          connections: [],
        },
      ]

      expect(validateEpisodeArray(episodes)).toBe(true)
    })

    it('should reject invalid episode arrays', () => {
      const invalidArrays = [
        [{}], // Invalid episode object
        [null], // Null element
        ['string'], // Wrong type
      ]

      invalidArrays.forEach(array => {
        expect(validateEpisodeArray(array)).toBe(false)
      })
    })

    it('should validate empty array', () => {
      expect(validateEpisodeArray([])).toBe(true)
    })
  })
})
