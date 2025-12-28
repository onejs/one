#!/bin/bash
# Test script for rolldown mode
# Temporarily adds rolldown resolution, runs tests, then reverts
#
# Usage:
#   ./test-rolldown.sh              # Run dev tests only
#   ./test-rolldown.sh --full       # Run both dev and prod tests
#   ./test-rolldown.sh --prod-only  # Run prod tests only

set -e

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
TESTS_DIR="$(cd "$(dirname "$0")" && pwd)"

FULL_TEST=false
PROD_ONLY=false
for arg in "$@"; do
  case $arg in
    --full)
      FULL_TEST=true
      ;;
    --prod-only)
      PROD_ONLY=true
      ;;
  esac
done

echo "🔄 Temporarily enabling rolldown mode..."

# Add rolldown resolution to root package.json
cd "$ROOT_DIR"

# Backup original files
cp package.json package.json.backup
cp yarn.lock yarn.lock.backup 2>/dev/null || true

# Add vite -> rolldown-vite resolution using node for proper JSON manipulation
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.resolutions = pkg.resolutions || {};
pkg.resolutions['vite'] = 'npm:rolldown-vite@7.3.0';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"

echo "📦 Installing with rolldown-vite..."
yarn install 2>&1

echo "🧪 Running tests with rolldown..."
cd "$TESTS_DIR"

TEST_RESULT=0

if [ "$PROD_ONLY" = false ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Running DEV tests in rolldown mode"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Run dev tests
  ROLLDOWN_MODE=true TEST_ONLY=dev yarn vitest --config ./vitest.config.rolldown.ts --run --reporter=dot --color=false || TEST_RESULT=$?
fi

if [ "$FULL_TEST" = true ] || [ "$PROD_ONLY" = true ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Running PROD tests in rolldown mode"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  ROLLDOWN_MODE=true TEST_ONLY=prod yarn vitest --config ./vitest.config.rolldown.ts --run --reporter=dot --color=false || TEST_RESULT=$?
fi

echo ""
echo "🔄 Reverting package.json..."
cd "$ROOT_DIR"
mv package.json.backup package.json
mv yarn.lock.backup yarn.lock 2>/dev/null || true
yarn install 2>&1 > /dev/null

if [ "$TEST_RESULT" -ne 0 ]; then
  echo "❌ Rolldown tests failed"
  exit $TEST_RESULT
fi

echo "✅ Rolldown tests completed successfully"
