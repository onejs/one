package dev.onejs.onenative

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

internal class OneNativeSafeAreaInsetsChangeEvent(
    surfaceId: Int,
    viewTag: Int,
    private val insetTop: Double,
    private val insetRight: Double,
    private val insetBottom: Double,
    private val insetLeft: Double,
    private val frameX: Double,
    private val frameY: Double,
    private val frameWidth: Double,
    private val frameHeight: Double,
) : Event<OneNativeSafeAreaInsetsChangeEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = "topNativeInsetsChange"

    override fun canCoalesce(): Boolean = false

    override fun getEventData(): WritableMap =
        Arguments.createMap().apply {
            putDouble("insetTop", insetTop)
            putDouble("insetRight", insetRight)
            putDouble("insetBottom", insetBottom)
            putDouble("insetLeft", insetLeft)
            putDouble("frameX", frameX)
            putDouble("frameY", frameY)
            putDouble("frameWidth", frameWidth)
            putDouble("frameHeight", frameHeight)
        }
}
