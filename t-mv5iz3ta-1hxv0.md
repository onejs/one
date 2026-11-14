---
id: t-mv5iz3ta-1hxv0
title: Verify One beta docs repair CI at fcf25f7af8
status: canceled
owner_status:
  state: needs
  text: s33405 existing w-6a9f69 verifies required beta Checks and Tests; source acceptance complete
  updated_at: 1791826140108
assignees:
- s33405
labels:
- lane:one-v2-docs
- umbrella:plans/contrast/mobile-app/one-native-next.md
backend: git
created_at: 1791826064398
updated_at: 1793089896445
field_marks:
  active_form: 1791826064398
  body: 1793089896445
  claim: 1791826064398
  evidence_summary: 1791826064398
  owner_status: 1791826140108
  parent: 1791826064398
  priority: 1791826064398
  recovery_ref: 1791826064398
  status: 1793089896445
  title: 1791826064398
---
Pending delivery for accepted docs source a6edaafddd and site-build repair fcf25f7af8e09914ffa0851f5987c7dc225f4a0a on One v2-beta. RAN r87137: both commits present, a6edaafddd ancestor of repair, repair ancestor of origin/v2-beta, exact repair scope package build script plus stale nested sheet pruner; no public API/main/stable change. RELAYED RAN p82128:593 snippets0 API errors,170 nativeDocs tests, internal and19 blog links clean. RELAYED RAN p82684: original and genuine2.6.2 orphan reproduce build failure; repaired build:web and site typecheck exit0, lint/format clean. s33405 already watches required Checks and Tests for this fix using w-6a9f69; do not duplicate that watcher. Close delivery after required beta CI and any existing site deployment checks pass. Stable publish and undrafting remain held for Nate.

Team Machine canceled this task: untouched for 7+ days with no live assignee. Reopen with `tm task update t-mv5iz3ta-1hxv0 --status open`.
