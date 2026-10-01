# Native iOS ShareTarget — validation evidence

Scope: `packages/one/ios/ShareTarget/` (new standalone native source) plus this
harness. No Podspec, Nitro, codegen, or JS changes — that integration belongs
to the parent task (`t-mupvw47l-x5z0`). Everything here was produced on
`v2-beta` at `c083a7149`.

## Files

- `OneShareTargetAdapter.swift` — the protocol apps implement
  (`init()`, `destinations() async throws -> [OneShareDestination]`,
  `send(submission:) async throws`), plus the typed model
  (`OneShareDestination`, `OneSharedItem`, `OneSharedFile`,
  `OneShareSubmission`) and `OneShareTargetError`.
- `OneShareTargetConfiguration.swift` — static per-extension config (app group
  id, accepted text/URL/file types, count/size limits).
- `OneShareTargetIntake.swift` — turns the Share sheet's `NSItemProvider`
  attachments into bounded, chunk-copied `OneSharedItem`s. Also defines
  `OneShareTargetCancellationFlag`, a lock-protected flag safe to read from
  the arbitrary queues `NSItemProvider` completion handlers run on.
- `OneShareTargetDraftStore.swift` — persists a draft (text + copied item
  metadata) keyed by stable submission id, under the app-group container (or
  an arbitrary directory, for testing).
- `OneShareComposeViewController.swift` — the native compose controller:
  system compose text input, destination picker, attachment preview list,
  Send/Cancel, error display. `open var configuration` and
  `open func makeAdapter()` are the two override points.
- `OneShareTargetViewController.swift` — the class generated code actually
  subclasses (a thin, stable subclass of the compose controller above), with
  a worked example of a generated principal class in its doc comment.

## RAN: compile validation against the iOS simulator SDK

Direct `swiftc` compiles (no Xcode project needed, since wiring a project/
Info.plist/entitlements is the parent task's integration work), targeting the
real iPhone 17 Pro / iOS 27 toolchain's iphonesimulator SDK:

```
SDK=$(xcrun --sdk iphonesimulator --show-sdk-path)   # .../iPhoneSimulator27.0.sdk
xcrun swiftc -sdk "$SDK" -target arm64-apple-ios17.0-simulator \
  -swift-version 6 -strict-concurrency=complete -application-extension \
  -emit-module -emit-object -wmo -module-name OneShareTarget \
  -o module.o -emit-module-path OneShareTarget.swiftmodule \
  OneShareTargetAdapter.swift OneShareTargetConfiguration.swift \
  OneShareTargetIntake.swift OneShareTargetDraftStore.swift \
  OneShareComposeViewController.swift OneShareTargetViewController.swift
```

Exit 0, zero errors, zero warnings. A real `.o` and `.swiftmodule` are
produced. This validates, for all six files together as one module:
Swift 6 language mode, `-strict-concurrency=complete` (full data-race
checking), and `-application-extension` (the flag that rejects any
`UIApplication`/app-only API use, which `APPLICATION_EXTENSION_API_ONLY`
enforces at the Xcode build-setting level).

One real issue surfaced here and was fixed in place: passing
`[NSItemProvider]` from the `@MainActor` compose controller into intake's
`@concurrent` method was flagged as a potential data race (`NSItemProvider`
isn't annotated `Sendable` upstream). Fixed with a documented, scoped
`@unchecked @retroactive Sendable` conformance in `OneShareTargetIntake.swift`
— `NSItemProvider`'s own API contract is callback-based across queues, so
this reflects an already-true guarantee rather than papering over a real
race.

## RAN: executable test harness (`swift test`)

`Package.swift` in this directory builds `OneShareTargetCore`, a SwiftPM
target whose sources (`Sources/OneShareTargetCore/*.swift`) are **symlinks**
into `../ShareTarget/*.swift` — the real files, not copies — excluding the
two UIKit files (SwiftPM's host toolchain build has no UIKit; those are
validated above instead). `swift test` runs real logic against real
`NSItemProvider`s and real files on disk:

```
cd packages/one/ios/Tests/ShareTarget && swift test
```

Result: **12/12 tests passed** (`OneShareTargetDraftStoreTests`,
`OneShareTargetIntakeTests`). Covered: accompanying-text preservation,
bounded chunked file copy (exact byte count, content integrity),
per-item size rejection, total-budget rejection across attachments,
too-many-attachments rejection, mid-copy cancellation, unsupported-attachment
rejection (never a silent drop), draft save/load round-trip, scoped discard
(removes only the targeted submission and its files), and a missing/
unprovisioned app-group container surfacing as a typed error.

Two real bugs were caught by this harness and fixed, not worked around:

1. `OneShareTargetIntake`: a rejected or cancelled file copy left an empty
   per-item directory behind (the file itself was removed, its parent
   directory wasn't). Fixed by removing the whole per-item directory in the
   failure path.
2. `OneShareTargetDraftStore.init(appGroupIdentifier:)`: on this host,
   `FileManager.containerURL(forSecurityApplicationGroupIdentifier:)` returns
   a non-nil path even for a nonexistent group (it only fails later, at
   write time, with a POSIX permission error) — so the original code let a
   raw `NSCocoaErrorDomain` error escape instead of the typed
   `missingAppGroupContainer`. Fixed by catching that failure and rethrowing
   the typed error, so callers get one consistent error regardless of which
   way the app-group resolution actually fails.

## Constraint, recorded truthfully: no booted-simulator UI harness

The brief asks for a "dedicated claimed simulator native harness if
feasible." A real Share-extension UI run (system share sheet → our
`OneShareTargetViewController` → Send/Cancel) requires an installed app +
extension bundle: an `Info.plist` with `NSExtensionPrincipalClass`, an
app-group entitlement, and a host app to share *from*. Building that is
explicitly the parent task's scope (`t-mupvw47l-x5z0` owns codegen,
Podspec/project wiring, and the generated principal class) — this task's
scope is new files under `ShareTarget/` only, with "no shared config/Nitro/
spec/Podspec/JS edits." Assembling a throwaway Xcode project here to get a
UI screenshot would mean building exactly that integration work out of
scope, with no reuse once the parent's real integration lands.

What is validated instead, and why it's the right substitute given scope:
compile-correctness and concurrency-safety of the actual shipped files
against the real iOS 27 simulator SDK (above), and real execution of every
non-UI code path (intake, bounds, cancellation, persistence) against real
system APIs (above). The UIKit compose controller's logic (state machine,
button wiring, table data sources) was written to the same patterns and
typechecks under `-application-extension`, but its on-device behavior is
unverified pending the parent's integration, and should get a real
simulator run once that wiring exists.
