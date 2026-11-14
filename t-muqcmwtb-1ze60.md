---
id: t-muqcmwtb-1ze60
title: Migrate onestack.dev to Tamagui v3
status: done
labels:
- branch:v2-site-tamagui-v3
- lane:one-site-tamagui-v3
- umbrella:plans/launch
backend: git
commits:
- 258ecb0e2330f08670cdb078239dca08a8ac1002
created_at: 1790908425119
updated_at: 1790917836929
field_marks:
  active_form: 1790908425119
  body: 1790917836929
  claim: 1790908425119
  evidence_summary: 1790908425119
  parent: 1790908425119
  priority: 1790908425119
  recovery_ref: 1790908425119
  status: 1790917439287
  title: 1790908425119
---
Delivered on pushed branch v2-site-tamagui-v3 at 258ecb0e2330f08670cdb078239dca08a8ac1002, clean worktree. RAN: site typecheck, gated production build and zero-flag codemod report pass. TESTED: one site tamagui/core/web copy, exact beta graph; v2 fixture graphs unchanged; v5 themes/fonts preserved. Tamagui responsive font precedence fix pushed separately at 7559440948f17d7f982f8a984dc732c8e4c8c917 and carried by a reproducible exact-version Bun patch. Pixel diff NOT CLEAN: requested yellow menu corrected and navigation tested; routing ScrollView geometry and smaller text/layout differences remain documented. No merge to v2-beta, no main push or publish. Report docs/validation/tamagui-v3/README.md; handoff /Users/n8/one/.git/team-machine/handoffs/one-site-tamagui-v3.md. Temporary baseline removed and servers stopped.

RAN follow-up cleanup: deleted owned isolated Bun caches and obsolete runtime/Vite/TypeScript/package staging copies; stopped obsolete Playwright download and removed its temporary zip. Available disk increased 50.77→53.63 GiB (+2.86 GiB during cleanup; concurrent activity can affect figure). Both source worktrees clean, live site dependencies and all 193 MiB visual evidence preserved. Cleanup measurements: /tmp/one-site-v3-cleanup-result.txt.
