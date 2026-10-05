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

## Landed slices

- **RAN:** `eee326c7d` added Checkbox and RadioButton with Android emulator selection proof; `e4b5aa1df` repaired home navigation in the conformance runner.
- **RAN:** `e61788b7e` added Card variants; `9b718245b` added horizontal and vertical dividers. Both have Pixel 8 runtime captures.
- **RAN:** `4a2a3fffc` added FilterChip and `beef6dca0` added AssistChip, InputChip, and SuggestionChip. The focused Android Compose conformance suite now drives selection, cards, dividers, and chips, with emulator screenshots for each state.
- **RAN:** Badge and BadgedBox render a dot, circular count, wide count, explicit overlay, and default overlay on a Pixel 8 emulator. The focused `--suite compose-badges` checks text and geometry from a fresh app launch.
- **RAN:** ListItem renders headline, overline, supporting, leading, and trailing slots with color and elevation overrides. The focused `--suite compose-list-items` passed on the Pixel 8 emulator and captured both a full and a minimal item.
- **RAN:** FlowRow wraps five fixed-width children 2–2–1 with horizontal and vertical spacing on a Pixel 8 emulator. The focused `--suite compose-flow-row` asserted row positions and passed after a full Android APK build, One package build, Compose tests, and fixture typecheck on pro-64.
- **RAN:** `Spacer` and positive `composeStyle.weight` on direct Row and Column children passed the focused `--suite compose-flow-row` on a Pixel 4 API 31 emulator. UIAutomator omits the empty Spacer node, so the proof asserts the left/top text at the container starts and the right/bottom text more than halfway across the remaining width/height; without weight those endpoints sit adjacent. The One build, 26 Compose tests, fixture typecheck, and 292-task Android APK build passed on pro-128. The proof stopped its emulator and Metro process.
- **RAN:** IconButton, FilledIconButton, FilledTonalIconButton, and OutlinedIconButton render Material 3 variants on a Pixel 8 emulator. The focused `--suite compose-icon-buttons` verified all variants mounted, a filled button click reached JS, and a disabled button did not. Custom enabled and disabled colors appear in the captured screen. The One package build, Compose tests, fixture typecheck, and Android APK build passed on pro-64.
- **RAN:** FilledTonalButton and ElevatedButton render through `One.Android.Button` on a Pixel 8 emulator. The focused `--suite compose-icon-buttons` verified both variants mounted and that each tap incremented the JS counter; the disabled icon button left that counter unchanged. The One package build, Compose tests, fixture typecheck, and Android APK build passed on pro-64.
- **RAN:** Small, standard, large, and extended Material 3 floating action buttons render with icon and text slots on a Pixel 8 emulator. The focused `--suite compose-icon-buttons` verified each variant mounted, four taps reached JS, the extended label collapsed, and a disabled icon button did not emit a click. The One package build, Compose tests, fixture typecheck, and Android APK build passed on pro-64. For this proof only, the unrelated Kotlin source import and GPU routes were omitted from Metro's route graph because they currently fail module resolution; both routes were restored after the proof.
- **RAN:** Material 3 `1.5.0-alpha17`, matching the installed Expo UI Android dependency, builds in One's Android APK. `ToggleButton`, `IconToggleButton`, `FilledIconToggleButton`, and `OutlinedIconToggleButton` passed a Pixel 4 API 31 emulator run: rejected and accepted controlled changes, icon variant callbacks, custom checked colors, and disabled negative control. The One build, 26 Compose tests, fixture typecheck, and 292-task Android APK build passed. The unrelated Kotlin source import and GPU routes were omitted only from Metro's proof graph and restored afterward. The Pixel 8 API 37 AVD saturated pro-128 and did not reach Home; the smaller API 31 AVD held above 50% CPU idle during the successful proof.
- **RAN:** With Material 3 `1.5.0-alpha17`, the focused Badge and ListItem suites passed again on the API 31 emulator. A later boot sampled 6.69% CPU idle; the proof guard compared an awk string lexically and failed to exit. The local proof script now converts the idle sample to a number, and a 6.69% input exits nonzero. Both emulator runs stopped their own emulator and Metro processes.
- **RAN:** Material 3 expressive `LoadingIndicator` and `ContainedLoadingIndicator` render indeterminate and determinate shapes with color overrides on a Pixel 4 API 31 emulator. The focused `--suite compose-loading` mounted all four variants and advanced determinate progress from 0.25 to 0.75; before and after screenshots show the two determinate shapes changed. The One build, 26 Compose tests, fixture typecheck, and 292-task Android APK build passed on pro-128. The proof stopped its emulator and Metro process.
- **RAN:** Material 3 `Surface` renders plain, clickable, selectable, and toggleable variants on a Pixel 4 API 31 emulator. The focused `--suite compose-surface` verified native checked semantics for selectable and toggleable states, rejected then accepted a controlled toggle, counted a click, and confirmed the disabled surface emitted no click. Color, border, elevation, and corner radius appeared in the capture. The One build, 26 Compose tests, fixture typecheck, and 292-task Android APK build passed on pro-128. The proof stopped its emulator and Metro process. Expo UI's advanced `Shape` values remain a separate coverage gap.
- **RAN:** Material 3 regular and wavy linear/circular progress indicators render on a Pixel 8 Android emulator. The focused `--suite compose-progress` mounted four determinate variants and two wavy indeterminate variants; a tap advanced the determinate indicators from 0.25 to 0.75. Paired screenshots show the native bars and arcs changing, plus custom linear color and track color. The One build, 26 Compose tests, fixture typecheck, and 292-task Android APK build passed on studio-64. The proof stopped its emulator and Metro process.
- **RAN:** Progress indicators now carry Expo UI stroke caps, track gaps, circular stroke width, determinate stop indicator settings, and wavy amplitude, wavelength, speed, and linear stop size. On a Pixel 4 API 31 emulator the focused `--suite compose-progress` mounted tuned determinate and indeterminate variants and advanced progress from 0.25 to 0.75. The custom red stop dot appears in 121 screenshot pixels; the earlier default Pixel 8 capture had none. These captures use different Android versions, so their overall palette is not a pixel baseline. The One build, 26 Compose tests, fixture typecheck, and 292-task APK build passed on pro-128. The proof stopped its emulator and Metro process.
- **RAN:** Material 3 single-choice and multi-choice segmented rows render on a Pixel 8 Android emulator. The focused `--suite compose-segmented` verified native checked states, selection changes, controlled rejection and acceptance, and disabled taps. Paired screenshots show the first-to-second single selection and a newly checked multi segment. The One build, 26 Compose tests, fixture typecheck, and 292-task Android APK build passed on studio-64; the stricter runtime suite passed after the fixture root received `flex: 1`. The proof stopped its emulator and Metro process.
- **RAN:** SegmentedButton now exposes all 12 Expo UI active, inactive, and disabled border, content, and container colors. A fresh Pixel 8 `--suite compose-segmented` run passed all six runtime checkpoints after a 292-task Android APK build, and the before/after capture shows custom colors on selected, unselected, and disabled segments. The proof stopped its emulator and Metro process.
- **RAN:** Switch now exposes all 16 Expo UI checked, unchecked, disabled checked, and disabled unchecked thumb, track, border, and icon colors. A Pixel 4 API 31 emulator showed custom pink, green, and amber switch states; the focused probe also passed controlled rejection, acceptance, and disabled tap checks. The One build, 26 Compose tests, fixture typecheck, and 292-task Android APK build passed on pro-128. The proof stopped its emulator and Metro process.
- **RAN:** Slider now exposes Expo UI lower and upper drag limits plus thumb, track, and tick colors. A Pixel 8 API 37 emulator dragged across a full 0–100 track and stopped at 80 and 20; paired captures show the custom colors and endpoints. The One build, 26 Compose tests, fixture typecheck, and 292-task Android APK build passed on pro-128; the runtime proof ran on studio-64 and stopped its emulator and Metro process. Custom thumb and track slots, vertical Slider, and finish callbacks remain separate coverage gaps.
- **RAN:** The longer `--suite compose` sometimes sends a chip tap to a Home route behind the Compose screen. A React view touch override and a Compose root gesture handler both failed to resolve this reliably, so neither remains in the Badge change. The original suite still reports the failure.
- **INFERRED:** The Expo UI coverage owner is working through iOS captures and reserves the later Peach Compose proof. This lane continues One Android Compose while that work is active, then takes measured Peach Android gaps without changing their iOS files.

## Acceptance for each objective slice

- The exact Android source and public JS boundary agree; senders and receivers are updated together.
- A real Android emulator shows the new behavior and a negative control that would fail without the change.
- The narrowest type/build check passes. Sync with `origin/v2-beta`, commit narrowly, and push `HEAD:v2-beta` without publishing a package.

## Beta recovery proposal: Android system services (2026-10-04)

Status: proposal only. No native change lands before the assigned proposal
disposition (first-layer p61184, then substantive p60786, integration by
manager p61056). Scope is exactly the 12 existing services below; no Air32,
no main/stable, no new public API, no unrelated service work.

Scope: Device, KeepAwake, ScreenOrientation, ScreenCapture, Share, Print,
QuickActions, AppIcon, Location, MapServices, LocalAuthentication,
ProtectedStore. Lane branch `tm/beta-android-system`, base `origin/v2-beta`;
`nitro.json` registration stays in this branch for manager-serialized
integration. Task `t-muu8ms26-161y0`.

### Ground truth read (RAN)

- All 12 specs under `packages/one/src/platform/specs/One*.nitro.ts`
  (iOS-only `HybridObject<{ ios: 'swift' }>`), all 12 `index.native.ts`
  wrappers (iOS guard + `NitroModules.createHybridObject`), all 12
  `unavailable.ts` contracts, and all 12 `index.android.ts` stubs (each is
  one line: `export * from './unavailable'`).
- All 12 Swift implementations under `packages/one/ios/Nitro/HybridOne*.swift`
  (1695 lines total), including error codes, plus `OneQuickActionsLaunch.mm`.
- Landed Kotlin patterns: `HybridOneBrowser.kt` (activity via
  `NitroModules.applicationContext?.currentActivity`, `ActivityEventListener`,
  `LifecycleEventListener`, `startActivityForResult`), `HybridOneSecureStore.kt`
  (AndroidKeyStore AES-256-GCM + SharedPreferences, `Promise.async`,
  `OneNativeError(code, message)`), `HybridOneNotifications.kt`
  (`PermissionListener`, main-thread handler). `OneNativeError` prints as
  exactly `<code>: <message>`; JS `rethrowNativeError` restores `code`.
- `packages/one/nitro.json` (12 services iOS-only), library
  `AndroidManifest.xml` (only `ACCESS_NETWORK_STATE`, sensor, Custom Tabs
  queries, FileProvider), `build.gradle` (minSdk 23, compile/target 35,
  no biometric/maps/push deps unconditionally), `nativeError.ts`.
- Conventions `plans/one-native-api-conventions.md` section 6: the library
  manifest declares no permission except Android normal (install-time);
  dangerous permissions are stamped into the app manifest from `native.app`.
  Prebuild stamping precedent: `prebuildWithoutExpo.ts` stamps CAMERA,
  RECORD_AUDIO, and notification permissions/receivers from `native.app` keys.
  `native.app.location.whenInUse` exists but stamps iOS only today.
- `platform-support.mdx`, the 12 doc pages under `apps/onestack.dev/data/native/`
  (each states Android unavailability today), drift suite
  `packages/one/tests/nativeDocs.test.ts`, SSR suite
  `packages/one/tests/unavailableServices.test.ts` +
  `fixtures/one-unavailable-services.ts` (62+ checks against the web/SSR
  entry, untouched by Android work), and the adb conformance runner
  `tests/native-features/scripts/one-native-conformance.android.ts`.
- SDK stubs in `~/Library/Android/sdk/platforms`: ShortcutManager,
  PrintManager, Geocoder, LocationManager, BiometricManager, and PixelCopy
  exist in android-31 through android-37.0. `DETECT_SCREEN_CAPTURE`,
  `DETECT_SCREEN_RECORDING`, and `Activity.registerScreenCaptureCallback`
  are absent in android-31 and present in android-36+, so ScreenCapture
  state detection needs a runtime API gate above minSdk 23.
- Fixtures already exist for all 12 services under
  `tests/native-features/fixtures/one-native-*.tsx`; no new fixture file is
  proposed, only Android legs driving them.

### WIP e43a2b4dd assessment (r58412, registration only)

Reusable direction, not landable as is:

- Reusable: per-service `nitro.json` android entries
  (`HybridOne<Name>`, kotlin) for exactly the 12 in-scope services;
  spec widening to `{ ios: 'swift'; android: 'kotlin' }`; guard removal in
  `index.native.ts`; `androidx.biometric:biometric:1.1.0` dependency.
- Missing: all 12 Kotlin implementations, nitrogen regeneration
  (`packages/one/nitrogen/generated` untouched), Location prebuild stamping
  (dangerous permissions cannot ride the library manifest), QuickActions
  launch-intent capture, AppIcon alias mechanism, fixture legs, docs and
  `platform-support.mdx` updates, and every runtime proof.
- Wrong: `nitro.json` is fully reformatted (382 changed lines for 12
  entries); the implementation redoes it as 12 minimal hunks to avoid
  clobbering the peer media lane's entries at manager integration. And
  guard removal alone changes nothing on Android: Metro resolves
  `index.android.ts` (unavailable) ahead of `index.native.ts`, so each
  service's `index.android.ts` must be deleted (the landed Browser pattern:
  no `index.android.ts`, `index.native.ts` serves both platforms). No test
  references `index.android.ts`, so deletion breaks no suite.
- Unverified: whether `DETECT_SCREEN_CAPTURE` / `DETECT_SCREEN_RECORDING`
  are normal (library manifest allowed) or require prebuild stamping; verify
  via `PackageManager.getPermissionInfo().protectionLevel` on the build host
  before choosing. The exact introduction API level (32-36) is also pinned
  there; below it `getState` returns `unspecified` with silent listeners.

### Shared implementation plan

Per service, in this order: spec widening, `bun run nitrogen` in
`packages/one`, minimal `nitro.json` android hunk, one
`HybridOne<Name>.kt` under `packages/one/android/src/main/java/com/margelo/nitro/one/`,
delete `index.android.ts`, remove the iOS guard in `index.native.ts`
(keeping every validation call and error string byte-identical), fixture
leg, doc page + `platform-support.mdx` row, drift suite green, SSR suite
green. Compile evidence is a real Gradle/Kotlin build of the library plus
the APK assembly the conformance leg installs, never the TS registration.

Error-code rule: mirror the Swift `E_<NAMESPACE>_<REASON>` codes below so
callers branch on `code` identically on both platforms. User refusal always
resolves (conventions table), never rejects.

Prebuild additions (all behind existing `native.app` shapes where one
exists): stamp `ACCESS_COARSE_LOCATION` + `ACCESS_FINE_LOCATION` from
`app.location`, and `ACCESS_BACKGROUND_LOCATION` when
`app.location.background` is set. No other new permission is proposed;
biometric and screen-detect permissions ride the library manifest only if
verified normal, else they join the same stamping with reviewer approval.

### Per-service plan

Device (`getInfo`, `getLocalizationInfo`). Swift: UIDevice/Locale/TimeZone,
`isSimulator` via targetEnvironment, `vendorIdentifier` vendor-scoped.
Android: `Build.MODEL`, `Build.VERSION.RELEASE`, `Locale.getDefault`,
`TimeZone.getDefault`, `isSimulator` from `Build.FINGERPRINT` emulator
markers, vendor identifier from `Settings.Secure.ANDROID_ID` (documented as
app-signing-key scoped, not a hardware id). Baseline: empty strings/zero
offset today. Negative: emulator reports `isSimulator true` while a
userdebug guid check stays absent; `ANDROID_ID` differs per signing key, no
hardware id is claimed.

KeepAwake (`isEnabled`, `setEnabled`). Swift: `isIdleTimerDisabled`.
Android: `FLAG_KEEP_SCREEN_ON` on the foreground activity window, main
thread, same TS boolean assertion. Baseline: always `false`, set resolves
without effect. Negative: flag cleared on activity recreation is re-applied
from held state and `isEnabled` still reports true; backgrounded app rejects
or reports honestly, never claims the flag while no activity exists.

ScreenOrientation (`getOrientation`, `lock`, `unlock`, `addChangeListener`).
Swift: scene geometry + `requestGeometryUpdate`, errors
`E_SCREEN_ORIENTATION_{SCENE,UNSUPPORTED,TIMEOUT}`, 10s timeout, change
listeners on real rotation only. Android: `activity.requestedOrientation`
mapping portrait/portraitUpsideDown/landscapeLeft/landscapeRight/landscape,
current value from `Display.rotation` + configuration, listener via
`OrientationEventListener` filtered to the five values. No manifest change.
Baseline: always `unknown`, locks resolve `unknown`. Negatives: lock to an
orientation the manifest forbids rejects `E_SCREEN_ORIENTATION_UNSUPPORTED`;
listener remover stops delivery; rotation without lock still notifies.

ScreenCapture (`getState`, `captureWindow`, `captureView`,
`addStateListener`, `addScreenshotListener`). Swift: trait capture state,
window/view PNG render to caches with uri/width/height/size, errors
`E_SCREEN_CAPTURE_{SCENE,INPUT,VIEW,RENDER,ENCODE,FILE}`, screenshot
notification with timestamp. Android: state via
`registerScreenCaptureCallback` gated above its introduction level (else
`unspecified`); capture via PixelCopy (API 26+, else honest rejection)
writing PNG under the app cache through the existing FileProvider paths;
screenshot signal via MediaStore content observer; `captureView` resolves
the react tag to a mounted view (no existing resolver in the tree; unknown
or unmounted tag rejects `E_SCREEN_CAPTURE_VIEW`). Baselines: `unspecified`
state, captures reject `needs an iOS or Android build`. Negatives: unknown
view tag, zero-area view, below-gate API level.

Share (`share`). Swift: non-empty items, text/url/file validation, busy and
presentation guards, `{ completed, activityType }`, errors
`E_SHARE_{ITEMS,URL,FILE,BUSY,PRESENTATION,FAILED}`. Android:
`ACTION_SEND`/`ACTION_SEND_MULTIPLE` chooser with FileProvider URIs for
files, a chooser IntentSender recording the chosen component as
`activityType`; `completed` is true only when a target was chosen, false on
dismiss (cancellation resolves, never rejects). Baseline: rejects
`needs an iOS or Android build`. Negatives: empty items, blank text,
non-absolute URL, missing file, second share while one is open.

Print (`isAvailable`, `printPdf`). Swift: `isPrintingAvailable`, local
file:// PDF with pages, busy/presentation guards, errors
`E_PRINT_{BUSY,INPUT,UNAVAILABLE,URI,FILE,PDF,PRESENTATION,FAILED}`.
Android: `PrintManager` + a `PrintDocumentAdapter` rasterizing the PDF via
platform `PdfRenderer`; `isAvailable` false when no print service handles
the job. Baseline: `isAvailable false`, print rejects. Negatives: missing
file, non-PDF bytes, empty jobName, print while another job is pending.

QuickActions (`setItems`, `getItems`, `getInitialAction`,
`clearInitialAction`, `addListener`). Swift: shortcut items with unique
non-empty id/title, coordinator fed by `OneQuickActionsLaunch.mm` swizzle,
`E_QUICK_ACTIONS_INPUT`. Android: dynamic `ShortcutManager` shortcuts whose
intents relaunch the activity with the action id; Kotlin
`ActivityEventListener.onNewIntent` + launch-intent harvest feed an
in-hybrid coordinator mirroring the Swift one (cold start sets the initial
action, warm start notifies listeners). No manifest change. Baselines:
`getItems []`, `getInitialAction null`, set resolves without effect.
Negatives: duplicate/blank ids rejected in TS identically on both
platforms; cold start via `adb shell cmd shortcut` reports the id once,
then `clearInitialAction` nulls it; warm tap notifies listeners, not the
initial slot.

AppIcon (`isSupported`, `getCurrentName`, `setIcon`). Swift:
`supportsAlternateIcons`, Info.plist lookup, active/busy guards, errors
`E_APP_ICON_{INPUT,UNAVAILABLE,INACTIVE,BUSY,CHANGE}`. Android:
`PackageManager.setComponentEnabledSetting` over manifest `activity-alias`
entries; `isSupported` true only when at least one alias exists;
`getCurrentName` from the enabled alias; unknown name rejects
`E_APP_ICON_INPUT`, no aliases rejects `E_APP_ICON_UNAVAILABLE`. The alias
set lives in the app manifest. Open decision for reviewers: stamp aliases
from a new `native.app.android.alternateIcons` mirroring
`ios.alternateIcons`, or document manual manifest aliases with
`isSupported false` otherwise. No stamping is implemented before that call.
Baselines: `isSupported false`, `setIcon` resolves without effect.
Negative: unknown name rejects; concurrent set rejects busy.

Location (`getPermissionStatus`, `requestWhenInUsePermission`,
`getCurrentPosition`, `watchPosition`, `geocodeAddress`, `reverseGeocode`).
Swift: CoreLocation statuses, manifest usage guard
(`E_LOCATION_MANIFEST`), active-app guard, 30s recent-position rule,
`E_LOCATION_{PERMISSION,BACKGROUND,UNAVAILABLE,GEOCODE}`, empty geocode on
no result, `-1`/`0` unavailable fields. Android: platform
`LocationManager` only (no Play Fused provider, per lane constraint) with
`PermissionListener` runtime prompt mirroring the Notifications pattern;
status maps granted/denied/notDetermined onto the five spec values
(`always` only with background grant); geocoding via platform `Geocoder`
with `isPresent` gate; background watch requires `app.location.background`
else `E_LOCATION_MANIFEST`. Baselines: status `denied`, position rejects,
geocodes return `[]`, watch remover is inert. Negatives: denied permission,
revoked mid-watch (listeners get `E_LOCATION_PERMISSION`), invalid
coordinate, blank address, background watch without the manifest flag.

MapServices (`search`, `autocomplete`, `resolveSuggestion`, `directions`).
Swift: MapKit search/completer/directions, `E_MAP_{INPUT,SEARCH,
AUTOCOMPLETE,CANCELED,TIMEOUT,DIRECTIONS}`, radius 100-50000m, superseded
autocomplete rejects its predecessor. Android has no platform autocomplete
or directions service (Play SDK is out of lane scope). Proposed honest
split: `search` via platform `Geocoder.getFromLocationName` bounded by the
same radius validation; `autocomplete`, `resolveSuggestion`, and
`directions` keep the existing per-method unavailable contract (empty
results where the contract returns `[]`, rejection with
`needs an iOS or Android build` where it rejects), implemented in Kotlin so
the failure is explicit, never fake. Open decision for reviewers: accept
this per-method split, or hold all of MapServices unavailable on Android.
Baselines: `search`/`autocomplete` `[]`, resolve/directions reject.
Negatives: blank query, out-of-range radius, unknown suggestion id,
coordinates beyond +-90/180.

LocalAuthentication (`canEvaluatePolicy`, `evaluatePolicy`). Swift:
biometrics-only policy, `E_LOCAL_AUTH_{REASON,MANIFEST,LOCKOUT,
NOT_ENROLLED,PASSCODE_NOT_SET,FAILED}`, cancellation resolves false.
Android: `androidx.biometric` prompt; `canEvaluatePolicy` from
`BiometricManager.canAuthenticate`; reason required; cancellation resolves
false. `LocalBiometryType` is iOS-flavored; proposed mapping from system
features (fingerprint to `touchID`, face to `faceID`, none enrolled to
`none`) is documented on the doc page. Open decision for reviewers if they
prefer `none` whenever the kind cannot be proven. Baseline: unavailable
with `biometryType none`, evaluate rejects. Negatives: blank reason,
no enrolled biometrics, user cancel resolves false, lockout rejects.

ProtectedStore (`createItem`, `getItem`, `updateItem`, `deleteItem`). Swift:
keychain access control fixed at create, policy label check
(`E_PROTECTED_STORE_POLICY`), duplicate/missing/cancelled/auth/input/
manifest failures, `getItem` null when missing. Android: per-key
AndroidKeyStore AES-GCM keys with `setUserAuthenticationRequired(true)`
(`userPresence` allows device credential, `biometryCurrentSet` is
biometric-only with invalidation on new enrollment), ciphertext + policy
label in private preferences following the `HybridOneSecureStore.kt`
structure, every read/change gated by a BiometricPrompt carrying `reason`.
`getItem` returns null when the key is missing; policy mismatch rejects;
cancellation rejects `E_PROTECTED_STORE_CANCELLED`. Baseline: every method
rejects. Negatives: duplicate create, missing-key update, wrong-policy
read, blank key/reason, cancel mid-prompt, enrollment change invalidating a
`biometryCurrentSet` key.

### Runtime proof plan

Proof host is a claimed Android 37 emulator via the shared builder
(`bun heavy`, existing AVD claim, no duplicate builders), coordinated with
the manager against the media lane. Each service leg extends the existing
conformance runner with a focused suite driving its existing fixture:
baseline run first (unavailable contract observed), then the repaired run.
Every leg keeps a negative control that fails if the Kotlin is stubbed
(denied/revoked permission, cancelled prompt, unknown id/tag, duplicate
create, missing file, busy re-entry, activity recreation). Compile evidence
is the real `./gradlew` library + APK build log; TS registration alone
proves nothing. Drift (`nativeDocs.test.ts`) and SSR
(`unavailableServices.test.ts`) suites stay green; doc pages and
`platform-support.mdx` are updated in the same change.

### Open decisions (need reviewer call before implementation)

1. AppIcon Android alias source: new `native.app.android.alternateIcons`
   stamping vs documented manual manifest aliases.
2. MapServices Android split: Geocoder-backed `search` with per-method
   unavailable autocomplete/resolve/directions vs holding the whole service.
3. LocalAuthentication `biometryType` mapping: feature-derived kind vs
   `none` unless provable.
4. ScreenCapture detect-permission placement: library manifest if verified
   normal, else prebuild stamping (new `native.app` key).
5. Share `completed` semantics: true-on-target-chosen (proposed) vs always
   false on Android.

## Beta recovery implementation disposition (2026-10-05)

Reviewer p60786 approved TEN services for bounded implementation at
proposal `669de43ea` with all 13 first-layer corrections folded first;
no native/runtime approval yet. Exact One-only dossier
`/Users/n8/.team-machine/handoffs/one-beta-recovery/public-review-controls/system-approval.md`,
full first-layer
`/Users/n8/.team-machine/handoffs/one-beta-recovery/first-layer-verdicts.txt`.
Task `t-muu8ms26-161y0` (in progress, author p61888).

Approved ten: Device, KeepAwake, ScreenOrientation, Share, Print,
QuickActions, AppIcon, Location, MapServices, LocalAuthentication.
HELD with no native writes: ScreenCapture (corrected design below,
`t-muusi2pr-1hgr0`) and ProtectedStore (research below,
`t-muusi2v1-1hh50`). Their `index.android.ts`, specs, and nitro
registrations stay untouched. Reviewer decisions: AppIcon manual
manifest aliases with `isSupported false` otherwise (no new
`native.app` surface); MapServices Geocoder search + per-method
unavailable; biometry mapped only when a single kind is provable else
`none`; Share `completed` true-on-target-chosen with a docs note.

### The 13 corrections as implementation preconditions

1. MapServices keeps `index.android.ts` as a per-method split: `search`
   re-exported from `./index.native` (guard removed), `autocomplete`,
   `resolveSuggestion`, `directions` from `./unavailable`. The Kotlin
   class implements the full generated spec; the three unsupported
   methods reject as unreachable-behind-TS-routing and are never called
   on Android. No Kotlin unavailable stubs.
2. QuickActions harvests on three legs: cold-start launch intent (read
   once at hybrid init), `onNewIntent` for warm taps, and
   `onHostResume` re-read of the current intent (Notifications:122-124
   precedent) for standard-launchMode warm taps. Cold sets the initial
   slot; warm notifies listeners only.
3. `captureView` resolver pin (held-service precondition, kept): reuse
   the UIManagerHelper tag precedent, reject unknown/unmounted tags
   with `E_SCREEN_CAPTURE_VIEW`.
4. Location: five statuses map as notDetermined (never asked),
   whenInUse (foreground grant, no background grant), always (background
   grant held), denied (denied or services off); restricted is
   unreachable on Android (no platform API distinguishes it) and never
   returned. Absent bearing/speed map to `-1` when `hasBearing`/
   `hasSpeed` are false (Android reports 0.0, iOS -1); absent altitude
   maps 0.0; absent vertical accuracy maps -1. `getCurrentPosition`
   resolves the last-known fix when fresh (<30s, accuracy >= 0, same
   rule as Swift) else requests one fix; fix timeout rejects
   `E_LOCATION_UNAVAILABLE`. Background watch requires
   `app.location.background` (else `E_LOCATION_MANIFEST`, mirroring the
   Swift background-modes guard) and the background grant; it runs
   under a location-type foreground service with a persistent
   notification while a background listener is registered, stopped
   when the last one is removed. Stamped from existing config:
   `ACCESS_COARSE_LOCATION` + `ACCESS_FINE_LOCATION` from
   `app.location`, `ACCESS_BACKGROUND_LOCATION` when
   `app.location.background` is set. Library manifest gains the normal
   `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_LOCATION` only.
5. Device `interfaceIdiom`: `tv` when UiModeManager reports
   television, `pad` when smallest width >= 600dp, else `phone`.
   carPlay/mac/vision are unreachable on Android.
6. KeepAwake holds desired state in memory: `isEnabled` resolves it on
   the main thread with no activity required (mirrors the Swift global
   read); `setEnabled` records it, applies `FLAG_KEEP_SCREEN_ON` to
   the current activity window when one exists, and re-applies on
   resume/recreation. No rejection path; the negative control is
   recreation re-application verified via window flags.
7. Orientation: current value from `Display.rotation` plus natural
   orientation; locks map portrait/`SCREEN_ORIENTATION_PORTRAIT`,
   portraitUpsideDown/`REVERSE_PORTRAIT`,
   landscapeLeft/`REVERSE_LANDSCAPE`,
   landscapeRight/`LANDSCAPE`, landscape/`SENSOR_LANDSCAPE`. The exact
   left/right pairing is verified on the emulator proof and recorded
   here. Manifest screenOrientation is read via PackageManager and
   defines unlock restoration (`UNSPECIFIED` returns to manifest
   behavior); runtime locks override the manifest on Android, so a
   manifest conflict never fakes `E_SCREEN_ORIENTATION_UNSUPPORTED`.
   That code fires only on a non-rotatable display (television type).
   A 10s verify window mirrors the Swift timeout
   (`E_SCREEN_ORIENTATION_TIMEOUT`); backgrounded calls reject
   `E_SCREEN_ORIENTATION_SCENE`. Listeners run on real rotation only
   via OrientationEventListener filtered to the five values; remover
   stops delivery.
8. MapServices.search validates exactly like Swift (blank query,
   non-finite or out-of-range center, radius outside 100-50000 reject
   `E_MAP_INPUT`); center+radius become a Geocoder bbox
   (dLat = r/111320, dLng = r/(111320*cos(lat)), clamped +-90,
   wrapped +-180, maxResults 10). `Geocoder.isPresent()` false or an
   IO failure resolves `[]` (mirrors the iOS no-result contract);
   empty results resolve `[]`.
9. Biometry: exactly one of fingerprint/face hardware features present
   plus `canAuthenticate(BIOMETRIC_STRONG) == SUCCESS` reports
   `touchID`/`faceID`; zero or ambiguous (both) kinds report `none`.
   `canEvaluatePolicy` maps BiometricManager result codes onto
   `errorCode` when unavailable (no hardware, unavailable,
   none-enrolled, lockout). `evaluatePolicy` requires a non-blank
   reason (`E_LOCAL_AUTH_REASON`); user/system cancel and negative
   button resolve false; lockout/no-biometrics/no-credential map to
   `E_LOCAL_AUTH_{LOCKOUT,NOT_ENROLLED,PASSCODE_NOT_SET}`;
   everything else rejects `E_LOCAL_AUTH_FAILED`. No manifest code
   exists on Android (USE_BIOMETRIC is normal, library manifest).
10. ProtectedStore held; research below, no weakening.
11. QuickActions items beyond `maxShortcutCountPerActivity` reject
    `E_QUICK_ACTIONS_INPUT`; never silently trim.
12. Print rasterizes each PDF page via platform PdfRenderer at the
    job PrintAttributes resolution (default 300dpi):
    bitmap = mediaSize points * dpi/72. `isAvailable` is false when no
    print service handles the job.
13. ScreenCapture held; corrected design below, kept preconditions:
    sub-26 rejection code, screenshot filter, API pin.

Error-code rule stands: mirror the Swift `E_*` codes so callers
branch identically; user refusal resolves, never rejects.

### Corrected ScreenCapture design (held, for review routing)

F1 P2: `Activity.registerScreenCaptureCallback` reports screenshot
notifications only (API 34, `onScreenCaptured()` carries no value),
never ongoing recording state. Recording state comes only from the
API 35 `WindowManager.addScreenRecordingCallback` (initial int state
plus subsequent states, needs `DETECT_SCREEN_RECORDING`). Both
detect permissions are normal install-time, so both ride the library
manifest. Corrected mapping: `getState`/`addStateListener` read the
WindowManager API 35 state plus its listener/remover, `unspecified`
below API 35; screenshot notification uses the API 34 Activity
callback; capture stays PixelCopy (API 26+, honest rejection below)
through the existing FileProvider paths with the UIManagerHelper
resolver and same-window/unknown-tag checks. Registration follows
owned activity lifetime (unregister/re-register on pause/resume).
Proof controls (when gated): independent screenshot vs recording
start/stop, initial-state and remover checks; ADB screenshots are not
a positive test for the API 34 callback. No native code is written
before p61184/p60786 disposition on `t-muusi2pr-1hgr0`.

First-layer disposition (p61184): PASS WITH 4 CORRECTIONS + 1
PRECONDITION, folded here; still held for the p60786 gate.
(A) `onScreenCaptured()` carries no value, so the screenshot
`timestampMs` is stamped at receipt (`System.currentTimeMillis`),
mirroring the Swift receipt stamp. (B) Recording-state mapping:
`SCREEN_RECORDING_STATE_VISIBLE` to `active`, `NOT_VISIBLE` to
`inactive`, below API 35 to `unspecified` (pairs with the Swift
unspecified passthrough). (C) Below-gate silence is explicit:
state listeners below 35 and screenshot listeners below 34 never
fire and their removers are inert; prove on a sub-gate AVD by
runtime, not by reading. (D) Sub-26 capture rejection is named
`E_SCREEN_CAPTURE_UNSUPPORTED`: no existing code covers an absent
platform API, and callers need a distinct branch signal (iOS never
emits it); p60786 confirms the new code vs reuse call. (E)
Implementation precondition: cite each callback's scope
(activity-scoped screenshot callback vs WindowManager-instance
recording callback) to justify pause/resume re-registration.

### ProtectedStore research (held, for review routing)

First-layer issue 10 stands: `createItem(key,value,policy)` carries
no reason and must not prompt (Swift `SecItemAdd` does not prompt);
`get`/`update`/`delete` carry reason with per-use authentication;
policy is immutable; biometric-set change invalidates
`biometryCurrentSet` keys. Research target on `t-muusi2v1-1hh50`: a
concrete supported key/operation/lifetime design preserving those
calls — per-key AndroidKeyStore AES-GCM with
`setUserAuthenticationRequired(true)`, `userPresence` allowing device
credential, `biometryCurrentSet` biometric-only with invalidation on
new enrollment — with no cached authentication window, no plaintext
persistence, no silent rekey or data loss, and no weaker policy. Any
genuine product/security tradeoff stays gated. No native code is
written before disposition.

### Implementation order and proof

Order: Device, KeepAwake, ScreenOrientation, Share, Print,
QuickActions, AppIcon, Location (with prebuild stamping),
MapServices, LocalAuthentication (with biometric dependency). Each:
spec widening, `bun run nitrogen` in `packages/one`, minimal
`nitro.json` android hunk, one Kotlin file, `index.android.ts`
deletion (MapServices keeps its split), guard removal in
`index.native.ts` with validation and error strings byte-identical,
doc page + `platform-support.mdx` row, drift suite green, SSR suite
green. Shared `nitro.json` hunks stay minimal in this branch for
manager-serialized integration. Compile evidence is a real Gradle
library + APK build; runtime proof is a focused Android 37 emulator
suite driving the existing fixtures with baseline (unavailable
contract observed pre-change is already recorded in the proposal),
positive, negative, and lifetime controls per service.
