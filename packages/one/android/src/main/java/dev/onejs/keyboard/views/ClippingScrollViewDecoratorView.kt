package dev.onejs.keyboard.views

import android.annotation.SuppressLint
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.widget.ScrollView
import androidx.core.widget.NestedScrollView
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.views.view.ReactViewGroup
import dev.onejs.keyboard.extensions.px
import kotlin.math.max

@SuppressLint("ViewConstructor")
class ClippingScrollViewDecoratorView(
  val reactContext: ThemedReactContext,
) : ReactViewGroup(reactContext) {
  private var insetBottom = 0.0
  private var insetTop = 0.0
  private var appliedTopInsetPx = 0
  private var paddingScrollWorkaroundActive = false
  private var expandedContentView: View? = null
  private var contentBottomBeforeExpansion = 0
  private var expansionTouchAction = MotionEvent.ACTION_CANCEL

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()

    decorateScrollView()
  }

  override fun dispatchTouchEvent(event: MotionEvent): Boolean {
    val scrollView = findScrollView(this)

    if (scrollView == null) {
      return super.dispatchTouchEvent(event)
    }

    if (event.actionMasked == MotionEvent.ACTION_DOWN) {
      paddingScrollWorkaroundActive = shouldUsePaddingScrollWorkaround(scrollView, event)
    } else if (scrollView.scrollY != 0) {
      // Only expand the range to start the drag. Once scrolling begins, use the
      // real content bounds so padding does not keep extending the drag range.
      paddingScrollWorkaroundActive = false
    }

    // ScrollView.inChild() ignores its direct child's translationY when it
    // initializes a gesture. contentInsetTop is represented by translating
    // that child, so the translated portion is visible but cannot start a
    // scroll (the gap appears at the top once the ScrollView is inverted).
    // Include the translated visual range only while dispatching ACTION_DOWN;
    // subsequent events use the real bounds after ScrollView has initialized
    // the gesture.
    val translatedContentNeedsExpandedHitRange =
      event.actionMasked == MotionEvent.ACTION_DOWN && appliedTopInsetPx > 0

    val handled =
      when {
        paddingScrollWorkaroundActive -> dispatchWithExpandedContentRange(scrollView, event)
        translatedContentNeedsExpandedHitRange ->
          dispatchWithTranslatedContentRange(scrollView, event)
        else -> super.dispatchTouchEvent(event)
      }

    if (
      event.actionMasked == MotionEvent.ACTION_UP ||
      event.actionMasked == MotionEvent.ACTION_CANCEL
    ) {
      paddingScrollWorkaroundActive = false
    }

    return handled
  }

  override fun requestDisallowInterceptTouchEvent(disallowIntercept: Boolean) {
    if (disallowIntercept && expansionTouchAction == MotionEvent.ACTION_MOVE) {
      // ScrollView has taken the drag. Restore the bounds before onTouchEvent
      // calculates its range, including on the first movement of a tiny range.
      paddingScrollWorkaroundActive = false
      expandedContentView?.bottom = contentBottomBeforeExpansion
    }

    super.requestDisallowInterceptTouchEvent(disallowIntercept)
  }

  fun setContentInsetBottom(value: Double) {
    insetBottom = value
    decorateScrollView()
  }

  fun setContentInsetTop(value: Double) {
    insetTop = value
    decorateScrollView()
  }

  @Suppress("detekt:UnusedParameter")
  fun setApplyWorkaroundForContentInsetHitTestBug(value: Boolean) {
    // iOS-only workaround; no-op on Android
  }

  private fun decorateScrollView() {
    val scrollView = findScrollView(this) ?: return

    scrollView.clipToPadding = false

    val newTopInsetPx = insetTop.toFloat().px.toInt()

    // Translate the content view as a whole — this keeps FlatList's
    // virtualizer calculations correct (it reads layout positions,
    // not translationY).
    val contentView = scrollView.getChildAt(0) as? ViewGroup ?: return
    contentView.translationY = newTopInsetPx.toFloat()

    scrollView.setPadding(
      scrollView.paddingLeft,
      scrollView.paddingTop,
      scrollView.paddingRight,
      // pass accumulated value — visually both top and bottom insets
      // extend the scroll range via bottom padding
      (insetBottom + insetTop).toFloat().px.toInt(),
    )

    // scroll by the delta to keep content visually in place
    val delta = newTopInsetPx - appliedTopInsetPx
    if (delta != 0) {
      scrollView.scrollBy(0, delta)
    }

    appliedTopInsetPx = newTopInsetPx
  }

  private fun shouldUsePaddingScrollWorkaround(
    scrollView: ViewGroup,
    event: MotionEvent,
  ): Boolean {
    val contentView = scrollView.getChildAt(0) ?: return false
    val viewportHeight =
      scrollView.height - scrollView.paddingTop - scrollView.paddingBottom
    val paddingCreatesScrollRange = contentView.height > viewportHeight

    return scrollView.scrollY == 0 &&
      paddingCreatesScrollRange &&
      !scrollView.canScrollVertically(1) &&
      isTouchInScrollContent(scrollView, event)
  }

  private fun dispatchWithExpandedContentRange(
    scrollView: ViewGroup,
    event: MotionEvent,
  ): Boolean {
    val contentView = scrollView.getChildAt(0)
    val originalBottom = contentView?.bottom ?: 0
    val expandedBottom =
      max(originalBottom, scrollView.height + scrollView.scrollY + MIN_SCROLL_RANGE_PX)

    return dispatchWithTemporaryContentBottom(contentView, event, expandedBottom)
  }

  private fun dispatchWithTranslatedContentRange(
    scrollView: ViewGroup,
    event: MotionEvent,
  ): Boolean {
    val contentView = scrollView.getChildAt(0)
    val originalBottom = contentView?.bottom ?: 0
    val translatedBottom = originalBottom + appliedTopInsetPx + MIN_SCROLL_RANGE_PX

    return dispatchWithTemporaryContentBottom(contentView, event, translatedBottom)
  }

  private fun dispatchWithTemporaryContentBottom(
    contentView: View?,
    event: MotionEvent,
    expandedBottom: Int,
  ): Boolean {
    val originalBottom = contentView?.bottom ?: 0

    if (contentView == null || expandedBottom == originalBottom) {
      return super.dispatchTouchEvent(event)
    }

    return try {
      expandedContentView = contentView
      contentBottomBeforeExpansion = originalBottom
      expansionTouchAction = event.actionMasked
      contentView.bottom = expandedBottom
      super.dispatchTouchEvent(event)
    } finally {
      contentView.bottom = originalBottom
      expandedContentView = null
      expansionTouchAction = MotionEvent.ACTION_CANCEL
    }
  }

  private fun isTouchInScrollContent(
    scrollView: ViewGroup,
    event: MotionEvent,
  ): Boolean {
    val contentView = scrollView.getChildAt(0) ?: return false
    val thisLocation = IntArray(COORDINATES_SIZE)
    val scrollViewLocation = IntArray(COORDINATES_SIZE)

    getLocationOnScreen(thisLocation)
    scrollView.getLocationOnScreen(scrollViewLocation)

    val x = event.x + thisLocation[0] - scrollViewLocation[0]
    val y = event.y + thisLocation[1] - scrollViewLocation[1]
    val scrollY = scrollView.scrollY

    return !(
      y < contentView.top - scrollY ||
        y >= contentView.bottom - scrollY ||
        x < contentView.left ||
        x >= contentView.right
    )
  }

  private fun findScrollView(view: View?): ViewGroup? {
    var result: ViewGroup? = null

    // Match NestedScrollView too: with React Native's `useNestedScrollViewAndroid`
    // feature flag (RN 0.85+), ScrollView renders as a NestedScrollView subclass
    // (a FrameLayout, not an android.widget.ScrollView). Both extend the scroll
    // range via bottom padding + clipToPadding=false the same way.
    if (view is ScrollView || view is NestedScrollView) {
      result = view as ViewGroup
    } else if (view is ViewGroup) {
      var i = 0
      while (i < view.childCount && result == null) {
        result = findScrollView(view.getChildAt(i))
        i++
      }
    }

    return result
  }

  companion object {
    private const val COORDINATES_SIZE = 2
    private const val MIN_SCROLL_RANGE_PX = 2
  }
}
