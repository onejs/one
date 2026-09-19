package dev.onejs.onenative

import android.os.Build
import android.view.WindowInsets
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule

// synchronous initial window metrics for getInitialWindowMetrics, the
// Android half of upstream RNCSafeAreaContext: system bars plus the display
// cutout, in density-independent pixels. null until a laid-out window can
// be measured, exactly like the iOS module before its key window exists.
class OneNativeSafeAreaModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = NAME

    override fun getConstants(): Map<String, Any?> {
        val decorView = reactApplicationContext.currentActivity?.window?.decorView
        val root = decorView?.rootView
        val windowInsets = root?.rootWindowInsets
        if (decorView == null || root == null || windowInsets == null) {
            return mapOf("initialWindowMetrics" to null)
        }
        val density = root.resources.displayMetrics.density.toDouble()
        val width = root.width / density
        val height = root.height / density
        if (width <= 0 || height <= 0) {
            return mapOf("initialWindowMetrics" to null)
        }
        val (top, right, bottom, left) = readSystemInsets(windowInsets)
        val metrics =
            mapOf(
                "insets" to
                    mapOf(
                        "top" to top / density,
                        "right" to right / density,
                        "bottom" to bottom / density,
                        "left" to left / density
                    ),
                "frame" to
                    mapOf(
                        "x" to 0.0,
                        "y" to 0.0,
                        "width" to width,
                        "height" to height
                    )
            )
        return mapOf("initialWindowMetrics" to metrics)
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

    companion object {
        const val NAME = "OneNativeSafeAreaContext"
    }
}
