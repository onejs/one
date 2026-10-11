package dev.onejs.nativefeatures

import dev.onejs.one.source.OneModule
import java.util.Date

data class Waypoint(val x: Double, val y: Double, val label: String? = null)

enum class Compass {
    NORTH,
    SOUTH
}

object EscapeHatch : OneModule {
    fun pin(point: Waypoint): Waypoint = point
    fun heading(direction: Compass): Compass = direction
    fun at(moment: Date): Date = moment
    fun blob(data: ByteArray): ByteArray = data

    private var tick: ((Double) -> Unit)? = null
    fun onTick(callback: (Double) -> Unit) {
        tick = callback
        Thread {
            Thread.sleep(100)
            tick?.invoke(1.0)
        }.start()
    }
}
