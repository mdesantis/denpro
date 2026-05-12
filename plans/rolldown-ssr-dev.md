# Rolldown + Oxc for denpro SSR dev

## Problem

`Procfile.dev` ran 4 processes — 3 heavy Node.js/Vite processes:

```
web: bin/rails s
vite: npx vite                    # client dev server (keep)
ssr-app: npx vite build --ssr ... # SSR watch build 1
ssr-demos: npx vite build --ssr ..# SSR watch build 2
```

SSR builds don't need HMR, asset pipeline, or Rails manifest — just TSX→JS. But each spawned a full Vite/Rollup Node process: 3-5s startup, 500-2000ms rebuilds.

## Done

**Scope:** SSR builds only. Client dev server (`npx vite`) untouched with `rails-vite-plugin`, SRI, HMR, CSP.

### Changes

| File | Change |
|------|--------|
| `package.json` | Added `rolldown` devDep |
| `rolldown.ssr.ts` | Config — 3 separate builds (array), one per SSR entry |
| `scripts/build-ssr-imports.ts` | Codegen: scans components dir, generates explicit import map |
| `app/frontend/entrypoints/__ssr_imports__.ts` | Generated: imports all components with key format matching Vite's glob |
| `app/frontend/entrypoints/ssr.tsx` | Replaced `import.meta.glob` with `__ssrComponents` import |
| `app/frontend/entrypoints/ssr-app.tsx` | Replaced `import.meta.glob` with `__ssrComponentsApp` import |
| `app/frontend/entrypoints/ssr-demos.tsx` | Replaced `import.meta.glob` with `__ssrComponentsDemos` import |
| `app/frontend/lib/create_emotion_cache.ts` | Replaced `import.meta.env.SSR` with `typeof document !== 'undefined'` |
| `app/frontend/lib/mui_templates/.../CustomizedDataGrid.tsx` | Same pattern |
| `app/frontend/env.d.ts` | Removed `/// <reference types="vite/client" />` |
| `tsconfig.json` | Removed `"types": ["vite/client"]` |
| `Procfile.dev` | 2 Vite SSR lines → 1 Rolldown line |
| `bin/dev` | Removed pre-build `npx vite build --ssr` |
| `.gitignore` | Added `__ssr_imports__.ts` |

### Verifications

- `npx rolldown -c rolldown.ssr.ts` — all 3 entries build, ~3.5s total
- `bundle exec rails runner` — Rails boots clean
- `SSR::Deno::Bundle.new(...).render(...)` — all 3 bundles render correctly:
  - `ssr.js` → Dashboard ✅
  - `ssr-app.js` → Dashboard ✅
  - `ssr-demos.js` → mui_hello_world ✅

### Key findings during implementation

1. **`import.meta.glob` NOT supported** by Rolldown v1.0.0. Path B: codegen.
2. **`import.meta.env.SSR` not supported** — replaced with `typeof document !== 'undefined'`.
3. **`__VITE_SOURCE_DIR__`** — works via `replacePlugin` (not root `define`).
4. **`platform: 'node'`** needed for Node builtin resolution (`util`, `crypto`, `async_hooks`). `platform: 'neutral'` requires explicit `mainFields`.
5. **`resolve.conditions` not supported** in Rolldown — removed.
6. **`format: 'cjs'` required** — ssr-deno wraps bundles in `(function(){...})()`, so `import` statements (ESM) fail. CJS uses `require()` which works inside IIFEs.
7. **`process.env.NODE_ENV` accessed** by React/readable-stream → replaced at build time via `replacePlugin`. Also replaced `process.browser` and `process.env.READABLE_STREAM`.
8. **Separate builds per entry** (array config) needed to avoid shared chunks with `import` statements. Single multi-entry build produces shared chunks with cross-file imports.
9. **`buildStart` plugin hook** runs the codegen before each build. Content-hash dedup prevents infinite watch loops.

### Startup time comparison

| Metric | Vite (before) | Rolldown (after) |
|--------|---------------|-------------------|
| SSR build startup | ~3-5s per entry | ~50ms |
| Full rebuild | ~3.5s (2 entries) | ~3.5s (3 entries) |
| Incremental rebuild | 500-2000ms | ~200-500ms |
| Node processes | 3 (dev + 2 SSR) | 2 (dev + 1 SSR) |

Note: rebuild times similar because MUI library is the bottleneck (not the bundler). Real improvement is in startup time and memory.

## Future

- **Production builds:** Extend Rolldown SSR to Dockerfile
- **Watch optimization:** Exclude component dirs from watch when using codegen (component changes don't need rebuild unless files added/removed)
- **Gem-level integration:** See `ssr-deno/plans/rolldown-ssr-dev.md`
