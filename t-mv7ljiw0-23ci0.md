---
id: t-mv7ljiw0-23ci0
title: Consume the deterministic Rolldown binding after upstream release
status: canceled
assignees:
- s38154
labels:
- branch:tm/one-bundle-determinism
- lane:one-bundle-determinism
- umbrella:plans/peach/runtime-release-speed.md
parent_id: t-mv7jzpou-fuf0
backend: git
created_at: 1791951308640
updated_at: 1793089896118
field_marks:
  active_form: 1791951308640
  assigned:s38154: 1792033201017
  body: 1793089896118
  claim: 1791951308640
  evidence_summary: 1791951308640
  owner_status: 1791951308640
  parent: 1791951308640
  priority: 1791951308640
  recovery_ref: 1791951308640
  status: 1793089896118
  title: 1791951308640
  unassigned:s37966: 1792033201017
---
Implementation and local proof complete: upstream cause fix https://github.com/rolldown/rolldown/pull/11206 at83f4812dfe723a2bdd23c44812be4017c4843d2b, One regression draft https://github.com/onejs/one/pull/865 at21175295accf538264614f39480ceeed2cd76933. Pending delivery: upstream maintainers merge/publish a native binding, then update One dependency pin/lock and pass the regression without an override. No approved production fork or assigned upstream release owner; do not keep implementation worker waiting. The released pinned dependency currently fails only equality; input control passes. One CI s37966; Contrast CI r90350; parent s38154 coordinates release dependency. No One/Contrast main push, stable publish or native-cache change was performed. Exact local proof and source patches live on air-32 at ~/.team-machine/results/one-bundle-determinism/; Contrast node_modules retains the authorized local One family install, manifests unchanged and patched binding scoped to probe children.

CI ownership transferred to fleet router ci-manager (p86466); native source/acceptance implementation remains with m32754, determinism consumer with lane owner s38154. Fully-green repair branch38660753431 at4f18b2e2; merged2a8edb960. Current-main acceptance pending; no claim of artifact publication. Handoff: /Users/n8/.team-machine/results/one-ci-owner-winddown.md.

Team Machine canceled this task: untouched for 7+ days with no live assignee. Reopen with `tm task update t-mv7ljiw0-23ci0 --status open`.
