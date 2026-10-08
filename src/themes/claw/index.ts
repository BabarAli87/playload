import type { Palette, Point, Theme, ThemeAPI } from '../../theme'
import { drawBall } from '../basketball/render'

const ZONE_TOP = 20
const ZONE_H = 112
const ZONE_BOTTOM = ZONE_TOP + ZONE_H
const MIN_LEN = 34
const CHUTE_L = 16
const CHUTE_R = 106
const ARM_TIP = 46 // distance from claw head to the arm tips
const GRAB_OK = 26 // |claw - prize| within this = clean grab
const GRAB_SLIP = 46 // within this = it grabs, then slips
const GRAVITY = 1800

const ease = (t: number) => 1 - Math.pow(1 - t, 3)
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

type Phase = 'idle' | 'steer' | 'descend' | 'close' | 'rise' | 'carry' | 'open' | 'drop' | 'return'
type Grab = 'none' | 'slip' | 'good'

/** Slide the claw over the file, let go, and watch it grab and carry the file to the chute. */
export function claw(api: ThemeAPI): Theme {
  let W = 560
  let H = 520
  let phase: Phase = 'idle'
  let grab: Grab = 'none'
  let clawX = 280
  let targetX = 280
  let len = MIN_LEN
  let startLen = MIN_LEN
  let openT = 0 // 0 = open, 1 = closed
  let tm = 0
  let startX = 0
  let prizeFrac = 0.6
  const prize = { x: 0, y: 0, vy: 0, angle: 0, scale: 1, alpha: 1 }
  let attached = false
  let free = false // falling under gravity
  let spawning = false

  api.arena.style.setProperty('--pl-height', '520px')
  api.arena.style.setProperty('--pl-zone-top', ZONE_TOP + 'px')
  api.arena.style.setProperty('--pl-zone-h', ZONE_H + 'px')

  const rail = () => ZONE_BOTTOM + 38
  const floor = () => H - 48
  const restY = () => floor() - 24
  const home = () => W * 0.55
  const chuteX = () => (CHUTE_L + CHUTE_R) / 2
  const headY = () => rail() + len

  function placePrize() {
    prize.x = clamp(prizeFrac * W, CHUTE_R + 60, W - 50)
  }

  function canSteer(p: Point) {
    return phase === 'idle' && !!api.file() && !spawning && p.y > ZONE_BOTTOM + 6
  }

  return {
    get hint() { return api.text(api.coarse ? 'claw.hintTouch' : 'claw.hint') },
    get subtitle() { return api.text('claw.subtitle') },

    resize(w, h) {
      W = w
      H = h
      placePrize()
      if (!free && !attached && !spawning) prize.y = restY()
      if (phase === 'idle') { clawX = targetX = clamp(clawX || home(), 30, W - 30) }
      api.requestFrame()
    },

    fileChanged() {
      if (!api.file()) return
      prizeFrac = 0.4 + Math.random() * 0.5
      placePrize()
      prize.y = restY() - 280
      prize.vy = 0
      prize.angle = (Math.random() - 0.5) * 0.5
      prize.scale = 1
      prize.alpha = 1
      attached = false
      free = true
      spawning = true
      api.requestFrame()
    },

    pointerDown(p) {
      if (!canSteer(p)) return false
      phase = 'steer'
      targetX = clamp(p.x, 30, W - 30)
      api.setCursor('grabbing')
      api.requestFrame()
      return true
    },

    pointerMove(p, dragging) {
      if (phase === 'steer' && dragging) targetX = clamp(p.x, 30, W - 30)
      else if (phase === 'idle') api.setCursor(canSteer(p) ? 'grab' : '')
    },

    pointerUp() {
      if (phase !== 'steer') return
      api.setCursor('')
      phase = 'descend'
      tm = 0
      startLen = len
      targetX = clawX
    },

    pointerCancel() {
      if (phase !== 'steer') return
      api.setCursor('')
      phase = 'idle'
    },

    // steering is horizontal, so the page may keep scrolling vertically
    touchRegion: () => ({ x: 10, y: ZONE_BOTTOM + 16, width: W - 20, height: H - ZONE_BOTTOM - 26, touchAction: 'pan-y' }),

    active: () => phase !== 'idle' || free || spawning,

    update(dt) {
      // prize physics
      if (free) {
        prize.vy += GRAVITY * dt
        prize.y += prize.vy * dt
        const into = phase === 'open' && grab === 'good' || phase === 'drop'
        if (into) {
          const k = clamp((prize.y - floor()) / 40, 0, 1)
          prize.scale = 1 - 0.3 * k
          prize.alpha = 1 - k
        } else if (prize.y >= restY()) {
          prize.y = restY()
          if (Math.abs(prize.vy) > 160) prize.vy = -prize.vy * 0.32
          else { prize.vy = 0; free = false; spawning = false }
        }
      }

      if (phase === 'steer') {
        clawX += (targetX - clawX) * Math.min(1, dt * 14)
      } else if (phase === 'descend') {
        tm += dt / 0.9
        const t = Math.min(1, tm)
        const downLen = prize.y - ARM_TIP - rail() + 4
        len = startLen + (downLen - startLen) * ease(t)
        if (t >= 1) {
          const off = Math.abs(clawX - prize.x)
          grab = off <= GRAB_OK ? 'good' : off <= GRAB_SLIP ? 'slip' : 'none'
          phase = 'close'
          tm = 0
        }
      } else if (phase === 'close') {
        tm += dt / 0.35
        openT = Math.min(1, tm)
        if (tm >= 1) {
          if (grab !== 'none') { attached = true; free = false }
          phase = 'rise'
          tm = 0
          startLen = len
        }
      } else if (phase === 'rise') {
        tm += dt / 0.9
        const t = Math.min(1, tm)
        len = startLen + (MIN_LEN - startLen) * ease(t)
        if (grab === 'slip' && attached && t > 0.5) {
          attached = false
          free = true
          prize.vy = 0
        }
        if (t >= 1) {
          if (grab === 'good') { phase = 'carry'; startX = clawX }
          else { phase = 'open' }
          tm = 0
        }
      } else if (phase === 'carry') {
        tm += dt / 0.9
        clawX = startX + (chuteX() - startX) * ease(Math.min(1, tm))
        if (tm >= 1) {
          phase = 'open'
          tm = 0
          attached = false
          free = true
          prize.vy = 0
          api.scored({ x: chuteX(), y: floor() - 10 })
        }
      } else if (phase === 'open') {
        tm += dt / 0.35
        openT = 1 - Math.min(1, tm)
        if (tm >= 1) {
          if (grab === 'good') phase = 'drop'
          else {
            phase = 'idle'
            api.missed()
            if (grab === 'slip') api.say(api.text('claw.slip'))
          }
        }
      } else if (phase === 'drop') {
        if (!free || prize.y > floor() + 44) {
          free = false
          phase = 'return'
          tm = 0
          startX = clawX
          api.commit()
        }
      } else if (phase === 'return') {
        tm += dt / 0.6
        clawX = startX + (home() - startX) * ease(Math.min(1, tm))
        targetX = clawX
        if (tm >= 1) phase = 'idle'
      }

      if (attached) {
        prize.x = clawX
        prize.y = headY() + ARM_TIP - 14
        prize.angle = Math.sin(performance.now() / 180) * 0.06
      }
    },

    draw() {
      const { ctx, palette: pal } = api
      drawMachine(ctx, W, H, rail(), floor(), pal)
      const file = api.file()
      const showPrize = !!file && !(phase === 'return' && !free && prize.alpha <= 0.01)
      if (file && showPrize) drawBall(ctx, prize, file.name, pal, prize.scale * 1.12, prize.alpha)
      drawChuteFront(ctx, H, floor(), pal, api.text('claw.chute'))

      if (phase === 'steer') {
        ctx.save()
        ctx.globalAlpha = 0.6
        ctx.strokeStyle = pal.accent
        ctx.setLineDash([3, 6])
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(clawX, headY() + ARM_TIP)
        ctx.lineTo(clawX, floor())
        ctx.stroke()
        ctx.globalAlpha = 0.28
        ctx.fillStyle = pal.accent
        ctx.beginPath()
        ctx.ellipse(clawX, floor() - 1, 22, 5, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
      drawClaw(ctx, clawX, rail(), len, openT, pal)
    },
  }
}

function drawMachine(ctx: CanvasRenderingContext2D, w: number, h: number, rail: number, floor: number, pal: Palette) {
  ctx.save()
  // glass cabinet
  ctx.globalAlpha = 0.4
  ctx.fillStyle = pal.card
  ctx.beginPath()
  ctx.roundRect(10, ZONE_BOTTOM + 16, w - 20, h - ZONE_BOTTOM - 26, 16)
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.strokeStyle = pal.line
  ctx.lineWidth = 2
  ctx.stroke()
  // floor
  ctx.globalAlpha = 0.3
  ctx.fillStyle = pal.muted
  ctx.fillRect(11, floor, w - 22, h - 11 - floor)
  ctx.globalAlpha = 0.12
  ctx.fillStyle = pal.text
  ctx.fillRect(11, floor, w - 22, 3)
  // background prizes (decoration)
  const colors = ['#f2b5a7', '#a9c8f0', '#f6dc8e', '#b9e0c4', '#d3b9f0']
  const spots = [0.2, 0.34, 0.5, 0.64, 0.78, 0.9]
  spots.forEach((s, i) => {
    const x = 20 + s * (w - 40)
    if (x < CHUTE_R + 14) return
    const r = 13 + ((i * 7) % 6)
    ctx.globalAlpha = 0.45
    ctx.fillStyle = colors[i % colors.length]
    ctx.beginPath()
    ctx.arc(x, floor - r + 2, r, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalAlpha = 1
  // top rail
  ctx.strokeStyle = pal.muted
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(24, rail - 18)
  ctx.lineTo(w - 24, rail - 18)
  ctx.stroke()
  // chute recess (always dark, in light and dark mode)
  ctx.fillStyle = '#1c212d'
  ctx.globalAlpha = 1
  ctx.fillRect(CHUTE_L, floor, CHUTE_R - CHUTE_L, h - 11 - floor)
  ctx.restore()
}

function drawChuteFront(ctx: CanvasRenderingContext2D, h: number, floor: number, pal: Palette, label: string) {
  ctx.save()
  ctx.fillStyle = '#323a4d'
  ctx.fillRect(CHUTE_L - 4, floor + 16, CHUTE_R - CHUTE_L + 8, h - 11 - floor - 16)
  ctx.globalAlpha = 1
  ctx.fillStyle = pal.accent
  ctx.fillRect(CHUTE_L - 4, floor + 13, CHUTE_R - CHUTE_L + 8, 4)
  ctx.fillStyle = 'rgba(255,255,255,.75)'
  ctx.font = `700 9px ${pal.font}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, (CHUTE_L + CHUTE_R) / 2, floor + 26)
  ctx.restore()
}

function drawClaw(ctx: CanvasRenderingContext2D, x: number, rail: number, len: number, closed: number, pal: Palette) {
  const y = rail + len
  const theta = 0.85 - 0.5 * closed
  ctx.save()
  // carriage + cable
  ctx.fillStyle = pal.accent
  ctx.beginPath()
  ctx.roundRect(x - 22, rail - 28, 44, 20, 6)
  ctx.fill()
  ctx.strokeStyle = pal.muted
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(x, rail - 8)
  ctx.lineTo(x, y - 10)
  ctx.stroke()
  // arms
  ctx.strokeStyle = pal.muted
  ctx.lineWidth = 5
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const s of [-1, 1]) {
    const hx = x + s * 10
    const hy = y
    const kx = hx + s * Math.sin(theta) * 26
    const ky = hy + Math.cos(theta) * 26
    const phi = theta - 1.0
    const tx = kx + s * Math.sin(phi) * 28
    const ty = ky + Math.cos(phi) * 28
    ctx.beginPath()
    ctx.moveTo(hx, hy)
    ctx.lineTo(kx, ky)
    ctx.lineTo(tx, ty)
    ctx.stroke()
    ctx.fillStyle = pal.text
    ctx.beginPath()
    ctx.arc(kx, ky, 3.2, 0, Math.PI * 2)
    ctx.fill()
  }
  // head
  ctx.fillStyle = pal.accent
  ctx.beginPath()
  ctx.roundRect(x - 17, y - 13, 34, 22, 7)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,.35)'
  ctx.fillRect(x - 11, y - 8, 22, 3)
  ctx.restore()
}
