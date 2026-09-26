import type { ColorValue, StyleProp, ViewStyle } from 'react-native'
import type { EdgeConfig, EdgeFadeCurve, EdgeFadeMode, EdgeFadeProps } from './types'

const DEFAULT_SIZE = 80
export const DEFAULT_CURVE: EdgeFadeCurve = 'smooth'
const DEFAULT_BLUR_RADIUS = 28

export interface ResolvedEdge {
  size: number
  curve: EdgeFadeCurve
  color?: ColorValue
}

function resolveEdge(
  prop: boolean | number | EdgeConfig | undefined,
  size: number,
  curve: EdgeFadeCurve
): ResolvedEdge | null {
  if (!prop) return null
  if (prop === true) return { size, curve }
  if (typeof prop === 'number') return { size: prop, curve }
  if (
    typeof prop === 'object' &&
    prop !== null &&
    (prop.size != null || prop.curve != null || prop.color != null)
  ) {
    return {
      size: prop.size ?? size,
      curve: prop.curve ?? curve,
      color: prop.color,
    }
  }
  return null
}

export interface ResolvedEdgeFade {
  top: ResolvedEdge | null
  bottom: ResolvedEdge | null
  left: ResolvedEdge | null
  right: ResolvedEdge | null
  mode: EdgeFadeMode
  color?: ColorValue
  blurRadius: number
  frostProgression: number
}

export function resolveEdges(props: EdgeFadeProps, isRTL: boolean): ResolvedEdgeFade {
  const size = props.size ?? DEFAULT_SIZE
  const curve = props.curve ?? DEFAULT_CURVE
  // logical start/end map to physical left/right by layout direction and
  // override the physical prop on the matching side.
  const leftLogical = isRTL ? props.end : props.start
  const rightLogical = isRTL ? props.start : props.end
  const top = resolveEdge(props.top, size, curve)
  const bottom = resolveEdge(props.bottom, size, curve)
  const left = resolveEdge(leftLogical ?? props.left, size, curve)
  const right = resolveEdge(rightLogical ?? props.right, size, curve)
  const hasColor =
    props.color != null ||
    top?.color != null ||
    bottom?.color != null ||
    left?.color != null ||
    right?.color != null
  const mode: EdgeFadeMode = props.mode ?? (hasColor ? 'overlay' : 'mask')
  if (hasColor && props.mode === 'mask') {
    console.warn(
      '[EdgeFade] `color` is ignored when `mode="mask"` is set explicitly. ' +
        'either remove `color` or switch to `mode="overlay"`.'
    )
  }
  if (
    props.mode === 'blur' &&
    (top?.color != null ||
      bottom?.color != null ||
      left?.color != null ||
      right?.color != null)
  ) {
    console.warn(
      '[EdgeFade] per-edge `color` is ignored in blur mode: the frost veil ' +
        'uses the global `color` only.'
    )
  }
  return {
    top,
    bottom,
    left,
    right,
    mode,
    color: props.color,
    blurRadius: Math.max(0, props.blurRadius ?? DEFAULT_BLUR_RADIUS),
    frostProgression: Math.max(0.05, Math.min(1, props.frostProgression ?? 1)),
  }
}

/**
 * the `radius` prop is the only corner source: it feeds the native mask on
 * the mask path and a clipped container on the core overlay path, so both
 * modes round identically. `style.borderRadius` would only round the
 * wrapper without touching the fade, so it is ignored loudly.
 */
export function resolveRadius(
  radius: number | undefined,
  styleRadius: unknown
): number | undefined {
  if (styleRadius != null) {
    console.warn(
      '[EdgeFade] `style.borderRadius` is ignored — use the `radius` prop ' +
        'instead so the corner clip integrates with the fade.'
    )
  }
  return radius
}

// style arrays merge left to right with falsy entries skipped, as StyleSheet
// does, without importing react-native so the web path stays dom only.
export function flattenStyle(style: StyleProp<ViewStyle>): Record<string, unknown> {
  const into: Record<string, unknown> = {}
  mergeStyle(style, into)
  return into
}

function mergeStyle(entry: unknown, into: Record<string, unknown>) {
  if (Array.isArray(entry)) for (const inner of entry) mergeStyle(inner, into)
  else if (entry && typeof entry === 'object') Object.assign(into, entry)
}
