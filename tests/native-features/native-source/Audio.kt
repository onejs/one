package dev.onejs.nativefeatures

import dev.onejs.one.source.OneModule
import kotlin.math.sqrt

object AudioMath : OneModule {
    fun rms(samples: List<Double>): Double = sqrt(samples.map { it * it }.average())

    fun label(name: String): String {
        require(name.isNotEmpty()) { "name is empty" }
        return "kotlin:$name"
    }
}
