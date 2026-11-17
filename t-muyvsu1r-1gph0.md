---
id: t-muyvsu1r-1gph0
title: Publish V2 scroll fix and upgrade Contrast to the exact release
status: canceled
assignees:
- r62735
labels:
- branch:fix/one-scroll-upgrade
- ci-handoff
- lane:one-scroll-upgrade
backend: git
created_at: 1791424343583
updated_at: 1793089885119
field_marks:
  active_form: 1791424343583
  assigned:r62735: 1791431238786
  body: 1793089885119
  claim: 1791424343583
  evidence_summary: 1791424343583
  owner_status: 1791424343583
  parent: 1791424343583
  priority: 1791424343583
  recovery_ref: 1791424343583
  status: 1793089885119
  title: 1791424343583
  unassigned:a24912: 1791431238786
---
Release and upgrade implementation complete. RAN beta2.0.0-beta.362.1 and canary2.0.0-0.canary.1791425937185 exacttarball source6b489d521782a; bothchanged source+dist matchtestedbuild. Contrastmain upgradefdf8d3c82852b9c0b7cb1280833f92c44983b04d contains pin c14014bddf6 and native sync6508f2c9399 runtime95. Bothcompilecatalogs verified; buncheck pass21.8s, deps+frozenlock pass; localpublishedinstall Docs1reset afterdestinationDOM. Primarycleanmain upgraded to npm beta and source/distcmp passes, localinto removed. LiveContrast CI manager r62735 owns remaining requiredvalidation/deploy and livewebsite browser proof: confirm deployedSHA descendantof fdf8d3c8285 then scrolledfooterDocs Link resets1time only afterDocsDOM. Fullrecorddocs/one-scroll-upgrade.md; externaltraces+tarballs/Users/n8/contrast/artifacts/one-scroll-regression. Do not close deliveryuntil requiredCI+prodproof pass. AuthoredsourceOneworktreeretired; Contrastworktreecleanup pending docland.

Team Machine canceled this task: untouched for 7+ days with no live assignee. Reopen with `tm task update t-muyvsu1r-1gph0 --status open`.
