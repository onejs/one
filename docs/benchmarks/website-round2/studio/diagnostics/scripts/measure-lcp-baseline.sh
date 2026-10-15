#!/usr/bin/env bash
set -euo pipefail
cd /Volumes/Studio-Ext/worktrees/one-start-round2-studio
root="$PWD/.build/website-round2"
node "$root/benchmark-site.mjs" --one "$root/one" --start "$root/start" --phase prod --runs 3 --output "$root/evidence/lcp-baseline/pages"
node "$root/lighthouse-baseline.mjs"
