package dev.onejs.keyboard.events

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

@Suppress("detekt:LongParameterList")
class KeyboardTransitionEvent(
  surfaceId: Int,
  viewId: Int,
  private val event: EventName,
  private val height: Double,
  private val progress: Double,
  private val duration: Int,
  private val target: Int,
) : Event<KeyboardTransitionEvent>(surfaceId, viewId) {
  override fun getEventName() = event.value

  override fun canCoalesce() = false

  override fun getEventData(): WritableMap? =
    Arguments.createMap().apply {
      putDouble("progress", progress)
      putDouble("height", height)
      putInt("duration", duration)
      putInt("target", target)
    }

  companion object {
    enum class EventName(
      val value: String,
    ) {
      Move("topKeyboardMove"),
      Start("topKeyboardMoveStart"),
      End("topKeyboardMoveEnd"),
      Interactive("topKeyboardMoveInteractive"),
    }

    val Move = EventName.Move
    val Start = EventName.Start
    val End = EventName.End
    val Interactive = EventName.Interactive
  }
}
