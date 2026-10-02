package dev.onejs.one

import android.content.Context
import android.view.ViewGroup
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.ViewCompositionStrategy
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.views.view.ReactViewGroup

class OneKotlinHostView(context: Context) : ReactViewGroup(context) {
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

    private var intrinsicWidth = false
    private var intrinsicHeight = false
    private var measuresIntrinsicWidth: Boolean? = null
    private val contentLayout = Runnable { layoutComposeContent() }

    private var reportedIntrinsicWidth: Boolean? = null
    private var reportedWidth = -1.0
    private var reportedHeight = -1.0

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
                dispatch.Content(
                    view = view,
                    propsJson = props,
                    emit = { eventName, eventArgs ->
                        onHostEvent(source, view, eventName, eventArgs)
                    },
                )
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
        }

        if (sourceOrViewChanged || nextHash != committedContractHash || nextProps != committedProps) {
            committedSource = nextSource
            committedView = nextView
            committedContractHash = nextHash
            committedProps = nextProps
            requestLayout()
        }
    }

    internal fun setIntrinsicWidth(value: Boolean) {
        if (intrinsicWidth == value) return
        intrinsicWidth = value
        measuresIntrinsicWidth = null
        requestLayout()
    }

    internal fun setIntrinsicHeight(value: Boolean) {
        if (intrinsicHeight == value) return
        intrinsicHeight = value
        requestLayout()
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
        widthIsIntrinsic: Boolean,
    ) {
        if (!isAttachedToWindow || sizeSource != committedSource || sizeView != committedView) return
        val density = resources.displayMetrics.density.toDouble()
        if (density <= 0.0) return
        val widthDp = widthPx / density
        val heightDp = heightPx / density
        if (widthDp == reportedWidth && heightDp == reportedHeight && widthIsIntrinsic == reportedIntrinsicWidth) return
        reportedIntrinsicWidth = widthIsIntrinsic
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
                intrinsicWidth = widthIsIntrinsic,
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
        // a nonzero initial yoga width can come from the parent's default stretch.
        val widthIsIntrinsic = measuresIntrinsicWidth ?: (intrinsicWidth && width == 0).also {
            measuresIntrinsicWidth = it
        }
        composeView.measure(
            if (widthIsIntrinsic) MeasureSpec.makeMeasureSpec(0, MeasureSpec.UNSPECIFIED)
            else MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
            if (intrinsicHeight) MeasureSpec.makeMeasureSpec(0, MeasureSpec.UNSPECIFIED)
            else MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY),
        )
        composeView.layout(0, 0, composeView.measuredWidth, composeView.measuredHeight)
        onContentSizeChanged(
            committedSource,
            committedView,
            composeView.measuredWidth,
            composeView.measuredHeight,
            widthIsIntrinsic,
        )
    }

    override fun onDetachedFromWindow() {
        removeCallbacks(contentLayout)
        super.onDetachedFromWindow()
        composeView.disposeComposition()
    }

    internal fun resetForReuse() {
        removeCallbacks(contentLayout)
        intrinsicWidth = false
        intrinsicHeight = false
        measuresIntrinsicWidth = null
        reportedIntrinsicWidth = null
        reportedWidth = -1.0
        reportedHeight = -1.0
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
