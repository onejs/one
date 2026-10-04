# Native module contract proof

The fixture uses the public FileSystem, ImageManipulator and Motion objects and
posts its report and generated images to `scripts/native-modules-server.ts`.
The verifier decodes those images independently with Sharp, checks pixels and
transparency, and rejects a counterclockwise reference for the clockwise output.
It also checks Android motion signs and units against injected emulator values.

From `tests/native-features`, start the server through the build gate:

```sh
bun --cwd ~/contrast heavy --service -- bash -c \
  'cd "$1" && bun scripts/native-modules-server.ts --platform android --port 8109 --artifacts evidence/uniform-native-modules' \
  native-modules-server "$PWD"
```

The command must run from this fixture directory. Build the app from this source and
install it on the emulator owned by the run. Every Android command must select
that serial; the One CLI also requires `ANDROID_SERIAL`.

```sh
adb -s "$ANDROID_SERIAL" reverse tcp:8109 tcp:8109
adb -s "$ANDROID_SERIAL" emu sensor set acceleration 0:0:9.80665
adb -s "$ANDROID_SERIAL" emu sensor set gyroscope 0:0:0.25
adb -s "$ANDROID_SERIAL" emu sensor set magnetic-field 25:0:-30
```

Set the debug application's `debug_http_host` preference to `localhost:8109`
in `<applicationId>_preferences.xml` under the application shared preferences,
then cold-launch the app. For iOS, claim an iOS 27 pool simulator with `sim-claim.sh`, use
`--platform ios` and a dedicated port, and launch with `-RCT_jsLocation` followed
by `localhost:<port>`. Release devices after the report and captures are saved.

When `runtime.json` arrives, run:

```sh
bun scripts/native-modules-verify.ts evidence/uniform-native-modules/android
```

The checks include sorted and recursive filesystem operations, atomic overwrite,
binary bytes, invalid encodings and URIs, protected roots, error codes, and
cleanup. Image cases include oriented HEIC, JPEG, PNG and BMP decoding, all eight
EXIF orientations, crop, resize, clockwise rotation, encoded sizes, decoded
dimensions, transparency, invalid inputs, and preservation of the source file.
Motion checks cover native and JavaScript validation, availability, timestamps,
complete fused readings, per-listener intervals, concurrent listeners, and
idempotent removal while another listener continues.

The root namespace reports live in `../uniform-native-modules/`. Android also
checks 68 operations across the other 24 services, whose native implementation
is currently unavailable there. The earlier Android report in this directory
predates that namespace move; reproduce it with its recorded source revision.

`engine/` contains the full vxrn suite reports with the compiler rebuilt at each
revision. RAN: `3b3e99560^` and `69591350d` each passed 258 of 258 tests. The
reported HMR timeouts and source-map failure were not reproduced. No engine test
was loosened and no speed benchmark was run.
