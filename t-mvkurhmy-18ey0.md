---
id: t-mvkurhmy-18ey0
title: Render native macOS linear-gradient backgrounds
status: done
active_form: gradient/color native proof passed and pushed; approved controls merged cleanly preserving authors, combined SDK native build underway
owner_status:
  state: landed
  text: combined SDK rebuilt, corrected actual native bitmap proof passed, source pushed; lead owns bounded review and consumer delivery
  updated_at: 1792755199612
assignees:
- s69799
labels:
- one-macos-native
parent_id: t-mvknc99k-k8t0
backend: git
sessions:
- s69799
commits:
- 123557977ee79a6eae5b0fecf07212065eef4740
- 336583ac594f017692c2ab3ea4328edb05303aef
- 5ebe5b10ea68c5ee3b8b87dc046cc1ff549e41c5
- e01b3044ba9475a8cc596e55f7e16f92a80be551
created_at: 1792752857098
updated_at: 1792755263432
field_marks:
  active_form: 1792754639653
  assigned:s69799: 1792752915216
  body: 1792755199612
  claim: 1792755263432
  claim_current:569605d6201a97a193a1749280ff8b11: 1792755263432
  claim_state:24f05697de182f62307e9a093ce0b5f4:1792752882580:=s69799:=mc-3aa87nk0z4j17:1792752882580:f: 1792752882580
  claim_state:569605d6201a97a193a1749280ff8b11:1792755263432:~:~:~:o:24f05697de182f62307e9a093ce0b5f4: 1792755263432
  commit_linked:123557977ee79a6eae5b0fecf07212065eef4740: 1792755199405
  commit_linked:336583ac594f017692c2ab3ea4328edb05303aef: 1792755199322
  commit_linked:5ebe5b10ea68c5ee3b8b87dc046cc1ff549e41c5: 1792753967923
  commit_linked:e01b3044ba9475a8cc596e55f7e16f92a80be551: 1792755199468
  evidence_summary: 1792752857098
  owner_status: 1792755199612
  parent: 1792752857098
  priority: 1792752857098
  recovery_ref: 1792752857098
  status: 1792755199612
  title: 1792752857098
---
Consumer ask24: expo-linear-gradient platform default warns and draws plain View, losing machine-chip wash. Lead read RN0.88 BaseViewProps.backgroundImage and LinearGradient/ColorStop, native OneMacosComponentView.drawRect ignores this vector. Prefer standard RN backgroundImage host implementation plus a small Mac consumer adapter over a duplicate new component API. Native actual gradient draw with correct bounds, stops, clipping and appearance proof required. Scope native ComponentView and focused fixture, no Modules/Root/API/vxrn writes. CI ci-manager.

11:06Z lead scope approval after reading actual RN Color.h + Mac HostPlatformColor: SharedColor bool compares Color against default UndefinedColor; Mac Color default and explicit numeric zero compare equal by argb_, so transparent black incorrectly acts absent/transition hint. Author may fix defined-state constructors/equality in Mac HostPlatformColor.h as gradient prerequisite, with actual undefined/zero/semantic clear/missing-name controls. Preserve getColor numeric ARGB and semantic equality/hash contract. No Modules/Root/Swift/API expansion.

Scope confirmation from lead s69213: narrow private HostPlatformColor defined-state repair approved. Initial bitmap proved opaque angle/corner geometry and native semantic appearance; numeric transparent black compared equal to UndefinedColor, skipping fade layers. Fix adds defined_ in existing alignment padding and compares it before ARGB/platform equality. Numeric getColor and semantic resolution/hash unchanged. Focused native probe added at tests/macos-basic/probe/gradient-colors.mm.

Checkpoint 5ebe5b10ea pushed to tm/macos-resume. NOT complete: final native rebuild PID 96745 (started 01:06:57 local, owned s69799) stalls in compiler __open with 0 CPU. Exact build-exit watcher /Users/n8/.team-machine/evidence/one-macos-gradient-s69799/wait-build.py. Native job tool session 61899. Retain warm cache /Volumes/Samsung-1TB-990/builders/one-macos-resume and shared source tree (lead s69213). Owned background probe PID 86596 at /Users/n8/Library/Caches/one-macos-gradient-s69799/MacosGradient.app is old pre-color binary; stop and recopy/re-sign unique bundle id after build. Pending: build-color-probe.py full link/run, final app relaunch with ApplePersistenceIgnoreState YES, run commands-light.json (uses direct NativeDevSettings in standalone production bundle), verify wash, semantic clear, points, bounds, true reload, inactive AX result, cursor unchanged, final hashes, WebP share, independent Opus review via lead and CI ci-manager. Evidence and helper scripts outside tree at /Users/n8/.team-machine/evidence/one-macos-gradient-s69799.

Lead s69213 added SDK prerequisite: after own gradient/color proof and clean pushed unit, merge approved origin/tm/macos-controls at 5c84f600e8 normally into producer tm/macos-resume, abort/surface conflicts, preserve authors and installed node_modules/dist. Incremental combined native rebuild and minimal launch/gradient readback required before bounded handoff. Lead owns Opus gradient/color review and final consumer s69811; CI ci-manager.

11:19Z lead independently inspected owned compiler4037 after11m31: 0CPU, same __open stack as author sample, RawTextProps temp object open, no progress. Independent menu native source compile using same Xcode against sibling controls cache completed4s, so not a fleetwide compilation failure. Author may stop only verified owned build/compiler children and resume same incremental target once, no clean/cache deletion. If repeated exact header block, preserve evidence and safely choose alternate warm cache after releasing current writer; consumer dd remains separately owned. WIP5ebe preserves source, no accepted transparency/final SDK claim.

Stalled build and all 38 recorded descendants stopped after identity checks. Old watcher w-7877a4 canceled. Resumed same OneMacosCore target with -j4 in existing producer cache; wrapper PID34946, tool session66224, log /tmp/one-macos-gradient-resume-s69799.log. Remaining RawTextProps compiled successfully on this attempt; no clean or cache removal.

Gradient proof source 5ebe5b10ea, result docs 336583ac59 pushed. Native color probe all eight PASS. Bitmap checks pass wash, semantic clear, angle/corner disproof, stop fixup, point+omitted stops, clipping, border, multiple layers, appearance without rerender, resize, actual reload, inactive AX, cursor unchanged. Controls 5c84f600e8 merged normally without conflict; combined target build with four core jobs and sequential app link in owned producer cache. Detailed gradient proof hashes in probe/GRADIENTS.md and external evidence; final integration launch/readback pending.

11:25Z independent Opus review t-mvkvrfdb-5li0 reports2 actual blockers: nil sRGB conversion for accepted pattern NSColors causes addObject:nil exception; red/transparent/blue wrong far-side hue from previous-only transparent substitution, CG pixel75%=64,0,69,132 vs premultiplied CSSblue alpha~128. Full findings + standalone probe in consumer evidence gradient-review/. Lead read observations and routed to original author s69799 for fix-forward and narrow native controls. Defined state/hash/geometry source review no defect. Producer now d3c621669e clean merged commands after336583ac59 gradient proof. Final combined native build still author-owned; no accepted final artifact until gradient corrections verified.

Lead relayed independent Opus review: guard nil sRGB conversion for AppKit pattern stops, and split transparent middle stop into previous-hue/next-hue zero-alpha stops. Renderer now rejects unsupported pattern layer before NSMutableArray insertion, and prepares clear-stop neighbors in two O(n) passes. Added actual host fixture row for red-clear-blue plus three pattern getters; final combined native rebuild and focused bitmap checks in progress. Defined-state/hash/geometry/fixup received no review defect.

RAN/TESTED final source e01b3044ba on origin/tm/macos-resume, normal approved-controls merge123557977e preserves authors. Combined incremental core/app plus fixture build passed. Actual native 840x800 bitmap checks passed all geometry, stops, layers, border/clipping, semantic appearance, resize, true reload and inactive AX checks; cursor unchanged. New red-clear-blue samples (255,130,130)/(124,124,255); all three pattern controls remain (34,204,102) in both appearances without crash. Final artifact SHA256 and precise native provenance in probe/GRADIENTS.md and external evidence/final-hashes.txt. Unchanged eight native color checks reused. CI ci-manager owns broader checks. Lead s69213 owns independent bounded review plus consumer followup. Shared clean producer tree and warm cache retained for lead; own background app stopped before finish.
