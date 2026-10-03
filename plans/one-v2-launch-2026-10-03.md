# One v2 launch documentation, 2026-10-03

Owner: launch-one-docs; parent r54299, task t-muso4wax-b6k0.
Branch: `launch/one-v2-docs`, worktree `~/.worktrees/one-launch-docs`.
Source baseline: `6f7a3dbce2f6bca920e23ffa8fcc54877e7d77eb` on `origin/v2-beta`.
Synced disjoint incoming native-param fix `82add3419` before committing; its
`isNative` branches preserve the web path, and the site typecheck passed again.
Also synced `b92aafe9c` (iOS PortalHost hit testing and its plan); namespace and
documentation contracts are unchanged. These incoming native changes are later
than the parent-reported beta artifact; that evidence does not prove their publication.
Scope: site documentation and prose. The blog remains `draft: true`.

## Recovered evidence

READ: `plans/v2-release.md`, the existing version-one/version-two posts, audits
`07f4c5d19` and `2e0fecc67`, and `plans/one-ui-portal-pager.md` plus its native
validation records. Previous site build, snippets, links, captures and review
are recorded in the release plan, with artifacts at
`/Users/n8/Library/Caches/one-v2-docs-evidence`. They establish the earlier draft,
not this branch. Team Machine summaries for s4827/s6440/s6468 were unavailable;
retained storage review turns corroborated the two subsequently repaired
storage defects. No new agent or review was launched by this lane.

READ: history from the initial `one` package rename `d3d2070ca` through
`origin/v1-rc1`, then `origin/v1-rc1..6f7a3dbce`, the existing v1 post, source
exports, and the recent native lane history. The early range includes typed
routes, loaders/refetch, Metro, middleware, deployment, CSS and script work.
These are carried-forward framework capabilities, not all new in v2.
The v1 RC ref is a historical branch, not a precise published v1-beta tag.
No benchmark or device performance number is added to the post.

## Claims reconciled with source

| Claim | Source read | Documentation result |
| --- | --- | --- |
| Storage namespace and platform contract | `packages/one/src/one.ts`, storage native/web entries, `1aff3c3f8`, `b3f624a9d` | Shared `One.Storage`; removed the iOS Storage row; documented Preferences verb and data migration |
| Storage persistence and compaction | `packages/one/cpp/HybridOneStorage.cpp`, `79792848c`, `c2f4b826b`; previous Preferences Swift source | Values stay in mapped log; map indexes slots; compaction waits for full capacity; no absolute write-durability promise or automatic UserDefaults migration |
| Shared Portal and Pager | effects exports, portal and pager implementations/types; `3e1463ec4`, `9fb08b11d` | Linked from blog and guides; distinguished ordinary RN pages from SwiftUI Pager; runnable example with defined progress state |
| Native source imports | `packages/vxrn/src/utils/nativeSourceContract.ts`; Kotlin import/measurement history | Typed public Kotlin composables described without implying hot reload replaces native compilation |
| Bundler and navigation | native dev server, bytecode compiler, router, `81532034f`, `11e018cd7`, headless exports and `useHeaderHeight.ts` | Bounded iOS bytecode/cold-route claims; navigator hooks and separate Drawer entry |
| Native services and setup | `one.ts`, AppIntents native entry/reference, One podspec/package peers, native setup guide | Added Shortcuts link and corrected the native sheet peer requirement |
| Share targets | native iOS/Android adapter and receiver/composer sources | Described native integration work and app-owned delivery adapter; no invented JS namespace or prebuild option |
| Web and data | `createAPIRoute.ts`, `server-render.tsx`, `server/oneServe.ts`, existing configuration/ISR docs | Typed API routes, streaming SSR, CDN revalidation, per-environment aliases and dependency patches |
| Platform behavior | effects web exports and existing shared component contracts | Platform table now separates CSS EdgeFade from native Blur/Mask, and includes Storage/Portal/Pager |

## Validation

RAN: site `bun run typecheck` passed (`tsc --noEmit`, exit 0).
RAN: ten TS/TSX snippets from the five native guide pages and shared Pager
passed strict `tsc` with bundler resolution against public declarations. The
source read found the pager example's undefined progress store. The first
snippet check rejected an incomplete JSX expression; the fixed example is a
complete React component.
RAN: all edited-page local Markdown links and anchors checked; final count is
recorded below. `git diff --check` passed. Oxfmt does not accept MDX targets in
this repository; it supplied no MDX validation.

RAN: reused installed dependencies and existing package dist output in the
isolated worktree. Missing use-isomorphic-layout-effect, color-scheme and
mdx-rust artifacts were built via their existing scripts, with no source edits.
The initial dev preview failed on these missing entries; restarting with them
allowed desktop rendering. The first optimizer warmup returned a 504, and a
later dev mobile docs render reported an attribute hydration diagnostic.
A temporary baseline-content probe did not load its baseline, so it establishes
no cause for that warning. The authored guide was restored in `finally`.
The zero-console-error assertion was retained for final production validation.
The first production expanded capture found React error 418 on the native
components page. A production rebuild of the unchanged native components page
passed its fresh-context probe with zero errors (26 inline code nodes). The
added rows had 29 inline code nodes and failed the same probe.
Direct links in table rows also failed. The final documentation puts the new
component descriptions and direct reference links after the existing table.
The existing table is preserved. The final component guide passes on desktop.
The expanded probe next rejected /native/storage with error 418 and a code
component stack. It retains the zero-error assertion and captures each route
before reporting aggregate failures. This is an open broader-reference
hydration issue; the parent was notified once for launch disposition.
Final browser results are recorded below;
these content probes do not identify the site renderer's underlying cause.
No renderer or framework code was changed in this lane.

RAN: final `bun run site:build` passed under the local heavy guardian,
generating 170 static pages. The installed Tamagui 2.6.2 extractor still reports
its known config/TypeScript errors and uses runtime styles. This is a successful
site build with extractor warnings, not a clean extractor run.
RAN: final local link check validated 143 links and anchors with zero errors.
RAN: the five existing RSS tests passed against the already running production
preview (temporary Vitest config removes server-launch setup only; tests and
assertions unchanged). The served XML was also parsed and contains only the
published v1 post, excluding the v2 draft.

RAN: required production captures pass at 1440x1000 and 390x844 for both
`/blog/version-two` and `/docs/native-overview`: HTTP 200, expected visible
heading, substantial content, a present Tamagui root with its unmounted flag
removed, loaded fonts, zero page exceptions, zero console errors, and zero
document horizontal overflow. PDF and full-page PNG output preserve the entire
post and guide. Their mobile captures were inspected. No native/device behavior
is established by these site captures.

RAN: expanded production capture covers nine routes at both desktop and mobile
sizes. All five native guide pages, the blog, and migration reference pass.
Storage and shared Pager references mount and have no page exceptions or
horizontal overflow, but each emits React hydration error 418 on both sizes.
The aggregate check correctly exits 1 for those four failures; no error
assertion, timeout, retry, or skip was relaxed. The renderer cause is unproven
and remains outside this docs-only change. This is the open launch limitation
for the parent, separate from the passing requested post/guide capture.

Receipts: `required-render-checks.json` (4 passes),
`expanded-render-checks.json` (14 passes, 4 failures), `final-site-build.log`,
`link-checks.json`, `snippets.log`, `typecheck.log`, `rss-tests.log`, and
`rss-publication.json`. Full documents: `blog-version-two.pdf` and
`docs-native-overview.pdf`. Every expanded route has desktop/mobile full-page
PNG output. Required and expanded receipts must not be conflated.
Evidence directory: `/Users/n8/Library/Caches/one-v2-launch-2026-10-03/`.

## Release and approval status

Parent-reported evidence, received from r54299 on 2026-10-03, not independently
rerun by this docs lane: beta `165.2` Release `37118552003` and full CI
`37118491435` succeeded on `deff516f3`; tip `6f7a3dbce` adds only a plan. The
parent compared published One/vxrn source content for Portal, Pager, appManifest,
one.ts, Stack, prebuildWithoutExpo and createNativeDevEngine, and reports
byte-identical files plus 19 passing release version/publish tests. The parent
states that no new release is needed for this docs-only branch. This supersedes
the earlier release plan's next-beta blocker for launch acceptance; this lane
executes no release or public-main action.

The parent owns exactly one Claude Opus review of the assembled final blog,
then Nate's read-through and publication decision. This lane does not share the
post. Draft publication and any public main landing remain gated on Nate.

## Delivery

Prepared documentation is complete for the parent's assembled Opus review.
The remaining decision is publication after review, with the broader-reference
hydration limitation above considered by the parent. The branch is left clean
and pushed; the primary checkout and starter are untouched. Artifacts remain
on studio-64 in the evidence directory. Browsers close in `finally`. The development server is stopped; at the parent's
request, the production server stays live at `http://192.168.0.19:3918` on
studio-64 (bound to 0.0.0.0) for renderer diagnosis. The parent owns its shutdown. To reproduce from this built worktree:
`cd ~/.worktrees/one-launch-docs/apps/onestack.dev && bun run serve --host 127.0.0.1 --port 3918`;
run `node /Users/n8/Library/Caches/one-v2-launch-2026-10-03/required-capture.cjs`.
The parent owns review, share, publication, release disposition, and CI watching.

The parent explicitly owns the renderer repair. The pushed
`plans/one-v2-launch-dom-2026-10-03.json` contains full Storage and Pager
console-error arguments/component stacks and pageerror arrays, plus browser
parsed server DOM and post-hydration first paragraphs and inline-code tags,
outerHTML, and parents. Storage and Pager each emit one console error and
zero page exceptions. Their first inline code is CODE inside SPAN inside P on
both sides. These observations do not establish a cause. Raw HTML snapshots
are retained beside the captures in the evidence directory.

## Assigned review fixes

Owner: one-launch-docs-review-fixes; parent r54299, task t-musq7g0o-1j6d0.
Review: `~/.team-machine/handoffs/launch-one-opus-review.md`, against 4b61c63f3.
REVIEW: none, reviewed as part of the assembled One launch by s8086.
The existing branch and worktree are retained. No starter, CLI template,
renderer, native runtime, or public main change belongs to this lane.

RAN: fetched and inspected `origin/v2-beta-starter` at
`95b754cbd881af6f00ac32e682d0700b0531ca0d`. Its one-basic example configures
`native.app`, imports `one/vite`, and requires `one/react-native-config`.
The example's only workspace dependency is `one: workspace:*`.
The published create-vxrn template still names `main`. Node resolution against
the published One beta confirms that `one/vite` and `one/react-native-config`
resolve, while `one/expo-plugin` and `one/react-native-commands` reject with
`ERR_PACKAGE_PATH_NOT_EXPORTED`. The React Native config exports its `bundle`
command. Strict TypeScript checking of the unmodified starter config against
the published declarations passed.

TESTED: the exact new-app sequence in native-setup works from a fresh folder:
`npx --yes degit onejs/one/examples/one-basic#v2-beta-starter my-app`,
`cd my-app`, `npm pkg set dependencies.one=beta`, `npm install`.
It installed `one@2.0.0-beta.167.1`; `npm run build:web` built six pages,
and `npx one prebuild --no-install` generated iOS and Android projects with
community native dependency discovery. A production browser loaded the home
and `/tabs/profile`, then followed the home link to `/test`; both probes had
zero console errors and page exceptions. Native compilation, CocoaPods
installation, device launch, and Android Gradle compilation were not run.
The native generation receipt does not establish native runtime behavior.

RAN: existing-app `npm install one@beta` succeeded on beta167.1.
The tag advanced during this task: an earlier npm attempt returned ETARGET
for beta167.1 before it became available. A fresh Bun copy installed
successfully but its web build failed with React error 130 on `/tabs/profile`
under both beta166.1 and beta167.1. An npm upgrade of the first copy passed;
the separate fresh npm copy also passed. The docs therefore specify npm for
the acquisition sequence. No package-manager cause is established by those
results, and no starter dependency or template was edited.

The blog uses the existing-app upgrade command and links native-setup in
place of the v1 installation guide. Preferences is attributed to earlier
v2 betas. Migration documents `UserDefaults.standard`, the
`One.Preferences.` prefix, an app-owned native bridge to copy string values
into Storage under unprefixed keys, and the absence of a beta with both
JavaScript services. The Pager example no longer subscribes to unused
continuous progress. Asset serving describes existing precompressed siblings
and stale-file rejection; cold-route dispatch is qualified as native
development. The blog remains `draft: true`. Its publication date still needs
updating when the parent publishes it.

RAN: the final site build passed under the heavy guardian, generating 170
pages. The existing Tamagui extractor still reports config bundling errors,
including `Cannot read properties of undefined (reading 'fileExists')`.
This is a successful build with extractor errors, not a clean extractor run.
Site typecheck, ten strict public-API snippets, 143 served local links and
anchors across 90 routes, five existing RSS tests, and served RSS exclusion
of the v2 draft passed. `git diff --check` passed.

RAN: final blog and native-overview captures pass at 1440x1000 and 390x844:
HTTP 200, visible heading, substantial content, mounted Tamagui root, loaded
fonts, no horizontal overflow, zero console errors and page exceptions.
The final native-setup captures pass the same checks at both widths.
Final Pager and migration references mount without exceptions or overflow,
but each emits React error 418 at both widths with an inline-code component
stack. The additional capture retains its zero-error assertions and exits 1
for those four failures. An earlier build in this task passed those pages;
those earlier passes do not establish that hydration was repaired. These
final receipts supersede that transient result. The parent still owns the
Theme hydration repair, including the migration page now observed here.

Current receipts are in
`/Users/n8/Library/Caches/one-v2-launch-review-2026-10-03/`:
`site-build-final.log`, `typecheck.log`, `snippets.log`, `link-checks.json`,
`rss-tests.log`, `rss-publication.json`, `required-render-checks.json`,
`edited-render-checks.json`, `npm-acquisition.log`, `npm-fresh-install.log`,
`npm-fresh-web-build.log`, `npm-fresh-prebuild.log`,
`npm-starter-config-types.log`, `npm-starter-exports.json`, and
`starter-browser.json`. Required and additional render results remain
separate. Full blog/overview PDFs and desktop/mobile PNGs are preserved.
The parent owns assembled review, renderer repair, CI, share, and publication.
