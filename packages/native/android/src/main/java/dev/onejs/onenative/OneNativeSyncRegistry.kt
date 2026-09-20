package dev.onejs.onenative

import androidx.compose.runtime.MutableState
import androidx.compose.runtime.mutableStateOf

// native-owned storage for observable sync state: one entry per useNativeState
// handle, keyed by the id the JS handle carries. Compose text fields bind by
// id and read the entry's MutableState directly, so bound views converge
// without a React render. the JSI host object reads and writes through here
// from both the JS runtime and the UI worklet runtime.
internal class OneNativeSyncState(
    val id: Int,
    val value: MutableState<Any>,
)

object OneNativeSyncRegistry {
    private val lock = Any()
    private val states = mutableMapOf<Int, OneNativeSyncState>()
    private var nextId = 1

    @JvmStatic
    fun create(initial: Any): Int {
        synchronized(lock) {
            val id = nextId++
            states[id] = OneNativeSyncState(id, mutableStateOf(initial))
            return id
        }
    }

    @JvmStatic
    fun destroy(id: Int) {
        synchronized(lock) {
            states.remove(id)
        }
    }

    @JvmStatic
    fun get(id: Int): Any? {
        synchronized(lock) {
            return states[id]?.value?.value
        }
    }

    @JvmStatic
    fun set(id: Int, value: Any) {
        // snapshot writes are thread-safe: a write from any thread converges
        // every observing composition without a main hop.
        val state =
            synchronized(lock) {
                states[id]
            } ?: return
        state.value.value = value
    }

    fun stateOf(id: Int): MutableState<Any>? {
        synchronized(lock) {
            return states[id]?.value
        }
    }
}
