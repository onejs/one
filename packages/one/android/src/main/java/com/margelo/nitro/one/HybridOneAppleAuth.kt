package com.margelo.nitro.one

import com.margelo.nitro.core.Promise

// android has no native sign in with apple, so it answers the way the web entry
// does: unavailable, and every request rejects without a code.
class HybridOneAppleAuth : HybridOneAppleAuthSpec() {
    override fun isAvailable(): Boolean {
        return false
    }

    override fun signIn(options: AppleAuthSignInOptions): Promise<AppleAuthResult> {
        return Promise.rejected(Exception("Auth.Apple.signIn needs an iOS build"))
    }

    override fun getCredentialState(user: String): Promise<AppleCredentialState> {
        return Promise.rejected(Exception("Auth.Apple.getCredentialState needs an iOS build"))
    }
}
