package dev.onejs.onenative

import android.app.Activity
import android.os.Bundle
import com.margelo.nitro.one.HybridOneNotifications

// a scheduled notification's body tap opens this invisible activity first: it
// records the response before any app activity sees the tap, then opens the
// app. never exported, so only the notification's own pending intent reaches it.
class OneNativeNotificationTapActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        HybridOneNotifications.handleTap(this, intent)
        finish()
    }
}
