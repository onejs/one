# One.Updates: One's own over-the-air updates

Nate decided that One owns OTA updates and that expo-updates goes. That covers our
own client and our own server. This plan designs both and lists what must be proven
before any Contrast binary ships on it.

## What we replace

contrast-mobile is the only real user today. It relies on these expo-updates
behaviors, and on nothing else:

- a release build embeds a bundle and launches it until an update is downloaded;
- `checkForUpdateAsync` / `fetchUpdateAsync`, then apply on the next cold launch or
  on a user-tapped restart (`reloadAsync`);
- rollback: an update whose launch fails is abandoned and the previous one runs;
- reads: `isEnabled`, `runtimeVersion`, `updateId`, `isEmbeddedLaunch`, `createdAt`,
  `manifest` (for `metadata.gitCommit` and the update severity), and `useUpdates()`
  for the staged download;
- a runtime version: a binary only takes JS published for its own runtime version.

Its server (`templates/contrast-mobile/ota/worker.js`) serves the Expo Updates
protocol v1 from R2 at `<platform>/<runtimeVersion>/manifest.json` plus
content-addressed assets. It signs nothing, uses no channels, rollouts or directives.

## The design

### one wire format: static files

The client fetches one static manifest, with no request headers or multipart envelope:

```
<updatesUrl>/<platform>/<runtimeVersion>/manifest.json
<updatesUrl>/<platform>/<runtimeVersion>/assets/<sha256>.<ext>
```

Any static host serves it: R2, S3, a CDN or a plain file server. A 404 on the
manifest means nothing is published for this runtime version. Rollback on the
server side means publishing the older bundle again under a new id.

```ts
type UpdateManifest = {
  id: string // uuid, unique per publish
  createdAt: string // iso 8601
  runtimeVersion: string
  launchAsset: UpdateAsset
  assets: UpdateAsset[]
  metadata: Record<string, string | number | boolean>
}
type UpdateAsset = { key: string; hash: string; url: string; fileExtension: string }
// hash: sha256 of the bytes, base64url. url may be relative to the manifest.
```

### config, fixed per binary

`one.config` (or app.json for Expo-prebuilt apps during migration) gives
`updates: { url, runtimeVersion }`. Prebuild writes them into Info.plist
(`OneUpdatesURL`, `OneUpdatesRuntimeVersion`) and AndroidManifest meta-data. A build
without `updates.url` has updates disabled.

### the embedded update

The release bundle phase in One's prebuild templates already writes `main.jsbundle`
and the assets. It also writes `one-updates-embedded.json`: an id and createdAt
generated at build time, plus the runtime version. On the embedded launch that id is
`updateId`. This replaces `withExpoUpdatesVxrnManifest.cjs` and `EXUpdates.bundle`.

### launch selection (native, before React Native starts)

- iOS: `prebuildWithoutExpo.ts` patches the community template's
  `ReactNativeDelegate.bundleURL()`, the way it already patches AppDelegate for
  scenes. The release branch returns `OneUpdatesLauncher.bundleURL()`, which is the
  embedded bundle when updates are disabled. Debug keeps Metro.
- Android: the patched `MainApplication` passes `OneUpdatesLauncher`'s path as
  `jsBundleFilePath` to `getDefaultReactHost`.
- The launcher reads one JSON state file under Application Support
  (`one-updates/state.json`, with each update in `one-updates/<id>/`). It picks the
  newest ready update for this runtime version that has not failed, else the embedded
  one. There is no network on the launch path: `fallbackToCacheTimeout: 0` is the only
  behavior.
- An update installed by an older binary is ignored once its runtime version differs.
  An update older than the embedded bundle (`createdAt`) is ignored and deleted, which
  removes contrast-mobile's "update ready forever" workaround at its source.

### rollback

- Before launching a downloaded update, the launcher records `launching: <id>`.
- The launch succeeds when the root view first shows content: iOS
  `RCTContentDidAppearNotification`, Android `ReactMarker CONTENT_APPEARED`. The
  launcher then clears `launching`.
- If the next launch finds `launching` still set, that update is marked failed,
  deleted, and never selected again. The same happens when a fatal JS error occurs
  before content appears (RN's fatal handler, via the `RCTFatal` hook on iOS and the
  default JS exception handler on Android).
- The reviewer must read expo-updates' `ErrorRecovery` before implementation, check
  where our trigger points differ, and write the reason for any difference here.

### JS API

It follows `one-native-api-conventions.md`: values fixed for the process are readonly
properties, results are string-union types, and codes are `E_UPDATES_<REASON>`.

```ts
One.Updates.isEnabled: boolean // false in debug builds, on web, or without updates.url
One.Updates.runtimeVersion: string | null
One.Updates.updateId: string | null // the embedded id on an embedded launch
One.Updates.isEmbeddedLaunch: boolean
One.Updates.createdAt: Date | null
One.Updates.manifest: UpdateManifest | null // null on an embedded launch
One.Updates.check(): Promise<{ type: 'available'; manifest: UpdateManifest } | { type: 'none' }>
One.Updates.fetch(): Promise<{ type: 'fetched'; manifest: UpdateManifest } | { type: 'none' }>
One.Updates.getStaged(): UpdateManifest | null // downloaded, newer than running, applies next launch
One.Updates.reload(): Promise<void> // relaunch the React Native host on the newest ready update
```

- `check` compares the served id and createdAt against the running and staged update.
- `fetch` downloads, verifies every hash, and marks the update ready atomically: it
  writes into a temp directory, then renames it and updates the state.
- `check`, `fetch` and `reload` reject with `E_UPDATES_DISABLED` when `isEnabled` is
  false. Network and hash failures reject with `E_UPDATES_CHECK` and `E_UPDATES_FETCH`.
- Web: `isEnabled` is false, every read is null, and the calls reject with
  "Updates.check needs an iOS or Android build".
- `useUpdates()` is dropped; `getStaged()` covers what it was used for.
- `reload()` uses the host's own reload: `RCTHost` on iOS, `ReactHost.reload` on
  Android. It must be proven in a release build with a new bundle, 20 reloads in a row,
  before contrast-mobile turns its restart action back on.

### publishing

`one updates publish --platform ios|android --out <dir>` does three things:

1. builds the release bundle with the same bundler and options as the embedded build;
2. hashes every asset;
3. writes the static layout with a fresh id and `metadata` taken from
   `--metadata key=value`.

Uploading stays with the app. contrast-mobile's `ota-publish.mjs` keeps its gates
(fingerprint, delivery marker, stranded runtime) and uploads the directory to R2.

## Contrast migration

- contrast-mobile runs `expo prebuild`. One.Updates hooks through One's prebuild
  templates, so contrast-mobile moves to `one prebuild` in the same batch that drops
  expo-updates. That batch is track 2 step 6 of
  `contrast/plans/contrast/mobile-app/one-native-next.md`. The batch bumps the runtime
  version.
- `features/ota/*` moves to One.Updates, with `getStaged()` in place of `useUpdates`.
  The `extra.expoClient` embedding in `ota-publish.mjs` goes: it existed only for
  `@better-auth/expo`'s scheme lookup, which step 3 removes.
- The worker serves the static layout for the new runtime. Phones in the field on
  expo-updates binaries still call `/manifest` with Expo protocol headers, so the
  worker keeps that route until `scripts/ops/ota-unserved-runtimes.ts` shows no tester
  on those runtimes, then deletes it. That is the only period with two routes.
- Peach: a `OneUpdates` hybrid seam that mirrors a debug build (`isEnabled` false,
  calls reject `E_UPDATES_DISABLED`). The expo-updates stub stays for third-party apps.

## Proof before a binary ships

The native-features `updates` suite runs against a release build with a local static
server, on iOS 27 sim and on the Android emulator:

1. A cold launch runs the embedded update (`isEmbeddedLaunch`, the embedded id).
2. After publish, `check` returns available, `fetch` returns fetched and
   `getStaged()` returns the manifest; a cold relaunch runs the new bundle and shows
   its marker text.
3. A tampered asset makes `fetch` reject `E_UPDATES_FETCH`, and nothing is staged.
4. A published bundle that throws before first render: the relaunch after it runs the
   previous update, and that id is never selected again.
5. `reload()` runs the staged bundle in-session, 20 times in a row with no crash.
6. A different runtime version on the server is never fetched.

After that: contrast-mobile on a production sim build, following the plan's track 2
rules, then TestFlight.

## Order

1. This design reviewed (one reviewer, another model, validates against expo-updates
   source and RN host reload).
2. One: spec, launcher and JS on iOS, prebuild hooks, the embedded manifest, publish
   command, and the suite on iOS.
3. One: Android launcher and the suite on Android.
4. Beta, then the Contrast batch (one prebuild plus One.Updates plus the worker route).
