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

Canaries are unaffected: they publish the prepared tree to the `canary`
dist-tag and mutate no git at all, so they work from any branch.

```sh
gh workflow run release.yml --repo onejs/one --ref main -f release=canary
```

Canary publishing is on-demand only. Keep well under ~20/day across all repos
sharing this infrastructure.

To test an upstream fix downstream without publishing anything at all, prefer:

```sh
bun release --into ~/<downstream>
```

Verify a canary by its content, never its version string: a local `--into`
build and a published npm canary have carried the same version with different
code. `npm pack <pkg>@<version>` and grep the built output.
