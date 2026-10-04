# Background computation handoff

Rank5 completed by s8381 / one-native-background; assigned reviewer m19584
passed original implementation, shared compiler and final Contrast8f3896a221.
Nate directly approved both API and preview/compiler shares. One main untouched.

Landed One v2-beta: API/docs4395848b3; output-retention fix75982e8ee;
shared vxrn compiler c2a262012 plus proof6b5302bdc. Current docs/receipts are on
merge/background-computation-docs and merged to beta. API is one/background:
defineBackgroundComputation, useBackgroundComputation, createLatestComputation.
Vite and Contrast invoke one compiler core; app owns no executor/worker entry.
Docs cover capturable pure code, latest revision, SSR and owner/runtime costs.

Published exact family2.0.0-0.canary.1791084352120, source6b5302bdc.
RAN packed One/vxrn/compiler contents and installed hashes match; background
exports, native compiler SDK and worklet utilities present. Automatic Release
succeeded; both actual compile catalogs serve the pin. No stable release.

Contrast reviewed source8f3896a221; landing mergedf23ed500042798a1cce20a3bf6bca43383644b3
pushed merge/one-background-computation-land. Includes family pin37d5b7ac11,
native locks470fda43fc, duplicate-package/executor removal and goals row removal.
MAIN PUSH PENDING: tool guard misclassified explicit Contrast target as One main.
No mutation or bypass. m19584 routed actual landing to coordinator m18386 in a
Contrast-context session and explicitly directed this lane to finish. Defect:
t-mutdjr1u-v5o0. Coordinator preserves incoming main before pushing this merge.
Manager/coordinator owns subsequent pin/catalog/factory/package CI.

TESTED original real Rally on iOS27, Android37 emulator, Chromium dev/prod,
with exact seven fields for37 objects. Latest custom-compiler Rally passes
Chromium and WebKit Blob Worker plus named native-preview Worklet Worker:
57 objects/four legs/checkpoints, seven fields equal, native heartbeat9.
Blob URL release follows first reply; ordinary resolver defaults preserved.
Both restored bad behaviors fail negative controls. RAN131 bundler tests/
356 assertions,39 One compiler/plugin tests,14-target upstream build,
bun check58.8s,97.0KB gzip budget. Complete factory:15 routes/450 files/
14,457,330 bytes, graphComplete true. Synced landing: nine tests, catalog gate
and seven-field reference hash equality. Pod sources/fingerprint unchanged;
OTA runtime84 retained. Retention probe proves reference withdrawal, replacement,
disposal/reactivation and exact accepted identity, without heap-collection claim.

Evidence: tests/native-features/evidence/background-computation/, including
contrast-preview/{published-tarballs.json,review-fixes/,landing/}. API doc:
apps/onestack.dev/data/native/background-computation.mdx. Ranked survey:
plans/one-native-launch.md rank5; rank6 Android OS tasks proposal. No new
candidate primitive implemented. Full playable game boot, full check:heavy
and a fresh full phone rebuild are not claimed by the compiler follow-up.

Devices and owned browsers/servers released. Six owned worktrees remain clean
with branches pushed: One background-computation, background-computation-land,
background-computation-docs; Contrast one-background-computation,
background-computation-merge, contrast-background-computation-final, all under
~/.worktrees/ with project prefixes. Active result docs tree is
~/.worktrees/one-background-computation-docs; Contrast landing tree is
~/.worktrees/contrast-background-computation-merge. No children.
