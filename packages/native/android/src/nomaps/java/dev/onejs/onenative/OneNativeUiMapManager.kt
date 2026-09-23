package dev.onejs.onenative

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.OneNativeUiMapManagerDelegate
import com.facebook.react.viewmanagers.OneNativeUiMapManagerInterface

// uniform map (One.UI.Map) manager, nomaps flavor: the same react class and
// props as the maps flavor, so the js side is unchanged whichever source set
// compiled. the view throws on mount with the missing-key message.
@ReactModule(name = OneNativeUiMapManager.REACT_CLASS)
class OneNativeUiMapManager :
    ViewGroupManager<OneNativeUiMapView>(),
    OneNativeUiMapManagerInterface<OneNativeUiMapView> {

    private val delegate: ViewManagerDelegate<OneNativeUiMapView> =
        OneNativeUiMapManagerDelegate(this)

    override fun getName(): String = REACT_CLASS

    override fun createViewInstance(reactContext: ThemedReactContext): OneNativeUiMapView =
        OneNativeUiMapView(reactContext)

    override fun getDelegate(): ViewManagerDelegate<OneNativeUiMapView> = delegate

    @ReactProp(name = "latitude")
    override fun setLatitude(view: OneNativeUiMapView, value: Double) {
        view.setLatitude(value)
    }

    @ReactProp(name = "longitude")
    override fun setLongitude(view: OneNativeUiMapView, value: Double) {
        view.setLongitude(value)
    }

    @ReactProp(name = "zoom")
    override fun setZoom(view: OneNativeUiMapView, value: Double) {
        view.setZoom(value)
    }

    @ReactProp(name = "markers")
    override fun setMarkers(view: OneNativeUiMapView, value: ReadableArray?) {
        view.setMapMarkers(value)
    }

    @ReactProp(name = "overlays")
    override fun setOverlays(view: OneNativeUiMapView, value: String?) {
        view.setMapOverlays(value)
    }

    companion object {
        const val REACT_CLASS = "OneNativeUiMap"
    }
}
