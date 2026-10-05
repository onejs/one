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
