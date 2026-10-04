# Assembled background computation review

Reviewer: m19584, per the lane assignment. Nate directly approved the public
API and custom-preview/compiler integration in the two retained shares. One
main remains untouched. No new candidate primitive from the survey is implemented.

One API landed on v2-beta4395848b3, retention fix75982e8ee, shared compiler
c2a262012 and proof6b5302bdc. You reviewed One75e1916d0 with Contrastfe0484e86f,
and subsequently approved shared compiler30bcc005b. The remaining review is
Contrast's assembled compiler adapter and published-family migration.

Contrast candidate: merge/one-background-computation-final, source
b5f14fddd19b096f2a5f967857c2f53d94b9d237, worktree
`/Users/n8/.worktrees/contrast-contrast-background-computation-final`.
It merges featurefd086fc8e4 onto main4def3f39bd. The intermediate candidate
b4b74932fd passed all four final gates; the latest candidate preserves main's
pure assetCollision extraction. Its adapter, tests and package graph are
byte-identical to the tested intermediate candidate. Its merged test allowlist
passes. TESTED: the latest collision-module proof passes both actual preview runtimes
with57 objects/four checkpoints/four legs and native heartbeat11. The complete
factory graph passes15 routes/450 files/14,457,330 bytes. Retained receipts are
in contrast-preview/final-main/. Both commands exited0 through bun heavy.

Read the feature diff from main4def3f39bd. Primary surfaces:
`packages/contrast-bundler/src/{graph,transform,bundler}.ts`,
`compile/worklets.ts`, `test/background-computation.test.ts`,
Rally's definition/hook, removed contrast-native background package and removed
app executor/worker files. Review graph ownership, pure dependency invalidation,
pruning, native serialization, worker graph isolation, failure rejection and
web/native conditional exports. Vite and Contrast invoke the same upstream
Sucrase compiler core; neither carries a parser/transform copy.

TESTED: the adapter suite passes130 tests/348 assertions, including eight native
and web graph checks. Native helper edits rebuild the serialized callable;
forbidden globals, runtime imports, unresolved dependencies and dynamic require
fail before emission. Pruning preserves hidden pure dependencies; a retained
negative control removing preservation fails on a missing pure module.
The original raw-transform negative and compile-boundary rejection are retained.
RAN: bun check passes62.6s on intermediate mergeb4b74932fd. Previous exact-pin
runs also passed both template typechecks, seed/dependency checks and pod sync.
Pod source fingerprint is unchanged, so runtime84 stands. Browser-worker build
budget passes96.6KB gzip. Full check:heavy was not run on the loaded host.

TESTED: original real Rally course passed on iOS27 simulator, Android37 emulator
and Chromium through One. The custom Contrast compiler then passed actual Blob
Worker web and named Worklet Worker native preview, including installed npm
packages. Intermediate current-main fixture passes all seven fields for57
objects/four checkpoints/four legs, with native heartbeat8. Complete canonical
factory build passes15 routes/449 files/14,456,148 bytes, graphComplete true,
with native identity and generated computation module asserted.
This proves the real computation hook and full factory bundle; it does not claim
full playable game boot. Optional fixture CLI WebSocket404 remains identified.

RAN: exact npm family2.0.0-0.canary.1791084352120 tarballs contain one/background,
vxrn browser/native compiler entries and compiler ESM/CJS worklet utilities,
with releaseSourceCommit6b5302bdc. Installed changed files match packed hashes.
Automatic One Release succeeded. Both actual compile catalogs now serve the pin;
current and legacy contrast-native source descriptors respond200 in both configs.
Contrast pin37d5b7ac11 and native locks470fda43fc land in this same feature merge.

Evidence: `tests/native-features/evidence/background-computation/`, especially
`contrast-preview/{published-tarballs.json,published/,current-main/,final-main/}`.
API doc: `apps/onestack.dev/data/native/background-computation.mdx`.
Ranked platform survey and rank6 Android OS-task proposal:
`plans/one-native-launch.md`. No Android OS scheduler was implemented.

Expected CI after Contrast main push: compile-catalog cutover/pin gates,
factory checks and package/template checks. Manager owns that watch unless
assigned here. Known limits are the full-heavy/full-game scope above; no known
adapter failure remains after the recorded checks.
