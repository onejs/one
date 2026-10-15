#!/usr/bin/env bash
set -euo pipefail
root="$PWD/.build/website-round2"
mkdir -p "$root/evidence/context-bridge/production"
(cd "$root/one" && ONE_SERVER_URL=https://onestack.dev node node_modules/one/run.mjs build) > "$root/evidence/context-bridge/production/build.log" 2>&1
node "$root/verify-context-production.mjs"
