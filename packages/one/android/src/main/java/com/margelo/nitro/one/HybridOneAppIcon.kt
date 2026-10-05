package com.margelo.nitro.one

import android.app.Activity
import android.content.ComponentName
import android.content.Context
import android.content.pm.ActivityInfo
import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.LifecycleEventListener
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise

// alternate launcher icons matching the ios contract. the alias set lives
// in the app manifest as manually supplied activity-alias entries (no new
// config surface): the icon name is the alias component's simple name.
// isSupported is true only when at least one alias exists; without aliases
// setIcon rejects unavailable.
class HybridOneAppIcon : HybridOneAppIconSpec(), LifecycleEventListener {
    private var changing = false
    @Volatile private var active = false
    private val mainHandler = Handler(Looper.getMainLooper())

    init {
        NitroModules.applicationContext?.addLifecycleEventListener(this)
    }

    override fun dispose() {
        NitroModules.applicationContext?.removeLifecycleEventListener(this)
        super.dispose()
    }

    override fun onHostResume() {
        active = true
    }

    override fun onHostPause() {
        active = false
    }

    override fun onHostDestroy() {
        active = false
    }

    override fun isSupported(): Promise<Boolean> {
        val promise = Promise<Boolean>()
        mainHandler.post {
            val context = NitroModules.applicationContext
            promise.resolve(context != null && aliases(context).isNotEmpty())
        }
        return promise
    }

    override fun getCurrentName(): Promise<String?> {
        val promise = Promise<String?>()
        mainHandler.post {
            val context = NitroModules.applicationContext
            if (context == null) {
                promise.resolve(null)
                return@post
            }
            val manager = context.packageManager
            for (alias in aliases(context)) {
                val component = ComponentName(context.packageName, alias.name)
                if (manager.getComponentEnabledSetting(component) ==
                    PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                ) {
                    promise.resolve(simpleName(alias.name))
                    return@post
                }
            }
            promise.resolve(null)
        }
        return promise
    }

    override fun setIcon(name: String?): Promise<Unit> {
        val promise = Promise<Unit>()
        mainHandler.post {
            val context = NitroModules.applicationContext
            val known = if (context != null) aliases(context) else emptyList()
            if (name != null && known.none { simpleName(it.name) == name }) {
                promise.reject(
                    OneNativeError("E_APP_ICON_INPUT", "AppIcon.setIcon: unknown alternate icon $name")
                )
                return@post
            }
            if (context == null || known.isEmpty()) {
                promise.reject(
                    OneNativeError("E_APP_ICON_UNAVAILABLE", "AppIcon.setIcon: alternate icons are unavailable")
                )
                return@post
            }
            if (currentActivity() == null) {
                promise.reject(
                    OneNativeError("E_APP_ICON_INACTIVE", "AppIcon.setIcon: app must be active")
                )
                return@post
            }
            if (changing) {
                promise.reject(
                    OneNativeError("E_APP_ICON_BUSY", "AppIcon.setIcon: another icon change is in progress")
                )
                return@post
            }
            val manager = context.packageManager
            val current = known.firstOrNull { alias ->
                manager.getComponentEnabledSetting(
                    ComponentName(context.packageName, alias.name)
                ) == PackageManager.COMPONENT_ENABLED_STATE_ENABLED
            }?.let { simpleName(it.name) }
            if (current == name) {
                promise.resolve(Unit)
                return@post
            }
            changing = true
            try {
                // the primary launcher is whatever the aliases target, so
                // it resolves even while an alias is active.
                val primary = known.firstNotNullOfOrNull { alias ->
                    alias.targetActivity?.let { target ->
                        val resolved = if (target.startsWith(".")) context.packageName + target else target
                        ComponentName(context.packageName, resolved)
                    }
                }
                for (alias in known) {
                    val component = ComponentName(context.packageName, alias.name)
                    val enable = simpleName(alias.name) == name
                    manager.setComponentEnabledSetting(
                        component,
                        if (enable) PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                        else PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                        PackageManager.DONT_KILL_APP
                    )
                }
                // the primary launcher stays enabled unless an alias takes
                // over; restoring nil re-enables it.
                if (primary != null) {
                    manager.setComponentEnabledSetting(
                        primary,
                        if (name == null) PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                        else PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                        PackageManager.DONT_KILL_APP
                    )
                }
                promise.resolve(Unit)
            } catch (e: Exception) {
                promise.reject(
                    OneNativeError("E_APP_ICON_CHANGE", "AppIcon.setIcon: ${e.message}")
                )
            } finally {
                changing = false
            }
        }
        return promise
    }

    private fun currentActivity(): Activity? {
        if (!active) return null
        val activity = NitroModules.applicationContext?.currentActivity ?: return null
        if (activity.isFinishing || activity.isDestroyed) return null
        return activity
    }

    // activity-alias entries surface in the package activities with
    // targetActivity set; plain activities carry null.
    private fun aliases(context: Context): List<ActivityInfo> {
        return try {
            @Suppress("DEPRECATION")
            val info = context.packageManager.getPackageInfo(
                context.packageName, PackageManager.GET_ACTIVITIES or PackageManager.GET_DISABLED_COMPONENTS
            )
            info.activities?.filter { it.targetActivity != null } ?: emptyList()
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun simpleName(componentName: String): String =
        componentName.substringAfterLast('.')
}
