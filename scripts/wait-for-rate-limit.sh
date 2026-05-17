#!/usr/bin/env bash
# Wait for the GitHub Actions installation token to recover enough
# rate-limit budget before continuing. Used by deploy.yml + codeql.yml
# to ride out the short rate-limit storms that follow a PR-burst
# (8 PRs in 20 min was enough to exhaust the installation budget
# on 2026-05-17 — see PRs #105/#106 for the matching honesty fix).
#
# Behaviour:
#   - Polls api.github.com/rate_limit up to MAX_ATTEMPTS times.
#   - Each attempt sleeps SLEEP_SECONDS before re-checking.
#   - Returns 0 (success) as soon as core.remaining >= THRESHOLD.
#   - On exhaustion, prints a workflow warning and returns 0 anyway
#     so the calling step still runs — letting GitHub itself decide
#     whether to honour the request. A failing deploy retries on the
#     next push to main, so blocking here just delays the inevitable.
#
# Inputs (env):
#   GH_TOKEN        required — the workflow GITHUB_TOKEN
#   THRESHOLD       optional — minimum core.remaining to proceed (default 50)
#   MAX_ATTEMPTS    optional — max poll attempts (default 5)
#   SLEEP_SECONDS   optional — seconds between attempts (default 30)
set -euo pipefail

: "${GH_TOKEN:?GH_TOKEN must be set (pass secrets.GITHUB_TOKEN)}"
THRESHOLD="${THRESHOLD:-50}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-5}"
SLEEP_SECONDS="${SLEEP_SECONDS:-30}"

probe() {
  # `|| echo 0` covers a curl failure (DNS blip, transient 5xx, or
  # an invalid token returning 401) so the script doesn't propagate
  # `set -e` on a flaky probe. Python stderr is silenced so a bad
  # JSON payload doesn't dump a stacktrace into the workflow log.
  {
    curl -sf \
      -H "Authorization: Bearer $GH_TOKEN" \
      -H "Accept: application/vnd.github+json" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      https://api.github.com/rate_limit \
      | python3 -c "import sys, json; d=json.load(sys.stdin); print(d['resources']['core']['remaining'])" \
      2>/dev/null
  } || echo 0
}

attempt=1
while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
  remaining="$(probe)"
  # Coerce non-numeric / empty to 0 so the comparison can't crash.
  case "$remaining" in
    ''|*[!0-9]*) remaining=0 ;;
  esac

  if [ "$remaining" -ge "$THRESHOLD" ]; then
    echo "rate-limit OK ($remaining remaining, threshold $THRESHOLD) — proceeding."
    exit 0
  fi

  echo "rate-limit low ($remaining remaining, need $THRESHOLD) — attempt $attempt/$MAX_ATTEMPTS, sleeping ${SLEEP_SECONDS}s."
  sleep "$SLEEP_SECONDS"
  attempt=$((attempt + 1))
done

# Bounded wait exhausted. Don't fail the workflow — let GitHub
# respond authoritatively. A failed deploy will retry on the next
# push to main anyway, and surfacing a clear ::warning:: is more
# useful than a synthetic ::error::.
echo "::warning::Rate-limit still low after $((MAX_ATTEMPTS * SLEEP_SECONDS))s; proceeding anyway. If this step fails downstream, the next push to main will retry."
exit 0
