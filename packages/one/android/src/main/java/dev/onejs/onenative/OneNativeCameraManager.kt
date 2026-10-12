package dev.onejs.onenative

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.OneNativeCameraManagerDelegate
import com.facebook.react.viewmanagers.OneNativeCameraManagerInterface

// Embedded camera preview manager, the Android half of CameraView: the
// same react class, props and direct events as the iOS native component,
// so the shared JS side renders unchanged on both platforms.
@ReactModule(name = OneNativeCameraManager.REACT_CLASS)
class OneNativeCameraManager :
    ViewGroupManager<OneNativeCameraView>(),
    OneNativeCameraManagerInterface<OneNativeCameraView> {

    private val delegate: ViewManagerDelegate<OneNativeCameraView> =
        OneNativeCameraManagerDelegate(this)

    override fun getName(): String = REACT_CLASS

    override fun createViewInstance(reactContext: ThemedReactContext): OneNativeCameraView =
        OneNativeCameraView(reactContext)

    override fun getDelegate(): ViewManagerDelegate<OneNativeCameraView> = delegate

    @ReactProp(name = "active", defaultBoolean = true)
    override fun setActive(view: OneNativeCameraView, value: Boolean) {
        view.setPendingActive(value)
    }

    @ReactProp(name = "facing")
    override fun setFacing(view: OneNativeCameraView, value: String?) {
        view.setPendingFacing(value ?: "back")
    }

    @ReactProp(name = "codeTypes")
    override fun setCodeTypes(view: OneNativeCameraView, value: ReadableArray?) {
        val types = mutableListOf<String>()
        if (value != null) {
            for (index in 0 until value.size()) {
                value.getString(index)?.let { types.add(it) }
            }
        }
        view.setPendingCodeTypes(types)
    }

    override fun onAfterUpdateTransaction(view: OneNativeCameraView) {
        super.onAfterUpdateTransaction(view)
        view.applyPending()
        view.replayState()
    }

    override fun onDropViewInstance(view: OneNativeCameraView) {
        view.reset()
        super.onDropViewInstance(view)
    }

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> =
        (super.getExportedCustomDirectEventTypeConstants()?.toMutableMap() ?: mutableMapOf()).apply {
            put("topNativeCameraState", mapOf("registrationName" to "onNativeCameraState"))
            put("topNativeCameraCode", mapOf("registrationName" to "onNativeCameraCode"))
        }

    companion object {
        const val REACT_CLASS = "OneNativeCamera"
    }
}
