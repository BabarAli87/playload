// Difficulty check for the toss engine: what share of launch vectors score?
import { makeLayout, makeBall, stepFlight, launchVelocity, startPos, MAX_PULL } from '../src/themes/toss/physics.ts'

const W = Number(process.argv[2] ?? 560)
const L = makeLayout(W, 520)
let total = 0, scored = 0
for (let px = -MAX_PULL; px <= MAX_PULL; px += 2) {
  for (let py = -MAX_PULL; py <= MAX_PULL; py += 2) {
    const pull = { x: L.home.x + px, y: L.home.y + py }
    const v = launchVelocity(L.home, pull)
    if (v.pull < 20 || Math.hypot(px, py) > MAX_PULL) continue
    total++
    const s = startPos(L, pull)
    const b = makeBall(L)
    b.x = s.x; b.y = s.y; b.vx = v.vx; b.vy = v.vy
    for (let t = 0; t < 4 / 0.008; t++) {
      if (stepFlight(b, L, 0.008).includes('score')) { scored++; break }
    }
  }
}
console.log(`basketball @${W}px: scoring shots ${scored}/${total} = ${(100 * scored / total).toFixed(1)}%`)
