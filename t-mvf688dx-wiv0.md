---
id: t-mvf688dx-wiv0
title: Use exact Sheet value IDs for recycled freshness checks
status: done
owner_status:
  state: landed
  text: c775db7447 pushed; actual full existing native Sheet suite PASS w-d9e279
  updated_at: 1792410511249
assignees:
- p95796
labels:
- one-ios-sdk
parent_id: t-mvd1h69m-wa10
backend: git
sessions:
- p95796
created_at: 1792409316981
updated_at: 1792454970173
field_marks:
  active_form: 1792409316981
  body: 1792410511249
  claim: 1792454970173
  claim_current:731931a1610bbae957dbcf6e7d21a91e: 1792454970173
  claim_state:731931a1610bbae957dbcf6e7d21a91e:1792454970173:~:~:~:o:c21e1a25fd926def17af9dd769e78837: 1792454970173
  claim_state:c21e1a25fd926def17af9dd769e78837:1792409605575:=p95796:=mc-h39p4gbj818h:1792409605575:f: 1792409605575
  evidence_summary: 1792409316981
  owner_status: 1792410511249
  parent: 1792409316981
  priority: 1792409316981
  recovery_ref: 1792409316981
  status: 1792410511249
  title: 1792409316981
---
RAN exact0c6130a8d6 native/JS and driver3580 SDK90ad w-d7369f stops at sheet recycled fixture is fresh. Saved UI/AX: Open sheet exists, status closed, one-native-sheet-dismiss-count AXLabel0. Flat labels sequence closed,closed,Dismiss count:,Dismiss count:,0,0,Layout:. Existing closed() uses labels.indexOf(Dismiss count:)+1, so it reads duplicate label instead of value. Cause reproduced from saved raw JSON, no need repeat UI. Correct exact predicate to existing status/dismiss-count IDs (no broader AX changes/assertion weakening), source receipt then bounded rerun. Evidence /Users/n8/.cache/one-sdk-docs/0c-sheet-existing.log, 0c-sheet-existing/recycle-predicate-analysis.json, recycle-failure-summary.json and fail-sheet-recycled-fixture-is-fresh.webp (native1179x2556). Prior exact geometry/dismissals passed; fitted230/430/revision ownership still not reached. Stop first failure; app/source0c preserved, queued ce052 fixture not yet applied.

Pushedc775db7447: closed() reads existing one-native-sheet-status exactclosed + dismiss-count exactString(count) and OpenID. ActualsavednativeJSON replay oldfalse/newtrue, reversedordertrue; wrongstatus/count/missingOpen and misleadingclosed/countlabelswithoutvalueIDs reject. FullTSdriverparse+diffcheckPASS. Wait/retry/timeout/expectedvalues unchanged. s51006 receives driver-onlydelta; no appbuild/pods/SDKregen.

RAN exact native/JS0c + driverc775 unchanged full sheets suite PASS w-d9e279, including fresh fixture after recycle, exact medium geometry and fresh content close. No assertion weakening/timeout changes. /Users/n8/.cache/one-sdk-docs/0c-driverc775-sheet.log. Applying separately authorized fixturece052 next for distinct controls/fitted proof; no native rebuild.

TESTED s51006 full existing sheets suite PASS w-d9e279 on native/JS0c6130a8d6+driverc775db7447 and retained SDK90ad. Exact existing value-ID predicates resolve duplicated flat-label adjacency, with original expected closed/count/open conditions unchanged. Driver dependency complete; separate fitted presentation issue t-mvf6nr26-lso0 remains open, no fitting/later lifecycle acceptance implied.
