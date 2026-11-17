---
id: t-mv74lnha-mnb0
title: Deploy current merged One website to existing Cloudflare worker
status: done
owner_status:
  state: landed
  text: REPORTED CF version05eb5183 source73915422b; TESTED fresh live homepage/docs/blog and divider opacity. Parent removed retained worktree; no owned resources.
  updated_at: 1791924128018
assignees:
- s38206
labels:
- lane:one-site-production
- umbrella:plans/one-website-delivery.md
backend: git
created_at: 1791922854430
updated_at: 1791924128046
field_marks:
  active_form: 1791922854430
  assigned:s38206: 1791922885779
  body: 1791922854430
  claim: 1791922854430
  evidence_summary: 1791922854430
  owner_status: 1791924128046
  parent: 1791922854430
  priority: 1791922854430
  recovery_ref: 1791922854430
  status: 1791924128018
  title: 1791922854430
  unassigned:s37966: 1791922885779
---
User requested fast live docs/blog deployment and explicitly authorized using Contrast Cloudflare credentials. Current main14053b2ab4d6fc3c6edc473e8414690772393f5a. PR833 docs+837 blog already merged. Direct one-time main-source site build/deploy to existing onestack-dev worker can proceed while automationPR841 and homepagePR839/842 wait main merge. No One main/source mutation. Use isolated managed tree and heavy admission, existing pinned Wrangler, only scoped credentials passed to child env with no outputs. Verify fresh production storage/haptics rewritten content and /blog/version-two homepage badge. Automatic delivery and pending homepage merges separate tasks. CI s37966, REVIEW none.
