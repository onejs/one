---
id: t-mveuoiir-cl80
title: Backport image-size 2.0.3 fix to 2.7.x family
status: done
labels:
- lane:contrast-launch-readiness
- security-launch
priority: 2
backend: git
created_at: 1792389921219
updated_at: 1792391131549
field_marks:
  active_form: 1792389921219
  body: 1792391076064
  claim: 1792389921219
  evidence_summary: 1792389921219
  owner_status: 1792389921219
  parent: 1792389921219
  priority: 1792389921219
  recovery_ref: 1792389921219
  status: 1792391131549
  title: 1792389921219
---
Backport ad75e67 (same author as b22970011) on tm/security-image-metadata-2.7.x @ d0ae348+1, pushed. Six-file semantics identical to PR969. Focused green: imageSizePatch 3, glbAssets 4, asset scale sibling, real-function malformed/normal/scaled/scaled2x match contract, typecheck/oxlint/manypkg clean. Backport canary 2.0.0-0.canary.1792390182094, run 39208204347 success 06:08:32Z-06:22:50Z (14m18s). PROOF: packed vxrn/one/compiler manifests releaseSourceCommit=ad75e67, vxrn image-size dep 2.0.3, dist single imageSize(readFileSync(files[0])), tarball sha512 == backport lock, installed-tree ICNS throws / PNG 4x2 parses. Delta review requested from r106850; pin via r107018 only. No stable publish, no Contrast writes.
