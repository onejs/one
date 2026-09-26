package dev.onejs.onenative

import android.content.Context
import android.content.res.Configuration
import android.graphics.Color as AndroidColor
import android.os.Build
import android.view.View
import android.view.ViewGroup
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.RadioButtonDefaults
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.key
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.ViewCompositionStrategy
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.ProgressBarRangeInfo
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.dialog
import androidx.compose.ui.semantics.disabled
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.invisibleToUser
import androidx.compose.ui.semantics.progressBarRangeInfo
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.semantics.testTagsAsResourceId
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.facebook.react.R
import com.facebook.react.bridge.ColorPropConverter
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.views.view.ReactViewGroup
import dev.onejs.one.R as OneR
import kotlin.math.roundToInt

private fun readComposeColor(map: ReadableMap, name: String, context: Context): Int? {
    if (!map.hasKey(name) || map.isNull(name)) return null
    return when (map.getType(name)) {
        ReadableType.Number -> ColorPropConverter.getColor(map.getDouble(name), context)
        ReadableType.Map -> ColorPropConverter.getColor(map.getMap(name), context)
        ReadableType.String ->
            map.getString(name)?.let { value ->
                ColorPropConverter.resolveResourcePath(context, value)
                    ?: runCatching { AndroidColor.parseColor(value) }.getOrNull()
            }
        else -> null
    }
}

internal data class OneNativeCheckboxColors(
    val checkedColor: Int? = null,
    val disabledCheckedColor: Int? = null,
    val uncheckedColor: Int? = null,
    val disabledUncheckedColor: Int? = null,
    val checkmarkColor: Int? = null,
) {
    companion object {
        fun fromMap(map: ReadableMap?, context: Context): OneNativeCheckboxColors =
            if (map == null) OneNativeCheckboxColors() else OneNativeCheckboxColors(
                checkedColor = readComposeColor(map, "checkedColor", context),
                disabledCheckedColor = readComposeColor(map, "disabledCheckedColor", context),
                uncheckedColor = readComposeColor(map, "uncheckedColor", context),
                disabledUncheckedColor = readComposeColor(map, "disabledUncheckedColor", context),
                checkmarkColor = readComposeColor(map, "checkmarkColor", context),
            )
    }
}

internal data class OneNativeRadioColors(
    val selectedColor: Int? = null,
    val unselectedColor: Int? = null,
    val disabledSelectedColor: Int? = null,
    val disabledUnselectedColor: Int? = null,
) {
    companion object {
        fun fromMap(map: ReadableMap?, context: Context): OneNativeRadioColors =
            if (map == null) OneNativeRadioColors() else OneNativeRadioColors(
                selectedColor = readComposeColor(map, "selectedColor", context),
                unselectedColor = readComposeColor(map, "unselectedColor", context),
                disabledSelectedColor = readComposeColor(map, "disabledSelectedColor", context),
                disabledUnselectedColor = readComposeColor(map, "disabledUnselectedColor", context),
            )
    }
}

internal data class OneNativeComposeStyle(
    val backgroundColor: Int? = null,
    val foregroundColor: Int? = null,
    val padding: Double = -1.0,
    val paddingTop: Double = -1.0,
    val paddingRight: Double = -1.0,
    val paddingBottom: Double = -1.0,
    val paddingLeft: Double = -1.0,
    val width: Double = -1.0,
    val height: Double = -1.0,
    val fillMaxWidth: Boolean = false,
    val fillMaxHeight: Boolean = false,
    val cornerRadius: Double = -1.0,
    val opacity: Double = -1.0,
    val borderColor: Int? = null,
    val borderWidth: Double = -1.0,
) {
    companion object {
        fun fromMap(map: ReadableMap?, context: Context): OneNativeComposeStyle {
            if (map == null) return OneNativeComposeStyle()

            fun number(name: String): Double {
                if (!map.hasKey(name) || map.isNull(name) || map.getType(name) != ReadableType.Number) {
                    return -1.0
                }
                return map.getDouble(name).takeIf { it.isFinite() } ?: -1.0
            }

            fun boolean(name: String): Boolean =
                map.hasKey(name) && !map.isNull(name) && map.getType(name) == ReadableType.Boolean && map.getBoolean(name)

            return OneNativeComposeStyle(
                backgroundColor = readComposeColor(map, "backgroundColor", context),
                foregroundColor = readComposeColor(map, "foregroundColor", context),
                padding = number("padding"),
                paddingTop = number("paddingTop"),
                paddingRight = number("paddingRight"),
                paddingBottom = number("paddingBottom"),
                paddingLeft = number("paddingLeft"),
                width = number("width"),
                height = number("height"),
                fillMaxWidth = boolean("fillMaxWidth"),
                fillMaxHeight = boolean("fillMaxHeight"),
                cornerRadius = number("cornerRadius"),
                opacity = number("opacity"),
                borderColor = readComposeColor(map, "borderColor", context),
                borderWidth = number("borderWidth"),
            )
        }
    }
}

internal data class OneNativeComposeNodeProps(
    val nodeType: String? = null,
    val text: String? = null,
    val fontSize: Double = -1.0,
    val fontWeight: String? = null,
    val textAlign: String? = null,
    val maxLines: Int = 0,
    val label: String? = null,
    val disabled: Boolean = false,
    val variant: String? = null,
    val tone: String? = null,
    val icon: String? = null,
    val iconFilled: Boolean = false,
    val colorRole: String? = null,
    val value: Boolean = false,
    val nativeClickable: Boolean = true,
    val checkboxColors: OneNativeCheckboxColors = OneNativeCheckboxColors(),
    val selected: Boolean = false,
    val radioColors: OneNativeRadioColors = OneNativeRadioColors(),
    val acknowledgedEvent: Int = 0,
    val revision: Int = 0,
    val alignment: String? = null,
    val arrangement: String? = null,
    val spacing: Double = -1.0,
    val textValue: String? = null,
    val syncStateId: Int = 0,
    val placeholder: String? = null,
    val keyboardType: String? = null,
    val secureText: Boolean = false,
    val focused: Boolean = false,
    val focusRevision: Int = 0,
    val acknowledgedFocusEvent: Int = 0,
    val imeAction: String? = null,
    val maxLength: Int = 0,
    val multiline: Boolean = false,
    val capitalization: String? = null,
    val autoCorrect: Boolean? = null,
    val numberValue: Double = 0.0,
    val minimumValue: Double = 0.0,
    val maximumValue: Double = 1.0,
    val step: Double = 0.0,
    val visible: Boolean = false,
    val title: String? = null,
    val message: String? = null,
    val confirmLabel: String? = null,
    val dismissLabel: String? = null,
    val progress: Double = -1.0,
    val progressVariant: String? = null,
    val composeStyle: OneNativeComposeStyle = OneNativeComposeStyle(),
)

private class OneNativeControlledValue<T>(initial: T) {
    var value by mutableStateOf(initial)
        private set

    var eventCount: Int = 0
        private set

    var revision: Int = 0
        private set

    fun applyProps(suppliedValue: T, acknowledgedEvent: Int, suppliedRevision: Int) {
        if (suppliedRevision != revision) {
            revision = suppliedRevision
            eventCount = 0
            value = suppliedValue
        } else if (acknowledgedEvent >= eventCount) {
            value = suppliedValue
        }
    }

    fun change(nextValue: T): Int? {
        if (nextValue == value) return null
        value = nextValue
        eventCount += 1
        return eventCount
    }

    // a write arriving through a bound sync state: the value converges without
    // counting a native interaction, so no event echoes back to JavaScript.
    fun adopt(nextValue: T): Boolean {
        if (nextValue == value) return false
        value = nextValue
        return true
    }

    fun reset(to: T) {
        value = to
        eventCount = 0
        revision = 0
    }
}

class OneNativeComposeNodeView(context: Context) : ReactViewGroup(context) {
    private val composeView =
        ComposeView(context).apply {
            id = View.generateViewId()
            layoutParams =
                ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT,
                )
            setViewCompositionStrategy(ViewCompositionStrategy.DisposeOnDetachedFromWindow)
        }

    private val logicalChildren = mutableStateListOf<OneNativeComposeNodeView>()
    private val controlledBoolean = OneNativeControlledValue(false)
    private val controlledText = OneNativeControlledValue("")
    private val controlledFocus = OneNativeControlledValue(false)
    private val controlledNumber = OneNativeControlledValue(0.0)
    private var boundSyncText: MutableState<Any>? = null
    private var boundSyncId: Int = 0
    private var pendingProps = OneNativeComposeNodeProps()
    private var committedProps by mutableStateOf(OneNativeComposeNodeProps())
    private var semanticsVersion by mutableIntStateOf(0)
    private var compositionActive = false
    private var pressEventCount = 0
    private var dialogEventCount = 0
    private var submitEventCount = 0
    private var logicalParent: OneNativeComposeNodeView? = null

    init {
        clipChildren = false
        super.addView(composeView)
        composeView.setContent {
            OneNativeMaterialTheme {
                Box(modifier = Modifier.fillMaxSize()) {
                    RenderComposeNode(
                        this@OneNativeComposeNodeView,
                        Modifier.fillMaxSize(),
                    )
                }
            }
        }
    }

    internal val renderedProps: OneNativeComposeNodeProps
        get() = committedProps

    internal val renderedChildren: List<OneNativeComposeNodeView>
        get() = logicalChildren

    internal val renderedBooleanValue: Boolean
        get() = controlledBoolean.value

    internal val renderedTextValue: String
        get() = boundSyncText?.value as? String ?: controlledText.value

    internal val renderedFocusValue: Boolean
        get() = controlledFocus.value

    internal val renderedNumberValue: Double
        get() = controlledNumber.value

    internal val renderedNodeKind: String
        get() = committedProps.nodeType
            ?.trim()
            ?.lowercase()
            ?: "box"

    internal val logicalChildCount: Int
        get() = logicalChildren.size

    internal fun logicalChildAt(index: Int): OneNativeComposeNodeView = logicalChildren[index]

    internal fun addLogicalChild(child: OneNativeComposeNodeView, index: Int) {
        check(child !== this) { "OneNativeComposeNode cannot contain itself" }
        var ancestor = this
        while (ancestor.logicalParent != null) {
            ancestor = ancestor.logicalParent!!
            check(child !== ancestor) { "OneNativeComposeNode cannot contain one of its ancestors" }
        }
        child.logicalParent?.removeLogicalChild(child)
        val insertionIndex = index.coerceIn(0, logicalChildren.size)
        logicalChildren.add(insertionIndex, child)
        child.logicalParent = this
        child.setCompositionActive(compositionActive)
    }

    internal fun removeLogicalChildAt(index: Int) {
        removeLogicalChild(logicalChildren[index])
    }

    internal fun removeLogicalChild(child: OneNativeComposeNodeView) {
        if (logicalChildren.remove(child)) {
            child.logicalParent = null
            child.setCompositionActive(false)
        }
    }

    internal fun commitPendingProps() {
        val next = pendingProps
        committedProps = next
        controlledBoolean.applyProps(
            suppliedValue = next.value,
            acknowledgedEvent = next.acknowledgedEvent,
            suppliedRevision = next.revision,
        )
        controlledText.applyProps(
            suppliedValue = next.textValue.orEmpty(),
            acknowledgedEvent = next.acknowledgedEvent,
            suppliedRevision = next.revision,
        )
        controlledFocus.applyProps(
            suppliedValue = next.focused,
            acknowledgedEvent = next.acknowledgedFocusEvent,
            suppliedRevision = next.focusRevision,
        )
        controlledNumber.applyProps(
            suppliedValue = next.numberValue.takeIf { it.isFinite() } ?: 0.0,
            acknowledgedEvent = next.acknowledgedEvent,
            suppliedRevision = next.revision,
        )
        bindSyncText(next.syncStateId)
    }

    private fun bindSyncText(id: Int) {
        if (id == boundSyncId) return
        boundSyncId = id
        val bound = if (id == 0) null else OneNativeSyncRegistry.stateOf(id)
        boundSyncText = bound
        (bound?.value as? String)?.let { controlledText.adopt(it) }
    }

    internal fun invalidateComposeSemantics() {
        semanticsVersion += 1
    }

    internal fun observeComposeSemantics() {
        semanticsVersion
    }

    internal fun stageNodeType(value: String?) {
        pendingProps = pendingProps.copy(nodeType = value)
    }

    internal fun stageText(value: String?) {
        pendingProps = pendingProps.copy(text = value)
    }

    internal fun stageFontSize(value: Double) {
        pendingProps = pendingProps.copy(fontSize = value)
    }

    internal fun stageFontWeight(value: String?) {
        pendingProps = pendingProps.copy(fontWeight = value)
    }

    internal fun stageTextAlign(value: String?) {
        pendingProps = pendingProps.copy(textAlign = value)
    }

    internal fun stageMaxLines(value: Int) {
        pendingProps = pendingProps.copy(maxLines = value)
    }

    internal fun stageLabel(value: String?) {
        pendingProps = pendingProps.copy(label = value)
    }

    internal fun stageDisabled(value: Boolean) {
        pendingProps = pendingProps.copy(disabled = value)
    }

    internal fun stageVariant(value: String?) {
        pendingProps = pendingProps.copy(variant = value)
    }

    internal fun stageTone(value: String?) {
        pendingProps = pendingProps.copy(tone = value)
    }

    internal fun stageIcon(value: String?) {
        pendingProps = pendingProps.copy(icon = value)
    }

    internal fun stageIconFilled(value: Boolean) {
        pendingProps = pendingProps.copy(iconFilled = value)
    }

    internal fun stageColorRole(value: String?) {
        pendingProps = pendingProps.copy(colorRole = value)
    }

    internal fun stageValue(value: Boolean) {
        pendingProps = pendingProps.copy(value = value)
    }

    internal fun stageNativeClickable(value: Boolean) {
        pendingProps = pendingProps.copy(nativeClickable = value)
    }

    internal fun stageCheckboxColors(value: ReadableMap?) {
        pendingProps = pendingProps.copy(checkboxColors = OneNativeCheckboxColors.fromMap(value, context))
    }

    internal fun stageSelected(value: Boolean) {
        pendingProps = pendingProps.copy(selected = value)
    }

    internal fun stageRadioColors(value: ReadableMap?) {
        pendingProps = pendingProps.copy(radioColors = OneNativeRadioColors.fromMap(value, context))
    }

    internal fun stageAcknowledgedEvent(value: Int) {
        pendingProps = pendingProps.copy(acknowledgedEvent = value)
    }

    internal fun stageRevision(value: Int) {
        pendingProps = pendingProps.copy(revision = value)
    }

    internal fun stageAlignment(value: String?) {
        pendingProps = pendingProps.copy(alignment = value)
    }

    internal fun stageArrangement(value: String?) {
        pendingProps = pendingProps.copy(arrangement = value)
    }

    internal fun stageSpacing(value: Double) {
        pendingProps = pendingProps.copy(spacing = value)
    }

    internal fun stageTextValue(value: String?) {
        pendingProps = pendingProps.copy(textValue = value)
    }

    internal fun stageSyncStateId(value: Int) {
        pendingProps = pendingProps.copy(syncStateId = value)
    }

    internal fun stagePlaceholder(value: String?) {
        pendingProps = pendingProps.copy(placeholder = value)
    }

    internal fun stageKeyboardType(value: String?) {
        pendingProps = pendingProps.copy(keyboardType = value)
    }

    internal fun stageSecureText(value: Boolean) {
        pendingProps = pendingProps.copy(secureText = value)
    }

    internal fun stageFocused(value: Boolean) {
        pendingProps = pendingProps.copy(focused = value)
    }

    internal fun stageFocusRevision(value: Int) {
        pendingProps = pendingProps.copy(focusRevision = value)
    }

    internal fun stageAcknowledgedFocusEvent(value: Int) {
        pendingProps = pendingProps.copy(acknowledgedFocusEvent = value)
    }

    internal fun stageImeAction(value: String?) {
        pendingProps = pendingProps.copy(imeAction = value)
    }

    internal fun stageMaxLength(value: Int) {
        pendingProps = pendingProps.copy(maxLength = value)
    }

    internal fun stageMultiline(value: Boolean) {
        pendingProps = pendingProps.copy(multiline = value)
    }

    internal fun stageCapitalization(value: String?) {
        pendingProps = pendingProps.copy(capitalization = value)
    }

    internal fun stageAutoCorrect(value: Boolean?) {
        pendingProps = pendingProps.copy(autoCorrect = value)
    }

    internal fun stageNumberValue(value: Double) {
        pendingProps = pendingProps.copy(numberValue = value)
    }

    internal fun stageMinimumValue(value: Double) {
        pendingProps = pendingProps.copy(minimumValue = value)
    }

    internal fun stageMaximumValue(value: Double) {
        pendingProps = pendingProps.copy(maximumValue = value)
    }

    internal fun stageStep(value: Double) {
        pendingProps = pendingProps.copy(step = value)
    }

    internal fun stageVisible(value: Boolean) {
        pendingProps = pendingProps.copy(visible = value)
    }

    internal fun stageTitle(value: String?) {
        pendingProps = pendingProps.copy(title = value)
    }

    internal fun stageMessage(value: String?) {
        pendingProps = pendingProps.copy(message = value)
    }

    internal fun stageConfirmLabel(value: String?) {
        pendingProps = pendingProps.copy(confirmLabel = value)
    }

    internal fun stageDismissLabel(value: String?) {
        pendingProps = pendingProps.copy(dismissLabel = value)
    }

    internal fun stageProgress(value: Double) {
        pendingProps = pendingProps.copy(progress = value)
    }

    internal fun stageProgressVariant(value: String?) {
        pendingProps = pendingProps.copy(progressVariant = value)
    }

    internal fun stageComposeStyle(value: ReadableMap?) {
        pendingProps = pendingProps.copy(composeStyle = OneNativeComposeStyle.fromMap(value, context))
    }

    internal fun handlePress() {
        if (!compositionActive || committedProps.disabled || !isEnabled) return
        pressEventCount += 1
        UIManagerHelper.getEventDispatcher(UIManagerHelper.getReactContext(this))?.dispatchEvent(
            OneNativeComposeNodeButtonPressEvent(
                surfaceId = UIManagerHelper.getSurfaceId(this),
                viewTag = id,
                eventCount = pressEventCount,
            )
        )
    }

    internal fun handleBooleanChanged(nextValue: Boolean) {
        if (!compositionActive || committedProps.disabled || !isEnabled) return
        val eventCount = controlledBoolean.change(nextValue) ?: return
        UIManagerHelper.getEventDispatcher(UIManagerHelper.getReactContext(this))?.dispatchEvent(
            OneNativeComposeNodeBooleanValueChangeEvent(
                surfaceId = UIManagerHelper.getSurfaceId(this),
                viewTag = id,
                value = nextValue,
                eventCount = eventCount,
                revision = controlledBoolean.revision,
            )
        )
    }

    internal fun handleTextChanged(nextValue: String) {
        if (!compositionActive || committedProps.disabled || !isEnabled) return
        val eventCount = controlledText.change(nextValue) ?: return
        if (boundSyncId != 0) {
            OneNativeSyncRegistry.set(boundSyncId, nextValue)
            OneNativeSyncJni.nativeDidSetExternally(boundSyncId)
        }
        UIManagerHelper.getEventDispatcher(UIManagerHelper.getReactContext(this))?.dispatchEvent(
            OneNativeComposeNodeTextValueChangeEvent(
                surfaceId = UIManagerHelper.getSurfaceId(this),
                viewTag = id,
                text = nextValue,
                eventCount = eventCount,
                revision = controlledText.revision,
            )
        )
    }

    internal fun handleFocusChanged(nextValue: Boolean) {
        if (!compositionActive || committedProps.disabled || !isEnabled) return
        val eventCount = controlledFocus.change(nextValue) ?: return
        UIManagerHelper.getEventDispatcher(UIManagerHelper.getReactContext(this))?.dispatchEvent(
            OneNativeComposeNodeTextFieldFocusChangeEvent(
                surfaceId = UIManagerHelper.getSurfaceId(this),
                viewTag = id,
                value = nextValue,
                eventCount = eventCount,
                revision = controlledFocus.revision,
            )
        )
    }

    internal fun handleSubmit() {
        if (!compositionActive || committedProps.disabled || !isEnabled) return
        submitEventCount += 1
        UIManagerHelper.getEventDispatcher(UIManagerHelper.getReactContext(this))?.dispatchEvent(
            OneNativeComposeNodeTextFieldSubmitEvent(
                surfaceId = UIManagerHelper.getSurfaceId(this),
                viewTag = id,
                eventCount = submitEventCount,
            )
        )
    }

    internal fun handleNumberChanged(nextValue: Double) {
        if (!compositionActive || committedProps.disabled || !isEnabled) return
        val eventCount = controlledNumber.change(nextValue) ?: return
        UIManagerHelper.getEventDispatcher(UIManagerHelper.getReactContext(this))?.dispatchEvent(
            OneNativeComposeNodeNumberValueChangeEvent(
                surfaceId = UIManagerHelper.getSurfaceId(this),
                viewTag = id,
                value = nextValue,
                eventCount = eventCount,
                revision = controlledNumber.revision,
            )
        )
    }

    internal fun handleDialogConfirm() {
        if (!compositionActive) return
        dialogEventCount += 1
        UIManagerHelper.getEventDispatcher(UIManagerHelper.getReactContext(this))?.dispatchEvent(
            OneNativeComposeNodeDialogConfirmEvent(
                surfaceId = UIManagerHelper.getSurfaceId(this),
                viewTag = id,
                eventCount = dialogEventCount,
            )
        )
    }

    internal fun handleDialogDismiss() {
        if (!compositionActive) return
        dialogEventCount += 1
        UIManagerHelper.getEventDispatcher(UIManagerHelper.getReactContext(this))?.dispatchEvent(
            OneNativeComposeNodeDialogDismissEvent(
                surfaceId = UIManagerHelper.getSurfaceId(this),
                viewTag = id,
                eventCount = dialogEventCount,
            )
        )
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val maxDimension =
            (4096f * resources.displayMetrics.density).toInt().coerceAtLeast(1)
        val density = resources.displayMetrics.density.toDouble().takeIf { it.isFinite() && it > 0 } ?: 1.0
        val styleWidth =
            committedProps.composeStyle.width.takeIf { it >= 0 }?.times(density) ?: 0.0
        val styleHeight =
            committedProps.composeStyle.height.takeIf { it >= 0 }?.times(density) ?: 0.0

        val measuredWidth =
            when (MeasureSpec.getMode(widthMeasureSpec)) {
                MeasureSpec.EXACTLY -> MeasureSpec.getSize(widthMeasureSpec)
                MeasureSpec.AT_MOST ->
                    (if (committedProps.composeStyle.fillMaxWidth) {
                        MeasureSpec.getSize(widthMeasureSpec)
                    } else {
                        styleWidth.toInt()
                    }).coerceAtMost(MeasureSpec.getSize(widthMeasureSpec))
                else -> styleWidth.toInt().coerceAtMost(maxDimension)
            }
        val measuredHeight =
            when (MeasureSpec.getMode(heightMeasureSpec)) {
                MeasureSpec.EXACTLY -> MeasureSpec.getSize(heightMeasureSpec)
                MeasureSpec.AT_MOST ->
                    (if (committedProps.composeStyle.fillMaxHeight) {
                        MeasureSpec.getSize(heightMeasureSpec)
                    } else {
                        styleHeight.toInt()
                    }).coerceAtMost(MeasureSpec.getSize(heightMeasureSpec))
                else -> styleHeight.toInt().coerceAtMost(maxDimension)
            }
        setMeasuredDimension(measuredWidth, measuredHeight)
    }

    override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
        layoutComposeContent()
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        setCompositionActive(true)
        post {
            layoutComposeContent()
        }
    }

    private fun layoutComposeContent() {
        if (!composeView.isAttachedToWindow || width <= 0 || height <= 0) return
        composeView.measure(
            MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
            MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY),
        )
        composeView.layout(0, 0, width, height)
    }

    override fun onDetachedFromWindow() {
        setCompositionActive(false)
        super.onDetachedFromWindow()
    }

    internal fun resetForReuse() {
        setCompositionActive(false)
        logicalChildren.forEach { child ->
            child.logicalParent = null
            child.setCompositionActive(false)
        }
        logicalChildren.clear()
        logicalParent = null
        if (composeView.hasComposition) composeView.disposeComposition()
        pendingProps = OneNativeComposeNodeProps()
        committedProps = OneNativeComposeNodeProps()
        controlledBoolean.reset(false)
        controlledText.reset("")
        controlledFocus.reset(false)
        controlledNumber.reset(0.0)
        pressEventCount = 0
        dialogEventCount = 0
        submitEventCount = 0
        semanticsVersion = 0
    }

    private fun setCompositionActive(active: Boolean) {
        if (compositionActive == active) return
        compositionActive = active
        logicalChildren.forEach { child -> child.setCompositionActive(active) }
    }
}

@Composable
private fun RenderComposeNode(
    node: OneNativeComposeNodeView,
    outerModifier: Modifier = Modifier,
) {
    val props = node.renderedProps
    val style = props.composeStyle
    val modifier = outerModifier.applyComposeStyle(style).applyReactSemantics(node, props)
    val foregroundColor = style.foregroundColor?.let(::Color) ?: resolveColorRole(props.colorRole)

    if (foregroundColor != null) {
        androidx.compose.runtime.CompositionLocalProvider(LocalContentColor provides foregroundColor) {
            RenderComposeNodeBody(node, props, modifier)
        }
    } else {
        RenderComposeNodeBody(node, props, modifier)
    }
}

@Composable
private fun RenderComposeNodeBody(
    node: OneNativeComposeNodeView,
    props: OneNativeComposeNodeProps,
    modifier: Modifier,
) {
    when (node.renderedNodeKind) {
        "column" ->
            Column(
                modifier = modifier,
                verticalArrangement = columnArrangement(props.arrangement, props.spacing),
                horizontalAlignment = columnAlignment(props.alignment),
            ) {
                RenderComposeChildren(node)
            }
        "row" ->
            Row(
                modifier = modifier,
                horizontalArrangement = rowArrangement(props.arrangement, props.spacing),
                verticalAlignment = rowAlignment(props.alignment),
            ) {
                RenderComposeChildren(node)
            }
        "box" ->
            Box(
                modifier = modifier,
                contentAlignment = boxAlignment(props.alignment),
            ) {
                RenderComposeChildren(node)
            }
        "text" ->
            Text(
                text = props.text.orEmpty(),
                modifier = modifier,
                fontSize = props.fontSize.composeTextUnit(),
                fontWeight = composeFontWeight(props.fontWeight),
                textAlign = composeTextAlign(props.textAlign),
                maxLines = props.maxLines.coerceAtLeast(1).takeIf { props.maxLines > 0 } ?: Int.MAX_VALUE,
            )
        "icon" -> {
            val fontScale = LocalDensity.current.fontScale.takeIf { it > 0 } ?: 1f
            Text(
                text = props.text.orEmpty(),
                modifier = modifier,
                fontFamily = materialSymbolsFontFamily(props.iconFilled),
                fontSize = props.fontSize.composeIconTextUnit(fontScale),
            )
        }
        "button" -> RenderComposeButton(node, props, modifier)
        "switch" -> RenderComposeSwitch(node, props, modifier)
        "checkbox" ->
            Checkbox(
                checked = node.renderedBooleanValue,
                onCheckedChange = if (props.nativeClickable) node::handleBooleanChanged else null,
                modifier = modifier,
                enabled = !props.disabled && node.isEnabled,
                colors = CheckboxDefaults.colors(
                    checkedColor = props.checkboxColors.checkedColor?.let(::Color) ?: Color.Unspecified,
                    disabledCheckedColor = props.checkboxColors.disabledCheckedColor?.let(::Color) ?: Color.Unspecified,
                    uncheckedColor = props.checkboxColors.uncheckedColor?.let(::Color) ?: Color.Unspecified,
                    disabledUncheckedColor = props.checkboxColors.disabledUncheckedColor?.let(::Color) ?: Color.Unspecified,
                    checkmarkColor = props.checkboxColors.checkmarkColor?.let(::Color) ?: Color.Unspecified,
                ),
            )
        "radio" ->
            RadioButton(
                selected = props.selected,
                onClick = if (props.nativeClickable) node::handlePress else null,
                modifier = modifier,
                enabled = !props.disabled && node.isEnabled,
                colors = RadioButtonDefaults.colors(
                    selectedColor = props.radioColors.selectedColor?.let(::Color) ?: Color.Unspecified,
                    unselectedColor = props.radioColors.unselectedColor?.let(::Color) ?: Color.Unspecified,
                    disabledSelectedColor = props.radioColors.disabledSelectedColor?.let(::Color) ?: Color.Unspecified,
                    disabledUnselectedColor = props.radioColors.disabledUnselectedColor?.let(::Color) ?: Color.Unspecified,
                ),
            )
        "textfield" -> RenderComposeTextField(node, props, modifier)
        "slider" -> RenderComposeSlider(node, props, modifier)
        "alertdialog" -> RenderComposeAlertDialog(node, props, modifier)
        "dialog" ->
            if (props.visible) {
                Dialog(onDismissRequest = { node.handleDialogDismiss() }) {
                    Box(modifier = modifier) {
                        RenderComposeChildren(node)
                    }
                }
            }
        "progressindicator" -> RenderComposeProgressIndicator(props, modifier)
        else ->
            Box(modifier = modifier) {
                RenderComposeChildren(node)
            }
    }
}

@Composable
private fun OneNativeMaterialTheme(content: @Composable () -> Unit) {
    val context = LocalContext.current
    val configuration = LocalConfiguration.current
    val dark = configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK == Configuration.UI_MODE_NIGHT_YES
    val colorScheme =
        remember(context, configuration.uiMode) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (dark) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
            } else {
                if (dark) darkColorScheme() else lightColorScheme()
            }
        }
    MaterialTheme(colorScheme = colorScheme, content = content)
}

@Composable
private fun resolveColorRole(role: String?): Color? {
    val colors = MaterialTheme.colorScheme
    return when (role) {
        null, "" -> null
        "accent" -> colors.primary
        "primary" -> colors.onSurface
        "secondary" -> colors.onSurfaceVariant
        "tertiary" -> colors.onSurfaceVariant.copy(alpha = 0.60f)
        "danger" -> colors.error
        else -> error("unknown One.UI color role: $role")
    }
}

@Composable
private fun RenderComposeChildren(node: OneNativeComposeNodeView) {
    node.renderedChildren.forEach { child ->
        key(child) {
            RenderComposeNode(child)
        }
    }
}

@Composable
private fun RenderComposeButton(
    node: OneNativeComposeNodeView,
    props: OneNativeComposeNodeProps,
    modifier: Modifier,
) {
    val enabled = !props.disabled && node.isEnabled
    val danger = props.tone.equals("danger", ignoreCase = true)
    when (props.variant?.trim()?.lowercase()) {
        "outlined" ->
            OutlinedButton(
                onClick = { node.handlePress() },
                modifier = modifier,
                enabled = enabled,
                colors =
                    if (danger) {
                        ButtonDefaults.outlinedButtonColors(contentColor = DangerColor)
                    } else {
                        ButtonDefaults.outlinedButtonColors()
                    },
            ) {
                ComposeButtonContent(props)
            }
        "text" ->
            TextButton(
                onClick = { node.handlePress() },
                modifier = modifier,
                enabled = enabled,
                colors =
                    if (danger) {
                        ButtonDefaults.textButtonColors(contentColor = DangerColor)
                    } else {
                        ButtonDefaults.textButtonColors()
                    },
            ) {
                ComposeButtonContent(props)
            }
        else ->
            Button(
                onClick = { node.handlePress() },
                modifier = modifier,
                enabled = enabled,
                colors =
                    if (danger) {
                        ButtonDefaults.buttonColors(
                            containerColor = DangerColor,
                            contentColor = Color.White,
                        )
                    } else {
                        ButtonDefaults.buttonColors()
                    },
            ) {
                ComposeButtonContent(props)
            }
    }
}

@Composable
private fun RowScope.ComposeButtonContent(props: OneNativeComposeNodeProps) {
    val icon = props.icon
    if (!icon.isNullOrEmpty()) {
        val iconSize = ButtonDefaults.IconSize
        val fontScale = LocalDensity.current.fontScale.takeIf { it > 0 } ?: 1f
        Box(
            modifier = Modifier.size(iconSize),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = icon,
                fontFamily = materialSymbolsFontFamily(props.iconFilled),
                fontSize = iconSize.value.toDouble().composeIconTextUnit(fontScale),
            )
        }
        Spacer(Modifier.width(ButtonDefaults.IconSpacing))
    }
    Text(props.label.orEmpty())
}

@Composable
private fun RenderComposeSwitch(
    node: OneNativeComposeNodeView,
    props: OneNativeComposeNodeProps,
    modifier: Modifier,
) {
    val enabled = !props.disabled && node.isEnabled
    if (props.label.isNullOrEmpty()) {
        Switch(
            checked = node.renderedBooleanValue,
            onCheckedChange = node::handleBooleanChanged,
            modifier = modifier,
            enabled = enabled,
        )
    } else {
        Row(
            modifier =
                modifier.toggleable(
                    value = node.renderedBooleanValue,
                    enabled = enabled,
                    role = Role.Switch,
                    onValueChange = node::handleBooleanChanged,
                ),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(props.label, modifier = Modifier.weight(1f))
            Switch(
                checked = node.renderedBooleanValue,
                onCheckedChange = null,
                enabled = enabled,
            )
        }
    }
}

@Composable
private fun RenderComposeTextField(
    node: OneNativeComposeNodeView,
    props: OneNativeComposeNodeProps,
    modifier: Modifier,
) {
    val enabled = !props.disabled && node.isEnabled
    val label = props.label?.takeIf { it.isNotEmpty() }
    val placeholder = props.placeholder?.takeIf { it.isNotEmpty() }
    val labelContent: (@Composable () -> Unit)? =
        if (label == null) null else ({ Text(label) })
    val placeholderContent: (@Composable () -> Unit)? =
        if (placeholder == null) null else ({ Text(placeholder) })
    val keyboardOptions =
        KeyboardOptions(
            keyboardType = composeKeyboardType(props.keyboardType),
            imeAction = composeImeAction(props.imeAction),
            capitalization = composeCapitalization(props.capitalization),
            autoCorrectEnabled = props.autoCorrect ?: true,
        )
    val keyboardActions =
        KeyboardActions(
            onDone = { node.handleSubmit() },
            onGo = { node.handleSubmit() },
            onSearch = { node.handleSubmit() },
            onSend = { node.handleSubmit() },
        )
    val visualTransformation =
        if (props.secureText || props.keyboardType.equals("password", ignoreCase = true)) {
            PasswordVisualTransformation()
        } else {
            VisualTransformation.None
        }
    val textStyle =
        LocalTextStyle.current.merge(
            TextStyle(textAlign = composeTextAlign(props.textAlign) ?: TextAlign.Unspecified),
        )
    val focusRequester = remember { FocusRequester() }
    val focusManager = LocalFocusManager.current
    var fieldHasFocus by remember { mutableStateOf(false) }
    val wantFocus = node.renderedFocusValue
    LaunchedEffect(wantFocus) {
        if (wantFocus) {
            focusRequester.requestFocus()
        } else if (fieldHasFocus) {
            focusManager.clearFocus()
        }
    }
    val fieldModifier =
        modifier
            .focusRequester(focusRequester)
            .onFocusChanged { focusState ->
                fieldHasFocus = focusState.isFocused
                node.handleFocusChanged(focusState.isFocused)
            }
    val onValueChange: (String) -> Unit = { next ->
        val limit = props.maxLength
        node.handleTextChanged(if (limit > 0 && next.length > limit) next.take(limit) else next)
    }
    if (props.variant.equals("outlined", ignoreCase = true)) {
        OutlinedTextField(
            value = node.renderedTextValue,
            onValueChange = onValueChange,
            modifier = fieldModifier,
            enabled = enabled,
            label = labelContent,
            placeholder = placeholderContent,
            visualTransformation = visualTransformation,
            keyboardOptions = keyboardOptions,
            keyboardActions = keyboardActions,
            singleLine = !props.multiline,
            textStyle = textStyle,
        )
    } else {
        TextField(
            value = node.renderedTextValue,
            onValueChange = onValueChange,
            modifier = fieldModifier,
            enabled = enabled,
            label = labelContent,
            placeholder = placeholderContent,
            visualTransformation = visualTransformation,
            keyboardOptions = keyboardOptions,
            keyboardActions = keyboardActions,
            singleLine = !props.multiline,
            textStyle = textStyle,
        )
    }
}

@Composable
private fun RenderComposeSlider(
    node: OneNativeComposeNodeView,
    props: OneNativeComposeNodeProps,
    modifier: Modifier,
) {
    val enabled = !props.disabled && node.isEnabled
    val suppliedMinimum = props.minimumValue.takeIf { it.isFinite() } ?: 0.0
    val suppliedMaximum = props.maximumValue.takeIf { it.isFinite() } ?: 1.0
    val minimum =
        suppliedMinimum.toFloat()
    val maximum =
        suppliedMaximum.toFloat()
    val range = if (minimum < maximum) minimum..maximum else 0f..1f
    val coerced = node.renderedNumberValue.toFloat().coerceIn(range)
    val step = props.step.takeIf { it.isFinite() } ?: 0.0
    val intervalCount =
        if (step > 0) {
            ((suppliedMaximum - suppliedMinimum) / step).roundToInt().coerceIn(1, 1001)
        } else {
            1
        }
    val steps =
        if (step > 0) intervalCount - 1 else 0
    Slider(
        value = coerced,
        onValueChange = { value ->
            val next =
                if (step > 0) {
                    val offset = value.toDouble() - suppliedMinimum
                    (suppliedMinimum + (offset / step).roundToInt() * step)
                        .coerceIn(suppliedMinimum, suppliedMaximum)
                } else {
                    value.toDouble()
                }
            node.handleNumberChanged(next)
        },
        modifier = modifier,
        enabled = enabled,
        valueRange = range,
        steps = steps,
    )
}

@Composable
private fun RenderComposeAlertDialog(
    node: OneNativeComposeNodeView,
    props: OneNativeComposeNodeProps,
    modifier: Modifier,
) {
    if (!props.visible) return
    val title = props.title?.takeIf { it.isNotEmpty() }
    val message = props.message?.takeIf { it.isNotEmpty() }
    val dismissLabel = props.dismissLabel?.takeIf { it.isNotEmpty() }
    val titleContent: (@Composable () -> Unit)? =
        if (title == null) null else ({ Text(title) })
    val messageContent: (@Composable () -> Unit)? =
        if (message == null) null else ({ Text(message) })
    val dismissContent: (@Composable () -> Unit)? =
        if (dismissLabel == null) {
            null
        } else {
            ({
                TextButton(onClick = { node.handleDialogDismiss() }) {
                    Text(dismissLabel)
                }
            })
        }
    AlertDialog(
        onDismissRequest = { node.handleDialogDismiss() },
        confirmButton = {
            TextButton(onClick = { node.handleDialogConfirm() }) {
                Text(props.confirmLabel.orEmpty())
            }
        },
        modifier = modifier,
        dismissButton = dismissContent,
        title = titleContent,
        text = messageContent,
    )
}

@Composable
private fun RenderComposeProgressIndicator(
    props: OneNativeComposeNodeProps,
    modifier: Modifier,
) {
    val determinate = props.progress.isFinite() && props.progress >= 0
    val coerced = props.progress.coerceIn(0.0, 1.0).toFloat()
    if (props.progressVariant.equals("linear", ignoreCase = true)) {
        if (determinate) {
            LinearProgressIndicator(progress = { coerced }, modifier = modifier)
        } else {
            LinearProgressIndicator(modifier = modifier)
        }
    } else {
        if (determinate) {
            CircularProgressIndicator(progress = { coerced }, modifier = modifier)
        } else {
            CircularProgressIndicator(modifier = modifier)
        }
    }
}

private fun composeKeyboardType(value: String?): KeyboardType =
    when (value?.trim()?.lowercase()) {
        "number" -> KeyboardType.Number
        "decimal" -> KeyboardType.Decimal
        "email" -> KeyboardType.Email
        "password" -> KeyboardType.Password
        "phone" -> KeyboardType.Phone
        "url" -> KeyboardType.Uri
        else -> KeyboardType.Text
    }

private fun composeImeAction(value: String?): ImeAction =
    when (value?.trim()?.lowercase()) {
        "none" -> ImeAction.None
        "go" -> ImeAction.Go
        "search" -> ImeAction.Search
        "send" -> ImeAction.Send
        "previous" -> ImeAction.Previous
        "next" -> ImeAction.Next
        "done" -> ImeAction.Done
        else -> ImeAction.Default
    }

private fun composeCapitalization(value: String?): KeyboardCapitalization =
    when (value?.trim()?.lowercase()) {
        "none" -> KeyboardCapitalization.None
        "characters" -> KeyboardCapitalization.Characters
        "words" -> KeyboardCapitalization.Words
        "sentences" -> KeyboardCapitalization.Sentences
        else -> KeyboardCapitalization.Unspecified
    }

private fun Modifier.applyComposeStyle(style: OneNativeComposeStyle): Modifier {
    var result = this
    if (style.opacity >= 0) result = result.alpha(style.opacity.coerceIn(0.0, 1.0).toFloat())
    if (style.width >= 0) result = result.width(style.width.nonNegativeDp())
    if (style.height >= 0) result = result.height(style.height.nonNegativeDp())
    if (style.fillMaxWidth) result = result.fillMaxWidth()
    if (style.fillMaxHeight) result = result.fillMaxHeight()

    val shape =
        if (style.cornerRadius >= 0) RoundedCornerShape(style.cornerRadius.nonNegativeDp())
        else RectangleShape
    if (style.cornerRadius >= 0) result = result.clip(shape)
    style.backgroundColor?.let { color -> result = result.background(Color(color), shape) }
    if (style.borderColor != null && style.borderWidth >= 0) {
        result = result.border(BorderStroke(style.borderWidth.nonNegativeDp(), Color(style.borderColor)), shape)
    }

    val all = style.paddingValue(style.padding)
    val left = if (style.paddingLeft >= 0) style.paddingLeft.nonNegativeDp() else all.dp
    val top = if (style.paddingTop >= 0) style.paddingTop.nonNegativeDp() else all.dp
    val right = if (style.paddingRight >= 0) style.paddingRight.nonNegativeDp() else all.dp
    val bottom = if (style.paddingBottom >= 0) style.paddingBottom.nonNegativeDp() else all.dp
    if (style.padding >= 0 || style.paddingLeft >= 0 || style.paddingTop >= 0 || style.paddingRight >= 0 || style.paddingBottom >= 0) {
        result = result.padding(start = left, top = top, end = right, bottom = bottom)
    }
    return result
}

private fun Modifier.applyReactSemantics(
    node: OneNativeComposeNodeView,
    props: OneNativeComposeNodeProps,
): Modifier {
    node.observeComposeSemantics()
    val label = node.getTag(R.id.accessibility_label) as? String
    val testId = node.getTag(R.id.react_test_id) as? String
    val accessibilityValue = node.getTag(R.id.accessibility_value) as? ReadableMap
    val valueText =
        accessibilityValue?.takeIf { it.hasKey("text") && !it.isNull("text") }?.getString("text")
    val accessibilityState = node.getTag(R.id.accessibility_state) as? ReadableMap
    val stateDisabled =
        accessibilityState?.takeIf { it.hasKey("disabled") && !it.isNull("disabled") }?.getBoolean("disabled") == true
    val explicitRole = node.getTag(R.id.accessibility_role)?.toString()
        ?: node.getTag(R.id.role)?.toString()
    val normalizedRole = explicitRole?.lowercase()?.substringAfterLast('.')
    val semanticRole =
        composeRole(normalizedRole)
            ?: when (node.renderedNodeKind) {
                "button" -> Role.Button
                "switch" -> Role.Switch
                "checkbox" -> Role.Checkbox
                "radio" -> Role.RadioButton
                "icon" -> Role.Image
                else -> null
            }
    val isDialog =
        node.renderedNodeKind == "alertdialog" ||
            node.renderedNodeKind == "dialog" ||
            normalizedRole == "dialog" ||
            normalizedRole == "alert"
    val isProgressBar =
        node.renderedNodeKind == "progressindicator" || normalizedRole == "progressbar"
    val isHeading = normalizedRole == "header"

    var result = this
    // natively mounted nodes already expose testID as the view resource-id via
    // Fabric; only logical-only children need the compose testTag.
    val needsComposeTag = !testId.isNullOrEmpty() && node.parent == null
    if (needsComposeTag) result = result.testTag(testId)
    val mergeDescendants = node.renderedNodeKind == "button" || node.renderedNodeKind == "switch" || node.renderedNodeKind == "checkbox" || node.renderedNodeKind == "radio"
    return result.semantics(mergeDescendants = mergeDescendants) {
        if (node.renderedNodeKind == "icon" && label.isNullOrEmpty()) invisibleToUser()
        if (!label.isNullOrEmpty()) contentDescription = label
        if (!valueText.isNullOrEmpty()) stateDescription = valueText
        if (props.disabled || stateDisabled || !node.isEnabled) disabled()
        if (semanticRole != null) role = semanticRole
        if (isDialog) dialog()
        if (isProgressBar) {
            progressBarRangeInfo =
                props.progress.takeIf { it.isFinite() && it >= 0 }
                    ?.let { ProgressBarRangeInfo(it.toFloat().coerceIn(0f, 1f), 0f..1f) }
                    ?: ProgressBarRangeInfo.Indeterminate
        }
        if (isHeading) heading()
        if (needsComposeTag) testTagsAsResourceId = true
    }
}

private fun composeRole(value: String?): Role? =
    when (value) {
        "button", "link" -> Role.Button
        "switch" -> Role.Switch
        "checkbox" -> Role.Checkbox
        "radio" -> Role.RadioButton
        else -> null
    }

private fun columnAlignment(value: String?): Alignment.Horizontal =
    when (value?.trim()?.lowercase()) {
        "center", "centerhorizontally" -> Alignment.CenterHorizontally
        "trailing", "end", "right" -> Alignment.End
        else -> Alignment.Start
    }

private fun rowAlignment(value: String?): Alignment.Vertical =
    when (value?.trim()?.lowercase()) {
        "center", "centervertically" -> Alignment.CenterVertically
        "trailing", "bottom" -> Alignment.Bottom
        else -> Alignment.Top
    }

private fun columnArrangement(value: String?, spacing: Double): Arrangement.Vertical {
    val normalized = value?.trim()?.lowercase()
    if (spacing >= 0) {
        val alignment =
            when (normalized) {
                "center" -> Alignment.CenterVertically
                "bottom" -> Alignment.Bottom
                else -> Alignment.Top
            }
        return Arrangement.spacedBy(spacing.nonNegativeDp(), alignment)
    }
    return when (normalized) {
        "center" -> Arrangement.Center
        "bottom" -> Arrangement.Bottom
        "spacebetween" -> Arrangement.SpaceBetween
        "spacearound" -> Arrangement.SpaceAround
        "spaceevenly" -> Arrangement.SpaceEvenly
        else -> Arrangement.Top
    }
}

private fun rowArrangement(value: String?, spacing: Double): Arrangement.Horizontal {
    val normalized = value?.trim()?.lowercase()
    if (spacing >= 0) {
        val alignment =
            when (normalized) {
                "center" -> Alignment.CenterHorizontally
                "end" -> Alignment.End
                else -> Alignment.Start
            }
        return Arrangement.spacedBy(spacing.nonNegativeDp(), alignment)
    }
    return when (normalized) {
        "center" -> Arrangement.Center
        "end" -> Arrangement.End
        "spacebetween" -> Arrangement.SpaceBetween
        "spacearound" -> Arrangement.SpaceAround
        "spaceevenly" -> Arrangement.SpaceEvenly
        else -> Arrangement.Start
    }
}

private fun boxAlignment(value: String?): Alignment =
    when (value?.trim()?.lowercase()) {
        "topstart" -> Alignment.TopStart
        "topcenter" -> Alignment.TopCenter
        "topend" -> Alignment.TopEnd
        "centerstart", "start" -> Alignment.CenterStart
        "center" -> Alignment.Center
        "centerend", "end" -> Alignment.CenterEnd
        "bottomstart" -> Alignment.BottomStart
        "bottomcenter", "bottom" -> Alignment.BottomCenter
        "bottomend" -> Alignment.BottomEnd
        "top" -> Alignment.TopCenter
        else -> Alignment.TopStart
    }

private fun composeFontWeight(value: String?): FontWeight? {
    val normalized = value?.trim()?.lowercase() ?: return null
    normalized.toIntOrNull()?.let { numeric ->
        return FontWeight(numeric.coerceIn(1, 1000))
    }
    return when (normalized) {
        "thin" -> FontWeight.Thin
        "extralight", "extra-light" -> FontWeight.ExtraLight
        "light" -> FontWeight.Light
        "normal", "regular" -> FontWeight.Normal
        "medium" -> FontWeight.Medium
        "semibold", "semi-bold" -> FontWeight.SemiBold
        "bold" -> FontWeight.Bold
        "extrabold", "extra-bold" -> FontWeight.ExtraBold
        "black" -> FontWeight.Black
        else -> null
    }
}

private fun composeTextAlign(value: String?): TextAlign? =
    when (value?.trim()?.lowercase()) {
        "start" -> TextAlign.Start
        "end" -> TextAlign.End
        "left" -> TextAlign.Left
        "right" -> TextAlign.Right
        "center" -> TextAlign.Center
        "justify" -> TextAlign.Justify
        else -> null
    }

private fun Double.composeTextUnit(): TextUnit =
    if (isFinite() && this > 0) toFloat().sp else TextUnit.Unspecified

// icon sizes are dp, not text, so a size stays the same physical box at every font scale
private fun Double.composeIconTextUnit(fontScale: Float): TextUnit =
    if (isFinite() && this > 0) (this / fontScale).toFloat().sp else TextUnit.Unspecified

private fun Double.nonNegativeDp() = nonNegative().toFloat().dp

private fun Double.nonNegative(): Double = if (isFinite()) coerceAtLeast(0.0) else 0.0

private fun OneNativeComposeStyle.paddingValue(value: Double): Double = value.nonNegative()

private val MaterialSymbolsOutlined = FontFamily(Font(OneR.font.material_symbols_outlined))
private val MaterialSymbolsFilled = FontFamily(Font(OneR.font.material_symbols_filled))

private fun materialSymbolsFontFamily(filled: Boolean): FontFamily =
    if (filled) MaterialSymbolsFilled else MaterialSymbolsOutlined

private val DangerColor = Color(AndroidColor.rgb(186, 26, 26))
