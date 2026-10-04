# Releasing One

## Stable releases (patch / minor / major)

Two steps, because `main` is protected by a merge queue.

1. **Land the version bump as a normal pull request.**

   ```sh
   bun scripts/release.ts --minor --ci --dirty \
     --skip-publish --skip-push --skip-tests --skip-native-tests
   ```

   That rewrites the workspace `package.json` versions and leaves them
   uncommitted. Review the diff, run `bun install` so the lockfile matches,
   commit as exactly `vX.Y.Z`, push a branch, open a PR and merge it through
   the queue like any other change.

2. **Dispatch the release workflow with `republish`.**

   ```sh
   gh workflow run release.yml --repo onejs/one --ref main -f release=republish
   ```

   It checks that `main` is current and that CI is green on that exact SHA,
   builds the packages in its fresh checkout, publishes the version `main`
   already carries via npm trusted publishing (OIDC, no token), pushes the
   `vX.Y.Z` tag, and creates the GitHub release.

## Why not `release=minor` directly

The `patch` / `minor` / `major` inputs bump the version inside the workflow and
then push that commit straight to `main`. `main` does not accept that:

```
remote: error: GH006: Protected branch update failed for refs/heads/main.
remote: - Changes must be made through the merge queue
remote: - Changes must be made through a pull request.
```

Every Release run in this repo's history failed on that step, so those three
inputs have never successfully published anything. They are kept only so the
failure stays visible rather than looking like a missing feature. Use
`republish`.

## Canaries

Pushing `v2-beta` publishes a canary automatically. Canaries publish the
prepared tree to the `canary` dist-tag and mutate no git at all. They build
the packages without requiring full CI and never move `latest`.

For an explicit branch canary:

```sh
gh workflow run release.yml --repo onejs/one --ref <branch> -f release=canary
```

One V2 canaries use `2.0.0-0.canary.<timestamp>`. Pin the printed version
because the shared `canary` tag moves. A main-branch canary needs the owner's
approval. Branch canaries and normal beta releases use separate queues.

To test an upstream fix downstream without publishing anything at all, prefer:

```sh
bun release --into ~/<downstream>
```

Verify a canary by its content: run `npm pack <pkg>@<version> --ignore-scripts`,
extract it, check `releaseSourceCommit` in its manifest, and inspect the changed
source or built output. A local `--into` build can keep a version while changing
code, so the version string alone is insufficient.

## V2 beta branch

Pushing `v2-beta` publishes a canary. Publish a V2 beta on the `beta` dist-tag
with a manual workflow dispatch:

```sh
gh workflow run release.yml --repo onejs/one --ref v2-beta -f release=beta
```

The workflow requires successful full CI for the exact current `v2-beta` SHA,
then publishes versions named `2.0.0-beta.<workflow-run>.<attempt>` on the npm
`beta` dist-tag. It does not push a version commit, create a tag, or create a
GitHub release. Packages marked `skipPublish` remain excluded.

The publish step verifies itself: after `npm publish` returns it polls the
registry for every package in the publish set and fails the run if any version
is still missing, so a green Release run means those versions are readable on
npm. The registry publishes version documents asynchronously and can take
several minutes per package, which is why this polls rather than checking once.
A registry check in the first few minutes after a run is not evidence that a
package was skipped.

Inspect a published beta by its content:

```sh
npm pack one@2.0.0-beta.<workflow-run>.<attempt>
```
