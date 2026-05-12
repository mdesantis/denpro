import { execSync } from 'node:child_process'
import { defineConfig } from 'rolldown'
import { replacePlugin } from 'rolldown/plugins'

const sharedPlugins = [
  {
    name: 'generate-ssr-imports',
    buildStart: () => {
      execSync('npx tsx scripts/build-ssr-imports.ts', { stdio: 'inherit' })
    },
  },
  replacePlugin({
    __VITE_SOURCE_DIR__: JSON.stringify('/app/frontend'),
    'process.env.NODE_ENV': '"production"',
    'process.env.READABLE_STREAM': '""',
    'process.browser': 'false',
  }),
]

const sharedOutput = {
  dir: 'dist/server',
  format: 'cjs' as const,
  sourcemap: true,
}

export default defineConfig([
  {
    input: 'app/frontend/entrypoints/ssr.tsx',
    output: { ...sharedOutput, entryFileNames: 'ssr.js' },
    platform: 'node' as const,
    resolve: { alias: { '@': './app/frontend' } },
    plugins: sharedPlugins,
  },
  {
    input: 'app/frontend/entrypoints/ssr-app.tsx',
    output: { ...sharedOutput, entryFileNames: 'ssr-app.js' },
    platform: 'node' as const,
    resolve: { alias: { '@': './app/frontend' } },
    plugins: sharedPlugins,
  },
  {
    input: 'app/frontend/entrypoints/ssr-demos.tsx',
    output: { ...sharedOutput, entryFileNames: 'ssr-demos.js' },
    platform: 'node' as const,
    resolve: { alias: { '@': './app/frontend' } },
    plugins: sharedPlugins,
  },
])
