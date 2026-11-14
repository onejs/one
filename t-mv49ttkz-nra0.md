---
id: t-mv49ttkz-nra0
title: Bind SwiftUI Map controls slot under One.iOS.Map
status: canceled
owner_status:
  state: needs
  text: Map generation passed in CI; runtime blocked by repaired source-glue compile error; successor38186295190 pending
  updated_at: 1791763193054
assignees:
- m30241
labels:
- branch:v2-beta
- lane:one-native-map-controls
- umbrella:plans/contrast/mobile-app/one-native-parity.md
priority: 3
backend: git
created_at: 1791750235139
updated_at: 1793089848985
field_marks:
  active_form: 1791750235139
  assigned:m30241: 1791756011232
  assigned:r85284: 1791750275999
  body: 1793089848985
  claim: 1791750235139
  evidence_summary: 1791750235139
  owner_status: 1791763193054
  parent: 1791750235139
  priority: 1791750235139
  recovery_ref: 1791750235139
  status: 1793089848985
  title: 1791750235139
  unassigned:r85284: 1791756011232
---
Approved plan: ~/contrast/plans/contrast/mobile-app/one-native-parity.md. Add the native Map controls content slot so SDK MapCompass and other useful map controls work within One.iOS.Map. SDK/Expo spellings, fixture mount + behavior + negative proof, docs PropsTable, Peach stub tasks for r84992. CI owner m30241. REVIEW: p78450 via s31224, landed family; never gates landing.

RAN inspected827bbda04: Map generated Swift/MM composition lifecycle handwritten; codegen/mapCatalog references mapControls but emitter provides no child collection and schema slots remain[]. Manager now owns carry-forward repair in codegen/controlTypes.ts + emitControls.ts + mapCatalog.ts: catalog contentSlot drives Swift child collection, activation/reset lifecycle, Fabric mount/unmount, and schema content slot. Map controls adapters follow the existing catalog emitter. Full generate then generate:check, focused map/docs/coverage/container tests, typecheck queued exec64668; /tmp/one-native-map-generate-proof.log. Review remains p78450 via s31224; device fixture proof pending manager CI. Stub tasks per worker t-mv4cbthj-uwq0, t-mv4cbwek-vna0, t-mv4cbzdy-vy20 assigned r84992. Native Notifications host probe finally passed all assertions; previous failure was a probe seed issue, no product-default change needed.

RAN reproduced nativeCoverage mismatch and pushed inspected metadata repair fa9799d11, unchanged snapshot assertion passing. This records fixture references only, not runtime acceptance. Generator/check/build+types script remains queued; manager owns uncommitted three-file emitter/catalog repair in retained tree, next read exec64668 then inspect all generated/type diffs and land once targeted checks pass. Source replay no longer relies on manual Generated carry-forward after repair. s31224 reported committed-types and drift reds at827bbda04; full regeneration/build already assigned here.

LANDED5674f0e7938c265e14f83a63caf21cda861a7db6 on v2-beta. RAN full generate/generate:check atSDK27.0:330 mapped symbols,365 outputs verified, assembled Swift typecheck and controlled-state probes pass. Build, package typecheck, focused mapControls/map/nativeDocs/nativeCoverage/containers184/184 pass. Only Map Swift/MM/schema and missing Map declarations changed; unrelated control native output stayed stable. Fixed CI38181135310 on ci/one-native-proof-m30241-5674f0e79 includes Map and latest Battery/Brightness landingb871bae62; native Map mount/toggle/negative tests pending. Worker finished; manager retained clean worktree for remaining lane work. Stub tasks remain assigned r84992; reviewer p78450 via s31224 remains assigned to landed family.

RAN: inspected repair5674f0e79 parent b871bae62 and its 17-file diff. s31224 reported old-head checks114591595592 and generation114591662601 failures confined to Map; repair includes the named Map Swift/MM and declaration paths. Existing fixed-ref proof38181135310 remains watched by w-d19656; no duplicate run or regeneration started.

RAN: previous fixed CI generation/contracts step passed, but consumer app failed in source-event subscription glue (args scope), outside Map. Repair08ff3b1ec included in successor38186295190 at859037bb6. Map fixture proof remains open; no Map behavior claim from generation success.

Fixed proof38186295190 failed in source date isolation, outside Map; manager landed4f4b5b255 with actual Swift6 iOS typecheck and host round trips. New fixed proof38190763730 includes repair; Map mount/toggle/negative still pending. No Map generation regression observed in failed run.

RAN fixed iOS38190763730 full native consumer/Fabric compile completed, now preparing UI tests. Map fixtures still have no runtime verdict; generation and app compile are proven at4f4b5b255, not Map behavior.

RAN native consumer compile success in38190763730, but no feature fixture executed because source-import wrapper produced invalid JS. Fix899112e2c and real-worker regression landed; successor proof38197440142 pending. Map acceptance remains open.

Team Machine canceled this task: untouched for 7+ days with no live assignee. Reopen with `tm task update t-mv49ttkz-nra0 --status open`.
