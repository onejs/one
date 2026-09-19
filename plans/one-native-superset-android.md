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
  - ANDROIDFIX `bb84a4b38`: dropped `Role.Dialog`/`Role.ProgressBar` (do not
    exist in compose ui 1.11.4; verified via javap on the cached AAR —
    dialogs/progress publish their own semantics, no behavior change).
    Also verified M3 1.4.0 progress lambda + indeterminate overloads exist.
    No new committed test: Kotlin-only compile fix, no JVM harness in repo;
    coordinator assembleDebug is the gate; existing dialog/progress
    conformance checks cover the paths at runtime.
  - ANDROIDFIX2 `9e606c87c`: rewrote the rotation block for state-preserving
    recreate (stays mounted, taps-3/switch-on intact, bounds rescale vs
    expandedBefore, one live tap, bounds revert after reset; try/finally
    kept). README proof paragraph + count refreshed (40 checks + 2
    conditional). Script typechecks; coordinator reruns the full suite.
  - ANDROIDFIX3 `aeb26105a`: `waitFor` takes a per-call timeout; rotation
    block waits 60s for the mount marker to return (phase 1, no check
    recorded) before each stays-mounted state assert, covering both the
    density-560 and the density-reset recreations. No product change,
    check count unchanged, script typechecks.

## NEEDS-BUILD

- `a01574299` + `40ed4020f`: `:app:assembleDebug` + android conformance run.
  Unverified-by-worker risks, in order: (1) M3 Slider track-tap jump used by
  `inputs-slider-track-tap`; (2) emulator IME/autocorrect altering `adb input
  text` words; (3) dialog-window testTags surfacing in uiautomator dumps.
  After the run, README's "24 checks pass" paragraph needs a count refresh
  (24 + 17, plus 2 conditional IME-renavigate checks) — left stale on purpose.

## Blocked

- (none)
