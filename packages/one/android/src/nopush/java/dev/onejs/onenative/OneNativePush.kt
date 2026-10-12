package dev.onejs.onenative

import android.content.Context

// fcm token fetch, nopush flavor: the same object as the push flavor, so
// the module is unchanged whichever source set compiled. without
// native.app.notifications.push nothing here references firebase, which is
// what keeps it out of the apk.
object OneNativePush {
    fun getToken(
        context: Context,
        onResult: (String?) -> Unit,
        onError: (Exception) -> Unit
    ) {
        onError(
            IllegalStateException(
                "push is not enabled: set native.app.notifications.push to fetch a push token"
            )
        )
    }
}
