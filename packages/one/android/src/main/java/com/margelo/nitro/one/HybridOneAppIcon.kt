package com.margelo.nitro.one

import android.app.Activity
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.LifecycleEventListener
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise

// launcher aliases forward to the permanent host. exactly one alias
// defaults enabled in the manifest (primary); alternates default disabled.
// public alternate names are the aliases' simple component names.
class HybridOneAppIcon : HybridOneAppIconSpec(), LifecycleEventListener {
    private var changing = false
    private var configuredAliases: List<ActivityInfo>? = null
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
            val known = if (context != null) aliases(context) else emptyList()
            promise.resolve(known.size > 1 && known.singleOrNull { it.enabled } != null)
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
            val known = aliases(context)
            val primary = known.singleOrNull { it.enabled }
            val selected = enabledAlias(context.packageManager, context.packageName, known)
            promise.resolve(selected?.takeUnless { it.name == primary?.name }?.let { simpleName(it.name) })
        }
        return promise
    }

    override fun setIcon(name: String?): Promise<Unit> {
        val promise = Promise<Unit>()
        mainHandler.post {
            val context = NitroModules.applicationContext
            val known = if (context != null) aliases(context) else emptyList()
            val primary = known.singleOrNull { it.enabled }
            if (name != null && known.none { it.name != primary?.name && simpleName(it.name) == name }) {
                promise.reject(
                    OneNativeError("E_APP_ICON_INPUT", "AppIcon.setIcon: unknown alternate icon $name")
                )
                return@post
            }
            if (context == null || primary == null || known.size < 2) {
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
            val selected = if (name == null) primary else known.first { simpleName(it.name) == name }
            if (enabledAlias(manager, context.packageName, known)?.name == selected.name) {
                promise.resolve(Unit)
                return@post
            }
            changing = true
            try {
                // enable the next launcher before disabling the previous one.
                manager.setComponentEnabledSetting(
                    ComponentName(context.packageName, selected.name),
                    PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                    PackageManager.DONT_KILL_APP
                )
                for (alias in known) {
                    if (alias.name == selected.name) continue
                    manager.setComponentEnabledSetting(
                        ComponentName(context.packageName, alias.name),
                        PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
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

    private fun enabledAlias(
        manager: PackageManager,
        packageName: String,
        known: List<ActivityInfo>
    ): ActivityInfo? = known.firstOrNull { alias ->
        when (manager.getComponentEnabledSetting(ComponentName(packageName, alias.name))) {
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED -> true
            PackageManager.COMPONENT_ENABLED_STATE_DEFAULT -> alias.enabled
            else -> false
        }
    }

    // cache immutable apk defaults; package info reflects runtime overrides.
    private fun aliases(context: Context): List<ActivityInfo> {
        configuredAliases?.let { return it }
        val found = try {
            @Suppress("DEPRECATION")
            val info = context.packageManager.getPackageArchiveInfo(
                context.applicationInfo.sourceDir, PackageManager.GET_ACTIVITIES
            )
            @Suppress("DEPRECATION")
            val launchers = context.packageManager.queryIntentActivities(
                Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
                    .setPackage(context.packageName),
                PackageManager.GET_DISABLED_COMPONENTS
            ).map { it.activityInfo.name }.toSet()
            val hostClass = NitroModules.applicationContext?.currentActivity?.javaClass?.name
            info?.activities?.filter {
                it.targetActivity != null && it.targetActivity != hostClass && it.name in launchers
            } ?: emptyList()
        } catch (_: Exception) {
            emptyList()
        }
        configuredAliases = found
        return found
    }

    private fun simpleName(componentName: String): String =
        componentName.substringAfterLast('.')
}
