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

internal class OneNativeComposeNodeTextFieldFocusChangeEvent(
    surfaceId: Int,
    viewTag: Int,
    private val value: Boolean,
    private val eventCount: Int,
    private val revision: Int,
) : Event<OneNativeComposeNodeTextFieldFocusChangeEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = "topNativeComposeNodeTextFieldFocusChange"

    override fun canCoalesce(): Boolean = false

    override fun getEventData(): WritableMap =
        Arguments.createMap().apply {
            putBoolean("value", value)
            putInt("eventCount", eventCount)
            putInt("revision", revision)
        }
}

internal class OneNativeComposeNodeTextFieldSubmitEvent(
    surfaceId: Int,
    viewTag: Int,
    private val text: String,
    private val eventCount: Int,
) : Event<OneNativeComposeNodeTextFieldSubmitEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = "topNativeComposeNodeTextFieldSubmit"

    override fun canCoalesce(): Boolean = false

    override fun getEventData(): WritableMap =
        Arguments.createMap().apply {
            putString("text", text)
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
    private val value: Double,
) : Event<OneNativeComposeNodeDialogConfirmEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = "topNativeComposeNodeDialogConfirm"

    override fun canCoalesce(): Boolean = false

    override fun getEventData(): WritableMap =
        Arguments.createMap().apply {
            putInt("eventCount", eventCount)
            putDouble("value", value)
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

internal class OneNativeComposeNodeBooleanValueChangeEvent(
    surfaceId: Int,
    viewTag: Int,
    private val value: Boolean,
    private val eventCount: Int,
    private val revision: Int,
) : Event<OneNativeComposeNodeBooleanValueChangeEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = "topNativeComposeNodeBooleanValueChange"

    override fun canCoalesce(): Boolean = false

    override fun getEventData(): WritableMap =
        Arguments.createMap().apply {
            putBoolean("value", value)
            putInt("eventCount", eventCount)
            putInt("revision", revision)
        }
}

internal class OneNativeComposeNodeImageLoadEvent(
    surfaceId: Int,
    viewTag: Int,
    private val eventCount: Int,
) : Event<OneNativeComposeNodeImageLoadEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = "topNativeComposeNodeImageLoad"

    override fun canCoalesce(): Boolean = false

    override fun getEventData(): WritableMap =
        Arguments.createMap().apply {
            putInt("eventCount", eventCount)
        }
}

internal class OneNativeComposeNodeImageErrorEvent(
    surfaceId: Int,
    viewTag: Int,
    private val message: String,
    private val eventCount: Int,
) : Event<OneNativeComposeNodeImageErrorEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = "topNativeComposeNodeImageError"

    override fun canCoalesce(): Boolean = false

    override fun getEventData(): WritableMap =
        Arguments.createMap().apply {
            putString("message", message)
            putInt("eventCount", eventCount)
        }
}

internal class OneNativeComposeNodeSnackbarResultEvent(
    surfaceId: Int,
    viewTag: Int,
    private val requestId: Int,
    private val result: String,
    private val eventCount: Int,
) : Event<OneNativeComposeNodeSnackbarResultEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = "topNativeComposeNodeSnackbarResult"

    override fun canCoalesce(): Boolean = false

    override fun getEventData(): WritableMap =
        Arguments.createMap().apply {
            putInt("requestId", requestId)
            putString("result", result)
            putInt("eventCount", eventCount)
        }
}

internal class OneNativeComposeNodeSheetHiddenEvent(
    surfaceId: Int,
    viewTag: Int,
    private val requestId: Int,
    private val eventCount: Int,
) : Event<OneNativeComposeNodeSheetHiddenEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = "topNativeComposeNodeSheetHidden"

    override fun canCoalesce(): Boolean = false

    override fun getEventData(): WritableMap =
        Arguments.createMap().apply {
            putInt("requestId", requestId)
            putInt("eventCount", eventCount)
        }
}

internal class OneNativeComposeNodeContentSizeChangeEvent(
    surfaceId: Int,
    viewTag: Int,
    private val height: Double,
) : Event<OneNativeComposeNodeContentSizeChangeEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = "topNativeComposeNodeContentSizeChange"

    override fun getEventData(): WritableMap =
        Arguments.createMap().apply { putDouble("height", height) }
}

internal class OneNativeComposeNodeDateRangeEvent(
    surfaceId: Int, viewTag: Int, private val start: Long?, private val end: Long?,
) : Event<OneNativeComposeNodeDateRangeEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = "topNativeComposeNodeDateRangeSelected"
    override fun canCoalesce(): Boolean = false
    override fun getEventData(): WritableMap = Arguments.createMap().apply {
        putBoolean("hasStart", start != null)
        putBoolean("hasEnd", end != null)
        putDouble("start", start?.toDouble() ?: 0.0)
        putDouble("end", end?.toDouble() ?: 0.0)
    }
}
