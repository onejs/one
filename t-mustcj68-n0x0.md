---
id: t-mustcj68-n0x0
title: Prepare One v2 stable release resolver and artifacts
status: done
labels:
- branch:fix/one-v2-stable-release
- lane:one-launch-stable-release
- umbrella:launch-one-tamagui
- umbrella:plans/one-v2-stable-release.md
backend: git
created_at: 1791057426704
updated_at: 1791058035555
field_marks:
  active_form: 1791057426704
  body: 1791057973722
  claim: 1791057426704
  evidence_summary: 1791057426704
  parent: 1791057426704
  priority: 1791057426704
  recovery_ref: 1791057426704
  status: 1791058035497
  title: 1791057426704
---
Parent r54299. Review branch fix/one-v2-stable-release, managed ~/.worktrees/one-launch-stable-release. Initial base 347cbb759e5e0c7d683c8d5cf49e27a171089f2c, synced base 920c2f8213cd9cdb58cfeb839b5cfd4b0c1ab912. Source fix 61ade49bc, plan/proof 6eeed25d1, candidate manifests 7d50e655d (v2.6.0). TESTED: 15 resolver tests, 13 publish tests (npm fake workspace dry-run only), 9 actual source selection cases, 66 manifest comparisons, 65 workspace-only lock updates, frozen offline lock validation, oxlint/format/diff checks. RAN: all 24 publish names returned HTTP 404 for candidate; legacy one 2.5.2 metadata dates April 18 2013. No build/full CI/npm publishing/stable workflow/tag/main push. Parent owns final assembled source/full Checks and Tests, sibling CLI integration, Nate-approved starter/main/stable actions. Evidence and next steps: plans/one-v2-stable-release.md and evidence JSON. REVIEW: none, assigned prior Opus problem/candidate assessment.
