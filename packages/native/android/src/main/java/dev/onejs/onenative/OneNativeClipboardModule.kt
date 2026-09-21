package dev.onejs.onenative

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

// string-only clipboard, matching expo-clipboard's string api: get/set/has
// backed by the system clipboard manager.
class OneNativeClipboardModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = NAME

    private fun clipboard(): ClipboardManager? =
        reactApplicationContext.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager

    private fun primaryText(): String {
        val clip = clipboard()?.primaryClip
        if (clip == null || clip.itemCount == 0) return ""
        return clip.getItemAt(0)?.coerceToText(reactApplicationContext)?.toString() ?: ""
    }

    @ReactMethod
    fun getString(promise: Promise) {
        try {
            promise.resolve(primaryText())
        } catch (e: Exception) {
            promise.reject("ERR_CLIPBOARD_GET", e)
        }
    }

    @ReactMethod
    fun setString(text: String, promise: Promise) {
        try {
            clipboard()?.setPrimaryClip(ClipData.newPlainText("text", text))
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_CLIPBOARD_SET", e)
        }
    }

    @ReactMethod
    fun hasString(promise: Promise) {
        try {
            promise.resolve(primaryText().isNotEmpty())
        } catch (e: Exception) {
            promise.reject("ERR_CLIPBOARD_HAS", e)
        }
    }

    companion object {
        const val NAME = "OneNativeClipboard"
    }
}
