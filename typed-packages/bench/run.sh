#!/usr/bin/env bash
# compiles a bench with bun compile against the npm packages and against the typed ones, then times them in turn
# usage: run.sh [bench dir, default this one; fabric for react-native's renderer]
# BUN must be a Bun with `bun compile` (1.4.5 canary or later). ROUNDS defaults to 20.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
cd "$here/${1:-.}"
BUN=${BUN:-bun}
"$BUN" install
[ -f setup.ts ] && "$BUN" setup.ts
rm -rf typed .out && mkdir -p typed .out
cp bench.js package.json typed/ && cp -r node_modules typed/
"$BUN" "$here/../scripts/build.ts" --into typed/node_modules
"$BUN" compile --production bench.js --outfile .out/installed
(cd typed && "$BUN" compile --production bench.js --outfile ../.out/typed)
"$BUN" "$here/measure.ts" "${ROUNDS:-20}" installed=.out/installed typed=.out/typed
