---
id: t-murhik4h-8we0
title: Refresh the default One v2 starter from Takeout
status: done
assignees:
- s6570
labels:
- branch:v2-beta
- branch:v2-beta-starter
- lane:one-starter
- umbrella:plans/launch
priority: 3
parent_id: t-muqbxsd6-1tnv0
backend: git
sessions:
- s6572
commits:
- 34d7067ff
- 70edee205
- 95b754cbd
- d3614b65e
- e80c8b438
created_at: 1790977086305
updated_at: 1791020616994
field_marks:
  active_form: 1790977086305
  body: 1791020599019
  claim: 1790977086305
  evidence_summary: 1790977086305
  parent: 1790977086305
  priority: 1790977086305
  recovery_ref: 1790977086305
  status: 1791020598987
  title: 1790977086305
---
# One starter

Goal: Takeout-derived default One v2 starter, with the intended Orez Lite/SQLite app stack.

Public branch `v2-beta-starter`: `95b754cbd881af6f00ac32e682d0700b0531ca0d`, pushed. Auth fix `d3614b65e`; native inset fix `bab2d08a4`. Worktree `/Users/n8/.worktrees/one-starter-public` clean, commits reachable from origin. Starter was removed from v2-beta with normal reverts ending `d0eb62963`; generic extraPlugins fix retained. No starter beta published.

Private `local/one-starter-contrast`: `d2e40d78b11a717e42110c49f958cd26e463ed28`, local only, NEVER PUSH. Worktree `/Users/n8/.worktrees/one-starter` clean. Six integration files differ: PRIVATE.md, package.json, bun.lock, vite.sim.config.ts, two vendor tarballs. Includes the CLI and one-command simulator plus regular Metro. The direct user prohibition on pushing private integration overrides later coordinator messages.

Stack: One/vxrn 2.0.0-beta.161.1, Tamagui3.0.0-beta.1540.1, Orez0.16.19-canary.1790768320875, BetterAuth1.6.30. Published compiler and extraPlugins fixes verified by content.

TESTED fresh default CLI generation/install and web: OTP signup, demo, feed, comments, upload/posts, profile, logout/renewal, SQLite persistence. Production Node server: email delivery failure, no password/demo signup, authenticated upload, mutation limits/ownership/cascades. RAN typecheck/lint, 30 existing warnings zero errors. TESTED private real UI logout/renewal twice, simulator, Metro/web, positive/negative origins. Receipts /tmp/one-starter-final-auth-web.json, /tmp/one-starter-final-auth-check.json, /tmp/one-starter-session-confirm-event.json.

TESTED compiled native beta161 app on standard iPhone17Pro iOS27: cold loggedout launch, demo/populated feed, signedin restore, profile/settings, clear-before-redirect logout without bounce, loggedout restore, renewed login. Final full run /tmp/one-starter-native-pro128-run9.log passed with native AX visibility assertions and /tmp/one-starter-native-final-pro128-receipt.json exit0/releasedtrue. It waits on mount/route/data events under the job deadline rather than an arbitrary startup timer. Native route diagnosis by s7224 refuted a One bug; AX automation on Air had failed. The auth-state bounce was fixed in the starter, reviewed by m18635 before implementation. Assembled Opus review a17924 completed and findings fixed.

RAN corrected native Feed capture: title above card and first post below statusbar. Profile layout was viewed in the initial successful native run; the last profile frame caught a navigation transition and is excluded from outward evidence. Matching light before/after viewed and shared. Captures `/tmp/one-starter-proof-s6570`; durable public record `plans/one-starter-validation.md`.

Cleanup: all temporary probe source restored, own dev processes stopped, and simulator shut down/released. A supplemental profile capture was stopped before heavy admission after its claim was refused; it touched no simulator. Both source worktrees are clean.

Next: owner review/landing of the starter branch; framework betas remain separate. Private integration stays local until the user explicitly changes that instruction. No stable release or public main push authorized.

Final shared capture: /tmp/one-starter-proof-s6570/one-starter-native-final-before-after.webp. Compiled native final run9 receipt exit0/releasedtrue. Private integration remains local under direct user instruction. Public branch is ready for owner review, with no remaining implementation or validation blocker.
