# One Android media repair design (contract preserving)

Status: proposal for p60786 preimplementation disposition. No native edits yet.
Owner: r59607 on tm/beta-media-repair from candidate 25e516090.
Scope: public One Android media only. No Contrast source, no Tamagui core,
no new public API, no new error codes, no device run until admitted.

Base: origin/tm/beta-android-media 25e516090 (impl 4f5eb7538 plus receipts).
First layer: /Users/n8/.team-machine/handoffs/one-beta-recovery/media-first-layer-verdict.md
(validator p61184). This design repairs every finding except S-AUDIO-1,
which the source evidence contradicts (see audio section for the blocking choice).

## Ground truths read from source

Calendar contract: OneCalendar.update(identifier, originalStartMs, changes)
returns the edited occurrence. Docs say update returns the identifier and
start time to use for later edits, and that occurrences of a recurring event
share an identifier (apps/onestack.dev/data/native/calendar.mdx).
Swift resolves (identifier, startMs) through EventKit and saves with span
thisEvent, which keeps series identity and links a detached exception
(packages/one/ios/Nitro/HybridOneCalendar.swift eventOccurrence and update).

Android today splits a recurring series around one occurrence
(HybridOneCalendar.kt splitOutInstance): first run rewrites the original row
in place, later runs insert as new rows, the edit goes in a detached row.
After a split, (originalId, laterStartMs) misses (NOT_FOUND) and the series
RRULE shape changes to shortened COUNT values. The fixture only exercises
the first run kept id, so later run addressing is untested.

Audio contract: docs say starting playback replaces the previous player
(apps/onestack.dev/data/native/audio.mdx). Swift play guards only the
recorder, then clears unconditionally (HybridOneAudio.swift play). Web play
guards only recording, then clears (packages/one/src/platform/audio/index.ts).
Android play matches both (HybridOneAudio.kt play). All three replace.

Photo contract: Swift presentLimitedLibraryPicker requires limited status.
Android proceeds on any read grant, which is coherent with the current echo
where partial grants report authorized at every layer. MediaStore queries
scope to visible rows automatically.

## Calendar: stable ids, atomic batch, provider expansion

Goal: after a single occurrence edit, the original identifier still addresses
every surviving sibling, siblings stay complete, the write is atomic, and the
provider owns recurrence expansion. No changed public id semantics.

Mechanism: split origin tracking in the provider row itself.

1. When splitOutInstance creates runs, stamp every run row (the rewritten
   original plus each new insert) with CUSTOM_APP_PACKAGE set to the app
   package and CUSTOM_APP_URI set to `originalId|originalRrule`, where
   originalId is the series identifier before the first split and originalRrule
   is the exact RRULE string before the first split. New splits of already
   split runs inherit the same ultimate origin, read from the row being split.
   The detached exception row carries no stamp. Series never split carry none.

2. findOccurrence(identifier, startMs) keeps its direct query first. On a miss,
   it queries Events rows whose CUSTOM_APP_PACKAGE matches and whose
   CUSTOM_APP_URI starts with `identifier|`, then queries Instances for each
   such row id at startMs. A hit returns the occurrence with the event
   identifier remapped to the requested original identifier and the recurrence
   remapped to the parsed original RRULE from the stamp. Errors stay
   E_CALENDAR_NOT_FOUND, E_CALENDAR_INPUT, E_CALENDAR_SAVE, E_CALENDAR_DELETE.

3. list and queryInstances join the two CUSTOM_APP columns in eventRows. Rows
   with a stamp return the original identifier and the parsed original
   recurrence instead of the run row id and shortened rule. Unstamped rows
   return as today. Sort order and paging stay unchanged.

4. The split write becomes one batch: the original row update plus every run
   insert plus the detached insert (update path) go in a single
   ContentProviderOperation list applied with applyBatch against the calendar
   authority. Batch failure rejects with the existing E_CALENDAR_SAVE or
   E_CALENDAR_DELETE and writes nothing, so no partial series survives.
   The single row delete when no siblings remain stays a single call.

5. Run computation uses provider expansion instead of local calendar math.
   splitOutInstance queries the Instances table for the series row id over the
   range that covers every instance (COUNT and UNTIL bounds from the parsed
   rule, or from DTSTART through one instance past the target for endless
   series with an interval scaled window). The returned begins in order are
   the run source. The target index is located within one second tolerance as
   today. Keep runs are maximal consecutive index sequences excluding the
   target. The existing MAX_EXPANSION guard stays. Local expandStarts is
   removed once the provider query lands, so monthly day skip, yearly leap,
   UNTIL bound, and DST behavior come from the provider.

Narrow controls, existing shapes only: keep the daily interval 2 count 3
listed proof, the daily count 3 sibling retention after update and after
delete, and the daily endDateMs bounded proof exactly as they run today.
Add one assertion to the same daily count 3 leg: after the middle update,
(originalId, laterStartMs) resolves the later sibling through the public
update path. No monthly 31st, yearly, UNTIL split, or DST matrix is added now.
Those shapes stay unproven and held until device acceptance is admitted.

Legacy limit: rows split before this repair carry no stamp. They keep their
current re identified behavior until the user deletes them. New splits carry
stamps from the first repair onward.

## Photo: user selected request and status, visible subset albums, fixture gate

1. readPermissions on API 34 and later requests READ_MEDIA_IMAGES,
   READ_MEDIA_VIDEO, and READ_MEDIA_VISUAL_USER_SELECTED together. API 33
   keeps IMAGES and VIDEO. Below 33 keeps READ_EXTERNAL_STORAGE. Manifest
   stamping in prebuildWithoutExpo and the expo plugin adds
   READ_MEDIA_VISUAL_USER_SELECTED whenever photoLibrary.readWrite is set,
   with the prebuild test extended to assert the stamp. No new permission
   helper and no new status value.

2. readStatus keeps its order: full IMAGES plus VIDEO reads authorized, else
   USER_SELECTED alone reads limited, else single medium reads limited. With
   the request in place, a partial grant resolves to limited and a full grant
   resolves to authorized. Code comments name this mapping. Docs drop the echo
   paragraph and state that partial grants report limited and expose only the
   selected set. presentLimitedLibraryPicker keeps its proceed on any read
   grant gating, which stays a superset of the Swift limited requirement and
   avoids rejecting partial users.

3. listAlbums, getAlbum, and listAlbumAssets move from requireFullAccess to
   requireRead, so partial grants read the visible subset exactly like
   listAssets and getAsset already do. Album queries need no other change
   because MediaStore scopes them to visible rows. createAlbum keeps its
   existing reject and the other collection edit no ops stay untouched.

4. The photo fixture restores the iOS limited only assertion. The relaxed
   accept of authorized or limited after the read request applies only when
   Platform.OS is android. iOS requires limited. No other fixture leg changes.

## Audio: keep replace, settle seeks, name floors honestly

S-AUDIO-1 blocking choice: the verdict states Swift play clears only an
ended or failed player then guards busy. The source shows the opposite. Swift
play guards only the recorder and clears unconditionally
(HybridOneAudio.swift play). Web play does the same
(packages/one/src/platform/audio/index.ts play). Docs state that starting
playback replaces the previous player. Android matches all three today.
Changing Android play to reject E_AUDIO_BUSY on an active player would break
documented replace semantics and cross platform parity, and matching parity
would then require changing Swift, web, and docs as a public behavior change
outside this bounded Android repair. Proposed disposition: keep replace on
all three platforms, dispose S-AUDIO-1 as invalid for play, and leave
startRecording busy handling untouched because Android already mirrors Swift
there (clear ended or failed, then guard busy). Manager decision required
before any play edit.

S-AUDIO-2 repair: track the pending seek promise with its generation. A new
seek rejects the previous pending seek with the existing E_AUDIO_STATE
message used everywhere for seek not ready. The completion listener settles
only its own generation on the same player instance, else it rejects with
E_AUDIO_STATE. clearPlayer and stop reject any pending seek with E_AUDIO_STATE
instead of orphaning it. No new code and no listener leak.

S-AUDIO-3 repair: keep the below API 24 pause and resume behavior as no op
resolve with the actual recording status, which already reports recording
rather than a false paused state. Name the floor honestly with explicit api
24 comments in pauseRecording, resumeRecording, and the focus loss recorder
pause branch. Docs gain one sentence that pause and resume need API 24 and
that earlier releases keep recording with status recording. The existing
E_AUDIO_FAILED for resume when not paused on API 24 and later stays because
it mirrors Swift resume when record returns false. No behavior change and no
new code.

Audio device proof stays blocked. The Pro64 unchanged audio run failed before
any audio criterion passed, reproducing the host failure signature without
proving a media cause. No boot, build, wipe, HAL, renderer, or new runtime
campaign is proposed here.

## Contacts

No change. The first layer passes Contacts pending final: batched atomic CRUD,
picker null on cancel, never limited status, whole search limit, label
defaults, and the existing code ladder all read sound.

## Bounded file list

- packages/one/android/src/main/java/com/margelo/nitro/one/HybridOneCalendar.kt
- packages/one/android/src/main/java/com/margelo/nitro/one/HybridOnePhotoLibrary.kt
- packages/one/android/src/main/java/com/margelo/nitro/one/HybridOneAudio.kt
- packages/one/src/platform/specs unchanged (android kotlin already annotated)
- packages/vxrn/src/exports/prebuildWithoutExpo.ts and expo-plugin.cjs
  (USER_SELECTED stamp only)
- packages/vxrn/src/exports/prebuildWithoutExpo.test.ts (stamp assertion only)
- tests/native-features/fixtures/one-native-photo-library.tsx (gate only)
- tests/native-features/fixtures/one-native-calendar.tsx (one stable id
  assertion on the existing daily leg, added with the implementation)
- apps/onestack.dev/data/native/calendar.mdx, photo-library.mdx, audio.mdx
  (correction paragraphs only, no new API text)
- this plan file

No nitrogen regen (specs untouched), no bridge file moves, no generated
binding edits, no Contrast reads.

## Validation

Static now, without device: prebuildWithoutExpo test file passes,
packages/one typecheck passes, generate check shows only the inherited
portal drift already recorded for this branch family, and the Kotlin files
compile only if a later authorized build admits one. No timeout increase,
retry, skip, or weaker assertion.

Device later, when a supported acceptance is admitted: rerun the existing
calendar daily legs plus the one new stable id assertion, the existing photo
limited and album legs under a partial grant, and the existing audio fixture
only after the platform cause is owned. No new matrix and no invented stress
campaign.
