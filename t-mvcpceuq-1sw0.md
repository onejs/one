---
id: t-mvcpceuq-1sw0
title: Fix Windows prebuild, DevTools URLs, and stale Expo plist patch
status: done
owner_status:
  state: landed
  text: PR953 merged 9f5b0ade2b93e3e27e9438e526511c55e1d40528; evidence/credit preserved; no owned windows/services; tm remove held only by own runtime, releases on finish exit; native CI p93577
  updated_at: 1792263677937
assignees:
- s50424
labels:
- lane:oss-fixer
- umbrella:oss-fixer
backend: git
sessions:
- s50424
commits:
- f65b5cd46
- f65f50d77e4fd000f7246248440084043928307c
created_at: 1792260026162
updated_at: 1792263677937
field_marks:
  active_form: 1792260026162
  body: 1792263677937
  claim: 1792260026162
  commit_linked:f65b5cd46: 1792260153675
  commit_linked:f65f50d77e4fd000f7246248440084043928307c: 1792262287675
  evidence_summary: 1792260026162
  owner_status: 1792263677937
  parent: 1792260026162
  priority: 1792260026162
  recovery_ref: 1792260026162
  status: 1792263677937
  title: 1792262287813
---
Scope: only One PR 952 Windows prebuild; coordinator r104486 owns review assignment; CI p93577; native proof s43018 and releases s47560 untouched. Reproduce before repair, slash/backslash Android destination and Kotlin package controls, nearby separator checks. Push oss-fixer/one-2026-10-17 for review; no merge/release. Retain clean pushed managed tree. Handoff ~/.team-machine/coordinator/updates/oss-windows-prebuild.md.

TESTED: original regression 2 backslash failures/2 slash passes; fixed 4 focused passes without config; full file 71 passes with external current-source utils manifest alias (shared installed dist stale). Targeted lint, check:proofs, whitespace passed. RAN: build refused by quiet-window admission, never started. macOS explicit path simulation only. Source f65b5cd466a5d3817f2a0e43c870aad2d59861be; expected checks.yml. Clean pushed managed tree retained for parent review; no owned services/waits; staleness check ran once. Handoff ~/.team-machine/coordinator/updates/oss-windows-prebuild.md. Parent owns untracked Contrast direction plan integration.

Owner approval, 2026-10-17: "I approve this shared item “Windows prebuild fix ready for review — github.com” (share share-url-s50424-93591e16a5a88b51-1a14b082502-d6de5904d5122cb7)." Scope: approval of shared PR 953 outcome; original coordinator assignment retains independent large-model review and no merge/release in this lane.

2026-10-17 parent expanded scope to outside PR954 DevTools wildcard-host URL bug, verified author NikhilRW. Preserve Windows fix/tests; no new committed UI tests. Reproduce actual middleware/browser launch path with disposable probe, carry one-line normalization into PR953; parent sends newhead to SAME reviewer s50436. No merge/release or native build.

TESTED DevTools: actual Vite plugin and RN middleware, disposable WebSocket target, POST /open-debugger captures real launcher URL. Before wildcard yields 0.0.0.0, booleans/undefined leak into URL; after all map to localhost, explicit127.0.0.1/localhost unchanged. Config host/listener and selected port preserved. Playwright opens generated localhost URL HTTP200, React Native DevTools title, selects Sources tab, no pageerror; WebP inspected. macOS wildcard also loads, so no reproduced Windows browser-failure claim. Existing plugin test plus unchanged prebuild test file:72 pass with current-source manifest alias; new UI tests not added. Plist before: installed0.10.1/xmldom0.9.12 rejects ordinary/BOM/whitespace/BOM+whitespace due missing MIME. Local install refused queued quiet window, beast SSH public-key refused, ci-64 available; admitted remote manifests+patches fixture install(ignore-scripts) now runs.

TESTED: actual middleware open-debugger URL before/after, five host/listener/port controls, Playwright frontend HTTP200 and Sources/Welcome interaction, inspected WebP. No new UI tests. Existing plugin/prebuild files72 pass with current-source manifest alias. Installed Expo plist before fails all4 valid variants MIME; actual admitted ci-64 Bun1.4.2 root-workspace-manifest/patch fixture install and frozen(ignore-scripts) pass, all4 valid variants parse, invalid root/non-string reject, frozen lock identical. Existing patch bytes and all security resolutions unchanged; root lock adds only patch entry. Targeted lint/check:proofs/whitespace pass. No lifecycle/full-build/Windows-native claims. Remote fixture removed; clean pushed tree retained owner r104486. Full handoff ~/.team-machine/coordinator/updates/oss-windows-prebuild.md; evidence nearby. SAME reviewer s50436 must review newhead; previous head review does not cover extension.

2026-10-17 RAN GitHub confirms MERGED. Coordinator r104486 reports sole-reviewer s50436 and required checks/tests success; remaining native fixtures CI p93577. No release. External merged-source.patch preserves source/Co-authored-by. tm worktree remove from primary returned kept solely own runtime PIDs98362,98389,98402,98404,99613 and explicitly releases at session exit; registration still present until exit. Owned windows/pending empty, prior probes/services/remote fixture cleaned. Final handoff ~/.team-machine/coordinator/updates/oss-windows-prebuild.md under4KB. Parent already shared merged batch, no duplicate share/mail.
