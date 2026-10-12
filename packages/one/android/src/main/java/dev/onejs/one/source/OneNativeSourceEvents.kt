package dev.onejs.one.source

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONArray
import org.json.JSONObject

// the device event channel for native-source module events. generated glue
// posts one json array per event; javascript subscribes by channel name.
class OneNativeSourceEvents(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    companion object {
        const val NAME = "OneNativeSourceEvents"

        @Volatile
        var shared: OneNativeSourceEvents? = null
            private set

        @JvmStatic
        fun send(channel: String, argsJson: String) {
            val instance = shared ?: return
            // the bridge is gone only while the app tears down; dropping then
            // is correct because no javascript runtime can receive the event.
            val emitter = instance.reactApplicationContext.getJSModule(
                DeviceEventManagerModule.RCTDeviceEventEmitter::class.java
            )
            emitter.emit(channel, toWritableArray(JSONArray(argsJson)))
        }

        private fun toWritableArray(json: JSONArray): WritableArray {
            val out = Arguments.createArray()
            for (index in 0 until json.length()) {
                when (val item = json.opt(index)) {
                    null, JSONObject.NULL -> out.pushNull()
                    is Boolean -> out.pushBoolean(item)
                    is Number -> out.pushDouble(item.toDouble())
                    is String -> out.pushString(item)
                    is JSONObject -> out.pushMap(toWritableMap(item))
                    is JSONArray -> out.pushArray(toWritableArray(item))
                    else -> out.pushString(item.toString())
                }
            }
            return out
        }

        private fun toWritableMap(json: JSONObject): WritableMap {
            val out = Arguments.createMap()
            for (key in json.keys()) {
                when (val item = json.opt(key)) {
                    null, JSONObject.NULL -> out.putNull(key)
                    is Boolean -> out.putBoolean(key, item)
                    is Number -> out.putDouble(key, item.toDouble())
                    is String -> out.putString(key, item)
                    is JSONObject -> out.putMap(key, toWritableMap(item))
                    is JSONArray -> out.putArray(key, toWritableArray(item))
                    else -> out.putString(key, item.toString())
                }
            }
            return out
        }
    }

    init {
        shared = this
    }

    override fun getName(): String = NAME

    // react-native calls these around listener counts; the channel posts
    // whether or not javascript currently listens.
    @ReactMethod
    fun addListener(eventName: String) {
    }

    @ReactMethod
    fun removeListeners(count: Int) {
    }
}
