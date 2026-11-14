---
id: t-mv6jnam1-qrj0
title: Clear Fabric test identifiers from the actual SwiftUI accessibility host
status: done
owner_status:
  state: landed
  text: receiver native-proven on One main 342a602b0; PasteControl zero height disproven as a defect (pre-settle snapshot)
  updated_at: 1792078894341
assignees:
- m30241
labels:
- branch:fix/one-native-control-accessibility
- lane:one-native
- umbrella:plans/contrast/mobile-app/one-native-parity.md
backend: git
created_at: 1791887659129
updated_at: 1792078894341
field_marks:
  active_form: 1791887659129
  body: 1792078894341
  claim: 1791887659129
  evidence_summary: 1791887659129
  owner_status: 1792078894341
  parent: 1791887659129
  priority: 1791887659129
  recovery_ref: 1791887659129
  status: 1792078894341
  title: 1791887659129
---
r89484 reports installed canary1791834110990 paired native EditButton assertion fails with duplicate standalone-edit. RAN current main-based generator inspection confirms every generated control returns _nativeView as accessibilityElement; RN RCTViewComponentView updateProps applies testId to self.accessibilityElement, then One clears only self.accessibilityIdentifier. Repair the owning generator and regenerate, retaining exactly one SwiftUI control identifier plus the existing decorative-hidden host fallback. Preserve native label/unique-element assertion, no atIndex workaround. Native UIPasteControl zero height is separate unestablished behavior, not claimed repaired. Main-based PR/canary only; full native hierarchy proof required. CI owner m30241.

2026-10-13 RAN remote pro-64 diagnostic read confirms the native EditButton label assertion failed with multiple standalone-edit matches; current main has the same generator receiver mismatch. Published aae657518 on fresh-main fix/one-native-control-accessibility, PR https://github.com/onejs/one/pull/835;54 generated control hosts regenerated, new strict standalone/composed identifier-count+SDK Edit label fixture, coverage references updated. Actual RN assignment/generated cleanup compiled Objective-C++ probe with Foundation host stand-ins fails before and passes6 controls after; full SwiftUI/Fabric hierarchy not implied. Generate Swift typecheck/controlled state passed;211 derived/docs/coverage tests passed; Bun TS transpile clean; oxlint0errors/one existing regex warning. Canary38384887252 dispatched. Unchanged downstream PasteEdit label assertion remains required; UIPasteControl height0 cause unestablished, separate. Evidence /tmp/one-control-accessibility-probe and /tmp/one-control-accessibility-*.log on air-32. No One main/beta push or new API.

Delivery inventory: PR835 Checks38384887887 and Android38384887876 running; canary38384887252 pending. Plan1ecd500e8de published with normal hooks green. Existing sole waitw-9e776a remains on earlier PayLater canary38379717902; no second active CI watcher added during this blocker repair. On its wake verify both exact native package artifacts before asking for an unchanged downstream native hierarchy run.

2026-10-13 RAN: npm pack one@2.0.0-0.canary.1791888030555 resolves; manifest releaseSourceCommit aae65751810851038de0394166549cc3f2412b71 and all 55 changed generated ComponentView.mm files match git source bytes. codegen/emitControls.ts is excluded from the package, so no shipped generator comparison claimed. Earlier count of 54 hosts was a counting error; source diff contains 55. Receipt /tmp/one-accessibility-canary-1791888030555/verification.json, tarball SHA256 d5e2f683c4a6cea3db4720995e10082209ae00d58121a345f693f1affc4cb9a9. Requested capture owner r89484 use this exact artifact for unchanged strict unique-label check; queued once. Native hierarchy and separate PasteControl height remain unproven.

2026-10-13 RAN terminal GitHub snapshot: Checks38384887887 checks/tests both success; Android38384887876 real consumer compile success, both head aae65751810851038de0394166549cc3f2412b71. Source/artifact/build gates passed. Actual unique-label native hierarchy remains pending under capture owner r89484; no receiver repair acceptance inferred from CI compile.

Both Sol m30241 and Opus r90711 approve unchanged accessibility source patch. Opus local build passed but input drivers never reached fixture, so uniqueness native assertion remains unproven. Required iOS workflow38451529383 dispatched on integration head3d2c92eea (owned generator/native blobs identical to reviewedaae657518). No native claim or merge yet.

2026-10-15 Opus lead m35422 closeout.
RAN: One main iOS Native Tests run 38711397920 at 342a602b0 (success, all 8 jobs). Fixture job 116359331599 log: 'One Native EditButton accessibility > each identifier selects exactly one' passed (strict length 1 + SDK label Edit, standalone and composed); suite 63/63. Receiver repair (#835 f8230ae31) is native-hierarchy proven. Downstream unchanged PasteEdit label assertion: r89484 capture paste-edit-light-accessibility-r89484 passed and published 2026-10-13T12:43Z, edit and paste checkpoints light+dark passedThreshold.
UIPasteControl zero height: NOT a defect. RAN retained r90514 hierarchy: dumped at the moment the EditButton duplicate threw, right after mount; UIPasteControl 0x0 with _UISlotView alpha 0.2 (slot not loaded). RAN standalone iOS27 sim probe (iPhone 16, studio-64) of One's measured-standalone path (fixedSize vertical + onGeometryChange; eager/lazy attach; with/without height apply; in/out of scroll view): PasteButton reports 0 first, then 34.33pt ~60ms later on 3/3 launches; EditButton reports 20.33 at once. RAN settled native capture pair.webp: paste region 242px @3x = 34.33+12+34.33pt, all three PasteButtons painted. Would differ if wrong: settled native region would be 12pt (gap only). No source change needed.
