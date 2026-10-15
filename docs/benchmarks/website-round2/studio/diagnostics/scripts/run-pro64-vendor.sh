#!/usr/bin/env bash
set -euo pipefail
local_root="$PWD/.build/website-round2"
remote_root=/Users/n8/one/.build/website-round2-s42774
ssh -o BatchMode=yes -o ConnectTimeout=5 pro-64.local "mkdir -p '$remote_root/fixtures/one' '$remote_root/fixtures/evidence/ssr-vendor-source'"
rsync -a --exclude '/dist/' --exclude '/node_modules/.vite/' "$local_root/one/" "pro-64.local:$remote_root/fixtures/one/"
rsync -a "$local_root/evidence/ssr-vendor-source/control" "$local_root/evidence/ssr-vendor-source/candidate" "pro-64.local:$remote_root/fixtures/evidence/ssr-vendor-source/"
rsync -a "$local_root/confirm-vendor-memory.mjs" "$local_root/confirm-vendor-source.sh" "pro-64.local:$remote_root/fixtures/"
rsync -a tsconfig.base.json "pro-64.local:$remote_root/tsconfig.base.json"
# only this owned fixture layout gains a link; the remote primary stays untouched.
tm exec pro-64 --timeout 20m -- bash -c 'set -euo pipefail
root=/Users/n8/one/.build/website-round2-s42774
if [[ ! -e "$root/packages" ]]; then ln -s /Users/n8/one/packages "$root/packages"; fi
cd "$root/fixtures"
tm window run quiet --local --timeout 10m --max 10m -- bash confirm-vendor-source.sh
' > "$local_root/evidence/ssr-vendor-source/pro64-confirmation-run.log" 2>&1
