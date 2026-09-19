package dev.onejs.onenative

import android.content.Context
import android.os.Build
import android.view.WindowInsets
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.views.view.ReactViewGroup

// first-party safe-area provider view. reports the window insets overlapping
// this view plus its frame to React, the Android half of upstream
// RNCSafeAreaProvider: system bars and the display cutout feed one deduped
// publisher, layout changes re-emit for the frame, zero-size frames and
// unchanged values never emit. the keyboard is excluded on purpose, matching
// UIKit safeAreaInsets. framework APIs only, so no new dependency.
class OneNativeSafeAreaProviderView(context: Context) : ReactViewGroup(context) {
    private var lastInsets = intArrayOf(0, 0, 0, 0)
    private var lastFrame = doubleArrayOf(0.0, 0.0, 0.0, 0.0)
    private var initialInsetsSent = false

    init {
        setOnApplyWindowInsetsListener { _, insets ->
            publish(readSystemInsets(insets))
            insets
        }
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        requestApplyInsets()
    }

    override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
        super.onLayout(changed, left, top, right, bottom)
        publish(lastInsets)
    }

    private fun readSystemInsets(insets: WindowInsets): IntArray {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val types = WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout()
            val bars = insets.getInsets(types)
            intArrayOf(bars.top, bars.right, bars.bottom, bars.left)
        } else {
            @Suppress("DEPRECATION")
            intArrayOf(
                insets.systemWindowInsetTop,
                insets.systemWindowInsetRight,
                insets.systemWindowInsetBottom,
                insets.systemWindowInsetLeft
            )
        }
    }

    private fun publish(insets: IntArray) {
        if (width == 0 || height == 0) return
        val density = resources.displayMetrics.density.toDouble()
        val location = IntArray(2)
        getLocationInWindow(location)
        val frame =
            doubleArrayOf(
                location[0] / density,
                location[1] / density,
                width / density,
                height / density
            )
        if (initialInsetsSent && insets.contentEquals(lastInsets) && frame.contentEquals(lastFrame)) {
            return
        }
        initialInsetsSent = true
        lastInsets = insets.copyOf()
        lastFrame = frame.copyOf()
        val dispatcher =
            UIManagerHelper.getEventDispatcher(UIManagerHelper.getReactContext(this)) ?: return
        dispatcher.dispatchEvent(
            OneNativeSafeAreaInsetsChangeEvent(
                UIManagerHelper.getSurfaceId(this),
                id,
                insets[0] / density,
                insets[1] / density,
                insets[2] / density,
                insets[3] / density,
                frame[0],
                frame[1],
                frame[2],
                frame[3]
            )
        )
    }

    fun resetForReuse() {
        lastInsets = intArrayOf(0, 0, 0, 0)
        lastFrame = doubleArrayOf(0.0, 0.0, 0.0, 0.0)
        initialInsetsSent = false
    }
}
