---
id: t-muqbxsd6-1tnv0
title: One v2 + Tamagui v3 launch readiness and launch films
status: canceled
assignees:
- r51779
labels:
- lane:one-tamagui-launch
- umbrella:plans/launch
backend: git
created_at: 1790907252954
updated_at: 1793089885450
field_marks:
  active_form: 1790907252954
  body: 1793089885450
  claim: 1790907252954
  evidence_summary: 1790907252954
  owner_status: 1790907252954
  parent: 1790907252954
  priority: 1790907252954
  recovery_ref: 1790907252954
  status: 1793089885450
  title: 1790907252954
---
<!-- plan: status=active owner=r51779 reviewed=2026-10-02 -->
# One v2 and Tamagui v3 launch readiness

Goal: launch One v2 beta and Tamagui v3 beta together, possibly on 2026-10-02.
The pitch is One Native: React Native without leaving native APIs behind.
Lane `one-tamagui-launch` (r51779) keeps this list here, out of the public repo. The sites and docs review is
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
| 4 | Resolved. One `2.0.0-beta.158.1` published from v2-beta fa469948a (Release run 37018524000) after m18416 and r52284 cleared the sheet typecheck, audit (piscina 4.9.4, basic-ftp 6.2.1, node-forge ignored: no patched release) and the stale native coverage table. RAN npm pack: tamagui.native calls `setupNativeSheet('ios', ...)`; peer `@tamagui/sheet >=3.0.0-beta.1537.1 <4`; React Navigation pinned exactly; `@vxrn/compiler` ships transformHermesClasses (6e7321e125, 0e2dd0493, dbc9e2711 and fc6a0feb2 are ancestors); `One.Storage` and `useHeaderHeight` exported. Pins sent to m18635 for contrast adoption. | done | Nothing. |
| 5 | Resolved. `v3-beta` went green and published `3.0.0-beta.1537.1` from 224bc89b48 (v3/ci-green + v3/launch-numbers, minus 037aa36b78, which broke the NativeMixedDriver Detox test on iOS and Android). RAN npm pack: `@tamagui/static` ships `collapseNativeShorthands`. The release canary now has local copies of pressEvent and native-pressability; m18635 owns moving them into `@tamagui/fake-react-native`. | done | Follow-ups: 037aa36b78's animation win needs a whole-node driver switch; the native shorthand table costs about 110 bytes gzipped on web (islands baseline now 124041); Sheet silently renders nothing when no native renderer is registered, so add a dev warning. |
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

## Lane state (2026-10-02)
- Films: Contrast tm/tamagui-v3-film. Tamagui draft 11 approved by Nate (full-size 3 with a space, home logo at 80%). Merge a292995711 (both films, only promo/video differs from main) waits for Nate's explicit word to push Contrast main (session guard).
- One cut 8 approved by Nate; included in a292995711. Branch tm/one-film-cut8 is now redundant.
- Big apps (s5908, finished; handoff on studio-64 ~/contrast/scripts/tmp/one-v2-big-apps/): Takeout and Bluesky launch on One v2-beta fc6a0feb2 (iPhone 17 Pro, iOS 27); Expensify blocked by upstream Airship Swift on Xcode 27; Uniswap blocked by missing public nx config. A NEW ONE BETA from v2-beta is needed for clean-install claims (Nate). Bundle: Bluesky One 268s vs Metro 118s; Expensify 91.3 vs 91.4s (unproven at runtime). The One film's "faster than Metro" beat awaits Nate: label or cut.
- Native numbers: c3827 finished; published in Tamagui 3.0.0-beta.1537.1 (compiled faster than Uniwind on native in every scenario; compiled 5.8-7.5x faster than runtime). Receipts on ci-64 ~/Library/Caches/tamagui-v3-numbers/native-race/HANDOFF.md.
- Homepage: One tm/one-v2-home (yellow take 2) awaits Nate. Site claims: Tamagui tm/site-claims awaits Nate.
- Children: none. Remaining for Nate: push films to Contrast main (merge a292995711), Metro bars label or cut, homepage, grid, site claims.

Team Machine canceled this task: untouched for 7+ days with no live assignee. Reopen with `tm task update t-muqbxsd6-1tnv0 --status open`.
