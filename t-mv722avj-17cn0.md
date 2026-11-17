---
id: t-mv722avj-17cn0
title: Remove outdated TestFlight demo promotion from One website
status: done
owner_status:
  state: landed
  text: PR839 merged and TESTED live mounted homepage has zero TestFlight links; exact deployed source73915422b. Browser receipt /tmp/one-live-website-proof.json.
  updated_at: 1791924121753
assignees:
- s37966
labels:
- branch:tm/remove-testflight
- lane:one-remove-testflight
- umbrella:plans/one-website-testflight-removal.md
backend: git
commits:
- 581f37b19da4c976167c65ccd5a2fd4f76a291ee
created_at: 1791918592399
updated_at: 1791924121784
field_marks:
  active_form: 1791918592399
  assigned:s37966: 1791919055982
  assigned:s38020: 1791918613964
  body: 1791923500144
  claim: 1791919056020
  commit_linked:581f37b19da4c976167c65ccd5a2fd4f76a291ee: 1791919004924
  evidence_summary: 1791918592399
  owner_status: 1791924121784
  parent: 1791918592399
  priority: 1791918592399
  recovery_ref: 1791918592399
  status: 1791924121753
  title: 1791918592399
  unassigned:s37966: 1791918613964
  unassigned:s38020: 1791919055982
---
User requested removal and push 2026-10-13. Spec ~/contrast/plans/one-website-testflight-removal.md. One public website contains one demo signup URL apps/onestack.dev/app/index.tsx. Remove entire Demo section, redundant separator and unused PrettyText import. Leave publishing guides. Push branch and PR, no One main push. CI owner s37966. Focused browser proof, no added tests. REVIEW none.

Done 2026-10-13: removed Demo signup section, one adjacent separator, unused PrettyText import from apps/onestack.dev/app/index.tsx. Branch tm/remove-testflight pushed, PR #839 to main. Browser probe passed, WebP captured, worktree removed.

RAN parent checked PR839 remote head581f37b19da4c976167c65ccd5a2fd4f76a291ee and exact one-file56-deletion diff. git worktree list contains only primary checkout. Worker REPORTED oxlint clean and mounted Playwright probe: no TestFlight HTML/text/link/image, Community/Team present, no console errors. No live deployment claim; PR open pending owner merge.

RAN direct user permission2026-10-13: exact PR839 merge succeeded, GitHub confirms20:30:37Z merged8879e46ef8c38e275ecccec23709d8d9aa657c29. Keep delivery open through current website deploy/live proof.
