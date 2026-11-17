---
id: t-mvgd3pw4-23tq0
title: Fix explicit native timeline schedule fixture
status: done
owner_status:
  state: needs
  text: p98336 review/merge of PR 983 and p96184 native workflow dispatch/follow-up. Worker implementation and focused validation complete; no CI watch held.
  updated_at: 1792482048691
assignees:
- s57123
labels:
- lane:native
- umbrella:one
backend: git
sessions:
- s57123
commits:
- e2fb9dba2
created_at: 1792481329876
updated_at: 1792482088622
field_marks:
  active_form: 1792481329876
  body: 1792482088622
  claim: 1792481329876
  commit_linked:e2fb9dba2: 1792481941622
  evidence_summary: 1792481329876
  owner_status: 1792482048691
  parent: 1792481329876
  priority: 1792481329876
  recovery_ref: 1792481329876
  status: 1792482048691
  title: 1792481329876
---
Child of Contrast task t-mv7sbq1k-14fl0, lead p98336. Diagnose historical iOS timeline failure, reproduce on claimed simulator, fix cause and submit PR. CI owner p96184.

Timeline investigation

The assertion originated in 1d5227ace6e139ac9df03735bcdd1217db3d27c0 (2026-10-16 22:05 HST). The fixture originally supplied fixed dates at 09:00, 10:00 and 11:00 on October 12 and rendered the native context as an ISO timestamp. On 2026-10-18 at 00:48 HST, fdeede9e8fa14afb189ef29f0d91e44c81b6dc10 changed the fixture to dates relative to mount (-1 hour, +3 seconds, +6 seconds) and an ExplicitTrail component rendering entry indices. Its Maestro reader check was changed to exactly `explicit entries 0 1`; the Vitest assertion and name were left unchanged. That commit makes the old ISO assertion impossible regardless of timer speed.

TESTED: plain SwiftUI, no One or React, iPhone 16 iOS 27 simulator. Three mixed dates produce index 0 then index 1, never index 2. Three all-past dates produce index 1. Probe.swift records the actual content closure dates and renders the index. This contradicts Apple's documented last-entry behavior, but reproduces the fixture's existing comment and Maestro assertion. One's generated native TimelineView calls SwiftUI directly, and its JS binding forwards the native date without choosing an index. There is no evidence to justify a native scheduling workaround.

TESTED: logs fetched once and retained for main runs 39323314350, 39341448193 and PR run 39375861615 all show periodic passing then the stale explicit timestamp assertion failing. Main run 39366646689 instead bailed at Deep Linking before running the timeline tests, so it does not establish a timeline failure.

Apple documentation: https://developer.apple.com/documentation/swiftui/timelineschedule/explicit(_:)

Local validation uses the archived consumer app from PR run 39375861615, source 05172ed90b0ac930a4af24fa7e0c89affcbeba7b, receipt.json and app archive SHA256 retained beside this file. No native rebuild is needed for a test-only assertion repair.

TESTED baseline consumer: baseline99.log, retries disabled, same three Timeline tests: periodic PASS, old explicit assertion FAIL after 10073ms, invalid-schedule PASS. XCUITest page source baseline-timeline.json contains `explicit entries 0 1` in an XCUIElementTypeStaticText child. Its native host is XCUIElementTypeOther with no label or value; Appium getText on the host returns the empty string. The repair must select the host's static-text descendant as well as replace the obsolete timestamp expectation.

The consumer runs from the worktree with installed primary checkout dependencies and the fixture's existing ONE_NATIVE_BUNDLER=rolldown option. The archived app needs Hermes bytecode 99, so HERMESC_PATH points to installed hermes-compiler (260318099.0.4). Local cached pod compiler emits version 98 and cannot run that archived app. No changes to dependencies or bundler configuration are included in the PR.

TESTED fixed consumer: fixed.log, same focused command and archived app, retry=0. All three Timeline tests PASS: periodic 18329ms, explicit 1686ms, invalid schedule 5752ms. The 71 unrelated tests were excluded by --testNamePattern. fixed-explicit.webp is the explicit screen captured by the corrected test; fixed-periodic.webp is its preceding periodic leg. Lint has zero errors and one pre-existing unicorn warning at the unrelated animator regex. git diff --check passes.

PR https://github.com/onejs/one/pull/983 at e2fb9dba2 is pushed and handed to p98336 for review and p96184 for native dispatch/CI ownership. All three focused Timeline tests passed with retry=0. Worktree and simulator cleanup completed; retained evidence owned by lead p98336 at /tmp/one-timeline-s57123.

Cleanup correction: tm worktree remove returned kept due this worker Codex frontend PID 59766 holding its own cwd. Tree is clean and branch fully pushed. Existing Team Machine defect t-mvgbryb6-cuj0 updated. Lead p98336 owns removal after worker exit. Simulator/services are released and stopped.
