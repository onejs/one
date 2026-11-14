---
id: t-mv19dhw4-tla0
title: Restore required One v2-beta CI workflows
status: done
labels:
- branch:tm/one-v2-beta-ci
- branch:v2-beta
- lane:one-v2-beta-ci
backend: git
sessions:
- s23249
commits:
- 3149dfd5c
- 3c811296a
- 6080b304d
- a546bdb4ee467eb5f796c2ab85c87ca379897fb0
- b22d97861
- ed21f63e1
created_at: 1791568074964
updated_at: 1791601345084
field_marks:
  active_form: 1791568074964
  body: 1791601308637
  claim: 1791601345084
  evidence_summary: 1791568074964
  owner_status: 1791568074964
  parent: 1791568074964
  priority: 1791568074964
  recovery_ref: 1791568074964
  status: 1791601308596
  title: 1791568074964
---
RAN: complete. Required workflows all passed on remote v2-beta tip eaa6126fbe355971a9a78e74ebdf1542133a51c0, independently rechecked after branch-follow watcher w-1f32cd exited0. Checks38016426808 success; Android38016426800 success; iOS38016426858 success; Release38016426795 also success. git merge-base verified all six landed repairs are ancestors: ed21f63e1,3c811296a,6080b304d,a546bdb4e,b22d97861,3149dfd5c. Commit bodies record focused validation. No tests loosened; One main untouched. Shared ~/one v2-beta is clean. Extra owned worktree removed; no active owned watcher/server/simulator. Repro evidence retained in scripts/tmp/one-ci-{watch,canary,headers} for parent s27204. Handoff scripts/tmp/one-ci-watch/handoff-s23249.md. No pending blocker; future CI ownership returns to native manager s27204. Further optimization candidate: measure generated consumer and production iOS compile/cache duration, currently unproven.
