package com.margelo.nitro.one

import android.Manifest
import android.app.Activity
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.AnyMap
import com.margelo.nitro.core.Promise
import dev.onejs.onenative.OneNativeNotificationTapActivity
import dev.onejs.onenative.OneNativeNotificationsReceiver
import dev.onejs.onenative.OneNativePush
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

// local notifications, android half: permission, badge stubs, channels,
// foreground presentation, received and response callbacks, scheduling with
// alarmmanager. the ios half is HybridOneNotifications.swift. calls arrive
// on the js thread and lifecycle callbacks on the ui thread; the pending
// deliveries and listeners are only touched under the pending lock.
class HybridOneNotifications :
    HybridOneNotificationsSpec(),
    LifecycleEventListener,
    PermissionListener {
    private var permissionPromise: Promise<NativePermissionResponse>? = null
    private val pending = mutableMapOf<String, PendingDelivery>()
    private var listeners: Listeners? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    private class Listeners(
        val onReceived: (String, NativeNotification) -> Unit,
        val onResponse: (NativeNotificationResponse) -> Unit,
        val onPushToken: (NativePushToken) -> Unit
    )

    private class PendingDelivery(
        val schedule: StoredSchedule,
        val timeout: Runnable
    )

    private data class TapResponse(
        val identifier: String,
        val title: String?,
        val subtitle: String?,
        val body: String?,
        val dataJson: String,
        val sound: Boolean,
        val badge: Int?,
        val triggerJson: String,
        val dateMs: Long,
        val actionIdentifier: String = DEFAULT_ACTION_IDENTIFIER,
        val userText: String? = null,
        val categoryIdentifier: String? = null
    )

    private val context: ReactApplicationContext
        get() = NitroModules.applicationContext
            ?: throw IllegalStateException("Notifications: the react context is not ready")

    private val activityListener =
        object : BaseActivityEventListener() {
            override fun onNewIntent(intent: Intent) {
                context.currentActivity?.intent = intent
                harvestTap(intent)
            }
        }

    init {
        NitroModules.applicationContext?.let {
            it.addActivityEventListener(activityListener)
            it.addLifecycleEventListener(this)
        }
        instance = this
    }

    override fun dispose() {
        NitroModules.applicationContext?.let {
            it.removeActivityEventListener(activityListener)
            it.removeLifecycleEventListener(this)
        }
        if (instance === this) instance = null
        permissionPromise?.reject(
            OneNativeError(E_PERMISSIONS, "notification authorization was cancelled")
        )
        permissionPromise = null
        synchronized(pending) {
            for (delivery in pending.values) mainHandler.removeCallbacks(delivery.timeout)
            pending.clear()
            listeners = null
        }
        super.dispose()
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ): Boolean {
        if (requestCode != PERMISSION_REQUEST_CODE) return false
        val promise = permissionPromise ?: return false
        permissionPromise = null
        markAsked()
        promise.resolve(permissionPayload(context.currentActivity))
        return true
    }

    override fun onHostResume() {
        harvestTap(context.currentActivity?.intent)
    }

    override fun onHostPause() {}

    override fun onHostDestroy() {}

    private fun prefs() = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    private fun markAsked() {
        prefs().edit().putBoolean(KEY_ASKED, true).apply()
    }

    private fun permissionPayload(activity: Activity?): NativePermissionResponse {
        val granted =
            if (Build.VERSION.SDK_INT >= 33) {
                ContextCompat.checkSelfPermission(
                    context,
                    Manifest.permission.POST_NOTIFICATIONS
                ) == PackageManager.PERMISSION_GRANTED
            } else {
                NotificationManagerCompat.from(context).areNotificationsEnabled()
            }
        val asked = prefs().getBoolean(KEY_ASKED, false)
        // below 13 there is no runtime prompt, so nothing is askable; on 13+
        // the user can still be asked until they deny with no further prompt.
        val canAskAgain =
            if (granted || Build.VERSION.SDK_INT < 33) {
                false
            } else if (!asked) {
                true
            } else {
                activity?.let {
                    ActivityCompat.shouldShowRequestPermissionRationale(
                        it,
                        Manifest.permission.POST_NOTIFICATIONS
                    )
                } ?: true
            }
        val status =
            if (granted) {
                NotificationPermissionStatus.GRANTED
            } else if (!asked) {
                NotificationPermissionStatus.UNDETERMINED
            } else {
                NotificationPermissionStatus.DENIED
            }
        return NativePermissionResponse(status, granted, canAskAgain, null)
    }

    override fun getPermissions(): Promise<NativePermissionResponse> =
        Promise.resolved(permissionPayload(context.currentActivity))

    override fun requestPermissions(
        options: NativePermissionRequest
    ): Promise<NativePermissionResponse> {
        // options carry ios-only fields; android prompts unconditionally.
        if (Build.VERSION.SDK_INT < 33) {
            return Promise.resolved(permissionPayload(null))
        }
        val activity =
            context.currentActivity
                ?: return Promise.rejected(
                    OneNativeError(
                        E_PERMISSIONS,
                        "notification authorization needs a foreground activity"
                    )
                )
        if (
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            return Promise.resolved(permissionPayload(activity))
        }
        if (permissionPromise != null) {
            return Promise.rejected(
                OneNativeError(
                    E_PERMISSIONS,
                    "a notification authorization request is already in flight"
                )
            )
        }
        val promise = Promise<NativePermissionResponse>()
        permissionPromise = promise
        val aware = activity as? PermissionAwareActivity
        if (aware != null) {
            aware.requestPermissions(
                arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                PERMISSION_REQUEST_CODE,
                this
            )
        } else {
            ActivityCompat.requestPermissions(
                activity,
                arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                PERMISSION_REQUEST_CODE
            )
        }
        return promise
    }

    // the launcher owns badges on android.
    override fun getBadgeCount(): Promise<Double> = Promise.resolved(0.0)

    override fun setBadgeCount(count: Double): Promise<Boolean> = Promise.resolved(false)

    override fun getDevicePushToken(): Promise<NativePushToken> {
        // the fetch lives in the push/nopush source set: without
        // native.app.notifications.push this rejects and firebase stays
        // out of the app entirely.
        val promise = Promise<NativePushToken>()
        OneNativePush.getToken(
            context,
            onResult = { token ->
                if (token.isNullOrEmpty()) {
                    promise.reject(
                        OneNativeError(E_PUSH_TOKEN, "fetching the push token returned nothing")
                    )
                } else {
                    promise.resolve(NativePushToken("android", token))
                }
            },
            onError = { error ->
                promise.reject(
                    OneNativeError(E_PUSH_TOKEN, error.message ?: "fetching the push token failed")
                )
            }
        )
        return promise
    }

    private fun channelPayload(channel: NotificationChannel?): NativeChannel? {
        if (channel == null) return null
        return NativeChannel(
            channel.id,
            channel.name?.toString() ?: channel.id,
            channel.importance.toDouble(),
            channel.description,
            channel.sound != null,
            channel.vibrationPattern?.let { pattern ->
                DoubleArray(pattern.size) { index -> pattern[index].toDouble() }
            },
            channel.canShowBadge()
        )
    }

    override fun setNotificationChannel(
        channelId: String,
        channel: NativeChannelInput
    ): Promise<NativeChannel?> {
        if (Build.VERSION.SDK_INT < 26) return Promise.resolved(null)
        val manager = NotificationManagerCompat.from(context)
        val nativeChannel =
            NotificationChannel(channelId, channel.name, channel.importance.toInt())
        channel.description?.let { nativeChannel.description = it }
        if (channel.sound == false) {
            nativeChannel.setSound(null, null)
        }
        channel.vibrationPattern?.let { pattern ->
            nativeChannel.vibrationPattern =
                LongArray(pattern.size) { index -> pattern[index].toLong() }
        }
        channel.showBadge?.let { nativeChannel.setShowBadge(it) }
        manager.createNotificationChannel(nativeChannel)
        return Promise.resolved(channelPayload(manager.getNotificationChannel(channelId)))
    }

    override fun getNotificationChannel(channelId: String): Promise<NativeChannel?> {
        if (Build.VERSION.SDK_INT < 26) return Promise.resolved(null)
        val manager = NotificationManagerCompat.from(context)
        return Promise.resolved(channelPayload(manager.getNotificationChannel(channelId)))
    }

    override fun getNotificationChannels(): Promise<Array<NativeChannel>> {
        if (Build.VERSION.SDK_INT < 26) return Promise.resolved(emptyArray())
        val manager = NotificationManagerCompat.from(context)
        return Promise.resolved(
            manager.notificationChannels.mapNotNull { channelPayload(it) }.toTypedArray()
        )
    }

    override fun deleteNotificationChannel(channelId: String): Promise<Unit> {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManagerCompat.from(context).deleteNotificationChannel(channelId)
        }
        return Promise.resolved(Unit)
    }

    // interactive categories live in shared preferences as json, so action
    // taps resolve them even when the process started for the tap. unknown
    // schedule category ids post without actions, like expo.
    override fun setNotificationCategory(
        category: NativeNotificationCategory
    ): Promise<NativeNotificationCategory> {
        if (category.identifier.isEmpty()) {
            return Promise.rejected(
                OneNativeError(
                    E_CATEGORY,
                    "Notifications.setCategory: identifier must be a non-empty string"
                )
            )
        }
        categoryPrefs(context).edit().putString(category.identifier, categoryToJson(category)).apply()
        return Promise.resolved(category)
    }

    override fun getNotificationCategories(): Promise<Array<NativeNotificationCategory>> =
        Promise.resolved(storedCategories(context))

    override fun deleteNotificationCategory(identifier: String): Promise<Boolean> {
        val prefs = categoryPrefs(context)
        if (!prefs.contains(identifier)) return Promise.resolved(false)
        prefs.edit().remove(identifier).apply()
        return Promise.resolved(true)
    }

    private fun categoryPrefs(context: Context) =
        context.getSharedPreferences(PREFS_CATEGORIES, Context.MODE_PRIVATE)

    // installing the listeners is what tells deliverNow that handing an
    // arrival to js reaches anyone.
    override fun setListeners(
        onReceived: (requestId: String, notification: NativeNotification) -> Unit,
        onResponse: (response: NativeNotificationResponse) -> Unit,
        onPushToken: (token: NativePushToken) -> Unit
    ) {
        synchronized(pending) { listeners = Listeners(onReceived, onResponse, onPushToken) }
    }

    private fun currentListeners(): Listeners? = synchronized(pending) { listeners }

    // one delivery path for immediate posts and alarm fires: foreground with
    // someone listening goes through the js handler round trip, everything
    // else posts straight to the shade.
    private fun deliverNow(delivery: StoredSchedule, dateMs: Long) {
        val listeners = currentListeners()
        if (listeners != null && isForeground(context)) {
            val requestId = UUID.randomUUID().toString()
            val timeout = Runnable {
                // js stalled: show everything, like expo, rather than drop.
                val stalled = synchronized(pending) { pending.remove(requestId) } ?: return@Runnable
                try {
                    postStatic(context, stalled.schedule, true)
                } catch (error: SecurityException) {
                    // permission revoked between arrival and timeout.
                }
            }
            synchronized(pending) { pending[requestId] = PendingDelivery(delivery, timeout) }
            mainHandler.postDelayed(timeout, PRESENT_TIMEOUT_MS)
            listeners.onReceived(
                requestId,
                notification(
                    delivery.identifier,
                    delivery.title,
                    delivery.subtitle,
                    delivery.body,
                    delivery.dataJson,
                    delivery.sound,
                    delivery.badge,
                    delivery.triggerJson,
                    dateMs
                )
            )
            return
        }
        postStatic(context, delivery, false)
    }

    override fun presentNotification(requestId: String, behavior: NotificationBehavior) {
        val delivery =
            synchronized(pending) {
                val found = pending.remove(requestId)
                if (found != null) mainHandler.removeCallbacks(found.timeout)
                found
            }
        // unknown ids stay quiet: the delivery already timed out.
        if (delivery != null && (behavior.shouldShowBanner || behavior.shouldShowList)) {
            try {
                postStatic(context, delivery.schedule, behavior.shouldShowBanner)
            } catch (error: SecurityException) {
                // permission revoked between arrival and answer.
            }
        }
    }

    override fun scheduleNotification(request: NativeScheduleInput): Promise<String> {
        val content = request.content
        val identifier = request.identifier ?: UUID.randomUUID().toString()
        val trigger = request.trigger
        val channelId = trigger?.channelId
        val dataJson = content.data?.let { JSONObject(it.toHashMap()).toString() } ?: "{}"
        val badge = content.badge?.toInt()
        val sound = content.sound == true
        val categoryIdentifier = content.categoryIdentifier
        val now = System.currentTimeMillis()
        if (trigger == null) {
            val delivery =
                StoredSchedule(
                    identifier,
                    content.title,
                    content.subtitle,
                    content.body,
                    dataJson,
                    sound,
                    badge,
                    channelId,
                    IMMEDIATE_TRIGGER_JSON,
                    "immediate",
                    0.0,
                    false,
                    now,
                    categoryIdentifier
                )
            try {
                deliverNow(delivery, now)
            } catch (error: SecurityException) {
                return Promise.rejected(
                    OneNativeError(
                        E_SCHEDULE,
                        "posting the notification failed: request permission first"
                    )
                )
            }
            return Promise.resolved(identifier)
        }
        val fireAtMs: Long
        val triggerJson: String
        val kind: String
        val seconds: Double
        val repeats: Boolean
        when (trigger.type) {
            "timeInterval" -> {
                seconds = trigger.seconds ?: 0.0
                if (seconds <= 0) {
                    return Promise.rejected(
                        OneNativeError(E_TRIGGER, "timeInterval seconds must be positive")
                    )
                }
                repeats = trigger.repeats == true
                fireAtMs = now + (seconds * 1000).toLong()
                triggerJson =
                    JSONObject()
                        .put("type", "timeInterval")
                        .put("seconds", seconds)
                        .put("repeats", repeats)
                        .toString()
                kind = "interval"
            }
            "date" -> {
                val date =
                    trigger.date
                        ?: return Promise.rejected(
                            OneNativeError(E_TRIGGER, "date triggers need a date timestamp")
                        )
                fireAtMs = date.toLong()
                seconds = 0.0
                repeats = false
                triggerJson = JSONObject().put("type", "date").put("date", fireAtMs).toString()
                kind = "date"
            }
            else -> {
                return Promise.rejected(
                    OneNativeError(E_TRIGGER, "unknown trigger type ${trigger.type}")
                )
            }
        }
        val schedule =
            StoredSchedule(
                identifier,
                content.title,
                content.subtitle,
                content.body,
                dataJson,
                sound,
                badge,
                channelId,
                triggerJson,
                kind,
                seconds,
                repeats,
                fireAtMs,
                categoryIdentifier
            )
        // a past date delivers immediately, like ios.
        if (fireAtMs <= now) {
            try {
                deliverNow(schedule.copy(fireAtMs = now), now)
            } catch (error: SecurityException) {
                return Promise.rejected(
                    OneNativeError(
                        E_SCHEDULE,
                        "posting the notification failed: request permission first"
                    )
                )
            }
            return Promise.resolved(identifier)
        }
        // rescheduling an identifier replaces it, like ios.
        saveSchedule(context, schedule)
        setAlarm(context, identifier, fireAtMs)
        return Promise.resolved(identifier)
    }

    override fun cancelScheduledNotification(identifier: String): Promise<Unit> {
        cancelAlarm(context, identifier)
        removeSchedule(context, identifier)
        return Promise.resolved(Unit)
    }

    override fun cancelAllScheduledNotifications(): Promise<Unit> {
        for (schedule in loadSchedules(context)) {
            cancelAlarm(context, schedule.identifier)
        }
        clearSchedules(context)
        return Promise.resolved(Unit)
    }

    override fun getAllScheduledNotifications(): Promise<Array<NativeNotificationRequest>> =
        Promise.resolved(
            loadSchedules(context)
                .map { schedule ->
                    NativeNotificationRequest(
                        schedule.identifier,
                        content(
                            schedule.title,
                            schedule.subtitle,
                            schedule.body,
                            schedule.dataJson,
                            schedule.sound,
                            schedule.badge,
                            schedule.categoryIdentifier
                        ),
                        trigger(schedule.triggerJson)
                    )
                }
                .toTypedArray()
        )

    override fun getPresentedNotifications(): Promise<Array<NativeNotification>> {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        return Promise.resolved(
            manager.activeNotifications
                .mapNotNull { exposed ->
                    val extras = exposed.notification.extras ?: android.os.Bundle()
                    val identifier =
                        extras.getString(EXTRA_IDENTIFIER) ?: exposed.tag ?: return@mapNotNull null
                    notification(
                        identifier,
                        extras.getCharSequence(android.app.Notification.EXTRA_TITLE)?.toString(),
                        extras.getCharSequence(android.app.Notification.EXTRA_SUB_TEXT)?.toString(),
                        extras.getCharSequence(android.app.Notification.EXTRA_TEXT)?.toString(),
                        extras.getString(EXTRA_DATA) ?: "{}",
                        extras.getBoolean(EXTRA_SOUND, false),
                        if (extras.containsKey(EXTRA_BADGE)) extras.getInt(EXTRA_BADGE) else null,
                        extras.getString(EXTRA_TRIGGER),
                        exposed.postTime,
                        extras.getString(EXTRA_CATEGORY)
                    )
                }
                .toTypedArray()
        )
    }

    override fun dismissNotification(identifier: String): Promise<Unit> {
        NotificationManagerCompat.from(context).cancel(identifier, 0)
        return Promise.resolved(Unit)
    }

    override fun dismissAllNotifications(): Promise<Unit> {
        NotificationManagerCompat.from(context).cancelAll()
        return Promise.resolved(Unit)
    }

    private fun harvestTap(intent: Intent?) {
        if (intent == null || !intent.getBooleanExtra(EXTRA_TAP, false)) return
        // consumed at once: onNewIntent and onHostResume both report a tap.
        intent.removeExtra(EXTRA_TAP)
        val response = tapResponse(intent, intent.getStringExtra(EXTRA_USER_TEXT)) ?: return
        lastResponse = response
        currentListeners()?.onResponse?.invoke(responsePayload(response))
    }

    // an action-button tap from the receiver: records the response with its
    // action identifier (and typed text for text-input actions), emits to
    // live listeners, and foregrounds the app when the action asks for it.
    fun handleAction(context: Context, intent: Intent) {
        val results = androidx.core.app.RemoteInput.getResultsFromIntent(intent)
        val response =
            tapResponse(
                intent,
                results?.getCharSequence(EXTRA_USER_TEXT)?.toString()
                    ?: intent.getStringExtra(EXTRA_USER_TEXT)
            ) ?: return
        lastResponse = response
        currentListeners()?.onResponse?.invoke(responsePayload(response))
        if (intent.getBooleanExtra(EXTRA_FOREGROUND, true)) {
            foregroundWithResponse(context, response, null)
        }
        NotificationManagerCompat.from(context)
            .cancel(response.identifier, 0)
    }

    private fun responsePayload(response: TapResponse): NativeNotificationResponse =
        NativeNotificationResponse(
            notification(
                response.identifier,
                response.title,
                response.subtitle,
                response.body,
                response.dataJson,
                response.sound,
                response.badge,
                response.triggerJson,
                response.dateMs,
                response.categoryIdentifier
            ),
            response.actionIdentifier,
            response.userText
        )

    override fun getLastNotificationResponse(): NativeNotificationResponse? {
        // a cold-start tap lands in the launch intent before any resume.
        harvestTap(context.currentActivity?.intent)
        return lastResponse?.let { responsePayload(it) }
    }

    override fun clearLastNotificationResponse() {
        lastResponse = null
    }

    companion object {
        const val ACTION_ALARM = "dev.onejs.onenative.NOTIFICATION_ALARM"
        const val ACTION_RESPONSE = "dev.onejs.onenative.NOTIFICATION_RESPONSE"
        const val EXTRA_IDENTIFIER = "dev.onejs.onenative.EXTRA_IDENTIFIER"
        const val EXTRA_ACTION = "dev.onejs.onenative.EXTRA_ACTION"
        const val EXTRA_USER_TEXT = "dev.onejs.onenative.EXTRA_USER_TEXT"
        const val EXTRA_FOREGROUND = "dev.onejs.onenative.EXTRA_FOREGROUND"

        // the live hybrid object, for the alarm receiver and the push
        // service, which the os starts outside any js call.
        @Volatile
        private var instance: HybridOneNotifications? = null

        // the last response lives on the companion, so an action tap that
        // starts the process still answers getLastNotificationResponse once
        // js creates the hybrid.
        @Volatile
        private var lastResponse: TapResponse? = null
        private const val PREFS = "one_native_notifications"
        private const val PREFS_SCHEDULES = "one_native_notifications_schedules"
        private const val PREFS_CATEGORIES = "one_native_notification_categories"
        private const val KEY_ASKED = "permission_asked"
        private const val PERMISSION_REQUEST_CODE = 7401
        private const val E_PERMISSIONS = "E_NOTIFICATIONS_PERMISSION"
        private const val E_TRIGGER = "E_NOTIFICATIONS_TRIGGER"
        private const val E_SCHEDULE = "E_NOTIFICATIONS_SCHEDULE"
        private const val E_PUSH_TOKEN = "E_NOTIFICATIONS_PUSH_TOKEN"
        private const val E_CATEGORY = "E_NOTIFICATIONS_CATEGORY"
        private const val DEFAULT_CHANNEL_ID = "default"
        private const val DEFAULT_ACTION_IDENTIFIER = "expo.modules.notifications.actions.DEFAULT"
        private const val EXTRA_TAP = "dev.onejs.onenative.EXTRA_TAP"
        private const val EXTRA_TITLE = "dev.onejs.onenative.EXTRA_TITLE"
        private const val EXTRA_SUBTITLE = "dev.onejs.onenative.EXTRA_SUBTITLE"
        private const val EXTRA_BODY = "dev.onejs.onenative.EXTRA_BODY"
        private const val EXTRA_DATA = "dev.onejs.onenative.EXTRA_DATA"
        private const val EXTRA_SOUND = "dev.onejs.onenative.EXTRA_SOUND"
        private const val EXTRA_BADGE = "dev.onejs.onenative.EXTRA_BADGE"
        private const val EXTRA_TRIGGER = "dev.onejs.onenative.EXTRA_TRIGGER"
        private const val EXTRA_CATEGORY = "dev.onejs.onenative.EXTRA_CATEGORY"
        private const val PRESENT_TIMEOUT_MS = 3000L
        private const val IMMEDIATE_TRIGGER_JSON =
            "{\"type\":\"timeInterval\",\"seconds\":0,\"repeats\":false}"

        private fun content(
            title: String?,
            subtitle: String?,
            body: String?,
            dataJson: String,
            sound: Boolean,
            badge: Int?,
            categoryIdentifier: String? = null
        ): NativeContent =
            NativeContent(
                title,
                subtitle,
                body,
                AnyMap.fromMap(plainObject(JSONObject(dataJson)), true),
                sound,
                badge?.toDouble(),
                categoryIdentifier
            )

        // stored triggers are the json the schedule was written with; a
        // presented notification without one reports unknown.
        private fun trigger(triggerJson: String?): NativeTrigger {
            val json =
                triggerJson?.let { JSONObject(it) }
                    ?: return NativeTrigger(NativeTriggerType.UNKNOWN, null, null, null)
            return when (json.optString("type")) {
                "timeInterval" ->
                    NativeTrigger(
                        NativeTriggerType.TIMEINTERVAL,
                        json.optDouble("seconds", 0.0),
                        json.optBoolean("repeats", false),
                        null
                    )
                "date" -> NativeTrigger(NativeTriggerType.DATE, null, null, json.optDouble("date"))
                "push" -> NativeTrigger(NativeTriggerType.PUSH, null, null, null)
                else -> NativeTrigger(NativeTriggerType.UNKNOWN, null, null, null)
            }
        }

        private fun notification(
            identifier: String,
            title: String?,
            subtitle: String?,
            body: String?,
            dataJson: String,
            sound: Boolean,
            badge: Int?,
            triggerJson: String?,
            dateMs: Long,
            categoryIdentifier: String? = null
        ): NativeNotification =
            NativeNotification(
                NativeNotificationRequest(
                    identifier,
                    content(title, subtitle, body, dataJson, sound, badge, categoryIdentifier),
                    trigger(triggerJson)
                ),
                dateMs.toDouble()
            )

        // stored json back to plain maps and lists for AnyMap. longs become
        // doubles: js numbers, never bigints.
        private fun plainValue(value: Any?): Any? =
            when (value) {
                null, JSONObject.NULL -> null
                is JSONObject -> plainObject(value)
                is JSONArray -> List(value.length()) { index -> plainValue(value.get(index)) }
                is Long -> value.toDouble()
                else -> value
            }

        private fun plainObject(json: JSONObject): Map<String, Any?> =
            json.keys().asSequence().associateWith { key -> plainValue(json.get(key)) }

        private data class StoredSchedule(
            val identifier: String,
            val title: String?,
            val subtitle: String?,
            val body: String?,
            val dataJson: String,
            val sound: Boolean,
            val badge: Int?,
            val channelId: String?,
            val triggerJson: String,
            val kind: String,
            val seconds: Double,
            val repeats: Boolean,
            val fireAtMs: Long,
            val categoryIdentifier: String? = null
        ) {
            fun toJson(): String =
                JSONObject()
                    .put("identifier", identifier)
                    .put("title", title ?: JSONObject.NULL)
                    .put("subtitle", subtitle ?: JSONObject.NULL)
                    .put("body", body ?: JSONObject.NULL)
                    .put("dataJson", dataJson)
                    .put("sound", sound)
                    .put("badge", badge ?: JSONObject.NULL)
                    .put("channelId", channelId ?: JSONObject.NULL)
                    .put("triggerJson", triggerJson)
                    .put("kind", kind)
                    .put("seconds", seconds)
                    .put("repeats", repeats)
                    .put("fireAtMs", fireAtMs)
                    .put("categoryIdentifier", categoryIdentifier ?: JSONObject.NULL)
                    .toString()

            companion object {
                fun fromJson(raw: String): StoredSchedule? =
                    try {
                        val json = JSONObject(raw)
                        StoredSchedule(
                            json.getString("identifier"),
                            if (json.isNull("title")) null else json.getString("title"),
                            if (json.isNull("subtitle")) null else json.getString("subtitle"),
                            if (json.isNull("body")) null else json.getString("body"),
                            json.getString("dataJson"),
                            json.getBoolean("sound"),
                            if (json.isNull("badge")) null else json.getInt("badge"),
                            if (json.isNull("channelId")) null else json.getString("channelId"),
                            json.getString("triggerJson"),
                            json.getString("kind"),
                            json.getDouble("seconds"),
                            json.getBoolean("repeats"),
                            json.getLong("fireAtMs"),
                            // written before categories existed: those
                            // schedules carry no category.
                            if (!json.has("categoryIdentifier") || json.isNull("categoryIdentifier")) {
                                null
                            } else {
                                json.getString("categoryIdentifier")
                            }
                        )
                    } catch (error: Exception) {
                        null
                    }
            }
        }

        private fun categoryPrefs(context: Context) =
            context.getSharedPreferences(PREFS_CATEGORIES, Context.MODE_PRIVATE)

        private fun storedCategory(
            context: Context,
            identifier: String?
        ): NativeNotificationCategory? {
            if (identifier == null) return null
            val raw = categoryPrefs(context).getString(identifier, null) ?: return null
            return categoryFromJson(raw)
        }

        private fun storedCategories(context: Context): Array<NativeNotificationCategory> =
            categoryPrefs(context).all.mapNotNull { (_, raw) ->
                (raw as? String)?.let { categoryFromJson(it) }
            }.toTypedArray()

        private fun categoryToJson(category: NativeNotificationCategory): String {
            val actions = JSONArray()
            for (action in category.actions) {
                actions.put(
                    JSONObject()
                        .put("identifier", action.identifier)
                        .put("buttonTitle", action.buttonTitle)
                        .put("authenticationRequired", action.authenticationRequired)
                        .put("destructive", action.destructive)
                        .put("foreground", action.foreground)
                        .put("textInputPlaceholder", action.textInputPlaceholder ?: JSONObject.NULL)
                        .put("textInputSubmitTitle", action.textInputSubmitTitle ?: JSONObject.NULL)
                )
            }
            val options = category.options
            return JSONObject()
                .put("identifier", category.identifier)
                .put("actions", actions)
                .put(
                    "options",
                    if (options == null) {
                        JSONObject.NULL
                    } else {
                        JSONObject()
                            .put("allowInCarPlay", options.allowInCarPlay)
                            .put("categorySummaryFormat", options.categorySummaryFormat)
                            .put("customDismissAction", options.customDismissAction)
                            .put(
                                "intentIdentifiers",
                                if (options.intentIdentifiers == null) {
                                    JSONObject.NULL
                                } else {
                                    JSONArray(options.intentIdentifiers)
                                }
                            )
                            .put("previewPlaceholder", options.previewPlaceholder)
                            .put("showTitle", options.showTitle)
                            .put("showSubtitle", options.showSubtitle)
                    }
                )
                .toString()
        }

        private fun categoryFromJson(raw: String): NativeNotificationCategory? {
            return try {
                val json = JSONObject(raw)
                val actions = mutableListOf<NativeNotificationAction>()
                val stored = json.getJSONArray("actions")
                for (index in 0 until stored.length()) {
                    val item = stored.getJSONObject(index)
                    actions.add(
                        NativeNotificationAction(
                            item.getString("identifier"),
                            item.getString("buttonTitle"),
                            item.optBoolean("authenticationRequired", false),
                            item.optBoolean("destructive", false),
                            item.optBoolean("foreground", true),
                            if (item.isNull("textInputPlaceholder")) {
                                null
                            } else {
                                item.getString("textInputPlaceholder")
                            },
                            if (item.isNull("textInputSubmitTitle")) {
                                null
                            } else {
                                item.getString("textInputSubmitTitle")
                            }
                        )
                    )
                }
                val options =
                    if (json.isNull("options")) {
                        null
                    } else {
                        val storedOptions = json.getJSONObject("options")
                        val intents =
                            if (storedOptions.isNull("intentIdentifiers")) {
                                null
                            } else {
                                val array = storedOptions.getJSONArray("intentIdentifiers")
                                Array(array.length()) { index -> array.getString(index) }
                            }
                        NativeNotificationCategoryOptions(
                            if (storedOptions.isNull("allowInCarPlay")) {
                                null
                            } else {
                                storedOptions.getBoolean("allowInCarPlay")
                            },
                            if (storedOptions.isNull("categorySummaryFormat")) {
                                null
                            } else {
                                storedOptions.getString("categorySummaryFormat")
                            },
                            if (storedOptions.isNull("customDismissAction")) {
                                null
                            } else {
                                storedOptions.getBoolean("customDismissAction")
                            },
                            intents,
                            if (storedOptions.isNull("previewPlaceholder")) {
                                null
                            } else {
                                storedOptions.getString("previewPlaceholder")
                            },
                            if (storedOptions.isNull("showTitle")) {
                                null
                            } else {
                                storedOptions.getBoolean("showTitle")
                            },
                            if (storedOptions.isNull("showSubtitle")) {
                                null
                            } else {
                                storedOptions.getBoolean("showSubtitle")
                            }
                        )
                    }
                NativeNotificationCategory(json.getString("identifier"), actions.toTypedArray(), options)
            } catch (error: Exception) {
                null
            }
        }

        private fun schedulePrefs(context: Context) =
            context.getSharedPreferences(PREFS_SCHEDULES, Context.MODE_PRIVATE)

        private fun saveSchedule(context: Context, schedule: StoredSchedule) {
            schedulePrefs(context).edit().putString(schedule.identifier, schedule.toJson()).apply()
        }

        private fun removeSchedule(context: Context, identifier: String) {
            schedulePrefs(context).edit().remove(identifier).apply()
        }

        private fun clearSchedules(context: Context) {
            schedulePrefs(context).edit().clear().apply()
        }

        private fun loadSchedules(context: Context): List<StoredSchedule> =
            schedulePrefs(context).all.mapNotNull { (_, raw) ->
                (raw as? String)?.let { StoredSchedule.fromJson(it) }
            }

        private fun alarmIntent(context: Context, identifier: String): PendingIntent {
            val intent =
                Intent(context, OneNativeNotificationsReceiver::class.java).apply {
                    action = ACTION_ALARM
                    putExtra(EXTRA_IDENTIFIER, identifier)
                }
            return PendingIntent.getBroadcast(
                context,
                identifier.hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        // inexact by design: exact alarms need schedule_exact_alarm, and a
        // single doze-deferrable path is simpler. a late delivery under doze
        // is documented, not a bug.
        private fun setAlarm(context: Context, identifier: String, fireAtMs: Long) {
            val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            manager.setAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                fireAtMs,
                alarmIntent(context, identifier)
            )
        }

        private fun cancelAlarm(context: Context, identifier: String) {
            val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            manager.cancel(alarmIntent(context, identifier))
        }

        private fun isForeground(context: Context): Boolean {
            val manager = context.getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
            return manager.runningAppProcesses?.any {
                it.pid == android.os.Process.myPid() &&
                    it.importance ==
                    android.app.ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
            } == true
        }

        private fun effectiveChannelId(context: Context, channelId: String?): String {
            if (Build.VERSION.SDK_INT < 26) return channelId ?: DEFAULT_CHANNEL_ID
            val manager = NotificationManagerCompat.from(context)
            if (channelId != null && manager.getNotificationChannel(channelId) != null) {
                return channelId
            }
            // unknown ids fall back to an owned default channel rather than
            // posting nowhere: android drops channel-less notifications.
            if (manager.getNotificationChannel(DEFAULT_CHANNEL_ID) == null) {
                manager.createNotificationChannel(
                    NotificationChannel(
                        DEFAULT_CHANNEL_ID,
                        "Default",
                        NotificationManager.IMPORTANCE_DEFAULT
                    )
                )
            }
            return DEFAULT_CHANNEL_ID
        }

        private fun postStatic(context: Context, schedule: StoredSchedule, highPriority: Boolean) {
            val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
            val icon = context.applicationInfo.icon
            val builder =
                NotificationCompat.Builder(context, effectiveChannelId(context, schedule.channelId))
                    .setContentTitle(schedule.title)
                    .setContentText(schedule.body)
                    .setSubText(schedule.subtitle)
                    .setSmallIcon(if (icon != 0) icon else android.R.drawable.ic_dialog_info)
                    .setAutoCancel(true)
                    .setPriority(
                        if (highPriority) NotificationCompat.PRIORITY_HIGH
                        else NotificationCompat.PRIORITY_DEFAULT
                    )
            if (launch?.component != null) {
                val target = Intent(context, OneNativeNotificationTapActivity::class.java)
                target.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                target.putExtra(EXTRA_IDENTIFIER, schedule.identifier)
                target.putExtra(EXTRA_TITLE, schedule.title)
                target.putExtra(EXTRA_SUBTITLE, schedule.subtitle)
                target.putExtra(EXTRA_BODY, schedule.body)
                target.putExtra(EXTRA_DATA, schedule.dataJson)
                target.putExtra(EXTRA_SOUND, schedule.sound)
                if (schedule.badge != null) target.putExtra(EXTRA_BADGE, schedule.badge)
                target.putExtra(EXTRA_TRIGGER, schedule.triggerJson)
                if (schedule.categoryIdentifier != null) {
                    target.putExtra(EXTRA_CATEGORY, schedule.categoryIdentifier)
                }
                builder.setContentIntent(
                    PendingIntent.getActivity(
                        context,
                        schedule.identifier.hashCode(),
                        target,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                )
            }
            // interactive actions for the schedule's category, if one is
            // registered. each fires the receiver, which records the
            // response and foregrounds the app when asked.
            val category = storedCategory(context, schedule.categoryIdentifier)
            if (category != null) {
                for (action in category.actions) {
                    builder.addAction(buildAction(context, schedule, action))
                }
            }
            val extras = android.os.Bundle()
            extras.putString(EXTRA_IDENTIFIER, schedule.identifier)
            extras.putString(EXTRA_DATA, schedule.dataJson)
            extras.putBoolean(EXTRA_SOUND, schedule.sound)
            if (schedule.badge != null) extras.putInt(EXTRA_BADGE, schedule.badge)
            extras.putString(EXTRA_TRIGGER, schedule.triggerJson)
            if (schedule.categoryIdentifier != null) {
                extras.putString(EXTRA_CATEGORY, schedule.categoryIdentifier)
            }
            builder.addExtras(extras)
            NotificationManagerCompat.from(context)
                .notify(schedule.identifier, 0, builder.build())
        }

        // one action button for a category action. destructive has no
        // android mapping and stays an ios effect; authentication maps on
        // api 31+, and a placeholder adds a text-input row.
        private fun buildAction(
            context: Context,
            schedule: StoredSchedule,
            action: NativeNotificationAction
        ): androidx.core.app.NotificationCompat.Action {
            val target =
                Intent(context, OneNativeNotificationsReceiver::class.java).apply {
                    setAction(ACTION_RESPONSE)
                    putExtra(EXTRA_IDENTIFIER, schedule.identifier)
                    putExtra(EXTRA_TITLE, schedule.title)
                    putExtra(EXTRA_SUBTITLE, schedule.subtitle)
                    putExtra(EXTRA_BODY, schedule.body)
                    putExtra(EXTRA_DATA, schedule.dataJson)
                    putExtra(EXTRA_SOUND, schedule.sound)
                    if (schedule.badge != null) putExtra(EXTRA_BADGE, schedule.badge)
                    putExtra(EXTRA_TRIGGER, schedule.triggerJson)
                    if (schedule.categoryIdentifier != null) {
                        putExtra(EXTRA_CATEGORY, schedule.categoryIdentifier)
                    }
                    putExtra(EXTRA_ACTION, action.identifier)
                    putExtra(EXTRA_FOREGROUND, action.foreground)
                }
            val pending =
                PendingIntent.getBroadcast(
                    context,
                    (schedule.identifier + ":" + action.identifier).hashCode(),
                    target,
                    // the system writes a typed reply into the intent, so a
                    // text-input action needs a mutable one (refused otherwise).
                    PendingIntent.FLAG_UPDATE_CURRENT or
                        if (action.textInputPlaceholder != null) PendingIntent.FLAG_MUTABLE
                        else PendingIntent.FLAG_IMMUTABLE
                )
            val builder =
                androidx.core.app.NotificationCompat.Action.Builder(0, action.buttonTitle, pending)
            if (Build.VERSION.SDK_INT >= 31 && action.authenticationRequired) {
                builder.setAuthenticationRequired(true)
            }
            if (action.textInputPlaceholder != null) {
                val remoteInput =
                    androidx.core.app.RemoteInput.Builder(EXTRA_USER_TEXT)
                        .setLabel(action.textInputPlaceholder)
                        .build()
                builder.addRemoteInput(remoteInput)
            }
            return builder.build()
        }

        // a notification tap or action, from the extras every tap intent carries.
        private fun tapResponse(intent: Intent, userText: String?): TapResponse? {
            val identifier = intent.getStringExtra(EXTRA_IDENTIFIER) ?: return null
            return TapResponse(
                identifier,
                intent.getStringExtra(EXTRA_TITLE),
                intent.getStringExtra(EXTRA_SUBTITLE),
                intent.getStringExtra(EXTRA_BODY),
                intent.getStringExtra(EXTRA_DATA) ?: "{}",
                intent.getBooleanExtra(EXTRA_SOUND, false),
                if (intent.hasExtra(EXTRA_BADGE)) intent.getIntExtra(EXTRA_BADGE, 0) else null,
                intent.getStringExtra(EXTRA_TRIGGER) ?: IMMEDIATE_TRIGGER_JSON,
                System.currentTimeMillis(),
                intent.getStringExtra(EXTRA_ACTION) ?: DEFAULT_ACTION_IDENTIFIER,
                userText,
                intent.getStringExtra(EXTRA_CATEGORY)
            )
        }

        // a notification body tap, from OneNativeNotificationTapActivity before
        // the app opens. react native drops an onNewIntent that arrives before
        // its context is ready, which is how android hands the tap to an app
        // activity it recreates after the process died, so the response is
        // recorded on the process here and the app opens without it.
        fun handleTap(context: Context, intent: Intent) {
            val response = tapResponse(intent, null) ?: return
            lastResponse = response
            instance?.let { live ->
                live.currentListeners()?.onResponse?.invoke(live.responsePayload(response))
            }
            val launch =
                context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return
            launch.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
            )
            context.startActivity(launch)
        }

        // action-tap entry: through the live hybrid when js is up, or
        // recorded statically with a response-carrying launch when the
        // process started for this broadcast. the activity harvest reads
        // the same extras on resume, so both paths converge.
        fun instanceAction(context: Context, intent: Intent) {
            val live = instance
            if (live != null) {
                live.handleAction(context, intent)
                return
            }
            val results = androidx.core.app.RemoteInput.getResultsFromIntent(intent)
            val response =
                tapResponse(intent, results?.getCharSequence(EXTRA_USER_TEXT)?.toString())
                    ?: return
            lastResponse = response
            if (intent.getBooleanExtra(EXTRA_FOREGROUND, true)) {
                foregroundWithResponse(context, response, results)
            }
            NotificationManagerCompat.from(context)
                .cancel(response.identifier, 0)
        }

        // foregrounds the app carrying the response on the launch intent, so
        // the activity harvest records it even when js was never running.
        private fun foregroundWithResponse(
            context: Context,
            response: TapResponse,
            results: android.os.Bundle?
        ) {
            try {
                val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
                    ?: return
                launch.addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP
                )
                launch.putExtra(EXTRA_TAP, true)
                launch.putExtra(EXTRA_IDENTIFIER, response.identifier)
                launch.putExtra(EXTRA_TITLE, response.title)
                launch.putExtra(EXTRA_SUBTITLE, response.subtitle)
                launch.putExtra(EXTRA_BODY, response.body)
                launch.putExtra(EXTRA_DATA, response.dataJson)
                launch.putExtra(EXTRA_SOUND, response.sound)
                if (response.badge != null) launch.putExtra(EXTRA_BADGE, response.badge)
                launch.putExtra(EXTRA_TRIGGER, response.triggerJson)
                launch.putExtra(EXTRA_ACTION, response.actionIdentifier)
                if (response.userText != null) launch.putExtra(EXTRA_USER_TEXT, response.userText)
                if (response.categoryIdentifier != null) {
                    launch.putExtra(EXTRA_CATEGORY, response.categoryIdentifier)
                }
                if (results != null) {
                    androidx.core.app.RemoteInput.addResultsToIntent(
                        arrayOf(
                            androidx.core.app.RemoteInput.Builder(EXTRA_USER_TEXT).build()
                        ),
                        launch,
                        results
                    )
                }
                context.startActivity(launch)
            } catch (error: Exception) {
            }
        }

        // alarm entry: re-arms a repeat, drops a fired one-shot, then
        // delivers through the hybrid object when js is up or straight to
        // the shade when the process started for this broadcast.
        fun fireAlarm(context: Context, identifier: String) {
            val schedule =
                loadSchedules(context).firstOrNull { it.identifier == identifier } ?: return
            val now = System.currentTimeMillis()
            if (schedule.repeats) {
                val rearmed = schedule.copy(fireAtMs = now + (schedule.seconds * 1000).toLong())
                saveSchedule(context, rearmed)
                setAlarm(context, identifier, rearmed.fireAtMs)
            } else {
                removeSchedule(context, identifier)
            }
            val live = instance
            if (live != null && isForeground(context)) {
                live.deliverNow(schedule, now)
                return
            }
            try {
                postStatic(context, schedule, false)
            } catch (error: SecurityException) {
                // permission revoked after scheduling: nothing to deliver to.
            }
        }

        // push refresh entry: the fcm service calls this when the token
        // rotates. without a live hybrid object there is nobody to tell; the
        // next getDevicePushToken reads the rotated token instead.
        fun onPushTokenRefresh(token: String) {
            instance?.currentListeners()?.onPushToken?.invoke(NativePushToken("android", token))
        }

        // boot entry: future schedules re-arm, repeats restart from now, and
        // one-shots that expired while the device was off are dropped.
        fun rearmAll(context: Context) {
            val now = System.currentTimeMillis()
            for (schedule in loadSchedules(context)) {
                if (schedule.repeats) {
                    val rearmed = schedule.copy(fireAtMs = now + (schedule.seconds * 1000).toLong())
                    saveSchedule(context, rearmed)
                    setAlarm(context, schedule.identifier, rearmed.fireAtMs)
                } else if (schedule.fireAtMs > now) {
                    setAlarm(context, schedule.identifier, schedule.fireAtMs)
                } else {
                    removeSchedule(context, schedule.identifier)
                }
            }
        }
    }
}
