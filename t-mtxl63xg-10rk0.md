---
id: t-mtxl63xg-10rk0
title: Integrate One V2 beta navigation and native package
status: done
assignees:
- one-v2-beta-owner
labels:
- native
- navigation
- one
- v2-beta
priority: 4
backend: git
sessions:
- m13467
- m13472
- p41866
- r28162
commits:
- 2b164ee1cc472235e6088ac34b9381e9fac1f299
- 3150a139165f13cba2a8162f2c1a34683f4f2665
created_at: 1789169238628
updated_at: 1791225483357
field_marks:
  active_form: 1789169238628
  body: 1789169238628
  claim: 1789169238628
  evidence_summary: 1789169238628
  parent: 1789169238628
  priority: 1789169238628
  recovery_ref: 1789169238628
  status: 1791225482648
  title: 1789169238628
---
# Outcome

Create and validate a `v2-beta` integration branch for One that combines React Navigation 8, the new native package, cleanup of superseded native navigation code, and an inactive but ready V2 beta release path.

# Acceptance

- Start from freshly fetched `origin/main` in `~/.worktrees/one-v2-beta`. Do not switch the primary checkout and do not touch the active `~/.worktrees/one-native` or older `/Users/n8/worktrees/one-react-navigation-v8` worktrees.
- Integrate the complete reviewed histories from `origin/feat/react-navigation-v8-main` and the now-final native range `958f457ee376ee294daf345942b8e399ee18bcb4..2a517c93255c914c305e564b0fcbca2e84c16f32` on `origin/feat/one-native`. Preserve branch history where practical and resolve against current main.
- Use the current React Navigation 8 `next` versions and current supported `react-native-screens`. Meet the official v8 dependency floors, including TypeScript and Gesture Handler, across every workspace consumer.
- Make React Navigation 8 the single route-navigation tab owner. Remove `@bottom-tabs/react-navigation`, `react-native-bottom-tabs`, the old custom route-native-tab path, stale generated types, tests, documentation, and compatibility code. Retain React Navigation's documented custom implementation only where One's web behavior genuinely needs it. Preserve the new package's low-level explicit `Swift.Tabs`/`Swift.Tab` binding, including its action-tab event, behind a clear primitive-versus-route-navigator boundary with no duplicated navigation state.
- Fix the known `index, index > index` runtime warning at its source. The tested iOS and Android flows must have no navigation warnings or crashes.
- Audit `packages/native` against the new native package. Use evidence from the active native-package owner and the Astra advisor to decide whether to absorb the old package, move selected capabilities, or keep a sharply distinct package. Each capability must have one owner. Delete superseded StackToolbar, tab, wrapper, export, build, and test code. Preserve capabilities that React Navigation 8 and the new package do not replace.
- Preserve arbitrary-app behavior for all public packages. Do not bake One's TestFlight routes, identifiers, or timing into published package code.
- Study the actual Tamagui V3 beta-branch automation and One's current release workflow. Prepare an equivalent One V2 beta path named `2.0.0-beta.*` for the `v2-beta` branch. Keep it unable to publish during this task. Do not publish, dispatch a release workflow, push a tag, change an npm dist-tag, or push a commit whose arrival triggers a package release. Record the exact later activation step that requires the user's explicit cut permission.
- Run the smallest full validation that covers the broad interface change: package builds, navigation and native-package suites, typecheck, lint, template/example consumers, and generated-output checks. Search and update every sender and receiver of changed public interfaces.
- Run the real TestFlight app on iOS with Xcode 26 and exercise stacks, ordinary native tabs, the iOS 26 detached plus action, and all retained native-package capabilities. Prove the detached action is repeatable, runs its handler, never becomes selection, and never flashes an empty route. Assert the app mounted and capture runtime evidence. Exercise Android native tabs and navigation too.
- Push coherent, validated commits to `origin/v2-beta` so ordinary branch CI runs. Monitor ordinary CI to a terminal result and fix branch-caused failures. No npm release is authorized.
- Obtain a final read-only review of the assembled named commit range from `one-v2-beta-advisor`. Fix material findings and rerun affected checks. Reviews do not chain.
- Finish with a clean worktree, a current branch based on the then-current `origin/main`, and a handoff naming the base, ordered commit range, CI runs, runtime evidence, removed code, remaining release activation step, and any honest blocker.

# Non-goals

- Do not merge to `main` during this task.
- Do not publish One 2.0 beta, canary, or stable packages.
- Do not preserve parallel native-tab implementations or compatibility shims for removed pre-launch paths.
