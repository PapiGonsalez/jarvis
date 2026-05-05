# Jarvis dev orchestration
#
#   make dev    → run web (Next, :3000) + api (FastAPI, :8001) together
#   make web    → web only
#   make api    → api only
#
# `make dev` boots both, forwards Ctrl-C to children, exits when either dies.

.PHONY: dev web api

dev:
	@bash -c 'trap "kill 0" EXIT INT TERM; \
	  $(MAKE) -s api & \
	  $(MAKE) -s web & \
	  wait'

web:
	cd apps/web && npm run dev

api:
	JARVIS_CALENDAR_FIXTURE=$${JARVIS_CALENDAR_FIXTURE:-/tmp/jarvis-calendar-active-fixture.json} \
	JARVIS_IDEAS_FIXTURE=$${JARVIS_IDEAS_FIXTURE:-/tmp/jarvis-ideas-active-fixture.json} \
	JARVIS_TOKENS_FIXTURE=$${JARVIS_TOKENS_FIXTURE:-/tmp/jarvis-tokens-active-fixture.json} \
	JARVIS_TASKS_FIXTURE=$${JARVIS_TASKS_FIXTURE:-/tmp/jarvis-tasks-active-fixture.jsonl} \
	  .venv/bin/uvicorn apps.api.main:app --reload --port 8001
