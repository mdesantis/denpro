import { defineConfig } from 'vite'
import manifestSRI from 'vite-plugin-manifest-sri'
import react from '@vitejs/plugin-react'
import rails from 'rails-vite-plugin'

const sourceDir = 'app/frontend'

const disableSri = process.env.VITE_DISABLE_SRI === 'true'

export default defineConfig({
  plugins: [
    ...(disableSri ? [] : [manifestSRI()]),
    react(),
    rails({
      sourceDir,
      ssr: 'entrypoints/ssr.tsx',
      ssrOutDir: 'dist/server',
    }),
  ],
  define: {
    __VITE_SOURCE_DIR__: JSON.stringify(`/${sourceDir}`)
  },
  build: {
    sourcemap: disableSri ? true : 'hidden'
  },
  ssr: {
    target: 'webworker',
    noExternal: true,
    external: ['stream', 'buffer', 'events', 'string_decoder'],
    resolve: {
      conditions: ['edge-light', 'module', 'browser', 'development'],
    },
  },
  server: {
    allowedHosts: [
      '.localhost.localdomain'
    ],
    cors: { origin: /^https?:\/\/(?:(?:[^:]+\.)?localhost(\.localdomain)?|127\.0\.0\.1|\[::1\])(?::\d+)?$/ }
  }
})
