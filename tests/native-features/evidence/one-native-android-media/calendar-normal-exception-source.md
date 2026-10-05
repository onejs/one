# Calendar normal exception source boundary

RAN source-only on 2026-10-05. Calendar native source remains candidate25e.
Photo/Audio native repairs are pushed independently in c8bf89a75. This receipt
adds no native acceptance, runtime probe, device/build run or new review unit.

[Public Events API](https://developer.android.com/reference/android/provider/CalendarContract.Events#CONTENT_EXCEPTION_URI)
exposes CONTENT_EXCEPTION_URI since API 14. Inserts append the original event
ID. Exception deletion takes both original and exception IDs. Public recurring
Events insertion specifies DURATION, rather than nonrecurring DTEND.

[AOSP CalendarProvider2](https://android.googlesource.com/platform/packages/providers/CalendarProvider/+/refs/heads/main/src/com/android/providers/calendar/CalendarProvider2.java):
- 4579-4679: ordinary-app transaction guard permits the exception path; no
  sync-adapter identity required. Existing protected columns remain protected.
- 2473-2476, 1886-2239: handleInsertException requires ORIGINAL_INSTANCE_TIME,
  clones base values, derives original linkage and commits its transaction.
- 396-435, 2043-2079: allowed changes include DURATION, not DTEND; single
  exceptions convert duration into DTEND, strip recurrence and retain a new ID.
- 2165-2180: Instances update and related-table copy occur inside that transaction.
- 2833-2865, 2384-2393: ordinary Events validation accepts RRULE plus DTEND
  without deriving DURATION. Sync-adapter scrub is a separate path.
- 3395-3405, 3500-3580: deleting an exception row deletes/soft-deletes that
  event; cancellation of its original slot cannot be presumed to survive.

[AOSP CalendarInstancesHelper](https://android.googlesource.com/platform/packages/providers/CalendarProvider/+/refs/heads/main/src/com/android/providers/calendar/CalendarInstancesHelper.java):
- 172-181, 240-249, 360-370, 460-480: expansion uses ORIGINAL_SYNC_ID for
  cancellation matching; ORIGINAL_ID is not that matching input.
- 772-793, 808-854: unsynced incremental update deletes base/exception
  Instances, then expands by inserted exception row ID alone. Its own comment
  identifies passing exception rowId instead of originalId as wrong.
- 295-324: ordinary expansion can derive a missing duration from DTEND;
  that does not repair the exception handler's mandatory duration parsing.

RAN: candidate HybridOneCalendar.kt:165-176 writes DTEND on recurring create
and never DURATION. Its split branch uses independent writes. No Calendar
source was changed during this investigation.

INFERRED: the public exception API is a supported source candidate that could
avoid custom storage, recurrence splitting and sibling aliasing. It is not
established as an effective repair for local/unsynced events. An installed
provider whose normal-client exception insertion preserves siblings and
selected edit/delete would refute treating these AOSP limits as universal.
A source version resolving base and exceptions by local ORIGINAL_ID would
refute the identified unsynced boundary for that version. Earlier tested
EXDATE/linked-row dead ends do not prove all public exception APIs impossible.

No synthesized sync IDs, sync-adapter parameters, opaque custom-field storage,
provider cache manipulation or calendar/account substitution is proposed.
Same-unit p60786 must dispose normal-client update/cancel and duration shape;
Calendar source clearance and existing acceptance remain held by p61056.

Fetched public main snapshots outside the worktree, not installed-provider
binaries, retained at
`/Users/n8/.team-machine/handoffs/one-beta-recovery/media-repair-r59617/calendar-source/`:
- `CalendarContract.java` SHA-256 `583f650ea70d3aa53f7a5beb1c6d5ed5d929c372ccd37bbe4f96f6ffd005ae8a`
- `CalendarInstancesHelper.java` SHA-256 `04b9f6d643172c2d47b7245a806fa0bd48f3befe4d1ea8922fc04bdd3fcdb3e0`
- `CalendarProvider2.java` SHA-256 `37c13f9830df96df538f6dfd4b21d3369b7b1bdeeb8f1ce4d59d6012cfad3dd7`

## Same-unit disposition and bounded source refinement

p61056 supplied the existing p60786 verdict: C1 closed in design, normal
exception investigation accepted, Calendar implementation held. Frozen
reviewer artifact SHA-256 `91bd97dc644889eb7552017dc721ada3167e6b80d5bea1471a314215cbf5840f`.
No remote protected artifact or transcript was read.

RAN: CalendarProvider2:4167 passes modValues into updateInstancesLocked.
CalendarInstancesHelper:626-636 returns without DTSTART; 651-656 determines
recurrence from supplied fields. Thus an EXDATE-only write is not a source
control for refreshed Instances. Including unchanged DTSTART and original
RRULE/RDATE reaches parent expansion, whose local query uses the original ID.
This is source branch analysis, not an executed provider comparison.

[RecurrenceSet source](https://android.googlesource.com/platform/frameworks/opt/calendar/+/refs/heads/main/src/com/android/calendarcommon2/RecurrenceSet.java):
89-95 parses EXDATE when recurrence exists; 144-175 accepts timezone-prefixed
or UTC date lists. Existing multi-line exclusion content must survive appends.
[RecurrenceProcessor source](https://android.googlesource.com/platform/frameworks/opt/calendar/+/refs/heads/main/src/com/android/calendarcommon2/RecurrenceProcessor.java):
679-685 removes EXDATE starts from the expanded set. INFERRED source direction:
EXDATE plus a complete original recurrence shape could preserve sibling IDs
and persistent cancellation, avoiding local split recurrence arithmetic.
An installed-provider full-shape update that still lists the excluded start
would refute that behavior for the accepted runtime. No such run is claimed.

The proposed selected metadata path uses public exception insertion only for
its transactional cloning, then a normal Events update with result-ID
selection back reference and expected count one detaches the selected row.
CalendarContract:1692-1724 allows apps to write original linkage columns.
INFERRED: final original-row exclusion update could restore unsynced base
expansion after temporary exception insertion for a series without pre-existing
linked exceptions. All three operations share one no-yield
batch; selected remains independently addressed even at a sibling's start.
Later selected deletion leaves original exclusion intact. No implementation,
installed rollback or unrelated metadata preservation is proved here.

Two remaining source limits prevent declaring this ready:
- Local parent expansion queries only that row after removing associated
  exception Instances. Preserving existing non-owned linked exceptions is
  unproved; converting those rows or publishing a narrower API is excluded.
- [Duration source](https://android.googlesource.com/platform/frameworks/opt/calendar/+/refs/heads/main/src/com/android/calendarcommon2/Duration.java)
  parses integer units, and CalendarProvider2:1702-1767 normalizes all-day times
  and second durations to days. Clone DURATION plus exact final selected
  DTEND can differ from mutating parent duration. Preserve current timing,
  UTC all-day/day shape and original metadata; no precision waiver is granted.

New public source snapshots in the same outside-tree source directory:
- `RecurrenceSet.java` SHA-256 `41a37396ea6b0d8c46e12a32850d5ff059ea0b28b3eef9a7d2a832a5b5d3b818`
- `RecurrenceProcessor.java` SHA-256 `0e28a123551b1fdde4b86efa9c6f41d46260c5a80ac3b883dfb98c3dc02e912f`
- `Duration.java` SHA-256 `395135e614a724103bfe6d4bfbfc462ea88d03f7f82425b554e2e1066eb9afca`
