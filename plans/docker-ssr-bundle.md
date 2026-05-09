# Build SSR bundle during Docker production build

## Problem

`./bin/rails assets:precompile` (run in Dockerfile build stage) triggers `npx vite build` for client assets via `rails_vite` railties hook — verified working. But the SSR bundle (`dist/server/ssr.js`) is NOT built during this step.

In development this works because:
- `web` process: `npx vite build --ssr && bin/rails s` — builds SSR before Rails boots
- `ssr` process: `npx vite build --ssr --watch` — rebuilds on changes

Docker build only runs `assets:precompile`, which skips SSR. Production container crashes on first `react_component(ssr: true)` because `dist/server/ssr.js` doesn't exist.

## Fix options

### Option A: Add explicit SSR build to Dockerfile

Add before the `assets:precompile` step:

```dockerfile
RUN npx vite build --ssr app/frontend/entrypoints/ssr.jsx --outDir dist/server --logLevel warn
```

Simple, explicit. Works regardless of what `rails_vite` does internally.

### Option B: Check if rails_vite hooks assets:precompile for SSR

The `rails_vite` gem's railties hook may already trigger `npx vite build --ssr` during `assets:precompile` if configured. Check the gem source or run with verbose output.

## Verification

```bash
docker build . 2>&1 | grep -E '(ssr|vite build)'
# OR after build:
docker run --rm denpro-rls ls /workdir/dist/server/
```
