---
id: t-mvduik16-178k0
title: Rerun blocked One iOS screen proofs on the a622710f6 canary
status: done
owner_status:
  state: landed
  text: reruns recorded on coverage branch at 3e18d10f29d; all four blocked before capture, resolver/seam follow-up owned by lead s50803; CI owner ci-manager
  updated_at: 1792333636607
assignees:
- s51960
labels:
- one-ios-sdk
- pr-961
parent_id: t-mvd7hx3j-14wo0
backend: git
sessions:
- s51960
commits:
- 3e18d10f29d
- 4c660a7e263
created_at: 1792329177066
updated_at: 1792347471579
field_marks:
  active_form: 1792329177066
  assigned:s51960: 1792329547068
  body: 1792347471579
  claim: 1792333773983
  commit_linked:3e18d10f29d: 1792333589774
  commit_linked:4c660a7e263: 1792333635771
  evidence_summary: 1792329177066
  owner_status: 1792333636607
  parent: 1792329177066
  priority: 1792329177066
  recovery_ref: 1792329177066
  status: 1792333636607
  title: 1792329177066
---
RAN: fetched coverage branch 525bc77da03; four proof fixtures and inventory are not on main. Proof work uses own worktree branch tm/one-ios-proof-runs based on coverage source, with results to be carried separately to main. npm pack manifest verified exact version 2.0.0-0.canary.1792325518700, releaseSourceCommit a622710f6d4425e764d8b09e75eb4b1a8258ed06. Catalog family pins updated in worktree. Dependency install PID 40303, log scripts/tmp/one-ios-proofs/install.log.

RAN: exact canary installed, frozen lock dry-run passed. Pin commit is executing repository precommit hooks. Detached batch PID 71874 waits on exact pin-commit process exit, refuses dirty package/lock state, then runs ViewSlots, Destination, NavigationChrome and Readers sequentially with IOS_SIM_SUFFIX=-Conformance-s51960, separate logs/output/exit receipts in ~/.team-machine/results/one-ios-proofs-s51960. Existing cached library lock owner 75804 is dead. Lead correction applies: fast-forward coverage branch only, no main landing.

RAN at 19m: pin committed 4c660a7e263, batch still in first case native app preparation on MacBook-Pro-9-contrast builder. Local evidence is one 24 MiB log; no finished proof or own Maestro TMPDIR exists to prune. studio free space 69 GiB. Existing wait w-01ea43 remains armed.

RAN: OneNativeViewSlotsLibraryCase exited 1; evidence /Users/n8/.team-machine/results/one-ios-proofs-s51960/OneNativeViewSlotsLibraryCase. Screen verdict pending log inspection.

RAN: ViewSlots failed before capture, native app authenticated (digest 84d9c1df6268ffa6c63e8f44a3a8efcad27121e2a0c79c150671b22f967229fd), then Peach engine tenant bundle fails: one/ios/Foundation and one/ios/UIKit not exported for [react-native, import]. Exact log ViewSlots runner.log:154549-154560. Destination encounters same failure runner.log:1368-1385. No screenshots/Maestro steps exist. Lead s50803 notified once; no One source edits.

RAN: OneNativeNavigationDestinationLibraryCase exited 1; evidence /Users/n8/.team-machine/results/one-ios-proofs-s51960/OneNativeNavigationDestinationLibraryCase. Screen verdict pending log inspection.

RAN by s51960: ViewSlots and NavigationDestination paired proofs stop before capture; Peach tenant rolldown cannot resolve one/ios/Foundation and one/ios/UIKit (canary a622710f6). TESTED cause by source: nine unified module backend.ios.ts files import per-app generated facades that only One's Vite/Metro resolver provides. Needs a Peach compat owner for one/ios/* imports; coordinator message to pro-128 timed out twice (federation, tm-defect t-mvdv1tp5-2cl0).

RAN: OneNativeNavigationChromeLibraryCase exited 1; evidence /Users/n8/.team-machine/results/one-ios-proofs-s51960/OneNativeNavigationChromeLibraryCase. Screen verdict pending log inspection.

RAN: OneNativeReadersLibraryCase exited 1; evidence /Users/n8/.team-machine/results/one-ios-proofs-s51960/OneNativeReadersLibraryCase. Screen verdict pending log inspection.

## Canary proof rerun, 2026-10-18

RAN for task `t-mvduik16-178k0`, source `4c660a7e263` on
`tm/one-ios-proof-runs`: all four paired attempts were blocked before the
first screen mounted. One and its package family were pinned to
`2.0.0-0.canary.1792325518700`. The downloaded npm tarball and installed
manifest both identify `releaseSourceCommit`
`a622710f6d4425e764d8b09e75eb4b1a8258ed06` (release branch `tm/one-sdk-docs`).
The preserved manifest is `one-manifest.json` in the evidence root below.

Command for each case, run sequentially with `XDG_CACHE_HOME=$HOME/.cache`
and `IOS_SIM_SUFFIX=-Conformance-s51960`:

```sh
mise exec -- bun scripts/conformance/proof.ts --suite library --target both --grep <Case> --out <evidence-root>/<Case>/proof
```

Evidence root on studio-64:
`/Users/n8/.team-machine/results/one-ios-proofs-s51960`.
Each case directory retains `runner.log`, `exit-code`, and its incomplete
attempt directory, including `native-app.json`, `capture-context.json`,
`source-fingerprint.json`, and test-results output. Log line numbers below
are one-based in that case's `runner.log`.

| Case | Result | Exact failure lines | Preserved attempt directory |
|---|---|---|---|
| `OneNativeViewSlotsLibraryCase` | blocked, exit 1 | `runner.log:154413` (Foundation), `runner.log:154418` (UIKit) | `.proof.attempt-AJIlMQ` |
| `OneNativeNavigationDestinationLibraryCase` | blocked, exit 1 | `runner.log:1341` (Foundation), `runner.log:1336` (UIKit) | `.proof.attempt-lsCjnl` |
| `OneNativeNavigationChromeLibraryCase` | blocked, exit 1 | `runner.log:1225` (Foundation), `runner.log:1235` (UIKit) | `.proof.attempt-MfxGsX` |
| `OneNativeReadersLibraryCase` | blocked, exit 1 | `runner.log:1337` (Foundation), `runner.log:1352` (UIKit) | `.proof.attempt-QxPjch` |

The native library app built successfully and was authenticated under cache
key `2c81c1ef3608cc0117cc2ee8515c639ac3a9b4dd38809d17cb7e0d1fd126a3fd`, artifact digest
`84d9c1df6268ffa6c63e8f44a3a8efcad27121e2a0c79c150671b22f967229fd`.
The later three attempts reused that app. All four stopped during the Peach
engine tenant bundle build with nine Rolldown resolution errors. The exact
error is `"./ios/Foundation" is not exported under the conditions
["react-native", "import"] from package .../node_modules/one`; UIKit reports
the same error for `"./ios/UIKit"`. The installed `./ios/*` export has only a
`types` target. No screenshot, Maestro action output, native test verdict,
paired diff, or screen-level failure was produced. Earlier screen-specific
failures and diff percentages remain unverified on this canary.

Owner: the lead `s50803` acknowledged the cross-lane blocker and is routing
the generated-facade resolver and seams to a Peach owner. No One or Peach
compat implementation changed in these attempts. A successful tenant build
followed by paired captures would disprove that this blocker still applies.

Pushed fast-forward origin/tm/contrast-one-ios-coverage 525bc77da03..3e18d10f29d. No active owned simulator claim, capture server or watcher remains. Evidence retained outside worktree at ~/.team-machine/results/one-ios-proofs-s51960 for lead s50803. ci-manager owns delivery follow-up for this branch. Worktree removal and final handoff follow.

Cleanup: tm worktree remove from primary returned kept only by this session agent PIDs 12018,12065,12085,12087,14206; tool says release on session exit. Source clean and pushed. Retained evidence owner s50803; native app cache shared/reusable. No task-owned simulator or capture service was started.

Peach one/ios/* resolver owned by s52221 (per p93227, approved by Nate through the daily sweep); proof reruns come back to s50803 with its commit.

2026-10-18 s50803 chose route (a): One proof cases run in a non-Expo One iOS fixture app built with one prebuild from one exact canary (at or after b117da0f1). Expo plugin SDK generation (b) not taken; it would need Nate's direct approval.
