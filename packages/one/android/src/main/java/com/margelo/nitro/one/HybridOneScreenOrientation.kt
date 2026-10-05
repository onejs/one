package com.margelo.nitro.one

import android.app.Activity
import android.app.UiModeManager
import android.content.Context
import android.content.pm.ActivityInfo
import android.content.res.Configuration
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.Display
import android.view.OrientationEventListener
import android.view.Surface
import com.facebook.react.bridge.LifecycleEventListener
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import java.util.UUID

// screen orientation matching the ios contract: five values, locks with a
// 10s verify window, change listeners on real rotation only. the current
// value is derived from display rotation plus natural orientation. runtime
// locks override the manifest on android, so a manifest conflict never
// rejects; unlock restores UNSPECIFIED, which returns to manifest behavior.
// E_SCREEN_ORIENTATION_UNSUPPORTED fires only on a non-rotatable display.
class HybridOneScreenOrientation : HybridOneScreenOrientationSpec(), LifecycleEventListener {
    @Volatile private var active = false
    private val mainHandler = Handler(Looper.getMainLooper())
    private val listeners = mutableMapOf<UUID, (ScreenOrientationValue) -> Unit>()
    private var lastValue: ScreenOrientationValue? = null
    private var sensor: OrientationEventListener? = null

    init {
        NitroModules.applicationContext?.addLifecycleEventListener(this)
    }

    override fun dispose() {
        NitroModules.applicationContext?.removeLifecycleEventListener(this)
        mainHandler.post {
            sensor?.disable()
            sensor = null
            listeners.clear()
        }
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

    override fun getOrientation(): Promise<ScreenOrientationValue> {
        val promise = Promise<ScreenOrientationValue>()
        mainHandler.post {
            val activity = currentActivity()
            if (activity == null) {
                promise.reject(sceneError("ScreenOrientation.getOrientation: no active window scene"))
                return@post
            }
            promise.resolve(valueFor(activity))
        }
        return promise
    }

    override fun lock(orientation: ScreenOrientationLock): Promise<ScreenOrientationValue> {
        val promise = Promise<ScreenOrientationValue>()
        mainHandler.post {
            val activity = currentActivity()
            if (activity == null) {
                promise.reject(sceneError("ScreenOrientation: request while a window scene is active"))
                return@post
            }
            if (!rotatable(activity)) {
                promise.reject(
                    OneNativeError(
                        "E_SCREEN_ORIENTATION_UNSUPPORTED",
                        "ScreenOrientation: this display does not rotate"
                    )
                )
                return@post
            }
            activity.requestedOrientation = requested(orientation)
            observe(activity)
            verify(activity, orientation, promise, System.currentTimeMillis())
        }
        return promise
    }

    override fun unlock(): Promise<ScreenOrientationValue> {
        val promise = Promise<ScreenOrientationValue>()
        mainHandler.post {
            val activity = currentActivity()
            if (activity == null) {
                promise.reject(sceneError("ScreenOrientation: request while a window scene is active"))
                return@post
            }
            // UNSPECIFIED returns to manifest behavior; resolve what the
            // display settles on rather than assuming it.
            activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
            observe(activity)
            settle(activity, promise, System.currentTimeMillis(), valueFor(activity))
        }
        return promise
    }

    override fun addChangeListener(onChange: (orientation: ScreenOrientationValue) -> Unit): () -> Unit {
        val id = UUID.randomUUID()
        mainHandler.post {
            listeners[id] = onChange
            currentActivity()?.let { observe(it) }
            ensureSensor()
        }
        return {
            mainHandler.post {
                listeners.remove(id)
                if (listeners.isEmpty()) {
                    sensor?.disable()
                    sensor = null
                }
            }
        }
    }

    private fun currentActivity(): Activity? {
        if (!active) return null
        val activity = NitroModules.applicationContext?.currentActivity ?: return null
        if (activity.isFinishing || activity.isDestroyed) return null
        return activity
    }

    private fun sceneError(message: String) =
        OneNativeError("E_SCREEN_ORIENTATION_SCENE", message)

    private fun rotatable(activity: Activity): Boolean {
        val uiMode = activity.getSystemService(Context.UI_MODE_SERVICE) as? UiModeManager
        return uiMode?.currentModeType != Configuration.UI_MODE_TYPE_TELEVISION
    }

    // the manifest mask read lives in the proof, not here: PackageManager
    // reports the activity's declared screenOrientation, unlock restores
    // UNSPECIFIED which defers to it, and lock never gates on it because a
    // runtime request overrides the manifest on android.
    private fun displayFor(activity: Activity): Display? {
        return try {
            if (Build.VERSION.SDK_INT >= 30) {
                activity.display
            } else {
                @Suppress("DEPRECATION")
                activity.windowManager.defaultDisplay
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun valueFor(activity: Activity): ScreenOrientationValue {
        val display = displayFor(activity) ?: return ScreenOrientationValue.UNKNOWN
        val rotation = try {
            display.rotation
        } catch (_: Exception) {
            return ScreenOrientationValue.UNKNOWN
        }
        val orientation = activity.resources.configuration.orientation
        if (orientation != Configuration.ORIENTATION_PORTRAIT &&
            orientation != Configuration.ORIENTATION_LANDSCAPE
        ) {
            return ScreenOrientationValue.UNKNOWN
        }
        val naturalPortrait = if (orientation == Configuration.ORIENTATION_PORTRAIT) {
            rotation == Surface.ROTATION_0 || rotation == Surface.ROTATION_180
        } else {
            rotation == Surface.ROTATION_90 || rotation == Surface.ROTATION_270
        }
        return when (rotation) {
            Surface.ROTATION_0 ->
                if (naturalPortrait) ScreenOrientationValue.PORTRAIT
                else ScreenOrientationValue.LANDSCAPERIGHT
            Surface.ROTATION_90 ->
                if (naturalPortrait) ScreenOrientationValue.LANDSCAPERIGHT
                else ScreenOrientationValue.PORTRAIT
            Surface.ROTATION_180 ->
                if (naturalPortrait) ScreenOrientationValue.PORTRAITUPSIDEDOWN
                else ScreenOrientationValue.LANDSCAPELEFT
            Surface.ROTATION_270 ->
                if (naturalPortrait) ScreenOrientationValue.LANDSCAPELEFT
                else ScreenOrientationValue.PORTRAITUPSIDEDOWN
            else -> ScreenOrientationValue.UNKNOWN
        }
    }

    private fun requested(orientation: ScreenOrientationLock): Int {
        return when (orientation) {
            ScreenOrientationLock.PORTRAIT -> ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
            ScreenOrientationLock.PORTRAITUPSIDEDOWN -> ActivityInfo.SCREEN_ORIENTATION_REVERSE_PORTRAIT
            ScreenOrientationLock.LANDSCAPELEFT -> ActivityInfo.SCREEN_ORIENTATION_REVERSE_LANDSCAPE
            ScreenOrientationLock.LANDSCAPERIGHT -> ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
            ScreenOrientationLock.LANDSCAPE -> ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
        }
    }

    private fun matches(value: ScreenOrientationValue, lock: ScreenOrientationLock): Boolean {
        return when (lock) {
            ScreenOrientationLock.PORTRAIT -> value == ScreenOrientationValue.PORTRAIT
            ScreenOrientationLock.PORTRAITUPSIDEDOWN -> value == ScreenOrientationValue.PORTRAITUPSIDEDOWN
            ScreenOrientationLock.LANDSCAPELEFT -> value == ScreenOrientationValue.LANDSCAPELEFT
            ScreenOrientationLock.LANDSCAPERIGHT -> value == ScreenOrientationValue.LANDSCAPERIGHT
            ScreenOrientationLock.LANDSCAPE ->
                value == ScreenOrientationValue.LANDSCAPELEFT ||
                    value == ScreenOrientationValue.LANDSCAPERIGHT
        }
    }

    private fun verify(
        activity: Activity,
        lock: ScreenOrientationLock,
        promise: Promise<ScreenOrientationValue>,
        startedMs: Long
    ) {
        if (activity.isFinishing || activity.isDestroyed) {
            promise.reject(sceneError("ScreenOrientation: request while a window scene is active"))
            return
        }
        val value = valueFor(activity)
        deliver(value)
        if (matches(value, lock)) {
            promise.resolve(value)
            return
        }
        if (System.currentTimeMillis() - startedMs >= 10_000) {
            promise.reject(
                OneNativeError(
                    "E_SCREEN_ORIENTATION_TIMEOUT",
                    "ScreenOrientation: scene did not reach the requested orientation"
                )
            )
            return
        }
        mainHandler.postDelayed({ verify(activity, lock, promise, startedMs) }, 100)
    }

    private fun settle(
        activity: Activity,
        promise: Promise<ScreenOrientationValue>,
        startedMs: Long,
        previous: ScreenOrientationValue
    ) {
        val value = valueFor(activity)
        deliver(value)
        if (value == previous || System.currentTimeMillis() - startedMs >= 2_000) {
            promise.resolve(value)
            return
        }
        mainHandler.postDelayed({ settle(activity, promise, startedMs, value) }, 100)
    }

    private fun observe(activity: Activity) {
        if (lastValue == null) lastValue = valueFor(activity)
    }

    private fun deliver(value: ScreenOrientationValue) {
        if (value == lastValue) return
        lastValue = value
        for (listener in listeners.values.toList()) {
            try {
                listener(value)
            } catch (_: Exception) {
                // a dead js runtime must not break the remaining listeners.
            }
        }
    }

    private fun ensureSensor() {
        if (sensor != null || listeners.isEmpty()) return
        val context = NitroModules.applicationContext ?: return
        sensor = object : OrientationEventListener(context) {
            override fun onOrientationChanged(orientation: Int) {
                // the display rotation is the source of truth, so listener
                // values always agree with getOrientation.
                val activity = NitroModules.applicationContext?.currentActivity ?: return
                mainHandler.post { deliver(valueFor(activity)) }
            }
        }
        val created = sensor
        if (created != null) {
            if (created.canDetectOrientation()) created.enable() else sensor = null
        }
    }
}
