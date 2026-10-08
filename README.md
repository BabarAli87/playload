# playload

File upload that is fun when you want it to be and boring when you need it to be.

Drop a file and **shoot it through a hoop**, **grab it with a claw machine**, **launch it as a rocket**, or switch to the **classic** dropzone. One component, one set of options, any framework.

| `basketball` | `claw` | `rocket` | `classic` |
|---|---|---|---|
| Drag the file back, aim, let go. | Slide the claw over the file, let go. | Hold the rocket to launch. **The upload is the flight.** | Plain dropzone. Uploads instantly. |

- **Zero runtime dependencies.** About 24 KB gzipped (77 KB raw), including all four themes, folder support and touch handling. The themes share their code, and CSS is injected, not a separate file to load.
- **A real web component** (`<play-load>`) for Vue, Svelte, Angular or plain HTML, **plus a first-class React wrapper** (`playload/react`).
- **Brandable** with CSS variables, dark mode included, and every text is overridable.
- **Everything is optional.** Confetti, sound, haptics, paste, easy mode, counter, file list: each can be turned off.
- **Safe to remove.** `destroy()` aborts uploads, closes audio and removes every listener.

> Status: working and tested in a browser during development, **not yet published to npm**. Touch support was verified on an emulated phone (375 px, touch events), **not yet on physical devices**: see the checklist under [Touch devices](#touch-devices).

---

## Quick start

```bash
npm install playload
```

**With a bundler** (Vite, webpack, Next.js, ...): import it once, anywhere in your app. That registers the `<play-load>` tag.

```js
import 'playload'
```

```html
<play-load
  upload-url="/api/upload"
  accept=".pdf,image/*"
  max-size="10485760"
  max-files="5"
></play-load>

<script>
  const el = document.querySelector('play-load')
  el.addEventListener('playload-upload', (e) => console.log('uploaded', e.detail.file, e.detail.response))
  el.addEventListener('playload-error',  (e) => console.warn('failed',   e.detail.file, e.detail.error))
</script>
```

**Without a bundler:** browsers cannot resolve the bare name `playload` by themselves, so map it to the file in `node_modules` (your server has to serve that folder):

```html
<script type="importmap">
  { "imports": { "playload": "./node_modules/playload/dist/playload.js" } }
</script>
<script type="module">import 'playload'</script>
```

Not sure which theme to ship? Use `theme="classic"` for serious forms and keep the games for places where delight matters.

### No tag, plain JavaScript

```js
import { Playload } from 'playload'

const upload = new Playload(document.querySelector('#target'), {
  theme: 'claw',
  uploadUrl: '/api/upload',
})
upload.on('upload', (e) => console.log(e.detail.file))
// later:
upload.destroy()
```

### React

```bash
npm install playload     # react >= 17 is an optional peer dependency
```

```tsx
import { Playload, type PlayloadHandle } from 'playload/react'
import { useRef } from 'react'

export function Uploader() {
  const up = useRef<PlayloadHandle>(null)

  return (
    <Playload
      ref={up}
      theme="claw"
      scheme="auto"
      uploadUrl="/api/upload"
      accept={['.pdf', 'image/*']}
      maxSize={10 * 1024 * 1024}
      labels={{ dropTitle: 'Drop your files' }}
      className="my-uploader"
      onUpload={({ file, response }) => console.log('uploaded', file.name, response)}
      onError={({ file, error }) => console.warn('failed', file.name, error)}
    />
  )
}
```

- **Props are the options.** Every option from the table below is a prop, plus `className`, `style` and `id` (applied to a wrapper `<div>`).
- **Props are live.** Change `theme`, `scheme`, `labels`, `accept`, `confetti`, ... and the component updates in place. Queued files and running uploads are never reset. **Remove a prop and that option goes back to its default.**
- **Callbacks get the event's `detail` directly:** `onFilesAdded`, `onScore`, `onMiss`, `onSkip`, `onUploadStart`, `onProgress`, `onUpload`, `onCancel`, `onError`. They always see your latest props, so inline arrow functions are fine.
- **Ref handle:** `addFiles(files, { direct })`, `skip()`, `cancelAll()`, and `instance` (the underlying `Playload`).
- **Inline `upload`, `labels`, `accept` etc. are fine.** Values are compared by content, so new object or array identities on each render do no work.
- **SSR and Next.js:** the component renders an empty `<div>` on the server and builds the UI after mount. `playload/react` ships with a `"use client"` banner, and importing it on the server is safe.
- **StrictMode:** supported. The double mount in development cleans up after itself.
- `nonce` and `injectStyles` are read once, when the component first mounts.

Use `playload/react` and `playload` side by side (for example to `registerTheme`): they share a single copy of the core.

---

## Options

Every option is a property of the `Playload` constructor. On `<play-load>` most are attributes (see the right column).

**Uploading**

| Option | Attribute | Default | |
|---|---|---|---|
| `uploadUrl` | `upload-url` | none | Built-in multipart POST with progress. |
| `method`, `fieldName` | `method`, `field-name` | `POST`, `file` | |
| `headers`, `withCredentials` | | none | Pass auth headers or cookies. |
| `upload` | property `el.upload` | none | Your own uploader (S3, Supabase, ...). Receives `(file, { onProgress, signal })`. |

With neither `uploadUrl` nor `upload` it runs in **manual mode**: you only receive the `File` in the events.

**Validation** (client-side convenience, see [Security](#security))

| Option | Attribute | |
|---|---|---|
| `accept` | `accept` | `['.pdf', 'image/*']`, same rules as `<input accept>`. |
| `maxSize` | `max-size` | Bytes. |
| `maxFiles` | `max-files` | Total files accepted. |

**Look and feel**

| Option | Attribute | Default | |
|---|---|---|---|
| `theme` | `theme` | `basketball` | `basketball`, `claw`, `rocket`, `classic`, or your own. |
| `game` | `no-game` | `true` | `false` = same as `classic`. |
| `scheme` | `scheme` | `light` | `light`, `dark`, `auto` (follows the OS). |
| `labels` | `labels` (JSON) / property | English | Override any text. |
| `confettiColors` | `confetti-colors` | accent + festive | |

**Features, all switchable**

| Option | Attribute | Default |
|---|---|---|
| `confetti` | `no-confetti` | on (and skipped for `prefers-reduced-motion`) |
| `sound` | `sound` | **off**. Users get a speaker button and their choice is remembered. |
| `haptics` | `no-haptics` | on (short vibration on phones) |
| `paste` | `no-paste` | on (Ctrl/Cmd+V for files and screenshots) |
| `pasteMode` | `paste-mode` | `game`. `direct` uploads pasted files at once. |
| `pickMode` | `pick-mode` | `auto`. What "Choose file" does: `direct` uploads at once, `game` loads a game piece, `auto` = `direct` on desktop and `game` on touch devices (see below). |
| `easyAfter` | `easy-after` | `3`. Misses before a way out is offered. `0` = off. |
| `easyMode` | `easy-mode` | `button` ("Upload it anyway") or `auto`. |

**Folders and batches**

| Option | Attribute | Default | |
|---|---|---|---|
| `folders` | `no-folders` | on | Dropping a folder reads it (recursively) and uploads every file in it. |
| `chooseFolder` | `choose-folder` | off | Adds a "Choose folder" button. |
| `folderLimit` | `folder-limit` | `1000` | Most files taken from one folder; you are told when it is cut. |
| `concurrency` | `concurrency` | `4` | Uploads running at once. The rest show "Waiting…" and can be cancelled. |
| `pathField` | `path-field` | `path` | Form field that carries each file's folder path (built-in uploader). |

Folder drops always upload directly: nobody wants to play 300 rounds of basketball. `.DS_Store`, `Thumbs.db` and `desktop.ini` are skipped. Each file's folder path is on `file.webkitRelativePath` (for example `Project/docs/c.pdf`), shown in the list, and sent to your server in the `path` form field, **before** the file part so streaming parsers see it first. With a custom `upload` function, read `file.webkitRelativePath` yourself.

If a folder contains files that fail validation, you get **one** summary message ("40 files skipped: file type not allowed"); every file still gets its own `playload-error` event.

**Parts of the UI**

| Option | Attribute | |
|---|---|---|
| `showCounter` | `no-counter` | The "Uploaded N" chip. |
| `soundToggle` | `no-sound-toggle` | The speaker button. |
| `showList` | `no-list` | The list of uploads with progress. |
| `chooseButton` | `no-choose` | The "Choose file" button. |

**Security / CSP**: `nonce`, `injectStyles` (`no-inject-styles`). See [Content Security Policy](#content-security-policy).

### Methods

`addFiles(files, { direct })`, `skip()`, `cancelAll()`, `setTheme(name)`, `setLabels({...})`, `update({...})`, `on(event, fn)`, `destroy()`.
On the element: `addFiles`, `skip`, `cancelAll`, plus the `upload`, `labels` and read-only `options` properties. On a live instance, `update({ ...options })` changes options in place (a key set to `undefined` returns to its default).

### Events

All bubble from the element and carry data in `e.detail`. On the class API, use `on('score', fn)`.

| Event | `detail` |
|---|---|
| `playload-filesadded` | `{ files }` (validated files) |
| `playload-score` | `{ file }` the game was won |
| `playload-miss` | `{ file, misses }` |
| `playload-skip` | `{ file }` easy mode let it through |
| `playload-uploadstart` | `{ file }` |
| `playload-progress` | `{ file, percent }` |
| `playload-upload` | `{ file, response }` success (`response` is the parsed JSON, or text) |
| `playload-cancel` | `{ file }` the user hit Cancel |
| `playload-error` | `{ file, error }` validation or upload failure |

---

## Themes

| Theme | How it plays | Good to know |
|---|---|---|
| `basketball` | Drag the file back like a slingshot, aim along the dotted arc, let go. | About 5% of random throws score. Easy mode kicks in after 3 misses. |
| `claw` | Press and drag to line the claw up, let go. A clean grab carries the file to the chute; an off-centre grab slips. | Grab tolerance is a few numbers at the top of `src/themes/claw/index.ts`. |
| `rocket` | Press and hold the rocket for 1.2 s to launch. **Real upload progress flies it**: shaking on the pad (0–20%), lift-off (20–60%), deep space (60–90%), approach (90–100%), then it lands on the planet. Failure crashes it; Cancel aborts it. | Works for *every* upload, including "Choose file" and drops on the card, which launch a rocket by themselves. There is no way to "miss", so easy mode never triggers. Flights are paced so even an instant upload takes about 2 seconds to watch. |
| `classic` | A plain dropzone. Uploads start the moment a file is added. | No canvas, sound, or confetti. The right choice for serious forms. |

## Theming

### Brand colors, radius, font

Every color is a CSS variable. The defaults sit in `:where()`, so **any selector you write wins**:

```css
play-load {
  --pl-accent: #6d28d9;   /* hoop, claw, buttons, progress, confetti */
  --pl-radius: 8px;
  --pl-font: inherit;     /* use your app's font */
}
```

| Variable | Default | Used for |
|---|---|---|
| `--pl-accent` | `#e8631f` | Hoop and claw art, primary buttons, progress, confetti |
| `--pl-bg` | `#eaedf3` | Arena background |
| `--pl-card` | `#fff` | Dropzone card, file pages, list rows |
| `--pl-text` / `--pl-muted` | `#14161a` / `#7a8190` | Text, secondary text, net and rail |
| `--pl-line` | `#c9ceda` | Borders |
| `--pl-ok` / `--pl-err` | green / red | Success and error states |
| `--pl-radius` | `20px` | Corner rounding (buttons use half) |
| `--pl-font` | system stack | Font family |

The theme art on the canvas reads these same variables, so a purple brand really does give you a purple hoop. File-type badge colors (PDF red, images blue, ...) and the decorative prizes in the claw machine are intentionally fixed.

### Dark mode

```html
<play-load scheme="dark"></play-load>   <!-- or scheme="auto" to follow the OS -->
```

It just sets your variables to a dark set. Override them like any others.

### Text and languages

```js
el.labels = {
  dropTitle: 'Déposez vos fichiers',
  choose: 'Parcourir…',
  counter: 'Envoyés',
  'claw.subtitle': 'ou attrapez-le avec la pince',
}
```

Every string lives in `DEFAULT_LABELS` (exported). Placeholders like `{name}`, `{n}`, `{size}` and `{max}` are filled in at runtime. `labels` can also be passed as a JSON attribute.

---

## Custom uploader (S3, Supabase, ...)

```js
el.upload = async (file, { onProgress, signal }) => {
  const { url } = await fetch('/api/presign?name=' + encodeURIComponent(file.name)).then((r) => r.json())
  // Use XHR if you want byte-level progress; fetch has none for uploads.
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress((e.loaded / e.total) * 100)
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error('Upload failed ' + xhr.status)))
    xhr.onerror = () => reject(new Error('Network error'))
    signal.addEventListener('abort', () => { xhr.abort(); reject(new DOMException('Aborted', 'AbortError')) })
    xhr.send(file)
  })
}
```

Honour `signal` and the **Cancel** button works. The component also aborts everything when it is removed from the page.

---

## Security

What the component does for you:

- File names are inserted as text, never as HTML. No `eval`, no third-party requests, no runtime dependencies.
- It talks only to the URL you give it. Cookies are sent only if you set `withCredentials`.
- Uploads are aborted, and audio, timers and listeners are released, on removal.

What it **cannot** do for you:

> **Validate on the server.** `accept`, `maxSize` and `maxFiles` run in the visitor's browser and can be bypassed by anyone with dev tools or `curl`. Treat them as friendly feedback, never as protection.

On the server, at minimum: enforce a size limit, allow-list file types by **content** (not by the name or the client's MIME type), generate your own file names, store uploads outside your web root or on object storage, and authenticate and rate-limit the endpoint. For example with Express and multer:

```js
import multer from 'multer'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    cb(null, ['application/pdf', 'image/png', 'image/jpeg'].includes(file.mimetype)),
})

app.post('/api/upload', requireAuth, upload.single('file'), (req, res) => {
  // verify magic bytes here, then store under a name you generate
  res.json({ id: saveSomewhere(req.file) })
})
```

### Folder paths are untrusted input

If you accept folder uploads, the `path` field is text the visitor controls. **Never use it directly to build a file path on disk.** A malicious client can send `../../etc/cron.d/x` or an absolute path. Normalize it, reject anything with `..`, a leading `/` or a drive letter, cap its length, and ideally store files under names you generate and keep the original path only as metadata.

```js
import path from 'node:path'

function safeRelative(p = '') {
  const clean = path.posix.normalize(p.replaceAll('\\', '/'))
  if (!clean || clean === '.' || clean.startsWith('/') || clean.startsWith('..') || clean.includes('/../') || /^[a-zA-Z]:/.test(clean)) return null
  return clean.slice(0, 255)
}
```

### Content Security Policy

By default the component injects one `<style>` tag. With a strict CSP, pick one:

```html
<!-- 1. give the tag your nonce -->
<play-load nonce="r4nd0m"></play-load>

<!-- 2. or ship the CSS yourself and let the component skip injection -->
<link rel="stylesheet" href="/node_modules/playload/dist/playload.css">
<play-load no-inject-styles></play-load>
```

Everything else the component does to styles goes through the DOM style API, which CSP allows.

---

## Accessibility

- The dropzone is a real button: focusable, Enter and Space open the file picker.
- **"Choose file" is always available**, so keyboard and screen-reader users never have to play. Drop `theme="classic"` in where games are not appropriate.
- Status messages go to a polite live region. The speaker button has `aria-pressed` and a label.
- Confetti respects `prefers-reduced-motion`.

The games themselves are pointer-based. There is no keyboard way to shoot or steer.

---

## Touch devices

Phones and tablets cannot drag files in, so the component adapts:

- **Choose file loads the game.** With `pickMode: 'auto'` (the default), picking a file on a touch-first device loads it as the game piece, and **"Upload it anyway"** is offered immediately for people who just want to upload. Desktop is unchanged: "Choose file" uploads directly, which is the accessible way past the game. Force either behaviour with `pickMode`.
- **Wording follows the device.** "Drop files here" becomes "Tap to choose files", and the game hints say "Choose a file…" instead of "Drop a file…". A `dropTitle` label you set always wins; set `dropTitleTouch` to change the touch text.
- **The page still scrolls.** Only the part of the arena you actually play with captures touches (a box around the ball, the claw cabinet's horizontal drag, the rocket on its pad). Swiping anywhere else scrolls the page normally, so the component is not a scroll trap. Themes declare this with `touchRegion()`.
- **Hold-to-launch survives a wobbly finger,** and a long press does not open the browser's context menu or text selection.
- **Bigger targets** on coarse pointers (speaker button 44 px, buttons with extra padding), and no double-tap-zoom delay.
- **File pickers are filtered.** The hidden input gets your `accept` list, so phone pickers can show only matching files and offer the camera for `image/*`.
- **Narrow layouts.** The speaker button and the "Uploaded N" chip live in their own row above the arena, so they never collide with the dropzone at any width. Basketball is a little *easier* on phones (the hoop is closer: about 10% of random throws score at 343 px vs 5% at 560 px).
- **iOS audio** unlocks on the first completed tap, as Safari requires. Vibration is skipped where unsupported (iOS Safari).

**Real-device checklist** (not yet run, please try before relying on it):

1. iOS Safari and Android Chrome: can you scroll the page by swiping over the arena (away from the ball)?
2. Basketball: drag the ball back and release. Does the page stay put and the shot launch?
3. Claw: slide horizontally. Does a slightly diagonal swipe ever scroll the page instead?
4. Rocket: press and hold for 1.2 s. Does anything pop up (callout, selection, magnifier)?
5. Choose file: does the picker filter by your `accept` list, and does the file arrive in the game?
6. Turn sound on, tap once: does it play on iOS?
7. Rotate to landscape (the arena is 520 px tall, so it will scroll).

## Writing your own theme

A theme is a function that receives a small API and returns handlers. It never touches uploads, validation or events; it only says when the file *succeeded* (`scored`), *failed* (`missed`) and when to hand it over (`commit`).

```ts
import { registerTheme } from 'playload'

registerTheme('click-me', (api) => ({
  hint: 'Click the square',
  resize() {}, fileChanged() { api.requestFrame() },
  pointerDown(p) { api.scored(p); setTimeout(() => api.commit(), 400); return false },
  pointerMove() {}, pointerUp() {}, pointerCancel() {}, update() {},
  active: () => false,
  draw() {
    if (!api.file()) return
    api.ctx.fillStyle = api.palette.accent      // honour the brand colors
    api.ctx.fillRect(20, 20, 60, 60)
  },
}))
```

Then `<play-load theme="click-me">`.

Themes driven by the upload itself (like `rocket`) can also implement optional hooks: `uploadStarted(file)`, `uploadProgress(file, percent)`, `uploadSucceeded(file)` and `uploadFailed(file, 'error' | 'cancel')`. They fire for **every** upload, including ones that skipped the game. Set `celebrates: true` if your theme fires its own confetti (`api.celebrate()`), so the core does not double up. See `src/theme.ts` for the full contract, and `src/themes/` for four working examples. `basketball` is built on a reusable slingshot-toss engine (`src/themes/toss/`).

---

## Develop

```bash
npm install
npm run dev            # demos: / (web component) and /react.html (React wrapper)
npm run typecheck
npm run build          # dist/playload.js + .umd.cjs, react.js + .cjs, type declarations, playload.css
npm run test:physics   # what % of throws score? (difficulty check for the toss engine)
```

## Folders: what to know

- Reading dropped folders uses `webkitGetAsEntry()`. Despite the name, every current desktop browser supports it. Mobile browsers have no way to drag a folder, but the "Choose folder" button (`<input webkitdirectory>`) works on most of them.
- The folder logic is tested with mock directory entries that mimic the real API, including its batched `readEntries`. It has not been exercised against huge real folders (tens of thousands of files).
- Every file in a folder is validated one by one against `accept`, `maxSize` and `maxFiles`.

## Browser support

Current Chrome, Edge, Safari (16.2+) and Firefox (113+). It uses `CanvasRenderingContext2D.roundRect`, `color-mix()` and custom elements.

## Known limitations

- Touch has only been verified on an emulated phone, not physical devices (see the checklist above). Real browsers can differ in gesture arbitration, especially a diagonal drag in the claw cabinet.
- The games cannot be played with a keyboard (the classic path always can).
- Only the theme art that follows the palette is brandable; file-type badge colors and the claw machine's decorative prizes are fixed.
- Version 0.x: the API may still change between minor versions.

## License

MIT, see [LICENSE](LICENSE). Copyright (c) 2026 Babar Ali.
