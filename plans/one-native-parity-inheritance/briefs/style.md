Build the styling surface for packages/one-native. This is the largest gap in the package: there is
none at all today, so every generated control renders at system defaults and no tint means a whole app
is stuck on system blue.

Worktree. From /Users/n8/.worktrees/one-native run
  git worktree add ~/.worktrees/one-native-style -b feat/one-native-style feat/one-native
Work only in ~/.worktrees/one-native-style.

Prove the gap for yourself first, it takes a minute: grep the catalogs in packages/one-native/codegen
for font, tint, foregroundStyle, padding, frame, background. None exist. plans/one-native-swiftui-gap.md
has the counts: 54 decoration and effects modifiers unbound, 28 box and layout, 33 text appearance,
7 colour.

The trap to avoid. React Native's `style` prop already exists and already reaches the Fabric UIView
behind the SwiftUI content, not the content itself. See packages/one-native/codegen/emitControls.ts
around line 56, where 'style' is listed among the props the view side handles. Do not reuse that name
and do not change what it does today. Name the new prop `swiftStyle`.

The shape, and there is an exact precedent to copy. Accessibility is already a per-control object
payload applied once by a generated modifier:
  packages/one-native/ios/OneNativeAccessibility.swift   a struct plus `extension View { func oneNativeAccessibility(_:) }`
  codegen/emitControls.ts:241                            `@Published var accessibility = OneNativeAccessibility()`
  codegen/emitControls.ts:279                            updated in updateProps
  codegen/emitControls.ts:340                            `.oneNativeAccessibility(model.accessibility)` applied once in the generated body
Build `ios/OneNativeStyle.swift` and `.oneNativeStyle(model.swiftStyle)` on exactly those rails. One
object payload prop, one generated modifier, every control gets it, no per-control catalog churn.

First cut of the fields. Each must be backed by a real SDK modifier selected for provenance the way
existing `methods` entries are, not a name you remember:
  font (size, weight, design, or a named text style), foregroundStyle, tint, padding, frame min/ideal/max
  width and height, background, cornerRadius or clipShape, opacity, border.
Colour is the one to think about before you write code: find out how the Fabric props already carry a
colour (look at how backgroundColor reaches the view side today) and follow that. Do not invent a hex
string format if the pipeline already has a colour type. Say in your report which you found and why.

Fixture and test, without the simulator:
- Add styled rows to an existing fixture route under tests/native-features/app/ rather than a new one.
- Add matching accessibility checks to the corresponding suite in
  tests/native-features/scripts/one-native-conformance.ts.
- Do NOT run the simulator, the conformance script, or a dev server. I own the simulator and run the
  accessibility and visual pass at integration. Styling is exactly what the visual pass exists for.

The bar. From packages/one-native:
  bun run generate:check && bun run test && bun run typecheck && bun run build
generate:check compiles the assembled Swift with swiftc, so a Swift mistake fails there. All four
green or it is not done.

One thing changed today: the package floor is now iOS 26, not 18, so availability gating is gone.
Anything in the iOS 26 SDK is fair game.

Note for merging: another worker is adding focus and keyboardType and will touch the same region of
emitControls.ts. Keep your diff to the styling change so the two merge cleanly. Before you finish:
git fetch && git rebase origin/feat/one-native, then re-run `bun codegen/generate.ts` so committed
generated output matches the rebased tip. Commit, push.

Rules. No em-dashes. Commit messages short, no attribution lines. Label every causal claim
RAN / TESTED / INFERRED / GUESSED.

REVIEW: none - reviewed as part of the assembled one-native foundation.

You do NOT own: simulator 36CB8903-C59C-4438-BA29-E7A3C8876C37, port 8107, branch feat/one-native, the
primary checkout at ~/one, tests/native-features/ios, or any release, publish, npm tag or workflow
dispatch. Do not spawn sub-agents. Do not edit files outside your worktree.

Report back to me in ONE compact message when done: what landed, how colour is represented and why,
the four command results, honest blockers. Nothing else.
