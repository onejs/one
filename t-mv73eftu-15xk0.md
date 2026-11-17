---
id: t-mv73eftu-15xk0
title: Reduce homepage separator opacity to twenty percent
status: done
owner_status:
  state: landed
  text: PR842 merged and TESTED live homepage3dividers computed opacity0.2, mounted/no page errors. Inspected native3x WebP.
  updated_at: 1791924124892
assignees:
- s37966
labels:
- lane:one-home-separators
- umbrella:plans/one-website-delivery.md
backend: git
created_at: 1791920838306
updated_at: 1791924124921
field_marks:
  active_form: 1791920838306
  assigned:s37966: 1791921325924
  assigned:s38106: 1791920874337
  body: 1791921258464
  claim: 1791920838306
  evidence_summary: 1791920838306
  owner_status: 1791924124921
  parent: 1791920838306
  priority: 1791920838306
  recovery_ref: 1791920838306
  status: 1791924124895
  title: 1791920838306
  unassigned:s37966: 1791920874337
  unassigned:s38106: 1791921325924
---
Nate requested fast homepage-only opacity20percent. Add opacity0.2 to existing local Separator styledView in apps/onestack.dev/app/index.tsx. Preserve separators geometry and unrelated pages. Existing TestFlight PR839 separately green. Branch+PR; mounted browser computed opacity and screenshot. CI s37966. REVIEW none.

Done 2026-10-13: one-file commit 087221654 on tm/home-separators adds opacity0.2 to homepage-local Separator (apps/onestack.dev/app/index.tsx). Pushed; PR https://github.com/onejs/one/pull/842 open against main. Mounted Playwright probe RAN: 4 separators computed opacity 0.2 (920x1, 1px border), 7/7 homepage sections mounted, 0 console errors; 3x WebP capture inspected (faint dividers, sections intact). No tests added, no full build per scope. Generated tamagui.css dev-server side effect restored; branch is one-file narrow.
