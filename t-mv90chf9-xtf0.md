---
id: t-mv90chf9-xtf0
title: Repair Android CI compose-assist-chip-click and pager-drag-back
status: canceled
labels:
- android-compose-ci
- ci-repair
backend: git
created_at: 1792036640565
updated_at: 1793089848441
field_marks:
  active_form: 1792036640565
  body: 1793089848441
  claim: 1792036640565
  evidence_summary: 1792036640565
  owner_status: 1792036640565
  parent: 1792036640565
  priority: 1792036640565
  recovery_ref: 1792036640565
  status: 1793089848441
  title: 1792036640565
---
CI owner: ci-manager (router p86663). Failing run 38671525595 at fe05135 (#844): compose-a compose-assist-chip-click 15s timeout; proof pager-drag-back 15s timeout (selected:2/slide2 unmet, idle held). Checkout tm/android-compose-ci at 7754162d: app code identical to fe05135 for android+fixtures+platform (verified); failures NOT already repaired.

VERDICT no-fix both (no One-source defect proven; no diff; no PR). Same-code success run 38671759156 (596d07fd=fe05135+unrelated 405 fix) passed both on identical geometry: intermittent harness/device races, 2 fails in 3 runs each.

CHIP evidence: tap at chip center (240,384) fired home blur-proof row onPress 65ms later (our run) and 30ms later (sibling run 38674362032, same coords/destination); single input, no crash/reload/second tap (full adbd audit). Fabric misdelivery refuted: chip emits topNativeComposeNodeButtonPress tag-scoped to its ComposeNode; TouchableOpacity.onPress cannot fire from it (name/prop mismatch, bubbling stays in chip ancestors). Remaining class: dump-to-tap race (harness); exact trigger unproven (row-Y paradox). Recommend harness lane add pre-tap screen verification (no assertion change), owned by ci-manager.

PAGER evidence: our run forward passed (input swipe) / back failed (stayed 3, idle); sibling run with stepped motionevents (tight 20-70ms gaps, well-formed full-width drag over stage) failed FORWARD (stayed 2, idle) => event-count theory refuted. TextInput-intercept refuted (no focus/keyboard in either failure shot). Programmatic sets always pass; drag path is stock ViewPager2. Sibling lane m34137 owns drag work (branch tm/one-pager-drag-steps); this evidence is for them. No conflicting edit made.

PROBE: standalone pre/post-capture probe authored at /tmp/chip-pager-probe/probe.ts + run.sh (NOT run: heavy refused locally with CPU idle 0%, load 40/18 all legit co-tenant work; CI APK is x86_64-only so local arm64 needs a rebuild; worktree dist 8 days stale; no One checkout on remote builder beast). Evidence retained: /tmp/ci-38671525595.log (failed log, once-fetched), /tmp/ci-38671525595/*, /tmp/ci-38674362032/*, /tmp/ci-38671759156/*.

Intended checks were targeted native controls for these 2 only (no broad matrix); Button/Card/TCC/Home and Contrast internals untouched. Production followup: none (test-only flakes; no prod behavior implicated). No landing/CI wait; parent s38220 reviews.

Team Machine canceled this task: untouched for 7+ days with no live assignee. Reopen with `tm task update t-mv90chf9-xtf0 --status open`.
