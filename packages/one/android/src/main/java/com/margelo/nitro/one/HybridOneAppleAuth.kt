package com.margelo.nitro.one

import com.margelo.nitro.core.Promise

// android has no native sign in with apple: absence is explicit in the api,
// never a web fallback.
class HybridOneAppleAuth : HybridOneAppleAuthSpec() {
    override fun isAvailable(): Boolean {
        return false
    }

    override fun signIn(options: AppleAuthSignInOptions): Promise<AppleAuthCredential> {
        return Promise.rejected(
            OneNativeError(
                "ERR_REQUEST_FAILED",
                "Sign in with Apple is not supported on Android."
            )
        )
    }

    override fun getCredentialState(user: String): Promise<Double> {
        return Promise.rejected(
            OneNativeError(
                "ERR_REQUEST_FAILED",
                "Sign in with Apple is not supported on Android."
            )
        )
    }
}
