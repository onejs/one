# Transition-aware loader matches candidate

Candidate source 2ec0b420e on tm/one-matches-round2, based on 6427933bb. The measured router, matches and loader source files have no changes between that base and the prior 342a602b0 profile base. Candidate changes only useMatches/useLoader and its regression test.

RAN: original suspended-navigation regression committed the new loader match with the old route while the target page was still suspended. Candidate keeps both old values until the destination resolves, then both new values. Expanded cases exercise both useMatches and useLoader, refetch and remount. All 32 focused tests pass.

RAN corrected fresh-cache diagnostic: first routing and both repeat routes no longer commit the old document before the new one. Profile elapsed times remain mixed and are excluded from performance acceptance. Three alternating quiet pairs remain required, with page and document/theme HMR checks.

Earlier candidate abbb57683 had an erroneous generated loader adapter; it was corrected at 2ec0b420e. Initial per-arm render profiles reused a dependency cache and were excluded. Preserved per-arm profiles here are the replacement runs after cache regeneration. Both baseline and candidate diagnostic server logs include inherited invalid-hook warnings; browser navigation has no page exceptions. These diagnostics do not establish a new serving or SSR regression.
