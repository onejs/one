// capture technique vendored from QmBlurView 1.3.0 BaseBlurView (MIT,
// Copyright (c) 2025-2026 Donny Yale) and capture-root selection from
// @sbaiahmed1/react-native-blur 6.0.2 (MIT, Copyright (c) 2025 Ahmed Sbai).
// see VENDORING.md.
package dev.onejs.onenative

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Matrix
import android.os.Build
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.view.ViewTreeObserver
import androidx.annotation.RequiresApi
import com.facebook.react.ReactRootView
import kotlin.math.ceil

/**
 * Backdrop for a blur view: a downsampled software rasterization of what
 * renders BEHIND [owner], refreshed on every pre-draw of the window, so the
 * owner can blur it with a platform RenderEffect. Android has no in-window
 * backdrop blur, so this is the native equivalent of a UIVisualEffectView's
 * backdrop.
 *
 * Unlike upstream (which rasterizes the whole capture root and so also
 * blurs views stacked ABOVE the owner into a halo), the capture walks from
 * the root down to the owner and draws only the siblings that precede each
 * ancestor in drawing order, matching iOS backdrop semantics. With
 * [includeOwnerChildren] the owner's own background and children are drawn
 * last, since an edge fade's strips sit above its children on iOS too.
 *
 * Effect views must draw nothing but their children on a software canvas
 * (every capture rasterizes through one), or captures would feed back into
 * each other.
 */
@RequiresApi(Build.VERSION_CODES.S)
internal class OneNativeBackdropCapture(
  private val owner: ViewGroup,
  private val includeOwnerChildren: Boolean,
  private val drawOwnerChildren: (Canvas) -> Unit,
  private val onChange: () -> Unit,
) {
  /** Latest capture covering the owner's bounds, or null before the first. */
  var bitmap: Bitmap? = null
    private set

  private var spare: Bitmap? = null
  private val canvas = Canvas()
  private val path = ArrayList<View>()
  private val pathMatrix = Matrix()
  private val inverse = Matrix()
  private var listening = false

  // capture before the window draws; a changed backdrop re-records the blur
  // in the same traversal, so it stays frame-synced with scrolling.
  private val preDrawListener = ViewTreeObserver.OnPreDrawListener {
    if (capture()) onChange()
    true
  }

  fun start() {
    if (listening) return
    owner.viewTreeObserver.addOnPreDrawListener(preDrawListener)
    listening = true
  }

  fun stop() {
    if (listening) {
      owner.viewTreeObserver.takeIf { it.isAlive }?.removeOnPreDrawListener(preDrawListener)
      listening = false
    }
    // no recycle(): a recorded display list may still reference either bitmap
    // until the owner re-records; dropping the references is enough.
    bitmap = null
    spare = null
  }

  /** Captures into the spare bitmap; returns true when the backdrop changed. */
  private fun capture(): Boolean {
    if (!owner.isShown) return false
    val w = owner.width
    val h = owner.height
    if (w <= 0 || h <= 0 || !buildPath()) return false

    val sw = ceil(w / DOWNSAMPLE).toInt().coerceAtLeast(1)
    val sh = ceil(h / DOWNSAMPLE).toInt().coerceAtLeast(1)
    val target = spare?.takeIf { it.width == sw && it.height == sh }
      ?: Bitmap.createBitmap(sw, sh, Bitmap.Config.ARGB_8888).also { spare = it }

    target.eraseColor(0)
    canvas.setBitmap(target)
    val save = canvas.save()
    try {
      canvas.scale(sw / w.toFloat(), sh / h.toFloat())
      canvas.concat(inverse)
      drawBehind()
    } catch (e: IllegalArgumentException) {
      // a hardware bitmap behind the owner cannot rasterize in software;
      // this frame keeps the previous backdrop.
      logCaptureFailureOnce(e)
      return false
    } finally {
      canvas.restoreToCount(save)
      canvas.setBitmap(null)
    }

    val front = bitmap
    if (front != null && front.sameAs(target)) return false
    bitmap = target
    spare = front
    return true
  }

  // root first, owner last; pathMatrix maps owner-local bounds into root-local
  // coordinates and `inverse` undoes it, so the capture lands at the owner.
  private fun buildPath(): Boolean {
    path.clear()
    val root = captureRoot()
    var v: View = owner
    while (true) {
      path.add(v)
      if (v === root) break
      v = v.parent as? View ?: return false
    }
    path.reverse()
    Log.d("OneNativeBackdropTMP", "root=" + root.javaClass.name + " path=" + path.joinToString { it.javaClass.simpleName + ":" + (it as? ViewGroup)?.childCount })
    pathMatrix.reset()
    pathMatrix.preTranslate(-root.scrollX.toFloat(), -root.scrollY.toFloat())
    for (i in 1 until path.size) {
      val child = path[i]
      pathMatrix.preTranslate(child.left.toFloat(), child.top.toFloat())
      pathMatrix.preConcat(child.matrix)
      if (child !== owner) pathMatrix.preTranslate(-child.scrollX.toFloat(), -child.scrollY.toFloat())
    }
    return pathMatrix.invert(inverse)
  }

  // the same transform sequence as View.draw(Canvas, ViewGroup, long)'s
  // software path, applied only to the views that render behind the owner.
  private fun drawBehind() {
    val root = path[0]
    root.background?.draw(canvas)
    canvas.translate(-root.scrollX.toFloat(), -root.scrollY.toFloat())
    for (i in 0 until path.size - 1) {
      val group = path[i] as ViewGroup
      val next = path[i + 1]
      for (j in 0 until group.childCount) {
        val child = group.getChildAt(group.getChildDrawingOrder(j))
        if (child === next) break
        drawChild(child)
      }
      canvas.translate(next.left.toFloat(), next.top.toFloat())
      canvas.concat(next.matrix)
      if (next === owner) break
      next.background?.draw(canvas)
      canvas.translate(-next.scrollX.toFloat(), -next.scrollY.toFloat())
    }
    if (includeOwnerChildren) {
      owner.background?.draw(canvas)
      canvas.translate(-owner.scrollX.toFloat(), -owner.scrollY.toFloat())
      drawOwnerChildren(canvas)
    }
  }

  private fun drawChild(child: View) {
    if (child.visibility != View.VISIBLE) return
    val save = canvas.save()
    canvas.translate(child.left.toFloat(), child.top.toFloat())
    canvas.concat(child.matrix)
    if (child.alpha < 1f) {
      canvas.saveLayerAlpha(0f, 0f, child.width.toFloat(), child.height.toFloat(), (child.alpha * 255).toInt())
    }
    canvas.translate(-child.scrollX.toFloat(), -child.scrollY.toFloat())
    child.draw(canvas)
    canvas.restoreToCount(save)
  }

  // nearest react-native-screens Screen (scopes the backdrop to the current
  // screen, keeping transition frames out), else the React root, else the
  // window root.
  private fun captureRoot(): View {
    var parent = owner.parent
    var reactRoot: View? = null
    while (parent is View) {
      if (parent.javaClass.name == SCREEN_CLASS) return parent
      if (reactRoot == null && parent is ReactRootView) reactRoot = parent
      parent = parent.parent
    }
    return reactRoot ?: owner.rootView
  }

  private companion object {
    private const val SCREEN_CLASS = "com.swmansion.rnscreens.Screen"

    // the capture renders at 1/4 scale; the Gaussians that consume it are
    // several capture pixels wide, so the upscale never shows.
    private const val DOWNSAMPLE = 4f

    private var captureFailureLogged = false

    private fun logCaptureFailureOnce(e: IllegalArgumentException) {
      if (!captureFailureLogged) {
        captureFailureLogged = true
        Log.w("OneNativeBackdrop", "backdrop capture skipped", e)
      }
    }
  }
}
