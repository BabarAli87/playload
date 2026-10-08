import type { Palette, Point } from '../../theme'
import { badgeColor, extOf } from '../basketball/render'

export interface Geo {
  W: number
  H: number
  panelTop: number
  pad: Point // where a rocket stands before launch (its centre)
  padTop: number
  planet: { x: number; y: number; r: number }
  /** Outward surface normal where the rocket lands. */
  normal: Point
  end: Point // landing centre
  c1: Point
  c2: Point
}

export const ROCKET_HALF_TAIL = 29

export function makeGeo(W: number, H: number, zoneBottom: number): Geo {
  const padX = Math.max(80, W * 0.3)
  const padTop = H - 46
  const pad = { x: padX, y: padTop - ROCKET_HALF_TAIL }
  const planet = { x: W - Math.max(90, W * 0.18), y: 250, r: 54 }
  const normal = { x: -0.5, y: -0.866 }
  const end = { x: planet.x + normal.x * (planet.r + 15), y: planet.y + normal.y * (planet.r + 15) }
  return {
    W, H, panelTop: zoneBottom + 16, pad, padTop, planet, normal, end,
    c1: { x: pad.x, y: pad.y - 190 },
    c2: { x: end.x - 40, y: end.y + 130 },
  }
}

/** Cubic bezier launch path. Returns position and heading (radians, clockwise from straight up). */
export function pathAt(g: Geo, t: number) {
  const u = 1 - t
  const p0 = g.pad, p1 = g.c1, p2 = g.c2, p3 = g.end
  const x = u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x
  const y = u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y
  const dx = 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x)
  const dy = 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y)
  return { x, y, heading: Math.atan2(dx, -dy) }
}

export function makeStars(count: number) {
  let seed = 7
  const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296)
  return Array.from({ length: count }, () => ({ x: rnd(), y: rnd(), r: 0.5 + rnd() * 1.3, speed: 0.4 + rnd() * 0.9, phase: rnd() * 6.28 }))
}

export function drawSky(ctx: CanvasRenderingContext2D, g: Geo, stars: ReturnType<typeof makeStars>, scroll: number, clock: number) {
  const { W, H, panelTop } = g
  const h = H - 10 - panelTop
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(10, panelTop, W - 20, h, 16)
  ctx.clip()
  const grad = ctx.createLinearGradient(0, panelTop, 0, H)
  grad.addColorStop(0, '#080c1c')
  grad.addColorStop(1, '#1b2656')
  ctx.fillStyle = grad
  ctx.fillRect(0, panelTop, W, h)
  for (const s of stars) {
    const y = panelTop + ((s.y * h + scroll * s.speed) % h)
    ctx.globalAlpha = 0.45 + 0.4 * Math.sin(clock * 2 + s.phase)
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(10 + s.x * (W - 20), y, s.r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  // ground glow under the pad
  const glow = ctx.createRadialGradient(g.pad.x, H - 10, 0, g.pad.x, H - 10, 120)
  glow.addColorStop(0, 'rgba(255,170,90,.18)')
  glow.addColorStop(1, 'rgba(255,170,90,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, H - 140, W, 140)
  ctx.restore()
}

export function drawPlanet(ctx: CanvasRenderingContext2D, g: Geo) {
  const { x, y, r } = g.planet
  ctx.save()
  // back half of the ring
  ctx.strokeStyle = 'rgba(199,184,245,.55)'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.ellipse(x, y, r * 1.7, r * 0.42, -0.35, Math.PI, Math.PI * 2)
  ctx.stroke()
  const grad = ctx.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.15, x, y, r)
  grad.addColorStop(0, '#9b86f0')
  grad.addColorStop(1, '#3a2a8f')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(20,10,70,.25)'
  for (const [dx, dy, cr] of [[0.25, 0.2, 0.14], [-0.2, 0.45, 0.1], [0.5, -0.15, 0.08]]) {
    ctx.beginPath()
    ctx.arc(x + dx * r, y + dy * r, cr * r, 0, Math.PI * 2)
    ctx.fill()
  }
  // front half of the ring
  ctx.strokeStyle = 'rgba(199,184,245,.75)'
  ctx.beginPath()
  ctx.ellipse(x, y, r * 1.7, r * 0.42, -0.35, 0, Math.PI)
  ctx.stroke()
  ctx.restore()
}

export function drawPad(ctx: CanvasRenderingContext2D, g: Geo) {
  const { pad, padTop } = g
  ctx.save()
  ctx.fillStyle = '#3a4560'
  ctx.fillRect(pad.x - 52, padTop, 104, 9)
  ctx.fillStyle = '#2a3350'
  ctx.fillRect(pad.x - 42, padTop + 9, 10, 20)
  ctx.fillRect(pad.x + 32, padTop + 9, 10, 20)
  ctx.fillStyle = '#e8c35a'
  for (let i = -3; i <= 3; i++) ctx.fillRect(pad.x + i * 14 - 3, padTop + 2, 6, 3)
  ctx.restore()
}

export function drawTrail(ctx: CanvasRenderingContext2D, trail: { x: number; y: number; age: number }[]) {
  ctx.save()
  for (const p of trail) {
    const k = p.age / 0.9
    ctx.globalAlpha = 0.4 * (1 - k)
    ctx.fillStyle = k < 0.35 ? '#ffcf8a' : '#c9d2e8'
    ctx.beginPath()
    ctx.arc(p.x, p.y, 3 + k * 9, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/** The file as a rocket. `thrust` 0..1 sizes the flame; 0 = engines off. */
export function drawRocket(
  ctx: CanvasRenderingContext2D, x: number, y: number, heading: number, scale: number, alpha: number,
  name: string, pal: Palette, thrust: number, clock: number,
) {
  const ext = extOf(name)
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x, y)
  ctx.rotate(heading)
  ctx.scale(scale, scale)
  // flame
  if (thrust > 0) {
    const len = 12 + 48 * thrust * (0.82 + 0.18 * Math.sin(clock * 48) + 0.06 * Math.sin(clock * 97))
    const flame = ctx.createLinearGradient(0, ROCKET_HALF_TAIL, 0, ROCKET_HALF_TAIL + len)
    flame.addColorStop(0, '#fff6c8')
    flame.addColorStop(0.35, '#ffb43a')
    flame.addColorStop(1, 'rgba(255,90,30,0)')
    ctx.fillStyle = flame
    ctx.beginPath()
    ctx.moveTo(-8, ROCKET_HALF_TAIL - 1)
    ctx.quadraticCurveTo(-9, ROCKET_HALF_TAIL + len * 0.6, 0, ROCKET_HALF_TAIL + len)
    ctx.quadraticCurveTo(9, ROCKET_HALF_TAIL + len * 0.6, 8, ROCKET_HALF_TAIL - 1)
    ctx.closePath()
    ctx.fill()
  }
  // fins
  ctx.fillStyle = pal.accent
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(s * 17, 6)
    ctx.lineTo(s * 17, 28)
    ctx.lineTo(s * 31, 33)
    ctx.closePath()
    ctx.fill()
  }
  // nozzle
  ctx.fillStyle = '#3a4560'
  ctx.fillRect(-8, 22, 16, 8)
  // body: the file page
  ctx.shadowColor = 'rgba(0,0,0,.35)'
  ctx.shadowBlur = 8
  ctx.fillStyle = pal.card
  ctx.beginPath()
  ctx.roundRect(-17, -24, 34, 48, 6)
  ctx.fill()
  ctx.shadowColor = 'transparent'
  // nose cone
  ctx.fillStyle = pal.accent
  ctx.beginPath()
  ctx.moveTo(-17, -22)
  ctx.quadraticCurveTo(-14, -42, 0, -52)
  ctx.quadraticCurveTo(14, -42, 17, -22)
  ctx.closePath()
  ctx.fill()
  // page details
  ctx.fillStyle = pal.muted
  ctx.globalAlpha = alpha * 0.4
  ctx.fillRect(-10, -14, 20, 3)
  ctx.fillRect(-10, -7, 14, 3)
  ctx.globalAlpha = alpha
  ctx.fillStyle = badgeColor(ext)
  ctx.beginPath()
  ctx.roundRect(-13, 5, 26, 12, 3)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = `700 8px ${pal.font}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(ext.toUpperCase(), 0, 11.5)
  ctx.restore()
}

export function drawCaption(ctx: CanvasRenderingContext2D, x: number, y: number, name: string, text: string, pal: Palette, align: 'left' | 'right' = 'left') {
  ctx.save()
  ctx.font = `600 12px ${pal.font}`
  ctx.textAlign = align
  ctx.textBaseline = 'alphabetic'
  let label = name
  while (label.length > 4 && ctx.measureText(label).width > 150) label = label.slice(0, -2)
  if (label !== name) label += '…'
  ctx.shadowColor = 'rgba(0,0,0,.6)'
  ctx.shadowBlur = 4
  ctx.fillStyle = 'rgba(255,255,255,.92)'
  ctx.fillText(label, x, y)
  ctx.font = `700 17px ${pal.font}`
  ctx.fillStyle = '#fff'
  ctx.fillText(text, x, y + 19)
  ctx.restore()
}

export function drawFlag(ctx: CanvasRenderingContext2D, g: Geo, alpha: number, pal: Palette) {
  const { planet, normal } = g
  const sx = planet.x + normal.x * planet.r
  const sy = planet.y + normal.y * planet.r
  // flag stands on the surface, to the right of the landed rocket
  const bx = sx + 26
  const by = sy + 16
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = '#e9ecf5'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(bx, by)
  ctx.lineTo(bx, by - 30)
  ctx.stroke()
  ctx.fillStyle = pal.accent
  ctx.beginPath()
  ctx.moveTo(bx, by - 30)
  ctx.lineTo(bx + 18, by - 24)
  ctx.lineTo(bx, by - 17)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}
