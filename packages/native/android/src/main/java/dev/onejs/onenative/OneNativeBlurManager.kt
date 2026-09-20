package dev.onejs.onenative

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.OneNativeBlurManagerDelegate
import com.facebook.react.viewmanagers.OneNativeBlurManagerInterface

@ReactModule(name = OneNativeBlurManager.REACT_CLASS)
class OneNativeBlurManager :
    ViewGroupManager<OneNativeBlurView>(),
    OneNativeBlurManagerInterface<OneNativeBlurView> {

    private val delegate: ViewManagerDelegate<OneNativeBlurView> =
        OneNativeBlurManagerDelegate(this)

    override fun getName(): String = REACT_CLASS

    override fun createViewInstance(reactContext: ThemedReactContext): OneNativeBlurView =
        OneNativeBlurView(reactContext)

    override fun getDelegate(): ViewManagerDelegate<OneNativeBlurView> = delegate

    @ReactProp(name = "tint")
    override fun setTint(view: OneNativeBlurView, value: String?) {
        view.tint = value ?: "default"
    }

    @ReactProp(name = "intensity")
    override fun setIntensity(view: OneNativeBlurView, value: Double) {
        view.intensity = value
    }

    companion object {
        const val REACT_CLASS = "OneNativeBlur"
    }
}
