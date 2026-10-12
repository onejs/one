package com.margelo.nitro.one

import android.app.Activity
import android.os.Bundle
import android.util.Log
import android.widget.TextView

// native fixture for the real production store, alarm and receiver. this is
// separate from the React fixture; it cannot establish Nitro/React proof.
class NativeHarness : Activity() {
    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        val result = try {
            when (intent.getStringExtra("operation")) {
                "schedule" -> {
                    val due = System.currentTimeMillis() + 30_000.0
                    val id = OneCalendarReminders.create(this, ReminderInput("Cold reminder proof", due, null))
                    val completed = OneCalendarReminders.create(this, ReminderInput("Must not deliver completed", due, null))
                    OneCalendarReminders.complete(this, completed, true)
                    val deleted = OneCalendarReminders.create(this, ReminderInput("Must not deliver deleted", due, null))
                    OneCalendarReminders.remove(this, deleted)
                    "SCHEDULED id=$id due=$due completed=$completed deleted=$deleted"
                }
                "read" -> OneCalendarReminders.list(this, 100.0, true).joinToString()
                else -> "READY"
            }
        } catch (error: Exception) { "FAIL $error" }
        Log.i("CalendarProof", result)
        setContentView(TextView(this).apply { text = result })
    }
}
