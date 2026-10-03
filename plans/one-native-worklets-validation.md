# Worklet validation

Work in progress for rank 3 of `plans/one-native-launch.md`; public package
contract and shared-value proposal are separate on `feat/native-blessed-packages`.

RAN: native-features iOS Debug build (iOS 27, iPhone 17 Pro 3) and Android
Debug build succeeded. Both binaries link Worklets 0.12.2 and Reanimated 4.6.0.
Binaries were built from primary One 506ff623d with concurrent native service
and navigation edits, before those edits were committed; generated project
and dependency outputs were built locally. No clean-source build claim.

RAN: the extended gesture fixture passed on iOS simulator
E6192F15-5A25-477F-B48D-329F9FCBF408 and owned Android emulator-5584 (API 37).
Each run asserted pending initial callbacks, `runOnUI` reporting UI runtime
and moving the view 40 points, a layout callback reporting UI runtime and
width changing 72 to 180, then a physical drag reporting UI runtime and
finishing the 120-point timing animation. Receipts and before/after PNGs:
`/tmp/one-worklets-proof/{ios,android}`. Android emulator released after proof.

Negative observation: configuring a separate compiler instance left Worklets'
install functions untransformed; iOS failed with `Cannot read property bytecode
of undefined`. The harness now configures the compiler instance the bundler
actually reads. Those early trial timings are discarded.

RAN: web proof passed, including layout, runOnUI, physical pan and timing animation. The web harness resolves web module variants and passes
the fixture through One's worklet transform, so Reanimated gets inferred
closures for `useAnimatedStyle`. It uses React Native Web for this existing
third-party fixture, rather than One.UI components.

Benchmark is pending under `bun heavy --exclusive`. Counterbalanced fresh
processes produce cold and warm full iOS production bundles (not cached
bundle responses), minification and source maps off; config/setup excluded.
Both apps use Vite's native config loader because config bundling failed on
Contrast's `import.meta.resolve` with a synthetic Vite module identifier.
Starter receipt: `/tmp/one-worklets-starter-final-native-config.json`.
Contrast IDE root disables native; that attempted graph is discarded. Correct
mobile root: `~/contrast/templates/contrast-mobile`, pending receipt
`/tmp/one-worklets-contrast-mobile-final.json`. The harness rejects native:false.
Do not remove the Babel backend until both comparisons and runtime proof pass.

Built apps available for reuse:
- `/tmp/one-worklets-ios/Build/Products/Debug-iphonesimulator/NativeFeatureTests.app`
- `tests/native-features/android/app/build/outputs/apk/debug/app-debug.apk`

Steps 3 and 4 remain unlanded until validation finishes. Step 5 is design only.

Wait on the admitted measurement's heavy wrapper PID without polling:
`tm wait --exec 'python3 scripts/watch-worklets-process.py <pid>' --timeout 45m`.
The watcher uses macOS process exit events and wakes on success or failure;
inspect both receipt files and tool output after waking.
