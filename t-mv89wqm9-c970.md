---
id: t-mv89wqm9-c970
title: Verify approved One 2.7.0 stable publication
status: done
owner_status:
  state: landed
  text: stable Release38588941986 success; npm latest2.7.0; tag/source and three tarball integrity checks pass, 4396 packaged files match; result shared
  updated_at: 1791992657732
assignees:
- s38453
labels:
- lane:one-v2-release
- umbrella:plans/contrast/mobile-app/one-v2-launch.md
parent_id: t-mv7apqlm-168i0
backend: git
created_at: 1791992235969
updated_at: 1791992754470
field_marks:
  active_form: 1791992235969
  body: 1791992754470
  claim: 1791992235969
  evidence_summary: 1791992235969
  owner_status: 1791992657733
  parent: 1791992235969
  priority: 1791992235969
  recovery_ref: 1791992235969
  status: 1791992657733
  title: 1791992235969
---
Nate approval relayed by daily sweep r92256, 2026-10-14: asked "One 2.7.0 is approved but npm still serves 2.6.22: tell one-v2-owner to publish?", answered "4 yes". Stable publication is authorized; no One main change authorized or needed. RAN npm view one version returns2.6.22; fetched main carries2.7.0, merged release batch PR868. Existing Release38588941986 already runs at c3cd8830a7de8c60de78420b946a6ee56ef01ea0: successful full-CI gate, Publish prepared version in progress, Prepare release commit and both beta/canary paths skipped, consistent with republish. Follow existing run instead of dispatching a duplicate. This session owns artifact verification and share; s37966 retains broader One CI/native delivery. Done: successful stable run/tag, npm view one version exactly2.7.0, exact tarball integrity/source/content verified, concise tm share.

RAN approval recorded in private Contrast launch plan; no One files changed. Prepared-version run is already dispatched at c3cd8830a7de8c60de78420b946a6ee56ef01ea0, current main version2.7.0. Artifact verifier owns this release follow-through, broader CI remains s37966. Run metadata saved at ~/.team-machine/results/one-v2-owner/release-2.7.0-run.json.

RAN private approval record c0bc1270ed5 pushed to Contrast main after normal pre-commit checks and check:commit green10.4s. Evidence handoff refreshed, no own uncommitted source or server/worktree. Next exact workflow-terminal wait before npm artifact verification.

RAN terminal Release38588941986 SUCCESS at c3cd8830a7de8c60de78420b946a6ee56ef01ea0: successful full-CI gate, prepared-version publish, stable tag and GitHub release. npm view one version returns2.7.0. Exact One/vxrn/MDX2.7.0 tarballs pass registry SHA512; packed and registry releaseSourceCommit equal v2.7.0 tag/source; respectively4158/206/32 packaged tracked files match Git blob bytes, no mismatches. Compiled artifact SHA256 inventory retained. Proof and verifier: ~/.team-machine/results/one-v2-owner/release-2.7.0/{artifact-proof.json,verify.py,pack.json,*.tgz}. No native runtime retest or claim of all24family artifacts. Shared one-phone-screen result. No own running watcher/server/worktree; evidence retained outside shared source.

RAN final private acceptance record13bb3a43eef reconciled with concurrent published main as0749e01bc62; only own plan path differs from remote parent, normal check:commit green9.4s, push succeeded. Own path clean, no UU or active resource; foreign working-tree changes preserved.
