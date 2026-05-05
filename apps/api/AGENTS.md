# apps/api — Jarvis FastAPI helper

Single Python service that backs every dashboard tile that needs live data. Wraps the helpers in `tools/` over HTTP for `apps/web` to consume.

## Run

From the repo root, with `.venv` active:

```
.venv/bin/uvicorn apps.api.main:app --reload --port 8001
```

Health check: `curl http://localhost:8001/health` → `{"ok":true}`

## Conventions

- Reuses the **repo-root `.venv`** so `tools/` modules import cleanly.
- Run from **repo root** so package imports (`tools.today`, `apps.api.main`) resolve.
- One `main.py` per concern as the surface grows; helpers move into `apps/api/<area>/` when a single file gets unwieldy.
- Pydantic response models are the source of truth for the contract `apps/web` consumes — keep them tight, no leaking raw JSONL shapes that change.
- CORS allows the dev hosts only (`localhost:3000`, `lp-agw02.tail2877af.ts.net:3000`). Add new origins here when needed; do not use `allow_origins=["*"]`.

## Endpoints (current)

- `GET /health` — liveness
- `GET /tasks/today?include_done=false` — today's tasks grouped by source account
- `POST /tasks/{id}/done` — toggle status open↔done; rewrites JSONL and re-renders the daily .md
