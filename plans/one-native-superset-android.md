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

- Milestone 1: TextField, Slider, Dialog/AlertDialog, ProgressIndicator.
  Design: generic controlled transport (`textValue`/`numberValue` + shared
  ack/revision, typed events) reused by later milestones; pure
  `src/composeValidation.ts` so validators are vitest-covered without a
  renderer (first step toward milestone 4 registry; full registry after m2).

## Done

- (none yet)

## NEEDS-BUILD

- (none yet; SHAs land here with `:app:assembleDebug` + conformance request)

## Blocked

- (none)
