# Android incoming share intake correction

RAN by tm-share-target-api on studio-64, 2026-10-01. The isolated native
harness compiled the current One share-target sources and tests copied into
`/tmp/tm-share-intake-p56157`. No emulator, app UI or production credentials
were used. Source changes are limited to incoming intake.

The baseline probe produced `19 tests completed, 2 failed` and
`BUILD FAILED in 14s` (`baseline.txt`). A real synthetic file in the receiver
context's private files directory was passed as `EXTRA_STREAM` using a
`file://` URI. The existing generic-file configuration copied it into the
outgoing draft. The empty-items assertion failed. Incoming files now require
`content://` before resolver access; the existing resolver enforces provider
permissions. App-owned copies returned to the adapter still use `file://`.

The other failing probe supplied padded primary text and duplicate ClipData
text, plus a second padded ClipData item. Trimming changed both the submitted
text and duplicate comparison. Intake now preserves the exact nonempty
CharSequence. The test compares the complete resulting item list.

RAN after the minimal source correction: `BUILD SUCCESSFUL in 14s`
(`fixed.txt`), with 19 intake and 10 retained-model tests, zero failures/errors
in the attached JUnit XML. The two new assertions were unchanged. The first
check would fail if an incoming file URI were copied again; the second would
fail if ClipData text were trimmed or an exact duplicate became an extra item.
Existing content-provider copying, byte/item limits and lifecycle tests passed.

Command, with the existing pinned Gradle and Kotlin 2.1.20 harness:

```sh
ANDROID_HOME=/Users/n8/Library/Android/sdk nice -n 10 \
  /Users/n8/.gradle/wrapper/dists/gradle-9.4.1-bin/arn2x92ynaizyzdaamcbpbhtj/gradle-9.4.1/bin/gradle \
  testDebugUnitTest --console=plain --no-daemon --max-workers=1 \
  -Dorg.gradle.jvmargs=-Xmx1024m
```

The baseline selected `--tests dev.onejs.one.sharetarget.OneShareIntakeTest`.
This probe verifies file-scheme rejection and exact text handling through the
Android resolver/model harness. Cross-app URI grant delivery on a real device,
process-death UI recovery and actual TM delivery remain separate acceptance.
