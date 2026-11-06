package dev.onejs.one

import android.content.Context
import android.view.ViewGroup
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.ViewCompositionStrategy
import androidx.compose.ui.unit.constrainHeight
import androidx.compose.ui.unit.constrainWidth
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.views.view.ReactViewGroup

class OneKotlinHostView(context: Context) : ReactViewGroup(context) {
    companion object {
        // matches RESYNC_EVENT in wireProps.native: emitted when a change
        // document cannot apply, answered by a full document
        const val RESYNC_EVENT = "\$resync"
    }

    private val keyedState = OneNativeSourceKeyedState()

    private val composeView =
        ComposeView(context).apply {
            layoutParams =
                ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT,
                )
            setViewCompositionStrategy(ViewCompositionStrategy.DisposeOnDetachedFromWindow)
        }

    private var stagedSource: String? = null
    private var stagedView: String? = null
    private var stagedContractHash: String? = null
    private var stagedProps: String? = null

    private var committedSource by mutableStateOf("")
    private var committedView by mutableStateOf("")
    private var committedContractHash by mutableStateOf("")
    private var committedProps by mutableStateOf("{}")

    private val contentLayout = Runnable { layoutComposeContent() }

    private var reportedWidth = -1.0
    private var reportedHeight = -1.0
    private var observedWidth = -1
    private var observedHeight = -1
    private var measuringContent = false

    init {
        clipChildren = false
        addView(composeView)
        composeView.setContent {
            val source = committedSource
            val view = committedView
            val hash = committedContractHash
            val props = committedProps

            if (source.isNotEmpty() && view.isNotEmpty()) {
                val dispatch = OneNativeSourceViewRegistry.get(source)
                if (dispatch.contractHash != hash) {
                    error(
                        "native view $source.$view changed (contract hash mismatch: expected $hash, got ${dispatch.contractHash}); rebuild the app"
                    )
                }
                Layout(
                    content = {
                        dispatch.Content(
                            view = view,
                            propsJson = props,
                            emit = { eventName, eventArgs ->
                                onHostEvent(source, view, eventName, eventArgs)
                            },
                            state = keyedState,
                        )
                    },
                ) { measurables, constraints ->
                    // yoga owns the outer minimums; content keeps its natural size.
                    val contentConstraints = constraints.copy(minWidth = 0, minHeight = 0)
                    val placeables = measurables.map { it.measure(contentConstraints) }
                    val contentWidth = placeables.maxOfOrNull { it.width } ?: 0
                    val contentHeight = placeables.maxOfOrNull { it.height } ?: 0
                    if (source == committedSource && view == committedView) {
                        val changed = contentWidth != observedWidth || contentHeight != observedHeight
                        observedWidth = contentWidth
                        observedHeight = contentHeight
                        if (changed && !measuringContent && isAttachedToWindow) {
                            removeCallbacks(contentLayout)
                            post(contentLayout)
                        }
                    }
                    layout(
                        constraints.constrainWidth(contentWidth),
                        constraints.constrainHeight(contentHeight),
                    ) {
                        placeables.forEach { it.placeRelativeWithLayer(0, 0) }
                    }
                }
            }
        }
    }

    internal fun stageSource(value: String?) {
        stagedSource = value
    }

    internal fun stageView(value: String?) {
        stagedView = value
    }

    internal fun stageContractHash(value: String?) {
        stagedContractHash = value
    }

    internal fun stageProps(value: String?) {
        stagedProps = value
    }

    internal fun commitPendingProps() {
        val nextSource = stagedSource ?: ""
        val nextView = stagedView ?: ""
        val nextHash = stagedContractHash ?: ""
        val nextProps = stagedProps ?: "{}"

        val sourceOrViewChanged = nextSource != committedSource || nextView != committedView
        if (sourceOrViewChanged) {
            reportedWidth = -1.0
            reportedHeight = -1.0
            observedWidth = -1
            observedHeight = -1
        }
        if (sourceOrViewChanged || nextHash != committedContractHash) {
            keyedState.reset()
        }

        if (sourceOrViewChanged || nextHash != committedContractHash || nextProps != committedProps) {
            if (!keyedEnvelopeApplies(nextProps)) {
                emitKeyedResync()
                return
            }
            committedSource = nextSource
            committedView = nextView
            committedContractHash = nextHash
            committedProps = nextProps
            requestLayout()
        }
    }

    // true when the props document applies onto the held keyed state: full
    // documents (or legacy ones without a seq) always do, and change
    // documents do when already applied or based on the held seq. anything
    // else needs a resync instead of a commit.
    private fun keyedEnvelopeApplies(propsJson: String): Boolean {
        val base = readTopLevelInt(propsJson, "\$base") ?: return true
        val seq = readTopLevelInt(propsJson, "\$seq") ?: return true
        return seq == keyedState.seq || base == keyedState.seq
    }

    // reads one top-level integer of a props document, or null when the key
    // is absent or the head of the document does not parse (the glue then
    // reports the precise error). stops at the wanted key; nested values are
    // skipped, never decoded.
    private fun readTopLevelInt(text: String, want: String): Int? {
        var pos = 0
        fun skipSpace() {
            while (pos < text.length && (text[pos] == ' ' || text[pos] == '\t' || text[pos] == '\n' || text[pos] == '\r')) pos++
        }
        // pos at the opening quote; false when the string never closes
        fun skipRawString(): Boolean {
            pos++
            while (pos < text.length) {
                val c = text[pos++]
                if (c == '"') return true
                if (c == '\\') {
                    if (pos >= text.length) return false
                    pos++
                }
            }
            return false
        }
        fun readKey(into: StringBuilder): Boolean {
            pos++ // the opening quote
            while (pos < text.length) {
                val c = text[pos++]
                if (c == '"') return true
                if (c != '\\') {
                    into.append(c)
                    continue
                }
                if (pos >= text.length) return false
                when (text[pos++]) {
                    '"', '\\', '/' -> into.append(text[pos - 1])
                    'b' -> into.append('\b')
                    'f' -> into.append('\u000C')
                    'n' -> into.append('\n')
                    'r' -> into.append('\r')
                    't' -> into.append('\t')
                    'u' -> {
                        if (pos + 4 > text.length) return false
                        var code = 0
                        for (i in 0 until 4) {
                            val digit = text[pos + i].lowercaseChar()
                            val value = if (digit in '0'..'9') digit - '0' else if (digit in 'a'..'f') digit - 'a' + 10 else return false
                            code = code * 16 + value
                        }
                        pos += 4
                        into.append(code.toChar())
                    }
                    else -> return false
                }
            }
            return false
        }
        fun skipValue(): Boolean {
            skipSpace()
            if (pos >= text.length) return false
            if (text[pos] == '"') return skipRawString()
            if (text[pos] != '{' && text[pos] != '[') {
                while (pos < text.length && text[pos] != ',' && text[pos] != '}' && text[pos] != ']' && text[pos] != ' ' && text[pos] != '\t' && text[pos] != '\n' && text[pos] != '\r') pos++
                return true
            }
            var depth = 0
            while (pos < text.length) {
                when (text[pos++]) {
                    '{', '[' -> depth++
                    '}', ']' -> {
                        depth--
                        if (depth == 0) return true
                        if (depth < 0) return false
                    }
                    '"' -> {
                        pos--
                        if (!skipRawString()) return false
                    }
                    // commas, colons, whitespace and literal text carry no structure
                    else -> {}
                }
            }
            return false
        }
        fun readInt(): Int? {
            skipSpace()
            val start = pos
            if (pos < text.length && text[pos] == '-') pos++
            while (pos < text.length && text[pos] in '0'..'9') pos++
            if (pos == start || (text[start] == '-' && pos == start + 1)) return null
            return text.substring(start, pos).toIntOrNull()
        }
        skipSpace()
        if (pos >= text.length || text[pos] != '{') return null
        pos++
        var first = true
        val key = StringBuilder()
        while (true) {
            skipSpace()
            if (pos >= text.length) return null
            if (text[pos] == '}') return null
            if (!first) {
                if (text[pos] != ',') return null
                pos++
                skipSpace()
            }
            first = false
            if (pos >= text.length || text[pos] != '"') return null
            key.clear()
            if (!readKey(key)) return null
            skipSpace()
            if (pos >= text.length || text[pos] != ':') return null
            pos++
            if (key.toString() == want) return readInt()
            if (!skipValue()) return null
        }
    }

    override fun requestLayout() {
        super.requestLayout()
        if (isAttachedToWindow) {
            removeCallbacks(contentLayout)
            post(contentLayout)
        }
    }

    private fun onHostEvent(eventSource: String, eventView: String, name: String, args: String) {
        // discard events from a detached or replaced source/view
        if (!isAttachedToWindow || eventSource != committedSource || eventView != committedView) return
        dispatchHostEvent(name, args)
    }

    // asks javascript for a full document after refusing a change document.
    // runs during the prop commit (never composition), so it cannot compare
    // against committed props the way view events do.
    private fun emitKeyedResync() {
        if (!isAttachedToWindow) return
        dispatchHostEvent(RESYNC_EVENT, "[]")
    }

    private fun dispatchHostEvent(name: String, args: String) {
        val reactContext = UIManagerHelper.getReactContext(this) ?: return
        val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(reactContext, id) ?: return
        dispatcher.dispatchEvent(
            OneKotlinHostEvent(
                surfaceId = UIManagerHelper.getSurfaceId(this),
                viewTag = id,
                name = name,
                args = args,
            )
        )
    }

    private fun onContentSizeChanged(
        sizeSource: String,
        sizeView: String,
        widthPx: Int,
        heightPx: Int,
    ) {
        if (!isAttachedToWindow || sizeSource != committedSource || sizeView != committedView) return
        val density = resources.displayMetrics.density.toDouble()
        if (density <= 0.0) return
        val widthDp = widthPx / density
        val heightDp = heightPx / density
        if (widthDp == reportedWidth && heightDp == reportedHeight) return
        reportedWidth = widthDp
        reportedHeight = heightDp
        val reactContext = UIManagerHelper.getReactContext(this) ?: return
        val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(reactContext, id) ?: return
        dispatcher.dispatchEvent(
            OneKotlinHostSizeEvent(
                surfaceId = UIManagerHelper.getSurfaceId(this),
                viewTag = id,
                width = widthDp,
                height = heightDp,
            )
        )
    }

    override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
        super.onLayout(changed, left, top, right, bottom)
        layoutComposeContent()
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        post(contentLayout)
    }

    private fun layoutComposeContent() {
        if (!composeView.isAttachedToWindow || committedSource.isEmpty() || committedView.isEmpty()) return
        measuringContent = true
        try {
            // measure content before letting yoga apply the outer constraints. the
            // natural pass is bounded by the display: compose fill layouts (scaffold,
            // top app bar, nav host) take the max constraint, which is infinite when
            // unspecified and fails compose's size range check.
            val metrics = resources.displayMetrics
            val naturalHeightSpec = MeasureSpec.makeMeasureSpec(metrics.heightPixels, MeasureSpec.AT_MOST)
            measureComposeContent(
                MeasureSpec.makeMeasureSpec(metrics.widthPixels, MeasureSpec.AT_MOST),
                naturalHeightSpec,
            )
            val naturalWidth = composeView.measuredWidth
            var naturalHeight = composeView.measuredHeight
            if (width > 0 && width != naturalWidth) {
                measureComposeContent(
                    MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
                    naturalHeightSpec,
                )
                naturalHeight = composeView.measuredHeight
            }
            onContentSizeChanged(
                committedSource,
                committedView,
                naturalWidth,
                naturalHeight,
            )
            measureComposeContent(
                MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
                MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY),
            )
            composeView.layout(0, 0, width, height)
        } finally {
            measuringContent = false
        }
    }

    private fun measureComposeContent(widthSpec: Int, heightSpec: Int) {
        // each explicit pass must update compose constraints rather than reuse android's cache.
        composeView.forceLayout()
        for (index in 0 until composeView.childCount) {
            composeView.getChildAt(index).forceLayout()
        }
        composeView.measure(widthSpec, heightSpec)
    }

    override fun onDetachedFromWindow() {
        removeCallbacks(contentLayout)
        super.onDetachedFromWindow()
        composeView.disposeComposition()
    }

    internal fun resetForReuse() {
        removeCallbacks(contentLayout)
        keyedState.reset()
        reportedWidth = -1.0
        reportedHeight = -1.0
        observedWidth = -1
        observedHeight = -1
        committedSource = ""
        committedView = ""
        committedContractHash = ""
        committedProps = "{}"
        stagedSource = null
        stagedView = null
        stagedContractHash = null
        stagedProps = null
        composeView.disposeComposition()
    }
}
