#!/usr/bin/env bash
set -euo pipefail
mkdir -p .build/website-round2/evidence/ssr-vendor-source/red-canonical-root
cd packages/vxrn
bun run test src/config/ssrVendorOptimization.test.ts > ../../.build/website-round2/evidence/ssr-vendor-source/red-canonical-root/test.log 2>&1
