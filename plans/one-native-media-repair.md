# One Android media repair design

Status: partial Photo/Audio source implementation under p60786 bounded clearance
relayed by p61056 on 2026-10-05. Calendar design remains held. Existing compile
and native runtime acceptance gates remain open; this is not full acceptance.

Owner: r59617, manager-authorized successor on tm/beta-media-repair. Inherited
clean pushed proposal 429fd9218, based on candidate 25e516090 (implementation
4f5eb7538 plus receipts). p61056 owns serialized beta integration, CI and canary.
p61184 is the existing public first layer; p60786 is the sole substantive unit.

Scope: public One media source and explicitly assigned evidence. Existing
signatures, codes and appearance. No private source, peer transcripts, extra
review chain, native build or device campaign. Audio platform cause stays blocked.

Clearance from p61056 naming db31539b3, attributed to p60786 disposition at
09:57 UTC: "Photo USER_SELECTED API34+ request/stamp and platform-scoped iOS
limited-only fixture correction approved; preserve FULL album access";
"Audio replacement unchanged"; seek promises must settle on supersession and
stop/dispose with existing E_AUDIO_STATE; below-24 pause/resume must explicitly
reject using existing codes and an API-24 message. Calendar remains held.
This supersedes the proposed album relaxation and comments-only floor correction.

First layer:
`/Users/n8/.team-machine/handoffs/one-beta-recovery/media-first-layer-verdict.md`.
Read AGENTS and launch/realapps plans. docs/owner-decisions.md is absent in this
branch and the primary checkout. No new owner product direction was supplied.

## Source-grounded correction disposition

RAN: independently read candidate and current HybridOneAudio.swift:94-105.
`play` guards only the recorder, then calls clearPlayer unconditionally.
The ended/failed cleanup followed by player-and-recorder busy checking belongs
to startRecording:189-198. audio.mdx:7-8 explicitly specifies replacement;
web audio/index.ts:199-222 replaces too. An active-player guard in either
read Swift play body would refute this finding. S-AUDIO-1's claimed Swift
premise is false. Cleared disposition preserves replacement and recorder-busy
parity; play semantics are unchanged.

RAN: read HybridOnePhotoLibrary.swift:659-668. requireAlbumAccess checks
`.authorized`, not `.limited`; listAlbums and readableAlbum use that helper.
The first-layer statement that Swift returns limited-library albums conflicts
with the existing source. Disposition retains full-access
album reads on Android and iOS. No iOS source change. The fixture now preserves
the iOS limited-only assertion.

RAN: read HybridOneCalendar.swift:125-187, 420-429 and 448-458. Swift resolves
(identifier, startMs), saves `.thisEvent`, and returns info(event) with the
identifier supplied by EventKit after save. Source alone does not prove that
an edited detached EventKit occurrence retains the original identifier.
calendar.mdx requires sibling occurrence addressing by the original identifier
and the returned selected occurrence's identifier/start for later edits.
Android must preserve those contracts, without documenting new ID semantics.

## Calendar: original identity, selected occurrence, atomic writes

Current source failure: splitOutInstance rewrites the original row for the
first surviving run, inserts later runs with new row IDs, then update calls
insertDetached separately. findOccurrence filters only EVENT_ID equal to the
public identifier. update/remove then write identifier.toLong(). A later
sibling cannot be addressed by its original identifier after a split.

Proposed design, HELD pending p60786 clearance; no Calendar native edits:

1. Keep public origin identity separate from internal provider row identity.
   Occurrence retains the actual event row ID. update/remove write that ID
   after lookup, never the parsed public alias. List projects original IDs
   and original recurrence for surviving runs, including singleton runs.
   Internal split decisions use the physical rule and exception state.

2. Store origin ID and exact original RRULE in app-owned provider metadata
   on every surviving run. The selected detached row records origin and
   exception state too. Resolve exact parsed origin plus start time; match
   only the owned package, version and URI scheme. New splits inherit the
   ultimate origin. A lookup must work even after the original physical row
   is deleted. Never overwrite another app's existing custom metadata.
   CUSTOM_APP_PACKAGE/CUSTOM_APP_URI are app-writable, but identify a custom
   app experience, so this storage choice specifically needs review clearance.
   Do not use sync-adapter-only SYNC_DATA columns or an external non-atomic map.

3. Preserve selected-occurrence behavior: update returns the independently
   re-read selected event, with its current start time, and later update/delete
   must target it alone. Proposed projection uses the same public origin ID
   for it and its siblings. The exception marker prevents splitting an edited
   standalone row again. No linked ORIGINAL_ID exception is reintroduced,
   since candidate receipts report that it suppressed sibling expansion.
   Original-ID projection for the selected row is explicitly for p60786's
   contract disposition, not an assertion about EventKit's detached ID.

4. Assemble one ContentProviderOperation batch containing the original row
   update or delete, all sibling run inserts and the selected detached insert.
   Include the no-siblings update case: its current delete-then-insert path
   must also be atomic. Require expected count 1 for original update/delete,
   disallow yields and exception-allowed operations, and settle using the
   existing verb's E_CALENDAR_SAVE or E_CALENDAR_DELETE. Use batch result URIs
   internally, then re-read through public resolution. AOSP CalendarProvider's
   SQLiteContentProvider wraps no-yield operations in one transaction and
   marks success only after all apply. Installed-provider rollback is not
   runtime-proven here.

5. Remove local expandStarts. Read actual Instances starts for the physical
   series, with the provider-computed LAST_DATE bounding finite expansion.
   Validate COUNT completeness rather than deriving its last date with local
   recurrence arithmetic. For an endless series read through the target and
   an actual following provider instance, leaving the trailing run unbounded.
   Windows bound queries only; they never invent occurrence starts. Keep
   MAX_EXPANSION and reject before writing if finite completeness or a needed
   successor cannot be established within the bounds.

6. Provider starts alone do not prove that restarting a run preserves its
   recurrence phase. Validate the raw rule against the existing supported
   FREQ/INTERVAL/COUNT/UNTIL grammar before re-emission; never silently drop
   BYDAY/BYMONTH/RDATE/EXDATE on external events. Keep the exact original rule
   for public projection. Monthly/yearly/DST and UNTIL split equivalence remain
   unproven; do not expand acceptance or document a new supported subset.

Rows already split by the candidate have no trustworthy origin stamp. Do not
invent a migration from title/time matching or claim old IDs can be recovered.

Existing bounded controls, only after supported acceptance is admitted: retain
all current daily interval-2/count-3, middle-update/delete and endDateMs legs.
Strengthen that same middle leg to address the later sibling by original ID,
check sibling ID/recurrence retention, and edit/delete the returned selected
occurrence without changing siblings. No new recurrence matrix or device run.

## Photo: explicit selection permission and strict iOS fixture

On API 34+ readPermissions requests IMAGES, VIDEO and VISUAL_USER_SELECTED
together; API 33 keeps IMAGES/VIDEO, older releases READ_EXTERNAL_STORAGE.
Both prebuild paths now stamp USER_SELECTED under photoLibrary.readWrite,
with prebuild and Expo permission controls. No new helper, config or permission status.

Keep full-images-and-video precedence over USER_SELECTED in readStatus, with
partial and single-medium access mapped to limited. The official Android
request avoids compatibility mode. INFERRED: this should correct the retained
partial-grant echo, but the current receipt cannot establish repaired status.
Comments/docs must describe the intended opt-in contract without claiming
new runtime proof. Keep existing picker delta/cancel meaning and its current
read-access gate pending supported acceptance of the repaired permission flow.
Do not redesign the settings/re-request lifecycle in this correction.

Disposition preserves requireFullAccess for listAlbums, getAlbum and
listAlbumAssets. No album source edits. createAlbum and unavailable collection
edits retain exact current behavior. No iOS album implementation mutation.

Restored strict iOS fixture: requestLimited accepts only limited on iOS.
The existing authorized-or-limited relaxation stays Android-only until the
repaired Android status is independently proved. No weaker iOS assertion.

## Audio: exact busy/error contracts and seek ownership

The cleared source preserves recorder-busy and startRecording busy behavior. Do not introduce active-player E_AUDIO_BUSY
against the existing replacement contract.

S-AUDIO-2: implemented explicit pending seek ownership to settle superseded public
promises immediately with existing E_AUDIO_STATE and
`Audio.seek: the audio operation is not ready`. MediaPlayer has one listener;
its completion callback contains no request ID. A new generation closure alone
cannot distinguish an older physical completion routed to a replacement listener.
Serialize physical seeks: at most one active target and one latest queued target.
Reject the superseded promise, let its active callback retire, then launch the
latest queued physical seek. Clear ownership before settlement. Matching player
identity and owned operation must prevent old callbacks settling a successor.
stop/clearPlayer/teardown/playback failure reject all unsettled promises and
release listener ownership; catch paths retire ownership too. No new error code.

RAN: candidate Kotlin seek:277-307 replaces the listener, then the stale-generation branch
can return without settlement. clearPlayer:779-804 increments generation and
removes the listener without retaining a seek promise to reject. An explicit
pending-promise settlement in those paths would refute the finding. No executed
Audio failure/control or device success is claimed.

S-AUDIO-3: RAN candidate Kotlin pauseRecording/resumeRecording:386-437 resolve
actual recordingStatus below API 24. They do not reject with the floor errors
claimed by first layer. Missing recorder remains E_AUDIO_STATE; actual operation
failure keeps existing messages/codes. Disposition supersedes the comments-only proposal: below API 24, pause
rejects E_AUDIO_STATE and resume rejects E_AUDIO_FAILED, each with an explicit
API-24 requirement. Missing-recorder E_AUDIO_STATE retains precedence; valid
API-24+ behavior is unchanged. No new error code or fabricated paused status.

Audio runtime remains blocked on the existing two-host platform failure. No
boot/build/wipe/reset/HAL/GPU/shared-service/foreign-QEMU campaign is authorized.

## Retained failure and control evidence

RAN: parsed the candidate's checked-in XML with Python ElementTree.
calendar-final.xml reports siblingsKeptAfterUpdate=true,
siblingsKeptAfterDelete=true and middleRemoved=true. Its fixture deletes the
original first sibling, then re-lists to find the later remnant. It never edits
that later sibling by original ID. These controls prove neither repaired aliasing
nor rollback. Current split uses separate resolver writes; the no-siblings
update deletes before selected insertion. A covering transaction would refute
that source atomicity finding.

RAN: photo-limited-ready.xml reports permission=authorized and visible=2;
photo-limited-final.xml reports added=1 and strict=true. They are retained
candidate self-assertions, not new device runs. They do not prove USER_SELECTED
opt-in status or partial album access. candidate requestLimited:518-523 accepted
authorized on iOS too; the repaired handler rejects it in the focused control.

Public platform grounding:
[Selected Photos Access](https://developer.android.com/about/versions/14/changes/partial-photo-video-access)
specifies the three-permission request and compatibility-mode distinction.
[Events columns](https://developer.android.com/reference/android/provider/CalendarContract.Events)
permits app writes to CUSTOM_APP fields and exposes LAST_DATE.
[AOSP transaction implementation](https://android.googlesource.com/platform/packages/providers/CalendarProvider/+/refs/heads/main/src/com/android/providers/calendar/SQLiteContentProvider.java)
commits all operations only after success, with optional yield points. These
sources support the proposal; they do not establish installed-provider behavior.

## Bounded files, cost and validation

- HybridOneCalendar.kt, HybridOnePhotoLibrary.kt and HybridOneAudio.kt only.
- packages/vxrn/src/exports/prebuildWithoutExpo.ts, its test and expo-plugin.cjs
  for USER_SELECTED stamping only.
- Existing photo fixture leg and its isolated JavaScript handler control.
  Calendar fixture changes remain held with Calendar source.
- Existing calendar/photo/audio doc correction paragraphs and this plan.

Specs, bridges, generated bindings, Contacts and unavailable contracts stay
untouched. Origin mapping reuses eventRows and keeps paging before projection.
Origin lookup must query a package-scoped candidate set, avoiding a whole-store
scan per occurrence. Split memory stays capped; seek ownership is constant-size
on the current main thread. Photo reuses its worker/MediaStore queries. No
performance measurement is claimed.

TESTED: both permission-stamp controls fail before the stamp repair and pass
after it; all six actual fixture-handler cases pass after rejecting iOS
authorized. RAN: docs/unavailable suites pass 125 tests. One typecheck fails
with five TS2339 navigation render diagnostics in unchanged source files.
Native Kotlin remains uncompiled and runtime-unverified. Codegen/specs/bindings
are unchanged; no codegen build or probe was run. Detailed repeat commands,
negative outcomes and Audio source-control paths:
`tests/native-features/evidence/one-native-android-media/repair-static.md`.
No retry, weakened assertion, new device campaign or matrix.

Blocker owner: p60786, routed by manager p61056. Calendar metadata/selected
identity/provider-shape disposition remains pending. Photo/Audio source changes
are partially cleared; album access and replacement are unchanged. Delivery
task remains open for Calendar and existing native compile/runtime acceptance.
