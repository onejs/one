#!/usr/bin/env bash
set -euo pipefail
root="$PWD/.build/website-round2"
mkdir -p "$root/evidence/ssr-vendor-production"
(cd "$root/one" && ONE_SERVER_URL=https://onestack.dev node node_modules/one/run.mjs build) > "$root/evidence/ssr-vendor-production/build.log" 2>&1
node "$root/verify-vendor-production.mjs"
