#!/usr/bin/env bash
set -euo pipefail
cd /private/tmp/one-start-round3-s44967/website-round3
node confirm-external-memory.mjs control 0
node confirm-external-memory.mjs candidate 0
node confirm-external-memory.mjs candidate 1
node confirm-external-memory.mjs control 1
node confirm-external-memory.mjs control 2
node confirm-external-memory.mjs candidate 2
