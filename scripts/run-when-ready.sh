#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "$0")/.."

OUT="audit-results.log"
echo "Waiting for GitHub rate limit reset..." | tee "$OUT"

while true; do
  remaining=$(curl -s https://api.github.com/rate_limit \
    | grep -o '"remaining": [0-9]*' | head -1 | awk '{print $2}')
  if [ -z "$remaining" ]; then
    echo "$(date -u): could not parse rate limit, retrying..." | tee -a "$OUT"
  else
    echo "$(date -u): remaining=$remaining" | tee -a "$OUT"
    if [ "$remaining" -ge 50 ]; then
      break
    fi
  fi
  sleep 60
done

echo "" | tee -a "$OUT"
echo "Rate limit window healthy. Running audit test..." | tee -a "$OUT"
echo "" | tee -a "$OUT"

npx tsx scripts/test-audit.ts 2>&1 | tee -a "$OUT"
echo "" | tee -a "$OUT"
echo "DONE." | tee -a "$OUT"
