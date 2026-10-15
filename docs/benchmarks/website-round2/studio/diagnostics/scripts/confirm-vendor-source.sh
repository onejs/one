#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")" && pwd)"
target="$root/one/node_modules/vxrn/dist/config"
trap 'cp "$root/evidence/ssr-vendor-source/candidate/"getOptimizeDeps.* "$target/"' EXIT
for run in 0 1 2; do
  if [[ "$run" == 1 ]]; then arms=(candidate control); else arms=(control candidate); fi
  for arm in "${arms[@]}"; do node "$root/confirm-vendor-memory.mjs" "$arm" "$run"; done
done
