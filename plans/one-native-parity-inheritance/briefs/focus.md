Bind focus and keyboardType in packages/one-native. All 11 SwiftUI focus modifiers are unbound and
keyboardType with them, so there is no programmatic focus, no next-field chain, and no numeric
keyboard. For form controls that is a functional blocker, not polish.
packages/one-native/codegen/textCatalog.ts already admits it in a comment around line 37.

Worktree. From /Users/n8/.worktrees/one-native run
  git worktree add ~/.worktrees/one-native-focus -b feat/one-native-focus feat/one-native
Work only in ~/.worktrees/one-native-focus.

Read first: packages/one-native/README.md; src/controlled.ts and ios/OneNativeControlled.swift, which
are the shared two-way protocol (optimistic native value, numbered events, acknowledgement and reset
revisions); codegen/textCatalog.ts, where TextField's `text` uses that protocol; codegen/emitControls.ts
for how a `value` becomes a Binding in the generated body.

Focus. It is a two-way value with exactly the shape `text` already has, so run it over the existing
controlled protocol rather than a new mechanism: a `focused` boolean prop plus an `onFocusChange`
event. On the Swift side that is `@FocusState` in the generated Content struct, `.focused($focused)`
on the view, and a change handler feeding the controlled value. Say in your report whether focus
generalises to every control or only to focusable ones, and bind accordingly rather than bolting it
onto everything by default.

keyboardType is the interesting part. SwiftUI's `.keyboardType(_:)` takes UIKeyboardType, a UIKit
enum, while the enum generation in codegen/generate.ts reads SwiftUI enum cases out of the parsed
inventory. So either extend the inventory to read UIKit's UIKeyboardType cases, or hand-write the
converter in ios/. Pick one, say which and why in your report, and do not hand-write a list while
claiming SDK provenance it does not have. Add textContentType too if it falls out cheaply on the same
decision; drop it if it does not.

Fixture and test, without the simulator:
- Extend the forms fixture under tests/native-features/app/ with a two-field focus chain: focusing
  field one programmatically, submitting, and focus landing on field two, plus a numeric keyboard field.
- Add matching accessibility checks to the `forms` suite in
  tests/native-features/scripts/one-native-conformance.ts.
- Do NOT run the simulator, the conformance script, or a dev server. I own the simulator and run the
  accessibility and visual pass at integration.

The bar. From packages/one-native:
  bun run generate:check && bun run test && bun run typecheck && bun run build
generate:check compiles the assembled Swift with swiftc and runs the controlled-state probe, so both a
Swift mistake and a protocol mistake fail there. All four green or it is not done.

One thing changed today: the package floor is now iOS 26, not 18, so availability gating is gone.
Anything in the iOS 26 SDK is fair game.

Note for merging: another worker is adding a styling surface and will touch the same region of
emitControls.ts. Keep your diff to the focus and keyboard change so the two merge cleanly. Before you
finish: git fetch && git rebase origin/feat/one-native, then re-run `bun codegen/generate.ts` so
committed generated output matches the rebased tip. Commit, push.

Rules. No em-dashes. Commit messages short, no attribution lines. Label every causal claim
RAN / TESTED / INFERRED / GUESSED.

REVIEW: none - reviewed as part of the assembled one-native foundation.

You do NOT own: simulator 36CB8903-C59C-4438-BA29-E7A3C8876C37, port 8107, branch feat/one-native, the
primary checkout at ~/one, tests/native-features/ios, or any release, publish, npm tag or workflow
dispatch. Do not spawn sub-agents. Do not edit files outside your worktree.

Report back to me in ONE compact message when done: what landed, the keyboardType decision and why,
the four command results, honest blockers. Nothing else.
