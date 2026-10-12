# Portal validation

Branches stay unmerged pending approval of the API in `one-ui-portal-pager.md`.

RAN: `tests/native-features/app/one-native-portal.tsx` on iPhone 17 Pro, iOS 27,
and Pixel 8, Android 17. Native builds passed. The final iOS provider-name build
printed `Build succeeded` in 770.0 seconds. Android printed
`BUILD SUCCESSFUL in 2m 12s`, 348 tasks (72 executed, 276 up-to-date).

TESTED: physical touches and native accessibility frames show a 180 × 120 host
resizing to 280 × 180. The badge remains 8 points/dp from both host edges.
The counter becomes `context:1`, survives named replacement, host removal and
remount, and moving to the second 220 × 90 host. Both platforms check that the inline
badge remains within the source after host removal. The native host child order starts with its own text, then the portals.
The overlapping pixel is `#882244`, the second portal's color. A stale counter, a window-sized layout,
or reversed mount order would fail these assertions.

Android's focused fixture entry is selected with
`ONE_NATIVE_PORTAL_FIXTURE=1 bun run dev`. It registers the same Portal fixture
in the normal native-features binary. The separate Kotlin native-source demo
cannot resolve under this Metro configuration; it is not part of this proof.
The iOS fixture remains reachable at `/one-native-portal`.

RAN: the web fixture passes host bounds, resize, events, named replacement,
missing host, remount, host switch, context and child state assertions. The
fixture gives its source Portal an explicit height, so hosted layout must
override that height with the host's dimensions. The negative control restores
80px source height while hosted and produces a 48px bottom inset instead of 8px;
restoring host height passes again.

RAN: a frozen-lockfile install and fresh workspace build passed all 14 tasks.
Stale package-local dependency links had kept the fixture on old compiler and
build artifacts. The fresh build emits `./Containers.native.js`; no compiler or
build-driver source changes were needed.

RAN: Contrast `check:mobile-template` printed `0 type errors`;
`check:templates` exited 0. `bun deps` reports the local One version and the
removed teleport native graph against the approved production graph. Pod lock
and OTA runtime updates are intentionally deferred until landing.

RAN: the migrated Contrast mobile app built with the local One native package,
printing `Build succeeded` in 1036.3 seconds. A temporary validation entry rendered
the actual `NativeDesignMap`, including its migrated status Portal, under the
app's normal providers. With no backend, its real error status was visible.
Native accessibility frames show the map changing from 402 × 874 to a contained
320 × 460 at (24, 80); the status stays centered and 92 points above that host's
bottom, moving from y=705 to y=371. The fixture above directly verifies host
dimensions; the product screen also sizes its inner board box explicitly.
The temporary entry was removed and the original index and generated routes restored.

The Vite bundle needed the existing upstream compiler fix `126a43278` from One
v2-beta, exercised by copying its built dist into the local Contrast install.
A standalone Hermes lowering probe throws the source-map composition error with
the older artifact and passes with that fix. This lane makes no compiler changes.

RAN: `bun run test:conformance:proof -- --suite library --grep OnePortalLibraryCase`
passed one test on iOS and one on Peach, with four settled pairs. The named
regions differ by 0.169%, 0.170%, 0.244% and 0.170%, below the unchanged 1%
review threshold. The final paired receipt uses the canonical generated iOS provider class names,
Contrast commit `ce2a0fe79f5278b2e520b40d7806dcc772e740ee`, and native input digest
`51e067c9c8978d12012bafe7840bb515e090f8ea95864ee49f7e3b2d1bbe94aa`.
One intermediate capture was correctly rejected because a temporary mobile
validation route changed the source fingerprint. It was discarded; the final
run used a clean, stable checkout.

Evidence on this machine:

- `/tmp/one-portal-ios-final-compare.webp`, `/tmp/one-portal-ios-final-small.png`,
  `/tmp/one-portal-ios-final-wide.png`, `/tmp/one-portal-ios-final-switch.png`
- `/tmp/one-portal-ios-final-{small,wide,replaced,missing,remount,switch}.json`
- `/tmp/one-portal-android-compare.webp`, `/tmp/one-portal-android-geometry.json`,
  `/tmp/one-portal-android-final-runtime.log`
- `/tmp/one-portal-web-final-runtime.log`
- `/tmp/contrast-portal-screen-{full,contained}.png`,
  `/tmp/contrast-portal-screen-{full,contained}.json`,
  `/tmp/contrast-portal-screen-compare.webp`, `/tmp/contrast-portal-screen-runtime.log`
- Contrast `artifacts/conformance-proof/2026-10-02T21-27-31-197Z-library/report/index.md`

The conventions require benchmarks for per-frame or per-row APIs. Portal does
not expose one, and the spec does not request a Portal benchmark. No spec behavior has proved wrong.
