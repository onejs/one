import type { CubicBezierCurve, EdgeFadeCurve, StopsCurve } from './types'

// alpha samples run inner edge (1, fully visible) to outer edge (0, fully
// faded). preset math matches the native tables exactly (see
// OneNativeEdgeFadeCurves on iOS and OneNativeEdgeFadeCurves.kt on Android)
// so a curve name draws the same shape in mask and overlay modes.
const SAMPLE_N = 32

const PRESETS: Record<string, (t: number) => number> = {
  smooth: (t) => (1 - t) ** 3,
  sharp: (t) => (1 - t) ** 5,
  gentle: (t) => (1 - t) ** 2,
  soft: (t) => Math.cos((t * Math.PI) / 2),
  smoother: (t) => 1 - (t * t * t * (t * (t * 6 - 15) + 10)),
  linear: (t) => 1 - t,
}

// cubic bezier in the CSS easing form: P0=(0,0), P1=(x1,y1), P2=(x2,y2),
// P3=(1,1), solved for x with Newton iteration.
function cubicBezierEval(x1: number, y1: number, x2: number, y2: number, x: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  let t = x
  for (let i = 0; i < 8; i++) {
    const bxt = ((ax * t + bx) * t + cx) * t
    const dbxt = (3 * ax * t + 2 * bx) * t + cx
    if (Math.abs(dbxt) < 1e-6) break
    t = Math.max(0, Math.min(1, t - (bxt - x) / dbxt))
  }
  return ((ay * t + by) * t + cy) * t
}

function sampleCubicBezier(curve: CubicBezierCurve): number[] {
  const { x1, y1, x2, y2 } = curve
  // alpha = 1 - progress: opaque at the inner edge, clear at the outer edge.
  return Array.from({ length: SAMPLE_N }, (_, i) =>
    Number.parseFloat((1 - cubicBezierEval(x1, y1, x2, y2, i / (SAMPLE_N - 1))).toFixed(4))
  )
}

function normalizeStops(curve: StopsCurve): number[] {
  return curve.values.map((v) => Math.max(0, Math.min(1, v)))
}

/**
 * sample any curve to inner-to-outer alpha values. presets evaluate
 * analytically at 32 stops (the native table density); bezier and stops
 * follow the same path the native serializer uses.
 */
export function sampleCurve(curve: EdgeFadeCurve): number[] {
  if (typeof curve === 'string') {
    const fn = PRESETS[curve] ?? PRESETS.smooth
    return Array.from({ length: SAMPLE_N }, (_, i) =>
      Number.parseFloat(fn(i / (SAMPLE_N - 1)).toFixed(4))
    )
  }
  return curve.type === 'cubicBezier' ? sampleCubicBezier(curve) : normalizeStops(curve)
}

/**
 * convert any curve to the string the native primitive accepts: preset
 * names pass through, bezier and stops serialize as comma-separated
 * inner-to-outer alphas.
 */
export function serializeCurve(curve: EdgeFadeCurve): string {
  if (typeof curve === 'string') return curve
  return sampleCurve(curve).join(',')
}
