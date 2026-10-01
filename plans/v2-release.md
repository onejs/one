<!-- plan: status=active owner=s4827 reviewed=2026-10-01 -->
# One v2 release

State: blog and five-page One Native docs are written and validated; the manual beta release path already has successful publish evidence. Next block: independent different-model review, push the reviewed docs to v2-beta, then one rendered-post share for Nate. No publish or release is authorized.

## Acceptance for this run

- Complete `apps/onestack.dev/data/blog/version-two.mdx` from git history since the v1 beta and the existing plans/docs, in plain prose.
- Add one coherent One Native documentation section in `apps/onestack.dev/data/docs`, covering setup, shipped components and APIs, and platform notes. Verify samples against exported API. Do not document the pending linear-gradient, menu-picker, or App Intents decisions.
- Inspect the release pipeline without executing it. Record concrete blockers and distinguish existing evidence from checks still needed.
- Build onestack.dev and capture the rendered blog and one docs page with headless Playwright. Get one independent review by a different model. Share the rendered post once for Nate to read before publication.
- Commit and push only this lane's work to `v2-beta`; no One main changes, npm publishing, release dispatch, or release tags. Finish once with this plan as the handoff.

## Previous state and source

The blog draft already landed in `49c0b2654`, with audits in `55147a8f8` and native route links in `158f5b567`. Native per-module documentation already exists at `/native`; preserve it and provide a coherent framework-docs entry rather than recreating it. Initial source: `580018fffdf959634edf0f6e1d20c70b913ff6e9` on `origin/v2-beta`.

Unowned salvage: `986e9e9e3` is preserved at `origin/salvage/one-v2-beta-orphan-986e9e9e3` and local `refs/archive/one-v2-beta-orphan-986e9e9e3`; it is excluded from this work. The original `~/one` local `v2-beta` remains on it. Per manager direction, work runs in detached `~/.worktrees/one-v2-docs` from `origin/v2-beta`, pushed as `HEAD:v2-beta`.

## Release inspection

Read `.github/workflows/release.yml`, `.github/workflows/checks.yml`, `scripts/release.ts`, `scripts/release-version.ts`, `scripts/release-publish.ts`, and `docs/releasing.md`. No release command, including dry-run, was executed.

- Beta publication is manual, restricted to `v2-beta`, and named `2.0.0-beta.<run_number>.<run_attempt>`. Pushes run checks and do not publish. Beta uses the `beta` dist-tag, skips finish, and writes no version commit, git tag, or GitHub release.
- The first gate requires the dispatch SHA to be the branch tip. Full Checks and Tests must pass at that exact SHA unless an owner explicitly chooses force. The publish job accepts that SHA once it is an ancestor of the branch, allowing subsequent branch movement during CI.
- Publishing installs frozen dependencies, audits security, builds packages, stages workspace versions and repository metadata in temporary package copies, excludes private/skipPublish packages, and publishes using npm 12 trusted publishing with `id-token: write`. It verifies every pending version through the registry, polling for up to 30 minutes. A green process exit alone is insufficient.
- Existing clean-publish evidence: Release [36858702104](https://github.com/onejs/one/actions/runs/36858702104) succeeded on source `580018fff`; full Checks [36856366021](https://github.com/onejs/one/actions/runs/36856366021) also succeeded. This evidence belongs to that source, not the upcoming documentation commit.
- The previous source `1379951b4` had failed Checks and Release; `580018fff` repaired the Android test mock and published successfully. Do not reopen that resolved failure.
- Blockers for the next release: Nate must read and approve public blog publication/release timing; the final source needs a successful exact-SHA Checks run; then the owner must authorize and manually dispatch the beta workflow. Trusted-publisher configuration and registry acceptance are supported by the existing successful run but cannot be guaranteed for a future run without executing it.
- The stable `patch`/`minor`/`major` workflow paths still try to push to protected main, and the script's default bump builds a `1.*` version. They are not a v2 stable path. A stable v2 needs an owner-approved version bump landed through One's protected-main workflow, followed by the documented republish path. Outside this bounded beta-docs run.

## Validation and review

- Frozen dependency installation passed with Bun 1.4.2. Built the 15 site prerequisite packages in the studio-64 shared Mac builder slot; the guardian reported exit 0 and released the process group.
- The first complete `bun run site:build` passed and generated 166 pages, including the post and all five new docs routes. The existing Tamagui 2.6.2 extractor emitted TypeScript/config errors and fell back to runtime styles; this is a successful build with upstream warnings, not a clean extractor run. Rendering will judge the actual output.
- Extracted all nine TypeScript/TSX snippets from the new pages into ignored `scripts/tmp/` and checked them with the public package declarations (`tsc`, strict + bundler resolution). Passed. The check first failed on a native-state handle incorrectly passed to Toggle; the published boolean prop is now used with React state and its callback.
- Validated all 109 local Markdown links and their referenced heading anchors. The probe first rejected the draft's obsolete environment-guards route and a nonexistent reserved-regions anchor; both now target existing sections.
- Source checks: namespaces in `packages/one/src/one.ts`; named hooks in `src/index.ts`; component inventories in `src/platform/index.native.ts`, `compose.tsx`, generated Controls, and `types.ts`; platform behavior in the native and web service entrypoints. Setup is grounded in the podspec/schema, native app manifest, `prebuildWithoutExpo.ts`, Expo adapter, and CLI. Updates claims distinguish `UpdatesApi` methods from launcher rollback/pruning. Native source import claims are bounded by `nativeSourceContract.ts` and generated native glue.
- History reviewed includes `origin/v1-rc1..HEAD` (the existing post's v1 RC baseline), the existing v1/v2 posts and their landed audits, and native lane plans. Those plans include proposals and old requirements; shipped source takes precedence.
- Final site build passed under the studio-64 builder guardian (exit 0, released true), generating 166 pages. Synced incoming sheet controls at `ad49ad3a2`; they change no new sample signature and their updated existing reference remains linked.
- Playwright used the installed Chromium headless shell 1228 (the site's Playwright dependency expected an absent 1208 binary). All six requested/new routes returned HTTP 200, had their expected title and substantial content, and produced full-page screenshots. There were no page exceptions or document horizontal overflows. Blog and setup also passed at 390x844. Browser closed in `finally`.
- Captures and rendered PDF: `/Users/n8/Library/Caches/one-v2-docs-evidence/`; `render-checks.json` records every route and result. The rendered PDF preserves the entire post for Nate to read after the server stops. These files will be included in the one final share; no test image is committed.
- Independent different-model review and rendered-post share remain pending.

## Follow-up opportunities

- Expand direct-device coverage for hardware- and account-dependent native services; keep simulator proof separate from API availability.
- Evaluate removing the known blocked stable bump inputs from the release workflow, with the release owner.
