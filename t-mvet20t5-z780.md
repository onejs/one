---
id: t-mvet20t5-z780
title: Migrate vxrn image-size to 2.0.3 with buffer input
status: done
labels:
- lane:contrast-launch-readiness
- security-launch
priority: 2
backend: git
commits:
- b22970011
created_at: 1792387192217
updated_at: 1792388208689
field_marks:
  active_form: 1792387192217
  body: 1792388163967
  claim: 1792387192217
  commit_linked:b22970011: 1792388070584
  evidence_summary: 1792387192217
  owner_status: 1792387192217
  parent: 1792387192217
  priority: 1792387192217
  recovery_ref: 1792387192217
  status: 1792388208689
  title: 1792387192217
---
Public One/vxrn slice done, review pending. Commit b22970011 on tm/security-image-metadata (pushed), PR onejs/one#969. image-size fixed 2.0.3, buffer input migration, 1.2.1 patch removed, minimal lock. Focused validation all green (see PR body). Review requested from security-batch-review (r106850); CI owner ci-manager. Next after approval: canary + exact npm artifact content/source-commit proof, downstream installs coordinated with parent r106838 (lock owned by r107018 in Contrast). RETAINED: worktree held by tm remove (attached to live r106850); clean, all pushed.
