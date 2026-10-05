package com.margelo.nitro.one

import android.Manifest
import android.app.Activity
import android.content.ContentUris
import android.content.ContentValues
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.CalendarContract
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.Executors

// calendar events over CalendarContract. identifiers are Events row ids;
// recurring occurrences are keyed by (identifier, startMs) exactly like
// EventKit. reminders have no Android provider, so the six reminder
// methods answer the honest unavailable contract at the native layer too
// (the js bridge keeps them on unavailable.ts). provider work runs on one
// worker; the permission slot is only taken or settled under the lock.
class HybridOneCalendar : HybridOneCalendarSpec(), PermissionListener {
    private val lock = Any()
    private var pendingPermission: Promise<CalendarPermissionStatus>? = null
    private val worker = Executors.newSingleThreadExecutor()

    private val context: ReactApplicationContext
        get() = NitroModules.applicationContext
            ?: throw IllegalStateException("Calendar: the react context is not ready")

    override fun dispose() {
        val permission: Promise<CalendarPermissionStatus>?
        synchronized(lock) {
            permission = pendingPermission
            pendingPermission = null
        }
        permission?.reject(OneNativeError(E_PERMISSION, "Calendar.requestPermission: torn down mid-request"))
        worker.shutdownNow()
        super.dispose()
    }

    override fun getPermissionStatus(): CalendarPermissionStatus = readStatus()

    override fun requestPermission(): Promise<CalendarPermissionStatus> {
        val promise = Promise<CalendarPermissionStatus>()
        if (!isCalendarDeclared()) {
            promise.reject(
                OneNativeError(E_MANIFEST, "Calendar.requestPermission: set native.app.calendar.usage")
            )
            return promise
        }
        if (canRead()) {
            promise.resolve(readStatus())
            return promise
        }
        val activity = context.currentActivity
        val aware = activity as? PermissionAwareActivity
        if (activity == null || aware == null) {
            promise.reject(
                OneNativeError(E_PERMISSION, "Calendar.requestPermission: found no activity to prompt from")
            )
            return promise
        }
        synchronized(lock) {
            if (pendingPermission != null) {
                promise.reject(
                    OneNativeError(E_PERMISSION, "Calendar.requestPermission: another request is already in flight")
                )
                return promise
            }
            pendingPermission = promise
        }
        markAsked()
        aware.requestPermissions(
            arrayOf(Manifest.permission.READ_CALENDAR, Manifest.permission.WRITE_CALENDAR),
            REQUEST_PERMISSION,
            this
        )
        return promise
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ): Boolean {
        if (requestCode != REQUEST_PERMISSION) return false
        val pending = synchronized(lock) {
            val pending = pendingPermission
            pendingPermission = null
            pending
        }
        pending?.resolve(readStatus())
        return true
    }

    override fun list(startMs: Double, endMs: Double, limit: Double): Promise<Array<CalendarEvent>> {
        val promise = Promise<Array<CalendarEvent>>()
        worker.execute {
            if (!isCalendarDeclared()) {
                promise.reject(OneNativeError(E_MANIFEST, "Calendar.list: set native.app.calendar.usage"))
                return@execute
            }
            if (!canRead()) {
                promise.reject(OneNativeError(E_PERMISSION, "Calendar.list: full calendar access is required"))
                return@execute
            }
            if (
                !startMs.isFinite() || !endMs.isFinite() || endMs <= startMs ||
                endMs - startMs > 366 * 24 * 60 * 60 * 1000.0 ||
                !limit.isFinite() || limit < 1 || limit > 500 || limit != kotlin.math.floor(limit)
            ) {
                promise.reject(
                    OneNativeError(E_INPUT, "Calendar.list: use a range up to 366 days and a limit from 1 to 500")
                )
                return@execute
            }
            try {
                promise.resolve(queryInstances(startMs.toLong(), endMs.toLong(), limit.toInt()).toTypedArray())
            } catch (e: OneNativeError) {
                promise.reject(e)
            } catch (e: Exception) {
                promise.reject(OneNativeError(E_FETCH, "Calendar.list: ${e.message ?: "could not list events"}"))
            }
        }
        return promise
    }

    override fun create(input: CalendarEventInput): Promise<String> {
        val promise = Promise<String>()
        worker.execute {
            if (!isCalendarDeclared()) {
                promise.reject(OneNativeError(E_MANIFEST, "Calendar.create: set native.app.calendar.usage"))
                return@execute
            }
            if (!canRead()) {
                promise.reject(OneNativeError(E_PERMISSION, "Calendar.create: full calendar access is required"))
                return@execute
            }
            val title = input.title.trim()
            if (title.isEmpty() || !input.startMs.isFinite() || !input.endMs.isFinite() || input.endMs <= input.startMs) {
                promise.reject(
                    OneNativeError(E_INPUT, "Calendar.create: title and increasing finite times are required")
                )
                return@execute
            }
            val rrule = input.recurrence?.let { recurrenceRule(it, input.startMs) }
            if (input.recurrence != null && rrule == null) {
                promise.reject(
                    OneNativeError(E_INPUT, "Calendar.create: recurrence needs a whole-number interval and one valid end")
                )
                return@execute
            }
            try {
                val calendarId = defaultWritableCalendar()
                    ?: throw OneNativeError(E_UNAVAILABLE, "Calendar.create: no writable calendar is available")
                val values = ContentValues().apply {
                    put(CalendarContract.Events.CALENDAR_ID, calendarId)
                    put(CalendarContract.Events.TITLE, title)
                    put(CalendarContract.Events.DTSTART, input.startMs.toLong())
                    put(CalendarContract.Events.DTEND, input.endMs.toLong())
                    put(CalendarContract.Events.ALL_DAY, if (input.allDay) 1 else 0)
                    put(
                        CalendarContract.Events.EVENT_TIMEZONE,
                        if (input.allDay) TimeZone.getTimeZone("UTC").id else TimeZone.getDefault().id
                    )
                    if (rrule != null) put(CalendarContract.Events.RRULE, rrule)
                }
                val uri = context.contentResolver.insert(CalendarContract.Events.CONTENT_URI, values)
                    ?: throw OneNativeError(E_SAVE, "Calendar.create: saved event has no identifier")
                promise.resolve(ContentUris.parseId(uri).toString())
            } catch (e: OneNativeError) {
                promise.reject(e)
            } catch (e: Exception) {
                promise.reject(OneNativeError(E_SAVE, "Calendar.create: ${e.message ?: "could not save the event"}"))
            }
        }
        return promise
    }

    override fun update(
        identifier: String,
        originalStartMs: Double,
        changes: CalendarEventChanges
    ): Promise<CalendarEvent> {
        val promise = Promise<CalendarEvent>()
        worker.execute {
            if (!isCalendarDeclared()) {
                promise.reject(OneNativeError(E_MANIFEST, "Calendar.update: set native.app.calendar.usage"))
                return@execute
            }
            if (!canRead()) {
                promise.reject(OneNativeError(E_PERMISSION, "Calendar.update: full calendar access is required"))
                return@execute
            }
            val id = identifier.trim()
            if (
                id.isEmpty() || !originalStartMs.isFinite() || kotlin.math.abs(originalStartMs) > MAX_MS ||
                (changes.title == null && changes.startMs == null && changes.endMs == null &&
                    changes.allDay == null && changes.location == null)
            ) {
                promise.reject(
                    OneNativeError(E_INPUT, "Calendar.update: an event and at least one change are required")
                )
                return@execute
            }
            try {
                val occurrence = findOccurrence(id, originalStartMs)
                    ?: throw OneNativeError(E_NOT_FOUND, "Calendar.update: event occurrence was not found")
                val startMs = changes.startMs ?: occurrence.startMs
                val endMs = changes.endMs ?: occurrence.endMs
                if (
                    !startMs.isFinite() || !endMs.isFinite() ||
                    kotlin.math.abs(startMs) > MAX_MS || kotlin.math.abs(endMs) > MAX_MS ||
                    endMs <= startMs
                ) {
                    throw OneNativeError(E_INPUT, "Calendar.update: increasing finite times are required")
                }
                val title = changes.title?.trim()?.ifEmpty { null } ?: changes.title?.let {
                    throw OneNativeError(E_INPUT, "Calendar.update: title cannot be empty")
                } ?: occurrence.title
                val allDay = changes.allDay ?: occurrence.allDay
                val location = changes.location ?: occurrence.location
                val eventId = id.toLong()
                if (occurrence.isRecurring && !occurrence.isException) {
                    // this provider ignores EXDATE/RDATE and suppresses
                    // sibling expansion for linked ORIGINAL_ID exceptions,
                    // so a single-occurrence edit splits the series around
                    // the instance and carries the new values in a detached
                    // event. the returned event carries the detached row's
                    // identifier.
                    splitOutInstance(eventId, occurrence, "update")
                    promise.resolve(
                        insertDetached(occurrence, title, startMs, endMs, allDay, location, "update")
                    )
                    return@execute
                } else {
                    val values = ContentValues().apply {
                        put(CalendarContract.Events.TITLE, title)
                        put(CalendarContract.Events.DTSTART, startMs.toLong())
                        put(CalendarContract.Events.DTEND, endMs.toLong())
                        put(CalendarContract.Events.ALL_DAY, if (allDay) 1 else 0)
                        put(
                            CalendarContract.Events.EVENT_TIMEZONE,
                            if (allDay) TimeZone.getTimeZone("UTC").id else TimeZone.getDefault().id
                        )
                        put(CalendarContract.Events.EVENT_LOCATION, location)
                    }
                    val updated = context.contentResolver.update(
                        ContentUris.withAppendedId(CalendarContract.Events.CONTENT_URI, eventId),
                        values,
                        null,
                        null
                    )
                    if (updated <= 0) {
                        throw OneNativeError(E_NOT_FOUND, "Calendar.update: event occurrence was not found")
                    }
                }
                // re-query the updated event at its new start.
                promise.resolve(
                    findOccurrence(id, startMs)?.event
                        ?: throw OneNativeError(E_SAVE, "Calendar.update: saved event has no identifier")
                )
            } catch (e: OneNativeError) {
                promise.reject(e)
            } catch (e: Exception) {
                promise.reject(OneNativeError(E_SAVE, "Calendar.update: ${e.message ?: "could not save the event"}"))
            }
        }
        return promise
    }

    override fun remove(identifier: String, startMs: Double): Promise<Unit> {
        val promise = Promise<Unit>()
        worker.execute {
            if (!isCalendarDeclared()) {
                promise.reject(OneNativeError(E_MANIFEST, "Calendar.delete: set native.app.calendar.usage"))
                return@execute
            }
            if (!canRead()) {
                promise.reject(OneNativeError(E_PERMISSION, "Calendar.delete: full calendar access is required"))
                return@execute
            }
            val id = identifier.trim()
            if (id.isEmpty() || !startMs.isFinite() || kotlin.math.abs(startMs) > MAX_MS) {
                promise.reject(
                    OneNativeError(E_INPUT, "Calendar.delete: identifier and finite start time are required")
                )
                return@execute
            }
            try {
                val occurrence = findOccurrence(id, startMs)
                    ?: throw OneNativeError(E_NOT_FOUND, "Calendar.delete: event occurrence was not found")
                val eventId = id.toLong()
                if (occurrence.isRecurring && !occurrence.isException) {
                    splitOutInstance(eventId, occurrence, "delete")
                    // the split must remove exactly this occurrence:
                    // siblings stay listed.
                    if (findOccurrence(id, startMs) != null) {
                        throw OneNativeError(E_DELETE, "Calendar.delete: could not delete the event")
                    }
                } else {
                    val deleted = context.contentResolver.delete(
                        ContentUris.withAppendedId(CalendarContract.Events.CONTENT_URI, eventId),
                        null,
                        null
                    )
                    if (deleted <= 0) {
                        throw OneNativeError(E_NOT_FOUND, "Calendar.delete: event occurrence was not found")
                    }
                }
                promise.resolve(Unit)
            } catch (e: OneNativeError) {
                promise.reject(e)
            } catch (e: Exception) {
                promise.reject(OneNativeError(E_DELETE, "Calendar.delete: ${e.message ?: "could not delete the event"}"))
            }
        }
        return promise
    }

    // reminders: no Android provider exists. these mirror unavailable.ts so
    // even a direct native caller gets the honest contract.
    override fun getRemindersPermissionStatus(): CalendarPermissionStatus =
        CalendarPermissionStatus.DENIED

    override fun requestRemindersPermission(): Promise<CalendarPermissionStatus> =
        Promise.resolved(CalendarPermissionStatus.DENIED)

    override fun listReminders(limit: Double, includeCompleted: Boolean): Promise<Array<ReminderInfo>> =
        Promise.resolved(emptyArray())

    override fun createReminder(input: ReminderInput): Promise<String> =
        Promise.rejected(OneNativeError("Calendar.createReminder needs an iOS or Android build"))

    override fun setReminderCompleted(identifier: String, completed: Boolean): Promise<Unit> =
        Promise.resolved(Unit)

    override fun removeReminder(identifier: String): Promise<Unit> =
        Promise.resolved(Unit)

    private data class Occurrence(
        val event: CalendarEvent,
        val startMs: Double,
        val endMs: Double,
        val title: String,
        val allDay: Boolean,
        val location: String,
        val isRecurring: Boolean,
        val isException: Boolean,
        val calendarId: Long,
        val timezone: String?
    )

    private fun instancesUri(beginMs: Long, endMs: Long): Uri {
        // CONTENT_URI already ends in instances/when; withAppendedId
        // appends the raw range segments (withAppendedPath would encode
        // the slash).
        var uri = CalendarContract.Instances.CONTENT_URI
        uri = ContentUris.withAppendedId(uri, beginMs)
        uri = ContentUris.withAppendedId(uri, endMs)
        return uri
    }

    private data class InstanceRow(
        val eventId: Long,
        val begin: Double,
        val end: Double,
        val title: String,
        val rrule: String?
    )

    private fun queryInstances(beginMs: Long, endMs: Long, limit: Int): List<CalendarEvent> {
        // the instances view carries no location, all-day or timezone
        // columns; those join from the Events row per event id.
        val uri = instancesUri(beginMs, endMs)
        val rows = mutableListOf<InstanceRow>()
        context.contentResolver.query(
            uri,
            arrayOf(
                CalendarContract.Instances.EVENT_ID,
                CalendarContract.Instances.BEGIN,
                CalendarContract.Instances.END,
                CalendarContract.Instances.TITLE,
                CalendarContract.Instances.RRULE
            ),
            null,
            null,
            "${CalendarContract.Instances.BEGIN} ASC"
        )?.use { cursor ->
            while (cursor.moveToNext() && rows.size < limit) {
                rows.add(
                    InstanceRow(
                        cursor.getLong(0),
                        cursor.getLong(1).toDouble(),
                        cursor.getLong(2).toDouble(),
                        cursor.getString(3) ?: "",
                        cursor.getString(4)
                    )
                )
            }
        }
        if (rows.isEmpty()) return emptyList()
        val events = eventRows(rows.map { it.eventId }.toSet())
        return rows.map { row ->
            val detail = events[row.eventId]
            CalendarEvent(
                row.eventId.toString(),
                row.title,
                row.begin,
                row.end,
                detail?.allDay == true,
                detail?.location ?: "",
                row.rrule?.let { parseRecurrence(it) }
            )
        }
    }

    private data class EventDetail(
        val allDay: Boolean,
        val location: String,
        val timezone: String?,
        val rrule: String?,
        val isException: Boolean
    )

    private fun eventRows(eventIds: Set<Long>): Map<Long, EventDetail> {
        if (eventIds.isEmpty()) return emptyMap()
        val out = mutableMapOf<Long, EventDetail>()
        val ids = eventIds.toList()
        val selection = ids.joinToString(" OR ") { "${CalendarContract.Events._ID}=?" }
        context.contentResolver.query(
            CalendarContract.Events.CONTENT_URI,
            arrayOf(
                CalendarContract.Events._ID,
                CalendarContract.Events.ALL_DAY,
                CalendarContract.Events.EVENT_LOCATION,
                CalendarContract.Events.EVENT_TIMEZONE,
                CalendarContract.Events.RRULE,
                CalendarContract.Events.ORIGINAL_ID
            ),
            selection,
            ids.map { it.toString() }.toTypedArray(),
            null
        )?.use { cursor ->
            while (cursor.moveToNext()) {
                out[cursor.getLong(0)] = EventDetail(
                    cursor.getInt(1) == 1,
                    cursor.getString(2) ?: "",
                    cursor.getString(3),
                    cursor.getString(4),
                    !cursor.isNull(5)
                )
            }
        }
        return out
    }

    private fun findOccurrence(identifier: String, startMs: Double): Occurrence? {
        val eventId = identifier.toLongOrNull() ?: return null
        val begin = (startMs - 1_000).toLong()
        val end = (startMs + 1_000).toLong()
        val uri = instancesUri(begin, end)
        context.contentResolver.query(
            uri,
            arrayOf(
                CalendarContract.Instances.EVENT_ID,
                CalendarContract.Instances.BEGIN,
                CalendarContract.Instances.END,
                CalendarContract.Instances.TITLE,
                CalendarContract.Instances.RRULE,
                CalendarContract.Instances.CALENDAR_ID
            ),
            "${CalendarContract.Instances.EVENT_ID}=?",
            arrayOf(eventId.toString()),
            "${CalendarContract.Instances.BEGIN} ASC"
        )?.use { cursor ->
            while (cursor.moveToNext()) {
                val rowBegin = cursor.getLong(1).toDouble()
                if (kotlin.math.abs(rowBegin - startMs) >= 1_000) continue
                val rowEnd = cursor.getLong(2).toDouble()
                val title = cursor.getString(3) ?: ""
                val rrule = cursor.getString(4)
                // the instances view carries no location, all-day or
                // timezone columns; those join from the Events row.
                val detail = eventRows(setOf(eventId))[eventId]
                val allDay = detail?.allDay == true
                val location = detail?.location ?: ""
                val event = CalendarEvent(
                    eventId.toString(),
                    title,
                    rowBegin,
                    rowEnd,
                    allDay,
                    location,
                    rrule?.let { parseRecurrence(it) }
                )
                return Occurrence(
                    event, rowBegin, rowEnd, title, allDay, location,
                    isRecurring = rrule != null || detail?.isException == true,
                    isException = detail?.isException == true,
                    calendarId = cursor.getLong(5),
                    timezone = detail?.timezone
                )
            }
        }
        return null
    }

    private data class SeriesRow(
        val calendarId: Long,
        val title: String,
        val dtstart: Long,
        val dtend: Long,
        val allDay: Boolean,
        val timezone: String,
        val location: String,
        val rrule: String
    )

    private fun readSeries(eventId: Long): SeriesRow? {
        return context.contentResolver.query(
            ContentUris.withAppendedId(CalendarContract.Events.CONTENT_URI, eventId),
            arrayOf(
                CalendarContract.Events.CALENDAR_ID,
                CalendarContract.Events.TITLE,
                CalendarContract.Events.DTSTART,
                CalendarContract.Events.DTEND,
                CalendarContract.Events.ALL_DAY,
                CalendarContract.Events.EVENT_TIMEZONE,
                CalendarContract.Events.EVENT_LOCATION,
                CalendarContract.Events.RRULE
            ),
            null,
            null,
            null
        )?.use { cursor ->
            if (cursor.moveToFirst() && !cursor.isNull(7)) {
                SeriesRow(
                    cursor.getLong(0),
                    cursor.getString(1) ?: "",
                    cursor.getLong(2),
                    cursor.getLong(3),
                    cursor.getInt(4) == 1,
                    cursor.getString(5) ?: TimeZone.getDefault().id,
                    cursor.getString(6) ?: "",
                    cursor.getString(7) ?: ""
                )
            } else {
                null
            }
        }
    }

    private fun expandStarts(
        row: SeriesRow,
        frequency: CalendarRecurrenceFrequency,
        interval: Long,
        count: Long?,
        untilMs: Long?,
        pastMs: Long
    ): List<Long> {
        // local expansion mirroring RRULE semantics for the rules this
        // module writes (FREQ + INTERVAL + COUNT/UNTIL): monthly and
        // yearly candidates that land on a missing day are skipped, and
        // COUNT counts kept instances only. COUNT/UNTIL series expand
        // fully; endless series expand through one instance past the
        // target so both surrounding runs are known.
        val zone = try {
            TimeZone.getTimeZone(row.timezone)
        } catch (e: Exception) {
            TimeZone.getTimeZone("UTC")
        }
        val base = java.util.Calendar.getInstance(zone, Locale.US).apply {
            timeInMillis = row.dtstart
        }
        val baseDay = base.get(java.util.Calendar.DAY_OF_MONTH)
        val baseMonth = base.get(java.util.Calendar.MONTH)
        val field = when (frequency) {
            CalendarRecurrenceFrequency.DAILY -> java.util.Calendar.DAY_OF_MONTH
            CalendarRecurrenceFrequency.WEEKLY -> java.util.Calendar.WEEK_OF_YEAR
            CalendarRecurrenceFrequency.MONTHLY -> java.util.Calendar.MONTH
            CalendarRecurrenceFrequency.YEARLY -> java.util.Calendar.YEAR
        }
        val endless = count == null && untilMs == null
        val out = mutableListOf<Long>()
        var kept = 0L
        var step = 0L
        while (true) {
            if (out.size >= MAX_EXPANSION) {
                throw OneNativeError(E_SAVE, "Calendar series is too large to edit one occurrence")
            }
            if (count != null && kept >= count) break
            val jump = step * interval
            if (jump > Int.MAX_VALUE) {
                throw OneNativeError(E_SAVE, "Calendar series is too large to edit one occurrence")
            }
            val candidate = (base.clone() as java.util.Calendar).apply {
                add(field, jump.toInt())
            }
            val valid = when (frequency) {
                CalendarRecurrenceFrequency.MONTHLY ->
                    candidate.get(java.util.Calendar.DAY_OF_MONTH) == baseDay
                CalendarRecurrenceFrequency.YEARLY ->
                    candidate.get(java.util.Calendar.MONTH) == baseMonth &&
                        candidate.get(java.util.Calendar.DAY_OF_MONTH) == baseDay
                else -> true
            }
            step += 1
            if (!valid) continue
            val ms = candidate.timeInMillis
            if (untilMs != null && ms > untilMs) break
            out.add(ms)
            kept += 1
            if (endless && ms > pastMs) break
        }
        return out
    }

    private fun splitOutInstance(eventId: Long, occurrence: Occurrence, verb: String) {
        val row = readSeries(eventId)
            ?: throw OneNativeError(E_NOT_FOUND, "Calendar.$verb: event occurrence was not found")
        val rule = parseRecurrence(row.rrule)
            ?: throw OneNativeError(E_INPUT, "Calendar.$verb: recurrence is not supported")
        val interval = rule.interval ?: 1.0
        if (!interval.isFinite() || interval < 1 || interval != kotlin.math.floor(interval)) {
            throw OneNativeError(E_INPUT, "Calendar.$verb: recurrence is not supported")
        }
        val starts = expandStarts(
            row,
            rule.frequency,
            interval.toLong(),
            rule.occurrenceCount?.toLong(),
            rule.endDateMs?.toLong(),
            occurrence.startMs.toLong()
        )
        val at = starts.indexOfFirst { kotlin.math.abs(it - occurrence.startMs) < 1_000 }
        if (at < 0) {
            throw OneNativeError(E_NOT_FOUND, "Calendar.$verb: event occurrence was not found")
        }
        val keepIdx = starts.indices.filter { it != at }
        if (keepIdx.isEmpty()) {
            val deleted = context.contentResolver.delete(
                ContentUris.withAppendedId(CalendarContract.Events.CONTENT_URI, eventId),
                null,
                null
            )
            if (deleted <= 0) {
                throw OneNativeError(E_NOT_FOUND, "Calendar.$verb: event occurrence was not found")
            }
            return
        }
        // maximal consecutive runs in expansion order; each run becomes
        // one series row so every survivor keeps expanding.
        val runs = mutableListOf<MutableList<Long>>()
        var prev = -2
        for (index in keepIdx) {
            val run = runs.lastOrNull()
            if (run == null || index != prev + 1) {
                runs.add(mutableListOf(starts[index]))
            } else {
                run.add(starts[index])
            }
            prev = index
        }
        val duration = row.dtend - row.dtstart
        val infiniteTail = rule.occurrenceCount == null && rule.endDateMs == null
        val step = interval.toLong()
        runs.forEachIndexed { index, run ->
            val first = run.first()
            val rrule = if (infiniteTail && index == runs.size - 1) {
                ruleText(rule.frequency, step, null)
            } else {
                ruleText(rule.frequency, step, run.size.toLong())
            }
            val values = ContentValues().apply {
                put(CalendarContract.Events.DTSTART, first)
                put(CalendarContract.Events.DTEND, first + duration)
                if (rrule == null) {
                    putNull(CalendarContract.Events.RRULE)
                } else {
                    put(CalendarContract.Events.RRULE, rrule)
                }
            }
            if (index == 0) {
                val updated = context.contentResolver.update(
                    ContentUris.withAppendedId(CalendarContract.Events.CONTENT_URI, eventId),
                    values,
                    null,
                    null
                )
                if (updated <= 0) {
                    throw OneNativeError(E_NOT_FOUND, "Calendar.$verb: event occurrence was not found")
                }
            } else {
                val insert = ContentValues().apply {
                    put(CalendarContract.Events.CALENDAR_ID, row.calendarId)
                    put(CalendarContract.Events.TITLE, row.title)
                    put(CalendarContract.Events.ALL_DAY, if (row.allDay) 1 else 0)
                    put(CalendarContract.Events.EVENT_TIMEZONE, row.timezone)
                    put(CalendarContract.Events.EVENT_LOCATION, row.location)
                    put(CalendarContract.Events.DTSTART, first)
                    put(CalendarContract.Events.DTEND, first + duration)
                    if (rrule == null) {
                        putNull(CalendarContract.Events.RRULE)
                    } else {
                        put(CalendarContract.Events.RRULE, rrule)
                    }
                }
                context.contentResolver.insert(CalendarContract.Events.CONTENT_URI, insert)
                    ?: throw OneNativeError(E_SAVE, "Calendar.$verb: could not save the event")
            }
        }
    }

    private fun ruleText(
        frequency: CalendarRecurrenceFrequency,
        interval: Long,
        count: Long?
    ): String? {
        // runs re-emit as COUNT rules (an UNTIL bound converts exactly:
        // the run holds every instance the new rule expands).
        if (count != null && count <= 1) return null
        val freq = when (frequency) {
            CalendarRecurrenceFrequency.DAILY -> "DAILY"
            CalendarRecurrenceFrequency.WEEKLY -> "WEEKLY"
            CalendarRecurrenceFrequency.MONTHLY -> "MONTHLY"
            CalendarRecurrenceFrequency.YEARLY -> "YEARLY"
        }
        val rule = StringBuilder("FREQ=$freq;INTERVAL=$interval")
        count?.let { rule.append(";COUNT=$it") }
        return rule.toString()
    }

    private fun insertDetached(
        occurrence: Occurrence,
        title: String,
        startMs: Double,
        endMs: Double,
        allDay: Boolean,
        location: String,
        verb: String
    ): CalendarEvent {
        val values = ContentValues().apply {
            put(CalendarContract.Events.CALENDAR_ID, occurrence.calendarId)
            put(CalendarContract.Events.TITLE, title)
            put(CalendarContract.Events.DTSTART, startMs.toLong())
            put(CalendarContract.Events.DTEND, endMs.toLong())
            put(CalendarContract.Events.ALL_DAY, if (allDay) 1 else 0)
            put(
                CalendarContract.Events.EVENT_TIMEZONE,
                if (allDay) TimeZone.getTimeZone("UTC").id
                else occurrence.timezone ?: TimeZone.getDefault().id
            )
            put(CalendarContract.Events.EVENT_LOCATION, location)
        }
        val uri = context.contentResolver.insert(CalendarContract.Events.CONTENT_URI, values)
            ?: throw OneNativeError(E_SAVE, "Calendar.$verb: could not save the event")
        val newId = ContentUris.parseId(uri).toString()
        return findOccurrence(newId, startMs)?.event
            ?: throw OneNativeError(E_SAVE, "Calendar.$verb: saved event has no identifier")
    }

    private fun defaultWritableCalendar(): Long? {
        val candidates = mutableListOf<Pair<Long, Int>>()
        context.contentResolver.query(
            CalendarContract.Calendars.CONTENT_URI,
            arrayOf(
                CalendarContract.Calendars._ID,
                CalendarContract.Calendars.CALENDAR_ACCESS_LEVEL,
                CalendarContract.Calendars.IS_PRIMARY,
                CalendarContract.Calendars.VISIBLE
            ),
            "${CalendarContract.Calendars.VISIBLE}=1",
            null,
            null
        )?.use { cursor ->
            while (cursor.moveToNext()) {
                val access = cursor.getInt(1)
                if (
                    access == CalendarContract.Calendars.CAL_ACCESS_OWNER ||
                    access == CalendarContract.Calendars.CAL_ACCESS_CONTRIBUTOR ||
                    access == CalendarContract.Calendars.CAL_ACCESS_ROOT
                ) {
                    candidates.add(Pair(cursor.getLong(0), cursor.getInt(2)))
                }
            }
        }
        return (candidates.firstOrNull { it.second == 1 } ?: candidates.firstOrNull())?.first
    }

    private fun recurrenceRule(value: CalendarRecurrence, startMs: Double): String? {
        val interval = value.interval ?: 1.0
        if (
            !interval.isFinite() || interval < 1 || interval > 1_000 || interval != kotlin.math.floor(interval) ||
            (value.endDateMs != null && value.occurrenceCount != null)
        ) {
            return null
        }
        value.endDateMs?.let {
            if (!it.isFinite() || it < startMs || it > MAX_MS) return null
        }
        value.occurrenceCount?.let {
            if (!it.isFinite() || it < 1 || it > 10_000 || it != kotlin.math.floor(it)) return null
        }
        val freq = when (value.frequency) {
            CalendarRecurrenceFrequency.DAILY -> "DAILY"
            CalendarRecurrenceFrequency.WEEKLY -> "WEEKLY"
            CalendarRecurrenceFrequency.MONTHLY -> "MONTHLY"
            CalendarRecurrenceFrequency.YEARLY -> "YEARLY"
        }
        val rule = StringBuilder("FREQ=$freq;INTERVAL=${interval.toLong()}")
        value.occurrenceCount?.let { rule.append(";COUNT=${it.toLong()}") }
        value.endDateMs?.let {
            val format = SimpleDateFormat("yyyyMMdd'T'HHmmss'Z'", Locale.US)
            format.timeZone = TimeZone.getTimeZone("UTC")
            rule.append(";UNTIL=${format.format(Date(it.toLong()))}")
        }
        return rule.toString()
    }

    private fun parseRecurrence(rrule: String): CalendarRecurrence? {
        val parts = rrule.split(";").associate { part ->
            val split = part.split("=", limit = 2)
            split[0].uppercase() to (split.getOrNull(1) ?: "")
        }
        val frequency = when (parts["FREQ"]?.uppercase()) {
            "DAILY" -> CalendarRecurrenceFrequency.DAILY
            "WEEKLY" -> CalendarRecurrenceFrequency.WEEKLY
            "MONTHLY" -> CalendarRecurrenceFrequency.MONTHLY
            "YEARLY" -> CalendarRecurrenceFrequency.YEARLY
            else -> return null
        }
        val interval = parts["INTERVAL"]?.toLongOrNull()?.toDouble()
        val count = parts["COUNT"]?.toLongOrNull()?.toDouble()
        val until = parts["UNTIL"]?.let { text ->
            try {
                val format = SimpleDateFormat("yyyyMMdd'T'HHmmss'Z'", Locale.US)
                format.timeZone = TimeZone.getTimeZone("UTC")
                format.parse(text)?.time?.toDouble()
            } catch (e: Exception) {
                try {
                    val day = SimpleDateFormat("yyyyMMdd", Locale.US)
                    day.timeZone = TimeZone.getTimeZone("UTC")
                    day.parse(text)?.time?.toDouble()
                } catch (e2: Exception) {
                    null
                }
            }
        }
        return CalendarRecurrence(frequency, interval, until, count)
    }

    private fun readStatus(): CalendarPermissionStatus {
        if (canRead()) return CalendarPermissionStatus.FULLACCESS
        val activity = context.currentActivity
        if (activity != null &&
            ActivityCompat.shouldShowRequestPermissionRationale(activity, Manifest.permission.READ_CALENDAR)
        ) {
            return CalendarPermissionStatus.DENIED
        }
        return if (wasAsked()) CalendarPermissionStatus.DENIED else CalendarPermissionStatus.NOTDETERMINED
    }

    private fun canRead(): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CALENDAR) ==
            PackageManager.PERMISSION_GRANTED

    private fun isCalendarDeclared(): Boolean {
        val info = try {
            if (Build.VERSION.SDK_INT >= 33) {
                context.packageManager.getPackageInfo(
                    context.packageName,
                    PackageManager.PackageInfoFlags.of(PackageManager.GET_PERMISSIONS.toLong())
                )
            } else {
                @Suppress("DEPRECATION")
                context.packageManager.getPackageInfo(context.packageName, PackageManager.GET_PERMISSIONS)
            }
        } catch (e: Exception) {
            return false
        }
        return info.requestedPermissions?.contains(Manifest.permission.READ_CALENDAR) == true
    }

    private fun askedKey(): String = "one-native-calendar.asked"

    private fun wasAsked(): Boolean =
        context.getSharedPreferences("one-native-calendar", Activity.MODE_PRIVATE)
            .getBoolean(askedKey(), false)

    private fun markAsked() {
        context.getSharedPreferences("one-native-calendar", Activity.MODE_PRIVATE)
            .edit().putBoolean(askedKey(), true).apply()
    }

    companion object {
        private const val MAX_EXPANSION = 100_000
        private const val MAX_MS = 8_640_000_000_000_000.0
        private const val E_MANIFEST = "E_CALENDAR_MANIFEST"
        private const val E_PERMISSION = "E_CALENDAR_PERMISSION"
        private const val E_INPUT = "E_CALENDAR_INPUT"
        private const val E_FETCH = "E_CALENDAR_FETCH"
        private const val E_SAVE = "E_CALENDAR_SAVE"
        private const val E_DELETE = "E_CALENDAR_DELETE"
        private const val E_NOT_FOUND = "E_CALENDAR_NOT_FOUND"
        private const val E_UNAVAILABLE = "E_CALENDAR_UNAVAILABLE"
        private const val REQUEST_PERMISSION = 0x2D01
    }
}
