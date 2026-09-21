# One native API conventions

The uniform APIs (haptics, crypto, app info, fonts, clipboard, network, browser, image
picker, notifications, map) are written by different workers from different Expo modules.
This file is the single set of rules that makes them read as one library. A new uniform
API follows it; a review checks against it.

Decided by the owner: a uniform API is a proper-noun domain namespace with clean One
names, taking the best existing shape for each call (Expo's, Swift's, or what One
already does), and consistency between the uniform APIs is the hard rule. Where a
cleaner name and an Expo-verbatim name disagree, consistency with the other One
namespaces wins. The platform APIs are the opposite: `One.iOS` and `One.Android` map
exactly to SwiftUI and Compose names and prop contracts, and nothing in this file
renames them.

Status of the evidence: the three landed APIs were read on `one-native-assembled`
(`f0082dcb4`) and `origin/one-native-app-info` (`f525dcdf1`); notifications and map were
read as designs on `origin/one-native-designs-notifications-gl-map`; clipboard, network,
browser and image picker had no pushed code when this was written, so their rows are the
target, stated against the Expo signatures in `expo-*` `58.0.0-canary-20260909`.

## 1. What takes Expo's shape, and what does not

Expo's shape means its parameters, option names, payload fields and string values. Those
are copied exactly, so data that flowed through an Expo module flows through One
unchanged. Expo's function names are rewritten by a fixed rule, because `One.Clipboard.getStringAsync()`
and `One.UI.Haptics.impact('light')` cannot sit in the same library:

1. drop the `Async` suffix. The return type says whether a call is asynchronous.
2. drop the words that repeat the namespace: `getNetworkStateAsync` is
   `Network.getState`, `openBrowserAsync` is `Browser.open`,
   `scheduleNotificationAsync` is `Notifications.schedule`.
3. enums become string unions of their lowercase member names. No TypeScript `enum`, no
   numeric code in a payload. `ImpactFeedbackStyle.Light` is `'light'` (already Expo's
   value); `AndroidImportance.HIGH` is `'high'`; the iOS authorization status is
   `'notDetermined' | 'denied' | 'authorized' | 'provisional' | 'ephemeral'`.
4. hooks keep Expo's name: `useFonts`, `useNetworkState`.

Landed haptics already follows rules 1 to 3. The notifications design does not yet
(it keeps `getPermissionsAsync` and the numeric `AndroidImportance` and `ios.status`);
section 8 lists the change. Migration from Expo is an import change plus this mechanical
rename, and each docs section carries the rename table for its module.

## 2. Where an API attaches

- `One.UI.<Name>`: anything that renders in the app's tree or changes how the tree looks
  or feels. Components (`Map`, `Icon`, `Blur`), `Haptics`, `Fonts`.
- `One.<Name>`: device and app services with no view of their own. `AppInfo`,
  `Clipboard`, `Network`, `Browser`, `ImagePicker`, `Notifications`.
- A hook sits beside its namespace, never inside it: `One.UI.useFonts`,
  `One.useNetworkState`. `One.Network.useState` would read as React's hook.
- A web standard global is installed instead of a namespace only when third-party
  libraries look for that global. `crypto.getRandomValues` and `crypto.randomUUID`
  qualify (uuid and nanoid read them). `navigator.clipboard` and `navigator.onLine` do
  not: nothing on native looks for them, and a partial `navigator` misleads feature
  detection.

A namespace is a frozen object of functions, PascalCase, a plain noun: singular for one
thing (`Clipboard`, `Browser`), plural for a collection (`Fonts`, `Notifications`). A
value fixed for the life of the process is a readonly property read once at import
(`One.AppInfo.version`), never a function.

## 3. Package layout

Per namespace, in `packages/native`:

- `src/<kebab-name>/index.native.ts`, `index.ts` (web), `types.ts`. The subpath is
  `@vxrn/native/<kebab-name>`, added to `package.json` `exports` in the same form as
  `./haptics`. The root entry re-exports it and `packages/one/src/one.ts` attaches it.
- A subpath exports the namespace object, its hooks and its types. Validation helpers,
  the spec interface and the module accessor stay private.
- Native module name `OneNative<Name>`; iOS `ios/OneNative<Name>.{h,m}` or `.swift`;
  Android `OneNative<Name>Module.kt`, registered in `VxrnNativePackage.kt`.
- A uniform component lives in `src/ui/<Name>.{ios,android,}.tsx` and is exported through
  `src/effects/index.ts` like `Icon`. It gets no subpath of its own.

The JS side of a module is the existing review bar, restated once: a legacy RCT module,
a JS `interface Spec extends TurboModule`, one lazy cached
`TurboModuleRegistry.get<Spec>()`, no `as`, no per-call `try`/`catch`, no JS copy of
state that native can answer (`Fonts.isLoaded` asks the platform; it does not keep a set).

## 4. Sync or async

A call is synchronous when the platform answers without I/O, a permission prompt or UI:
`AppInfo.*`, `Fonts.isLoaded`, `Notifications.getLastResponse`, and fire-and-forget
effects, which return `void` (`Haptics.impact`). Everything else returns a promise. A
call never has both a sync and an async form.

## 5. Absent, refused, unsupported, failed

Four different things happen when a call does not produce the ordinary result. Each has
one treatment, the same in every namespace.

| case | treatment | examples |
| --- | --- | --- |
| **Caller's mistake**: wrong type, unknown union member, duplicate id | throws synchronously at the JS boundary, with the same check and message on web and native. Native code still guards, but does not report. | `Haptics.impact('hard')`, two map markers with one id |
| **Nothing there** | a value: `null` for one thing, `[]` for a list, Expo's empty value where Expo defines one. Never `undefined`, never an error. | `AppInfo.build` unknown is `null`; `Notifications.getLastResponse()` is `null`; `Clipboard.getString()` is `''` |
| **The user said no or backed out** | a resolved value in Expo's shape. Never a rejection: refusing is an ordinary outcome and every caller must handle it. | picker `{ canceled: true, assets: null }`; browser `{ type: 'cancel' }`; permission `{ status: 'denied' }` |
| **The concept belongs to the other platform** | resolves the empty value, so shared code needs no `Platform.OS` check. | `Notifications.setChannel` on iOS resolves `null`; `getBadgeCount` on Android resolves `0` |
| **No native side**: web with no equivalent, or a binary built before the module existed | effects do nothing; reads return the empty or denied value; a call that promises a result rejects with `<Namespace>.<verb> needs an iOS or Android build` or `... needs a native build that includes @vxrn/native`. Anything security-bearing throws and never degrades: crypto installs nothing without its module. | `Haptics.*` on web; `Notifications.getPermissions()` on web is denied with `canAskAgain: false`; `Notifications.schedule` on web rejects |
| **It failed at runtime**: I/O, OS error | rejects with an `Error` whose message starts `<Namespace>.<verb>:` and whose `code` is stable, `E_<NAMESPACE>_<REASON>`, passed as the first argument of RN's `reject`. Docs list a code only when an app would branch on it. | `E_FONTS_DOWNLOAD` |

There is no availability probe by default. With the rules above an app rarely needs to
ask first. When a real consumer must branch, the probe is `Namespace.isAvailable():
boolean`, synchronous, inside the namespace.

**Web entries.** Same exported names and signatures as native, same argument checks. A
web entry uses the browser's own API when that is the same job in a few lines
(`navigator.clipboard`, `online`/`offline` events, `window.open`, `FontFace`); otherwise
it follows the "no native side" row. It touches no browser global at import, and on the
server every call behaves as "no native side", so a route module that imports it renders
under SSR and SSG.

## 6. Permissions

One response shape, Expo's, for every permission in the library:

```ts
type PermissionResponse = Readonly<{
  status: 'granted' | 'denied' | 'undetermined'
  granted: boolean
  canAskAgain: boolean
}>
```

- Platform detail extends it under a platform key and never changes the three fields:
  `ios: { status: 'provisional' | ... }` for notifications.
- Verbs are `getPermissions()` and `requestPermissions(options?)`. A namespace with more
  than one permission names it in the middle: `ImagePicker.getCameraPermissions()`.
- A permission that the modern platform path does not need is not exposed. The photo
  library picker uses `PHPickerViewController` and Android's photo picker, which need no
  grant, so `ImagePicker` has camera permission calls only.
- The library's own `AndroidManifest.xml` and podspec declare no permission and no usage
  string. Prebuild stamps them from `native.app` when the app turns the feature on, so an
  app that does not use a feature gains nothing in its manifest or its store review.

## 7. Events, config, optional native code

- **Listeners.** `add<Event>Listener(listener)` returns `{ remove(): void }`, Expo's
  subscription shape, with the namespace's noun dropped from the name:
  `Network.addStateListener`, `Notifications.addResponseReceivedListener`. No
  `remove*Listener` functions. The listener receives one payload object.
- **Event transport.** No module in `@vxrn/native` emits an event today (**RAN:** no
  `NativeEventEmitter`, `DeviceEventEmitter` or `RCTEventEmitter` under
  `packages/native/src` or `ios`), and `codegenConfig.type` is `components`
  (`packages/native/package.json:105`), so module specs are not generated. Codegen's
  `EventEmitter<T>`, which the notifications design cites, exists only on generated
  TurboModules and is unavailable to a legacy module (**INFERRED** from how the generated
  spec class carries the emitter). The one transport is therefore the legacy one: iOS
  subclasses `RCTEventEmitter`, Android emits through `RCTDeviceEventEmitter`, the spec
  declares `addListener(eventName: string): void` and `removeListeners(count: number): void`,
  and JS holds one `NativeEventEmitter(module)` per namespace. Event names are
  `oneNative<Name><Event>`. The first module that lands events proves this on both
  platforms; moving `codegenConfig` to `all` is a broad engine change and is not part of
  any uniform API slice.
- **Build-time config** for a namespace lives at `native.app.<camelCaseName>`
  (`native.app.fonts`, `native.app.notifications`). A value that exists on one platform
  only sits under `native.app.ios` or `native.app.android` (`googleMapsApiKey`,
  `googleServicesFile`). `NativeAppManifest` and vxrn's `validatePrebuildApp` still
  duplicate each other; merge them before the next field is added to both.
- **Optional native dependencies** (Firebase, the Maps SDK) are switched by a gradle
  property `oneNative<Feature>` that prebuild writes, selecting one of two source sets
  that define the same class. This stays **GUESSED** until the notifications N5 or map M2
  slice publishes APK sizes both ways. Whichever mechanism survives that proof is the
  only one; a second feature never invents its own.

## 8. The surface, and what has to change to match

| namespace | members | source of the shape |
| --- | --- | --- |
| `One.UI.Haptics` | `selection()`, `impact(style)`, `notification(type)` | expo-haptics; landed |
| global `crypto` | `getRandomValues`, `randomUUID` | web standard; landed |
| `One.AppInfo` | `version`, `build`, `applicationId` | expo-application's three fields, renamed; landed |
| `One.UI.Fonts`, `One.UI.useFonts` | `load(map)`, `isLoaded(name)` | expo-font; `plans/one-native-fonts-design.md` |
| `One.Clipboard` | `getString()`, `setString(text)`, `hasString()` | expo-clipboard |
| `One.Network`, `One.useNetworkState` | `getState()`, `addStateListener(fn)` | expo-network |
| `One.Browser` | `open(url, options?)`, `dismiss()`, `openAuthSession(url, redirectUrl?, options?)`, `dismissAuthSession()` | expo-web-browser |
| `One.ImagePicker` | `launchLibrary(options?)`, `launchCamera(options?)`, `getCameraPermissions()`, `requestCameraPermissions()` | expo-image-picker |
| `One.Notifications` | `getPermissions`, `requestPermissions`, `schedule`, `cancelScheduled`, `cancelAllScheduled`, `getAllScheduled`, `getPresented`, `dismiss`, `dismissAll`, `getDevicePushToken`, `addPushTokenListener`, `addReceivedListener`, `addResponseReceivedListener`, `getLastResponse`, `clearLastResponse`, `setHandler`, `getBadgeCount`, `setBadgeCount`, `setChannel`, `getChannel`, `getChannels`, `deleteChannel` | expo-notifications |
| `One.UI.Map` | component; props and events keep expo-maps names | expo-maps |

Changes this asks of existing work, smallest first:

1. **Haptics and crypto availability probes.** `isHapticsAvailable` has no consumer
   outside its own test and docs paragraph (**RAN:** `git grep` on
   `one-native-assembled`). Remove it from the public exports. `isSecureRandomAvailable`
   is used only inside `crypto/index.native.ts`; make it private. Both are cheap now and
   a breaking change after a stable release.
2. **Notifications names and enums.** Apply rules 1 to 3: the member list above, string
   unions for importance and for `ios.status`. Contrast's `contrast-notifications` is
   the one consumer and changes in the same hand-off as its import. This is a rename of
   the JS surface and the docs, with no native change, and can be done once when the
   slices are assembled, so no in-flight worker needs to stop.
3. **Notifications events.** Replace the design's `EventEmitter<T>` with the transport
   in section 7.
4. **Clipboard, network, browser, image picker.** Check the pushed branches against the
   table and section 5 at review. Anything beyond the listed members needs a named
   consumer.
