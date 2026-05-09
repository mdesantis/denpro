# Docker infra fixes

Findings from compose.yml + Dockerfile review.

## Status: ◐ IN PROGRESS

Steps completed: 1 (audit), 4 (ssr removal).  
Remaining: 2, 3, 6, 7.

## Execution steps

### 1. compose.yml — pgl-data volume path ✅ CORRECT

PG18 changed PGDATA to `/var/lib/postgresql/18/docker`, VOLUME to `/var/lib/postgresql`. Mount at `/var/lib/postgresql` **is correct** for `postgres:18`. No change needed.

For PG17- this would be wrong (needs `/var/lib/postgresql/data`). Pin PG major version if risk of image bump.

### 2. compose.yml — fix pgl healthcheck

`pg_isready --username denpro` → `pg_isready --host localhost --port 15432 --username denpro`. Without host, checks Unix socket, not TCP. Healthcheck passes but app on TCP may find PG not ready.

### 3. compose.yml — add restart: unless-stopped to rls

Only pgl has restart policy. rls won't restart on crash (ssr service removed).

### 4. compose.yml — drop ssr service ✅ DONE

SSR block removed. Stale `DENPRO_SSR_HOST` + `DENPRO_SSR_PORT` env vars cleaned from rls service.

### 5. Verify docker-entrypoint-ssr sources nvm ❌ MOOT

ssr service removed — no standalone Node SSR process. nvm/Node PATH irrelevant.

### 6. Dockerfile — VITE_RUBY_SSR_BUILD_ENABLED stale

Line 36: `VITE_RUBY_SSR_BUILD_ENABLED="true"` — `vite_ruby` env var, no effect with `rails_vite`. Drop.

### 7. compose.yml — consider shm_size bump ⚠️ NOTE

PG18 default 256mb. Current 128mb fine for light load. Note for scaling.

## Post-migration verification

```bash
docker compose down -v
docker compose up -d
docker compose ps          # all services healthy
docker compose logs pgl    # no PG init errors
docker compose exec rls curl -s http://localhost:18080/up  # 200 OK
```
