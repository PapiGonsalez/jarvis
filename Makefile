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
	.venv/bin/uvicorn apps.api.main:app --reload --port 8001
