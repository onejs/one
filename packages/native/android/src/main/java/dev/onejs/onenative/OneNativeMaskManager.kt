package dev.onejs.onenative

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager

// No props, no delegate: the mask shape comes entirely from the subtrees
// (child 0 masks, the rest show through it).
@ReactModule(name = OneNativeMaskManager.REACT_CLASS)
class OneNativeMaskManager : ViewGroupManager<OneNativeMaskView>() {

    override fun getName(): String = REACT_CLASS

    override fun createViewInstance(reactContext: ThemedReactContext): OneNativeMaskView =
        OneNativeMaskView(reactContext)

    companion object {
        const val REACT_CLASS = "OneNativeMask"
    }
}
