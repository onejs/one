package dev.onejs.onenative

import android.content.Context
import android.graphics.Canvas
import android.graphics.Matrix
import android.graphics.RenderEffect
import android.graphics.RenderNode
import android.graphics.Shader
import android.os.Build
import android.view.View
import android.view.ViewGroup
import android.view.ViewTreeObserver
import android.widget.FrameLayout

// records the backdrop before this view in drawing order. only that recording
// receives the gaussian; the tint and React foreground children stay sharp.
class OneNativeBlurView(context: Context) : FrameLayout(context) {

  var tint: String = "default"
    set(value) {
      field = value
      invalidate()
    }

  var intensity: Double = 0.5
    set(value) {
      field = value
      invalidate()
    }

  private val backdropPath = ArrayList<View>()
  private val orderedChildren = ArrayList<View>()
  private val targetMatrix = Matrix()
  private val inverseTargetMatrix = Matrix()
  private val rootMatrix = Matrix()
  private var backdropNode: RenderNode? = null
  private var lastRadius = -1f
  private val preDrawListener = ViewTreeObserver.OnPreDrawListener {
    val clamped = intensity.toFloat().coerceIn(0f, 1f)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && isHardwareAccelerated &&
        clamped > 0f && width > 0 && height > 0) {
      recordBackdrop(clamped)
    }
    true
  }

  init {
    setWillNotDraw(false)
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    backdropPath.clear()
    var current: View? = this
    while (current != null) {
      backdropPath.add(current)
      current = current.parent as? View
    }
    viewTreeObserver.addOnPreDrawListener(preDrawListener)
  }

  override fun onDetachedFromWindow() {
    viewTreeObserver.takeIf { it.isAlive }?.removeOnPreDrawListener(preDrawListener)
    backdropNode?.discardDisplayList()
    backdropPath.clear()
    orderedChildren.clear()
    super.onDetachedFromWindow()
  }

  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    val clamped = intensity.toFloat().coerceIn(0f, 1f)
    if (clamped <= 0f || width <= 0 || height <= 0) return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && canvas.isHardwareAccelerated) {
      backdropNode?.let { canvas.drawRenderNode(it) }
    }
    canvas.drawColor(scrimForTint(tint, clamped))
  }

  @androidx.annotation.RequiresApi(Build.VERSION_CODES.S)
  private fun recordBackdrop(intensity: Float) {
    if (backdropPath.size < 2) return
    val node = backdropNode ?: RenderNode("OneNativeBlurBackdrop").also { backdropNode = it }
    node.setPosition(0, 0, width, height)
    val recording = node.beginRecording()
    try {
      targetMatrix.reset()
      transformMatrixToGlobal(targetMatrix)
      if (!targetMatrix.invert(inverseTargetMatrix)) return
      recording.concat(inverseTargetMatrix)
      rootMatrix.reset()
      backdropPath.last().transformMatrixToGlobal(rootMatrix)
      recording.concat(rootMatrix)
      for (depth in backdropPath.lastIndex downTo 1) {
        val group = backdropPath[depth] as ViewGroup
        val branch = backdropPath[depth - 1]
        group.background?.draw(recording)
        if (group.clipChildren) {
          recording.clipRect(0, 0, group.width, group.height)
        }
        if (group.clipToPadding) {
          recording.clipRect(group.paddingLeft, group.paddingTop,
            group.width - group.paddingRight, group.height - group.paddingBottom)
        }
        orderedChildren.clear()
        for (position in 0 until group.childCount) {
          orderedChildren.add(group.getChildAt(group.getChildDrawingOrder(position)))
        }
        orderedChildren.sortWith(Z_ORDER)
        for (child in orderedChildren) {
          if (child === branch) break
          if (child.visibility != VISIBLE || child.alpha <= 0f) continue
          val saved = recording.save()
          recording.translate((child.left - group.scrollX).toFloat(),
            (child.top - group.scrollY).toFloat())
          recording.concat(child.matrix)
          if (child.alpha < 1f) {
            recording.saveLayerAlpha(0f, 0f, child.width.toFloat(), child.height.toFloat(),
              (child.alpha * 255).toInt())
          }
          child.draw(recording)
          recording.restoreToCount(saved)
        }
        recording.translate((branch.left - group.scrollX).toFloat(),
          (branch.top - group.scrollY).toFloat())
        recording.concat(branch.matrix)
      }
    } finally {
      node.endRecording()
    }
    val radius = intensity * MAX_RADIUS_DP * resources.displayMetrics.density
    if (radius != lastRadius) {
      node.setRenderEffect(RenderEffect.createBlurEffect(radius, radius, Shader.TileMode.CLAMP))
      lastRadius = radius
    }
  }

  private companion object {
    private val Z_ORDER = Comparator<View> { left, right -> left.z.compareTo(right.z) }

    // backdrop radius at full intensity.
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
