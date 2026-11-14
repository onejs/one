package dev.onejs.onenative

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.viewmanagers.OneNativeHapticTapManagerDelegate
import com.facebook.react.viewmanagers.OneNativeHapticTapManagerInterface

@ReactModule(name = OneNativeHapticTapManager.REACT_CLASS)
class OneNativeHapticTapManager :
    ViewGroupManager<OneNativeHapticTapView>(),
    OneNativeHapticTapManagerInterface<OneNativeHapticTapView> {

  private val delegate: ViewManagerDelegate<OneNativeHapticTapView> =
      OneNativeHapticTapManagerDelegate(this)

  override fun getName(): String = REACT_CLASS

  override fun createViewInstance(reactContext: ThemedReactContext): OneNativeHapticTapView =
      OneNativeHapticTapView(reactContext)

  override fun getDelegate(): ViewManagerDelegate<OneNativeHapticTapView> = delegate

  override fun setFeedback(view: OneNativeHapticTapView, value: String?) {
    view.feedback = if (value.isNullOrEmpty()) "selection" else value
  }

  companion object {
    const val REACT_CLASS = "OneNativeHapticTap"
  }
}
