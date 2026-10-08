import { defineConfig } from 'vite'

// The React wrapper is built separately so React (and the core, via the 'playload' import) stay external:
// an app that uses both 'playload' and 'playload/react' then shares ONE copy of the core and its theme registry.
export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: { entry: 'src/react.ts', formats: ['es', 'cjs'], fileName: (format) => (format === 'es' ? 'react.js' : 'react.cjs') },
    rollupOptions: {
      external: ['react', 'react/jsx-runtime', 'playload'],
      output: { banner: '"use client";' }, // Next.js App Router: this file is a client component
    },
  },
})
