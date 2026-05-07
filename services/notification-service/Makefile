.PHONY: setup run test test-unit test-integration lint clean help

help:
	@echo "Notification Service — Available Commands"
	@echo ""
	@echo "  make setup          Run full setup (DB create, schema, seed, start server)"
	@echo "  make run            Start dev server (requires DB already set up)"
	@echo "  make test           Run all tests (unit + integration)"
	@echo "  make test-unit      Run unit tests only"
	@echo "  make test-int       Run integration tests only"
	@echo "  make lint           Check code style (ruff)"
	@echo "  make clean          Remove .pyc files and test DB"

setup:
	@bash scripts/setup.sh

run:
	@uvicorn app.main:app --host 0.0.0.0 --port 3001 --reload --log-level info

test:
	@python3 -m pytest tests/ -v --tb=short

test-unit:
	@python3 -m pytest tests/unit/ -v --tb=short

test-int:
	@python3 -m pytest tests/integration/ -v --tb=short

lint:
	@ruff check app/ tests/ || true

clean:
	@find . -name "*.pyc" -delete
	@find . -name "__pycache__" -delete
	@rm -f /tmp/notif_test.db
	@echo "Cleaned"
