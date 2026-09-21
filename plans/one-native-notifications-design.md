# One native notifications

**Recommendation (INFERRED):** ship `@vxrn/native/notifications`, a module whose
function names and payload shapes are a strict subset of `expo-notifications`, so
migrating means changing the import. It covers permission, local schedule and cancel,
device push tokens for APNs and FCM, foreground presentation, received and response
events, badge, and Android channels. Prebuild stamps the iOS entitlement, the
AppDelegate token forwarding, and the Android Firebase wiring from `native.app`.
Android's Firebase dependency is only present when the app opts into push, so apps
that don't use push stay the same size.

Scope: written design against `origin/v2-beta` at `8afc4a8eb`. Nothing was built or run
on a device for this document.

## Evidence

- **RAN (read):** the only real consumer in the family is Contrast's
  `contrast-notifications`. It calls `getPermissionsAsync`, `requestPermissionsAsync`,
  `setNotificationHandler`, `getDevicePushTokenAsync`, `addPushTokenListener`,
  `getLastNotificationResponse`, `clearLastNotificationResponse` and
  `addNotificationResponseReceivedListener`
  (`~/contrast/packages/contrast-notifications/src/index.native.ts:88,127,172,204,226,231-236`).
  It reads iOS provisional and ephemeral authorization separately
  (`.../src/types.ts:43-49`) and accepts only `ios` and `android` token types
  (`index.native.ts:135-137`).
- **RAN:** counting every `Notifications.<fn>` call across Contrast's templates, src and
  packages gives `scheduleNotificationAsync` 19, `setNotificationHandler` 8,
  `requestPermissionsAsync` 8, `getPresentedNotificationsAsync` 7,
  `getAllScheduledNotificationsAsync` 5, `getNotificationChannelAsync` 4,
  `setNotificationChannelAsync` 3, `getBadgeCountAsync` 3,
  `cancelScheduledNotificationAsync` 3, `dismissAllNotificationsAsync` 3,
  `setBadgeCountAsync` 2, `setNotificationCategoryAsync` 1. The only trigger shapes in
  use are `null` (show now) and `{ type: 'timeInterval', seconds, repeats }`.
- **RAN (read):** Contrast's skill tells apps to create the Android channel before
  requesting a token (`~/contrast/src/ai/skills/docs/contrast-push-notifications.md:67-68`)
  and forbids Notifee, react-native-firebase and OneSignal (`:122-128`).
- **RAN (read):** native modules in `@vxrn/native` register in
  `VxrnNativePackage.kt:18-25` and `:27-54`. The lazy resolve pattern to copy is
  `TurboModuleRegistry.get<SyncStateSpec>('OneNativeSyncState')`
  (`packages/native/src/syncInstaller.native.ts:15`); `safe-area/index.native.ts:22`
  uses an `as unknown as` cast and is the pattern to avoid.
- **RAN:** RN's codegen exports `EventEmitter<T>` for TurboModule specs
  (`node_modules/react-native/Libraries/Types/CodegenTypes.js:49`, read from the main
  checkout's RN 0.86.2; v2-beta pins 0.87.1 at `package.json:100`).
- **RAN:** `-[UNUserNotificationCenter setBadgeCount:withCompletionHandler:]` is iOS 16+
  (`UserNotifications.framework/Headers/UNUserNotificationCenter.h:77`, iOS 26.4 SDK);
  the package floor is 17 (`packages/native/schema.json:4`).
- **RAN (read):** prebuild renders the community template and patches files by string
  replacement: URL schemes into `Info.plist` (`packages/vxrn/src/exports/prebuildWithoutExpo.ts:456-470`),
  intent filters into `AndroidManifest.xml` (`:474-489`), and `app/build.gradle`
  (`:551-560`). No entitlements file exists or is written today; `grep` for
  `entitlements`, `aps-environment` and `google-services` under `packages/*/src` finds
  nothing.

## API (exact surface)

Everything is exported from `@vxrn/native/notifications`, a new subpath next to
`./color` and `./zoom` (`packages/native/package.json:37-60`). The names match Expo.

| function | notes |
| --- | --- |
| `getPermissionsAsync()`, `requestPermissionsAsync({ ios?: { allowAlert, allowBadge, allowSound, allowProvisional } })` | resolve `{ status: 'granted' \| 'denied' \| 'undetermined', granted, canAskAgain, ios?: { status: 0..4 } }`, the shape Contrast reads (`contrast-notifications/src/permission.ts:19-22,35-40`). Android 13+ requests `POST_NOTIFICATIONS`; below 13 it reads `areNotificationsEnabled()`. |
| `scheduleNotificationAsync({ identifier?, content: { title?, subtitle?, body?, data?, sound?: boolean, badge? }, trigger })` | `trigger` is `null`, `{ type: 'timeInterval', seconds, repeats?, channelId? }` or `{ type: 'date', date, channelId? }`. Resolves the identifier. |
| `cancelScheduledNotificationAsync(id)`, `cancelAllScheduledNotificationsAsync()`, `getAllScheduledNotificationsAsync()` | |
| `getPresentedNotificationsAsync()`, `dismissNotificationAsync(id)`, `dismissAllNotificationsAsync()` | |
| `getDevicePushTokenAsync()` | resolves `{ type: 'ios' \| 'android', data: string }`: hex APNs token or FCM registration token. |
| `addPushTokenListener`, `addNotificationReceivedListener`, `addNotificationResponseReceivedListener` | return `{ remove() }`. |
| `getLastNotificationResponse()`, `clearLastNotificationResponse()` | synchronous, as in current Expo and as Contrast calls them. |
| `setNotificationHandler({ handleNotification } \| null)` | `handleNotification` resolves `{ shouldShowBanner, shouldShowList, shouldPlaySound, shouldSetBadge }` (`contrast-notifications/src/types.ts:74-79`). |
| `getBadgeCountAsync()`, `setBadgeCountAsync(n)` | Android resolves `0` and `false`: the launcher owns badges there. |
| `setNotificationChannelAsync(id, { name, importance, description?, sound?: boolean, vibrationPattern?, showBadge? })`, `getNotificationChannelAsync`, `getNotificationChannelsAsync`, `deleteNotificationChannelAsync` | iOS resolves `null` and `[]`. `AndroidImportance` is exported as Expo's numeric enum. |

**Foreground handler.** iOS `willPresent` and Android's foreground receive both emit
one event carrying a request id. The JS side runs `handleNotification` and calls the
module's `presentAsync(requestId, behavior)`. Native applies it, or presents nothing
after 3 s. That keeps Expo's async handler shape with one round trip and no JS mirror of
native state. With no handler set, nothing is shown in the foreground. **GUESSED:** that is also Expo's
default; N3 checks it against Expo's source before the docs promise it.

**Web.** Permission reads resolve `{ status: 'denied', granted: false, canAskAgain: false }`,
listeners return inert subscriptions, and schedule and token calls reject with
`notifications require an iOS or Android build`. Browser push is out of scope.

**Native.** iOS: one Swift class holding `UNUserNotificationCenter`. It becomes the center's
delegate from a `UIApplicationDidFinishLaunchingNotification` observer registered in
`+load`, so a cold-start tap is still delivered. **GUESSED:** that observer runs early enough
for a cold-start response. Slice N3 proves or rejects this on device before anything else
builds on it. Android: `NotificationManagerCompat` and `NotificationChannel`, plus
`AlarmManager.setAndAllowWhileIdle` for the date and interval triggers. Schedules
persist in `SharedPreferences` and a `BOOT_COMPLETED` receiver re-arms them. Exact
alarms are excluded on purpose: they need `SCHEDULE_EXACT_ALARM`, and a single inexact path is
simpler. A doze-deferred delivery is documented as expected.

## What prebuild stamps

New `native.app` fields go in `NativeAppManifest` (`packages/one/src/native/appManifest.ts:4-35`)
and in vxrn's `validatePrebuildApp` (`prebuildWithoutExpo.ts:121`). These two validators
currently duplicate each other; merging them first would keep this change to one place.

```ts
native: { app: { notifications: { push?: boolean }, android: { googleServicesFile?: string } } }
```

- `notifications` present, both platforms: Android `POST_NOTIFICATIONS` and
  `RECEIVE_BOOT_COMPLETED` permissions plus the alarm and boot receivers go into the app
  manifest. The library manifest stays empty so apps without notifications gain no
  permissions.
- `push: true`, iOS: write `<App>/<App>.entitlements` with `aps-environment` =
  `development`, and set `CODE_SIGN_ENTITLEMENTS` in both pbxproj configurations. Stamp
  the `didRegisterForRemoteNotificationsWithDeviceToken` and `didFail…` forwarders into the
  template `AppDelegate.swift`. One owns the template render, so no method swizzling is needed.
  **GUESSED:** distribution export rewrites the value to `production` from the provisioning
  profile. Check that once with an archive in slice N5.
- `push: true`, Android: `googleServicesFile` is required, and prebuild fails without it. Copy it to
  `android/app/google-services.json`, add the `com.google.gms:google-services` classpath
  and plugin, declare the messaging service, and write `oneNativePush=true` to
  `gradle.properties`.
- **Optional Android dependencies (decided once, reused by the map design).**
  `packages/native/android/build.gradle` reads `oneNativePush`. When it is set, it adds
  `src/push/java` and `firebase-messaging`. When it is not, it adds `src/nopush/java`, whose
  `OneNativePush.getToken` rejects with `push is not enabled: set native.app.notifications.push`.
  The two source sets define the same class, so there is one call site, no reflection and
  no runtime detection. Today every dependency is unconditional (`build.gradle:78-85`).

## Excluded

Expo push service tokens (`getExpoPushTokenAsync`), categories and action buttons, text
input replies, attachments, notification service and content extensions, silent or
background push handlers, `daily`/`weekly`/`calendar`/`yearly` triggers (they can be
added later without breaking anything), custom sounds, critical and time-sensitive
interruption levels, Android launcher badges, and web push.

## Slices

Each slice lands types, iOS and Android code, web behavior, a
`tests/native-features/fixtures/one-native-notifications.tsx` section, a `notifications`
entry in `suites` (`tests/native-features/scripts/one-native-conformance.ts:25-43`), the
Android flow (a single `one-native-android` suite, `one-native-conformance.android.ts:793`),
and a `## Notifications` section in `apps/onestack.dev/data/docs/native-features.mdx`.

1. **N1 permission and badge.** Spec, lazy module, `notifications` prebuild stamp for
   `POST_NOTIFICATIONS`. Suite: undetermined, then the grant (iOS: `simctl privacy grant`;
   Android: `pm grant`), then the badge round-trips on iOS.
2. **N2 Android channels.** Suite: create, read back, delete.
3. **N3 events and the handler.** Delegate install, received and response listeners, last
   response, foreground handler round trip. Suite: an immediate (`trigger: null`)
   notification is shown or suppressed by the handler; tapping it from a cold start is
   delivered through `getLastNotificationResponse`.
4. **N4 scheduling.** Interval and date triggers, cancel, list, presented, dismiss,
   boot re-arm. Suite: schedule 5 s out, cancel one, observe the other.
5. **N5 push tokens.** iOS entitlement and AppDelegate stamps, the Android push source set and
   google-services stamp. Suite: iOS token is 64 hex characters on a signed build;
   `xcrun simctl push` delivers a payload that reaches the received and response listeners.
   **Blocker to resolve at N5:** the Android FCM check needs a real Firebase project's
   `google-services.json` for the fixture app. Until one exists, Android N5 can only
   prove that the `nopush` rejection works.

Unit tests only where JS logic exists: the handler timeout and request-id pairing in N3.
