package dev.onejs.keyboard.listeners

import android.view.ViewGroup
import android.view.ViewTreeObserver
import com.facebook.react.bridge.Arguments
import com.facebook.react.uimanager.ThemedReactContext
import dev.onejs.keyboard.extensions.content
import dev.onejs.keyboard.extensions.dp
import dev.onejs.keyboard.extensions.emitEvent

data class Dimensions(
  val width: Double,
  val height: Double,
)

class WindowDimensionListener(
  private val context: ThemedReactContext?,
) {
  private var lastDispatchedDimensions = Dimensions(0.0, 0.0)
  private var layoutListener: ViewTreeObserver.OnGlobalLayoutListener? = null
  private var attachedContent: ViewGroup? = null

  public fun attachListener() {
    // attach to content view only once per app instance
    if (context != null && listenerID != context.hashCode()) {
      listenerID = context.hashCode()

      val content = context.content
      attachedContent = content

      updateWindowDimensions(content)

      layoutListener =
        ViewTreeObserver.OnGlobalLayoutListener {
          updateWindowDimensions(content)
        }

      content?.viewTreeObserver?.addOnGlobalLayoutListener(layoutListener)
    }
  }

  public fun detachListener() {
    attachedContent?.viewTreeObserver?.removeOnGlobalLayoutListener(layoutListener)
    attachedContent = null
    layoutListener = null
    listenerID = -1
  }

  private fun updateWindowDimensions(content: ViewGroup?) {
    if (content == null) {
      return
    }

    val newDimensions =
      Dimensions(
        content.width.toFloat().dp,
        content.height.toFloat().dp,
      )

    if (newDimensions != lastDispatchedDimensions) {
      lastDispatchedDimensions = newDimensions

      context.emitEvent(
        "windowDidResize",
        Arguments.createMap().apply {
          putDouble("height", newDimensions.height)
          putDouble("width", newDimensions.width)
        },
      )
    }
  }

  companion object {
    private var listenerID = -1
  }
}
