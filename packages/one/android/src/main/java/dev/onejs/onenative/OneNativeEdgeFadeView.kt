// vendored from react-native-edge-fade (MIT, Copyright (c) 2026 Giulio Amato),
// trimmed to mask + blur for OneNativeEdgeFade (overlay lives in RN core).
// blur mode blurs the backdrop captured by OneNativeBackdropCapture (from
// @sbaiahmed1/react-native-blur's QmBlurView capture). see VENDORING.md.
package dev.onejs.onenative

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BlendMode
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.RenderEffect
import android.graphics.RenderNode
import android.graphics.Shader
import android.os.Build
import android.os.Trace
import android.util.Log
import android.view.ViewTreeObserver
import android.widget.FrameLayout
import androidx.annotation.RequiresApi
import androidx.core.graphics.ColorUtils
import kotlin.math.ceil
import kotlin.math.roundToInt

/**
 * Mask- and blur-mode edge fade renderer.
 *
 * Wraps arbitrary children and fades them toward one or more edges. Two modes,
 * selected by [mode]:
 *   - `"mask"` — dissolves the content to transparent along the edge (alpha
 *     gradient composited with DST_IN).
 *   - `"blur"` — progressively blurs everything rendered under the edge
 *     strips (the backdrop behind this view plus its own children), like the
 *     iOS variable blur (API 31+; degrades to `"mask"` below that).
 *
 * The gradient shape of every edge follows a curve resolved by
 * [OneNativeEdgeFadeCurves]; mask shaders are cached in
 * [OneNativeEdgeFadeShaderSlot].
 *
 * Blur mode records the captured backdrop once, then composites a stack of
 * increasing-radius Gaussians, each masked to its own slice of the fade
 * curve's presence envelope, so the perceived radius grows toward the outer
 * edge following the curve's own shape. An optional frost veil
 * ([overlayColor]) tints the frost like iOS frosted glass.
 *
 * Overlay mode never reaches this view: RN core backgroundImage gradients
 * paint it in JS.
 */
class OneNativeEdgeFadeView(context: Context) : FrameLayout(context) {

  // ── Props (set by OneNativeEdgeFadeManager; sizes in px) ──────────────────

  var fadeTop:    Float = 0f
  var fadeBottom: Float = 0f
  var fadeLeft:   Float = 0f
  var fadeRight:  Float = 0f

  var curveTop:    String = "smooth"
  var curveBottom: String = "smooth"
  var curveLeft:   String = "smooth"
  var curveRight:  String = "smooth"

  /** `"mask"` or `"blur"`. Anything else renders as `"mask"`. */
  var mode: String = "mask"

  /** Max blur radius (px) at the outer edge in `"blur"` mode. */
  var blurRadius: Float = 0f

  /** Fraction of the band over which the blur envelope completes (0.05–1). */
  var frostProgression: Float = 1f

  /**
   * Frost-veil color as 0xAARRGGBB, resolved in JS. 0 (or any alpha-0 value)
   * means no veil: blur stays a pure content-derived Gaussian fade.
   */
  var overlayColor: Int = 0

  var fadeRadius: Float = 0f

  // ── Per-edge shader cache ─────────────────────────────────────────────────

  private val topSlot    = OneNativeEdgeFadeShaderSlot()
  private val bottomSlot = OneNativeEdgeFadeShaderSlot()
  private val leftSlot   = OneNativeEdgeFadeShaderSlot()
  private val rightSlot  = OneNativeEdgeFadeShaderSlot()

  // ── Blur mode state (API 31+) ─────────────────────────────────────────────

  // What renders under the strips, captured on every pre-draw (API 31+ blur
  // mode only; see syncBackdrop).
  @Suppress("NewApi")
  private var backdrop: OneNativeBackdropCapture? = null

  // Per-edge blur nodes, edge order TOP/BOTTOM/LEFT/RIGHT. Each node records
  // its strip of the captured backdrop at capture resolution; nodes for
  // inactive edges stay null.
  @Suppress("NewApi")
  private var edgeNodes: Array<RenderNode?> = arrayOfNulls(EDGE_COUNT)

  // Last radius (capture pixels) and node size per edge, so the native
  // RenderEffect is only recreated when either changes.
  private val edgeNodeRadius = FloatArray(EDGE_COUNT) { -1f }
  private val edgeNodeSize = LongArray(EDGE_COUNT)

  // Per-edge gradient caches — rebuild a native LinearGradient only when its
  // curve or size changes, not every frame.
  private data class MaskGradKey(
    val curve: String, val size: Float, val dim: Float, val param: Float,
  )
  private data class VeilGradKey(
    val curve: String, val size: Float, val dim: Float, val color: Int, val param: Float = 0f,
  )

  private class GradientCache<K> {
    private var key: K? = null
    private var shader: LinearGradient? = null
    fun acquire(k: K, build: () -> LinearGradient): LinearGradient {
      shader?.let { if (key == k) return it }
      return build().also { key = k; shader = it }
    }
  }

  private val maskCaches = Array(EDGE_COUNT) { GradientCache<MaskGradKey>() }

  private val veilTopCache     = GradientCache<VeilGradKey>()
  private val veilBottomCache  = GradientCache<VeilGradKey>()
  private val veilLeftCache    = GradientCache<VeilGradKey>()
  private val veilRightCache   = GradientCache<VeilGradKey>()

  // ── Paints ────────────────────────────────────────────────────────────────

  private val overlayPaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.DITHER_FLAG)
  private val backdropPaint = Paint(Paint.FILTER_BITMAP_FLAG)
  private val backdropSrc = Rect()
  private val backdropDst = RectF()
  private val maskPaint    = Paint(Paint.ANTI_ALIAS_FLAG or Paint.DITHER_FLAG).apply {
    // BlendMode is the modern (API 29+) replacement for PorterDuffXfermode.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      blendMode = BlendMode.DST_IN
    } else {
      @Suppress("DEPRECATION")
      xfermode = PorterDuffXfermode(PorterDuff.Mode.DST_IN)
    }
  }

  // ── Rounded clip path cache ───────────────────────────────────────────────

  private val clipPath   = Path()
  private val clipBounds = RectF()
  private var lastClipRadius = -1f
  private var lastClipW = 0f
  private var lastClipH = 0f

  // Reused for the single-edge mask fast path so it doesn't allocate every frame.
  private val singleEdgeRect = RectF()

  // ── Scroll sync ───────────────────────────────────────────────────────────

  // Our fade strips are composited in dispatchDraw from a per-frame recording
  // of the children. When a descendant list scrolls, only its own RenderNode
  // is re-rendered — this view's display list (holding the fade composite) is
  // NOT re-executed, so the strip would show stale content and trail/flick
  // during a fling. Invalidating on every scroll change forces dispatchDraw
  // to re-record the children at the new offset, keeping the fade
  // frame-synced with the scroll. Gated on an active fade so idle screens
  // pay nothing.
  private val scrollListener = ViewTreeObserver.OnScrollChangedListener {
    if (fadeTop > 0f || fadeBottom > 0f || fadeLeft > 0f || fadeRight > 0f) {
      invalidate()
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    viewTreeObserver.addOnScrollChangedListener(scrollListener)
    syncBackdrop()
  }

  override fun onDetachedFromWindow() {
    viewTreeObserver.takeIf { it.isAlive }?.removeOnScrollChangedListener(scrollListener)
    backdrop?.stop()
    backdrop = null
    topSlot.release()
    bottomSlot.release()
    leftSlot.release()
    rightSlot.release()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      edgeNodes.forEach { it?.discardDisplayList() }
    }
    edgeNodes = arrayOfNulls(EDGE_COUNT)
    edgeNodeRadius.fill(-1f)
    edgeNodeSize.fill(0L)
    super.onDetachedFromWindow()
  }

  /**
   * Starts or stops the backdrop capture to match the props; the manager calls
   * this after every prop transaction. Only an attached, active API 31+ blur
   * pays for captures.
   */
  fun syncBackdrop() {
    val active = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
      isAttachedToWindow && mode == "blur" && blurRadius > 0f &&
      (fadeTop > 0f || fadeBottom > 0f || fadeLeft > 0f || fadeRight > 0f)
    if (!active) {
      backdrop?.stop()
      backdrop = null
      return
    }
    if (backdrop == null) {
      backdrop = OneNativeBackdropCapture(this, includeOwnerChildren = true, ::drawChildren, ::invalidate)
        .also { it.start() }
    }
  }

  private fun drawChildren(canvas: Canvas) {
    super.dispatchDraw(canvas)
  }

  // ── Drawing ───────────────────────────────────────────────────────────────

  override fun dispatchDraw(canvas: Canvas) {
    Trace.beginSection("OneNativeEdgeFade.dispatchDraw")
    try {
      val hasAnyFade = fadeTop > 0f || fadeBottom > 0f || fadeLeft > 0f || fadeRight > 0f
      val roundClip  = fadeRadius > 0f

      if (roundClip) { canvas.save(); canvas.clipPath(clipPath()) }

      when {
        !hasAnyFade   -> super.dispatchDraw(canvas)
        mode == "blur" -> drawBlur(canvas)
        else           -> drawMask(canvas)
      }

      if (roundClip) canvas.restore()
    } finally {
      Trace.endSection()
    }
  }

  private fun drawMask(canvas: Canvas) {
    Trace.beginSection("OneNativeEdgeFade.mask")
    val w = width.toFloat(); val h = height.toFloat()
    try {
      // Single-edge fast path: shrink the offscreen layer to the edge strip,
      // saving up to ~30× memory bandwidth versus a full-view saveLayer.
      // Multi-edge configurations usually span the full view, so the shrink
      // saves nothing and we fall back to the full-view path.
      val edgeCount = (if (fadeTop > 0f) 1 else 0) +
                      (if (fadeBottom > 0f) 1 else 0) +
                      (if (fadeLeft > 0f) 1 else 0) +
                      (if (fadeRight > 0f) 1 else 0)

      if (edgeCount == 1) drawMaskSingleEdge(canvas, w, h)
      else                drawMaskFullView(canvas, w, h)
    } finally {
      Trace.endSection()
    }
  }

  private fun drawMaskFullView(canvas: Canvas, w: Float, h: Float) {
    val sc = canvas.saveLayer(0f, 0f, w, h, null)
    super.dispatchDraw(canvas)
    drawMaskStrips(canvas, w, h)
    canvas.restoreToCount(sc)
  }

  private fun drawMaskSingleEdge(canvas: Canvas, w: Float, h: Float) {
    val edge = singleEdgeRect.apply {
      when {
        fadeTop > 0f    -> set(0f, 0f, w, fadeTop)
        fadeBottom > 0f -> set(0f, h - fadeBottom, w, h)
        fadeLeft > 0f   -> set(0f, 0f, fadeLeft, h)
        else            -> set(w - fadeRight, 0f, w, h)
      }
    }

    // Pass 1 — content outside the edge strip is drawn directly to the main canvas.
    val s1 = canvas.save()
    when {
      fadeTop > 0f    -> canvas.clipRect(0f, edge.bottom, w, h)
      fadeBottom > 0f -> canvas.clipRect(0f, 0f, w, edge.top)
      fadeLeft > 0f   -> canvas.clipRect(edge.right, 0f, w, h)
      else            -> canvas.clipRect(0f, 0f, edge.left, h)
    }
    super.dispatchDraw(canvas)
    canvas.restoreToCount(s1)

    // Pass 2 — small offscreen layer over the edge strip. saveLayer's bounds
    // also clip subsequent draws, so dispatchDraw is implicitly limited here.
    val s2 = canvas.saveLayer(edge.left, edge.top, edge.right, edge.bottom, null)
    super.dispatchDraw(canvas)
    drawMaskStrips(canvas, w, h)
    canvas.restoreToCount(s2)
  }

  private fun drawMaskStrips(canvas: Canvas, w: Float, h: Float) {
    val hw = canvas.isHardwareAccelerated
    if (fadeTop > 0f) {
      maskPaint.shader = topSlot.acquire(curveTop, fadeTop, 0f, 0f, fadeTop, 0f, 0f, hw)
      canvas.drawRect(0f, 0f, w, fadeTop, maskPaint)
    }
    if (fadeBottom > 0f) {
      maskPaint.shader = bottomSlot.acquire(curveBottom, fadeBottom, h, 0f, h - fadeBottom, 0f, h, hw)
      canvas.drawRect(0f, h - fadeBottom, w, h, maskPaint)
    }
    if (fadeLeft > 0f) {
      maskPaint.shader = leftSlot.acquire(curveLeft, fadeLeft, 0f, fadeLeft, 0f, 0f, 0f, hw)
      canvas.drawRect(0f, 0f, fadeLeft, h, maskPaint)
    }
    if (fadeRight > 0f) {
      maskPaint.shader = rightSlot.acquire(curveRight, fadeRight, w, w - fadeRight, 0f, w, 0f, hw)
      canvas.drawRect(w - fadeRight, 0f, w, h, maskPaint)
    }
  }

  // ── Blur mode ─────────────────────────────────────────────────────────────

  private fun drawBlur(canvas: Canvas) {
    Trace.beginSection("OneNativeEdgeFade.blur")
    try {
      val w = width.toFloat(); val h = height.toFloat()

      // createBlurEffect / drawRenderNode need API 31.
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
        logBlurFallbackOnce()
        drawMask(canvas)
        return
      }
      // A software canvas is a backdrop capture (this view's or another blur
      // view's): contribute only the children, never the blur itself. At
      // radius 0 the strips are neutral, so the children render as-is.
      val capture = backdrop?.bitmap
      if (!canvas.isHardwareAccelerated || blurRadius <= 0f || capture == null) {
        super.dispatchDraw(canvas)
        return
      }
      drawBlurLayered(canvas, w, h, capture)
    } finally {
      Trace.endSection()
    }
  }

  // The library's progressive blur (react-native-blur ProgressiveBlurView):
  // per edge, one Gaussian of the backdrop strip composited through a DST_IN
  // mask that follows the edge's fade curve. The Gaussian is a platform
  // RenderEffect run at capture resolution, so it only processes the strip's
  // downsampled pixels.
  @RequiresApi(Build.VERSION_CODES.S)
  private fun drawBlurLayered(canvas: Canvas, w: Float, h: Float, capture: Bitmap) {
    // Sharp children underneath the frost (the real backdrop is already drawn
    // by the views behind) — content stays visible under the fade, just
    // blurred toward the edge (no dissolve), like iOS.
    super.dispatchDraw(canvas)

    if (fadeTop > 0f) {
      drawEdgeBlur(canvas, EDGE_TOP, capture, curveTop, fadeTop, 0f,
        0f, 0f, w, fadeTop, 0f, fadeTop, 0f, 0f)
    }
    if (fadeBottom > 0f) {
      drawEdgeBlur(canvas, EDGE_BOTTOM, capture, curveBottom, fadeBottom, h,
        0f, h - fadeBottom, w, h, 0f, h - fadeBottom, 0f, h)
    }
    if (fadeLeft > 0f) {
      drawEdgeBlur(canvas, EDGE_LEFT, capture, curveLeft, fadeLeft, 0f,
        0f, 0f, fadeLeft, h, fadeLeft, 0f, 0f, 0f)
    }
    if (fadeRight > 0f) {
      drawEdgeBlur(canvas, EDGE_RIGHT, capture, curveRight, fadeRight, w,
        w - fadeRight, 0f, w, h, w - fadeRight, 0f, w, 0f)
    }

    // Optional frost material veil on top (opt-in via a non-transparent
    // overlayColor).
    if ((overlayColor ushr 24) != 0) drawFrostVeil(canvas, w, h, overlayColor)
  }

  // Blur + composite one edge. The node records the band, padded inward by the
  // radius so the Gaussian at the band's inner edge samples real neighboring
  // content instead of a clamped seam (the mask is 0 there, so the padding
  // never shows), then the band is masked with DST_IN.
  //
  // `bandLeft..bandBottom` is the visible band rect; `(gx0,gy0)-(gx1,gy1)` is
  // the inner→outer line the mask gradient runs along.
  @RequiresApi(Build.VERSION_CODES.S)
  private fun drawEdgeBlur(
    canvas: Canvas, edge: Int, capture: Bitmap, curve: String,
    size: Float, dim: Float,
    bandLeft: Float, bandTop: Float, bandRight: Float, bandBottom: Float,
    gx0: Float, gy0: Float, gx1: Float, gy1: Float,
  ) {
    val vw = width.toFloat(); val vh = height.toFloat()
    val scale = capture.width / vw
    val pad = ceil(blurRadius)
    val nLeft   = (bandLeft   - pad).coerceAtLeast(0f)
    val nTop    = (bandTop    - pad).coerceAtLeast(0f)
    val nRight  = (bandRight  + pad).coerceAtMost(vw)
    val nBottom = (bandBottom + pad).coerceAtMost(vh)

    backdropSrc.set(
      (nLeft * scale).toInt(), (nTop * scale).toInt(),
      ceil(nRight * scale).toInt().coerceAtMost(capture.width),
      ceil(nBottom * scale).toInt().coerceAtMost(capture.height),
    )
    if (backdropSrc.isEmpty) return
    val node = edgeNodes[edge] ?: RenderNode("OneNativeEdgeFadeBlur_$edge").also { edgeNodes[edge] = it }
    node.setPosition(0, 0, backdropSrc.width(), backdropSrc.height())
    val rc = node.beginRecording()
    try {
      backdropDst.set(0f, 0f, backdropSrc.width().toFloat(), backdropSrc.height().toFloat())
      rc.drawBitmap(capture, backdropSrc, backdropDst, backdropPaint)
    } finally {
      node.endRecording()
    }

    val radius = blurRadius * scale
    val nodeSize = (backdropSrc.width().toLong() shl 32) or backdropSrc.height().toLong()
    if (edgeNodeRadius[edge] != radius || edgeNodeSize[edge] != nodeSize) {
      // MIRROR (not CLAMP): on the band's exposed sides the node is coerced to
      // the view bounds with no padding, so CLAMP would repeat the edge pixel
      // and leave a hard streaked edge; MIRROR samples a reflection for a
      // natural soft edge.
      node.setRenderEffect(RenderEffect.createBlurEffect(radius, radius, Shader.TileMode.MIRROR))
      edgeNodeRadius[edge] = radius
      edgeNodeSize[edge] = nodeSize
    }

    val fp = frostProgression.coerceIn(0.05f, 1f)
    val mask = maskCaches[edge].acquire(MaskGradKey(curve, size, dim, fp)) {
      frostGradient(curve, gx0, gy0, gx1, gy1, fp)
    }
    // Composite: offscreen layer over the band, node drawn back at view scale,
    // then the DST_IN gradient (view coords) multiplies its alpha.
    val sc = canvas.saveLayer(bandLeft, bandTop, bandRight, bandBottom, null)
    canvas.save()
    canvas.translate(backdropSrc.left / scale, backdropSrc.top / scale)
    canvas.scale(1f / scale, 1f / scale)
    canvas.drawRenderNode(node)
    canvas.restore()
    maskPaint.shader = mask
    canvas.drawRect(bandLeft, bandTop, bandRight, bandBottom, maskPaint)
    canvas.restoreToCount(sc)
  }

  // ── Frost material veil (blur mode, opt-in via overlayColor) ──────────────
  // Translucent (inner) → material color (outer), ramping in lockstep with the
  // blur's own progression (see veilGradient) so the tint and the frost share a
  // single edge. Capped at VEIL_MAX_ALPHA so a hint of blurred content shows
  // through, like iOS frosted glass. Without a color, blur mode stays a pure
  // content-derived Gaussian fade.

  private fun drawFrostVeil(canvas: Canvas, w: Float, h: Float, veil: Int) {
    val p = frostProgression
    if (fadeTop > 0f) {
      overlayPaint.shader = veilTopCache.acquire(VeilGradKey(curveTop, fadeTop, 0f, veil, p)) {
        veilGradient(curveTop, 0f, fadeTop, 0f, 0f, veil)
      }
      canvas.drawRect(0f, 0f, w, fadeTop, overlayPaint)
    }
    if (fadeBottom > 0f) {
      overlayPaint.shader = veilBottomCache.acquire(VeilGradKey(curveBottom, fadeBottom, h, veil, p)) {
        veilGradient(curveBottom, 0f, h - fadeBottom, 0f, h, veil)
      }
      canvas.drawRect(0f, h - fadeBottom, w, h, overlayPaint)
    }
    if (fadeLeft > 0f) {
      overlayPaint.shader = veilLeftCache.acquire(VeilGradKey(curveLeft, fadeLeft, 0f, veil, p)) {
        veilGradient(curveLeft, fadeLeft, 0f, 0f, 0f, veil)
      }
      canvas.drawRect(0f, 0f, fadeLeft, h, overlayPaint)
    }
    if (fadeRight > 0f) {
      overlayPaint.shader = veilRightCache.acquire(VeilGradKey(curveRight, fadeRight, w, veil, p)) {
        veilGradient(curveRight, w - fadeRight, 0f, w, 0f, veil)
      }
      canvas.drawRect(w - fadeRight, 0f, w, h, overlayPaint)
    }
  }

  // The tint veil tracks the blur's own progression, so tint and frost deepen
  // together instead of the veil drawing a second edge. The blur radius grows
  // smoothly across the whole band (light inner → heaviest at the outer edge),
  // so the veil ramps the same way: a gentle smoothstep from 0 (inner) to
  // VEIL_MAX_ALPHA (outer) over the FULL band — no quick ramp-then-plateau,
  // whose plateau start read as a hard tint line at low blur (where no blur
  // softens it).
  private fun veilGradient(
    curve: String, x0: Float, y0: Float, x1: Float, y1: Float, color: Int,
  ): LinearGradient {
    val n = 16
    val stops = FloatArray(n) { it / (n - 1f) }
    val colors = IntArray(n) { i ->
      val t = stops[i]
      val weight = t * t * (3f - 2f * t)
      ColorUtils.setAlphaComponent(color, (weight * VEIL_MAX_ALPHA * 255f).roundToInt())
    }
    return LinearGradient(x0, y0, x1, y1, colors, stops, Shader.TileMode.CLAMP)
  }

  // Curve-governed blur mask, the same ramp as the iOS variable blur mask.
  // Along inner (t=0) → outer (t=1):
  //   u = min(t / fp, 1)        — compress the envelope into the inner `fp`
  //                                fraction of the band
  //   alpha = presenceAt(curve, u)
  // RGB is irrelevant under DST_IN — only the alpha ramp is consumed.
  private fun frostGradient(
    curve: String, x0: Float, y0: Float, x1: Float, y1: Float, fp: Float,
  ): LinearGradient {
    // 32 stops so the sampled curve shape is resolved smoothly.
    val n = 32
    val stops = FloatArray(n) { it / (n - 1f) }
    val colors = IntArray(n) { i ->
      val u = (stops[i] / fp).coerceAtMost(1f)
      val p = OneNativeEdgeFadeCurves.presenceAt(curve, u).coerceIn(0f, 1f)
      ColorUtils.setAlphaComponent(Color.BLACK, (p * 255f).roundToInt())
    }
    return LinearGradient(x0, y0, x1, y1, colors, stops, Shader.TileMode.CLAMP)
  }

  // ── Rounded clip ──────────────────────────────────────────────────────────

  private fun clipPath(): Path {
    val w = width.toFloat(); val h = height.toFloat()
    if (fadeRadius == lastClipRadius && w == lastClipW && h == lastClipH) return clipPath
    lastClipRadius = fadeRadius; lastClipW = w; lastClipH = h
    clipBounds.set(0f, 0f, w, h)
    clipPath.reset()
    clipPath.addRoundRect(clipBounds, fadeRadius, fadeRadius, Path.Direction.CW)
    return clipPath
  }

  private companion object {
    // Edge indices into edgeNodes.
    private const val EDGE_TOP = 0
    private const val EDGE_BOTTOM = 1
    private const val EDGE_LEFT = 2
    private const val EDGE_RIGHT = 3
    private const val EDGE_COUNT = 4

    // Frost-veil alpha cap (matches iOS kVeilMaxAlpha).
    private const val VEIL_MAX_ALPHA = 0.6f

    // Per-process log when blur mode degrades to mask on API < 31.
    private var blurFallbackLogged = false

    private fun logBlurFallbackOnce() {
      if (!blurFallbackLogged) {
        blurFallbackLogged = true
        Log.w(
          "OneNativeEdgeFade",
          "mode=\"blur\" requires Android 12 (API 31)+ — falling back to mask fade.",
        )
      }
    }
  }
}
