package dev.onejs.one

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

internal class OneKotlinHostEvent(
    surfaceId: Int,
    viewTag: Int,
    private val name: String,
    private val args: String,
) : Event<OneKotlinHostEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = "topHostEvent"

    override fun canCoalesce(): Boolean = false

    override fun getEventData(): WritableMap =
        Arguments.createMap().apply {
            putString("name", name)
            putString("args", args)
        }
}

internal class OneKotlinHostSizeEvent(
    surfaceId: Int,
    viewTag: Int,
    private val width: Double,
    private val height: Double,
) : Event<OneKotlinHostSizeEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = "topHostSizeChange"

    override fun canCoalesce(): Boolean = false

    override fun getEventData(): WritableMap =
        Arguments.createMap().apply {
            putDouble("width", width)
            putDouble("height", height)
        }
}
