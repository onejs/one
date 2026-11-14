---
id: t-mvia5jg0-jvf0
title: One upstream helper for Team Machine native iOS showcase
status: done
labels:
- lane:tm-mobile-native
- one
backend: git
sessions:
- m50986
commits:
- 36e8d796ff43a6c2467349acc20b9c44e60c277b
- 645fb93982e53dfc9bf482494ae67788f630c2e9
- 6844d4b503226f8cdec16037ef1c4b0d556a3eae
- 7a1f56af32ec6d58c62daa988e6ac39b9324a125
created_at: 1792597308336
updated_at: 1792875894124
field_marks:
  active_form: 1792597308336
  body: 1792875893315
  claim: 1792606730327
  claim_current:19be288701c505f6b7fefb6e4e358bd5: 1792606730327
  claim_state:19be288701c505f6b7fefb6e4e358bd5:1792606730327:~:~:~:o:e2ce7598b9cd85186181a2f9ffcf7b5b: 1792606730327
  claim_state:e2ce7598b9cd85186181a2f9ffcf7b5b:1792597334214:=m50986:=mc-2tabg3bdr1roz:1792597334214:f: 1792597334214
  commit_linked:36e8d796ff43a6c2467349acc20b9c44e60c277b: 1792618340694
  commit_linked:645fb93982e53dfc9bf482494ae67788f630c2e9: 1792862759667
  commit_linked:6844d4b503226f8cdec16037ef1c4b0d556a3eae: 1792606521709
  commit_linked:7a1f56af32ec6d58c62daa988e6ac39b9324a125: 1792875894124
  evidence_summary: 1792597308336
  owner_status: 1792597308336
  parent: 1792597308336
  priority: 1792597308336
  recovery_ref: 1792597308336
  status: 1792875893315
  title: 1792597308336
---
Result: branch tm/ios-form-slot-swiftstyle, commit 6844d4b503, pushed, no npm publish. Gap 1: Form swiftStyle already on main (8ed1c13f8b), so the app needs a release or canary containing it; proven on simulator (top contentMargins 0, listSectionSpacing 40). Gap 2: Slot now takes swiftStyle and onNativeSDKEvent (listRowInsets leading 64 and background proven on a hosted RN row). Gap 3: emitSheet.ts sheet content gets ignoresSafeArea(.container, edges: .bottom); large-detent sheet bottom bar reaches the screen bottom. Regenerate reproduces committed generated files. Proof fixture: tests/native-features/fixtures/one-native-form-slot-style.tsx.

PR 1002 head 36e8d796ff: sheet scroll inset fix (bottom contentMargins for standalone hosts in a sheet). Simulator proof on exact head in ~/.team-machine/evidence/oss-one1002-review/sheet-inset-36e8d796ff. Awaiting CI and same-reviewer verdict (m50768 offline). Not merged or published.

PR 1002 head 645fb93982: fixes m50768 P2s (actual presentation membership via presentingViewController; nil bottom margin when inactive). Native negative and positive proof in ~/.team-machine/evidence/oss-one1002-review/gate-645fb93982. Review request sent to oss-fixer r116738; m50768 offline. Not published.

7a1f56af32 pushed; reciprocal presentation guard proven natively; sent to r116738 for m51790
