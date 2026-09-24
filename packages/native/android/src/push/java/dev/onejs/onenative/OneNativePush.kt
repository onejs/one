package dev.onejs.onenative

import android.content.Context
import com.google.firebase.messaging.FirebaseMessaging

// fcm token fetch, push flavor: compiled only when the app sets
// native.app.notifications.push. the nopush source set defines the same
// object with a rejecting fetch, so firebase stays out of apps that do not
// enable push.
object OneNativePush {
    fun getToken(
        context: Context,
        onResult: (String?) -> Unit,
        onError: (Exception) -> Unit
    ) {
        try {
            FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    onResult(task.result)
                } else {
                    onError(
                        task.exception
                            ?: IllegalStateException("fetching the push token failed")
                    )
                }
            }
        } catch (error: Exception) {
            // firebaseapp missing (no google-services config): report, never
            // throw across the bridge.
            onError(error)
        }
    }
}
