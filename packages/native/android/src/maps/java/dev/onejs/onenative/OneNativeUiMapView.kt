package dev.onejs.onenative

import android.content.Context
import android.graphics.Color as AndroidColor
import android.widget.FrameLayout
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.ViewCompositionStrategy
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ViewTreeLifecycleOwner
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.google.android.gms.maps.model.BitmapDescriptor
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.CameraMoveStartedReason
import com.google.maps.android.compose.Circle
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.Marker
import com.google.maps.android.compose.Polygon
import com.google.maps.android.compose.Polyline
import com.google.maps.android.compose.rememberCameraPositionState
import com.google.maps.android.compose.rememberMarkerState
import org.json.JSONObject

internal data class UiMapMarker(
    val id: String,
    val title: String,
    val latitude: Double,
    val longitude: Double,
    val tint: String,
)

internal data class UiMapPoint(val latitude: Double, val longitude: Double)

internal data class UiMapPolyline(
    val id: String,
    val coordinates: List<UiMapPoint>,
    val color: String,
    val width: Double,
)

internal data class UiMapPolygon(
    val id: String,
    val coordinates: List<UiMapPoint>,
    val color: String,
    val lineColor: String,
    val lineWidth: Double,
)

internal data class UiMapCircle(
    val id: String,
    val center: UiMapPoint,
    val radius: Double,
    val color: String,
    val lineColor: String,
    val lineWidth: Double,
)

internal data class UiMapOverlays(
    val polylines: List<UiMapPolyline> = emptyList(),
    val polygons: List<UiMapPolygon> = emptyList(),
    val circles: List<UiMapCircle> = emptyList(),
)

// #rrggbb or #rrggbbaa, the only shapes js lets through. empty means unset.
internal fun uiMapColor(hex: String): Color? {
    if (!hex.startsWith("#")) return null
    val digits = hex.drop(1)
    if (digits.length != 6 && digits.length != 8) return null
    val value = digits.toLongOrNull(16) ?: return null
    return if (digits.length == 6) {
        Color(
            red = ((value shr 16) and 0xFF).toInt(),
            green = ((value shr 8) and 0xFF).toInt(),
            blue = (value and 0xFF).toInt(),
        )
    } else {
        Color(
            red = ((value shr 24) and 0xFF).toInt(),
            green = ((value shr 16) and 0xFF).toInt(),
            blue = ((value shr 8) and 0xFF).toInt(),
            alpha = (value and 0xFF).toInt(),
        )
    }
}

// google pins tint by hue, so the hex resolves through hsv. null keeps the
// default red pin, which is also what ios falls back to.
internal fun uiMapMarkerIcon(tint: String): BitmapDescriptor? {
    if (!tint.startsWith("#")) return null
    val digits = tint.drop(1)
    if (digits.length != 6 && digits.length != 8) return null
    val argb = digits.toLongOrNull(16)?.toInt() ?: return null
    val red = if (digits.length == 6) (argb shr 16) and 0xFF else (argb shr 24) and 0xFF
    val green = if (digits.length == 6) (argb shr 8) and 0xFF else (argb shr 16) and 0xFF
    val blue = if (digits.length == 6) argb and 0xFF else (argb shr 8) and 0xFF
    val hsv = FloatArray(3)
    AndroidColor.RGBToHSV(red, green, blue, hsv)
    return BitmapDescriptorFactory.defaultMarker(hsv[0])
}

internal fun uiMapOverlaysFromJson(json: String): UiMapOverlays {
    val root = try {
        JSONObject(json)
    } catch (_: Exception) {
        return UiMapOverlays()
    }
    fun points(array: org.json.JSONArray): List<UiMapPoint> {
        val out = ArrayList<UiMapPoint>(array.length())
        for (i in 0 until array.length()) {
            val item = array.optJSONObject(i) ?: continue
            out.add(
                UiMapPoint(
                    latitude = item.optDouble("latitude", 0.0),
                    longitude = item.optDouble("longitude", 0.0),
                )
            )
        }
        return out
    }
    val polylines = ArrayList<UiMapPolyline>()
    val polylineArray = root.optJSONArray("polylines")
    if (polylineArray != null) {
        for (i in 0 until polylineArray.length()) {
            val item = polylineArray.optJSONObject(i) ?: continue
            polylines.add(
                UiMapPolyline(
                    id = item.optString("id", ""),
                    coordinates = points(item.optJSONArray("coordinates") ?: continue),
                    color = item.optString("color", ""),
                    width = item.optDouble("width", 0.0),
                )
            )
        }
    }
    val polygons = ArrayList<UiMapPolygon>()
    val polygonArray = root.optJSONArray("polygons")
    if (polygonArray != null) {
        for (i in 0 until polygonArray.length()) {
            val item = polygonArray.optJSONObject(i) ?: continue
            polygons.add(
                UiMapPolygon(
                    id = item.optString("id", ""),
                    coordinates = points(item.optJSONArray("coordinates") ?: continue),
                    color = item.optString("color", ""),
                    lineColor = item.optString("lineColor", ""),
                    lineWidth = item.optDouble("lineWidth", 0.0),
                )
            )
        }
    }
    val circles = ArrayList<UiMapCircle>()
    val circleArray = root.optJSONArray("circles")
    if (circleArray != null) {
        for (i in 0 until circleArray.length()) {
            val item = circleArray.optJSONObject(i) ?: continue
            val center = item.optJSONObject("center") ?: continue
            circles.add(
                UiMapCircle(
                    id = item.optString("id", ""),
                    center =
                        UiMapPoint(
                            latitude = center.optDouble("latitude", 0.0),
                            longitude = center.optDouble("longitude", 0.0),
                        ),
                    radius = item.optDouble("radius", 0.0).coerceAtLeast(0.0),
                    color = item.optString("color", ""),
                    lineColor = item.optString("lineColor", ""),
                    lineWidth = item.optDouble("lineWidth", 0.0),
                )
            )
        }
    }
    return UiMapOverlays(polylines = polylines, polygons = polygons, circles = circles)
}

internal fun uiMapMarkersFromArray(markers: ReadableArray?): List<UiMapMarker> {
    if (markers == null) return emptyList()
    val out = ArrayList<UiMapMarker>(markers.size())
    for (i in 0 until markers.size()) {
        val item = markers.getMap(i) ?: continue
        out.add(
            UiMapMarker(
                id = item.getString("id") ?: "",
                title = item.getString("title") ?: "",
                latitude = if (item.hasKey("latitude")) item.getDouble("latitude") else 0.0,
                longitude = if (item.hasKey("longitude")) item.getDouble("longitude") else 0.0,
                tint = item.getString("tint") ?: "",
            )
        )
    }
    return out
}

// uniform map (One.UI.Map) on android: google maps compose, driven by the
// same google-style zoom ios seeds from. the camera seeds from props and
// re-seeds only when the props move; the user pans and zooms freely in
// between, and onCameraMove reports once, when a gesture ends.
class OneNativeUiMapView(context: Context) : FrameLayout(context) {
    private var latitude by mutableStateOf(37.7749)
    private var longitude by mutableStateOf(-122.4194)
    private var zoom by mutableStateOf(12.0)
    private var markers by mutableStateOf<List<UiMapMarker>>(emptyList())
    private var overlays by mutableStateOf(UiMapOverlays())

    private val composeView =
        ComposeView(context).apply {
            layoutParams =
                LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
            setViewCompositionStrategy(ViewCompositionStrategy.DisposeOnDetachedFromWindow)
        }

    init {
        addView(composeView)
        ensureLifecycleOwner()
        composeView.setContent {
            val cameraPositionState = rememberCameraPositionState {
                position =
                    CameraPosition.fromLatLngZoom(LatLng(latitude, longitude), zoom.toFloat())
            }
            // the seed is prop state, not camera state, so a pan is never
            // fought by the next render: only a prop move re-seeds.
            val seedKey = "$latitude,$longitude,$zoom"
            LaunchedEffect(seedKey) {
                cameraPositionState.position =
                    CameraPosition.fromLatLngZoom(LatLng(latitude, longitude), zoom.toFloat())
            }
            var gestureMove by remember { mutableStateOf(false) }
            LaunchedEffect(cameraPositionState) {
                snapshotFlow { cameraPositionState.isMoving }.collect { moving ->
                    if (!moving && gestureMove) {
                        gestureMove = false
                        val position = cameraPositionState.position
                        handleCameraMove(
                            position.target.latitude,
                            position.target.longitude,
                            position.zoom.toDouble(),
                        )
                    }
                }
            }
            GoogleMap(
                modifier = Modifier.fillMaxSize(),
                cameraPositionState = cameraPositionState,
                onMapClick = { point -> handleMapClick(point.latitude, point.longitude) },
                onCameraMoveStarted = { reason ->
                    gestureMove = reason == CameraMoveStartedReason.GESTURE
                },
            ) {
                markers.forEach { marker ->
                    key(marker.id, marker.latitude, marker.longitude, marker.title, marker.tint) {
                        Marker(
                            state =
                                rememberMarkerState(
                                    key = marker.id,
                                    position = LatLng(marker.latitude, marker.longitude),
                                ),
                            title = marker.title.ifEmpty { null },
                            icon = uiMapMarkerIcon(marker.tint),
                            onClick = {
                                handleMarkerClick(marker.id)
                                true
                            },
                        )
                    }
                }
                overlays.polylines.forEach { line ->
                    Polyline(
                        points = line.coordinates.map { LatLng(it.latitude, it.longitude) },
                        color = uiMapColor(line.color) ?: Color.Black,
                        width = if (line.width > 0) line.width.toFloat() else 2f,
                    )
                }
                overlays.polygons.forEach { polygon ->
                    Polygon(
                        points = polygon.coordinates.map { LatLng(it.latitude, it.longitude) },
                        fillColor = uiMapColor(polygon.color) ?: Color.Transparent,
                        strokeColor = uiMapColor(polygon.lineColor) ?: Color.Black,
                        strokeWidth = if (polygon.lineWidth > 0) polygon.lineWidth.toFloat() else 2f,
                    )
                }
                overlays.circles.forEach { circle ->
                    Circle(
                        center = LatLng(circle.center.latitude, circle.center.longitude),
                        radius = circle.radius,
                        fillColor = uiMapColor(circle.color) ?: Color.Transparent,
                        strokeColor = uiMapColor(circle.lineColor) ?: Color.Black,
                        strokeWidth = if (circle.lineWidth > 0) circle.lineWidth.toFloat() else 2f,
                    )
                }
            }
        }
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        ensureLifecycleOwner()
    }

    // maps-compose reads the lifecycle owner off the view tree, which react
    // native never sets, so the host activity (a lifecycle owner) is
    // published here instead. retried on attach: the activity can be null
    // while the view is constructed.
    private fun ensureLifecycleOwner() {
        if (ViewTreeLifecycleOwner.get(this) != null) return
        val activity = (context as? ThemedReactContext)?.currentActivity as? LifecycleOwner ?: return
        ViewTreeLifecycleOwner.set(this, activity)
    }

    internal fun setLatitude(latitude: Double) {
        this.latitude = latitude
    }

    internal fun setLongitude(longitude: Double) {
        this.longitude = longitude
    }

    internal fun setZoom(zoom: Double) {
        this.zoom = zoom
    }

    internal fun setMapMarkers(markers: ReadableArray?) {
        this.markers = uiMapMarkersFromArray(markers)
    }

    internal fun setMapOverlays(json: String?) {
        overlays = if (json.isNullOrEmpty()) UiMapOverlays() else uiMapOverlaysFromJson(json)
    }

    private fun handleCameraMove(latitude: Double, longitude: Double, zoom: Double) {
        UIManagerHelper.getEventDispatcher(UIManagerHelper.getReactContext(this))?.dispatchEvent(
            OneNativeUiMapCameraMoveEvent(
                surfaceId = UIManagerHelper.getSurfaceId(this),
                viewTag = id,
                latitude = latitude,
                longitude = longitude,
                zoom = zoom,
            )
        )
    }

    private fun handleMarkerClick(markerId: String) {
        UIManagerHelper.getEventDispatcher(UIManagerHelper.getReactContext(this))?.dispatchEvent(
            OneNativeUiMapMarkerClickEvent(
                surfaceId = UIManagerHelper.getSurfaceId(this),
                viewTag = id,
                id = markerId,
            )
        )
    }

    private fun handleMapClick(latitude: Double, longitude: Double) {
        UIManagerHelper.getEventDispatcher(UIManagerHelper.getReactContext(this))?.dispatchEvent(
            OneNativeUiMapClickEvent(
                surfaceId = UIManagerHelper.getSurfaceId(this),
                viewTag = id,
                latitude = latitude,
                longitude = longitude,
            )
        )
    }
}
