// Writes dist/playload.css so apps with a strict CSP (or that want one shared stylesheet) can load it themselves.
import { mkdirSync, writeFileSync } from 'node:fs'
import { CSS } from '../src/styles.ts'

mkdirSync('dist', { recursive: true })
writeFileSync('dist/playload.css', CSS.trim() + '\n')
console.log('wrote dist/playload.css (' + CSS.length + ' bytes)')
