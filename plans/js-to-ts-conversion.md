# Convert app-owned JS/JSX to TS/TSX

## Scope

App-owned frontend files only. Exclude vendor (`lib/mui_templates/`).

## Files renamed (11)

| Before | After |
|--------|-------|
| `entrypoints/app.js` | `entrypoints/app.ts` |
| `entrypoints/application.js` | `entrypoints/application.ts` |
| `entrypoints/demos.js` | `entrypoints/demos.ts` |
| `entrypoints/init_color_scheme_script.js` | `entrypoints/init_color_scheme_script.ts` |
| `entrypoints/ssr.jsx` | `entrypoints/ssr.tsx` |
| `initializers/turbo_react.js` | `initializers/turbo_react.ts` |
| `initializers/turbo_rails.js` | `initializers/turbo_rails.ts` |
| `lib/create_emotion_cache.js` | `lib/create_emotion_cache.ts` |
| `lib/turbo_react.jsx` | `lib/turbo_react.tsx` |
| `components/demos/mui_hello_world.jsx` | `components/demos/mui_hello_world.tsx` |
| `components/demos/mui_dashboard.jsx` | `components/demos/mui_dashboard.tsx` |

## Reference updates (6)

- `vite.config.ts:16` — SSR path: `ssr.jsx` → `ssr.tsx`
- `app/views/layouts/app.html.erb:24` — `"init_color_scheme_script.js"` → `"init_color_scheme_script.ts"`, `"app.js"` → `"app.ts"`
- `app/views/layouts/demos.html.erb:24` — same as above
- `app/views/layouts/application.html.erb:22` — `"application.js"` → `"application.ts"`

## New files

- `tsconfig.json` — strict, scoped to `app/frontend`, `moduleResolution: bundler`, `jsx: react-jsx`, `noImplicitAny: false`
- `app/frontend/env.d.ts` — Vite globals (`__VITE_SOURCE_DIR__`, `globalThis.render`), `TurboBeforeRenderEvent`, missing MUI Pro module declarations, `*/dataGrid` type stub

## Deps added

- `typescript@6.0.3` (dev)
- `@types/react` (dev)
- `@types/node@24.12.3` (dev, pinned)

## Type annotations added

- `ssr.tsx` — typed `argsJson`, return shape, `components` glob
- `create_emotion_cache.ts` — typed `nonce`, `insertionPoint`, return type
- `turbo_react.tsx` — typed constructor/DOM params, `BodyWithReactRoots` interface, `TurboBeforeRenderEvent`
- `mui_hello_world.tsx` — typed `emotionCache` prop as `EmotionCache`
- `init_color_scheme_script.ts` — no changes needed (inline script)

## Vendor workarounds

- `env.d.ts` declares missing MUI Pro modules (`@mui/x-data-grid-pro/themeAugmentation`, `@mui/x-date-pickers-pro/themeAugmentation`) and `dataGrid` JS module
- 3 vendor files got `// @ts-nocheck` for TS 6 `never[]` inference:
  - `lib/mui_templates/v9.0.1/dashboard/components/SessionsChart.tsx`
  - `lib/mui_templates/v9.0.1/dashboard/components/StatCard.tsx`
  - `lib/mui_templates/v9.0.1/dashboard/internals/data/gridData.tsx`

## Not changed

- Glob patterns in `ssr.tsx:15` / `turbo_react.tsx:41` — already handle both `.jsx`/`.tsx`
- `Dockerfile` — pre-existing unrelated change

## Results

- `tsc --noEmit`: 0 errors
- `vite build` (client): passes
- `vite build --ssr`: passes
