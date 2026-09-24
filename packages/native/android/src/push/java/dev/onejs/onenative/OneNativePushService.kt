package dev.onejs.onenative

import com.google.firebase.messaging.FirebaseMessagingService

// token refresh entry, push flavor only: prebuild declares this service in
// the app manifest only when native.app.notifications.push is set, so apps
// without push never start it.
class OneNativePushService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        OneNativeNotificationsModule.onPushTokenRefresh(token)
    }
}
