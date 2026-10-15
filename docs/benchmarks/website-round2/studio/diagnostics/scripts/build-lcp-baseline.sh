#!/usr/bin/env bash
set -euo pipefail
cd /Volumes/Studio-Ext/worktrees/one-start-round2-studio
root="$PWD/.build/website-round2"
npm install --prefix "$root/tools" --workspaces=false --no-audit --no-fund > "$root/evidence/lcp-baseline/tool-install.log" 2>&1
for site in one start; do
  (
    cd "$root/$site"
    if [[ "$site" = one ]]; then
      ONE_SERVER_URL=https://onestack.dev node node_modules/one/run.mjs build
    else
      ONE_SERVER_URL=https://onestack.dev node node_modules/vite/bin/vite.js build
    fi
  ) > "$root/evidence/lcp-baseline/$site-build.log" 2>&1 || { tail -70 "$root/evidence/lcp-baseline/$site-build.log"; exit 1; }
  echo "$site production baseline built"
done
