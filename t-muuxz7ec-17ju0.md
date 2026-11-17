---
id: t-muuxz7ec-17ju0
title: Repair required iOS dev rolldown CI runtime failure
status: done
assignees:
- p61056
- r59505
labels:
- branch:tm/beta-rolldown-ci-repair
- lane:beta-rolldown-ci-repair
- umbrella:plans/one-native-launch.md
parent_id: t-muuqrnrk-svg0
backend: git
sessions:
- r59505
commits:
- ac19e4daa
- ee849e31b
- f5c36f17e
- ff2fe8827
created_at: 1791186135348
updated_at: 1791201531127
field_marks:
  active_form: 1791186135348
  body: 1791201531127
  claim: 1791188072687
  evidence_summary: 1791186135348
  parent: 1791186135348
  priority: 1791186135348
  recovery_ref: 1791186135348
  status: 1791201531093
  title: 1791186135348
---
DELIVERED 2026-10-05: approved compiler-path repair ac19 and ProtectedStore public entry d21 integrated v2-beta fe4b61b1a8609e76c89ce0ca7dabc0e6da9c8d07. RAN Checks37297114724 SUCCESS, Release37297114635 SUCCESS, iOS Native Tests37297115216 SUCCESS: generated SwiftUI/Fabric, both native app containers and all four dev/prod Metro/rolldown runtime jobs. Exact One/vxrn canary2.0.0-0.canary.1791196322465 content verified, source/native/generated/declaration bytes and removed entry paths checked; packed resolver real HBC and negative controls passed. Final snapshot native-ci-fe4-final.json; receipt Library/Caches/one-beta-recovery/ci-canary-fe4/content-proof.json. No test limits or assertions loosened. Owning plan updated/pushed documentation-only2feb02292; no native/check workflow triggered by docs-only change. Clean pushed author trees retained by shared Watchman, manager custody and no force cleanup. This closes bounded CI/ProtectedStore delivery; system/media/Calendar/Audio/blur holds remain independent.

Historical receipts:
Repair required iOS dev rolldown CI runtime failure. Baseline 37269583982: dev-rolldown failed while others green. Author r59505 implemented ff2fe8827 (HERMESC_PATH ownership + dev+rolldown download/validate, prod unchanged, no JS fallback) + ac19e4daa (posix gate), pushed clean. Manager custody; no force removal (shared Watchman hold). p60786 sole final follows first-layer.

FIRST-LAYER VERDICT (p61184): PASS, route to p60786 same-unit final. No new matrix/device/build run.
Verified RAN: compiler diff implements approval exactly -- override trims with empty-as-unset, non-file/non-executable loud naming HERMESC_PATH + remediation, podspec read/subspecs/HERMES_CLI_PATH failures loud naming root+path (previously bare TypeError), prebuilt path byte-identical, no npm fallback, no new API. Workflow: dev+rolldown-only download (fail-on-cache-miss) + Validate step (exact key match, file, executable); prod stanza byte-identical; env routing verified (prod first, dev-rolldown second, dev-metro empty). Changed paths exactly yml + compiler + tests + plan. 8/8 bytecode tests pass INDEPENDENTLY in scratch (real host-hermesc compile + magic bytes + all loud paths). actionlint zero new findings (verified by base-vs-candidate diff). ac19 posix gate is platform-appropriate, not weakening (8 tests intact).
Boundary: runtime proof (Debug HBC200 + magic, invalid-override 500, Welcome render on iOS27 sim) and 270/270 + tsc are pro-64-local, not visible from pro-128; mechanism verified by source + independent unit run + strict admission; CI dev-rolldown job itself is the end-to-end proof on merge. Cleanup limit kept: no worktree/tree touched.


Final reviewer p60786 APPROVED ac19 10:14Z. Integrated exact three-path payload as337f25aba on v2-beta, no conflicts. Manager RAN 3/3 staged payload equality and diffcheck. Native/system unrelated scopes held. Required CI+canary content remains open under manager.


RAN release37297114635 SUCCESS for fe4b61b1a. Packed exact One/vxrn canary2.0.0-0.canary.1791196322465; both manifests releaseSourceCommit=fe4. One12 changed packaged source/native/generated/declaration files byte-equal,2 removed Android entry/declaration paths absent, ESM+CJS native routing calls actual OneProtectedStore. vxrn2 source files byte-equal. RAN packed resolver dist: actual HBC magic/shared pending promise pass; invalid JS, missing override, nonexecutable override reject; blank override follows original pod resolver. Proof/tar hashes/control script+log under /Users/n8/Library/Caches/one-beta-recovery/ci-canary-fe4/content-proof.json. Required full CI still open; no new native acceptance claim.
