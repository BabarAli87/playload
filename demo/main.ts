import { themeNames } from '../src/index'
import type { PlayloadElement } from '../src/element'

const el = document.getElementById('pl') as PlayloadElement

// Fake uploader so the demo works without a server.
el.upload = (file, { onProgress }) =>
  new Promise((resolve) => {
    let p = 0
    const t = setInterval(() => {
      p = Math.min(100, p + 8 + Math.random() * 12)
      onProgress(p)
      if (p >= 100) { clearInterval(t); resolve({ ok: true, name: file.name }) }
    }, 120)
  })

const sample = (name: string, type: string) => new File(['demo'], name, { type })
document.getElementById('pdf')!.onclick = () => el.addFiles([sample('report.pdf', 'application/pdf')])
document.getElementById('img')!.onclick = () => el.addFiles([sample('photo.png', 'image/png')])

for (const t of ['score', 'miss', 'upload', 'error']) el.addEventListener('playload-' + t, (e) => console.log(t, (e as CustomEvent).detail))
;(window as any).pl = el

const bar = document.getElementById('themes')!
for (const name of themeNames()) {
  const b = document.createElement('button')
  b.textContent = name
  b.onclick = () => {
    el.setAttribute('theme', name)
    bar.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b))
  }
  if (name === 'basketball') b.classList.add('on')
  bar.append(b)
}

// theming demo: everything below is just CSS variables and options
document.getElementById('brand')!.addEventListener('input', (e) => el.style.setProperty('--pl-accent', (e.target as HTMLInputElement).value))
document.getElementById('dark')!.addEventListener('change', (e) => {
  const on = (e.target as HTMLInputElement).checked
  el.classList.toggle('pl-dark', on)
  document.body.style.background = on ? '#0f1219' : ''
})
document.getElementById('noconf')!.addEventListener('change', (e) => { el.options!.confetti = !(e.target as HTMLInputElement).checked })
