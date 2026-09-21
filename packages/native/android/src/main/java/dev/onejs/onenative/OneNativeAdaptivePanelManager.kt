package dev.onejs.onenative

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.viewmanagers.OneNativeAdaptivePanelManagerDelegate
import com.facebook.react.viewmanagers.OneNativeAdaptivePanelManagerInterface

@ReactModule(name = OneNativeAdaptivePanelManager.REACT_CLASS)
class OneNativeAdaptivePanelManager :
    ViewGroupManager<OneNativeAdaptivePanelView>(),
    OneNativeAdaptivePanelManagerInterface<OneNativeAdaptivePanelView> {
    private val delegate: ViewManagerDelegate<OneNativeAdaptivePanelView> =
        OneNativeAdaptivePanelManagerDelegate(this)

    init {
        setupViewRecycling()
    }

    override fun getName(): String = REACT_CLASS

    override fun createViewInstance(reactContext: ThemedReactContext): OneNativeAdaptivePanelView =
        OneNativeAdaptivePanelView(reactContext)

    override fun getDelegate(): ViewManagerDelegate<OneNativeAdaptivePanelView> = delegate

    override fun needsCustomLayoutForChildren(): Boolean = true

    override fun addView(
        parent: OneNativeAdaptivePanelView,
        child: android.view.View,
        index: Int,
    ) {
        parent.setPanelContent(child)
    }

    override fun removeView(parent: OneNativeAdaptivePanelView, view: android.view.View) {
        parent.clearPanelContent(view)
    }

    override fun removeViewAt(parent: OneNativeAdaptivePanelView, index: Int) {
        val child = parent.getChildAt(index)
        if (child != null) parent.clearPanelContent(child)
    }

    override fun onAfterUpdateTransaction(view: OneNativeAdaptivePanelView) {
        super.onAfterUpdateTransaction(view)
        view.commitPendingProps()
    }

    override fun prepareToRecycleView(
        reactContext: ThemedReactContext,
        view: OneNativeAdaptivePanelView,
    ): OneNativeAdaptivePanelView? {
        val recyclable = super.prepareToRecycleView(reactContext, view) ?: return null
        recyclable.resetForReuse()
        return recyclable
    }

    override fun onDropViewInstance(view: OneNativeAdaptivePanelView) {
        view.resetForReuse()
        super.onDropViewInstance(view)
    }

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> {
        val events =
            super.getExportedCustomDirectEventTypeConstants()?.toMutableMap() ?: mutableMapOf()
        events["topNativeAdaptivePanelOpenChange"] =
            mapOf("registrationName" to "onNativeAdaptivePanelOpenChange")
        events["topNativeAdaptivePanelDetentChange"] =
            mapOf("registrationName" to "onNativeAdaptivePanelDetentChange")
        events["topNativeAdaptivePanelLayoutChange"] =
            mapOf("registrationName" to "onNativeAdaptivePanelLayoutChange")
        return events
    }

    override fun setOpen(view: OneNativeAdaptivePanelView, value: Boolean) {
        view.stageOpen(value)
    }

    override fun setAcknowledgedEvent(view: OneNativeAdaptivePanelView, value: Int) {
        view.stageAcknowledgedEvent(value)
    }

    override fun setRevision(view: OneNativeAdaptivePanelView, value: Int) {
        view.stageRevision(value)
    }

    override fun setCompactDetents(view: OneNativeAdaptivePanelView, value: ReadableArray?) {
        view.stageDetents(value)
    }

    override fun setSelectedDetentType(view: OneNativeAdaptivePanelView, value: String?) {
        view.stageSelectedDetentType(value)
    }

    override fun setSelectedDetentValue(view: OneNativeAdaptivePanelView, value: Double) {
        view.stageSelectedDetentValue(value)
    }

    override fun setAcknowledgedDetentEvent(view: OneNativeAdaptivePanelView, value: Int) {
        view.stageAcknowledgedDetentEvent(value)
    }

    override fun setDetentRevision(view: OneNativeAdaptivePanelView, value: Int) {
        view.stageDetentRevision(value)
    }

    override fun setRegularWidth(view: OneNativeAdaptivePanelView, value: Double) {
        view.stageRegularWidth(value)
    }

    companion object {
        const val REACT_CLASS = "OneNativeAdaptivePanel"
    }
}
