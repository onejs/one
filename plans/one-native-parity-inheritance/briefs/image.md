Implement a standalone SwiftUI `Image` binding in packages/one-native.

Worktree. From /Users/n8/.worktrees/one-native run
  git worktree add ~/.worktrees/one-native-image -b feat/one-native-image feat/one-native
Work only in ~/.worktrees/one-native-image.

Read first: packages/one-native/README.md; codegen/controlTypes.ts (the Control shape, and what the
`layout` field means); codegen/leafCatalog.ts, where the `Label` entry is the existing SF Symbol
precedent; codegen/generate.ts, for how an `enum:` field becomes a `Styles.X` TypeScript union and an
`OneNativeGenerated.x(_:)` Swift converter whose cases are selected from the parsed SDK inventory. A
constructor or modifier name that is not in the .swiftinterface fails the build, which is the point.

What to build. React Native already owns `<Image>` for bundled and remote images, so this binding
exists for SF Symbols: symbol rendering modes, variants, variable values, scale, and symbol effects.
Do not bind file or URL loading.

Fields, every one backed by real SDK provenance the way the existing controls declare `constructors`
and `methods`: systemName (string, required), symbolRenderingMode, symbolVariant, imageScale,
variableValue (Double). Add symbol effects only if the SDK exposes them in a form this pipeline can
express as a string enum; if they do not fit, leave them out and say so rather than inventing a new
mechanism. Skip colour and font entirely, another worker owns the styling surface.

Layout: an Image reports an ideal size, so `measured` (the default) is right. Confirm that against the
comment on `layout` in controlTypes.ts rather than taking my word for it.

Add a `validate` string like its neighbours, and register the control wherever leafControls are
consumed.

Fixture and test, without the simulator:
- Add Image rows to tests/native-features/app/one-native-leaves.tsx following the existing rows.
- Add matching accessibility checks to the `leaves` suite in
  tests/native-features/scripts/one-native-conformance.ts.
- Do NOT run the simulator, the conformance script, or a dev server. I own the simulator and run the
  accessibility and visual pass at integration.

The bar. From packages/one-native:
  bun run generate:check && bun run test && bun run typecheck && bun run build
generate:check compiles the assembled Swift with swiftc, so a Swift mistake fails there. All four
green or it is not done.

One thing changed today: the package floor is now iOS 26, not 18, so availability gating is gone.
Anything in the iOS 26 SDK is fair game.

Before you finish: git fetch && git rebase origin/feat/one-native, then re-run
`bun codegen/generate.ts` so committed generated output matches the rebased tip. Commit, push.

Rules. No em-dashes. Commit messages short, no attribution lines. Label every causal claim
RAN / TESTED / INFERRED / GUESSED.

REVIEW: none - reviewed as part of the assembled one-native foundation.

You do NOT own: simulator 36CB8903-C59C-4438-BA29-E7A3C8876C37, port 8107, branch feat/one-native, the
primary checkout at ~/one, tests/native-features/ios, or any release, publish, npm tag or workflow
dispatch. Do not spawn sub-agents. Do not edit files outside your worktree.

Report back to me in ONE compact message when done: what landed, the four command results, honest
blockers. Nothing else.
