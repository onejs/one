# One CLI starter repair

Owner: launch-cli-setup, parent r54299. Review branch: `fix/launch-cli-setup`.
Base: `067d7658cce7cccc186e7de32d2bc4a6a402de3b` from freshly fetched `origin/v2-beta`.
Starter branch: `v2-beta-starter`, observed at `95b754cbd881af6f00ac32e682d0700b0531ca0d`. No starter branch edits or movement.

## Change

Basic clones the v2 starter. Clone caches include the branch so a cached main
checkout cannot be rebased into the new starter. One declares the existing
`--template` option and passes it through. The standalone creator passes its
positional directory to create. Interactive Basic/Takeout selection and One's
existing `vite.config.ts` dev path remain in place.

Version substitution uses create-vxrn's released package version, as before.
There is no dependency on a permanent `@beta` tag. The CLI and creator are
released together; the starter's `workspace:*` becomes that release version's
existing caret range, including its prerelease identifier for beta builds.

## Validation receipt

In progress. Published baseline packages: `one@2.0.0-beta.168.1` and
`create-vxrn@2.0.0-beta.168.1` (resolved from npm on this machine).
Artifacts and logs are in this worktree's ignored `tmp/cli-validation/`.

Resource sample: CPU 70.94% idle, 198 GiB disk available. Heavy work uses
`/Users/n8/contrast/scripts/heavy.sh --cores 2 -- ...`.

Narrow artifact procedure: pack the published beta packages without lifecycle
scripts, compile create-vxrn and the two changed One CLI files using the installed
`@tamagui/build@3.0.0-beta.1432.1`, then overlay those outputs on the published
package contents and repack locally. This exercises the changed CLI against the
published beta runtime without rebuilding the unrelated native/router framework.

No main push, stable publication, or native binary launch is authorized here.
The parent owns landing and subsequent CI/release monitoring.

RAN: the first concrete-export check passed One's 82 targets and failed
create-vxrn on `types/index.d.ts`, `types/create.d.ts`, `dist/cjs/index.js`,
and `dist/cjs/create.js`. The published beta has no declarations, and its
CommonJS emit is `.cjs`. Creator package metadata now names the actual
CommonJS files, and its build generates the declarations it advertises.

RAN: targeted formatting passes for the changed creator files and cli/main.ts;
cli.ts has an existing unrelated formatting issue at intermediatesOut's
description, preserved to keep this repair narrow. `git diff --check` passes.

Sync: rebased the repair onto `106ffc430` before the first push. Incoming
changes were release scripts/workflow and AGENTS.md, disjoint from this repair.
First repair commit: `703d1ecd2` (pushed). Artifact source versions remain the
pinned beta above, with changed CLI source compiled locally.
