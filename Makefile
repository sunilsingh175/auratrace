.PHONY: help up down build logs clean test

help:
	@echo "make up | down | build | logs | clean | test"

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build --no-cache

logs:
	docker compose logs -f

clean:
	docker compose down -v
	docker system prune -f

test:
	python scripts/test_auto_merge.py
