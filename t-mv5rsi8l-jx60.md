---
id: t-mv5rsi8l-jx60
title: Peach stub for One.iOS.PhaseAnimator and KeyframeAnimator
status: canceled
owner_status:
  state: blocked
  text: initial-content implementation c61f027b418 delivered and assigned review PASS; original remaining native fixture acceptance receipt not established, current conformance lead m37511 route; no motion claim or dead m30241 hold
  updated_at: 1792181144289
assignees:
- s43018
labels:
- peach
backend: git
sessions:
- a29303
commits:
- 3e06fda16514ff6bc03055dcd17a1806773337dd
created_at: 1791840873045
updated_at: 1793089895583
field_marks:
  active_form: 1791840873045
  assigned:a29303: 1792092610655
  assigned:m30241: 1792095403787
  assigned:s43018: 1792095482420
  body: 1793089895583
  claim: 1792095352041
  commit_linked:3e06fda16514ff6bc03055dcd17a1806773337dd: 1792095168249
  evidence_summary: 1791840873045
  owner_status: 1792181144289
  parent: 1791840873045
  priority: 1791840873045
  recovery_ref: 1791840873045
  status: 1793089895583
  title: 1791840873045
  unassigned:a29303: 1792095403787
  unassigned:coordinator: 1792092610655
  unassigned:m30241: 1792095482420
---
One v2-beta 5cb3ddfd3 adds One.iOS.PhaseAnimator, KeyframeAnimator and the builders KeyframeTrack, LinearKeyframe, SpringKeyframe, CubicKeyframe, MoveKeyframe (types in packages/one/src/platform/animatorTypes.ts, docs apps/onestack.dev/data/native/ios-animators.mdx). PhaseAnimator props: phases, trigger?, animation?(phase) => SDKAnimation|null, children(phase). KeyframeAnimator props: initialValue (number or record of <=8 numbers), repeating?, trigger?, keyframes(value) => tracks or keyframes, children(value). Only swiftStyle may vary with phase/value; other differences throw. Stub: render children(phases[0]) / children(initialValue) statically in the given box, keep builders as plain descriptors, no animation needed. Fixture: tests/native-features/fixtures/one-native-animators.tsx. Device proof pending with m30241.

RAN manager verified actual additional approved public compatibility worker a29303, Spark1.3 Contributor/Max fixed work subscription on air24, parent s43018, managed tree /Users/n8/.worktrees/contrast-one-animator-compat-muse, first tools pwd/branch/log/status/task. Contrast implementation companion t-mv9xlsnu-inp0 tracks delivery; no One source writes/API changes. Current public JS validation/builders preserved, missing native hosts only initial-content compatibility. Dedicated Sol r96864 one review after actual Contrast source landing, non-gating. Protected Peach engine/factory/rnx source excluded. CI p88682.

Contrast implementation delivered via t-mv9xlsnu-inp0: commit 3e06fda1651 (seam + 2 additive registrations + kept test + backlog row), land ticket refs/land-queue/tickets/000000000001792095197992-3e06fda-a5efd1 queued. One source untouched. Device proof still pending with m30241; review r96864 via t-mv9xme8p-wm30 after merge.

Releasing implementation claim: my bounded unit (initial-content hosts) is delivered and queued; device proof remainder stays open for m30241/manager per the task body.

Ownership transferred to m30241 for the remaining device proof; implementation slice by a29303 is delivered (commit 3e06fda1651) and linked above.

RAN manager read final task state: historical device-proof transfer to ended m30241 is obsolete; current live manager s43018 owns remaining qualified native/paired acceptance followup. RELAYED a29303 bounded initial-content compatibility commit3e06fda16514ff6bc03055dcd17a1806773337dd queued ticket000000000001792095197992-3e06fda-a5efd1, not verified main delivered. Mount4/4 postrepair/omission2/2/invalid5legs/kepttest7/7 and full prevalidation88/88 reported. No animation-motion/whole-native/device acceptance follows. Dedicated Solr96864 source review taskt-mv9xme8p-wm30 remains actual-delivery dependent, not activated on queued branch. Native acceptance remains current manager-owned; no dead session hold.

Manager reconciliation: s43018 retains this unfinished acceptance claim per coordinator. Historical author/native-build/dead-session references are superseded by this report. Source implementation is preserved; no new producer, source restart or unchanged retry. CI p90480 owns actual delivery, current conformance lead m37511 owns source/proof routing.

Team Machine canceled this task: untouched for 7+ days with no live assignee. Reopen with `tm task update t-mv5rsi8l-jx60 --status open`.
