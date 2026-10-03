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
