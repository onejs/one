# Partial media repair source receipt

Owner r59617, branch tm/beta-media-repair, base db31539b3. p61056 relayed
p60786's partial bounded source clearance on 2026-10-05: Photo API-34 selected
permission/request stamping and iOS fixture gate, Audio seek ownership and
explicit API-24 recording floors. Calendar remains held. Full album access,
playback replacement, specs, generated bindings and unavailable methods remain
unchanged. p61056 owns integration, CI and canary; p60786 is the sole media unit.

## Executed controls

TESTED: before source repair, the strengthened existing prebuild permission
case and the new Expo manifest case both failed on the missing USER_SELECTED
permission. The Expo failure was `expected [] to have a length of 1 but got 0`;
the prebuild output omitted `android.permission.READ_MEDIA_VISUAL_USER_SELECTED`.
After repair the same two cases pass. The Expo case independently covers
read-write versus add-only configuration and an idempotent second mod pass.

```sh
cd packages/vxrn
bun run test src/exports/prebuildWithoutExpo.test.ts src/exports/expoPlugin.test.mjs \
  -t 'stamps Android media permissions|requests selected-photo'
```

TESTED: the actual requestLimited function is parsed from the existing fixture,
transpiled and executed with mocked permissions and state setters. Before
repair, iOS authorized incorrectly reached `limited-ready` instead of
`limited-error: unknown limited permission: authorized`. After repair all six
cases pass: iOS limited succeeds, iOS authorized fails, Android limited and
authorized succeed, and both platforms reject denied. Rejected cases perform
zero listAssets calls and produce no success result. These are JavaScript
fixture controls, not OS permission runs or a new native matrix.

```sh
cd packages/one
bun run test --project platform tests/photoLibraryFixture.test.ts
bun run test --project platform tests/nativeDocs.test.ts tests/unavailableServices.test.ts
```

RAN: docs and unavailable-service suites passed 125 tests. Existing installed
dependencies were linked from the primary One checkout; no dependency install,
native build, device boot, reset, probe campaign or codegen ran.

RAN: One `bun run typecheck` failed with TS2339 (`render` does not exist) at
Drawer.web.tsx:45, Tabs.web.tsx:50, WebStackNavigator.tsx:50,
Tabs.shared.tsx:121 and Navigator.tsx:293. `git diff --exit-code HEAD --` those
five files passes; all are unchanged. One tsconfig excludes tests, Android,
iOS and generated bindings. INFERRED: these diagnostics belong to the inherited
navigation source/dependency graph, not the cleared Kotlin/fixture edits.
No passing typecheck is claimed. Log retained outside the tree:
`/Users/n8/.team-machine/handoffs/one-beta-recovery/media-repair-r59617/one-typecheck.log`.

## Audio source control paths

RAN: inspected every seekTo caller, stop/dispose, playback failure, and both
recording-floor branches in the changed Kotlin source. The following outcomes
are INFERRED from those method bodies; no Kotlin compile or Audio runtime test
is claimed. A pending promise left reachable after cancellation, a direct
unowned seekTo, or settlement before clearing its ownership would refute them.

| source control | disposition in the implementation |
| --- | --- |
| seek A, then B before A completes | A promise is taken and rejected with existing E_AUDIO_STATE; its physical listener remains owned until callback, B is queued |
| seek A, B, then C before A completes | B is taken/rejected; only C remains queued; A cannot settle C |
| A completion with C queued | retire A listener, start C physical seek; no stale public success/status from A |
| final current seek completion | take its promise, read current playback status, then resolve once; a status-read failure rejects E_AUDIO_STATE |
| synchronous seek failure | clear active/queued ownership and listeners, reject all unsettled promises |
| stop, dispose, playback replacement or current-player failure | cancelSeeks clears both owner slots before rejecting; later stale callback cannot settle a successor |
| ended replay or remote seek during a public seek | use the same private queue, so a separate physical call cannot steal the public seek callback |
| API 23 with active recorder | pause rejects E_AUDIO_STATE, resume E_AUDIO_FAILED, each naming Android API 24; no recorder flags/timing mutate |
| no recorder, any API | existing E_AUDIO_STATE and original not-ready message precede the floor check |
| API 24+ with recorder | existing pause/resume state branches and error codes retained |

At most one physical operation and one latest queued operation are retained.
Settled promises are removed from their owner objects. Existing seek error
message stays `Audio.seek: the audio operation is not ready`. Playback listeners
check current-player identity before changing status or cancelling its seeks.

## Remaining acceptance

Calendar native source and fixture have no diff. Original-ID/selected occurrence,
atomicity and provider-phase design disposition are still owned by p60786.
Photo's repaired opt-in status/picker lifecycle is not device-proven. Android
album reads still require full access. Audio is uncompiled and runtime-unverified;
the existing two-host platform cause remains blocked. Existing compile/runtime
gates remain open, and this receipt grants no release acceptance. No extra
reviewer or review chain was introduced.
