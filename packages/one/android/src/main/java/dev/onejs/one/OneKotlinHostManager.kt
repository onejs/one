package dev.onejs.one

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.viewmanagers.OneKotlinHostManagerDelegate
import com.facebook.react.viewmanagers.OneKotlinHostManagerInterface

@ReactModule(name = OneKotlinHostManager.REACT_CLASS)
class OneKotlinHostManager :
    ViewGroupManager<OneKotlinHostView>(),
    OneKotlinHostManagerInterface<OneKotlinHostView> {

    private val delegate: ViewManagerDelegate<OneKotlinHostView> =
        OneKotlinHostManagerDelegate(this)

    init {
        setupViewRecycling()
    }

    override fun getName(): String = REACT_CLASS

    override fun createViewInstance(reactContext: ThemedReactContext): OneKotlinHostView =
        OneKotlinHostView(reactContext)

    override fun getDelegate(): ViewManagerDelegate<OneKotlinHostView> = delegate

    override fun needsCustomLayoutForChildren(): Boolean = true

    override fun onAfterUpdateTransaction(view: OneKotlinHostView) {
        super.onAfterUpdateTransaction(view)
        view.commitPendingProps()
    }

    override fun prepareToRecycleView(
        reactContext: ThemedReactContext,
        view: OneKotlinHostView,
    ): OneKotlinHostView? {
        val recyclable = super.prepareToRecycleView(reactContext, view) ?: return null
        recyclable.resetForReuse()
        return recyclable
    }

    override fun onDropViewInstance(view: OneKotlinHostView) {
        view.resetForReuse()
        super.onDropViewInstance(view)
    }

    override fun setSource(view: OneKotlinHostView, value: String?) {
        view.stageSource(value)
    }

    override fun setView(view: OneKotlinHostView, value: String?) {
        view.stageView(value)
    }

    override fun setContractHash(view: OneKotlinHostView, value: String?) {
        view.stageContractHash(value)
    }

    override fun setProps(view: OneKotlinHostView, value: String?) {
        view.stageProps(value)
    }

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> {
        val events =
            super.getExportedCustomDirectEventTypeConstants()?.toMutableMap() ?: mutableMapOf()
        events["topHostEvent"] =
            mapOf("registrationName" to "onHostEvent")
        events["topHostSizeChange"] =
            mapOf("registrationName" to "onHostSizeChange")
        return events
    }

    companion object {
        const val REACT_CLASS = "OneKotlinHost"
    }
}
