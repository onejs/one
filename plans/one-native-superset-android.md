# One Native superset: android worker status

Worker `native-android`. Owns `packages/native/android/`, `src/compose*`,
Compose docs/tests. Never touches `ios/`, `codegen/`, Swift `src/`.

Expo Compose target (docs.expo.dev/versions/latest/sdk/ui, ~48 entries):
AlertDialog, Badge, BadgedBox, BasicAlertDialog, Box, Button, Card, Carousel,
Checkbox, Chip, Column, DateTimePicker, Divider, DockedSearchBar, DropdownMenu,
ExposedDropdownMenuBox, FloatingActionButton, FlowRow, HorizontalFloatingToolbar,
HorizontalPager, Host, Icon, IconButton, LazyColumn, LazyRow, ListItem,
LoadingIndicator, Material Colors, ModalBottomSheet, Modifiers, NavigationBar,
Progress indicators, PullToRefreshBox, RadioButton, RNHostView, Row, SearchBar,
SegmentedButton, Shape, Slider, Snackbar, Spacer, Surface, Switch, Text,
TextField, ToggleButton, Tooltip, useNativeState.

## Now

- Milestone 2 next: LazyColumn + ListItem, Card, Chip, Checkbox, RadioButton.
- Registry call: per-node TS is ~30 lines on shared validators and Kotlin
  renderers cannot be data-driven, so the full milestone 4 registry stays
  scheduled after milestone 2. `composeValidation.ts` is the first step.

## Done

- Milestone 1 shipped: TextField, Slider, AlertDialog, Dialog, ProgressIndicator.
  - `a01574299` impl: generic controlled transport (`textValue`/
    `numberValue` + shared ack/revision, typed events), generic
    `OneNativeControlledValue` in Kotlin (Switch behavior unchanged),
    `composeValidation.ts` pure validators, README docs, 14 vitest tests.
    Gates RAN: `tsc --noEmit` clean, `vitest run` 54/54 pass.
  - `40ed4020f` conformance: new `one-native-android-inputs` proof screen +
    home nav entry, 17 new checks appended after `density-reset-remount`
    (text reject/accept/revision, slider JS-step + track-tap snap, alert
    confirm/dismiss-button/back-dismiss, custom dialog close/back-dismiss,
    progress presence + duplicate sweep). `tapNavigation` takes a nav id.
    Existing 24 checks untouched. Rebuilt tracked `types/compose*.d.ts`.

## NEEDS-BUILD

- `a01574299` + `40ed4020f`: `:app:assembleDebug` + android conformance run.
  Unverified-by-worker risks, in order: (1) M3 Slider track-tap jump used by
  `inputs-slider-track-tap`; (2) emulator IME/autocorrect altering `adb input
  text` words; (3) dialog-window testTags surfacing in uiautomator dumps.
  After the run, README's "24 checks pass" paragraph needs a count refresh
  (24 + 17, plus 2 conditional IME-renavigate checks) — left stale on purpose.

## Blocked

- (none)
