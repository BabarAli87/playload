import type { ThemeFactory } from '../theme'
import { basketball } from './basketball'
import { claw } from './claw'
import { classic } from './classic'
import { rocket } from './rocket'

/**
 * The built-in themes. The core registers these explicitly (see core.ts). It must not rely on a bare
 * `import './themes'` side effect: bundlers honouring package.json "sideEffects" would drop it.
 */
export const BUILTIN_THEMES: Record<string, ThemeFactory> = { basketball, claw, classic, rocket }
