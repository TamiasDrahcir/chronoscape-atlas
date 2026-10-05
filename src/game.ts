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
  active?: boolean
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