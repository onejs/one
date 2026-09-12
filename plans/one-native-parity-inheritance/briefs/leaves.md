You are implementing new SwiftUI leaf bindings in one-native. Nate's scope rule for this whole campaign: implement basically everything, except APIs that are deprecated and unused, or iPad-only.

Your worktree. Create it yourself and work only there:
  git worktree add /Users/n8/.worktrees/one-native-leaves -b feat/one-native-leaves feat/one-native
Run every command from that directory. Do not touch /Users/n8/.worktrees/one-native (mine, live) or ~/one (must stay on main).

Read first: plans/handoff-one-native-parity.md in full, it is the contract for this package, and plans/one-native-swiftui-gap.md for the evidence behind the ranking. packages/one-native/README.md documents the public shape.

Scope, items 2 and 3 of the handoff's "Next work":
1. PhotosPicker, ShareLink, fullScreenCover, contextMenu, ContentUnavailableView. The handoff says all five are reachable with mechanisms that already exist, so follow the existing emitter and controlled-state patterns rather than inventing one.
2. WebView from _WebKit_SwiftUI. The handoff calls it an ordinary leaf with no new mechanism, now that the floor is iOS 26.

How this package works: codegen/Extract.swift parses .swiftinterface files, inventory.ts builds the symbol map, generate.ts drives the emitters, and generated output lands in packages/one-native/ios/Generated/ and src/generated/. Never hand-edit generated files. Change the mapping and regenerate.

Gate, run from packages/one-native:
  bun run generate:check
It runs codegen, diffs the outputs, runs swiftc -typecheck over every .swift in ios/ and ios/Generated/, and runs the controlled-state probe. It must be green before you report. Also run `bun run typecheck` and `bun run test`.

What you must NOT do:
- Do not boot a simulator and do not run the device conformance suite. I own simulator 36CB8903-C59C-4438-BA29-E7A3C8876C37 and another agent is capturing pixel oracles on it right now. The suite is load-sensitive and a second CoreSimulator client corrupts both runs. I run the device suite at integration.
- Do not touch the dev server on port 8107.
- Do not push. Commit to your branch and report the SHA to me.
- Nothing outside packages/one-native and its fixture. Not soot, not rnx.

If you add UI to tests/native-features/app/ fixtures, know that visual check regions are ABSOLUTE fixture coordinates. The handoff records that adding a seventh category wrapped a button grid to a third row and moved every control below it down 39pt, breaking five visual checks that were not real regressions. If your fixture change shifts layout, say so in your report with the offset. Never re-baseline a visual check to make it green.

Evidence discipline: label every causal claim RAN / TESTED / INFERRED / GUESSED, including to me. If a check cannot fail it is not a check, so before adding one, name the independent variable and what a null result proves.

REVIEW: none - reviewed as part of the assembled one-native foundation

Report back one compact message when done: what landed, the generate:check receipt line (declarations, mapped symbols, generated files), your branch SHA, and honest remaining gaps. Then stop.
