#!/usr/bin/env bash
set -euo pipefail
root=/Volumes/Studio-Ext/worktrees/one-start-round3-sol
cd "$root"
fixtures="$root/.build/website-round3"
mkdir -p "$fixtures/evidence/setup"
export npm_config_cache="$fixtures/npm-cache"
export npm_config_prefer_online=true
for site in one start; do
  (cd "$fixtures/$site" && npm pkg set overrides.oxc-transform-react=0.154.0 --workspaces=false && npm install --save-dev --save-exact --workspaces=false --legacy-peer-deps --no-audit --no-fund oxc-transform-react@0.154.0) > "$fixtures/evidence/setup/$site-compiler-install.log" 2>&1
done
SKIP_TYPES=1 bun release --into "$fixtures/one" > "$fixtures/evidence/setup/release-one.log" 2>&1
bun release --skip-build --into "$fixtures/start" > "$fixtures/evidence/setup/release-start.log" 2>&1
python3 "$fixtures/finalize-setup.py"
