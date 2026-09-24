package com.margelo.nitro.one

import com.margelo.nitro.core.ArrayBuffer
import java.security.SecureRandom

// secure random bytes for the crypto polyfill, from SecureRandom. an invalid
// count throws so the js side never falls back to Math.random.
class HybridOneCrypto : HybridOneCryptoSpec() {
    private val secureRandom = SecureRandom()

    override fun getRandomBytes(count: Double): ArrayBuffer {
        if (count.isNaN() || count < 0 || count > MAX_BYTES || count != kotlin.math.floor(count)) {
            throw IllegalArgumentException("secure random: invalid byte count $count")
        }
        val bytes = ByteArray(count.toInt())
        secureRandom.nextBytes(bytes)
        return ArrayBuffer.copy(bytes)
    }

    companion object {
        const val MAX_BYTES = 65536
    }
}
