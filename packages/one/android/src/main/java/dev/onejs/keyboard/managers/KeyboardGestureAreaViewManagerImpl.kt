package dev.onejs.keyboard.managers

import com.facebook.react.uimanager.ThemedReactContext
import dev.onejs.keyboard.views.KeyboardGestureAreaReactViewGroup

class KeyboardGestureAreaViewManagerImpl {
  fun createViewInstance(reactContext: ThemedReactContext): KeyboardGestureAreaReactViewGroup =
    KeyboardGestureAreaReactViewGroup(reactContext)

  fun setOffset(
    view: KeyboardGestureAreaReactViewGroup,
    offset: Double,
  ) {
    view.setOffset(offset)
  }

  fun setInterpolator(
    view: KeyboardGestureAreaReactViewGroup,
    interpolator: String,
  ) {
    view.setInterpolator(interpolator)
  }

  fun setScrollKeyboardOffScreenWhenVisible(
    view: KeyboardGestureAreaReactViewGroup,
    value: Boolean,
  ) {
    view.setScrollKeyboardOffScreenWhenVisible(value)
  }

  fun setScrollKeyboardOnScreenWhenNotVisible(
    view: KeyboardGestureAreaReactViewGroup,
    value: Boolean,
  ) {
    view.setScrollKeyboardOnScreenWhenNotVisible(value)
  }

  companion object {
    const val NAME = "OneKeyboardGestureArea"
  }
}
