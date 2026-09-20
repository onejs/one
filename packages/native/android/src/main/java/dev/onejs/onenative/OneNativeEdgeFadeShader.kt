// vendored from react-native-edge-fade (MIT, Copyright (c) 2026 Giulio Amato),
// trimmed to the mask path for OneNativeEdgeFade. see VENDORING.md.
package dev.onejs.onenative

import android.annotation.SuppressLint
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.RuntimeShader
import android.graphics.Shader
import android.os.Build
import android.util.Log
import androidx.annotation.RequiresApi
import androidx.core.graphics.ColorUtils
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.roundToInt

/**
 * Per-edge gradient shader cache + builder.
 *
 * Each [OneNativeEdgeFadeShaderSlot] owns one [RuntimeShader] (AGSL, API 33+) or
 * [LinearGradient] (fallback) plus the [GradientKey] that produced it. When the
 * next frame's inputs match the cached key the slot returns the existing shader;
 * otherwise it updates AGSL uniforms in place (no recompilation) or rebuilds
 * the LinearGradient.
 */
internal class OneNativeEdgeFadeShaderSlot {

  private data class GradientKey(val curve: String, val size: Float, val dim: Float)

  private var key: GradientKey? = null
  private var shader: Shader? = null

  // API 33+ AGSL instance — created once, then only uniforms are reuploaded.
  @Suppress("NewApi")
  private var rts: RuntimeShader? = null

  /** Returns a mask shader matching the given inputs. */
  @SuppressLint("NewApi")
  fun acquire(
    curve: String,
    size: Float,
    dim: Float,
    x0: Float, y0: Float, x1: Float, y1: Float,
  ): Shader {
    val k = GradientKey(curve, size, dim)
    if (key == k && shader != null) return shader!!
    key = k

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      val updated = applyAgslUniforms(rts, x0, y0, x1, y1, curve)
      if (updated != null) {
        rts = updated
        return updated.also { shader = it }
      }
      rts = null
    }
    return buildFallback(x0, y0, x1, y1, curve).also { shader = it }
  }

  /** Drop cached shaders so the underlying native Skia resources are released promptly. */
  fun release() {
    key = null
    shader = null
    rts = null
  }

  // ── AGSL uniform application ────────────────────────────────────────────
  //
  // Single compiled shader handles both preset (analytical) and custom (LUT) paths
  // via the `useLUT` uniform. The shader is created once and only uniforms are
  // reuploaded on key changes.
  //
  // Returns null only if the curve cannot be handled by AGSL (parse failure or
  // RuntimeShader creation error). Callers then fall back to LinearGradient.

  @RequiresApi(Build.VERSION_CODES.TIRAMISU)
  private fun applyAgslUniforms(
    existing: RuntimeShader?,
    x0: Float, y0: Float, x1: Float, y1: Float,
    curve: String,
  ): RuntimeShader? {
    val presetParams = OneNativeEdgeFadeCurves.agslPresetParams(curve)
    val lut: FloatArray? = if (presetParams == null) OneNativeEdgeFadeCurves.parseCustomLUT(curve) else null
    if (presetParams == null && lut == null) return null

    val rts = existing ?: runCatching { RuntimeShader(AGSL_SRC) }
      .onFailure { logAgslFallbackOnce("RuntimeShader compile failed", it) }
      .getOrNull() ?: return null

    return runCatching {
      rts.setFloatUniform("start",          x0, y0)
      rts.setFloatUniform("end",            x1, y1)
      rts.setFloatUniform("ditherStrength", DITHER_STRENGTH)

      if (lut != null) {
        rts.setFloatUniform("useLUT",   1f)
        rts.setFloatUniform("alphaLUT", lut)
        rts.setFloatUniform("curveExp", 1f)
        rts.setFloatUniform("isSoft",   0f)
      } else {
        val (exp, soft) = presetParams!!
        rts.setFloatUniform("useLUT",   0f)
        rts.setFloatUniform("curveExp", exp)
        rts.setFloatUniform("isSoft",   soft)
      }
      rts
    }
      .onFailure { logAgslFallbackOnce("RuntimeShader uniform upload failed", it) }
      .getOrNull()
  }

  // ── LinearGradient fallback (API < 33 or unparseable curve) ────────────

  private fun buildFallback(x0: Float, y0: Float, x1: Float, y1: Float, curve: String): LinearGradient {
    val a = OneNativeEdgeFadeCurves.alphas(curve); val n = a.size
    val stops = OneNativeEdgeFadeCurves.stops(curve)
    // Mask: opaque black (inner, i=0) → transparent (outer) — DST_IN preserves
    // content where alpha is high, i.e. visibility(t) = alpha(t)
    val colors = IntArray(n) { i -> ColorUtils.setAlphaComponent(Color.BLACK, (a[i] * 255).roundToInt()) }
    return LinearGradient(x0, y0, x1, y1, colors, stops, Shader.TileMode.CLAMP)
  }

  internal companion object {

    /**
     * AGSL fragment program used on API 33+ for mask rendering.
     *
     * Two render paths share one compiled shader, switched at runtime via `useLUT`:
     *   - useLUT = 0: preset curves evaluated analytically (`pow` or `sin`).
     *   - useLUT = 1: custom curves looked up in the [OneNativeEdgeFadeCurves.LUT_SIZE]-entry
     *     `alphaLUT` uniform with linear interpolation.
     *
     * Coordinate convention: `t = 0` is the inner edge, `t = 1` the outer edge.
     * Mask renders alpha directly (DST_IN preserves content).
     */
    const val AGSL_SRC = """
      uniform float2 start;
      uniform float2 end;
      uniform float  curveExp;
      uniform float  isSoft;
      uniform float  useLUT;
      uniform float  alphaLUT[32];
      uniform float  ditherStrength;

      float hash21(float2 p) {
        p = fract(p * float2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float lutSample(float t) {
        float pos = clamp(t, 0.0, 1.0) * 31.0;
        int lo = int(pos);
        lo = clamp(lo, 0, 30);
        float frac = pos - float(lo);
        return mix(alphaLUT[lo], alphaLUT[lo + 1], frac);
      }

      half4 main(float2 fragCoord) {
        float2 d    = end - start;
        float  len2 = dot(d, d);
        float  t    = len2 > 0.0
          ? clamp(dot(fragCoord - start, d) / len2, 0.0, 1.0)
          : 0.0;

        float maskAlpha;
        if (useLUT > 0.5) {
          maskAlpha = lutSample(t);
        } else if (isSoft > 1.5) {
          // smootherstep: point-symmetric about t=0.5, so 1 - smootherstep(t)
          // already equals smootherstep(1-t) — direct and mirrored coincide.
          maskAlpha = 1.0 - (t * t * t * (t * (t * 6.0 - 15.0) + 10.0));
        } else if (isSoft > 0.5) {
          maskAlpha = cos(t * 1.5707963);
        } else {
          maskAlpha = pow(1.0 - t, curveExp);
        }

        float a = maskAlpha;

        float activeDither = step(0.001, a) * step(a, 0.999);
        float noise = hash21(fragCoord) - 0.5;
        a = clamp(a + noise * ditherStrength * activeDither, 0.0, 1.0);

        return half4(a, a, a, a);
      }
    """

    /** Dither strength for the AGSL path — balances smoothness and subtlety. */
    private const val DITHER_STRENGTH = 4.0f / 255f

    // Per-process AGSL fallback log — keeps logcat clean when a device or curve
    // rejects the runtime shader.
    private val agslFallbackLogged = AtomicBoolean(false)

    private fun logAgslFallbackOnce(message: String, cause: Throwable?) {
      if (agslFallbackLogged.compareAndSet(false, true)) {
        Log.w("OneNativeEdgeFade", "$message — falling back to LinearGradient.", cause)
      }
    }
  }
}
