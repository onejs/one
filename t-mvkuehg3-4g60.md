---
id: t-mvkuehg3-4g60
title: Review native Mac repair batch
status: done
assignees:
- s69688
labels:
- lane:one-macos-review
- umbrella:one-macos-native
parent_id: t-mvknc99k-k8t0
backend: git
sessions:
- s69688
created_at: 1792752250323
updated_at: 1792752877059
field_marks:
  active_form: 1792752250323
  assigned:s69688: 1792752292229
  body: 1792752480113
  claim: 1792752877059
  claim_current:9f810e748cc71207b285091e150ad818: 1792752877059
  claim_state:0aa1c03d0ffa93273818563c4a5ae91e:1792752467449:=s69688:=mc-3aa87nk0z4j17:1792752467449:f: 1792752467449
  claim_state:9f810e748cc71207b285091e150ad818:1792752877059:~:~:~:o:0aa1c03d0ffa93273818563c4a5ae91e: 1792752877059
  evidence_summary: 1792752250323
  owner_status: 1792752250323
  parent: 1792752250323
  priority: 1792752250323
  recovery_ref: 1792752250323
  status: 1792752480113
  title: 1792752250323
---
Independent Opus review for Sol-authored producer repairs228a4e3d93 (failed blob ownership), e9bde62ec4 (frame callback invariant), eeb26145c7 (composed native input/paste/undo/composition). Read actual diff and evidence /Volumes/Samsung-1TB-990/evidence/one-macos-repairs-s69674/handoff-s69674.md. Run existing focused actual-source/native-archive probe that could expose failure, no new test suite or broad native rebuild. Scope verdict and limits, return actionable findings to lead. No One edits or sibling mail. Consumer author may review during SDK prerequisite wait without delaying independent UI work. Lead owns native feature delivery; ci-manager normal workflows.

Review t-mvkuehg3-4g60 (Opus, s69688) of origin/tm/macos-resume 228a4e3d93, e9bde62ec4, eeb26145c7 over 4cf05bdaff: no actionable defects.

TESTED: rebuilt the author's editor-proof from the actual component source against the final OneMacosCore build (/Volumes/Samsung-1TB-990/builders/one-macos-resume) with four added cases, run on field, multiline and secure editors: typed insertion with NSNotFound replacement range (abc+xyz -> abcx), typing over a selection (axyd), delete while already over budget (abcdef -> abcde), insertion refused while over budget. All original surrogate/combining/ZWJ, clipped replacement, undo/redo, plaintext paste, composition and zero-budget cases also pass. App and window stayed inactive; frontmost app unchanged. Probe copy and log: scratchpad of s69688 (review/editor-review.mm), not the author's evidence dir.

READ: maxLength now treats 0 as a zero budget and only negatives as unlimited; RN's BaseTextInputProps default is INT_MAX, so unset inputs stay unlimited and 0 matches iOS. The shared field editor is only vended by OneMacosTextFieldCell, so its delegate always implements textEditor:limitedReplacement:range:. NSTextField and NSSecureTextField both respond at runtime to textView:shouldChangeTextInRange:replacementString:, so the secure field's super call is safe. Blob: failed and aborted blob responses skip the store and the request state is removed in the same block. Animated change is comment only.

Limits and non-blocking notes: no blob probe rerun (its binary and inputs are unchanged since the author's run). Pre-existing, outside the diff: didCompleteWithError returns early without removing the request when _emit is nil (teardown only). Marked text may exceed maxLength while composing and onChange reports that over-budget text until commit, as documented in INPUT.md.
