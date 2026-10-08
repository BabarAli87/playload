import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

const src = (p: string) => fileURLToPath(new URL('./src/' + p, import.meta.url))

// `npm run dev` serves the demo pages; `npm run build` builds the library (see also vite.react.config.ts).
export default defineConfig({
  resolve: {
    // demos import the package by its public names
    alias: [
      { find: 'playload/react', replacement: src('react.ts') },
      { find: /^playload$/, replacement: src('index.ts') },
    ],
  },
  build: {
    lib: { entry: 'src/index.ts', name: 'Playload', fileName: 'playload', formats: ['es', 'umd'] },
  },
})
