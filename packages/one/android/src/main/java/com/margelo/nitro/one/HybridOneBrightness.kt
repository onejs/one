package com.margelo.nitro.one

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.view.WindowManager
import com.facebook.react.bridge.ReactApplicationContext
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise

// screen brightness behind One.Brightness, matching expo-brightness: app
// brightness overrides the current activity's window, system brightness and
// mode read and write Settings.System. system writes need the write-settings
// grant, which one prebuild stamps from native.app brightness; without it
// they reject with E_BRIGHTNESS_PERMISSIONS. listeners never fire on
// android, matching expo. window work runs on the main thread, where the
// activity lives.
class HybridOneBrightness : HybridOneBrightnessSpec() {
    companion object {
        private const val PREFS = "one.brightness"
        private const val ASKED_KEY = "asked"
        private const val E_STATE = "E_BRIGHTNESS_STATE"
        private const val E_SYSTEM = "E_BRIGHTNESS_SYSTEM"
        private const val E_MODE = "E_BRIGHTNESS_MODE"
        private const val E_PERMISSIONS = "E_BRIGHTNESS_PERMISSIONS"
    }

    private val context: ReactApplicationContext
        get() = NitroModules.applicationContext
            ?: throw IllegalStateException("Brightness: the react context is not ready")

    private fun activity(): Activity? = context.currentActivity

    private fun systemBrightness(): Double {
        val raw = Settings.System.getInt(
            context.contentResolver,
            Settings.System.SCREEN_BRIGHTNESS,
            255
        )
        return (raw.coerceIn(0, 255)) / 255.0
    }

    private fun systemMode(): BrightnessMode {
        return when (
            Settings.System.getInt(
                context.contentResolver,
                Settings.System.SCREEN_BRIGHTNESS_MODE,
                Settings.System.SCREEN_BRIGHTNESS_MODE_MANUAL
            )
        ) {
            Settings.System.SCREEN_BRIGHTNESS_MODE_AUTOMATIC -> BrightnessMode.AUTOMATIC
            Settings.System.SCREEN_BRIGHTNESS_MODE_MANUAL -> BrightnessMode.MANUAL
            else -> BrightnessMode.UNKNOWN
        }
    }

    private fun canWrite(): Boolean =
        if (Build.VERSION.SDK_INT >= 23) {
            Settings.System.canWrite(context)
        } else {
            true
        }

    private fun permissionResponse(): BrightnessPermissionResponse {
        if (canWrite()) {
            return BrightnessPermissionResponse(BrightnessPermissionStatus.GRANTED, true, false)
        }
        val asked = context.getSharedPreferences(PREFS, Activity.MODE_PRIVATE)
            .getBoolean(ASKED_KEY, false)
        val status =
            if (asked) BrightnessPermissionStatus.DENIED
            else BrightnessPermissionStatus.UNDETERMINED
        // the grant lives in system settings, which stay reachable.
        return BrightnessPermissionResponse(status, false, true)
    }

    private fun <T> guarded(code: String, verb: String, body: () -> T): Promise<T> =
        Promise.async {
            try {
                body()
            } catch (e: Exception) {
                throw OneNativeError(code, "Brightness.$verb: ${e.message}")
            }
        }

    private fun requireWrite(verb: String) {
        if (!canWrite()) {
            throw OneNativeError(
                E_PERMISSIONS,
                "Brightness.$verb: system brightness needs the write-settings permission: " +
                    "set native.app brightness and rerun one prebuild, then grant it in settings"
            )
        }
    }

    override fun get(): Promise<Double> =
        guarded(E_STATE, "get") {
            val override = activity()?.window?.attributes?.screenBrightness
                ?: WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE
            if (override < 0) systemBrightness() else override.toDouble()
        }

    override fun set(value: Double): Promise<Unit> {
        val promise = Promise<Unit>()
        val current = activity()
        if (current == null) {
            promise.reject(OneNativeError(E_STATE, "Brightness.set: no activity is attached"))
            return promise
        }
        current.runOnUiThread {
            try {
                val params = current.window.attributes
                params.screenBrightness = value.toFloat()
                current.window.attributes = params
                promise.resolve(Unit)
            } catch (e: Exception) {
                promise.reject(OneNativeError(E_STATE, "Brightness.set: ${e.message}"))
            }
        }
        return promise
    }

    override fun getSystem(): Promise<Double> =
        guarded(E_SYSTEM, "getSystem") { systemBrightness() }

    override fun setSystem(value: Double): Promise<Unit> =
        Promise.async {
            requireWrite("setSystem")
            val resolver = context.contentResolver
            Settings.System.putInt(
                resolver,
                Settings.System.SCREEN_BRIGHTNESS_MODE,
                Settings.System.SCREEN_BRIGHTNESS_MODE_MANUAL
            )
            val written = Settings.System.putInt(
                resolver,
                Settings.System.SCREEN_BRIGHTNESS,
                (value * 255).toInt().coerceIn(0, 255)
            )
            if (!written) {
                throw OneNativeError(E_SYSTEM, "Brightness.setSystem: the system rejected the write")
            }
        }

    override fun getSystemMode(): Promise<BrightnessMode> =
        guarded(E_MODE, "getSystemMode") { systemMode() }

    override fun setSystemMode(mode: BrightnessMode): Promise<Unit> =
        Promise.async {
            requireWrite("setSystemMode")
            val raw = when (mode) {
                BrightnessMode.MANUAL -> Settings.System.SCREEN_BRIGHTNESS_MODE_MANUAL
                BrightnessMode.AUTOMATIC -> Settings.System.SCREEN_BRIGHTNESS_MODE_AUTOMATIC
                BrightnessMode.UNKNOWN ->
                    throw OneNativeError(E_MODE, "Brightness.setSystemMode: mode cannot be unknown")
            }
            val written = Settings.System.putInt(
                context.contentResolver,
                Settings.System.SCREEN_BRIGHTNESS_MODE,
                raw
            )
            if (!written) {
                throw OneNativeError(E_MODE, "Brightness.setSystemMode: the system rejected the write")
            }
        }

    override fun isUsingSystem(): Promise<Boolean> =
        guarded(E_STATE, "isUsingSystem") {
            val override = activity()?.window?.attributes?.screenBrightness
            override == null || override < 0
        }

    override fun restoreSystem(): Promise<Unit> {
        val promise = Promise<Unit>()
        val current = activity()
        if (current == null) {
            promise.resolve(Unit)
            return promise
        }
        current.runOnUiThread {
            try {
                val params = current.window.attributes
                params.screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE
                current.window.attributes = params
                promise.resolve(Unit)
            } catch (e: Exception) {
                promise.reject(OneNativeError(E_STATE, "Brightness.restoreSystem: ${e.message}"))
            }
        }
        return promise
    }

    override fun getPermissions(): Promise<BrightnessPermissionResponse> =
        Promise.resolved(permissionResponse())

    override fun requestPermissions(): Promise<BrightnessPermissionResponse> {
        context.getSharedPreferences(PREFS, Activity.MODE_PRIVATE)
            .edit()
            .putBoolean(ASKED_KEY, true)
            .apply()
        if (!canWrite() && Build.VERSION.SDK_INT >= 23) {
            val intent = Intent(
                Settings.ACTION_MANAGE_WRITE_SETTINGS,
                Uri.parse("package:${context.packageName}")
            ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
        }
        return Promise.resolved(permissionResponse())
    }

    override fun isAvailable(): Boolean = true

    // expo never fires brightness events on android.
    override fun addListener(listener: (event: BrightnessEvent) -> Unit): () -> Unit = {}
}
