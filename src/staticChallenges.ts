import type { Challenge } from './game'

const DATA_URL = `${import.meta.env.BASE_URL}data/challenges.json`
const IMAGE_BASE_URL = `${import.meta.env.BASE_URL}images/`

type ChallengeFileRecord = Omit<Challenge, 'image'> & { image: string }

function isChallengeRecord(value: unknown): value is ChallengeFileRecord {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<ChallengeFileRecord>
  return typeof row.id === 'string'
    && typeof row.image === 'string'
    && typeof row.alt === 'string'
    && typeof row.caption === 'string'
    && typeof row.photoNote === 'string'
    && typeof row.title === 'string'
    && typeof row.category === 'string'
    && typeof row.date === 'string'
    && typeof row.lat === 'number'
    && Number.isFinite(row.lat)
    && typeof row.lng === 'number'
    && Number.isFinite(row.lng)
    && typeof row.place === 'string'
    && typeof row.description === 'string'
}

export async function loadChallenges(): Promise<Challenge[]> {
  const response = await fetch(DATA_URL, { cache: 'no-cache' })
  if (!response.ok) throw new Error(`Could not load ${DATA_URL} (${response.status}).`)

  const rows: unknown = await response.json()
  if (!Array.isArray(rows)) throw new Error('The challenge JSON must contain an array of challenge records.')

  if (!rows.every(isChallengeRecord)) throw new Error('Every challenge needs id, image, alt, caption, photoNote, title, category, date, lat, lng, place, and description fields.')
  const ids = new Set<string>()
  for (const row of rows) {
    if (ids.has(row.id)) throw new Error(`Challenge id “${row.id}” is duplicated.`)
    ids.add(row.id)
    if (!row.image.startsWith('images/') || row.image.includes('..')) throw new Error(`Challenge “${row.id}” must reference an image inside public/images/.`)
  }

  return rows
    .filter((row) => row.active !== false)
    .map((row) => ({ ...row, image: `${IMAGE_BASE_URL}${row.image.replace(/^images\//, '')}` }))
}
