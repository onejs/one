package com.margelo.nitro.one

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import androidx.browser.customtabs.CustomTabColorSchemeParams
import androidx.browser.customtabs.CustomTabsIntent
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.LifecycleEventListener
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise

// in-app browser matching expo-web-browser's result shapes: pages and auth
// both open in Custom Tabs; an app redirect back completes the auth session.
// calls arrive on the js thread and lifecycle callbacks on the ui thread, so
// the pending session is only read or replaced under the lock.
class HybridOneBrowser : HybridOneBrowserSpec(), ActivityEventListener, LifecycleEventListener {
    private val lock = Any()
    private var authPromise: Promise<BrowserAuthResult>? = null
    private var authScheme: String? = null

    init {
        NitroModules.applicationContext?.let {
            it.addActivityEventListener(this)
            it.addLifecycleEventListener(this)
        }
    }

    override fun dispose() {
        NitroModules.applicationContext?.let {
            it.removeActivityEventListener(this)
            it.removeLifecycleEventListener(this)
        }
        super.dispose()
    }

    override fun open(url: String, options: BrowserNativeOptions): Promise<BrowserResult> {
        val activity = NitroModules.applicationContext?.currentActivity
            ?: return Promise.rejected(
                OneNativeError(
                    "E_BROWSER_ACTIVITY",
                    "Browser.open: no foreground activity to present the browser."
                )
            )
        return try {
            launchCustomTab(activity, url, options)
            // Custom Tabs give no close callback, so the open resolves
            // immediately, matching expo-web-browser on Android.
            Promise.resolved(BrowserResult(BrowserResultType.OPENED))
        } catch (e: Exception) {
            Promise.rejected(OneNativeError("E_BROWSER_OPEN", "Browser.open: ${e.message}"))
        }
    }

    override fun dismiss(): Promise<BrowserResult> {
        // Custom Tabs live in the browser app and cannot be closed
        // programmatically; report dismissed for shape parity with ios.
        return Promise.resolved(BrowserResult(BrowserResultType.DISMISS))
    }

    override fun openAuthSession(
        url: String,
        redirectUrl: String?,
        options: BrowserNativeOptions
    ): Promise<BrowserAuthResult> {
        val promise = Promise<BrowserAuthResult>()
        synchronized(lock) {
            if (authPromise != null) {
                return Promise.resolved(result(BrowserAuthResultType.LOCKED))
            }
            val activity = NitroModules.applicationContext?.currentActivity
                ?: return Promise.rejected(
                    OneNativeError(
                        "E_BROWSER_ACTIVITY",
                        "Browser.openAuthSession: no foreground activity to present the browser."
                    )
                )
            try {
                authScheme = redirectUrl?.let { Uri.parse(it)?.scheme }
                authPromise = promise
                launchCustomTab(activity, url, options)
                // the promise settles on redirect (onNewIntent), on
                // programmatic dismiss, or when the user returns without one
                // (onHostResume).
            } catch (e: Exception) {
                authPromise = null
                authScheme = null
                return Promise.rejected(OneNativeError("E_BROWSER_OPEN", "Browser.openAuthSession: ${e.message}"))
            }
        }
        return promise
    }

    override fun dismissAuthSession() {
        // the tab itself stays open, like dismiss; the pending session
        // settles as dismiss on both platforms.
        takeAuth()?.resolve(result(BrowserAuthResultType.DISMISS))
    }

    override fun onNewIntent(intent: Intent) {
        val data = intent.data ?: return
        val pending = synchronized(lock) {
            val pending = authPromise ?: return
            val scheme = authScheme
            if (scheme != null && data.scheme != scheme) return
            authPromise = null
            authScheme = null
            pending
        }
        pending.resolve(result(BrowserAuthResultType.SUCCESS, data.toString()))
    }

    override fun onActivityResult(
        activity: Activity,
        requestCode: Int,
        resultCode: Int,
        data: Intent?
    ) {
    }

    override fun onHostResume() {
        // onNewIntent runs before onHostResume for a redirect, so a pending
        // promise here means the user closed the tab without redirecting.
        takeAuth()?.resolve(result(BrowserAuthResultType.CANCEL))
    }

    override fun onHostPause() {
    }

    override fun onHostDestroy() {
        takeAuth()?.resolve(result(BrowserAuthResultType.CANCEL))
    }

    private fun takeAuth(): Promise<BrowserAuthResult>? = synchronized(lock) {
        val pending = authPromise
        authPromise = null
        authScheme = null
        pending
    }

    private fun launchCustomTab(activity: Activity, url: String, options: BrowserNativeOptions) {
        val builder = CustomTabsIntent.Builder()
        if (options.showTitle == true) {
            builder.setShowTitle(true)
        }
        options.toolbarColor?.let { raw ->
            colorForHex(raw)?.let { toolbar ->
                builder.setDefaultColorSchemeParams(
                    CustomTabColorSchemeParams.Builder().setToolbarColor(toolbar).build()
                )
            }
        }
        val customTabs = builder.build()
        options.browserPackage?.let { customTabs.intent.setPackage(it) }
        customTabs.launchUrl(activity, Uri.parse(url))
    }

    private fun colorForHex(value: String): Int? {
        return try {
            Color.parseColor(value)
        } catch (_: IllegalArgumentException) {
            null
        }
    }

    private fun result(type: BrowserAuthResultType, url: String? = null) =
        BrowserAuthResult(type, url)
}
