package dev.onejs.onenative

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.Build
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

// connection state matching expo-network: type plus connected and reachable
// flags, from ConnectivityManager with a NetworkCallback listener.
class OneNativeNetworkModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = NAME

    private var listenerCount = 0
    private var callback: ConnectivityManager.NetworkCallback? = null

    private fun connectivity(): ConnectivityManager? =
        reactApplicationContext.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager

    @ReactMethod
    fun getState(promise: Promise) {
        try {
            promise.resolve(stateMap())
        } catch (e: Exception) {
            promise.reject("E_NETWORK_STATE", "Network.getState: ${e.message}", e)
        }
    }

    @ReactMethod
    fun startMonitoring() {
        synchronized(this) {
            listenerCount += 1
            if (listenerCount > 1 || callback != null) return
            // the library declares no permissions, so the app must declare
            // ACCESS_NETWORK_STATE; without it monitoring is unavailable and
            // the effect does nothing instead of raising a SecurityException.
            if (reactApplicationContext.checkSelfPermission(
                    android.Manifest.permission.ACCESS_NETWORK_STATE
                ) != android.content.pm.PackageManager.PERMISSION_GRANTED
            ) {
                return
            }
            val manager = connectivity() ?: return
            val next =
                object : ConnectivityManager.NetworkCallback() {
                    override fun onAvailable(network: Network) = emit()

                    override fun onLost(network: Network) = emit()

                    override fun onCapabilitiesChanged(
                        network: Network,
                        capabilities: NetworkCapabilities
                    ) = emit()
                }
            callback = next
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                manager.registerDefaultNetworkCallback(next)
            } else {
                manager.registerNetworkCallback(NetworkRequest.Builder().build(), next)
            }
        }
    }

    @ReactMethod
    fun stopMonitoring() {
        synchronized(this) {
            if (listenerCount == 0) return
            listenerCount -= 1
            if (listenerCount == 0) {
                callback?.let {
                    try {
                        connectivity()?.unregisterNetworkCallback(it)
                    } catch (_: Exception) {
                    }
                }
                callback = null
            }
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // the emitter requires this; the callback lifecycle flows through
        // startMonitoring instead.
    }

    @ReactMethod
    fun removeListeners(count: Int) {
    }

    private fun emit() {
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(STATE_CHANGED_EVENT, stateMap())
        } catch (_: Exception) {
        }
    }

    private fun stateMap(): WritableMap {
        val manager = connectivity()
        val capabilities = manager?.getNetworkCapabilities(manager.activeNetwork)
        var type = "none"
        var connected = false
        var reachable = false
        if (capabilities != null) {
            connected = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            reachable = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
            type =
                when {
                    !connected -> "none"
                    capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "cellular"
                    capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "wifi"
                    capabilities.hasTransport(NetworkCapabilities.TRANSPORT_BLUETOOTH) -> "bluetooth"
                    capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "ethernet"
                    capabilities.hasTransport(NetworkCapabilities.TRANSPORT_VPN) -> "vpn"
                    else -> "other"
                }
        }
        return Arguments.createMap().apply {
            putString("type", type)
            putBoolean("isConnected", connected)
            putBoolean("isInternetReachable", reachable)
        }
    }

    companion object {
        const val NAME = "OneNativeNetwork"
        const val STATE_CHANGED_EVENT = "oneNativeNetworkStateChanged"
    }
}
