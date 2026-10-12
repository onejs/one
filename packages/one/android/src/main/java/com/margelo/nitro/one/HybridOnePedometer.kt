package com.margelo.nitro.one

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.Looper
import androidx.core.content.ContextCompat
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise

// step counting behind One.Pedometer, matching expo-sensors' Pedometer:
// the TYPE_STEP_COUNTER sensor streams steps since the watch started,
// while the date-range history query is ios-only and rejects here,
// matching expo. android 10 and later gate the counter behind the
// activity-recognition permission, which one prebuild stamps from
// native.app pedometer. the first watch registers the sensor, so the
// first event can never race the subscription. without hardware the
// watches stay registered and never fire, matching expo.
class HybridOnePedometer : HybridOnePedometerSpec(), PermissionListener {
    companion object {
        private const val PREFS = "one.pedometer"
        private const val ASKED_KEY = "asked"
        private const val E_STEP_COUNT = "E_PEDOMETER_STEP_COUNT"
        private const val E_PERMISSIONS = "E_PEDOMETER_PERMISSIONS"
        private const val E_MANIFEST = "E_PEDOMETER_MANIFEST"
        private const val PEDOMETER_REQUEST_CODE = 4302
    }

    private val manager = requireNotNull(NitroModules.applicationContext)
        .getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val mainHandler = Handler(Looper.getMainLooper())
    private val lock = Any()
    private val listeners = mutableMapOf<Int, (PedometerResult) -> Unit>()
    private var nextListenerId = 0
    private var baseline: Float? = null
    private var registered = false
    private var thread: HandlerThread? = null
    private val permissionPromises = mutableListOf<Promise<PedometerPermissionResponse>>()

    private val context: Context
        get() = NitroModules.applicationContext
            ?: throw IllegalStateException("Pedometer: the react context is not ready")

    override fun isAvailable(): Boolean =
        manager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null

    override fun watchStepCount(listener: (PedometerResult) -> Unit): () -> Unit {
        val id: Int
        synchronized(lock) {
            id = nextListenerId
            nextListenerId += 1
            listeners[id] = listener
            reregisterLocked()
        }
        return {
            synchronized(lock) {
                listeners.remove(id)
                reregisterLocked()
            }
        }
    }

    override fun getStepCount(startMs: Double, endMs: Double): Promise<PedometerResult> =
        Promise.async {
            if (!startMs.isFinite() || !endMs.isFinite() || startMs > endMs) {
                throw OneNativeError(E_STEP_COUNT, "Pedometer.getStepCount: start must precede end")
            }
            throw OneNativeError(
                E_STEP_COUNT,
                "Pedometer.getStepCount: step history is not available on Android"
            )
        }

    override fun getPermissions(): Promise<PedometerPermissionResponse> =
        Promise.resolved(permissionResponse())

    override fun requestPermissions(): Promise<PedometerPermissionResponse> {
        val promise = Promise<PedometerPermissionResponse>()
        mainHandler.post {
            if (Build.VERSION.SDK_INT < 29) {
                promise.resolve(granted())
                return@post
            }
            val current = permissionResponse()
            if (current.granted) {
                promise.resolve(current)
                return@post
            }
            if (!declaresRecognition(context)) {
                promise.reject(
                    OneNativeError(E_MANIFEST, "Pedometer.requestPermissions: set native.app.pedometer")
                )
                return@post
            }
            val activity = currentActivity()
            if (activity == null) {
                promise.reject(
                    OneNativeError(E_PERMISSIONS, "Pedometer.requestPermissions: app must be active")
                )
                return@post
            }
            permissionPromises.add(promise)
            if (permissionPromises.size > 1) return@post
            val aware = activity as? PermissionAwareActivity
            if (aware != null) {
                aware.requestPermissions(
                    arrayOf(Manifest.permission.ACTIVITY_RECOGNITION),
                    PEDOMETER_REQUEST_CODE, this
                )
            } else {
                androidx.core.app.ActivityCompat.requestPermissions(
                    activity,
                    arrayOf(Manifest.permission.ACTIVITY_RECOGNITION),
                    PEDOMETER_REQUEST_CODE
                )
            }
        }
        return promise
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ): Boolean {
        if (requestCode != PEDOMETER_REQUEST_CODE) return false
        mainHandler.post {
            markAsked()
            val response = permissionResponse()
            val pending = permissionPromises.toList()
            permissionPromises.clear()
            for (promise in pending) promise.resolve(response)
        }
        return true
    }

    private fun granted(): PedometerPermissionResponse =
        PedometerPermissionResponse(PedometerPermissionStatus.GRANTED, true, false)

    private fun permissionResponse(): PedometerPermissionResponse {
        if (Build.VERSION.SDK_INT < 29) return granted()
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACTIVITY_RECOGNITION) ==
            PackageManager.PERMISSION_GRANTED
        ) {
            return granted()
        }
        val asked = context.getSharedPreferences(PREFS, Activity.MODE_PRIVATE)
            .getBoolean(ASKED_KEY, false)
        val status =
            if (asked) PedometerPermissionStatus.DENIED
            else PedometerPermissionStatus.UNDETERMINED
        return PedometerPermissionResponse(status, false, true)
    }

    private fun declaresRecognition(context: Context): Boolean {
        return try {
            @Suppress("DEPRECATION")
            context.packageManager.getPackageInfo(context.packageName, PackageManager.GET_PERMISSIONS)
                .requestedPermissions?.contains(Manifest.permission.ACTIVITY_RECOGNITION) == true
        } catch (_: Exception) {
            false
        }
    }

    private fun markAsked() {
        context.getSharedPreferences(PREFS, Activity.MODE_PRIVATE)
            .edit().putBoolean(ASKED_KEY, true).apply()
    }

    private fun currentActivity(): Activity? {
        val activity = NitroModules.applicationContext?.currentActivity ?: return null
        if (activity.isFinishing || activity.isDestroyed) return null
        return activity
    }

    private fun reregisterLocked() {
        val sensor = manager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        if (listeners.isEmpty() || sensor == null) {
            if (registered) {
                manager.unregisterListener(events)
                registered = false
            }
            thread?.quitSafely()
            thread = null
            baseline = null
            return
        }
        if (registered) return
        val worker = thread ?: HandlerThread("one.pedometer").also { it.start(); thread = it }
        registered = manager.registerListener(
            events, sensor, SensorManager.SENSOR_DELAY_NORMAL, Handler(worker.looper)
        )
        if (!registered) {
            thread?.quitSafely()
            thread = null
        }
    }

    private val events = object : SensorEventListener {
        override fun onAccuracyChanged(sensor: Sensor, accuracy: Int) {}
        override fun onSensorChanged(event: SensorEvent) {
            if (event.sensor.type != Sensor.TYPE_STEP_COUNTER) return
            val total = event.values[0]
            val anchor = baseline
            val steps: Double
            synchronized(lock) {
                if (anchor == null || total < anchor) {
                    // the first sample anchors the watch; a reboot resets
                    // the counter below the anchor and re-anchors it.
                    baseline = total
                    steps = 0.0
                } else {
                    steps = (total - anchor).toDouble()
                }
            }
            val current: List<(PedometerResult) -> Unit>
            synchronized(lock) { current = listeners.values.toList() }
            val result = PedometerResult(steps)
            for (listener in current) listener(result)
        }
    }
}
