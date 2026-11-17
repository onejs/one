---
id: t-mv7hpy8s-1wi90
title: Stop automatic feature patches and encode minor release batches
status: done
owner_status:
  state: landed
  text: One861 and Tam4300 merged; live workflow/instruction bytes verified, fleet rules deployed and peer confirmed. Main publishes no stable; features batch in a reviewed minor; bug-only patches remain standing-authorized.
  updated_at: 1791950343736
assignees:
- p84640
labels:
- branch:oss-fixer/one-2026-10-14-release-policy
- lane:oss-fixer
- umbrella:plans/contrast/one-release-policy.md
backend: git
created_at: 1791944890012
updated_at: 1791952134859
field_marks:
  active_form: 1791944890012
  body: 1791952134859
  claim: 1791944890012
  evidence_summary: 1791944890012
  owner_status: 1791950343861
  parent: 1791944890012
  priority: 1791944890012
  recovery_ref: 1791944890012
  status: 1791950343737
  title: 1791944890012
---
Direct Nate direction2026-10-14UTC: feature work stays together in one reviewed minor release PR; main pushes do not publish stable packages. Preserve branch canaries, objective bug-only patch authorization, exact-source/full CI gates. Remove One auto-main-patch path and protected-main version push; update both repo contracts/docs plus global contract/release skill/oss-fixer definition and deploy fleet context. Review public changes with assigned different-family large reviewer; CI owner oss-fixer. Do not publish a package for this automation/docs policy change.

RAN cancellation confirmed both automatic main releases38500443655/38500785436 completed cancelled. Published fleet context6ef99c56a100657fc7f68e17c6670ed8bd8b0376; deploy-all applied8 online machines,2 offline pending. RAN peer Pro64 Codex global lines116-117 contain feature/minor and bug-only-patch policy. One861 exact85f8bda674852ab67b33d25ec708ce1bb2c83444: six baseline failures;41 release tests pass, root lint0errors and actionlintpass. Public reviewerp84996 active. Private plan publication uses clean managed WT because shared-primary index is busy; co-tenant changes preserved.

RAN fleet context deployment finished and exact new global rules confirmed on Pro64. Public One policy PR861 is pushed and assigned same large reviewerp84996. Two preexisting automatic release runs are confirmed cancelled. No library release will be cut for this policy batch. Private plan/goals publication preserves co-tenant index via separate clean managed worktree.

RAN canonical private plan/navigation constraint/goals row published to Contrast main695e75f70a3 after preserving and integrating incoming commits. Clean publication pre-commit hygiene/board passed and pre-push check:commit green24.2s over only3owned doc paths. Publication worktree cleanup underway. One policy PR861 remains assigned-review/required-CI pending; no package publication requested.

TESTED exact-head large review APPROVED (own41test run +18 independent challenges), required checks/tests38502253555 SUCCESS. RAN normal PR merge6908e531682f88c39abcb3e94bd67ab8101b7f63. GitHub default-branch workflow bytes equal reviewed file; parsed push branches exactly[v2-beta], no main push stable publication. No package release. Private publication tree removed; fleet-sync notified once about preserved shared-primary divergence.

2026-10-14 04:17Z RAN archived canceled Crypto-triggered Release38500443655 log: prepared v2.6.21 sourcee08c1bc6 at02:20:40Z, npm upload One reported success02:26:13Z, canceled02:28:43Z during registry verification. Actual registry first exposes21 at02:34:27Z; all24family packages now present with that source. Cancellation prevented remaining tag/source steps but could not undo uploaded artifacts. Current merged workflow has no main stable trigger; stableminor remains explicit owner-held. Preserved original logs/tarball/family registry evidence in /tmp/oss-fixer-one21-*.
