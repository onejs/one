# Docs captures

The hero images on onestack.dev's native component pages come from this app,
captured on a real iOS simulator and Android emulator. Every image shares one
canvas, background, shadow, and scale, so regenerate them with these scripts
rather than by hand.

## How it works

1. `app/docs-capture.tsx` renders one scene from this folder, centered, with
   the status bar hidden. Its background alternates pure white and pure black
   every 1.5 seconds.
2. `scripts/docs-capture.ts` takes one screenshot on each background. Their
   difference gives exact alpha for every pixel, so antialiased edges and
   translucent fills stay correct. It crops to the scene and writes a
   transparent PNG at 2x.
3. The script waits until two frames on the same background match, so remote
   images and map tiles have arrived before the capture.
4. Scenes with a `hold` in `scenes.ts` drag across the subject and keep the
   finger down for the capture, so a pager can be shown mid swipe. A third
   frame must match the first, or the capture fails.
5. Scenes with `screen` capture the real screen, or its lower part, with
   rounded corners, for views the system draws over the app such as sheets
   and alerts. With `press` the script long presses the scene, which
   presents them; presenting covers the alternating background, so it must
   wait until the scene is found, and a long press keeps the tap that opens
   the link from presenting early. With `home` they leave the app first; picture in picture
   uses this, since its window only exists outside the app.
6. `scripts/docs-composite.ts` places each platform's capture side by side at
   the same scale on the brand yellow with a soft shadow, and writes a
   1600x1000 webp to `apps/onestack.dev/public/native/`.

## Regenerate

Run the fixture's dev server and the built app on an iOS 27 simulator claimed
with `sim-claim.sh` and on the Android emulator, then:

```bash
cd tests/native-features
bun scripts/docs-capture.ts --platform ios --device <udid> --scene pager --out /tmp/docs
bun scripts/docs-capture.ts --platform android --device emulator-5554 --scene pager --out /tmp/docs
bun scripts/docs-composite.ts --scene pager --captures /tmp/docs \
  --out ../../apps/onestack.dev/public/native/pager.webp
```

Each scene name in `scenes.ts` maps to `apps/onestack.dev/public/native/<scene>.webp`.
`map` is captured on iOS only unless the Android build has a Google Maps key,
and `pip` on Android only, since iPhone simulators have no picture in picture.
Disable the Gemini app on the emulator first
(`adb shell pm disable-user --user 0 com.google.android.apps.bard`), or its
overlay covers the home screen.

Look at the result before committing it.

The dev server does not always see a newly added scene file; if the app shows
`unknown docs scene`, restart the dev server and relaunch the app.

On Android, start the dev server with `ONE_NATIVE_BUNDLER=rolldown`; Metro
cannot bundle this app's Kotlin native-source fixture. Point the app at it with
`adb reverse tcp:8091 tcp:8091` and a `debug_http_host` of `localhost:8091` in
the app's preferences. The script uses `adb` from `ANDROID_HOME` and honors
`ANDROID_ADB_SERVER_PORT`, so an emulator on another Mac works over an ssh
tunnel to its adb port with a separate adb server holding that Mac's key.
Use that when the local emulator reports `hvf is not enabled`.

## Add a scene

1. Add a component here that renders the subject at its natural size on a
   transparent root. Do not draw a background or shadow; the composite adds
   them.
2. Register it in `scenes.ts` and in the `scenes` map in `app/docs-capture.tsx`.
3. Capture, composite, and reference it from the page with
   `<NativeHero src="/native/<scene>.webp" alt="..." />`.

Reference tables on those pages name their source type, such as
`<PropsTable source="ui/pagerTypes.ts#PagerProps" ... />`.
`packages/one/tests/nativeDocs.test.ts` fails when a table's names or types
differ from that declaration.
