# Native launch CI and starter readiness

Nate, 2026-10-05, as quoted in the native-lead assignment: "get One Native to
basically launch ready".

This lane owns build gates, coverage reporting, and the Basic starter's run
instructions. Native-lead coordinates delivery. Android Compose coverage and
iOS parity remain in their assigned lanes. The assembled launch checklist is
in `one-native-launch.md`.

## Repairs

- Forward every `prebuild:native` argument to `one prebuild`. Prepare the two
  iOS simulator hooks only when generating iOS, and stop when generation fails.
- Compile the native-features Android APK on native changes and relevant PRs.
  The job installs JDK 17 and the SDK/NDK used by the RN 0.87.1 template, builds
  x86_64 with two Gradle workers, and retains the APK as an artifact.
- Generate Basic's native projects in the corresponding iOS and Android jobs.
  Its README uses the scripts that its package actually defines.
- Include One's package metadata, Nitro registration, native autolinking config,
  and the Basic starter in iOS workflow triggers.
- Remove the invalid `type` field from the install action's composite input.
- Explain coverage table limits in the generated report itself.

## Coverage limits

RAN: the coverage test passed on this lane's base with 227 export rows. 28 iOS
cells and 32 Android cells are `missing`; 13 Android cells name only the
historical `native-modules:unavailable` checks. These are fixture-reference
counts. They do not measure passing current runtime behavior.

The Android media driver is separate from the main conformance runner. Its
Audio, Contacts, Calendar, and PhotoLibrary receipts are described in
`one-native-android-lane.md`; an unavailable-only table cell must not erase
those receipts or substitute for rerunning the supported implementation.

Build gates establish native compilation and linking. They do not close the
matrix's runtime gaps. Widget extension targets, physical-device-only features,
unvisited UI fixtures, and the remaining Android service/hook suites still need
their own focused proof. Keep each proof's positive, negative, and lifetime
conditions with its fixture.

## Validation and delivery

TESTED: the original fixture script fails the Android-without-iOS check and
drops the iOS CLI options. The replacement passes CLI forwarding, Android hook
exclusion, ordered iOS hook execution, default-platform hooks, and failure exit
propagation. The focused fixture/CLI/coverage/docs run passed 140 checks.

RAN: both Basic and native-features generated iOS and Android projects using the
actual worktree-built One CLI. The real iOS fixture preparation also completed.
Android workflow `actionlint` passed. Existing iOS
workflow lint reports its custom runner label and existing shellcheck findings;
those are outside these changed steps.

RAN: the local Gradle attempt exited 75 at resource admission because the heavy
window was occupied. Gradle did not run. Native APK compilation and the updated
iOS build job remain pending CI under native-lead p63991. Local logs are
`/tmp/one-native-launch-ci-{before,after,tests,coverage,fixture-prebuild,starter-prebuild,fixture-ios-prebuild,starter-ios-prebuild,gradle}.log`.

The creator clones `v2-beta-starter`. Its README repair is also committed there
as `7778424a8`, with the same bytes as this lane's `v2-beta` example.
