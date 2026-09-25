package com.margelo.nitro.one

import android.content.Context
import android.content.SharedPreferences
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import java.security.InvalidKeyException
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

// string key-value storage matching expo-secure-store's item api. every
// value is AES-256-GCM ciphertext under a key that never leaves
// AndroidKeyStore: a fresh 12-byte iv per write, prepended to the blob and
// kept in a private preferences file. EncryptedSharedPreferences is
// deprecated, so this is one purpose-built path instead of that wrapper.
// writes commit to disk before resolving, so a relaunch right after a set
// still reads the value. a missing key reads null; deleting one resolves
// all the same, and delete never touches the keystore, so it also clears
// entries whose key is gone.
class HybridOneSecureStore : HybridOneSecureStoreSpec() {
    private fun context(): Context =
        NitroModules.applicationContext
            ?: throw IllegalStateException("SecureStore: React context is not ready")

    private fun prefs(): SharedPreferences =
        context().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private fun keyStore(): KeyStore =
        KeyStore.getInstance("AndroidKeyStore").apply { load(null) }

    private fun generateKey(): SecretKey {
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        val spec = KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .setRandomizedEncryptionRequired(true)
            .build()
        generator.init(spec)
        return generator.generateKey()
    }

    // bumped on every rekey, so a write that failed under an older key knows
    // another write already replaced it.
    private var keyGeneration = 0

    // two writes can both fail under the dropped key. only the first rekeys;
    // the second seals under that fresh key instead of orphaning the value
    // the first one just wrote.
    @Synchronized
    private fun rekey(failedGeneration: Int): SecretKey {
        if (failedGeneration != keyGeneration) return currentKey().second
        deleteKey()
        keyGeneration += 1
        return generateKey()
    }

    private fun deleteKey() {
        val store = keyStore()
        if (store.containsAlias(KEY_ALIAS)) store.deleteEntry(KEY_ALIAS)
    }

    // promises run on a thread pool: without the lock, two first writes can
    // each mint the key, and the value sealed under the replaced one is lost.
    @Synchronized
    private fun currentKey(): Pair<Int, SecretKey> =
        keyGeneration to
            ((keyStore().getEntry(KEY_ALIAS, null) as? KeyStore.SecretKeyEntry)?.secretKey
                ?: generateKey())

    private fun encryptWith(key: SecretKey, value: String): String {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key)
        val ciphertext = cipher.doFinal(value.toByteArray(Charsets.UTF_8))
        val blob = cipher.iv + ciphertext
        return Base64.encodeToString(blob, Base64.NO_WRAP)
    }

    private fun encrypt(value: String): String {
        val (generation, key) = currentKey()
        try {
            return encryptWith(key, value)
        } catch (e: InvalidKeyException) {
            // the keystore dropped the key (a restore can do this): mint a
            // fresh key and write once more under it.
            return encryptWith(rekey(generation), value)
        }
    }

    private fun decrypt(blob: String): String {
        val bytes =
            try {
                Base64.decode(blob, Base64.NO_WRAP)
            } catch (e: IllegalArgumentException) {
                throw SecureStoreException("the stored value is not a secure-store blob")
            }
        if (bytes.size < IV_BYTES + 1) {
            throw SecureStoreException("the stored value is not a secure-store blob")
        }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        try {
            cipher.init(
                Cipher.DECRYPT_MODE,
                currentKey().second,
                GCMParameterSpec(GCM_BITS, bytes, 0, IV_BYTES)
            )
            return String(cipher.doFinal(bytes, IV_BYTES, bytes.size - IV_BYTES), Charsets.UTF_8)
        } catch (e: Exception) {
            throw SecureStoreException("the stored value could not be decrypted")
        }
    }

    // any platform failure rejects with the stable code for its verb.
    private fun <T> guarded(code: String, verb: String, body: () -> T): Promise<T> =
        Promise.async {
            try {
                body()
            } catch (e: Exception) {
                throw OneNativeError(code, "SecureStore.$verb: ${e.message}")
            }
        }

    override fun getItem(key: String): Promise<String?> =
        guarded("E_SECURE_STORE_GET", "getItem") {
            val blob = prefs().getString(key, null) ?: return@guarded null
            decrypt(blob)
        }

    override fun setItem(key: String, value: String): Promise<Unit> =
        guarded("E_SECURE_STORE_SET", "setItem") {
            if (!prefs().edit().putString(key, encrypt(value)).commit()) {
                throw SecureStoreException("the write could not be committed to disk")
            }
        }

    override fun deleteItem(key: String): Promise<Unit> =
        guarded("E_SECURE_STORE_DELETE", "deleteItem") {
            if (!prefs().edit().remove(key).commit()) {
                throw SecureStoreException("the delete could not be committed to disk")
            }
        }

    private class SecureStoreException(message: String) : Exception(message)

    companion object {
        private const val PREFS_NAME = "One.SecureStore"
        private const val KEY_ALIAS = "One.SecureStore"
        private const val IV_BYTES = 12
        private const val GCM_BITS = 128
    }
}
