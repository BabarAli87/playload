import type { Point, Theme, ThemeAPI } from '../../theme'
import { type Geo, ROCKET_HALF_TAIL, drawCaption, drawFlag, drawPad, drawPlanet, drawRocket, drawSky, drawTrail, makeGeo, makeStars, pathAt } from './render'

const ZONE_TOP = 20
const ZONE_H = 112
const ZONE_BOTTOM = ZONE_TOP + ZONE_H
const HOLD = 1.2 // seconds of holding the rocket before it launches
const SHOWN_SPEED = 55 // max visual progress per second, so even instant uploads are a watchable flight
const DONE_SPEED = 90 // catch-up speed once the upload has finished

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const ease = (t: number) => 1 - Math.pow(1 - t, 3)
const smooth = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }

interface Spark { x: number; y: number; vx: number; vy: number; life: number }
interface Flight {
  file: File
  state: 'up' | 'landed' | 'crashed'
  target: number // real upload progress, 0..100
  shown: number // what the rocket has "flown" so far, lags behind target
  done: boolean
  t: number // seconds in the current state
  x: number; y: number; heading: number; scale: number; thrust: number
  vx: number; vy: number; spin: number
  trail: { x: number; y: number; age: number }[]
  trailT: number
  stage: number
  sparks: Spark[]
}

/** The upload IS the flight: hold the rocket to launch, progress flies it, completion lands it on a planet. */
export function rocket(api: ThemeAPI): Theme {
  let g: Geo = makeGeo(560, 520, ZONE_BOTTOM)
  const stars = makeStars(70)
  const flights: Flight[] = []
  let phase: 'idle' | 'holding' = 'idle'
  let holdT = 0
  let spawnT = 1
  let clock = 0
  let scroll = 0

  api.arena.style.setProperty('--pl-height', '520px')
  api.arena.style.setProperty('--pl-zone-top', ZONE_TOP + 'px')
  api.arena.style.setProperty('--pl-zone-h', ZONE_H + 'px')

  const padRocketHit = (p: Point) => Math.abs(p.x - g.pad.x) < 42 && p.y > g.pad.y - 70 && p.y < g.pad.y + 45

  function newFlight(file: File): Flight {
    const f: Flight = {
      file, state: 'up', target: 0, shown: 0, done: false, t: 0,
      x: g.pad.x, y: g.pad.y, heading: 0, scale: 1, thrust: 0.25,
      vx: 0, vy: 0, spin: 0, trail: [], trailT: 0, stage: -1, sparks: [],
    }
    flights.push(f)
    api.requestFrame()
    return f
  }

  const liveFlight = (file: File) => flights.find((f) => f.file === file && f.state === 'up')

  /** How far along the path (0..1) the rocket is, from the upload percentage. */
  function pathT(s: number) {
    if (s <= 20) return 0 // still on the pad, engines spooling up
    if (s <= 60) { const q = (s - 20) / 40; return 0.45 * q * q } // lift-off: accelerates
    if (s <= 90) return 0.45 + 0.4 * ((s - 60) / 30) // cruising through space
    return 0.85 + 0.15 * ((s - 90) / 10) // approaching the planet
  }

  function pose(f: Flight) {
    const t = pathT(f.shown)
    const p = pathAt(g, t)
    const finalHeading = Math.atan2(g.normal.x, -g.normal.y)
    const flip = smooth(0.86, 1, t) // turn tail-down for touchdown
    f.heading = p.heading * (1 - flip) + finalHeading * flip
    f.scale = 1 - 0.5 * t
    f.thrust = f.shown < 20 ? 0.25 + 0.5 * (f.shown / 20) : 1 - 0.6 * smooth(0.9, 1, t)
    const shake = f.shown < 20 ? 1 + 3 * (f.shown / 20) : 0
    f.x = p.x + shake * (Math.sin(clock * 71) + Math.sin(clock * 53)) * 0.5
    f.y = p.y + shake * Math.sin(clock * 61) * 0.5
  }

  function stageMessage(f: Flight) {
    const s = f.shown
    const stage = s >= 85 ? 3 : s >= 45 ? 2 : 1
    if (stage > f.stage && flights[flights.length - 1] === f) {
      f.stage = stage
      api.say(api.text(['', 'rocket.ignite', 'rocket.fly', 'rocket.near'][stage]))
    } else if (stage > f.stage) f.stage = stage
  }

  function launch() {
    const file = api.file()
    phase = 'idle'
    holdT = 0
    if (!file) return
    newFlight(file)
    api.scored(undefined, false) // confetti waits for the landing
    api.commit()
  }

  function land(f: Flight) {
    f.state = 'landed'
    f.t = 0
    f.shown = 100
    pose(f)
    api.say(api.text('rocket.landed'))
    api.celebrate(g.end, 90)
  }

  function crash(f: Flight, reason: 'error' | 'cancel') {
    f.state = 'crashed'
    f.t = 0
    f.vx = (Math.random() - 0.5) * 120
    f.vy = -130
    f.spin = (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 3)
    f.sparks = Array.from({ length: 18 }, () => {
      const a = Math.random() * Math.PI * 2
      const v = 80 + Math.random() * 200
      return { x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5 + Math.random() * 0.5 }
    })
    api.say(api.text(reason === 'cancel' ? 'rocket.aborted' : 'rocket.crashed'), reason === 'error')
  }

  return {
    get hint() { return api.text(api.coarse ? 'rocket.hintTouch' : 'rocket.hint') },
    get subtitle() { return api.text('rocket.subtitle') },
    celebrates: true,

    resize(w, h) {
      g = makeGeo(w, h, ZONE_BOTTOM)
      api.requestFrame()
    },

    fileChanged() {
      phase = 'idle'
      holdT = 0
      if (api.file()) spawnT = 0
      api.requestFrame()
    },

    pointerDown(p) {
      if (phase !== 'idle' || spawnT < 1 || !api.file() || !padRocketHit(p)) return false
      phase = 'holding'
      holdT = 0
      api.say(api.text('rocket.prep'))
      api.setCursor('grabbing')
      api.requestFrame()
      return true
    },

    pointerMove(p, dragging) {
      if (!dragging && phase === 'idle') api.setCursor(api.file() && spawnT >= 1 && padRocketHit(p) ? 'pointer' : '')
    },

    pointerUp() {
      api.setCursor('')
      if (phase !== 'holding') return
      phase = 'idle'
      holdT = 0
      api.say(api.text('rocket.aborted.hold'))
    },

    pointerCancel() {
      api.setCursor('')
      if (phase === 'holding') { phase = 'idle'; holdT = 0 }
    },

    // ----- the upload drives the flight -----
    uploadStarted(file) {
      if (!liveFlight(file)) newFlight(file)
    },
    uploadProgress(file, percent) {
      const f = liveFlight(file) ?? newFlight(file)
      f.target = Math.max(f.target, Math.min(100, percent))
      api.requestFrame()
    },
    uploadSucceeded(file) {
      const f = liveFlight(file) ?? newFlight(file)
      f.done = true
      api.requestFrame()
    },
    uploadFailed(file, reason) {
      const f = liveFlight(file)
      if (f) crash(f, reason)
      api.requestFrame()
    },

    // a finger held on the rocket for over a second must not turn into a page scroll
    touchRegion: () => ({ x: g.pad.x - 55, y: g.pad.y - 75, width: 110, height: 125, touchAction: 'none' }),

    active: () => flights.length > 0 || phase === 'holding' || spawnT < 1,

    update(dt) {
      clock += dt
      if (spawnT < 1) spawnT = Math.min(1, spawnT + dt / 0.45)
      if (phase === 'holding') {
        holdT += dt
        if (holdT >= HOLD) launch()
      }

      let cruising = false
      for (const f of flights) {
        f.t += dt
        if (f.state === 'up') {
          const goal = f.done ? 100 : f.target
          f.shown = Math.min(goal, f.shown + (f.done ? DONE_SPEED : SHOWN_SPEED) * dt)
          pose(f)
          stageMessage(f)
          if (f.shown > 20 && f.shown < 95) cruising = true
          // smoke from the tail
          f.trailT -= dt
          if (f.trailT <= 0) {
            f.trailT = 0.03
            const nx = Math.sin(f.heading)
            const ny = -Math.cos(f.heading)
            f.trail.push({ x: f.x - nx * ROCKET_HALF_TAIL * f.scale, y: f.y - ny * ROCKET_HALF_TAIL * f.scale, age: 0 })
          }
          if (f.shown >= 100) land(f)
        } else if (f.state === 'crashed') {
          f.vy += 800 * dt
          f.x += f.vx * dt
          f.y += f.vy * dt
          f.heading += f.spin * dt
          f.thrust = 0
          for (const s of f.sparks) { s.vy += 300 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt }
        }
        for (const p of f.trail) p.age += dt
        f.trail = f.trail.filter((p) => p.age < 0.9)
      }
      scroll += dt * (cruising ? 70 : 6)
      for (let i = flights.length - 1; i >= 0; i--) {
        const f = flights[i]
        if ((f.state === 'landed' && f.t > 3.3) || (f.state === 'crashed' && f.t > 1.4)) flights.splice(i, 1)
      }
    },

    draw() {
      const { ctx, palette: pal } = api
      drawSky(ctx, g, stars, scroll, clock)
      drawPlanet(ctx, g)
      drawPad(ctx, g)

      for (const f of flights) drawTrail(ctx, f.trail)

      // the next rocket, waiting on the pad
      const file = api.file()
      if (file) {
        const k = spawnT < 1 ? ease(spawnT) : 1
        let x = g.pad.x
        let y = g.pad.y + (1 - k) * 70
        let thrust = 0
        if (phase === 'holding') {
          const h = holdT / HOLD
          const a = 0.5 + 3.5 * h
          x += (Math.sin(clock * 73) + Math.sin(clock * 47)) * 0.5 * a
          y += Math.sin(clock * 59) * 0.5 * a
          thrust = 0.2 + 0.6 * h
        }
        drawRocket(ctx, x, y, 0, 1, k, file.name, pal, thrust, clock)
        if (phase === 'holding') drawCountdown(ctx, g.pad.x, g.pad.y - 100, holdT / HOLD, pal.accent, pal.font)
      }

      for (const f of flights) {
        let alpha = 1
        if (f.state === 'landed' && f.t > 1.2) alpha = clamp(1 - (f.t - 1.2) / 0.6, 0, 1)
        if (f.state === 'crashed' && f.t > 0.7) alpha = clamp(1 - (f.t - 0.7) / 0.5, 0, 1)
        drawRocket(ctx, f.x, f.y, f.heading, f.scale, alpha, f.file.name, pal, f.thrust, clock)
        if (f.state === 'up') {
          const side = f.x > g.W * 0.55 ? -1 : 1 // keep the caption clear of the planet
          const x = f.x + side * (36 * f.scale + 12)
          drawCaption(ctx, x, f.y + 4, f.file.name, Math.floor(f.shown) + '%', pal, side === 1 ? 'left' : 'right')
        }
        if (f.state === 'crashed') {
          for (const s of f.sparks) {
            if (s.life <= 0) continue
            ctx.globalAlpha = clamp(s.life * 2, 0, 1)
            ctx.fillStyle = '#ffb43a'
            ctx.beginPath()
            ctx.arc(s.x, s.y, 2.5, 0, Math.PI * 2)
            ctx.fill()
          }
          ctx.globalAlpha = 1
        }
        if (f.state === 'landed') {
          const a = smooth(0.2, 0.5, f.t) * (1 - smooth(2.6, 3.2, f.t))
          if (a > 0) drawFlag(ctx, g, a, pal)
        }
      }
    },
  }
}

function drawCountdown(ctx: CanvasRenderingContext2D, x: number, y: number, k: number, accent: string, font: string) {
  const n = k < 1 / 3 ? '3' : k < 2 / 3 ? '2' : '1'
  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,.4)'
  ctx.beginPath()
  ctx.arc(x, y, 24, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = accent
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(x, y, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k)
  ctx.stroke()
  ctx.fillStyle = '#fff'
  ctx.font = `700 20px ${font}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(n, x, y + 1)
  ctx.restore()
}
