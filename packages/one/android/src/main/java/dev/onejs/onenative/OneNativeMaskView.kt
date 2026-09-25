package dev.onejs.onenative

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BlendMode
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.os.Build
import android.view.View
import android.widget.FrameLayout

/**
 * Arbitrary-element mask (UI.Mask, masked-view compatible). Child 0 is the
 * mask element: it never displays, its alpha gates the content.
 *
 * Each frame the mask child is drawn into a reused bitmap (reallocated only
 * on size change), then the content children are drawn into an offscreen
 * layer with the mask child hidden, and the bitmap is composited with DST_IN.
 * Redrawing the mask every frame keeps animated masks live at the cost of one
 * extra subtree draw — Mask subtrees are small and Mask instances are rare.
 */
class OneNativeMaskView(context: Context) : FrameLayout(context) {

  private var maskBitmap: Bitmap? = null
  private var maskCanvas: Canvas? = null

  private val maskPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      blendMode = BlendMode.DST_IN
    } else {
      @Suppress("DEPRECATION")
      xfermode = PorterDuffXfermode(PorterDuff.Mode.DST_IN)
    }
  }

  private val maskChild: View?
    get() = if (childCount > 0) getChildAt(0) else null

  override fun dispatchDraw(canvas: Canvas) {
    val mask = maskChild
    val w = width
    val h = height
    if (mask == null || w <= 0 || h <= 0) {
      super.dispatchDraw(canvas)
      return
    }

    // Render the mask subtree into the reused bitmap.
    var bitmap = maskBitmap
    if (bitmap == null || bitmap.width != w || bitmap.height != h) {
      bitmap?.recycle()
      bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
      maskBitmap = bitmap
      maskCanvas = Canvas(bitmap)
    }
    val maskCanvas = maskCanvas!!
    maskCanvas.drawColor(0x00000000, PorterDuff.Mode.CLEAR)
    val wasVisible = mask.visibility == VISIBLE
    mask.visibility = VISIBLE
    val saveCount = maskCanvas.save()
    maskCanvas.translate(mask.left.toFloat(), mask.top.toFloat())
    mask.draw(maskCanvas)
    maskCanvas.restoreToCount(saveCount)

    // Content pass with the mask hidden, then DST_IN the mask bitmap over it.
    mask.visibility = GONE
    val sc = canvas.saveLayer(0f, 0f, w.toFloat(), h.toFloat(), null)
    super.dispatchDraw(canvas)
    maskPaint.shader = null
    canvas.drawBitmap(bitmap, 0f, 0f, maskPaint)
    canvas.restoreToCount(sc)
    if (wasVisible) mask.visibility = VISIBLE
  }

  override fun onDetachedFromWindow() {
    maskBitmap?.recycle()
    maskBitmap = null
    maskCanvas = null
    super.onDetachedFromWindow()
  }
}
