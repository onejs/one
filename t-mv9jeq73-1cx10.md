---
id: t-mv9jeq73-1cx10
title: Review One 911 and Takeout 77 Tamagui 3.0.14 upgrades
status: done
labels:
- oss-fixer
backend: git
sessions:
- s42583
created_at: 1792068657951
updated_at: 1792069000095
field_marks:
  active_form: 1792068657951
  body: 1792068947065
  claim: 1792069000095
  evidence_summary: 1792068657951
  owner_status: 1792068657951
  parent: 1792068657951
  priority: 1792068657951
  recovery_ref: 1792068657951
  status: 1792068985392
  title: 1792068657951
---
PASS: One #911 and Takeout #77, within the assigned dependency/lockfile review scope.
Reviewed heads: One 524f267d0becf6525b50821752cdc9ee29e1f955; Takeout 720aa58523d7f514f6ecde15e3fe8480aa2e396a.

RAN: gh pr diff for both PRs; fetched base/head manifests and bun.lock from those exact GitHub commits. Compared all 73 One and 7 Takeout package.json files: 52 and 18 Tamagui pin changes, respectively; zero non-Tamagui manifest changes. No remaining 3.0.13 values in either repository's manifests or lock. One has 129 Tamagui lock entries and Takeout 122, all 3.0.14, with zero duplicate resolved Tamagui package names. Workspace Tamagui declarations match manifests.

RAN: queried npm registry version endpoints for all 130 distinct Tamagui packages across both locks: 130/130 published as 3.0.14; lock integrity hashes and dependency/peer/optional dependency metadata match npm. Both locks' other top-level sections differ only by Tamagui version updates.

RAN: Takeout takeout-ui and takeout-native file: lock metadata exactly matches their complete dependency and peerDependency maps. Both base manifests already specify one 2.7.4, while base lock cached 2.7.3; head refreshes that cached peer to 2.7.4. These are the only non-Tamagui values changed in Takeout's lock.

RAN: One's only non-Tamagui lock-entry changes are removal of 23 entries under @tamagui/metro-plugin/. Existing other resolutions and manifest pins remain identical. @tamagui/metro-plugin 3.0.14 broadens metro/metro-resolver peers from ^0.84.4 to >=0.84.4 <0.88.0, matching npm; root Metro remains 0.87.1.
INFERRED: removing the redundant Metro 0.84.6 subtree follows the widened peer range permitting the existing 0.87.1 tree. An incompatible root Metro or an unchanged restrictive peer range would contradict this inference; neither is present.

RAN: baseline controls detect 129/122 old Tamagui 3.0.13 entries and both Takeout cached-peer mismatches, proving the checks detect the old states. No defects or additional simplifications found within scope. No application builds or runtime behavior tested.
Evidence: /tmp/oss-upgrade-3014-review/{one.diff,takeout.diff,audit.json,registry-results.json}; base/head manifest and lock snapshots alongside them. No repository edits, pushes, worktrees, servers or children. No open blockers.
