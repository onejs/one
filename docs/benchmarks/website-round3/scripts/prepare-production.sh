#!/usr/bin/env bash
set -euo pipefail
root=/Volumes/Studio-Ext/worktrees/one-start-round3-sol
cd /private/tmp/one-start-round3-s44967/website-round3
fixtures="$root/.build/website-round3"
npm install --prefix "$fixtures/tools" --cache "$fixtures/npm-cache" --save-exact --no-audit --no-fund lighthouse@13.5.0 > "$fixtures/evidence/setup/lighthouse-install.log" 2>&1
(cd "$fixtures/one" && NODE_ENV=production node node_modules/one/run.mjs build) > "$fixtures/evidence/one-production-build.log" 2>&1
(cd "$fixtures/start" && NODE_ENV=production node node_modules/vite/bin/vite.js build) > "$fixtures/evidence/start-production-build.log" 2>&1
