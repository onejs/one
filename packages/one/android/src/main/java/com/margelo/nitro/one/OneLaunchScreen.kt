package com.margelo.nitro.one

import android.app.Activity
import android.view.View
import android.view.ViewTreeObserver
import com.facebook.react.bridge.ReactMarker
import com.facebook.react.bridge.ReactMarkerConstants
import java.util.concurrent.atomic.AtomicBoolean

// the prebuilt MainActivity calls this right after super.onCreate. the
// activity's content skips drawing until react native's root view logs its
// first content, which is android's documented way to keep the splash on
// screen: the android 12+ system splash, or the launch theme's window
// background below that, never gives way to an empty root.
// One.LaunchScreen's preventAutoHide keeps it past the first content until
// hide().
object OneLaunchScreen {
    private val preventAutoHide = AtomicBoolean(false)
    private val released = AtomicBoolean(false)
    @Volatile private var heldContent: View? = null

    @JvmStatic
    fun preventAutoHide() {
        preventAutoHide.set(true)
    }

    @JvmStatic
    fun hide() {
        released.set(true)
        heldContent?.let { content -> content.post { content.invalidate() } }
    }

    @JvmStatic
    fun hold(activity: Activity) {
        val content = activity.findViewById<View>(android.R.id.content)
        heldContent = content
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
                    if (!released.get() && (!appeared || preventAutoHide.get())) return false
                    content.viewTreeObserver.removeOnPreDrawListener(this)
                    heldContent = null
                    return true
                }
            }
        )
    }
}
