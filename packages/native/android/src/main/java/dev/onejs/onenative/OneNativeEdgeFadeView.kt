// vendored from react-native-edge-fade (MIT, Copyright (c) 2026 Giulio Amato),
// trimmed to mask + blur for OneNativeEdgeFade (overlay lives in RN core).
// see VENDORING.md.
package dev.onejs.onenative

import android.content.Context
import android.graphics.BlendMode
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
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
 *   - `"blur"` — progressively blurs the content toward the edge (API 31+;
 *     degrades to `"mask"` below that, on a software canvas, or at radius 0).
 *
 * The gradient shape of every edge follows a curve resolved by
 * [OneNativeEdgeFadeCurves]; mask shaders are cached in
 * [OneNativeEdgeFadeShaderSlot].
 *
 * Blur mode records the content once, then composites a stack of
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

  // Children recorded once per frame; every per-edge/level node references this
  // recording so the blur only reprocesses each edge strip, not the whole view.
  @Suppress("NewApi")
  private var blurNode: RenderNode? = null

  // Per-edge × per-level nodes: levelNodes[edge][k], edge order TOP/BOTTOM/LEFT/
  // RIGHT. Each node is sized to just its edge strip; nodes for inactive edges
  // stay null.
  @Suppress("NewApi")
  private var levelNodes: Array<Array<RenderNode?>> =
    Array(EDGE_COUNT) { arrayOfNulls(LEVEL_FRACTIONS.size) }

  // Last recorded absolute rect per node. A rect change (fade or view resized)
  // means the RenderEffect must be reassigned, independently of a radius change.
  private val lastLevelRect: Array<Array<RectF?>> =
    Array(EDGE_COUNT) { arrayOfNulls(LEVEL_FRACTIONS.size) }

  // Skip recreating the native RenderEffect when neither the radius nor the
  // node's rect changed since the last frame.
  private var lastBlurEffectRadius = -1f

  // Per-edge/level gradient caches — rebuild a native LinearGradient only when
  // its curve or size changes, not every frame.
  private data class LevelGradKey(
    val curve: String, val size: Float, val dim: Float, val level: Int, val param: Float = 0f,
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

  // One cache slot per level per edge — each level owns an independent slice.
  private fun levelCacheArray() = Array(LEVEL_FRACTIONS.size) { GradientCache<LevelGradKey>() }
  private val levelTopCaches    = levelCacheArray()
  private val levelBottomCaches = levelCacheArray()
  private val levelLeftCaches   = levelCacheArray()
  private val levelRightCaches  = levelCacheArray()

  private val veilTopCache     = GradientCache<VeilGradKey>()
  private val veilBottomCache  = GradientCache<VeilGradKey>()
  private val veilLeftCache    = GradientCache<VeilGradKey>()
  private val veilRightCache   = GradientCache<VeilGradKey>()

  // ── Paints ────────────────────────────────────────────────────────────────

  // Frost "vibrancy": a fixed saturation + brightness grade on the blurred
  // pixels. Apple's frosted-glass material is a smooth heavy Gaussian that is
  // slightly DESATURATED and near-neutral in brightness (a soft pastel), not a
  // boosted/darkened wash — matching iOS, whose saturation compensation is
  // likewise internal (see the sat-comp layers in
  // OneNativeEdgeFadeComponentView.mm).
  private val frostVibrancyFilter = ColorMatrixColorFilter(
    ColorMatrix().apply {
      setSaturation(FROST_SATURATION)
      postConcat(
        ColorMatrix(
          floatArrayOf(
            FROST_LIFT, 0f, 0f, 0f, 0f,
            0f, FROST_LIFT, 0f, 0f, 0f,
            0f, 0f, FROST_LIFT, 0f, 0f,
            0f, 0f, 0f, 1f, 0f,
          ),
        ),
      )
    },
  )

  private val overlayPaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.DITHER_FLAG)
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
  }

  override fun onDetachedFromWindow() {
    viewTreeObserver.takeIf { it.isAlive }?.removeOnScrollChangedListener(scrollListener)
    topSlot.release()
    bottomSlot.release()
    leftSlot.release()
    rightSlot.release()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      blurNode?.discardDisplayList()
      levelNodes.forEach { edge -> edge.forEach { it?.discardDisplayList() } }
    }
    blurNode = null
    levelNodes = Array(EDGE_COUNT) { arrayOfNulls(LEVEL_FRACTIONS.size) }
    lastLevelRect.forEach { edge -> edge.fill(null) }
    lastBlurEffectRadius = -1f
    super.onDetachedFromWindow()
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
    if (fadeTop > 0f) {
      maskPaint.shader = topSlot.acquire(curveTop, fadeTop, 0f, 0f, fadeTop, 0f, 0f)
      canvas.drawRect(0f, 0f, w, fadeTop, maskPaint)
    }
    if (fadeBottom > 0f) {
      maskPaint.shader = bottomSlot.acquire(curveBottom, fadeBottom, h, 0f, h - fadeBottom, 0f, h)
      canvas.drawRect(0f, h - fadeBottom, w, h, maskPaint)
    }
    if (fadeLeft > 0f) {
      maskPaint.shader = leftSlot.acquire(curveLeft, fadeLeft, 0f, fadeLeft, 0f, 0f, 0f)
      canvas.drawRect(0f, 0f, fadeLeft, h, maskPaint)
    }
    if (fadeRight > 0f) {
      maskPaint.shader = rightSlot.acquire(curveRight, fadeRight, w, w - fadeRight, 0f, w, 0f)
      canvas.drawRect(w - fadeRight, 0f, w, h, maskPaint)
    }
  }

  // ── Blur mode ─────────────────────────────────────────────────────────────

  private fun drawBlur(canvas: Canvas) {
    Trace.beginSection("OneNativeEdgeFade.blur")
    try {
      val w = width.toFloat(); val h = height.toFloat()

      // createBlurEffect / drawRenderNode need API 31 and a hardware canvas.
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
          !canvas.isHardwareAccelerated ||
          blurRadius <= 0f) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) logBlurFallbackOnce()
        drawMask(canvas)
        return
      }
      drawBlurLayered(canvas, w, h)
    } finally {
      Trace.endSection()
    }
  }

  @RequiresApi(Build.VERSION_CODES.S)
  private fun drawBlurLayered(canvas: Canvas, w: Float, h: Float) {
    // Record children once into the content node; each per-edge/level node draws
    // a reference to this recording but is sized to just its edge strip, so the
    // blur RenderEffect only processes the strip's pixels, not the whole view.
    val content = (blurNode ?: RenderNode("OneNativeEdgeFadeBlur").also { blurNode = it })
    content.setPosition(0, 0, width, height)
    val rc = content.beginRecording()
    try {
      // Opaque backdrop first. The Gaussian samples across the whole strip, so
      // any transparency in the recording (gaps between children, a transparent
      // list background) gets spread by the blur — the larger the radius, the
      // wider it bleeds, making the frost turn semi-transparent and let content
      // show through (worse at high blur). Drawing the view's real background
      // into the recording fills those gaps; when the app sets an opaque
      // backgroundColor the strip is fully opaque and occludes at any radius.
      background?.draw(rc)
      super.dispatchDraw(rc)
    } finally {
      content.endRecording()
    }

    // Sharp base underneath the frost — content stays visible under the fade,
    // just blurred toward the edge (no dissolve), like iOS.
    super.dispatchDraw(canvas)

    if (fadeTop > 0f) {
      drawEdgeLevels(canvas, EDGE_TOP, content, curveTop, levelTopCaches, fadeTop, 0f,
        0f, 0f, w, fadeTop, 0f, fadeTop, 0f, 0f)
    }
    if (fadeBottom > 0f) {
      drawEdgeLevels(canvas, EDGE_BOTTOM, content, curveBottom, levelBottomCaches, fadeBottom, h,
        0f, h - fadeBottom, w, h, 0f, h - fadeBottom, 0f, h)
    }
    if (fadeLeft > 0f) {
      drawEdgeLevels(canvas, EDGE_LEFT, content, curveLeft, levelLeftCaches, fadeLeft, 0f,
        0f, 0f, fadeLeft, h, fadeLeft, 0f, 0f, 0f)
    }
    if (fadeRight > 0f) {
      drawEdgeLevels(canvas, EDGE_RIGHT, content, curveRight, levelRightCaches, fadeRight, w,
        w - fadeRight, 0f, w, h, w - fadeRight, 0f, w, 0f)
    }
    lastBlurEffectRadius = blurRadius

    // Optional frost material veil on top (opt-in via a non-transparent
    // overlayColor).
    if ((overlayColor ushr 24) != 0) drawFrostVeil(canvas, w, h, overlayColor)
  }

  // Blur + composite one edge's level stack. For each level: record the content
  // strip (downsampled per LEVEL_DOWNSCALE), blur it, and composite it over the
  // band through the level's DST_IN gradient mask.
  //
  // Padding rationale: createBlurEffect clamps samples at the node's bounds. If
  // the node rect were exactly the band, the gaussian at the band's inner edge
  // would sample clamped pixels and leave a seam; expanding the rect by
  // ceil(radius) gives it real neighboring content. The extra margin never
  // shows — the mask's alpha is 0 at the inner edge.
  //
  // `bandLeft..bandBottom` is the visible band rect; `(gx0,gy0)-(gx1,gy1)` is
  // the inner→outer line the mask gradient runs along.
  @RequiresApi(Build.VERSION_CODES.S)
  private fun drawEdgeLevels(
    canvas: Canvas, edge: Int, content: RenderNode, curve: String,
    caches: Array<GradientCache<LevelGradKey>>,
    size: Float, dim: Float,
    bandLeft: Float, bandTop: Float, bandRight: Float, bandBottom: Float,
    gx0: Float, gy0: Float, gx1: Float, gy1: Float,
  ) {
    val vw = width.toFloat(); val vh = height.toFloat()
    val edgeNodes = levelNodes[edge]
    val edgeRects = lastLevelRect[edge]

    var lo = 0f
    for (k in LEVEL_FRACTIONS.indices) {
      val hi = LEVEL_FRACTIONS[k]
      val ds = LEVEL_DOWNSCALE[k]
      val radius = blurRadius * LEVEL_FRACTIONS[k]
      val pad = ceil(radius)
      val nLeft   = (bandLeft   - pad).coerceAtLeast(0f)
      val nTop    = (bandTop    - pad).coerceAtLeast(0f)
      val nRight  = (bandRight  + pad).coerceAtMost(vw)
      val nBottom = (bandBottom + pad).coerceAtMost(vh)

      val node = edgeNodes[k] ?: RenderNode("OneNativeEdgeFadeBlurLevel_${edge}_$k").also { edgeNodes[k] = it }
      node.setPosition(0, 0,
        ceil((nRight - nLeft) * ds).roundToInt(), ceil((nBottom - nTop) * ds).roundToInt())
      val rc = node.beginRecording()
      try {
        rc.scale(ds, ds)
        rc.translate(-nLeft, -nTop)
        rc.drawRenderNode(content)
      } finally {
        node.endRecording()
      }

      val prevRect = edgeRects[k]
      val rectChanged = prevRect == null ||
        prevRect.left != nLeft || prevRect.top != nTop ||
        prevRect.right != nRight || prevRect.bottom != nBottom
      if (blurRadius != lastBlurEffectRadius || rectChanged) {
        node.setRenderEffect(
          if (radius > 0f) {
            // MIRROR (not CLAMP): on the band's exposed sides the node is coerced
            // to the view bounds with no padding, so CLAMP would repeat the edge
            // pixel and leave a hard streaked orlo; MIRROR samples a reflection
            // for a natural soft edge.
            val blur = RenderEffect.createBlurEffect(radius * ds, radius * ds, Shader.TileMode.MIRROR)
            RenderEffect.createColorFilterEffect(frostVibrancyFilter, blur)
          } else {
            null
          },
        )
      }
      edgeRects[k] = (prevRect ?: RectF()).apply { set(nLeft, nTop, nRight, nBottom) }

      // Composite: offscreen layer over the band, node drawn back at 1:1, then a
      // DST_IN gradient (view coords) multiplies its alpha. Each level masks to
      // its own [lo,hi] slice of the fade curve's presence envelope (compressed
      // into `fp` of the band), so the curve governs the whole progression.
      val fp = frostProgression.coerceIn(0.05f, 1f)
      val mask = caches[k].acquire(LevelGradKey(curve, size, dim, k, fp)) {
        frostGradient(curve, gx0, gy0, gx1, gy1, lo, hi, fp, curveShaped = k == 0)
      }
      val sc = canvas.saveLayer(bandLeft, bandTop, bandRight, bandBottom, null)
      canvas.translate(nLeft, nTop)
      canvas.scale(1f / ds, 1f / ds)
      canvas.drawRenderNode(node)
      canvas.scale(ds, ds)
      canvas.translate(-nLeft, -nTop)
      maskPaint.shader = mask
      canvas.drawRect(bandLeft, bandTop, bandRight, bandBottom, maskPaint)
      canvas.restoreToCount(sc)

      lo = hi
    }
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

  // Curve-governed level mask. Along inner (t=0) → outer (t=1):
  //   u = min(t / fp, 1)            — compress the envelope into the inner `fp`
  //                                    fraction of the band
  //   P = presenceAt(curve, u)      — the fade curve's presence at u
  //   v = clamp((P − lo)/(hi − lo)) — this level's [lo,hi] slice of P
  //   weight = v for level 0 (the visible sharp→frost transition, so editing the
  //     Bézier reshapes it directly); v·v·(3−2v) for the heavier levels — a
  //     zero-slope smoothstep anti-banding pass, since their fade-ins are
  //     internal cross-fades between two blur radii and a raw (non-zero-slope)
  //     entry draws a visible onset line ("band") on scrolling content.
  // RGB is irrelevant under DST_IN — only the alpha ramp is consumed.
  private fun frostGradient(
    curve: String, x0: Float, y0: Float, x1: Float, y1: Float,
    lo: Float, hi: Float, fp: Float, curveShaped: Boolean,
  ): LinearGradient {
    // 32 stops so the sampled curve shape is resolved smoothly.
    val n = 32
    val stops = FloatArray(n) { it / (n - 1f) }
    val range = hi - lo
    val colors = IntArray(n) { i ->
      val u = (stops[i] / fp).coerceAtMost(1f)
      val p = OneNativeEdgeFadeCurves.presenceAt(curve, u)
      val v = ((p - lo) / range).coerceIn(0f, 1f)
      val weight = if (curveShaped) v else v * v * (3f - 2f * v)
      ColorUtils.setAlphaComponent(Color.BLACK, (weight * 255f).roundToInt())
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
    // Edge indices into levelNodes / lastLevelRect.
    private const val EDGE_TOP = 0
    private const val EDGE_BOTTOM = 1
    private const val EDGE_LEFT = 2
    private const val EDGE_RIGHT = 3
    private const val EDGE_COUNT = 4

    // Per-level radius fractions AND presence-envelope slices: three
    // createBlurEffect levels of increasing radius, each masked to its own
    // [lo,hi] slice of the fade curve's presence envelope (see
    // frostGradient), so the radius grows toward the edge following the
    // curve's own shape rather than a fixed geometric ramp.
    private val LEVEL_FRACTIONS = floatArrayOf(0.35f, 0.65f, 1f)

    // Per-level strip render scale: the light first level stays full-res (its
    // small radius can't hide upscale blur), the heavy levels run at half-res —
    // ~4× fewer pixels on the expensive Gaussians, and their large radius hides
    // the bilinear upscale.
    private val LEVEL_DOWNSCALE = floatArrayOf(1f, 0.5f, 0.5f)

    // Fixed frost grade (saturation + brightness on the blurred pixels),
    // matching iOS saturation compensation. Not props: both platforms tune
    // from the same constants.
    private const val FROST_SATURATION = 0.9f
    private const val FROST_LIFT = 1.03f

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
