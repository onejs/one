#!/usr/bin/env bash
set -euo pipefail
root="$PWD/.build/website-round2"
out="$root/evidence/context-bridge"
SKIP_TYPES=1 bun release --into "$root/one" > "$out/release.log" 2>&1
cp packages/one/src/Root.tsx "$out/Root.tsx"
shasum -a 256 "$root/one/node_modules/one/dist/esm/Root.mjs" > "$out/installed-root.sha256"
ONE_ROUND2_DIAGNOSTIC=1 ONE_ROUND2_CONTEXT_BRIDGE=da7865e5f node "$root/confirm-vendor-memory.mjs" control 2
