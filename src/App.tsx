import { useCallback, useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Polyline, TileLayer, useMapEvents } from 'react-leaflet'
import L, { type LatLng } from 'leaflet'
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, Compass, ImageOff, MapPin, RotateCcw, Sparkles, Trophy } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import './App.css'
import './Calendar.css'
import './Motion.css'
import './MediaFallback.css'
import { dateToInputValue, formatDuration, formatMoment, getRoundScore, getSpeedLabel, getTier, type Challenge, type Family, type Guess, type LeaderboardEntry, type RoundResult, FAMILIES, MAX_DATE, MIN_DATE, loadLeaderboard, saveLeaderboard, shuffleChallenges } from './game'
import { loadChallenges } from './staticChallenges'

type Screen = 'home' | 'play' | 'reveal' | 'complete' | 'leaderboard'
type MapScope = 'campus' | 'area' | 'texas'

const emptyGuess = (): Guess => ({ location: null, time: null })
const guessPinIcon = L.divIcon({ className: 'guess-pin-wrapper', html: '<span class="guess-pin"><span></span></span>', iconSize: [28, 36], iconAnchor: [14, 34] })

function ClickableMap({ onPick }: { onPick: (point: LatLng) => void }) {
  useMapEvents({ click: ({ latlng }) => onPick(latlng) })
  return null
}

function ChallengePhoto({ image, alt, title }: { image: string; alt: string; title: string }) {
  const [failedImage, setFailedImage] = useState('')
  if (!image || failedImage === image) {
    return <div className="challenge-photo-fallback" role="img" aria-label={`Photo unavailable: ${alt}`}>
      <ImageOff size={30} aria-hidden="true" />
      <span>PHOTO UNAVAILABLE</span>
      <strong>{title}</strong>
    </div>
  }
  return <img src={image} alt={alt} onError={() => setFailedImage(image)} />
}

function MapView({ scope, guess, onPick, round }: { scope: MapScope; guess: Guess['location']; onPick: (point: LatLng) => void; round: number }) {
  const presets: Record<MapScope, { center: [number, number]; zoom: number }> = {
    campus: { center: [30.6188, -96.3365], zoom: 15 },
    area: { center: [30.6505, -96.34], zoom: 11 },
    texas: { center: [31.1, -99.2], zoom: 6 },
  }
  const preset = presets[scope]

  return <MapContainer key={`${round}-${scope}`} center={preset.center} zoom={preset.zoom} scrollWheelZoom className="leaflet-map">
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
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

function CalendarPicker({ value, onChange }: { value: Date | null; onChange: (date: Date) => void }) {
  const minDate = new Date(`${MIN_DATE.slice(0, 10)}T00:00:00`)
  const maxDate = new Date(`${MAX_DATE.slice(0, 10)}T00:00:00`)
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initial = value ?? minDate
    return new Date(initial.getFullYear(), initial.getMonth(), 1)
  })
  const year = visibleMonth.getFullYear()
  const month = visibleMonth.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const previousMonth = new Date(year, month - 1, 1)
  const nextMonth = new Date(year, month + 1, 1)
  const canGoBack = previousMonth >= new Date(minDate.getFullYear(), minDate.getMonth(), 1)
  const canGoForward = nextMonth <= new Date(maxDate.getFullYear(), maxDate.getMonth(), 1)

  return <div className="calendar-picker">
    <div className="calendar-picker-top">
      <strong>{visibleMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>
      <div className="calendar-month-nav">
        <button type="button" aria-label="Previous month" disabled={!canGoBack} onClick={() => setVisibleMonth(previousMonth)}>‹</button>
        <button type="button" aria-label="Next month" disabled={!canGoForward} onClick={() => setVisibleMonth(nextMonth)}>›</button>
      </div>
    </div>
    <div className="calendar-days-grid" role="group" aria-label="Choose a date">
      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => <span className="calendar-weekday" key={day}>{day}</span>)}
      {Array.from({ length: firstWeekday }, (_, index) => <span className="calendar-empty-day" key={`empty-${index}`} />)}
      {Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1
        const date = new Date(year, month, day)
        const disabled = date < minDate || date > maxDate
        const selected = value?.getFullYear() === year && value.getMonth() === month && value.getDate() === day
        return <button type="button" key={day} className={`calendar-day ${selected ? 'selected' : ''}`} disabled={disabled} aria-pressed={selected} aria-label={date.toLocaleDateString('en-US', { dateStyle: 'full' })}
          onClick={() => onChange(new Date(year, month, day, value?.getHours() ?? 12, value?.getMinutes() ?? 0))}>{day}</button>
      })}
    </div>
    <label className="calendar-time-field"><span>TIME</span><input type="time" disabled={!value} value={value ? dateToInputValue(value).slice(11, 16) : ''}
      onChange={(event) => {
        if (!value || !event.target.value) return
        const [hour, minute] = event.target.value.split(':').map(Number)
        const updated = new Date(value)
        updated.setHours(hour, minute, 0, 0)
        const lower = new Date(MIN_DATE)
        const upper = new Date(MAX_DATE)
        onChange(new Date(Math.max(lower.getTime(), Math.min(upper.getTime(), updated.getTime()))))
      }} /></label>
  </div>
}

type RevealStage = 'location' | 'time' | 'complete'

function RevealRouteMap({ challenge, guess }: { challenge: Challenge; guess: Guess['location'] }) {
  const actual: [number, number] = [challenge.lat, challenge.lng]
  const guessed: [number, number] | null = guess ? [guess.lat, guess.lng] : null
  const bounds = guessed ? [actual, guessed] as [[number, number], [number, number]] : undefined
  const guessIcon = L.divIcon({ className: 'reveal-map-pin guess', html: '<span></span>', iconSize: [18, 18], iconAnchor: [9, 9] })
  const actualIcon = L.divIcon({ className: 'reveal-map-pin actual', html: '<span></span>', iconSize: [18, 18], iconAnchor: [9, 9] })

  return <MapContainer center={actual} zoom={13} bounds={bounds} boundsOptions={{ padding: [34, 34], maxZoom: 14 }} scrollWheelZoom={false} dragging={false} zoomControl={false} doubleClickZoom={false} className="reveal-route-map">
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    {guessed && <Polyline positions={[guessed, actual]} pathOptions={{ className: 'animated-route-line', color: '#cf593b', weight: 3, opacity: 0.9 }} />}
    {guessed && <Marker position={guessed} icon={guessIcon} />}
    <Marker position={actual} icon={actualIcon} />
  </MapContainer>
}

function RevealJourney({ challenge, guess, roundScore, onComplete }: { challenge: Challenge; guess: Guess; roundScore: ReturnType<typeof getRoundScore>; onComplete: () => void }) {
  const actualTime = new Date(challenge.date).getTime()
  const guessedTime = guess.time?.getTime() ?? actualTime
  const [stage, setStage] = useState<RevealStage>(guess.location ? 'location' : 'time')
  const [distanceShown, setDistanceShown] = useState(0)
  const [locationPointsShown, setLocationPointsShown] = useState(0)
  const [timeShown, setTimeShown] = useState(guessedTime)
  const [timePointsShown, setTimePointsShown] = useState(0)
  const [timeProgress, setTimeProgress] = useState(0)
  const finalDistance = roundScore.distance ?? 0
  const finalHours = roundScore.hours ?? 0

  useEffect(() => {
    if (stage !== 'location') return
    let frame = 0
    const start = performance.now()
    const duration = 1800
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - (1 - progress) ** 3
      setDistanceShown(finalDistance * eased)
      setLocationPointsShown(roundScore.location * eased)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    const transition = window.setTimeout(() => setStage('time'), 2700)
    return () => { cancelAnimationFrame(frame); window.clearTimeout(transition) }
  }, [finalDistance, roundScore.location, stage])

  useEffect(() => {
    if (stage !== 'time') return
    let frame = 0
    const start = performance.now()
    const startDelay = 350
    const duration = 2100
    const tick = (now: number) => {
      const progress = Math.max(0, Math.min((now - start - startDelay) / duration, 1))
      const eased = 1 - (1 - progress) ** 3
      setTimeShown(guessedTime + (actualTime - guessedTime) * eased)
      setTimePointsShown(roundScore.time * eased)
      setTimeProgress(eased)
      if (progress < 1) frame = requestAnimationFrame(tick)
      else setStage('complete')
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [actualTime, guessedTime, roundScore.time, stage])

  useEffect(() => {
    if (stage === 'complete') onComplete()
  }, [onComplete, stage])

  const deltaShown = finalHours * timeProgress
  const displayDistance = (value: number) => value < 1 ? `${Math.round(value * 1000)} m` : `${value.toFixed(1)} km`
  const rollingTime = new Date(timeShown)

  return <div className={`reveal-journey reveal-stage-${stage}`}>
    <section className={`journey-panel location-journey ${stage !== 'location' ? 'journey-done' : 'journey-active'}`} aria-label="Location accuracy reveal">
      <div className="journey-panel-heading"><span className="journey-step">01 · PLACE</span><h2>{stage === 'location' ? 'Tracing your guess…' : 'Your location guess'}</h2></div>
      <div className="location-journey-content">
        <div className="route-map-shell"><RevealRouteMap challenge={challenge} guess={guess.location} /><div className="route-map-legend"><span><i className="guess-key" /> YOUR GUESS</span><span><i className="actual-key" /> ACTUAL LOCATION</span></div></div>
        <div className="journey-metrics">
          <span className="metric-kicker">DISTANCE FROM THE MOMENT</span>
          {guess.location ? <strong className="rolling-metric">{stage === 'location' ? displayDistance(distanceShown) : displayDistance(finalDistance)}</strong> : <strong className="rolling-metric no-guess">No pin placed</strong>}
          <span className="metric-support">{guess.location ? 'between your pin and the actual location' : 'Place a pin on the map next time to score location points'}</span>
          <div className="metric-score"><span>PLACE SCORE</span><strong>{Math.round(stage === 'location' ? locationPointsShown : roundScore.location)}<small> / 500</small></strong></div>
        </div>
      </div>
    </section>

    <section className={`journey-panel time-journey ${stage === 'time' ? 'journey-active' : ''} ${stage === 'complete' ? 'journey-done' : ''}`} aria-label="Time accuracy reveal">
      <div className="journey-panel-heading"><span className="journey-step">02 · TIME</span><h2>{stage === 'location' ? 'Next: when did it happen?' : stage === 'time' ? 'Turning back the clock…' : 'Your time guess'}</h2></div>
      <div className="time-journey-content">
        <div className="time-guess-card"><span className="metric-kicker">YOUR GUESS</span><strong>{guess.time ? formatMoment(guess.time) : 'No time selected'}</strong></div>
        <div className="time-roll-card"><span className="metric-kicker">THE ACTUAL MOMENT</span><strong className={`rolling-time ${stage === 'time' ? 'is-rolling' : ''}`}>{stage === 'location' ? 'Waiting for the place…' : guess.time ? formatMoment(rollingTime) : formatMoment(new Date(actualTime))}</strong>
          <div className="time-delta"><span>TIME APART</span><strong>{guess.time ? (stage === 'complete' ? finalHours.toFixed(1) : stage === 'time' ? deltaShown.toFixed(1) : "0") : '—'}<small>{guess.time ? ' hours' : ''}</small></strong></div>
        </div>
        <div className="metric-score time-score"><span>TIME SCORE</span><strong>{Math.round(stage === 'time' ? timePointsShown : stage === 'complete' ? roundScore.time : 0)}<small> / 500</small></strong></div>
      </div>
    </section>

    {stage === 'complete' && <div className="journey-celebration" aria-hidden="true">{Array.from({ length: 26 }, (_, index) => <i key={index} style={{ '--confetti-x': `${(index * 37 + 9) % 100}%`, '--confetti-delay': `${(index % 9) * 65}ms`, '--confetti-hue': `${(index * 41) % 360}deg` } as React.CSSProperties} />)}</div>}
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
  const [revealAnimationComplete, setRevealAnimationComplete] = useState(false)
  const [challengePool, setChallengePool] = useState<Challenge[]>([])
  const [challengeLoadError, setChallengeLoadError] = useState('')

  const refreshChallengePool = useCallback(async () => {
    try {
      const challenges = await loadChallenges()
      setChallengePool(challenges)
      setChallengeLoadError(challenges.length < 5 ? `The JSON archive has ${challenges.length} challenge${challenges.length === 1 ? '' : 's'}; add at least five to enable gameplay.` : '')
    } catch (error) {
      setChallengePool([])
      const reason = error instanceof Error ? error.message : 'Could not load the event archive.'
      setChallengeLoadError(`${reason} Please try again later.`)
    }
  }, [])

  useEffect(() => {
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
        setRevealAnimationComplete(false)
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
  const revealRound = () => { setSubmittedAt(60 - secondsLeft); setRevealAnimationComplete(false); setScreen('reveal') }
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
  const handleRevealComplete = useCallback(() => setRevealAnimationComplete(true), [])
  const setSelectedTime = (date: Date) => setGuess((current) => ({ ...current, time: date }))
  const timeValue = guess.time ?? new Date(MIN_DATE)
  const scoreThroughCurrent = totalScore + (screen === 'reveal' ? roundScore.total : 0)

  return <main className="app-shell">
    <header className="topbar">
      <button className="brand-lockup" onClick={() => setScreen('home')} aria-label="ChronoScape Atlas home"><span className="brand-mark"><Compass size={20} /></span><span>CHRONOSCAPE <b>ATLAS</b></span></button>
      <div className="topbar-right"><span className="season-chip"><span /> 2026—27 SEASON</span><button className="leaderboard-link" onClick={() => setScreen('leaderboard')}><Trophy size={16} /> Leaderboard</button></div>
    </header>

    {screen === 'home' && <section className="welcome-page">
      <div className="welcome-copy"><div className="eyebrow"><span className="eyebrow-line" /> THE CSA TIME CAPSULE</div><h1>Somewhere.<br /><em>Sometime.</em></h1><p className="welcome-text">Five moments from a year in Aggieland. Can you figure out where you are—and when it happened?</p>
        <div className="welcome-stats"><div><strong>05</strong><span>ROUNDS</span></div><i /><div><strong>01:00</strong><span>PER MOMENT</span></div><i /><div><strong>1,000</strong><span>PTS / ROUND</span></div></div><div className="welcome-art-note"><Sparkles size={15} /> A little memory. A lot of detective work.</div></div>
      <div className="welcome-form-wrap"><div className="form-card"><div className="form-card-top"><span>BEFORE WE BEGIN</span><span className="card-number">01 / 02</span></div><h2>Make it a moment.</h2><p className="form-intro">Tell us who’s taking the trip.</p>
        <label className="field-label" htmlFor="player-name">YOUR NAME</label><input id="player-name" className="text-input" maxLength={28} placeholder="e.g. Alex Chen" value={playerName} onChange={(event) => setPlayerName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && family) startGame() }} />
        <label className="field-label family-label">YOUR FAM <span>Choose your crew</span></label><div className="family-grid">{FAMILIES.map((name) => <button key={name} className={`family-option ${family === name ? 'selected' : ''}`} onClick={() => setFamily(name)}>{name}{family === name && <Check size={14} />}</button>)}</div>
        <button className="primary-button start-button" disabled={!playerName.trim() || !family || challengePool.length < 5} onClick={startGame}>Let’s travel <ArrowRight size={17} /></button><p className="privacy-note"><span>✳</span> Your best run counts on the leaderboard.</p>{challengePool.length === 0 && !challengeLoadError && <p className="challenge-pool-note">Loading moments from the local archive…</p>}{challengeLoadError && <p className="challenge-pool-note error-text">{challengeLoadError}</p>}</div><div className="tape-note">SAY CHEESE! <span>↗</span></div></div>
      <footer className="welcome-footer"><span>TEXAS A&amp;M · CHINESE STUDENT ASSOCIATION</span><span>COLLECTING LITTLE MOMENTS, 2026—2027</span></footer>
    </section>}

    {screen === 'play' && challenge && <section className="game-page">
      <div className="game-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> FIELD NOTES <span className="crumb">/ ROUND {String(roundIndex + 1).padStart(2, '0')}</span></div><h1>Where in the world <em>were we?</em></h1></div><div className={`timer-pill ${secondsLeft <= 15 ? 'timer-urgent' : ''}`}><Clock3 size={17} /><span>{String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}</span><small>REMAINING</small></div></div>
      <div className="round-progress" aria-label={`Round ${roundIndex + 1} of 5`}>{Array.from({ length: 5 }, (_, index) => <span key={index} className={index < roundIndex ? 'done' : index === roundIndex ? 'current' : ''} />)}<b>ROUND {roundIndex + 1} OF 5</b></div>
      <div className="game-grid"><div className="prompt-column"><article className="photo-card"><ChallengePhoto image={challenge.image} alt={challenge.alt} title={challenge.title} /><div className="photo-shade" /><div className="photo-meta"><span><span className="live-dot" /> CSA ARCHIVE · MOMENT {String(roundIndex + 1).padStart(2, '0')}</span><span>✳ UNDATED</span></div><div className="photo-caption"><span>YOUR PHOTO CLUE</span><strong>{challenge.caption}</strong><p>{challenge.photoNote}</p></div><div className="photo-frame-mark">CSA<br />2026</div></article>
        <div className="time-panel"><div className="panel-heading"><div><span className="step-tag">01</span><div><h2>When did it happen?</h2><p>Set the moment on the calendar.</p></div></div><div className="view-switch" role="tablist"><button className={timeView === 'timeline' ? 'active' : ''} onClick={() => setTimeView('timeline')} role="tab" aria-selected={timeView === 'timeline'}>Timeline</button><button className={timeView === 'calendar' ? 'active' : ''} onClick={() => setTimeView('calendar')} role="tab" aria-selected={timeView === 'calendar'}><CalendarDays size={13} /> Calendar</button></div></div>
          <div className="selected-moment"><Clock3 size={15} /><strong>{guess.time ? formatMoment(guess.time) : 'Choose a date and time'}</strong><span>{guess.time ? 'YOUR GUESS' : 'NO TIME SELECTED'}</span></div>
          {timeView === 'timeline' ? <Timeline value={timeValue} onChange={setSelectedTime} /> : <CalendarPicker key={roundIndex} value={guess.time} onChange={setSelectedTime} />}
          <div className="allowed-range">THE MOMENTS ARE BETWEEN <b>SEP 01, 2026</b> AND <b>JUN 01, 2027</b></div></div></div>
        <div className="map-panel"><div className="map-panel-header"><div><span className="step-tag">02</span><div><h2>Pin the place</h2><p>Click anywhere on the map to drop your pin.</p></div></div><span className="map-usa"><MapPin size={13} /> UNITED STATES</span></div>
          <div className="map-wrap"><MapView scope={mapScope} guess={guess.location} round={roundIndex} onPick={(point) => setGuess((current) => ({ ...current, location: { lat: point.lat, lng: point.lng } }))} /><div className="map-zoom-label">{mapScope === 'campus' ? 'COLLEGE STATION, TX' : mapScope === 'area' ? 'BRAZOS VALLEY, TX' : 'THE LONE STAR STATE'}</div><div className="map-presets" aria-label="Map view">{([['campus', 'Campus'], ['area', 'Bryan / C.S.'], ['texas', 'Texas']] as const).map(([scope, label]) => <button key={scope} className={mapScope === scope ? 'active' : ''} onClick={() => setMapScope(scope)}>{label}</button>)}</div></div>
          <div className="map-bottom"><div className="pin-status"><span className={`pin-status-dot ${guess.location ? 'placed' : ''}`} /><span>{guess.location ? `${guess.location.lat.toFixed(3)}°, ${guess.location.lng.toFixed(3)}°` : 'No pin dropped yet'}</span></div><span className="map-helper">ZOOM + / − TO EXPLORE</span></div></div></div>
      <div className="game-footer"><span><b>{playerName}</b><span className="family-divider">·</span>{family} fam</span><span className="demo-tag">LOCAL JSON ARCHIVE</span><button className="primary-button submit-button" onClick={revealRound}>Lock in my guess <ArrowRight size={16} /></button></div>
    </section>}

    {screen === 'reveal' && challenge && <section className="reveal-page"><div className="eyebrow"><span className="eyebrow-line" /> THE MEMORY REVEALED <span className="crumb">/ ROUND {String(roundIndex + 1).padStart(2, '0')}</span></div>
      <div className="reveal-layout"><div className="reveal-photo"><ChallengePhoto image={challenge.image} alt={challenge.alt} title={challenge.title} /><span className="reveal-stamp">CSA<br />ARCHIVE</span><span className="reveal-photo-label">THE MOMENT · {challenge.place}</span></div><div className="reveal-copy"><span className="reveal-kicker">{challenge.category} · {formatMoment(new Date(challenge.date))}</span><h1>{challenge.title}</h1><p className="reveal-description">{challenge.description}</p>
        </div></div>
      <RevealJourney key={`${roundIndex}-${challenge.id}`} challenge={challenge} guess={guess} roundScore={roundScore} onComplete={handleRevealComplete} />
      <div className="reveal-footer"><span><Sparkles size={15} /> {getTier(scoreThroughCurrent)} so far · {scoreThroughCurrent.toLocaleString()} pts</span><div className="reveal-footer-result"><strong>{roundScore.total.toLocaleString()}<small> / 1,000</small></strong><span>{getSpeedLabel(submittedAt)} decision</span></div><button className="primary-button" onClick={continueAfterReveal} disabled={!revealAnimationComplete}>{roundIndex === 4 ? 'See my results' : 'Next memory'} <ArrowRight size={16} /></button></div>
    </section>}

    {screen === 'complete' && <section className="complete-page"><div className="complete-confetti">✳　✦　✳</div><div className="eyebrow"><span className="eyebrow-line" /> YOUR TIME CAPSULE IS COMPLETE</div><h1>Well traveled,<br /><em>{playerName}.</em></h1><p className="complete-subtitle">Five moments down. Here’s how your memory lane measured up.</p>
      <div className="final-score-card"><div className="final-score-label"><Trophy size={17} /> YOUR FINAL SCORE</div><strong>{totalScore.toLocaleString()}<small> / 5,000</small></strong><div className="final-tier">{getSpeedLabel(results.reduce((sum, result) => sum + result.secondsTaken, 0))} <span>·</span> {getTier(totalScore)}</div><div className="final-results">{results.map((result, index) => <div key={index}><span>0{index + 1}</span><i style={{ width: `${result.total / 10}%` }} /><b>{result.total}</b></div>)}</div></div>
      <div className="complete-actions"><button className="primary-button" onClick={() => setScreen('leaderboard')}><Trophy size={16} /> View leaderboard <ArrowRight size={16} /></button><button className="secondary-button" onClick={() => setScreen('home')}><RotateCcw size={15} /> Play again</button></div><p className="complete-family">Representing <b>{family}</b> fam</p>
    </section>}

    {screen === 'leaderboard' && <section className="leaderboard-page"><div className="eyebrow"><span className="eyebrow-line" /> THE WALL OF MEMORIES</div><h1>Good company.<br /><em>Great memories.</em></h1><p className="leaderboard-intro">Your best run counts. Ties are broken by the fastest trip through time.</p>
      <div className="leaderboard-grid"><div className="leaderboard-card"><div className="leaderboard-card-head"><div><Trophy size={17} /><h2>Individual adventurers</h2></div><span>BEST RUNS</span></div>{leaderboard.length ? <div className="leaderboard-table"><div className="leaderboard-row table-header"><span>RANK</span><span>ADVENTURER</span><span>FAM</span><span>SCORE</span><span>TIME</span></div>{leaderboard.slice(0, 10).map((entry, index) => <div className={`leaderboard-row leaderboard-float-in ${playerName && entry.name.toLowerCase() === playerName.toLowerCase() ? 'you-row' : ''}`} style={{ '--stagger-index': index } as React.CSSProperties} key={`${entry.name}-${entry.family}`}><span className="rank-number">{String(index + 1).padStart(2, '0')}</span><span className="entry-name">{entry.name}{playerName && entry.name.toLowerCase() === playerName.toLowerCase() && <small>YOU</small>}</span><span><i className="fam-dot" />{entry.family}</span><b>{entry.score.toLocaleString()}</b><span>{formatDuration(entry.secondsTaken)}</span></div>)}</div> : <div className="empty-leaderboard"><Trophy size={26} /><strong>The first memory is yours to make.</strong><span>Complete a five-round run to join the board.</span></div>}</div>
        <aside className="family-card"><div className="leaderboard-card-head"><div><Sparkles size={17} /><h2>Fam standings</h2></div><span>AVERAGES</span></div>{familyRows.map((row, index) => <div className={`family-row leaderboard-float-in ${index === 0 && row.count > 0 ? 'fam-leader' : ''}`} style={{ '--stagger-index': index } as React.CSSProperties} key={row.name}><span className="family-rank">{String(index + 1).padStart(2, '0')}</span><span className="family-name">{row.name}<small>{row.count} {row.count === 1 ? 'adventurer' : 'adventurers'}</small></span><b>{row.score.toLocaleString()}<small> AVG</small></b></div>)}<p className="family-footnote">Average best score per adventurer · faster time breaks ties</p></aside></div>
      <button className="secondary-button back-button" onClick={() => setScreen('home')}><ArrowLeft size={16} /> Back to the atlas</button>
    </section>}
    <footer className="site-footer"><span>CSA · TEXAS A&amp;M UNIVERSITY</span><span>MADE OF MOMENTS <i>✳</i></span><span>SEASON 2026—27</span></footer>
  </main>
}

export default App
