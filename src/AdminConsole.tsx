import { useMemo, useState } from 'react'
import { ArrowLeft, Check, ImagePlus, LockKeyhole, LogOut, Pencil, Plus, Save, Trash2, UploadCloud } from 'lucide-react'
import type { Challenge } from './game'
import './AdminPanel.css'

const API = (import.meta.env.VITE_ADMIN_API_URL ?? '').trim().replace(/\/+$/, '')
const emptyChallenge = (): Challenge => ({ id: '', image: '', alt: '', caption: '', photoNote: '', title: '', category: 'CSA · ', date: '', lat: 30.6188, lng: -96.3365, place: 'College Station, Texas', description: '', active: true })

async function imageBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
		reader.onerror = () => reject(new Error('Could not read that image file.'))
		reader.readAsDataURL(file)
	})
}

export default function AdminConsole({ onExit, onSaved }: { onExit: () => void; onSaved: () => Promise<void> }) {
	const [username, setUsername] = useState('MediaTeam')
	const [password, setPassword] = useState('')
	const [token, setToken] = useState('')
	const [items, setItems] = useState<Challenge[]>([])
	const [uploads, setUploads] = useState<Record<string, string>>({})
	const [form, setForm] = useState<Challenge>(emptyChallenge)
	const [editing, setEditing] = useState<string | null>(null)
	const [adding, setAdding] = useState(false)
	const [dirty, setDirty] = useState(false)
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState('')
	const [notice, setNotice] = useState('')
	const activeCount = useMemo(() => items.filter((item) => item.active !== false).length, [items])

	const call = async (path: string, init: RequestInit = {}, bearer = token) => {
		const response = await fetch(`${API}${path}`, { ...init, headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}), ...init.headers } })
		const result = await response.json().catch(() => ({})) as { error?: string; token?: string; challenges?: Challenge[]; saved?: { count: number } }
		if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`)
		return result
	}

	const signIn = async (event: React.FormEvent) => {
		event.preventDefault(); setBusy(true); setError('')
		try {
			const result = await call('/api/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) }, '')
			if (!result.token) throw new Error('The admin service did not return a session.')
			const archive = await call('/api/admin/challenges', {}, result.token)
			setItems(archive.challenges ?? [])
			setPassword(''); setToken(result.token); setNotice('Signed in. Changes remain drafts until published.')
		} catch (reason) { setError(reason instanceof Error ? reason.message : 'Sign-in failed.') }
		finally { setBusy(false) }
	}

	const startEdit = (item: Challenge) => { setForm({ ...item, date: item.date.slice(0, 16) }); setEditing(item.id); setAdding(false); setError('') }
	const startAdd = () => { setForm(emptyChallenge()); setEditing(null); setAdding(true); setError('') }
	const change = (key: keyof Challenge, value: string | number | boolean) => setForm((current) => ({ ...current, [key]: value }))

	const chooseImage = async (file?: File) => {
		if (!file) return
		const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
		if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext) || file.size > 6 * 1024 * 1024) { setError('Choose a JPG, PNG, or WebP image no larger than 6 MB.'); return }
		const stem = file.name.slice(0, -(ext.length + 1)).normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'challenge-photo'
		const name = `${stem}.${ext}`
		try {
			const base64 = await imageBase64(file)
			setUploads((current) => ({ ...current, [name]: base64 }))
			change('image', `images/${name}`)
			setError(''); setNotice(`Selected ${name}; it will upload when the archive is published.`)
		} catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not read that image.') }
	}

	const applyForm = (event: React.FormEvent) => {
		event.preventDefault()
		const item = { ...form, id: form.id.trim().toLowerCase(), date: form.date.length === 16 ? `${form.date}:00` : form.date }
		if (!item.id || items.some((existing) => existing.id === item.id && existing.id !== editing)) { setError('Enter a unique challenge ID.'); return }
		if (!/^images\/[a-z0-9][a-z0-9._-]*\.(?:jpe?g|png|webp)$/i.test(item.image)) { setError('Choose an image or enter a valid images/ filename.'); return }
		setItems((current) => adding ? [...current, item] : current.map((existing) => existing.id === editing ? item : existing))
		setDirty(true); setEditing(null); setAdding(false); setForm(emptyChallenge()); setNotice('Draft updated. Select “Publish archive” to commit it.')
	}

	const removeItem = (id: string) => {
		const item = items.find((entry) => entry.id === id)
		if (!item || !window.confirm(`Remove “${item.title || item.id}” from the archive? Its image is removed only if unused.`)) return
		setItems((current) => current.filter((entry) => entry.id !== id)); setDirty(true)
		if (editing === id) { setEditing(null); setForm(emptyChallenge()) }
		setNotice('Removed from draft. Publish the archive to commit this change.')
	}

	const publish = async () => {
		setBusy(true); setError(''); setNotice('')
		try {
			const referenced = new Set(items.map((item) => item.image.slice('images/'.length)))
			const pending = Object.entries(uploads).filter(([name]) => referenced.has(name)).map(([name, base64]) => ({ name, base64 }))
			const result = await call('/api/admin/challenges', { method: 'PUT', body: JSON.stringify({ challenges: items, uploads: pending }) })
			const latest = await call('/api/admin/challenges')
			setItems(latest.challenges ?? items); setUploads({}); setDirty(false)
			setNotice(`Published ${result.saved?.count ?? items.length} challenges to GitHub Pages.`)
			await onSaved()
		} catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not publish the archive.') }
		finally { setBusy(false) }
	}

	const field = (label: string, key: keyof Challenge, type = 'text', wide = false) => <label key={key} className={`admin-field ${wide ? 'admin-field-wide' : ''}`}><span>{label}</span>{key === 'description'
		? <textarea required rows={4} maxLength={4000} value={String(form[key])} onChange={(event) => change(key, event.target.value)} />
		: <input required type={type} value={String(form[key])} maxLength={key === 'id' ? 80 : undefined} step={key === 'lat' || key === 'lng' ? 'any' : undefined} onChange={(event) => change(key, key === 'lat' || key === 'lng' ? Number(event.target.value) : event.target.value)} />}</label>

	if (!API) return <section className="admin-page"><div className="admin-card admin-unconfigured"><div className="admin-kicker"><LockKeyhole size={15} /> ARCHIVE ADMINISTRATION</div><h1>Admin service<br /><em>not connected.</em></h1><p>Set <strong>VITE_ADMIN_API_URL</strong> to the deployed Worker URL and rebuild Pages to enable archive management.</p><button className="secondary-button" onClick={onExit}><ArrowLeft size={15} /> Return to the atlas</button></div></section>

	return <section className="admin-page">
		<div className="admin-page-head"><div><div className="admin-kicker"><LockKeyhole size={15} /> RESTRICTED ARCHIVE MANAGEMENT</div><h1>Keep the memories<br /><em>in good hands.</em></h1></div><div className="admin-head-actions"><button className="secondary-button" onClick={onExit}><ArrowLeft size={15} /> Return to game</button>{token && <button className="admin-quiet-button" onClick={() => { setToken(''); setItems([]); setUploads({}); setDirty(false); setNotice('Signed out.') }}><LogOut size={15} /> Sign out</button>}</div></div>
		{error && <div className="admin-alert admin-alert-error" role="alert">{error}</div>}{notice && <div className="admin-alert admin-alert-notice" role="status">{notice}</div>}
		{!token ? <form className="admin-login-card" onSubmit={signIn}><div className="admin-card-top"><span>ADMIN SIGN IN</span><LockKeyhole size={17} /></div><h2>Welcome back.</h2><p>Sign in with your archive administrator credentials.</p><label className="admin-field"><span>USERNAME</span><input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required /></label><label className="admin-field"><span>PASSWORD</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label><button className="primary-button admin-submit" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <ArrowLeft className="admin-enter-arrow" size={15} /></button><small>Password is sent only to the protected service and is never saved in this browser.</small></form>
			: <div className="admin-workspace"><div className="admin-toolbar"><div><span className="admin-count">{String(items.length).padStart(2, '0')}</span><div><strong>Challenge archive</strong><small>{activeCount} active · at least 5 needed</small></div></div><div><button className="secondary-button" onClick={startAdd}><Plus size={15} /> Add challenge</button><button className="primary-button" onClick={() => void publish()} disabled={busy || !dirty || activeCount < 5}><Save size={15} /> {busy ? 'Publishing…' : 'Publish archive'}</button></div></div>
				<div className="admin-content-grid"><div className="admin-challenge-list" aria-label="Challenges">{busy && !items.length ? <p className="admin-empty">Loading archive…</p> : items.map((item) => <article className={`admin-challenge-row ${editing === item.id ? 'is-selected' : ''}`} key={item.id}><img src={`${import.meta.env.BASE_URL}${item.image}`} alt="" /><div className="admin-row-copy"><strong>{item.title}</strong><span>{item.date.slice(0, 10)} · {item.place}</span><small>{item.id} · {item.active === false ? 'INACTIVE' : 'ACTIVE'}</small></div><button className="admin-icon-button" aria-label={`Edit ${item.title}`} onClick={() => startEdit(item)}><Pencil size={15} /></button><button className="admin-icon-button admin-delete-button" aria-label={`Remove ${item.title}`} onClick={() => removeItem(item.id)}><Trash2 size={15} /></button></article>)}{!items.length && !busy && <p className="admin-empty">No challenges found. Add one to begin.</p>}</div>
					{adding || editing ? <form className="admin-editor" onSubmit={applyForm}><div className="admin-editor-head"><div><span>{adding ? 'NEW ARCHIVE ENTRY' : 'EDIT ARCHIVE ENTRY'}</span><h2>{adding ? 'Add a moment.' : form.title || 'Edit moment.'}</h2></div><button type="button" className="admin-icon-button" aria-label="Close editor" onClick={() => { setAdding(false); setEditing(null); setForm(emptyChallenge()) }}>×</button></div>
						<div className="admin-fields-grid">{field('CHALLENGE ID', 'id')}{field('TITLE', 'title')}{field('CATEGORY', 'category')}{field('DATE & TIME', 'date', 'datetime-local')}{field('PLACE', 'place')}{field('LATITUDE', 'lat', 'number')}{field('LONGITUDE', 'lng', 'number')}{field('CAPTION', 'caption')}{field('PHOTO NOTE', 'photoNote')}{field('ALT TEXT', 'alt')}{field('DESCRIPTION', 'description', 'text', true)}
							<label className="admin-field admin-field-wide"><span>IMAGE FILE</span><div className="admin-upload"><input required value={form.image} onChange={(event) => change('image', event.target.value)} placeholder="images/event-photo.jpg" /><label className="admin-upload-button"><ImagePlus size={16} /> Choose image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void chooseImage(event.target.files?.[0])} /></label></div><small>JPG, PNG or WebP · up to 6 MB. Existing paths can be reused.</small></label>
							<label className="admin-field admin-active-field"><input type="checkbox" checked={form.active !== false} onChange={(event) => change('active', event.target.checked)} /><span>Include in gameplay</span></label></div>
						<div className="admin-editor-actions"><button type="button" className="secondary-button" onClick={() => { setAdding(false); setEditing(null); setForm(emptyChallenge()) }}>Cancel</button><button className="primary-button" type="submit"><Check size={15} /> Apply draft</button></div>
					</form> : <div className="admin-editor admin-editor-empty"><UploadCloud size={25} /><h2>Curate the archive.</h2><p>Select an entry to edit or add a new moment. Changes are staged until you publish.</p><button className="secondary-button" onClick={startAdd}><Plus size={15} /> Add a challenge</button></div>}</div>
				<div className="admin-footer-note">Publishing writes validated JSON and images to the repository and the live Pages branch. Archive images are public.</div></div>}
	</section>
}
