---
id: t-mv9bpv8q-1arh0
title: Review landed One native parity fixes
status: done
owner_status:
  state: needs
  text: 'review complete; pager fix PR #905 awaits owner merge; ci-manager owns native CI'
  updated_at: 1792056393968
assignees:
- r95953
labels:
- branch:tm/one-pager-native-touch-id
- lane:one-native-parity-review
- umbrella:plans/one-native-launch.md
backend: git
sessions:
- r95953
commits:
- 737bfef54
created_at: 1792055740778
updated_at: 1792056393968
field_marks:
  active_form: 1792055740778
  body: 1792056393968
  claim: 1792055740778
  commit_linked:737bfef54: 1792056362345
  evidence_summary: 1792055740778
  owner_status: 1792056393968
  parent: 1792055740778
  priority: 1792055740778
  recovery_ref: 1792055740778
  status: 1792056393968
  title: 1792055740778
---
Assigned review of 322e913d24b, 342a602b0, ddca4e2c9 and PR 903. Read diffs and native senders, run focused defect probes, report verdicts and falsifiers. Primary checkout stays unchanged. CI owner: ci-manager. 2026-10-15: inspecting landed code and running sync regression suites.

RAN 18 sync adapter tests and 14 sync store tests pass; both late-event tests fail on parent source (p instead of pa). RAN helper command traces and 41-suite partition. INFERRED adjacent defect from ViewPager2 1.1.0 constructor plus RN 0.87.1 ancestor algorithm: empty pager can route touches through its generated native recycler ID. Fix will clear that ID; pager saved state is already disabled. Native device unavailable. Exact Compose 1.11.4 saved-state namespace caveat is recorded in the review.

Completed: handoff /tmp/one-native-review-r95953/handoff.md (3847 bytes). Fix pushed as 737bfef54, https://github.com/onejs/one/pull/905; primary checkout unchanged. Expected native check: test-native-android.yml build-android-native. Validation: installed RN ancestor algorithm on view records, mounted-page interaction, 32 passing sync tests, 2 parent-code late-event failures, drag command traces, 41-suite semantic matrix comparison, git diff --check. No native compilation/device replay; ci-manager retains CI ownership. Clean pushed worktree removed.
