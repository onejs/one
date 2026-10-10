package com.margelo.nitro.one

import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise

// biometrics-only authentication matching the ios contract: availability
// plus the enrolled kind, and evaluation where success resolves true and
// any cancellation resolves false. the kind is reported only when exactly
// one of fingerprint/face hardware is present and enrolled; zero or
// ambiguous kinds report none. no manifest code exists on android
// (USE_BIOMETRIC is a normal library-manifest permission).
class HybridOneLocalAuthentication : HybridOneLocalAuthenticationSpec() {
    private val mainHandler = Handler(Looper.getMainLooper())

    override fun canEvaluatePolicy(): LocalAuthenticationStatus {
        val context = NitroModules.applicationContext
        if (context == null) {
            return LocalAuthenticationStatus(
                available = false,
                biometryType = LocalBiometryType.NONE,
                errorCode = BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE.toDouble()
            )
        }
        val code = BiometricManager.from(context)
            .canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)
        if (code != BiometricManager.BIOMETRIC_SUCCESS) {
            return LocalAuthenticationStatus(
                available = false,
                biometryType = LocalBiometryType.NONE,
                errorCode = code.toDouble()
            )
        }
        val manager = context.packageManager
        val fingerprint = manager.hasSystemFeature(PackageManager.FEATURE_FINGERPRINT)
        val face = manager.hasSystemFeature(PackageManager.FEATURE_FACE)
        val type = if (fingerprint && !face) {
            LocalBiometryType.TOUCHID
        } else if (face && !fingerprint) {
            LocalBiometryType.FACEID
        } else {
            LocalBiometryType.NONE
        }
        return LocalAuthenticationStatus(available = true, biometryType = type, errorCode = null)
    }

    override fun evaluatePolicy(reason: String): Promise<Boolean> {
        val promise = Promise<Boolean>()
        if (reason.isBlank()) {
            promise.reject(
                OneNativeError("E_LOCAL_AUTH_REASON", "LocalAuthentication.evaluatePolicy: reason is required")
            )
            return promise
        }
        mainHandler.post {
            val activity = NitroModules.applicationContext?.currentActivity as? FragmentActivity
            if (activity == null || activity.isFinishing || activity.isDestroyed) {
                promise.reject(
                    OneNativeError(
                        "E_LOCAL_AUTH_FAILED",
                        "LocalAuthentication.evaluatePolicy: no fragment activity to present the prompt"
                    )
                )
                return@post
            }
            val info = BiometricPrompt.PromptInfo.Builder()
                .setTitle(reason)
                .setNegativeButtonText("Cancel")
                .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
                .build()
            val prompt = BiometricPrompt(
                activity,
                ContextCompat.getMainExecutor(activity),
                object : BiometricPrompt.AuthenticationCallback() {
                    override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                        promise.resolve(true)
                    }

                    override fun onAuthenticationError(code: Int, message: CharSequence) {
                        when (code) {
                            BiometricPrompt.ERROR_USER_CANCELED,
                            BiometricPrompt.ERROR_CANCELED,
                            BiometricPrompt.ERROR_NEGATIVE_BUTTON -> promise.resolve(false)
                            BiometricPrompt.ERROR_LOCKOUT,
                            BiometricPrompt.ERROR_LOCKOUT_PERMANENT ->
                                promise.reject(authError("E_LOCAL_AUTH_LOCKOUT", message))
                            BiometricPrompt.ERROR_NO_BIOMETRICS ->
                                promise.reject(authError("E_LOCAL_AUTH_NOT_ENROLLED", message))
                            BiometricPrompt.ERROR_NO_DEVICE_CREDENTIAL ->
                                promise.reject(authError("E_LOCAL_AUTH_PASSCODE_NOT_SET", message))
                            else -> promise.reject(authError("E_LOCAL_AUTH_FAILED", message))
                        }
                    }

                    override fun onAuthenticationFailed() {
                        // a bad read is not terminal; the prompt stays up
                        // until success, cancel, or lockout.
                    }
                }
            )
            try {
                prompt.authenticate(info)
            } catch (e: Exception) {
                promise.reject(authError("E_LOCAL_AUTH_FAILED", e.message ?: "authentication failed"))
            }
        }
        return promise
    }

    private fun authError(code: String, detail: CharSequence): OneNativeError {
        val message = if (detail.isEmpty()) "authentication failed" else detail.toString()
        return OneNativeError(code, "LocalAuthentication.evaluatePolicy: $message")
    }
}
