package com.margelo.nitro.one

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Address
import android.location.Geocoder
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import dev.onejs.onenative.OneLocationService
import java.util.Locale
import java.util.UUID
import java.util.concurrent.Executors

// location matching the ios contract: five statuses, when-in-use prompt,
// current position with the 30s recent-fix rule, watches with background
// support, and forward/reverse geocoding. platform LocationManager only,
// no play fused provider. restricted is unreachable on android (no api
// distinguishes it) and never returned; always means the background grant
// is held. background watches run under a location-type foreground
// service with a persistent notification while registered.
class HybridOneLocation :
    HybridOneLocationSpec(),
    LifecycleEventListener,
    PermissionListener {
    private data class Watch(
        val onPosition: (LocationPosition) -> Unit,
        val onError: (String, String) -> Unit,
        val background: Boolean
    )

    private val mainHandler = Handler(Looper.getMainLooper())
    private val geocoderPool = Executors.newCachedThreadPool()
    private val permissionPromises = mutableListOf<Promise<LocationPermissionStatus>>()
    private val positionPromises = mutableListOf<Promise<LocationPosition>>()
    private val watches = mutableMapOf<UUID, Watch>()
    private var monitoring = false
    private val fixTimeoutRunnable = Runnable { fixTimeout() }
    private var lastGranted: Boolean? = null
    @Volatile private var active = false

    private val listener = object : LocationListener {
        override fun onLocationChanged(location: Location) {
            didUpdate(location)
        }

        override fun onProviderEnabled(provider: String) {}

        override fun onProviderDisabled(provider: String) {
            didProviderChange()
        }

        @Deprecated("deprecated in the platform listener")
        override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
    }

    init {
        NitroModules.applicationContext?.addLifecycleEventListener(this)
    }

    override fun dispose() {
        NitroModules.applicationContext?.removeLifecycleEventListener(this)
        stopMonitoring()
        stopLocationService()
        geocoderPool.shutdownNow()
        super.dispose()
    }

    override fun onHostResume() {
        active = true
        // a revoke in settings lands while paused; fail the watch like the
        // ios authorization callback does.
        val granted = hasForegroundGrant()
        if (lastGranted == true && granted == false) {
            failAll("E_LOCATION_PERMISSION", "Location.watchPosition: location permission was removed")
            val positions = positionPromises.toList()
            positionPromises.clear()
            mainHandler.removeCallbacks(fixTimeoutRunnable)
            for (promise in positions) {
                promise.reject(
                    OneNativeError(
                        "E_LOCATION_PERMISSION",
                        "Location.getCurrentPosition: location permission was removed"
                    )
                )
            }
        }
        lastGranted = granted
    }

    override fun onHostPause() {
        active = false
    }

    override fun onHostDestroy() {
        active = false
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ): Boolean {
        if (requestCode != LOCATION_REQUEST_CODE) return false
        mainHandler.post {
            markAsked()
            val status = status()
            lastGranted = status == LocationPermissionStatus.WHENINUSE ||
                status == LocationPermissionStatus.ALWAYS
            val pending = permissionPromises.toList()
            permissionPromises.clear()
            for (promise in pending) promise.resolve(status)
        }
        return true
    }

    override fun getPermissionStatus(): LocationPermissionStatus = status()

    override fun requestWhenInUsePermission(): Promise<LocationPermissionStatus> {
        val promise = Promise<LocationPermissionStatus>()
        mainHandler.post {
            val context = NitroModules.applicationContext
            if (context == null || !declaresForeground(context)) {
                promise.reject(
                    OneNativeError(
                        "E_LOCATION_MANIFEST",
                        "Location.requestWhenInUsePermission: set native.app.location.whenInUse"
                    )
                )
                return@post
            }
            val current = status()
            if (current != LocationPermissionStatus.NOTDETERMINED) {
                promise.resolve(current)
                return@post
            }
            if (permissionPromises.isNotEmpty()) {
                permissionPromises.add(promise)
                return@post
            }
            val activity = currentActivity()
            if (activity == null) {
                promise.reject(
                    OneNativeError(
                        "E_LOCATION_BACKGROUND",
                        "Location.requestWhenInUsePermission: app must be active"
                    )
                )
                return@post
            }
            permissionPromises.add(promise)
            val aware = activity as? PermissionAwareActivity
            if (aware != null) {
                aware.requestPermissions(
                    arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION),
                    LOCATION_REQUEST_CODE, this
                )
            } else {
                androidx.core.app.ActivityCompat.requestPermissions(
                    activity,
                    arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION),
                    LOCATION_REQUEST_CODE
                )
            }
        }
        return promise
    }

    override fun getCurrentPosition(): Promise<LocationPosition> {
        val promise = Promise<LocationPosition>()
        mainHandler.post {
            val manager = locationManager()
            if (manager == null || !hasForegroundGrant()) {
                promise.reject(
                    OneNativeError(
                        "E_LOCATION_PERMISSION",
                        "Location.getCurrentPosition: location permission is required"
                    )
                )
                return@post
            }
            recentPosition(manager)?.let {
                promise.resolve(it)
                return@post
            }
            if (!serviceEnabled(manager)) {
                promise.reject(
                    OneNativeError(
                        "E_LOCATION_UNAVAILABLE",
                        "Location.getCurrentPosition: location services are off"
                    )
                )
                return@post
            }
            positionPromises.add(promise)
            if (positionPromises.size == 1 && !monitoring) {
                startMonitoring(manager)
            }
            mainHandler.removeCallbacks(fixTimeoutRunnable)
            mainHandler.postDelayed(fixTimeoutRunnable, 30_000)
        }
        return promise
    }

    override fun addPositionListener(
        onPosition: (position: LocationPosition) -> Unit,
        onError: (code: String, message: String) -> Unit,
        background: Boolean
    ): () -> Unit {
        val id = UUID.randomUUID()
        mainHandler.post {
            val context = NitroModules.applicationContext
            val manager = locationManager()
            if (context == null || manager == null || !hasForegroundGrant()) {
                onError("E_LOCATION_PERMISSION", "Location.watchPosition: location permission is required")
                return@post
            }
            if (background && !declaresBackground(context)) {
                onError("E_LOCATION_MANIFEST", "Location.watchPosition: set native.app.location.background")
                return@post
            }
            if (background && currentActivity() == null) {
                onError("E_LOCATION_BACKGROUND", "Location.watchPosition: start the background watch while active")
                return@post
            }
            watches[id] = Watch(onPosition, onError, background)
            lastGranted = true
            if (background) startLocationService(context)
            recentPosition(manager)?.let { onPosition(it) }
            if (positionPromises.isEmpty() && !monitoring) {
                startMonitoring(manager)
            }
        }
        return {
            mainHandler.post {
                val removed = watches.remove(id)
                if (removed != null && removed.background && watches.values.none { it.background }) {
                    stopLocationService()
                }
                if (watches.isEmpty() && monitoring) {
                    stopMonitoring()
                    if (positionPromises.isNotEmpty()) {
                        locationManager()?.let { startMonitoring(it) }
                    }
                }
            }
        }
    }

    override fun geocodeAddress(address: String): Promise<Array<LocationPlace>> {
        val promise = Promise<Array<LocationPlace>>()
        if (address.isBlank()) {
            promise.reject(
                OneNativeError("E_LOCATION_GEOCODE", "Location.geocodeAddress: address is required")
            )
            return promise
        }
        val context = NitroModules.applicationContext
        if (context == null || !Geocoder.isPresent()) {
            promise.resolve(emptyArray())
            return promise
        }
        geocoderPool.execute {
            try {
                @Suppress("DEPRECATION")
                val found = Geocoder(context, Locale.getDefault())
                    .getFromLocationName(address, 5) ?: emptyList()
                mainHandler.post { promise.resolve(found.map { place(it) }.toTypedArray()) }
            } catch (e: Exception) {
                mainHandler.post {
                    promise.reject(
                        OneNativeError("E_LOCATION_GEOCODE", "Location.geocode: ${e.message}")
                    )
                }
            }
        }
        return promise
    }

    override fun reverseGeocode(latitude: Double, longitude: Double): Promise<Array<LocationPlace>> {
        val promise = Promise<Array<LocationPlace>>()
        if (!latitude.isFinite() || !longitude.isFinite() ||
            kotlin.math.abs(latitude) > 90 || kotlin.math.abs(longitude) > 180
        ) {
            promise.reject(
                OneNativeError("E_LOCATION_GEOCODE", "Location.reverseGeocode: invalid coordinate")
            )
            return promise
        }
        val context = NitroModules.applicationContext
        if (context == null || !Geocoder.isPresent()) {
            promise.resolve(emptyArray())
            return promise
        }
        geocoderPool.execute {
            try {
                @Suppress("DEPRECATION")
                val found = Geocoder(context, Locale.getDefault())
                    .getFromLocation(latitude, longitude, 5) ?: emptyList()
                mainHandler.post { promise.resolve(found.map { place(it) }.toTypedArray()) }
            } catch (e: Exception) {
                mainHandler.post {
                    promise.reject(
                        OneNativeError("E_LOCATION_GEOCODE", "Location.geocode: ${e.message}")
                    )
                }
            }
        }
        return promise
    }

    private fun status(): LocationPermissionStatus {
        if (hasBackgroundGrant()) return LocationPermissionStatus.ALWAYS
        if (hasForegroundGrant()) return LocationPermissionStatus.WHENINUSE
        return if (wasAsked()) LocationPermissionStatus.DENIED
        else LocationPermissionStatus.NOTDETERMINED
    }

    private fun hasForegroundGrant(): Boolean {
        val context = NitroModules.applicationContext ?: return false
        return ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED
    }

    private fun hasBackgroundGrant(): Boolean {
        if (Build.VERSION.SDK_INT < 29) return hasForegroundGrant()
        val context = NitroModules.applicationContext ?: return false
        return ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION) ==
            PackageManager.PERMISSION_GRANTED
    }

    private fun declaresForeground(context: Context): Boolean {
        return requested(context).any {
            it == Manifest.permission.ACCESS_FINE_LOCATION ||
                it == Manifest.permission.ACCESS_COARSE_LOCATION
        }
    }

    private fun declaresBackground(context: Context): Boolean {
        // below 29 background location has no platform gate.
        if (Build.VERSION.SDK_INT < 29) return true
        return requested(context).contains(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
    }

    private fun requested(context: Context): List<String> {
        return try {
            @Suppress("DEPRECATION")
            context.packageManager.getPackageInfo(context.packageName, PackageManager.GET_PERMISSIONS)
                .requestedPermissions?.toList() ?: emptyList()
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun prefs() =
        NitroModules.applicationContext?.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    private fun wasAsked(): Boolean = prefs()?.getBoolean(KEY_ASKED, false) == true

    private fun markAsked() {
        prefs()?.edit()?.putBoolean(KEY_ASKED, true)?.apply()
    }

    private fun currentActivity(): Activity? {
        if (!active) return null
        val activity = NitroModules.applicationContext?.currentActivity ?: return null
        if (activity.isFinishing || activity.isDestroyed) return null
        return activity
    }

    private fun locationManager(): LocationManager? {
        val context = NitroModules.applicationContext ?: return null
        return try {
            context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        } catch (_: Exception) {
            null
        }
    }

    private fun serviceEnabled(manager: LocationManager): Boolean {
        return try {
            manager.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
                manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
        } catch (_: Exception) {
            false
        }
    }

    private fun recentPosition(manager: LocationManager): LocationPosition? {
        return try {
            val fixes = listOf(
                manager.getLastKnownLocation(LocationManager.GPS_PROVIDER),
                manager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
            ).filterNotNull()
                .filter { it.accuracy >= 0 && System.currentTimeMillis() - it.time <= 30_000 }
            fixes.maxByOrNull { it.time }?.let { position(it) }
        } catch (_: SecurityException) {
            null
        }
    }

    private fun startMonitoring(manager: LocationManager) {
        try {
            manager.requestLocationUpdates(
                LocationManager.GPS_PROVIDER, 1000L, 0f, listener, Looper.getMainLooper()
            )
        } catch (_: Exception) {
        }
        try {
            manager.requestLocationUpdates(
                LocationManager.NETWORK_PROVIDER, 1000L, 0f, listener, Looper.getMainLooper()
            )
        } catch (_: Exception) {
        }
        monitoring = true
    }

    private fun stopMonitoring() {
        try {
            locationManager()?.removeUpdates(listener)
        } catch (_: Exception) {
        }
        monitoring = false
    }

    private fun fixTimeout() {
        if (positionPromises.isEmpty()) return
        val pending = positionPromises.toList()
        positionPromises.clear()
        for (promise in pending) {
            promise.reject(
                OneNativeError(
                    "E_LOCATION_UNAVAILABLE",
                    "Location.getCurrentPosition: no fix within 30s"
                )
            )
        }
        if (watches.isEmpty() && monitoring) stopMonitoring()
    }

    private fun didUpdate(location: Location) {
        val position = position(location)
        val pending = positionPromises.toList()
        positionPromises.clear()
        mainHandler.removeCallbacks(fixTimeoutRunnable)
        for (promise in pending) promise.resolve(position)
        for (watch in watches.values.toList()) {
            try {
                watch.onPosition(position)
            } catch (_: Exception) {
            }
        }
        if (watches.isEmpty() && monitoring) stopMonitoring()
    }

    private fun didProviderChange() {
        val manager = locationManager() ?: return
        if (serviceEnabled(manager)) return
        if (watches.isEmpty() && positionPromises.isEmpty()) return
        // services off notifies but keeps the watches: updates resume when
        // a provider returns, like the ios locationUnknown path.
        for (watch in watches.values.toList()) {
            try {
                watch.onError("E_LOCATION_UNAVAILABLE", "Location.watchPosition: location services are off")
            } catch (_: Exception) {
            }
        }
        val pending = positionPromises.toList()
        positionPromises.clear()
        mainHandler.removeCallbacks(fixTimeoutRunnable)
        for (promise in pending) {
            promise.reject(
                OneNativeError(
                    "E_LOCATION_UNAVAILABLE",
                    "Location.getCurrentPosition: location services are off"
                )
            )
        }
    }

    private fun failAll(code: String, message: String) {
        if (monitoring) stopMonitoring()
        val current = watches.values.toList()
        watches.clear()
        stopLocationService()
        for (watch in current) {
            try {
                watch.onError(code, message)
            } catch (_: Exception) {
            }
        }
    }

    private fun startLocationService(context: Context) {
        try {
            val intent = Intent(context, OneLocationService::class.java)
            if (Build.VERSION.SDK_INT >= 26) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        } catch (_: Exception) {
        }
    }

    private fun stopLocationService() {
        try {
            NitroModules.applicationContext?.let {
                it.stopService(Intent(it, OneLocationService::class.java))
            }
        } catch (_: Exception) {
        }
    }

    private fun place(address: Address): LocationPlace {
        return LocationPlace(
            latitude = if (address.hasLatitude()) address.latitude else 0.0,
            longitude = if (address.hasLongitude()) address.longitude else 0.0,
            name = address.featureName,
            street = address.thoroughfare,
            houseNumber = address.subThoroughfare,
            city = address.locality,
            region = address.adminArea,
            postalCode = address.postalCode,
            country = address.countryName,
            isoCountryCode = address.countryCode
        )
    }

    private fun position(location: Location): LocationPosition {
        return LocationPosition(
            latitude = location.latitude,
            longitude = location.longitude,
            accuracy = location.accuracy.toDouble(),
            altitude = if (location.hasAltitude()) location.altitude else 0.0,
            altitudeAccuracy = if (Build.VERSION.SDK_INT >= 26 && location.hasVerticalAccuracy()) {
                location.verticalAccuracyMeters.toDouble()
            } else {
                -1.0
            },
            course = if (location.hasBearing()) location.bearing.toDouble() else -1.0,
            speed = if (location.hasSpeed()) location.speed.toDouble() else -1.0,
            timestamp = location.time.toDouble()
        )
    }

    companion object {
        private const val LOCATION_REQUEST_CODE = 4301
        private const val PREFS = "One.Location"
        private const val KEY_ASKED = "asked"
    }
}
