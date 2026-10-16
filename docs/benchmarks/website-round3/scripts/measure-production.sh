#!/usr/bin/env bash
set -euo pipefail
cd /private/tmp/one-start-round3-s44967/website-round3
node benchmark-site.mjs --one one --start start --phase prod --runs 3 --output evidence/quiet-production
node lighthouse-baseline.mjs
