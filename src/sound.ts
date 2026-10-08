export type SoundName = 'score' | 'miss' | 'upload' | 'error' | 'pop'

/** Synthesized sound effects (WebAudio). No audio files to ship. */
export class Sfx {
  enabled = false
  private ctx?: AudioContext

  /** Must be called from a user gesture at least once (browser autoplay rules). */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return
      this.ctx = new AC()
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  /** Release the audio device. Safe to call more than once. */
  destroy() {
    this.enabled = false
    const ctx = this.ctx
    this.ctx = undefined
    if (ctx && ctx.state !== 'closed') void ctx.close().catch(() => {})
  }

  private lastPlayed = new Map<SoundName, number>()

  play(name: SoundName) {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return
    // a folder of 200 files must not play 200 dings at once
    const now = this.ctx.currentTime
    if (now - (this.lastPlayed.get(name) ?? -1) < 0.15) return
    this.lastPlayed.set(name, now)
    const t = this.ctx.currentTime
    switch (name) {
      case 'score':
        this.swish(t)
        ;[523, 659, 784].forEach((f, i) => this.tone(f, t + 0.12 + i * 0.09, 0.22, 'triangle', 0.18))
        break
      case 'miss':
        this.tone(220, t, 0.22, 'sine', 0.25, 80)
        break
      case 'upload':
        this.tone(784, t, 0.14, 'sine', 0.15)
        this.tone(1175, t + 0.1, 0.22, 'sine', 0.15)
        break
      case 'error':
        this.tone(150, t, 0.2, 'square', 0.08)
        this.tone(120, t + 0.2, 0.2, 'square', 0.08)
        break
      case 'pop':
        this.tone(400, t, 0.09, 'sine', 0.14, 760)
        break
    }
  }

  private tone(freq: number, at: number, dur: number, type: OscillatorType, vol: number, endFreq?: number) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, at)
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, at + dur)
    g.gain.setValueAtTime(0.0001, at)
    g.gain.exponentialRampToValueAtTime(vol, at + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
    o.connect(g).connect(ctx.destination)
    o.start(at)
    o.stop(at + dur + 0.02)
  }

  /** Short filtered noise burst, like a net swish. */
  private swish(at: number) {
    const ctx = this.ctx!
    const len = Math.floor(ctx.sampleRate * 0.25)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const src = ctx.createBufferSource()
    src.buffer = buf
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.setValueAtTime(1200, at)
    f.frequency.exponentialRampToValueAtTime(3200, at + 0.25)
    const g = ctx.createGain()
    g.gain.value = 0.35
    src.connect(f).connect(g).connect(ctx.destination)
    src.start(at)
  }
}
