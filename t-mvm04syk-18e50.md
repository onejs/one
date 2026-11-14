---
id: t-mvm04syk-18e50
title: Review nonblocking Mac appearance lookup
status: done
owner_status:
  state: landed
  text: corrected atomic appearance source integrated and pushed on held feature branch
  updated_at: 1792823163489
assignees:
- s69213
labels:
- lane:one-macos
- umbrella:native-macos
parent_id: t-mvlx2lt8-ujo0
backend: git
created_at: 1792822342556
updated_at: 1792823163489
field_marks:
  active_form: 1792822342556
  body: 1792823163489
  claim: 1792822342556
  evidence_summary: 1792822342556
  owner_status: 1792823163489
  parent: 1792822342556
  priority: 1792822342556
  recovery_ref: 1792822342556
  status: 1792823163489
  title: 1792822342556
---
Offered author s72425 source6af9445f59, current integrated1ef63021b8. Lead Codex independently reviewing Opus source: per-host atomic initialization/publication, main appearance events, runtime lifetime and multiple roots/reload. Author reports Release fixture195->139ms median, eval27->10ms in two12-interleaved-run sets; author-only performance proof. Read source seeds NSApp appearance at start, events use root effectiveAppearance; one disposable real AppKit probe checks different forced root before accepting. No consumer/native builds or global settings changed. CI103700 normal pushes, featurePR1027/stable held.

Lead source review finds start seed NSApp.effectiveAppearance differs from root appearanceDidChange input. TESTED one real AppKit probe NSApp light/dark root dark/light root light. INFERRED forced dark root gets dark event cache, reload start resets cache light until another appearance event; no actual-host reload claimed. Routed bounded seed-from-_view.effectiveAppearance followup to author with requested forced-root/reload isolation proof. Atomic init-before-runtime binding, weak host promotion and per-host lifetime otherwise read clean. Source current1ef unchanged, no consumer/native build/cache changes. Probe/log appearance-startup-review. Author owns repair, lead exact reply wait.

RAN bounded Codex recheck approves author5538cf4111: start now seeds _view.effectiveAppearance, matching updates. Read author seed-old/new.log: old dark root becomes light after reload; corrected dark root dark at load/+500ms/reload/+500ms and separate root light. Logs include missing AppRegistry/device emitter because scratch JS deliberately has no UI/app registry; getter/reload values only, not full rendering/event-consumer acceptance. Original normal fixture/performance6af author-proof separate. Fast-forward preserves6af9445f59+5538cf4111, clean/pushed exact5538cf4111aae95459a482b4128cecb0fe75e624, diff check passes. No lead native rebuild, consumer/cache mutation or timing repeat. Evidence appearance-startup-review/recheck.md + copied logs. Actual containing SDK/startup acceptance t-mvlxc4mp-1lmr0 follows one new source5538 branch canary through existing serial publisher; CI103700 owns delivery. OnePR1027/main/stable held.
