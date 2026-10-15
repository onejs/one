#!/bin/bash
set -euo pipefail
cd /Users/n8/.worktrees/one-start-round2-sol
root=scripts/tmp/one-start-round2
for arm in control candidate; do
  cp "$root/evidence/nav-control/router.mjs" "$root/one/node_modules/one/dist/esm/router/router.mjs"
  for file in useMatches useLoader; do cp "$root/evidence/matches-$arm/$file.mjs" "$root/one/node_modules/one/dist/esm/$file.mjs"; done
  cd "$root/one"
  /Users/n8/.local/share/mise/installs/node/24.3.0/bin/node node_modules/one/run.mjs build > "../evidence/matches-prod-$arm.log" 2>&1
  cd /Users/n8/.worktrees/one-start-round2-sol
  test ! -e "$root/evidence/matches-prod-$arm"
  mv "$root/one/dist" "$root/evidence/matches-prod-$arm"
  for env in client ssr; do cp "$root/one/evidence/bundle-$env.json" "$root/evidence/matches-$arm/bundle-$env.json"; done
done
python3 - <<'PY'
import json
from pathlib import Path
root=Path('scripts/tmp/one-start-round2/evidence')
for arm in ['control','candidate']:
 for env in ['client','ssr']:
  p=root/f'matches-{arm}'/f'bundle-{env}.json';d=json.loads(p.read_text());n=sum(x['renderedLength']for x in d['nativeModules']);assert n==0,(arm,env,n);print(arm,env,'RN/RNW emitted bytes',n)
PY
