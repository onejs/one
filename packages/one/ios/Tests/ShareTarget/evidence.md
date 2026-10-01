# Native iOS ShareTarget — validation evidence (correction pass)

Scope: `packages/one/ios/ShareTarget/` and this harness only. No Podspec,
Nitro, codegen, project, or JS changes. Built on `v2-beta` starting from
`92cc4191e`, correcting the issues the parent task found in that commit.

## What changed and why

Nine source-level problems were identified in review of `92cc4191e`. Each is
fixed at its source, not patched around:

1. **`runIntake` never showed the system compose text in an editable field.**
   Fixed by switching the compose controller's base class from a bespoke
   `UIViewController` to `SLComposeServiceViewController` (`OneShareComposeViewController.swift`),
   the same base the Xcode Share Extension template uses. Its `textView` is
   preloaded with the share's initial text in `presentationAnimationDidFinish`.
2. **Plain-text-first intake lost the URL representation.** Many providers
   (Safari's page share, for example) offer both a URL and an equivalent
   plain-text title for one attachment; `OneShareTargetIntake.intakeOne`
   checked text before URL, so the link was silently discarded in favor of
   its title. Reordered: URL wins first (`OneShareTargetIntake.swift`).
   Regression test: `testURLRepresentationWinsOverEquivalentPlainText`.
3. **Default-style `UITableViewCell`s hid subtitle/metadata.** The destination
   picker (now a pushed `SLComposeSheetConfigurationItem`'s
   `DestinationListViewController`) uses `.subtitle`-style cells, so a
   destination's `subtitle` is actually visible.
4. **Root `UIViewController` had no navigation bar, so Cancel/Send were
   invisible.** A bare `UIViewController` set as an extension's principal
   class is never wrapped in a `UINavigationController`; nothing renders its
   `navigationItem` buttons. `SLComposeServiceViewController` supplies its own
   chrome with Cancel/Post built in — this is structural, not a workaround.
5. **Cancel/discard raced pending copy and async persist tasks, able to
   recreate a cancelled draft.** Fixed by extracting all of this sequencing
   into a new, UIKit-free actor, `OneShareTargetSubmissionCoordinator.swift`,
   whose `cancel()` awaits the in-flight load task (and any queued persist)
   before discarding, and whose `persistNow()` is gated by an `isTerminal`
   flag re-checked at the moment of the actual write (not just by callers).
   Regression tests: `testCancelDuringLoadAwaitsLoadBeforeDiscardingAndLeavesNoDraft`,
   `testPersistIsRefusedAfterCancelEvenIfAttemptedDirectly`.
6. **A `destinations()` failure left copied files with no persisted draft.**
   The coordinator now persists immediately after intake, before calling
   `destinations()`, so a failure there never drops already-copied work.
   Regression test: `testDestinationsFailureStillPersistsCopiedItems`.
7. **A successful delivery could race a queued save and recreate the
   draft.** `send()` sets `isTerminal` before discarding; `persistNow()`
   refuses to write once `isTerminal` is set, checked fresh at write time.
   Regression tests: `testSuccessfulSendDiscardsDraftAndBlocksAnyLaterPersist`,
   `testPersistIsRefusedAfterSuccessfulSendEvenIfAttemptedDirectly`.
8. **No strict state machine; sending could be presented as cancellable.**
   `OneShareComposeState` (loading/ready/failed/sending/cancelling/delivered/
   cancelled) gates every coordinator action. `cancel()` is refused outright
   once `state == .sending`; the compose controller also disables the
   Cancel/Post buttons the instant `didSelectPost()` runs, so the control
   itself is gone, not just logically refused. Regression test:
   `testCancelIsRefusedWhileSendIsInFlight` (send is made to take 50ms so a
   concurrent cancel has a real window to attempt the race).
9. **No byte/count budget on text or URL items despite config fields for
   it.** `OneShareTargetIntake` now bounds every representation kind — text,
   URL, and file — against `maxItemBytes`/`maxTotalBytes`, not just files;
   `totalBytes` accumulates for every kind, not only `.file`. Regression
   tests: `testRejectsOversizeTextAttachment`, `testRejectsOversizeURLAttachment`,
   `testTextAndURLItemsCountTowardTotalBudget`. The compose controller
   exposes `coordinator.isSendable`/`textByteCount`/`textByteBudget` so the
   UI layer can refuse Send over budget (`testIsSendableFalseWhenTextExceedsByteBudget`).

## RAN: compile validation against the iOS simulator SDK

Same method as the prior pass, now covering the new coordinator file and the
rewritten compose controller:

```
SDK=$(xcrun --sdk iphonesimulator --show-sdk-path)
xcrun swiftc -sdk "$SDK" -target arm64-apple-ios17.0-simulator \
  -swift-version 6 -strict-concurrency=complete -application-extension \
  -emit-module -emit-object -wmo -module-name OneShareTarget \
  -o module.o -emit-module-path OneShareTarget.swiftmodule \
  OneShareTargetAdapter.swift OneShareTargetConfiguration.swift \
  OneShareTargetIntake.swift OneShareTargetDraftStore.swift \
  OneShareTargetSubmissionCoordinator.swift \
  OneShareComposeViewController.swift OneShareTargetViewController.swift
```

Exit 0, **zero errors, zero warnings**, for all seven files together as one
module, under Swift 6 language mode, full data-race checking, and
`-application-extension` (rejects any non-extension-safe API; `Social`'s
`SLComposeServiceViewController` is extension-safe by design — it's Apple's
own Share Extension template base class).

## RAN: executable test harness (`swift test`)

`OneShareTargetSubmissionCoordinator.swift` is now symlinked into
`Sources/OneShareTargetCore/` alongside the other non-UIKit files (it has no
UIKit/Social dependency itself — that's the point: all the
concurrency-sensitive sequencing is UIKit-free and therefore really
testable, not just typecheckable).

```
cd packages/one/ios/Tests/ShareTarget && swift test
```

Result: **24/24 tests passed** (11 intake, 5 draft store, 8 coordinator).

Every new coordinator regression test was verified to actually catch its
bug, not just pass by construction:
- Removed `await loadTask?.value; await persistTask?.value` from `cancel()`
  → `testPersistIsRefusedAfterCancelEvenIfAttemptedDirectly` and
  `testPersistIsRefusedAfterSuccessfulSendEvenIfAttemptedDirectly` both
  failed with a real recreated draft in the assertion message. Restored the
  fix → both pass again.
- `testCancelDuringLoadAwaitsLoadBeforeDiscardingAndLeavesNoDraft` exercises
  the real scheduling path (a 50ms-delayed `destinations()` call, cancel
  fired mid-flight) but cannot deterministically force the exact actor
  reentrancy window the fix closes — that's what the two tests above are
  for, calling the same guarded write (`persistNow()`, made internal
  specifically for this) directly after cancel()/send() to prove the guard
  holds under the condition a real race would produce.

## RAN: real installed host app + Share Extension on a booted simulator

This is new relative to the prior pass, per the corrected brief. Built under
`UIHarness/` (new, this task's scope): a host app (`HostApp/`) and a real
Share Extension (`ShareExtension/`) whose principal class
(`GeneratedHarnessShareViewController`) subclasses `OneShareTargetViewController`
exactly as a real generated class would, backed by a generated-style adapter
stub (`Shared+ShareExtension/HarnessShareTargetAdapter.swift`) controlled via
an app-group `UserDefaults` flag the host app sets before sharing.

`UIHarness/build.sh <simulator-udid>`:
- Compiles the extension with the **exact same strict flags** as above
  (`-swift-version 6 -strict-concurrency=complete -application-extension`),
  directly against the real `ShareTarget/` sources (no copies) plus the
  harness adapter — exit 0.
- Compiles the host app normally.
- Assembles `HarnessHost.app/PlugIns/HarnessShareExtension.appex`, ad-hoc
  codesigns both with the app-group entitlement, installs via
  `xcrun simctl install`.

Claimed simulator: **iPhone 17 Pro, iOS 27.0** (`C75DA2BC-721A-491D-A8C4-65943DA33F67`,
one of the standard pre-provisioned simulators — no new simulator created).

RAN against that simulator, via `xcodebuildmcp ui-automation` (AXe-backed,
no focus-stealing GUI automation):
- Launched the host app: real accessibility snapshot shows its three buttons
  (`evidence/01-host-app.png`).
- Tapped "Share (success path)": the **real system share sheet appears**,
  showing the shared URL's live preview card and an activity row that
  includes our installed extension (`evidence/02-system-share-sheet-with-extension.jpg`).
  This proves the extension is correctly registered (`NSExtensionActivationRule`
  matched a URL+text share) and discoverable by the system — not just
  "installed," but offered as a real share target.

## Constraint, recorded truthfully: could not automate past the share sheet

The brief asks for screenshot/accessibility proof of picker → initial
text/edit → send/cancel/errors inside our extension's own UI. I could not
get there, and I'm recording exactly why rather than asserting it worked:

Three independent automation paths were tried to tap our extension's
specific icon inside the system share sheet:
1. **`idb`** (what the project's own `ios-simulator-skill` is built on) is
   not installed, and installing it requires trusting an untrusted Homebrew
   tap (`facebook/fb`) — a system config change I didn't make unprompted.
2. **AppleScript/System Events** (direct UI scripting of `Simulator.app`)
   hangs indefinitely on every call in this session — there is no
   interactive GUI session here for a permission dialog to appear in, so it
   can never be granted. Confirmed by three independent timeouts.
3. **`xcodebuildmcp ui-automation`** (AXe-backed, no permission dialog
   needed, and the only one of the three that actually worked for the host
   app's own UI) resolves the share sheet's icon row only as a set of
   **identically-framed, unlabeled generic elements** (`e16`..`e30`, all
   reporting the exact same bounding box, the whole sheet) — confirmed by
   two independent verbose snapshots after explicitly waiting for the sheet
   to settle. There is no element-level way to distinguish "tap our icon"
   from "tap any other icon in that row" through this tool; every available
   tap/touch action is ref-based, and no raw-coordinate tap exists in this
   CLI's surface (by design, per its own help text).

What this does and doesn't prove: the extension is built correctly
(strict-concurrency, extension-safe), installed correctly, registered
correctly (the system offers it as a share target for the content shared),
and the host app automation up to that point is real, not asserted from
compile. What remains unverified by screenshot is the compose controller's
on-device rendering and interaction (initial text, destination picker, byte
budget, send/cancel/error paths) — those are covered by real `swift test`
regression tests at the state-machine level (section above) and by the
zero-warning strict compile, but not by a simulator screenshot of the
extension's own window.

The documented, Apple-sanctioned way to automate *inside* a Share
Extension's UI is an XCUITest target that attaches to the sharing-services
system process by bundle ID (`XCUIApplication(bundleIdentifier:)`), which
needs an actual `.xctestplan`/`xcodebuild test` setup rather than a
swiftc-only harness. Building that is the natural next step for whoever
picks this up next, and `UIHarness/` (host app + extension + build script)
is left in place as the foundation for it — it is a real, working,
installable harness up to exactly the point recorded above.
