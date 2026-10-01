package dev.onejs.onenative

import android.os.SystemClock
import android.view.GestureDetector
import android.view.MotionEvent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.PointerEvents
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.events.Event
import com.facebook.react.uimanager.events.NativeGestureUtil
import com.facebook.react.views.view.ReactViewGroup
import com.facebook.react.views.view.ReactViewManager

class OneNativeMenuTriggerManager : ReactViewManager() {
    override fun getName(): String = "OneNativeMenuTrigger"

    override fun createViewInstance(context: ThemedReactContext): ReactViewGroup =
        OneNativeMenuTriggerView(context)

    @ReactProp(name = "contextMenuEnabled", defaultBoolean = true)
    fun setContextMenuEnabled(view: ReactViewGroup, enabled: Boolean) {
        (view as OneNativeMenuTriggerView).contextMenuEnabled = enabled
    }

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> =
        (super.getExportedCustomDirectEventTypeConstants()?.toMutableMap() ?: mutableMapOf()).apply {
            put("topNativeMenuLongPress", mapOf("registrationName" to "onNativeMenuLongPress"))
        }
}

private class OneNativeMenuTriggerView(private val reactContext: ThemedReactContext) :
    ReactViewGroup(reactContext) {
    var contextMenuEnabled = true
        set(value) {
            field = value
            isLongClickable = value
            if (!value) cancelGesture()
        }
    private var ownsGesture = false
    private val detector = GestureDetector(reactContext, object : GestureDetector.SimpleOnGestureListener() {
        override fun onDown(event: MotionEvent): Boolean = true
        override fun onLongPress(event: MotionEvent) {
            if (!contextMenuEnabled || !isAttachedToWindow || !PointerEvents.canBeTouchTarget(pointerEvents)) return
            ownsGesture = true
            NativeGestureUtil.notifyNativeGestureStarted(this@OneNativeMenuTriggerView, event)
            emitLongPress()
        }
    })

    init {
        setOnLongClickListener {
            if (!contextMenuEnabled || !PointerEvents.canBeTouchTarget(pointerEvents)) false else {
                emitLongPress()
                true
            }
        }
    }

    private fun emitLongPress() {
        UIManagerHelper.getEventDispatcherForReactTag(reactContext, id)?.dispatchEvent(
            OneNativeMenuLongPressEvent(UIManagerHelper.getSurfaceId(this), id))
    }

    private fun cancelGesture() {
        val now = SystemClock.uptimeMillis()
        val cancel = MotionEvent.obtain(now, now, MotionEvent.ACTION_CANCEL, 0f, 0f, 0)
        detector.onTouchEvent(cancel)
        if (ownsGesture) NativeGestureUtil.notifyNativeGestureEnded(this, cancel)
        ownsGesture = false
        cancel.recycle()
    }

    override fun onDetachedFromWindow() {
        cancelGesture()
        super.onDetachedFromWindow()
    }

    override fun dispatchTouchEvent(event: MotionEvent): Boolean {
        if (contextMenuEnabled && PointerEvents.canBeTouchTarget(pointerEvents)) detector.onTouchEvent(event)
        val result = super.dispatchTouchEvent(event)
        if (event.actionMasked == MotionEvent.ACTION_UP || event.actionMasked == MotionEvent.ACTION_CANCEL) {
            if (ownsGesture) NativeGestureUtil.notifyNativeGestureEnded(this, event)
            ownsGesture = false
        }
        return result
    }

    // the detector owns touch long press; the listener owns accessibility activation.
    override fun onTouchEvent(event: MotionEvent): Boolean = super.onTouchEvent(event)

    override fun onInterceptTouchEvent(event: MotionEvent): Boolean =
        ownsGesture || super.onInterceptTouchEvent(event)
}

private class OneNativeMenuLongPressEvent(surfaceId: Int, viewTag: Int) :
    Event<OneNativeMenuLongPressEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = "topNativeMenuLongPress"
    override fun canCoalesce(): Boolean = false
    override fun getEventData(): WritableMap = Arguments.createMap()
}
