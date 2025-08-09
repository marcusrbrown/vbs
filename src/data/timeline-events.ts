import type {TimelineEvent} from '../modules/types.js'

/**
 * Major chronological events in Star Trek timeline for visualization.
 * Includes galactic events, first contacts, wars, technological developments,
 * and key story moments across all eras and series.
 *
 * Events are ordered chronologically by in-universe date/stardate.
 * Each event can be linked to related Star Trek content items.
 */
export const timelineEvents: TimelineEvent[] = [
  // 22nd Century - Enterprise Era
  {
    id: 'first_warp_flight',
    title: 'First Human Warp Flight',
    date: new Date('2063-04-05'),
    stardate: 'Pre-stardate system',
    type: 'technology',
    description:
      'Zefram Cochrane successfully tests the first human warp drive, leading to first contact with the Vulcans.',
    relatedItems: ['st_fc'], // Star Trek: First Contact
    isWatched: false,
    importance: 'critical',
    eraId: 'enterprise',
    metadata: {
      color: '#4CAF50',
      icon: 'rocket',
      cssClasses: ['critical-event', 'technology-event'],
    },
  },
  {
    id: 'vulcan_first_contact',
    title: 'First Contact with Vulcans',
    date: new Date('2063-04-05'),
    stardate: 'Pre-stardate system',
    type: 'first_contact',
    description:
      "Vulcans make first contact with humanity after detecting warp signatures from Cochrane's flight.",
    relatedItems: ['st_fc', 'ent_s1'],
    isWatched: false,
    importance: 'critical',
    eraId: 'enterprise',
    metadata: {
      color: '#2196F3',
      icon: 'handshake',
      cssClasses: ['critical-event', 'first-contact-event'],
    },
  },
  {
    id: 'enterprise_launch',
    title: 'Enterprise NX-01 Launch',
    date: new Date('2151-04-16'),
    stardate: 'Pre-stardate system',
    type: 'exploration',
    description:
      'The first human deep-space vessel Enterprise NX-01 begins its historic mission under Captain Jonathan Archer.',
    relatedItems: ['ent_s1'],
    isWatched: false,
    importance: 'major',
    eraId: 'enterprise',
    metadata: {
      color: '#FF9800',
      icon: 'ship',
      cssClasses: ['major-event', 'exploration-event'],
    },
  },
  {
    id: 'temporal_cold_war_begins',
    title: 'Temporal Cold War',
    date: new Date('2151-09-26'),
    endDate: new Date('2154-05-26'),
    stardate: 'Pre-stardate system',
    type: 'war',
    description:
      "A conflict involving multiple factions from different time periods, affecting Enterprise's mission.",
    relatedItems: ['ent_s1', 'ent_s2', 'ent_s3', 'ent_s4'],
    isWatched: false,
    importance: 'major',
    eraId: 'enterprise',
    metadata: {
      color: '#9C27B0',
      icon: 'clock',
      cssClasses: ['major-event', 'war-event', 'temporal-event'],
    },
  },
  {
    id: 'xindi_attack_earth',
    title: 'Xindi Attack on Earth',
    date: new Date('2153-04-24'),
    stardate: 'Pre-stardate system',
    type: 'war',
    description:
      'The Xindi probe attacks Earth, killing 7 million people and leading to the Delphic Expanse mission.',
    relatedItems: ['ent_s3'],
    isWatched: false,
    importance: 'critical',
    eraId: 'enterprise',
    metadata: {
      color: '#F44336',
      icon: 'explosion',
      cssClasses: ['critical-event', 'war-event'],
    },
  },
  {
    id: 'coalition_of_planets',
    title: 'Coalition of Planets Founded',
    date: new Date('2155-01-01'),
    stardate: 'Pre-stardate system',
    type: 'political',
    description:
      'Earth, Vulcan, Andoria, and Tellar form the Coalition of Planets, precursor to the Federation.',
    relatedItems: ['ent_s4'],
    isWatched: false,
    importance: 'major',
    eraId: 'enterprise',
    metadata: {
      color: '#3F51B5',
      icon: 'alliance',
      cssClasses: ['major-event', 'political-event'],
    },
  },
  {
    id: 'federation_founding',
    title: 'United Federation of Planets Founded',
    date: new Date('2161-08-12'),
    stardate: 'Pre-stardate system',
    type: 'political',
    description:
      'The United Federation of Planets is officially established with Earth, Vulcan, Andoria, Tellar, and Alpha Centauri as founding members.',
    relatedItems: ['ent_s4'],
    isWatched: false,
    importance: 'critical',
    eraId: 'enterprise',
    metadata: {
      color: '#1976D2',
      icon: 'federation',
      cssClasses: ['critical-event', 'political-event'],
    },
  },

  // 23rd Century - The Original Series Era
  {
    id: 'constitution_class_development',
    title: 'Constitution-class Starships Commissioned',
    date: new Date('2245-01-01'),
    stardate: '2245.1',
    type: 'technology',
    description:
      'The Constitution-class starships, including the Enterprise, are commissioned for deep space exploration.',
    relatedItems: ['tos_s1', 'tos_s2', 'tos_s3'],
    isWatched: false,
    importance: 'major',
    eraId: 'tos',
    metadata: {
      color: '#4CAF50',
      icon: 'starship',
      cssClasses: ['major-event', 'technology-event'],
    },
  },
  {
    id: 'kirk_takes_command',
    title: 'Captain Kirk Takes Command of Enterprise',
    date: new Date('2266-01-01'),
    stardate: '1312.4',
    type: 'series',
    description:
      'James T. Kirk assumes command of the USS Enterprise NCC-1701 and begins the famous five-year mission.',
    relatedItems: ['tos_s1'],
    isWatched: false,
    importance: 'major',
    eraId: 'tos',
    metadata: {
      color: '#FFC107',
      icon: 'captain',
      cssClasses: ['major-event', 'series-event'],
    },
  },
  {
    id: 'first_contact_gorn',
    title: 'First Contact with the Gorn',
    date: new Date('2267-01-01'),
    stardate: '3045.6',
    type: 'first_contact',
    description:
      'Captain Kirk encounters the Gorn Captain at the Metron arena, establishing first contact.',
    relatedItems: ['tos_s1_e18'], // Arena
    isWatched: false,
    importance: 'minor',
    eraId: 'tos',
    metadata: {
      color: '#8BC34A',
      icon: 'alien',
      cssClasses: ['minor-event', 'first-contact-event'],
    },
  },
  {
    id: 'romulan_war_aftermath',
    title: 'First Visual Contact with Romulans',
    date: new Date('2266-12-15'),
    stardate: '1709.2',
    type: 'first_contact',
    description:
      'Enterprise makes first visual contact with Romulans since the Earth-Romulan War, revealing their Vulcan heritage.',
    relatedItems: ['tos_s1_e14'], // Balance of Terror
    isWatched: false,
    importance: 'major',
    eraId: 'tos',
    metadata: {
      color: '#795548',
      icon: 'romulan',
      cssClasses: ['major-event', 'first-contact-event'],
    },
  },
  {
    id: 'klingon_first_encounter',
    title: 'Federation-Klingon Cold War Begins',
    date: new Date('2267-03-23'),
    stardate: '3198.4',
    type: 'war',
    description:
      'Tensions escalate between the Federation and Klingon Empire, beginning a prolonged cold war period.',
    relatedItems: ['tos_s1_e26', 'tos_s2', 'tos_s3'], // Errand of Mercy
    isWatched: false,
    importance: 'major',
    eraId: 'tos',
    metadata: {
      color: '#A1887F',
      icon: 'klingon',
      cssClasses: ['major-event', 'war-event'],
    },
  },
  {
    id: 'vger_encounter',
    title: "V'Ger Encounter",
    date: new Date('2271-01-01'),
    stardate: '7410.2',
    type: 'movie',
    description:
      "Enterprise encounters the massive V'Ger entity threatening Earth, leading to first contact with an evolved Voyager probe.",
    relatedItems: ['st_tmp'],
    isWatched: false,
    importance: 'major',
    eraId: 'tos',
    metadata: {
      color: '#607D8B',
      icon: 'probe',
      cssClasses: ['major-event', 'movie-event'],
    },
  },
  {
    id: 'genesis_project',
    title: "Genesis Project and Khan's Return",
    date: new Date('2285-01-01'),
    stardate: '8130.3',
    type: 'movie',
    description:
      "Khan Noonien Singh returns, leading to the Genesis Project crisis and Spock's sacrifice.",
    relatedItems: ['st_twok'],
    isWatched: false,
    importance: 'critical',
    eraId: 'tos',
    metadata: {
      color: '#E91E63',
      icon: 'genesis',
      cssClasses: ['critical-event', 'movie-event'],
    },
  },

  // 24th Century - The Next Generation Era
  {
    id: 'tng_enterprise_d_launch',
    title: 'Enterprise-D Commissioned',
    date: new Date('2363-10-04'),
    stardate: '40759.5',
    type: 'technology',
    description:
      'The Galaxy-class USS Enterprise NCC-1701-D is commissioned under Captain Jean-Luc Picard.',
    relatedItems: ['tng_s1'],
    isWatched: false,
    importance: 'major',
    eraId: 'tng',
    metadata: {
      color: '#2196F3',
      icon: 'enterprise-d',
      cssClasses: ['major-event', 'technology-event'],
    },
  },
  {
    id: 'borg_first_contact',
    title: 'First Contact with the Borg',
    date: new Date('2365-01-01'),
    stardate: '42761.3',
    type: 'first_contact',
    description: 'Enterprise-D makes first contact with the Borg Collective in the J-25 system.',
    relatedItems: ['tng_s2_e16'], // Q Who
    isWatched: false,
    importance: 'critical',
    eraId: 'tng',
    metadata: {
      color: '#4E342E',
      icon: 'borg',
      cssClasses: ['critical-event', 'first-contact-event'],
    },
  },
  {
    id: 'wolf_359',
    title: 'Battle of Wolf 359',
    date: new Date('2367-01-01'),
    stardate: '44002.3',
    type: 'war',
    description:
      'The Borg devastate Starfleet at Wolf 359, with 39 ships destroyed and 11,000 casualties.',
    relatedItems: ['tng_s3_e26', 'tng_s4_e01'], // Best of Both Worlds
    isWatched: false,
    importance: 'critical',
    eraId: 'tng',
    metadata: {
      color: '#B71C1C',
      icon: 'battle',
      cssClasses: ['critical-event', 'war-event'],
    },
  },
  {
    id: 'klingon_civil_war',
    title: 'Klingon Civil War',
    date: new Date('2367-12-01'),
    endDate: new Date('2368-06-01'),
    stardate: '44995.3',
    type: 'war',
    description:
      'Civil war erupts in the Klingon Empire over leadership succession, with Federation involvement.',
    relatedItems: ['tng_s4_e26', 'tng_s5_e01'], // Redemption
    isWatched: false,
    importance: 'major',
    eraId: 'tng',
    metadata: {
      color: '#8D6E63',
      icon: 'klingon-war',
      cssClasses: ['major-event', 'war-event'],
    },
  },
  {
    id: 'enterprise_d_destruction',
    title: 'Enterprise-D Destroyed',
    date: new Date('2371-01-01'),
    stardate: '48632.4',
    type: 'movie',
    description: 'The USS Enterprise NCC-1701-D is destroyed during the Battle of Veridian III.',
    relatedItems: ['st_gen'],
    isWatched: false,
    importance: 'major',
    eraId: 'tng',
    metadata: {
      color: '#FF5722',
      icon: 'destruction',
      cssClasses: ['major-event', 'movie-event'],
    },
  },

  // DS9 Era - Dominion War
  {
    id: 'dominion_first_contact',
    title: 'First Contact with the Dominion',
    date: new Date('2370-01-01'),
    stardate: '46910.1',
    type: 'first_contact',
    description:
      'Deep Space Nine crew makes first contact with the Dominion through the Bajoran wormhole.',
    relatedItems: ['ds9_s2_e26'], // The Jem\'Hadar
    isWatched: false,
    importance: 'critical',
    eraId: 'ds9',
    metadata: {
      color: '#673AB7',
      icon: 'dominion',
      cssClasses: ['critical-event', 'first-contact-event'],
    },
  },
  {
    id: 'dominion_war_begins',
    title: 'Dominion War Begins',
    date: new Date('2373-01-01'),
    stardate: '50564.2',
    type: 'war',
    description: 'Full-scale war erupts between the Dominion and the Alpha Quadrant powers.',
    relatedItems: ['ds9_s5', 'ds9_s6', 'ds9_s7'],
    isWatched: false,
    importance: 'critical',
    eraId: 'ds9',
    metadata: {
      color: '#D32F2F',
      icon: 'war',
      cssClasses: ['critical-event', 'war-event'],
    },
  },
  {
    id: 'dominion_war_ends',
    title: 'Treaty of Bajor - Dominion War Ends',
    date: new Date('2375-12-01'),
    stardate: '52902.0',
    type: 'political',
    description:
      'The Dominion War ends with the signing of the Treaty of Bajor on Deep Space Nine.',
    relatedItems: ['ds9_s7_e25'], // What You Leave Behind
    isWatched: false,
    importance: 'critical',
    eraId: 'ds9',
    metadata: {
      color: '#388E3C',
      icon: 'peace',
      cssClasses: ['critical-event', 'political-event'],
    },
  },

  // Voyager Era
  {
    id: 'voyager_stranded',
    title: 'USS Voyager Stranded in Delta Quadrant',
    date: new Date('2371-01-15'),
    stardate: '48315.6',
    type: 'exploration',
    description:
      'USS Voyager is transported 70,000 light-years to the Delta Quadrant, beginning a seven-year journey home.',
    relatedItems: ['voy_s1_e01'], // Caretaker
    isWatched: false,
    importance: 'major',
    eraId: 'voyager',
    metadata: {
      color: '#FF9800',
      icon: 'voyager',
      cssClasses: ['major-event', 'exploration-event'],
    },
  },
  {
    id: 'borg_queen_encounter',
    title: 'First Contact with Borg Queen',
    date: new Date('2373-01-01'),
    stardate: '50614.2',
    type: 'first_contact',
    description: 'Voyager crew encounters the Borg Queen and learns more about Borg hierarchy.',
    relatedItems: ['voy_s3_e26', 'voy_s4_e01'], // Scorpion
    isWatched: false,
    importance: 'major',
    eraId: 'voyager',
    metadata: {
      color: '#424242',
      icon: 'borg-queen',
      cssClasses: ['major-event', 'first-contact-event'],
    },
  },
  {
    id: 'voyager_returns',
    title: 'USS Voyager Returns to Earth',
    date: new Date('2378-01-01'),
    stardate: '54973.4',
    type: 'exploration',
    description:
      'After seven years in the Delta Quadrant, USS Voyager successfully returns to Earth.',
    relatedItems: ['voy_s7_e25'], // Endgame
    isWatched: false,
    importance: 'major',
    eraId: 'voyager',
    metadata: {
      color: '#4CAF50',
      icon: 'homecoming',
      cssClasses: ['major-event', 'exploration-event'],
    },
  },
]

/**
 * Filter timeline events by era ID.
 * @param eraId - The era identifier to filter by
 * @returns Array of timeline events for the specified era
 */
export const getEventsByEra = (eraId: string): TimelineEvent[] => {
  return timelineEvents.filter(event => event.eraId === eraId)
}

/**
 * Filter timeline events by type.
 * @param type - The event type to filter by
 * @returns Array of timeline events of the specified type
 */
export const getEventsByType = (type: string): TimelineEvent[] => {
  return timelineEvents.filter(event => event.type === type)
}

/**
 * Get timeline events within a date range.
 * @param startDate - Start date for filtering
 * @param endDate - End date for filtering
 * @returns Array of timeline events within the date range
 */
export const getEventsByDateRange = (startDate: Date, endDate: Date): TimelineEvent[] => {
  return timelineEvents.filter(event => {
    return event.date >= startDate && event.date <= endDate
  })
}

/**
 * Get timeline events related to specific Star Trek items.
 * @param itemIds - Array of Star Trek item IDs
 * @returns Array of timeline events related to the specified items
 */
export const getEventsByRelatedItems = (itemIds: string[]): TimelineEvent[] => {
  return timelineEvents.filter(event => {
    return event.relatedItems.some(relatedId => itemIds.includes(relatedId))
  })
}
