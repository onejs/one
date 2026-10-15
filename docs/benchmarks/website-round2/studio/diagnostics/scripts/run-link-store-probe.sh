#!/usr/bin/env bash
set -euo pipefail
cd /Volumes/Studio-Ext/worktrees/one-start-round2-studio/packages/one
tm window run heavy --local --narrow --wait --timeout 30m -- bun run vitest --run src/link/navigation-store-probe.test.tsx 2>&1 | tee ../../.build/website-round2/evidence/link-store-probe/result.log
