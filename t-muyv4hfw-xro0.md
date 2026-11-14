---
id: t-muyv4hfw-xro0
title: Fix early scroll reset during One client navigation
status: done
assignees:
- a24912
labels:
- branch:fix/scroll-after-route-render
- delivery:canary
- lane:one-scroll-top-regression
backend: git
created_at: 1791423207500
updated_at: 1791429279085
field_marks:
  active_form: 1791423207500
  body: 1791429279085
  claim: 1791423207500
  evidence_summary: 1791423207500
  owner_status: 1791423207500
  parent: 1791423207500
  priority: 1791423207500
  recovery_ref: 1791423207500
  status: 1791429279026
  title: 1791423207500
---
RAN regression introduced by cb6a85d86a39049f1fd968b09bb94f333fb36d68, exact historical parent/commit suspended-route probes. Fix6b489d521782af129132654d2baeb318f4bc2fdc on v2-beta. Full CI and Release pass. Beta2.0.0-beta.362.1 and canary2.0.0-0.canary.1791425937185 actual tarball sources/dist match validated build. Browser2, unit13, existing loader4042 retry0 pass. Local Contrast published-beta Docs Link single reset with destination DOM. Release upgrade remains open separately. All evidence /Users/n8/contrast/artifacts/one-scroll-regression; One owned servers stopped.
