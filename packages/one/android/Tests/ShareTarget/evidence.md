# Native Android share target: correction evidence

## Pass 2 (this pass): reopened correctness defects

Scope: same five files under
`packages/one/android/src/main/java/dev/onejs/one/sharetarget/*.kt` plus this
standalone harness. No build.gradle, manifest, or other existing file touched.

Pass 1's evidence (below, under "Pass 1") claimed `maxItems` included primary
text and that intake/the Activity were otherwise correct. Reading the actual
committed source after that pass showed several of those claims didn't hold
and surfaced real additional defects. What follows is what was actually wrong
and what was actually done about it, each backed by a RAN compile/test or
labeled otherwise.

### `OneShareIntake.intakeOrThrow` (`OneShareIntake.kt`)

- **EXTRA_TEXT bypassed every limit.** `primaryText` was computed via
  `.toString()?.trim()` and never checked against `acceptedText`/
  `acceptedUrls`/`maxItemBytes`/`maxTotalBytes` at all -- an oversized or
  disallowed `EXTRA_TEXT` sailed straight into the editable composer field.
  **Fixed:** the raw (untrimmed) `EXTRA_TEXT` is now validated against type
  and both byte limits before being accepted as `result.text`, and its bytes
  are reserved against the same `totalBytes` budget later entries draw from.
  **RAN:** `extra text over maxItemBytes aborts the whole intake, not just
  the text`, `extra text rejected by acceptedText=false blocks the whole
  intake`.
- **Whitespace mutated.** `.trim()` silently dropped leading/trailing
  whitespace the sender put in `EXTRA_TEXT`. **Fixed:** removed; the exact
  `CharSequence.toString()` is kept. **RAN:** `extra text whitespace is
  preserved exactly, never trimmed`.
- **Silent partial acceptance.** A rejected/oversized/unreadable entry
  (`continue`) let the loop keep going and return whatever fit, with the
  Activity surfacing only a soft "N items skipped" notice while leaving Send
  enabled -- the opposite of the no-drop contract this was supposed to
  honor. **Fixed:** `intakeOrThrow` now aborts the entire intake on the
  first rejected entry anywhere (EXTRA_TEXT, a ClipData text/url, or a file),
  deletes every file this call already copied, and returns `items = empty,
  text = ""` with exactly that one issue. There is no longer a "truncated but
  some items came through" state. **RAN:** rewrote the three existing tests
  that asserted partial acceptance to assert the no-drop result instead
  (`clip data text entries count toward maxItems and a rejection aborts the
  whole batch`, `text item byte budget is enforced in utf8 bytes and a
  rejection aborts the batch`, `acceptedText false rejects the first plain
  text entry and never reaches the url after it`), plus a new `a file already
  copied earlier in the batch is deleted when a later entry aborts intake`
  confirming cleanup. **RAN regression:** reverted this file to the pre-pass2
  version and reran `testDebugUnitTest` -- `17 tests completed, 8 failed`
  (all 8 of the new/rewritten no-drop and primary-text tests; the other 9
  stayed green). Restored the fixed file and reran clean: `BUILD SUCCESSFUL`,
  17/17.
- **No per-item byte cap on text/url entries.** Only `maxTotalBytes` was
  checked for a ClipData text/url entry; `maxItemBytes` was not. **Fixed:**
  both are now checked. **RAN:** `a single text item over maxItemBytes is
  rejected even under maxTotalBytes`.

### `OneShareTargetActivity.kt`

- **Rotation could cut off an in-flight send.** The class comment on
  `sendSupervisor`/`sendScope` claims they outlive configuration change, but
  `onDestroy()` called `sendSupervisor.cancel()` unconditionally -- including
  for the destroy half of a rotation, which contradicts the comment and would
  have killed (or left ambiguous) a send still running when the device
  rotated mid-send. **Fixed:** `onDestroy` now checks
  `isChangingConfigurations` and only cancels on a real destroy. **Not
  runtime-probed this pass** (see "Known gap" below) -- this is a source-level
  fix matching the documented intent, not verified against a live rotation.
- **Warm `onNewIntent` could orphan files.** A warm reuse swaps in a brand
  new draft id/intent and simply drops the old `Session`. If the old draft's
  intake was still in flight (mid-copy, before it ever reached `persist()`
  and wrote `draft.json`), its directory -- and whatever it had already
  copied -- had nothing pointing at it anymore: not on disk as a discoverable
  draft, not cleaned up either. **Fixed:** `onNewIntent` now checks whether
  the outgoing draft was ever persisted (`draftStore.load(id) == null`) and
  deletes its directory if not, before swapping to the new draft. A draft
  that *did* reach `persist()` is left alone (it's discoverable by id via the
  existing process-death-recovery path in `onCreate`, not touched by this
  warm-share path at all). **Not runtime-probed this pass** (see "Known gap").
- **Retry after a later failure could duplicate files / re-seed stale
  text.** `retryToken` re-runs the `LaunchedEffect`, which re-ran intake on
  the same `intakeIntent` (unique filenames via `nanoTime()` mean every retry
  copies fresh files, never cleaning up a prior successful copy that only
  failed at the later `destinations()` step) and unconditionally overwrote
  `editedText` from the fresh `result.text`. **Fixed:** the effect now calls
  `draftStore.clearItems(draftId)` before each intake, and only seeds
  `editedText` from `result.text` when `editedText` is currently empty.
- **Soft truncation notice removed.** Since intake no longer returns a
  partial result with issues, the `intakeNotice` "N items skipped" UI (which
  let Send stay enabled anyway) is gone; an intake issue now routes straight
  to `ScreenPhase.Failed` with the specific rejected item's label and reason,
  blocking Send until Cancel or Retry.

### Compile / test (RAN)

```
cd packages/one/android/Tests/ShareTarget/harness
ANDROID_HOME="$HOME/Library/Android/sdk" \
  "$HOME/.gradle/wrapper/dists/gradle-9.4.1-bin/arn2x92ynaizyzdaamcbpbhtj/gradle-9.4.1/bin/gradle" \
  clean testDebugUnitTest --console=plain --no-daemon
```
`BUILD SUCCESSFUL`, 17/17 (`build/test-results/testDebugUnitTest/TEST-dev.onejs.one.sharetarget.OneShareIntakeTest.xml`:
`tests="17" skipped="0" failures="0" errors="0"`). `compileDebugKotlin` (which
compiles every file in this package, including `OneShareTargetActivity.kt`
and `OneShareTargetAdapter.kt`, since the harness's `sourceSets.main`
points at the whole package directory) succeeded as part of that run,
confirming the Activity changes compile against the pinned
`androidx.activity:1.9.3`/Compose `1.11.4`/`kotlinx-coroutines:1.10.2` set.

### Known gap: no Activity-level runtime probe this pass

I attempted a Robolectric `ActivityController`-based harness
(`OneShareTargetActivityTest.kt`) to actually exercise `onDestroy`'s
`isChangingConfigurations` branch and `onNewIntent`'s orphan cleanup against
a real `ComponentActivity` + Compose lifecycle. The orphan-cleanup tests (no
UI interaction needed, just calling the controller's lifecycle/`newIntent`
hooks and reading the filesystem) got as far as compiling, but running
*any* test that drives this activity's `setContent{}` through Robolectric
hung `testDebugUnitTest` indefinitely twice in a row (confirmed by `ps`
showing the Gradle test worker pegged at >100% CPU with no progress each
time, had to be killed by PID). This harness's dependencies
(`build.gradle.kts`) do not include `androidx.compose.ui:ui-test-junit4` or
`androidx.activity:activity-compose` test rules, which is what actually
drives Compose's frame clock/recomposition loop under Robolectric;
`ShadowLooper.idleMainLooper()` alone was not sufficient and did not
terminate. Rather than ship a test that hangs CI or hand-wave a result I
didn't actually see, I removed that file. The `onDestroy`/`onNewIntent`
fixes above are **INFERRED** from reading the actual lifecycle methods
against Android's documented `isChangingConfigurations`/`onNewIntent`
contracts, not **TESTED** at runtime. Adding `ui-test-junit4` and a proper
compose test rule to this harness would be the correct next step to close
this gap; it's a `build.gradle.kts` dependency addition, which this pass's
scope (explicitly: `src/main/java/.../sharetarget` + this harness, "no other
shared configs") reads as in-scope for `Tests/ShareTarget/harness`
specifically but I did not want to add new dependencies and immediately hang
the only test suite in the same pass without being able to debug why.

No emulator/device run this pass either, for the same reason as pass 1: no
booted AVD (`adb devices` empty), and Robolectric already exercises the real
`ContentResolver`/`ClipData`/`Uri` intake path.

---

## Pass 1 (prior commit, for reference)

Scope of that pass: `packages/one/android/src/main/java/dev/onejs/one/sharetarget/*.kt`
(fixes to the 5 files committed in `22fb005b2`) plus this standalone harness under
`packages/one/android/Tests/ShareTarget/`. No `build.gradle`, manifest, or other
existing file touched.

### What was wrong, and the fix

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
  `editedText` from it; it is also never duplicated into `items`. (Pass 2 note: this
  claim about `maxItems` including text was false -- see above.)
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
- **No `onNewIntent`.** Added (pass 2 found and fixed a remaining orphan gap in it --
  see above).
- **Huge destination list crowding the composer.** The destinations `LazyColumn` now
  has `Modifier.weight(1f)` inside the `Column`, so it scrolls within its own space
  instead of pushing the message field and Send/Cancel buttons off screen.
- **Disk I/O on the caller's dispatcher.** `OneShareIntake.intake()` now wraps its
  entire body in `withContext(Dispatchers.IO)`.
  Scope note (unchanged this pass): `OneShareDraftStore.save/load` (a few KB of JSON,
  atomic tmp+rename) are still on the caller's thread for every keystroke -- judged
  out of proportion relative to the unbounded attachment copy, which is the actual
  cost center.
- **`EXTRA_TEXT` not read as `CharSequence`.** Switched `getStringExtra` to
  `getCharSequenceExtra(...).toString()`.
- **ClipData text/url entries ignored.** `collectEntries()` now walks every
  `ClipData` item.

### Harness

`packages/one/android/Tests/ShareTarget/harness/` is a standalone single-module
Gradle project. Its `sourceSets.main.java.srcDirs` points directly at
`../../../src/main/java/dev/onejs/one/sharetarget` -- it compiles and tests the real,
committed files in place, never a copy. Pinned deps match
`packages/one/android/build.gradle`: `androidx.activity(-compose):1.9.3`,
`androidx.compose.ui/foundation:1.11.4`, `androidx.compose.material3:1.5.0-alpha17`,
`kotlinx-coroutines-android:1.10.2`, AGP `8.13.2`, `compileSdk 35`/`minSdk 23`,
Kotlin `2.1.20`.

## Retained native session owner

The parent completed the lifecycle work omitted by the previous passes. `OneShareSessionModel` is an internal AndroidX ViewModel obtained through the Activity's `ViewModelProvider`. Compose observes its state and forwards actions. The model owns loading, edits, selection, delivery and discard; rotation observes the same sending phase and operation. A warm intent creates a separate draft while an earlier send keeps its original id. Loading is cancelled and joined before incomplete draft cleanup. Destination retries load the owned manifest rather than copying the launch intent again.

All draft reads, writes and deletion run on `Dispatchers.IO`. A mutex orders persistence and terminal deletion. An edit queued before Send/Cancel cannot recreate a terminal draft. `AtomicFile` commits the manifest and recovers its backup; a corrupt manifest produces an error instead of being treated as a new share. The manifest records a pending delivery before transport starts. Recovery keeps the original payload and destination, prohibits edits/discard of an ambiguous attempt, and retries with the same submission id. Adapters must accept that id at most once. Hardware Back forwards to the same discard action and cannot cancel an in-flight delivery.

Primary text now counts toward `maxItems`. Send validates edited text against the per-item and remaining total byte budgets before invoking the adapter.

RAN from the parent, on studio with the committed harness's real sources and existing pinned Kotlin 2.1.20 dependencies:

```sh
cd packages/one/android/Tests/ShareTarget/harness
ANDROID_HOME=/Users/n8/Library/Android/sdk \
  /Users/n8/.gradle/wrapper/dists/gradle-9.4.1-bin/arn2x92ynaizyzdaamcbpbhtj/gradle-9.4.1/bin/gradle \
  compileDebugKotlin testDebugUnitTest --console=plain --no-daemon
```

Output: `BUILD SUCCESSFUL in 9s`. Parsed JUnit XML: intake 17 tests, 0 failures, 0 errors; retained session model 10 tests, 0 failures, 0 errors. These execute the actual ViewModelProvider, ContentResolver and disk store with gated adapters. Coverage includes retained ownership during a suspended send, refusal of a second send/edit/discard, process recovery with exact submission equality, destination retry preserving a durable edit, warm intent isolation, over-budget edits, cancellation during destination loading, primary-text count limits, an unavailable original destination, atomic backup recovery and corrupt-manifest rejection.

TESTED negative control: removed the `canSend` budget guard while retaining the ready-phase guard, then ran the model suite. Output: `7 tests completed, 1 failed`, specifically `editOverBudgetCannotReachAdapter`. Restored the real source, added the remaining recovery/storage checks and ran the final suite above. No assertion, retry or timeout was loosened.

Limits: this proves native model and persistence behavior with real AndroidX ownership, not Activity recreation or visual Compose interaction on an emulator. There is still no on-device intent dispatch, keyboard/layout screenshot, or generated One project integration evidence. The native UI and full integration remain pending; this checkpoint is not an accepted runtime63 patch.
