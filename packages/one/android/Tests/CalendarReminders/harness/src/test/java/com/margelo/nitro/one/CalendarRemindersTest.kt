package com.margelo.nitro.one

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import java.util.Calendar

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [33])
class CalendarRemindersTest {
    private lateinit var context: Context
    private lateinit var alarms: AlarmManager
    private lateinit var notifications: NotificationManager

    @Before fun setup() {
        context = RuntimeEnvironment.getApplication()
        shadowOf(RuntimeEnvironment.getApplication()).grantPermissions(Manifest.permission.POST_NOTIFICATIONS)
        context.packageManager.getApplicationInfo(context.packageName, PackageManager.GET_META_DATA)
            .metaData.putBoolean("one.calendar.reminders", true)
        alarms = context.getSystemService(AlarmManager::class.java)
        notifications = context.getSystemService(NotificationManager::class.java)
        // production has one store per process. close it between isolated apps.
        val field = OneCalendarReminders.javaClass.getDeclaredField("helper").apply { isAccessible = true }
        (field.get(OneCalendarReminders) as? android.database.sqlite.SQLiteOpenHelper)?.close()
        field.set(OneCalendarReminders, null)
    }

    @Test fun datedCrudSchedulesAndCancelsRealAlarm() {
        val due = System.currentTimeMillis() + 60_000.0
        val id = OneCalendarReminders.create(context, ReminderInput("  Test  ", due, null))
        val item = OneCalendarReminders.list(context, 100.0, false).single()
        assertEquals(id, item.identifier)
        assertEquals("Test", item.title)
        assertEquals(due, item.dueMs!!, 1.0)
        assertEquals(1, shadowOf(alarms).scheduledAlarms.size)
        assertEquals(AlarmManager.RTC_WAKEUP, shadowOf(alarms).scheduledAlarms.single().type)
        OneCalendarReminders.complete(context, id, true)
        assertTrue(shadowOf(alarms).scheduledAlarms.isEmpty())
        assertTrue(OneCalendarReminders.list(context, 100.0, false).isEmpty())
        assertTrue(OneCalendarReminders.list(context, 100.0, true).single().completed)
        OneCalendarReminders.complete(context, id, false)
        assertEquals(1, shadowOf(alarms).scheduledAlarms.size)
        OneCalendarReminders.remove(context, id)
        assertTrue(OneCalendarReminders.list(context, 100.0, true).isEmpty())
        assertTrue(shadowOf(alarms).scheduledAlarms.isEmpty())
        expectCode("E_REMINDERS_NOT_FOUND") { OneCalendarReminders.complete(context, id, false) }
        expectCode("E_REMINDERS_NOT_FOUND") { OneCalendarReminders.remove(context, id) }
    }

    @Test fun deliveryRejectsEarlyDeletedCompletedAndDuplicateBroadcasts() {
        val due = System.currentTimeMillis() - 1000.0
        val active = OneCalendarReminders.create(context, ReminderInput("Active", due, null))
        val deleted = OneCalendarReminders.create(context, ReminderInput("Deleted", due, null))
        val completed = OneCalendarReminders.create(context, ReminderInput("Completed", due, null))
        val future = OneCalendarReminders.create(context, ReminderInput("Future", due + 100_000, null))
        OneCalendarReminders.remove(context, deleted)
        OneCalendarReminders.complete(context, completed, true)
        for (id in listOf(future, deleted, completed, "missing")) OneCalendarReminders.deliver(context, id)
        assertEquals(0, shadowOf(notifications).size())
        OneCalendarReminders.deliver(context, active)
        assertEquals(1, shadowOf(notifications).size())
        assertEquals("Active", shadowOf(notifications).allNotifications.single().extras.getString("android.title"))
        notifications.cancelAll()
        OneCalendarReminders.deliver(context, active)
        assertEquals(0, shadowOf(notifications).size())
    }

    @Test fun undatedTasksHaveNoAlarmAndRevocationPreventsSuccess() {
        val id = OneCalendarReminders.create(context, ReminderInput("Undated", null, null))
        assertNull(OneCalendarReminders.list(context, 1.0, false).single().dueMs)
        assertTrue(shadowOf(alarms).scheduledAlarms.isEmpty())
        shadowOf(RuntimeEnvironment.getApplication()).denyPermissions(Manifest.permission.POST_NOTIFICATIONS)
        expectCode("E_REMINDERS_PERMISSION") { OneCalendarReminders.list(context, 100.0, true) }
        expectCode("E_REMINDERS_PERMISSION") { OneCalendarReminders.create(context, ReminderInput("Blocked", null, null)) }
        expectCode("E_REMINDERS_PERMISSION") { OneCalendarReminders.complete(context, id, true) }
        OneCalendarReminders.deliver(context, id)
        assertEquals(0, shadowOf(notifications).size())
    }

    @Test fun invalidInputsNeverCreateRowsOrAlarms() {
        for (input in listOf(
            ReminderInput(" ", null, null), ReminderInput("bad date", Double.NaN, null),
            ReminderInput("needs due", null, CalendarRecurrence(CalendarRecurrenceFrequency.DAILY, 1.0, null, 3.0)),
            ReminderInput("bad rule", 1000.0, CalendarRecurrence(CalendarRecurrenceFrequency.DAILY, 0.0, null, 3.0)),
            ReminderInput("two ends", 1000.0, CalendarRecurrence(CalendarRecurrenceFrequency.DAILY, 1.0, 2000.0, 3.0))
        )) expectCode("E_REMINDERS_INPUT") { OneCalendarReminders.create(context, input) }
        expectCode("E_REMINDERS_INPUT") { OneCalendarReminders.list(context, 0.0, false) }
        assertTrue(OneCalendarReminders.list(context, 100.0, true).isEmpty())
        assertTrue(shadowOf(alarms).scheduledAlarms.isEmpty())
    }

    @Test fun recurringCompletionAdvancesOnceAndHonorsCount() {
        val base = System.currentTimeMillis() + 60_000.0
        val rule = CalendarRecurrence(CalendarRecurrenceFrequency.DAILY, 2.0, null, 2.0)
        val id = OneCalendarReminders.create(context, ReminderInput("Repeat", base, rule))
        OneCalendarReminders.complete(context, id, true)
        OneCalendarReminders.complete(context, id, true)
        val next = OneCalendarReminders.list(context, 100.0, false).single()
        assertNotEquals(id, next.identifier)
        assertEquals(base + 2 * 86_400_000, next.dueMs!!, 1.0)
        assertEquals(rule, next.recurrence)
        OneCalendarReminders.complete(context, next.identifier, true)
        assertTrue(OneCalendarReminders.list(context, 100.0, false).isEmpty())
        assertEquals(2, OneCalendarReminders.list(context, 100.0, true).size)
        assertTrue(shadowOf(alarms).scheduledAlarms.isEmpty())
    }

    @Test fun monthlyRecurrenceSkipsInvalidDatesAndDateEndStopsProgression() {
        val base = Calendar.getInstance().apply { clear(); set(2026, Calendar.JANUARY, 31, 12, 0) }.timeInMillis
        val rule = CalendarRecurrence(CalendarRecurrenceFrequency.MONTHLY, 1.0, null, null)
        val next = OneCalendarReminders.nextDue(base, base, rule)!!
        val date = Calendar.getInstance().apply { timeInMillis = next }
        assertEquals(Calendar.MARCH, date.get(Calendar.MONTH))
        assertEquals(31, date.get(Calendar.DAY_OF_MONTH))
        assertNull(OneCalendarReminders.nextDue(base, base, rule.copy(endDateMs = next - 1.0)))
    }

    @Test fun rebootReschedulesOnlyUndeliveredIncompleteDatedTasks() {
        val past = System.currentTimeMillis() - 1000.0
        val delivered = OneCalendarReminders.create(context, ReminderInput("Sent", past, null))
        OneCalendarReminders.deliver(context, delivered)
        OneCalendarReminders.create(context, ReminderInput("Pending", past + 100_000, null))
        OneCalendarReminders.create(context, ReminderInput("Undated", null, null))
        for (alarm in shadowOf(alarms).scheduledAlarms.toList()) alarms.cancel(requireNotNull(alarm.operation))
        OneCalendarReminders.reschedule(context)
        assertEquals(1, shadowOf(alarms).scheduledAlarms.size)
    }

    private fun expectCode(code: String, action: () -> Any?) {
        try { action(); fail("expected $code") } catch (error: OneNativeError) {
            assertTrue(error.message.orEmpty(), error.message.orEmpty().startsWith("$code:"))
        }
    }
}
