package dev.onejs.onenative

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.OneNativeEdgeFadeManagerDelegate
import com.facebook.react.viewmanagers.OneNativeEdgeFadeManagerInterface

@ReactModule(name = OneNativeEdgeFadeManager.REACT_CLASS)
class OneNativeEdgeFadeManager :
    ViewGroupManager<OneNativeEdgeFadeView>(),
    OneNativeEdgeFadeManagerInterface<OneNativeEdgeFadeView> {

    private val delegate: ViewManagerDelegate<OneNativeEdgeFadeView> =
        OneNativeEdgeFadeManagerDelegate(this)

    override fun getName(): String = REACT_CLASS

    override fun createViewInstance(reactContext: ThemedReactContext): OneNativeEdgeFadeView =
        OneNativeEdgeFadeView(reactContext)

    override fun getDelegate(): ViewManagerDelegate<OneNativeEdgeFadeView> = delegate

    // JS sends sizes in dp. Fabric Double props arrive unscaled, so convert here.
    private fun px(view: OneNativeEdgeFadeView, dp: Double): Float =
        (dp * view.resources.displayMetrics.density).toFloat()

    // Single redraw per prop transaction — Fabric applies all props in one
    // batch, so coalescing here keeps per-setter code free of bookkeeping.
    override fun onAfterUpdateTransaction(view: OneNativeEdgeFadeView) {
        super.onAfterUpdateTransaction(view)
        view.invalidate()
    }

    @ReactProp(name = "fadeTop")
    override fun setFadeTop(view: OneNativeEdgeFadeView, value: Double) {
        view.fadeTop = px(view, value)
    }

    @ReactProp(name = "fadeBottom")
    override fun setFadeBottom(view: OneNativeEdgeFadeView, value: Double) {
        view.fadeBottom = px(view, value)
    }

    @ReactProp(name = "fadeLeft")
    override fun setFadeLeft(view: OneNativeEdgeFadeView, value: Double) {
        view.fadeLeft = px(view, value)
    }

    @ReactProp(name = "fadeRight")
    override fun setFadeRight(view: OneNativeEdgeFadeView, value: Double) {
        view.fadeRight = px(view, value)
    }

    @ReactProp(name = "curveTop")
    override fun setCurveTop(view: OneNativeEdgeFadeView, value: String?) {
        view.curveTop = value ?: "smooth"
    }

    @ReactProp(name = "curveBottom")
    override fun setCurveBottom(view: OneNativeEdgeFadeView, value: String?) {
        view.curveBottom = value ?: "smooth"
    }

    @ReactProp(name = "curveLeft")
    override fun setCurveLeft(view: OneNativeEdgeFadeView, value: String?) {
        view.curveLeft = value ?: "smooth"
    }

    @ReactProp(name = "curveRight")
    override fun setCurveRight(view: OneNativeEdgeFadeView, value: String?) {
        view.curveRight = value ?: "smooth"
    }

    @ReactProp(name = "fadeRadius")
    override fun setFadeRadius(view: OneNativeEdgeFadeView, value: Double) {
        view.fadeRadius = px(view, value)
    }

    @ReactProp(name = "mode")
    override fun setMode(view: OneNativeEdgeFadeView, value: String?) {
        view.mode = value ?: "mask"
    }

    @ReactProp(name = "blurRadius")
    override fun setBlurRadius(view: OneNativeEdgeFadeView, value: Double) {
        view.blurRadius = px(view, value)
    }

    @ReactProp(name = "frostProgression")
    override fun setFrostProgression(view: OneNativeEdgeFadeView, value: Double) {
        view.frostProgression = value.toFloat()
    }

    @ReactProp(name = "overlayColor")
    override fun setOverlayColor(view: OneNativeEdgeFadeView, value: Int) {
        view.overlayColor = value
    }

    companion object {
        const val REACT_CLASS = "OneNativeEdgeFade"
    }
}
