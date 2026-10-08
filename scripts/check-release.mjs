// Refuses to publish while the release is not ready. Runs first in "prepublishOnly".
import { readFileSync } from 'node:fs'

const problems = []
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))

if (pkg.private) problems.push('package.json still has "private": true. Delete that line to allow publishing.')
if (pkg.license !== 'MIT') problems.push('package.json "license" should be "MIT" (it matches the LICENSE file).')
for (const file of ['package.json', 'LICENSE', 'README.md']) {
  if (readFileSync(file, 'utf8').includes('YOUR_NAME_HERE')) problems.push(file + ' still contains the placeholder YOUR_NAME_HERE. Replace it with your name.')
}

if (problems.length) {
  console.error('\nNot ready to publish:\n  - ' + problems.join('\n  - ') + '\n\nSee PUBLISHING.md.\n')
  process.exit(1)
}
console.log('Release check passed (name filled in, not private, license present).')
