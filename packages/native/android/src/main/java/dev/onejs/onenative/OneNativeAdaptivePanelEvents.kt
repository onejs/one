package dev.onejs.onenative

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

internal class OneNativeAdaptivePanelOpenChangeEvent(
    surfaceId: Int,
    viewTag: Int,
    private val open: Boolean,
    private val eventCount: Int,
    private val revision: Int,
) : Event<OneNativeAdaptivePanelOpenChangeEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = "topNativeAdaptivePanelOpenChange"

    override fun canCoalesce(): Boolean = false

    override fun getEventData(): WritableMap =
        Arguments.createMap().apply {
            putBoolean("open", open)
            putInt("eventCount", eventCount)
            putInt("revision", revision)
        }
}

internal class OneNativeAdaptivePanelDetentChangeEvent(
    surfaceId: Int,
    viewTag: Int,
    private val type: String,
    private val value: Double,
    private val eventCount: Int,
    private val revision: Int,
) : Event<OneNativeAdaptivePanelDetentChangeEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = "topNativeAdaptivePanelDetentChange"

    override fun canCoalesce(): Boolean = false

    override fun getEventData(): WritableMap =
        Arguments.createMap().apply {
            putString("type", type)
            putDouble("value", value)
            putInt("eventCount", eventCount)
            putInt("revision", revision)
        }
}

internal class OneNativeAdaptivePanelLayoutChangeEvent(
    surfaceId: Int,
    viewTag: Int,
    private val placement: String,
    private val frameX: Double,
    private val frameY: Double,
    private val frameWidth: Double,
    private val frameHeight: Double,
) : Event<OneNativeAdaptivePanelLayoutChangeEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = "topNativeAdaptivePanelLayoutChange"

    override fun canCoalesce(): Boolean = false

    override fun getEventData(): WritableMap =
        Arguments.createMap().apply {
            putString("placement", placement)
            putDouble("frameX", frameX)
            putDouble("frameY", frameY)
            putDouble("frameWidth", frameWidth)
            putDouble("frameHeight", frameHeight)
        }
}
