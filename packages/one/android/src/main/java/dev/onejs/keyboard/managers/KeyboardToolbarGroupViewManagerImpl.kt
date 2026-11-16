package dev.onejs.keyboard.managers

import com.facebook.react.uimanager.ThemedReactContext
import dev.onejs.keyboard.views.KeyboardToolbarGroupReactViewGroup

class KeyboardToolbarGroupViewManagerImpl {
  fun createViewInstance(reactContext: ThemedReactContext): KeyboardToolbarGroupReactViewGroup =
    KeyboardToolbarGroupReactViewGroup(reactContext)

  companion object {
    const val NAME = "OneKeyboardToolbarGroupView"
  }
}
