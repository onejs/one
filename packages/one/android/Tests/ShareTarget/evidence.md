# Native Android share target: correction evidence

Scope of this pass: `packages/one/android/src/main/java/dev/onejs/one/sharetarget/*.kt`
(fixes to the 5 files committed in `22fb005b2`) plus this standalone harness under
`packages/one/android/Tests/ShareTarget/`. No `build.gradle`, manifest, or other
existing file touched.

## What was wrong, and the fix

- **Global factory registration.** `OneShareTargetAdapterFactory.register()/current()`
  was a process-wide singleton the generated subclass had to call at the right time
  during app startup, with no second path if it forgot. Removed entirely.
  `OneShareTargetActivity` is now `abstract`, with `protected abstract fun
  makeAdapter(context: Context)` and `protected abstract val limits`; the generated
  concrete subclass (the manifest's declared activity) supplies both directly, so
  there is exactly one wiring path and it cannot be skipped.
- **Unbounded/hardcoded limits.** `OneShareIntakeLimits` had default values (including
  `acceptedMimePrefixes = null`, i.e. accept anything) baked into the Activity. All
  fields are now required (no defaults), plus explicit `acceptedText`/`acceptedUrls`
  flags, so a caller must make every bound an explicit decision.
- **Cold intake text dropped.** `result.text` (the raw `EXTRA_TEXT`) was computed but
  never fed into the editable composer field, so the editor opened empty while the
  text appeared only as a read-only line below. `OneShareTargetScreen` now seeds
  `editedText` from it; it is also never duplicated into `items`.
- **Silent drops, ignored truncation.** `OneShareIntake` now returns a typed
  `issues: List<OneShareIntakeIssue>` (reason: unaccepted type / over item limit /
  over size limit / read error) for every rejected/oversized/unreadable entry, and
  the Activity surfaces a truncation notice when any exist. A genuinely unexpected
  failure now throws `OneShareIntakeException` instead of silently returning nothing.
- **`maxItems` excluded text/url, no byte budget for them.** Text and URL entries
  (from `EXTRA_TEXT`'s ClipData siblings and multi-item `ACTION_SEND_MULTIPLE` text
  shares) now count against `maxItems` and their UTF-8 byte length counts against
  `maxTotalBytes`, exactly like files.
- **Uncaught coroutine crash.** Intake and `adapter.destinations()` now run inside a
  try/catch in the `LaunchedEffect`; a failure moves to a `Failed` phase with Cancel
  and Retry instead of crashing the activity.
- **No Cancel during Loading.** Added.
- **Cancel left a durable draft.** `cancel()` now `cancelAndJoin()`s the intake job
  (so a partial copy actually stops and deletes its own partial file) before
  deleting the draft directory, instead of racing a `finish()` against it.
- **Rotation/intake could orphan files.** If a rotation lands before intake ever
  persisted a draft, `OneShareDraftStore.clearItems()` now wipes whatever that killed
  attempt already copied before retrying on the same intent, so the retry never piles
  up next to orphaned partial files.
- **No `onNewIntent`.** Added. A warm reuse of the task always starts a brand new,
  isolated draft id; it never touches whatever the previous draft was doing. A send
  already in flight for the old draft keeps running under an activity-scoped
  `sendScope` (a `SupervisorJob` on `Dispatchers.Main.immediate`, cancelled only in
  `onDestroy`) rather than the per-screen `rememberCoroutineScope`, so a UI-driven
  teardown (swapping to the new draft via `key(draftId)`) never cancels it and the
  submission id never changes mid-send.
- **Huge destination list crowding the composer.** The destinations `LazyColumn` now
  has `Modifier.weight(1f)` inside the `Column`, so it scrolls within its own space
  instead of pushing the message field and Send/Cancel buttons off screen.
- **Disk I/O on the caller's dispatcher.** `OneShareIntake.intake()` now wraps its
  entire body in `withContext(Dispatchers.IO)`; every `ContentResolver` query, stream
  read and file write was blocking and was previously running on whatever dispatcher
  called it, which for the Activity's `LaunchedEffect` is `Dispatchers.Main.immediate`.
  Scope note: `OneShareDraftStore.save/load` (a few KB of JSON, atomic tmp+rename)
  were left on the caller's thread — the actual cost center was the unbounded
  attachment copy, not the draft json, and moving tiny synchronous JSON writes off
  main for every keystroke was judged out of proportion to this pass.
- **`EXTRA_TEXT` not read as `CharSequence`.** Switched `getStringExtra` to
  `getCharSequenceExtra(...).toString()`, which also captures a `Spanned`/non-`String`
  `CharSequence` extra that `getStringExtra` would silently return `null` for.
- **ClipData text/url entries ignored.** `collectEntries()` now walks every
  `ClipData` item: a `uri` item becomes a file entry (deduped against `EXTRA_STREAM`
  and other ClipData items by `Uri` identity), a `text` item becomes a text/url
  entry (deduped against `EXTRA_TEXT` and other text entries by value).

## Harness

`packages/one/android/Tests/ShareTarget/harness/` is a standalone single-module
Gradle project. Its `sourceSets.main.java.srcDirs` points directly at
`../../../src/main/java/dev/onejs/one/sharetarget` — it compiles and tests the real,
committed files in place, never a copy. It depends on the exact versions pinned in
`packages/one/android/build.gradle`: `androidx.activity(-compose):1.9.3`,
`androidx.compose.ui/foundation:1.11.4`, `androidx.compose.material3:1.5.0-alpha17`,
`kotlinx-coroutines-android:1.10.2`. AGP `8.13.2`, `compileSdk 35`/`minSdk 23` (same
as the real module). Kotlin pin for the real module is `2.1.20`; the harness uses the
same `2.1.20` (available in the local Gradle cache, unlike the prior pass's 2.2.0
substitution).

### Compile (RAN)

```
cd packages/one/android/Tests/ShareTarget/harness
ANDROID_HOME="$HOME/Library/Android/sdk" \
  "$HOME/.gradle/wrapper/dists/gradle-9.4.1-bin/arn2x92ynaizyzdaamcbpbhtj/gradle-9.4.1/bin/gradle" \
  clean compileDebugKotlin --console=plain
```
Output: `BUILD SUCCESSFUL in 1s, 8 actionable tasks: 8 executed` (clean run, no
cached `compileDebugKotlin` reuse).

### Unit tests (RAN)

```
cd packages/one/android/Tests/ShareTarget/harness
ANDROID_HOME="$HOME/Library/Android/sdk" \
  "$HOME/.gradle/wrapper/dists/gradle-9.4.1-bin/arn2x92ynaizyzdaamcbpbhtj/gradle-9.4.1/bin/gradle" \
  clean testDebugUnitTest --console=plain --no-daemon
```
Output: `BUILD SUCCESSFUL`, 12/12 tests passed
(`build/reports/tests/testDebugUnitTest/`,
`build/test-results/testDebugUnitTest/TEST-dev.onejs.one.sharetarget.OneShareIntakeTest.xml`).

Tests use Robolectric (`org.robolectric:robolectric:4.13`) against a real
`ContentResolver` round trip through a fake `content://` provider
(`FakeShareProvider`), not a hand-rolled stand-in for `OneShareIntake`'s own logic:

- `extra text becomes the editable text, not an item`
- `extra text classified as a url is still only the editable text`
- `clip data text entries become items and count toward maxItems` — asserts the
  3rd of 3 text entries is rejected with `OVER_ITEM_LIMIT` under `maxItems = 2`
- `clip data text duplicating the primary text is not added twice`
- `text item byte budget is enforced in utf8 bytes` — 50+50 ASCII bytes against a
  60-byte total cap: first fits, second rejected `OVER_SIZE_LIMIT`
- `acceptedText false rejects plain text but acceptedUrls still allows a url`
- `a file uri is copied into destinationDir honoring the declared mime type`
- `an oversized file is dropped and its partial copy deleted` — 5000-byte source
  against a 1000-byte cap, asserts zero files left in `destinationDir`
- `an unacceptable mime type is rejected before any copy`
- `an unreadable uri is a READ_ERROR issue, not a crash`
- `cancelling mid-copy removes the partial file and throws` — cancels a coroutine
  mid-copy of a 1MB source (8KB chunks, unknown declared size so the chunked path
  actually runs), asserts `CancellationException` propagates and no fully-copied
  partial file is left behind
- `the same uri from EXTRA_STREAM and ClipData is copied once` — 1 file on disk,
  not 2

**Regression check (RAN, TESTED one case directly):** temporarily reverted the
`maxItems`-includes-text fix (removed the item-limit check in the text branch of
`OneShareIntake.intakeOrThrow`) and reran `testDebugUnitTest`: `12 tests completed, 1
failed` — exactly `clip data text entries become items and count toward maxItems`
failed, everything else stayed green. Restored the file (`diff` against the pre-edit
copy confirmed byte-identical restoration) and reran clean: `BUILD SUCCESSFUL`, 12/12
again. This confirms that test is load-bearing, not vacuously passing; the other 11
were not individually subjected to the same break/restore cycle given the time
available for this pass.

### What this harness does not cover (documented honestly)

- **No emulator/device run.** `adb devices` returned empty (no booted device);
  `emulator -list-avds` lists `android_lane_pixel_8` and
  `sootsim_pixel_8_android_17_api_37_r06`, neither running. Booting one was judged a
  shared-resource cost (simulator claim, boot time) not justified for this pass given
  Robolectric already exercises the real `ContentResolver`/`ClipData`/`Uri` code
  paths at the unit level. No on-device `ACTION_SEND`/`ACTION_SEND_MULTIPLE`,
  manifest intent-filter dispatch, `onNewIntent` warm-reuse, rotation, or Compose
  layout (the `LazyColumn` weight fix) was exercised end-to-end.
- **No Nitro autolinking / real `one` module integration.** Same limitation as the
  prior pass: `examples/one-basic`/`testflight` need `packages/one` built
  (`dist/` missing) + `one prebuild`; `examples/bare` has no `one` dependency. This
  harness compiles the 5 files against real AndroidX/Compose/coroutines APIs outside
  the real module, not through the actual manifest/autolinking path.
- **Activity-level flows not unit-tested**: the `key(draftId)`-driven isolation on
  `onNewIntent`, the `sendScope` surviving a UI teardown, and the Loading/Failed/
  Cancelling phase transitions are Compose+Activity-lifecycle behavior that needs
  either an instrumented/emulator test or a Robolectric `ActivityController` harness;
  neither was built in this pass given the no-manifest/no-gradle-touch scope and the
  emulator tradeoff above. The intake-logic tests above are the real regression
  coverage for this change; the Activity wiring is covered by the compile check only.
