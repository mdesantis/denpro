# Docker infra fixes

Findings from compose.yml + Dockerfile review.

## Status: ✍️ PLAN

## Execution steps

### 1. compose.yml — pgl-data volume path ✅ CORRECT

PG18 changed PGDATA to `/var/lib/postgresql/18/docker`, VOLUME to `/var/lib/postgresql`. Mount at `/var/lib/postgresql` **is correct** for `postgres:18`. No change needed.

For PG17- this would be wrong (needs `/var/lib/postgresql/data`). Pin PG major version if risk of image bump.

### 2. compose.yml — fix pgl healthcheck

`pg_isready --username denpro` → `pg_isready --host localhost --port 15432 --username denpro`. Without host, checks Unix socket, not TCP. Healthcheck passes but app on TCP may find PG not ready.

### 3. compose.yml — add restart: unless-stopped to rls + ssr

Only pgl has restart policy. rls + ssr won't restart on crash.

### 4. compose.yml — drop ssr service

Already marked stale. When ready: remove entire `ssr:` block (lines 55-69). SSR in-process via ssr-deno gem.

### 5. Verify docker-entrypoint-ssr sources nvm

SSR service runs `node public/vite-ssr/ssr.js`. Node on PATH requires `/workdir/bin/docker-entrypoint-ssr` to source `BASH_ENV` or `~/.bashrc` (nvm setup). If missing, `node: command not found`.

Fix: ensure entrypoint has:

```bash
BASH_ENV=/root/.bash_env
. "${BASH_ENV}"
```

Or source nvm directly.

### 6. Dockerfile — VITE_RUBY_SSR_BUILD_ENABLED stale

Line 36: `VITE_RUBY_SSR_BUILD_ENABLED="true"` — `vite_ruby` env var, no effect with `rails_vite`. Drop.

### 7. compose.yml — consider shm_size bump

PG18 default 256mb. Current 128mb fine for light load. Note for scaling.

## Post-migration verification

```bash
docker compose down -v
docker compose up -d
docker compose ps          # all 3 services healthy
docker compose logs pgl    # no PG init errors
docker compose exec rls curl -s http://localhost:18080/up  # 200 OK
```
