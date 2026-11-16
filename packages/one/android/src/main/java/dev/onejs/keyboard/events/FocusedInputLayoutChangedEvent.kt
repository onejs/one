package dev.onejs.keyboard.events

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

data class FocusedInputLayoutChangedEventData(
  val x: Double,
  val y: Double,
  val width: Double,
  val height: Double,
  val absoluteX: Double,
  val absoluteY: Double,
  val contentX: Double,
  val contentY: Double,
  val target: Int,
  val parentScrollViewTarget: Int,
)

class FocusedInputLayoutChangedEvent(
  surfaceId: Int,
  viewId: Int,
  private val event: FocusedInputLayoutChangedEventData,
) : Event<FocusedInputLayoutChangedEvent>(surfaceId, viewId) {
  override fun getEventName() = EVENT_NAME

  // All events for a given view can be coalesced
  override fun getCoalescingKey(): Short = 0

  override fun getEventData(): WritableMap? =
    Arguments.createMap().apply {
      putInt("target", event.target)
      putInt("parentScrollViewTarget", event.parentScrollViewTarget)
      putMap(
        "layout",
        Arguments.createMap().apply {
          putDouble("x", event.x)
          putDouble("y", event.y)
          putDouble("width", event.width)
          putDouble("height", event.height)
          putDouble("absoluteX", event.absoluteX)
          putDouble("absoluteY", event.absoluteY)
          putDouble("contentX", event.contentX)
          putDouble("contentY", event.contentY)
        },
      )
    }

  companion object {
    const val EVENT_NAME = "topFocusedInputLayoutChanged"
  }
}
