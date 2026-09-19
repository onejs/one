package dev.onejs.onenative

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.viewmanagers.OneNativeSafeAreaProviderManagerDelegate
import com.facebook.react.viewmanagers.OneNativeSafeAreaProviderManagerInterface

@ReactModule(name = OneNativeSafeAreaProviderManager.REACT_CLASS)
class OneNativeSafeAreaProviderManager :
    ViewGroupManager<OneNativeSafeAreaProviderView>(),
    OneNativeSafeAreaProviderManagerInterface<OneNativeSafeAreaProviderView> {

    private val delegate: ViewManagerDelegate<OneNativeSafeAreaProviderView> =
        OneNativeSafeAreaProviderManagerDelegate(this)

    override fun getName(): String = REACT_CLASS

    override fun createViewInstance(reactContext: ThemedReactContext): OneNativeSafeAreaProviderView =
        OneNativeSafeAreaProviderView(reactContext)

    override fun getDelegate(): ViewManagerDelegate<OneNativeSafeAreaProviderView> = delegate

    override fun prepareToRecycleView(
        reactContext: ThemedReactContext,
        view: OneNativeSafeAreaProviderView,
    ): OneNativeSafeAreaProviderView? {
        val recyclable = super.prepareToRecycleView(reactContext, view) ?: return null
        recyclable.resetForReuse()
        return recyclable
    }

    override fun onDropViewInstance(view: OneNativeSafeAreaProviderView) {
        view.resetForReuse()
        super.onDropViewInstance(view)
    }

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> {
        val events =
            super.getExportedCustomDirectEventTypeConstants()?.toMutableMap() ?: mutableMapOf()
        events["topNativeInsetsChange"] =
            mapOf("registrationName" to "onNativeInsetsChange")
        return events
    }

    companion object {
        const val REACT_CLASS = "OneNativeSafeAreaProvider"
    }
}
