package dev.onejs.onenative

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.security.SecureRandom

// secure random bytes for the crypto polyfill, the Android half of
// OneNativeCrypto: one blocking sync method returning lowercase hex, null
// on invalid counts. the js side throws rather than falling back to
// Math.random, so a null here surfaces as a loud error, never weak bytes.
class OneNativeCryptoModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = NAME

    private val secureRandom = SecureRandom()

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getRandomBytesHex(count: Double): String? {
        if (count.isNaN() || count < 0 || count > MAX_BYTES || count != kotlin.math.floor(count)) {
            return null
        }
        val length = count.toInt()
        if (length == 0) {
            return ""
        }
        val bytes = ByteArray(length)
        secureRandom.nextBytes(bytes)
        val out = CharArray(length * 2)
        for (i in bytes.indices) {
            val value = bytes[i].toInt() and 0xff
            out[i * 2] = HEX_DIGITS[value shr 4]
            out[i * 2 + 1] = HEX_DIGITS[value and 15]
        }
        return String(out)
    }

    companion object {
        const val NAME = "OneNativeCrypto"
        const val MAX_BYTES = 65536
        private const val HEX_DIGITS = "0123456789abcdef"
    }
}
