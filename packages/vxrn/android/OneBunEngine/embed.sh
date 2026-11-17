#!/bin/bash
set -euo pipefail
: "${ONE_BUN_ENGINE_DIR:?set ONE_BUN_ENGINE_DIR to the Android engine release}"
BUNDLE=$(cd "$(dirname "$1")" && pwd)/$(basename "$1")
OUTPUT=$(cd "$(dirname "$2")" && pwd)/$(basename "$2")
WORK=$(dirname "$OUTPUT")/compile
mkdir -p "$WORK"
cp "$BUNDLE" "$WORK/index.android.bundle"
cd "$WORK"
BUN_AOT_REPLACE_WRITTEN=1 "$ONE_BUN_ENGINE_DIR/android/compile" compile ./index.android.bundle --loader .bundle:js \
  --compile-executable-path="$ONE_BUN_ENGINE_DIR/android/arm64-v8a/libbun.so" \
  --outfile="$OUTPUT"
printf '/*bun-compiled-entry*/' > "$BUNDLE"
