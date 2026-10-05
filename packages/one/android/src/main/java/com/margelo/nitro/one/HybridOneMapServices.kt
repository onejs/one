package com.margelo.nitro.one

import android.content.Context
import android.location.Address
import android.location.Geocoder
import android.os.Handler
import android.os.Looper
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import java.util.Locale
import java.util.concurrent.Executors
import kotlin.math.abs
import kotlin.math.cos

// map services with the honest android split: search runs on the platform
// Geocoder bounded by the same radius validation as ios; autocomplete,
// resolveSuggestion, and directions have no platform equivalent (play sdk
// is out of scope), so the android ts entry keeps their unavailable
// contract and these kotlin methods are unreachable behind that routing.
class HybridOneMapServices : HybridOneMapServicesSpec() {
    private val mainHandler = Handler(Looper.getMainLooper())
    private val pool = Executors.newCachedThreadPool()

    override fun dispose() {
        pool.shutdownNow()
        super.dispose()
    }

    override fun search(
        query: String,
        center: MapCoordinate,
        radiusMeters: Double
    ): Promise<Array<MapPlace>> {
        val promise = Promise<Array<MapPlace>>()
        if (!validSearch(query, center, radiusMeters)) {
            promise.reject(
                OneNativeError("E_MAP_INPUT", "MapServices.search: invalid query, center, or radius")
            )
            return promise
        }
        val context = NitroModules.applicationContext
        if (context == null || !Geocoder.isPresent()) {
            promise.resolve(emptyArray())
            return promise
        }
        pool.execute {
            try {
                val found = searchGeocoder(context, query, center, radiusMeters)
                mainHandler.post { promise.resolve(found.map { place(it) }.toTypedArray()) }
            } catch (error: Exception) {
                mainHandler.post {
                    promise.reject(
                        OneNativeError("E_MAP_SEARCH", "MapServices.search: ${error.message ?: error.javaClass.simpleName}")
                    )
                }
            }
        }
        return promise
    }

    override fun autocomplete(
        query: String,
        center: MapCoordinate,
        radiusMeters: Double
    ): Promise<Array<MapSuggestion>> {
        // unreachable: index.android.ts keeps the unavailable contract.
        return Promise.rejected(
            OneNativeError("E_MAP_AUTOCOMPLETE", "MapServices.autocomplete: autocomplete requires iOS")
        )
    }

    override fun resolveSuggestion(id: String): Promise<MapPlace> {
        // unreachable: index.android.ts keeps the unavailable contract.
        return Promise.rejected(
            OneNativeError("E_MAP_SEARCH", "MapServices.resolveSuggestion: resolving suggestions requires iOS")
        )
    }

    override fun directions(
        origin: MapCoordinate,
        destination: MapCoordinate,
        transport: MapTransport
    ): Promise<MapRoute> {
        // unreachable: index.android.ts keeps the unavailable contract.
        return Promise.rejected(
            OneNativeError("E_MAP_DIRECTIONS", "MapServices.directions: directions require iOS")
        )
    }

    private fun valid(point: MapCoordinate): Boolean {
        return point.latitude.isFinite() && point.longitude.isFinite() &&
            abs(point.latitude) <= 90 && abs(point.longitude) <= 180
    }

    private fun validSearch(query: String, center: MapCoordinate, radiusMeters: Double): Boolean {
        return valid(center) && radiusMeters.isFinite() &&
            radiusMeters >= 100 && radiusMeters <= 50_000 &&
            query.isNotBlank()
    }

    // center+radius become a geocoder bbox: one degree of latitude is
    // ~111320m, longitude scales by cos(lat). a wrapped longitude or a
    // polar center falls back to an unbounded search.
    private fun searchGeocoder(
        context: Context,
        query: String,
        center: MapCoordinate,
        radiusMeters: Double
    ): List<Address> {
        val geocoder = Geocoder(context, Locale.getDefault())
        @Suppress("DEPRECATION")
        if (abs(center.latitude) > 89.9) {
            return geocoder.getFromLocationName(query, MAX_RESULTS) ?: emptyList()
        }
        val dLat = radiusMeters / 111320.0
        val dLng = radiusMeters / (111320.0 * cos(Math.toRadians(center.latitude)))
        val minLat = (center.latitude - dLat).coerceIn(-90.0, 90.0)
        val maxLat = (center.latitude + dLat).coerceIn(-90.0, 90.0)
        val rawMinLng = center.longitude - dLng
        val rawMaxLng = center.longitude + dLng
        if (rawMinLng < -180 || rawMaxLng > 180) {
            return geocoder.getFromLocationName(query, MAX_RESULTS) ?: emptyList()
        }
        @Suppress("DEPRECATION")
        return geocoder.getFromLocationName(query, MAX_RESULTS, minLat, rawMinLng, maxLat, rawMaxLng)
            ?: emptyList()
    }

    private fun place(address: Address): MapPlace {
        val line = if (address.maxAddressLineIndex >= 0) address.getAddressLine(0) else null
        return MapPlace(
            name = address.featureName ?: line ?: "",
            address = line ?: "",
            coordinate = MapCoordinate(
                latitude = if (address.hasLatitude()) address.latitude else 0.0,
                longitude = if (address.hasLongitude()) address.longitude else 0.0
            )
        )
    }

    companion object {
        private const val MAX_RESULTS = 10
    }
}
