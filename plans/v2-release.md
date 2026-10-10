<!-- plan: status=active owner=m18386 reviewed=2026-10-01 -->
# One v2 release

State: the documentation run is complete. The approved stable post and prepared One 2.6.0 version are on [PR #795](https://github.com/onejs/one/pull/795), still awaiting the owner's main merge. Publication requires full Checks at the resulting exact main SHA before `release=republish`. The post remains a draft. Successor s9039 / one-tamagui-launch-2 reconciled the launch gates on 2026-10-04; coordinator m18386 owns the remaining owner actions. The original documentation validation below is historical.

## Successor reconciliation, 2026-10-04

**RAN:** PR #795 is open, ready for review, and mergeable at
`039b656e59496802b03061e421106f1291a9ad0b`. Its checks and tests succeeded in
[run 37155071117](https://github.com/onejs/one/actions/runs/37155071117).
The approved candidate post remains `draft: true`, with a provisional
`publishedAt: '2026-10-05'`. Set the actual date and publish the draft with the
stable launch. The older beta draft on `v2-beta` is preserved.

**RAN:** the automatic canary [release 37183368335](https://github.com/onejs/one/actions/runs/37183368335)
succeeded for `b26795d36774ba108bce9b8bb0f7652f943471c5` on `v2-beta`.
Packed `one@2.0.0-0.canary.1791095912214` with `--ignore-scripts` and checked
its manifest's `releaseSourceCommit`. All 913 tracked files under
`packages/one/src` are present in the tarball and byte-match that commit.
Receipt: `/Users/n8/Library/Caches/one-tamagui-launch-20261004/content-check.json`.
This proves that canary's content; it does not prove stable publication or
native runtime behavior. No release was dispatched in this successor run.

**RAN:** read the completed [Tamagui site reconciliation](https://github.com/tamagui/tamagui/blob/tm/launch-site-2026-10-03/plans/v3-beta/launch-site-2026-10-03.md)
at `05f24dbad5`, its package receipts, and both browser receipts. The earlier
core-only remeasurement is complete on beta 1564.1. No fresh builds were needed.

| Arm | JS gzip, React excluded | Complete-app JS gzip | CSS gzip, React excluded | Framework spans, standalone gzip |
| --- | ---: | ---: | ---: | ---: |
| Tamagui core 3.0.0-beta.1564.1 | 16,899 | 75,766 | 3,163 | 16,211 |
| NativeWind 5.0.0-preview.4 | 23,924 | 82,560 | 1,806 | 382 |
| Uniwind 1.11.0 | 40,485 | 99,067 | 1,713 | 2,289 |

React, React DOM, and scheduler are excluded equally from the headline builds.
React Native Web and other required dependencies remain in the rival bundles.
The framework span column omits those platform dependencies and is not a
complete download cost. Gzip package rows are non-additive. The retained probe
receipts show matching styles, working counters, no page errors, and both
Tamagui CSS themes. Full package/module breakdowns are in the linked plan.
`tm/site-claims` remains held at `74f2d8d51f`; its corrected copy is also carried
on the newer `tm/launch-site-2026-10-03` branch with the beta-pinned receipts.

**RAN:** `2947e13a6d` is an ancestor of current `origin/v3-beta`; the full
`code/core/native` and native-docs diff against `tm/one-portal-setup` is empty.
That branch is superseded. No cherry-pick or portal API work remains.

**RAN:** `tamagui/bento` is still private. The predecessor's handoff records
the prepared plain-repository branch `tm/launch-plain-repo-main` at `345821a`;
the owner must choose visibility and landing. No visibility change was made.

**RAN:** Railway `whoami` on pro-64 returns
`Unauthorized. Please run railway login again.` The required owner command,
on pro-64, is `cd /Users/n8/tamagui && railway login`, followed by the browser
sign-in. The CLI help recommends omitting `--browserless` when a human is at
the machine. Read the failed deployment log for
`e5d29292-6c18-43ea-a510-dfec25e69032` before diagnosing the cause, then deploy
approved site source and verify its SHA, hero containment, and current docs.
The predecessor's production-v2 observation remains historical; this run did
not recapture production. The new blocker-routing message to m18386 returned
HTTP 503 with `DELIVERY NOT CONFIRMED`; it was not repeated. Tool defect
`t-mutglyo0-3660` records that transport failure.

Remaining owner gates: Railway access and site deployment, consumer branch
landing, Bento visibility, and the owner's One main merge followed by exact-main CI
and stable publication. Neither goals row is declared shipped. Coordinator
m18386 owns release monitoring; the successor task records the documentation
commit and expected Checks/Release workflows for pull.

## Acceptance for the original documentation run

- Complete `apps/onestack.dev/data/blog/version-two.mdx` from git history since the v1 beta and the existing plans/docs, in plain prose.
- Add one coherent One Native documentation section in `apps/onestack.dev/data/docs`, covering setup, shipped components and APIs, and platform notes. Verify samples against exported API. Do not document the pending linear-gradient, menu-picker, or App Intents decisions.
- Inspect the release pipeline without executing it. Record concrete blockers and distinguish existing evidence from checks still needed.
- Build onestack.dev and capture the rendered blog and one docs page with headless Playwright. Get one independent review by a different model. Share the rendered post once for the owner to read before publication.
- Commit and push only this lane's work to `v2-beta`; no One main changes, npm publishing, release dispatch, or release tags. Finish once with this plan as the handoff.

## Previous state and source

The blog draft already landed in `49c0b2654`, with audits in `55147a8f8` and native route links in `158f5b567`. Native per-module documentation already exists at `/native`; preserve it and provide a coherent framework-docs entry rather than recreating it. Initial source: `580018fffdf959634edf0f6e1d20c70b913ff6e9` on `origin/v2-beta`.

Unowned salvage: `986e9e9e3` is preserved at `origin/salvage/one-v2-beta-orphan-986e9e9e3` and local `refs/archive/one-v2-beta-orphan-986e9e9e3`; it is excluded from this work. The original `~/one` local `v2-beta` remains on it. Per manager direction, work runs in detached `~/.worktrees/one-v2-docs` from `origin/v2-beta`, pushed as `HEAD:v2-beta`.

## Release inspection

Read `.github/workflows/release.yml`, `.github/workflows/checks.yml`, `scripts/release.ts`, `scripts/release-version.ts`, `scripts/release-publish.ts`, and `docs/releasing.md`. No release command, including dry-run, was executed.

- Beta publication is manual, restricted to `v2-beta`, and named `2.0.0-beta.<run_number>.<run_attempt>`. Pushes now publish `2.0.0-0.canary.<timestamp>` on the `canary` dist-tag without a full CI gate. Manual beta publication retains its exact-SHA full CI gate. Both skip finish and write no version commit, git tag, or GitHub release.
- The first gate requires the dispatch SHA to be the branch tip. Full Checks and Tests must pass at that exact SHA unless an owner explicitly chooses force. The publish job accepts that SHA once it is an ancestor of the branch, allowing subsequent branch movement during CI.
- Publishing installs frozen dependencies, audits security, builds packages, stages workspace versions and repository metadata in temporary package copies, excludes private/skipPublish packages, and publishes using npm 12 trusted publishing with `id-token: write`. It verifies every pending version through the registry, polling for up to 30 minutes. A green process exit alone is insufficient.
- Existing clean-publish evidence: Release [36858702104](https://github.com/onejs/one/actions/runs/36858702104) succeeded on source `580018fff`; full Checks [36856366021](https://github.com/onejs/one/actions/runs/36856366021) also succeeded. This evidence belongs to that source, not the upcoming documentation commit.
- The previous source `1379951b4` had failed Checks and Release; `580018fff` repaired the Android test mock and published successfully. Do not reopen that resolved failure.
- Blockers for the stable launch: the owner's merge of PR #795, successful exact-main Checks, then publication of the prepared version with `release=republish`. The predecessor recorded the owner's approval of the stable 2.6.0 decision and post copy. This does not authorize this agent to merge or push One main. Trusted-publisher configuration and registry acceptance have successful beta/canary evidence; stable publication still needs its own verification.
- The stable `patch`/`minor`/`major` workflow paths still try to push to protected main, and the script's default bump builds a `1.*` version. They are not a v2 stable path. A stable v2 needs an owner-approved version bump landed through One's protected-main workflow, followed by the documented republish path. Outside this bounded beta-docs run.

## Validation and review

- Frozen dependency installation passed with Bun 1.4.2. Built the 15 site prerequisite packages in the studio-64 shared Mac builder slot; the guardian reported exit 0 and released the process group.
- The first complete `bun run site:build` passed and generated 166 pages, including the post and all five new docs routes. The existing Tamagui 2.6.2 extractor emitted TypeScript/config errors and fell back to runtime styles; this is a successful build with upstream warnings, not a clean extractor run. The final browser captures confirm the rendered output.
- Extracted all nine TypeScript/TSX snippets from the new pages into ignored `scripts/tmp/` and checked them with the public package declarations (`tsc`, strict + bundler resolution). Passed. The check first failed on a native-state handle incorrectly passed to Toggle; the published boolean prop is now used with React state and its callback.
- Validated all 110 local Markdown links and their referenced heading anchors. The probe first rejected the draft's obsolete environment-guards route and a nonexistent reserved-regions anchor; both now target existing sections.
- Source checks: namespaces in `packages/one/src/one.ts`; named hooks in `src/index.ts`; component inventories in `src/platform/index.native.ts`, `compose.tsx`, generated Controls, and `types.ts`; platform behavior in the native and web service entrypoints. Setup is grounded in the podspec/schema, native app manifest, `prebuildWithoutExpo.ts`, Expo adapter, and CLI. Updates claims distinguish `UpdatesApi` methods from launcher rollback/pruning. Native source import claims are bounded by `nativeSourceContract.ts` and generated native glue.
- History reviewed includes `origin/v1-rc1..HEAD` (the existing post's v1 RC baseline), the existing v1/v2 posts and their landed audits, and native lane plans. Those plans include proposals and old requirements; shipped source takes precedence.
- Final site build passed under the studio-64 builder guardian (exit 0, released true), generating 166 pages. Synced incoming sheet controls at `ad49ad3a2`; they change no new sample signature and their updated existing reference remains linked.
- Playwright used the installed Chromium headless shell 1228 (the site's Playwright dependency expected an absent 1208 binary). All six requested/new routes returned HTTP 200, had their expected title and substantial content, and produced full-page screenshots. There were no page exceptions or document horizontal overflows. Blog and setup also passed at 390x844. Browser closed in `finally`.
- Captures and rendered PDF: `/Users/n8/Library/Caches/one-v2-docs-evidence/`; `render-checks.json` records every route and result. The rendered PDF preserves the entire post for the owner to read after the server stops. These files were included in the one final share; no test image is committed.
- Independent review by GPT-6-astra of named commit `d35767f78` returned one P2 and GO after fixing it: Expo-free existing apps must install the community template before `one prebuild`. `native-setup.mdx` now explicitly installs template 0.87.1 and CLI 20.2.0, matching the native example and prebuild's dependency guard, and links the full peer dependency list. No other blocking finding or important scope omission; all five requested screenshots were reviewed with no visible layout defects. Samples and links passed again after the fix. The site TypeScript check (`bun run typecheck` from onestack.dev) also passed. The prerequisite fix was rebuilt and all six routes recaptured successfully; desktop and mobile setup screenshots include it.

## Handoff

- Main documentation commit: `d35767f78`; the follow-up commit adds the reviewed setup prerequisites and this completed handoff. Both go to `origin/v2-beta` through `git push origin HEAD:v2-beta`.
- One rendered-post share: `share-folder-s4827-236309ae3deddb7b-1a0f7c698b9-90fc1e0145b18a09`, titled **One v2: rendered draft for the owner**. Open `one-v2-beta-rendered.pdf` for the full post. One owner alert requested the read-through before publication or release. The post remains `draft: true`.
- The detached worktree at `~/.worktrees/one-v2-docs` is left clean and pushed for handoff. Original `~/one` branch and salvage are preserved. Canonical plan is `plans/v2-release.md` on `origin/v2-beta`, available locally in that worktree. No Contrast changes were made by this lane.
- Browser closed, builder process groups released, and the production preview server stopped. To reproduce the preview: `cd ~/.worktrees/one-v2-docs/apps/onestack.dev && bun run serve --host 127.0.0.1 --port 3917`, then open `/blog/version-two` or `/docs/native-overview`.
- This run leaves release execution, the owner's reading/publication decision, and the new exact-SHA full CI gate open. Prior publish evidence is recorded above; it is not a release of the new docs.

## Follow-up opportunities

- Expand direct-device coverage for hardware- and account-dependent native services; keep simulator proof separate from API availability.
- Evaluate removing the known blocked stable bump inputs from the release workflow, with the release owner.
- Exercise the complete published dependency/setup sequence in a minimal Expo-free app rather than only checking snippets and source guards.
- Normalize date-only blog metadata when formatting dates: the existing site renderer interprets it as UTC then formats in the build machine's timezone, so a west-of-UTC build can display the previous day. This run preserves the site's existing rendering behavior.
