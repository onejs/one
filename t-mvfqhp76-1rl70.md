---
id: t-mvfqhp76-1rl70
title: Verify published One 2.9.0 package contents
status: done
owner_status:
  state: landed
  text: One2.9.0 stable published and verified;24 family packages latest, exact source and SDK bytes
  updated_at: 1792454468346
assignees:
- p95796
labels:
- followup:production
- lane:one-sdk-docs
- one-ios-coverage
parent_id: t-mvemqt1b-1sbc0
backend: git
created_at: 1792443350994
updated_at: 1792454468346
field_marks:
  active_form: 1792443350994
  body: 1792454468346
  claim: 1792443350994
  evidence_summary: 1792443350994
  owner_status: 1792454468346
  parent: 1792443350994
  priority: 1792443350994
  recovery_ref: 1792443350994
  status: 1792454468346
  title: 1792443350994
---
Owner approved merge and stable publication. Source main2d00f8342bf7c00cb12279713c85da3ded262629, PR961, release workflow39323337382. Leadp95796 owns publisher watch + exact npm verification; mainCI ownerp96184 retains main. After publisher success npm pack one@2.9.0 --ignore-scripts; verify version, releaseSourceCommit, ABI0e503aef608672fa, all580 facade/declaration bytes and changed UIKitContent/native drag/Share sources and built runtime against reviewed source. Verify stable latest and family package versions. Preserve tarball/receipt. No broad native rerun. If release fails, fetch failed log once and route concrete cause; no force/CI bypass.

RAN stable workflow dispatched39323337382 on exact merged2d00f8342bf7c00cb12279713c85da3ded262629, release=republish. Current workflow status in_progress, no publication claim. Owner Yes recorded privately in Contrast commit9b2cf68b6e0; first ordinary main push rejected non-fast-forward, preserving commit and reconciling normal clean-tree merge, no force/reset.

Approval record preserved on origin/tm/one-2.9-release-approval at9b2cf68b6e0. Normal Contrast landing isolated only my one doc commit from shared main ancestry (candidate9f126695e9); no foreign commits force-pushed. Stable One workflow unaffected; source exact2d00 and publication awaiting existing ensure-ci gate.

Owner said Wait up tho and asks what explicit versus universal SDK coverage means. RAN release39323337382 still in ensure-ci, publish not started. Requested cancellation to hold stable publication while explaining actual unsupported shapes; no source rollback or merge reversal. Publisher watch w-9871f7 cancelled as obsolete; do not interpret owner-requested cancellation as CI/source failure. Already merged PR961 retained. Need clarify coverage and owner resume direction before redispatch.

Retained-resource custody update, independent of owner-held stable publication: TESTED by disk helperp97457 mail412, Studio dd-lead copied intact to /Volumes/Samsung-1TB-990/relocated/one-sdk-docs-dd-lead; rsync-a exit0, full rsync-naci checksum dry-run empty/exit0,33029files/10012767476logicalbytes, no source holders. RAN lead currentread original still directory/Data available6235536KiB. No internal bytes reclaimed yet. Diskp96180 owns authorized final original-path symlink swap/internal release and measurement; no concurrent move, source/evidence preserved. Native proof remains complete, future heavy Studio output external.

RAN canonical exact-head watcher w-3e9717 PASS both full required workflows on8293e7545a4067e2bde2831f8b63603043dbf703: Checks39336221342 and Android39336221368 SUCCESS. This includes all Android fixture shards; routed main Speech incident remains separate historical source/provider followup, not a current PR failure. Published canary1792448931010 exact580 facade/declaration bytes and new native/runtime/bundle matched. All scoped source/artifact peer review, package and targeted runtime proof complete. Ready recommendation shared with owner; renewed approval requested for concrete PR975 merge and stable2.9.0 publish. No stable publication dispatched.

Direct owner approval this turn: "I approve this shared item One2.9 is ready to release" and "Please go ahead". Scope explicitly includes merging concrete PR975 and publishing stable One2.9.0 per shared readiness result. RAN PR975 merged as28cc4531bbc4fa1e392a92dc05529d318278d832, main tip verified. Dispatch release.yml on main with release=republish, no force or gate bypass; version2.9.0 is already prepared. Lead owns Release workflow and exact npm artifact verification; main CI manager retains broader main CI. Approval supersedes earlier publication pause for this reviewed candidate.

RAN approved PR975 merge28cc4531bbc4fa1e392a92dc05529d318278d832; stable workflow39341475834 is owned by this lead with one detached exact Release wait w-6f88fc. Publication is not yet claimed. Prepared verify-stable-2.9.py to pack exact one@2.9.0, compare580 facade/declaration files and8 runtime/native/bundle sources against reviewed8293, require ABI212edf3d13b127f5 and exact merged releaseSourceCommit28cc, and verify latest/version/source for all24 published package family members after success. No second workflow watch or extra staffing. Historical body references ABI0e503/PR961 are superseded for this approved candidate.

TESTED stable Release39341475834 SUCCESS. v2.9.0 tag and main28cc4531bbc4fa1e392a92dc05529d318278d832 exact. npm one@2.9.0 source28cc/ABI212edf3d13b127f5/290frameworks;580 facade-declaration files plus8 runtime/native/built files exact against reviewed8293. All24 published family versions/latest/source verified. Tarball SHA25664594e62d19dc67bbcd130ba2849eae2f82b0f5ee1cf1815e06e85fbf37a65ac, receipt ~/.cache/one-sdk-docs/stable-2.9.0/verified-receipt.json. No pending release blocker, no new device proof claimed.
