import { StrictMode, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Playload, type PlayloadHandle } from 'playload/react'
import { themeNames } from 'playload'

const fakeUpload = (_file: File, { onProgress, signal }: { onProgress: (p: number) => void; signal: AbortSignal }) =>
  new Promise<unknown>((resolve, reject) => {
    let p = 0
    const t = setInterval(() => { p = Math.min(100, p + 10); onProgress(p); if (p >= 100) { clearInterval(t); resolve({ ok: true }) } }, 100)
    signal.addEventListener('abort', () => { clearInterval(t); reject(new DOMException('Aborted', 'AbortError')) })
  })

function App() {
  const [theme, setTheme] = useState('basketball')
  const [dark, setDark] = useState(false)
  const [french, setFrench] = useState(false)
  const [mounted, setMounted] = useState(true)
  const [confetti, setConfetti] = useState(true)
  const [uploaded, setUploaded] = useState<string[]>([])
  const [log, setLog] = useState<string[]>([])
  const handle = useRef<PlayloadHandle>(null)
  const note = (s: string) => setLog((l) => [s, ...l].slice(0, 6))

  return (
    <main>
      <h1>Playload for React</h1>
      <p className="sub">Props are live: nothing below resets a queued file or a running upload.</p>
      <div className="row" id="themes">
        {themeNames().map((n) => (
          <button key={n} className={n === theme ? 'on' : ''} onClick={() => setTheme(n)}>{n}</button>
        ))}
      </div>
      <div className="row">
        <label><input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} /> dark</label>
        <label><input type="checkbox" checked={french} onChange={(e) => setFrench(e.target.checked)} /> French</label>
        <label><input type="checkbox" checked={confetti} onChange={(e) => setConfetti(e.target.checked)} /> confetti</label>
        <button id="mount" onClick={() => setMounted((m) => !m)}>{mounted ? 'Unmount' : 'Mount'}</button>
      </div>

      {mounted && (
        <Playload
          ref={handle}
          theme={theme}
          scheme={dark ? 'dark' : 'light'}
          confetti={confetti}
          labels={french ? { dropTitle: 'Déposez vos fichiers', choose: 'Parcourir…', counter: 'Envoyés' } : undefined}
          accept={['.pdf', 'image/*']}
          maxSize={25 * 1024 * 1024}
          upload={fakeUpload}
          className="my-uploader"
          onFilesAdded={({ files }) => note('added ' + files.map((f) => f.name).join(', '))}
          onScore={({ file }) => note('score ' + file.name)}
          onMiss={({ misses }) => note('miss #' + misses)}
          onUpload={({ file }) => { setUploaded((u) => [...u, file.name]); note('uploaded ' + file.name) }}
          onError={({ file, error }) => note('error ' + file.name + ': ' + (error as Error).message)}
          onCancel={({ file }) => note('cancelled ' + file.name)}
        />
      )}

      <div className="row">
        <button id="addpdf" onClick={() => handle.current?.addFiles([new File(['x'], 'report.pdf', { type: 'application/pdf' })])}>Add PDF via ref</button>
        <button id="adddirect" onClick={() => handle.current?.addFiles([new File(['x'], 'photo.png', { type: 'image/png' })], { direct: true })}>Upload PNG directly</button>
        <button id="skip" onClick={() => handle.current?.skip()}>skip()</button>
      </div>
      <div className="log" id="log">uploaded in React state: {uploaded.length}{'\n'}{log.join('\n')}</div>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
