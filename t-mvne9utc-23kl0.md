---
id: t-mvne9utc-23kl0
title: Prove One DOM assets follow native Updates packaging
status: done
active_form: reproduced Android DOM output in Gradle res tree; CLI relocation and Updates collection repair under real packager proof
owner_status:
  state: landed
  text: 72b352c531 fixes Android DOM assets root, OTA collection and One CLI assetsDest; real packaging A/B/removal proofs passed; native activation/rollback remain lead/Opus
  updated_at: 1792907632819
assignees:
- p111481
labels:
- lane:one-dom
- umbrella:one
parent_id: t-mvnc3bb5-1t20
backend: git
sessions:
- p111481
commits:
- 72b352c531cd2102f4937e19d0ad13c449550f68
created_at: 1792906559040
updated_at: 1792907816835
field_marks:
  active_form: 1792907071723
  body: 1792907632819
  claim: 1792907816835
  claim_current:eafaa674db1a5eb65d7969a46c624fc2: 1792907816835
  claim_state:23b47d1aeb2462a2b40412be16a67367:1792906740829:=p111481:=mc-h39p4gbj818h:1792906740829:f: 1792906740829
  claim_state:eafaa674db1a5eb65d7969a46c624fc2:1792907816835:~:~:~:o:23b47d1aeb2462a2b40412be16a67367: 1792907816835
  commit_linked:72b352c531cd2102f4937e19d0ad13c449550f68: 1792907632378
  evidence_summary: 1792906559040
  owner_status: 1792907632819
  parent: 1792906559040
  priority: 1792906559040
  recovery_ref: 1792906559040
  status: 1792907632819
  title: 1792906559040
---
Independent remaining integration slice after runtime repair. Read actual One native bundle/Updates packager and source DOM output. Probe real packaging paths (embedded platform assets and OTA archive/install layout), using disposable evidence fixture with distinct native JS/DOM bytes. Confirm assets join before packaging and stale cleanup, no mismatched selected root, no global newest-download JS accessor; inspect launcher seam with lead if defect. Fix demonstrated packaging bug in owning CLI/assets files only; do not edit native hosts, package exports, fixture, Contrast, other authors work. No full native rebuild or dependency installs. Source validation only does not prove device Updates activation/rollback. Capture exact remaining gap. Commit/push fixes or handoff evidence when no changes. CI p110356 broad gates, REVIEW same Opus s78888 batch. Preserve shared tree and finish with external handoff.

RAN/TESTED: installed RN CLI -> source native bundle adapter reproduced DOM under Gradle generated/res instead of generated/assets. 72b352c531 relocates Android one-dom beside bundleOutput, preserves drawable resources, cleans stale target on zero entries, includes sibling DOM tree in Updates publish and supplies one build assetsDest. Actual RN Xcode script, native bundler/useDOMPlugin, installed Hermes compiler and actual Updates publisher ran private A/B/C fixtures (runtime aliases, cache reset flag stripped at process boundary; cache sentinel intact). Both platforms export distinct native and DOM A/B hashes with stable descriptor ids, six assets (PNG + five DOM), every export hash and HTML reference verified, paired install-layout reconstruction and extracted disposable archive layout verified. Rebuild drops stale files; DOM removal produces no embedded one-dom and OTA native-PNG-only assets. Real native adapter reproduced missing one build assetsDest before/after; existing vxrn build.lifecycle test passed; targeted lint/format and diff checks passed. Evidence /Users/n8/.team-machine/evidence/one-dom-packaging/report.md and scripts/logs. INFERRED launcher seam: both accessors read locked running selection, fetch/stage only changes stored state; no newest-download JS accessor introduced. Native installer/activation/reload-runtime coherence/rollback and signed app archives remain untested. Parent owns launcher/Fabric/app validation, same Opus batch review, CI p110356 broader checks; rebuild One/vxrn JS targets after source repair before using dist CLI. No native host/export/fixture/Contrast edits, resets, installs or release.
