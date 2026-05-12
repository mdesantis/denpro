# Rolldown + Oxc for denpro SSR dev

## Problem

`Procfile.dev` runs 4 processes — 3 are heavy Node.js/Vite processes:

```
web: bin/rails s
vite: npx vite                    # client dev server (keep)
ssr-app: npx vite build --ssr ... # SSR watch build 1 (Node.js ~100-200MB)
ssr-demos: npx vite build --ssr ..# SSR watch build 2 (Node.js ~100-200MB)
```

SSR builds don't need HMR, asset pipeline, or Rails manifest integration — just TSX→JS. But each spawns a full Vite/Rollup Node process: 3-5s startup, 500-2000ms rebuilds.

## Scope

**SSR builds only.** Client dev server (`npx vite`) stays untouched with `rails-vite-plugin`, SRI, HMR, CSP — all that is irrelevant for SSR. We only replace the two `vite build --ssr --watch` processes with one Rolldown process.

## Vite-specific code in SSR entries

Full audit of what the SSR entry files (`ssr.tsx`, `ssr-app.tsx`, `ssr-demos.tsx`) and their dependencies use:

| # | Feature | Files | Lines | Rolldown status |
|---|---------|-------|-------|-----------------|
| 1 | `import.meta.glob('...', { eager: true })` | 3 SSR entries | 6 each | **UNKNOWN** — may be supported (Rollup-compat), must verify |
| 2 | `import.meta.env.SSR` | `create_emotion_cache.ts:6` | 1 | **NOT supported** — replace with `typeof document === 'undefined'` |
| 3 | `__VITE_SOURCE_DIR__` global | 3 SSR entries | 15 each | **Polyfillable** via Rolldown `define` |
| 4 | `vite/client` types | `env.d.ts:1`, `tsconfig.json:15` | 2 | **Replace** with custom declarations |

No Vite-specific features in transitive deps (`@emotion/*`, `@mui/*`, `react-dom`, etc.). The `turbo_react.ts` file uses `import.meta.glob` (lazy, no `eager`) but is client-side only — not part of SSR builds.

## Approach decision: `import.meta.glob`

Two paths depending on whether Rolldown supports it:

**Path A — Rolldown supports `import.meta.glob` (verify first):** Zero SSR source changes for glob. Only fix the other 3 items below. ~10 lines changed total.

**Path B — Not supported:** Replace with codegen. A `scripts/build-ssr-imports.ts` script scans component dirs at build time and emits `app/frontend/entrypoints/__ssr_imports__.ts` with explicit imports. More work but fully portable.

## Steps

### Step 1: Install rolldown

```bash
npm install --save-dev rolldown
```

### Step 2: Create `rolldown.ssr.ts`

```ts
import { defineConfig } from 'rolldown'

export default defineConfig({
  input: {
    'ssr-app': 'app/frontend/entrypoints/ssr-app.tsx',
    'ssr-demos': 'app/frontend/entrypoints/ssr-demos.tsx',
  },
  output: {
    dir: 'dist/server',
    format: 'esm',
    entryFileNames: '[name].js',
    sourcemap: true,
  },
  platform: 'neutral',
  external: ['stream', 'buffer', 'events', 'string_decoder'],
  define: {
    __VITE_SOURCE_DIR__: JSON.stringify('/app/frontend'),
  },
  resolve: {
    alias: { '@': './app/frontend' },
    conditions: ['edge-light', 'module', 'browser', 'development'],
  },
})
```

No React plugin needed — Rolldown uses Oxc internally for TS/JSX transforms.

### Step 3: Replace `import.meta.env.SSR`

**File: `app/frontend/lib/create_emotion_cache.ts:6`**

```ts
// Before:
if (!import.meta.env.SSR) {
// After:
if (typeof document !== 'undefined') {
```

**File: `app/frontend/lib/mui_templates/v9.0.1/dashboard/components/CustomizedDataGrid.tsx:7`**

Same pattern — guard `window.__CSP_NONCE__` access with `typeof window !== 'undefined'` (already partially guarded, only the `!import.meta.env.SSR` check needs changing).

### Step 4: Update `env.d.ts`

Replace `/// <reference types="vite/client" />` with custom declarations:

```ts
interface ImportMeta {
  glob(pattern: string, options?: { eager?: boolean }): Record<string, any>
}

declare const __VITE_SOURCE_DIR__: string
```

Remove `"types": ["vite/client"]` from `tsconfig.json`.

### Step 5: Update `Procfile.dev`

```
web: bin/rails s
vite: npx vite
ssr: npx rolldown -c rolldown.ssr.ts --watch
```

Remove `ssr-app` and `ssr-demos` lines.

### Step 6: Simplify `bin/dev`

Remove the `npx vite build --ssr ...` pre-build on line 6. Rolldown watch starts in ~50ms, bundle is ready before Rails boots.

## Where Oxc fits

| Layer | Tool | Role |
|-------|------|------|
| Parser | **Oxc** (inside Rolldown) | Parse TS/TSX, AST construction |
| Transform | **Oxc** (inside Rolldown) | TS stripping, JSX→JS, decorators |
| Bundler | **Rolldown** | Entry bundling, code splitting, tree-shaking |

No direct Oxc dependency in denpro — Rolldown bundles it. Oxc's speed is what makes Rolldown's startup (~50ms) and incremental rebuilds (~50-200ms) possible vs Vite/Rollup's Node.js overhead.

## What does NOT change

- `vite: npx vite` — client dev server, HMR, `rails-vite-plugin`, SRI, CSP config
- `Dockerfile` — production builds (keep Vite for now; Rolldown SSR in prod is follow-up)
- Client entry points (`app.ts`, `application.ts`, `demos.ts`, `turbo_react.ts`)
- Rails helpers, view templates, CSP initializer

## Future

- **Production builds:** Extend Rolldown SSR to Dockerfile, remove Vite as dependency entirely
- **Gem-level integration:** see `ssr-deno/plans/rolldown-ssr-dev.md` for ssr-deno-specific follow-ups (bin/ssr-dev, auto-build on stale mtime, sample app)
