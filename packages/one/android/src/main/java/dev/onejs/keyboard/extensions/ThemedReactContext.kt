package dev.onejs.keyboard.extensions

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.Event
import com.facebook.react.uimanager.events.EventDispatcher
import dev.onejs.keyboard.OneKeyboardBridge
import dev.onejs.keyboard.log.Logger

fun ThemedReactContext?.dispatchEvent(
  viewId: Int,
  event: Event<*>,
) {
  val eventDispatcher: EventDispatcher? =
    UIManagerHelper.getEventDispatcherForReactTag(this as ReactContext, viewId)
  eventDispatcher?.dispatchEvent(event)
}

fun ThemedReactContext?.emitEvent(
  event: String,
  params: WritableMap,
) {
  OneKeyboardBridge.onEvent?.invoke(event, params)

  Logger.i("ThemedReactContext", event)
}

fun ThemedReactContext?.keepShadowNodesInSync(viewId: Int) {
  // originally by viewId we should lookup all connected nodes
  // and send them to JS
  // but at the moment JS side broadcasts events to all ViewType
  // instances, so we can send even empty array
  val tags = intArrayOf(viewId)

  val tagsArray = Arguments.createArray()
  for (tag in tags) {
    tagsArray.pushInt(tag)
  }

  // emit the event to JS to re-sync the trees
  val onAnimationEndedData = Arguments.createMap()
  onAnimationEndedData.putArray("tags", tagsArray)

  this.emitEvent("onUserDrivenAnimationEnded", onAnimationEndedData)
}

val ThemedReactContext?.appearance: String
  get() =
    when {
      this == null -> "light"
      isSystemDarkMode() -> "dark"
      else -> "light"
    }
