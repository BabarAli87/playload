import type { Palette } from '../../theme'
import type { Layout } from '../toss/physics'

/** File-type badge colors are semantic (PDF = red ...), so they stay fixed across brands. */
const BADGES: Record<string, string> = {
  pdf: '#d93f3f', png: '#3b82f6', jpg: '#3b82f6', jpeg: '#3b82f6', gif: '#3b82f6', webp: '#3b82f6', svg: '#3b82f6',
  doc: '#2b6cb0', docx: '#2b6cb0', xls: '#1f9d57', xlsx: '#1f9d57', csv: '#1f9d57',
  ppt: '#e07a2f', pptx: '#e07a2f', zip: '#7c5cd6', mp4: '#c0489d', mov: '#c0489d', mp3: '#c0489d', txt: '#6b7280',
}

export const badgeColor = (ext: string) => BADGES[ext] ?? '#64748b'

export function extOf(name: string) {
  const i = name.lastIndexOf('.')
  return i < 0 ? 'file' : name.slice(i + 1).toLowerCase().slice(0, 4)
}

export function drawBackboard(ctx: CanvasRenderingContext2D, L: Layout, pal: Palette) {
  const w = L.rimHalf * 1.7
  const h = 54
  const bottom = L.rimY - 10
  ctx.save()
  ctx.globalAlpha = 0.85
  ctx.fillStyle = pal.card
  ctx.fillRect(L.hoopX - w / 2, bottom - h, w, h)
  ctx.globalAlpha = 1
  ctx.strokeStyle = pal.accent
  ctx.lineWidth = 3
  ctx.strokeRect(L.hoopX - w / 2, bottom - h, w, h)
  ctx.fillStyle = pal.accent
  ctx.fillRect(L.hoopX - 12, bottom, 24, 8)
  ctx.restore()
}

/** `sway` is the current net swing in px (0 = still). */
export function drawNet(ctx: CanvasRenderingContext2D, L: Layout, sway: number, pal: Palette) {
  const n = 7
  const top = L.rimHalf
  const bottom = L.rimHalf * 0.55
  const y0 = L.rimY
  const y1 = L.rimY + L.netDepth
  const tx = (i: number) => L.hoopX - top + (2 * top * i) / n
  const bx = (i: number) => L.hoopX - bottom + (2 * bottom * i) / n + sway
  ctx.save()
  ctx.strokeStyle = pal.muted
  ctx.lineWidth = 1.4
  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    ctx.moveTo(tx(i), y0); ctx.lineTo(bx(i + 1), y1)
    ctx.moveTo(tx(i + 1), y0); ctx.lineTo(bx(i), y1)
  }
  ctx.moveTo(tx(0), y0); ctx.lineTo(bx(0), y1)
  ctx.moveTo(tx(n), y0); ctx.lineTo(bx(n), y1)
  for (const t of [0.35, 0.7, 1]) {
    const y = y0 + (y1 - y0) * t
    const hw = top + (bottom - top) * t
    const off = sway * t
    ctx.moveTo(L.hoopX - hw + off, y); ctx.lineTo(L.hoopX + hw + off, y)
  }
  ctx.stroke()
  ctx.restore()
}

export function drawRim(ctx: CanvasRenderingContext2D, L: Layout, pal: Palette) {
  ctx.save()
  ctx.strokeStyle = pal.accent
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.ellipse(L.hoopX, L.rimY, L.rimHalf + 4, 8, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

/** The "basketball": a little file page with an extension badge. Also used by other themes. */
export function drawBall(
  ctx: CanvasRenderingContext2D,
  b: { x: number; y: number; angle: number },
  name: string,
  pal: Palette,
  scale = 1,
  alpha = 1,
) {
  const w = 38, h = 48
  const ext = extOf(name)
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(b.x, b.y)
  ctx.rotate(b.angle)
  ctx.scale(scale, scale)
  ctx.shadowColor = 'rgba(30,40,60,0.28)'
  ctx.shadowBlur = 12
  ctx.shadowOffsetY = 4
  ctx.fillStyle = pal.card
  ctx.beginPath()
  ctx.roundRect(-w / 2, -h / 2, w, h, 6)
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.fillStyle = pal.muted
  ctx.globalAlpha = alpha * 0.35
  ctx.fillRect(-w / 2 + 7, -h / 2 + 9, w - 14, 3)
  ctx.fillRect(-w / 2 + 7, -h / 2 + 16, w - 20, 3)
  ctx.globalAlpha = alpha
  ctx.fillStyle = BADGES[ext] ?? '#64748b'
  ctx.beginPath()
  ctx.roundRect(-w / 2 + 5, h / 2 - 17, w - 10, 11, 3)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = `700 8px ${pal.font}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(ext.toUpperCase(), 0, h / 2 - 11.5)
  ctx.restore()
}
