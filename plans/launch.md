<!-- plan: status=active owner=r51779 reviewed=2026-10-02 -->
# One v2 and Tamagui v3 launch readiness

Goal: launch One v2 beta and Tamagui v3 beta together, possibly on 2026-10-02.
The pitch is One Native: React Native without leaving native APIs behind.
Lane `one-tamagui-launch` (r51779) keeps this list. The sites and docs review is
from m18637 (one-tamagui-sites-review); its notes are folded in below.

## Ready

| Item | Evidence |
| --- | --- |
| One beta on npm | `one@beta` = `2.0.0-beta.150.1`, published 2026-10-01 12:10Z from a green Checks run (RAN `npm view one dist-tags`) |
| Tamagui beta on npm | `tamagui@beta` and `create-tamagui@beta` = `3.0.0-beta.1479.1`, published 2026-09-27 (RAN `npm view`) |
| One v2 post and native docs | `version-two.mdx` and five native guide pages reviewed by another model (`plans/v2-release.md`); m18637's corrections landed on `v2-beta`: 5164cb812, 2e0fecc67, 26ca48040, a0bdecd4d |
| Tamagui v3 site and docs | `v3/site-docs-pass` @ 55d13af9e0: hero fix approved by Nate, docs pass, production build of 869 routes, typecheck; m18637's corrections 9222bbe08f, c88d108626, 55d13af9e0 |
| Tamagui phone width | m18637's sweep at 390px found no new issues (it was still finishing when this list was written) |

## Blocks a launch tomorrow

| # | Blocker | Owner | What unblocks it |
| --- | --- | --- | --- |
| 1 | Neither launch post is live: onestack.dev/blog/version-two and tamagui.dev/blog/version-three both return 404 (RAN curl). The v2 docs live on One `v2-beta` and the v3 site on Tamagui `v3/site-docs-pass`; the live sites still serve v1 and v2. Railway's deploy branch could not be read from here (CLI unlinked or logged out). | Nate | Choose how each site ships: merge to main, or point Railway at the branch. |
| 2 | Install commands resolve to the old major. `latest` is `one@1.27.1`, `tamagui@2.7.7`, `create-tamagui@2.7.7`, and `@tamagui/tailwind@0.0.0-bootstrap.0`. The v3 docs say `yarn add tamagui` and `npm create tamagui@latest`; the One docs say `npx one` and `one@latest`. Only the One post says `@beta`. | Nate | Either move `latest` to the betas (a release action), or change the docs and posts to `@beta`. |
| 3 | The One post has `draft: true`. The Tamagui post is dated 2026-07-10. | Nate approves; any agent edits | Set `draft: false` and give both posts the launch date. |
| 4 | One `v2-beta` CI has been red since 2026-10-01 16:11Z (last green 742a93aed). Cause (RAN, log of run 36954565606): 80c8bd49a imports `NativeSheetRendererProps` and the new `setupNativeSheet` signature from `@tamagui/sheet`. These exist only on Tamagui `tm/one-native-sheet-wip-r50037`, not in any published beta. Its owner, one-native-lane-5 (r51260), is in an error state. | needs an owner; coordinator assigns | Launching on `2.0.0-beta.150.1` avoids this blocker. Cutting any newer One beta needs either the Tamagui sheet branch landed and published, or One's optional sheet integration kept out of the build until then. |
| 5 | Tamagui `v3-beta` Checks have been red since 2026-10-01 07:00Z, so no new v3 beta publishes (a beta only publishes after green Checks on push). Causes (RAN, log of run 36862497475): a critical advisory, Next.js RCE GHSA-vcvr-r3jv-pc5j, which needs a patched `overrides` pin; the zero-runtime islands bundle at +37 to +44 bytes over its baseline; web integration failures in Separator orientation, ThemeLevels red Button, and StyledIconColor. Detox fails on ThemeLevels and MenuRadioGroup. | needs an owner; coordinator assigns | Launching on `3.0.0-beta.1479.1` avoids this blocker. Merging `v3/site-docs-pass` into `v3-beta` would publish a beta, so that merge also needs Nate. |
| 6 | Launch films. The Tamagui film is to match "the One video". Neither this lane nor the film lane (m18398) can find that video in ~/one, ~/contrast promo, tm shares, or 60 days of transcripts. | Nate or m18386 says which video it is; then r51779 | Once its source is known, build the Tamagui cut from real captures and polish the One cut. |

## Nice to have

- The One home page and intro say nothing about One Native or v2. For this launch's pitch it is the biggest content gap. It is a UI change, so it waits for Nate.
- These One docs pages exist but are missing from the sidebar: API Routes, ISR, useSearchParams, Images, CSS, Dev Tools, Utility Functions, and the `one build`, `one dev`, and `one serve` commands.
- The Tamagui VS Code LSP extension is not on the Marketplace. The docs now say so.
- The Tailwind post has no cover image. The broken reference was removed.
- Downstream apps still pin v2: takeout and chat main are on `2.7.7`/`2.4.6` and 3pc on a v2 canary. Migrations exist on branches (`plans/v3-beta/README.md` on the Tamagui branch). This does not block a beta launch.
- The stable v2 One path (version bump through protected main) is out of scope for a beta launch (`plans/v2-release.md`).

## Launch-day order, once 1 to 3 are decided

1. Edit the posts (blocker 3) and either the install commands or the dist-tags (blocker 2).
2. Deploy both sites (blocker 1). Check that both post URLs return 200 and that the install command on each home page resolves to the beta.
3. Post both films along with the posts.
