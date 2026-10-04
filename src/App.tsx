import { useCallback, useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import L, { type LatLng } from 'leaflet'
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, Compass, MapPin, RotateCcw, ShieldCheck, Sparkles, Trophy } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import './App.css'
import AdminPanel from './AdminPanel'
import { dateToInputValue, formatDuration, formatMoment, getRoundScore, getSpeedLabel, getTier, type Challenge, type Family, type Guess, type LeaderboardEntry, type RoundResult, CHALLENGES, FAMILIES, MAX_DATE, MIN_DATE, loadLeaderboard, saveLeaderboard, shuffleChallenges } from './game'
import { fromChallengeDTO, isApiConfigured, listPublicChallenges, type ChallengeDTO } from './api'

type Screen = 'home' | 'play' | 'reveal' | 'complete' | 'leaderboard' | 'admin'
type MapScope = 'campus' | 'area' | 'texas'

const emptyGuess = (): Guess => ({ location: null, time: null })
const guessPinIcon = L.divIcon({ className: 'guess-pin-wrapper', html: '<span class="guess-pin"><span></span></span>', iconSize: [28, 36], iconAnchor: [14, 34] })

function ClickableMap({ onPick }: { onPick: (point: LatLng) => void }) {
  useMapEvents({ click: ({ latlng }) => onPick(latlng) })
  return null
}

function MapView({ scope, guess, onPick, round }: { scope: MapScope; guess: Guess['location']; onPick: (point: LatLng) => void; round: number }) {
  const presets: Record<MapScope, { center: [number, number]; zoom: number }> = {
    campus: { center: [30.6188, -96.3365], zoom: 15 },
    area: { center: [30.6505, -96.34], zoom: 11 },
    texas: { center: [31.1, -99.2], zoom: 6 },
  }
  const preset = presets[scope]
  return <MapContainer key={`${round}-${scope}`} center={preset.center} zoom={preset.zoom} scrollWheelZoom className="leaflet-map">
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <ClickableMap onPick={onPick} />
    {guess && <Marker position={[guess.lat, guess.lng]} icon={guessPinIcon} />}
  </MapContainer>
}

function Timeline({ value, onChange }: { value: Date; onChange: (date: Date) => void }) {
  const [dragX, setDragX] = useState<number | null>(null)
  const [anchor, setAnchor] = useState(value.getTime())
  const clampDate = (time: number) => new Date(Math.max(new Date(MIN_DATE).getTime(), Math.min(new Date(MAX_DATE).getTime(), time)))
  const moveTimeline = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragX === null) return
    const width = Math.max(event.currentTarget.clientWidth, 1)
    const hoursPerPixel = (60 * 24) / width
    onChange(clampDate(anchor - (event.clientX - dragX) * hoursPerPixel * 3600000))
  }
  const left = new Date(value.getTime() - 30 * 86400000)
  const right = new Date(value.getTime() + 30 * 86400000)
  return <div className={`timeline-track ${dragX !== null ? 'is-dragging' : ''}`} role="slider" tabIndex={0} aria-label="Drag the timeline to choose a date and time" aria-valuetext={formatMoment(value)}
    onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setAnchor(value.getTime()); setDragX(event.clientX) }}
    onPointerMove={moveTimeline} onPointerUp={() => setDragX(null)} onPointerCancel={() => setDragX(null)}
    onKeyDown={(event) => { const step = event.key === 'ArrowLeft' ? -3600000 : event.key === 'ArrowRight' ? 3600000 : 0; if (step) { event.preventDefault(); onChange(clampDate(value.getTime() + step)) } }}>
    <div className="timeline-rail" /><div className="timeline-center" />
    <span className="timeline-label timeline-left">{left.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
    <span className="timeline-label timeline-middle">{value.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
    <span className="timeline-label timeline-right">{right.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
    <span className="timeline-hint">Drag to travel through time</span>
  </div>
}

function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [playerName, setPlayerName] = useState('')
  const [family, setFamily] = useState<Family | ''>('')
  const [roundChallenges, setRoundChallenges] = useState<Challenge[]>([])
  const [roundIndex, setRoundIndex] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(60)
  const [guess, setGuess] = useState<Guess>(emptyGuess)
  const [timeView, setTimeView] = useState<'timeline' | 'calendar'>('timeline')
  const [mapScope, setMapScope] = useState<MapScope>('campus')
  const [results, setResults] = useState<RoundResult[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(loadLeaderboard)
  const [submittedAt, setSubmittedAt] = useState(60)
  const [challengePool, setChallengePool] = useState<Challenge[]>(CHALLENGES)
  const [challengeLoadError, setChallengeLoadError] = useState('')

  const refreshChallengePool = useCallback(async () => {
    if (!isApiConfigured) return
    try {
      const rows = await listPublicChallenges()
      const challenges = (rows as ChallengeDTO[]).map(fromChallengeDTO)
      if (challenges.length >= 5) {
        setChallengePool(challenges)
        setChallengeLoadError('')
      } else {
        setChallengePool(CHALLENGES)
        setChallengeLoadError(`Only ${challenges.length} active event${challenges.length === 1 ? '' : 's'} in the archive; using sample moments so you can play.`)
      }
    } catch (error) {
      setChallengePool(CHALLENGES)
      const reason = error instanceof Error ? error.message : 'Could not load the event archive.'
      setChallengeLoadError(`${reason} Using sample moments so you can play.`)
    }
  }, [])

  useEffect(() => {
    if (!isApiConfigured) return
    const task = window.setTimeout(() => { void refreshChallengePool() }, 0)
    return () => window.clearTimeout(task)
  }, [refreshChallengePool])
  const challenge = roundChallenges[roundIndex]
  const roundScore = challenge ? getRoundScore(challenge, guess) : { location: 0, time: 0, total: 0, distance: null, hours: null }
  const totalScore = results.reduce((sum, result) => sum + result.total, 0)

  useEffect(() => {
    if (screen !== 'play') return
    const deadline = Date.now() + 60 * 1000
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setSecondsLeft(remaining)
      if (remaining === 0) {
        setSubmittedAt(60)
        setScreen('reveal')
      }
    }, 250)
    return () => window.clearInterval(timer)
  }, [screen, roundIndex])

  const startGame = () => {
    if (!playerName.trim() || !family || challengePool.length < 5) return
    setPlayerName(playerName.trim())
    setRoundChallenges(shuffleChallenges(challengePool).slice(0, 5))
    setRoundIndex(0); setResults([]); setGuess(emptyGuess()); setSecondsLeft(60); setMapScope('campus'); setScreen('play')
  }
  const revealRound = () => { setSubmittedAt(60 - secondsLeft); setScreen('reveal') }
  const continueAfterReveal = () => {
    const nextResults = [...results, { ...roundScore, secondsTaken: submittedAt }]
    setResults(nextResults)
    if (roundIndex === 4) {
      const entry: LeaderboardEntry = { name: playerName.trim(), family: family as Family, score: nextResults.reduce((sum, result) => sum + result.total, 0), secondsTaken: nextResults.reduce((sum, result) => sum + result.secondsTaken, 0) }
      const previous = loadLeaderboard()
      const identity = `${entry.name.toLocaleLowerCase()}|${entry.family}`
      const oldEntry = previous.find((item) => `${item.name.toLocaleLowerCase()}|${item.family}` === identity)
      const next = previous.filter((item) => `${item.name.toLocaleLowerCase()}|${item.family}` !== identity)
      if (!oldEntry || entry.score > oldEntry.score || (entry.score === oldEntry.score && entry.secondsTaken < oldEntry.secondsTaken)) next.push(entry)
      next.sort((a, b) => b.score - a.score || a.secondsTaken - b.secondsTaken)
      setLeaderboard(next)
      saveLeaderboard(next)
      setScreen('complete')
      return
    }
    setRoundIndex((index) => index + 1); setGuess(emptyGuess()); setSecondsLeft(60); setMapScope('campus'); setScreen('play')
  }
  const familyRows = useMemo(() => FAMILIES.map((name) => {
    const members = leaderboard.filter((entry) => entry.family === name)
    return { name, count: members.length, score: members.length ? Math.round(members.reduce((sum, item) => sum + item.score, 0) / members.length) : 0, seconds: members.length ? Math.round(members.reduce((sum, item) => sum + item.secondsTaken, 0) / members.length) : 0 }
  }).sort((a, b) => b.score - a.score || a.seconds - b.seconds), [leaderboard])
  const setSelectedTime = (date: Date) => setGuess((current) => ({ ...current, time: date }))
  const timeValue = guess.time ?? new Date(MIN_DATE)
  const scoreThroughCurrent = totalScore + (screen === 'reveal' ? roundScore.total : 0)

  return <main className="app-shell">
    <header className="topbar">
      <button className="brand-lockup" onClick={() => setScreen('home')} aria-label="ChronoScape Atlas home"><span className="brand-mark"><Compass size={20} /></span><span>CHRONOSCAPE <b>ATLAS</b></span></button>
      <div className="topbar-right"><span className="season-chip"><span /> 2026—27 SEASON</span><button className="leaderboard-link" onClick={() => setScreen('leaderboard')}><Trophy size={16} /> Leaderboard</button><button className="leaderboard-link admin-nav-link" onClick={() => setScreen('admin')}><ShieldCheck size={16} /> Media team</button></div>
    </header>

    {screen === 'home' && <section className="welcome-page">
      <div className="welcome-copy"><div className="eyebrow"><span className="eyebrow-line" /> THE CSA TIME CAPSULE</div><h1>Somewhere.<br /><em>Sometime.</em></h1><p className="welcome-text">Five moments from a year in Aggieland. Can you figure out where you are—and when it happened?</p>
        <div className="welcome-stats"><div><strong>05</strong><span>ROUNDS</span></div><i /><div><strong>01:00</strong><span>PER MOMENT</span></div><i /><div><strong>1,000</strong><span>PTS / ROUND</span></div></div><div className="welcome-art-note"><Sparkles size={15} /> A little memory. A lot of detective work.</div></div>
      <div className="welcome-form-wrap"><div className="form-card"><div className="form-card-top"><span>BEFORE WE BEGIN</span><span className="card-number">01 / 02</span></div><h2>Make it a moment.</h2><p className="form-intro">Tell us who’s taking the trip.</p>
        <label className="field-label" htmlFor="player-name">YOUR NAME</label><input id="player-name" className="text-input" maxLength={28} placeholder="e.g. Alex Chen" value={playerName} onChange={(event) => setPlayerName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && family) startGame() }} />
        <label className="field-label family-label">YOUR FAM <span>Choose your crew</span></label><div className="family-grid">{FAMILIES.map((name) => <button key={name} className={`family-option ${family === name ? 'selected' : ''}`} onClick={() => setFamily(name)}>{name}{family === name && <Check size={14} />}</button>)}</div>
        <button className="primary-button start-button" disabled={!playerName.trim() || !family} onClick={startGame}>Let’s travel <ArrowRight size={17} /></button><p className="privacy-note"><span>✳</span> Your best run counts on the leaderboard.</p>{challengeLoadError && <p className="challenge-pool-note error-text">{challengeLoadError}</p>}</div><div className="tape-note">SAY CHEESE! <span>↗</span></div></div>
      <footer className="welcome-footer"><span>TEXAS A&amp;M · CHINESE STUDENT ASSOCIATION</span><span>COLLECTING LITTLE MOMENTS, 2026—2027</span></footer>
    </section>}

    {screen === 'play' && challenge && <section className="game-page">
      <div className="game-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> FIELD NOTES <span className="crumb">/ ROUND {String(roundIndex + 1).padStart(2, '0')}</span></div><h1>Where in the world <em>were we?</em></h1></div><div className={`timer-pill ${secondsLeft <= 15 ? 'timer-urgent' : ''}`}><Clock3 size={17} /><span>{String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}</span><small>REMAINING</small></div></div>
      <div className="round-progress" aria-label={`Round ${roundIndex + 1} of 5`}>{Array.from({ length: 5 }, (_, index) => <span key={index} className={index < roundIndex ? 'done' : index === roundIndex ? 'current' : ''} />)}<b>ROUND {roundIndex + 1} OF 5</b></div>
      <div className="game-grid"><div className="prompt-column"><article className="photo-card"><img src={challenge.image} alt={challenge.alt} /><div className="photo-shade" /><div className="photo-meta"><span><span className="live-dot" /> CSA ARCHIVE · MOMENT {String(roundIndex + 1).padStart(2, '0')}</span><span>✳ UNDATED</span></div><div className="photo-caption"><span>YOUR PHOTO CLUE</span><strong>{challenge.caption}</strong><p>{challenge.photoNote}</p></div><div className="photo-frame-mark">CSA<br />2026</div></article>
        <div className="time-panel"><div className="panel-heading"><div><span className="step-tag">01</span><div><h2>When did it happen?</h2><p>Set the moment on the calendar.</p></div></div><div className="view-switch" role="tablist"><button className={timeView === 'timeline' ? 'active' : ''} onClick={() => setTimeView('timeline')} role="tab" aria-selected={timeView === 'timeline'}>Timeline</button><button className={timeView === 'calendar' ? 'active' : ''} onClick={() => setTimeView('calendar')} role="tab" aria-selected={timeView === 'calendar'}><CalendarDays size={13} /> Calendar</button></div></div>
          <div className="selected-moment"><Clock3 size={15} /><strong>{guess.time ? formatMoment(guess.time) : 'Choose a date and time'}</strong><span>{guess.time ? 'YOUR GUESS' : 'NO TIME SELECTED'}</span></div>
          {timeView === 'timeline' ? <Timeline value={timeValue} onChange={setSelectedTime} /> : <div className="calendar-controls"><label><span>DATE</span><input type="date" min={MIN_DATE.slice(0, 10)} max={MAX_DATE.slice(0, 10)} value={guess.time ? dateToInputValue(guess.time).slice(0, 10) : ''} onChange={(event) => { if (event.target.value) { const date = new Date(guess.time ?? MIN_DATE); const [year, month, day] = event.target.value.split('-').map(Number); date.setFullYear(year, month - 1, day); setSelectedTime(date) } }} /></label><label><span>TIME</span><input type="time" value={guess.time ? dateToInputValue(guess.time).slice(11, 16) : ''} onChange={(event) => { if (event.target.value) { const date = new Date(guess.time ?? MIN_DATE); const [hour, minute] = event.target.value.split(':').map(Number); date.setHours(hour, minute, 0, 0); setSelectedTime(date) } }} /></label></div>}
          <div className="allowed-range">THE MOMENTS ARE BETWEEN <b>SEP 01, 2026</b> AND <b>JUN 01, 2027</b></div></div></div>
        <div className="map-panel"><div className="map-panel-header"><div><span className="step-tag">02</span><div><h2>Pin the place</h2><p>Click anywhere on the map to drop your pin.</p></div></div><span className="map-usa"><MapPin size={13} /> UNITED STATES</span></div>
          <div className="map-wrap"><MapView scope={mapScope} guess={guess.location} round={roundIndex} onPick={(point) => setGuess((current) => ({ ...current, location: { lat: point.lat, lng: point.lng } }))} /><div className="map-zoom-label">{mapScope === 'campus' ? 'COLLEGE STATION, TX' : mapScope === 'area' ? 'BRAZOS VALLEY, TX' : 'THE LONE STAR STATE'}</div><div className="map-presets" aria-label="Map view">{([['campus', 'Campus'], ['area', 'Bryan / C.S.'], ['texas', 'Texas']] as const).map(([scope, label]) => <button key={scope} className={mapScope === scope ? 'active' : ''} onClick={() => setMapScope(scope)}>{label}</button>)}</div></div>
          <div className="map-bottom"><div className="pin-status"><span className={`pin-status-dot ${guess.location ? 'placed' : ''}`} /><span>{guess.location ? `${guess.location.lat.toFixed(3)}°, ${guess.location.lng.toFixed(3)}°` : 'No pin dropped yet'}</span></div><span className="map-helper">ZOOM + / − TO EXPLORE</span></div></div></div>
      <div className="game-footer"><span><b>{playerName}</b><span className="family-divider">·</span>{family} fam</span>{(!isApiConfigured || challengeLoadError) && <span className="demo-tag">SAMPLE CHALLENGES <i>·</i> {isApiConfigured ? 'archive unavailable' : 'replace before launch'}</span>}<button className="primary-button submit-button" onClick={revealRound}>Lock in my guess <ArrowRight size={16} /></button></div>
    </section>}

    {screen === 'reveal' && challenge && <section className="reveal-page"><div className="eyebrow"><span className="eyebrow-line" /> THE MEMORY REVEALED <span className="crumb">/ ROUND {String(roundIndex + 1).padStart(2, '0')}</span></div>
      <div className="reveal-layout"><div className="reveal-photo"><img src={challenge.image} alt={challenge.alt} /><span className="reveal-stamp">CSA<br />ARCHIVE</span><span className="reveal-photo-label">THE MOMENT · {challenge.place}</span></div><div className="reveal-copy"><span className="reveal-kicker">{challenge.category} · {formatMoment(new Date(challenge.date))}</span><h1>{challenge.title}</h1><p className="reveal-description">{challenge.description}</p>
        <div className="score-breakdown"><div><span>PLACE</span><strong>{roundScore.location}<small>/ 500</small></strong><p>{roundScore.distance === null ? 'No pin placed' : `${Math.round(roundScore.distance)} km away`}</p></div><div><span>TIME</span><strong>{roundScore.time}<small>/ 500</small></strong><p>{roundScore.hours === null ? 'No time selected' : `${roundScore.hours.toFixed(1)} hours apart`}</p></div><div className="round-total"><span>ROUND SCORE</span><strong>{roundScore.total}<small>/ 1,000</small></strong><p>{getSpeedLabel(submittedAt)} decision</p></div></div>
        <div className="reveal-footer"><span><Sparkles size={15} /> {getTier(scoreThroughCurrent)} so far · {scoreThroughCurrent.toLocaleString()} pts</span><button className="primary-button" onClick={continueAfterReveal}>{roundIndex === 4 ? 'See my results' : 'Next memory'} <ArrowRight size={16} /></button></div></div></div>
    </section>}

    {screen === 'complete' && <section className="complete-page"><div className="complete-confetti">✳　✦　✳</div><div className="eyebrow"><span className="eyebrow-line" /> YOUR TIME CAPSULE IS COMPLETE</div><h1>Well traveled,<br /><em>{playerName}.</em></h1><p className="complete-subtitle">Five moments down. Here’s how your memory lane measured up.</p>
      <div className="final-score-card"><div className="final-score-label"><Trophy size={17} /> YOUR FINAL SCORE</div><strong>{totalScore.toLocaleString()}<small> / 5,000</small></strong><div className="final-tier">{getSpeedLabel(results.reduce((sum, result) => sum + result.secondsTaken, 0))} <span>·</span> {getTier(totalScore)}</div><div className="final-results">{results.map((result, index) => <div key={index}><span>0{index + 1}</span><i style={{ width: `${result.total / 10}%` }} /><b>{result.total}</b></div>)}</div></div>
      <div className="complete-actions"><button className="primary-button" onClick={() => setScreen('leaderboard')}><Trophy size={16} /> View leaderboard <ArrowRight size={16} /></button><button className="secondary-button" onClick={() => setScreen('home')}><RotateCcw size={15} /> Play again</button></div><p className="complete-family">Representing <b>{family}</b> fam</p>
    </section>}

    {screen === 'leaderboard' && <section className="leaderboard-page"><div className="eyebrow"><span className="eyebrow-line" /> THE WALL OF MEMORIES</div><h1>Good company.<br /><em>Great memories.</em></h1><p className="leaderboard-intro">Your best run counts. Ties are broken by the fastest trip through time.</p>
      <div className="leaderboard-grid"><div className="leaderboard-card"><div className="leaderboard-card-head"><div><Trophy size={17} /><h2>Individual adventurers</h2></div><span>BEST RUNS</span></div>{leaderboard.length ? <div className="leaderboard-table"><div className="leaderboard-row table-header"><span>RANK</span><span>ADVENTURER</span><span>FAM</span><span>SCORE</span><span>TIME</span></div>{leaderboard.slice(0, 10).map((entry, index) => <div className={`leaderboard-row ${playerName && entry.name.toLowerCase() === playerName.toLowerCase() ? 'you-row' : ''}`} key={`${entry.name}-${entry.family}`}><span className="rank-number">{String(index + 1).padStart(2, '0')}</span><span className="entry-name">{entry.name}{playerName && entry.name.toLowerCase() === playerName.toLowerCase() && <small>YOU</small>}</span><span><i className="fam-dot" />{entry.family}</span><b>{entry.score.toLocaleString()}</b><span>{formatDuration(entry.secondsTaken)}</span></div>)}</div> : <div className="empty-leaderboard"><Trophy size={26} /><strong>The first memory is yours to make.</strong><span>Complete a five-round run to join the board.</span></div>}</div>
        <aside className="family-card"><div className="leaderboard-card-head"><div><Sparkles size={17} /><h2>Fam standings</h2></div><span>AVERAGES</span></div>{familyRows.map((row, index) => <div className={`family-row ${index === 0 && row.count > 0 ? 'fam-leader' : ''}`} key={row.name}><span className="family-rank">{String(index + 1).padStart(2, '0')}</span><span className="family-name">{row.name}<small>{row.count} {row.count === 1 ? 'adventurer' : 'adventurers'}</small></span><b>{row.score.toLocaleString()}<small> AVG</small></b></div>)}<p className="family-footnote">Average best score per adventurer · faster time breaks ties</p></aside></div>
      <button className="secondary-button back-button" onClick={() => setScreen('home')}><ArrowLeft size={16} /> Back to the atlas</button>
    </section>}
    {screen === 'admin' && <AdminPanel onExit={() => setScreen('home')} onChallengesChanged={refreshChallengePool} />}
    <footer className="site-footer"><span>CSA · TEXAS A&amp;M UNIVERSITY</span><span>MADE OF MOMENTS <i>✳</i></span><span>SEASON 2026—27</span></footer>
  </main>
}

export default App
