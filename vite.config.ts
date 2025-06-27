import { defineConfig } from 'vite'
import RailsPlugin from 'vite-plugin-rails'
import ReactPlugin from '@vitejs/plugin-react'

export default defineConfig({
  esbuild: {
    supported: {
      'top-level-await': true
    },
  },
  plugins: [
    RailsPlugin({ stimulus: false, sri: {} }),
    ReactPlugin()
  ],
  server: {
    allowedHosts: [
      '.localhost.localdomain'
    ]
  },
  ssr: {
    noExternal: ['@mui/x-data-grid'],
  }
})
