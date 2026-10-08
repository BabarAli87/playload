import type { Theme, ThemeAPI } from '../../theme'

/** The traditional flow: a clean dropzone, click to browse, files upload as soon as they're added. */
export function classic(api: ThemeAPI): Theme {
  return {
    plain: true,
    hint: '',
    get subtitle() { return api.text('browse') },
    resize() {},
    fileChanged() {},
    pointerDown: () => false,
    pointerMove() {},
    pointerUp() {},
    pointerCancel() {},
    update() {},
    draw() {},
    active: () => false,
  }
}
