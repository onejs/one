package dev.onejs.onenative

import android.Manifest
import android.app.Activity
import android.app.NotificationChannel
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
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

// local notifications, android half: permission, badge stubs, channels,
// foreground presentation, received and response events, scheduling with
// alarmmanager. the ios half is OneNativeNotifications.m.
class OneNativeNotificationsModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), LifecycleEventListener {
    private var permissionPromise: Promise? = null
    private var lastResponse: TapResponse? = null
    private val pending = mutableMapOf<String, PendingDelivery>()
    private val mainHandler = Handler(Looper.getMainLooper())

    private data class PendingDelivery(
        val identifier: String,
        val title: String?,
        val subtitle: String?,
        val body: String?,
        val dataJson: String,
        val channelId: String?,
        val sound: Boolean,
        val badge: Int?,
        val dateMs: Long,
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
        val dateMs: Long
    )

    private val activityListener =
        object : BaseActivityEventListener() {
            override fun onRequestPermissionsResult(
                activity: Activity?,
                requestCode: Int,
                permissions: Array<String>,
                grantResults: IntArray
            ) {
                if (requestCode != PERMISSION_REQUEST_CODE) return
                val promise = permissionPromise ?: return
                permissionPromise = null
                markAsked()
                promise.resolve(permissionPayload(activity))
            }

            override fun onNewIntent(intent: Intent) {
                harvestTap(intent)
            }
        }

    init {
        reactContext.addActivityEventListener(activityListener)
        reactContext.addLifecycleEventListener(this)
    }

    override fun getName(): String = NAME

    override fun invalidate() {
        reactApplicationContext.removeActivityEventListener(activityListener)
        reactApplicationContext.removeLifecycleEventListener(this)
        permissionPromise?.reject(E_PERMISSIONS, "notification authorization was cancelled")
        permissionPromise = null
        synchronized(pending) {
            for (delivery in pending.values) mainHandler.removeCallbacks(delivery.timeout)
            pending.clear()
        }
    }

    override fun onHostResume() {
        harvestTap(reactApplicationContext.currentActivity?.intent)
    }

    override fun onHostPause() {}

    override fun onHostDestroy() {}

    private fun prefs() =
        reactApplicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    private fun markAsked() {
        prefs().edit().putBoolean(KEY_ASKED, true).apply()
    }

    private fun permissionPayload(activity: Activity?): WritableMap {
        val granted =
            if (Build.VERSION.SDK_INT >= 33) {
                ContextCompat.checkSelfPermission(
                    reactApplicationContext,
                    Manifest.permission.POST_NOTIFICATIONS
                ) == PackageManager.PERMISSION_GRANTED
            } else {
                NotificationManagerCompat.from(reactApplicationContext).areNotificationsEnabled()
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
        return Arguments.createMap().apply {
            putString("status", if (granted) "granted" else if (!asked) "undetermined" else "denied")
            putBoolean("granted", granted)
            putBoolean("canAskAgain", canAskAgain)
        }
    }

    @ReactMethod
    fun getPermissions(promise: Promise) {
        promise.resolve(permissionPayload(reactApplicationContext.currentActivity))
    }

    @ReactMethod
    fun requestPermissions(options: ReadableMap, promise: Promise) {
        // options carry ios-only fields; android prompts unconditionally.
        if (Build.VERSION.SDK_INT < 33) {
            promise.resolve(permissionPayload(null))
            return
        }
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.reject(E_PERMISSIONS, "notification authorization needs a foreground activity")
            return
        }
        if (
            ContextCompat.checkSelfPermission(
                reactApplicationContext,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            promise.resolve(permissionPayload(activity))
            return
        }
        if (permissionPromise != null) {
            promise.reject(
                E_PERMISSIONS,
                "a notification authorization request is already in flight"
            )
            return
        }
        permissionPromise = promise
        ActivityCompat.requestPermissions(
            activity,
            arrayOf(Manifest.permission.POST_NOTIFICATIONS),
            PERMISSION_REQUEST_CODE
        )
    }

    @ReactMethod
    fun getBadgeCount(promise: Promise) {
        // the launcher owns badges on android.
        promise.resolve(0)
    }

    @ReactMethod
    fun setBadgeCount(count: Double, promise: Promise) {
        promise.resolve(false)
    }

    private fun channelPayload(channel: NotificationChannel?): WritableMap? {
        if (channel == null) return null
        return Arguments.createMap().apply {
            putString("id", channel.id)
            putString("name", channel.name?.toString())
            putInt("importance", channel.importance)
            putString("description", channel.description)
            putBoolean("sound", channel.sound != null)
            val pattern = channel.vibrationPattern
            if (pattern != null) {
                putArray(
                    "vibrationPattern",
                    Arguments.createArray().apply {
                        for (value in pattern) pushInt(value.toInt())
                    }
                )
            }
            putBoolean("showBadge", channel.canShowBadge())
        }
    }

    @ReactMethod
    fun setNotificationChannel(channelId: String, channel: ReadableMap, promise: Promise) {
        if (Build.VERSION.SDK_INT < 26) {
            promise.resolve(null)
            return
        }
        val manager = NotificationManagerCompat.from(reactApplicationContext)
        val nativeChannel =
            NotificationChannel(
                channelId,
                channel.getString("name") ?: channelId,
                channel.getInt("importance")
            )
        if (channel.hasKey("description") && !channel.isNull("description")) {
            nativeChannel.description = channel.getString("description")
        }
        if (channel.hasKey("sound") && !channel.getBoolean("sound")) {
            nativeChannel.setSound(null, null)
        }
        if (channel.hasKey("vibrationPattern") && !channel.isNull("vibrationPattern")) {
            val pattern = channel.getArray("vibrationPattern")
            if (pattern != null) {
                nativeChannel.vibrationPattern =
                    LongArray(pattern.size()) { index -> pattern.getDouble(index).toLong() }
            }
        }
        if (channel.hasKey("showBadge")) {
            nativeChannel.setShowBadge(channel.getBoolean("showBadge"))
        }
        manager.createNotificationChannel(nativeChannel)
        promise.resolve(channelPayload(manager.getNotificationChannel(channelId)))
    }

    @ReactMethod
    fun getNotificationChannel(channelId: String, promise: Promise) {
        if (Build.VERSION.SDK_INT < 26) {
            promise.resolve(null)
            return
        }
        val manager = NotificationManagerCompat.from(reactApplicationContext)
        promise.resolve(channelPayload(manager.getNotificationChannel(channelId)))
    }

    @ReactMethod
    fun getNotificationChannels(promise: Promise) {
        if (Build.VERSION.SDK_INT < 26) {
            promise.resolve(Arguments.createArray())
            return
        }
        val manager = NotificationManagerCompat.from(reactApplicationContext)
        promise.resolve(
            Arguments.createArray().apply {
                for (channel in manager.notificationChannels) {
                    pushMap(channelPayload(channel))
                }
            }
        )
    }

    @ReactMethod
    fun deleteNotificationChannel(channelId: String, promise: Promise) {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManagerCompat.from(reactApplicationContext)
                .deleteNotificationChannel(channelId)
        }
        promise.resolve(null)
    }

    // the NativeEventEmitter calls these; delivery fan-out lives in js.
    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}

    private fun emit(name: String, params: WritableMap?) {
        if (!reactApplicationContext.hasActiveCatalystInstance()) return
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(name, params)
    }

    private fun isForeground(): Boolean {
        val manager =
            reactApplicationContext.getSystemService(Context.ACTIVITY_SERVICE)
                as android.app.ActivityManager
        return manager.runningAppProcesses?.any {
            it.pid == android.os.Process.myPid() &&
                it.importance ==
                android.app.ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
        } == true
    }

    private fun immediateTrigger(): WritableMap =
        Arguments.createMap().apply {
            putString("type", "timeInterval")
            putDouble("seconds", 0.0)
            putBoolean("repeats", false)
        }

    private fun notificationPayload(
        identifier: String,
        title: String?,
        subtitle: String?,
        body: String?,
        data: WritableMap?,
        sound: Boolean,
        badge: Int?,
        dateMs: Long
    ): WritableMap =
        Arguments.createMap().apply {
            putMap(
                "request",
                Arguments.createMap().apply {
                    putString("identifier", identifier)
                    putMap(
                        "content",
                        Arguments.createMap().apply {
                            putString("title", title)
                            putString("subtitle", subtitle)
                            putString("body", body)
                            putMap("data", data ?: Arguments.createMap())
                            putBoolean("sound", sound)
                            if (badge != null) putInt("badge", badge) else putNull("badge")
                        }
                    )
                    putMap("trigger", immediateTrigger())
                }
            )
            putDouble("date", dateMs.toDouble())
        }

    // posting without the runtime permission throws on 13+, so the schedule
    // and present paths translate that into a rejection or a quiet drop.
    private fun effectiveChannelId(channelId: String?): String {
        if (Build.VERSION.SDK_INT < 26) return channelId ?: DEFAULT_CHANNEL_ID
        val manager = NotificationManagerCompat.from(reactApplicationContext)
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
                    android.app.NotificationManager.IMPORTANCE_DEFAULT
                )
            )
        }
        return DEFAULT_CHANNEL_ID
    }

    private fun optString(map: ReadableMap?, key: String): String? =
        if (map != null && map.hasKey(key) && !map.isNull(key)) map.getString(key) else null

    private fun postNotification(
        identifier: String,
        title: String?,
        subtitle: String?,
        body: String?,
        dataJson: String,
        sound: Boolean,
        badge: Int?,
        channelId: String?,
        highPriority: Boolean
    ) {
        val context = reactApplicationContext
        val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
        val icon = context.applicationInfo.icon
        val builder =
            NotificationCompat.Builder(context, effectiveChannelId(channelId))
                .setContentTitle(title)
                .setContentText(body)
                .setSubText(subtitle)
                .setSmallIcon(if (icon != 0) icon else android.R.drawable.ic_dialog_info)
                .setAutoCancel(true)
                .setPriority(
                    if (highPriority) NotificationCompat.PRIORITY_HIGH
                    else NotificationCompat.PRIORITY_DEFAULT
                )
        if (launch != null) {
            val target = Intent(launch)
            target.action = ACTION_TAP
            target.putExtra(EXTRA_TAP, true)
            target.putExtra(EXTRA_IDENTIFIER, identifier)
            target.putExtra(EXTRA_TITLE, title)
            target.putExtra(EXTRA_SUBTITLE, subtitle)
            target.putExtra(EXTRA_BODY, body)
            target.putExtra(EXTRA_DATA, dataJson)
            target.putExtra(EXTRA_SOUND, sound)
            if (badge != null) target.putExtra(EXTRA_BADGE, badge)
            target.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            builder.setContentIntent(
                android.app.PendingIntent.getActivity(
                    context,
                    identifier.hashCode(),
                    target,
                    android.app.PendingIntent.FLAG_UPDATE_CURRENT or
                        android.app.PendingIntent.FLAG_IMMUTABLE
                )
            )
        }
        val extras = android.os.Bundle()
        extras.putString(EXTRA_IDENTIFIER, identifier)
        extras.putString(EXTRA_DATA, dataJson)
        builder.addExtras(extras)
        NotificationManagerCompat.from(context).notify(identifier, 0, builder.build())
    }

    @ReactMethod
    fun presentNotification(requestId: String, behavior: ReadableMap, promise: Promise) {
        val delivery =
            synchronized(pending) {
                val found = pending.remove(requestId)
                if (found != null) mainHandler.removeCallbacks(found.timeout)
                found
            }
        // unknown ids resolve quietly: the delivery already timed out.
        if (delivery != null &&
            (behavior.getBoolean("shouldShowBanner") || behavior.getBoolean("shouldShowList"))
        ) {
            try {
                postNotification(
                    delivery.identifier,
                    delivery.title,
                    delivery.subtitle,
                    delivery.body,
                    delivery.dataJson,
                    delivery.sound,
                    delivery.badge,
                    delivery.channelId,
                    behavior.getBoolean("shouldShowBanner")
                )
            } catch (error: SecurityException) {
                // permission revoked between arrival and answer.
            }
        }
        promise.resolve(null)
    }

    @ReactMethod
    fun scheduleNotification(request: ReadableMap, promise: Promise) {
        if (request.hasKey("trigger") && !request.isNull("trigger")) {
            promise.reject(E_TRIGGER, "only trigger null is supported in this slice")
            return
        }
        val content = request.getMap("content")
        val title = optString(content, "title")
        val subtitle = optString(content, "subtitle")
        val body = optString(content, "body")
        val sound =
            content != null &&
                content.hasKey("sound") &&
                !content.isNull("sound") &&
                content.getBoolean("sound")
        val badge =
            if (content != null && content.hasKey("badge") && !content.isNull("badge")) {
                content.getDouble("badge").toInt()
            } else {
                null
            }
        val data = content?.takeIf { it.hasKey("data") && !it.isNull("data") }?.getMap("data")
        val identifier = optString(request, "identifier") ?: UUID.randomUUID().toString()
        val dateMs = System.currentTimeMillis()
        val dataJson = readableToJson(data ?: Arguments.createMap()).toString()
        if (isForeground() && reactApplicationContext.hasActiveCatalystInstance()) {
            val requestId = UUID.randomUUID().toString()
            val timeout = Runnable {
                // js stalled: show everything, like expo, rather than drop.
                synchronized(pending) {
                    val delivery = pending.remove(requestId) ?: return@Runnable
                    try {
                        postNotification(
                            delivery.identifier,
                            delivery.title,
                            delivery.subtitle,
                            delivery.body,
                            delivery.dataJson,
                            delivery.sound,
                            delivery.badge,
                            delivery.channelId,
                            true
                        )
                    } catch (error: SecurityException) {
                        // permission revoked between arrival and timeout.
                    }
                }
            }
            synchronized(pending) {
                pending[requestId] =
                    PendingDelivery(
                        identifier,
                        title,
                        subtitle,
                        body,
                        dataJson,
                        null,
                        sound,
                        badge,
                        dateMs,
                        timeout
                    )
            }
            mainHandler.postDelayed(timeout, PRESENT_TIMEOUT_MS)
            emit(
                EVENT_RECEIVED,
                Arguments.createMap().apply {
                    putString("requestId", requestId)
                    putMap(
                        "notification",
                        notificationPayload(
                            identifier,
                            title,
                            subtitle,
                            body,
                            data?.let { jsonToMap(JSONObject(dataJson)) },
                            sound,
                            badge,
                            dateMs
                        )
                    )
                }
            )
            promise.resolve(identifier)
            return
        }
        try {
            postNotification(identifier, title, subtitle, body, dataJson, sound, badge, null, false)
        } catch (error: SecurityException) {
            promise.reject(
                E_SCHEDULE,
                "posting the notification failed: request permission first"
            )
            return
        }
        promise.resolve(identifier)
    }

    private fun harvestTap(intent: Intent?) {
        if (intent == null || !intent.getBooleanExtra(EXTRA_TAP, false)) return
        // consumed at once: onNewIntent and onHostResume both report a tap.
        intent.removeExtra(EXTRA_TAP)
        val response =
            TapResponse(
                intent.getStringExtra(EXTRA_IDENTIFIER) ?: return,
                intent.getStringExtra(EXTRA_TITLE),
                intent.getStringExtra(EXTRA_SUBTITLE),
                intent.getStringExtra(EXTRA_BODY),
                intent.getStringExtra(EXTRA_DATA) ?: "{}",
                intent.getBooleanExtra(EXTRA_SOUND, false),
                if (intent.hasExtra(EXTRA_BADGE)) intent.getIntExtra(EXTRA_BADGE, 0) else null,
                System.currentTimeMillis()
            )
        lastResponse = response
        emit(EVENT_RESPONSE, responsePayload(response))
    }

    private fun responsePayload(response: TapResponse): WritableMap =
        Arguments.createMap().apply {
            putMap(
                "notification",
                notificationPayload(
                    response.identifier,
                    response.title,
                    response.subtitle,
                    response.body,
                    jsonToMap(JSONObject(response.dataJson)),
                    response.sound,
                    response.badge,
                    response.dateMs
                )
            )
            putString("actionIdentifier", DEFAULT_ACTION_IDENTIFIER)
        }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getLastNotificationResponse(): WritableMap? {
        // a cold-start tap lands in the launch intent before any resume.
        harvestTap(reactApplicationContext.currentActivity?.intent)
        val response = lastResponse ?: return null
        return responsePayload(response)
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun clearLastNotificationResponse(): Boolean {
        lastResponse = null
        return true
    }

    private fun readableToJson(value: Any?): Any? =
        when (value) {
            null -> JSONObject.NULL
            is Boolean, is Double, is Int, is String -> value
            is ReadableMap -> {
                JSONObject().also { json ->
                    val keys = value.keySetIterator()
                    while (keys.hasNextKey()) {
                        val key = keys.nextKey()
                        json.put(
                            key,
                            when (value.getType(key)) {
                                ReadableType.Null -> JSONObject.NULL
                                ReadableType.Boolean -> value.getBoolean(key)
                                ReadableType.Number -> value.getDouble(key)
                                ReadableType.String -> value.getString(key)
                                ReadableType.Map -> readableToJson(value.getMap(key))
                                ReadableType.Array -> readableToJson(value.getArray(key))
                            }
                        )
                    }
                }
            }
            is ReadableArray -> {
                JSONArray().also { json ->
                    for (index in 0 until value.size()) {
                        json.put(
                            when (value.getType(index)) {
                                ReadableType.Null -> JSONObject.NULL
                                ReadableType.Boolean -> value.getBoolean(index)
                                ReadableType.Number -> value.getDouble(index)
                                ReadableType.String -> value.getString(index)
                                ReadableType.Map -> readableToJson(value.getMap(index))
                                ReadableType.Array -> readableToJson(value.getArray(index))
                            }
                        )
                    }
                }
            }
            else -> value.toString()
        }

    private fun putJsonValue(target: WritableMap, key: String, value: Any?) {
        when (value) {
            null, JSONObject.NULL -> target.putNull(key)
            is Boolean -> target.putBoolean(key, value)
            is Int -> target.putInt(key, value)
            is Long -> target.putDouble(key, value.toDouble())
            is Double -> target.putDouble(key, value)
            is String -> target.putString(key, value)
            is JSONObject -> target.putMap(key, jsonToMap(value))
            is JSONArray -> target.putArray(key, jsonToArray(value))
            else -> target.putString(key, value.toString())
        }
    }

    private fun pushJsonValue(target: WritableArray, value: Any?) {
        when (value) {
            null, JSONObject.NULL -> target.pushNull()
            is Boolean -> target.pushBoolean(value)
            is Int -> target.pushInt(value)
            is Long -> target.pushDouble(value.toDouble())
            is Double -> target.pushDouble(value)
            is String -> target.pushString(value)
            is JSONObject -> target.pushMap(jsonToMap(value))
            is JSONArray -> target.pushArray(jsonToArray(value))
            else -> target.pushString(value.toString())
        }
    }

    private fun jsonToMap(json: JSONObject): WritableMap =
        Arguments.createMap().also { map ->
            val keys = json.keys()
            while (keys.hasNext()) {
                val key = keys.next()
                putJsonValue(map, key, json.get(key))
            }
        }

    private fun jsonToArray(json: JSONArray): WritableArray =
        Arguments.createArray().also { array ->
            for (index in 0 until json.length()) {
                pushJsonValue(array, json.get(index))
            }
        }

    companion object {
        const val NAME = "OneNativeNotifications"
        const val EVENT_RECEIVED = "oneNativeNotificationsReceived"
        const val EVENT_RESPONSE = "oneNativeNotificationsResponse"
        private const val PREFS = "one_native_notifications"
        private const val KEY_ASKED = "permission_asked"
        private const val PERMISSION_REQUEST_CODE = 7401
        private const val E_PERMISSIONS = "E_NOTIFICATIONS_PERMISSION"
        private const val E_TRIGGER = "E_NOTIFICATIONS_TRIGGER"
        private const val E_SCHEDULE = "E_NOTIFICATIONS_SCHEDULE"
        private const val DEFAULT_CHANNEL_ID = "default"
        private const val DEFAULT_ACTION_IDENTIFIER = "expo.modules.notifications.actions.DEFAULT"
        private const val ACTION_TAP = "dev.onejs.onenative.NOTIFICATION_TAP"
        private const val EXTRA_TAP = "dev.onejs.onenative.EXTRA_TAP"
        private const val EXTRA_IDENTIFIER = "dev.onejs.onenative.EXTRA_IDENTIFIER"
        private const val EXTRA_TITLE = "dev.onejs.onenative.EXTRA_TITLE"
        private const val EXTRA_SUBTITLE = "dev.onejs.onenative.EXTRA_SUBTITLE"
        private const val EXTRA_BODY = "dev.onejs.onenative.EXTRA_BODY"
        private const val EXTRA_DATA = "dev.onejs.onenative.EXTRA_DATA"
        private const val EXTRA_SOUND = "dev.onejs.onenative.EXTRA_SOUND"
        private const val EXTRA_BADGE = "dev.onejs.onenative.EXTRA_BADGE"
        private const val PRESENT_TIMEOUT_MS = 3000L
    }
}
