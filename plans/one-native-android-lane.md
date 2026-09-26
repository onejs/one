# One native Android lane

Owner: android-lane (r46336). Active on `v2-beta`. Android is lower priority than the iOS lanes when shared builders are busy.

## Baseline and boundary

- **RAN:** `packages/one/src/platform/compose.android.tsx` and `packages/one/android/src/main/java/dev/onejs/onenative/OneNativeComposeNodeView.kt` expose Column, Row, Box, Text, Icon, Button, Switch, TextField, Slider, AlertDialog, Dialog, and ProgressIndicator. The existing `one-native-conformance.android.ts` drives the initial controls on an emulator.
- **RAN:** Peach already registers the upstream `@expo/ui/jetpack-compose` native view names in `packages/peach-compat/src/stubs/native-seams/expo-ui-jetpack-compose.tsx`, with two paired Android library cases. The Expo UI coverage lane owns that package's iOS work. This lane owns Android gaps and the Android proof.
- One iOS API implementation and Swift/Kotlin import belong to their own lanes. Android API counterparts follow their public contracts as they land.

## Order

1. Extend the existing Compose node transport with the next useful Material 3 controls: Checkbox, RadioButton, chips and selection groups, then common layout and presentation components. Reuse the existing controlled event protocol and native composition owner; add no second host path.
2. For each control, compare One's exposed props and behavior with the corresponding Android `@expo/ui/jetpack-compose` component, run the One app on an emulator, and prove initial state, interaction, controlled rejection/acceptance, disabled behavior, and remount where relevant. Keep visual changes on a review branch with paired before/after evidence.
3. Run Peach's paired Expo UI Jetpack cases on Android, record the first reproducible divergence, fix the native seam or engine owner, and rerun the same checkpoint. Coordinate file ownership with the Expo UI coverage lane.
4. Follow each new One iOS service API with its Android implementation when the platform offers it. Record Android-specific permission and lifecycle behavior in the One native docs and prove it on the emulator.

## Coverage map at lane start

**RAN:** The installed Expo UI `jetpack-compose/index.ts` exports host/layout, text/icon/image, button variants, cards, chips, selection controls, feedback, motion, overlays, navigation, text input, search, carousel, and date/time components. One has the 12 nodes above. Its first missing high-use components are Checkbox, RadioButton, chips, and cards. This lane starts with Checkbox because it fits the existing controlled boolean transport and native Material 3 theme.

**RAN:** Peach's Android native view registry supplies nearly all of those groups, including Checkbox and RadioButton. `DatePickerDialogView`, `TimePickerDialogView`, and `DateTimePickerView` explicitly throw unsupported because their Material 3 calendars, clock dial, and range interaction are missing. Those are measured Peach targets after the One controls, with the Expo UI coverage owner retaining the iOS side.

## Acceptance for each objective slice

- The exact Android source and public JS boundary agree; senders and receivers are updated together.
- A real Android emulator shows the new behavior and a negative control that would fail without the change.
- The narrowest type/build check passes. Sync with `origin/v2-beta`, commit narrowly, and push `HEAD:v2-beta` without publishing a package.
