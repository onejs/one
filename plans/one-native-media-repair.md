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

Frozen same-unit db315 disposition, relayed by p61056 and read from
`/Users/n8/.team-machine/handoffs/one-beta-recovery/public-review-controls/media-db315-disposition.md`:
selected detached events retain independent provider identifiers; untouched
siblings retain original identity. Calendar's opaque storage/consumer boundary
remains held. The corrections below replace the rejected origin projection
and custom-field storage choice. Calendar native source is unchanged.

Disposition relayed by p61056 on 2026-10-05 for f9b/06234: "C1 CLOSED IN
DESIGN independent selected provider ID"; normal exception investigation
accepted, implementation still held. Frozen One-only reviewer artifact named
in that mail: `one-media-corrections/f9b-calendar-verdict.md`, SHA-256
`91bd97dc644889eb7552017dc721ada3167e6b80d5bea1471a314215cbf5840f`.
The artifact was not read remotely; this records the explicit supplied
same-unit disposition. DURATION is necessary, not sufficient. Local update/
cancel, selected later edit/delete, duration and atomic metadata remain open.
Photo/Audio c8 keeps the existing p61184 coverage; no extra partial review or
final native approval was granted.

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

2. Durable sibling mapping is the unresolved storage prerequisite. It must
   retain each surviving run's original identifier and exact original RRULE
   in the same calendar transaction, including after the original physical
   row is removed. The selected standalone row is outside that sibling map.
   CUSTOM_APP_PACKAGE/CUSTOM_APP_URI are not adopted as opaque storage: their
   documented consumer passes them to a custom event activity. No same-app,
   versioned-URI or empty-field check proves that stamping them changes no
   custom experience. Do not overwrite existing values, synthesize a custom
   handler, or claim ownership from permission to edit an event. No supported
   inert ordinary-app storage boundary has been established from the assigned
   source. Sync-adapter columns, sync-adapter-only ExtendedProperties and an
   external non-atomic map do not satisfy the current contract/scope.

3. Preserve selected-occurrence behavior: update returns the selected detached
   row's independently re-read provider identifier and current start time,
   just as current insertDetached uses its insert result URI. Later edits or
   deletion resolve that pair directly to the selected row. Do not project
   its identifier or recurrence to the sibling origin. Its physical RRULE is
   absent, so later edits treat it as standalone; no synthetic exception
   marker or sibling membership is needed for that split design. Moving it
   onto a sibling's exact start then leaves two different identifiers. Earlier
   dead-end receipts do not establish that all supported exception APIs fail.
   The normal exception URI investigation below is source-only and does not
   clear linked-exception native writes. This follows the existing return-value
   contract, not a new public identifier definition.

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

   Preserve non-owned custom experience fields and unrelated event columns.
   Original-row updates change only the split timing/rule; newly inserted
   siblings must carry the original transferable event metadata instead of
   silently dropping it through readSeries' current narrow projection. Current
   SeriesRow/insertDetached read or copy only selected event fields; that is
   not a proof of preserving description, organizer, custom experience,
   reminders or attendees on arbitrary provider events. The approved storage
   and copy boundary must specify those columns/related rows and their actual
   consumers. Do not infer whole-event preservation from unchanged title/time.

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

### Supported normal exception path, source-only investigation

The held split proposal above is not ready for implementation: its durable
sibling storage boundary remains unresolved. Per p61056's 2026-10-05 source-only
instruction, examine the supported provider exception API before declaring
ordinary-app preservation impossible. No alternative implementation is adopted.

RAN: Android publicly exposes Events.CONTENT_EXCEPTION_URI from API 14, with
an appended original event ID for insertion. AOSP routes it through
handleInsertException without requiring sync-adapter authority. It clones the
original event and related tables inside a transaction, derives ORIGINAL_ID,
ORIGINAL_SYNC_ID and ORIGINAL_ALL_DAY, and returns a new selected provider ID.
The single-instance mode keeps the original series row/rule. This could avoid
sibling alias storage and local recurrence rewriting. It is not equivalent to
hand-inserting an ORIGINAL_ID row.

RAN: that method requires ORIGINAL_INSTANCE_TIME and DURATION; DTEND is absent
from its allowed changes. It converts DURATION into selected DTEND. Candidate
create always supplies DTEND, including RRULE events, and never DURATION.
The ordinary Events insert validation accepts that pair; expansion can derive
duration from DTEND, while handleInsertException cannot. INFERRED: recurrence
creation duration would need normalization to the documented shape before
this route could work. This is not proof of the installed provider failure.

RAN: AOSP also exposes a concrete unsynced-event obstruction. Incremental
exception expansion deletes base/exception Instances, then passes the new
exception ID to getRelevantRecurrenceEntries. With no recurrence sync ID,
that query selects only that ID. Full expansion matches exceptions through
ORIGINAL_SYNC_ID, not ORIGINAL_ID. INFERRED: using the public URI alone does
not establish sibling preservation for unsynced/local events in this source.
Do not synthesize _SYNC_ID, claim sync-adapter authority, clear provider caches,
change calendars, or infer a source workaround is supported without evidence.

Deletion of a returned linked exception must preserve cancellation of its
original slot; deleting its row alone can restore that slot. The reviewer must
dispose the exact normal-client update/cancel shape, including unsynced series,
selected later edit/delete, recurrence/all-day duration, atomicity and metadata
preservation. Runtime/rollback controls remain the existing held acceptance,
with no new device/build/probe/matrix authorization. Full source anchors and
falsifiable limits: `tests/native-features/evidence/one-native-android-media/calendar-normal-exception-source.md`.

Source refinement for that same held disposition: EXDATE cancellation may
preserve the original row/rule without linked cancellation or alias metadata.
AOSP handleUpdateEvents passes only changed values to updateInstancesLocked.
That helper returns when DTSTART is absent and detects recurrence from the
supplied RRULE/RDATE, not the loaded original row. Therefore an EXDATE-only
update is not a covering control for refreshed expansion. Candidate direction:
co-write unchanged DTSTART and exact original RRULE/RDATE with merged EXDATE;
RecurrenceProcessor explicitly removes those excluded starts. Existing raw
EXDATE/EXRULE/RDATE values and every unrelated column must be preserved.

Concrete source-only update ordering for review: normal exception-URI insert
clones selected metadata; an Events update selected by the result-ID back
reference clears original linkage and writes the selected DTSTART/DTEND; the
original row's final full recurrence-shape update excludes the original slot.
One no-yield, exception-disabled batch, expected update counts of one, owns
all three operations. Selected ordinary later edits/delete then cannot remove
the original EXDATE. Remove of an untouched sibling uses only the original
recurrence-shape/exclusion update. No series split, custom storage, synthetic
sync identity, external map or manual ExtendedProperties writes.

This is not implementation clearance or a complete arbitrary-event proof.
The source's unsynced parent expansion also drops Instances belonging to
pre-existing linked exceptions; their preservation remains unresolved. Do not
convert other events to standalone rows or add a public supported subset.
Timed clone DURATION and final exact DTEND differ in precision; all-day
normalization requires UTC midnight/day duration. Existing provider rows must
not acquire rounded timing as a side effect. Those boundaries and installed
EXDATE behavior must be disposed under the original acceptance, without a
new recurrence matrix, campaign, weaker fixture or documentation waiver.

Existing bounded controls, only after supported acceptance is admitted: retain
all current daily interval-2/count-3, middle-update/delete and endDateMs legs.
Strengthen that same middle leg to address the later sibling by original ID,
check sibling ID/recurrence retention, and edit/delete the returned selected
occurrence without changing siblings. No new recurrence matrix or device run.

RAN: repeated the existing review's bounded logical collision control. When a
selected edit is moved to the retained sibling's exact start, projecting both
to origin 100 produces two target matches; leaving selected provider ID 102
independent produces one selected match and one sibling-origin match. Receipt:
`tests/native-features/evidence/one-native-android-media/calendar-design-identity.json`.
This is logical identity evidence, not provider or One implementation execution.
Current insertDetached:765-768 already returns the new provider ID. The change
needed here is to the proposal, not that selected-ID source behavior.

RAN: read the exact documented custom-event consumer boundary:
[ACTION_HANDLE_CUSTOM_EVENT](https://developer.android.com/reference/android/provider/CalendarContract#ACTION_HANDLE_CUSTOM_EVENT)
starts the app named in CUSTOM_APP_PACKAGE and sends its CUSTOM_APP_URI as an
intent extra, together with the provider event URI and occurrence start. An
opaque origin stamp would therefore be consumer-visible. A One-source scan
found no custom-event handler, but that does not prove host/vendor consumers
ignore these fields or that a non-owned experience is preserved.
[EventsColumns](https://developer.android.com/reference/android/provider/CalendarContract.EventsColumns#CUSTOM_APP_URI)
defines those fields for that custom experience, not arbitrary storage.
[CalendarProvider2](https://android.googlesource.com/platform/packages/providers/CalendarProvider/+/refs/heads/main/src/com/android/providers/calendar/CalendarProvider2.java)
rejects ordinary-app writes to ExtendedProperties in its transaction guard.
No sync-adapter authority is added. The exact no-behavior-change metadata
boundary is still unproved, so origin storage remains blocked rather than
silently replaced with another event field or a weaker durability contract.

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
