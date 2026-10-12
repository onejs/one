package dev.onejs.onenative

import android.content.Context
import android.view.ViewGroup
import android.view.ViewTreeObserver
import com.facebook.react.views.view.ReactViewGroup

// first-party safe-area provider view. reports the window insets overlapping
// this view plus its frame in root coordinates, mirroring upstream
// SafeAreaProvider: root insets per API level with the keyboard-safe bottom,
// overlap-relative edges, and a predraw publisher that retries until the
// manager confirms delivery. framework APIs only, so no new dependency.
class OneNativeSafeAreaProviderView(context: Context) :
    ReactViewGroup(context), ViewTreeObserver.OnPreDrawListener {
  private var insetsChangeHandler: ((insetsPx: IntArray, framePx: IntArray) -> Boolean)? = null
  private var lastInsets: IntArray? = null
  private var lastFrame: IntArray? = null

  fun setOnInsetsChangeHandler(handler: ((IntArray, IntArray) -> Boolean)?) {
    insetsChangeHandler = handler
    maybeUpdateInsets()
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    viewTreeObserver.addOnPreDrawListener(this)
    maybeUpdateInsets()
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    viewTreeObserver.removeOnPreDrawListener(this)
  }

  override fun onPreDraw(): Boolean {
    maybeUpdateInsets()
    return true
  }

  private fun maybeUpdateInsets() {
    val handler = insetsChangeHandler ?: return
    if (height == 0) return
    val root = rootView as? ViewGroup ?: return
    val window = OneNativeSafeAreaInsets.rootWindowInsetsPx(root) ?: return
    val insets = OneNativeSafeAreaInsets.overlappingInsetsPx(this, window)
    val frame = OneNativeSafeAreaInsets.framePx(root, this) ?: return
    if (insets.contentEquals(lastInsets) && frame.contentEquals(lastFrame)) return
    if (handler(insets, frame)) {
      lastInsets = insets
      lastFrame = frame
    }
  }

  fun resetForReuse() {
    insetsChangeHandler = null
    lastInsets = null
    lastFrame = null
  }
}
