import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/main/index.ts') }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/preload/index.ts') }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    build: {
      // three (core + examples/jsm addons) is large but necessary; keep it in its own
      // cacheable vendor chunk so the app chunk stays small (~0.44 MB vs ~2.4 MB before).
      // The warning limit sits just above three's real size so it flags real regressions.
      chunkSizeWarningLimit: 1900,
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/renderer/index.html') },
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/three')) return 'three'
            if (id.includes('node_modules')) return 'vendor'
            return undefined
          }
        }
      }
    }
  }
})
