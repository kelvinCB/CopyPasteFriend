import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron/simple'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    electron({
      main: {
        entry: 'src-electron/main.ts',
        onstart(args) {
          // Explicitly start electron with the current directory
          args.startup(['.'])
        },
        vite: {
          build: {
            rollupOptions: {
              external: ['electron'],
              output: {
                format: 'cjs',
                entryFileNames: 'main.js',
              },
            },
          },
        },
      },
      preload: {
        input: path.join(__dirname, 'src-electron/preload.ts'),
        vite: {
          build: {
            rollupOptions: {
              output: {
                format: 'cjs',
                entryFileNames: 'preload.js',
              },
            },
          },
        },
      },
    }),
  ],
})
