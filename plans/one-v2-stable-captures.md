# Stable launch captures

Final source: `031be1ae5a952f8c5c7c55e97aaa2e1b53630a0d`.
Capture branch: `launch/one-v2-stable-captures`.
REVIEW: none; the parent owns the assigned assembled review.

RAN: genuine frozen Bun installs, the durable Tamagui 2.6.2 patch's five
installed hashes, site typecheck, and the production site build passed.
The build generated 171 pages under the two-core heavy gate with
`ONE_BUILD_CONCURRENCY=2`, `RAYON_NUM_THREADS=2`, and `UV_THREADPOOL_SIZE=2`.
The thirteen workspace dist directories came from the clean assembled
worktree at `9ea80d28b3d1843282df5855947faa694e2e90f5`; their package source,
manifests, lockfile, and patch are unchanged. This was a site build using
existing package artifacts. Existing Tamagui extractor diagnostics remain.

TESTED: the strict capture script retains all original assertions. Eighteen
observations at 1440x1000 and 390x844 passed at source
`cb97e06e772ee881d12a513225d9c0a8ae8ab5ec`, including all four changed pages:
blog/version-two, docs/native-overview, docs/native-setup, and
docs/native-source. Every observation returned 200 with mounted React and
Tamagui, substantial content, zero console/page errors, zero doubled yellow
spans in server and client DOM, and no document horizontal overflow.
Eight separate probes verified every rendered text font.

RAN: inspection found the Swift tools directive missing from the guide's
displayed code and copy data. The parent corrected its fence metadata in
the final source above. Both guide widths were recaptured from its rebuilt
production site with all strict runtime/font checks retained, plus exact
first-line and clipboard-data assertions for `// swift-tools-version: 6.2`.
The post, overview, setup, and sidebar are byte-identical to the prior
capture source; their hashes and capture provenance are recorded in the
adjacent JSON. Their artifacts are reused at the parent's instruction.

RAN: 348 served local links and anchors across 89 routes passed. All four
pages' local Markdown href sets are unchanged in the final source. Five
existing RSS tests passed, and served RSS includes the published v1 control
while excluding the v2 draft. These receipts retain their prior source SHA.

RAN: full post desktop/mobile PNGs and PDFs, three guide pairs, and Q90
desktop/mobile full/opening before/after WebPs are saved. The comparison
uses the supplied assembled beta PNGs and neutral Before/After labels.
Post and guide top/middle/end images and all four comparisons were inspected.
PDF text preserves the post's first heading and final paragraph.

Evidence: `~/Library/Caches/one-v2-stable-launch/receipt.json`, scripts, logs,
PNGs, PDFs, and WebPs. Durable summary and artifact hashes:
`plans/one-v2-stable-captures.json`.
Reproduce with `build.sh`, serve port 4396, then run `capture.cjs`,
`supplement.cjs`, and `native-source-final.cjs` in the evidence cache.

The generation-only refresh failed on a missing client manifest; the final
full site build passed. Defect task: `t-musu3rh5-i4v0`.
No CLI acquisition or native compilation is established by these DOM checks.
Separate assigned lanes own those claims. No source edits, publication,
main push, additional review, or share were performed by this lane.
The production preview is stopped, all probe browsers closed, and the
managed worktree is retained clean with its evidence branch pushed.
