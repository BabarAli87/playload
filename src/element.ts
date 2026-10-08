import { Playload, type PlayloadOptions } from './core'

/**
 * <play-load theme="basketball" upload-url="/api/upload" accept=".pdf,image/*" max-size="10485760" max-files="5">
 *
 * Attributes:
 *   theme="basketball|claw|rocket|classic"   no-game (same as classic)    scheme="light|dark|auto"
 *   upload-url, method, field-name    accept, max-size, max-files
 *   no-confetti  no-haptics  sound  no-sound-toggle  no-paste  paste-mode="game|direct"
 *   easy-after="3"  easy-mode="button|auto"
 *   pick-mode="auto|game|direct"   (what Choose file does; auto = game on touch devices)
 *   no-counter  no-list  no-choose   (hide parts of the UI)
 *   choose-folder  no-folders  folder-limit="1000"  concurrency="4"  path-field="path"
 *   confetti-colors="#f00,#0f0"   labels='{"choose":"Browse"}'   nonce   no-inject-styles
 * Properties: upload (custom uploader fn), labels (object).
 * Events (bubble): playload-score, -miss, -uploadstart, -progress, -upload, -error, -cancel, -filesadded, -skip
 */
// Importing this file on a server (no DOM) must not throw, so the base class falls back to a stub there.
const Base = (typeof HTMLElement === 'undefined' ? class {} : HTMLElement) as typeof HTMLElement

export class PlayloadElement extends Base {
  static observedAttributes = ['theme', 'labels', 'scheme']
  private core?: Playload
  private _upload?: PlayloadOptions['upload']
  private _labels?: Record<string, string>

  get upload() { return this._upload }
  set upload(fn) {
    this._upload = fn
    if (this.core) this.core.options.upload = fn
  }

  /** The live options object of the underlying component (undefined until connected). */
  get options() { return this.core?.options }

  get labels() { return this._labels }
  set labels(v) {
    this._labels = v
    if (this.core && v) this.core.setLabels(v)
  }

  connectedCallback() {
    const attr = (n: string) => this.getAttribute(n) ?? undefined
    const num = (n: string) => (this.hasAttribute(n) ? Number(this.getAttribute(n)) : undefined)
    let attrLabels: Record<string, string> | undefined
    try { attrLabels = this.hasAttribute('labels') ? JSON.parse(this.getAttribute('labels')!) : undefined } catch { console.warn('[playload] the labels attribute must be valid JSON') }
    this.core = new Playload(this, {
      uploadUrl: attr('upload-url'),
      method: attr('method'),
      fieldName: attr('field-name'),
      accept: attr('accept')?.split(',').map((s) => s.trim()).filter(Boolean),
      maxSize: num('max-size'),
      maxFiles: num('max-files'),
      theme: attr('theme'),
      game: this.hasAttribute('no-game') ? false : undefined,
      scheme: attr('scheme') as PlayloadOptions['scheme'],
      labels: { ...attrLabels, ...this._labels },
      confettiColors: attr('confetti-colors')?.split(',').map((s) => s.trim()).filter(Boolean),
      sound: this.hasAttribute('sound') ? true : undefined,
      confetti: this.hasAttribute('no-confetti') ? false : undefined,
      haptics: this.hasAttribute('no-haptics') ? false : undefined,
      paste: this.hasAttribute('no-paste') ? false : undefined,
      pasteMode: attr('paste-mode') as PlayloadOptions['pasteMode'],
      easyAfter: num('easy-after'),
      pickMode: attr('pick-mode') as PlayloadOptions['pickMode'],
      easyMode: attr('easy-mode') as PlayloadOptions['easyMode'],
      folders: this.hasAttribute('no-folders') ? false : undefined,
      chooseFolder: this.hasAttribute('choose-folder') ? true : undefined,
      folderLimit: num('folder-limit'),
      concurrency: num('concurrency'),
      pathField: attr('path-field'),
      showCounter: this.hasAttribute('no-counter') ? false : undefined,
      soundToggle: this.hasAttribute('no-sound-toggle') ? false : undefined,
      showList: this.hasAttribute('no-list') ? false : undefined,
      chooseButton: this.hasAttribute('no-choose') ? false : undefined,
      nonce: this.nonce || attr('nonce'),
      injectStyles: this.hasAttribute('no-inject-styles') ? false : undefined,
      upload: this._upload,
    })
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (!this.core) return
    if (name === 'theme') this.core.setTheme(value ?? 'basketball')
    else if (name === 'scheme') this.core.update({ scheme: (value ?? 'light') as PlayloadOptions['scheme'] })
    else if (name === 'labels' && value) {
      try { this.core.setLabels(JSON.parse(value)) } catch { console.warn('[playload] the labels attribute must be valid JSON') }
    }
  }

  disconnectedCallback() {
    this.core?.destroy()
    this.core = undefined
  }

  addFiles(files: Iterable<File>, opts?: { direct?: boolean }) {
    this.core?.addFiles(files, opts)
  }

  skip() { this.core?.skip() }
  cancelAll() { this.core?.cancelAll() }
}

if (typeof customElements !== 'undefined' && !customElements.get('play-load')) customElements.define('play-load', PlayloadElement)
