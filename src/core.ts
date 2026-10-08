import { Confetti, DEFAULT_CONFETTI } from './confetti'
import { fromDirectoryInput, hasFolder, readDropped, snapshotDrop } from './folder'
import { DEFAULT_LABELS, fill } from './labels'
import { Sfx, type SoundName } from './sound'
import { CSS } from './styles'
import { type Palette, type Theme, type ThemeAPI, type ThemeFactory, getTheme, registerTheme, themeNames } from './theme'
import { BUILTIN_THEMES } from './themes'
import { type UploadFn, xhrUploader } from './uploader'
import { formatSize, matchesAccept } from './validate'

export interface PlayloadOptions {
  // ----- uploading -----
  /** Built-in multipart upload target. Omit (and omit `upload`) for manual mode: you just receive the File. */
  uploadUrl?: string
  method?: string
  fieldName?: string
  headers?: Record<string, string>
  withCredentials?: boolean
  /** Bring your own uploader (S3, Supabase, ...). Resolve when done; honour `signal` to support Cancel. */
  upload?: UploadFn

  // ----- validation (client-side convenience only: always validate on your server too) -----
  /** Like <input accept>: ['.pdf', 'image/*'] */
  accept?: string[]
  /** Bytes. */
  maxSize?: number
  /** Max total files accepted. */
  maxFiles?: number

  // ----- look and feel -----
  /** Registered theme name, or a theme factory. Default 'basketball'. */
  theme?: string | ThemeFactory
  /** false = same as theme 'classic': a plain dropzone, no game. */
  game?: boolean
  /** 'light' (default), 'dark', or 'auto' (follow the OS). Colors can be overridden with --pl-* CSS variables. */
  scheme?: 'light' | 'dark' | 'auto'
  /** Override any text. See DEFAULT_LABELS for the keys. */
  labels?: Record<string, string>
  /** Confetti colors. Default: your --pl-accent plus a festive palette. */
  confettiColors?: string[]

  // ----- features (all can be switched off) -----
  /** Sound effects (synthesized, no files). Default false; users can toggle and their choice is remembered. */
  sound?: boolean
  /** Confetti on a score. Default true (skipped for users who prefer reduced motion). */
  confetti?: boolean
  /** Vibrate briefly on score / miss on phones. Default true. */
  haptics?: boolean
  /**
   * What "Choose file" (and tapping the card) does. 'direct' uploads at once, 'game' loads the file as a game piece,
   * 'auto' (default) picks 'direct' on desktop and 'game' on touch devices, where files cannot be dragged in.
   */
  pickMode?: 'auto' | 'game' | 'direct'
  /** Accept Ctrl+V / Cmd+V pasted files and screenshots. Default true. */
  paste?: boolean
  /** 'game' loads pasted files as game pieces, 'direct' uploads them straight away. Default 'game'. */
  pasteMode?: 'game' | 'direct'
  /** Easy mode: after this many misses on one file, offer a way out. 0 turns it off. Default 3. */
  easyAfter?: number
  /** 'button' shows "Upload it anyway"; 'auto' just lets the file through. Default 'button'. */
  easyMode?: 'button' | 'auto'

  // ----- folders and batches -----
  /** Expand dropped folders (recursively) into their files, uploaded directly. Default true. */
  folders?: boolean
  /** Show a "Choose folder" button. Default false. */
  chooseFolder?: boolean
  /** Most files read from one folder. Default 1000. */
  folderLimit?: number
  /** Uploads running at once; the rest wait their turn. Default 4. */
  concurrency?: number
  /** Form field that carries a file's folder path (the built-in uploader). Default 'path'. */
  pathField?: string

  // ----- parts of the UI -----
  /** The "Uploaded N" chip. Default true. */
  showCounter?: boolean
  /** The speaker button. Default true. */
  soundToggle?: boolean
  /** The list of uploads with progress bars. Default true. */
  showList?: boolean
  /** The "Choose file" button. Default true. */
  chooseButton?: boolean

  // ----- security / CSP -----
  /** CSP nonce for the injected <style> tag. */
  nonce?: string
  /** false = don't inject CSS; load `playload/playload.css` yourself (strict CSP, or to share one stylesheet). */
  injectStyles?: boolean
}

export type PlayloadEventName =
  | 'score' | 'miss' | 'uploadstart' | 'progress' | 'upload' | 'error' | 'cancel' | 'filesadded' | 'skip'

interface Item {
  file: File
  /** Came through the game, which already celebrated. */
  played: boolean
  li: HTMLLIElement
  pct: HTMLElement
  act: HTMLButtonElement
  fill: HTMLElement
  ctrl: AbortController
  mode: 'cancel' | 'retry' | 'none'
}

const SPEAKER_ON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 010 7"/></svg>'
const SPEAKER_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>'
const ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4"/><path d="M8 8l4-4 4 4"/><path d="M5 13v5a2 2 0 002 2h10a2 2 0 002-2v-5"/></svg>'
const STYLE_ID = 'playload-styles'
const DEFAULT_THEME = 'basketball'
const DEFAULTS: PlayloadOptions = {
  game: true, scheme: 'light', sound: false, confetti: true, haptics: true, paste: true, pasteMode: 'game',
  easyAfter: 3, easyMode: 'button', pickMode: 'auto', folders: true, chooseFolder: false, folderLimit: 1000, concurrency: 4, showCounter: true, soundToggle: true, showList: true, chooseButton: true, injectStyles: true,
}

for (const [name, factory] of Object.entries(BUILTIN_THEMES)) if (!getTheme(name)) registerTheme(name, factory)

/** Every option key, so wrappers can pass the full set (and reset removed ones) on each update. */
export const OPTION_KEYS: (keyof PlayloadOptions)[] = [
  'uploadUrl', 'method', 'fieldName', 'headers', 'withCredentials', 'upload', 'accept', 'maxSize', 'maxFiles',
  'theme', 'game', 'scheme', 'labels', 'confettiColors', 'sound', 'confetti', 'haptics', 'paste', 'pasteMode',
  'easyAfter', 'easyMode', 'pickMode', 'folders', 'chooseFolder', 'folderLimit', 'concurrency', 'pathField', 'showCounter', 'soundToggle', 'showList', 'chooseButton', 'nonce', 'injectStyles',
]

const instances = new Set<Playload>()
let lastActive: Playload | null = null

const stamp = () => new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-')

export class Playload {
  readonly host: HTMLElement
  options: PlayloadOptions

  private arena!: HTMLElement
  private zone!: HTMLElement
  private canvas!: HTMLCanvasElement
  private ctx!: CanvasRenderingContext2D
  private hint!: HTMLElement
  private status!: HTMLElement
  private counterEl!: HTMLElement
  private list!: HTMLElement
  private input!: HTMLInputElement
  private dirInput!: HTMLInputElement
  private folderBtn!: HTMLButtonElement
  private skipBtn!: HTMLButtonElement
  private soundBtn!: HTMLButtonElement
  private chooseBtn!: HTMLButtonElement
  private mq!: MediaQueryList
  private touchEl!: HTMLElement
  private topEl!: HTMLElement

  private theme!: Theme
  private themeName = ''
  private palette!: Palette
  private width = 0
  private height = 0
  private queue: File[] = []
  private accepted = 0
  private misses = 0
  private offerSkip = false
  private uploaded = 0
  private dragPointer = -1
  private last = 0
  private raf = 0
  private destroyed = false
  private fx!: Confetti
  private sfx = new Sfx()
  private items = new Set<Item>()
  private pending: Item[] = []
  private running = 0
  private batchTotal = 0
  private batchDone = 0
  private timers = new Set<number>()
  private ro?: ResizeObserver
  private cleanup: (() => void)[] = []

  constructor(host: HTMLElement, options: PlayloadOptions = {}) {
    this.host = host
    const given = Object.fromEntries(Object.entries(options).filter(([, v]) => v !== undefined))
    this.options = { ...DEFAULTS, ...given }
    this.mount()
  }

  // ---------- public API ----------

  on(type: PlayloadEventName, fn: (e: CustomEvent) => void) {
    const name = 'playload-' + type
    this.host.addEventListener(name, fn as EventListener)
    return () => this.host.removeEventListener(name, fn as EventListener)
  }

  /** Add files. By default they become game pieces (or upload directly when `direct` / the theme is plain). */
  addFiles(files: Iterable<File>, opts: { direct?: boolean } = {}) {
    if (this.destroyed) return
    const ok: File[] = []
    const rejected: { file: File; err: string }[] = []
    for (const file of files) {
      const err = this.validate(file)
      if (err) { rejected.push({ file, err }); continue }
      this.accepted++
      ok.push(file)
    }
    if (rejected.length <= 3) rejected.forEach((r) => this.fail(r.file, r.err))
    else {
      // a folder can reject hundreds of files: one message, but every file still gets its error event
      rejected.forEach((r, i) => this.emit('error', { file: r.file, error: new Error(r.err) }, i > 0))
      this.say(this.t('skippedMany', { n: rejected.length, reason: rejected[0].err }), true)
    }
    if (!ok.length) return
    this.emit('filesadded', { files: ok })
    if (opts.direct || !this.playing) {
      ok.forEach((f) => this.startUpload(f))
    } else {
      const wasEmpty = this.queue.length === 0
      this.queue.push(...ok)
      if (wasEmpty) { this.misses = 0; this.theme.fileChanged() }
      const loaded = ok.length === 1 ? this.t('loadedOne') : this.t('loadedMany', { n: ok.length })
      this.say(`${loaded} ${this.theme.hint}`)
    }
    this.updateHint()
    this.kick()
  }

  /** Let the current game file through without playing. Used by easy mode, also callable directly. */
  skip() {
    const file = this.queue.shift()
    if (!file) return
    this.misses = 0
    this.updateSkip()
    this.emit('skip', { file })
    this.theme.fileChanged()
    this.updateHint()
    this.startUpload(file)
    this.kick()
  }

  /** Cancel every upload that is still running. */
  cancelAll() {
    for (const it of [...this.items]) this.cancelItem(it)
  }

  /**
   * Change options on a live component (this is what the React wrapper uses).
   * A key set to `undefined` goes back to its default. Only options that actually changed do any work. `nonce` and `injectStyles` are read once, at creation.
   */
  update(patch: Partial<PlayloadOptions>) {
    if (this.destroyed) return
    const o = this.options as Record<string, unknown>
    const same = (a: unknown, b: unknown) =>
      a === b || (typeof a === 'object' && typeof b === 'object' && JSON.stringify(a) === JSON.stringify(b))
    const changed = new Set<string>()
    for (const [k, v] of Object.entries(patch)) {
      const next = v === undefined ? (DEFAULTS as Record<string, unknown>)[k] : v // undefined = back to the default
      if (!same(o[k], next)) changed.add(k)
      if (next === undefined) delete o[k]
      else o[k] = next // always assign, so new function identities (upload) are picked up
    }
    if (!changed.size) return
    const has = (...keys: string[]) => keys.some((k) => changed.has(k))
    if (has('showCounter')) (this.host.querySelector('.pl-counter') as HTMLElement).hidden = this.options.showCounter === false
    if (has('showList')) this.list.hidden = this.options.showList === false
    if (has('chooseButton')) this.chooseBtn.hidden = this.options.chooseButton === false
    if (has('accept')) this.syncAccept()
    if (has('chooseFolder')) this.folderBtn.hidden = !this.options.chooseFolder
    if (has('soundToggle')) this.soundBtn.hidden = this.options.soundToggle === false
    if (has('showCounter', 'soundToggle')) this.syncTop()
    if (has('sound')) this.setSound(!!this.options.sound, false)
    if (has('scheme')) this.syncScheme()
    if (has('game', 'theme')) this.applyTheme()
    else if (has('labels', 'accept', 'maxSize', 'maxFiles')) this.refreshLabels()
    if (has('labels')) this.setSound(this.sfx.enabled, false)
    this.updateSkip()
  }

  /** Switch theme at runtime. */
  setTheme(theme: string | ThemeFactory) {
    this.options.theme = theme
    this.options.game = true
    this.applyTheme()
  }

  /** Change texts at runtime (merged into the current labels). */
  setLabels(labels: Record<string, string>) {
    this.options.labels = { ...this.options.labels, ...labels }
    this.refreshLabels()
  }

  destroy() {
    if (this.destroyed) return
    this.destroyed = true
    cancelAnimationFrame(this.raf)
    this.timers.forEach((id) => clearTimeout(id))
    this.timers.clear()
    this.items.forEach((it) => it.ctrl.abort())
    this.items.clear()
    this.pending = []
    instances.delete(this)
    if (lastActive === this) lastActive = null
    this.theme.destroy?.()
    this.ro?.disconnect()
    this.fx.destroy()
    this.sfx.destroy()
    this.cleanup.forEach((f) => f())
    this.host.innerHTML = ''
    this.host.classList.remove('pl-root', 'pl-dark', 'pl-plain', 'pl-theme-' + this.themeName)
  }

  // ---------- setup ----------

  private mount() {
    if (this.options.injectStyles !== false) {
      const root = this.host.getRootNode() as Document | ShadowRoot
      const target = root instanceof ShadowRoot ? root : document.head
      if (!target.querySelector('#' + STYLE_ID)) {
        const s = document.createElement('style')
        s.id = STYLE_ID
        if (this.options.nonce) s.nonce = this.options.nonce
        s.textContent = CSS
        target.appendChild(s)
      }
    }
    this.host.classList.add('pl-root')
    this.host.innerHTML = `
      <div class="pl-top">
        <button type="button" class="pl-sound" aria-pressed="false"></button>
        <div class="pl-counter"><span class="pl-counter-label"></span> <b>0</b></div>
      </div>
      <div class="pl-arena">
        <div class="pl-zone" role="button" tabindex="0">
          ${ICON}<div class="pl-zone-title"></div><div class="pl-zone-sub"></div><div class="pl-rules"></div>
        </div>
        <canvas class="pl-canvas" aria-hidden="true"></canvas>
        <div class="pl-touch" hidden></div>
        <div class="pl-hint"></div>
        <canvas class="pl-fx" aria-hidden="true"></canvas>
      </div>
      <div class="pl-bar">
        <button type="button" class="pl-choose"></button>
        <button type="button" class="pl-choose pl-choose-folder" hidden></button>
        <button type="button" class="pl-skip" hidden></button>
        <span class="pl-status" role="status" aria-live="polite"></span>
      </div>
      <ul class="pl-list"></ul>
      <input type="file" hidden>
      <input type="file" hidden class="pl-dir">`
    const q = <T extends HTMLElement>(s: string) => this.host.querySelector(s) as T
    this.arena = q('.pl-arena')
    this.zone = q('.pl-zone')
    this.canvas = q('.pl-canvas')
    this.ctx = this.canvas.getContext('2d')!
    this.hint = q('.pl-hint')
    this.status = q('.pl-status')
    this.counterEl = q('.pl-counter b')
    this.list = q('.pl-list')
    this.input = q('input:not(.pl-dir)')
    this.input.multiple = true
    this.syncAccept()
    this.dirInput = q('.pl-dir')
    this.dirInput.multiple = true
    this.dirInput.setAttribute('webkitdirectory', '')
    this.folderBtn = q('.pl-choose-folder')
    this.skipBtn = q('.pl-skip')
    this.soundBtn = q('.pl-sound')
    this.chooseBtn = q('.pl-choose')
    this.fx = new Confetti(q('.pl-fx'))
    this.touchEl = q('.pl-touch')
    this.topEl = q('.pl-top')

    q('.pl-counter').hidden = this.options.showCounter === false
    this.list.hidden = this.options.showList === false
    this.chooseBtn.hidden = this.options.chooseButton === false
    this.folderBtn.hidden = !this.options.chooseFolder

    this.applyScheme()
    this.initSound()
    const open = () => this.input.click()
    this.listen(this.chooseBtn, 'click', open)
    this.listen(this.folderBtn, 'click', () => this.dirInput.click())
    this.listen(this.dirInput, 'change', () => {
      const { files, truncated } = fromDirectoryInput(Array.from(this.dirInput.files ?? []), this.options.folderLimit ?? 1000)
      this.dirInput.value = ''
      this.addFiles(files, { direct: true })
      if (truncated) this.say(this.t('errFolderLimit', { max: this.options.folderLimit ?? 1000 }), true)
    })
    this.listen(this.zone, 'click', open)
    this.listen(this.zone, 'keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') { e.preventDefault(); open() }
    })
    this.listen(this.input, 'change', () => {
      const files = Array.from(this.input.files ?? [])
      this.input.value = ''
      const toGame = this.pickGame()
      this.addFiles(files, { direct: !toGame })
      if (toGame && this.playing && this.queue.length) { this.offerSkip = true; this.updateSkip() } // phones: playing is optional
    })

    // native drag and drop: onto the zone = upload now, anywhere else = load the game piece
    this.listen(this.arena, 'dragover', (e) => {
      e.preventDefault()
      this.zone.classList.toggle('pl-over', this.overZone(e as DragEvent))
    })
    this.listen(this.arena, 'dragleave', () => this.zone.classList.remove('pl-over'))
    this.listen(this.arena, 'drop', (e) => {
      e.preventDefault()
      this.zone.classList.remove('pl-over')
      this.handleDrop((e as DragEvent).dataTransfer, this.overZone(e as DragEvent))
    })

    // pointer input is forwarded to the theme
    this.listen(this.arena, 'pointerdown', (e) => this.onDown(e as PointerEvent))
    this.listen(this.arena, 'pointermove', (e) => this.onMove(e as PointerEvent))
    this.listen(this.arena, 'pointerup', (e) => this.onUp(e as PointerEvent))
    this.listen(this.arena, 'pointercancel', () => this.onCancel())
    // a long press while playing (hold-to-launch!) must not open the browser's context menu
    this.listen(this.arena, 'contextmenu', (e) => { if (this.dragPointer !== -1) e.preventDefault() })

    this.listen(this.skipBtn, 'click', () => this.skip())
    // iOS only unlocks audio on a finished tap (pointerup/click), not on pointerdown
    this.listen(this.host, 'pointerdown', () => this.sfx.unlock())
    this.listen(this.host, 'pointerup', () => this.sfx.unlock())
    this.listen(this.host, 'click', () => this.sfx.unlock())
    this.listen(this.host, 'keydown', () => this.sfx.unlock())

    // paste: goes to the component the user touched last (or the only one on the page)
    instances.add(this)
    const activate = () => { lastActive = this }
    this.listen(this.host, 'pointerenter', activate)
    this.listen(this.host, 'focusin', activate)
    this.listen(this.host, 'pointerdown', activate)
    this.listen(document, 'paste', (e) => this.onPaste(e as ClipboardEvent))
    if (this.options.paste !== false) this.say(this.t('pasteTip'))

    this.palette = this.readPalette()
    this.applyTheme()
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(this.arena)
    this.resize()
    this.updateHint()
  }

  private listen(el: EventTarget, type: string, fn: (e: Event) => void) {
    el.addEventListener(type, fn)
    this.cleanup.push(() => el.removeEventListener(type, fn))
  }

  private later(fn: () => void, ms: number) {
    const id = window.setTimeout(() => { this.timers.delete(id); if (!this.destroyed) fn() }, ms)
    this.timers.add(id)
  }

  // ---------- text, colors, scheme ----------

  private t(key: string, vars?: Record<string, string | number>, fallback = '') {
    return fill(this.options.labels?.[key] ?? DEFAULT_LABELS[key] ?? fallback, vars)
  }

  private refreshLabels() {
    const set = (sel: string, text: string) => { (this.host.querySelector(sel) as HTMLElement).textContent = text }
    const l = this.options.labels
    const touchTitle = this.isTouchFirst() && !(l?.dropTitle && !l.dropTitleTouch) // keep a custom dropTitle
    set('.pl-zone-title', this.t(touchTitle ? 'dropTitleTouch' : 'dropTitle'))
    set('.pl-counter-label', this.t('counter'))
    set('.pl-choose', this.t('choose'))
    set('.pl-choose-folder', this.t('chooseFolder'))
    set('.pl-skip', this.t('skip'))
    set('.pl-zone-sub', this.theme?.subtitle ?? this.t('browse'))
    set('.pl-rules', this.theme?.plain ? this.rulesText() : '')
    this.zone.setAttribute('aria-label', this.t('zoneAria'))
    this.hint.textContent = this.theme?.hint ?? ''
    this.setSound(this.sfx.enabled, false)
  }

  private readPalette(): Palette {
    const cs = getComputedStyle(this.host)
    const v = (n: string, d: string) => cs.getPropertyValue(n).trim() || d
    return {
      accent: v('--pl-accent', '#e8631f'), text: v('--pl-text', '#14161a'), muted: v('--pl-muted', '#7a8190'),
      card: v('--pl-card', '#fff'), bg: v('--pl-bg', '#eaedf3'), ok: v('--pl-ok', '#1f9d57'), err: v('--pl-err', '#d93f3f'),
      line: v('--pl-line', '#c9ceda'), font: cs.fontFamily || 'system-ui, sans-serif',
    }
  }

  private applyScheme() {
    this.mq = matchMedia('(prefers-color-scheme: dark)')
    const sync = () => this.syncScheme()
    this.mq.addEventListener('change', sync)
    this.cleanup.push(() => this.mq.removeEventListener('change', sync))
    this.syncScheme()
  }

  private syncScheme() {
    const scheme = this.options.scheme ?? 'light'
    this.host.classList.toggle('pl-dark', scheme === 'dark' || (scheme === 'auto' && this.mq.matches))
    if (this.palette) { this.palette = this.readPalette(); this.kick() }
  }

  // ---------- themes ----------

  private makeApi(): ThemeAPI {
    const self = this
    return {
      arena: this.arena,
      zone: this.zone,
      ctx: this.ctx,
      get width() { return self.width },
      get height() { return self.height },
      get palette() { return self.palette },
      get coarse() { return self.isTouchFirst() },
      text: (key, fallback, vars) => self.t(key, vars, fallback),
      file: () => (self.playing ? self.queue[0] : undefined),
      requestFrame: () => self.kick(),
      setCursor: (c) => { self.arena.style.cursor = c },
      say: (m, bad) => self.say(m, bad),
      scored: (at, celebrate = true) => {
        self.emit('score', { file: self.queue[0] })
        if (celebrate) self.celebrate(at)
      },
      celebrate: (at, count) => self.celebrate(at, count),
      commit: () => {
        const file = self.queue.shift()
        if (!file) return
        self.misses = 0
        self.updateSkip()
        self.theme.fileChanged()
        self.updateHint()
        self.startUpload(file, true)
        self.kick()
      },
      missed: () => {
        self.misses++
        self.emit('miss', { file: self.queue[0], misses: self.misses })
        self.say(self.t('miss'))
        const after = self.options.easyAfter ?? 0
        if (after > 0 && self.misses >= after) {
          if (self.options.easyMode === 'auto') {
            self.say(self.t('easyAuto'))
            self.later(() => { if (self.queue.length) self.skip() }, 700)
          } else {
            self.say(self.t('tricky'))
            self.updateSkip()
          }
        }
      },
    }
  }

  private applyTheme() {
    const want = this.options.game === false ? 'classic' : (this.options.theme ?? DEFAULT_THEME)
    let factory: ThemeFactory | undefined
    let name: string
    if (typeof want === 'function') { factory = want; name = 'custom' }
    else {
      name = want
      factory = getTheme(want)
      if (!factory) {
        console.warn(`[playload] unknown theme "${want}". Available: ${themeNames().join(', ')}. Using "${DEFAULT_THEME}".`)
        name = DEFAULT_THEME
        factory = getTheme(DEFAULT_THEME)!
      }
    }
    if (this.theme) {
      this.theme.destroy?.()
      this.arena.style.cursor = ''
      this.dragPointer = -1
    }
    this.host.classList.remove('pl-theme-' + this.themeName)
    this.themeName = name
    this.host.classList.add('pl-theme-' + name)
    for (const v of ['--pl-height', '--pl-zone-top', '--pl-zone-h']) this.arena.style.removeProperty(v)
    this.palette = this.readPalette()
    this.theme = factory(this.makeApi())
    this.host.classList.toggle('pl-plain', !!this.theme.plain)
    this.syncTop()
    this.refreshLabels()
    // switching to a plain theme: whatever was waiting in the game just uploads
    if (this.theme.plain) while (this.queue.length) this.skip()
    if (this.width) this.theme.resize(this.width, this.height)
    if (this.queue.length) this.theme.fileChanged()
    this.updateHint()
    this.kick()
  }

  // ---------- input ----------

  private handleDrop(dt: DataTransfer | null, overZone: boolean) {
    if (!dt) return
    // the entries must be captured NOW: the browser empties them when this event handler returns
    const items = this.options.folders === false ? [] : snapshotDrop(dt)
    if (!hasFolder(items)) { this.addFiles(Array.from(dt.files), { direct: overZone }); return }
    const limit = this.options.folderLimit ?? 1000
    this.say(this.t('readingFolder'))
    readDropped(items, limit).then(({ files, truncated }) => {
      if (this.destroyed) return
      this.addFiles(files, { direct: true }) // hundreds of files are never played one by one
      if (truncated) this.say(this.t('errFolderLimit', { max: limit }), true)
    }).catch((err) => {
      if (!this.destroyed) this.say(String(err?.message ?? err), true)
    })
  }

  private overZone(e: DragEvent) {
    const r = this.zone.getBoundingClientRect()
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
  }

  private pt(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  private onDown(e: PointerEvent) {
    if (!this.playing || !this.queue.length || this.dragPointer !== -1) return
    if (!this.theme.pointerDown(this.pt(e))) return
    this.dragPointer = e.pointerId
    this.arena.setPointerCapture(e.pointerId)
    this.kick()
  }

  private onMove(e: PointerEvent) {
    if (!this.playing) return
    const dragging = e.pointerId === this.dragPointer
    if (!dragging && this.dragPointer !== -1) return
    this.theme.pointerMove(this.pt(e), dragging)
  }

  private onUp(e: PointerEvent) {
    if (e.pointerId !== this.dragPointer) return
    this.dragPointer = -1
    this.theme.pointerUp(this.pt(e))
    this.kick()
  }

  private onCancel() {
    if (this.dragPointer === -1) return
    this.dragPointer = -1
    this.theme.pointerCancel()
    this.kick()
  }

  // ---------- frame loop ----------

  private resize() {
    const w = this.arena.clientWidth
    const h = this.arena.clientHeight
    if (!w || !h) return
    this.width = w
    this.height = h
    const dpr = window.devicePixelRatio || 1
    this.canvas.width = Math.round(w * dpr)
    this.canvas.height = Math.round(h * dpr)
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.fx.resize(w, h)
    this.theme.resize(w, h)
    this.kick()
  }

  /** Hide the counter/speaker row when neither is showing, so it leaves no empty gap. */
  private syncTop() {
    const counter = !(this.host.querySelector('.pl-counter') as HTMLElement).hidden
    const sound = !this.soundBtn.hidden && this.playing
    this.topEl.hidden = !counter && !sound
  }

  /** Tell the browser which part of the arena is the game (touches there play; elsewhere they scroll). */
  private syncTouch() {
    const r = this.playing && this.queue.length ? this.theme.touchRegion?.() : null
    if (!r) { this.touchEl.hidden = true; return }
    this.touchEl.hidden = false
    Object.assign(this.touchEl.style, {
      left: r.x + 'px', top: r.y + 'px', width: r.width + 'px', height: r.height + 'px', touchAction: r.touchAction,
    })
  }

  /** Phone file pickers use the input's accept attribute to filter (and offer the camera for images). */
  private syncAccept() {
    const a = this.options.accept?.join(',')
    if (a) this.input.accept = a
    else this.input.removeAttribute('accept')
  }

  private kick() {
    if (!this.destroyed) this.syncTouch()
    if (this.raf || !this.playing || this.destroyed) return
    this.palette = this.readPalette() // pick up CSS variable changes whenever an animation starts
    this.last = performance.now()
    this.raf = requestAnimationFrame((t) => this.frame(t))
  }

  private frame(now: number) {
    this.raf = 0
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    this.theme.update(dt)
    this.ctx.clearRect(0, 0, this.width, this.height)
    this.theme.draw()
    if (this.theme.active()) this.raf = requestAnimationFrame((t) => this.frame(t))
  }

  // ---------- validation + upload ----------

  private validate(file: File): string | null {
    const { accept, maxSize, maxFiles } = this.options
    if (accept && !matchesAccept(file, accept)) return this.t('errType')
    if (maxSize && file.size > maxSize) return this.t('errSize', { max: formatSize(maxSize) })
    if (maxFiles && this.accepted >= maxFiles) return this.t('errCount', { max: maxFiles })
    return null
  }

  private fail(file: File, reason: string) {
    this.say(`"${file.name}": ${reason}`, true)
    this.emit('error', { file, error: new Error(reason) })
  }

  private uploader(): UploadFn | null {
    const o = this.options
    if (o.upload) return o.upload
    if (o.uploadUrl) return xhrUploader({ url: o.uploadUrl, method: o.method, fieldName: o.fieldName, headers: o.headers, withCredentials: o.withCredentials, pathField: o.pathField })
    return null
  }

  private startUpload(file: File, played = false) {
    const li = document.createElement('li')
    li.className = 'pl-item'
    li.innerHTML = '<span class="pl-item-name"></span><span class="pl-item-state"><span class="pl-pct"></span><button type="button" class="pl-act" hidden></button></span><div class="pl-track"><div class="pl-fill"></div></div>'
    const nameEl = li.querySelector('.pl-item-name') as HTMLElement
    const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath
    nameEl.textContent = rel || file.name
    nameEl.title = rel || file.name
    const item: Item = {
      file, played, li, mode: 'none', ctrl: new AbortController(),
      pct: li.querySelector('.pl-pct')!, act: li.querySelector('.pl-act')!, fill: li.querySelector('.pl-fill')!,
    }
    item.act.addEventListener('click', () => {
      if (item.mode === 'cancel') this.cancelItem(item)
      else if (item.mode === 'retry') this.enqueue(item)
    })
    this.list.prepend(li)
    this.items.add(item)
    this.enqueue(item)
  }

  /** Put an item in line. At most `concurrency` uploads run at once; the rest wait their turn. */
  private enqueue(item: Item) {
    item.ctrl = new AbortController()
    item.li.classList.remove('pl-fail', 'pl-done')
    item.pct.textContent = this.t('waiting')
    item.fill.style.width = '0%'
    this.setAction(item, 'cancel')
    this.batchTotal++
    this.pending.push(item)
    this.pump()
  }

  private pump() {
    const max = Math.max(1, this.options.concurrency ?? 4)
    while (!this.destroyed && this.running < max && this.pending.length) {
      const item = this.pending.shift()!
      this.running++
      void this.run(item).finally(() => { this.running--; this.pump() })
    }
  }

  private cancelItem(item: Item) {
    const i = this.pending.indexOf(item)
    if (i >= 0) { this.pending.splice(i, 1); this.markCancelled(item, false) } // still waiting: never started
    else item.ctrl.abort() // running: the uploader rejects and run() reports it
  }

  private markCancelled(item: Item, started: boolean) {
    this.setAction(item, 'retry')
    item.pct.textContent = this.t('cancelled')
    this.say(this.t('statusCancelled', { name: item.file.name }))
    this.emit('cancel', { file: item.file })
    if (started) this.theme.uploadFailed?.(item.file, 'cancel')
    this.finishOne(false)
  }

  /** Count a finished upload; for batches, show "3 of 40 done" and reset once everything is through. */
  private finishOne(announce: boolean) {
    this.batchDone++
    if (announce && this.batchTotal > 1) this.say(this.t('statusBatch', { done: this.batchDone, total: this.batchTotal }))
    if (this.batchDone >= this.batchTotal) this.batchDone = this.batchTotal = 0
  }

  private setAction(item: Item, mode: Item['mode']) {
    item.mode = mode
    item.act.hidden = mode === 'none'
    item.act.textContent = mode === 'cancel' ? this.t('cancel') : mode === 'retry' ? this.t('retry') : ''
  }

  private async run(item: Item) {
    const { file, li, pct, fill } = item
    const { signal } = item.ctrl
    li.classList.remove('pl-fail')
    pct.textContent = this.t('uploading')
    fill.style.width = '0%'
    this.emit('uploadstart', { file })
    this.say(this.t('statusUploading', { name: file.name }))
    this.theme.uploadStarted?.(file)
    const up = this.uploader()
    this.setAction(item, up ? 'cancel' : 'none')
    try {
      let response: unknown
      if (up) {
        response = await up(file, {
          signal,
          onProgress: (p) => {
            if (this.destroyed) return
            fill.style.width = p + '%'
            pct.textContent = Math.round(p) + '%'
            this.emit('progress', { file, percent: p })
            this.theme.uploadProgress?.(file, p)
          },
        })
      }
      if (this.destroyed) return
      fill.style.width = '100%'
      li.classList.add('pl-done')
      pct.textContent = up ? this.t('uploaded') : this.t('ready')
      this.setAction(item, 'none')
      this.items.delete(item)
      this.counterEl.textContent = String(++this.uploaded)
      this.say(this.t('statusUploaded', { name: file.name }))
      this.finishOne(true)
      this.emit('upload', { file, response })
      this.theme.uploadSucceeded?.(file)
      if (!item.played && !this.theme.celebrates) this.celebrate(undefined, 40)
    } catch (err) {
      if (this.destroyed) return
      this.setAction(item, 'retry')
      if (signal.aborted) {
        this.markCancelled(item, true)
      } else {
        this.finishOne(false)
        li.classList.add('pl-fail')
        pct.textContent = this.t('failed')
        this.say(this.t('statusFailed', { name: file.name }), true)
        this.emit('error', { file, error: err })
        this.theme.uploadFailed?.(file, 'error')
      }
    }
  }

  // ---------- delight: sound, confetti, haptics ----------

  private initSound() {
    let on = !!this.options.sound
    try {
      const saved = localStorage.getItem('playload:sound')
      if (saved !== null) on = saved === '1'
    } catch { /* storage blocked: fall back to the option */ }
    this.sfx.enabled = on
    this.soundBtn.hidden = this.options.soundToggle === false
    this.listen(this.soundBtn, 'click', () => {
      this.sfx.unlock()
      this.setSound(!this.sfx.enabled, true)
      this.sfx.play('pop')
    })
  }

  private setSound(on: boolean, save: boolean) {
    this.sfx.enabled = on
    this.soundBtn.setAttribute('aria-pressed', String(on))
    this.soundBtn.setAttribute('aria-label', this.t(on ? 'soundOn' : 'soundOff'))
    this.soundBtn.innerHTML = on ? SPEAKER_ON : SPEAKER_OFF
    if (save) { try { localStorage.setItem('playload:sound', on ? '1' : '0') } catch { /* ignore */ } }
  }

  private celebrate(at?: { x: number; y: number }, count = 90) {
    if (!this.playing) return
    if (this.options.confetti === false || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const z = this.zone.getBoundingClientRect()
    const a = this.arena.getBoundingClientRect()
    const colors = this.options.confettiColors?.length ? this.options.confettiColors : [this.palette.accent, ...DEFAULT_CONFETTI]
    this.fx.burst(at?.x ?? z.left - a.left + z.width / 2, at?.y ?? z.top - a.top + z.height / 2, count, colors)
  }

  private react(type: PlayloadEventName) {
    if (!this.playing) return
    const sound: Partial<Record<PlayloadEventName, SoundName>> = { score: 'score', miss: 'miss', upload: 'upload', error: 'error', filesadded: 'pop' }
    const s = sound[type]
    if (s) this.sfx.play(s)
    if (this.options.haptics !== false && 'vibrate' in navigator) {
      if (type === 'score') navigator.vibrate(18)
      else if (type === 'miss') navigator.vibrate(40)
    }
  }

  // ---------- misc ----------

  private get playing() {
    return !this.theme?.plain
  }

  /** "PDF, Images · up to 10 MB · max 5 files" for the classic dropzone. */
  private rulesText() {
    const { accept, maxSize, maxFiles } = this.options
    const parts: string[] = []
    if (accept?.length) {
      const names = accept.map((a) => {
        if (a.endsWith('/*')) { const major = a.slice(0, -2); return this.t('type.' + major, undefined, major) }
        if (a.startsWith('.')) return a.slice(1).toUpperCase()
        return (a.split('/')[1] ?? a).toUpperCase()
      })
      parts.push([...new Set(names)].join(', '))
    }
    if (maxSize) parts.push(this.t('rulesSize', { size: formatSize(maxSize) }))
    if (maxFiles) parts.push(maxFiles === 1 ? this.t('rulesFilesOne') : this.t('rulesFiles', { n: maxFiles }))
    return parts.join(' · ')
  }

  private isTouchFirst() {
    return matchMedia('(hover: none) and (pointer: coarse)').matches
  }

  private pickGame() {
    const m = this.options.pickMode ?? 'auto'
    return m === 'game' || (m === 'auto' && this.isTouchFirst())
  }

  private updateSkip() {
    if (!this.queue.length) this.offerSkip = false
    const after = this.options.easyAfter ?? 0
    const struggling = after > 0 && this.options.easyMode !== 'auto' && this.misses >= after
    this.skipBtn.hidden = !((struggling || this.offerSkip) && this.queue.length > 0 && this.playing)
  }

  private onPaste(e: ClipboardEvent) {
    if (this.options.paste === false) return
    const current = lastActive && instances.has(lastActive) ? lastActive : [...instances][0]
    if (current !== this) return
    const t = e.target as HTMLElement | null
    const typing = !!t && !this.host.contains(t) && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
    if (typing) return
    const files = Array.from(e.clipboardData?.files ?? [])
    if (!files.length) return
    e.preventDefault()
    const named = files.map((f, i) => {
      if (f.name && !/^image\.\w+$/i.test(f.name)) return f
      const sub = f.type.split('/')[1]?.replace('jpeg', 'jpg').replace(/\+.*/, '') || 'bin'
      const n = files.length > 1 ? `-${i + 1}` : ''
      return new File([f], `pasted-${stamp()}${n}.${sub}`, { type: f.type, lastModified: f.lastModified })
    })
    this.addFiles(named, { direct: this.options.pasteMode === 'direct' })
  }

  private say(msg: string, bad = false) {
    this.status.textContent = msg
    this.status.classList.toggle('pl-bad', bad)
  }

  private updateHint() {
    this.hint.classList.toggle('pl-hidden', this.queue.length > 0 || !this.playing)
  }

  private emit(type: PlayloadEventName, detail: Record<string, unknown>, quiet = false) {
    if (!quiet) this.react(type)
    this.host.dispatchEvent(new CustomEvent('playload-' + type, { detail, bubbles: true }))
  }
}
