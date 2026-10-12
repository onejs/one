package dev.onejs.onenative

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.OneNativeUiMapManagerDelegate
import com.facebook.react.viewmanagers.OneNativeUiMapManagerInterface

// uniform map (One.UI.Map) manager, maps flavor: compiled only when the app
// sets native.app.android.googleMapsApiKey. the nomaps source set defines the
// same class with a throwing view.
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

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> {
        val events =
            super.getExportedCustomDirectEventTypeConstants()?.toMutableMap() ?: mutableMapOf()
        events["topNativeUiMapCameraMove"] =
            mapOf("registrationName" to "onNativeUiMapCameraMove")
        events["topNativeUiMapMarkerClick"] =
            mapOf("registrationName" to "onNativeUiMapMarkerClick")
        events["topNativeUiMapClick"] = mapOf("registrationName" to "onNativeUiMapClick")
        return events
    }

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
