---
id: t-mvd7hx3j-14wo0
title: 'one ios sdk: close the generation gaps in PR 961'
status: done
owner_status:
  state: landed
  text: accepted scoped One2.9.0 work shipped; exact stable artifacts verified
  updated_at: 1792454522854
labels:
- lane:one-sdk
- umbrella:one-ios-coverage
backend: git
sessions:
- p95796
- s50803
commits:
- 07ca514968
- 116ad951ad
- 1795c0318f
- 258d569310
- 388b59bbd9
- 4067c0131b
- 469dce1048
- 73e453bba0
- 86b67b3ad0
- 920c9f1258
- aba16bc57c
created_at: 1792290516175
updated_at: 1792454969612
field_marks:
  active_form: 1792290516175
  assigned:p95800: 1792376367127
  body: 1792454522854
  claim: 1792454969612
  claim_current:e352b356dfb61ccc478b00b0c98fc073: 1792454969612
  ? claim_state:27be3e60dd9de77688794a66ad2510b3:1792376367127:=p95796:=mc-h39p4gbj818h:1792376367127:o:7f0b8cb1d598a4b4975d4cb7254cd240
  : 1792376367127
  claim_state:534a81620265532979012fe99de548c5:1792290602550:=s50803:=mc-3aa87nk0z4j17:1792290602550:l: 1792290602550
  claim_state:7f0b8cb1d598a4b4975d4cb7254cd240:1792367963625:~:~:~:o:534a81620265532979012fe99de548c5: 1792367963625
  claim_state:e352b356dfb61ccc478b00b0c98fc073:1792454969612:~:~:~:o:27be3e60dd9de77688794a66ad2510b3: 1792454969612
  commit_linked:07ca514968: 1792380151970
  commit_linked:116ad951ad: 1792380152264
  commit_linked:1795c0318f: 1792378593359
  commit_linked:258d569310: 1792377525197
  commit_linked:388b59bbd9: 1792380152109
  commit_linked:4067c0131b: 1792377525151
  commit_linked:469dce1048: 1792380152183
  commit_linked:73e453bba0: 1792377525244
  commit_linked:86b67b3ad0: 1792378593669
  commit_linked:920c9f1258: 1792379702625
  commit_linked:aba16bc57c: 1792377525047
  evidence_summary: 1792290516175
  owner_status: 1792454522854
  parent: 1792290516175
  priority: 1792290516175
  recovery_ref: 1792290516175
  status: 1792454522854
  title: 1792290516175
  unassigned:p95800: 1792377533693
  unassigned:s50803: 1792367963624
---
2026-10-18 s50803 pause. Open generation gaps: Contacts CNLabeledValue<ValueType> generates an empty handle (no init/label/value); UIWindowScene.effectiveGeometry has no observable declaration (s51006, INFERRED); SecAccessControlCreateWithFlags and CTFontManagerRegisterFontsForURL absent; sync UIKit APIs bound as async MainActor. Bundling iOS without a local prebuild still errors by design; Expo now writes facades in expo prebuild (2f5988340), but EAS-only prebuild with a Windows or Linux dev machine has none. 39 unified modules remain on Swift (list in s51006 handoff /Users/n8/.team-machine/results/one-unified-sdk/handoff.md).

Lead p95796 next hard item after current emitter author p95800 returns ownership: release limitation for EAS-only native prebuild with a Windows/Linux local iOS bundler. Investigate one generated runtime facade path that does not need local Xcode, preserving table identity, exact signatures and current transport benchmarks. No facade fallback or silent unsupported API, no premature product-choice/release approval request. Existing shared source ownership stays intact until first declaration batch is pushed/reviewed.

p95800 done 2026-10-19: C error out-params bridged (SecAccessControlCreateWithFlags, CTFontManagerRegisterFontsForURL ship in 73e453bba0). Swift 0 errors, strict tsc + 5 negatives, vitest 4 passed. Open: CNLabeledValue empty (generic-owner 6245), non-CFError Unmanaged, Unmanaged returns. Handoff /Users/n8/.cache/one-sdk-docs/declarations-recovery-handoff.md.

RAN CFError declaration batch pushed73e453bba0, four commits aba16bc57c/4067c0131b/258d569310/73e453bba0. Worker reports real Security/CoreText generated Swift compile zero errors, strict TS five negatives, existing vitest4 pass; independent batch4 assigned p95798, no native error-return execution claimed yet. Same warm Muse p95800 resumed remaining ObjC generic-owner gap CNLabeledValue with generic rule/witness proof, no broad opening of6245 symbols. Four Muse slots remain staffed.

2026-10-19 TESTED standing reviewer p95798 batch4: new CFPropertyListCreateData call stores Unmanaged<CFData> in handle, receiver decode fails and retained result leaks. CFError out lifetime controls pass. Exact emitted body plus pinned native runtime probe evidence ~/.cache/one-sdk-docs/reviews/batch4-native. Assigned p95800 return ownership fix before generic-owner batch; not ready until real native success consumer passes.

p95800 P1 fix 2026-10-19: Unmanaged returns transfer ownership (Create/Copy retained, Get unretained) in 1795c0318f, regen 5 d.ts in 86b67b3ad0. Reviewer native probe criteria met (CFData decode + release, Get smoke). Resuming CNLabeledValue.

2026-10-19 RAN lead portable dispatch prototype against26 actual cached SDK module manifests/30,818 entries: simulated pruning displaces26,406 current positional IDs. SHA256-derived exact52-bit entry-key IDs remain stable for survivors with zero observed per-module collisions. Probe ~/.cache/one-sdk-docs/portable-entry-identity.mjs and .json. This is a feasibility probe only, not production change or cross-SDK/native/performance proof. Portable shipped facades still require one generation/ABI contract, Swift dispatch sorted for stable IDs and runtime-size/performance validation. Current emitter author retains ownership through correctness/generic batches; no overlapping edits or fallback added.

2026-10-19 batch8 TESTED retained CFData ownership and nonowned Get identity/lifetime fixed1795c0318f/86b67b3ad0, but Copy collection returns via c.outs erase class type and become plain arrays/dictionaries instead of promised native CFArray/CFDictionary handles. Assigned original author p95800 shared class-preserving envelope cause fix, necessary OneSDKRuntime.swift out/outs scope granted. Native exact pinned emitted-body probes at reviews/batch8-native; not yet approved.

p95800 outs fix 2026-10-19: class-preserving outs overload in 920c9f1258. Reviewer batch8 probe both PASS (was DEFECT), consumption via CoreFoundation verified, no regressions. Resuming CNLabeledValue.

p95800 CNLabeledValue done 2026-10-19: objc-open rule + erasure/switch in 07ca514968..116ad951ad (pushed). Contacts 0 Swift errors, strict tsc value-type pos/neg, vitest 4 passed. Emitter paths handed back to lead per request; no further generic/out-pointer edits from me. Ready for next proof assignment.

2026-10-19 lead owns emitter after07ca..116ad handoff. Implementing portable dispatched facade path: signature-derived52-bit IDs + numeric-sorted native range dispatch; SDK-specific compiler cache separate from source/runtime ABI; source/built fingerprint equality delegated original Muse p95800 in independent new fingerprint/build files. Published runtime facades resolved from installed One package, eliminating local prebuild dependency. First focused integration contracts4files19checks pass; generation/fullSDK/native/pack proof pending. Source remains uncommitted and shared live lead custody.

p95800 fingerprint slice ready-pending 2026-10-19: fingerprint.ts (narrowed ABI: 10 emitter + 4 native/spec/runtime + schema#minimumVersion, no version) + build.ts (Bun.build app.mjs with constant plugin) + 8 tests (equality, invalidation, version/schema controls, no-toolchain, bundle probe) pass provisionally (8/8) against current app. Build command for One scripts (lead to apply): bun codegen/sdk/build.ts (from packages/one; outputs dist/sdk/app.mjs). Awaiting lead ready signal on final app before final validation/commit; no emitter mutations by me.

RAN final release closeout: PR961 and975 merged; stable One2.9.0 published from28cc4531bbc4fa1e392a92dc05529d318278d832, workflow39341475834 SUCCESS. Both required full branch workflows8293 PASS; exact npm580 facade/declaration files and8 runtime/native/bundle files match, all24 family packages latest2.9.0. Accepted generated hosts, UIKitContent fixture/native lifecycle and scoped generic/runtime corrections are shipped. This closes this release implementation/proof task, not a claim of universal generics/SDK coverage. Followups t-mvftomx8-13ad0 and t-mvftoncg-13fr0 preserve known typing/name limits; no new proof/build queued.
