#!/bin/bash
# run the test suite with rolldown-vite swapped in for vite
#
# usage:
#   ./scripts/test-rolldown.sh              # run dev + dev-non-cli tests
#   ./scripts/test-rolldown.sh test:dev     # run specific script
#   ./scripts/test-rolldown.sh test:prod    # run prod tests (builds first)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ORIGINAL_VITE=$(node -e "console.log(require('./package.json').resolutions.vite)")

cleanup() {
  echo ""
  echo "==> restoring vite resolution to $ORIGINAL_VITE"
  cd "$ROOT"
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    pkg.resolutions = pkg.resolutions || {};
    pkg.resolutions.vite = process.argv[1];
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  " "$ORIGINAL_VITE"
  bun install 2>&1 | tail -3
  echo "==> restored"
}

trap cleanup EXIT

echo "==> swapping vite → rolldown-vite"
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  pkg.resolutions.vite = 'npm:rolldown-vite@^7';
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"
bun install 2>&1 | tail -3

INSTALLED=$(node -e "console.log(require('vite/package.json').name + '@' + require('vite/package.json').version)")
echo "==> using: $INSTALLED"
echo ""

export ROLLDOWN_MODE=true

cd "$ROOT/tests/test"

if [ $# -gt 0 ]; then
  bun run "$@"
else
  bun run test:dev
  bun run test:dev-non-cli
fi
