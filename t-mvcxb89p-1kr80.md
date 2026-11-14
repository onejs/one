---
id: t-mvcxb89p-1kr80
title: Bridge callbacks key paths and mutable SDK buffers
status: done
owner_status:
  state: landed
  text: f15118573 pushed; whole SDK 289 modules zero errors, entries +680; ci-manager owns real Nitro integration
  updated_at: 1792275387583
assignees:
- s50797
labels:
- lane:one-sdk-generics
- umbrella:one-ios-coverage
backend: git
sessions:
- s50797
commits:
- f15118573
created_at: 1792273407901
updated_at: 1792278802136
field_marks:
  active_form: 1792273407901
  body: 1792275387583
  claim: 1792278802136
  commit_linked:f15118573: 1792274431327
  evidence_summary: 1792273407901
  owner_status: 1792275387583
  parent: 1792273407901
  priority: 1792273407901
  recovery_ref: 1792273407901
  status: 1792275387583
  title: 1792273407901
---
2026-10-17 s50803 assignment: "synchronous callbacks", "closures the SDK hands back to JS", "key paths" and "inout generic buffer compile skips if a sound mapping exists". Scope bridge.ts, emit.ts, runtime excluding protocol $impl owned by s50771. Preserve other workers, add Entry fields only, coordinate interface senders/receivers. Validate full SDK, per bucket deltas and Foundation enumeration native proof. Previous c8de22d3f accepted. ci-manager owns delivery.

TESTED: four focused modules compile with zero errors. NSArray enumeration honors sync stop and propagates error replies; expired and wrong-thread callbacks reject before JS; returned NSSortDescriptor comparator and inout Float vDSP.add execute; zero/one numeric bridge fixed; SDK-derived keypath member lookup resolves givenName and rejects unknown. Strict TS passes; Native Hybrid Swift typechecks with Nitro stubs. New methods callSync and callFunction, Entry.syncCallbacks, params.inout/keyPaths, callable handle $fn and sync out-slot contract sent to s50763. Full SDK admission refused because free disk14 GiB is below15 GiB. Lead s50803 routed cleanup to studio-disk-helper. No owned heavy process or watch is running; shared tree retained by lead. CI owner ci-manager. Evidence /Users/n8/.team-machine/evidence/one-sdk-callbacks-s50797.

2026-10-17 protocol runtime coordination: s50831 now owns emit-protocols.ts, its renderSwift append/import in emit.ts and $impl factory decoding in OneSDKConvert.from. Preserve those sections; f15118573 is the callback baseline. Existing wait w-e198e8 remains armed for lead s50803 to clear whole SDK admission.

RAN 2026-10-17: after lead clearance, whole-SDK heavy admission retried immediately and exited 75 before launching generation because free disk had dropped back to 14 GiB. Evidence: one-sdk-callbacks-s50797/genall.log. Lead notified; one reply wait armed.

# SDK callback and buffer validation

Commit f1511857352655d06741ed07a411b18cdb5af9ef; branch tm/one-sdk-docs. Whole SDK generated in 332 seconds under normal heavy admission. 290 requested modules, 289 available cached graphs; Twitter remains unavailable, as in the baseline. All 289 emitted tables have zero errors left; no nonempty error files. Shared source includes the protocol worker additions.

Entries: 128,915 -> 129,595 (+680). Previously indexed skip records: 14,181 -> 13,505 (-676). The protocol lane adds 2,718 new skip records, yielding 16,223 total in this combined output. These extra records are kept separate below.

| reason | before | after, prior symbol universe | after, all |
|---|---:|---:|---:|
| async callback | 78 | 23 | 23 |
| async protocol requirement | 0 | 0 | 65 |
| callable handle requires an asynchronous JS callback result | 0 | 4 | 4 |
| callback cannot propagate synchronous failure | 0 | 1388 | 1388 |
| callback returns a value synchronously | 1487 | 0 | 0 |
| compile | 1827 | 1464 | 1509 |
| generic | 2892 | 3703 | 3717 |
| generic owner | 1847 | 2039 | 2039 |
| identity | 4 | 4 | 4 |
| inherited protocol graph unavailable | 0 | 0 | 73 |
| inout | 61 | 0 | 0 |
| key path | 1320 | 0 | 0 |
| metatype | 604 | 662 | 662 |
| non-method protocol requirement | 0 | 0 | 710 |
| nonescaping protocol callback cannot use the async dispatcher | 0 | 0 | 70 |
| opaque parameter | 371 | 373 | 373 |
| owner not in the sdk index | 690 | 725 | 725 |
| parameter pack | 78 | 79 | 79 |
| pointer | 30 | 30 | 30 |
| pointer out-parameter | 206 | 127 | 127 |
| pointer to pointer | 32 | 32 | 32 |
| protocol initializer | 14 | 14 | 14 |
| protocol with associated types | 1680 | 1742 | 2017 |
| selector | 106 | 106 | 106 |
| static protocol member | 720 | 722 | 722 |
| synchronous callback requires a nonescaping JS-thread call | 0 | 133 | 133 |
| synchronous protocol result requires an active JS-thread call; delegate invocations can escape it | 0 | 0 | 1466 |
| variadic | 125 | 126 | 126 |
| variadic argument list | 9 | 9 | 9 |

Bound entries include 184 synchronous callback entries, 402 inout entries and 466 function-valued return entries. Two entries accept known key path names: SwiftUI SectionedFetchRequest specializations with NSManagedObject root and Int value accept faultingState. Other supported key path parameters use typed native handles.

Original blocked buckets recovered: synchronous callback 127 symbols, key path 74, inout 33, pointer out-parameter 33 and compiler 478. A symbol can emit multiple entries. The key path bucket is no longer a blanket rejection: 810 former key path symbols now fail generic witness resolution, 176 generic owner resolution, 141 nonthrowing callback failure propagation, 58 metatype, 42 associated-type protocols, 16 compilation, 2 opaque parameter and 1 variadic. These remain skipped.

Unsafe synchronous callbacks remain skipped: 1,388 nonthrowing callback signatures cannot propagate JS/decode failure without inventing an SDK return value; 133 require escaping or off-thread execution. Four callable signatures would require asynchronous JS callback results. Async callbacks remain unsupported where required. inout mappings return copies through the existing $out contract rather than retaining native mutable storage.

Three previous entries were removed for soundness: CTLineEnumerateCaretOffsets, CGAnimateImageAtURLWithBlock and CGAnimateImageDataWithBlock. Their imported closure contracts allow escaping; the old async dispatcher could not honor immediate stop flags. They now have a precise nonescaping JS-thread requirement reason.

Largest entry gains: Accelerate +290, Foundation +73, CreateMLComponents +41, TabularData +27, SwiftUICore +24, CoreVideo +21, RealityFoundation +21, SwiftUI +19, CoreMedia +15, CryptoKit +15.

TESTED: the native probe extracted exact case bodies from this whole-SDK output. Foundation NSArray.enumerateObjects stops after two synchronous visits; a JS error stops after one and propagates. Calls after lifetime end and on the wrong thread reject before invoking JS. NSSortDescriptor.comparator returns a callable handle that executes. Exact Float vDSP.add mutates [0,0] into [6,8] through $out. JSON zero and one decode numerically while bool/number confusion rejects. An SDK-graph-derived key path table resolves PersonNameComponents.givenName to Ada and rejects an unknown name. All probes passed against the current shared runtime.

Earlier focused strict TypeScript and native Hybrid sender checks passed. The Hybrid check used Nitro stubs; a real Nitro/Xcode build belongs to ci-manager. No simulator run was requested. CI owner is ci-manager. The shared worktree remains owned by the lead; no generation processes or waits remain. Preserve genall, coverage.json, coverage-scope.json and probes here for downstream integration.
