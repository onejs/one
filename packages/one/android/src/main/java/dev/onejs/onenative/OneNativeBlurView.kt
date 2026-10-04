package dev.onejs.onenative

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.RenderEffect
import android.graphics.Shader
import android.os.Build
import android.view.View
import android.widget.FrameLayout

/**
 * Regular backdrop blur (UI.Blur, expo-blur compatible).
 *
 * An internal blur view fills the bounds behind the children: on API 31+ it
 * draws the backdrop captured by [OneNativeBackdropCapture] under a
 * [RenderEffect] Gaussian, then the tint scrim; below 31 (no RenderEffect) it
 * degrades to the scrim alone. Children mount after it and stay sharp.
 * Intensity scales both the radius (up to [MAX_RADIUS_DP]) and the scrim
 * alpha; intensity 0 is a full passthrough.
 *
 * Tint scrims behavior-match expo-blur's Android overlay table (base gray ×
 * alpha factor × intensity); the backdrop Gaussian itself is ours — expo's
 * default path paints the scrim only.
 */
class OneNativeBlurView(context: Context) : FrameLayout(context) {

  var tint: String = "default"
    set(value) {
      field = value
      updateBlurView()
    }

  /** 0-1, normalized in JS from expo units. */
  var intensity: Double = 0.5
    set(value) {
      field = value
      updateBlurView()
    }

  private var scrim = 0

  @Suppress("NewApi")
  private var backdrop: OneNativeBackdropCapture? = null

  private val blurView = object : View(context) {
    private val paint = Paint(Paint.FILTER_BITMAP_FLAG)
    private val rect = RectF()

    override fun onDraw(canvas: Canvas) {
      // a software canvas is a backdrop capture: contribute nothing, or the
      // blur would feed back into the next capture.
      if (!canvas.isHardwareAccelerated) return
      backdrop?.bitmap?.let {
        rect.set(0f, 0f, width.toFloat(), height.toFloat())
        canvas.drawBitmap(it, null, rect, paint)
      }
      canvas.drawColor(scrim)
    }
  }.apply {
    layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
  }

  private val density: Float
    get() = resources.displayMetrics.density

  init {
    // Index 0 under all React children; children mount after and stay sharp.
    addView(blurView, 0)
    updateBlurView()
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    syncBackdrop()
  }

  override fun onDetachedFromWindow() {
    backdrop?.stop()
    backdrop = null
    super.onDetachedFromWindow()
  }

  private fun updateBlurView() {
    val clamped = intensity.toFloat().coerceIn(0f, 1f)
    scrim = if (clamped > 0f) scrimForTint(tint, clamped) else 0
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val radius = clamped * MAX_RADIUS_DP * density
      blurView.setRenderEffect(
        if (radius > 0f) RenderEffect.createBlurEffect(radius, radius, Shader.TileMode.CLAMP) else null,
      )
    }
    syncBackdrop()
    blurView.invalidate()
  }

  // captures run only while an attached API 31+ blur has a radius to apply.
  private fun syncBackdrop() {
    val active = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
      isAttachedToWindow && intensity > 0.0
    if (!active) {
      backdrop?.stop()
      backdrop = null
      return
    }
    if (backdrop == null) {
      backdrop = OneNativeBackdropCapture(
        this,
        includeOwnerChildren = false,
        drawOwnerChildren = {},
        onChange = blurView::invalidate,
      ).also { it.start() }
    }
  }

  private companion object {
    /** Backdrop radius at full intensity, roughly matching UIBlurEffect's spread. */
    private const val MAX_RADIUS_DP = 25f

    // Base gray + alpha factor per tint family (expo-blur behavior).
    // Alpha = 255 × intensity × factor; unknown tints take the default white.
    private fun scrimForTint(tint: String, intensity: Float): Int {
      val (gray, factor) = when (tint) {
        "dark", "systemMaterialDark" -> Triple(25, 25, 25) to 0.69f
        "extraLight", "light",
        "systemMaterialLight", "systemUltraThinMaterialLight",
        "systemThickMaterialLight" -> Triple(249, 249, 249) to 0.78f
        "regular" -> Triple(179, 179, 179) to 0.82f
        "systemThinMaterialLight" -> Triple(199, 199, 199) to 0.78f
        "systemThinMaterial" -> Triple(199, 199, 199) to 0.97f
        "systemChromeMaterial" -> Triple(255, 255, 255) to 0.75f
        "systemChromeMaterialLight" -> Triple(255, 255, 255) to 0.97f
        "systemUltraThinMaterial" -> Triple(191, 191, 191) to 0.44f
        "systemThickMaterial" -> Triple(153, 153, 153) to 0.97f
        "systemThickMaterialDark" -> Triple(37, 37, 37) to 0.9f
        "systemThinMaterialDark" -> Triple(37, 37, 37) to 0.7f
        "systemUltraThinMaterialDark" -> Triple(37, 37, 37) to 0.55f
        "systemChromeMaterialDark" -> Triple(0, 0, 0) to 0.75f
        else -> Triple(255, 255, 255) to 0.44f
      }
      val alpha = (255 * intensity * factor).toInt().coerceIn(0, 255)
      return (alpha shl 24) + (gray.first shl 16) + (gray.second shl 8) + gray.third
    }
  }
}
