---
id: t-mv6k2sat-1bda0
title: Diagnose missing One registry version after successful canary publish
status: done
owner_status:
  state: landed
  text: s33405 verified exact PayLater npm canary1791889543802 from source530bf8e28, run38387756118 success
  updated_at: 1791891585774
assignees:
- m30241
labels:
- lane:one-native
- umbrella:plans/contrast/mobile-app/one-native-parity.md
backend: git
created_at: 1791888381893
updated_at: 1791891585799
field_marks:
  active_form: 1791888381893
  body: 1791891585799
  claim: 1791888381893
  evidence_summary: 1791888381893
  owner_status: 1791891585799
  parent: 1791888381893
  priority: 1791888381893
  recovery_ref: 1791888381893
  status: 1791891585774
  title: 1791888381893
---
RAN branch PayLater canary run38379717902 at530bf8e28 built successfully and npm printed +one@2.0.0-0.canary.1791885342451, but release verification timed out30min with one missing. Exact npm view remainsE404; create-vxrn at the same exact version resolves, so the version exists in the package family.23/24 other package versions were accepted by workflow verification. Failure log /tmp/one-paylater-canary-failure-clean.log and registry receipts /tmp/one-paylater-canary-registry*. Root registry cause unestablished, no credentials or npm policy change attempted, no timeout/assertion relaxation. Blocks exact One artifact verification for PR834. Accessibility canary38384887252 independently publishing; compare terminal evidence before any retry. Need an existing release/registry owner if this needs credentials or npm support. CI owner m30241.

RAN direct exact registry tarball HEAD404, confirming absent artifact as well as absent version metadata. tm send s33405 accepted/queued; do not resend. Accessibility canary remains in progress, no terminal result claimed.

2026-10-13 mail161: live CI owner s33405 accepted registry delivery repair and dispatched run38387756118 on fix/one-paylater-mac-linking. They will verify exact version and releaseSourceCommit. Their registry dropped-write explanation remains INFERRED. Original one canary1791885342451 remains E404; 23 sibling packages and accessibility control version resolve. m30241 will not dispatch or watch the owner’s retry.

2026-10-13 RAN by s33405, relayed mail162: release38387756118 succeeded; one@2.0.0-0.canary.1791889543802 packed from npm, 8283279 bytes, releaseSourceCommit530bf8e2813aee7d8d6bc299731f970180d52a28 equals run head; dist/ios/android/cpp/src/types present. Exact registry delivery accepted on designated CI owner receipt. Original partial version remains absent; use only the new pinned version. This closes the registry dependency, not Mac/archive/App Store Connect acceptance.
