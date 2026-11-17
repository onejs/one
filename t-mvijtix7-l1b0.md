---
id: t-mvijtix7-l1b0
title: Clean one-packed metro temp scratch when its run exits or is killed
status: done
labels:
- tm-defect
backend: git
commits:
- 2f786363d6f4385a37c9ca84e16a97d66ee79c32
created_at: 1792613543947
updated_at: 1792614394406
field_marks:
  active_form: 1792613543947
  body: 1792614394406
  claim: 1792613543947
  commit_linked:2f786363d6f4385a37c9ca84e16a97d66ee79c32: 1792613957503
  evidence_summary: 1792613543947
  owner_status: 1792613543947
  parent: 1792613543947
  priority: 1792613543947
  recovery_ref: 1792613543947
  status: 1792613957607
  title: 1792613543947
---
Found by rsi worker s64530 (RAN, 2026-10-21 19:47Z) tracing studio-64's ~97Gi user TMPDIR: one-packed-metro mkdtemp scratch from killed runs is ~14G, the second largest leak. Contrast fixed its own producers in e2037f96a5c (pid-named dir, removal on exit and signals, dead-pid sweep at start); no one-packed mkdtemp site exists in contrast, so the producer is likely here. Expected fix has the same shape.

Fixed in PR #1004 (2f786363d6): five one-packed-* mkdtemp sites in packedClosure.test.ts now pid-named, removed on exit/SIGINT/SIGTERM/SIGHUP, dead-pid sweep at load. Legacy pid-less dirs in TMPDIR are not swept (owner unknowable); clear by hand. Awaiting non-author large-model review before merge.

Non-author Codex review p102395 APPROVED exact2f786363d6; recorded on PR1004 as review comment because shared GitHub login natew is PR author. RAN exact helper with real isolated filesystem/Bun processes: normal exit, SIGTERM, SIGKILL+next sweep, two concurrent live owners and old-generation directory bearing live PID; correct keep/delete. Legacy/unrelated untouched; actual OS PID reuse not forced. Full packedClosure/Vitest not run. Evidence /tmp/rsi-review-102395/batch54/one-cleanup-probe.py. No confirmed defect; merge and CI remain assigned to lead.
