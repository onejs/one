# pro-64 ownerless work preservation

Preserved six feature branches on 2026-09-11. Each pushed tip was checked against `git ls-remote`. After Nate clarified that authored work already on main should be committed there, One’s existing watcher was committed and pushed on main as `89117c9af`. Orez main was fast-forwarded to fetched origin. No rebases, releases, deploys, or runtime validation were performed. Feature-branch preservation is not approval to land those branches. No coordinator messages were sent.

Fetched origin in One, Orez, Tamagui, and Team Machine before comparing branches. `git log origin/main..HEAD` was empty for Orez and Team Machine; `git rev-list --left-right --count origin/main...HEAD` returned `1 0` for each at inspection. Drift's `unpublished=4` and `52` disagree with Git and must not drive a push. Tamagui comparisons has no remotes, so its `unpublished=51` is not an actionable remote comparison. These observations establish a reporting discrepancy, not its implementation cause.

Verdict a means coherent authored work or an already preserved clean commit. Verdict b means generated output. Verdict c means mixed unfinished work left for an author to separate. Live checkouts are explicitly excluded. Paths are relative to `/Users/n8/`.

| Worktree | Verdict | Action taken | Branch pushed |
| --- | --- | --- | --- |
| `one` | a | Watcher absent from origin/main. Copied exact untracked `scripts/ops/watch-ci.ts` into a new worktree; committed as `55484c1f4`. After Nate’s clarification, committed the original file on main as `89117c9af` and pushed main. | `chore/preserve-ci-watcher-pro64` |
| `.worktrees/one-preserve-ci-watcher-pro64` | a | Created to preserve watcher and this report; left clean and pushed. | `chore/preserve-ci-watcher-pro64` |
| `.worktrees/one-native` | excluded, live | Left untouched; branch matched fetched origin. | None |
| `worktrees/one-react-navigation-v8` | b | Left generated route declarations, generated Tamagui CSS, and empty emitted test declaration untouched. Existing branch matches origin. | None |
| `worktrees/one-rolldown` | a | Clean; existing branch matches origin. | Already on `feat/native-rolldown-readiness` |
| `worktrees/one-rolldown-minify` | a | Pushed existing commits `bb1ec0f5e` and `94456595e`, covering minification and cache-reset handling. No same-name origin branch existed before push. | `feat/native-rolldown-minify` |
| `worktrees/one-rolldown-sourcemaps` | a, b | Pushed existing symbolication commit `215a21d89`. Left generated empty test declaration untracked. No same-name origin branch existed before push. | `feat/native-rolldown-sourcemaps` |
| `.worktrees/orez-backup-immutable-r22350` | a | Committed approved snapshot-plan amendments as `915bff49`; pushed existing branch. Historical validation claims in the plan were preserved, not rerun. | `fix/backup-mutation-r22350` |
| `orez` | a | Clean, zero local-only commits after fetch. Drift's unpublished=4 contradicted by Git; no canary-triggering main push. | None |
| `.worktrees/orez-launch-migration-source-r22339` | a | Clean; existing branch matches origin. | Already on `fix/launch-migration-source-r22339` |
| `.worktrees/orez-takeout-to-o` | a | Clean; existing branch matches origin. Divergence from another tracking base does not imply unpublished branch work. | Already on `chore/takeout-to-o` |
| `tamagui` | excluded, live | Left untouched on v3-beta; branch matched fetched origin. | None |
| `.worktrees/tamagui-inverse-deduped-css` | a | Preserved alias-specific light/dark CSS selection plus regression test as `615f9255a3`. Tests not run. | `fix/inverse-deduped-theme-css` |
| `.worktrees/tamagui-tailwind-coverage-ci` | c, b | Left all 68 dirty entries unchanged. Contains authored grammar/native-unit/style-precedence fixes mixed with 40-plus declaration/build changes, compiler-rewritten TSX, test fixture debris, snapshots, and increased test timeouts. Requires separation by an author; blanket generated classification would hide real source work. Existing branch is five commits behind origin with zero local-only commits. | None |
| `.worktrees/tamagui-lineheight-v3` | a | Clean; existing branch matches origin. | Already on `feat/v3-lineheight-multiplier` |
| `.worktrees/tamagui-v3-tailwind` | a | Clean; existing branch matches origin. | Already on `fix/v3-tailwind-themes` |
| `tamagui-comparisons` | a | Clean committed benchmark/docs history. `git remote -v` returned no remotes; nowhere authorized to push. | None, no remote |
| `team-machine` | excluded, shared | Read-only Git verification only; zero local-only main commits. Drift's unpublished=52 contradicted by Git. | None |
| `.worktrees/ab-review-76624-1788993536319120000` | a | Clean detached HEAD already reachable from origin/main. | None needed |
| `.worktrees/team-machine-app-parity-995` | a | Clean; existing branch matches origin. | Already on `app-parity-995-team-generator` |
| `.worktrees/team-machine-lineheight-v3` | a | Clean; existing WIP commit is already preserved on origin. | Already on `feat/lineheight-v3` |
| `.worktrees/team-machine-terra-continuation-check` | a | Clean; no same-name remote branch, but HEAD already reachable from origin/main. | None needed |
| `team-machine-verify-terminal-survival` | a | Created branch from detached HEAD and preserved all nine authored Rust/docs files as `dc0264dcf`. Changes appear to start terminal-close expiry only when idle, retain active/awaiting-answer sessions, default grace to one hour, and verify shell actor process ancestry. Includes tests; not built or run in this sweep. | `fix/preserve-terminal-survival-pro64` |

Soot, Takeout, and other machines were outside scope and were not operated on. The outstanding dirty work is intentionally retained as described above. The watcher source is now tracked and pushed on One main, with identical bytes also preserved on the feature branch.
