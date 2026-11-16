package dev.onejs.keyboard.views.overlay

import android.view.MotionEvent
import com.facebook.react.uimanager.RootView

/**
 * Compat layer for `RootView` interface for RN < 0.73
 * which has a default implementation of deprecated method.
 */
interface RootViewCompat : RootView {
  @Deprecated(
    "This method shouldn't be used anymore.",
    ReplaceWith("onChildStartedNativeGesture(View childView, MotionEvent ev)"),
  )
  override fun onChildStartedNativeGesture(ev: MotionEvent) {
    onChildStartedNativeGesture(null, ev)
  }
}
