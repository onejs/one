package com.margelo.nitro.one

import com.google.android.play.core.review.ReviewManagerFactory
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise

// Google Play In-App Review, the Android half of One.StoreReview and the
// same shape as Expo's Android implementation: request a ReviewInfo, then
// launch the review flow from the current activity. Play decides whether
// any UI appears (quota, Play availability); the promise resolves when the
// flow completes and rejects with E_STORE_REVIEW_FAILED when Play reports
// failure, matching Expo's ERR_STORE_REVIEW_FAILED. callbacks arrive on
// the Play task thread, so the promise is the only cross-thread handoff.
class HybridOneStoreReview : HybridOneStoreReviewSpec() {
    override fun requestReview(): Promise<Unit> {
        val promise = Promise<Unit>()
        val activity = NitroModules.applicationContext?.currentActivity
        if (activity == null) {
            promise.reject(
                OneNativeError(
                    "E_STORE_REVIEW_FAILED",
                    "StoreReview.requestReview: found no activity to present from"
                )
            )
            return promise
        }
        try {
            val manager = ReviewManagerFactory.create(activity)
            manager.requestReviewFlow().addOnCompleteListener { task ->
                val info = if (task.isSuccessful) task.result else null
                if (info == null) {
                    promise.reject(
                        OneNativeError(
                            "E_STORE_REVIEW_FAILED",
                            "StoreReview.requestReview: the Play review request failed"
                        )
                    )
                    return@addOnCompleteListener
                }
                manager.launchReviewFlow(activity, info).addOnCompleteListener { flow ->
                    if (flow.isSuccessful) {
                        promise.resolve(Unit)
                    } else {
                        promise.reject(
                            OneNativeError(
                                "E_STORE_REVIEW_FAILED",
                                "StoreReview.requestReview: the Play review flow failed"
                            )
                        )
                    }
                }
            }
        } catch (e: Exception) {
            promise.reject(
                OneNativeError(
                    "E_STORE_REVIEW_FAILED",
                    "StoreReview.requestReview: ${e.message ?: "the Play review request failed"}"
                )
            )
        }
        return promise
    }
}
