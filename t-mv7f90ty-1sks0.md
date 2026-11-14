---
id: t-mv7f90ty-1sks0
title: Recover missing One2.6.18 stable registry artifact
status: done
owner_status:
  state: landed
  text: Stable2.6.19 recovered via PR858; npm latest2.6.20; both tarballs source/content verified.
  updated_at: 1791945145013
assignees:
- s37966
labels:
- branch:tm/release-reserved-version
- lane:one-release-recovery
- umbrella:one-ci-owner
backend: git
created_at: 1791940740982
updated_at: 1791945145053
field_marks:
  active_form: 1791940740982
  assigned:m32844: 1791941297375
  assigned:s37966: 1791941618642
  body: 1791945145053
  claim: 1791941618773
  evidence_summary: 1791940740982
  owner_status: 1791945145053
  parent: 1791940740982
  priority: 1791940740982
  recovery_ref: 1791940740982
  status: 1791945145014
  title: 1791940740982
  unassigned:m32844: 1791941618642
---
RAN Release38489759516 failed after npm reported +one@2.6.18 then registry verification timed out. Log /tmp/one-release-38489759516-failed.log. TESTED independently npm view exactone returnsE404, cache-busted exact-version registry HTTP404, exact tarballHTTP404; latest remains2.6.17. create-vxrn2.6.18 readable,23 companion packages reported visible by release verifier. No proven code defect, no relaxed registry gate, no stable retry dispatched. Proposed recovery: rerun only failed Release job38489759516 at74203bee46 with existing source/version guards. Stable publication needs Nate explicit approval.

RAN verified inbox answeri-1791940783162-89423-0 Retry stable release. Requested gh run rerun38489759516 --failed only; same source/version guards and exact registry verification retained. No second dispatch or version bump requested; native waitw-4c0fac remains active.

RAN attempt2 completed success but performed no publication: source guard logged main moved past74203bee46; its release ships this commit. Exact npm one2.6.18 stillE404 after success. Recovery NOT complete; green retry is superseded-source skip, not artifact proof. Follow covering successor automatic release without disabling source guard.

RAN successor38494742896 log reports npm cannot publish over previously published version2.6.18. TESTED one2.6.18 is still unavailable. INFERRED current patch selection from latest2.6.17 repeatedly targets reserved2.6.18; observation that would differ: selector would choose a later patch, or npm would not reject the version. Preparing focused branch fix using separate unavailable-version data, preserving existing legacy-major floor and verification gates.

RAN local helper probe resolveStableVersion(2.6.17,{mode:patch}) returns unavailable2.6.18. Worker m32844 prepares narrow exact-reserved skip ->2.6.19 with baseline-failing regression, preserving legacy-floor and prepared-version semantics. Existing mdx-rust/utils2.6.18 currently readable via npm CLI; issue is missing one artifact plus immutable version collision. Branch PR only; no extra stable dispatch.

RAN repeat confirmation: Release38495748695 at75b921768483d31fe7a0bbb174b4aa24d5e070a1 prepares2.6.18 and npm rejects previously published2.6.18. Same version-selection failure as38494742896; no new lane, blind retry or additional release watch before selector premise changes. Existing worker-reply waitw-2ad128 active.

RAN selector fix complete on branch: PR https://github.com/onejs/one/pull/858 (SHA 94e61de45) adds oneReserved [2.6.18], patch 2.6.17->2.6.19, neighbors unaffected, prepared 2.6.18 retained. TESTED 32/32 release-version+publish tests pass (30 pre-existing unchanged), lint/format clean, failure proven before fix. No publish, no main merge. Result ~/.team-machine/results/one-release-reserved-version.md. Recovery still needs owner PR merge; stable publication still needs Nate explicit approval.

RAN parent inspected3-file PR858 diff: separate oneReserved data, legacy-floor unchanged, exact reserved skip, two regression tests. Existing goals.md row1 One v2 release pipeline objective covers this recovery. Source checks38496211045 underway, no new typecheck/lint issue reported. Sharing concrete result for direct Nate One-main approval.

Nate direct Yes approved PR858 merge and resulting automatic stable publication. RAN requested exact-head94e61de4 squash auto-merge under required checks; no admin bypass. Existing source-check watchw-e2f8d9 active. Artifact verification and full delivery still pending.

RAN branch source checks38496211045 success; PR858 merged01:49:36Z atda67654c7373d168b3a201bd88df42f95070f767. Automatic Release38497787949 active. New tip changes release scripts only, so native/Android acceptance remains on covering source75b92176 runs38495748781/38495748748; no full-green/native/artifact verdict yet.

RAN recovery Release38497787949 success; npm one2.6.19 readable. Source commitd9ca52ca8d6d6616f161708cbed988c415f056d9 parent is PR858 merge da67654c; latest2.6.20 source1b992f990d parentc8e1e794. Downloading exact npm packs for content inspection before closure. Latest Release38500785436 cancelled with no jobs, separate current-source delivery blocker sent to native landing owner m32754 once.

TESTED parent downloaded npm one2.6.19 and2.6.20 packs. Manifest releaseSourceCommit verified against GitHub parent chain:19 d9ca52c parentda67654c;20 1b992f9 parentc8e1e794. Root ESM/CJS/type files present with nonempty contents, packed native Storage source byte-identical to recorded source. Evidence ~/.team-machine/results/one-stable-release-proof.json and /tmp/one-stable-release-proof/*.tgz. Release38497787949 success; superseding recovery complete. Current source native gates remain separate and open.
