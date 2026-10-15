#!/usr/bin/env bash
set -euo pipefail
mkdir -p .build/website-round2/evidence/context-bridge/red
cd packages/one
bun run test src/Root.serverContext.test.tsx > ../../.build/website-round2/evidence/context-bridge/red/test.log 2>&1
