import { processColor, type ColorValue } from 'react-native'
import { serializeCurve } from './curves'
import { DEFAULT_CURVE, type ResolvedEdgeFade } from './normalize'

export interface NativeEdgeFadeProps {
  fadeTop: number
  fadeBottom: number
  fadeLeft: number
  fadeRight: number
  curveTop: string
  curveBottom: string
  curveLeft: string
  curveRight: string
  fadeRadius: number
  mode: string
  blurRadius: number
  frostProgression: number
  overlayColor: number
}

// the frost-veil color as 0xAARRGGBB for the primitive (0 = no veil).
// opaque platform colors have no readable channels, so they resolve to 0.
export function resolveVeilColor(color?: ColorValue): number {
  if (color == null) return 0
  const processed = processColor(color)
  return typeof processed === 'number' ? processed : 0
}

// flat props for the OneNativeEdgeFade primitive. mask and blur modes reach
// it; overlay never does (RN core gradients paint it).
export function resolveNativeProps(
  resolved: ResolvedEdgeFade,
  radius?: number
): NativeEdgeFadeProps {
  return {
    fadeTop: resolved.top?.size ?? 0,
    fadeBottom: resolved.bottom?.size ?? 0,
    fadeLeft: resolved.left?.size ?? 0,
    fadeRight: resolved.right?.size ?? 0,
    curveTop: serializeCurve(resolved.top?.curve ?? DEFAULT_CURVE),
    curveBottom: serializeCurve(resolved.bottom?.curve ?? DEFAULT_CURVE),
    curveLeft: serializeCurve(resolved.left?.curve ?? DEFAULT_CURVE),
    curveRight: serializeCurve(resolved.right?.curve ?? DEFAULT_CURVE),
    fadeRadius: radius ?? 0,
    mode: resolved.mode,
    blurRadius: resolved.blurRadius,
    frostProgression: resolved.frostProgression,
    overlayColor: resolved.mode === 'blur' ? resolveVeilColor(resolved.color) : 0,
  }
}
