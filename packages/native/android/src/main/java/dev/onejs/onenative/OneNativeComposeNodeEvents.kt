package dev.onejs.onenative

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

internal class OneNativeComposeNodeButtonPressEvent(
    surfaceId: Int,
    viewTag: Int,
    private val eventCount: Int,
) : Event<OneNativeComposeNodeButtonPressEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = "topNativeComposeNodeButtonPress"

    override fun canCoalesce(): Boolean = false

    override fun getEventData(): WritableMap =
        Arguments.createMap().apply {
            putInt("eventCount", eventCount)
        }
}

internal class OneNativeComposeNodeSwitchValueChangeEvent(
    surfaceId: Int,
    viewTag: Int,
    private val value: Boolean,
    private val eventCount: Int,
    private val revision: Int,
) : Event<OneNativeComposeNodeSwitchValueChangeEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = "topNativeComposeNodeSwitchValueChange"

    override fun canCoalesce(): Boolean = false

    override fun getEventData(): WritableMap =
        Arguments.createMap().apply {
            putBoolean("value", value)
            putInt("eventCount", eventCount)
            putInt("revision", revision)
        }
}
