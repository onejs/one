#!/bin/bash
set -euo pipefail
cd /Users/n8/.worktrees/one-start-round2-sol
root=/Users/n8/.worktrees/one-start-round2-sol/scripts/tmp/one-start-round2
node=/Users/n8/.local/share/mise/installs/node/24.3.0/bin/node
for phase in dev prod; do
 "$node" "$root/benchmark-matches.mjs" --one "$root/one" --start "$root/start" --phase "$phase" --runs 3 --output "$root/evidence/matches-validation"
done
