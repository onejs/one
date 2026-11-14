---
id: t-mvlqc374-1e2i0
title: Preserve desktop composer drafts when opening a shared document
status: done
owner_status:
  state: landed
  text: main 79848e8286; source/capture review approved; native document/switch/clear proof retained; CI p103700
  updated_at: 1792806547599
assignees:
- s72737
labels:
- lane:one-macos
parent_id: t-mvlcdlx0-4px0
backend: git
commits:
- fa2714456d4ffa4bf5fab11e9f95d120d7e8a4f6
created_at: 1792805886256
updated_at: 1792806547599
field_marks:
  active_form: 1792805886256
  assigned:s72737: 1792806027892
  body: 1792806547599
  claim: 1792805886256
  commit_linked:fa2714456d4ffa4bf5fab11e9f95d120d7e8a4f6: 1792806385660
  evidence_summary: 1792805886256
  owner_status: 1792806547599
  parent: 1792805886256
  priority: 1792805886256
  recovery_ref: 1792805886256
  status: 1792806384407
  title: 1792805886256
---
Lead actual native proof: own draft AXValue set and read back, opening own Markdown chip and returning to chat loses draft. Source Composer.tsx stashes only on sessionId change, not unmount; share stage replaces Composer. Use existing running app/probe to falsify and fix lifecycle at owning desktop Composer, preserve attachment and voice state semantics, no sends/owner flags. Existing user native Mac content-first scope requires draft preservation. No new UI tests, native rebuild or dependency installs. Lead reviews source/captures, CI p103700 broader checks.

Lead approved actual source and light/dark captures; independent current native read confirms own cleared draft remains empty, inactive app/cursor unchanged. Normal tm land pushed main 79848e82867279ed1cf17783e7ccb5ec9751572a. Evidence draft-preserve/lead-review.md and land-receipt.json. No attachment runtime/mobile/GPUI claim. CI p103700 owns broader workflows.
