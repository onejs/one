package com.margelo.nitro.one

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise

// connection state matching expo-network: type plus connected and reachable
// flags from ConnectivityManager. one default-network callback is registered
// while any listener is attached: the first listener registers it, so its
// first callback is never dropped, and the last removal unregisters it.
class HybridOneNetwork : HybridOneNetworkSpec() {
    private val listeners = mutableMapOf<Int, (NetworkState) -> Unit>()
    private var nextListenerId = 0
    private var callback: ConnectivityManager.NetworkCallback? = null

    private fun connectivity(): ConnectivityManager =
        NitroModules.applicationContext?.getSystemService(Context.CONNECTIVITY_SERVICE)
            as? ConnectivityManager
            ?: throw IllegalStateException("Network: React context is not ready")

    override fun getState(): Promise<NetworkState> = Promise.async { currentState() }

    override fun addStateListener(listener: (state: NetworkState) -> Unit): () -> Unit {
        synchronized(this) {
            val id = nextListenerId++
            listeners[id] = listener
            if (callback == null) {
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
                connectivity().registerDefaultNetworkCallback(next)
            }
            return { removeListener(id) }
        }
    }

    private fun removeListener(id: Int) {
        synchronized(this) {
            listeners.remove(id)
            if (listeners.isNotEmpty()) return
            callback?.let { connectivity().unregisterNetworkCallback(it) }
            callback = null
        }
    }

    private fun emit() {
        val state = currentState()
        val current = synchronized(this) { listeners.values.toList() }
        current.forEach { it(state) }
    }

    private fun currentState(): NetworkState {
        val manager = connectivity()
        val capabilities = manager.getNetworkCapabilities(manager.activeNetwork)
            ?: return NetworkState(NetworkStateType.NONE, false, false)
        val connected = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        val reachable = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
        val type =
            when {
                !connected -> NetworkStateType.NONE
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> NetworkStateType.CELLULAR
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> NetworkStateType.WIFI
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_BLUETOOTH) -> NetworkStateType.BLUETOOTH
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> NetworkStateType.ETHERNET
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_VPN) -> NetworkStateType.VPN
                else -> NetworkStateType.OTHER
            }
        return NetworkState(type, connected, reachable)
    }
}
