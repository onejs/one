package dev.onejs.onenative

import android.content.Context
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.viewmanagers.OneNativeComposeNodeManagerDelegate
import com.facebook.react.viewmanagers.OneNativeComposeNodeManagerInterface
import com.facebook.yoga.YogaMeasureMode
import com.facebook.yoga.YogaMeasureOutput

@ReactModule(name = OneNativeComposeNodeManager.REACT_CLASS)
class OneNativeComposeNodeManager :
    ViewGroupManager<OneNativeComposeNodeView>(),
    OneNativeComposeNodeManagerInterface<OneNativeComposeNodeView> {

    private val delegate: ViewManagerDelegate<OneNativeComposeNodeView> =
        OneNativeComposeNodeManagerDelegate(this)

    init {
        setupViewRecycling()
    }

    override fun getName(): String = REACT_CLASS

    override fun createViewInstance(reactContext: ThemedReactContext): OneNativeComposeNodeView =
        OneNativeComposeNodeView(reactContext)

    override fun getDelegate(): ViewManagerDelegate<OneNativeComposeNodeView> = delegate

    override fun needsCustomLayoutForChildren(): Boolean = true

    override fun addView(
        parent: OneNativeComposeNodeView,
        child: android.view.View,
        index: Int,
    ) {
        parent.addLogicalChild(requireComposeChild(child), index)
    }

    override fun getChildAt(parent: OneNativeComposeNodeView, index: Int): android.view.View? =
        parent.logicalChildAt(index)

    override fun getChildCount(parent: OneNativeComposeNodeView): Int = parent.logicalChildCount

    override fun removeViewAt(parent: OneNativeComposeNodeView, index: Int) {
        parent.removeLogicalChildAt(index)
    }

    override fun removeView(parent: OneNativeComposeNodeView, view: android.view.View) {
        parent.removeLogicalChild(requireComposeChild(view))
    }

    override fun updateExtraData(root: OneNativeComposeNodeView, extraData: Any) {
        // compose owns the logical children and their layout.
    }

    override fun onAfterUpdateTransaction(view: OneNativeComposeNodeView) {
        super.onAfterUpdateTransaction(view)
        view.commitPendingProps()
    }

    override fun prepareToRecycleView(
        reactContext: ThemedReactContext,
        view: OneNativeComposeNodeView,
    ): OneNativeComposeNodeView? {
        val recyclable = super.prepareToRecycleView(reactContext, view) ?: return null
        recyclable.resetForReuse()
        return recyclable
    }

    override fun onDropViewInstance(view: OneNativeComposeNodeView) {
        view.resetForReuse()
        super.onDropViewInstance(view)
    }

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> {
        val events =
            super.getExportedCustomDirectEventTypeConstants()?.toMutableMap() ?: mutableMapOf()
        events["topNativeComposeNodeButtonPress"] =
            mapOf("registrationName" to "onNativeComposeNodeButtonPress")
        events["topNativeComposeNodeSwitchValueChange"] =
            mapOf("registrationName" to "onNativeComposeNodeSwitchValueChange")
        events["topNativeComposeNodeTextValueChange"] =
            mapOf("registrationName" to "onNativeComposeNodeTextValueChange")
        events["topNativeComposeNodeNumberValueChange"] =
            mapOf("registrationName" to "onNativeComposeNodeNumberValueChange")
        events["topNativeComposeNodeDialogConfirm"] =
            mapOf("registrationName" to "onNativeComposeNodeDialogConfirm")
        events["topNativeComposeNodeDialogDismiss"] =
            mapOf("registrationName" to "onNativeComposeNodeDialogDismiss")
        return events
    }

    override fun setNodeType(view: OneNativeComposeNodeView, value: String?) {
        view.stageNodeType(value)
    }

    override fun setText(view: OneNativeComposeNodeView, value: String?) {
        view.stageText(value)
    }

    override fun setFontSize(view: OneNativeComposeNodeView, value: Double) {
        view.stageFontSize(value)
    }

    override fun setFontWeight(view: OneNativeComposeNodeView, value: String?) {
        view.stageFontWeight(value)
    }

    override fun setTextAlign(view: OneNativeComposeNodeView, value: String?) {
        view.stageTextAlign(value)
    }

    override fun setMaxLines(view: OneNativeComposeNodeView, value: Int) {
        view.stageMaxLines(value)
    }

    override fun setLabel(view: OneNativeComposeNodeView, value: String?) {
        view.stageLabel(value)
    }

    override fun setDisabled(view: OneNativeComposeNodeView, value: Boolean) {
        view.stageDisabled(value)
    }

    override fun setVariant(view: OneNativeComposeNodeView, value: String?) {
        view.stageVariant(value)
    }

    override fun setTone(view: OneNativeComposeNodeView, value: String?) {
        view.stageTone(value)
    }

    override fun setValue(view: OneNativeComposeNodeView, value: Boolean) {
        view.stageValue(value)
    }

    override fun setAcknowledgedEvent(view: OneNativeComposeNodeView, value: Int) {
        view.stageAcknowledgedEvent(value)
    }

    override fun setRevision(view: OneNativeComposeNodeView, value: Int) {
        view.stageRevision(value)
    }

    override fun setAlignment(view: OneNativeComposeNodeView, value: String?) {
        view.stageAlignment(value)
    }

    override fun setArrangement(view: OneNativeComposeNodeView, value: String?) {
        view.stageArrangement(value)
    }

    override fun setSpacing(view: OneNativeComposeNodeView, value: Double) {
        view.stageSpacing(value)
    }

    override fun setTextValue(view: OneNativeComposeNodeView, value: String?) {
        view.stageTextValue(value)
    }

    override fun setSyncStateId(view: OneNativeComposeNodeView, value: Int) {
        view.stageSyncStateId(value)
    }

    override fun setPlaceholder(view: OneNativeComposeNodeView, value: String?) {
        view.stagePlaceholder(value)
    }

    override fun setKeyboardType(view: OneNativeComposeNodeView, value: String?) {
        view.stageKeyboardType(value)
    }

    override fun setSecureText(view: OneNativeComposeNodeView, value: Boolean) {
        view.stageSecureText(value)
    }

    override fun setNumberValue(view: OneNativeComposeNodeView, value: Double) {
        view.stageNumberValue(value)
    }

    override fun setMinimumValue(view: OneNativeComposeNodeView, value: Double) {
        view.stageMinimumValue(value)
    }

    override fun setMaximumValue(view: OneNativeComposeNodeView, value: Double) {
        view.stageMaximumValue(value)
    }

    override fun setStep(view: OneNativeComposeNodeView, value: Double) {
        view.stageStep(value)
    }

    override fun setVisible(view: OneNativeComposeNodeView, value: Boolean) {
        view.stageVisible(value)
    }

    override fun setTitle(view: OneNativeComposeNodeView, value: String?) {
        view.stageTitle(value)
    }

    override fun setMessage(view: OneNativeComposeNodeView, value: String?) {
        view.stageMessage(value)
    }

    override fun setConfirmLabel(view: OneNativeComposeNodeView, value: String?) {
        view.stageConfirmLabel(value)
    }

    override fun setDismissLabel(view: OneNativeComposeNodeView, value: String?) {
        view.stageDismissLabel(value)
    }

    override fun setProgress(view: OneNativeComposeNodeView, value: Double) {
        view.stageProgress(value)
    }

    override fun setProgressVariant(view: OneNativeComposeNodeView, value: String?) {
        view.stageProgressVariant(value)
    }

    override fun setComposeStyle(view: OneNativeComposeNodeView, value: ReadableMap?) {
        view.stageComposeStyle(value)
    }

    override fun setTestId(view: OneNativeComposeNodeView, testId: String?) {
        super.setTestId(view, testId)
        view.invalidateComposeSemantics()
    }

    override fun setAccessibilityLabel(view: OneNativeComposeNodeView, label: String?) {
        super.setAccessibilityLabel(view, label)
        view.invalidateComposeSemantics()
    }

    override fun setAccessibilityRole(view: OneNativeComposeNodeView, role: String?) {
        super.setAccessibilityRole(view, role)
        view.invalidateComposeSemantics()
    }

    override fun setRole(view: OneNativeComposeNodeView, role: String?) {
        super.setRole(view, role)
        view.invalidateComposeSemantics()
    }

    override fun setAccessibilityValue(view: OneNativeComposeNodeView, value: ReadableMap?) {
        super.setAccessibilityValue(view, value)
        view.invalidateComposeSemantics()
    }

    override fun setViewState(view: OneNativeComposeNodeView, state: ReadableMap?) {
        super.setViewState(view, state)
        view.invalidateComposeSemantics()
    }

    override fun measure(
        context: Context,
        localData: ReadableMap?,
        props: ReadableMap?,
        state: ReadableMap?,
        width: Float,
        widthMode: YogaMeasureMode,
        height: Float,
        heightMode: YogaMeasureMode,
        attachmentsPositions: FloatArray?,
    ): Long {
        val style = OneNativeComposeStyle.fromMap(props?.getMap("composeStyle"), context)
        val widthResult: Double =
            when {
                widthMode == YogaMeasureMode.EXACTLY -> width.toDouble()
                style.width >= 0 -> style.width
                style.fillMaxWidth && widthMode == YogaMeasureMode.AT_MOST -> width.toDouble()
                else -> 0.0
            }
        val heightResult: Double =
            when {
                heightMode == YogaMeasureMode.EXACTLY -> height.toDouble()
                style.height >= 0 -> style.height
                style.fillMaxHeight && heightMode == YogaMeasureMode.AT_MOST -> height.toDouble()
                else -> 0.0
            }
        return YogaMeasureOutput.make(
            widthResult.finiteNonNegative(),
            heightResult.finiteNonNegative(),
        )
    }

    private fun requireComposeChild(view: android.view.View): OneNativeComposeNodeView =
        view as? OneNativeComposeNodeView
            ?: error(
                "OneNativeComposeNode only accepts OneNativeComposeNode children; " +
                    "wrap other React Native content in a separate host."
            )

    private companion object {
        const val REACT_CLASS = "OneNativeComposeNode"
    }
}

private fun Double.finiteNonNegative(): Float {
    if (isNaN() || this == Double.NEGATIVE_INFINITY) return 0f
    val nonNegative = coerceAtLeast(0.0)
    return nonNegative.coerceAtMost(Float.MAX_VALUE.toDouble()).toFloat()
}
