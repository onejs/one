package com.margelo.nitro.one

import android.app.Activity
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import androidx.browser.auth.AuthTabColorSchemeParams
import androidx.browser.auth.AuthTabIntent
import androidx.browser.customtabs.CustomTabColorSchemeParams
import androidx.browser.customtabs.CustomTabsClient
import androidx.browser.customtabs.CustomTabsIntent
import androidx.browser.customtabs.CustomTabsServiceConnection
import androidx.browser.customtabs.CustomTabsSession
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.LifecycleEventListener
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise

// in-app browser matching expo-web-browser's result shapes:
// plain pages in Custom Tabs, auth in modern androidx.browser AuthTabIntent
// (with graceful fallback to Custom Tabs on older browsers).
// supports warmup, mayLaunchUrl, and dark appearance color scheme params.
class HybridOneBrowser : HybridOneBrowserSpec(), ActivityEventListener, LifecycleEventListener {
    private val lock = Any()
    private var authPromise: Promise<BrowserAuthResult>? = null
    private var authScheme: String? = null

    private var customTabsClient: CustomTabsClient? = null
    private var customTabsSession: CustomTabsSession? = null

    companion object {
        private const val AUTH_TAB_REQUEST_CODE = 4281
    }

    init {
        NitroModules.applicationContext?.let {
            it.addActivityEventListener(this)
            it.addLifecycleEventListener(this)
        }
        ensureClient(null)
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
                launchAuthTab(activity, url, redirectUrl, options)
                // the promise settles on:
                // 1. onActivityResult when AuthTab completes with direct result
                // 2. onNewIntent when fallback CustomTab redirects back
                // 3. onHostResume when user closes tab without redirect
                // 4. dismissAuthSession
            } catch (e: Exception) {
                authPromise = null
                authScheme = null
                return Promise.rejected(OneNativeError("E_BROWSER_OPEN", "Browser.openAuthSession: ${e.message}"))
            }
        }
        return promise
    }

    override fun dismissAuthSession() {
        takeAuth()?.resolve(result(BrowserAuthResultType.DISMISS))
    }

    override fun warmup(browserPackage: String?): Promise<Boolean> {
        val promise = Promise<Boolean>()
        ensureClient(browserPackage) { client -> promise.resolve(client?.warmup(0L) ?: false) }
        return promise
    }

    override fun mayLaunchUrl(url: String, browserPackage: String?): Promise<Boolean> {
        val promise = Promise<Boolean>()
        ensureClient(browserPackage) { client ->
            val session = customTabsSession ?: client?.newSession(null)
            customTabsSession = session
            promise.resolve(session?.mayLaunchUrl(Uri.parse(url), null, null) ?: false)
        }
        return promise
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
        if (requestCode == AUTH_TAB_REQUEST_CODE) {
            val pending = synchronized(lock) {
                val p = authPromise ?: return
                authPromise = null
                authScheme = null
                p
            }
            if (resultCode == Activity.RESULT_OK) {
                val resultUri = data?.data?.toString()
                if (resultUri != null) {
                    pending.resolve(result(BrowserAuthResultType.SUCCESS, resultUri))
                } else {
                    pending.resolve(result(BrowserAuthResultType.CANCEL))
                }
            } else {
                pending.resolve(result(BrowserAuthResultType.CANCEL))
            }
        }
    }

    override fun onHostResume() {
        // onActivityResult and onNewIntent run before onHostResume,
        // so a pending promise here means the user closed the tab without redirecting.
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

    // calls onReady exactly once: with the bound client, or with null when no
    // installed browser offers the Custom Tabs service or binding it fails
    private fun ensureClient(browserPackage: String?, onReady: (CustomTabsClient?) -> Unit = {}) {
        customTabsClient?.let { return onReady(it) }
        val context = NitroModules.applicationContext ?: return onReady(null)
        val targetPackage = browserPackage ?: CustomTabsClient.getPackageName(context, null)
            ?: return onReady(null)
        val connection = object : CustomTabsServiceConnection() {
            override fun onCustomTabsServiceConnected(name: ComponentName, connectedClient: CustomTabsClient) {
                customTabsClient = connectedClient
                customTabsSession = connectedClient.newSession(null)
                onReady(connectedClient)
            }
            override fun onServiceDisconnected(name: ComponentName) {
                customTabsClient = null
                customTabsSession = null
            }
        }
        if (!CustomTabsClient.bindCustomTabsService(context, targetPackage, connection)) onReady(null)
    }

    private fun launchCustomTab(activity: Activity, url: String, options: BrowserNativeOptions) {
        val session = customTabsSession
        val builder = if (session != null) CustomTabsIntent.Builder(session) else CustomTabsIntent.Builder()
        if (options.showTitle == true) {
            builder.setShowTitle(true)
        }
        applyColorScheme(builder, options)
        val customTabs = builder.build()
        options.browserPackage?.let { customTabs.intent.setPackage(it) }
        customTabs.launchUrl(activity, Uri.parse(url))
    }

    private fun launchAuthTab(
        activity: Activity,
        url: String,
        redirectUrl: String?,
        options: BrowserNativeOptions
    ) {
        val authBuilder = AuthTabIntent.Builder()
        if (options.preferEphemeralSession == true) {
            authBuilder.setEphemeralBrowsingEnabled(true)
        }
        when (options.colorScheme) {
            BrowserColorScheme.DARK -> authBuilder.setColorScheme(CustomTabsIntent.COLOR_SCHEME_DARK)
            BrowserColorScheme.LIGHT -> authBuilder.setColorScheme(CustomTabsIntent.COLOR_SCHEME_LIGHT)
            BrowserColorScheme.SYSTEM, null -> authBuilder.setColorScheme(CustomTabsIntent.COLOR_SCHEME_SYSTEM)
        }
        val defaultParams = AuthTabColorSchemeParams.Builder()
        options.toolbarColor?.let { raw ->
            colorForHex(raw)?.let { defaultParams.setToolbarColor(it) }
        }
        authBuilder.setDefaultColorSchemeParams(defaultParams.build())

        val authTabIntent = authBuilder.build()
        val intent = authTabIntent.intent
        intent.data = Uri.parse(url)
        options.browserPackage?.let { intent.setPackage(it) }

        if (redirectUrl != null) {
            val redirectUri = Uri.parse(redirectUrl)
            val scheme = redirectUri.scheme?.lowercase()
            if (scheme == "https" || scheme == "http") {
                val host = redirectUri.host
                val path = redirectUri.path ?: "/"
                if (host != null) {
                    intent.putExtra(AuthTabIntent.EXTRA_HTTPS_REDIRECT_HOST, host)
                    intent.putExtra(AuthTabIntent.EXTRA_HTTPS_REDIRECT_PATH, path)
                }
            } else if (scheme != null && scheme.isNotEmpty()) {
                intent.putExtra(AuthTabIntent.EXTRA_REDIRECT_SCHEME, scheme)
            }
        }

        activity.startActivityForResult(intent, AUTH_TAB_REQUEST_CODE)
    }

    private fun applyColorScheme(builder: CustomTabsIntent.Builder, options: BrowserNativeOptions) {
        when (options.colorScheme) {
            BrowserColorScheme.DARK -> builder.setColorScheme(CustomTabsIntent.COLOR_SCHEME_DARK)
            BrowserColorScheme.LIGHT -> builder.setColorScheme(CustomTabsIntent.COLOR_SCHEME_LIGHT)
            BrowserColorScheme.SYSTEM, null -> builder.setColorScheme(CustomTabsIntent.COLOR_SCHEME_SYSTEM)
        }
        val defaultParams = CustomTabColorSchemeParams.Builder()
        options.toolbarColor?.let { raw ->
            colorForHex(raw)?.let { defaultParams.setToolbarColor(it) }
        }
        options.secondaryToolbarColor?.let { raw ->
            colorForHex(raw)?.let { defaultParams.setSecondaryToolbarColor(it) }
        }
        builder.setDefaultColorSchemeParams(defaultParams.build())

        if (options.colorScheme == BrowserColorScheme.DARK || options.colorScheme == BrowserColorScheme.SYSTEM) {
            val darkParams = CustomTabColorSchemeParams.Builder()
            options.toolbarColor?.let { raw ->
                colorForHex(raw)?.let { darkParams.setToolbarColor(it) }
            }
            options.secondaryToolbarColor?.let { raw ->
                colorForHex(raw)?.let { darkParams.setSecondaryToolbarColor(it) }
            }
            builder.setColorSchemeParams(CustomTabsIntent.COLOR_SCHEME_DARK, darkParams.build())
        }
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
