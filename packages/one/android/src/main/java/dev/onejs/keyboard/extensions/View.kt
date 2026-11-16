package dev.onejs.keyboard.extensions

import android.annotation.SuppressLint
import android.graphics.Rect
import android.os.Build
import android.view.View
import android.view.ViewGroup
import androidx.core.view.ViewCompat
import com.facebook.react.bridge.ReactContext
import dev.onejs.keyboard.log.Logger

/**
 * Call this every time when using [ViewCompat.setOnApplyWindowInsetsListener]
 * to ensure that insets are always received.
 * @see https://stackoverflow.com/a/61909205/9272042
 */
@SuppressLint("ObsoleteSdkInt")
fun View.requestApplyInsetsWhenAttached() {
  // https://chris.banes.dev/2019/04/12/insets-listeners-to-layouts/
  if (Build.VERSION.SDK_INT > Build.VERSION_CODES.KITKAT && isAttachedToWindow) {
    // We're already attached, just request as normal
    requestApplyInsets()
  } else {
    // We're not attached to the hierarchy, add a listener to request when we are
    addOnAttachStateChangeListener(
      object : View.OnAttachStateChangeListener {
        override fun onViewAttachedToWindow(v: View) {
          v.removeOnAttachStateChangeListener(this)
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT_WATCH) {
            v.requestApplyInsets()
          }
        }

        override fun onViewDetachedFromWindow(v: View) = Unit
      },
    )
  }
}

private val tmpIntArr = IntArray(2)

/**
 * Function which updates the given [rect] with this view's position and bounds in its window.
 */
@SuppressLint("ObsoleteSdkInt")
fun View.copyBoundsInWindow(rect: Rect) {
  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
    if (isAttachedToWindow) {
      rect.set(0, 0, width, height)
      getLocationInWindow(tmpIntArr)
      rect.offset(tmpIntArr[0], tmpIntArr[1])
    } else {
      Logger.w("View.copyBoundsInWindow", "Can not copy bounds as view is not attached to window")
    }
  }
}

/**
 * React tag of the view, or `-1` when there is no view.
 */
val View?.reactViewTag: Int
  get() = this?.id ?: -1

/**
 * Location of the view inside the content of the given `ScrollView`, so it depends neither on the
 * scroll position nor on where the `ScrollView` is on the screen. `(0, 0)` when there is no `ScrollView`.
 */
fun View.locationInScrollView(scrollView: View?): IntArray {
  if (scrollView == null) {
    return intArrayOf(0, 0)
  }

  val (x, y) = screenLocation
  val (scrollViewX, scrollViewY) = scrollView.screenLocation

  return intArrayOf(x - scrollViewX + scrollView.scrollX, y - scrollViewY + scrollView.scrollY)
}

val View.screenLocation get(): IntArray {
  val point = IntArray(2)
  getLocationOnScreen(point)

  // subtract the content margins added by KeyboardProvider because window dimensions
  // already exclude them, while getLocationOnScreen still includes them
  val contentLayoutParams =
    (context as? ReactContext)?.content?.layoutParams as? ViewGroup.MarginLayoutParams
  point[0] -= contentLayoutParams?.leftMargin ?: 0
  point[1] -= contentLayoutParams?.topMargin ?: 0

  return point
}
