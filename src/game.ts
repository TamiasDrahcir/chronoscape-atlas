export const FAMILIES = ['Dimoo', 'Hirono', 'Miffy', 'Mofusand', 'Peach Riot', 'Smiski'] as const
export type Family = (typeof FAMILIES)[number]

export const MIN_DATE = '2026-09-01T00:00:00'
export const MAX_DATE = '2027-06-01T23:59:00'

export type Challenge = {
  id: string
  image: string
  alt: string
  caption: string
  photoNote: string
  title: string
  category: string
  date: string
  lat: number
  lng: number
  place: string
  description: string
}

export type Guess = {
  location: { lat: number; lng: number } | null
  time: Date | null
}

export type RoundResult = {
  location: number
  time: number
  total: number
  distance: number | null
  hours: number | null
  secondsTaken: number
}

export type LeaderboardEntry = {
  name: string
  family: Family
  score: number
  secondsTaken: number
}

// Illustrative fixture moments; replace with CSA-approved photos and event details before launch.
export const CHALLENGES: Challenge[] = [
  {
    id: 'welcome-back',
    image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1600&q=85',
    alt: 'Friends gathered together at an outdoor student event',
    caption: 'A new semester, all together',
    photoNote: 'A familiar crowd. A brand-new year.',
    title: 'The first hello of fall',
    category: 'CSA · WELCOME SOCIAL',
    date: '2026-09-12T17:30:00',
    lat: 30.6188, lng: -96.3365, place: 'Texas A&M campus, College Station',
    description: 'The semester opened with a simple tradition: new faces, old friends, and one more reason to gather on campus. The best moments started before anyone thought to take a photo.',
  },
  {
    id: 'night-market',
    image: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1600&q=85',
    alt: 'Warm lights illuminating a lively evening gathering',
    caption: 'The evening had other plans',
    photoNote: 'Look for the lights after the sun goes down.',
    title: 'One more lap around the market',
    category: 'CSA · NIGHT MARKET',
    date: '2026-10-03T19:15:00',
    lat: 30.6282, lng: -96.3341, place: 'College Station, Texas',
    description: 'A little food, a lot of conversation, and the kind of evening that turns “just one more stop” into the whole night. Our imaginary archive remembers the glow more than the schedule.',
  },
  {
    id: 'houston-trip',
    image: 'https://images.unsplash.com/photo-1536152470836-b943b246224c?auto=format&fit=crop&w=1600&q=85',
    alt: 'A downtown skyline at dusk seen from across a city park',
    caption: 'The skyline on the way back',
    photoNote: 'A day trip, a long playlist, one last group photo.',
    title: 'A day beyond Aggieland',
    category: 'CSA · CITY EXCURSION',
    date: '2026-10-24T16:45:00',
    lat: 29.7604, lng: -95.3698, place: 'Houston, Texas',
    description: 'For one Saturday, the group traded campus paths for a city skyline. The return trip was quieter, the camera roll was fuller, and somebody was already planning the next outing.',
  },
  {
    id: 'autumn-picnic',
    image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1600&q=85',
    alt: 'Friends sharing a picnic outdoors on a bright day',
    caption: 'A perfect excuse to stay awhile',
    photoNote: 'The best seat was always the one with friends.',
    title: 'An afternoon with no agenda',
    category: 'CSA · AUTUMN HANGOUT',
    date: '2026-11-08T13:00:00',
    lat: 30.6206, lng: -96.3399, place: 'Texas A&M campus, College Station',
    description: 'A breezy afternoon, shared snacks, and nowhere else anyone needed to be. The plan was to relax; the memory was how long everyone stayed.',
  },
  {
    id: 'winter-lights',
    image: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=1600&q=85',
    alt: 'Festive lights and decorations on a winter evening',
    caption: 'The semester’s soft landing',
    photoNote: 'One last gathering before the calendar turns.',
    title: 'Before everyone headed home',
    category: 'CSA · WINTER SOCIAL',
    date: '2026-12-05T18:00:00',
    lat: 30.6199, lng: -96.3412, place: 'College Station, Texas',
    description: 'The end-of-semester gathering was a chance to celebrate everything the group had made together. There were warm lights, familiar faces, and promises to meet again after break.',
  },
  {
    id: 'spring-kickoff',
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1600&q=85',
    alt: 'A group of friends enjoying a sunny afternoon together',
    caption: 'The first sunny day felt like a reunion',
    photoNote: 'New semester energy, same favorite people.',
    title: 'Back in the sunshine',
    category: 'CSA · SPRING KICKOFF',
    date: '2027-01-23T14:30:00',
    lat: 30.6168, lng: -96.3425, place: 'Texas A&M campus, College Station',
    description: 'The spring semester started with sunshine and a familiar kind of excitement. Everyone came back with stories from break and left with plans for the weeks ahead.',
  },
  {
    id: 'san-antonio',
    image: 'https://images.unsplash.com/photo-1565358981514-5ac5a2c91d3e?auto=format&fit=crop&w=1600&q=85',
    alt: 'A riverside walkway winding through a historic city',
    caption: 'A little detour turned into the day',
    photoNote: 'Follow the water and find the group.',
    title: 'A weekend by the river',
    category: 'CSA · TEXAS ROAD TRIP',
    date: '2027-02-20T11:15:00',
    lat: 29.4241, lng: -98.4936, place: 'San Antonio, Texas',
    description: 'A road trip brought the crew to the riverwalk for an unhurried afternoon. The itinerary was flexible, the group photo was not, and the stories lasted longer than the drive home.',
  },
  {
    id: 'culture-night',
    image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1600&q=85',
    alt: 'A stage illuminated by colorful lights during a live performance',
    caption: 'The room came alive',
    photoNote: 'A little stage fright, a lot of applause.',
    title: 'A night made to be shared',
    category: 'CSA · CULTURE NIGHT',
    date: '2027-03-27T19:00:00',
    lat: 30.6194, lng: -96.3379, place: 'College Station, Texas',
    description: 'Friends took the stage, friends filled the seats, and the room found its rhythm. It was a celebration of the cultures and community that make the organization feel like home.',
  },
]

export function shuffleChallenges(challenges: Challenge[]): Challenge[] {
  const shuffled = [...challenges]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]]
  }
  return shuffled
}

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180
  const latDelta = radians(b.lat - a.lat)
  const lngDelta = radians(b.lng - a.lng)
  const value = Math.sin(latDelta / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(lngDelta / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}

export function getRoundScore(challenge: Challenge, guess: Guess): Omit<RoundResult, 'secondsTaken'> {
  const distance = guess.location ? distanceKm(guess.location, { lat: challenge.lat, lng: challenge.lng }) : null
  const hours = guess.time ? Math.abs(guess.time.getTime() - new Date(challenge.date).getTime()) / 3600000 : null
  const location = distance === null ? 0 : Math.round(500 * Math.max(0, 1 - distance / 2500))
  const time = hours === null ? 0 : Math.round(500 * Math.max(0, 1 - hours / (24 * 14)))
  return { location, time, total: location + time, distance, hours }
}

export function getTier(score: number): string {
  if (score >= 4000) return 'GOAT'
  if (score >= 3000) return 'Expert'
  if (score >= 2000) return 'Intermediate'
  if (score >= 1000) return 'Practitioner'
  return 'Newbie'
}

export function getSpeedLabel(seconds: number): string {
  if (seconds < 60) return 'Ultrafast'
  if (seconds < 120) return 'Rapid'
  if (seconds < 180) return 'Swift'
  if (seconds < 240) return 'Thoughtful'
  return 'Steady'
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}

export function formatMoment(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
}

export function dateToInputValue(date: Date): string {
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const LEADERBOARD_KEY = 'chronoscapeatlas-leaderboard-v1'

export function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) ?? '[]')
    return Array.isArray(data) ? data as LeaderboardEntry[] : []
  } catch {
    return []
  }
}

export function saveLeaderboard(entries: LeaderboardEntry[]): void {
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries))
  } catch {
    // Keep the game playable when browser storage is unavailable.
  }
}