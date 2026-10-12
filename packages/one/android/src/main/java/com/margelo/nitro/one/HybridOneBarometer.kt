package com.margelo.nitro.one

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Handler
import android.os.HandlerThread
import com.margelo.nitro.NitroModules
import kotlin.math.ceil

// air pressure behind One.Barometer, matching expo-sensors' Barometer: the
// TYPE_PRESSURE sensor reports hectopascals, the timestamp is boot-relative
// seconds, and android has no relative altitude. the first listener
// registers the sensor, so the first event can never race the subscription,
// and the last removal unregisters it. without hardware the listeners stay
// registered and never fire, matching expo.
class HybridOneBarometer : HybridOneBarometerSpec() {
    private val manager = requireNotNull(NitroModules.applicationContext)
        .getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val lock = Any()
    private val listeners = mutableMapOf<Int, (BarometerMeasurement) -> Unit>()
    private var nextListenerId = 0
    private var intervalMs = 0.0
    private var registered = false
    private var thread: HandlerThread? = null

    override fun isAvailable(): Boolean =
        manager.getDefaultSensor(Sensor.TYPE_PRESSURE) != null

    override fun setUpdateInterval(intervalMs: Double) {
        if (!intervalMs.isFinite() || intervalMs < 0) return
        synchronized(lock) {
            this.intervalMs = intervalMs
            reregisterLocked()
        }
    }

    override fun addListener(listener: (BarometerMeasurement) -> Unit): () -> Unit {
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

    private fun reregisterLocked() {
        val sensor = manager.getDefaultSensor(Sensor.TYPE_PRESSURE)
        if (listeners.isEmpty() || sensor == null) {
            if (registered) {
                manager.unregisterListener(events)
                registered = false
            }
            thread?.quitSafely()
            thread = null
            return
        }
        if (registered) {
            manager.unregisterListener(events)
            registered = false
        }
        val worker = thread ?: HandlerThread("one.barometer").also { it.start(); thread = it }
        val period = if (intervalMs == 0.0) SensorManager.SENSOR_DELAY_FASTEST
            else maxOf(sensor.minDelay, ceil(intervalMs * 1000).toInt())
        registered = manager.registerListener(events, sensor, period, Handler(worker.looper))
        if (!registered) {
            thread?.quitSafely()
            thread = null
        }
    }

    private val events = object : SensorEventListener {
        override fun onAccuracyChanged(sensor: Sensor, accuracy: Int) {}
        override fun onSensorChanged(event: SensorEvent) {
            if (event.sensor.type != Sensor.TYPE_PRESSURE) return
            val measurement = BarometerMeasurement(
                event.values[0].toDouble(), null, event.timestamp / 1_000_000_000.0)
            val current: List<(BarometerMeasurement) -> Unit>
            synchronized(lock) { current = listeners.values.toList() }
            for (listener in current) listener(measurement)
        }
    }
}
