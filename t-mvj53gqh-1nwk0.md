---
id: t-mvj53gqh-1nwk0
title: Repair duplicate generic SDK extensions across native framework tables
status: done
owner_status:
  state: needs
  text: parent p103481 independent review of PR1008 before merge; p96184 owns broader CI; Contrast author65565 owns same-generation constants/guest acceptance
  updated_at: 1792650461496
labels:
- lane:one-sdk-collision
- umbrella:beast119663
priority: 4
backend: git
sessions:
- s65593
commits:
- d43e446cca89a6a86e2897e7e15c5c9e73e997c1
created_at: 1792649279609
updated_at: 1792650708469
field_marks:
  active_form: 1792649279609
  body: 1792650708469
  claim: 1792650678021
  claim_current:0bed180bc14ffe3bbb5d4037100f3dae: 1792650678021
  claim_state:0bed180bc14ffe3bbb5d4037100f3dae:1792650678021:~:~:~:o:9e7514577375d56dfe34a1e9893fb6c7: 1792650678021
  claim_state:9e7514577375d56dfe34a1e9893fb6c7:1792649296564:=s65593:=mc-3aa87nk0z4j17:1792649296564:f: 1792649296564
  commit_linked:d43e446cca89a6a86e2897e7e15c5c9e73e997c1: 1792650461397
  evidence_summary: 1792649279609
  owner_status: 1792650461496
  parent: 1792649279609
  priority: 1792649279609
  recovery_ref: 1792649279609
  status: 1792650507629
  title: 1792649279609
---
Fix exact public One SDK generator cross-framework Swift extension collision blocking Contrast Beast119663 repair. MEDIUM effort; parentp103481 owns gate/cause acceptance and upstream review, CIrouterp96184 owns broader CI/natural verdicts. One branch+PR workflow only, no mainpush/stablepublish. Read One AGENTS and team-machine upstream-work/release workflows. No helpers/reviewer spawning; REVIEW: parentp103481, required upstream independent review within existing lane coverage.

TESTED Contrast authors65565 actual installed One2.0.0-0.canary.1792642491165 Foundation facade fails against old Contrast SDK namespace JSON before route mount. Necessary constants refresh reached matching generated native cache27.1-04d54782b8c4a812 and failed because CoreMedia.swift and AVFoundation.swift each extend CoreMedia.CMReadySampleBuffer with same oneSDKSync/Async/Mutate methods. InstalledOne dist/sdk/app.mjs writeAppSdkPod compiles ALL Sources/*.swift in ONE OneSDKBindings pod; separate-framework oracle modules would hide upstream defect and are rejected. A minimal EXACT TWO generated protocol+extension block swiftc-typecheck repro fails identically, using existing installedOne runtime module. Evidence onStudio64 /Users/n8/.team-machine/evidence/beast119663-s65565/{codegen-repro/,codegen-repro.log,native-oracle-failed.log,facade-before.log,uncommitted-repair.patch}; read bounded repro, not58MBwarnings archive. Original Contrast worktree /Volumes/Samsung-1TB-990/worktrees/contrast-beast119663-fixture-boot. Originalsource/cache untouched, no direct node_modules/generatedSwift patch. Parent will relay any dependency question. s65565 remains author of Contrast capture/cache selection/generateddata/guestproof, you own ONLY upstream generator cause and coherent table/facade delivery dependency.

Start by reading actual installed/repo source and original repro. Fix highest owning generator/assembly so joint native app tables cannot redeclare extension members; preserve callable IDs, protocol semantics, symbols and all framework/constant coverage, no compiler-error filtering/dropping APIs/workarounds. Existing One taskt-mvftoncg-13fr0 is lowpriority specialized CoreMedia facade naming, unrelated and must remain separate. OriginalSDKleadp95796 and reviewerr116863 are normalfinished; no exact live author or queued fix found. Keep all co-tenants and existing package changes.

Prove original native two-framework failure before then fixed GENERATED two-framework combined-module compilation, plus actual bridge behavior/nearest meaningful controls at risk. Normal admission, simulator only if native execution actually requires it; no engine/CanvasKit/wasm/distribution producer. Source generator fingerprint may change facade namespaces: deliver COHERENT fixed tables+facades from same source, not patched warm cache. Work with parent to carry through supported local release into isolated disposable downstream or verified branch canary as needed (One canaries authorized, stable not). Do not replace Contrast primary dependency install or mutate shared warmcache. Parent must review concrete diff+proof before upstream merge; push reviewable branch/PR. For required build keep worker; hand off and finish when only downstreamdelivery remains. External handoff under4KB source/PR/version/cache/TREE/runtime/proof/remainingacceptance, stop ownedservices/waits/claims, remove managedtree preserving publishedsource/evidence, tm finish once. No progress/completionmail; blockers needing parent only. No unrelated broadvalidation or feature work.

TESTED original installed two-extension repro fails with four redeclarations. Fixed generator now scopes opening witnesses by framework, updates protocol signatures, definitions and table callers. TESTED freshly generated complete CoreMedia and AVFoundation tables compile together through whole-module SIL emission using retained installed One runtime module. Matching full facade regeneration running; runtime generic receiver bridge probe and identity/fingerprint/app-contract controls in progress. Evidence /Users/n8/.team-machine/evidence/one-sdk-extension-collision.

TESTED runtime probe uses actual current OneSDKRuntime.swift, two full emitter-produced tables in one executable, dynamic OneSDKTables lookup, all four opening dispatch modes, shared handle mutation writeback, async sync fallthrough, unknown-id errors and SDKProbe<String>/SDKProbe<Int>. Original emitter fails identical fixture with four redeclarations. TESTED focused existing identity/app-contract/fingerprint/ObjC-generic controls: 4 files, 18 tests pass. TESTED complete CoreMedia (2074) and AVFoundation (4651) metadata+skipped records identical to installed canary cache. Full supported 289-framework facade regeneration and required package build running for coherent local downstream delivery.

TESTED fresh old-vs-fixed emission for both real frameworks differs ONLY by four framework-scoped method names. Facade bodies and all entry/skipped metadata identical under same compiler exclusions. Fixed generator fingerprint 6be9a005889899ab. TESTED required installed-family build: 15 successful targets, no failures. Coherent full facade generation in progress. Disposable consumer prepared under evidence/downstream, leaving Contrast install and original warm cache unchanged; supported --into local release follows completed generation.

TESTED supported full facade generation succeeded: 290 frameworks (initial watcher incorrectly expected historical 289; output is complete). All 290 baseline/current facade comparisons differ ONLY by namespace, full framework list unchanged, all 290 .d.ts files byte-identical. TESTED bun release --into evidence/downstream --skip-build installs 15 current-source built packages, local one2.9.0, generation6be9a005889899ab; bundled generateAppSdk agrees with source fingerprint, shipped facades byte-match generated CoreMedia+AVFoundation. Actual writeAppSdkPod writes one pod with 16 Sources/*.swift including referenced conformances; combined SIL compilation in progress. Source cache27.1-de0a57e92359f075 is newly generated; old cache and Contrast primary install untouched.

Task t-mvj53gqh-1nwk0 implementation complete; upstream review/Contrast acceptance remain with p103481. Broader CI owner p96184. No main push, merge, stable publish, canary, simulator or engine build.

Source: d43e446cca89a6a86e2897e7e15c5c9e73e997c1, branch tm/one-sdk-extension-collision, PR https://github.com/onejs/one/pull/1008 . TREE caeaef72504d2370e438e877ee337faf3ee24603.

Cause/fix: all framework tables compile in one OneSDKBindings pod. Same generic receiver can have different opening protocols in different frameworks; all four unscoped witnesses collided. emit.ts now scopes witness signatures/implementations/callers by graph.module. No compiler-error filtering, API pruning, ID changes or CoreMedia facade naming change. README explains joint-module contract.

TESTED original exact installed two-block repro fails with all four redeclarations (original-before.log). Fresh complete CoreMedia+AVFoundation tables compile jointly through whole-module SIL (combined.exit=0). Original-vs-fixed emitted Swift differs only by four witness names; all entries, skipped records, facade bodies unchanged (generation-compare.log). CoreMedia 2074 and AVFoundation 4651 metadata records exactly match installed original canary cache (coverage.txt).

TESTED real One runtime, two full generated fixture tables in one executable, dynamic table lookup: sync/async/mutation/async-mutation, shared-handle writeback, async sync-fallthrough, unknown IDs, two generic specializations pass (bridge.log). Old emitter fails identical fixture (bridge-before.log). Existing focused controls 18 tests pass; final app/fingerprint controls 9 pass. Required package family build 15 targets pass.

Delivery: supported bun release --into evidence/downstream --skip-build after current-source family build installs 15 packages in isolated disposable consumer; local one version2.9.0 (not npm publication). Package bundle/source/manifest all generation6be9a005889899ab. All290 regenerated facades differ ONLY by namespace; all290 declarations byte-identical, complete framework list unchanged. Fresh SDK cache /Users/n8/.cache/one/sdk-bindings/27.1-de0a57e92359f075. Original cache27.1-04d54782b8c4a812 and Contrast dependency install untouched.

Retained evidence/consumer owner p103481: /Users/n8/.team-machine/evidence/one-sdk-extension-collision . downstream/node_modules/one is actual local released package, including matching Foundation/CoreMedia/AVFoundation facades and bundled generator. delivery.json records generated file hashes and app pod. writeAppSdkPod creates16 Swift files (two full tables+14 referenced conformance files) in ONE pod; all16 compile jointly through SIL, pod-compile.exit=0. Runtime SHA2568ee007ba8bc9a27e480643c998e8c1f7ff23970fdbc3d6c4b1aefdc20c657f9b matches original installed runtime.

Remaining: parent independent source/PR review before any upstream merge; CIrouter owns broader natural verdict. Contrast author65565 owns supported isolated downstream adoption, constants namespace recapture/selection, facade/native same-generation verification and guest/route proof. No full Contrast capture duplicated. No owned services, children, live waits or resource windows. Managed source worktree removal recorded in task; pushed source and evidence retained. Watcher initially assumed historical289 count and falsely reported failure; actual successful output and baseline both contain290, verified structurally.

Task t-mvj53gqh-1nwk0 implementation complete; upstream review/Contrast acceptance remain with p103481. Broader CI owner p96184. No main push, merge, stable publish, canary, simulator or engine build.

Source: d43e446cca89a6a86e2897e7e15c5c9e73e997c1, branch tm/one-sdk-extension-collision, PR https://github.com/onejs/one/pull/1008 . TREE b2c9ca9eb2417601a2e4ce8a038faba4c6ef5390.

Cause/fix: all framework tables compile in one OneSDKBindings pod. Same generic receiver can have different opening protocols in different frameworks; all four unscoped witnesses collided. emit.ts now scopes witness signatures/implementations/callers by graph.module. No compiler-error filtering, API pruning, ID changes or CoreMedia facade naming change. README explains joint-module contract.

TESTED original exact installed two-block repro fails with all four redeclarations (original-before.log). Fresh complete CoreMedia+AVFoundation tables compile jointly through whole-module SIL (combined.exit=0). Original-vs-fixed emitted Swift differs only by four witness names; all entries, skipped records, facade bodies unchanged (generation-compare.log). CoreMedia 2074 and AVFoundation 4651 metadata records exactly match installed original canary cache (coverage.txt).

TESTED real One runtime, two full generated fixture tables in one executable, dynamic table lookup: sync/async/mutation/async-mutation, shared-handle writeback, async sync-fallthrough, unknown IDs, two generic specializations pass (bridge.log). Old emitter fails identical fixture (bridge-before.log). Existing focused controls 18 tests pass; final app/fingerprint controls 9 pass. Required package family build 15 targets pass.

Delivery: supported bun release --into evidence/downstream --skip-build after current-source family build installs 15 packages in isolated disposable consumer; local one version2.9.0 (not npm publication). Package bundle/source/manifest all generation6be9a005889899ab. All290 regenerated facades differ ONLY by namespace; all290 declarations byte-identical, complete framework list unchanged. Fresh SDK cache /Users/n8/.cache/one/sdk-bindings/27.1-de0a57e92359f075. Original cache27.1-04d54782b8c4a812 and Contrast dependency install untouched.

Retained evidence/consumer owner p103481: /Users/n8/.team-machine/evidence/one-sdk-extension-collision . downstream/node_modules/one is actual local released package, including matching Foundation/CoreMedia/AVFoundation facades and bundled generator. delivery.json records generated file hashes and app pod. writeAppSdkPod creates16 Swift files (two full tables+14 referenced conformance files) in ONE pod; all16 compile jointly through SIL, pod-compile.exit=0. Runtime SHA2568ee007ba8bc9a27e480643c998e8c1f7ff23970fdbc3d6c4b1aefdc20c657f9b matches original installed runtime.

Remaining: parent independent source/PR review before any upstream merge; CIrouter owns broader natural verdict. Contrast author65565 owns supported isolated downstream adoption, constants namespace recapture/selection, facade/native same-generation verification and guest/route proof. No full Contrast capture duplicated. No owned services, children, live waits or resource windows. Managed source worktree removal recorded in task; pushed source and evidence retained. Watcher initially assumed historical289 count and falsely reported failure; actual successful output and baseline both contain290, verified structurally.

CORRECTION: authoritative source TREE for commit d43e446cca89a6a86e2897e7e15c5c9e73e997c1 is caeaef72504d2370e438e877ee337faf3ee24603. The previous duplicate handoff accidentally used primary checkout HEAD tree; final handoff-s65593.md is authoritative. Source worktree is clean and published; tm worktree remove held only by this session own PIDs (release on exit), not co-tenants. Primary checkout unrelated dirty files preserved.

TESTED final actual released app pod jointly compiles all16 Swift files through SIL (pod-compile.exit0). Source pushed and verified on origin, PR1008 ready for parent independent review. Implementation complete and handed to designated CI owner p96184 through this task; expected normal branch/PR Checks, no canary workflow dispatched. Downstream Contrast constants recapture/guest acceptance remain with65565/p103481. No owned live service, child, wait or heavy window; isolated consumer and fresh SDK cache retained for parent delivery. Worktree release requested; own harness PID hold releases at exit.

RAN parent independent review APPROVED d43e446cca89a6a86e2897e7e15c5c9e73e997c1: complete emitter/doc diff, all274changedfacadefiles+manifest mechanically normalized old5d..new6be and exactequal, only2nongeneratedpaths. TESTED parent retainedcompiled actualOne-runtime bridge/probe from recordedcwd PASS bothframeworks/all4dispatchmodes/generics/handlewriteback/unknownIDs. Firstparentexecution outsidecwd failedloader beforebehavior, correctedcwdPASS; no sourcechange/rebuild. Read actualfulltable+16filepod SIL proofs, originalfails. No simplification/DRY finding; sharedwitness helper reusedrequirements/implementations/callers. PRreviewcomment6334360458 posted, auto-squash requested exactheadd43. OrdinaryOne branchcanary prerequisite run39734416083 dispatched sourcebranch tm/one-sdk-extension-collision, not stable/runtimegate release. OriginalsourceworktreeREMOVED, no stale--skipbuildadoption. Retainedcoherentlocalreleasedconsumer+cache ownedparent; gateauthors65565 suppliedqualifieddependency and ownsartifactverification/familypin/constants+guestproof. BroaderCI96184; Contrast6redacceptance remainsOPEN.
