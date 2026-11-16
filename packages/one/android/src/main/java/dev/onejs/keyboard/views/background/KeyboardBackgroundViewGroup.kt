package dev.onejs.keyboard.views.background

import android.annotation.SuppressLint
import android.content.res.Configuration
import android.view.WindowInsets
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.views.view.ReactViewGroup

@SuppressLint("ViewConstructor")
class KeyboardBackgroundViewGroup(
  private val reactContext: ThemedReactContext,
) : ReactViewGroup(reactContext) {
  // view mounted
  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    super.setBackgroundColor(reactContext.getInputMethodColor())
  }

  // theme changed
  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    super.setBackgroundColor(reactContext.getInputMethodColor())
  }

  // keyboard changed
  override fun onApplyWindowInsets(insets: WindowInsets?): WindowInsets {
    super.setBackgroundColor(reactContext.getInputMethodColor())
    return super.onApplyWindowInsets(insets)
  }

  override fun setBackgroundColor(color: Int) {
    // do nothing, since we manage background color on our own
  }
}
