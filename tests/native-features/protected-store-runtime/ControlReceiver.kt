package dev.vxrn.nativefeatures.tests

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.hardware.biometrics.BiometricPrompt
import android.util.Log
import java.security.KeyFactory
import java.security.KeyStore
import android.security.keystore.KeyInfo
import org.json.JSONObject

// included only in the generated proof host. production has no control receiver.
class ControlReceiver : BroadcastReceiver() {
    private fun field(value: Any, name: String): Any? = value.javaClass.getDeclaredField(name).apply { isAccessible = true }.get(value)
    override fun onReceive(context: Context, intent: Intent) {
        try {
            val cls = Class.forName("com.margelo.nitro.one.ProtectedStoreOwner")
            val engine = cls.getDeclaredField("singleton").apply { isAccessible = true }.get(null) ?: error("owner absent")
            val request = field(engine, "active")
            val operation = intent.getStringExtra("control")!!
            when (operation) {
                "inspect" -> {
                    val info = JSONObject().put("active", request != null)
                    if (request != null) {
                        info.put("operation", field(request, "operation")).put("key", field(request, "key"))
                            .put("terminal", field(request, "terminal")).put("cipher", field(request, "cipher")?.javaClass?.name)
                    }
                    info.put("queued", (field(engine, "queue") as java.util.ArrayDeque<*>).size)
                    Log.i("ProtectedControl", info.toString())
                }
                "destroy" -> {
                    check(request != null)
                    val activity = field(request, "activity") as android.app.Activity
                    savedRequest = request
                    savedEngine = engine
                    val cipher = field(request, "cipher") as? javax.crypto.Cipher
                    savedCipher = cipher
                    cls.getDeclaredMethod("onActivityDestroyed", android.app.Activity::class.java).invoke(engine, activity)
                    Log.i("ProtectedControl", "destroyed")
                }
                "stale" -> {
                    val retired = savedRequest ?: error("no retired request")
                    val result = savedResult ?: error("no captured SDK success")
                    cls.getDeclaredMethod("authenticated", retired.javaClass, BiometricPrompt.AuthenticationResult::class.java)
                        .apply { isAccessible = true }.invoke(savedEngine, retired, result)
                    Log.i("ProtectedControl", "stale-success-delivered")
                }
                "keyinfo" -> {
                    val alias = intent.getStringExtra("alias")!!
                    val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
                    val key = store.getKey(alias, null)
                    val info = KeyFactory.getInstance("RSA", "AndroidKeyStore").getKeySpec(key, KeyInfo::class.java)
                    Log.i("ProtectedControl", JSONObject().put("alias", alias).put("required", info.isUserAuthenticationRequired)
                        .put("timeout", info.userAuthenticationValidityDurationSeconds).put("types", info.userAuthenticationType)
                        .put("invalidatedByEnrollment", info.isInvalidatedByBiometricEnrollment).put("unlocked", info.isUnlockedDeviceRequired)
                        .put("securityLevel", info.securityLevel).put("publicKey", android.util.Base64.encodeToString(store.getCertificate(alias).publicKey.encoded, 2)).toString())
                }
            }
        } catch (error: Throwable) { Log.e("ProtectedControl", "control failed", error) }
    }
    companion object {
        private var savedRequest: Any? = null
        private var savedEngine: Any? = null
        private var savedCipher: javax.crypto.Cipher? = null
        private var savedResult: BiometricPrompt.AuthenticationResult? = null
        @JvmStatic fun capture(engine: Any, request: Any, result: BiometricPrompt.AuthenticationResult) {
            savedEngine = engine
            savedRequest = request
            savedResult = result
        }
    }
}
