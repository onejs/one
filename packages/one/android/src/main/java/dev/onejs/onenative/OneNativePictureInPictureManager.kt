package dev.onejs.onenative

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.OneNativePictureInPictureManagerDelegate
import com.facebook.react.viewmanagers.OneNativePictureInPictureManagerInterface

@ReactModule(name = OneNativePictureInPictureManager.REACT_CLASS)
class OneNativePictureInPictureManager :
  ViewGroupManager<OneNativePictureInPictureView>(),
  OneNativePictureInPictureManagerInterface<OneNativePictureInPictureView> {

  private val delegate: ViewManagerDelegate<OneNativePictureInPictureView> =
    OneNativePictureInPictureManagerDelegate(this)

  override fun getName(): String = REACT_CLASS

  override fun createViewInstance(reactContext: ThemedReactContext) =
    OneNativePictureInPictureView(reactContext)

  override fun getDelegate(): ViewManagerDelegate<OneNativePictureInPictureView> = delegate

  override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> {
    val events =
      super.getExportedCustomDirectEventTypeConstants()?.toMutableMap() ?: mutableMapOf()
    events["topNativePictureInPictureChange"] =
      mapOf("registrationName" to "onNativePictureInPictureChange")
    return events
  }

  @ReactProp(name = "active")
  override fun setActive(view: OneNativePictureInPictureView, value: Boolean) {
    view.setActive(value)
  }

  @ReactProp(name = "autoEnter")
  override fun setAutoEnter(view: OneNativePictureInPictureView, value: Boolean) {
    view.setAutoEnter(value)
  }

  companion object {
    const val REACT_CLASS = "OneNativePictureInPicture"
  }
}
