package dev.onejs.one

import android.content.Context
import android.view.ViewGroup
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.onSizeChanged
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
                Box(
                    modifier =
                        Modifier.onSizeChanged { size ->
                            onContentSizeChanged(source, view, size.width, size.height)
                        }
                ) {
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
        }
    }

    private fun onHostEvent(eventSource: String, eventView: String, name: String, args: String) {
        // Discard events if detached, or if source/view changed to prevent delivering stale events
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

    private fun onContentSizeChanged(sizeSource: String, sizeView: String, widthPx: Int, heightPx: Int) {
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
        composeView.layout(0, 0, right - left, bottom - top)
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        composeView.measure(widthMeasureSpec, heightMeasureSpec)
        setMeasuredDimension(
            resolveSize(composeView.measuredWidth, widthMeasureSpec),
            resolveSize(composeView.measuredHeight, heightMeasureSpec),
        )
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        composeView.disposeComposition()
    }

    internal fun resetForReuse() {
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
