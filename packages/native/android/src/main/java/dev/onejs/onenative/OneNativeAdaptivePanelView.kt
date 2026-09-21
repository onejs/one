package dev.onejs.onenative

import android.content.Context
import android.view.Gravity
import android.view.View
import androidx.coordinatorlayout.widget.CoordinatorLayout
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableType
import com.facebook.react.uimanager.UIManagerHelper
import com.google.android.material.bottomsheet.BottomSheetBehavior
import kotlin.math.abs

private class AdaptivePanelControlled<T>(initial: T) {
    var value: T = initial
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

    fun reset(to: T) {
        value = to
        eventCount = 0
        revision = 0
    }
}

internal data class AdaptivePanelDetent(val type: String, val value: Double) {
    val key: String get() = "$type:$value"
}

internal data class AdaptivePanelProps(
    val open: Boolean = false,
    val acknowledgedEvent: Int = 0,
    val revision: Int = 0,
    val detents: List<AdaptivePanelDetent> = listOf(AdaptivePanelDetent("large", 0.0)),
    val selectedType: String = "",
    val selectedValue: Double = 0.0,
    val acknowledgedDetentEvent: Int = 0,
    val detentRevision: Int = 0,
    val regularWidth: Double = 320.0,
)

class OneNativeAdaptivePanelView(context: Context) : CoordinatorLayout(context) {
    private var pendingProps = AdaptivePanelProps()
    private var committedProps = AdaptivePanelProps()
    private val controlledOpen = AdaptivePanelControlled(false)
    private val controlledDetent = AdaptivePanelControlled("")
    private var panelContent: View? = null
    private var behavior: BottomSheetBehavior<View>? = null
    private var active = false
    private var lastPlacement = ""
    private var lastFrame = doubleArrayOf(0.0, 0.0, 0.0, 0.0)
    private var applyingState = false

    private val sheetCallback =
        object : BottomSheetBehavior.BottomSheetCallback() {
            override fun onStateChanged(bottomSheet: View, newState: Int) {
                if (!active || applyingState) return
                if (newState == BottomSheetBehavior.STATE_HIDDEN) {
                    if (!controlledOpen.value) return
                    val eventCount = controlledOpen.change(false) ?: return
                    dispatchOpen(false, eventCount, controlledOpen.revision)
                    post { reportLayout() }
                    return
                }
                if (committedProps.selectedType.isEmpty()) return
                val detent =
                    when (newState) {
                        BottomSheetBehavior.STATE_EXPANDED ->
                            committedProps.detents.firstOrNull { it.type == "large" }
                        BottomSheetBehavior.STATE_COLLAPSED -> peekDetent()
                        else -> null
                    } ?: return
                val eventCount = controlledDetent.change(detent.key) ?: return
                UIManagerHelper.getEventDispatcher(UIManagerHelper.getReactContext(this@OneNativeAdaptivePanelView))
                    ?.dispatchEvent(
                        OneNativeAdaptivePanelDetentChangeEvent(
                            surfaceId = UIManagerHelper.getSurfaceId(this@OneNativeAdaptivePanelView),
                            viewTag = id,
                            type = detent.type,
                            value = detent.value,
                            eventCount = eventCount,
                            revision = controlledDetent.revision,
                        ),
                    )
            }

            override fun onSlide(bottomSheet: View, slideOffset: Float) {
                // frame follows through the layout listener.
            }
        }

    private val contentLayoutListener =
        OnLayoutChangeListener { _, _, _, _, _, _, _, _, _ ->
            reportLayout()
        }

    init {
        // transparent nonmodal host: touches outside the panel fall through to
        // the canvas because the js wrapper sets pointerEvents box-none.
        setBackgroundColor(android.graphics.Color.TRANSPARENT)
        isClickable = false
        isFocusable = false
    }

    internal fun setPanelContent(child: View) {
        if (panelContent === child) return
        panelContent?.let {
            it.removeOnLayoutChangeListener(contentLayoutListener)
            removeView(it)
        }
        // detach behavior from the previous params, if any.
        behavior = null
        panelContent = child
        addView(child)
        child.addOnLayoutChangeListener(contentLayoutListener)
        applyLayout()
    }

    internal fun clearPanelContent(child: View) {
        if (panelContent !== child) return
        child.removeOnLayoutChangeListener(contentLayoutListener)
        removeView(child)
        panelContent = null
        behavior = null
    }

    internal fun stageOpen(value: Boolean) {
        pendingProps = pendingProps.copy(open = value)
    }

    internal fun stageAcknowledgedEvent(value: Int) {
        pendingProps = pendingProps.copy(acknowledgedEvent = value)
    }

    internal fun stageRevision(value: Int) {
        pendingProps = pendingProps.copy(revision = value)
    }

    internal fun stageDetents(value: ReadableArray?) {
        if (value == null) return
        val detents = mutableListOf<AdaptivePanelDetent>()
        for (i in 0 until value.size()) {
            if (value.getType(i) != ReadableType.Map) continue
            val item = value.getMap(i) ?: continue
            val type = item.getString("type") ?: continue
            val detentValue =
                if (item.hasKey("value") && !item.isNull("value") &&
                    item.getType("value") == ReadableType.Number
                ) {
                    item.getDouble("value")
                } else {
                    0.0
                }
            detents.add(AdaptivePanelDetent(type, detentValue))
        }
        if (detents.isNotEmpty()) {
            pendingProps = pendingProps.copy(detents = detents)
        }
    }

    internal fun stageSelectedDetentType(value: String?) {
        pendingProps = pendingProps.copy(selectedType = value.orEmpty())
    }

    internal fun stageSelectedDetentValue(value: Double) {
        pendingProps = pendingProps.copy(selectedValue = value)
    }

    internal fun stageAcknowledgedDetentEvent(value: Int) {
        pendingProps = pendingProps.copy(acknowledgedDetentEvent = value)
    }

    internal fun stageDetentRevision(value: Int) {
        pendingProps = pendingProps.copy(detentRevision = value)
    }

    internal fun stageRegularWidth(value: Double) {
        if (value.isFinite() && value > 0) {
            pendingProps = pendingProps.copy(regularWidth = value)
        }
    }

    internal fun commitPendingProps() {
        val next = pendingProps
        committedProps = next
        controlledOpen.applyProps(
            suppliedValue = next.open,
            acknowledgedEvent = next.acknowledgedEvent,
            suppliedRevision = next.revision,
        )
        val selectedKey =
            if (next.selectedType.isEmpty()) "" else "${next.selectedType}:${next.selectedValue}"
        controlledDetent.applyProps(
            suppliedValue = selectedKey,
            acknowledgedEvent = next.acknowledgedDetentEvent,
            suppliedRevision = next.detentRevision,
        )
        applyLayout()
    }

    private fun placement(): String {
        if (!controlledOpen.value) return "hidden"
        val widthDp = resources.configuration.screenWidthDp
        return if (widthDp in 1 until 600) "compact" else "regular"
    }

    private fun peekDetent(): AdaptivePanelDetent {
        val detents = committedProps.detents
        if (committedProps.selectedType.isNotEmpty()) {
            detents.firstOrNull {
                it.type == committedProps.selectedType && it.value == committedProps.selectedValue
            }?.takeIf { it.type != "large" }?.let { return it }
        }
        return detents.firstOrNull { it.type != "large" } ?: detents.first()
    }

    private fun peekHeightPx(parentHeightPx: Int): Int {
        if (parentHeightPx <= 0) return 0
        val detent = peekDetent()
        val density = resources.displayMetrics.density.toDouble().takeIf { it > 0 } ?: 1.0
        return when (detent.type) {
            "medium" -> (parentHeightPx * 0.5).toInt()
            "fraction" -> (parentHeightPx * detent.value.coerceIn(0.0, 1.0)).toInt()
            "height" -> (detent.value * density).toInt().coerceAtMost(parentHeightPx)
            else -> parentHeightPx
        }.coerceAtLeast(1)
    }

    private fun applyLayout() {
        val content = panelContent ?: run {
            reportLayout()
            return
        }
        if (height <= 0 && controlledOpen.value) {
            post { applyLayout() }
            return
        }
        val placement = placement()
        if (placement == "hidden") {
            content.visibility = View.GONE
            reportLayout()
            return
        }
        content.visibility = View.VISIBLE
        if (placement == "regular") {
            val density = resources.displayMetrics.density.toDouble().takeIf { it > 0 } ?: 1.0
            val widthPx = (committedProps.regularWidth * density).toInt().coerceAtLeast(1)
            val params =
                (content.layoutParams as? LayoutParams)
                    ?: LayoutParams(widthPx, LayoutParams.MATCH_PARENT)
            params.width = widthPx
            params.height = LayoutParams.MATCH_PARENT
            params.gravity = Gravity.END
            params.behavior = null
            behavior = null
            content.layoutParams = params
            content.requestLayout()
            post { reportLayout() }
            return
        }
        // compact bottom sheet, nonmodal: the host stays transparent and the
        // sheet never takes the whole window, so the canvas keeps touches.
        val params =
            (content.layoutParams as? LayoutParams)
                ?: LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
        params.width = LayoutParams.MATCH_PARENT
        params.height = LayoutParams.MATCH_PARENT
        params.gravity = Gravity.BOTTOM
        var sheet = params.behavior as? BottomSheetBehavior<View>
        if (sheet == null) {
            sheet = BottomSheetBehavior<View>()
            sheet.addBottomSheetCallback(sheetCallback)
            params.behavior = sheet
        }
        behavior = sheet
        content.layoutParams = params
        val detents = committedProps.detents
        val hasLarge = detents.any { it.type == "large" }
        val onlyLarge = detents.size == 1 && hasLarge
        sheet.isHideable = true
        sheet.skipCollapsed = onlyLarge
        val peek = peekHeightPx(height)
        if (peek > 0) sheet.peekHeight = peek
        if (!hasLarge) {
            sheet.expandedOffset = (height - peek).coerceAtLeast(0)
        } else {
            sheet.expandedOffset = 0
        }
        val selectedIsLarge =
            committedProps.selectedType == "large" ||
                (committedProps.selectedType.isEmpty() && detents.firstOrNull()?.type == "large")
        val target =
            if (selectedIsLarge) BottomSheetBehavior.STATE_EXPANDED
            else BottomSheetBehavior.STATE_COLLAPSED
        applyingState = true
        try {
            if (sheet.state != target) sheet.state = target
        } finally {
            // the state settles asynchronously; the callback stays muted until
            // the next frame so a programmatic move never echoes as a detent.
            post { applyingState = false }
        }
        content.requestLayout()
        post { reportLayout() }
    }

    private fun dispatchOpen(open: Boolean, eventCount: Int, revision: Int) {
        UIManagerHelper.getEventDispatcher(UIManagerHelper.getReactContext(this))?.dispatchEvent(
            OneNativeAdaptivePanelOpenChangeEvent(
                surfaceId = UIManagerHelper.getSurfaceId(this),
                viewTag = id,
                open = open,
                eventCount = eventCount,
                revision = revision,
            ),
        )
    }

    private fun reportLayout() {
        if (!active) return
        val placement = placement()
        val density = resources.displayMetrics.density.toDouble().takeIf { it > 0 } ?: 1.0
        val frame =
            if (placement == "hidden") {
                doubleArrayOf(0.0, 0.0, 0.0, 0.0)
            } else {
                val content = panelContent
                if (content == null || content.visibility != View.VISIBLE || content.width <= 0 || content.height <= 0) {
                    return
                }
                val location = IntArray(2)
                content.getLocationOnScreen(location)
                doubleArrayOf(
                    location[0] / density,
                    location[1] / density,
                    content.width / density,
                    content.height / density,
                )
            }
        val samePlacement = placement == lastPlacement
        val sameFrame =
            abs(lastFrame[0] - frame[0]) < 0.5 &&
                abs(lastFrame[1] - frame[1]) < 0.5 &&
                abs(lastFrame[2] - frame[2]) < 0.5 &&
                abs(lastFrame[3] - frame[3]) < 0.5
        if (samePlacement && sameFrame) return
        lastPlacement = placement
        lastFrame = frame
        UIManagerHelper.getEventDispatcher(UIManagerHelper.getReactContext(this))?.dispatchEvent(
            OneNativeAdaptivePanelLayoutChangeEvent(
                surfaceId = UIManagerHelper.getSurfaceId(this),
                viewTag = id,
                placement = placement,
                frameX = frame[0],
                frameY = frame[1],
                frameWidth = frame[2],
                frameHeight = frame[3],
            ),
        )
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        active = true
        applyLayout()
    }

    override fun onDetachedFromWindow() {
        active = false
        super.onDetachedFromWindow()
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        if (w != oldw || h != oldh) applyLayout()
    }

    internal fun resetForReuse() {
        active = false
        panelContent?.removeOnLayoutChangeListener(contentLayoutListener)
        panelContent = null
        behavior = null
        pendingProps = AdaptivePanelProps()
        committedProps = AdaptivePanelProps()
        controlledOpen.reset(false)
        controlledDetent.reset("")
        lastPlacement = ""
        lastFrame = doubleArrayOf(0.0, 0.0, 0.0, 0.0)
    }
}
