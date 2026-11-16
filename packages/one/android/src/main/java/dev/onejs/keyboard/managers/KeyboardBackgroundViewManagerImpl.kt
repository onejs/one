package dev.onejs.keyboard.managers

import com.facebook.react.uimanager.ThemedReactContext
import dev.onejs.keyboard.views.background.KeyboardBackgroundViewGroup

class KeyboardBackgroundViewManagerImpl {
  fun createViewInstance(reactContext: ThemedReactContext): KeyboardBackgroundViewGroup =
    KeyboardBackgroundViewGroup(reactContext)

  companion object {
    const val NAME = "OneKeyboardBackgroundView"
  }
}
