---
id: t-mv9l9kwz-1dfe0
title: Review One 913 914, Takeout 78 and One v2.7.4..main patch range
status: done
owner_status:
  state: landed
  text: '#914 470b8b29 recheck PASS; accepted documented pre-existing #899 race for 2.7.5 patch scope, next-batch fix retained'
  updated_at: 1792072467215
assignees:
- s42746
labels:
- oss-fixer
backend: git
created_at: 1792071777059
updated_at: 1792072467215
field_marks:
  active_form: 1792071777059
  assigned:s42746: 1792071875874
  body: 1792072467215
  claim: 1792071777059
  evidence_summary: 1792071777059
  owner_status: 1792072467215
  parent: 1792071777059
  priority: 1792071777059
  recovery_ref: 1792071777059
  status: 1792072435091
  title: 1792071777059
---
Review complete on One 4c2faa02d. Full local evidence: /tmp/oss-review-3015-275.hfrpeA/result.txt. P2 residual #899 get/set native-write interleaving reproduced (expected pas, received pa); P3 #914 rejected socket logs connected without disconnected. No source changes. Focused sync 32/32, stack-limit test, codegen check passed; HMR test passes and fails when watch event deliberately dropped. Parent p86518 owns disposition.

Follow-up review: RAN revised #914 at 470b8b295706de69ecc866a97b939a7f3b315b74. Existing media test and rejected-socket registration-log probe pass (2/2); rejected connection retains 1013 and native dev engine unavailable, with zero successful-registration logs. Zero-client edit test passes. INFERRED from before/after #899 setter path: remaining native read/write race predates this patch; accept its documented known-issue disposition for 2.7.5, with original failing interleaving probe retained for next-batch fix. No additional source edits.
