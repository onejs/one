# One.Updates: One's own over-the-air updates

Nate decided that One owns OTA updates and that expo-updates goes. That covers our
own client and our own server. This plan designs both and lists what must be proven
before any Contrast binary ships on it. It was reviewed against the expo-updates and
React Native 0.87.1 sources (r46099). Each rule below that came from that review cites
the expo behavior it matches or deliberately changes.

## What we replace

contrast-mobile is the only real user today. It relies on these expo-updates
behaviors, and on nothing else:

- a release build embeds a bundle and launches it until an update is downloaded;
- `checkForUpdateAsync` / `fetchUpdateAsync`, then apply on the next cold launch or on
  a user-tapped restart (`reloadAsync`). `reloadAsync` also serves restarts that have
  nothing to do with updates (`recordIssue.native.ts`, `zeroLocalReset.ts`);
- rollback: an update whose launch fails is abandoned and the previous one runs;
- reads: `isEnabled`, `runtimeVersion`, `updateId`, `isEmbeddedLaunch`, `createdAt`,
  `manifest` (for the git commit and the update severity), and `useUpdates()`, which
  re-renders Settings when a background check stages an update;
- a runtime version: a binary only takes JS published for its own runtime version;
- OTAs that ship new images and fonts (`ota-publish.mjs` `collectBundledAssets`).

Its server (`templates/contrast-mobile/ota/worker.js`) serves the Expo Updates
protocol v1 from R2 at `<platform>/<runtimeVersion>/manifest.json` plus
content-addressed assets. It signs nothing and uses no channels, rollouts or
directives. It also serves `/latest` and `/notes`, which are Contrast routes outside
the protocol.

## Wire format: static files

The client fetches one static manifest, with no request headers or multipart envelope:

```
<updatesUrl>/<platform>/<runtimeVersion>/manifest.json
<updatesUrl>/<platform>/<runtimeVersion>/assets/<sha256>
```

- Any static host serves it: R2, S3, a CDN or a plain file server.
- A 404 on the manifest means nothing is published for this runtime version.

```ts
type UpdateManifest = {
  id: string // uuid, unique per publish
  createdAt: string // iso 8601; ordering key, see "which update is newer"
  runtimeVersion: string
  launchAsset: UpdateAsset
  assets: UpdateAsset[]
  metadata: Record<string, string | number | boolean>
}
type UpdateAsset = {
  hash: string // sha256 of the bytes, base64url
  url: string // may be relative to the manifest
  path: string // where RN resolves it next to the bundle, see "assets"
}
```

`metadata` holds whatever the publisher passes. contrast-mobile uses two keys,
`gitCommit` and `updateSeverity`, which replace `extra.contrastForge.*`.

## Which update is newer

The rule matches expo, which orders strictly by commit time
(`LauncherSelectionPolicyFilterAware.kt:17-25`).

- A served update is newer when its `createdAt` is strictly greater than the running
  update's. An equal `createdAt` keeps the running update.
- `check` returns available only when the served update is newer and its id is not
  already staged.
- To roll back on the server, republish the older bundle with a fresh `createdAt`.
  `one updates publish` always stamps now, so republishing an old commit is a normal
  publish.

## Config, fixed per binary

- `one.config` gives `updates: { url, runtimeVersion }`.
- Prebuild writes both into Info.plist (`OneUpdatesURL`, `OneUpdatesRuntimeVersion`)
  and into AndroidManifest meta-data.
- A build without `updates.url` has updates disabled.

## The embedded update

- The release bundle phase in One's prebuild templates writes `main.jsbundle` and its
  assets.
- It also writes `one-updates-embedded.json`: an id and createdAt generated at build
  time, plus the runtime version.
- On the embedded launch, that id is `updateId`.
- This replaces `withExpoUpdatesVxrnManifest.cjs` and `EXUpdates.bundle`.

## Assets

- React Native already resolves an asset next to a bundle loaded from a `file://` URL
  (`Libraries/Image/AssetSourceResolver.js:99-128`): `scaledAssetURLNearBundle` on
  iOS, `drawableFolderInBundle` on Android. One.Updates lays each update out exactly
  that way: `one-updates/<id>/main.jsbundle` plus every asset at its `path`.
  - iOS path: `assets/<httpServerLocation>/<name>@<scale>x.<ext>`.
  - Android path: `drawable-<density>/<resource name>.<ext>`.
- No JS asset map is needed.
- The manifest lists every asset the bundle references. `fetch` hard-links any file
  whose hash is already on disk (from a previous downloaded update, or, on iOS, from
  the embedded app bundle) and downloads the rest.
- On Android the first update downloads its drawables once, because the APK's
  resources are not files.

## Launch selection (native, before React Native starts)

Hooks:

- iOS: `prebuildWithoutExpo.ts` patches the community template's
  `ReactNativeDelegate.bundleURL()` with the same exact-anchor-or-throw convention it
  uses for the scene patch. The release branch returns
  `OneUpdatesLauncher.bundleURL()`, which is re-read on every call so a reload picks
  up new state. Debug keeps Metro.
- Android: `getDefaultReactHost` stores `jsBundleFilePath` in one fixed
  `JSBundleLoader` (`DefaultReactHost.kt:62-85`). A reload would rerun the old bundle
  through that loader. So the patched `MainApplication` builds its `ReactHost` with a
  One `ReactHostDelegate` whose `jsBundleLoader` is a computed getter that asks
  `OneUpdatesLauncher` on every access. This mirrors `ExpoReactHostFactory.kt:60-78`.

Selection:

- The launcher reads one JSON state file, `one-updates/state.json`. It holds each
  downloaded update's id, createdAt, runtime version, success count and failed flag,
  plus `launching: <id> | null`.
- There is no network on the launch path. Contrast already runs its own check after
  launch (`useOtaAutoCheck`), so dropping expo's on-launch background check changes
  nothing.
- Candidates are the downloaded updates for this runtime version that are either not
  failed or have launched successfully at least once, plus the embedded update. The
  embedded update is always a candidate. The newest by `createdAt` wins.
- Before selecting a downloaded update, the launcher checks that its bundle and every
  asset exist and re-hashes the bundle. A damaged candidate is marked failed, and
  selection falls through to the next candidate in the same launch. Expo does the same
  (`AppLauncherWithDatabase.swift:180-301`), except that expo repairs a missing asset
  in place; One.Updates drops the candidate and `fetch` takes it again.
- Downloaded updates for another runtime version, or older than the embedded update,
  are deleted.

## Rollback

- Before starting a downloaded update, whether at cold launch or through `reload()`,
  the launcher records `launching: <id>`. The embedded update is never recorded and
  never marked failed.
- The launch succeeds when the root first shows content:
  - iOS: `RCTContentDidAppearNotification`, posted by the Fabric root
    (`RCTRootComponentView.mm:44-45`);
  - Android: `ReactMarker CONTENT_APPEARED`, which bridgeless `ReactSurfaceView`
    inherits.
  - Success increments that update's success count and clears `launching`.
- A fatal error before content appears marks the update failed:
  - iOS: `RCTSetFatalHandler` (`RCTAssert.h:141-144`);
  - Android: the host's `exceptionHandler`, which bridgeless sends through
    `ReactHostDelegate.handleInstanceException` (`ReactHostImpl.kt:408`). This is the
    same path expo uses (`ExpoReactHostFactory.kt:86-92`).
  - Then, in the same session, it reloads onto the next candidate, the way expo's
    error recovery relaunches from cache (`ErrorRecovery.swift:155-239`). Any pending
    `reload()` promise rejects with `E_UPDATES_RELOAD`.
- A cold launch that finds `launching` still set covers a native crash, a hang, or a
  kill before content appeared:
  - an update with zero successes is marked failed and never selected again;
  - an update with at least one success is selected again.
  - Expo never abandons a proven update (`ErrorRecovery.swift:159-164`); this guard
    keeps a force-quit during the splash from deleting a good update.
- After content appears, errors never roll back. Expo stops its recovery at first
  render (`ErrorRecovery.swift:306-316`).

## Reaper

This matches `ReaperSelectionPolicyFilterAware`.

- After a launch succeeds, keep the running update and the newest older update as the
  rollback spare, plus a staged update newer than the running one.
- Delete every other downloaded update. The embedded update is never deleted.

## JS API

It follows `one-native-api-conventions.md`: values fixed for the process are readonly
properties, results are string-union types, codes are `E_UPDATES_<REASON>`, and the
listener returns a remover.

```ts
One.Updates.isEnabled: boolean // false in debug builds, on web, or without updates.url
One.Updates.runtimeVersion: string | null
One.Updates.updateId: string | null // the embedded id on an embedded launch
One.Updates.isEmbeddedLaunch: boolean
One.Updates.createdAt: Date | null
One.Updates.manifest: UpdateManifest | null // null on an embedded launch
One.Updates.check(): Promise<{ type: 'available'; manifest: UpdateManifest } | { type: 'none' }>
One.Updates.fetch(): Promise<{ type: 'fetched'; manifest: UpdateManifest } | { type: 'none' }>
One.Updates.getStaged(): UpdateManifest | null // downloaded, newer than running
One.Updates.addStagedListener(listener: (staged: UpdateManifest | null) => void): () => void
One.Updates.reload(): Promise<void>
```

- `fetch` downloads, verifies every hash, and marks the update ready atomically. It
  writes into a temp directory, renames it, then updates the state. A hash mismatch
  rejects with `E_UPDATES_FETCH` and stages nothing.
- `addStagedListener` fires when `fetch` stages an update, so Settings re-renders the
  way `useUpdates()` made it.
- `reload()` restarts the host onto the newest ready update, or onto the current bundle
  when nothing is staged.
  - iOS: `RCTTriggerReloadCommandListeners(reason)` (`RCTReloadCommand.h:29`), which
    `RCTHost` handles in release builds by re-reading `bundleURL()` (`RCTHost.mm:372`,
    `:620-625`).
  - Android: `ReactHost.reload(reason)`, after `onHostResume` when the host is not
    resumed (`RestartReactAppExtensions.kt:26-30`).
  - It records `launching` first, as described under rollback.
- In a disabled native build, `check`, `fetch` and `reload` reject with
  `E_UPDATES_DISABLED`. Network failures reject with `E_UPDATES_CHECK`.
- Web follows the conventions' "No native side" row. `isEnabled` is false, the reads
  are null, and `getStaged` is null. `check` and `fetch` reject with
  "Updates.check needs an iOS or Android build" and the matching message for `fetch`.
  `reload()` reloads the page.
- `useUpdates()` is dropped. `getStaged()` plus `addStagedListener` replace it. The
  manifest's `createdAt` is a string, so Contrast compares with
  `new Date(staged.createdAt)`.

## Publishing

`one updates publish --platform ios|android --out <dir> [--metadata key=value]...`
does three things:

1. It builds the release bundle with the same bundler and options as the embedded
   build.
2. It lays the assets out by platform path and names each served file by its hash.
3. It writes the manifest with a fresh id and `createdAt` = now.

Uploading stays with the app. contrast-mobile's `ota-publish.mjs` keeps its gates
(fingerprint, delivery marker, stranded runtime) and uploads the directory to R2.

## Contrast migration

- contrast-mobile runs `expo prebuild`. One.Updates hooks through One's prebuild, so
  contrast-mobile moves to `one prebuild` in the same batch that drops expo-updates.
  That batch is track 2 step 6 of
  `contrast/plans/contrast/mobile-app/one-native-next.md`, and it bumps the runtime
  version.
- These move to One.Updates:
  - `features/ota/otaUpdates.ts`, `appRestart.native.ts`, `updateIdentity.ts`,
    `updateSeverity.mjs`, `app/home/settings.tsx` and
    `features/diagnostics/recordIssue.native.ts`;
  - the severity and commit reads, which move from `extra.contrastForge.*` to
    `metadata.updateSeverity` and `metadata.gitCommit`.
- `probeRuntimePublishState` becomes a GET of the static manifest URL, with 404
  meaning none. `runtimePublishStateFromStatus` maps 404 in place of 204.
- `scripts/ota-manifest.mjs` reads the static JSON in place of the multipart envelope.
- `ota-publish.mjs` publishes through `one updates publish`. Its `extra.expoClient`
  embedding goes: it existed only for `@better-auth/expo`'s scheme lookup, which
  step 3 removes.
- The worker:
  - serves the static layout for the new runtime;
  - keeps `/latest` and `/notes` permanently;
  - keeps the Expo protocol `/manifest` route until `scripts/ops/ota-unserved-runtimes.ts`
    shows no tester on an expo-updates runtime, then deletes it. That is the only
    period with two routes.
- Peach gets a `OneUpdates` hybrid seam that mirrors a debug build: `isEnabled` is
  false and the calls reject `E_UPDATES_DISABLED`. The expo-updates stub stays for
  third-party apps.

## Proof before a binary ships

The native-features `updates` suite runs against a release build with a local static
server, on the iOS 27 sim and on the Android emulator:

1. A cold launch runs the embedded update: `isEmbeddedLaunch` is true, with the
   embedded id.
2. After publish, `check` returns available and `fetch` returns fetched, with the
   staged listener firing. A cold relaunch runs the new bundle and shows its marker
   text, plus an image that only the update carries.
3. A tampered asset makes `fetch` reject `E_UPDATES_FETCH`, and nothing is staged.
4. A published bundle that throws before first render recovers in the same session
   onto the previous update, and that id is never selected again.
5. A proven update survives a kill during its splash and is selected again.
6. `reload()` runs the staged bundle in-session and shows its marker. After that, 20
   reloads in a row run without a crash.
7. A deleted bundle file falls through to the previous update in the same launch.
8. After three publishes, only the running update and its spare remain on disk.
9. A different runtime version on the server is never fetched.

After that: contrast-mobile on a production sim build, following the plan's track 2
rules, then TestFlight.

## Order

1. One: spec, the iOS launcher and JS, prebuild hooks, the embedded manifest, the
   publish command, and the suite on iOS.
2. One: the Android launcher and host delegate, and the suite on Android.
3. Beta, then the Contrast batch: one prebuild, One.Updates and the worker routes.
