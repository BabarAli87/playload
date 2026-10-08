import type { Palette, Point, Theme, ThemeAPI } from '../../theme'
import {
  type Ball, type Layout, type Phase,
  launchVelocity, makeBall, predictArc, startPos, stepFlight,
} from './physics'

const ease = (t: number) => 1 - Math.pow(1 - t, 3)

/** Everything that makes one "slingshot toss" theme different from another. */
export interface TossSpec {
  readonly hint: string
  readonly subtitle: string
  /** Arena + dropzone geometry (CSS pixels). */
  arenaHeight: number
  zoneTop: number
  zoneHeight: number
  layout(width: number, height: number): Layout
  /** Where the piece ends up after scoring (it animates there, shrinking and fading). */
  scoreTarget(L: Layout): Point
  /** Optional extra solid geometry (e.g. the walls of a bin). Runs after every physics step. */
  collide?(ball: Ball, L: Layout): void
  /** Drawn behind the piece when it is inside the target. */
  drawBack(ctx: CanvasRenderingContext2D, L: Layout, pal: Palette): void
  /** Drawn in front of the piece when it is inside the target. `shake` is the current wobble in px. */
  drawFront(ctx: CanvasRenderingContext2D, L: Layout, shake: number, pal: Palette): void
  drawPiece(ctx: CanvasRenderingContext2D, ball: Ball, file: File, scale: number, alpha: number, pal: Palette): void
}

export function tossTheme(api: ThemeAPI, spec: TossSpec): Theme {
  let L: Layout = spec.layout(560, spec.arenaHeight)
  const ball: Ball = makeBall(L)
  let phase: Phase = 'idle'
  let pull: Point = { x: 0, y: 0 }
  let flightT = 0
  let phaseT = 0
  let acc = 0
  let from: Point = { x: 0, y: 0 }
  let spawnT = 1
  let fxT = 99
  let fxAmp = 0

  api.arena.style.setProperty('--pl-height', spec.arenaHeight + 'px')
  api.arena.style.setProperty('--pl-zone-top', spec.zoneTop + 'px')
  api.arena.style.setProperty('--pl-zone-h', spec.zoneHeight + 'px')

  const near = (p: Point) => Math.hypot(p.x - ball.x, p.y - ball.y) < 38

  function startScore() {
    phase = 'scoring'
    phaseT = 0
    from = { x: ball.x, y: ball.y }
    fxT = 0
    fxAmp = 14
    api.scored({ x: L.hoopX, y: L.rimY })
  }

  function finishScore() {
    phase = 'idle'
    Object.assign(ball, { x: L.home.x, y: L.home.y, vx: 0, vy: 0, angle: 0, spin: 0 })
    api.commit()
  }

  function startReturn(missed: boolean) {
    phase = 'returning'
    phaseT = 0
    from = { x: ball.x, y: ball.y }
    if (missed) api.missed()
  }

  return {
    get hint() { return spec.hint },
    get subtitle() { return spec.subtitle },

    resize(w, h) {
      L = spec.layout(w, h)
      if (phase === 'idle') { ball.x = L.home.x; ball.y = L.home.y }
      api.requestFrame()
    },

    fileChanged() {
      if (api.file()) spawnT = 0
      api.requestFrame()
    },

    pointerDown(p) {
      if (phase !== 'idle' || spawnT < 1 || !near(p)) return false
      phase = 'aiming'
      pull = p
      api.setCursor('grabbing')
      api.requestFrame()
      return true
    },

    pointerMove(p, dragging) {
      if (phase === 'aiming' && dragging) {
        pull = p
        api.requestFrame()
      } else if (phase === 'idle') {
        api.setCursor(api.file() && near(p) ? 'grab' : '')
      }
    },

    pointerUp() {
      if (phase !== 'aiming') return
      api.setCursor('')
      const v = launchVelocity(L.home, pull)
      if (v.pull < 24) return startReturn(false)
      const s = startPos(L, pull)
      Object.assign(ball, { x: s.x, y: s.y, vx: v.vx, vy: v.vy, spin: (Math.random() - 0.5) * 8 })
      phase = 'flying'
      flightT = 0
      acc = 0
      api.requestFrame()
    },

    pointerCancel() {
      if (phase !== 'aiming') return
      api.setCursor('')
      startReturn(false)
    },

    touchRegion: () => ({ x: L.home.x - 70, y: L.home.y - 70, width: 140, height: 140, touchAction: 'none' }),

    active: () => phase !== 'idle' || spawnT < 1 || fxT < 2,

    update(dt) {
      if (spawnT < 1) spawnT = Math.min(1, spawnT + dt / 0.3)
      if (fxT < 2) fxT += dt

      if (phase === 'flying') {
        flightT += dt
        acc += dt
        const STEP = 1 / 120
        while (acc >= STEP && phase === 'flying') {
          acc -= STEP
          const ev = stepFlight(ball, L, STEP)
          spec.collide?.(ball, L)
          if (ev.includes('score')) { startScore(); break }
        }
        const resting = ball.y > L.height - ball.r - 1 && Math.abs(ball.vy) < 70 && Math.abs(ball.vx) < 40
        if (phase === 'flying' && (resting || flightT > 6)) startReturn(true)
      } else if (phase === 'scoring') {
        phaseT += dt / 0.6
        const t = Math.min(1, phaseT)
        const e = ease(t)
        const to = spec.scoreTarget(L)
        ball.x = from.x + (to.x - from.x) * e
        ball.y = from.y + (to.y - from.y) * e
        ball.angle *= 0.92
        if (t >= 1) finishScore()
      } else if (phase === 'returning') {
        phaseT += dt / 0.4
        const t = Math.min(1, phaseT)
        const e = ease(t)
        ball.x = from.x + (L.home.x - from.x) * e
        ball.y = from.y + (L.home.y - from.y) * e
        ball.angle *= 0.85
        if (t >= 1) { phase = 'idle'; ball.angle = 0 }
      }
    },

    draw() {
      const { ctx, palette: pal } = api
      const shake = fxT < 2 ? fxAmp * Math.sin(fxT * 16) * Math.exp(-fxT * 3.2) : 0
      spec.drawBack(ctx, L, pal)
      const file = api.file()
      const inside = phase === 'scoring'

      if (file && inside) {
        const t = Math.min(1, phaseT)
        spec.drawPiece(ctx, ball, file, 1 - 0.45 * ease(t), t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3, pal)
      }
      spec.drawFront(ctx, L, shake, pal)

      if (file && !inside) {
        let b = ball
        let scale = 1
        if (phase === 'aiming') {
          const s = startPos(L, pull)
          b = { ...ball, x: s.x, y: s.y }
          const v = launchVelocity(L.home, pull)
          drawArc(ctx, predictArc(s, v.vx, v.vy), pal.accent)
          ctx.save()
          ctx.globalAlpha = 0.5
          ctx.strokeStyle = pal.muted
          ctx.setLineDash([2, 5])
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(L.home.x, L.home.y)
          ctx.lineTo(s.x, s.y)
          ctx.stroke()
          ctx.restore()
        } else if (spawnT < 1) {
          scale = ease(spawnT)
        }
        spec.drawPiece(ctx, b, file, scale, 1, pal)
      }
    },
  }
}

function drawArc(ctx: CanvasRenderingContext2D, pts: Point[], color: string) {
  ctx.save()
  pts.forEach((p, i) => {
    ctx.globalAlpha = Math.max(0.25, 1 - i * 0.05)
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(p.x, p.y, Math.max(2, 4 - i * 0.12), 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.restore()
}
