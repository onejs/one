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
   publishes the version `main` already carries, pushes the `vX.Y.Z` tag, and
   creates the GitHub release.

## npm authentication

Publishing needs an `NPM_TOKEN` repository secret: a granular access token with
read and write on the `@vxrn` scope plus `one`, `vxrn`, `create-vxrn` and
`lllink`.

npm trusted publishing (OIDC, no token) would be better, but it is configured
per package on npmjs.com and only two of this workspace's 25 packages have it.
The 1.25.0 release published `create-vxrn` and
`@vxrn/use-isomorphic-layout-effect`, then died on the third package:

```
npm error code E401
npm error 401 Unauthorized - PUT https://registry.npmjs.org/@vxrn%2femitter
  - Failed to generate Web Auth URLs due to error: BadRequestError: token is invalid
```

With no trusted publisher and no token, npm falls through to interactive web
auth, which cannot work in CI. Adding trusted publishers for the remaining 23
packages would also fix it and would let the token go away.

Publishing is idempotent per package: `scripts/release.ts` checks `npm view`
for each one and skips those already published at the current version, so a
partially-published version is safe to re-dispatch.

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
