---
id: t-mvnbro4p-ue10
title: Review Linux host contracts and shared Mac extraction
status: done
assignees:
- s78886
labels:
- lane:one-startup
- umbrella:one-linux
parent_id: t-mvluzwx4-za50
backend: git
created_at: 1792902351337
updated_at: 1792902492339
field_marks:
  active_form: 1792902351337
  body: 1792902492339
  claim: 1792902351337
  evidence_summary: 1792902351337
  owner_status: 1792902351337
  parent: 1792902351337
  priority: 1792902351337
  recovery_ref: 1792902351337
  status: 1792902492339
  title: 1792902351337
---
Read-only review assigned by s72425. Cover 9b92552c77 through tm/one-linux-native tip, Linux native lifetime/threading/input/controlled protocol, shared Mac extraction and JS platform isolation. Source and runtime validation remain s78677; delivery and ci-manager handoff remain s72425. No source edits, builds, installs or VM start.

INFERRED / read-only review complete through e21aec37e4. Changes required: P1 inline text attachment measurement crash; PLAUSIBLE P1 last-window GTK teardown lifetime; P2 duplicate/false hover events, native controls bypass pointerEvents, maxLength zero/UTF-16 mismatch, stale queued image callbacks, closed WebSocket retention, and Mac error literal violating strict byte isolation. Detailed source traces, falsifiers, limits and DRY recommendations: /Volumes/Samsung-1TB-990/evidence/one-startup/linux-review-findings.txt. Identical single findings message sent to s78677 and s72425. No runtime probes/builds/installs/VM operations or source edits. s78677 owns repair and runtime validation; s72425 owns delivery and ci-manager handoff.
