---
id: t-mv9xluxt-2700
title: Prove and fix discovery-order export-kind promotion in Rolldown
status: done
assignees:
- m34592
labels:
- lane:metro-to-one
backend: git
sessions:
- m35770
created_at: 1792092505313
updated_at: 1792097640964
field_marks:
  active_form: 1792092505313
  body: 1792097372374
  claim: 1792097640964
  evidence_summary: 1792092505313
  owner_status: 1792092505313
  parent: 1792092505313
  priority: 1792092505313
  recovery_ref: 1792092505313
  status: 1792097471870
  title: 1792092505313
---
Bounded public upstream slice under Contrast parentm34592. Parent RAN exact One CLI library output can differ between InitializeCore CommonJS/ESM wrapper while695 final module inputs/dependency graph match. Parent read official current Rolldown determine_module_exports_kind.rs: importer_indices iterates module_table discovery indices and first Import promotes ExportsKind::None toEsm while first Require promotes toCommonJs. sort_modules already runs before this pass. INFERRED cause; must prove controlled source/discovery order counterexample before fix. Build minimal public Rolldown regression with opposite completion-order barrier, no sleep-based qualification; both outputs execute side effects once, exact-byte mismatch baseline. Repair source at owner using existing deterministic execution order or equivalent preserving semantics, run focused upstream tests, preserve diff/evidence/pushed branch. No private Contrast source, generic native source, PR11206 carrier-sort duplication, weakened equality, output normalization, stable release, credentials or upstream main push. Parent owns any authorized PR; reviewer none for this bounded worker, parent handles assigned reviews. CI owner ci-manager. Clean own services/worktree; finish handoff under4KB.

RAN parent minimal public reproduction now fails exact equality: entry imports left/right aggregate modules, each imports esm/cjs importer; both touch unknown-format init containing require(setup), cjs uses original try/catch. Reversing25ms aggregate load completion changes importer discovery indices and output911vs1394bytes, while both vm executions report setup exactly once. Parent original direct-root importer probes stayed equal because root importer indices were already fixed. Repro public-only saved /Users/n8/one/scripts/tmp/rolldown-exports-order/repro.mjs; official v1.2.13 source alongside. Replace delay with deterministic barrier for durable upstream regression, then fix discovery-index promotion order.

Done: reverse exec_order fix plus tokio barrier regression. Base v1.2.13 f7de35f, fix 90e29cb, patch and logs in scripts/tmp/rolldown-exports-order/logs/ (fail-before 101 mismatch, pass-after 0 equal plus setup-once plus swapped, cjs_compat 53/0). No upstream push; parent owns PR. Clone retained at ~/.worktrees/one-rolldown-exports-order (target/ cleaned, hook blocks full removal).
