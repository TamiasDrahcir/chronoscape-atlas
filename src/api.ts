import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import type { Challenge } from './game'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? ''
const PHOTO_BUCKET = 'challenge-photos'
const CHALLENGE_COLUMNS = 'id, image_url, image_path, alt_text, caption, photo_note, title, category, event_at, latitude, longitude, place, description, is_active'
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY)

const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { autoRefreshToken: true, detectSessionInUrl: true, persistSession: true },
    })
  : null

export type ChallengeDTO = {
  id: number
  image_url: string
  image_path: string | null
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

export type ChallengeInput = Omit<ChallengeDTO, 'id' | 'image_path'>

function getClient(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured. Add the project URL and publishable key.')
  return supabase
}

function photoUrl(row: Pick<ChallengeDTO, 'image_path' | 'image_url'>): string {
  if (row.image_path) return getClient().storage.from(PHOTO_BUCKET).getPublicUrl(row.image_path).data.publicUrl
  return row.image_url
}

export function fromChallengeDTO(row: ChallengeDTO): Challenge & { active: boolean; imageUrl: string; imagePath: string | null } {
  return {
    id: String(row.id),
    image: photoUrl(row),
    imageUrl: row.image_url,
    imagePath: row.image_path,
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

function toChallengeDTO(row: Record<string, unknown>): ChallengeDTO {
  return row as unknown as ChallengeDTO
}

function throwSupabaseError(error: { message: string; code?: string; details?: string; hint?: string }): never {
  const details = error.details ? ` ${error.details}` : ''
  throw new Error(`${error.message}${details}`)
}

function isMediaAdmin(user: User): boolean {
  return user.app_metadata.media_admin === true
}

async function uploadPhoto(file: File): Promise<string> {
  const client = getClient()
  const { data: { user }, error: userError } = await client.auth.getUser()
  if (userError) throwSupabaseError(userError)
  if (!user) throw new Error('Sign in as a media admin before uploading photos.')
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-100) || 'photo'
  const path = `${user.id}/${crypto.randomUUID()}-${safeName}`
  const { error } = await client.storage.from(PHOTO_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throwSupabaseError(error)
  return path
}

async function removePhoto(path: string | null): Promise<void> {
  if (!path) return
  const { error } = await getClient().storage.from(PHOTO_BUCKET).remove([path])
  if (error) throwSupabaseError(error)
}

export async function login(email: string, password: string): Promise<void> {
  const { error } = await getClient().auth.signInWithPassword({ email, password })
  if (error) throwSupabaseError(error)
}

export async function logout(): Promise<void> {
  const { error } = await getClient().auth.signOut()
  if (error) throwSupabaseError(error)
}

export async function fetchMe(): Promise<{ email: string; isMediaAdmin: boolean } | null> {
  const { data: sessionData, error: sessionError } = await getClient().auth.getSession()
  if (sessionError) throwSupabaseError(sessionError)
  if (!sessionData.session) return null
  const { data, error } = await getClient().auth.getUser()
  if (error) throwSupabaseError(error)
  if (!data.user) return null
  return { email: data.user.email ?? '', isMediaAdmin: isMediaAdmin(data.user) }
}

export async function listPublicChallenges(): Promise<ChallengeDTO[]> {
  const { data, error } = await getClient()
    .from('challenges')
    .select(CHALLENGE_COLUMNS)
    .eq('is_active', true)
    .order('event_at', { ascending: false })
  if (error) throwSupabaseError(error)
  return (data ?? []).map((row) => toChallengeDTO(row as Record<string, unknown>))
}

export async function listAdminChallenges(): Promise<ChallengeDTO[]> {
  const { data, error } = await getClient()
    .from('challenges')
    .select(CHALLENGE_COLUMNS)
    .order('event_at', { ascending: false })
  if (error) throwSupabaseError(error)
  return (data ?? []).map((row) => toChallengeDTO(row as Record<string, unknown>))
}

export async function createChallenge(input: ChallengeInput, file: File | null): Promise<void> {
  const client = getClient()
  const photoPath = file ? await uploadPhoto(file) : null
  const { data: { user }, error: userError } = await client.auth.getUser()
  if (userError) {
    await removePhoto(photoPath)
    throwSupabaseError(userError)
  }
  const { error } = await client.from('challenges').insert({
    ...input,
    image_url: photoPath ? '' : input.image_url,
    image_path: photoPath,
    created_by: user?.id ?? null,
  })
  if (error) {
    await removePhoto(photoPath)
    throwSupabaseError(error)
  }
}

export async function updateChallenge(id: string, input: ChallengeInput, file: File | null): Promise<void> {
  const client = getClient()
  const { data: existing, error: readError } = await client
    .from('challenges')
    .select('image_url, image_path')
    .eq('id', Number(id))
    .single()
  if (readError) throwSupabaseError(readError)

  const photoPath = file ? await uploadPhoto(file) : null
  const wantsExternalUrl = Boolean(input.image_url.trim()) && input.image_url.trim() !== existing.image_url
  const nextImagePath = photoPath ?? (wantsExternalUrl ? null : existing.image_path)
  const nextImageUrl = photoPath ? '' : wantsExternalUrl ? input.image_url.trim() : existing.image_url
  const { error } = await client.from('challenges').update({
    ...input,
    image_url: nextImageUrl,
    image_path: nextImagePath,
  }).eq('id', Number(id))

  if (error) {
    await removePhoto(photoPath)
    throwSupabaseError(error)
  }
  if (existing.image_path && existing.image_path !== nextImagePath) await removePhoto(existing.image_path)
}

export async function deleteChallenge(id: string): Promise<void> {
  const client = getClient()
  const { data: existing, error: readError } = await client
    .from('challenges')
    .select('image_path')
    .eq('id', Number(id))
    .single()
  if (readError) throwSupabaseError(readError)

  const { error } = await client.from('challenges').delete().eq('id', Number(id))
  if (error) throwSupabaseError(error)
  await removePhoto(existing.image_path)
}
