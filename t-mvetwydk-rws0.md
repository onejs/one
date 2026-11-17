---
id: t-mvetwydk-rws0
title: Deliver One canary for PR969 image-size fix
status: done
labels:
- lane:contrast-launch-readiness
- security-launch
priority: 2
backend: git
created_at: 1792388635400
updated_at: 1792389707089
field_marks:
  active_form: 1792388635400
  body: 1792389673166
  claim: 1792388635400
  evidence_summary: 1792388635400
  owner_status: 1792388635400
  parent: 1792388635400
  priority: 1792388635400
  recovery_ref: 1792388635400
  status: 1792389707089
  title: 1792388635400
---
PR969 MERGED 05:51:47Z as fe273a10 (squash of b22970011). Branch canary run 39206083598 success, 05:44:12Z-05:55:33Z (11m21s), version 2.0.0-0.canary.1792388695533 whole family. PROOF: packed vxrn manifest releaseSourceCommit=b22970011, deps image-size=2.0.3; dist single call imageSize(readFileSync(files[0])); image-size@2.0.3 tarball sha512 matches lock; bounded probes: ICNS throws Invalid ICNS, PNG 4x2 parses. Contrast installed: one/vxrn/@vxrn/compiler all 2.0.0-0.canary.1792284898384 @ d0ae348 (fix/one-2.7.7-backports, patched 1.2.1, asset fn identical to main). Backport = same 6-file semantics, lock/manifest context rebase only. Coordinating pin/backport with r106838 + r107018; Contrast lock untouched.
