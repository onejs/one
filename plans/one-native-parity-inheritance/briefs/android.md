Planning session. Produce a written plan, not code. Do not implement anything, do not commit, do not touch any branch.

## Context

`~/.worktrees/one-native` (branch `feat/one-native`, do NOT check out or modify it, read only) holds `packages/one-native`: a package that GENERATES React Native Fabric components whose native implementation is SwiftUI.

How it works today:
- `codegen/Extract.swift` + `codegen/inventory.ts` parse Apple's shipped `.swiftinterface` files out of the iOS SDK (`xcrun --sdk iphonesimulator --show-sdk-path`, then `System/Library/Frameworks/SwiftUI.framework/Modules/SwiftUI.swiftmodule/arm64-apple-ios-simulator.swiftinterface`). That yields ~9,715 public declarations.
- `codegen/catalog.ts` is the hand-curated map: which SwiftUI types/modifiers/enums we expose, and under what prop names.
- `codegen/generate.ts` plus emitters (`emitControls.ts`, `emitSheet.ts`, `emitContainers.ts`, `emitPopover.ts`, `menuValidator.ts`) emit: RN codegen specs (`src/specs/`), TS prop types (`src/generated/`), Swift views (`ios/Generated/`), and ObjC++ Fabric component views.
- Crucially the generator VALIDATES the catalog against the real SDK signatures, so if Apple changes a signature the build fails rather than drifting.
- Runtime pieces that are hand-written, not generated: `ios/OneNativeComposition.swift` (a composition contract letting a SwiftUI control render inside a parent's hosting controller instead of joining the UIView hierarchy), `ios/OneNativeSlot.swift` + `cpp/OneNativeSlotShadowNode.h` (carrying a React Native subtree into a SwiftUI container, including presented contexts like sheets and popovers), and `cpp/OneNativeMeasuredShadowNode.h` (SwiftUI measures itself, writes height only into Yoga).

Read these first, they are the fastest path in:
- `plans/one-native-layout-design.md`
- `plans/handoff-one-native-parity.md`
- `packages/one-native/codegen/catalog.ts`
- `packages/one-native/codegen/generate.ts`
- `packages/one-native/ios/OneNativeComposition.swift`

State: 126 mapped symbols, 89 generated files, and nine simulator conformance suites pass (tabs-menu, pickers, forms, sheets, leaves, dialogs, host, containers, popover). Fixtures live in `tests/native-features/`.

## What I want from you, in one document

Write it to `plans/one-native-android.md` in that worktree (writing that ONE new file is the only write you are authorized to make).

**1. The Android design.** What is the ideal equivalent? Jetpack Compose is the obvious target, but the hard question is the source of truth. iOS works because Apple ships machine-readable `.swiftinterface` with exact signatures. Android has no such thing in the same form. Investigate the real candidates and recommend one with evidence:
- androidx binary-compatibility-validator `.api` dump files (the `api/*.api` files shipped in androidx source and in some artifacts)
- Kotlin `@Metadata` annotations inside the Compose `.jar`/`.aar` artifacts
- `.klib` / module metadata
- something else you find
Say which actually contains parameter names, default values, and nullability, since those are what the catalog needs. If none gives you what `.swiftinterface` gives, say so plainly and describe what the degraded version looks like.

**2. The parts that do NOT port.** The iOS runtime leans on UIViewController containment, `UIHostingController`, SwiftUI's `.onGeometryChange` measurement, and a presentation model where a popover/sheet leaves the RN surface and needs its own touch handler. Work out what the Compose equivalents are (`ComposeView`, `AndroidView`, subcomposition, `SubcomposeLayout`, dialog/popup windows) and where the analogy breaks. Be specific about the measurement story and the "React Native subtree inside a Compose container" story, since those were the two hardest problems on iOS.

**3. Honest critique of the iOS work.** Where is it over-engineered, where is it under-built, what will hurt in six months? Name files. Specifically assess: is the composition contract the right abstraction or is it doing too much; is generating from the SDK worth the constraint it imposes; what does the catalog's curation cost as SwiftUI grows.

**4. What else to do on iOS.** Known gaps already recorded: sheet sizing-to-content, selected detent binding, presentation background/interaction/sizing, the `presenting:` value-bound alert overloads, `attachmentAnchor`. Rank those plus anything you find, by value over cost. One open question worth your take: should there be an escape hatch for components better served by UIKit than SwiftUI (a zoomable image viewer backed by `UIScrollView`, `QLPreviewController`, `UIViewControllerTransition.zoom`), and what would that cost the architecture?

## Bounds

- You do NOT own: implementation, the `feat/one-native` branch, any commit or push, the iOS simulator, the dev server on port 8107, npm/releases, or any other session's work. Do not run builds or conformance suites.
- Read and think, then write the one plan file. Keep tool calls bounded and targeted.
- Label every causal claim RAN / TESTED / INFERRED / GUESSED. If you did not open a file, do not assert what is in it.
- REVIEW: none - this is a planning document, it gets reviewed by me when I read it.
- When the document is written, report back to the session that spawned you with: the recommended Android source-of-truth and why, the single biggest risk, your top three iOS criticisms, and your ranked iOS next-work list. Then stop.
