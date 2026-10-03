package com.margelo.nitro.one

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Handler
import android.os.HandlerThread
import android.os.SystemClock
import com.margelo.nitro.NitroModules

class HybridOneMotion : HybridOneMotionSpec() {
    private val manager = requireNotNull(NitroModules.applicationContext)
        .getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private data class Listener(val sensor: MotionSensor, val intervalMs: Double,
        val reading: (MotionReading) -> Unit, val error: (String, String) -> Unit,
        var lastNs: Long = 0)
    private val listeners = mutableMapOf<Int, Listener>()
    private var nextId = 0
    private var thread: HandlerThread? = null
    private val registered = mutableMapOf<Int, Int>()
    private var gravity = MotionVector(0.0, 0.0, 0.0)
    private var rotation = MotionVector(0.0, 0.0, 0.0)
    private var attitude = MotionVector(0.0, 0.0, 0.0)
    private val matrix = FloatArray(9)
    private val orientation = FloatArray(3)

    override fun getAvailability() = MotionAvailability(
        available(MotionSensor.ACCELEROMETER), available(MotionSensor.GYROSCOPE),
        available(MotionSensor.MAGNETOMETER), available(MotionSensor.DEVICEMOTION))

    private fun types(sensor: MotionSensor): List<Int> = when (sensor) {
        MotionSensor.ACCELEROMETER -> listOf(Sensor.TYPE_ACCELEROMETER)
        MotionSensor.GYROSCOPE -> listOf(Sensor.TYPE_GYROSCOPE)
        MotionSensor.MAGNETOMETER -> listOf(Sensor.TYPE_MAGNETIC_FIELD)
        MotionSensor.DEVICEMOTION -> listOf(Sensor.TYPE_LINEAR_ACCELERATION,
            Sensor.TYPE_GRAVITY, Sensor.TYPE_GYROSCOPE, Sensor.TYPE_ROTATION_VECTOR)
    }

    private fun available(sensor: MotionSensor) = types(sensor).all { manager.getDefaultSensor(it) != null }

    override fun addListener(sensor: MotionSensor, intervalMs: Double,
        onReading: (MotionReading) -> Unit, onError: (String, String) -> Unit): () -> Unit {
        require(intervalMs.isFinite() && intervalMs >= 0 && intervalMs <= 1000)
        val id: Int
        synchronized(this) {
            if (!available(sensor)) {
                onError("E_MOTION_UNAVAILABLE", "Motion.addListener: $sensor is unavailable on this device")
                return {}
            }
            id = nextId++
            listeners[id] = Listener(sensor, intervalMs, onReading, onError)
            update()
        }
        return { synchronized(this) {
            listeners.remove(id)
            update()
        } }
    }

    private fun update() {
        val wanted = mutableMapOf<Int, Int>()
        for (listener in listeners.values) {
            for (type in types(listener.sensor)) {
                val hardwareFloor = manager.getDefaultSensor(type)!!.minDelay
                val period = if (listener.intervalMs == 0.0) SensorManager.SENSOR_DELAY_FASTEST
                    else maxOf(hardwareFloor, (listener.intervalMs * 1000).toInt())
                wanted[type] = minOf(wanted[type] ?: Int.MAX_VALUE, period)
            }
        }
        for (type in registered.keys.toList()) {
            if (wanted[type] != registered[type]) {
                manager.unregisterListener(events, manager.getDefaultSensor(type))
                registered.remove(type)
            }
        }
        if (wanted.isEmpty()) {
            thread?.quitSafely()
            thread = null
            return
        }
        val worker = thread ?: HandlerThread("one.motion").also { it.start(); thread = it }
        for ((type, period) in wanted) {
            if (registered[type] == period) continue
            if (!manager.registerListener(events, manager.getDefaultSensor(type), period, Handler(worker.looper))) {
                manager.unregisterListener(events)
                registered.clear()
                val failed = listeners.values.toList()
                listeners.clear()
                thread?.quitSafely()
                thread = null
                failed.forEach { it.error("E_MOTION_STREAM", "Motion.addListener: sensor registration failed") }
                return
            }
            registered[type] = period
        }
    }

    private val events = object : SensorEventListener {
        override fun onAccuracyChanged(sensor: Sensor, accuracy: Int) {}
        override fun onSensorChanged(event: SensorEvent) {
            synchronized(this@HybridOneMotion) {
                val type = event.sensor.type
                val scale = if (type == Sensor.TYPE_ACCELEROMETER || type == Sensor.TYPE_LINEAR_ACCELERATION ||
                    type == Sensor.TYPE_GRAVITY) SensorManager.GRAVITY_EARTH.toDouble() else 1.0
                val value = MotionVector(event.values[0] / scale, event.values[1] / scale, event.values[2] / scale)
                when (type) {
                    Sensor.TYPE_GRAVITY -> gravity = value
                    Sensor.TYPE_GYROSCOPE -> rotation = value
                    Sensor.TYPE_ROTATION_VECTOR -> {
                        SensorManager.getRotationMatrixFromVector(matrix, event.values)
                        SensorManager.getOrientation(matrix, orientation)
                        attitude = MotionVector(orientation[2].toDouble(), orientation[1].toDouble(), orientation[0].toDouble())
                    }
                }
                val sensor = when (type) {
                    Sensor.TYPE_ACCELEROMETER -> MotionSensor.ACCELEROMETER
                    Sensor.TYPE_GYROSCOPE -> MotionSensor.GYROSCOPE
                    Sensor.TYPE_MAGNETIC_FIELD -> MotionSensor.MAGNETOMETER
                    Sensor.TYPE_LINEAR_ACCELERATION -> MotionSensor.DEVICEMOTION
                    else -> return
                }
                val timestamp = System.currentTimeMillis() +
                    (event.timestamp - SystemClock.elapsedRealtimeNanos()) / 1_000_000.0
                val fused = sensor == MotionSensor.DEVICEMOTION
                val reading = MotionReading(sensor, timestamp, value,
                    if (fused) gravity else null, if (fused) value else null,
                    if (fused) rotation else null, if (fused) attitude else null)
                for (listener in listeners.values) {
                    if (listener.sensor != sensor) continue
                    if (listener.lastNs != 0L && event.timestamp - listener.lastNs <
                        (listener.intervalMs * 1_000_000).toLong()) continue
                    listener.lastNs = event.timestamp
                    listener.reading(reading)
                }
            }
        }
    }
}
