package dev.onejs.onenative

import android.content.Context
import android.widget.FrameLayout
import com.facebook.react.bridge.ReadableArray

// uniform map (One.UI.Map) view, nomaps flavor: compiled when the app sets
// no native.app.android.googleMapsApiKey. mounting throws with the fix,
// instead of rendering a map that could never load tiles.
class OneNativeUiMapView(context: Context) : FrameLayout(context) {
    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        throw IllegalStateException(
            "One.UI.Map on Android needs native.app.android.googleMapsApiKey"
        )
    }

    internal fun setLatitude(@Suppress("UNUSED_PARAMETER") latitude: Double) = Unit

    internal fun setLongitude(@Suppress("UNUSED_PARAMETER") longitude: Double) = Unit

    internal fun setZoom(@Suppress("UNUSED_PARAMETER") zoom: Double) = Unit

    internal fun setMapMarkers(@Suppress("UNUSED_PARAMETER") markers: ReadableArray?) = Unit

    internal fun setMapOverlays(@Suppress("UNUSED_PARAMETER") json: String?) = Unit
}
