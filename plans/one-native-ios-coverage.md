# One native: cover what Contrast uses, iOS first

**Recommendation (INFERRED):** the next work on One native is three short iOS lists, in
this order, with Android following each item only after its iOS half is proven:

1. five SwiftUI surface gaps that Contrast's own `@expo/ui` code hits today;
2. four small APIs for the Expo modules in Contrast's shipped binary that still have no
   owner in One (`SecureStore`, `Device`, `Splash`, Sign in with Apple);
3. one rule for direct iOS service APIs under `One.iOS`, so "a common native API" has a
   place to land that is not a new uniform API each time.

The owner's direction this answers: cover the Expo surface Contrast uses now, be able to
reach any common native API that Swift or Android has, and get iOS solid before Android.

Scope: a written plan against One `origin/v2-next` at `5015cd9dd` and Contrast main at
`f613cc2abd`. Nothing was built or run on a device. It does not reopen the ten decided
uniform APIs or the Contrast zero-Expo program
(`~/contrast/plans/contrast/mobile-app/expo-native-supersede-survey.md`); it narrows that
program's 86 module survey to what ships and sorts the remainder by the owner's rule:
direct platform API first, a uniform API only when it is small and Expo has a shape.

## Evidence

- **RAN (grep of Contrast, research docs and conformance corpora excluded):** Contrast
  imports 19 components and 10 modifiers from `@expo/ui`. Components: Button 16, Host 15,
  Text 9, HStack 7, Toggle 6, VStack 6, Section 5, Menu 5, Circle 4, Spacer 4,
  ContentUnavailableView 4, Form 4, LabeledContent 4, Picker 4, Label 2, Image 1,
  Slider 1, ContextMenu 1, RNHostView 1. Modifiers: buttonStyle 7, frame 6, disabled 6,
  foregroundStyle 4, pickerStyle 4, tag 4, accessibilityLabel 3, controlSize 3, font 1,
  tint 1. `contrast-kit` also reads list modifiers off a `modifiers` array: list style,
  `listRowSeparator` (visibility and edges), `listRowInsets`, `listSectionSpacing`,
  `listSectionMargins`, `headerProminence` (`packages/contrast-kit/src/ui/list-modifiers.ts:16-58`),
  and swipe actions (`ui/swipe-actions.ts`).
- **RAN (read):** `One.iOS` has every one of those components except `Circle`:
  `Swift` exports Host, HStack, VStack, ZStack, Form, Section, LabeledContent, List,
  ScrollView, Menu, ContextMenu, SwipeActions, Spacer, Slot and more
  (`packages/one/src/platform/index.native.ts`), and the generated controls are Picker,
  DatePicker, ColorPicker, Toggle, Slider, Stepper, Text, Label, Button, ProgressView,
  Gauge, Image, ShareLink, ContentUnavailableView, VideoPlayer, PhotosPicker, WebView,
  Map, TextField, SecureField, Alert, ConfirmationDialog, QuickLook
  (`src/generated/Controls.native.tsx`). `Slot` is the `RNHostView` equivalent. `tag` has
  no counterpart because One pickers take options as data.
- **RAN (grep, zero files under `packages/one/src` and `codegen`):** `controlSize`,
  `Circle`, `Capsule`, `Rectangle`, `listRowInsets`, `listRowSeparator`,
  `listSectionSpacing`, `headerProminence`, `refreshable`, `searchable`. The 29 iOS
  style fields (`codegen/catalog.ts` `styleFields`) cover `frame`, `font`,
  `foregroundStyle` and `tint`.
- **RAN (read):** the Contrast shell binary declares 21 Expo packages
  (`packages/shell/package.json:31-57`). Six are absent from the dependency reduction
  plan's disposition table: `expo-device`, `expo-image`, `expo-media-library`,
  `expo-secure-store`, `expo-splash-screen`, `expo-sqlite`. Two of those have a named
  replacement elsewhere in that plan (`op-sqlite`, and nitro-image as a candidate). The
  non-Expo `react-native-permissions` has no disposition either.
- **RAN (grep of call sites):** `expo-device` is read twice (`Device.osName`,
  `Device.modelName`, `packages/shell/shell-entry-dev.tsx`). `expo-splash-screen` is
  `preventAutoHideAsync`, `setOptions({ fade, duration })`, `hideAsync`
  (`packages/shell/shell-app.tsx:10,130-131`). `expo-secure-store` and
  `expo-media-library` have no import site in templates, examples, skills or the shell;
  they are manifest entries only (`packages/shell/src/manifest.ts:27,34`).
- **RAN (grep):** `templates/contrast-mobile` adds five modules the template binary does
  not have. `expo-apple-authentication`: `signInAsync`, the button, scope and style
  enums, one file. `expo-document-picker`: `getDocumentAsync`, one file.
  `expo-file-system`: the `File` class, one file. `expo-speech-recognition`: `start`,
  `stop`, `abort`, `addListener`, `requestPermissionsAsync`,
  `isRecognitionAvailable`, one file. `expo-updates`: eleven members across four files.
- **RAN (read):** `One.iOS` contains SwiftUI views and nothing else
  (`packages/one/src/one.ts`). No namespace exposes an iOS service API directly. The
  superset track lists "targeted imperative UIKit wrappers" as milestone 9, a later
  milestone with no design, and records the owner's direction that coverage is
  hand-curated and never the whole SDK (`plans/one-native-superset-track.md:56-66`).

## 1. SwiftUI gaps Contrast hits (superset track, iOS views)

These go to the superset track's modifier milestone (M5), reordered by what Contrast
uses instead of by Expo's modifier list. Each is a catalog entry plus a conformance
check, the track's normal unit of work.

1. **List row and section modifiers:** `listRowSeparator` (visibility, edges),
   `listRowInsets`, `listSectionSpacing`, `listSectionMargins`, `headerProminence`. This
   is the largest real gap: `contrast-kit` models all five and One models none, so a
   Contrast settings screen cannot move to `One.iOS` without losing its row layout.
   Props on `List`, `Section` and the row, named exactly as SwiftUI names them.
2. **`controlSize`** on Button, Picker, Toggle, Slider, Stepper, ProgressView, Gauge:
   `'mini' | 'small' | 'regular' | 'large' | 'extraLarge'`. One generic enum modifier,
   which is what the track's M4 emitter exists for.
3. **Shapes:** `Circle`, `Capsule`, `Rectangle`, `RoundedRectangle`, `Ellipse` as leaves
   with `fill`, `stroke`, `lineWidth`. Contrast uses `Circle` for status dots and
   swatches; without shapes every such dot becomes a React Native view in a `Slot`.
4. **`refreshable` and `searchable`** on `List` and `ScrollView`. Contrast does not
   import them today (**RAN:** zero sites), but no list screen is complete without them
   and both need a binding, so they are worth settling while list work is open.
   `searchable` text follows the controlled model `TextField` already uses.
5. **`accessibilityLabel` on every generated control and container.** It exists on
   some (`src/generated/controlTypes.ts`); the rule should be all, since the conformance
   suites already find nodes by it.

Not gaps: `frame`, `font`, `foregroundStyle`, `tint`, `buttonStyle`, `pickerStyle`,
`disabled`, `RNHostView`, `tag`.

Android: no matching work now. The Compose surface is 12 nodes and frozen behind the
inventory and recipe compiler gate (`plans/one-native-superset-android.md:18-21`); that
order stands, and the owner has put Android second.

## 2. Expo modules in Contrast with no owner yet

| module | what Contrast calls | disposition | size |
| --- | --- | --- | --- |
| `expo-secure-store` | nothing today; in the binary for generated apps and auth libraries | uniform `One.SecureStore`: `get(key)`, `set(key, value)`, `delete(key)`, Expo's `keychainService` and `keychainAccessible` options. Keychain `SecItem` on iOS, Keystore AES-GCM over SharedPreferences on Android. No biometrics in the first cut | small |
| `expo-device` | `osName`, `modelName` | uniform `One.Device`, a frozen sync snapshot like `AppInfo`: `modelName`, `osName`, `osVersion`, `deviceType`. Nothing async, no hooks | tiny |
| `expo-splash-screen` | `preventAutoHideAsync`, `hideAsync`, fade options | uniform `One.Splash`: `hold()`, `hide({ fade?, duration? })`. Needed by the fonts design: a factory app loads fonts at runtime, and without a held splash its first frame shows fallback text. Prebuild already generates the splash (`prebuildWithoutExpo.ts:646`), so this is the missing half of a feature One owns | small |
| `expo-apple-authentication` | `signInAsync`, the button | direct platform API: SwiftUI `SignInWithAppleButton` as a generated `One.iOS` control with `requestedScopes`, `nonce`, `onCompletion`. One view covers both the button and the request, so there is no imperative module. Already named in the track's overlay mining (M7) | small |
| `expo-document-picker` | `getDocumentAsync` | direct platform API: SwiftUI `fileImporter` as a zero-size presentation host like `Alert` (`isPresented`, `allowedContentTypes`, `allowsMultipleSelection`, `onCompletion`). The host copies each pick into Caches before reporting, since a security-scoped URL is not readable from JS | small |
| `expo-image` | one `Image.native.tsx` wrapper per app | blessed library, already queued as "nitro-image vs expo-image". No One API | none |
| `expo-sqlite` | Zero's store adapter | blessed `op-sqlite`, decided | none |
| `expo-file-system` | `File` in one contrast-mobile file, plus the three.js skill | blessed library. A file system API is a subsystem, which the owner's rule excludes | none |
| `expo-updates` | eleven members, contrast-mobile only | stays outside One; Contrast's survey already names hot-updater as the shell path | none |
| `expo-speech-recognition` | six members, contrast-mobile only | stays for now. An event stream over `SFSpeechRecognizer` is the first candidate for the section 3 rule once it exists | later |
| `expo-media-library` | nothing | remove from the shell manifest. Saving an image to Photos returns as a direct API when an app needs it | none |
| `react-native-permissions` | camera, microphone, location prompts | stays until those consumers move. The conventions put each permission on its own namespace, so no `One.Permissions` | none |

The three uniform APIs follow `plans/one-native-api-conventions.md` as written
(`One.<Name>`, sync where there is no I/O, null for a missing key, one legacy module
each). Together they are smaller than notifications alone.

## 3. Direct iOS service APIs: the rule

Today a common native need that is not a view has two homes: a new uniform API, which
the owner wants kept few, or a third-party package. The missing home is
`One.iOS.<AppleTypeName>`, and the rule for it is short:

- **Named and shaped exactly as Apple's API,** per the owner's decision that platform
  APIs map exactly to the platform. The clipboard is `One.iOS.UIPasteboard.general.string`.
  Members keep Apple's names, argument labels become an options
  object in declaration order, enums become their case names as strings.
- **Curated one type at a time,** each as its own legacy module with the same spec
  pattern as the uniform APIs. No generated SDK-wide binding layer and no generic
  call-any-selector bridge: both are the large custom system the owner ruled out, and
  the second gives up type checking.
- **A uniform API is written over the direct one when both exist.** `One.Clipboard` on
  iOS calls what `One.iOS.UIPasteboard` calls, in native code, with no second module.
- **Admission test:** an app in Contrast, or a factory skill, needs it now. Nothing is
  added for coverage.

First entries, all driven by needs already in this document: `UIPasteboard` (images and
URLs, which the uniform clipboard excludes), `SKStoreReviewController.requestReview`,
`UIApplication.shared.isIdleTimerDisabled` (keep awake), `UIScreen.main.brightness`,
`UIApplication.openSettingsURLString`. Each is under 40 lines of Swift.

**GUESSED:** this rule is enough for "any common native API". The case it does not
cover is an app's own Swift. Contrast's plans hold that as a later bridge ("import any
Swift", `expo-native-supersede-survey.md:352-366`); it is out of scope here and nothing
above blocks it.

Android gets the same rule under `One.Android.<AndroidTypeName>` when its turn comes.

## Order and staffing

1. Section 1 items 1 to 3 go to whoever owns the iOS views catalog, as one slice with
   one conformance run. Review: none beyond the track's assembled review.
2. `One.Device` and `One.Splash`, one worker, iOS then Android. `Splash` lands before
   fonts F3 so the fonts docs can show a held splash around `Fonts.load`.
3. `SignInWithAppleButton` and the file importer host, one worker, iOS only.
4. `One.SecureStore`, one worker, both platforms, reviewed (it stores secrets).
5. The section 3 rule is written into `plans/one-native-api-conventions.md` when its
   first entry is staffed, with that entry as the worked example.

Every slice meets the existing review bar: legacy module, lazy cached
`TurboModuleRegistry.get`, device proof on the iOS simulator with output quoted, and a
negative control for each new suite check.

## Open to the owner

Two of the dispositions above are product choices. Adding `SecureStore`, `Device` and
`Splash` takes the decided uniform list from ten to thirteen. And section 3 commits
`One.iOS` to hold service APIs as well as views. Both are recommended here; neither is
staffed until the owner agrees.
