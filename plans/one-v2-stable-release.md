# One v2 stable release preparation

The review branch `fix/one-v2-stable-release` prepares candidate **2.6.0**. Nate must approve that version and stable publishing directly. This lane has published nothing, created no tags, dispatched no workflows, and changed neither main nor the separate v2-beta-starter worktree.

## Source and fix

- Initial freshly fetched v2-beta base: `347cbb759e5e0c7d683c8d5cf49e27a171089f2c`, with One source version `1.27.1`.
- Synced base before source commit: `920c2f821` (incoming reference-table changes were disjoint).
- Resolver fix: `61ade49bccaf4b207f810f9b60d9074c1c3e86ed`.
- RAN: a probe executed the original version-selection code from the initial base without running the release entrypoint. `--major` from `1.27.1` returned `1.28.0`; minor promotion from `2.0.0-beta.168.1` returned `1.6.0`.
- TESTED: stable selection now uses the source version and patch/minor/major mode. It promotes prereleases using semver and clears every old npm version within the selected major. A major bump from `1.27.1` selects `2.6.0`. A minor or major promotion of the v2 beta also selects `2.6.0`; patch promotion selects `2.5.3`. Ordinary patch/minor releases from `2.6.0` select `2.6.1`/`2.7.0`.
- TESTED: prompt handling uses the same collision resolver for stable preparation. Republish and skip-version preserve the full prepared version. Beta, canary, and RC selections retain their existing channel behavior.
- Cost: one scan of the existing blocked-version list per stable selection, using the existing semver dependency. No application runtime path, new public API, workflow, build, or helper agent.

## Registry evidence

RAN: registry metadata identifies `one@2.0.0` as published February 7, 2013, and `one@2.5.0`/`2.5.2` as published April 18, 2013. All describe a NodeJS script bundler. [Exact legacy metadata](https://registry.npmjs.org/one/2.5.2) and [package version history](https://registry.npmjs.org/one) support the conflict.

TESTED: the existing blocked list makes `^2.0.2` select legacy `2.5.2`; no legacy version satisfies `^2.6.0`. This is why skipping only occupied version numbers is insufficient. The selected stable range must start above the legacy versions in its major.

RAN: all 24 publish names returned HTTP 404 at version `2.6.0` on the recorded check. This establishes registry availability at that time only. The full publish inventory, exact observation time, and metadata are in [one-v2-stable-release-evidence.json](./one-v2-stable-release-evidence.json).

## Prepared manifest artifact

After source validation, a local probe executed only the existing workspace inventory, manifest version-writing block, and repro version-writing function from `scripts/release.ts`. It never entered the release entrypoint or authentication, installation, audit, build, publish, commit, or tag paths. Probe files remain in `/tmp/one-stable-release-evidence/` for this session.

- RAN: 65 workspace manifests and `repro/package.json` now carry `2.6.0`, following the existing release inventory and skipPublish/skipVersion rules. The root manifest stays private at `0.0.0`. The repro dependency on One is exactly `2.6.0`.
- TESTED: an independent comparison of each prepared manifest against the committed source allowed only the intended version/dependency fields. All 66 passed. Workspace protocols and all unrelated fields were preserved.
- RAN: `bun install --lockfile-only --ignore-scripts --network-concurrency 2` regenerated the lockfile without installing dependencies or running lifecycle scripts.
- TESTED: lockfile semantic comparison found exactly 65 workspace version changes and unchanged dependency resolutions. Offline frozen lockfile-only verification passed.

This is a source manifest candidate. No new package dist, tarball, security audit, full build, full CI, or downstream installation was produced by this lane. The CLI dependency fix owned by the sibling lane and the starter landing owned by Nate remain part of assembling the final release source.

## Authorized release owner's next steps

READ: `.github/workflows/release.yml` already supports `release=republish` from main. It skips preparation and the protected-main push, requires full CI at the exact current main SHA, builds and publishes that prepared version, then tags the same commit after publishing succeeds. No workflow change is needed.

1. Review and assemble this branch with the other launch changes. Nate decides `2.6.0`, approves the starter, and authorizes the One main landing directly.
2. Land the prepared manifests and matching lockfile through protected main with the final assembled source. Preserve the exact `2.6.0` versions. Do not use the workflow's patch/minor/major inputs, which still attempt a direct push to protected main.
3. Obtain green full Checks and Tests at the final exact main SHA. Prior beta or branch checks do not certify that source.
4. Only after Nate's direct stable release authorization, the owner dispatches the existing `release=republish` workflow from main. Recheck availability immediately before publishing.
5. Verify every published `2.6.0` package by its packed content, exact internal dependency versions, and `releaseSourceCommit` matching the final main source. Confirm latest and the stable tag afterward.

The preparation command in `docs/releasing.md` now includes `--skip-finish`: without it the script commits and tags during preparation, contrary to that document's claim that it leaves an uncommitted diff. No documented release command was executed here.

## Validation

- RAN: `bun test scripts/release-version.test.ts`: 15 pass, 0 fail, 49 assertions.
- RAN: `bun test scripts/release-publish.test.ts`: 13 pass, 0 fail, 27 assertions. Its npm workspace exercise uses `--dry-run` on temporary fake packages; it published nothing.
- TESTED: runtime probes of the actual release.ts selection block passed nine cases: v1 major, beta promotion, v2 patch/minor, exact republish, skip-version, beta, RC, and canary.
- RAN: focused oxlint with two threads, source formatting, and `git diff --check` passed.
- REVIEW: none, as assigned. The parent assignment records the prior Opus assessment of the release problem and candidate; this lane owns the source checks above.

The parent owns CI monitoring and the final approval path. Stable main merge, publishing, workflow dispatch, and tagging remain gated.
