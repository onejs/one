Design pass on SwiftUI navigation for packages/one-native. A written proposal, no production code.

Context. packages/one-native generates SwiftUI bindings for React Native Fabric components from
parsed .swiftinterface files. Read these first, in the repo at /Users/n8/.worktrees/one-native:
packages/one-native/README.md, plans/handoff-one-native-parity.md, plans/one-native-swiftui-gap.md.
They explain the pipeline and where it stands. 29 controls are bound today.

The gap. 22 navigation modifiers and 8 search modifiers are bound at zero: NavigationStack,
NavigationLink, navigationDestination, navigationTitle, toolbar and its ten companions, searchable
and its seven.

The tension you have to resolve. One's router (packages/one) is built on
@react-navigation/native-stack, which on iOS is react-native-screens driving a UINavigationController.
SwiftUI's NavigationStack wants to own its own navigation state. Two owners of one back stack is the
whole problem. Your proposal has to say who owns what.

Answer each of these with evidence, not memory:

1. Is a SwiftUI NavigationStack inside a Fabric view viable at all, or only if it hosts the whole
   screen? What happens to the RN gesture recognizers, interactive swipe-back, and the safe area?
2. Which subset is worth binding WITHOUT owning the back stack? A UIHostingController that is a
   child of a UINavigationController may share the navigation item, which would make navigationTitle,
   toolbar, toolbarBackground and searchable useful with no stack ownership at all. Verify that claim
   or kill it. Do not assume it.
3. If NavigationStack is bound, how does a JS route change reach it and how does a native push reach
   the JS router? Name the mechanism in terms of the existing controlled protocol
   (packages/one-native/src/controlled.ts, packages/one-native/ios/OneNativeControlled.swift), or say
   why that protocol does not fit.
4. searchable: which of text binding, suggestions slot, and scope bar does the existing container and
   slot mechanism already support (packages/one-native/codegen/emitContainers.ts,
   packages/one-native/ios/OneNativeSlot.swift)?
5. A phased recommendation, smallest useful thing first, plus an explicit list of what you recommend
   NOT building.

One thing changed today that you should assume: the package floor is now iOS 26, not 18. Availability
gating is no longer a design constraint. Anything in the iOS 26 SDK is fair game.

Rules. Label every causal claim RAN / TESTED / INFERRED / GUESSED; relay never upgrades a label. If a
check cannot fail it is not a check, so name the independent variable before you run one. Cite
file:line for every claim about this repo and the .swiftinterface or the parsed inventory
(packages/one-native/codegen/inventory.ts) for every claim about the SDK. No em-dashes.

Deliverable. From /Users/n8/.worktrees/one-native run
  git worktree add ~/.worktrees/one-native-nav -b feat/one-native-nav feat/one-native
Work only in ~/.worktrees/one-native-nav. Write plans/one-native-navigation-design.md there, commit,
push the branch. Commit messages short, no attribution lines.

Then report back to me in ONE compact message: the recommendation in three lines, the single riskiest
unknown, and the branch name. Nothing else.

REVIEW: none - this design pass is itself the pre-implementation review.

You do NOT own: simulator 36CB8903-C59C-4438-BA29-E7A3C8876C37, the dev server on port 8107, branch
feat/one-native, the primary checkout at ~/one, tests/native-features/ios, or any release, publish,
npm tag or workflow dispatch. Do not build or run the iOS app. Do not spawn sub-agents. Do not edit
anything outside your own worktree.
