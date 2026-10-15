#!/bin/bash
set -euo pipefail
cd /Users/n8/.worktrees/one-start-round2-sol
mkdir -p scripts/tmp/one-start-round2/evidence/nav-control scripts/tmp/one-start-round2/evidence/nav-candidate
cp packages/one/dist/esm/router/router.mjs scripts/tmp/one-start-round2/evidence/nav-control/router.mjs
if bun run --cwd packages/one test src/router/linkToPagePreload.test.ts > scripts/tmp/one-start-round2/evidence/nav-red.log 2>&1; then
  cat scripts/tmp/one-start-round2/evidence/nav-red.log
  exit 90
fi
cat scripts/tmp/one-start-round2/evidence/nav-red.log
git apply scripts/tmp/one-start-round2/navigation.patch
bun run --cwd packages/one test src/router/linkToPagePreload.test.ts src/router/linkToColdRoute.test.ts src/router/linkToOrphaned.test.ts src/router/useViteRoutes.test.ts > scripts/tmp/one-start-round2/evidence/nav-green.log 2>&1
cat scripts/tmp/one-start-round2/evidence/nav-green.log
SKIP_TYPES=1 bun run --cwd packages/one build > scripts/tmp/one-start-round2/evidence/nav-candidate-build.log 2>&1
cp packages/one/dist/esm/router/router.mjs scripts/tmp/one-start-round2/evidence/nav-candidate/router.mjs
