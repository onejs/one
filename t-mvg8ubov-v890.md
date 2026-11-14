---
id: t-mvg8ubov-v890
title: Fix native iOS DeepLinking failure
status: done
owner_status:
  state: landed
  text: implementation pushed in PR981 for p98336 review, p96184 owns CI; clean tree held only by own wrapper PID31527 until session exits
  updated_at: 1792474824593
labels:
- native
- one
- umbrella:t-mv7sbq1k-14fl0
backend: git
sessions:
- s56782
commits:
- 05172ed90
created_at: 1792474173103
updated_at: 1792474905135
field_marks:
  active_form: 1792474173103
  body: 1792474824593
  claim: 1792474905135
  claim_current:836b6d94f1264b51f86218f5846fe1de: 1792474905135
  claim_state:101e6acea5a7a79d252bd0804b514125:1792474303566:=s56782:=mc-3aa87nk0z4j17:1792474303566:f: 1792474303566
  ? claim_state:4fcce46a596c318991c09be239de85bd:1792474333332:=s56782:=mc-3aa87nk0z4j17:1792474333332:o:101e6acea5a7a79d252bd0804b514125
  : 1792474333332
  claim_state:836b6d94f1264b51f86218f5846fe1de:1792474905135:~:~:~:o:4fcce46a596c318991c09be239de85bd: 1792474905135
  commit_linked:05172ed90: 1792474479303
  evidence_summary: 1792474173103
  owner_status: 1792474824593
  parent: 1792474173103
  priority: 1792474173103
  recovery_ref: 1792474173103
  status: 1792474824593
  title: 1792474173103
---
CI history: intermittent DeepLinking failure in Metro dev native-features job only; general matrix dev/prod x Metro/Rolldown does not run this fixture. Earliest observed exhausted failure is 38820410815, 2026-10-15T22:56Z, before 724135541 waited for prompt. Earlier sampled failures of the workflow have passing DeepLinking results. After prompt-wait fix, 39206724213 passes on retry, 39236982805 fails, 39252059329/39323314350/39341448193 pass, 39366646689 fails. First attempt in 39366646689 presents SpringBoard Open in NativeFeatureTests prompt 05:04:34.983, generic accept returns success 05:04:40.976, but no open URL is delivered. Retry receives UIOpenURLAction 05:05:32.706 and 05:05:34.190 without another prompt. Screenshot remains home, app is alive. INFERRED fixture prompt handling cause, disproved if mobile:deepLink still cannot navigate. Proposed fix uses URL-only mobile:deepLink so OS resolves scheme. Evidence /tmp/one-deeplink-evidence; simulator 52097111-E032-41BC-B819-71AFF66FFD50 claimed. Probe prepared but heavy admission refused due queued quiet window; will wait once for exact admitted probe.

TESTED: first admitted probe on CI-built app with installed One main Metro dependencies passed mobile:deepLink title, ID 456 and /deep-link/456 assertions. Generic alert baseline passed locally, so CI-specific cancellation remains INFERRED. Probe exited at Bun WebdriverIO saveScreenshot unsupported helper. Second probe omitted app-ready wait and found SpringBoard, failed; it was not equivalent to fixture precondition. Final probe restores explicit activation/home-screen wait before URLs 456 then 123 and captures via simctl.

TESTED: final probe-ready.ts exits 0, explicit app activation and home-screen precondition match fixture readiness. mobile:deepLink URL-only dispatch passed Deep Link Test, ID: 456, Path: /deep-link/456; second URL passed ID: 123 and Path: /deep-link/123. Native screenshot captured. CI-built app run39366646689; JS installed One main Metro outputs d0fd3fb48. Original baseline passed locally, so cancellation cause remains inferred from CI. PR https://github.com/onejs/one/pull/981 commit05172ed90. CI router p96184 owns dispatch and follow-up, asked once. Lead p98336 owns review.

Durable evidence copied to /Volumes/Samsung-1TB-990/evidence/one-ios-deeplink-s56782 (screenshot WebP1206x2622 25262bytes, probes/logs/XML/history). PR ready for review; p98336 sent review evidence. Simulator/service cleanup underway.

Cleanup: simulator claim released; owned Metro8081/Appium4731 and WDA8131 stopped. Worktree clean and remote commit verified, but tm worktree remove held it because node PID31527 retains cwd/files. Inspecting holder before final handoff; never kill session infrastructure. Primary checkout advanced to a8c0b5c9c during probe; installed Metro dist provenance was not rebuilt or version-attested, so evidence proves transport/fixture behavior only.

Handoff /Volumes/Samsung-1TB-990/handoffs/one-ios-deeplink-s56782.md. tm worktree remove held clean/published tree because own Codex wrapper31527 has cwd; prune after exit. No sim or service claims remain.
