---
id: t-musr7k8t-3id0
title: Assemble One launch docs with durable theme patch
status: done
labels:
- branch:launch/one-v2-docs-assembled
- lane:launch-docs-assembled
- umbrella:plans/one-v2-launch-2026-10-03.md
backend: git
commits:
- 9ea80d28b3d1843282df5855947faa694e2e90f5
- b834121f318c4630019217c3fb759716961be9b0
created_at: 1791053835581
updated_at: 1791054918301
field_marks:
  active_form: 1791053835581
  body: 1791054918301
  claim: 1791053835581
  evidence_summary: 1791053835581
  parent: 1791053835581
  priority: 1791053835581
  recovery_ref: 1791053835581
  status: 1791054918257
  title: 1791053835581
---
Completed and pushed origin/launch/one-v2-docs-assembled at9ea80d28b3d1843282df5855947faa694e2e90f5; source fix b834121f318c4630019217c3fb759716961be9b0, based on34eaf72da. Managed worktree ~/.worktrees/one-launch-docs-assembled clean and preserved. TESTED verified npm2.6.2 tarball, fresh original/patched separate Bun caches, root installed five-file patch hashes and frozen lock install. Original source2SSR tests fail, patched3tests pass including root Strict Mode rerender with host retained. Original CJS+ESM fail; patched both pass. TESTED18 required route observations plus2 native index observations all200 mounted zero errors/doubled spans/overflow. RAN170-page site build; site typecheck;10 strict snippets;143 served links/anchors across90 routes;5RSS tests and draft exclusion. Existing extractor errors remain; workspace dist reused from same source base, no full monorepo/native device claim. Artifacts, nine-page full blog PDF, desktop/mobile full PNGs, JSON proofs and scripts ~/Library/Caches/one-v2-launch-assembled/; plan assembly section pushed. Handoff ~/.team-machine/handoffs/launch-one-docs-assembled.md. Parent owns share/approval/publication/CI. No main push, release, starter/CLI changes, spawns or Nate share. Owned preview stopped, browsers closed.
