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

internal class OneNativeComposeNodeTextValueChangeEvent(
    surfaceId: Int,
    viewTag: Int,
    private val text: String,
    private val eventCount: Int,
    private val revision: Int,
) : Event<OneNativeComposeNodeTextValueChangeEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = "topNativeComposeNodeTextValueChange"

    override fun canCoalesce(): Boolean = false

    override fun getEventData(): WritableMap =
        Arguments.createMap().apply {
            putString("text", text)
            putInt("eventCount", eventCount)
            putInt("revision", revision)
        }
}

internal class OneNativeComposeNodeNumberValueChangeEvent(
    surfaceId: Int,
    viewTag: Int,
    private val value: Double,
    private val eventCount: Int,
    private val revision: Int,
) : Event<OneNativeComposeNodeNumberValueChangeEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = "topNativeComposeNodeNumberValueChange"

    override fun canCoalesce(): Boolean = false

    override fun getEventData(): WritableMap =
        Arguments.createMap().apply {
            putDouble("value", value)
            putInt("eventCount", eventCount)
            putInt("revision", revision)
        }
}

internal class OneNativeComposeNodeDialogConfirmEvent(
    surfaceId: Int,
    viewTag: Int,
    private val eventCount: Int,
) : Event<OneNativeComposeNodeDialogConfirmEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = "topNativeComposeNodeDialogConfirm"

    override fun canCoalesce(): Boolean = false

    override fun getEventData(): WritableMap =
        Arguments.createMap().apply {
            putInt("eventCount", eventCount)
        }
}

internal class OneNativeComposeNodeDialogDismissEvent(
    surfaceId: Int,
    viewTag: Int,
    private val eventCount: Int,
) : Event<OneNativeComposeNodeDialogDismissEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = "topNativeComposeNodeDialogDismiss"

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
