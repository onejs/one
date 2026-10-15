#!/bin/bash
set -euo pipefail
cd /Users/n8/.worktrees/one-start-round2-sol
tm window run heavy --local --wait --timeout 45m -- bash scripts/tmp/one-start-round2/build-matches-production.sh
tm window run quiet --local --timeout 45m --max 10m -- bash scripts/tmp/one-start-round2/confirm-matches.sh
