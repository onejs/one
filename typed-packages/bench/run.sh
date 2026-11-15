#!/usr/bin/env bash
# compiles bench.js with bun compile against the npm packages and against the typed ones, then times them in turn
# BUN must be a Bun with `bun compile` (1.4.5 canary or later). ROUNDS defaults to 20.
set -euo pipefail
cd "$(dirname "$0")"
BUN=${BUN:-bun}
"$BUN" install
rm -rf typed .out && mkdir -p typed .out
cp bench.js package.json typed/ && cp -r node_modules typed/
"$BUN" ../scripts/build.ts --into typed/node_modules
"$BUN" compile --production bench.js --outfile .out/installed
(cd typed && "$BUN" compile --production bench.js --outfile ../.out/typed)
"$BUN" measure.ts "${ROUNDS:-20}" installed=.out/installed typed=.out/typed
