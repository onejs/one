---
id: t-mvmo87gl-yeb0
title: Review PR1002 sheet membership and inactive margin repair
status: done
assignees:
- m51790
labels:
- lane:release-review
- umbrella:one
backend: git
created_at: 1792862812101
updated_at: 1792876002037
field_marks:
  active_form: 1792862812101
  assigned:m51790: 1792862988052
  body: 1792876002037
  claim: 1792862812101
  evidence_summary: 1792862812101
  owner_status: 1792862812101
  parent: 1792862812101
  priority: 1792862812101
  recovery_ref: 1792862812101
  status: 1792876002037
  title: 1792862812101
  unassigned:m50768: 1792862917107
---
Same-reviewer exact645fb93982 over36e8d796ff. Read-only source and retained native proof/negative cases; close or expose two prior P2s. No build/native/CI producer/edit/spawn. Source m50986; release/CI r116738; consumer lead m57472. Update existing exact-head review, send verdict to those two owners and finish.

PR1002 same-chain revision review complete: REQUEST CHANGES at exact645fb93982e53dfc9bf482494ae67788f630c2e9 over36e8d796ff.

INFERRED P2 at packages/one/ios/OneNativeComposition.swift:402-403: presentingViewController can be inherited from a presented ancestor. A pageSheet-configured ordinary child of a fullscreen-presented controller inherits that presenter; presentationController can create a sheet controller from the child's configuration, so the new guard still admits a non-sheet host. Minimal repair: verify current is the actual presented controller via the presenter's presentedViewController reciprocal link, otherwise continue up parent. Original author m50986 retains repair ownership.

TESTED bounded model of the documented getters and exact guard flow: retained root negative/positive sheet pass; nested fullscreen counterexample fails. This is model/source evidence, not a new UIKit runtime reproduction. RAN exact delta and surrounding host code; visually inspected all six exact-head captures and retained negative log/harness. Inactive margin nil/stable modifier resolves the other P2. No old zero-vs-nil native control exists or is claimed.

Full verdict: /Users/n8/.team-machine/coordinator/updates/oss-one1002-revision-independent-review.md. Model/source/docs: /Users/n8/.team-machine/evidence/oss-one1002-review/revision-m51790/.

No source edits, commits, pushes, native producer, build, CI fetch, helpers, worktree or owned resources. r116738 owns delivery; p103700 broader CI; m57472 consumer lead preserved. Reported nine successful checks were not re-queried. No merge/publish/dispatch.

APPROVED PR1002 exact7a1f56af32ec6d58c62daa988e6ac39b9324a125, delta over645fb93982. Same-chain review m51790; supersedes prior REQUEST CHANGES. Both P2s resolved, no new blocker or DRY debt in this revision.

RAN exact two-file diff and surrounding host/inset code. At OneNativeComposition.swift:407 actual reciprocal presenter.presented identity is checked before presentation classification; unpresented children walk to parent and first real non-sheet terminates. Inactive nil margin/stable modifier remains at240. FullScreenCover fixture reuses RowsReader.

TESTED five bounded model cases including the exact inherited-presenter fullscreen counterexample, actual sheets and contained children; all passed. Independently read actual retained gate-7a1f56af32/README.txt and harness-build/child.log: fullscreen synthetic child oldtrue/newfalse/hostfalse; three sheet stages newtrue/hosttrue. Visually inspected both contact sheets and seven individual exact-head captures. Native execution/build/device provenance remains m50986-reported; reviewer did not run native code. Custody hashes for19 local retained files recorded.

Full appended verdict: /Users/n8/.team-machine/coordinator/updates/oss-one1002-revision-independent-review.md. Evidence/model/source/custody: /Users/n8/.team-machine/evidence/oss-one1002-review/revision-7a1f56af32-m51790/.

No source edits/commits/pushes, build/native producer/replay, CI query, helpers, merge/publish/dispatch, worktree or owned resources. Nine green checks reported by r116738, not fetched. Delivery r116738; broader CI p103700; original m50986/m57472 preserved. Approval only for this PR1002 revision; native/stable/broader-batch holds unchanged. Review complete.
