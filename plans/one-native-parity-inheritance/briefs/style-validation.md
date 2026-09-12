Your swiftStyle branch is merged into feat/one-native and the four checks pass, so this is a
follow-up on the same surface, not a rejection. Three things, in order of how much they cost.

Branch fresh from the current tip, which now also carries Image, focus/keyboardType and an iOS 26
floor: from /Users/n8/.worktrees/one-native run
  git fetch && git worktree add ~/.worktrees/one-native-style2 -b feat/one-native-style2 origin/feat/one-native
Work only in ~/.worktrees/one-native-style2. Your old worktree and branch are done with.

1. The 24-field style list is written out six times, and this package generates lists like that from
   one declaration everywhere else. The six: the `OneNativeStyleNative` spec type in
   codegen/emitControls.ts, the NSMutableDictionary bridge block in the same file (one hand-written
   `if` per field), the properties on `OneNativeStyle` in ios/OneNativeStyle.swift, its memberwise
   `public init`, its `init(dictionary:)`, and the public TypeScript type. Declare the fields once as
   a table in the codegen (name plus kind: number, string, or color) and emit all of them from it.
   The memberwise `public init` is constructed by nothing, so it should not exist at all rather than
   be generated. Adding the 25th style field should mean adding one row.

2. Zero is unreachable for every numeric field. React Native's codegen defaults an absent Double to
   0 in C++, and the bridge tests `> 0`, so `opacity: 0`, `padding: 0` and `maxWidth: 0` all arrive
   as unset. `opacity: 0` and `padding: 0` are both things a caller means. Pick a representation that
   can express zero, say which you picked and why, and make sure a caller can still leave a field out.

3. Unknown values are dropped in silence in five places: `resolveWeight`, `resolveDesign` and
   `resolveTextStyle` all `return nil` in their default case, `oneNativeOpacity` ignores anything
   outside 0...1, and `oneNativeCornerRadius` ignores a radius at or below 0. Every generated
   converter in this package ends with `preconditionFailure("invalid X: \(value)")` instead, so a
   typo fails at the call site rather than rendering system defaults and looking like the feature is
   broken. Match that. A zero corner radius is a real value, not an unknown one, so treat it as one.

The bar, from packages/one-native, all four green:
  bun run generate:check && bun run test && bun run typecheck && bun run build
generate:check compiles the assembled Swift with swiftc, so a Swift mistake fails there.

Do NOT run the simulator, the conformance script, or a dev server. I own the simulator and run the
visual and accessibility pass at integration, which is where a styling change actually gets graded.
Before you finish: git fetch && git rebase origin/feat/one-native, then re-run
`bun codegen/generate.ts` so committed generated output matches the rebased tip. Commit, push.

Rules. No em-dashes. Commit messages short, no attribution lines. Label every causal claim
RAN / TESTED / INFERRED / GUESSED.

REVIEW: none - reviewed as part of the assembled one-native foundation.

You do NOT own: simulator 36CB8903-C59C-4438-BA29-E7A3C8876C37, port 8107, branch feat/one-native,
the primary checkout at ~/one, tests/native-features/ios, or any release, publish, npm tag or
workflow dispatch. Do not spawn sub-agents. Do not edit files outside your worktree.

Report back in ONE compact message: what the field table looks like, the zero representation you
picked and why, the four command results, honest blockers. Nothing else.
