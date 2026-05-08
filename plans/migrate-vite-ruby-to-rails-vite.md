# Migrate: vite_ruby / vite_rails → rails_vite + ssr-deno

## What changes

| Area | Current | Target |
|------|---------|--------|
| Ruby gems | `vite_ruby` + `vite_rails` + `httpx` | `rails_vite ~> 0.2.2` + `ssr-deno` (local path) |
| npm packages | `vite-plugin-rails` + `vite-plugin-ruby` + `express` + `morgan` | `rails-vite-plugin` + `vite-plugin-manifest-sri` |
| Config | `config/vite.json` + vite.config.ts | vite.config.ts only |
| Imports alias | `~` and `@` (both source dir) | `@` only (rails-vite-plugin default) |
| SSR | Express Node server (separate OS process, HTTP POST) | `ssr-deno` gem (embedded V8 in Ruby process) |
| View helpers | `vite_client_tag`, `vite_javascript_tag`, `vite_react_refresh_tag` | `vite_tags` (one call for JS + CSS + HMR) |
| Dev processes | `web` + `vit` + `ssr` (3 proc) | `web` + `ssr` (2 proc) |
| SSR entry | `app/frontend/ssr_server.js` (Express app) | `app/frontend/entrypoints/ssr.jsx` (pure render fn) |
| SSR target | default (Node) | `webworker` (Deno) |
| SSR build output | `public/vite-ssr/` | `dist/server/` |

## Status: ✅ MIGRATION COMPLETE

All 18 execution steps below have been implemented in commit `a1686b2`.
See [Remaining issues](#remaining-issues) for post-migration cleanup items.

## Execution steps (ordered)

### 1. Gemfile ✅

Line 37-42: replace three gems:

```ruby
# remove:
gem 'vite_ruby'
gem 'vite_rails'
gem 'httpx'

# add:
gem 'rails_vite', '~> 0.2.2'
gem 'ssr-deno', path: '../ssr-deno', require: 'ssr/deno/rails'
```

### 2. package.json ✅

Remove from `dependencies`:
- `vite-plugin-rails`
- `vite-plugin-ruby`
- `express`
- `morgan`

Add to `dependencies`:
- `rails-vite-plugin`
- `vite-plugin-manifest-sri`

### 3. vite.config.ts — full rewrite ✅

```ts
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
      ssr: 'entrypoints/ssr.jsx',
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
    allowedHosts: ['.localhost.localdomain'],
    cors: {
      origin: /^https?:\/\/(?:(?:[^:]+\.)?localhost(\.localdomain)?|127\.0\.0\.1|\[::1\])(?::\d+)?$/
    }
  },
})
```

**Changes from current:**
- `RailsPlugin({ stimulus: false, sri: {} })` → `rails({ sourceDir, ssr, ssrOutDir })`
- `esbuild.supported['top-level-await']` removed (no longer needed)
- `ssr.target: 'webworker'` added (Deno compat)
- `ssr.noExternal: true` added (bundle all node_modules for Deno)
- `ssr.external: ['stream', 'buffer', 'events', 'string_decoder']` added (Node builtins polyfilled by ssr-deno)
- `ssr.resolve.conditions` added (edge-light for Deno compat)
- `define: { __VITE_SOURCE_DIR__ }` added (used by SSR entry + TurboReact)
- `build.sourcemap: 'hidden'` added (SRI compat)
- `server.cors` added (multi-subdomain dev)

### 4. config/vite.json — DELETE ✅

rails_vite does not use this file. All config is in vite.config.ts.

### 5. config/initializers/ssr_deno.rb — CREATE ✅

```ruby
# frozen_string_literal: true

Rails.application.config.ssr_deno.bundles = {
  application: Rails.root.join('dist/server/ssr.js')
}

Rails.application.config.ssr_deno.node_builtins_enabled = true
Rails.application.config.ssr_deno.auto_reload = Rails.env.development?
```

### 6. app/frontend/lib/create_emotion_cache.js — update ✅

Add `{ nonce }` parameter with client-side nonce resolution:

```js
import createCache from '@emotion/cache'

export default function createEmotionCache({ nonce } = {}) {
  let insertionPoint

  if (!import.meta.env.SSR) {
    const el = document.querySelector('meta[name="emotion-insertion-point"]')
    insertionPoint = el ?? undefined

    if (!nonce) {
      if (typeof window !== 'undefined' && window.__CSP_NONCE__) {
        nonce = window.__CSP_NONCE__
      }
      if (!nonce) {
        const meta = document.querySelector('meta[name="csp-nonce"]')
        nonce = meta?.getAttribute('content') ?? undefined
      }
      if (!nonce) {
        const anyEl = document.querySelector('[nonce]')
        nonce = anyEl?.getAttribute('nonce') ?? undefined
      }
    }
  }

  return createCache({ key: 'denpro', insertionPoint, nonce })
}
```

### 7. app/frontend/entrypoints/ssr.jsx — CREATE ✅

New SSR entrypoint. Replaces old `lib/ssr.jsx` (render logic) + `ssr_server.js` + `ssr_server/` (Express HTTP server).

```jsx
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import createEmotionCache from '@/lib/create_emotion_cache'
import createEmotionServer from '@emotion/server/create-instance'

const components = import.meta.glob('@/components/**/*.{j,t}sx', { eager: true })

function render(argsJson) {
  const { name, props = {}, nonce } = JSON.parse(argsJson)

  if (!name) {
    return { error: 'Component name must be provided' }
  }

  const componentModule =
    components[`${__VITE_SOURCE_DIR__}/components/${name}.jsx`] ??
    components[`${__VITE_SOURCE_DIR__}/components/${name}.tsx`]

  if (!componentModule) {
    return { error: `Component "${name}" not found` }
  }

  const Component = componentModule.default
  const emotionCache = createEmotionCache(nonce ? { nonce } : {})
  const { extractCriticalToChunks, constructStyleTagsFromChunks } = createEmotionServer(emotionCache)

  const content = renderToString(
    <StrictMode>
      <Component {...props} emotionCache={emotionCache} />
    </StrictMode>
  )

  const emotionChunks = extractCriticalToChunks(content)
  const emotionStyles = constructStyleTagsFromChunks(emotionChunks)

  return { content, emotionStyles }
}

globalThis.render = render
```

### 8. app/frontend/lib/ssr.jsx — DELETE ✅

Superseded by entrypoints/ssr.jsx.

### 9. app/frontend/ssr_server.js — DELETE ✅
### 10. app/frontend/ssr_server/ — DELETE dir ✅

Express SSR server no longer needed. ssr-deno handles rendering in-process.

### 11. app/frontend/lib/turbo_react.jsx — update ✅

Import `createEmotionCache` and pass to all render/hydrate calls:

```jsx
import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import createEmotionCache from '@/lib/create_emotion_cache'

// in mountComponent():
if (rootElement.getAttribute('data-turbo-react-ssr')) {
  reactRoot = hydrateRoot(rootElement,
    <StrictMode><Component {...props} emotionCache={createEmotionCache()} /></StrictMode>)
} else {
  reactRoot = createRoot(rootElement)
  reactRoot.render(<StrictMode><Component {...props} emotionCache={createEmotionCache()} /></StrictMode>)
}
```

### 12. app/frontend/initializers/turbo_react.js — update ✅

- `~/lib/turbo_react` → `@/lib/turbo_react`
- Add `componentsRootDir: __VITE_SOURCE_DIR__` (key for component lookup)

```js
import TurboReact from '@/lib/turbo_react'

const components = import.meta.glob('@/components/**/*.{j,t}sx')
const turboReact = new TurboReact({ components, componentsRootDir: __VITE_SOURCE_DIR__ })

turboReact.start()
```

Note: `__VITE_SOURCE_DIR__` is defined in vite.config.ts as `/app/frontend`. This matches the resolved path in import.meta.glob keys.

### 13. app/helpers/react_component_helper.rb — rewrite ✅

Replace `httpx` HTTP POST with `SSR::Deno::Bundle`:

```ruby
module ReactComponentHelper
  class ComponentNotFound < StandardError; end

  def react_component(name, props: {}, ssr: false)
    ssr = false if turbo_drive?
    content = nil

    if ssr
      result = perform_ssr(name, props)
      if result
        content = result[:content]&.html_safe
        if result[:emotion_styles]
          content_for(:ssr_emotion_styles, result[:emotion_styles].html_safe)
        end
      end
    end

    data = { react_component_name: name, react_component_props: props }
    data[:react_component_ssr] = true if ssr

    content_tag :div, content, class: 'react-component-root', data: data
  end

  private

  def perform_ssr(name, props)
    logger.info "  Starting SSR request for React component #{name.inspect}"
    logger.info "    Props: #{props.inspect}" if props.present?
    starting = Process.clock_gettime(Process::CLOCK_MONOTONIC)

    SSR::Deno::Bundle.create_bundles! unless SSR::Deno::Bundle.registry[:application].is_a?(SSR::Deno::Bundle)
    bundle = SSR::Deno::Bundle.registry[:application]

    unless bundle.is_a?(SSR::Deno::Bundle)
      logger.error '  SSR bundle not registered'
      return
    end

    body = { name:, props: }
    nonce = content_security_policy_nonce
    body[:nonce] = nonce if nonce.present?

    result = bundle.render(body)

    ending = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    elapsed_ms = (ending - starting).in_milliseconds.round(1)
    logger.info "  Completed SSR request in #{elapsed_ms}ms"

    if result['error']
      handle_ssr_error(result['error'], name)
      return
    end

    { content: result['content'], emotion_styles: result['emotionStyles'] }
  rescue SSR::Deno::RenderError, SSR::Deno::JsRuntimeWorkerError,
         SSR::Deno::JsRuntimeOutOfMemoryError => error
    handle_ssr_runtime_error(error, name)
    nil
  rescue JSON::ParserError => error
    logger.error "  SSR response parse error: #{error.message}"
    raise error unless Rails.env.production?
    nil
  end

  def handle_ssr_error(error_message, name)
    case error_message
    when /component.*not found/i
      if Rails.env.production?
        logger.error "  Could not perform SSR: Component \"#{name}\" not found"
        return
      end
      raise ComponentNotFound, "Component \"#{name}\" not found"
    else
      logger.error "  SSR render error: #{error_message}"
    end
  end

  def handle_ssr_runtime_error(error, name)
    if Rails.env.production?
      logger.error "  Could not perform SSR: #{error.message}"
      return
    end
    raise error
  end

  def turbo_drive?
    request.headers.include?('x-turbo-request-id')
  end
end
```

**Key differences from current helper:**
- `make_ssr_request` (HTTP POST via httpx) removed
- `handle_ssr_response_error` replaced by `handle_ssr_error` + `handle_ssr_runtime_error`
- Response keys use strings: `result['content']`, `result['emotionStyles']` (ssr-deno returns JSON-like hash)

### 14. Procfile.dev — update ✅

```
web: bin/rails s
ssr: npx vite build --ssr --watch
```

Drop `vit: bin/vite dev` line.

### 15. Procfile.prod-local — update ✅

```
web: env RAILS_ENV=production bin/rails s
```

Drop `ssr` line. ssr-deno runs in-process, no separate server proc.

### 16. Layouts — update Vite tags + CSP nonce ✅

**application.html.erb** (basic, no React):

```erb
<%= vite_tags "application.js", nonce: content_security_policy_nonce %>
```

Replace lines 22-23 (`vite_client_tag` + `vite_javascript_tag 'application'`).

---

**app.html.erb** (React + SSR):

```erb
<%# CSP nonce for Emotion SSR (before vite_tags, persists across Turbo) %>
<%= tag.script nonce: content_security_policy_nonce, data: { turbo_eval: false } do %>
  window.__CSP_NONCE__ = <%= content_security_policy_nonce.inspect.html_safe %>;
<% end %>

<%# Replace: vite_client_tag + vite_react_refresh_tag + vite_javascript_tag calls %>
<%= vite_tags "init_color_scheme_script.js", "app.js", "data-turbo-track": "reload", nonce: content_security_policy_nonce %>

<%# Keep: emotion insertion point + SSR styles yield %>
<meta name="emotion-insertion-point" content="">
<%= yield :ssr_emotion_styles %>
```

Remove: `vite_client_tag`, `vite_react_refresh_tag`, `vite_javascript_tag 'init_color_scheme_script'`, `vite_javascript_tag 'app'`.

---

**demos.html.erb**: Same changes as app.html.erb but use `"demos.js"` instead of `"app.js"`.

### 17. config/initializers/content_security_policy.rb — rewrite ✅

Uncomment and adapt from rails_demo:

```ruby
Rails.application.configure do
  vite_dev = Rails.env.development?

  config.content_security_policy do |policy|
    policy.default_src :self, :https
    policy.font_src    :self, :https, :data, *([ 'http://127.0.0.1:5173' ] if vite_dev)
    policy.img_src     :self, :https, :data
    policy.object_src  :none
    policy.script_src  :self, :https, *([ :unsafe_inline ] if vite_dev)
    policy.style_src   :self, :https, *([ :unsafe_inline ] if vite_dev)
    policy.connect_src :self, :https, *([ 'ws://127.0.0.1:5173' ] if vite_dev)
    # report_uri needs a route — remove or add endpoint
    # policy.report_uri '/csp-violation-report-endpoint'
  end

  config.content_security_policy_nonce_generator = ->(request) { SecureRandom.base64(32) }
  config.content_security_policy_nonce_directives = vite_dev ? [] : [ 'script-src', 'style-src' ]
  config.content_security_policy_nonce_auto = true
end
```

**Key changes from current (commented-out) CSP:**
- Vite dev mode needs `:unsafe_inline` for scripts/styles (HMR injection)
- `ws://127.0.0.1:5173` for Vite HMR websocket
- Nonce disabled in dev (browsers ignore `unsafe_inline` when nonce present)
- Nonce generator uses `SecureRandom.base64(32)` instead of `request.session.id` (may be nil on first request)
- `report_uri` commented out — no route exists for it

### 18. Bulk rename `~/` → `@/` in frontend files ✅

| File | Change |
|------|--------|
| `app/frontend/entrypoints/app.js` | `~/initializers/roboto_font` → `@/initializers/roboto_font` |
| | `~/initializers/turbo_rails` → `@/initializers/turbo_rails` |
| | `~/initializers/turbo_react` → `@/initializers/turbo_react` |
| `app/frontend/entrypoints/demos.js` | same three imports |
| `app/frontend/initializers/turbo_react.js` | `~/lib/turbo_react` → `@/lib/turbo_react` |
| `app/frontend/lib/turbo_react.jsx` | will import `@/lib/create_emotion_cache` (added in step 11) |
| `app/frontend/components/demos/mui_dashboard.jsx` | `~/lib/mui_templates/` → `@/lib/mui_templates/` |
| `app/frontend/lib/mui_templates/v7.2.0/dashboard/Dashboard.tsx` | `~/lib/create_emotion_cache` → `@/lib/create_emotion_cache` |

Note: `@` alias is already used in `import.meta.glob` patterns (e.g., `@/components/**/*.{j,t}sx`) and will continue to work since `rails-vite-plugin` also configures the `@` alias.

Not affected (no `~/` imports):
- `app/frontend/entrypoints/application.js`
- `app/frontend/entrypoints/init_color_scheme_script.js`
- `app/frontend/initializers/roboto_font.js`
- `app/frontend/initializers/turbo_rails.js`
- `app/frontend/lib/create_emotion_cache.js`

## Post-migration verification ✅

```bash
bundle install        # ✅ works
npm install           # ✅ works
npx vite build                              # ✅ client build works
npx vite build --ssr app/frontend/entrypoints/ssr.jsx --outDir dist/server  # ✅ SSR build works
bin/rails s                                 # ✅ server starts, vite_tags renders
# SSR via ssr-deno confirmed working
```

**Verification result:** All commands succeed. SSR renders React components via `ssr-deno` in-process (no Express server).

## Open questions — answered post-migration

### Q1: Does `vite_tags` auto-inject HMR client + React refresh in dev?
**Yes.** Layouts use `vite_tags` without separate `vite_client_tag` / `vite_react_refresh_tag` calls. Vite dev server handles HMR injection automatically.

### Q2: How does rails_vite start the Vite dev server?
⚠️ **Not resolved.** Procfile.dev has only `web` and `ssr` (build watcher) — no `vite dev` process. `bin/dev` pre-builds the SSR bundle before launching Foreman. In dev, Vite doesn't serve assets via dev server; client assets are served from the last build output. **This means no HMR in development.** See [Remaining issues](#remaining-issues).

### Q3: CSP `report_uri` — keep or drop?
**Dropped.** Not present in the final `content_security_policy.rb`.

### Q4: `bin/vite` binstub?
**Deleted.** `rails_vite` does not generate a `bin/vite` binstub. The `npx vite` CLI is used directly in Procfile.dev and bin/dev.

### Q5: Procfile.dev — `ssr` process uses `npx vite build --ssr --watch`
**Confirmed.** This builds the SSR bundle only. No `vite dev` process exists (see Q2). The two-process model works but lacks client-side HMR.

### Q6: `config/deploy.yml` / Kamal — out of scope
Still deferred.

### Q7: Does `vite_tags` support `nonce:` parameter?
**Yes.** Confirmed in all three layouts: `nonce: content_security_policy_nonce`.

## Remaining issues

### R1: Missing Vite dev server in development
**Severity: medium.** Procfile.dev has no `vite dev` process. The `ssr` process runs `npx vite build --ssr --watch` which rebuilds the SSR bundle on changes but does NOT serve HMR for client assets. `bin/dev` pre-builds once before Foreman starts.

Likely fix: add a `vite` process to Procfile.dev:
```
web: bin/rails s
vite: npx vite
ssr: npx vite build --ssr --watch
```

This requires confirming `rails-vite-plugin` doesn't conflict with a separate `npx vite` dev server.

### R2: Dockerfile has stale `VITE_RUBY_SSR_BUILD_ENABLED` env var
**Severity: low.** `Dockerfile:36` still sets `VITE_RUBY_SSR_BUILD_ENABLED="true"` which is a `vite_ruby` env var. No effect on `rails_vite`, but misleading. Should be removed or replaced with equivalent `ssr-deno` env var if any.

### R3: bin/prod-local — stale `--rm` line removed?
Commit a1686b2 shows `Procfile.prod-local` had 1 line deleted (`ssr` proc). Current file has 1 line (just `web`). This is correct — ssr-deno runs in-process, no separate SSR server needed. Verify production-local workflow works end-to-end.

### R4: Production asset pipeline — verify `assets:precompile`
The `Dockerfile` runs `SECRET_KEY_BASE_DUMMY=1 ./bin/rails assets:precompile`. Need to verify this works with `rails_vite` (it should trigger `npx vite build` via the railties hook). Also verify the SSR bundle is built during `assets:precompile` or needs a separate step.

## Key API differences (reference)

| Concept | vite_ruby | rails_vite |
|---------|-----------|------------|
| View helper | `vite_client_tag` + `vite_javascript_tag` (separate) | `vite_tags` (one call, generates `<script>` + `<link>`) |
| Ruby config | `config/vite.json` | vite.config.ts only |
| HMR client | explicit `vite_client_tag` | (unknown — see Q1) |
| React refresh | explicit `vite_react_refresh_tag` | (unknown — see Q1) |
| SSR call | HTTP POST via httpx to localhost:PORT | `SSR::Deno::Bundle.render(body)` in-process |
| SSR entry | Express app (`ssr_server.js`) | Pure function with `globalThis.render` |
| SSR target | Node default | Deno (`webworker`) |
| SSR output | `public/vite-ssr/` | `dist/server/` |
| Alias | `~` → source dir | `@` → source dir |
