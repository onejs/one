# Releasing One

## Stable releases

Main pushes do not publish packages. Keep unreleased features on one release
branch and assemble them into a single minor release PR. Test branch canaries
and the installed packages in downstream apps. Prepare the minor version in
that PR, then ask the owner to review the complete batch before merging and
cutting the stable minor. Do not release features as patches.

Patch releases contain reviewed bug fixes only. Do not cut a patch from a
source containing unreleased features. Dependency and documentation maintenance
need no library release when published runtime bytes are unchanged.

`main` requires the `checks` and `tests` jobs on every pull request. After the
approved release PR merges and full CI passes for that exact source, publish
with an explicit workflow dispatch:

```sh
gh workflow run release.yml --repo onejs/one --ref main -f release=minor
```

A version prepared in the PR above npm latest is published as is, provided its
bump matches the requested release kind. A patch dispatch fails when main
carries a prepared minor. If no newer version was prepared, the workflow starts
from npm latest and creates the requested bump on its release tag. It never
pushes a generated version commit directly to protected main.

Prepare a feature batch version on its branch without publishing:

```sh
bun scripts/release.ts --minor --ci --dirty \
  --skip-publish --skip-push --skip-tests --skip-native-tests
```

Run `bun install`, commit the prepared version with the batch, and validate the
complete PR before owner review. `release=republish` publishes the version main
already carries after exact-source full CI; use it only for an approved prepared
version or to finish that version's interrupted publication.

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
because the shared `canary` tag moves. One branch canaries need no owner approval. Branch canaries and normal beta
releases use separate queues.

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
