package dev.onejs.onenative

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.margelo.nitro.one.HybridOneNotifications

// alarm fires and boot re-arm for scheduled notifications. prebuild declares
// this receiver in the app manifest only when native.app.notifications is
// set; the library manifest stays empty.
class OneNativeNotificationsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED -> HybridOneNotifications.rearmAll(context)
            HybridOneNotifications.ACTION_ALARM -> {
                val identifier =
                    intent.getStringExtra(HybridOneNotifications.EXTRA_IDENTIFIER) ?: return
                HybridOneNotifications.fireAlarm(context.applicationContext, identifier)
            }
        }
    }
}
