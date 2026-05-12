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
| `app/frontend/lib/create_emotion_cache.ts` | Replaced `import.meta.env.SSR` with `isBrowser()` |
| `app/frontend/lib/mui_templates/.../CustomizedDataGrid.tsx` | Same pattern |
| `app/frontend/lib/utils.ts` | **New** — `isBrowser()` utility |
| `app/frontend/env.d.ts` | Removed `/// <reference types="vite/client" />` |
| `tsconfig.json` | Removed `"types": ["vite/client"]`, added `["node"]` |
| `Procfile.dev` | 2 Vite SSR lines → 1 Rolldown line |
| `bin/dev` | Vite SSR pre-build → Rolldown pre-build |
| `bin/prod-local` | Vite SSR build → Rolldown build |
| `Dockerfile` | Vite SSR builds → Rolldown build |
| `.gitignore` | Added `__ssr_imports__.ts` |

## Status

This Rolldown integration is a **stepping stone**. The long-term goal is eliminating the external build step entirely — see `../ssr-deno/plans/ssr-source-dev-mode.md` for the next phase (DevBundle: load `.tsx` source directly in Deno V8, no bundler process needed).

Meanwhile, the current setup is functional and verified:

- `npx rolldown -c rolldown.ssr.ts` — all 3 entries build, ~3.5s total
- `bundle exec rails runner` — Rails boots clean
- `SSR::Deno::Bundle.new(...).render(...)` — all 3 bundles render correctly:
  - `ssr.js` → Dashboard ✅
  - `ssr-app.js` → Dashboard ✅
  - `ssr-demos.js` → mui_hello_world ✅
- 0 TypeScript errors

### Key findings

1. **`import.meta.glob` NOT supported** by Rolldown v1.0.0 → codegen script
2. **`import.meta.env.SSR` not supported** → `isBrowser()` utility
3. **`__VITE_SOURCE_DIR__`** works via `replacePlugin` (not root `define`)
4. **`platform: 'node'`** needed for Node builtin resolution
5. **`resolve.conditions` not supported** in Rolldown
6. **`format: 'cjs'` required** — ssr-deno wraps bundles in IIFE, ESM `import` fails
7. **`process.env.*`** replaced at build time via `replacePlugin` (Deno denies env access)
8. **Separate builds per entry** (array config) to avoid shared chunk `import` statements
9. **`buildStart` plugin** runs codegen before each build; content-hash dedup prevents watch loops

### Startup time

| Metric | Vite (before) | Rolldown (after) |
|--------|---------------|-------------------|
| SSR build startup | ~3-5s per entry | ~50ms |
| Full rebuild | ~3.5s (2 entries) | ~3.5s (3 entries) |
| Incremental rebuild | 500-2000ms | ~200-500ms |
| Node processes | 3 (dev + 2 SSR) | 2 (dev + 1 SSR) |

## Next: DevBundle (ssr-deno gem)

The current setup still needs a Procfile entry (`ssr: npx rolldown ...`). The next phase moves SSR loading into the gem itself so `bin/rails s` works standalone. See `../ssr-deno/plans/ssr-source-dev-mode.md`.
