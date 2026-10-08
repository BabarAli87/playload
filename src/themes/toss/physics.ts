// Pure physics for one ball and one hoop. No DOM, so it can be tested in node.

export interface Layout {
  width: number
  height: number
  hoopX: number // center x of the rim
  rimY: number
  rimHalf: number // half the rim opening
  netDepth: number
  home: { x: number; y: number }
}

export interface Ball {
  x: number
  y: number
  vx: number
  vy: number
  angle: number
  spin: number
  r: number
}

export type Phase = 'idle' | 'aiming' | 'flying' | 'scoring' | 'returning'

export const GRAVITY = 1100
export const POWER = 5.5 // launch speed = pull distance * POWER
export const MAX_PULL = 220
const REST = 0.55
const WALL_REST = 0.6
const RIM_R = 5

export function makeLayout(width: number, height: number, over: Partial<Layout> = {}): Layout {
  const zoneW = Math.min(340, width - 32)
  const rimY = 20 + 190 - 4
  return {
    width,
    height,
    hoopX: width / 2,
    rimY,
    rimHalf: Math.min(72, zoneW * 0.24),
    netDepth: 88,
    home: { x: Math.max(60, width * 0.2), y: height - 200 },
    ...over,
  }
}

export function makeBall(layout: Layout): Ball {
  return { x: layout.home.x, y: layout.home.y, vx: 0, vy: 0, angle: 0, spin: 0, r: 20 }
}

/** Launch velocity for a ball released at `pos` having been pulled from home. */
export function launchVelocity(home: { x: number; y: number }, pos: { x: number; y: number }) {
  let dx = home.x - pos.x
  let dy = home.y - pos.y
  const len = Math.hypot(dx, dy)
  if (len > MAX_PULL) {
    dx = (dx / len) * MAX_PULL
    dy = (dy / len) * MAX_PULL
  }
  return { vx: dx * POWER, vy: dy * POWER, pull: Math.min(len, MAX_PULL) }
}

/** Clamp a pointer position to the pull radius around home. */
export function clampPull(home: { x: number; y: number }, p: { x: number; y: number }) {
  const dx = p.x - home.x
  const dy = p.y - home.y
  const len = Math.hypot(dx, dy)
  if (len <= MAX_PULL) return { x: p.x, y: p.y }
  return { x: home.x + (dx / len) * MAX_PULL, y: home.y + (dy / len) * MAX_PULL }
}

/** Points of the un-collided arc, for the dotted aim guide. */
export function predictArc(start: { x: number; y: number }, vx: number, vy: number, steps = 14, dt = 0.055) {
  const pts: { x: number; y: number }[] = []
  for (let i = 1; i <= steps; i++) {
    const t = i * dt
    pts.push({ x: start.x + vx * t, y: start.y + vy * t + 0.5 * GRAVITY * t * t })
  }
  return pts
}

export type StepEvent = 'rim' | 'wall' | 'floor' | 'score'

/** Advance a flying ball. Returns events that happened this step. */
export function stepFlight(b: Ball, L: Layout, dt: number): StepEvent[] {
  const events: StepEvent[] = []
  const prevY = b.y
  b.vy += GRAVITY * dt
  b.x += b.vx * dt
  b.y += b.vy * dt
  b.angle += b.spin * dt

  // walls and ceiling
  if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx) * WALL_REST; events.push('wall') }
  if (b.x > L.width - b.r) { b.x = L.width - b.r; b.vx = -Math.abs(b.vx) * WALL_REST; events.push('wall') }
  if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy) * WALL_REST; events.push('wall') }

  // floor
  const floor = L.height - b.r
  if (b.y > floor) {
    b.y = floor
    b.vy = -Math.abs(b.vy) * 0.45
    b.vx *= 0.85
    b.spin *= 0.85
    events.push('floor')
  }

  // rim end-points act as small solid circles
  for (const sx of [-1, 1]) {
    const cx = L.hoopX + sx * L.rimHalf
    const dx = b.x - cx
    const dy = b.y - L.rimY
    const dist = Math.hypot(dx, dy)
    const min = b.r * 0.8 + RIM_R
    if (dist < min && dist > 0.001) {
      const nx = dx / dist
      const ny = dy / dist
      b.x = cx + nx * min
      b.y = L.rimY + ny * min
      const vn = b.vx * nx + b.vy * ny
      if (vn < 0) {
        b.vx -= (1 + REST) * vn * nx
        b.vy -= (1 + REST) * vn * ny
        b.spin += nx * 6
        events.push('rim')
      }
    }
  }

  // score: centre crosses the rim line going down, between the rim ends
  if (
    prevY < L.rimY &&
    b.y >= L.rimY &&
    b.vy > 0 &&
    Math.abs(b.x - L.hoopX) < L.rimHalf - 4
  ) {
    events.push('score')
  }
  return events
}

/** Where the ball is drawn / launched from: the pull point, kept inside the arena. */
export function startPos(L: Layout, pull: { x: number; y: number }, r = 20) {
  const p = clampPull(L.home, pull)
  return {
    x: Math.min(L.width - r, Math.max(r, p.x)),
    y: Math.min(L.height - r, Math.max(r, p.y)),
  }
}
