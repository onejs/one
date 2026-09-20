package dev.onejs.onenative

import android.os.Build
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import kotlin.math.max
import kotlin.math.min

// pixel-space inset math shared by the provider view and the initial-metrics
// module. mirrors upstream SafeAreaUtils: root insets per API level with the
// keyboard-safe bottom, then the overlap of those insets with one view, then
// the view frame in root coordinates. the overlap formula is duplicated as
// resolveOverlappingInsets in @vxrn/native/safe-area/insets.ts, which the
// vitest suite pins down; keep both in sync.
internal object OneNativeSafeAreaInsets {
  // [top, right, bottom, left] in pixels, or null until the root has insets.
  // the R+ type set excludes the keyboard explicitly; below R the stable
  // bottom caps the system bottom for the same reason.
  fun rootWindowInsetsPx(rootView: View): IntArray? {
    val windowInsets = rootView.rootWindowInsets ?: return null
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      val types =
          WindowInsets.Type.statusBars() or
              WindowInsets.Type.displayCutout() or
              WindowInsets.Type.navigationBars() or
              WindowInsets.Type.captionBar()
      val bars = windowInsets.getInsets(types)
      intArrayOf(bars.top, bars.right, bars.bottom, bars.left)
    } else {
      @Suppress("DEPRECATION")
      intArrayOf(
          windowInsets.systemWindowInsetTop,
          windowInsets.systemWindowInsetRight,
          min(windowInsets.systemWindowInsetBottom, windowInsets.stableInsetBottom),
          windowInsets.systemWindowInsetLeft)
    }
  }

  // the part of the window insets overlapping this view, in pixels. a
  // provider below the status bar reports top 0 even though the window top
  // inset is large.
  fun overlappingInsetsPx(view: View, window: IntArray): IntArray {
    val root = view.rootView
    val windowWidth = root.width
    val windowHeight = root.height
    val visible = android.graphics.Rect()
    view.getGlobalVisibleRect(visible)
    return intArrayOf(
        max(window[0] - visible.top, 0),
        max(min(visible.left + view.width - windowWidth, 0) + window[1], 0),
        max(min(visible.top + view.height - windowHeight, 0) + window[2], 0),
        max(window[3] - visible.left, 0))
  }

  // [x, y, width, height] of the view in root coordinates, in pixels.
  fun framePx(rootView: ViewGroup, view: View): IntArray? {
    if (view.parent == null) return null
    val offset = android.graphics.Rect()
    view.getDrawingRect(offset)
    try {
      rootView.offsetDescendantRectToMyCoords(view, offset)
    } catch (_: IllegalArgumentException) {
      // the view is not a descendant of the root. should not happen, but
      // never crash the draw pass over it.
      return null
    }
    return intArrayOf(offset.left, offset.top, view.width, view.height)
  }
}
