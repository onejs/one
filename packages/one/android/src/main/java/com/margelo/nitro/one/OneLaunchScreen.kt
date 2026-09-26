package com.margelo.nitro.one

import android.app.Activity
import android.view.View
import android.view.ViewTreeObserver
import com.facebook.react.bridge.ReactMarker
import com.facebook.react.bridge.ReactMarkerConstants

// the prebuilt MainActivity calls this right after super.onCreate. the
// activity's content skips drawing until react native's root view logs its
// first content, which is android's documented way to keep the splash on
// screen: the android 12+ system splash, or the launch theme's window
// background below that, never gives way to an empty root.
object OneLaunchScreen {
    @JvmStatic
    fun hold(activity: Activity) {
        val content = activity.findViewById<View>(android.R.id.content)
        var appeared = false
        lateinit var marker: ReactMarker.MarkerListener
        marker = ReactMarker.MarkerListener { name, _, _ ->
            if (name != ReactMarkerConstants.CONTENT_APPEARED) return@MarkerListener
            // markers can log off the main thread; the flag and the redraw
            // both land on it.
            content.post {
                ReactMarker.removeListener(marker)
                appeared = true
                content.invalidate()
            }
        }
        ReactMarker.addListener(marker)
        content.viewTreeObserver.addOnPreDrawListener(
            object : ViewTreeObserver.OnPreDrawListener {
                override fun onPreDraw(): Boolean {
                    if (!appeared) return false
                    content.viewTreeObserver.removeOnPreDrawListener(this)
                    return true
                }
            }
        )
    }
}
