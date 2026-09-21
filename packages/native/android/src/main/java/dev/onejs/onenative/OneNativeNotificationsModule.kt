package dev.onejs.onenative

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap

// local notifications, android half: permission, badge stubs, channels,
// foreground presentation, received and response events, scheduling with
// alarmmanager. the ios half is OneNativeNotifications.m.
class OneNativeNotificationsModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {
    private var permissionPromise: Promise? = null

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
        }

    init {
        reactContext.addActivityEventListener(activityListener)
    }

    override fun getName(): String = NAME

    override fun invalidate() {
        reactApplicationContext.removeActivityEventListener(activityListener)
        permissionPromise?.reject(E_PERMISSIONS, "notification authorization was cancelled")
        permissionPromise = null
    }

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
        return com.facebook.react.bridge.Arguments.createMap().apply {
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
    fun requestPermissions(options: com.facebook.react.bridge.ReadableMap, promise: Promise) {
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

    companion object {
        const val NAME = "OneNativeNotifications"
        private const val PREFS = "one_native_notifications"
        private const val KEY_ASKED = "permission_asked"
        private const val PERMISSION_REQUEST_CODE = 7401
        private const val E_PERMISSIONS = "E_PERMISSIONS"
    }
}
