#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "$0")/.."

OUT="audit-results.log"
: > "$OUT"

echo "Audit test runner starting at $(date -u)" | tee -a "$OUT"

# Total max wall time: 90 minutes. Multiple rate-limit windows expected.
DEADLINE=$(( $(date +%s) + 5400 ))

while [ "$(date +%s)" -lt "$DEADLINE" ]; do
  resp=$(curl -s https://api.github.com/rate_limit)
  remaining=$(echo "$resp" | grep -o '"remaining": [0-9]*' | head -1 | awk '{print $2}')
  reset=$(echo "$resp" | grep -o '"reset": [0-9]*' | head -1 | awk '{print $2}')
  now=$(date +%s)

  if [ -z "$remaining" ]; then
    echo "$(date -u): could not parse rate limit, retrying..." | tee -a "$OUT"
    sleep 30
    continue
  fi

  echo "$(date -u): remaining=$remaining reset_in=$((reset-now))s" | tee -a "$OUT"

  if [ "$remaining" -ge 50 ]; then
    echo "" | tee -a "$OUT"
    echo "Window healthy ($remaining remaining). Running audit test..." | tee -a "$OUT"
    echo "" | tee -a "$OUT"
    if npx tsx scripts/test-audit.ts >> "$OUT" 2>&1; then
      echo "" | tee -a "$OUT"
      echo "Test exited successfully. Stopping." | tee -a "$OUT"
      break
    else
      echo "" | tee -a "$OUT"
      echo "Test exited non-zero (likely partial cache). Will retry next window." | tee -a "$OUT"
    fi
  fi

  # Sleep until reset (capped) so we wake up at start of next window
  wait_secs=$((reset - now + 5))
  if [ "$wait_secs" -lt 30 ]; then wait_secs=30; fi
  if [ "$wait_secs" -gt 1900 ]; then wait_secs=1900; fi
  echo "Sleeping ${wait_secs}s..." | tee -a "$OUT"
  sleep "$wait_secs"
done

echo "" | tee -a "$OUT"
echo "Final attempt..." | tee -a "$OUT"
npx tsx scripts/test-audit.ts >> "$OUT" 2>&1 || true

echo "" | tee -a "$OUT"
echo "DONE at $(date -u)" | tee -a "$OUT"
