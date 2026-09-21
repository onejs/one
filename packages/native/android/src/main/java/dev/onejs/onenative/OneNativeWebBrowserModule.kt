package dev.onejs.onenative

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import androidx.browser.customtabs.CustomTabColorSchemeParams
import androidx.browser.customtabs.CustomTabsIntent
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap

// in-app browser matching expo-web-browser's result shapes: pages and auth
// both open in Custom Tabs; an app redirect back completes the auth session.
class OneNativeWebBrowserModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener, LifecycleEventListener {

    private var authPromise: Promise? = null
    private var authScheme: String? = null

    init {
        reactContext.addActivityEventListener(this)
        reactContext.addLifecycleEventListener(this)
    }

    override fun getName(): String = NAME

    override fun invalidate() {
        reactApplicationContext.removeActivityEventListener(this)
        reactApplicationContext.removeLifecycleEventListener(this)
    }

    @ReactMethod
    fun openBrowser(url: String, options: ReadableMap, promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.reject("ERR_WEB_BROWSER_ACTIVITY", "No foreground activity to present the browser.")
            return
        }
        try {
            launchCustomTab(activity, url, options)
            // Custom Tabs give no close callback, so the open resolves
            // immediately, matching expo-web-browser on Android.
            promise.resolve(resultMap("opened"))
        } catch (e: Exception) {
            promise.reject("ERR_WEB_BROWSER_OPEN", e)
        }
    }

    @ReactMethod
    fun dismissBrowser(promise: Promise) {
        // Custom Tabs live in the browser app and cannot be closed
        // programmatically; report dismissed for shape parity with ios.
        promise.resolve(resultMap("dismiss"))
    }

    @ReactMethod
    fun openAuthSession(url: String, redirectUrl: String?, options: ReadableMap, promise: Promise) {
        if (authPromise != null) {
            promise.resolve(resultMap("locked"))
            return
        }
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.reject("ERR_WEB_BROWSER_ACTIVITY", "No foreground activity to present the browser.")
            return
        }
        try {
            authScheme = redirectUrl?.let { Uri.parse(it)?.scheme }
            authPromise = promise
            launchCustomTab(activity, url, options)
            // the promise settles on redirect (onNewIntent) or when the user
            // returns without one (onHostResume).
        } catch (e: Exception) {
            authPromise = null
            authScheme = null
            promise.reject("ERR_WEB_BROWSER_OPEN", e)
        }
    }

    override fun onNewIntent(intent: Intent) {
        val pending = authPromise ?: return
        val data = intent.data ?: return
        val scheme = authScheme
        if (scheme != null && data.scheme != scheme) return
        authPromise = null
        authScheme = null
        pending.resolve(
            Arguments.createMap().apply {
                putString("type", "success")
                putString("url", data.toString())
            }
        )
    }

    override fun onActivityResult(
        activity: Activity,
        requestCode: Int,
        resultCode: Int,
        data: Intent?
    ) {
    }

    override fun onHostResume() {
        val pending = authPromise ?: return
        // onNewIntent runs before onHostResume for a redirect, so a pending
        // promise here means the user closed the tab without redirecting.
        authPromise = null
        authScheme = null
        pending.resolve(resultMap("cancel"))
    }

    override fun onHostPause() {
    }

    override fun onHostDestroy() {
        authPromise?.let {
            authPromise = null
            authScheme = null
            it.resolve(resultMap("cancel"))
        }
    }

    private fun launchCustomTab(activity: Activity, url: String, options: ReadableMap) {
        val builder = CustomTabsIntent.Builder()
        if (options.hasKey("showTitle") && !options.isNull("showTitle") &&
            options.getBoolean("showTitle")
        ) {
            builder.setShowTitle(true)
        }
        stringOption(options, "toolbarColor")?.let { raw ->
            colorForHex(raw)?.let { toolbar ->
                builder.setDefaultColorSchemeParams(
                    CustomTabColorSchemeParams.Builder().setToolbarColor(toolbar).build()
                )
            }
        }
        val customTabs = builder.build()
        stringOption(options, "browserPackage")?.let { customTabs.intent.setPackage(it) }
        customTabs.launchUrl(activity, Uri.parse(url))
    }

    private fun stringOption(options: ReadableMap, key: String): String? {
        if (!options.hasKey(key) || options.isNull(key)) return null
        return options.getString(key)
    }

    private fun colorForHex(value: String): Int? {
        return try {
            Color.parseColor(value)
        } catch (_: IllegalArgumentException) {
            null
        }
    }

    private fun resultMap(type: String): WritableMap =
        Arguments.createMap().apply { putString("type", type) }

    companion object {
        const val NAME = "OneNativeWebBrowser"
    }
}
