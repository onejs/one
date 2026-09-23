package dev.onejs.onenative

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

// direct events for OneNativeUiMap, mirroring the ios emitter names
// (onNativeUiMapCameraMove / onNativeUiMapMarkerClick / onNativeUiMapClick).
internal class OneNativeUiMapCameraMoveEvent(
    surfaceId: Int,
    viewTag: Int,
    private val latitude: Double,
    private val longitude: Double,
    private val zoom: Double,
) : Event<OneNativeUiMapCameraMoveEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = "topNativeUiMapCameraMove"

    override fun canCoalesce(): Boolean = false

    override fun getEventData(): WritableMap =
        Arguments.createMap().apply {
            putDouble("latitude", latitude)
            putDouble("longitude", longitude)
            putDouble("zoom", zoom)
        }
}

internal class OneNativeUiMapMarkerClickEvent(
    surfaceId: Int,
    viewTag: Int,
    private val id: String,
) : Event<OneNativeUiMapMarkerClickEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = "topNativeUiMapMarkerClick"

    override fun canCoalesce(): Boolean = false

    override fun getEventData(): WritableMap =
        Arguments.createMap().apply {
            putString("id", id)
        }
}

internal class OneNativeUiMapClickEvent(
    surfaceId: Int,
    viewTag: Int,
    private val latitude: Double,
    private val longitude: Double,
) : Event<OneNativeUiMapClickEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = "topNativeUiMapClick"

    override fun canCoalesce(): Boolean = false

    override fun getEventData(): WritableMap =
        Arguments.createMap().apply {
            putDouble("latitude", latitude)
            putDouble("longitude", longitude)
        }
}
