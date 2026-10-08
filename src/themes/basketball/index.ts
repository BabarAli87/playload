import type { ThemeAPI } from '../../theme'
import { makeLayout } from '../toss/physics'
import { tossTheme } from '../toss/engine'
import { drawBackboard, drawBall, drawNet, drawRim } from './render'

/** Drag the file back like a slingshot and shoot it through the hoop. */
export function basketball(api: ThemeAPI) {
  return tossTheme(api, {
    get hint() { return api.text(api.coarse ? 'basketball.hintTouch' : 'basketball.hint') },
    get subtitle() { return api.text('basketball.subtitle') },
    arenaHeight: 520,
    zoneTop: 20,
    zoneHeight: 190,
    layout: (w, h) => makeLayout(w, h),
    scoreTarget: (L) => ({ x: L.hoopX, y: L.rimY + L.netDepth * 0.9 }),
    drawBack: drawBackboard,
    drawFront(ctx, L, shake, pal) {
      drawNet(ctx, L, shake, pal)
      drawRim(ctx, L, pal)
    },
    drawPiece: (ctx, ball, file, scale, alpha, pal) => drawBall(ctx, ball, file.name, pal, scale, alpha),
  })
}
