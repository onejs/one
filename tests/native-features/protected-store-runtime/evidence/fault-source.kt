package com.margelo.nitro.one

import android.Manifest
import android.app.Activity
import android.app.Application
import android.app.KeyguardManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.hardware.biometrics.BiometricManager
import android.hardware.biometrics.BiometricPrompt
import android.os.Build
import android.os.Bundle
import android.os.CancellationSignal
import android.os.Handler
import android.os.Looper
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyInfo
import android.security.keystore.KeyPermanentlyInvalidatedException
import android.security.keystore.KeyProperties
import android.security.keystore.UserNotAuthenticatedException
import android.util.AtomicFile
import android.util.Base64
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.common.LifecycleState
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import org.json.JSONObject
import java.io.File
import java.nio.ByteBuffer
import java.nio.charset.CodingErrorAction
import java.security.KeyFactory
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.MessageDigest
import java.security.PrivateKey
import java.security.PublicKey
import java.security.SecureRandom
import java.security.spec.MGF1ParameterSpec
import java.security.spec.X509EncodedKeySpec
import java.util.ArrayDeque
import java.util.UUID
import java.util.concurrent.Executors
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.OAEPParameterSpec
import javax.crypto.spec.PSource
import javax.crypto.spec.SecretKeySpec

class HybridOneProtectedStore : HybridOneProtectedStoreSpec(), LifecycleEventListener {
    private val owner = Any()
    private val host = NitroModules.applicationContext
    init { host?.addLifecycleEventListener(this) }
    @Volatile private var disposed = false
    override fun createItem(key: String, value: String, policy: ProtectedStorePolicy): Promise<Unit> =
        voidCall("createItem", key, value, null, policy)
    override fun getItem(key: String, reason: String, policy: ProtectedStorePolicy): Promise<String?> =
        submit("getItem", key, null, reason, policy) { it }
    override fun updateItem(key: String, value: String, reason: String, policy: ProtectedStorePolicy): Promise<Unit> =
        voidCall("updateItem", key, value, reason, policy)
    override fun deleteItem(key: String, reason: String, policy: ProtectedStorePolicy): Promise<Unit> =
        voidCall("deleteItem", key, null, reason, policy)
    private fun voidCall(operation: String, key: String, value: String?, reason: String?, policy: ProtectedStorePolicy): Promise<Unit> =
        submit(operation, key, value, reason, policy) { Unit }
    private fun <T> submit(operation: String, key: String, value: String?, reason: String?, policy: ProtectedStorePolicy, convert: (String?) -> T): Promise<T> {
        if (disposed) return Promise.rejected(OneNativeError("E_PROTECTED_STORE_CANCELLED", "ProtectedStore.$operation: native owner was disposed"))
        val context = NitroModules.applicationContext
            ?: return Promise.rejected(OneNativeError("E_PROTECTED_STORE_AUTH", "ProtectedStore.$operation: native host is unavailable"))
        return ProtectedStoreOwner.instance(context).submit(owner, operation, key, value, reason, policy, convert)
    }
    override fun dispose() {
        disposed = true
        host?.removeLifecycleEventListener(this)
        ProtectedStoreOwner.retire(owner)
        super.dispose()
    }
    override fun onHostResume() {}
    override fun onHostPause() {}
    override fun onHostDestroy() { ProtectedStoreOwner.retire(owner) }
}

// one owner across hybrid instances serializes storage and foreground prompts.
// the lock is also the retirement/commit boundary; no callback can outlive it.
internal class ProtectedStoreOwner private constructor(private val context: Context) : Application.ActivityLifecycleCallbacks {
    private val lock = Any()
    private val worker = Executors.newSingleThreadExecutor()
    private val main = Handler(Looper.getMainLooper())
    private val queue = ArrayDeque<Request>()
    private var active: Request? = null
    private class Request(
        val owner: Any, val operation: String, val key: String, var value: String?,
        val reason: String?, val policy: ProtectedStorePolicy, val resolve: (String?) -> Unit, val reject: (Exception) -> Unit,
    ) {
        val host = NitroModules.applicationContext
        var terminal = false
        var activity: Activity? = null
        var cancellation: CancellationSignal? = null
        var cipher: Cipher? = null
        var snapshot: Snapshot? = null
    }
    private data class Snapshot(val record: ByteArray?, val publicKey: ByteArray?, val aliasPresent: Boolean = true, val unfinished: ByteArray? = null)
    private data class Item(val generation: String, val policy: ProtectedStorePolicy, val wrapped: ByteArray, val iv: ByteArray, val ciphertext: ByteArray)
    init {
        (context.applicationContext as Application).registerActivityLifecycleCallbacks(this)
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                if (intent.action == Intent.ACTION_SCREEN_OFF ||
                    (intent.action == Intent.ACTION_CLOSE_SYSTEM_DIALOGS && intent.getStringExtra("reason") in listOf("homekey", "recentapps"))) {
                    cancelAll("foreground authentication was interrupted")
                }
            }
        }
        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_OFF)
            addAction(Intent.ACTION_CLOSE_SYSTEM_DIALOGS)
        }
        if (Build.VERSION.SDK_INT >= 33) context.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
        else context.registerReceiver(receiver, filter)
    }
    fun <T> submit(owner: Any, operation: String, key: String, value: String?, reason: String?, policy: ProtectedStorePolicy, convert: (String?) -> T): Promise<T> {
        val promise = Promise<T>()
        val request = Request(owner, operation, key, value, reason, policy, { promise.resolve(convert(it)) }, { promise.reject(it) })
        synchronized(lock) { queue.add(request); advance() }
        return promise
    }
    private fun advance() {
        if (active != null || queue.isEmpty()) return
        val request = queue.removeFirst()
        active = request
        main.post {
            synchronized(lock) {
                if (!live(request)) return@post
                request.activity = request.host?.currentActivity
                worker.execute { begin(request) }
            }
        }
    }
    private fun live(request: Request) = active === request && !request.terminal
    private fun fail(request: Request, error: Exception) {
        synchronized(lock) { if (live(request)) finish(request, null, mapped(request, error)) }
    }
    private fun finish(request: Request, value: String?, error: Exception? = null) {
        if (!live(request)) return
        request.terminal = true
        request.cipher = null
        request.snapshot = null
        request.value = null
        request.cancellation?.cancel()
        request.cancellation = null
        request.activity = null
        active = null
        if (error == null) request.resolve(value) else request.reject(error)
        advance()
    }
    private fun checkOwner(request: Request) {
        if (!live(request)) throw failure(request, "CANCELLED", "request is retired")
        if (context.getSystemService(KeyguardManager::class.java).isDeviceLocked) {
            throw failure(request, "AUTH", "device is locked")
        }
        val activity = request.activity
        if (activity == null || activity.isDestroyed || activity.isFinishing ||
            request.host !== NitroModules.applicationContext || request.host?.currentActivity !== activity) {
            throw failure(request, "CANCELLED", "foreground owner was destroyed")
        }
        if (request.cancellation == null && request.host?.lifecycleState != LifecycleState.RESUMED) {
            throw failure(request, "CANCELLED", "authentication requires a foreground host")
        }
    }
    private fun begin(request: Request) {
        try {
            synchronized(lock) {
                if (!live(request)) return
                validate(request)
                val missing = !recordExists(request) && !keyStore().containsAlias(alias(request))
                if (request.operation != "createItem" && missing) {
                    if (request.operation == "updateItem") throw failure(request, "NOT_FOUND", "key is missing")
                    finish(request, null)
                    return
                }
                checkOwner(request)
                val snapshot = snapshot(request)
                request.snapshot = snapshot
                if (request.operation == "createItem") {
                    if (!missing) throw failure(request, "EXISTS", "key already exists")
                    create(request)
                    finish(request, null)
                    return
                }
                requirePolicy(request, snapshot)
                if (request.operation != "deleteItem") {
                    val item = readItem(request, snapshot)
                    val cipher = Cipher.getInstance(RSA)
                    cipher.init(Cipher.DECRYPT_MODE, privateKey(request), OAEP)
                    request.cipher = cipher
                    require(item.wrapped.size == 256)
                }
                main.post { present(request) }
            }
        } catch (error: Exception) { fail(request, error) }
    }
    private fun validate(request: Request) {
        if (Build.VERSION.SDK_INT < 30) throw OneNativeError("ProtectedStore.${request.operation} needs an iOS or Android build")
        if (context.checkSelfPermission(Manifest.permission.USE_BIOMETRIC) != PackageManager.PERMISSION_GRANTED) {
            throw failure(request, "MANIFEST", "declare android.permission.USE_BIOMETRIC")
        }
        if (request.key.isBlank() || (request.reason != null && request.reason.isBlank())) {
            throw failure(request, "INPUT", "key and authentication reason are required")
        }
    }
    private fun authenticationTypes(policy: ProtectedStorePolicy) =
        if (policy == ProtectedStorePolicy.BIOMETRYCURRENTSET) KeyProperties.AUTH_BIOMETRIC_STRONG
        else KeyProperties.AUTH_BIOMETRIC_STRONG or KeyProperties.AUTH_DEVICE_CREDENTIAL
    private fun promptTypes(policy: ProtectedStorePolicy) =
        if (policy == ProtectedStorePolicy.BIOMETRYCURRENTSET) BiometricManager.Authenticators.BIOMETRIC_STRONG
        else BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.DEVICE_CREDENTIAL
    private fun present(request: Request) {
        try {
            synchronized(lock) {
                if (!live(request)) return
                checkOwner(request)
                checkGeneration(request)
                if (context.getSystemService(BiometricManager::class.java).canAuthenticate(promptTypes(request.policy)) != BiometricManager.BIOMETRIC_SUCCESS) {
                    throw failure(request, "AUTH", "matching authentication is unavailable")
                }
                val cancellation = CancellationSignal()
                request.cancellation = cancellation
                val builder = BiometricPrompt.Builder(request.activity!!)
                    .setTitle(request.reason!!).setAllowedAuthenticators(promptTypes(request.policy))
                if (request.policy == ProtectedStorePolicy.BIOMETRYCURRENTSET) {
                    builder.setNegativeButton("Cancel", context.mainExecutor) { _, _ ->
                        fail(request, failure(request, "CANCELLED", "authentication was canceled"))
                    }
                }
                val callback = object : BiometricPrompt.AuthenticationCallback() {
                    override fun onAuthenticationError(code: Int, message: CharSequence) {
                        val family = if (code == BiometricPrompt.BIOMETRIC_ERROR_CANCELED ||
                            code == BiometricPrompt.BIOMETRIC_ERROR_USER_CANCELED) "CANCELLED" else "AUTH"
                        fail(request, failure(request, family, message.toString()))
                    }
                    override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                        Class.forName("dev.vxrn.nativefeatures.tests.ControlReceiver")
                            .getDeclaredMethod("capture", Any::class.java, Any::class.java, BiometricPrompt.AuthenticationResult::class.java)
                            .invoke(null, this@ProtectedStoreOwner, request, result)
                        if (File(context.cacheDir, "protected-retire-success").exists()) {
                            retireOwner(request.owner)
                            android.util.Log.i("ProtectedControl", "retired-before-success")
                        }
                        worker.execute { authenticated(request, result) }
                    }
                }
                val cipher = request.cipher
                if (cipher == null) builder.build().authenticate(cancellation, context.mainExecutor, callback)
                else builder.build().authenticate(BiometricPrompt.CryptoObject(cipher), cancellation, context.mainExecutor, callback)
            }
        } catch (error: Exception) { fail(request, error) }
    }
    private fun authenticated(request: Request, result: BiometricPrompt.AuthenticationResult) {
        try {
            synchronized(lock) {
                if (!live(request)) return
                checkOwner(request)
                checkGeneration(request)
                requirePolicy(request, request.snapshot!!)
                val authenticationType = result.authenticationType
                if (authenticationType != BiometricPrompt.AUTHENTICATION_RESULT_TYPE_BIOMETRIC &&
                    (request.policy != ProtectedStorePolicy.USERPRESENCE || authenticationType != BiometricPrompt.AUTHENTICATION_RESULT_TYPE_DEVICE_CREDENTIAL)) {
                    throw failure(request, "AUTH", "authentication did not match the item policy")
                }
                if (request.operation == "deleteItem") {
                    // record first: interrupted deletion leaves an authenticated removable orphan.
                    record(request).delete()
                    if (recordExists(request)) throw failure(request, "WRITE", "record deletion failed")
                    keyStore().deleteEntry(alias(request))
                    if (keyStore().containsAlias(alias(request))) throw failure(request, "WRITE", "key deletion failed")
                    finish(request, null)
                    return
                }
                val cipher = request.cipher ?: throw failure(request, "AUTH", "private operation is missing")
                if (result.cryptoObject?.cipher !== cipher) throw failure(request, "AUTH", "authentication returned another private operation")
                val item = readItem(request, request.snapshot!!)
                android.util.Log.i("ProtectedControl", "same-cipher=true; operation=${request.operation}")
                val dataKey = cipher.doFinal(item.wrapped)
                try {
                    cipher.doFinal(item.wrapped)
                    throw AssertionError("consumed private cipher reused authentication")
                } catch (expected: java.security.GeneralSecurityException) {
                    android.util.Log.i("ProtectedControl", "consumed-cipher-rejected=${expected.javaClass.simpleName}")
                }
                try {
                    val fresh = Cipher.getInstance(RSA)
                    fresh.init(Cipher.DECRYPT_MODE, privateKey(request), OAEP)
                    fresh.doFinal(item.wrapped)
                    throw AssertionError("fresh private cipher reused authentication")
                } catch (expected: java.security.GeneralSecurityException) {
                    android.util.Log.i("ProtectedControl", "fresh-cipher-rejected=${expected.javaClass.simpleName}")
                }
                val plaintext: ByteArray
                try {
                    require(dataKey.size == 32)
                    val aes = Cipher.getInstance("AES/GCM/NoPadding")
                    aes.init(Cipher.DECRYPT_MODE, SecretKeySpec(dataKey, "AES"), GCMParameterSpec(128, item.iv))
                    aes.updateAAD(aad(request, item.generation))
                    plaintext = aes.doFinal(item.ciphertext)
                } finally { dataKey.fill(0) }
                try {
                    val value = Charsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT)
                        .onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(plaintext)).toString()
                    if (request.operation == "getItem") finish(request, value)
                    else {
                        val replacement = encrypt(request, item.generation, publicKey(request.snapshot!!))
                        checkOwner(request)
                        checkGeneration(request)
                        write(request, replacement)
                        finish(request, null)
                    }
                } finally { plaintext.fill(0) }
            }
        } catch (error: Exception) { fail(request, error) }
    }
    private fun create(request: Request) {
        if (context.getSystemService(BiometricManager::class.java).canAuthenticate(promptTypes(request.policy)) != BiometricManager.BIOMETRIC_SUCCESS) {
            throw failure(request, "AUTH", "matching authentication is unavailable")
        }
        val generator = KeyPairGenerator.getInstance("RSA", "AndroidKeyStore")
        generator.initialize(KeyGenParameterSpec.Builder(alias(request), KeyProperties.PURPOSE_DECRYPT)
            .setKeySize(2048).setDigests(KeyProperties.DIGEST_SHA256)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_RSA_OAEP)
            .setUserAuthenticationRequired(true).setUserAuthenticationParameters(0, authenticationTypes(request.policy))
            .setInvalidatedByBiometricEnrollment(request.policy == ProtectedStorePolicy.BIOMETRYCURRENTSET)
            .setUnlockedDeviceRequired(true).build())
        val pair = generator.generateKeyPair()
        if (File(context.cacheDir, "protected-keygen-death").exists()) {
            android.os.Process.killProcess(android.os.Process.myPid())
            throw AssertionError("keygen crash boundary did not terminate")
        }
        // death here leaves the alias occupied until explicit authenticated deletion.
        try {
            requirePolicy(request, Snapshot(null, pair.public.encoded))
            val generation = UUID.randomUUID().toString()
            val encoded = encrypt(request, generation, KeyFactory.getInstance("RSA").generatePublic(X509EncodedKeySpec(pair.public.encoded)))
            checkOwner(request)
            write(request, encoded)
        } catch (error: Exception) {
            // only this synchronous failed create owns this uncommitted alias.
            if (!recordExists(request)) keyStore().deleteEntry(alias(request))
            throw error
        }
    }
    private fun encrypt(request: Request, generation: String, publicKey: PublicKey): ByteArray {
        val dataKey = ByteArray(32).also { SecureRandom().nextBytes(it) }
        val plaintext = request.value!!.toByteArray(Charsets.UTF_8)
        try {
            val aes = Cipher.getInstance("AES/GCM/NoPadding")
            aes.init(Cipher.ENCRYPT_MODE, SecretKeySpec(dataKey, "AES"))
            aes.updateAAD(aad(request, generation))
            val ciphertext = aes.doFinal(plaintext)
            val rsa = Cipher.getInstance(RSA)
            rsa.init(Cipher.ENCRYPT_MODE, publicKey, OAEP)
            return JSONObject().put("version", 1).put("identity", identity(request))
                .put("generation", generation).put("policy", request.policy.toString())
                .put("publicKey", encode(publicKey.encoded)).put("wrapped", encode(rsa.doFinal(dataKey)))
                .put("iv", encode(aes.iv)).put("ciphertext", encode(ciphertext))
                .toString().toByteArray(Charsets.UTF_8)
        } finally { dataKey.fill(0); plaintext.fill(0) }
    }
    private fun readItem(request: Request, snapshot: Snapshot): Item {
        val bytes = snapshot.record ?: throw failure(request, "AUTH", "item creation is incomplete")
        val json = JSONObject(bytes.toString(Charsets.UTF_8))
        require(json.getInt("version") == 1 && json.getString("identity") == identity(request))
        require(decode(json.getString("publicKey")).contentEquals(snapshot.publicKey))
        val generation = json.getString("generation")
        require(UUID.fromString(generation).toString() == generation)
        val policy = ProtectedStorePolicy.valueOf(json.getString("policy"))
        if (policy != request.policy) throw failure(request, "POLICY", "policy does not match the item")
        val iv = decode(json.getString("iv"))
        val wrapped = decode(json.getString("wrapped"))
        val ciphertext = decode(json.getString("ciphertext"))
        require(iv.size == 12 && wrapped.size == 256 && ciphertext.size >= 16)
        return Item(generation, policy, wrapped, iv, ciphertext)
    }
    private fun requirePolicy(request: Request, snapshot: Snapshot) {
        if (snapshot.publicKey == null) throw failure(request, "AUTH", "item key is missing")
        val info = KeyFactory.getInstance("RSA", "AndroidKeyStore").getKeySpec(privateKey(request), KeyInfo::class.java)
        if (!info.isUserAuthenticationRequired || info.userAuthenticationValidityDurationSeconds != 0 ||
            info.userAuthenticationType != authenticationTypes(request.policy) ||
            info.isInvalidatedByBiometricEnrollment != (request.policy == ProtectedStorePolicy.BIOMETRYCURRENTSET)) {
            throw failure(request, "POLICY", "policy does not match the immutable key")
        }
        require(info.keySize == 2048 && info.purposes == KeyProperties.PURPOSE_DECRYPT)
        require(info.digests.toSet() == setOf(KeyProperties.DIGEST_SHA256))
        require(info.encryptionPaddings.toSet() == setOf(KeyProperties.ENCRYPTION_PADDING_RSA_OAEP))
        require(!info.isUserAuthenticationValidWhileOnBody)
        if (snapshot.record != null) readItem(request, snapshot)
    }
    private fun aad(request: Request, generation: String) =
        "One.ProtectedStore:1:${identity(request)}:$generation:${request.policy}".toByteArray(Charsets.UTF_8)
    private fun identity(request: Request) = MessageDigest.getInstance("SHA-256")
        .digest(request.key.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }
    private fun alias(request: Request) = "One.ProtectedStore.${identity(request)}"
    private fun record(request: Request): AtomicFile {
        val directory = File(context.noBackupFilesDir, "One.ProtectedStore")
        return AtomicFile(File(directory, "${identity(request)}.json"))
    }
    private fun recordExists(request: Request): Boolean {
        val file = record(request).baseFile
        return file.exists() || File(file.path + ".bak").exists() || File(file.path + ".new").exists()
    }
    private fun keyStore() = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    private fun privateKey(request: Request) = keyStore().getKey(alias(request), null) as? PrivateKey
        ?: throw failure(request, "AUTH", "item key is unavailable")
    private fun publicKey(snapshot: Snapshot) = KeyFactory.getInstance("RSA").generatePublic(X509EncodedKeySpec(snapshot.publicKey!!))
    private fun snapshot(request: Request): Snapshot {
        val file = record(request)
        val committed = file.baseFile.exists() || File(file.baseFile.path + ".bak").exists()
        val bytes = if (committed) file.readFully() else null
        val unfinishedFile = File(file.baseFile.path + ".new")
        val unfinished = if (unfinishedFile.exists()) unfinishedFile.readBytes() else null
        val store = keyStore()
        return Snapshot(bytes, store.getCertificate(alias(request))?.publicKey?.encoded, store.containsAlias(alias(request)), unfinished)
    }
    private fun checkGeneration(request: Request) {
        val expected = request.snapshot ?: throw failure(request, "CANCELLED", "item owner is missing")
        val actual = snapshot(request)
        if (!same(expected.record, actual.record) || !same(expected.publicKey, actual.publicKey) ||
            expected.aliasPresent != actual.aliasPresent || !same(expected.unfinished, actual.unfinished)) {
            throw failure(request, "CANCELLED", "item generation changed")
        }
    }
    private fun same(a: ByteArray?, b: ByteArray?) = if (a == null || b == null) a == null && b == null else a.contentEquals(b)
    private fun write(request: Request, bytes: ByteArray) {
        val file = record(request)
        check(file.baseFile.parentFile!!.isDirectory || file.baseFile.parentFile!!.mkdirs())
        val stream = file.startWrite()
        try { stream.write(bytes)
            if (File(context.cacheDir, "protected-write-failure").exists()) throw java.io.IOException("injected before atomic commit")
            stream.fd.sync(); file.finishWrite(stream) }
        catch (error: Exception) { file.failWrite(stream); throw error }
        check(file.readFully().contentEquals(bytes))
    }
    private fun encode(bytes: ByteArray) = Base64.encodeToString(bytes, Base64.NO_WRAP)
    private fun decode(value: String) = Base64.decode(value, Base64.NO_WRAP)
    private fun failure(request: Request, code: String, detail: String) =
        OneNativeError("E_PROTECTED_STORE_$code", "ProtectedStore.${request.operation}: $detail")
    private fun mapped(request: Request, error: Exception): Exception = when (error) {
        is OneNativeError -> error
        is KeyPermanentlyInvalidatedException, is UserNotAuthenticatedException -> failure(request, "AUTH", "${error.javaClass.simpleName}: ${error.message}")
        else -> failure(request, if (request.operation == "getItem") "GET" else "WRITE", "${error.javaClass.simpleName}: ${error.message}")
    }
    private fun cancelAll(detail: String) = synchronized(lock) {
        // drain queued calls before retiring the active call, which starts the next owner.
        while (queue.isNotEmpty()) {
            val request = queue.removeFirst()
            request.terminal = true
            request.value = null
            request.reject(failure(request, "CANCELLED", detail))
        }
        active?.let { fail(it, failure(it, "CANCELLED", detail)) }
    }
    private fun retireOwner(owner: Any) = synchronized(lock) {
        val iterator = queue.iterator()
        while (iterator.hasNext()) {
            val request = iterator.next()
            if (request.owner === owner) {
                iterator.remove()
                request.terminal = true
                request.value = null
                request.reject(failure(request, "CANCELLED", "native owner was disposed"))
            }
        }
        active?.takeIf { it.owner === owner }?.let { fail(it, failure(it, "CANCELLED", "native owner was disposed")) }
    }
    override fun onActivityDestroyed(activity: Activity) {
        synchronized(lock) {
            active?.takeIf { it.activity === activity }?.let { fail(it, failure(it, "CANCELLED", "activity was destroyed")) }
        }
    }
    override fun onActivityResumed(activity: Activity) {
        synchronized(lock) {
            active?.takeIf { it.activity != null && it.activity !== activity }?.let { fail(it, failure(it, "CANCELLED", "foreground owner changed")) }
        }
    }
    // a credential sheet pauses/stops the host. the prompt and system foreground
    // interruption retire requests; destruction/disposal independently cancel them.
    override fun onActivityPaused(activity: Activity) {}
    override fun onActivityStopped(activity: Activity) {}
    override fun onActivityCreated(activity: Activity, state: Bundle?) {}
    override fun onActivityStarted(activity: Activity) {}
    override fun onActivitySaveInstanceState(activity: Activity, state: Bundle) {}
    companion object {
        private const val RSA = "RSA/ECB/OAEPWithSHA-256AndMGF1Padding"
        private val OAEP = OAEPParameterSpec("SHA-256", "MGF1", MGF1ParameterSpec.SHA1, PSource.PSpecified.DEFAULT)
        private var singleton: ProtectedStoreOwner? = null
        @Synchronized fun instance(context: Context): ProtectedStoreOwner = singleton
            ?: ProtectedStoreOwner(context.applicationContext).also { singleton = it }
        @Synchronized fun retire(owner: Any) { singleton?.retireOwner(owner) }
    }
}
