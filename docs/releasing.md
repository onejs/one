# Releasing One

## Stable releases

`main` requires the `checks` and `tests` jobs on every pull request. Open a
pull request, run `gh pr merge <n> --auto --merge`, and it lands once both
pass. Every push to `main` then publishes a stable release:

- By default it publishes the patch after npm `latest` (2.6.0, then 2.6.1,
  2.6.2...). The version commit exists only on its `vX.Y.Z` tag; `main`'s
  package.json keeps the last version a pull request set.
- A pull request that raises the version above `latest` publishes that version
  as is. For a minor:

  ```sh
  bun scripts/release.ts --minor --ci --dirty \
    --skip-publish --skip-push --skip-tests --skip-native-tests
  ```

  then `bun install`, commit as `vX.Y.Z`, and merge it like any other change.

`release=republish` from `main` still publishes the version `main` carries,
after green CI on that exact SHA.

## Why not `release=minor` directly

The `patch` / `minor` / `major` inputs bump the version inside the workflow and
push that commit straight to `main`, which its required checks reject for the
workflow's token. Raise the version in a pull request instead.

## Canaries

Pushing `v2-beta` publishes a canary automatically. Canaries publish the
prepared tree to the `canary` dist-tag and mutate no git at all. They build
the packages without requiring full CI and never move `latest`.

For an explicit branch canary:

```sh
gh workflow run release.yml --repo onejs/one --ref <branch> -f release=canary
```

Manual canaries use a queue per branch, separate from push canaries. A newer
`v2-beta` push cannot replace a queued manual canary.

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
