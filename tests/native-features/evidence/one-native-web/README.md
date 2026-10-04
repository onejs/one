# Browser service proof

Base: One `origin/v2-beta`, `3febba064`. Landing branch: `fix/one-unified-browser-apis`.
No native source or Nitro generated bridge changes. No npm dependencies added.

TESTED: Chromium and WebKit pass every namespace. Headless browsers exercise FileSystem, ImageManipulator,
Device, Location, KeepAwake, Motion, ScreenOrientation, Print, Share, Contacts,
Speech, Audio, Blur, and Mask. `chromium.json` and `webkit.json` record the
assertions, browser versions, seeded adapters and unavailable methods.

FileSystem reads bytes independently through OPFS file handles, checks exact
Unicode names and listed URI roundtrips, directory copies/moves/deletion,
invalid base64, missing parents, protected roots, and competing destinations.
Image proof checks pixels independently, all four rotations, all eight EXIF
orientations including mirrored ones, crop, resize, JPEG/PNG encoding,
transparency, wrong-rotation control, and the real One.UI.Image load callback.
Audio proof uses a deterministic WAV for duration and seek, a real MediaRecorder
for encoded recording and playback decoding, pause-excluded recording duration,
operation conflicts, metadata, decodable artwork, and remote action playback
changes before callbacks. Seek checks the actual
requested browser position, its seeked event, and reported native currentTime.

Supported orientation locks are seeded because headless desktop cannot rotate
the display. Real screen reads, changes and unsupported locks are also checked.

The Motion input is seeded device events, with SI/gravity and angular conversion,
independent intervals, removed subscriptions, unavailable magnetometer and invalid
input. Desktop physical sensors are not claimed. WebKit lacks these event
constructors here; its adapter contract is exercised with seeded constructors.
Speech transcript/session lifecycle, Share completion/cancellation and Contact
Picker mapping use seeded browser adapters. Both real desktop browsers lack
Contact Picker. Live speech transcripts, a real share target and contact picking
on a supporting phone remain unproven. Constructor availability and unsupported
methods use the actual desktop browser environment.

WebKit needs a persistent profile for real OPFS. Its ephemeral context exposes
getDirectory but rejects the operation. Playwright cannot grant its microphone
permission, so the proof supplies an actual generated Web Audio MediaStream to
MediaRecorder and marks that boundary in the report. Chromium uses Playwright's
fake microphone device. Both use granted geolocation with exact fixed coordinates.

TESTED: Chromium screenshot blur has low stripe contrast and the no-filter
negative control retains high contrast. On this macOS WebKit build,
page.screenshot() omits backdrop filtering. Its headless compositor video does
render the filter. Retained blur/control videos and final decoded PNG frames
check the same stripe contrast assertion. The snapshot discrepancy is recorded,
not counted as a rendering failure or silently hidden. Mask screenshots assert
exact foreground/background pixels and invalid-mask passthrough. All retained
captures and compositor frames were inspected. The before/after WebP is quality
90 without scaling; the before half displays errors from the baseline functions.

Methods without a matching browser interface retain the existing unavailable
contract: Print PDF completion, Motion magnetic field vectors, Location
geocoding/reverse geocoding and background watch, Audio OS interruptions, and
Contacts address-book permission/search/edit. No explicit flip prop exists in
the image spec; the eight EXIF mirror/rotation transforms are supported.

Repeat from the worktree root, with installed existing dependencies:

```sh
bun tests/native-features/scripts/one-native-web-server.ts
# another terminal; installed Chromium/WebKit and ffmpeg are required
PLAYWRIGHT_MODULE=/Users/n8/contrast/node_modules/playwright \
  node tests/native-features/scripts/one-native-web-verify.cjs
PLAYWRIGHT_MODULE=/Users/n8/contrast/node_modules/playwright \
  node tests/native-features/scripts/one-native-web-before-after.cjs
```

Omit PLAYWRIGHT_MODULE when this checkout's Playwright has installed browsers.
The runner creates and removes its own temporary persistent browser profiles.
No simulator or emulator is used.

RAN: docs props/type drift, unavailable SSR contracts and unchanged native
Blur/Mask/EdgeFade tests pass 150 tests across five files:

```sh
cd packages/one
bun run vitest --run tests/unavailableServices.test.ts tests/nativeDocs.test.ts \
  tests/blur.test.ts tests/mask.test.ts tests/edgeFade.test.ts
```

RAN: strict TypeScript over every changed service/effect source passes. The full
One build passes after installing the lockfile-pinned dependencies in this
worktree. The primary checkout's older React Navigation dependencies first
failed five navigation types; source outside this lane was not changed.
The broader direct fixture typecheck reaches existing Nitro Image source null
errors when importing One.UI.Image's native prop type. Runtime image validation
and the package declaration build pass; that broader fixture check is not claimed
passed. The cited historical strict native coverage command is absent from the
uniform-services plan and this checkout and is not claimed passed. Nate approved
landing these existing unified APIs and Blur/Mask adapters; broader One.UI
coverage is outside this work, per plans/one-native-web.md.

The generated WebKit geolocation override returns a timestamp 1,000 times the
Chromium epoch-millisecond value on this host. The adapter preserves the browser
timestamp, independently checked against getCurrentPosition, instead of guessing
a unit conversion. Real-device WebKit geolocation timestamps remain unproven.

No speed or physical-device claims are made.

RAN: Release and Checks and Tests passed for landed source
`3d5841af00b869bd93a3edf69671962acc53a3d9`. The automatic v2-beta canary
`2.0.0-0.canary.1791148136111` records that exact `releaseSourceCommit`.
TESTED: 15 published service/effect ESM files match the local One build byte
for byte. SHA-256 values and workflow links are in `content-receipt.json`.
The Release workflow ran from 21:07:46Z to 21:15:06Z, 7m20s.

Repeat the exact artifact content check without installing it:

```sh
npm pack one@2.0.0-0.canary.1791148136111 --ignore-scripts
tar -xzf one-2.0.0-0.canary.1791148136111.tgz
python3 - <<'PYTHON'
import hashlib, json, pathlib
receipt = json.loads(pathlib.Path('tests/native-features/evidence/one-native-web/content-receipt.json').read_text())
manifest = json.loads(pathlib.Path('package/package.json').read_text())
assert manifest['releaseSourceCommit'] == receipt['releaseSourceCommit']
assert manifest['version'] == receipt['version']
for item in receipt['artifactFiles']:
    data = pathlib.Path('package', item['path']).read_bytes()
    assert hashlib.sha256(data).hexdigest() == item['artifactSha256'], item['path']
PYTHON
```
