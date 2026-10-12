package com.margelo.nitro.one

import android.Manifest
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.net.Uri
import android.os.Build
import android.util.Log
import java.util.Calendar
import java.util.UUID

// android has no standalone reminders provider. tasks are app-owned; dated
// tasks use an immutable broadcast alarm, so delivery needs no React process.
// one lock serializes CRUD, alarm delivery and rescheduling in this process.
internal object OneCalendarReminders {
    const val CHANNEL = "one-calendar-reminders"
    private const val MAX_MS = 8_640_000_000_000_000.0
    private var helper: Store? = null

    private class Store(context: Context) : SQLiteOpenHelper(
        context.applicationContext, "one-calendar-reminders.db", null, 1
    ) {
        override fun onCreate(db: SQLiteDatabase) {
            db.execSQL("""CREATE TABLE reminders (
                id TEXT PRIMARY KEY, title TEXT NOT NULL, completed INTEGER NOT NULL DEFAULT 0,
                due INTEGER, frequency INTEGER, interval INTEGER, until_ms INTEGER, count INTEGER,
                base_due INTEGER, ordinal INTEGER NOT NULL DEFAULT 1, next_id TEXT,
                delivered INTEGER NOT NULL DEFAULT 0
            )""")
        }
        override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) = Unit
    }

    private fun db(context: Context): SQLiteDatabase {
        val store = helper ?: Store(context).also { helper = it }
        return store.writableDatabase
    }

    fun declared(context: Context): Boolean {
        @Suppress("DEPRECATION")
        val info = context.packageManager.getApplicationInfo(context.packageName, PackageManager.GET_META_DATA)
        return info.metaData?.getBoolean("one.calendar.reminders", false) == true
    }

    fun allowed(context: Context): Boolean {
        if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED) return false
        val manager = context.getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= 24 && !manager.areNotificationsEnabled()) return false
        return Build.VERSION.SDK_INT < 26 || manager.getNotificationChannel(CHANNEL)?.importance != NotificationManager.IMPORTANCE_NONE
    }

    fun requireAccess(context: Context, verb: String) {
        if (!declared(context)) throw OneNativeError("E_REMINDERS_MANIFEST", "Calendar.$verb: set native.app.calendar.remindersUsage")
        if (!allowed(context)) throw OneNativeError("E_REMINDERS_PERMISSION", "Calendar.$verb: notification access is required")
    }

    private fun failInput(verb: String): Nothing =
        throw OneNativeError("E_REMINDERS_INPUT", "Calendar.$verb: invalid reminder input")

    private fun row(cursor: Cursor): ReminderInfo {
        fun index(name: String) = cursor.getColumnIndexOrThrow(name)
        fun number(name: String): Double? = index(name).let { if (cursor.isNull(it)) null else cursor.getLong(it).toDouble() }
        val frequency = number("frequency")?.toInt()?.let { CalendarRecurrenceFrequency.entries[it] }
        return ReminderInfo(
            cursor.getString(index("id")), cursor.getString(index("title")),
            cursor.getInt(index("completed")) != 0, number("due"),
            frequency?.let { CalendarRecurrence(it, number("interval"), number("until_ms"), number("count")) }
        )
    }

    private fun find(db: SQLiteDatabase, id: String): ReminderInfo? =
        db.query("reminders", null, "id=?", arrayOf(id), null, null, null).use {
            if (it.moveToFirst()) row(it) else null
        }

    @Synchronized fun list(context: Context, limit: Double, includeCompleted: Boolean): Array<ReminderInfo> {
        requireAccess(context, "listReminders")
        if (!limit.isFinite() || limit < 1 || limit > 500 || limit != kotlin.math.floor(limit)) failInput("listReminders")
        return db(context).query(
            "reminders", null, if (includeCompleted) null else "completed=0", null,
            null, null, "due IS NULL, due ASC, id ASC", limit.toInt().toString()
        ).use { cursor -> buildList { while (cursor.moveToNext()) add(row(cursor)) }.toTypedArray() }
    }

    @Synchronized fun create(context: Context, input: ReminderInput): String {
        requireAccess(context, "createReminder")
        val title = input.title.trim()
        val due = input.dueMs
        if (title.isEmpty() || (due != null && (!due.isFinite() || kotlin.math.abs(due) > MAX_MS))) failInput("createReminder")
        val recurrence = input.recurrence
        if (recurrence != null) {
            val interval = recurrence.interval ?: 1.0
            val count = recurrence.occurrenceCount
            val until = recurrence.endDateMs
            if (due == null || !interval.isFinite() || interval < 1 || interval > 1000 || interval != kotlin.math.floor(interval) ||
                (count != null && (!count.isFinite() || count < 1 || count > 10000 || count != kotlin.math.floor(count))) ||
                (until != null && (!until.isFinite() || until < due || until > MAX_MS)) ||
                (count != null && until != null)) failInput("createReminder")
        }
        val id = UUID.randomUUID().toString()
        val item = ReminderInfo(id, title, false, due, recurrence?.copy(interval = recurrence.interval ?: 1.0))
        val database = db(context)
        database.beginTransaction()
        try {
            insert(database, item, due?.toLong(), 1)
            schedule(context, item)
            database.setTransactionSuccessful()
        } catch (error: Exception) {
            cancel(context, id)
            throw error
        } finally {
            database.endTransaction()
        }
        return id
    }

    private fun insert(database: SQLiteDatabase, item: ReminderInfo, base: Long?, ordinal: Int) {
        val values = ContentValues().apply {
            put("id", item.identifier)
            put("title", item.title)
            put("completed", if (item.completed) 1 else 0)
            put("due", item.dueMs?.toLong())
            put("frequency", item.recurrence?.frequency?.value)
            put("interval", item.recurrence?.interval?.toLong())
            put("until_ms", item.recurrence?.endDateMs?.toLong())
            put("count", item.recurrence?.occurrenceCount?.toLong())
            put("base_due", base)
            put("ordinal", ordinal)
        }
        database.insertOrThrow("reminders", null, values)
    }

    // advance from the original date, skipping invalid month days/leap years
    // rather than drifting a Jan 31 series onto Feb 28 and then March 28.
    internal fun nextDue(base: Long, current: Long, rule: CalendarRecurrence): Long? {
        val original = Calendar.getInstance().apply { timeInMillis = base }
        val field = when (rule.frequency) {
            CalendarRecurrenceFrequency.DAILY -> Calendar.DAY_OF_YEAR
            CalendarRecurrenceFrequency.WEEKLY -> Calendar.WEEK_OF_YEAR
            CalendarRecurrenceFrequency.MONTHLY -> Calendar.MONTH
            CalendarRecurrenceFrequency.YEARLY -> Calendar.YEAR
        }
        val interval = (rule.interval ?: 1.0).toInt()
        for (step in 1..100_000) {
            val candidate = (original.clone() as Calendar).apply { add(field, step * interval) }
            if ((field == Calendar.MONTH || field == Calendar.YEAR) &&
                candidate.get(Calendar.DAY_OF_MONTH) != original.get(Calendar.DAY_OF_MONTH)) continue
            if (field == Calendar.YEAR && candidate.get(Calendar.MONTH) != original.get(Calendar.MONTH)) continue
            val time = candidate.timeInMillis
            if (time <= current) continue
            if (time > MAX_MS || (rule.endDateMs != null && time > rule.endDateMs)) return null
            return time
        }
        throw OneNativeError("E_REMINDERS_SAVE", "Calendar.setReminderCompleted: recurrence exceeds expansion limit")
    }

    @Synchronized fun complete(context: Context, identifier: String, completed: Boolean) {
        requireAccess(context, "setReminderCompleted")
        val id = identifier.trim()
        if (id.isEmpty()) failInput("setReminderCompleted")
        val database = db(context)
        val item = find(database, id) ?: throw OneNativeError("E_REMINDERS_NOT_FOUND", "Calendar.setReminderCompleted: reminder was not found")
        if (item.completed == completed) return
        var next: ReminderInfo? = null
        database.beginTransaction()
        try {
            if (completed && item.recurrence != null && item.dueMs != null) {
                database.query("reminders", arrayOf("base_due", "ordinal", "next_id"), "id=?", arrayOf(id), null, null, null).use {
                    check(it.moveToFirst())
                    val ordinal = it.getInt(1)
                    if (it.isNull(2) && (item.recurrence.occurrenceCount == null || ordinal < item.recurrence.occurrenceCount)) {
                        nextDue(it.getLong(0), item.dueMs.toLong(), item.recurrence)?.let { due ->
                            val nextItem = item.copy(identifier = UUID.randomUUID().toString(), dueMs = due.toDouble())
                            insert(database, nextItem, it.getLong(0), ordinal + 1)
                            database.update("reminders", ContentValues().apply { put("next_id", nextItem.identifier) }, "id=?", arrayOf(id))
                            next = nextItem
                        }
                    }
                }
            }
            database.update("reminders", ContentValues().apply {
                put("completed", if (completed) 1 else 0)
                put("delivered", 0)
            }, "id=?", arrayOf(id))
            if (completed) cancel(context, id) else schedule(context, item.copy(completed = false))
            next?.let { schedule(context, it) }
            database.setTransactionSuccessful()
        } catch (error: Exception) {
            next?.let { cancel(context, it.identifier) }
            schedule(context, item)
            throw error
        } finally {
            database.endTransaction()
        }
    }

    @Synchronized fun remove(context: Context, identifier: String) {
        requireAccess(context, "deleteReminder")
        val id = identifier.trim()
        if (id.isEmpty()) failInput("deleteReminder")
        val database = db(context)
        if (find(database, id) == null) throw OneNativeError("E_REMINDERS_NOT_FOUND", "Calendar.deleteReminder: reminder was not found")
        cancel(context, id)
        database.delete("reminders", "id=?", arrayOf(id))
    }

    private fun alarm(context: Context, id: String): PendingIntent = PendingIntent.getBroadcast(
        context, 0,
        Intent(context, OneCalendarReminderReceiver::class.java).apply {
            action = "one.calendar.REMINDER"
            data = Uri.Builder().scheme("one-reminder").authority(context.packageName).appendPath(id).build()
        },
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    private fun schedule(context: Context, item: ReminderInfo) {
        if (item.completed || item.dueMs == null) return
        context.getSystemService(AlarmManager::class.java).setAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP, item.dueMs.toLong().coerceAtLeast(System.currentTimeMillis()), alarm(context, item.identifier)
        )
    }

    private fun cancel(context: Context, id: String) {
        context.getSystemService(AlarmManager::class.java).cancel(alarm(context, id))
        context.getSystemService(NotificationManager::class.java).cancel(id, 0)
    }

    @Synchronized fun reschedule(context: Context) {
        val database = db(context)
        database.query("reminders", null, "completed=0 AND delivered=0 AND due IS NOT NULL", null, null, null, null).use {
            while (it.moveToNext()) schedule(context, row(it))
        }
    }

    @Synchronized fun deliver(context: Context, id: String) {
        if (!declared(context) || !allowed(context)) return
        val database = db(context)
        database.query("reminders", null, "id=? AND completed=0 AND delivered=0 AND due<=?", arrayOf(id, System.currentTimeMillis().toString()), null, null, null).use {
            if (!it.moveToFirst()) return
            val item = row(it)
            val manager = context.getSystemService(NotificationManager::class.java)
            if (Build.VERSION.SDK_INT >= 26) manager.createNotificationChannel(
                NotificationChannel(CHANNEL, "Reminders", NotificationManager.IMPORTANCE_DEFAULT)
            )
            val builder = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(context, CHANNEL) else {
                @Suppress("DEPRECATION")
                Notification.Builder(context)
            }
            builder.setSmallIcon(android.R.drawable.ic_popup_reminder).setContentTitle(item.title)
                .setCategory(Notification.CATEGORY_REMINDER).setAutoCancel(true)
            context.packageManager.getLaunchIntentForPackage(context.packageName)?.let { launch ->
                builder.setContentIntent(PendingIntent.getActivity(context, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
            }
            manager.notify(id, 0, builder.build())
            database.update("reminders", ContentValues().apply { put("delivered", 1) }, "id=?", arrayOf(id))
        }
    }
}

class OneCalendarReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val pending = goAsync()
        Thread {
            try {
                when (intent.action) {
                    Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED -> OneCalendarReminders.reschedule(context)
                    "one.calendar.REMINDER" -> intent.data?.lastPathSegment?.let { OneCalendarReminders.deliver(context, it) }
                }
            } catch (error: Exception) {
                Log.e("OneCalendar", "reminder delivery failed", error)
            } finally {
                pending.finish()
            }
        }.start()
    }
}
