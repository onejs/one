#!/bin/bash
set -euo pipefail
cd /Users/n8/.worktrees/one-start-round2-sol
root=scripts/tmp/one-start-round2
bun run --cwd packages/one test src/useMatches.transition.test.tsx src/useMatches.test.ts src/router/conditionalSlotPathname.test.tsx src/router/linkToColdRoute.test.ts src/router/linkToOrphaned.test.ts > "$root/evidence/matches-repaired-green.log" 2>&1
cat "$root/evidence/matches-repaired-green.log"
SKIP_TYPES=1 bun run --cwd packages/one build > "$root/evidence/matches-repaired-build.log" 2>&1
for file in useMatches useLoader; do cp "packages/one/dist/esm/$file.mjs" "$root/evidence/matches-candidate/$file.mjs"; done
git diff --check
git add packages/one/src/useLoader.ts packages/one/src/useMatches.transition.test.tsx
git commit -m 'fix: subscribe loader data through the transition-aware matches hook' -m 'Validation: focused matches, loader and routing regressions pass. Runtime probe regenerates dependency cache per arm; timing remains pending.' -- packages/one/src/useLoader.ts packages/one/src/useMatches.transition.test.tsx
git push origin HEAD
for arm in control candidate; do RENDER_ARM="$arm" /Users/n8/.local/share/mise/installs/node/24.3.0/bin/node "$root/profile-renders.mjs"; done
