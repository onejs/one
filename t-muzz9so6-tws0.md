---
id: t-muzz9so6-tws0
title: 'clientTreeShakePlugin.ts: adjacent leading server exports leave an invalid comma'
status: canceled
assignees:
- r87137
labels:
- sweep-review
priority: 3
backend: git
created_at: 1791490639974
updated_at: 1793089884924
field_marks:
  active_form: 1791490639974
  assigned:r87137: 1791816890631
  body: 1793089884924
  claim: 1791490639974
  evidence_summary: 1791490639974
  owner_status: 1791490639974
  parent: 1791490639974
  priority: 1791490639974
  recovery_ref: 1791490639974
  status: 1793089884924
  title: 1791490639974
  unassigned:p67085: 1791816890631
---
RAN: reviewed SHA 213e0f1ca18c75ac25230d3d609c6d6d043a0aa0 changes clientTreeShakePlugin.ts declarator range replacement. Command: bun scripts/tmp/sweep-review-2026-10-08-3-n2/tree-shake.ts, exit 1. Valid input: export const loader = () => null, generateStaticParams = () => [], kept = 1; export default () => <div>{kept}</div>. Actual output begins export const , kept = 1;; and oxc-parser reports Unexpected token at column 14. Control with kept between the two removed exports parses with zero errors. Actual touched source was byte-compared against origin/v2-beta before import.

RAN baseline: bun scripts/tmp/sweep-review-2026-10-08-3-n2/tree-shake-baseline.ts imports the exact parent blob (only its constants import is relocated into scripts/tmp). The parent also emits export const , kept = 1; and the same Unexpected token. This is an inherited defect in the reviewed slice, not a regression introduced by 213e0f1ca. The focused trailing-declarator multiline check still parses and preserves lines.

INFERRED from server declarator removal at lines 706-720: independently removing adjacent leading declarators leaves their trailing separator before the first kept declarator. Nearby non-export exclusive-server declaration pruning uses the same predecessor-based range scheme. Fix direction: remove contiguous runs with separators chosen relative to the retained declarators, and retain newline counts for the combined source ranges. Verify adjacent leading removals with a real parse and retained export, extending the existing transform suite. If fixed, this valid route compiles and parses with zero errors. tm why commit returned no session links; exact trailer names p67085, and tm show record p67085 reports live=true. No source edits, commits, pushes or mail.

Team Machine canceled this task: untouched for 7+ days with no live assignee. Reopen with `tm task update t-muzz9so6-tws0 --status open`.
