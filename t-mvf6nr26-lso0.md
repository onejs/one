---
id: t-mvf6nr26-lso0
title: Resolve unchanged fitted Sheet presentation across two content heights
status: done
owner_status:
  state: landed
  text: actual plain SwiftUI control matches One on same runtime; no unsupported sizing override
  updated_at: 1792410974733
assignees:
- p95796
labels:
- one-ios-sdk
parent_id: t-mvd1h69m-wa10
backend: git
sessions:
- p95796
created_at: 1792410041022
updated_at: 1792454970081
field_marks:
  active_form: 1792410041022
  body: 1792410974733
  claim: 1792454970081
  claim_current:ba09eb91208628cc30c5076223775412: 1792454970081
  claim_state:20c41b03fbc5a8deb33d3e5f32287357:1792410490930:=p95796:=mc-h39p4gbj818h:1792410490930:f: 1792410490930
  claim_state:ba09eb91208628cc30c5076223775412:1792454970081:~:~:~:o:20c41b03fbc5a8deb33d3e5f32287357: 1792454970081
  evidence_summary: 1792410041022
  owner_status: 1792410974733
  parent: 1792410041022
  priority: 1792410041022
  recovery_ref: 1792410041022
  status: 1792410974733
  title: 1792410041022
---
RAN native0c6130a8d6/SDK90ad + JS fixture-onlyce052 (driverc775): full unchanged sheets suite previously PASS w-d9e279. New ce052 three control rects distinct115ptwide x16/139/262,y167.33, taps mode base->controlled->fit, tall/compact, rev1 PASS. Fitted RN layout exact393x230 and393x430 PASS; actual outer native AX group identical both x8,y403.6870229,w377,h440.3129771, supported full-density screenshots unchanged sheet top/bottom. Heading moves96.2485pt (508.8889->412.6404), content recenters. Existing fixture keeps medium+large detents with presentationSizing=fitted. Cause/desired detent precedence requires author lead correction, no fitting acceptance. Evidence /Users/n8/.cache/one-sdk-docs/0c-ce052-sheet-{controls,compact,tall}.{ax.json,webp}, control-frames.json, fit-measurements.json, sheet-presentation-bounds.json with same0c-ce052 prefix. Original Maestro compact probe incorrectly required background layout label visible under modal; preserved failure, then bounded diagnostic used exact AX layout reports and actual presentation group bounds, no assertion relaxation or native retry. Stop first real fitted mismatch; remaining controlled/revision/interrupted ownership pending. Current source held0c with only driverc775 and fixturece052 mirrors, no native rebuild/SDK regen.

RAN source: fixture always authors medium+large even in fit, adapter defaults missing detents to large, host always applies presentationDetents before sizing. Actual230/430 RN frames are not outerpresentation proof. INFERRED explicit detents may constrain fitted sizing; cannot change precedence or synthesize height detents under SwiftUI-mirror contract without native reference. Required bounded pureSwiftUI control on same standard iPhone/runtime: fixedcontent heights230/430 with fitted (A) no detent modifier, (B) medium+large, plus automatic control; measure outer presentation and content. No inferred phone auto-fit acceptance from docs. Existing0c app/pair/source preserved, validator scheduling after current borrowed simwindow.

TESTED s51006 eight-case native reference w-b60e3c: fitted and automatic with medium+large both outer x8/y403.687/w377/h440.313 at230and430; omitted detents both x0/y59/w393/h793 at both heights. This reproduces unchanged outerpresentation in native SwiftUI itself on same iPhone/runtime. Existing One explicitdetent case matches reference; no production sizing fix or invented heightdetent warranted under mirrorcontract. Authoredcontent measurement separate, no broader platformclaim. Evidence sheet-native-reference/{SheetReference.swift,receipt.json,matrix.json,WebPs}, sourcehash bcca5ac0dd78232ded6df56fac49081640079c93cc868c47bfa55b13ff351160. Continue remaining controlled/revision/physicalownership proof; fitted outer230/430 requirement superseded by actual native comparison, not weakened assertions.
