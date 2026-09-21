package dev.onejs.onenative

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.viewmanagers.OneNativeAdaptivePanelContentManagerDelegate
import com.facebook.react.viewmanagers.OneNativeAdaptivePanelContentManagerInterface
import com.facebook.react.views.view.ReactViewGroup

@ReactModule(name = OneNativeAdaptivePanelContentManager.REACT_CLASS)
class OneNativeAdaptivePanelContentManager :
    ViewGroupManager<ReactViewGroup>(),
    OneNativeAdaptivePanelContentManagerInterface<ReactViewGroup> {
    private val delegate: ViewManagerDelegate<ReactViewGroup> =
        OneNativeAdaptivePanelContentManagerDelegate(this)

    override fun getName(): String = REACT_CLASS

    override fun createViewInstance(reactContext: ThemedReactContext): ReactViewGroup =
        ReactViewGroup(reactContext)

    override fun getDelegate(): ViewManagerDelegate<ReactViewGroup> = delegate

    companion object {
        const val REACT_CLASS = "OneNativeAdaptivePanelContent"
    }
}
