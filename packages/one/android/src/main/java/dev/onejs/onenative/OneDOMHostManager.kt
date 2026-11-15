package dev.onejs.onenative

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.events.Event
import com.facebook.react.viewmanagers.OneDOMHostManagerDelegate
import com.facebook.react.viewmanagers.OneDOMHostManagerInterface

private class DOMHostEvent(surfaceId: Int, viewId: Int, private val name: String, private val data: WritableMap) :
    Event<DOMHostEvent>(surfaceId, viewId) {
    override fun getEventName() = name
    // every document start and message is a protocol step; none may merge.
    override fun canCoalesce() = false
    override fun getEventData() = data
}

// fabric glue only; OneDOMHostView owns the WebView and its documents.
@ReactModule(name = OneDOMHostManager.NAME)
class OneDOMHostManager : SimpleViewManager<OneDOMHostView>(), OneDOMHostManagerInterface<OneDOMHostView> {
    private val delegate = OneDOMHostManagerDelegate(this)
    override fun getDelegate(): ViewManagerDelegate<OneDOMHostView> = delegate
    override fun getName() = NAME

    override fun createViewInstance(context: ThemedReactContext): OneDOMHostView {
        val view = OneDOMHostView(context)
        fun emit(name: String, data: WritableMap) {
            UIManagerHelper.getEventDispatcherForReactTag(context, view.id)?.dispatchEvent(
                DOMHostEvent(UIManagerHelper.getSurfaceId(context), view.id, name, data))
        }
        view.onDocumentStart = { epoch, revision ->
            emit("topDocumentStart", Arguments.createMap().apply { putString("epoch", epoch); putDouble("revision", revision) })
        }
        view.onMessage = { message -> emit("topMessage", Arguments.createMap().apply { putString("message", message) }) }
        view.onLoad = { epoch -> emit("topLoad", Arguments.createMap().apply { putString("epoch", epoch) }) }
        view.onError = { epoch, message, code ->
            emit("topError", Arguments.createMap().apply {
                putString("epoch", epoch); putString("message", message); putString("code", code)
            })
        }
        view.onProcessTerminated = { epoch ->
            emit("topProcessTerminated", Arguments.createMap().apply { putString("epoch", epoch) })
        }
        return view
    }

    @ReactProp(name = "entryId")
    override fun setEntryId(view: OneDOMHostView, value: String?) { view.props.entryId = value ?: "" }
    @ReactProp(name = "developmentURL")
    override fun setDevelopmentURL(view: OneDOMHostView, value: String?) { view.props.developmentURL = value ?: "" }
    @ReactProp(name = "bootstrapState")
    override fun setBootstrapState(view: OneDOMHostView, value: String?) { view.props.bootstrapState = value ?: "" }
    @ReactProp(name = "scrollEnabled", defaultBoolean = true)
    override fun setScrollEnabled(view: OneDOMHostView, value: Boolean) { view.props.scrollEnabled = value }

    override fun onAfterUpdateTransaction(view: OneDOMHostView) {
        super.onAfterUpdateTransaction(view)
        view.commit()
    }

    override fun post(view: OneDOMHostView, message: String?) { if (message != null) view.post(message) }
    override fun receiveCommand(view: OneDOMHostView, commandId: String, args: ReadableArray?) {
        delegate.receiveCommand(view, commandId, args)
    }

    override fun onDropViewInstance(view: OneDOMHostView) {
        view.teardown()
        super.onDropViewInstance(view)
    }

    override fun getExportedCustomDirectEventTypeConstants() = mutableMapOf<String, Any>(
        "topDocumentStart" to mapOf("registrationName" to "onDocumentStart"),
        "topMessage" to mapOf("registrationName" to "onMessage"),
        "topLoad" to mapOf("registrationName" to "onLoad"),
        "topError" to mapOf("registrationName" to "onError"),
        "topProcessTerminated" to mapOf("registrationName" to "onProcessTerminated"))

    companion object { const val NAME = "OneDOMHost" }
}
