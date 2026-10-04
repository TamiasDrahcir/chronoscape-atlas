import type { Challenge } from './game'

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '')
export const isApiConfigured = Boolean(API_BASE)

const ACCESS_KEY = 'chronoscapeatlas-access-token'
const REFRESH_KEY = 'chronoscapeatlas-refresh-token'

const getAccessToken = () => localStorage.getItem(ACCESS_KEY)
const getRefreshToken = () => localStorage.getItem(REFRESH_KEY)
const setTokens = (access: string, refresh: string) => { localStorage.setItem(ACCESS_KEY, access); localStorage.setItem(REFRESH_KEY, refresh) }
const setAccessToken = (access: string) => localStorage.setItem(ACCESS_KEY, access)
export const clearTokens = () => { localStorage.removeItem(ACCESS_KEY); localStorage.removeItem(REFRESH_KEY) }
export const hasStoredSession = () => Boolean(getAccessToken())

export type ChallengeDTO = {
  id: number
  image: string
  image_url: string
  alt_text: string
  caption: string
  photo_note: string
  title: string
  category: string
  event_at: string
  latitude: number
  longitude: number
  place: string
  description: string
  is_active: boolean
}

export function fromChallengeDTO(row: ChallengeDTO): Challenge & { active: boolean } {
  return {
    id: String(row.id),
    image: row.image,
    alt: row.alt_text,
    caption: row.caption,
    photoNote: row.photo_note,
    title: row.title,
    category: row.category,
    date: row.event_at,
    lat: Number(row.latitude),
    lng: Number(row.longitude),
    place: row.place,
    description: row.description,
    active: row.is_active,
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json()
    if (data && typeof data === 'object') {
      const values = Object.values(data as Record<string, unknown>).flat()
      const first = values.find((value) => typeof value === 'string')
      if (typeof first === 'string') return first
    }
  } catch {
    // fall through to generic message
  }
  return `Request failed (${response.status}).`
}

async function refreshAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken()
  if (!refresh || !API_BASE) return false
  const response = await fetch(`${API_BASE}/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })
  if (!response.ok) { clearTokens(); return false }
  const data: { access: string } = await response.json()
  setAccessToken(data.access)
  return true
}

async function apiFetch(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  if (!API_BASE) throw new Error('The game archive is not configured.')
  const token = getAccessToken()
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers })
  if (response.status === 401 && retry && (await refreshAccessToken())) {
    return apiFetch(path, init, false)
  }
  return response
}

export async function login(email: string, password: string): Promise<void> {
  if (!API_BASE) throw new Error('The game archive is not configured.')
  const response = await fetch(`${API_BASE}/auth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!response.ok) throw new Error(response.status === 401 ? 'Incorrect email or password.' : await readErrorMessage(response))
  const data: { access: string; refresh: string } = await response.json()
  setTokens(data.access, data.refresh)
}

export function logout(): void {
  clearTokens()
}

export async function fetchMe(): Promise<{ email: string; isMediaAdmin: boolean } | null> {
  if (!getAccessToken()) return null
  const response = await apiFetch('/auth/me/')
  if (response.status === 401) { clearTokens(); return null }
  if (!response.ok) throw new Error(await readErrorMessage(response))
  return response.json()
}

export async function listPublicChallenges(): Promise<ChallengeDTO[]> {
  if (!API_BASE) return []
  const response = await fetch(`${API_BASE}/challenges/`)
  if (!response.ok) throw new Error(await readErrorMessage(response))
  return response.json()
}

export async function listAdminChallenges(): Promise<ChallengeDTO[]> {
  const response = await apiFetch('/challenges/')
  if (!response.ok) throw new Error(await readErrorMessage(response))
  return response.json()
}

export async function createChallenge(form: FormData): Promise<void> {
  const response = await apiFetch('/challenges/', { method: 'POST', body: form })
  if (!response.ok) throw new Error(await readErrorMessage(response))
}

export async function updateChallenge(id: string, form: FormData): Promise<void> {
  const response = await apiFetch(`/challenges/${id}/`, { method: 'PATCH', body: form })
  if (!response.ok) throw new Error(await readErrorMessage(response))
}

export async function deleteChallenge(id: string): Promise<void> {
  const response = await apiFetch(`/challenges/${id}/`, { method: 'DELETE' })
  if (!response.ok) throw new Error(await readErrorMessage(response))
}
