#!/usr/bin/env bash
set -euo pipefail
mkdir -p .build/website-round2/evidence/ssr-vendor-source/green
cd packages/vxrn
bun run test src/config/ssrVendorOptimization.test.ts src/config/getOptimizeDeps.test.ts src/utils/scanDepsToOptimize.test.ts > ../../.build/website-round2/evidence/ssr-vendor-source/green/test.log 2>&1
