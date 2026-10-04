import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, Check, ImagePlus, LoaderCircle, LogIn, LogOut, Pencil, Plus, Save, ShieldCheck, Trash2, X } from 'lucide-react'
import type { Challenge } from './game'
import { MAX_DATE, MIN_DATE, dateToInputValue } from './game'
import { clearTokens, createChallenge, deleteChallenge as deleteApiChallenge, fetchMe, fromChallengeDTO, hasStoredSession, isApiConfigured, listAdminChallenges, login, logout, updateChallenge, type ChallengeDTO } from './api'
import './Admin.css'

type ChallengeDraft = {
  id?: string
  image: string
  alt: string
  caption: string
  photoNote: string
  title: string
  category: string
  date: string
  lat: string
  lng: string
  place: string
  description: string
  active: boolean
}

type AdminPanelProps = {
  onExit: () => void
  onChallengesChanged: () => Promise<void>
}

const blankDraft = (): ChallengeDraft => ({ image: '', alt: '', caption: '', photoNote: '', title: '', category: '', date: '', lat: '', lng: '', place: '', description: '', active: true })
const toDraft = (challenge: Challenge & { active?: boolean }): ChallengeDraft => ({
  id: challenge.id, image: challenge.image, alt: challenge.alt, caption: challenge.caption,
  photoNote: challenge.photoNote, title: challenge.title, category: challenge.category,
  date: dateToInputValue(new Date(challenge.date)), lat: String(challenge.lat), lng: String(challenge.lng),
  place: challenge.place, description: challenge.description, active: challenge.active ?? true,
})
const isInUnitedStates = (lat: number, lng: number) =>
  (lat >= 24 && lat <= 50 && lng >= -126 && lng <= -66) ||
  (lat >= 51 && lat <= 73 && lng >= -180 && lng <= -129) ||
  (lat >= 18 && lat <= 23 && lng >= -161 && lng <= -154)

export default function AdminPanel({ onExit, onChallengesChanged }: AdminPanelProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingSession, setCheckingSession] = useState(isApiConfigured && hasStoredSession())
  const [challenges, setChallenges] = useState<(Challenge & { active: boolean })[]>([])
  const [draft, setDraft] = useState<ChallengeDraft | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadEntries = useCallback(async () => {
    const rows = await listAdminChallenges()
    setChallenges((rows as ChallengeDTO[]).map(fromChallengeDTO))
  }, [])

  useEffect(() => {
    if (!isApiConfigured || !hasStoredSession()) return
    const task = window.setTimeout(() => {
      void (async () => {
        try {
          const me = await fetchMe()
          setUserEmail(me?.email ?? null)
          setIsAdmin(me?.isMediaAdmin ?? false)
          if (me?.isMediaAdmin) await loadEntries()
        } catch (sessionError) {
          setError(sessionError instanceof Error ? sessionError.message : 'Could not restore your session.')
        } finally {
          setCheckingSession(false)
        }
      })()
    }, 0)
    return () => window.clearTimeout(task)
  }, [loadEntries])

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      await login(email.trim(), password)
      const me = await fetchMe()
      setUserEmail(me?.email ?? null)
      setIsAdmin(me?.isMediaAdmin ?? false)
      if (me?.isMediaAdmin) await loadEntries()
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Could not sign in.')
    } finally { setBusy(false) }
  }

  const signOut = () => {
    logout(); clearTokens()
    setUserEmail(null); setIsAdmin(false); setDraft(null)
  }

  const saveChallenge = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft || !isAdmin) return
    setError(''); setNotice('')
    const eventDate = new Date(draft.date)
    const latitude = Number(draft.lat)
    const longitude = Number(draft.lng)
    if (!draft.date || Number.isNaN(eventDate.getTime()) || eventDate < new Date(MIN_DATE) || eventDate > new Date(MAX_DATE)) {
      setError('Choose an event date between September 1, 2026 and June 1, 2027.')
      return
    }
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !isInUnitedStates(latitude, longitude)) {
      setError('Enter coordinates inside the United States, including Alaska or Hawaii.')
      return
    }
    if (!draft.image && !photoFile) { setError('Add a photo URL or upload a photo.'); return }
    setBusy(true)
    try {
      const form = new FormData()
      form.set('title', draft.title.trim())
      form.set('category', draft.category.trim())
      form.set('caption', draft.caption.trim())
      form.set('photo_note', draft.photoNote.trim())
      form.set('alt_text', draft.alt.trim())
      form.set('image_url', draft.image.trim())
      form.set('event_at', eventDate.toISOString())
      form.set('latitude', String(latitude))
      form.set('longitude', String(longitude))
      form.set('place', draft.place.trim())
      form.set('description', draft.description.trim())
      form.set('is_active', String(draft.active))
      if (photoFile) form.set('image_file', photoFile)
      if (draft.id) await updateChallenge(draft.id, form)
      else await createChallenge(form)
      setDraft(null); setPhotoFile(null)
      await loadEntries()
      await onChallengesChanged()
      setNotice(draft.id ? 'Challenge updated.' : 'Challenge added.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save this challenge.')
    } finally { setBusy(false) }
  }

  const removeChallenge = async (challenge: Challenge) => {
    if (!isAdmin || !window.confirm(`Delete “${challenge.title}”? This cannot be undone.`)) return
    setBusy(true); setError(''); setNotice('')
    try {
      await deleteApiChallenge(challenge.id)
      await loadEntries()
      await onChallengesChanged()
      setNotice('Challenge deleted.')
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete this challenge.')
    } finally { setBusy(false) }
  }

  const patchDraft = (field: keyof ChallengeDraft, value: string | boolean) => setDraft((current) => current ? { ...current, [field]: value } : current)

  return <section className="admin-page">
    <div className="admin-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> CSA MEDIA TEAM</div><h1>Memory <em>archive.</em></h1><p>Manage the moments that make it into the game.</p></div><button className="secondary-button" onClick={onExit}><ArrowLeft size={15} /> Back to game</button></div>
    {!isApiConfigured && <div className="admin-setup-notice"><ShieldCheck size={20} /><div><strong>Admin storage isn’t connected yet</strong><p>Configure the Django API before staff can sign in. Follow the setup guide in <a href="/ADMIN_SETUP.md" target="_blank" rel="noreferrer">ADMIN_SETUP.md</a>.</p></div></div>}
    {isApiConfigured && checkingSession && <div className="admin-loading"><LoaderCircle className="spin" /> Checking staff access…</div>}
    {isApiConfigured && !checkingSession && !userEmail && <form className="admin-login-card" onSubmit={(event) => void signIn(event)}><span className="admin-icon"><ShieldCheck size={21} /></span><span className="admin-kicker">RESTRICTED · AUTHORIZED CSA MEDIA TEAM ONLY</span><h2>Sign in to the archive</h2><p>Use the staff account created by a project administrator.</p><label>Email address<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@tamu.edu" /></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className="admin-error">{error}</p>}<button className="primary-button admin-sign-in" disabled={busy}>{busy ? <LoaderCircle className="spin" size={15} /> : <LogIn size={15} />} Sign in securely</button><small>Accounts are provisioned by a project administrator; public self-registration is disabled.</small></form>}
    {isApiConfigured && !checkingSession && userEmail && !isAdmin && <div className="admin-denied"><ShieldCheck size={21} /><strong>This account isn’t on the media team.</strong><span>Signed in as {userEmail}. Ask a project administrator to grant media-admin access.</span><button className="secondary-button" onClick={signOut}><LogOut size={14} /> Sign out</button></div>}
    {isAdmin && <>
      <div className="admin-toolbar"><div className="admin-user"><ShieldCheck size={16} /><span>MEDIA ADMIN</span><b>{userEmail}</b></div><button className="secondary-button" onClick={signOut}><LogOut size={14} /> Sign out</button></div>
      {error && <div className="admin-alert error-alert">{error}</div>}{notice && <div className="admin-alert success-alert"><Check size={15} /> {notice}</div>}
      <div className="admin-content-grid"><div className="admin-list-card"><div className="admin-list-heading"><div><h2>Game moments</h2><p>{challenges.length} entries · only active moments appear in rounds</p></div><button className="primary-button" onClick={() => { setDraft(blankDraft()); setPhotoFile(null); setError('') }}><Plus size={15} /> Add moment</button></div>
        {challenges.length === 0 ? <div className="admin-empty"><ImagePlus size={24} /><strong>Your archive is ready.</strong><span>Add at least five active moments for a full game.</span></div> : <div className="admin-entry-list">{challenges.map((entry) => <article className="admin-entry" key={entry.id}><img src={entry.image} alt="" /><div className="admin-entry-info"><div><span className={`entry-status ${entry.active ? 'is-active' : ''}`}>{entry.active ? 'ACTIVE' : 'DRAFT'}</span><span className="entry-date">{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(entry.date))}</span></div><strong>{entry.title}</strong><span>{entry.category} · {entry.place}</span></div><div className="admin-entry-actions"><button aria-label={`Edit ${entry.title}`} title="Edit" onClick={() => { setDraft(toDraft(entry)); setPhotoFile(null); setError('') }}><Pencil size={15} /></button><button aria-label={`Delete ${entry.title}`} title="Delete" onClick={() => void removeChallenge(entry)} disabled={busy}><Trash2 size={15} /></button></div></article>)}</div>}
      </div>
      <aside className="admin-tips"><span className="admin-kicker">PUBLISHING CHECKLIST</span><h2>Make the moment playable.</h2><ul><li><Check size={14} /> Use a CSA-owned event photo</li><li><Check size={14} /> Add the event’s local date and time</li><li><Check size={14} /> Pin the actual US location</li><li><Check size={14} /> Write a short reveal paragraph</li></ul><div className="admin-callout">Five or more active moments are needed to start a game. Keep unpublished entries inactive until they’re ready.</div></aside></div>
      {draft && <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDraft(null) }}><form className="admin-editor" onSubmit={(event) => void saveChallenge(event)}><div className="editor-heading"><div><span className="admin-kicker">{draft.id ? 'EDIT ARCHIVE ENTRY' : 'NEW ARCHIVE ENTRY'}</span><h2>{draft.id ? 'Refine the moment.' : 'Add a new moment.'}</h2></div><button type="button" className="icon-button" onClick={() => setDraft(null)} aria-label="Close editor"><X size={19} /></button></div>
        <div className="editor-grid"><label className="editor-wide">Event title<input required maxLength={100} value={draft.title} onChange={(event) => patchDraft('title', event.target.value)} placeholder="e.g. Welcome back social" /></label><label>Category<input required maxLength={80} value={draft.category} onChange={(event) => patchDraft('category', event.target.value)} placeholder="CSA · WELCOME SOCIAL" /></label><label>Display caption<input required maxLength={90} value={draft.caption} onChange={(event) => patchDraft('caption', event.target.value)} placeholder="A new semester, all together" /></label><label className="editor-wide">Photo<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => { const file = event.target.files?.[0] ?? null; if (file && file.size > 10 * 1024 * 1024) { setError('Photos must be 10 MB or smaller.'); event.target.value = ''; return } setPhotoFile(file); setError('') }} /><small>Upload JPEG, PNG, WebP or AVIF (max 10 MB), or paste a hosted image URL below.</small></label><label className="editor-wide">Photo URL<input type="url" value={draft.image} onChange={(event) => patchDraft('image', event.target.value)} placeholder="https://…" /></label><label className="editor-wide">Photo alt text<input required maxLength={180} value={draft.alt} onChange={(event) => patchDraft('alt', event.target.value)} placeholder="Describe the image for screen readers" /></label><label>Event date &amp; time<input type="datetime-local" required min={MIN_DATE.slice(0, 16)} max={MAX_DATE.slice(0, 16)} value={draft.date} onChange={(event) => patchDraft('date', event.target.value)} /></label><label>Location name<input required maxLength={120} value={draft.place} onChange={(event) => patchDraft('place', event.target.value)} placeholder="City, State" /></label><label>Latitude<input required type="number" step="any" min="-90" max="90" value={draft.lat} onChange={(event) => patchDraft('lat', event.target.value)} placeholder="30.6188" /></label><label>Longitude<input required type="number" step="any" min="-180" max="180" value={draft.lng} onChange={(event) => patchDraft('lng', event.target.value)} placeholder="-96.3365" /></label><label className="editor-wide">Photo clue note<input required maxLength={180} value={draft.photoNote} onChange={(event) => patchDraft('photoNote', event.target.value)} placeholder="A short hint shown with the photo" /></label><label className="editor-wide">Reveal description<textarea required rows={4} maxLength={1200} value={draft.description} onChange={(event) => patchDraft('description', event.target.value)} placeholder="A short paragraph about the scene and event…" /></label><label className="active-toggle editor-wide"><input type="checkbox" checked={draft.active} onChange={(event) => patchDraft('active', event.target.checked)} /><span>Include this moment in the game</span></label></div>
        {error && <p className="admin-error">{error}</p>}<div className="editor-actions"><button type="button" className="secondary-button" onClick={() => setDraft(null)}>Cancel</button><button className="primary-button" disabled={busy}>{busy ? <LoaderCircle className="spin" size={15} /> : <Save size={15} />}{busy ? 'Saving…' : 'Save moment'}</button></div>
      </form></div>}
    </>}
  </section>
}
