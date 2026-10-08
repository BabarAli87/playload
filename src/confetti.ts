interface Particle {
  x: number; y: number; vx: number; vy: number
  rot: number; vr: number; w: number; h: number
  color: string; age: number; life: number
}

export const DEFAULT_CONFETTI = ['#3b82f6', '#1f9d57', '#f5b82e', '#d946a8', '#7c5cd6']

/** A tiny confetti cannon on its own overlay canvas. */
export class Confetti {
  private ctx: CanvasRenderingContext2D
  private parts: Particle[] = []
  private raf = 0
  private last = 0
  private w = 0
  private h = 0

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!
  }

  resize(w: number, h: number) {
    const dpr = window.devicePixelRatio || 1
    this.w = w
    this.h = h
    this.canvas.width = Math.round(w * dpr)
    this.canvas.height = Math.round(h * dpr)
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  burst(x: number, y: number, count = 80, colors: string[] = DEFAULT_CONFETTI) {
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.15
      const speed = 220 + Math.random() * 460
      this.parts.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 16,
        w: 5 + Math.random() * 6,
        h: 3 + Math.random() * 4,
        color: colors[(Math.random() * colors.length) | 0],
        age: 0,
        life: 1.3 + Math.random() * 0.9,
      })
    }
    if (!this.raf) {
      this.last = performance.now()
      this.raf = requestAnimationFrame((t) => this.frame(t))
    }
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    this.parts = []
  }

  private frame(now: number) {
    this.raf = 0
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    const { ctx } = this
    ctx.clearRect(0, 0, this.w, this.h)
    const drag = Math.pow(0.985, dt * 60)
    this.parts = this.parts.filter((p) => p.age < p.life && p.y < this.h + 20)
    for (const p of this.parts) {
      p.age += dt
      p.vx *= drag
      p.vy = p.vy * drag + 900 * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rot += p.vr * dt
      const left = 1 - p.age / p.life
      ctx.save()
      ctx.globalAlpha = Math.min(1, left * 3)
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.scale(1, Math.cos(p.age * 9 + p.rot)) // flutter
      ctx.fillStyle = p.color
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      ctx.restore()
    }
    if (this.parts.length) this.raf = requestAnimationFrame((t) => this.frame(t))
    else ctx.clearRect(0, 0, this.w, this.h)
  }
}
