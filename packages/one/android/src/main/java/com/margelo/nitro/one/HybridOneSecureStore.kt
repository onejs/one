package com.margelo.nitro.one

import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyPermanentlyInvalidatedException
import android.security.keystore.KeyProperties
import android.security.keystore.UserNotAuthenticatedException
import android.util.Base64
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import java.security.InvalidKeyException
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

// string key-value storage matching expo-secure-store's item api and its
// options. every value is AES-256-GCM ciphertext under a key that never
// leaves AndroidKeyStore: a fresh 12-byte iv per write, prepended to the blob
// and kept in a private preferences file. the keychainService option names
// the key alias (and its preferences file), as in expo, and an authenticated
// item uses the "<alias>:auth" alias whose key requires user authentication
// per use and is invalidated when biometrics change. the default alias and
// file are the ones used before options existed, so existing values read
// back unchanged. writes commit to disk before resolving, a write clears the
// other mode's entry, and delete never touches the keystore, so it also
// clears entries whose key is gone. the biometric prompt needs a foreground
// activity, so the sync verbs throw for an authenticated item instead of
// prompting. keychainAccessible and accessGroup are ios-only, as in expo.
class HybridOneSecureStore : HybridOneSecureStoreSpec() {
    private val mainHandler = Handler(Looper.getMainLooper())

    private fun context(): Context =
        NitroModules.applicationContext
            ?: throw IllegalStateException("SecureStore: React context is not ready")

    private fun alias(options: SecureStoreOptions, authenticated: Boolean): String {
        val base = options.keychainService?.let { "$KEY_ALIAS:$it" } ?: KEY_ALIAS
        return if (authenticated) "$base:auth" else base
    }

    private fun prefs(alias: String): SharedPreferences {
        val name = if (alias == KEY_ALIAS) {
            PREFS_NAME
        } else {
            PREFS_NAME + "_" + Base64.encodeToString(
                alias.toByteArray(Charsets.UTF_8),
                Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING
            )
        }
        return context().getSharedPreferences(name, Context.MODE_PRIVATE)
    }

    private fun keyStore(): KeyStore =
        KeyStore.getInstance("AndroidKeyStore").apply { load(null) }

    private fun generateKey(alias: String, requireAuthentication: Boolean): SecretKey {
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        val builder = KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .setRandomizedEncryptionRequired(true)
        if (requireAuthentication) {
            builder.setUserAuthenticationRequired(true)
            if (Build.VERSION.SDK_INT >= 24) {
                builder.setInvalidatedByBiometricEnrollment(true)
            }
        }
        generator.init(builder.build())
        return generator.generateKey()
    }

    // bumped on every rekey per alias, so a write that failed under an older
    // key knows another write already replaced it.
    private val keyGenerations = mutableMapOf<String, Int>()

    // two writes can both fail under the dropped key. only the first rekeys;
    // the second seals under that fresh key instead of orphaning the value
    // the first one just wrote.
    @Synchronized
    private fun rekey(alias: String, requireAuthentication: Boolean, failedGeneration: Int): SecretKey {
        if (failedGeneration != (keyGenerations[alias] ?: 0)) {
            return currentKey(alias, requireAuthentication).second
        }
        val store = keyStore()
        if (store.containsAlias(alias)) store.deleteEntry(alias)
        keyGenerations[alias] = (keyGenerations[alias] ?: 0) + 1
        return generateKey(alias, requireAuthentication)
    }

    // promises run on a thread pool: without the lock, two first writes can
    // each mint the key, and the value sealed under the replaced one is lost.
    // minting a missing key is a rekey too: it advances the generation, so a
    // write still holding the dropped key cannot rekey over the new one.
    @Synchronized
    private fun currentKey(alias: String, requireAuthentication: Boolean): Pair<Int, SecretKey> {
        val existing = (keyStore().getEntry(alias, null) as? KeyStore.SecretKeyEntry)?.secretKey
        val generation = keyGenerations[alias] ?: 0
        if (existing != null) return generation to existing
        val next = generation + 1
        keyGenerations[alias] = next
        return next to generateKey(alias, requireAuthentication)
    }

    private fun encryptCipher(alias: String, requireAuthentication: Boolean): Cipher {
        val (generation, key) = currentKey(alias, requireAuthentication)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        try {
            cipher.init(Cipher.ENCRYPT_MODE, key)
        } catch (e: InvalidKeyException) {
            // the keystore dropped the key (a restore can do this), or an
            // auth key was invalidated by a biometric change: mint a fresh
            // key and seal the new value under it.
            cipher.init(Cipher.ENCRYPT_MODE, rekey(alias, requireAuthentication, generation))
        }
        return cipher
    }

    private fun seal(cipher: Cipher, value: String): String {
        val ciphertext = cipher.doFinal(value.toByteArray(Charsets.UTF_8))
        return Base64.encodeToString(cipher.iv + ciphertext, Base64.NO_WRAP)
    }

    private fun blobBytes(blob: String): ByteArray {
        val bytes = try {
            Base64.decode(blob, Base64.NO_WRAP)
        } catch (e: IllegalArgumentException) {
            throw SecureStoreException("the stored value is not a secure-store blob")
        }
        if (bytes.size < IV_BYTES + 1) {
            throw SecureStoreException("the stored value is not a secure-store blob")
        }
        return bytes
    }

    private fun decryptCipher(blob: String, alias: String, requireAuthentication: Boolean): Pair<Cipher, ByteArray> {
        val bytes = blobBytes(blob)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(
            Cipher.DECRYPT_MODE,
            currentKey(alias, requireAuthentication).second,
            GCMParameterSpec(GCM_BITS, bytes, 0, IV_BYTES)
        )
        return cipher to bytes
    }

    private fun open(cipher: Cipher, bytes: ByteArray): String =
        String(cipher.doFinal(bytes, IV_BYTES, bytes.size - IV_BYTES), Charsets.UTF_8)

    private fun decrypt(blob: String, alias: String): String {
        val (cipher, bytes) = decryptCipher(blob, alias, false)
        try {
            return open(cipher, bytes)
        } catch (e: Exception) {
            throw SecureStoreException("the stored value could not be decrypted")
        }
    }

    // any platform failure throws or rejects with the stable code for its verb.
    private fun <T> guarded(code: String, verb: String, body: () -> T): T =
        try {
            body()
        } catch (e: UserNotAuthenticatedException) {
            throw OneNativeError(
                code, "SecureStore.$verb: this item requires authentication; use the async verb")
        } catch (e: KeyPermanentlyInvalidatedException) {
            throw OneNativeError(
                code, "SecureStore.$verb: the authentication key was invalidated when biometrics changed")
        } catch (e: OneNativeError) {
            throw e
        } catch (e: Exception) {
            throw OneNativeError(code, "SecureStore.$verb: ${e.message}")
        }

    private fun readPlain(key: String, options: SecureStoreOptions): String? {
        val alias = alias(options, false)
        val blob = prefs(alias).getString(key, null) ?: return null
        return decrypt(blob, alias)
    }

    private fun authBlob(key: String, options: SecureStoreOptions): String? =
        prefs(alias(options, true)).getString(key, null)

    private fun writeBlob(key: String, blob: String, options: SecureStoreOptions, authenticated: Boolean) {
        if (!prefs(alias(options, authenticated)).edit().putString(key, blob).commit()) {
            throw SecureStoreException("the write could not be committed to disk")
        }
        // one value per key across the two modes.
        prefs(alias(options, !authenticated)).edit().remove(key).commit()
    }

    private fun removeEverywhere(key: String, options: SecureStoreOptions) {
        for (authenticated in listOf(false, true)) {
            if (!prefs(alias(options, authenticated)).edit().remove(key).commit()) {
                throw SecureStoreException("the delete could not be committed to disk")
            }
        }
    }

    // runs finish with the prompt-unlocked cipher on the main thread: the
    // blobs are short strings, so doFinal there is not a frame of work.
    private fun <T> prompt(
        cipher: Cipher,
        options: SecureStoreOptions,
        code: String,
        verb: String,
        promise: Promise<T>,
        finish: (Cipher) -> T
    ) {
        mainHandler.post {
            val activity = NitroModules.applicationContext?.currentActivity as? FragmentActivity
            if (activity == null || activity.isFinishing || activity.isDestroyed) {
                promise.reject(
                    OneNativeError(code, "SecureStore.$verb: no fragment activity to present the prompt"))
                return@post
            }
            val info = BiometricPrompt.PromptInfo.Builder()
                .setTitle(options.authenticationPrompt ?: DEFAULT_PROMPT)
                .setNegativeButtonText("Cancel")
                .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
                .build()
            val biometric = BiometricPrompt(
                activity,
                ContextCompat.getMainExecutor(activity),
                object : BiometricPrompt.AuthenticationCallback() {
                    override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                        val unlocked = result.cryptoObject?.cipher
                        if (unlocked == null) {
                            promise.reject(OneNativeError(code, "SecureStore.$verb: authentication returned no cipher"))
                            return
                        }
                        try {
                            promise.resolve(finish(unlocked))
                        } catch (e: Exception) {
                            promise.reject(storageError(code, verb, e))
                        }
                    }

                    override fun onAuthenticationError(errorCode: Int, message: CharSequence) {
                        val text = if (message.isEmpty()) "authentication failed" else message.toString()
                        promise.reject(OneNativeError(code, "SecureStore.$verb: $text"))
                    }

                    override fun onAuthenticationFailed() {
                        // a bad read is not terminal; the prompt stays up.
                    }
                }
            )
            try {
                biometric.authenticate(info, BiometricPrompt.CryptoObject(cipher))
            } catch (e: Exception) {
                promise.reject(storageError(code, verb, e))
            }
        }
    }

    private fun storageError(code: String, verb: String, error: Exception): OneNativeError =
        when (error) {
            is OneNativeError -> error
            is KeyPermanentlyInvalidatedException -> OneNativeError(
                code, "SecureStore.$verb: the authentication key was invalidated when biometrics changed")
            else -> OneNativeError(code, "SecureStore.$verb: ${error.message}")
        }

    // a plain hit resolves without a prompt; only a miss looks at the auth
    // entry. a corrupt plain blob is an error, not a miss.
    override fun getItem(key: String, options: SecureStoreOptions): Promise<String?> {
        val plainAlias = alias(options, false)
        if (prefs(plainAlias).getString(key, null) != null) {
            return Promise.async { guarded("E_SECURE_STORE_GET", "getItem") { readPlain(key, options) } }
        }
        return authGet(key, options)
    }

    // a biometric change invalidates the auth key for good, and its item
    // reads as null, as in expo.
    private fun authGet(key: String, options: SecureStoreOptions): Promise<String?> {
        val blob = authBlob(key, options) ?: return Promise.resolved(null)
        val promise = Promise<String?>()
        try {
            val (cipher, bytes) = decryptCipher(blob, alias(options, true), true)
            prompt(cipher, options, "E_SECURE_STORE_GET", "getItem", promise) { open(it, bytes) }
        } catch (e: KeyPermanentlyInvalidatedException) {
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject(storageError("E_SECURE_STORE_GET", "getItem", e))
        }
        return promise
    }

    override fun setItem(key: String, value: String, options: SecureStoreOptions): Promise<Unit> {
        if (options.requireAuthentication != true) {
            return Promise.async {
                guarded("E_SECURE_STORE_SET", "setItem") {
                    writeBlob(key, seal(encryptCipher(alias(options, false), false), value), options, false)
                }
            }
        }
        val promise = Promise<Unit>()
        try {
            val cipher = encryptCipher(alias(options, true), true)
            prompt(cipher, options, "E_SECURE_STORE_SET", "setItem", promise) {
                writeBlob(key, seal(it, value), options, true)
            }
        } catch (e: Exception) {
            promise.reject(storageError("E_SECURE_STORE_SET", "setItem", e))
        }
        return promise
    }

    override fun deleteItem(key: String, options: SecureStoreOptions): Promise<Unit> =
        Promise.async { guarded("E_SECURE_STORE_DELETE", "deleteItem") { removeEverywhere(key, options) } }

    override fun getItemSync(key: String, options: SecureStoreOptions): String? =
        guarded("E_SECURE_STORE_GET", "getItemSync") {
            readPlain(key, options) ?: authBlob(key, options)?.let { blob ->
                val (cipher, bytes) = try {
                    decryptCipher(blob, alias(options, true), true)
                } catch (e: KeyPermanentlyInvalidatedException) {
                    return@guarded null
                }
                try {
                    open(cipher, bytes)
                } catch (e: UserNotAuthenticatedException) {
                    throw OneNativeError(
                        "E_SECURE_STORE_GET",
                        "SecureStore.getItemSync: this item requires authentication; use SecureStore.getItem")
                }
            }
        }

    override fun setItemSync(key: String, value: String, options: SecureStoreOptions) {
        if (options.requireAuthentication == true) {
            throw OneNativeError(
                "E_SECURE_STORE_SET",
                "SecureStore.setItemSync: requireAuthentication needs a prompt; use SecureStore.setItem")
        }
        guarded("E_SECURE_STORE_SET", "setItemSync") {
            writeBlob(key, seal(encryptCipher(alias(options, false), false), value), options, false)
        }
    }

    override fun deleteItemSync(key: String, options: SecureStoreOptions) =
        guarded("E_SECURE_STORE_DELETE", "deleteItemSync") { removeEverywhere(key, options) }

    private class SecureStoreException(message: String) : Exception(message)

    companion object {
        private const val PREFS_NAME = "One.SecureStore"
        private const val KEY_ALIAS = "One.SecureStore"
        private const val DEFAULT_PROMPT = "Authenticate to access this item"
        private const val IV_BYTES = 12
        private const val GCM_BITS = 128
    }
}
