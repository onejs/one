#!/bin/bash
set -euo pipefail
cd /Users/n8/.worktrees/one-start-round2-sol
for file in workerPool.mjs buildPageWorker.mjs; do
  cp "scripts/tmp/one-start-round2/evidence/candidate/$file" "scripts/tmp/one-start-round2/one/node_modules/one/dist/esm/cli/$file"
done
/Users/n8/.local/share/mise/installs/node/24.3.0/bin/node scripts/tmp/one-start-round2/run-profile.mjs > scripts/tmp/one-start-round2/evidence/candidate-profile.log 2>&1
for phase in dev prod; do
  /Users/n8/.local/share/mise/installs/node/24.3.0/bin/node scripts/tmp/one-start-round2/benchmark-site.mjs --one scripts/tmp/one-start-round2/one --start scripts/tmp/one-start-round2/start --phase "$phase" --runs 3 --output scripts/tmp/one-start-round2/evidence/build-browser
 done
