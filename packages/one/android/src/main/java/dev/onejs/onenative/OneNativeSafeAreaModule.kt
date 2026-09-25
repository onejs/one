package dev.onejs.onenative

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
        val root =
            reactApplicationContext.currentActivity?.window?.decorView?.rootView
                ?: return mapOf("initialWindowMetrics" to null)
        // window-level reading, so no overlap subtraction: the whole window
        // is the subject. the shared root helper still applies the
        // keyboard-safe bottom.
        val window =
            OneNativeSafeAreaInsets.rootWindowInsetsPx(root)
                ?: return mapOf("initialWindowMetrics" to null)
        val density = root.resources.displayMetrics.density.toDouble()
        val width = root.width / density
        val height = root.height / density
        if (width <= 0 || height <= 0) {
            return mapOf("initialWindowMetrics" to null)
        }
        val metrics =
            mapOf(
                "insets" to
                    mapOf(
                        "top" to window[0] / density,
                        "right" to window[1] / density,
                        "bottom" to window[2] / density,
                        "left" to window[3] / density
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

    companion object {
        const val NAME = "OneNativeSafeAreaContext"
    }
}
