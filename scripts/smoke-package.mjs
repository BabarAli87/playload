// Pre-publish gate: pack the library, install the TARBALL into a clean project, and use it the way users will.
// This catches problems that source-level tests cannot (e.g. code dropped by tree-shaking, a broken exports map).
//   npm run test:package          (needs network once, to install react + typescript into the temp project)
import { execSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' })
const root = process.cwd()
const tmp = mkdtempSync(join(tmpdir(), 'playload-smoke-'))
const consumer = join(tmp, 'consumer')
mkdirSync(consumer)

const SMOKE = `
import { createRequire } from 'node:module'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { existsSync } from 'node:fs'
const require = createRequire(import.meta.url)
const results = []
const check = (name, ok, extra = '') => results.push((ok ? 'PASS' : 'FAIL') + '  ' + name + (extra ? '  ' + extra : ''))
try {
  const m = await import('playload')
  check('ESM import (no DOM)', typeof m.Playload === 'function')
  check('all 4 themes registered', ['basketball', 'claw', 'classic', 'rocket'].every((t) => m.themeNames().includes(t)), m.themeNames().join(','))
  check('exports DEFAULT_LABELS + OPTION_KEYS', !!m.DEFAULT_LABELS && Array.isArray(m.OPTION_KEYS))
} catch (e) { check('ESM import (no DOM)', false, e.message) }
try { const m = require('playload'); check('CJS require', typeof m.Playload === 'function'); check('CJS: all 4 themes registered', m.themeNames().length >= 4) }
catch (e) { check('CJS require', false, e.message) }
try {
  const { Playload } = await import('playload/react')
  check('react ESM server render', renderToString(createElement(Playload, { className: 'x' })).includes('class="x"'))
  const { Playload: P2 } = require('playload/react')
  check('react CJS server render', renderToString(createElement(P2, {})).startsWith('<div'))
} catch (e) { check('react server render', false, e.message) }
try { check('playload/playload.css resolves', existsSync(require.resolve('playload/playload.css'))) } catch (e) { check('css export', false, e.message) }
try { require('playload/dist/core.d.ts'); check('deep imports blocked', false) } catch { check('deep imports blocked', true) }
console.log(results.join('\\n'))
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0)
`

const TYPES = `
import { Playload as Core, registerTheme, type PlayloadOptions } from 'playload'
import { Playload, type PlayloadHandle } from 'playload/react'
import { useRef } from 'react'
export function Ok() {
  const ref = useRef<PlayloadHandle>(null)
  return <Playload ref={ref} theme="claw" scheme="auto" accept={['.pdf']} maxSize={1024} onUpload={({ file }) => file.name} />
}
const o: PlayloadOptions = { concurrency: 2, pickMode: 'game' }
void o; void Core; void registerTheme
// @ts-expect-error scheme only allows light | dark | auto
export const bad1 = <Playload scheme="purple" />
// @ts-expect-error maxSize is a number
export const bad2 = <Playload maxSize="10MB" />
`

let ok = false
try {
  const tgz = run('npm pack --pack-destination "' + tmp + '"', root).trim().split('\n').pop()
  console.log('packed', tgz)
  run('npm init -y', consumer)
  console.log('installing the tarball into a clean project...')
  run('npm i "' + join(tmp, tgz) + '" react@18 react-dom@18 @types/react@18 typescript@5', consumer)
  writeFileSync(join(consumer, 'smoke.mjs'), SMOKE)
  writeFileSync(join(consumer, 'types.tsx'), TYPES)
  console.log(run('node smoke.mjs', consumer))
  run('npx tsc --noEmit --strict --module esnext --moduleResolution bundler --jsx react-jsx --target es2022 --lib es2022,dom types.tsx', consumer)
  console.log('PASS  consumer TypeScript types (and deliberate type errors were rejected)')
  ok = true
} catch (e) {
  console.error('\nPACKAGE TEST FAILED\n' + (e.stdout || '') + (e.stderr || '') + (ok ? '' : e.message))
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
process.exit(ok ? 0 : 1)
