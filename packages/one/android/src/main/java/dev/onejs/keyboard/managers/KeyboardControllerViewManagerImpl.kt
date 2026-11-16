package dev.onejs.keyboard.managers

import com.facebook.react.bridge.Arguments
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.ThemedReactContext
import dev.onejs.keyboard.events.FocusedInputLayoutChangedEvent
import dev.onejs.keyboard.events.FocusedInputSelectionChangedEvent
import dev.onejs.keyboard.events.FocusedInputTextChangedEvent
import dev.onejs.keyboard.events.KeyboardTransitionEvent
import dev.onejs.keyboard.extensions.emitEvent
import dev.onejs.keyboard.listeners.WindowDimensionListener
import dev.onejs.keyboard.views.EdgeToEdgeReactViewGroup

class KeyboardControllerViewManagerImpl {
  private var listener: WindowDimensionListener? = null
  private var listenerContext: ThemedReactContext? = null

  fun createViewInstance(reactContext: ThemedReactContext): EdgeToEdgeReactViewGroup {
    if (listener == null || listenerContext !== reactContext) {
      listener?.detachListener()
      listener = WindowDimensionListener(reactContext)
      listener?.attachListener()
      listenerContext = reactContext
    }
    return EdgeToEdgeReactViewGroup(reactContext)
  }

  fun invalidate() {
    listener?.detachListener()
    listener = null
    listenerContext = null
  }

  fun synchronizeFocusedInputLayout(view: EdgeToEdgeReactViewGroup) {
    view.callback?.layoutObserver?.syncUpLayout()
    view.reactContext.emitEvent("layoutDidSynchronize", Arguments.createMap())
  }

  fun setEnabled(
    view: EdgeToEdgeReactViewGroup,
    enabled: Boolean,
  ) {
    view.active = enabled
  }

  fun setStatusBarTranslucent(
    view: EdgeToEdgeReactViewGroup,
    isStatusBarTranslucent: Boolean,
  ) {
    view.setStatusBarTranslucent(isStatusBarTranslucent)
  }

  fun setNavigationBarTranslucent(
    view: EdgeToEdgeReactViewGroup,
    isNavigationBarTranslucent: Boolean,
  ) {
    view.setNavigationBarTranslucent(isNavigationBarTranslucent)
  }

  fun setPreserveEdgeToEdge(
    view: EdgeToEdgeReactViewGroup,
    isPreservingEdgeToEdge: Boolean,
  ) {
    view.setPreserveEdgeToEdge(isPreservingEdgeToEdge)
  }

  fun setEdgeToEdge(view: EdgeToEdgeReactViewGroup) {
    view.setEdgeToEdge()
  }

  fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> {
    val map: MutableMap<String, Any> =
      MapBuilder.of(
        KeyboardTransitionEvent.Move.value,
        MapBuilder.of("registrationName", "onKeyboardMove"),
        KeyboardTransitionEvent.Start.value,
        MapBuilder.of("registrationName", "onKeyboardMoveStart"),
        KeyboardTransitionEvent.End.value,
        MapBuilder.of("registrationName", "onKeyboardMoveEnd"),
        KeyboardTransitionEvent.Interactive.value,
        MapBuilder.of("registrationName", "onKeyboardMoveInteractive"),
        FocusedInputLayoutChangedEvent.EVENT_NAME,
        MapBuilder.of("registrationName", "onFocusedInputLayoutChanged"),
        FocusedInputTextChangedEvent.EVENT_NAME,
        MapBuilder.of("registrationName", "onFocusedInputTextChanged"),
        FocusedInputSelectionChangedEvent.EVENT_NAME,
        MapBuilder.of("registrationName", "onFocusedInputSelectionChanged"),
      )

    return map
  }

  companion object {
    const val NAME = "OneKeyboardControllerView"
  }
}
