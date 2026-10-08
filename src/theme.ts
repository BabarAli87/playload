export interface Point { x: number; y: number }

/** Brand colors read from the component's CSS variables, so canvas art matches your design. */
export interface Palette {
  accent: string
  text: string
  muted: string
  card: string
  bg: string
  ok: string
  err: string
  line: string
  /** Computed font-family of the component. */
  font: string
}

/** What the core gives a theme to work with. */
export interface ThemeAPI {
  /** The playfield. Themes may set CSS vars on it: --pl-height, --pl-zone-top, --pl-zone-h. */
  readonly arena: HTMLElement
  /** The dropzone card (DOM, under the canvas). */
  readonly zone: HTMLElement
  /** Canvas 2D context, already scaled for the screen. Coordinates are CSS pixels. */
  readonly ctx: CanvasRenderingContext2D
  readonly width: number
  readonly height: number
  /** true on touch-first devices (phones, tablets): no drag-and-drop of files, so word hints accordingly. */
  readonly coarse: boolean
  /** Current brand colors. Read it inside draw(), it updates with the CSS variables. */
  readonly palette: Palette
  /** Look up user-overridable text. Falls back to `fallback`, then the built-in English. */
  text(key: string, fallback?: string, vars?: Record<string, string | number>): string
  /** The file waiting to be played, or undefined when the queue is empty. */
  file(): File | undefined
  /** Ask for another animation frame (call whenever something starts moving). */
  requestFrame(): void
  setCursor(cursor: string): void
  say(message: string, bad?: boolean): void
  /** The file succeeded (fires `playload-score`, plays the sound, and by default confetti from `at`). Show your success animation, then call commit(). Pass `celebrate: false` to fire confetti yourself later. */
  scored(at?: Point, celebrate?: boolean): void
  /** Fire the confetti burst (respects the user's confetti and reduced-motion settings). */
  celebrate(at?: Point, count?: number): void
  /** Hand the file over: it leaves the queue and uploads. Core then calls fileChanged(). */
  commit(): void
  /** The attempt failed (fires `playload-miss`). The file stays in the queue. */
  missed(): void
}

/**
 * The part of the arena that belongs to the game (in arena pixels). Touches that start inside it get `touchAction`
 * (usually 'none': the finger plays); touches anywhere else scroll the page normally.
 */
export interface TouchRegion {
  x: number
  y: number
  width: number
  height: number
  /** CSS touch-action for the region: 'none' for free dragging, 'pan-y' when only horizontal drags are yours. */
  touchAction: string
}

export interface Theme {
  /** A theme with no game (e.g. 'classic'): files upload immediately, no canvas, no sound or confetti. */
  plain?: boolean
  /** Hint shown while the queue is empty. May be a getter so label overrides apply. */
  readonly hint: string
  /** Text under "Drop files here". May be a getter. */
  readonly subtitle?: string
  /** Arena size changed (also called once after creation). */
  resize(width: number, height: number): void
  /** The file at the head of the queue changed (new file loaded, or previous one committed). */
  fileChanged(): void
  /** Return true to start a drag; core then captures the pointer. Only called while a file is queued. */
  pointerDown(p: Point): boolean
  /** `dragging` is true between a successful pointerDown and pointerUp. */
  pointerMove(p: Point, dragging: boolean): void
  pointerUp(p: Point): void
  pointerCancel(): void
  update(dt: number): void
  /** Canvas is already cleared. */
  draw(): void
  /** Where touches should play instead of scrolling the page. Only asked while a file is waiting. */
  touchRegion?(): TouchRegion | null
  /**
   * Upload lifecycle hooks, for themes driven by the upload itself (e.g. 'rocket').
   * They fire for every upload, including ones that skipped the game (drop on the card, "Choose file").
   */
  uploadStarted?(file: File): void
  uploadProgress?(file: File, percent: number): void
  uploadSucceeded?(file: File): void
  uploadFailed?(file: File, reason: 'error' | 'cancel'): void
  /** true = this theme celebrates in its own way, so the core skips its confetti on upload success. */
  readonly celebrates?: boolean
  /** true while the theme needs animation frames. */
  active(): boolean
  destroy?(): void
}

export type ThemeFactory = (api: ThemeAPI) => Theme

const registry = new Map<string, ThemeFactory>()

export function registerTheme(name: string, factory: ThemeFactory) {
  registry.set(name, factory)
}

export function getTheme(name: string): ThemeFactory | undefined {
  return registry.get(name)
}

export function themeNames() {
  return [...registry.keys()]
}
