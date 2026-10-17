package com.margelo.nitro.one

import android.app.Activity
import android.os.Build
import android.view.View
import android.view.ViewTreeObserver
import com.facebook.react.bridge.ReactMarker
import com.facebook.react.bridge.ReactMarkerConstants
import java.lang.ref.WeakReference
import java.util.concurrent.atomic.AtomicBoolean

// the prebuilt MainActivity calls this right after super.onCreate. the
// activity's content skips drawing until react native's root view logs its
// first content, which is android's documented way to keep the splash on
// screen: the android 12+ system splash, or the launch theme's window
// background below that, never gives way to an empty root.
// One.LaunchScreen's preventAutoHide keeps it past the first content until
// hide().
// an app that holds the launch screen draws One.LaunchScreen.Cover under the
// system splash, so on android 12+ preventAutoHide also takes over the
// splash's exit: it lifts at once, or fades, instead of playing the system's
// own animation, and the cover below it shows no change.
object OneLaunchScreen {
    private const val FADE_MS = 250L
    private val preventAutoHide = AtomicBoolean(false)
    private val released = AtomicBoolean(false)
    private val fadeExit = AtomicBoolean(false)
    @Volatile private var heldContent: View? = null
    @Volatile private var hostActivity: WeakReference<Activity>? = null

    @JvmStatic
    fun preventAutoHide() {
        preventAutoHide.set(true)
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return
        val activity = hostActivity?.get() ?: return
        // the hold keeps the content from drawing, so the listener lands
        // before the system splash's exit starts.
        activity.runOnUiThread {
            activity.splashScreen.setOnExitAnimationListener { splash ->
                if (fadeExit.get()) {
                    splash.view.animate().alpha(0f).setDuration(FADE_MS)
                        .withEndAction { splash.remove() }.start()
                } else {
                    splash.remove()
                }
            }
        }
    }

    @JvmStatic
    fun hide(fade: Boolean) {
        fadeExit.set(fade)
        released.set(true)
        heldContent?.let { content -> content.post { content.invalidate() } }
    }

    @JvmStatic
    fun hold(activity: Activity) {
        val content = activity.findViewById<View>(android.R.id.content)
        heldContent = content
        hostActivity = WeakReference(activity)
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
