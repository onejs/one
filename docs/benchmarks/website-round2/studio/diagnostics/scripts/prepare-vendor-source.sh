#!/usr/bin/env bash
set -euo pipefail
root="$PWD/.build/website-round2"
out="$root/evidence/ssr-vendor-source"
source_file=packages/vxrn/src/config/getOptimizeDeps.ts
mkdir -p "$out/control" "$out/candidate"
cp "$source_file" "$out/candidate/source.ts"
trap 'cp "$out/candidate/source.ts" "$source_file"' EXIT
# keep all runtime source identical to the baseline except this single file.
git show 13e6ab192ae5256bb4bcf35f3c01fb1e625b7967:"$source_file" > "$source_file"
cp "$source_file" "$out/control/source.ts"
SKIP_TYPES=1 bun release --into "$root/one" > "$out/control/release.log" 2>&1
node "$root/snapshot-vendor-family.mjs" control
cp "$out/candidate/source.ts" "$source_file"
SKIP_TYPES=1 bun release --into "$root/one" > "$out/candidate/release.log" 2>&1
node "$root/snapshot-vendor-family.mjs" candidate
python3 "$root/install-common-compiler.py"
