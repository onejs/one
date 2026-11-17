---
id: t-mv7apqlm-168i0
title: Complete One v2 launch acceptance
status: done
owner_status:
  state: landed
  text: V2 launch publication and exact native dependency delivered; broad parity/Peach acceptance continues under s43018
  updated_at: 1792086228853
assignees:
- s38453
labels:
- lane:one-v2
- umbrella:plans/contrast/mobile-app/one-v2-launch.md
backend: git
sessions:
- s38453
commits:
- 62bd933698eda8ab7ed9c7662dfb95de9c98e13d
created_at: 1791933122794
updated_at: 1792086228853
field_marks:
  active_form: 1791933122794
  body: 1792086228853
  claim: 1791933122794
  commit_linked:62bd933698eda8ab7ed9c7662dfb95de9c98e13d: 1791933802560
  evidence_summary: 1791933122794
  owner_status: 1792086228853
  parent: 1791933122794
  priority: 1791933122794
  recovery_ref: 1791933122794
  status: 1792086228853
  title: 1791934334739
---
Publication accepted and records landed on Contrast main as 62bd933698eda8ab7ed9c7662dfb95de9c98e13d. RAN: normal landing checks, remote ancestry and both original document blobs verified. TESTED: live homepage badge opens v2 blog; public blog index and RSS list it; rewritten Text Input and Storage pages expose Usage and How it works at 390 wide without table overflow or browser errors. RAN: exact npm One, vxrn and MDX 2.6.17 tarballs pass SHA512 and tagged-source checks; 4345 packaged files match. Earlier complete 94-page rewrite and 363 native documentation tests are REPORTED author evidence, not rerun here.

Final dependency: t-mv4t3ly9-qm00, owner m32754, plan box Native fixture runtime acceptance passes on iOS and Android CI. REPORTED by m32754 on 2026-10-13 23:31Z: closes only when iOS Native Tests is green on One main after PR843 merges, and PR844 Android fixtures job is green. Hosted iOS candidate38484720580 was pending at that report. Physical proof t-mv5sdqat-10n00 is postponed by Nate and does not gate. m32754 will close the acceptance task after both verdicts pass. No duplicate native implementation or CI watcher.

Evidence and continuation: ~/.team-machine/results/one-v2-owner.md and one-v2-owner/{live-publication,released-artifacts}.json. Inspected and shared once: 3x q90 mobile WebP1170x2532/130920bytes. All task browsers/servers/simulators/helpers stopped or never started; transient savepoint ref removed. Check runner cache is tool-managed. Tooling defect t-mv7aznfx-1nil0 records the measured251.2s isolated install for documentation publication. One source unchanged; no One main write, stable release or public API change. One CI remains s37966; native acceptance m32754; separate Railway deletion remains blocked on authentication.

RAN after w-99cab5 expired once: acceptance task remains in_progress, owned by m32754; PR843 and PR844 remain open. Exact PR843 iOS run38484720580 has three queued jobs on label xcode-27, with blank runner names. Older main run38463413168 still reports Generated SwiftUI bindings in_progress on runner GitHub Actions1000022754, started2026-10-13T23:06:05Z. This observation does not establish the native owner earlier offline-runner inference. REPORTED current CI-owner task t-mv7c78lp-1heb0: PR853 hourly job cap merged74203bee46ee3bae7cd71db12313abca1bac8115, overlong main/localization cancellation requests accepted, successor main iOS38489759569 pending. Existing CI owner s37966 is recovering the queue; no new lane, dispatch, cancellation or monitoring duplication from this owner. The changed cap/cancellation state permits one continued exact acceptance-task wait. Physical proof remains postponed. No terminal native verdict yet.

RAN: w-e0556e expired with t-mv4t3ly9-qm00 still in_progress, matching earlier w-99cab5. Read current owner and CI records once: m32754 still owns native work and sharded Android fixtures; s37966 owns queued main iOS and required delivery. Sent m32754 one expiry blocker notice requesting final iOS-main plus Android-fixture evidence on task closure. No third task wait, alternative watcher on the same condition, CI dispatch, duplicate repair or release request. This launch umbrella remains blocked; publication/source validation remains complete. Continuation waits for owner mail or an actual changed prerequisite.

Nate approval relayed2026-10-14 by daily sweep r92256: to "One 2.7.0 is approved but npm still serves 2.6.22: tell one-v2-owner to publish?", answered "4 yes". Child task t-mv89wqm9-c970 owns existing stable Release38588941986 follow-through and exact npm verification. No One source/main write or duplicate release dispatch. Existing native acceptance remains separately owned by m32754/s37966.

RAN approved One2.7.0 publication now complete: Release38588941986 success, npm latest2.7.0, stable v2.7.0 tag and exact tarball source c3cd8830a7de8c60de78420b946a6ee56ef01ea0. One/vxrn/MDX integrity checks and4396 packaged file matches verified; t-mv89wqm9-c970 done, result shared. Native umbrella acceptance remains with m32754/s37966; this release did not establish additional native runtime proof.

RAN s43018 read this task terminal requirement, native repairt-mv4t3ly9-qm00, delivered Contrast main5386af588fb and credits taskt-mv8gix4g-1yuo0. RELAYED native-owner verdicts: One main iOS38711397920/342a602b0 and all Android fixtures38713496836/377e036b1 close the exact final dependency; native repair task now done. Existing publication/release receipts here remain accepted, no new stable release or website/runtime replay. INFERRED launch-cutoff acceptance is complete; no claim that full One parity, Peach motion/platform, physical proof or V2.1 deferrals are complete. Contrast documentation reconciliation2d3168ead64 is pushed/queued, not yet claimed landed. Manager s43018, CI router p87604.
