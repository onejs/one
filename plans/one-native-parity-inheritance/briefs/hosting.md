You are implementing the hosting and presentation gaps in one-native. Nate's scope rule for the campaign: implement basically everything, except APIs that are deprecated and unused, or iPad-only.

Your worktree. Create it yourself and work only there:
  git worktree add /Users/n8/.worktrees/one-native-hosting -b feat/one-native-hosting feat/one-native
Run every command from that directory. Do not touch /Users/n8/.worktrees/one-native (mine, live) or ~/one (stays on main).

Read first: plans/handoff-one-native-parity.md in full, and plans/one-native-swiftui-gap.md.

Scope, three things:

1. The known defect under the handoff heading "Known defect: mounting a tab moves the displayed page". Do this FIRST, it is a correctness bug in shipped behavior. Swift.Tabs shows the page of the tab at index 0 when the page list changes while the selection is not index 0. The bar highlights correctly while the content does not, and the mounted page drops out of the accessibility tree entirely. The handoff carries the exact reproduction: tabs [second, first] with selection 'first', mount a third tab, it paints "Second tab" while the bar highlights First, and the fixture's reorder button restores it with nothing else changed. It is not about the new tab's role or its onPress, and it does not happen when the selected tab is already index 0. Fix the cause: work out why replacing model.pages loses the selection-to-content association in TabsContent, which is currently untouched. Do not patch it at the failure site.

2. Environment propagation on Host and Form, item 1 of "Next work" and the top-ranked gap. colorScheme, dynamicTypeSize, locale, tint, isEnabled set once per screen and inherited instead of per control. The handoff notes 148 EnvironmentValues keys are currently neither readable nor writable, so decide and document which set you expose and why rather than binding all 148.

3. Item 4: sheet sizing-to-content, selected detent binding, presentation background, presentation interaction, presentation sizing, and the `presenting:` value-bound alert overloads. presentationCompactAdaptation already landed with Popover, so follow that as the pattern.

How this package works: codegen/Extract.swift parses .swiftinterface files, inventory.ts builds the symbol map, generate.ts drives the emitters, output lands in ios/Generated/ and src/generated/. Never hand-edit generated files, change the mapping and regenerate.

Gate, run from packages/one-native:
  bun run generate:check
codegen, output diff, swiftc -typecheck over every .swift in ios/ and ios/Generated/, and the controlled-state probe. Green before you report. Also bun run typecheck and bun run test.

One hard rule specific to your scope: NEVER reset Fabric _props during recycle without a corresponding UIView reset. That pairing is load-bearing in this package and your tab fix is near it.

What you must NOT do:
- Do not boot a simulator, do not run the device conformance suite. I own 36CB8903-C59C-4438-BA29-E7A3C8876C37 and another agent is capturing pixel oracles on it now; the suite is load-sensitive and a second CoreSimulator client corrupts both. I run the device suite at integration. This means you cannot visually confirm the tab fix yourself. Get it right by reading TabsContent and reasoning about the selection-to-content association, then tell me exactly what you want me to run to confirm it.
- Do not touch port 8107.
- Do not push. Commit to your branch, report the SHA to me.
- Nothing outside packages/one-native and its fixture. Not soot, not rnx.

Visual check regions are ABSOLUTE fixture coordinates. Adding a control shifts everything below it; the handoff records a 39pt shift that broke five checks which were not regressions. Report any shift you cause with its offset. Never re-baseline a visual check to make it green.

Evidence discipline: label every causal claim RAN / TESTED / INFERRED / GUESSED, including to me. A fix carries premises and premises are claims, so name each premise your tab-defect fix depends on and label it. If the fix would be wrong were premise X false, you must have READ X.

REVIEW: none - reviewed as part of the assembled one-native foundation

Report one compact message when done: what landed, the root cause of the tab defect in one or two lines, the generate:check receipt, your branch SHA, exactly what you want me to confirm on device, and honest remaining gaps. Then stop.
