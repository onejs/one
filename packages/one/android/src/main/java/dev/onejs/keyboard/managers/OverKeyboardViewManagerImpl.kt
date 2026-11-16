package dev.onejs.keyboard.managers

import com.facebook.react.uimanager.ThemedReactContext
import dev.onejs.keyboard.views.overlay.OverKeyboardHostView

class OverKeyboardViewManagerImpl {
  fun createViewInstance(reactContext: ThemedReactContext): OverKeyboardHostView = OverKeyboardHostView(reactContext)

  fun setVisible(
    view: OverKeyboardHostView,
    value: Boolean,
  ) {
    if (value) {
      view.show()
    } else {
      view.hide()
    }
  }

  companion object {
    const val NAME = "OneOverKeyboardView"
  }
}
