#!/usr/bin/env bash
set -euo pipefail
cd /Volumes/Studio-Ext/worktrees/one-start-round2-studio
root="$PWD/.build/website-round2"
evidence="$root/evidence/dev-memory-startup-phases"
target="$root/one/node_modules/vxrn/dist/exports/dev.mjs"
trap 'cp "$evidence/dev-control.mjs" "$target"' EXIT
cp "$evidence/dev-instrumented.mjs" "$target"
ONE_MEMORY_PHASE_DIR="$evidence" node "$root/profile-dev-startup.mjs"
