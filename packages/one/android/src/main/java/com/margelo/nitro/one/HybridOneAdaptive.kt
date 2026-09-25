package com.margelo.nitro.one

import android.app.Activity
import android.content.ComponentCallbacks
import android.content.Context
import android.content.res.Configuration
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import androidx.core.util.Consumer
import androidx.window.WindowSdkExtensions
import androidx.window.java.layout.WindowInfoTrackerCallbackAdapter
import androidx.window.layout.FoldingFeature
import androidx.window.layout.WindowInfoTracker
import androidx.window.layout.WindowLayoutInfo
import androidx.window.layout.WindowMetricsCalculator
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise

// window size class and hinge state, the android half of OneAdaptive. size
// classes come from the current activity window's WindowMetrics against the
// Jetpack WindowSizeClass breakpoints (width compact below 600dp, height
// compact below 480dp, else regular) and re-emit on configuration and
// window-layout changes. hinge status comes from the WindowInfoTracker
// FoldingFeature (FLAT fullyOpen, HALF_OPENED partiallyOpen) with the angle
// from the hinge-angle sensor in radians; a hinge sensor with no
// FoldingFeature in the current window reads closed, and a device with no
// hinge sensor reads null. the first listener starts the monitors and the
// last removal stops them, including the sensor.
class HybridOneAdaptive : HybridOneAdaptiveSpec() {
    private val sizeClassListeners = mutableMapOf<Int, (SizeClass) -> Unit>()
    private val hingeListeners = mutableMapOf<Int, (HingeState?) -> Unit>()
    private var nextListenerId = 0

    private var configCallbacks: ComponentCallbacks? = null
    private var layoutTracker: WindowInfoTrackerCallbackAdapter? = null
    private val layoutConsumer = Consumer<WindowLayoutInfo> { info ->
        synchronized(this) {
            foldingFeatures = info.displayFeatures.filterIsInstance<FoldingFeature>()
        }
        emitSizeClassIfChanged()
        emitHinge()
    }
    private var foldingFeatures: List<FoldingFeature> = emptyList()

    private var sensorListener: SensorEventListener? = null
    private var lastAngleDeg: Float? = null
    private var hingeSensorChecked = false
    private var hingeSensor: Sensor? = null

    private var lastSizeClass: SizeClass? = null
    private var lastHinge: HingeState? = null
    private var lastHingeSet = false

    private fun activity(): Activity? =
        NitroModules.applicationContext?.currentActivity

    private fun appContext(): Context? = NitroModules.applicationContext

    private fun computeSizeClass(): SizeClass {
        val current = activity()
            ?: return SizeClass(UserInterfaceSizeClass.UNSPECIFIED, UserInterfaceSizeClass.UNSPECIFIED)
        return try {
            val metrics = WindowMetricsCalculator.getOrCreate().computeCurrentWindowMetrics(current)
            val density = current.resources.displayMetrics.density
            if (density <= 0) {
                return SizeClass(UserInterfaceSizeClass.UNSPECIFIED, UserInterfaceSizeClass.UNSPECIFIED)
            }
            val widthDp = metrics.bounds.width() / density
            val heightDp = metrics.bounds.height() / density
            SizeClass(
                if (widthDp < 600) UserInterfaceSizeClass.COMPACT else UserInterfaceSizeClass.REGULAR,
                if (heightDp < 480) UserInterfaceSizeClass.COMPACT else UserInterfaceSizeClass.REGULAR
            )
        } catch (e: Exception) {
            throw OneNativeError("E_ADAPTIVE_SIZE_CLASS", "Adaptive.getSizeClass: ${e.message}")
        }
    }

    private fun hasHingeSensor(): Boolean {
        synchronized(this) {
            if (hingeSensorChecked) return hingeSensor != null
            hingeSensorChecked = true
            hingeSensor =
                try {
                    val manager = appContext()?.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
                    manager?.getDefaultSensor(Sensor.TYPE_HINGE_ANGLE)
                } catch (e: Exception) {
                    null
                }
            return hingeSensor != null
        }
    }

    private fun currentFoldingFeatures(): List<FoldingFeature> {
        synchronized(this) {
            if (foldingFeatures.isNotEmpty()) return foldingFeatures
        }
        // one-shot read before any layout callback has landed.
        return try {
            val context = appContext()
            val current = activity()
            if (context == null || current == null) emptyList()
            else if (WindowSdkExtensions.getInstance().extensionVersion < 9) emptyList()
            else {
                WindowInfoTracker.getOrCreate(context)
                    .getCurrentWindowLayoutInfo(current)
                    .displayFeatures.filterIsInstance<FoldingFeature>()
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    private fun computeHinge(): HingeState? {
        if (!hasHingeSensor()) return null
        val angleRad =
            synchronized(this) { lastAngleDeg }?.let { (it * Math.PI / 180.0) }
        val features = currentFoldingFeatures()
        val feature = features.firstOrNull()
        return when (feature?.state) {
            FoldingFeature.State.FLAT ->
                HingeState(HingeStatus.FULLYOPEN, angleRad ?: Math.PI)
            FoldingFeature.State.HALF_OPENED ->
                HingeState(HingeStatus.PARTIALLYOPEN, angleRad ?: (Math.PI / 2.0))
            else -> HingeState(HingeStatus.CLOSED, angleRad ?: 0.0)
        }
    }

    override fun getSizeClass(): Promise<SizeClass> =
        Promise.async {
            try {
                computeSizeClass()
            } catch (e: OneNativeError) {
                throw e
            } catch (e: Exception) {
                throw OneNativeError("E_ADAPTIVE_SIZE_CLASS", "Adaptive.getSizeClass: ${e.message}")
            }
        }

    // synchronous seed for the JS import-time read: the same measurement as
    // getSizeClass/getHinge, unspecified when no activity is attached yet.
    override fun getInitialSizeClass(): SizeClass = computeSizeClass()

    override fun getInitialHinge(): HingeState? = computeHinge()

    override fun getHinge(): Promise<HingeState?> =
        Promise.async {
            try {
                computeHinge()
            } catch (e: OneNativeError) {
                throw e
            } catch (e: Exception) {
                throw OneNativeError("E_ADAPTIVE_HINGE", "Adaptive.getHinge: ${e.message}")
            }
        }

    override fun addSizeClassListener(listener: (sizeClass: SizeClass) -> Unit): () -> Unit {
        val id: Int
        val shouldStart: Boolean
        synchronized(this) {
            id = nextListenerId++
            sizeClassListeners[id] = listener
            shouldStart = sizeClassListeners.size + hingeListeners.size == 1
        }
        if (shouldStart) startMonitors()
        // deliver the current value to the newcomer without racing the monitor.
        try {
            val current = computeSizeClass()
            synchronized(this) {
                if (lastSizeClass == null) lastSizeClass = current
            }
            listener(current)
        } catch (e: Exception) {
            // monitoring continues; the next change still emits.
        }
        return { removeSizeClassListener(id) }
    }

    override fun addHingeListener(listener: (hinge: HingeState?) -> Unit): () -> Unit {
        val id: Int
        val shouldStart: Boolean
        synchronized(this) {
            id = nextListenerId++
            hingeListeners[id] = listener
            shouldStart = sizeClassListeners.size + hingeListeners.size == 1
        }
        if (shouldStart) startMonitors() else startSensorIfNeeded()
        try {
            val current = computeHinge()
            synchronized(this) {
                if (!lastHingeSet) {
                    lastHinge = current
                    lastHingeSet = true
                }
            }
            listener(current)
        } catch (e: Exception) {
        }
        return { removeHingeListener(id) }
    }

    private fun removeSizeClassListener(id: Int) {
        val shouldStop: Boolean
        synchronized(this) {
            sizeClassListeners.remove(id)
            shouldStop = sizeClassListeners.isEmpty() && hingeListeners.isEmpty()
        }
        if (shouldStop) stopMonitors()
    }

    private fun removeHingeListener(id: Int) {
        val shouldStop: Boolean
        val stopSensor: Boolean
        synchronized(this) {
            hingeListeners.remove(id)
            shouldStop = sizeClassListeners.isEmpty() && hingeListeners.isEmpty()
            stopSensor = hingeListeners.isEmpty()
        }
        if (stopSensor) stopSensor()
        if (shouldStop) stopMonitors()
    }

    private fun startMonitors() {
        val context = appContext() ?: return
        synchronized(this) {
            if (configCallbacks == null) {
                val callbacks =
                    object : ComponentCallbacks {
                        override fun onConfigurationChanged(newConfig: Configuration) {
                            emitSizeClassIfChanged()
                            emitHinge()
                        }

                        override fun onLowMemory() = Unit
                    }
                configCallbacks = callbacks
                context.registerComponentCallbacks(callbacks)
            }
        }
        startLayoutTracking()
        startSensorIfNeeded()
    }

    private fun startLayoutTracking() {
        synchronized(this) {
            if (layoutTracker != null) return
        }
        try {
            val context = appContext() ?: return
            val current = activity() ?: return
            val tracker = WindowInfoTrackerCallbackAdapter(WindowInfoTracker.getOrCreate(context))
            tracker.addWindowLayoutInfoListener(
                current, ContextCompat.getMainExecutor(context), layoutConsumer
            )
            synchronized(this) {
                layoutTracker = tracker
            }
        } catch (e: Exception) {
            // window tracking is best-effort; configuration changes still emit.
        }
    }

    private fun startSensorIfNeeded() {
        val hasListeners: Boolean
        synchronized(this) {
            hasListeners = hingeListeners.isNotEmpty()
            if (!hasListeners || sensorListener != null) return
        }
        if (!hasHingeSensor()) return
        try {
            val manager = appContext()?.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
            val sensor = synchronized(this) { hingeSensor } ?: return
            val listener =
                object : SensorEventListener {
                    override fun onSensorChanged(event: SensorEvent) {
                        val degrees = event.values.firstOrNull() ?: return
                        synchronized(this@HybridOneAdaptive) {
                            lastAngleDeg = degrees
                        }
                        emitHinge()
                    }

                    override fun onAccuracyChanged(sensor: Sensor, accuracy: Int) = Unit
                }
            manager?.registerListener(
                listener, sensor, SensorManager.SENSOR_DELAY_NORMAL,
                Handler(Looper.getMainLooper())
            )
            synchronized(this) {
                // a second caller may have registered while we were working.
                if (sensorListener == null) sensorListener = listener
                else manager?.unregisterListener(listener)
            }
        } catch (e: Exception) {
            // hinge angle stays at its default; status still reports.
        }
    }

    private fun stopSensor() {
        val listener: SensorEventListener?
        synchronized(this) {
            listener = sensorListener
            sensorListener = null
        }
        if (listener != null) {
            try {
                val manager = appContext()?.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
                manager?.unregisterListener(listener)
            } catch (e: Exception) {
            }
        }
    }

    private fun stopMonitors() {
        val callbacks: ComponentCallbacks?
        val tracker: WindowInfoTrackerCallbackAdapter?
        synchronized(this) {
            callbacks = configCallbacks
            configCallbacks = null
            tracker = layoutTracker
            layoutTracker = null
        }
        if (callbacks != null) {
            try {
                appContext()?.unregisterComponentCallbacks(callbacks)
            } catch (e: Exception) {
            }
        }
        if (tracker != null) {
            try {
                tracker.removeWindowLayoutInfoListener(layoutConsumer)
            } catch (e: Exception) {
            }
        }
        stopSensor()
    }

    private fun emitSizeClassIfChanged() {
        val next: SizeClass
        try {
            next = computeSizeClass()
        } catch (e: Exception) {
            return
        }
        // a rotation can detach the activity before the new window exists;
        // reattach layout tracking once it is back.
        if (next.horizontal != UserInterfaceSizeClass.UNSPECIFIED) startLayoutTracking()
        val changed: Boolean
        synchronized(this) {
            changed = lastSizeClass == null || lastSizeClass != next
            if (changed) lastSizeClass = next
        }
        if (!changed) return
        val current = synchronized(this) { sizeClassListeners.values.toList() }
        current.forEach {
            try {
                it(next)
            } catch (e: Exception) {
            }
        }
    }

    private fun emitHinge() {
        val next: HingeState?
        try {
            next = computeHinge()
        } catch (e: Exception) {
            return
        }
        val changed: Boolean
        synchronized(this) {
            changed = !lastHingeSet || lastHinge != next
            if (changed) {
                lastHinge = next
                lastHingeSet = true
            }
        }
        if (!changed) return
        val current = synchronized(this) { hingeListeners.values.toList() }
        current.forEach {
            try {
                it(next)
            } catch (e: Exception) {
            }
        }
    }
}
