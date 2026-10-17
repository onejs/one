#!/bin/bash
set -euo pipefail
cd /Users/n8/.worktrees/one-start-round2-sol
root=scripts/tmp/one-start-round2
mkdir -p "$root/evidence/matches-control" "$root/evidence/matches-candidate"
for file in useMatches useLoader; do cp "$root/one/node_modules/one/dist/esm/$file.mjs" "$root/evidence/matches-control/$file.mjs"; done
if bun run --cwd packages/one test src/useMatches.transition.test.tsx > "$root/evidence/matches-red.log" 2>&1; then cat "$root/evidence/matches-red.log"; exit 90; fi
cat "$root/evidence/matches-red.log"
cp "$root/matches-candidate.ts" packages/one/src/useMatches.ts
cp "$root/loader-candidate.ts" packages/one/src/useLoader.ts
bun run --cwd packages/one test src/useMatches.transition.test.tsx src/useMatches.test.ts src/router/conditionalSlotPathname.test.tsx src/router/linkToColdRoute.test.ts src/router/linkToOrphaned.test.ts > "$root/evidence/matches-green.log" 2>&1
cat "$root/evidence/matches-green.log"
SKIP_TYPES=1 bun run --cwd packages/one build > "$root/evidence/matches-build.log" 2>&1
for file in useMatches useLoader; do cp "packages/one/dist/esm/$file.mjs" "$root/evidence/matches-candidate/$file.mjs"; done

git diff --check
git add packages/one/src/useMatches.ts packages/one/src/useLoader.ts
git commit -m 'wip: keep loader matches in the navigation transition' -m 'Validation: suspended-navigation regression failed before and passed after; focused matches and routing tests pass. Timing pending.' -- packages/one/src/useMatches.ts packages/one/src/useLoader.ts
git push origin HEAD
for arm in control candidate; do RENDER_ARM="$arm" /Users/n8/.local/share/mise/installs/node/24.3.0/bin/node "$root/profile-renders.mjs"; done
