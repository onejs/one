package dev.onejs.onenative

import android.view.View
import android.view.ViewGroup
import android.view.MotionEvent
import android.view.ViewConfiguration
import android.view.inputmethod.InputMethodManager
import android.content.Context
import android.widget.FrameLayout
import androidx.recyclerview.widget.RecyclerView
import androidx.viewpager2.widget.ViewPager2
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.events.Event
import com.facebook.react.uimanager.events.NativeGestureUtil
import com.facebook.react.viewmanagers.OneNativePagerManagerDelegate
import com.facebook.react.viewmanagers.OneNativePagerManagerInterface
import kotlin.math.absoluteValue
import kotlin.math.sign

private class PagerEvent(surfaceId: Int, viewId: Int, private val name: String,
                         private val position: Int = 0, private val offset: Double = 0.0,
                         private val state: String? = null) : Event<PagerEvent>(surfaceId, viewId) {
    override fun getEventName() = name
    // deliver each native scroll sample without merging it with another frame.
    override fun canCoalesce() = false
    override fun getEventData() = Arguments.createMap().apply {
        if (state != null) putString("pageScrollState", state)
        else { putInt("position", position); if (name == "topPageScroll") putDouble("offset", offset) }
    }
}

class OneNativePagerView(val reactContext: ThemedReactContext) : FrameLayout(reactContext) {
    val pages = mutableListOf<View>()
    val pager = ViewPager2(reactContext)
    var initialPage = 0
    var initialized = false
    var dismissKeyboard = false
    var margin = 0f
    private val touchSlop = ViewConfiguration.get(context).scaledTouchSlop
    private var initialX = 0f
    private var initialY = 0f
    private var nativeGestureStarted = false
    private val adapter = object : RecyclerView.Adapter<RecyclerView.ViewHolder>() {
        override fun getItemCount() = pages.size
        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = object : RecyclerView.ViewHolder(
            FrameLayout(parent.context).apply {
                layoutParams = ViewGroup.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
            }) {}
        override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
            val frame = holder.itemView as FrameLayout
            holder.setIsRecyclable(false)
            frame.removeAllViews()
            val child = pages[position]
            (child.parent as? ViewGroup)?.removeView(child)
            frame.addView(child, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
        }
    }
    init {
        layoutParams = ViewGroup.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
        isSaveEnabled = false
        pager.isSaveEnabled = false
        pager.adapter = adapter
        addView(pager, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
        pager.registerOnPageChangeCallback(object : ViewPager2.OnPageChangeCallback() {
            override fun onPageScrolled(position: Int, positionOffset: Float, pixels: Int) {
                emit("topPageScroll", position, positionOffset.toDouble())
            }
            override fun onPageSelected(position: Int) { emit("topPageSelected", position) }
            override fun onPageScrollStateChanged(state: Int) {
                if (state == ViewPager2.SCROLL_STATE_DRAGGING && dismissKeyboard) {
                    val imm = context.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
                    imm.hideSoftInputFromWindow(windowToken, 0)
                }
                if (state == ViewPager2.SCROLL_STATE_IDLE) emit("topPageScroll", pager.currentItem)
                emit("topPageScrollStateChanged", state = when (state) {
                    ViewPager2.SCROLL_STATE_DRAGGING -> "dragging"
                    ViewPager2.SCROLL_STATE_SETTLING -> "settling"
                    else -> "idle"
                })
            }
        })
    }
    fun emit(name: String, position: Int = 0, offset: Double = 0.0, state: String? = null) {
        UIManagerHelper.getEventDispatcherForReactTag(reactContext, id)?.dispatchEvent(
            PagerEvent(UIManagerHelper.getSurfaceId(reactContext), id, name, position, offset, state))
    }
    fun pagesChanged(index: Int, count: Int, added: Boolean) {
        val selectedPage = if (initialized) pager.currentItem else initialPage
        if (added) adapter.notifyItemRangeInserted(index, count)
        else adapter.notifyItemRangeRemoved(index, count)
        requestLayout()
        post {
            if (pages.isNotEmpty()) {
                val firstLayout = !initialized
                refreshPagerLayout()
                pager.setCurrentItem(selectedPage.coerceIn(0, pages.lastIndex), false)
                initialized = true
                if (firstLayout) emit("topPageSelected", pager.currentItem)
                emit("topPageScroll", pager.currentItem)
            }
            measure(MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY), MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY))
            layout(left, top, right, bottom)
        }
    }
    private fun refreshPagerLayout() {
        // fabric owns the outer frame; ViewPager2 still needs its requested child layout.
        pager.post {
            pager.measure(MeasureSpec.makeMeasureSpec(pager.width, MeasureSpec.EXACTLY),
                MeasureSpec.makeMeasureSpec(pager.height, MeasureSpec.EXACTLY))
            pager.layout(pager.left, pager.top, pager.right, pager.bottom)
        }
    }
    fun goTo(index: Int, animated: Boolean) {
        if (!initialized) { initialPage = index; return }
        if (index !in pages.indices) return
        refreshPagerLayout()
        pager.setCurrentItem(index, animated)
        if (!animated) emit("topPageScroll", index)
    }
    override fun onInterceptTouchEvent(event: MotionEvent): Boolean {
        var ancestor = parent as? View
        while (ancestor != null && ancestor !is ViewPager2) ancestor = ancestor.parent as? View
        val orientation = (ancestor as? ViewPager2)?.orientation
        if (event.actionMasked == MotionEvent.ACTION_DOWN) {
            initialX = event.x
            initialY = event.y
            if (orientation != null) parent.requestDisallowInterceptTouchEvent(true)
        } else if (event.actionMasked == MotionEvent.ACTION_MOVE) {
            val dx = event.x - initialX
            val dy = event.y - initialY
            val horizontal = orientation == ViewPager2.ORIENTATION_HORIZONTAL
            val scaledDx = dx.absoluteValue * if (horizontal) .5f else 1f
            val scaledDy = dy.absoluteValue * if (horizontal) 1f else .5f
            if (scaledDx > touchSlop || scaledDy > touchSlop) {
                if (!nativeGestureStarted) {
                    NativeGestureUtil.notifyNativeGestureStarted(this, event)
                    nativeGestureStarted = true
                }
                if (orientation != null) {
                    val perpendicular = horizontal == (scaledDy > scaledDx)
                    val direction = -(if (horizontal) dx else dy).sign.toInt()
                    val childScrolls = if (horizontal) pager.canScrollHorizontally(direction)
                                       else pager.canScrollVertically(direction)
                    parent.requestDisallowInterceptTouchEvent(!perpendicular && childScrolls)
                }
            }
        }
        return super.onInterceptTouchEvent(event)
    }
    override fun dispatchTouchEvent(event: MotionEvent): Boolean {
        val handled = super.dispatchTouchEvent(event)
        if (nativeGestureStarted && (event.actionMasked == MotionEvent.ACTION_UP || event.actionMasked == MotionEvent.ACTION_CANCEL)) {
            NativeGestureUtil.notifyNativeGestureEnded(this, event)
            nativeGestureStarted = false
        }
        return handled
    }
}

@ReactModule(name = OneNativePagerManager.NAME)
class OneNativePagerManager : ViewGroupManager<OneNativePagerView>(), OneNativePagerManagerInterface<OneNativePagerView> {
    private val delegate = OneNativePagerManagerDelegate(this)
    override fun getDelegate(): ViewManagerDelegate<OneNativePagerView> = delegate
    override fun getName() = NAME
    override fun createViewInstance(context: ThemedReactContext) = OneNativePagerView(context)
    override fun needsCustomLayoutForChildren() = true
    override fun getChildCount(view: OneNativePagerView) = view.pages.size
    override fun getChildAt(view: OneNativePagerView, index: Int) = view.pages[index]
    override fun addView(view: OneNativePagerView, child: View, index: Int) { view.pages.add(index, child); view.pagesChanged(index, 1, true) }
    override fun removeViewAt(view: OneNativePagerView, index: Int) {
        val child = view.pages.removeAt(index)
        (child.parent as? ViewGroup)?.removeView(child)
        view.pagesChanged(index, 1, false)
    }
    override fun removeAllViews(view: OneNativePagerView) {
        val count = view.pages.size
        view.pages.forEach { (it.parent as? ViewGroup)?.removeView(it) }
        view.pages.clear(); view.pagesChanged(0, count, false)
    }
    @ReactProp(name = "initialPage", defaultInt = 0)
    override fun setInitialPage(view: OneNativePagerView, value: Int) { if (!view.initialized) view.initialPage = value }
    @ReactProp(name = "scrollEnabled", defaultBoolean = true)
    override fun setScrollEnabled(view: OneNativePagerView, value: Boolean) { view.pager.isUserInputEnabled = value }
    @ReactProp(name = "orientation")
    override fun setOrientation(view: OneNativePagerView, value: String?) { view.pager.orientation = if (value == "vertical") ViewPager2.ORIENTATION_VERTICAL else ViewPager2.ORIENTATION_HORIZONTAL }
    @ReactProp(name = "layoutDirection")
    override fun setLayoutDirection(view: OneNativePagerView, value: String?) { view.pager.layoutDirection = if (value == "rtl") View.LAYOUT_DIRECTION_RTL else View.LAYOUT_DIRECTION_LTR }
    @ReactProp(name = "offscreenPageLimit", defaultInt = -1)
    override fun setOffscreenPageLimit(view: OneNativePagerView, value: Int) { if (value == -1 || value > 0) view.pager.offscreenPageLimit = value }
    @ReactProp(name = "pageMargin")
    override fun setPageMargin(view: OneNativePagerView, value: Double) {
        view.margin = (value * view.resources.displayMetrics.density).toFloat()
        if (view.margin == 0f) { view.pager.setPageTransformer(null); return }
        view.pager.setPageTransformer { page, position ->
            val offset = view.margin * position
            if (view.pager.orientation == ViewPager2.ORIENTATION_VERTICAL) page.translationY = offset
            else page.translationX = if (view.pager.layoutDirection == View.LAYOUT_DIRECTION_RTL) -offset else offset
        }
    }
    @ReactProp(name = "overdrag")
    override fun setOverdrag(view: OneNativePagerView, value: Boolean) {}
    @ReactProp(name = "overScrollMode")
    override fun setOverScrollMode(view: OneNativePagerView, value: String?) {
        view.pager.getChildAt(0).overScrollMode = when (value) {
            "never" -> View.OVER_SCROLL_NEVER; "always" -> View.OVER_SCROLL_ALWAYS; else -> View.OVER_SCROLL_IF_CONTENT_SCROLLS
        }
    }
    @ReactProp(name = "keyboardDismissMode")
    override fun setKeyboardDismissMode(view: OneNativePagerView, value: String?) { view.dismissKeyboard = value == "on-drag" }
    override fun setScrollEnabledImperatively(view: OneNativePagerView, enabled: Boolean) { view.pager.isUserInputEnabled = enabled }
    override fun setPage(view: OneNativePagerView, index: Int) { view.goTo(index, true) }
    override fun setPageWithoutAnimation(view: OneNativePagerView, index: Int) { view.goTo(index, false) }
    override fun receiveCommand(view: OneNativePagerView, commandId: String, args: ReadableArray?) { delegate.receiveCommand(view, commandId, args) }
    override fun getExportedCustomDirectEventTypeConstants() = mutableMapOf(
        "topPageScroll" to mapOf("registrationName" to "onPageScroll"),
        "topPageSelected" to mapOf("registrationName" to "onPageSelected"),
        "topPageScrollStateChanged" to mapOf("registrationName" to "onPageScrollStateChanged"))
    companion object { const val NAME = "OneNativePager" }
}
