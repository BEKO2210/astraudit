# Astraudit — Makefile
#
# Wraps the npm scripts so contributors who reach for `make` first
# (a sizeable cohort, especially anyone coming from C / Rust / Go)
# get a familiar entry point. Every target is a thin wrapper —
# package.json remains the source of truth.
#
# Usage examples:
#   make           # show this help
#   make dev       # vite dev server
#   make build     # production build → dist/
#   make test      # vitest run
#   make audit     # run Astraudit's own engine against this repo

NPM ?= npm
NPX ?= npx

.PHONY: help install dev build preview typecheck test test-watch \
        test-visual test-visual-update lint audit clean sample \
        screenshots og-card

help: ## Show this help (default target)
	@awk 'BEGIN {FS = ":.*?## "; printf "\nUsage:\n  make \033[36m<target>\033[0m\n\nTargets:\n"} \
		/^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install npm dependencies
	$(NPM) install

dev: ## Run the Vite dev server (http://localhost:5173/astraudit/)
	$(NPM) run dev

build: ## Production build → dist/
	$(NPM) run build

preview: build ## Build then serve the production bundle on :4173
	$(NPM) run preview -- --host 127.0.0.1 --port 4173 --strictPort

typecheck: ## Strict TypeScript build (no emit)
	$(NPM) run typecheck

lint: typecheck ## Alias for typecheck — Astraudit uses tsc as its lint
	@echo "Linting via tsc -b --noEmit. ESLint is intentionally not on the dep list."

test: ## Run the vitest suite once
	$(NPM) test

test-watch: ## Vitest in watch mode
	$(NPM) run test:watch

test-visual: ## Playwright visual + a11y snapshots
	$(NPM) run test:visual

test-visual-update: ## Re-baseline the Playwright snapshots
	$(NPM) run test:visual:update

audit: ## Run Astraudit's own engine against this repo
	$(NPX) tsx scripts/audit-self.ts

sample: ## Regenerate the example .md / .json / .adoc exports
	$(NPX) tsx scripts/sample-exports.ts

screenshots: build ## Re-render the README's Playwright screenshots
	$(NPX) tsx scripts/capture-readme-shots.ts

og-card: ## Re-render the social-media OG card from the HTML template
	$(NPX) tsx scripts/generate-og-card.ts

clean: ## Remove build artefacts + caches
	rm -rf dist .audit-cache playwright-report test-results

# Default goal — `make` with no args shows help.
.DEFAULT_GOAL := help
